"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Receipt,
  ChevronRight,
  Plus,
  Coffee,
  Server,
  ShoppingBag,
  Plane,
  Fuel,
  Landmark,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useAdminTransactions } from "@/utils/useAdminTransactions";

/**
 * app/dashboard/admin/transactions/page.js
 * All Transactions — every transaction across every user, searchable
 * and filterable by status. Tapping a row opens
 * /dashboard/admin/transactions/[id] to edit or delete it. "New
 * Transaction" opens /dashboard/admin/transactions/new.
 */

const CATEGORY_ICONS = {
  Dining: Coffee,
  SaaS: Server,
  Retail: ShoppingBag,
  Travel: Plane,
  Fuel: Fuel,
  Refund: Landmark,
  Transfer: ArrowLeftRight,
  "Admin Balance Credit": Landmark,
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

const STATUS_FILTERS = ["All", "Completed", "Pending", "Failed", "Rejected"];

function formatCurrency(value, currency = "USD") {
  const amount = typeof value === "number" ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency });
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TransactionRow({ txn }) {
  const Icon = CATEGORY_ICONS[txn.category] || Receipt;
  const statusMeta = STATUS_STYLES[txn.status] || STATUS_STYLES.Completed;
  const StatusIcon = statusMeta.icon;
  const isCredit = txn.type === "credit";

  return (
    <Link
      href={`/dashboard/admin/transactions/${txn.id}`}
      className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
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
          <p className="truncate text-sm font-semibold text-slate-900">
            {txn.description}
          </p>
          <p className="truncate text-xs text-slate-500">
            {txn.userName} · {txn.userEmail}
          </p>
          <p className="text-[11px] text-slate-400">
            {formatDate(txn.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={`text-sm font-bold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-slate-900"}`}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(txn.amount, txn.currency)}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {txn.status}
        </span>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function AdminTransactionsPage() {
  const { transactions, loading, error } = useAdminTransactions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = transactions.filter((txn) => {
    if (statusFilter !== "All" && txn.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      txn.userName?.toLowerCase().includes(term) ||
      txn.userEmail?.toLowerCase().includes(term) ||
      txn.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            All Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review, edit, and correct transaction records across every user.
          </p>
        </div>
        <Link
          href="/dashboard/admin/transactions/new"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Transaction
        </Link>
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
          placeholder="Search by user, email, or description"
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

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Loading transactions…
          </p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-600">
            Couldn&rsquo;t load transactions right now. Please try again
            shortly.
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Receipt
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {searchTerm || statusFilter !== "All"
                ? "No transactions match your filters"
                : "No transactions yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
