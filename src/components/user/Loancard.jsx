"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  CalendarClock,
  MapPin,
} from "lucide-react";
import { formatTermLabel } from "@/utils/loanCalculations";

/**
 * components/user/LoanCard.jsx
 * Displays a single loan or mortgage document exactly as stored in
 * Firestore — no derived figures beyond a simple paid-down percentage.
 * Pending applications show "Pending underwriting" instead of a rate
 * or payment, since neither exists until approval.
 */

const STATUS_META = {
  "Pending Review": { badge: "bg-amber-50 text-amber-700", icon: Clock },
  Approved: { badge: "bg-blue-50 text-blue-700", icon: CheckCircle2 },
  Active: { badge: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  Rejected: { badge: "bg-rose-50 text-rose-700", icon: XCircle },
  "Paid Off": { badge: "bg-slate-100 text-slate-600", icon: CheckCircle2 },
};

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LoanCard({ loan }) {
  const statusMeta = STATUS_META[loan.status] || STATUS_META["Pending Review"];
  const StatusIcon = statusMeta.icon;
  const isPending =
    loan.status === "Pending Review" || loan.status === "Rejected";
  const paidPercent =
    loan.principal > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              ((loan.principal - (loan.remainingBalance ?? loan.principal)) /
                loan.principal) *
                100,
            ),
          ),
        )
      : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {loan.loanType === "mortgage" ? "Mortgage" : "Institutional Loan"}
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            {loan.purpose}
          </h3>
          {loan.propertyAddress && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {loan.propertyAddress}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {loan.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {isPending ? "Requested" : "Principal"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatCurrency(loan.principal)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Term
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {formatTermLabel(loan.termMonths)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Interest Rate
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-900">
            {typeof loan.interestRate === "number" ? (
              <>
                <Percent
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-hidden="true"
                />
                {loan.interestRate.toFixed(2)}
              </>
            ) : (
              <span className="text-xs font-medium text-slate-400">
                Pending underwriting
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Monthly Payment
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {typeof loan.monthlyPayment === "number" ? (
              formatCurrency(loan.monthlyPayment)
            ) : (
              <span className="text-xs font-medium text-slate-400">—</span>
            )}
          </p>
        </div>
      </div>

      {loan.status === "Active" && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatCurrency(loan.remainingBalance)} remaining</span>
            <span>{paidPercent}% paid down</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          {loan.nextPaymentDate && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              Next payment due {formatDate(loan.nextPaymentDate)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
