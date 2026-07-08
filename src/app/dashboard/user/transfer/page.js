"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  WifiOff,
  KeyRound,
  MessageCircle,
  Clock,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import { useTransactionStatus } from "@/utils/useTransactionStatus";
import {
  initiateTransferRequest,
  verifyTransferPin,
  ACCOUNT_NUMBER_PATTERN,
} from "@/utils/authHelper";

/**
 * app/dashboard/user/transfer/page.js
 * Wire Transfer — the one place a user actually moves money out of
 * their account. Before showing the form, this reads the single global
 * `settings/transactionStatus` document (see
 * utils/useTransactionStatus.js) that any admin can set from
 * /dashboard/admin/settings. If that status is currently marked as
 * blocking, the form is replaced entirely by the status message — the
 * transfer can't even be attempted, not just visually disabled, since
 * the guard is re-checked again at submit time as a safety net against
 * a stale snapshot.
 *
 * Every transfer is confirmed with the user's 4-digit transfer PIN
 * (verifyTransferPin — step-up authentication, set once at sign-up)
 * and submitted via initiateTransferRequest(), which places the funds
 * on HOLD rather than completing the transfer immediately: no
 * transfer settles until an admin reviews and approves it from
 * /dashboard/admin/transactions. The submitted transaction sits with
 * status "Pending" until that happens — see initiateTransferRequest's
 * own doc comment in authHelper.js for exactly how the hold works.
 */

const TONE_ICON = {
  neutral: AlertTriangle,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Banner({ tone, icon: Icon, children }) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${toneClasses}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

function BlockedStatusCard({ status }) {
  const Icon = TONE_ICON[status.tone] || AlertTriangle;
  const toneClasses =
    status.tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : "border-amber-200 bg-amber-50";
  const iconClasses =
    status.tone === "danger" ? "text-rose-600" : "text-amber-600";
  const textClasses =
    status.tone === "danger" ? "text-rose-800" : "text-amber-900";

  return (
    <div
      role="alert"
      className={`rounded-xl border p-6 text-center sm:p-8 ${toneClasses}`}
    >
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white ${iconClasses}`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className={`mt-4 text-base font-bold ${textClasses}`}>
        Transfers are currently unavailable
      </p>
      <p className={`mx-auto mt-2 max-w-md text-sm ${textClasses}`}>
        {status.message}
      </p>
      <Link
        href="/dashboard/user/support"
        className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
          status.tone === "danger"
            ? "border-rose-300 text-rose-700 hover:bg-rose-100"
            : "border-amber-300 text-amber-800 hover:bg-amber-100"
        }`}
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        Chat with Support
      </Link>
    </div>
  );
}

