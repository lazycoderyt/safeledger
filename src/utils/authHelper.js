/**
 * lib/authHelper.js
 * Central auth + profile-provisioning logic against the Firebase v9/v10
 * modular SDK. Keeps all Firebase calls out of UI components.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
  collection,
  runTransaction,
  Timestamp,
  increment,
} from "firebase/firestore";
import { auth, db } from "@/libs/firebase";
import {
  generateUSAccountNumber,
  generateCardDetails,
} from "@/utils/Cryptogenacc";
import { calculateMonthlyPayment } from "@/utils/loanCalculations";
import { setSessionCookie, clearSessionCookie } from "@/utils/session";
import { TRANSACTION_STATUS_PRESET_IDS } from "@/utils/transactionStatusPresets";

/**
 * Registers a new user, then atomically provisions both their KYC-style
 * profile document (`profiles/{uid}`) and their core financial ledger
 * account (`accounts/{uid}`) via a single Firestore write batch.
 *
 * The batch guarantees a user can never end up with a profile and no
 * accompanying account document (or vice versa) — either both writes
 * land, or neither does.
 *
 * @param {string} email
 * @param {string} password
 * @param {Object} profile
 * @param {string} profile.fullName
 * @param {string} profile.dateOfBirth - ISO date string, e.g. "1998-04-12"
 * @param {string} profile.gender
 * @param {string} profile.country - Country of residence
 * @param {string} profile.mobileNumber
 * @param {string} profile.accountType - e.g. "Personal Checking"
 * @returns {Promise<{ user: import("firebase/auth").User, accountNumber: string }>}
 */
export async function signUpUser(email, password, profile) {
  const {
    fullName,
    dateOfBirth = "",
    gender = "",
    country = "",
    mobileNumber = "",
    accountType = "",
  } = profile || {};

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = credential.user;

  // Same reasoning as loginUser: set the cookie synchronously here so any
  // immediate post-signup navigation to /dashboard doesn't race middleware.
  const token = await user.getIdToken();
  setSessionCookie(token);

  const accountNumber = generateUSAccountNumber();

  // Best-effort — a failure here shouldn't block account creation.
  if (fullName) {
    try {
      await updateProfile(user, { displayName: fullName });
    } catch (profileError) {
      console.error("Failed to set display name:", profileError);
    }
  }

  const batch = writeBatch(db);

  const profileRef = doc(db, "profiles", user.uid);
  batch.set(profileRef, {
    userId: user.uid,
    name: fullName,
    email,
    dateOfBirth,
    gender,
    country,
    mobileNumber,
    accountType,
    accountNumber,
    createdAt: serverTimestamp(),
    avatarUrl: "",
    role: "user",
  });

  const accountRef = doc(db, "accounts", user.uid);
  batch.set(accountRef, {
    userId: user.uid,
    accountNumber,
    availableBalance: 0.0,
    ledgerBalance: 0.0,
    currency: "USD",
    status: "active",
    metrics: {
      totalDebitsCount: 0,
      totalCreditsCount: 0,
      failedTransactionsCount: 0,
    },
    updatedAt: serverTimestamp(),
  });

  // Atomic — either both the profile and the account document are
  // written, or neither is.
  await batch.commit();

  return { user, accountNumber };
}

/**
 * Authenticates an existing user with email + password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<import("firebase/auth").User>}
 */
export async function loginUser(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Set the routing cookie NOW, synchronously in this call, so it exists
  // before the caller does router.push("/dashboard") — otherwise that
  // navigation can reach middleware before AuthContext's async
  // onIdTokenChanged listener has had a chance to write it.
  const token = await credential.user.getIdToken();
  setSessionCookie(token);
  return credential.user;
}

/**
 * Terminates the active session.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  await signOut(auth);
  clearSessionCookie();
}

/**
 * Returns the Firestore document ID used for a user's card of a given
 * variant. Exported so the UI layer can subscribe with onSnapshot
 * without duplicating the ID convention.
 *
 * @param {string} userId
 * @param {"debit"|"credit"} variant
 * @returns {string}
 */
export function getCardDocId(userId, variant) {
  return `${userId}_${variant}`;
}

/**
 * Fetches a user's card document for the given variant, provisioning it
 * with real, persisted values on first access if it doesn't exist yet.
 * Nothing about a card (number, CVV, expiry, spending limit, credit
 * line figures) is ever invented in the UI — it either comes from this
 * document or, for a variant seeing it for the first time, is
 * generated exactly once here and written to Firestore.
 *
 * @param {string} userId
 * @param {"debit"|"credit"} variant
 * @returns {Promise<Object>} The card document data.
 */
