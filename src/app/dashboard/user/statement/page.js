"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  FileText,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  Coffee,
  Server,
  ShoppingBag,
  Plane,
  Fuel,
  Landmark,
  ArrowLeftRight,
  Receipt,
  HandCoins,
  ChevronRight,
  X,
  Hash,
  User,
  CreditCard,
  MapPin,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import { useUserStatement } from "@/utils/useUserStatement";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";

/**
 * app/dashboard/user/statement/page.js
 * Account Statement — the member's complete transaction history,
 * grouped by month like a traditional bank statement, with a running
 * balance shown against each line (the same `balanceAfter` snapshot
 * every transaction already carries from recordTransaction()/
 * payLoanInstallment() — nothing recomputed here).
 *
 * "Print Statement" uses the browser's native print dialog (works
 * identically as Print or Save-as-PDF on iOS Safari and Android
 * Chrome — no export library needed) and print-only CSS hides the
 * surrounding app chrome (nav, bottom bar, this page's own buttons)
 * so what prints is just the statement itself.
 */

const CATEGORY_ICONS = {
  Dining: Coffee,
  SaaS: Server,
  Retail: ShoppingBag,
  Travel: Plane,
  Fuel: Fuel,
  Refund: Landmark,
  Transfer: ArrowLeftRight,
  "Bill Payment": Receipt,
  "Loan Payment": HandCoins,
  General: Receipt,
};

const STATUS_STYLES = {
  Completed: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
  },
  Pending: { icon: Clock, className: "bg-amber-50 text-amber-700" },
  Failed: { icon: XCircle, className: "bg-rose-50 text-rose-700" },
  Rejected: { icon: XCircle, className: "bg-rose-50 text-rose-700" },
};

