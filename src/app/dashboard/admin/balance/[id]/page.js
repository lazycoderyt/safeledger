"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Landmark,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useAdminUserDetail } from "@/utils/useAdminUserDetails";
import { recordTransaction } from "@/utils/authHelper";
import { formatAccountNumberDisplay } from "@/utils/Cryptogenacc";
import RecentTransactions from "@/components/user/Recenttransaction";

/**
 * app/dashboard/admin/balance/[id]/page.js
 * Fund Account (detail) — view a specific user's real balance and
 * apply a credit or debit adjustment. Adjustments go through
 * recordTransaction(), the same atomic Firestore-transaction path
 * regular transfers use, so every admin adjustment leaves a real
 * transaction record in the user's own history rather than silently
 * overwriting a number. Debits are still blocked from overdrawing the
 * account, same as anywhere else in the app.
 */

function formatCurrency(value) {
  if (typeof value !== "number") return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

export default function AdminUserBalancePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;

  const {
    profile,
    account,
    loading,
    error: loadError,
  } = useAdminUserDetail(userId);

  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSuccess(false);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setFormError("Add a short reason for this adjustment.");
      return;
    }

    setSubmitting(true);
    try {
      await recordTransaction(userId, {
        type,
        amount: numericAmount,
        description: description.trim(),
        category: "Admin Adjustment",
        status: "Completed",
      });
      setAmount("");
      setDescription("");
      setSuccess(true);
    } catch (err) {
      console.error("Balance adjustment failed:", err);
      setFormError(
        err.message || "Couldn't apply this adjustment. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl bg-white p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-slate-400">Loading user…</p>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 bg-white p-4 sm:p-6 lg:p-8">
        <Link
          href="/dashboard/admin/balance"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Fund Account
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-700">
            This user couldn&rsquo;t be found. They may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/admin/balance")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Fund Account
      </button>

      {/* User header */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-700 border border-indigo-200">
            {getInitials(profile.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">
            {profile.name}
          </p>
          <p className="truncate text-sm text-slate-500">{profile.email}</p>
          {profile.accountNumber && (
            <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
              {formatAccountNumberDisplay(profile.accountNumber)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Available Balance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(account?.availableBalance)}
          </p>
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <AlertCircle
            className="h-4 w-4 shrink-0 mt-0.5 text-rose-600"
            aria-hidden="true"
          />
          <p className="text-sm text-rose-700">{formError}</p>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600"
            aria-hidden="true"
          />
          <p className="text-sm text-emerald-700">
            Adjustment applied and recorded.
          </p>
        </div>
      )}

      {/* Adjustment form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Landmark className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          Adjust Balance
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          This creates a real transaction on the user&rsquo;s account — it will
          show up in their history.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType("credit")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              type === "credit"
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
            Credit (Add Funds)
          </button>
          <button
            type="button"
            onClick={() => setType("debit")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
              type === "debit"
                ? "border-rose-600 bg-rose-50 text-rose-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Debit (Remove Funds)
          </button>
        </div>

        <div className="mt-5">
          <label
            htmlFor="amount"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Amount
          </label>
          <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
            <span className="text-slate-400">$</span>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5">
          <label
            htmlFor="description"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Reason
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Refund for duplicate charge"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Applying
            </>
          ) : (
            "Apply Adjustment"
          )}
        </button>
      </form>

      <RecentTransactions
        userId={userId}
        title="This User's Recent Transactions"
      />
    </div>
  );
}
