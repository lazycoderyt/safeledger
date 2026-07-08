"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Receipt,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  WifiOff,
  Zap,
  Droplet,
  Wifi,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Home,
  Landmark,
  MoreHorizontal,
  HandCoins,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import { useTransactionStatus } from "@/utils/useTransactionStatus";
import { useUserLoans } from "@/utils/Useuserloans";
import { recordTransaction, payLoanInstallment } from "@/utils/authHelper";

/**
 * app/dashboard/user/billpay/page.js
 * Bill Pay & Settlement — two related but distinct ways money leaves
 * the account:
 *   1. "Pay a Bill" — an ordinary one-off payment to a biller/payee,
 *      recorded exactly like a wire transfer (recordTransaction, an
 *      ordinary debit).
 *   2. "Loan Settlement" — a payment applied directly to one of the
 *      member's own Active loans/mortgages, which atomically debits
 *      the ledger *and* reduces that loan's remainingBalance via
 *      payLoanInstallment() — never two separate writes that could
 *      drift apart.
 *
 * Both tabs share the same global transaction-status gate as the wire
 * transfer page: if an admin has marked transactions as currently
 * blocking (see /dashboard/admin/settings), neither tab's form is
 * shown, just the status message — re-checked again at submit time as
 * a safety net against a stale snapshot.
 */

const BILL_CATEGORIES = [
  { key: "electricity", label: "Electricity", icon: Zap },
  { key: "water", label: "Water", icon: Droplet },
  { key: "internet", label: "Internet & Cable", icon: Wifi },
  { key: "mobile", label: "Mobile Phone", icon: Smartphone },
  { key: "insurance", label: "Insurance", icon: ShieldCheck },
  { key: "credit-card", label: "Credit Card", icon: CreditCard },
  { key: "rent", label: "Rent", icon: Home },
  { key: "other", label: "Other", icon: MoreHorizontal },
];

const TONE_ICON = {
  neutral: AlertTriangle,
  warning: AlertTriangle,
  danger: ShieldAlert,
};

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
        Payments are currently unavailable
      </p>
      <p className={`mx-auto mt-2 max-w-md text-sm ${textClasses}`}>
        {status.message}
      </p>
    </div>
  );
}

function useAccountBalance(userId) {
  const [account, setAccount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAccount(null);
      setAccountLoaded(true);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "accounts", userId),
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
  }, [userId]);

  return { account, accountLoaded };
}

/* ------------------------------- Pay a Bill ------------------------------ */

