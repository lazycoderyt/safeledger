"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  WifiOff,
  ChevronLeft,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import { useTransactionStatus } from "@/utils/useTransactionStatus";
import { recordTransaction, ACCOUNT_NUMBER_PATTERN } from "@/utils/authHelper";

/**
 * app/dashboard/user/transfer/page.js
 * Wire Transfer — the one place a user actually moves money out of
 * their account. Before showing the form, this reads the single global
 * `settings/transactionStatus` document (see
 * utils/useTransactionStatus.js) that any admin can set from
 * /dashboard/admin/settings. If that status is currently marked as
 * blocking, the form is replaced entirely by the status message — the
 * transfer can't even be attempted, not just visually disabled, since
 * the guard is re-checked again before the review step AND again right
 * before the final submit, as a safety net against a stale snapshot or
 * a status change that lands mid-review.
 *
 * Flow mirrors a real bank wire form: fill in details -> review a
 * masked summary (recipients never see their full account number
 * echoed back) -> confirm -> a brief "processing" state -> a receipt
 * screen with a reference number. A completed transfer is recorded as
 * an ordinary debit via recordTransaction(), so it goes through the
 * exact same atomic balance/metrics update (and insufficient-funds
 * guard) as every other transaction in the app — nothing special-cased
 * here.
 */

// Soft per-transfer ceiling. Real wire products gate large transfers
// behind additional verification instead of silently allowing them.
const LARGE_TRANSFER_LIMIT = 25000;