export default function WireTransferPage() {
  const { user } = useAuth();
  const { status: transactionStatus, loading: statusLoading } =
    useTransactionStatus();

  const [account, setAccount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setAccount(null);
      setAccountLoaded(true);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "accounts", user.uid),
      (snap) => {
        setAccount(snap.exists() ? snap.data() : null);
        setAccountLoaded(true);
      },
      (err) => {
        console.error("Failed to stream account ledger:", err);
        setAccountLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const [recipientName, setRecipientName] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [iban, setIban] = useState("");
  const [swiftCode, setSwiftCode] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [transferPin, setTransferPin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null); // { balanceAfter } once submitted

  const availableBalance = account?.availableBalance ?? 0;

  const numericAmount = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setResult(null);

    // Defensive re-check — the form is normally hidden entirely while
    // blocked, but this guards against an in-flight submit racing a
    // status change that just came in over the live snapshot.
    if (transactionStatus.blocking) {
      setFormError(
        "Transfers are currently unavailable. Please try again later.",
      );
      return;
    }
    if (!user?.uid) {
      setFormError("You need to be signed in to send a transfer.");
      return;
    }

    const trimmedName = recipientName.trim();
    const trimmedAccountNumber = recipientAccountNumber.trim();
    const trimmedBankName = bankName.trim();
    const trimmedBankAddress = bankAddress.trim();
    const trimmedIban = iban.trim().toUpperCase();
    const trimmedSwift = swiftCode.trim().toUpperCase();

    if (!trimmedName) {
      setFormError("Enter the recipient's name.");
      return;
    }
    if (!ACCOUNT_NUMBER_PATTERN.test(trimmedAccountNumber)) {
      setFormError(
        "Enter a valid 10-12 digit account number, with no leading zero.",
      );
      return;
    }
    if (!trimmedBankName) {
      setFormError("Enter the recipient's bank name.");
      return;
    }
    if (!trimmedBankAddress) {
      setFormError("Enter the recipient bank's address.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (accountLoaded && numericAmount > availableBalance) {
      setFormError("This transfer exceeds your available balance.");
      return;
    }
    if (!/^\d{4}$/.test(transferPin)) {
      setFormError("Enter your 4-digit transfer PIN to confirm this transfer.");
      return;
    }

    setSubmitting(true);
    try {
      // Step-up authentication: every transfer must be confirmed with
      // the transfer PIN created at sign-up, re-verified fresh right
      // here — never just checked once at sign-in.
      await verifyTransferPin(user.uid, transferPin);

      const last4 = trimmedAccountNumber.slice(-4);
      const description = memo.trim()
        ? `Wire to ${trimmedName} (••••${last4}) — ${memo.trim()}`
        : `Wire to ${trimmedName} (••••${last4})`;

      const { balanceAfter } = await initiateTransferRequest(user.uid, {
        amount: numericAmount,
        description,
        recipientName: trimmedName,
        recipientAccountNumber: trimmedAccountNumber,
        bankName: trimmedBankName,
        bankAddress: trimmedBankAddress,
        iban: trimmedIban,
        swiftCode: trimmedSwift,
        memo: memo.trim(),
      });

      setResult({ balanceAfter });
      setRecipientName("");
      setRecipientAccountNumber("");
      setBankName("");
      setBankAddress("");
      setIban("");
      setSwiftCode("");
      setAmount("");
      setMemo("");
      setTransferPin("");
    } catch (err) {
      console.error("Failed to send transfer:", err);
      // Always clear the PIN field on failure — never leave a typed
      // PIN sitting in state after a failed attempt, whether it was
      // the PIN itself or the transfer that failed.
      setTransferPin("");
      setFormError(
        err.message || "Couldn't submit this transfer. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Send className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Wire Transfer
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send funds from your Apex Global account to another bank account.
          Every transfer is reviewed by our team before it settles.
        </p>
      </div>

      {statusLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">Checking transfer status…</p>
        </div>
      ) : transactionStatus.blocking ? (
        <BlockedStatusCard status={transactionStatus} />
      ) : (
        <>
          {transactionStatus.message && (
            <Banner tone="neutral" icon={WifiOff}>
              {transactionStatus.message}{" "}
              <Link
                href="/dashboard/user/support"
                className="font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
              >
                Chat with Support
              </Link>
            </Banner>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
            <span className="text-sm text-slate-500">Available Balance</span>
            <span className="text-base font-bold text-slate-900">
              {accountLoaded ? formatCurrency(availableBalance) : "—"}
            </span>
          </div>

          {formError && (
            <Banner tone="error" icon={AlertCircle}>
              {formError}
            </Banner>
          )}
          {result && (
            <Banner tone="success" icon={Clock}>
              Transfer submitted and is now pending.Your available balance is on
              hold at {formatCurrency(result.balanceAfter)} until it&rsquo;s
              reviewed.
            </Banner>
          )}

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            noValidate
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="recipientName"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Recipient Name
                </label>
                <input
                  id="recipientName"
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Jordan Reyes"
                  autoComplete="name"
                  autoCapitalize="words"
                  autoCorrect="off"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="recipientAccountNumber"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Recipient Account Number
                </label>
                <input
                  id="recipientAccountNumber"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  value={recipientAccountNumber}
                  onChange={(e) =>
                    setRecipientAccountNumber(
                      e.target.value.replace(/\D/g, "").slice(0, 12),
                    )
                  }
                  placeholder="10-12 digit account number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <Landmark
                  className="h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Recipient Bank Details
                </p>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="bankName"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Bank Name
                </label>
                <input
                  id="bankName"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. First National Bank"
                  autoComplete="off"
                  autoCapitalize="words"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="bankAddress"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Bank Address
                </label>
                <input
                  id="bankAddress"
                  type="text"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  placeholder="Street, city, country"
                  autoComplete="off"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="iban"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  IBAN{" "}
                  <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  id="iban"
                  type="text"
                  value={iban}
                  onChange={(e) =>
                    setIban(e.target.value.toUpperCase().slice(0, 34))
                  }
                  placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  maxLength={34}
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="swiftCode"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  SWIFT / BIC{" "}
                  <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <input
                  id="swiftCode"
                  type="text"
                  value={swiftCode}
                  onChange={(e) =>
                    setSwiftCode(e.target.value.toUpperCase().slice(0, 11))
                  }
                  placeholder="e.g. NWBKGB2L"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  maxLength={11}
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Amount
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
                  <span className="text-slate-400">$</span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={submitting}
                    className="w-full bg-transparent px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="memo"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Memo (optional)
                </label>
                <input
                  id="memo"
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. Rent for June"
                  autoComplete="off"
                  disabled={submitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="transferPin"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Transfer PIN
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
                  <KeyRound
                    className="h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="transferPin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="off"
                    maxLength={4}
                    value={transferPin}
                    onChange={(e) =>
                      setTransferPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="4-digit PIN"
                    disabled={submitting}
                    className="w-full bg-transparent px-3 py-3 text-base tracking-[0.3em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Confirm every transfer with your 4-digit transfer PIN —
                  required for security.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !user?.uid}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Submitting
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit Transfer
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