function PayBillForm({
  userId,
  availableBalance,
  accountLoaded,
  transactionStatus,
}) {
  const [category, setCategory] = useState(null);
  const [billerName, setBillerName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);

  const numericAmount = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setResult(null);

    if (transactionStatus.blocking) {
      setFormError(
        "Payments are currently unavailable. Please try again later.",
      );
      return;
    }
    if (!userId) {
      setFormError("You need to be signed in to pay a bill.");
      return;
    }
    if (!category) {
      setFormError("Choose a bill category.");
      return;
    }
    const trimmedBiller = billerName.trim();
    if (!trimmedBiller) {
      setFormError("Enter the biller or payee name.");
      return;
    }
    const trimmedReference = referenceNumber.trim();
    if (!trimmedReference) {
      setFormError("Enter the account or reference number for this bill.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (accountLoaded && numericAmount > availableBalance) {
      setFormError("This payment exceeds your available balance.");
      return;
    }

    setSubmitting(true);
    try {
      const categoryLabel =
        BILL_CATEGORIES.find((c) => c.key === category)?.label || "Bill";
      const description = memo.trim()
        ? `${categoryLabel} — ${trimmedBiller} (Ref ${trimmedReference}) — ${memo.trim()}`
        : `${categoryLabel} — ${trimmedBiller} (Ref ${trimmedReference})`;

      const { balanceAfter } = await recordTransaction(userId, {
        type: "debit",
        amount: numericAmount,
        description,
        category: "Bill Payment",
        status: "Completed",
      });

      setResult({ balanceAfter });
      setCategory(null);
      setBillerName("");
      setReferenceNumber("");
      setAmount("");
      setMemo("");
    } catch (err) {
      console.error("Failed to pay bill:", err);
      setFormError(
        err.message || "Couldn't process this payment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {formError && (
        <Banner tone="error" icon={AlertCircle}>
          {formError}
        </Banner>
      )}
      {result && (
        <Banner tone="success" icon={CheckCircle2}>
          Bill paid. Your new available balance is{" "}
          {formatCurrency(result.balanceAfter)}.
        </Banner>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Bill Category
        </p>
        <div
          role="radiogroup"
          aria-label="Bill category"
          className="mt-2.5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {BILL_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const selected = category === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(cat.key)}
                disabled={submitting}
                className={`flex shrink-0 flex-col items-center gap-1.5 rounded-xl border px-4 py-3 text-xs font-medium transition-colors disabled:opacity-60 ${
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="billerName"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Biller / Payee Name
            </label>
            <input
              id="billerName"
              type="text"
              value={billerName}
              onChange={(e) => setBillerName(e.target.value)}
              placeholder="e.g. Pacific Gas & Electric"
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="referenceNumber"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Account / Reference Number
            </label>
            <input
              id="referenceNumber"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value.slice(0, 40))}
              placeholder="Your account number with this biller"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              maxLength={40}
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="billAmount"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Amount
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <span className="text-slate-400">$</span>
              <input
                id="billAmount"
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
              htmlFor="billMemo"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Memo (optional)
            </label>
            <input
              id="billMemo"
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. June statement"
              autoComplete="off"
              disabled={submitting}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !userId}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Paying
            </>
          ) : (
            <>
              <Receipt className="h-4 w-4" aria-hidden="true" />
              Pay Bill
            </>
          )}
        </button>
      </form>
    </>
  );
}

/* --------------------------- Loan Settlement --------------------------- */

function LoanSettlementForm({ userId, transactionStatus }) {
  const { loans: institutionalLoans, loading: institutionalLoading } =
    useUserLoans(userId, "institutional");
  const { loans: mortgageLoans, loading: mortgageLoading } = useUserLoans(
    userId,
    "mortgage",
  );

  const activeLoans = useMemo(() => {
    return [...institutionalLoans, ...mortgageLoans]
      .filter((loan) => loan.status === "Active")
      .sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
      );
  }, [institutionalLoans, mortgageLoans]);

  const loansLoading = institutionalLoading || mortgageLoading;

  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [amount, setAmount] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);

  const selectedLoan =
    activeLoans.find((loan) => loan.id === selectedLoanId) || null;

  const numericAmount = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [amount]);

  function handleSelectLoan(loan) {
    setSelectedLoanId(loan.id);
    setAmount(
      loan.monthlyPayment ? String(loan.monthlyPayment.toFixed(2)) : "",
    );
    setFormError("");
    setResult(null);
  }

  function handlePayInFull() {
    if (selectedLoan) {
      setAmount(String((selectedLoan.remainingBalance ?? 0).toFixed(2)));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setResult(null);

    if (transactionStatus.blocking) {
      setFormError(
        "Payments are currently unavailable. Please try again later.",
      );
      return;
    }
    if (!userId) {
      setFormError("You need to be signed in to make a loan payment.");
      return;
    }
    if (!selectedLoan) {
      setFormError("Choose a loan to pay toward.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Enter a payment amount greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await payLoanInstallment(
        userId,
        selectedLoan.id,
        numericAmount,
      );
      setResult(outcome);
      setAmount("");
      if (outcome.paidOff) setSelectedLoanId(null);
    } catch (err) {
      console.error("Failed to apply loan payment:", err);
      setFormError(
        err.message || "Couldn't process this payment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loansLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-400">Loading your loans…</p>
      </div>
    );
  }

  if (activeLoans.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <HandCoins
          className="mx-auto h-8 w-8 text-slate-300"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-slate-600">
          No active loans to settle
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Once a loan or mortgage application is approved, it&rsquo;ll appear
          here for payments.
        </p>
      </div>
    );
  }

  return (
    <>
      {formError && (
        <Banner tone="error" icon={AlertCircle}>
          {formError}
        </Banner>
      )}
      {result && (
        <Banner tone="success" icon={CheckCircle2}>
          {result.paidOff
            ? "Loan paid off in full. Congratulations!"
            : `Payment applied. Remaining balance is ${formatCurrency(result.remainingBalance)}.`}
        </Banner>
      )}

      <div className="space-y-2.5">
        {activeLoans.map((loan) => {
          const selected = selectedLoanId === loan.id;
          const Icon = loan.loanType === "mortgage" ? Home : Landmark;
          return (
            <button
              key={loan.id}
              type="button"
              onClick={() => handleSelectLoan(loan)}
              disabled={submitting}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors disabled:opacity-60 ${
                selected
                  ? "border-blue-600 bg-blue-50/60"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  selected
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {loan.purpose || "Loan"}
                </p>
                <p className="text-xs text-slate-500">
                  Next due {formatDate(loan.nextPaymentDate)} · Monthly{" "}
                  {formatCurrency(loan.monthlyPayment)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">Remaining</p>
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(loan.remainingBalance)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedLoan && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          noValidate
        >
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="settlementAmount"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Payment Amount
            </label>
            <button
              type="button"
              onClick={handlePayInFull}
              disabled={submitting}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
            >
              Pay in Full
            </button>
          </div>
          <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
            <span className="text-slate-400">$</span>
            <input
              id="settlementAmount"
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

          <button
            type="submit"
            disabled={submitting || !userId}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processing
              </>
            ) : (
              <>
                <HandCoins className="h-4 w-4" aria-hidden="true" />
                Make Payment
              </>
            )}
          </button>
        </form>
      )}
    </>
  );
}

/* ---------------------------------- Page --------------------------------- */

export default function BillPaySettlementPage() {
  const { user } = useAuth();
  const { status: transactionStatus, loading: statusLoading } =
    useTransactionStatus();
  const { account, accountLoaded } = useAccountBalance(user?.uid);
  const [tab, setTab] = useState("bill");

  const availableBalance = account?.availableBalance ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <Receipt className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Bill Pay & Settlement
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pay a biller directly, or apply a payment toward one of your active
          loans.
        </p>
      </div>

      {statusLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">Checking payment status…</p>
        </div>
      ) : transactionStatus.blocking ? (
        <BlockedStatusCard status={transactionStatus} />
      ) : (
        <>
          {transactionStatus.message && (
            <Banner tone="neutral" icon={WifiOff}>
              {transactionStatus.message}
            </Banner>
          )}

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
            <span className="text-sm text-slate-500">Available Balance</span>
            <span className="text-base font-bold text-slate-900">
              {accountLoaded ? formatCurrency(availableBalance) : "—"}
            </span>
          </div>

          <div
            role="tablist"
            aria-label="Bill pay or loan settlement"
            className="flex gap-2 rounded-full bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "bill"}
              onClick={() => setTab("bill")}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                tab === "bill"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Pay a Bill
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "settlement"}
              onClick={() => setTab("settlement")}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                tab === "settlement"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Loan Settlement
            </button>
          </div>

          {tab === "bill" ? (
            <PayBillForm
              userId={user?.uid}
              availableBalance={availableBalance}
              accountLoaded={accountLoaded}
              transactionStatus={transactionStatus}
            />
          ) : (
            <LoanSettlementForm
              userId={user?.uid}
              transactionStatus={transactionStatus}
            />
          )}
        </>
      )}
    </div>
  );
}
