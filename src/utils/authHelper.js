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
  serverTimestamp,
  writeBatch,
  collection,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "@/libs/firebase";
import {
  generateUSAccountNumber,
  generateCardDetails,
} from "@/utils/Cryptogenacc";

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
  return credential.user;
}

/**
 * Terminates the active session.
 *
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  await signOut(auth);
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