const TONE_ICON = {
  neutral: AlertTriangle,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDateTime(date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function maskAccountNumber(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

function generateReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WT-${stamp}-${rand}`;
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

function FieldError({ children }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
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

  // step: "form" -> "review" -> "processing" -> "success"
  const [step, setStep] = useState("form");

  const [recipientName, setRecipientName] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null); // { balanceAfter, reference, sentAt }
  const [copied, setCopied] = useState(false);

  // Guards against a duplicate submit firing from a fast double-tap on
  // touch devices, on top of the disabled-button guard.
  const submitLockRef = useRef(false);

  const availableBalance = account?.availableBalance ?? 0;

  const numericAmount = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  // If the transfer window closes while the user is sitting on the
  // review screen (admin flips the switch mid-review), bounce them back
  // to the form instead of letting them confirm into a dead end.
  useEffect(() => {
    if (transactionStatus.blocking && step === "review") {
      setStep("form");
      setFormError("Transfers were just disabled. Please try again later.");
    }
  }, [transactionStatus.blocking, step]);

  function validate() {
    const errors = {};
    const trimmedName = recipientName.trim();
    const trimmedAccountNumber = recipientAccountNumber.trim();

    if (!trimmedName) {
      errors.recipientName = "Enter the recipient's name.";
    }
    if (!ACCOUNT_NUMBER_PATTERN.test(trimmedAccountNumber)) {
      errors.recipientAccountNumber =
        "Enter a valid 10-12 digit account number, with no leading zero.";
    }
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      errors.amount = "Enter an amount greater than zero.";
    } else if (accountLoaded && numericAmount > availableBalance) {
      errors.amount = "This transfer exceeds your available balance.";
    } else if (numericAmount > LARGE_TRANSFER_LIMIT) {
      errors.amount = `Transfers over ${formatCurrency(
        LARGE_TRANSFER_LIMIT,
      )} need additional verification. Contact support to send this amount.`;
    }

    return errors;
  }

  function handleContinueToReview(e) {
    e.preventDefault();
    setFormError("");

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

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStep("review");
  }

  function handleEdit() {
    setFormError("");
    setStep("form");
  }

  async function handleConfirm() {
    setFormError("");

    // Defensive re-check — the guard above already bounces the user out
    // of "review" the moment status flips, but this covers the narrow
    // window where confirm is tapped in the same tick as a change.
    if (transactionStatus.blocking) {
      setStep("form");
      setFormError(
        "Transfers are currently unavailable. Please try again later.",
      );
      return;
    }
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setStep("processing");

    try {
      const trimmedName = recipientName.trim();
      const trimmedAccountNumber = recipientAccountNumber.trim();
      const last4 = trimmedAccountNumber.slice(-4);
      const description = memo.trim()
        ? `Wire to ${trimmedName} (••••${last4}) — ${memo.trim()}`
        : `Wire to ${trimmedName} (••••${last4})`;

      const { balanceAfter } = await recordTransaction(user.uid, {
        type: "debit",
        amount: numericAmount,
        description,
        category: "Transfer",
        status: "Completed",
      });

      setResult({
        balanceAfter,
        reference: generateReference(),
        sentAt: new Date(),
        recipientName: trimmedName,
        recipientAccountNumber: trimmedAccountNumber,
        amount: numericAmount,
        memo: memo.trim(),
      });
      setStep("success");
    } catch (err) {
      console.error("Failed to send transfer:", err);
      setFormError(
        err.message || "Couldn't send this transfer. Please try again.",
      );
      setStep("review");
    } finally {
      submitLockRef.current = false;
    }
  }

  function handleStartNewTransfer() {
    setRecipientName("");
    setRecipientAccountNumber("");
    setAmount("");
    setMemo("");
    setFieldErrors({});
    setFormError("");
    setResult(null);
    setCopied(false);
    setStep("form");
  }

  async function handleCopyReference() {
    if (!result?.reference) return;
    try {
      await navigator.clipboard.writeText(result.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older WebViews); fail quietly,
      // the reference is still visible and selectable on screen.
    }
  }

  const submitting = step === "processing";

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Send className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Wire Transfer
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Send funds from your SafeLedger account to another account.
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
          {transactionStatus.message && step === "form" && (
            <Banner tone="neutral" icon={WifiOff}>
              {transactionStatus.message}
            </Banner>
          )}

          {step !== "success" && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
              <span className="text-sm text-slate-500">Available Balance</span>
              <span className="text-base font-bold text-slate-900">
                {accountLoaded ? formatCurrency(availableBalance) : "—"}
              </span>
            </div>
          )}

          {formError && (
            <Banner tone="error" icon={AlertCircle}>
              {formError}
            </Banner>
          )}

          {step === "form" && (
            <form
              onSubmit={handleContinueToReview}
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
                    aria-invalid={Boolean(fieldErrors.recipientName)}
                    aria-describedby={
                      fieldErrors.recipientName
                        ? "recipientName-error"
                        : undefined
                    }
                    className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                      fieldErrors.recipientName
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                    }`}
                  />
                  {fieldErrors.recipientName && (
                    <span id="recipientName-error">
                      <FieldError>{fieldErrors.recipientName}</FieldError>
                    </span>
                  )}
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
                    aria-invalid={Boolean(fieldErrors.recipientAccountNumber)}
                    aria-describedby={
                      fieldErrors.recipientAccountNumber
                        ? "recipientAccountNumber-error"
                        : undefined
                    }
                    className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-base tracking-wide text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-1 ${
                      fieldErrors.recipientAccountNumber
                        ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                        : "border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                    }`}
                  />
                  {fieldErrors.recipientAccountNumber && (
                    <span id="recipientAccountNumber-error">
                      <FieldError>
                        {fieldErrors.recipientAccountNumber}
                      </FieldError>
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                  >
                    Amount
                  </label>
                  <div
                    className={`mt-2 flex items-center rounded-xl border bg-white px-4 focus-within:ring-1 ${
                      fieldErrors.amount
                        ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-500"
                        : "border-slate-200 focus-within:border-blue-600 focus-within:ring-blue-600"
                    }`}
                  >
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
                      aria-invalid={Boolean(fieldErrors.amount)}
                      aria-describedby={
                        fieldErrors.amount ? "amount-error" : undefined
                      }
                      className="w-full bg-transparent px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  {fieldErrors.amount && (
                    <span id="amount-error">
                      <FieldError>{fieldErrors.amount}</FieldError>
                    </span>
                  )}
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
                    maxLength={140}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!user?.uid}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
              >
                Review Transfer
              </button>
            </form>
          )}

          {(step === "review" || step === "processing") && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Review &amp; Confirm
                </h2>
                {step === "review" && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </button>
                )}
              </div>

              <dl className="mt-4 divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Recipient</dt>
                  <dd className="font-semibold text-slate-900">
                    {recipientName.trim()}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Account</dt>
                  <dd className="font-mono font-semibold text-slate-900">
                    {maskAccountNumber(recipientAccountNumber)}
                  </dd>
                </div>
                {memo.trim() && (
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="shrink-0 text-slate-500">Memo</dt>
                    <dd className="truncate text-right font-medium text-slate-700">
                      {memo.trim()}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Transfer fee</dt>
                  <dd className="font-medium text-slate-700">$0.00</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="font-semibold text-slate-900">Total amount</dt>
                  <dd className="text-base font-bold text-slate-900">
                    {formatCurrency(numericAmount)}
                  </dd>
                </div>
              </dl>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Funds are typically available to the recipient within one
                business day.
              </p>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Processing your transfer securely…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Confirm &amp; Send {formatCurrency(numericAmount)}
                  </>
                )}
              </button>
            </div>
          )}

          {step === "success" && result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-600">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-base font-bold text-emerald-900">
                Transfer sent
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(result.amount)}
              </p>
              <p className="text-sm text-emerald-800">
                to {result.recipientName} (
                {maskAccountNumber(result.recipientAccountNumber)})
              </p>

              <dl className="mx-auto mt-6 max-w-sm divide-y divide-emerald-100 rounded-xl bg-white/70 px-4 text-left text-sm">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                    {result.reference}
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      aria-label="Copy reference number"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">Date</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDateTime(result.sentAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-slate-500">New balance</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatCurrency(result.balanceAfter)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={handleStartNewTransfer}
                className="mt-6 rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                Send another transfer
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
