"use client";

import Link from "next/link";
import {
  Users,
  Wallet,
  Clock,
  HandCoins,
  ArrowLeftRight,
  UserCog,
  Receipt,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { useAdminOverview } from "@/utils/useAdminOverview";

/**
 * app/dashboard/admin/page.js
 * Admin Dashboard — overview stats, quick actions, and a "Needs
 * Attention" panel listing real pending transactions/loans. Every
 * figure comes from useAdminOverview (live Firestore data); nothing
 * here is mocked.
 */

const QUICK_ACTIONS = [
  { label: "Fund Account", href: "/dashboard/admin/balance", icon: Wallet },
  { label: "Edit User Info", href: "/dashboard/admin/users", icon: UserCog },
  {
    label: "Review Transactions",
    href: "/dashboard/admin/transactions",
    icon: ArrowLeftRight,
  },
  {
    label: "Loan Applications",
    href: "/dashboard/admin/loans",
    icon: HandCoins,
  },
];

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

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <Icon className="h-4 w-4 text-indigo-600" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-3 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}

function QuickActions() {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">Quick Actions</h2>
      <p className="mt-1 text-sm text-slate-500">
        Jump straight into the tools you use most.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-transparent px-4 py-6 text-center transition-colors hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PendingTransactionsPanel({ transactions, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">
          Pending Transactions
        </h3>
        <Link
          href="/dashboard/admin/transactions"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          Nothing pending. You&rsquo;re all caught up.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {transactions.slice(0, 5).map((txn) => (
            <li
              key={txn.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50">
                  <Clock
                    className="h-4 w-4 text-amber-600"
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {txn.description || "Transaction"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(txn.createdAt)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-900">
                {formatCurrency(txn.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingLoansPanel({ loans, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">
          Pending Loan Applications
        </h3>
        <Link
          href="/dashboard/admin/loans"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : loans.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No applications waiting on review.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {loans.slice(0, 5).map((loan) => (
            <li
              key={loan.id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50">
                  <HandCoins
                    className="h-4 w-4 text-amber-600"
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {loan.purpose ||
                      (loan.loanType === "mortgage" ? "Mortgage" : "Loan")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(loan.createdAt)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-900">
                {formatCurrency(loan.principal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const {
    userCount,
    totalBalance,
    pendingTransactions,
    pendingLoans,
    loading,
  } = useAdminOverview();

  return (
    <div className="mx-auto max-w-6xl space-y-8 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Oversight and controls for the SafeLedger platform.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total Users" value={userCount} icon={Users} />
        <StatCard
          label="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={Landmark}
        />
        <StatCard
          label="Pending Transactions"
          value={pendingTransactions.length}
          icon={Clock}
        />
        <StatCard
          label="Pending Loans"
          value={pendingLoans.length}
          icon={Receipt}
        />
      </div>

      <QuickActions />

      {/* Needs attention */}
      <div>
        <h2 className="text-base font-bold text-slate-900">Needs Attention</h2>
        <p className="mt-1 text-sm text-slate-500">
          Items waiting on a decision from you.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PendingTransactionsPanel
            transactions={pendingTransactions}
            loading={loading}
          />
          <PendingLoansPanel loans={pendingLoans} loading={loading} />
        </div>
      </div>
    </div>
  );
}
