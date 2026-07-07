"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Landmark,
  Home,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  KeyRound,
  Percent,
} from "lucide-react";
import { useAdminLoanDetail } from "@/utils/useAdminLoanDetail";
import {
  approveLoanApplication,
  rejectLoanApplication,
} from "@/utils/authHelper";
import {
  calculateMonthlyPayment,
  formatTermLabel,
} from "@/utils/loanCalculations";
import { useAuth } from "@/context/AuthContext";

/**
 * app/dashboard/admin/loans/[id]/page.js
 * Approve or reject a pending loan/mortgage application. Approval sets
 * the interest rate (and optionally overrides the requested principal
 * or term) and computes the fixed monthly payment via the same
 * amortization helper used everywhere else in the app. Rejection is
 * gated behind the same type-to-confirm pattern used for other
 * irreversible admin decisions, since it closes out the application.
 *
 * Both actions go through authHelper functions that refuse to run
 * against anything other than a "Pending Review" application, so a
 * stale tab can never double-approve or flip a decided loan.
 */

const CONFIRM_PHRASE = "I confirm this admin action now";

const STATUS_STYLES = {
  "Pending Review": { className: "bg-amber-50 text-amber-700" },
  Active: { className: "bg-emerald-50 text-emerald-700" },
  Rejected: { className: "bg-rose-50 text-rose-700" },
  "Paid Off": { className: "bg-slate-100 text-slate-600" },
};

