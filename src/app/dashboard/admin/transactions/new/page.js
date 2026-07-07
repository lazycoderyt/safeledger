"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAdminUserDirectory } from "@/utils/useAdminUserDirectory";
import { adminCreateTransaction } from "@/utils/authHelper";
import { useAuth } from "@/context/AuthContext";

/**
 * app/dashboard/admin/transactions/new/page.js
 * Create a transaction on any user's account, with an admin-chosen
 * date/time (backdating supported). Goes through
 * adminCreateTransaction(), which applies the same atomic
 * balance/metrics update every other transaction in the app uses.
 */

const CATEGORY_OPTIONS = [
  "General",
  "Dining",
  "SaaS",
  "Retail",
  "Travel",
  "Fuel",
  "Refund",
  "Transfer",
  "Admin Adjustment",
];

const STATUS_OPTIONS = ["Completed", "Pending", "Failed"];

function toDatetimeLocalValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

export default function AdminNewTransactionPage() {
  const router = useRouter();
  const { user: currentAdmin } = useAuth();
  const { users, loading: usersLoading } = useAdminUserDirectory();

  const [userId, setUserId] = useState("");
  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState("Completed");
  const [dateValue, setDateValue] = useState(() =>
    toDatetimeLocalValue(new Date()),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const numericAmount = Number(amount);

    if (!userId) {
      setError("Select which user this transaction belongs to.");
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setError("Add a short description for this transaction.");
      return;
    }
    const transactionDate = new Date(dateValue);
    if (Number.isNaN(transactionDate.getTime())) {
      setError("Enter a valid date and time.");
      return;
    }

    setSubmitting(true);
    try {
      await adminCreateTransaction(
        userId,
        {
          type,
          amount: numericAmount,
          description: description.trim(),
          category,
          status,
          transactionDate,
        },
        currentAdmin?.uid,
      );
      setSuccess(true);
      setAmount("");
      setDescription("");
    } catch (err) {
      console.error("Failed to create transaction:", err);
      setError(
        err.message || "Couldn't create this transaction. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <Link
        href="/dashboard/admin/transactions"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to All Transactions
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New Transaction
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a transaction directly on a user&rsquo;s account.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <AlertCircle
            className="h-4 w-4 shrink-0 mt-0.5 text-rose-600"
            aria-hidden="true"
          />
          <p className="text-sm text-rose-700">{error}</p>
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
            Transaction created.{" "}
            <button
              type="button"
              onClick={() => router.push("/dashboard/admin/transactions")}
              className="font-semibold underline"
            >
              View all transactions
            </button>
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
      >
        <div>
          <label
            htmlFor="userId"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            User
          </label>
          <select
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={usersLoading}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-60"
          >
            <option value="" disabled>
              {usersLoading ? "Loading users…" : "Select a user"}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

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
            Credit
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
            Debit
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
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

          <div>
            <label
              htmlFor="status"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="dateValue"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Date &amp; Time
            </label>
            <input
              id="dateValue"
              type="datetime-local"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Defaults to now — set an earlier date to backdate this
              transaction.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Manual correction for support ticket #482"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creating
            </>
          ) : (
            "Create Transaction"
          )}
        </button>
      </form>
    </div>
  );
}