export async function ensureCardProvisioned(userId, variant) {
  if (!userId) throw new Error("ensureCardProvisioned requires a userId.");

  const cardRef = doc(db, "cards", getCardDocId(userId, variant));
  const existing = await getDoc(cardRef);
  if (existing.exists()) return existing.data();

  const { cardNumber, last4, cvv, expiry } = generateCardDetails();

  const cardData = {
    userId,
    variant,
    cardNumber,
    last4,
    cvv,
    expiry,
    frozen: false,
    spendingLimit: 5000,
    // Credit-specific fields start at zero until a real underwriting
    // decision sets them — never a placeholder figure.
    ...(variant === "credit"
      ? { totalApproved: 0, utilizedBalance: 0, status: "pending_approval" }
      : { status: "active" }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(cardRef, cardData);
  return cardData;
}

/**
 * Applies a partial update to a user's card document (e.g. toggling
 * `frozen`, adjusting `spendingLimit`).
 *
 * @param {string} userId
 * @param {"debit"|"credit"} variant
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateCardSettings(userId, variant, updates) {
  if (!userId) throw new Error("updateCardSettings requires a userId.");
  const cardRef = doc(db, "cards", getCardDocId(userId, variant));
  await updateDoc(cardRef, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Records a credit or debit against a user's ledger account inside the
 * root `transactions` collection, and atomically keeps the matching
 * `accounts/{uid}` document's balances + metrics in sync via a
 * Firestore transaction (read-check-write) — never a bare write, so a
 * transaction document can never exist without the account ledger
 * reflecting it, and a debit can never overdraw the account.
 *
 * @param {string} userId
 * @param {Object} details
 * @param {"credit"|"debit"} details.type
 * @param {number} details.amount - Always a positive number; direction
 *   comes from `type`, not the sign.
 * @param {string} details.description - e.g. "Blue Bottle Coffee"
 * @param {string} [details.category] - e.g. "Dining", "Transfer", "Refund"
 * @param {"Completed"|"Pending"|"Failed"} [details.status]
 * @returns {Promise<{ id: string, balanceAfter: number }>}
 */
export async function recordTransaction(userId, details) {
  const {
    type,
    amount,
    description = "Transaction",
    category = "General",
    status = "Completed",
  } = details || {};

  if (!userId) throw new Error("recordTransaction requires a userId.");
  if (type !== "credit" && type !== "debit") {
    throw new Error('recordTransaction: type must be "credit" or "debit".');
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("recordTransaction: amount must be a positive number.");
  }

  const accountRef = doc(db, "accounts", userId);
  // Firestore auto-generates the ID up front; the ref is valid to write
  // to inside the transaction even though the document doesn't exist yet.
  const transactionRef = doc(collection(db, "transactions"));

  const balanceAfter = await runTransaction(db, async (txn) => {
    const accountSnap = await txn.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error("No ledger account found for this user.");
    }
    const account = accountSnap.data();

    const isFailed = status === "Failed";
    const currentAvailable = account.availableBalance ?? 0;
    const currentLedger = account.ledgerBalance ?? 0;

    if (!isFailed && type === "debit" && amount > currentAvailable) {
      throw new Error("Insufficient available balance for this debit.");
    }

    const delta = type === "credit" ? amount : -amount;
    const nextAvailable = isFailed
      ? currentAvailable
      : currentAvailable + delta;
    const nextLedger = isFailed ? currentLedger : currentLedger + delta;

    const metrics = {
      totalDebitsCount: account.metrics?.totalDebitsCount ?? 0,
      totalCreditsCount: account.metrics?.totalCreditsCount ?? 0,
      failedTransactionsCount: account.metrics?.failedTransactionsCount ?? 0,
    };
    if (isFailed) {
      metrics.failedTransactionsCount += 1;
    } else if (type === "credit") {
      metrics.totalCreditsCount += 1;
    } else {
      metrics.totalDebitsCount += 1;
    }

    txn.update(accountRef, {
      availableBalance: nextAvailable,
      ledgerBalance: nextLedger,
      metrics,
      updatedAt: serverTimestamp(),
    });

    txn.set(transactionRef, {
      id: transactionRef.id,
      userId,
      type,
      amount,
      description,
      category,
      status,
      currency: account.currency || "USD",
      balanceAfter: isFailed ? currentAvailable : nextAvailable,
      createdAt: serverTimestamp(),
    });

    return isFailed ? currentAvailable : nextAvailable;
  });

  return { id: transactionRef.id, balanceAfter };
}

/**
 * Submits a new loan or mortgage application to the root `loans`
 * collection. Applications always start at "Pending Review" with no
 * interest rate or monthly payment — those are only ever set once a
 * real underwriting decision is made via `approveLoanApplication`.
 * Nothing about pricing is fabricated at application time.
 *
 * @param {string} userId
 * @param {Object} details
 * @param {"institutional"|"mortgage"} details.loanType
 * @param {string} details.purpose
 * @param {number} details.principal - Amount requested.
 * @param {number} details.termMonths - Requested term in months.
 * @param {string} [details.propertyAddress] - Mortgage applications only.
 * @param {number} [details.downPayment] - Mortgage applications only.
 * @returns {Promise<string>} The new loan document's ID.
 */
export async function submitLoanApplication(userId, details) {
  const {
    loanType,
    purpose,
    principal,
    termMonths,
    propertyAddress = "",
    downPayment = null,
  } = details || {};

  if (!userId) throw new Error("submitLoanApplication requires a userId.");
  if (loanType !== "institutional" && loanType !== "mortgage") {
    throw new Error(
      'submitLoanApplication: loanType must be "institutional" or "mortgage".',
    );
  }
  if (!purpose) throw new Error("submitLoanApplication requires a purpose.");
  if (typeof principal !== "number" || principal <= 0) {
    throw new Error(
      "submitLoanApplication: principal must be a positive number.",
    );
  }
  if (typeof termMonths !== "number" || termMonths <= 0) {
    throw new Error(
      "submitLoanApplication: termMonths must be a positive number.",
    );
  }

  const loanRef = await addDoc(collection(db, "loans"), {
    userId,
    loanType,
    purpose,
    principal,
    termMonths,
    propertyAddress,
    downPayment,
    interestRate: null,
    monthlyPayment: null,
    remainingBalance: principal,
    status: "Pending Review",
    originationDate: null,
    nextPaymentDate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return loanRef.id;
}

/**
 * Underwriting/admin action: approves a pending loan or mortgage,
 * computing its fixed monthly payment via standard amortization and
 * moving it to Active. Not called from any user-facing UI yet — this
 * is the write path an admin approval screen would call.
 *
 * @param {string} loanId
 * @param {Object} decision
 * @param {number} decision.interestRate - Annual rate, e.g. 6.5 for 6.5%.
 * @param {number} [decision.termMonths] - Overrides the requested term if provided.
 * @param {number} [decision.principal] - Overrides the requested principal if provided.
 * @returns {Promise<void>}
 */
export async function approveLoanApplication(loanId, decision) {
  if (!loanId) throw new Error("approveLoanApplication requires a loanId.");

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) throw new Error("Loan application not found.");
  const loan = loanSnap.data();

  // Approval is only meaningful once, from Pending Review. Guards against
  // a stale tab double-submitting, or re-approving something already
  // Active/Rejected and silently resetting its remaining balance.
  if (loan.status !== "Pending Review") {
    throw new Error(
      `This application is "${loan.status}" and can no longer be approved.`,
    );
  }

  const principal = decision?.principal ?? loan.principal;
  const termMonths = decision?.termMonths ?? loan.termMonths;
  const interestRate = decision?.interestRate;

  if (typeof interestRate !== "number" || interestRate < 0) {
    throw new Error(
      "approveLoanApplication requires a non-negative numeric interestRate.",
    );
  }
  if (typeof principal !== "number" || principal <= 0) {
    throw new Error(
      "approveLoanApplication: principal must be a positive number.",
    );
  }
  if (typeof termMonths !== "number" || termMonths <= 0) {
    throw new Error(
      "approveLoanApplication: termMonths must be a positive number.",
    );
  }

  const monthlyPayment = calculateMonthlyPayment(
    principal,
    interestRate,
    termMonths,
  );
  const nextPaymentDate = new Date();
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

  await updateDoc(loanRef, {
    principal,
    termMonths,
    interestRate,
    monthlyPayment,
    remainingBalance: principal,
    status: "Active",
    originationDate: serverTimestamp(),
    nextPaymentDate,
    rejectionReason: null,
    decisionBy: decision?.adminUid || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Underwriting/admin action: rejects a pending loan or mortgage
 * application. Only valid from "Pending Review" — refuses to reject
 * something already Active/Rejected/Paid Off so an admin can't
 * accidentally flip a live loan to Rejected from a stale screen.
 *
 * @param {string} loanId
 * @param {string} adminUid - uid of the admin performing the rejection.
 * @param {string} [reason] - Optional note shown back to the applicant.
 * @returns {Promise<void>}
 */
export async function rejectLoanApplication(loanId, adminUid, reason = "") {
  if (!loanId) throw new Error("rejectLoanApplication requires a loanId.");

  const loanRef = doc(db, "loans", loanId);
  const loanSnap = await getDoc(loanRef);
  if (!loanSnap.exists()) throw new Error("Loan application not found.");
  const loan = loanSnap.data();

  if (loan.status !== "Pending Review") {
    throw new Error(
      `This application is "${loan.status}" and can no longer be rejected.`,
    );
  }

  await updateDoc(loanRef, {
    status: "Rejected",
    rejectionReason: typeof reason === "string" ? reason.trim() : "",
    interestRate: null,
    monthlyPayment: null,
    originationDate: null,
    nextPaymentDate: null,
    decisionBy: adminUid || null,
    updatedAt: serverTimestamp(),
  });
}

export const ACCOUNT_NUMBER_PATTERN = /^[1-9]\d{9,11}$/; // 10-12 digits, no leading zero

/**
 * Applies a payment from a user's own available balance toward one of
 * their own Active loans/mortgages — the "Settlement" half of Bill Pay
 * & Settlement. Debits the ledger account and reduces the loan's
 * remainingBalance in the same atomic transaction, exactly the way
 * recordTransaction() debits for an ordinary transfer, so a payment
 * can never be split into "money left the account but the loan wasn't
 * credited" or vice versa.
 *
 * Overpayment past the exact remaining balance is rejected rather than
 * silently capped, so the amount the user sees and the amount that
 * gets applied always match. Paying the full remaining balance closes
 * the loan out as "Paid Off".
 *
 * @param {string} userId
 * @param {string} loanId
 * @param {number} amount
 * @returns {Promise<{ id: string, balanceAfter: number, remainingBalance: number, paidOff: boolean }>}
 */
export async function payLoanInstallment(userId, loanId, amount) {
  if (!userId) throw new Error("payLoanInstallment requires a userId.");
  if (!loanId) throw new Error("payLoanInstallment requires a loanId.");
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a payment amount greater than zero.");
  }

  const accountRef = doc(db, "accounts", userId);
  const loanRef = doc(db, "loans", loanId);
  const transactionRef = doc(collection(db, "transactions"));

  const outcome = await runTransaction(db, async (txn) => {
    const accountSnap = await txn.get(accountRef);
    const loanSnap = await txn.get(loanRef);

    if (!accountSnap.exists()) {
      throw new Error("No ledger account found for this user.");
    }
    if (!loanSnap.exists()) {
      throw new Error("Loan not found.");
    }

    const account = accountSnap.data();
    const loan = loanSnap.data();

    if (loan.userId !== userId) {
      throw new Error("This loan does not belong to this account.");
    }
    if (loan.status !== "Active") {
      throw new Error(
        `This loan is "${loan.status}" and isn't open for payments.`,
      );
    }

    const currentAvailable = account.availableBalance ?? 0;
    if (amount > currentAvailable) {
      throw new Error("This payment exceeds your available balance.");
    }

    const remainingBalance = loan.remainingBalance ?? loan.principal ?? 0;
    if (amount > remainingBalance + 0.005) {
      throw new Error(
        `This payment exceeds the remaining balance of ${remainingBalance.toLocaleString(
          "en-US",
          { style: "currency", currency: "USD" },
        )}.`,
      );
    }

    const nextRemaining = Math.max(0, remainingBalance - amount);
    const paidOff = nextRemaining <= 0.005;

    let nextPaymentDate = null;
    if (!paidOff) {
      nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    txn.update(loanRef, {
      remainingBalance: paidOff ? 0 : nextRemaining,
      status: paidOff ? "Paid Off" : "Active",
      nextPaymentDate,
      updatedAt: serverTimestamp(),
    });

    const currentLedger = account.ledgerBalance ?? 0;
    const nextAvailable = currentAvailable - amount;
    const nextLedger = currentLedger - amount;

    const metrics = {
      totalDebitsCount: (account.metrics?.totalDebitsCount ?? 0) + 1,
      totalCreditsCount: account.metrics?.totalCreditsCount ?? 0,
      failedTransactionsCount: account.metrics?.failedTransactionsCount ?? 0,
    };

    txn.update(accountRef, {
      availableBalance: nextAvailable,
      ledgerBalance: nextLedger,
      metrics,
      updatedAt: serverTimestamp(),
    });

    txn.set(transactionRef, {
      id: transactionRef.id,
      userId,
      type: "debit",
      amount,
      description: `Loan payment — ${loan.purpose || "Loan"}${paidOff ? " (paid in full)" : ""}`,
      category: "Loan Payment",
      status: "Completed",
      currency: account.currency || "USD",
      balanceAfter: nextAvailable,
      relatedLoanId: loanId,
      createdAt: serverTimestamp(),
    });

    return {
      balanceAfter: nextAvailable,
      remainingBalance: paidOff ? 0 : nextRemaining,
      paidOff,
    };
  });

  return { id: transactionRef.id, ...outcome };
}

/**
 * Admin action: updates a user's display name and/or account number.
 * Only the fields actually provided are written. When the account
 * number changes, `profiles/{uid}.accountNumber` and
 * `accounts/{uid}.accountNumber` are updated together in one batch so
 * the two documents can never disagree about what the account number is.
 *
 * @param {string} userId
 * @param {Object} updates
 * @param {string} [updates.name] - New display name.
 * @param {string} [updates.accountNumber] - New account number, 10-12
 *   digits, matching the same format generateUSAccountNumber() produces.
 * @returns {Promise<void>}
 */
export async function updateUserIdentity(userId, updates) {
  if (!userId) throw new Error("updateUserIdentity requires a userId.");

  const { name, accountNumber } = updates || {};
  const trimmedName = typeof name === "string" ? name.trim() : undefined;
  const trimmedAccountNumber =
    typeof accountNumber === "string" ? accountNumber.trim() : undefined;

  if (trimmedName === undefined && trimmedAccountNumber === undefined) {
    throw new Error("updateUserIdentity requires a name or accountNumber.");
  }
  if (trimmedName !== undefined && trimmedName.length === 0) {
    throw new Error("Name cannot be empty.");
  }
  if (
    trimmedAccountNumber !== undefined &&
    !ACCOUNT_NUMBER_PATTERN.test(trimmedAccountNumber)
  ) {
    throw new Error(
      "Account number must be 10-12 digits with no leading zero.",
    );
  }

  const batch = writeBatch(db);

  const profileRef = doc(db, "profiles", userId);
  const profileUpdates = { updatedAt: serverTimestamp() };
  if (trimmedName !== undefined) profileUpdates.name = trimmedName;
  if (trimmedAccountNumber !== undefined)
    profileUpdates.accountNumber = trimmedAccountNumber;
  batch.update(profileRef, profileUpdates);

  if (trimmedAccountNumber !== undefined) {
    const accountRef = doc(db, "accounts", userId);
    batch.update(accountRef, {
      accountNumber: trimmedAccountNumber,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Admin action: grants or revokes admin access for a user by setting
 * `profiles/{uid}.role`. Refuses to let an admin change their own role
 * through this path — self-demotion (or a mis-click self-promotion)
 * would either lock the acting admin out of the admin console or is
 * simply not a legitimate use of this control, so it's rejected before
 * any write happens.
 *
 * The caller is responsible for whatever confirmation UX it wants in
 * front of this (e.g. a type-to-confirm phrase) — this function only
 * enforces the two structural invariants: a valid role, and never
 * self-targeting.
 *
 * @param {string} userId - The user whose role is changing.
 * @param {"user"|"admin"} role - The role to set.
 * @param {string} actingAdminUid - uid of the admin performing the change.
 * @returns {Promise<void>}
 */
export async function updateUserRole(userId, role, actingAdminUid) {
  if (!userId) throw new Error("updateUserRole requires a userId.");
  if (role !== "user" && role !== "admin") {
    throw new Error('updateUserRole: role must be "user" or "admin".');
  }
  if (actingAdminUid && actingAdminUid === userId) {
    throw new Error("You can't change your own role.");
  }

  const profileRef = doc(db, "profiles", userId);
  await updateDoc(profileRef, {
    role,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin action: creates a transaction on a user's account with an
 * admin-chosen date (for backdating), rather than `serverTimestamp()`.
 * Mirrors recordTransaction()'s balance/metrics math exactly — this is
 * NOT a raw document write, it's the same atomic ledger update every
 * other transaction in the app goes through, just with two differences:
 * a caller-supplied date, and an `adminCreated: true` marker so these
 * are always distinguishable from organic transactions in an audit.
 *
 * @param {string} userId
 * @param {Object} details
 * @param {"credit"|"debit"} details.type
 * @param {number} details.amount
 * @param {string} details.description
 * @param {string} [details.category]
 * @param {"Completed"|"Pending"|"Failed"} [details.status]
 * @param {Date} details.transactionDate - The admin-chosen date/time.
 * @param {string} adminUid - uid of the admin performing the action.
 * @returns {Promise<{ id: string, balanceAfter: number }>}
 */
export async function adminCreateTransaction(userId, details, adminUid) {
  const {
    type,
    amount,
    description = "Transaction",
    category = "General",
    status = "Completed",
    transactionDate,
  } = details || {};

  if (!userId) throw new Error("adminCreateTransaction requires a userId.");
  if (type !== "credit" && type !== "debit") {
    throw new Error(
      'adminCreateTransaction: type must be "credit" or "debit".',
    );
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error(
      "adminCreateTransaction: amount must be a positive number.",
    );
  }
  if (
    !(transactionDate instanceof Date) ||
    Number.isNaN(transactionDate.getTime())
  ) {
    throw new Error("adminCreateTransaction requires a valid transactionDate.");
  }

  const accountRef = doc(db, "accounts", userId);
  const transactionRef = doc(collection(db, "transactions"));

  const balanceAfter = await runTransaction(db, async (txn) => {
    const accountSnap = await txn.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error("No ledger account found for this user.");
    }
    const account = accountSnap.data();

    const isFailed = status === "Failed";
    const currentAvailable = account.availableBalance ?? 0;
    const currentLedger = account.ledgerBalance ?? 0;

    if (!isFailed && type === "debit" && amount > currentAvailable) {
      throw new Error("Insufficient available balance for this debit.");
    }

    const delta = type === "credit" ? amount : -amount;
    const nextAvailable = isFailed
      ? currentAvailable
      : currentAvailable + delta;
    const nextLedger = isFailed ? currentLedger : currentLedger + delta;

    const metrics = {
      totalDebitsCount: account.metrics?.totalDebitsCount ?? 0,
      totalCreditsCount: account.metrics?.totalCreditsCount ?? 0,
      failedTransactionsCount: account.metrics?.failedTransactionsCount ?? 0,
    };
    if (isFailed) {
      metrics.failedTransactionsCount += 1;
    } else if (type === "credit") {
      metrics.totalCreditsCount += 1;
    } else {
      metrics.totalDebitsCount += 1;
    }

    txn.update(accountRef, {
      availableBalance: nextAvailable,
      ledgerBalance: nextLedger,
      metrics,
      updatedAt: serverTimestamp(),
    });

    txn.set(transactionRef, {
      id: transactionRef.id,
      userId,
      type,
      amount,
      description,
      category,
      status,
      currency: account.currency || "USD",
      balanceAfter: isFailed ? currentAvailable : nextAvailable,
      createdAt: Timestamp.fromDate(transactionDate),
      adminCreated: true,
      lastEditedBy: adminUid || null,
    });

    return isFailed ? currentAvailable : nextAvailable;
  });

  return { id: transactionRef.id, balanceAfter };
}

/**
 * Admin action: edits an existing transaction — amount, type, status,
 * description, category, and/or its date. If the edit changes the
 * transaction's effect on the account (amount, type, or status moving
 * to/from "Failed"), the account's availableBalance/ledgerBalance and
 * metrics are adjusted by the *difference* between the old and new
 * effect, atomically, in the same Firestore transaction as the
 * document edit. A debit-increasing edit that would overdraw the
 * account is rejected, same as anywhere else in the app.
 *
 * Known limitation: `balanceAfter` on this transaction (and the stored
 * `balanceAfter` on every transaction that happened after it) is a
 * point-in-time snapshot taken when each transaction was originally
 * recorded. Editing an old transaction's amount corrects the *current*
 * account balance, but does not retroactively recompute the
 * `balanceAfter` snapshots on transactions that came after it — those
 * will no longer exactly reconstruct a running total if you replay
 * history in order. Fully solving that means replaying the ledger
 * forward from the edit point, which is out of scope here.
 *
 * @param {string} transactionId
 * @param {Object} updates - Any subset of: type, amount, description,
 *   category, status, transactionDate (Date).
 * @param {string} adminUid
 * @returns {Promise<void>}
 */
export async function adminUpdateTransaction(transactionId, updates, adminUid) {
  if (!transactionId)
    throw new Error("adminUpdateTransaction requires a transactionId.");

  const {
    type: nextTypeInput,
    amount: nextAmountInput,
    description: nextDescription,
    category: nextCategory,
    status: nextStatusInput,
    transactionDate,
  } = updates || {};

  if (
    nextTypeInput !== undefined &&
    nextTypeInput !== "credit" &&
    nextTypeInput !== "debit"
  ) {
    throw new Error(
      'adminUpdateTransaction: type must be "credit" or "debit".',
    );
  }
  if (
    nextAmountInput !== undefined &&
    (typeof nextAmountInput !== "number" || nextAmountInput <= 0)
  ) {
    throw new Error(
      "adminUpdateTransaction: amount must be a positive number.",
    );
  }
  if (
    transactionDate !== undefined &&
    (!(transactionDate instanceof Date) ||
      Number.isNaN(transactionDate.getTime()))
  ) {
    throw new Error(
      "adminUpdateTransaction: transactionDate must be a valid Date.",
    );
  }

  const transactionRef = doc(db, "transactions", transactionId);

  await runTransaction(db, async (txn) => {
    const transactionSnap = await txn.get(transactionRef);
    if (!transactionSnap.exists()) {
      throw new Error("Transaction not found.");
    }
    const oldTxn = transactionSnap.data();

    const accountRef = doc(db, "accounts", oldTxn.userId);
    const accountSnap = await txn.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error("No ledger account found for this transaction's user.");
    }
    const account = accountSnap.data();

    const nextType = nextTypeInput ?? oldTxn.type;
    const nextAmount = nextAmountInput ?? oldTxn.amount;
    const nextStatus = nextStatusInput ?? oldTxn.status;

    const wasFailed = oldTxn.status === "Failed";
    const isFailed = nextStatus === "Failed";

    const oldDelta = wasFailed
      ? 0
      : oldTxn.type === "credit"
        ? oldTxn.amount
        : -oldTxn.amount;
    const newDelta = isFailed
      ? 0
      : nextType === "credit"
        ? nextAmount
        : -nextAmount;
    const netDelta = newDelta - oldDelta;

    const currentAvailable = account.availableBalance ?? 0;
    const currentLedger = account.ledgerBalance ?? 0;
    const nextAvailable = currentAvailable + netDelta;
    const nextLedger = currentLedger + netDelta;

    if (nextAvailable < 0) {
      throw new Error(
        "This edit would overdraw the user's account. Adjust the amount and try again.",
      );
    }

    // Move the metrics counter from whichever bucket the transaction
    // used to belong to, into whichever bucket it belongs to now.
    const metrics = {
      totalDebitsCount: account.metrics?.totalDebitsCount ?? 0,
      totalCreditsCount: account.metrics?.totalCreditsCount ?? 0,
      failedTransactionsCount: account.metrics?.failedTransactionsCount ?? 0,
    };
    const oldBucket = wasFailed
      ? "failedTransactionsCount"
      : oldTxn.type === "credit"
        ? "totalCreditsCount"
        : "totalDebitsCount";
    const newBucket = isFailed
      ? "failedTransactionsCount"
      : nextType === "credit"
        ? "totalCreditsCount"
        : "totalDebitsCount";
    if (oldBucket !== newBucket) {
      metrics[oldBucket] = Math.max(0, metrics[oldBucket] - 1);
      metrics[newBucket] += 1;
    }

    txn.update(accountRef, {
      availableBalance: nextAvailable,
      ledgerBalance: nextLedger,
      metrics,
      updatedAt: serverTimestamp(),
    });

    const transactionUpdates = {
      type: nextType,
      amount: nextAmount,
      status: nextStatus,
      balanceAfter: nextAvailable,
      updatedAt: serverTimestamp(),
      lastEditedBy: adminUid || null,
    };
    if (nextDescription !== undefined)
      transactionUpdates.description = nextDescription;
    if (nextCategory !== undefined) transactionUpdates.category = nextCategory;
    if (transactionDate !== undefined) {
      transactionUpdates.createdAt = Timestamp.fromDate(transactionDate);
    }

    txn.update(transactionRef, transactionUpdates);
  });
}

/**
 * Admin action: permanently deletes a transaction and reverses its
 * effect on the owning account's balance/metrics, atomically. Refuses
 * to delete if doing so would leave the account balance negative
 * (this can happen when deleting an old credit whose funds have
 * already been spent elsewhere) — surfaces a clear error instead of
 * silently corrupting the ledger.
 *
 * @param {string} transactionId
 * @returns {Promise<void>}
 */
export async function adminDeleteTransaction(transactionId) {
  if (!transactionId)
    throw new Error("adminDeleteTransaction requires a transactionId.");

  const transactionRef = doc(db, "transactions", transactionId);

  await runTransaction(db, async (txn) => {
    const transactionSnap = await txn.get(transactionRef);
    if (!transactionSnap.exists()) {
      throw new Error("Transaction not found.");
    }
    const oldTxn = transactionSnap.data();

    const accountRef = doc(db, "accounts", oldTxn.userId);
    const accountSnap = await txn.get(accountRef);
    if (!accountSnap.exists()) {
      throw new Error("No ledger account found for this transaction's user.");
    }
    const account = accountSnap.data();

    const wasFailed = oldTxn.status === "Failed";
    const oldDelta = wasFailed
      ? 0
      : oldTxn.type === "credit"
        ? oldTxn.amount
        : -oldTxn.amount;
    const reverseDelta = -oldDelta;

    const currentAvailable = account.availableBalance ?? 0;
    const currentLedger = account.ledgerBalance ?? 0;
    const nextAvailable = currentAvailable + reverseDelta;
    const nextLedger = currentLedger + reverseDelta;

    if (nextAvailable < 0) {
      throw new Error(
        "Deleting this transaction would leave the account balance negative. Resolve that first.",
      );
    }

    const metrics = {
      totalDebitsCount: account.metrics?.totalDebitsCount ?? 0,
      totalCreditsCount: account.metrics?.totalCreditsCount ?? 0,
      failedTransactionsCount: account.metrics?.failedTransactionsCount ?? 0,
    };
    const bucket = wasFailed
      ? "failedTransactionsCount"
      : oldTxn.type === "credit"
        ? "totalCreditsCount"
        : "totalDebitsCount";
    metrics[bucket] = Math.max(0, metrics[bucket] - 1);

    txn.update(accountRef, {
      availableBalance: nextAvailable,
      ledgerBalance: nextLedger,
      metrics,
      updatedAt: serverTimestamp(),
    });

    txn.delete(transactionRef);
  });
}

/**
 * Admin action: sets the single global transaction-status message shown
 * to every user attempting a transfer (see
 * utils/transactionStatusPresets.js for the resolver every reader uses).
 * This is a singleton document — there is exactly one active message
 * for the whole app at any time, not one per user.
 *
 * @param {string} adminUid - uid of the admin performing the change.
 * @param {Object} details
 * @param {string} details.presetId - One of TRANSACTION_STATUS_PRESET_IDS.
 * @param {string} [details.customMessage] - Required (non-empty) when
 *   presetId is "custom"; ignored otherwise.
 * @param {boolean} details.blockTransfers - Whether transfers should
 *   actually be prevented while this message is shown. Forced to
 *   `false` when presetId is "none".
 * @returns {Promise<void>}
 */
export async function setTransactionStatusMessage(adminUid, details) {
  const { presetId, customMessage = "", blockTransfers } = details || {};

  if (!TRANSACTION_STATUS_PRESET_IDS.includes(presetId)) {
    throw new Error(
      "setTransactionStatusMessage: presetId must be a known preset.",
    );
  }
  if (typeof blockTransfers !== "boolean") {
    throw new Error(
      "setTransactionStatusMessage requires a boolean blockTransfers.",
    );
  }

  const trimmedCustomMessage =
    typeof customMessage === "string" ? customMessage.trim() : "";

  if (presetId === "custom" && !trimmedCustomMessage) {
    throw new Error(
      "Enter a custom message, or choose one of the preset statuses instead.",
    );
  }

  const statusRef = doc(db, "settings", "transactionStatus");
  await setDoc(statusRef, {
    presetId,
    customMessage: presetId === "custom" ? trimmedCustomMessage : "",
    blockTransfers: presetId === "none" ? false : blockTransfers,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || null,
  });
}

/* -------------------------------------------------------------------- */
/* Support Chat                                                          */
/* -------------------------------------------------------------------- */
/**
 * One conversation thread per user, `chats/{userId}`, with messages in
 * the `chats/{userId}/messages` subcollection. There's a single shared
 * thread per user (not per-admin) — any admin can see and reply to any
 * user's thread from the admin inbox, the way a small support team
 * shares one queue.
 *
 * Unread counts live on the parent chat document as two independent
 * counters (`unreadByAdmin`, `unreadByUser`) so the badge on each side
 * only ever reflects messages *the other party* sent that this side
 * hasn't opened yet — sending a message never clears your own unread
 * count of what's still waiting for you to read.
 */

const CHAT_MESSAGE_MAX_LENGTH = 2000;
const CHAT_PREVIEW_MAX_LENGTH = 120;

/**
 * Idempotently ensures a chat thread document exists for a user, and
 * keeps the denormalized display name/email on it fresh. Safe to call
 * on every visit to the chat page — it's a single cheap read plus a
 * merge write, and never touches unread counters or message history
 * once the thread exists.
 *
 * @param {string} userId
 * @param {{ name?: string, email?: string }} participant
 * @returns {Promise<void>}
 */
export async function ensureChatThread(userId, participant = {}) {
  if (!userId) throw new Error("ensureChatThread requires a userId.");

  const chatRef = doc(db, "chats", userId);
  const chatSnap = await getDoc(chatRef);

  const userName = (participant.name || "").trim();
  const userEmail = (participant.email || "").trim();

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      userId,
      userName,
      userEmail,
      lastMessage: "",
      lastMessageAt: null,
      lastSenderRole: null,
      unreadByAdmin: 0,
      unreadByUser: 0,
      createdAt: serverTimestamp(),
    });
  } else {
    await setDoc(chatRef, { userName, userEmail }, { merge: true });
  }
}

/**
 * Sends a chat message into a user's thread and updates the parent
 * thread's preview/unread metadata in the same call. Works for both
 * sides — pass `senderRole: "user"` from the member's chat page or
 * `senderRole: "admin"` from the admin console; the unread counter
 * bumped is always the *recipient's*.
 *
 * @param {string} userId - The thread this message belongs to (always
 *   the member's uid, regardless of who's sending).
 * @param {Object} message
 * @param {string} message.senderUid
 * @param {"user"|"admin"} message.senderRole
 * @param {string} [message.senderName]
 * @param {string} message.text
 * @returns {Promise<void>}
 */
export async function sendChatMessage(userId, message) {
  const { senderUid, senderRole, senderName, text } = message || {};

  if (!userId) throw new Error("sendChatMessage requires a userId.");
  if (!senderUid) throw new Error("sendChatMessage requires a senderUid.");
  if (senderRole !== "user" && senderRole !== "admin") {
    throw new Error('sendChatMessage: senderRole must be "user" or "admin".');
  }

  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    throw new Error("Enter a message before sending.");
  }
  if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error(
      `Messages are limited to ${CHAT_MESSAGE_MAX_LENGTH} characters.`,
    );
  }

  const resolvedSenderName =
    (senderName || "").trim() ||
    (senderRole === "admin" ? "SafeLedger Support" : "Member");

  await addDoc(collection(db, "chats", userId, "messages"), {
    senderUid,
    senderRole,
    senderName: resolvedSenderName,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  const preview =
    trimmed.length > CHAT_PREVIEW_MAX_LENGTH
      ? `${trimmed.slice(0, CHAT_PREVIEW_MAX_LENGTH - 1)}…`
      : trimmed;
  const unreadField = senderRole === "user" ? "unreadByAdmin" : "unreadByUser";

  await setDoc(
    doc(db, "chats", userId),
    {
      lastMessage: preview,
      lastMessageAt: serverTimestamp(),
      lastSenderRole: senderRole,
      [unreadField]: increment(1),
    },
    { merge: true },
  );
}

/**
 * Zeroes out one side's unread counter on a chat thread — call when
 * that side opens/is actively viewing the conversation.
 *
 * @param {string} userId
 * @param {"user"|"admin"} role - Whose unread counter to clear.
 * @returns {Promise<void>}
 */
export async function markChatThreadRead(userId, role) {
  if (!userId) throw new Error("markChatThreadRead requires a userId.");
  if (role !== "user" && role !== "admin") {
    throw new Error('markChatThreadRead: role must be "user" or "admin".');
  }

  const field = role === "admin" ? "unreadByAdmin" : "unreadByUser";
  await setDoc(doc(db, "chats", userId), { [field]: 0 }, { merge: true });
}

export { CHAT_MESSAGE_MAX_LENGTH };
