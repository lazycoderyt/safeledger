"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  HandCoins,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Landmark,
  Home,
} from "lucide-react";
import { useAdminLoans } from "@/utils/useAdminLoans";
import { formatTermLabel } from "@/utils/loanCalculations";

/**
 * app/dashboard/admin/loans/page.js
 * All Loan Applications — every institutional loan and mortgage across
 * every user, searchable and filterable by status. Tapping a row opens
 * /dashboard/admin/loans/[id] to approve or reject it.
 */

const STATUS_STYLES = {
  "Pending Review": { icon: Clock, className: "bg-amber-50 text-amber-700" },
  Active: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  Rejected: { icon: XCircle, className: "bg-rose-50 text-rose-700" },
  "Paid Off": { icon: CheckCircle2, className: "bg-slate-100 text-slate-600" },
};

const STATUS_FILTERS = [
  "All",
  "Pending Review",
  "Active",
  "Rejected",
  "Paid Off",
];
const TYPE_FILTERS = [
  { label: "All Types", value: "All" },
  { label: "Institutional", value: "institutional" },
  { label: "Mortgage", value: "mortgage" },
];

function formatCurrency(value) {
  const amount = typeof value === "number" ? value : 0;
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

function LoanRow({ loan }) {
  const Icon = loan.loanType === "mortgage" ? Home : Landmark;
  const statusMeta =
    STATUS_STYLES[loan.status] || STATUS_STYLES["Pending Review"];
  const StatusIcon = statusMeta.icon;

  return (
    <Link
      href={`/dashboard/admin/loans/${loan.id}`}
      className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {loan.purpose || "Loan Application"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {loan.userName} · {loan.userEmail}
          </p>
          <p className="text-[11px] text-slate-400">
            {loan.loanType === "mortgage" ? "Mortgage" : "Institutional Loan"} ·{" "}
            {formatTermLabel(loan.termMonths)} · Applied{" "}
            {formatDate(loan.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-bold whitespace-nowrap text-slate-900">
          {formatCurrency(loan.principal)}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {loan.status}
        </span>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function AdminLoansPage() {
  const { loans, loading, error } = useAdminLoans();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = loans.filter((loan) => {
    if (statusFilter !== "All" && loan.status !== statusFilter) return false;
    if (typeFilter !== "All" && loan.loanType !== typeFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      loan.userName?.toLowerCase().includes(term) ||
      loan.userEmail?.toLowerCase().includes(term) ||
      loan.purpose?.toLowerCase().includes(term) ||
      loan.propertyAddress?.toLowerCase().includes(term)
    );
  });

  const pendingCount = loans.filter(
    (loan) => loan.status === "Pending Review",
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Loan Applications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve or reject pending loan and mortgage applications.
          {pendingCount > 0 && (
            <span className="ml-1 font-semibold text-amber-700">
              {pendingCount} awaiting review.
            </span>
          )}
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by applicant, email, or purpose"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === status
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTypeFilter(option.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              typeFilter === option.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Loading loan applications…
          </p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-600">
            Couldn&rsquo;t load loan applications right now. Please try again
            shortly.
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <HandCoins
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {searchTerm || statusFilter !== "All" || typeFilter !== "All"
                ? "No applications match your filters"
                : "No loan applications yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
