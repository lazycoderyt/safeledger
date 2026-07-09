"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Scale,
  Receipt,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTransactionAnalytics } from "@/components/user/Transactionanalytics";
import {
  CategoryBreakdownChart,
  MonthlyTrendChart,
} from "@/components/user/Analyticschart";

/**
 * app/dashboard/user/accounts/page.js
 * Account Analytics — every figure on this page is derived live from
 * the user's real `transactions` collection via useTransactionAnalytics.
 * No mock or placeholder data.
 */

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent?.bg || "bg-blue-50"}`}
        >
          <Icon
            className={`h-4 w-4 ${accent?.text || "text-blue-600"}`}
            aria-hidden="true"
          />
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </p>
      </div>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight ${accent?.value || "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ icon: Icon, label, count, className }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}: {count}
    </span>
  );
}

export default function AccountAnalyticsPage() {
  const { user } = useAuth();
  const {
    loading,
    error,
    hasData,
    totals,
    categoryBreakdown,
    categoryGrandTotal,
    monthlyTrend,
  } = useTransactionAnalytics(user?.uid);

  return (
    <div className="mx-auto max-w-6xl space-y-8 bg-white p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Account Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time insights generated from your transaction history.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-400">
            Crunching your transaction history…
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center shadow-sm">
          <p className="text-sm text-rose-700">
            Couldn&rsquo;t load your analytics right now. Please try again
            shortly.
          </p>
        </div>
      ) : !hasData ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Scale
            className="mx-auto h-8 w-8 text-slate-300"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-slate-600">
            No analytics yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Once you start transacting, your spending insights will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Credits"
              value={formatCurrency(totals.totalCredits)}
              icon={ArrowDownLeft}
              accent={{
                bg: "bg-emerald-50",
                text: "text-emerald-600",
                value: "text-emerald-600",
              }}
            />
            <StatCard
              label="Total Debits"
              value={formatCurrency(totals.totalDebits)}
              icon={ArrowUpRight}
              accent={{ bg: "bg-slate-100", text: "text-slate-600" }}
            />
            <StatCard
              label="Net Change"
              value={formatCurrency(totals.netChange)}
              icon={Scale}
              accent={
                totals.netChange >= 0
                  ? {
                      bg: "bg-emerald-50",
                      text: "text-emerald-600",
                      value: "text-emerald-600",
                    }
                  : {
                      bg: "bg-rose-50",
                      text: "text-rose-600",
                      value: "text-rose-600",
                    }
              }
            />
            <StatCard
              label="Average Transaction"
              value={formatCurrency(totals.averageTransaction)}
              icon={Receipt}
            />
          </div>

          {/* Transaction health */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Transaction Activity
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {totals.transactionCount} transaction
                  {totals.transactionCount === 1 ? "" : "s"} recorded in total
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill
                  icon={CheckCircle2}
                  label="Completed"
                  count={totals.completedCount}
                  className="bg-emerald-50 text-emerald-700"
                />
                <StatusPill
                  icon={Clock}
                  label="Pending"
                  count={totals.pendingCount}
                  className="bg-amber-50 text-amber-700"
                />
                <StatusPill
                  icon={XCircle}
                  label="Failed"
                  count={totals.failedCount}
                  className="bg-rose-50 text-rose-700"
                />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Spending by Category
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Based on all completed and pending debits.
              </p>
              <div className="mt-5">
                <CategoryBreakdownChart
                  categories={
                    categoryBreakdown == "Admin Adjustment"
                      ? "Credits"
                      : categoryBreakdown
                  }
                  grandTotal={categoryGrandTotal}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">
                Credits vs. Debits — Last 6 Months
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Monthly totals from your transaction history.
              </p>
              <div className="mt-5">
                <MonthlyTrendChart months={monthlyTrend} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