function normalizePhrase(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
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

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
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

export default function AdminLoanDecisionPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params?.id;
  const { user: currentAdmin } = useAuth();

  const {
    loan,
    profile,
    loading,
    error: loadError,
  } = useAdminLoanDetail(loanId);

  // Approval form
  const [initialized, setInitialized] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [interestRate, setInterestRate] = useState("");

  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [approveSuccess, setApproveSuccess] = useState(false);

  // Rejection
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const phraseMatches =
    normalizePhrase(confirmInput) === normalizePhrase(CONFIRM_PHRASE);

  // Populate the form once, when the loan first loads — after that the
  // inputs are the source of truth for what's being typed.
  useEffect(() => {
    if (!initialized && loan) {
      setPrincipal(String(loan.principal ?? ""));
      setTermMonths(String(loan.termMonths ?? ""));
      setInitialized(true);
    }
  }, [loan, initialized]);

  const isPending = loan?.status === "Pending Review";

  const previewMonthlyPayment = useMemo(() => {
    const p = Number(principal);
    const t = Number(termMonths);
    const r = Number(interestRate);
    if (!p || p <= 0 || !t || t <= 0 || interestRate === "" || Number.isNaN(r))
      return null;
    return calculateMonthlyPayment(p, r, t);
  }, [principal, termMonths, interestRate]);

  async function handleApprove(e) {
    e.preventDefault();
    setApproveError("");
    setApproveSuccess(false);

    const numericPrincipal = Number(principal);
    const numericTerm = Number(termMonths);
    const numericRate = Number(interestRate);

    if (!numericPrincipal || numericPrincipal <= 0) {
      setApproveError("Enter a principal amount greater than zero.");
      return;
    }
    if (!numericTerm || numericTerm <= 0) {
      setApproveError("Enter a term greater than zero months.");
      return;
    }
    if (interestRate === "" || Number.isNaN(numericRate) || numericRate < 0) {
      setApproveError("Enter a valid, non-negative interest rate.");
      return;
    }

    setApproving(true);
    try {
      await approveLoanApplication(loanId, {
        principal: numericPrincipal,
        termMonths: numericTerm,
        interestRate: numericRate,
        adminUid: currentAdmin?.uid,
      });
      setApproveSuccess(true);
    } catch (err) {
      console.error("Failed to approve loan:", err);
      setApproveError(
        err.message || "Couldn't approve this application. Please try again.",
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!phraseMatches) return;

    setRejectError("");
    setRejecting(true);
    try {
      await rejectLoanApplication(loanId, currentAdmin?.uid, rejectionReason);
      router.push("/dashboard/admin/loans");
    } catch (err) {
      console.error("Failed to reject loan:", err);
      setRejectError(
        err.message || "Couldn't reject this application. Please try again.",
      );
      setRejecting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl bg-white p-4 sm:p-6 lg:p-8">
        <p className="text-sm text-slate-400">Loading application…</p>
      </div>
    );
  }

  if (loadError || !loan) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 bg-white p-4 sm:p-6 lg:p-8">
        <Link
          href="/dashboard/admin/loans"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Loan Applications
        </Link>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-700">
            This application couldn&rsquo;t be found. It may have already been
            removed.
          </p>
        </div>
      </div>
    );
  }

  const TypeIcon = loan.loanType === "mortgage" ? Home : Landmark;
  const statusMeta =
    STATUS_STYLES[loan.status] || STATUS_STYLES["Pending Review"];

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <button
        type="button"
        onClick={() => router.push("/dashboard/admin/loans")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Loan Applications
      </button>

      {/* Applicant header */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile?.name || "Applicant"}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg font-semibold text-indigo-700 border border-indigo-200">
            {getInitials(profile?.name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">
            {profile?.name || "Unknown User"}
          </p>
          <p className="truncate text-sm text-slate-500">
            {profile?.email || "—"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
        >
          {loan.status}
        </span>
      </div>

      {/* Application details */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {loan.loanType === "mortgage" ? "Mortgage" : "Institutional Loan"}
          </p>
        </div>
        <p className="mt-1 text-base font-bold text-slate-900">
          {loan.purpose}
        </p>
        {loan.propertyAddress && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {loan.propertyAddress}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Requested
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
          {loan.downPayment != null && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Down Payment
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {formatCurrency(loan.downPayment)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Applied
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {formatDate(loan.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {!isPending && (
        <Banner
          tone={loan.status === "Rejected" ? "error" : "neutral"}
          icon={loan.status === "Rejected" ? XCircle : CheckCircle2}
        >
          {loan.status === "Rejected" ? (
            <>
              This application was rejected
              {loan.rejectionReason ? `: “${loan.rejectionReason}”` : "."}
            </>
          ) : (
            <>
              This application has already been decided (
              {loan.status.toLowerCase()}) and can&rsquo;t be approved or
              rejected again from here.
            </>
          )}
        </Banner>
      )}

      {isPending && (
        <>
          {approveError && (
            <Banner tone="error" icon={AlertCircle}>
              {approveError}
            </Banner>
          )}
          {approveSuccess && (
            <Banner tone="success" icon={CheckCircle2}>
              Application approved. The loan is now Active.
            </Banner>
          )}

          {/* Approve */}
          <form
            onSubmit={handleApprove}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            noValidate
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Approve Application
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Set the underwriting terms. The monthly payment is computed
              automatically and never entered directly.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="principal"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Principal
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                  <span className="text-slate-400">$</span>
                  <input
                    id="principal"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    disabled={approving || approveSuccess}
                    className="w-full bg-transparent px-3 py-3 text-base text-slate-900 focus:outline-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="termMonths"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Term (months)
                </label>
                <input
                  id="termMonths"
                  type="number"
                  min="1"
                  step="1"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  disabled={approving || approveSuccess}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="interestRate"
                  className="text-xs font-semibold uppercase tracking-widest text-slate-500"
                >
                  Interest Rate
                </label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-4 focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600">
                  <input
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 6.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    disabled={approving || approveSuccess}
                    className="w-full bg-transparent py-3 text-base text-slate-900 focus:outline-none disabled:opacity-60"
                  />
                  <Percent
                    className="h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Resulting Monthly Payment
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {previewMonthlyPayment != null
                  ? formatCurrency(previewMonthlyPayment)
                  : "—"}
              </p>
            </div>

            <button
              type="submit"
              disabled={approving || approveSuccess}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
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
                "Approve Application"
              )}
            </button>
          </form>

          {/* Reject */}
          <div className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Reject Application
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              This closes the application out as Rejected. It can&rsquo;t be
              approved afterward.
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
                  Reason (optional, shown to the applicant)
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Debt-to-income ratio exceeds policy limits"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
                />
                <button
                  type="button"
                  onClick={() => setShowRejectConfirm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-600 px-6 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors sm:w-auto"
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Reject This Application
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleReject}
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
                      setShowRejectConfirm(false);
                      setConfirmInput("");
                      setRejectError("");
                    }}
                    className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!phraseMatches || rejecting}
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
      )}
    </div>
  );
}
