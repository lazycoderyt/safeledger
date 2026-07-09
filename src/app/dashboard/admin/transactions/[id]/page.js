"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  KeyRound,
  XCircle,
  Landmark,
  MapPin,
  Building2,
} from "lucide-react";
import { useAdminTransactionDetail } from "@/utils/useAdminTransactionDetail";
import {
  adminUpdateTransaction,
  adminDeleteTransaction,
  approveTransferRequest,
  rejectTransferRequest,
} from "@/utils/authHelper";
import { useAuth } from "@/context/AuthContext";

/**
 * app/dashboard/admin/transactions/[id]/page.js
 * Edit a transaction's type, amount, status, category, description, or
 * date — or delete it entirely. Both actions go through authHelper
 * functions that keep the owning account's balance/metrics correct,
 * never a raw document write. Deletion is gated behind the same
 * type-to-confirm pattern used for admin role changes, since reversing
 * real money movement is comparably serious.
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
  "Admin Balance Credit",
];

const STATUS_OPTIONS = ["Completed", "Pending", "Failed", "Rejected"];
const CONFIRM_PHRASE = "I confirm this admin action now";

function normalizePhrase(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function toDatetimeLocalValue(date) {
  const offsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

function Banner({ tone, icon: Icon, children }) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
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

export default function AdminTransactionEditPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params?.id;
  const { user: currentAdmin } = useAuth();

  const {
    transaction,
    profile,
    loading,
    error: loadError,
  } = useAdminTransactionDetail(transactionId);

  // Edit form
  const [initialized, setInitialized] = useState(false);
  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [status, setStatus] = useState("Completed");
  const [dateValue, setDateValue] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const phraseMatches =
    normalizePhrase(confirmInput) === normalizePhrase(CONFIRM_PHRASE);

  // Pending transfer approve/reject
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approveSuccess, setApproveSuccess] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectConfirmInput, setRejectConfirmInput] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const rejectPhraseMatches =
    normalizePhrase(rejectConfirmInput) === normalizePhrase(CONFIRM_PHRASE);

  // Populate the form once, when the transaction first loads — after
  // that, the inputs are the source of truth for what's being typed.
  useEffect(() => {
    if (!initialized && transaction) {
      setType(transaction.type || "credit");
      setAmount(String(transaction.amount ?? ""));
      setDescription(transaction.description || "");
      setCategory(transaction.category || "General");
      setStatus(transaction.status || "Completed");
      const createdDate = transaction.createdAt?.toDate?.() || new Date();
      setDateValue(toDatetimeLocalValue(createdDate));
      setInitialized(true);
    }
  }, [transaction, initialized]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess(false);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setSaveError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setSaveError("Description can't be empty.");
      return;
    }
    const transactionDate = new Date(dateValue);
    if (Number.isNaN(transactionDate.getTime())) {
      setSaveError("Enter a valid date and time.");
      return;
    }

    setSaving(true);
    try {
      await adminUpdateTransaction(
        transactionId,
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
      setSaveSuccess(true);
    } catch (err) {
      console.error("Failed to update transaction:", err);
      setSaveError(
        err.message || "Couldn't save these changes. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e) {
    e.preventDefault();
    if (!phraseMatches) return;

    setDeleteError("");
    setDeleting(true);
    try {
      await adminDeleteTransaction(transactionId);
      router.push("/dashboard/admin/transactions");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setDeleteError(
        err.message || "Couldn't delete this transaction. Please try again.",
      );
      setDeleting(false);
    }
  }

  async function handleApproveTransfer() {
    setApproveError("");
    setApproving(true);
    try {
      await approveTransferRequest(transactionId, currentAdmin?.uid);
      setApproveSuccess(true);
    } catch (err) {
      console.error("Failed to approve transfer:", err);
      setApproveError(
        err.message || "Couldn't approve this transfer. Please try again.",
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleRejectTransfer(e) {
    e.preventDefault();
    if (!rejectPhraseMatches) return;

    setRejectError("");
    setRejecting(true);
    try {
      await rejectTransferRequest(
        transactionId,
        currentAdmin?.uid,
        rejectionReason,
      );
      router.push("/dashboard/admin/transactions");
    } catch (err) {
      console.error("Failed to reject transfer:", err);
      setRejectError(
        err.message || "Couldn't reject this transfer. Please try again.",
      );
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-slate-400">Loading transaction…</p>
      </div>
    );
  }

  if (loadError || !transaction) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 bg-white p-4 sm:p-6 lg:p-8">
        <Link
          href="/dashboard/admin/transactions"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to All Transactions
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-700">
            This transaction couldn&rsquo;t be found. It may have already been
            deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/admin/transactions")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to All Transactions
      </button>

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Account Owner
        </p>
        <p className="mt-1 text-base font-bold text-slate-900">
          {profile?.name || "Unknown User"}
        </p>
        <p className="text-sm text-slate-500">{profile?.email || "—"}</p>
      </div>

      {transaction.pendingHold ? (
        <>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <Landmark className="h-4 w-4" aria-hidden="true" />
              Transfer Request Awaiting Approval
            </p>
            <p className="mt-1 text-xs text-amber-800">
              {transaction.amount?.toLocaleString("en-US", {
                style: "currency",
                currency: transaction.currency || "USD",
              })}{" "}
              is currently on hold from this user&rsquo;s available balance
              until you approve or reject this request.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                  Recipient
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {transaction.recipientName || "—"}
                </p>
                {transaction.recipientAccountNumber && (
                  <p className="text-xs text-slate-600">
                    Acct ••••{transaction.recipientAccountNumber.slice(-4)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                  Bank Name
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {transaction.bankName || "—"}
                </p>
              </div>
              {transaction.bankAddress && (
                <div className="sm:col-span-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-700">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    Bank Address
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {transaction.bankAddress}
                  </p>
                </div>
              )}
              {transaction.iban && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                    IBAN
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-900">
                    {transaction.iban}
                  </p>
                </div>
              )}
              {transaction.swiftCode && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                    SWIFT / BIC
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-900">
                    {transaction.swiftCode}
                  </p>
                </div>
              )}
              {transaction.memo && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                    Memo
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {transaction.memo}
                  </p>
                </div>
              )}
            </div>
          </div>

          {approveError && (
            <Banner tone="error" icon={AlertCircle}>
              {approveError}
            </Banner>
          )}
          {approveSuccess && (
            <Banner tone="success" icon={CheckCircle2}>
              Transfer approved and settled.
            </Banner>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Approve Transfer
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Finalizes the hold — the user&rsquo;s ledger balance updates and
              this transaction moves to Completed.
            </p>
            <button
              type="button"
              onClick={handleApproveTransfer}
              disabled={approving || approveSuccess}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
            >
              {approving ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Approving
                </>
              ) : approveSuccess ? (
                "Approved"
              ) : (
                "Approve Transfer"
              )}
            </button>
          </div>

          <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Reject Transfer
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Releases the hold — the full amount returns to the user&rsquo;s
              available balance immediately.
            </p>

            {rejectError && (
              <div className="mt-4">
                <Banner tone="error" icon={AlertCircle}>
                  {rejectError}
                </Banner>
              </div>
            )}

            {!showRejectConfirm ? (
              <div className="mt-4 space-y-3">
                <label
                  htmlFor="rejectionReason"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Reason (optional, shown to the user)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Recipient bank details couldn't be verified"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
                <button
                  type="button"
                  onClick={() => setShowRejectConfirm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors sm:w-auto"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Reject This Transfer
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleRejectTransfer}
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
                noValidate
              >
                <div className="flex items-start gap-2.5">
                  <KeyRound
                    className="h-4 w-4 shrink-0 mt-0.5 text-amber-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                      Confirm rejection
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Type the phrase below exactly to enable the reject button.
                    </p>
                  </div>
                </div>

                <p className="mt-3 select-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-900">
                  {CONFIRM_PHRASE}
                </p>

                <label htmlFor="rejectConfirmInput" className="sr-only">
                  Type the confirmation phrase
                </label>
                <input
                  id="rejectConfirmInput"
                  type="text"
                  value={rejectConfirmInput}
                  onChange={(e) => setRejectConfirmInput(e.target.value)}
                  placeholder="Type the phrase above"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectConfirm(false);
                      setRejectConfirmInput("");
                      setRejectError("");
                    }}
                    className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectPhraseMatches || rejecting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    {rejecting ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Rejecting
                      </>
                    ) : (
                      "Confirm Rejection"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      ) : (
        <>
          {(transaction.transactionId ||
            transaction.bankName ||
            transaction.senderName ||
            transaction.senderAccountNumber ||
            transaction.paymentMethod) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
                Reference Details
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {transaction.transactionId && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Transaction ID
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-slate-800">
                      {transaction.transactionId}
                    </p>
                  </div>
                )}
                {transaction.paymentMethod && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Payment Method
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">
                      {transaction.paymentMethod}
                    </p>
                  </div>
                )}
                {transaction.bankName && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Bank Name
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">
                      {transaction.bankName}
                    </p>
                  </div>
                )}
                {transaction.senderName && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Sender Name
                    </p>
                    <p className="mt-0.5 text-sm text-slate-800">
                      {transaction.senderName}
                    </p>
                  </div>
                )}
                {transaction.senderAccountNumber && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      Sender Account
                    </p>
                    <p className="mt-0.5 font-mono text-sm text-slate-800">
                      ••••{transaction.senderAccountNumber.slice(-4)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {saveError && (
            <Banner tone="error" icon={AlertCircle}>
              {saveError}
            </Banner>
          )}
          {saveSuccess && (
            <Banner tone="success" icon={CheckCircle2}>
              Changes saved.
            </Banner>
          )}

          <form
            onSubmit={handleSave}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            noValidate
          >
            <h3 className="text-sm font-bold text-slate-900">
              Edit Transaction
            </h3>

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
                    className="w-full bg-transparent px-3 py-3 text-base text-slate-900 focus:outline-none"
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
                  autoComplete="off"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>

          {/* Delete */}
          <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Transaction
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              This permanently removes the record and reverses its effect on the
              user&rsquo;s balance.
            </p>

            {deleteError && (
              <div className="mt-4">
                <Banner tone="error" icon={AlertCircle}>
                  {deleteError}
                </Banner>
              </div>
            )}

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors sm:w-auto"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete This Transaction
              </button>
            ) : (
              <form
                onSubmit={handleDelete}
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
                noValidate
              >
                <div className="flex items-start gap-2.5">
                  <KeyRound
                    className="h-4 w-4 shrink-0 mt-0.5 text-amber-700"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                      Confirm permanent deletion
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      Type the phrase below exactly to enable the delete button.
                    </p>
                  </div>
                </div>

                <p className="mt-3 select-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-900">
                  {CONFIRM_PHRASE}
                </p>

                <label htmlFor="deleteConfirmInput" className="sr-only">
                  Type the confirmation phrase
                </label>
                <input
                  id="deleteConfirmInput"
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type the phrase above"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmInput("");
                      setDeleteError("");
                    }}
                    className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!phraseMatches || deleting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                  >
                    {deleting ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                        Deleting
                      </>
                    ) : (
                      "Permanently Delete"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