function formatCurrency(value, currency = "USD") {
  const amount = Number.isFinite(value) ? value : 0;
  try {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `$${amount.toFixed(2)}`;
  }
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

function useAccountSummary(userId) {
  const [account, setAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAccount(null);
      setLoaded(true);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "accounts", userId),
      (snap) => {
        setAccount(snap.exists() ? snap.data() : null);
        setLoaded(true);
      },
      (err) => {
        console.error("Failed to stream account summary:", err);
        setLoaded(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { account, loaded };
}

function SummaryStat({ label, value, valueClassName }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 text-lg font-bold sm:text-xl ${valueClassName || "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatementRow({ txn, currency, onSelect }) {
  const Icon = CATEGORY_ICONS[txn.category] || Receipt;
  const statusMeta = STATUS_STYLES[txn.status] || STATUS_STYLES.Completed;
  const StatusIcon = statusMeta.icon;
  const isCredit = txn.type === "credit";

  return (
    <button
      type="button"
      onClick={() => onSelect(txn)}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/60 active:bg-slate-100 sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isCredit ? "bg-emerald-50" : "bg-slate-100"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${isCredit ? "text-emerald-600" : "text-slate-500"}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {txn.description}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
            <span>{formatDate(txn.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{txn.category || "General"}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
            >
              <StatusIcon className="h-2.5 w-2.5" aria-hidden="true" />
              {txn.status}
            </span>
          </p>
          {(txn.transactionId || txn.bankName || txn.senderName) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
              {txn.transactionId && (
                <span className="font-mono">Ref {txn.transactionId}</span>
              )}
              {txn.senderName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>From {txn.senderName}</span>
                </>
              )}
              {txn.bankName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{txn.bankName}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={`whitespace-nowrap text-sm font-bold ${
              isCredit ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {isCredit ? (
              <ArrowDownLeft
                className="mr-0.5 inline h-3.5 w-3.5"
                aria-hidden="true"
              />
            ) : (
              <ArrowUpRight
                className="mr-0.5 inline h-3.5 w-3.5"
                aria-hidden="true"
              />
            )}
            {isCredit ? "+" : "-"}
            {formatCurrency(txn.amount, currency)}
          </span>
          <span className="whitespace-nowrap text-[11px] text-slate-400">
            Bal. {formatCurrency(txn.balanceAfter, currency)}
          </span>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-slate-300"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

function DetailField({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function TransactionDetailModal({ txn, currency, onClose }) {
  useEffect(() => {
    if (!txn) return undefined;

    document.body.style.overflow = "hidden";
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [txn, onClose]);

  if (!txn) return null;

  const Icon = CATEGORY_ICONS[txn.category] || Receipt;
  const statusMeta = STATUS_STYLES[txn.status] || STATUS_STYLES.Completed;
  const StatusIcon = statusMeta.icon;
  const isCredit = txn.type === "credit";

  return (
    <div
      className="print:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Transaction details"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isCredit ? "bg-emerald-50" : "bg-slate-100"
              }`}
            >
              <Icon
                className={`h-4.5 w-4.5 ${isCredit ? "text-emerald-600" : "text-slate-500"}`}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {txn.description}
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(txn.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 [-webkit-overflow-scrolling:touch]">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Amount
              </p>
              <p
                className={`mt-0.5 text-lg font-bold ${
                  isCredit ? "text-emerald-600" : "text-slate-900"
                }`}
              >
                {isCredit ? "+" : "-"}
                {formatCurrency(txn.amount, currency)}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
            >
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {txn.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField
              icon={Receipt}
              label="Category"
              value={txn.category || "General"}
            />
            <DetailField
              icon={Wallet}
              label="Balance After"
              value={formatCurrency(txn.balanceAfter, currency)}
            />
          </div>

          {(txn.transactionId ||
            txn.paymentMethod ||
            txn.bankName ||
            txn.senderName ||
            txn.senderAccountNumber) && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Reference Details
              </p>
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  icon={Hash}
                  label="Transaction ID"
                  value={txn.transactionId}
                  mono
                />
                <DetailField
                  icon={CreditCard}
                  label="Payment Method"
                  value={txn.paymentMethod}
                />
                <DetailField
                  icon={Landmark}
                  label="Bank Name"
                  value={txn.bankName}
                />
                <DetailField
                  icon={User}
                  label="Sender Name"
                  value={txn.senderName}
                />
                {txn.senderAccountNumber && (
                  <DetailField
                    icon={Hash}
                    label="Sender Account"
                    value={`••••${txn.senderAccountNumber.slice(-4)}`}
                    mono
                  />
                )}
              </div>
            </div>
          )}

          {(txn.recipientName ||
            txn.recipientAccountNumber ||
            txn.bankAddress ||
            txn.iban ||
            txn.swiftCode) && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Recipient Details
              </p>
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  icon={User}
                  label="Recipient Name"
                  value={txn.recipientName}
                />
                {txn.recipientAccountNumber && (
                  <DetailField
                    icon={Hash}
                    label="Recipient Account"
                    value={`••••${txn.recipientAccountNumber.slice(-4)}`}
                    mono
                  />
                )}
                <DetailField icon={Hash} label="IBAN" value={txn.iban} mono />
                <DetailField
                  icon={Hash}
                  label="SWIFT / BIC"
                  value={txn.swiftCode}
                  mono
                />
                {txn.bankAddress && (
                  <div className="col-span-2">
                    <DetailField
                      icon={MapPin}
                      label="Bank Address"
                      value={txn.bankAddress}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {(txn.memo || txn.rejectionReason) && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              {txn.memo && (
                <DetailField icon={Receipt} label="Memo" value={txn.memo} />
              )}
              {txn.rejectionReason && (
                <DetailField
                  icon={XCircle}
                  label="Rejection Reason"
                  value={txn.rejectionReason}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountStatementPage() {
  const { user, profile } = useAuth();
  const { account, loaded: accountLoaded } = useAccountSummary(user?.uid);
  const { groups, totals, loading, error, truncated } = useUserStatement(
    user?.uid,
  );
  const [selectedTxn, setSelectedTxn] = useState(null);

  const currency = account?.currency || "USD";
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-4 sm:p-6 lg:p-8 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Account Statement
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Your complete transaction history, statement-style.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print:hidden inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Print Statement
        </button>
      </div>

      {/* Statement letterhead */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Account Holder
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {profile?.name || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Account Number
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-900">
              {account?.accountNumber
                ? formatAccountNumberDisplay(account.accountNumber)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Currency
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{currency}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Generated
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {generatedOn}
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat
          label="Current Balance"
          value={
            accountLoaded
              ? formatCurrency(account?.availableBalance ?? 0, currency)
              : "—"
          }
        />
        <SummaryStat
          label="Total Credits"
          value={formatCurrency(totals.totalCredits, currency)}
          valueClassName="text-emerald-600"
        />
        <SummaryStat
          label="Total Debits"
          value={formatCurrency(totals.totalDebits, currency)}
        />
        <SummaryStat label="Transactions" value={totals.transactionCount} />
      </div>

      {/* Statement body */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">Loading your statement…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center shadow-sm">
          <p className="text-sm text-rose-700">
            Couldn&rsquo;t load your statement right now. Please try again
            shortly.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileText
            className="mx-auto h-8 w-8 text-slate-300"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No transactions yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Once you start transacting, your statement will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-bold text-slate-900">
                  {group.label}
                </h3>
                <p className="text-xs text-slate-500">
                  <span className="text-emerald-600">
                    +{formatCurrency(group.totalCredits, currency)}
                  </span>
                  <span className="mx-1.5 text-slate-300" aria-hidden="true">
                    /
                  </span>
                  <span>-{formatCurrency(group.totalDebits, currency)}</span>
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {group.transactions.map((txn) => (
                  <StatementRow
                    key={txn.id}
                    txn={txn}
                    currency={currency}
                    onSelect={setSelectedTxn}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {truncated && (
        <p className="text-center text-xs text-slate-400">
          Showing your most recent 500 transactions. Contact support for older
          records.
        </p>
      )}

      <TransactionDetailModal
        txn={selectedTxn}
        currency={currency}
        onClose={() => setSelectedTxn(null)}
      />
    </div>
  );
}
