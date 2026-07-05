"use client";

import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { submitLoanApplication } from "@/utils/authHelper";

/**
 * components/user/LoanApplicationForm.jsx
 * Submits a real application document to Firestore via
 * submitLoanApplication — no instant fake approval, no invented rate
 * or payment. Every new application lands as "Pending Review".
 */

const PURPOSE_OPTIONS = {
  institutional: [
    "Debt Consolidation",
    "Business Expansion",
    "Education & Tuition",
    "Home Improvement",
    "Working Capital",
    "Other",
  ],
  mortgage: ["Home Purchase", "Refinance", "Home Equity", "Construction"],
};

const TERM_OPTIONS = {
  institutional: [
    { months: 12, label: "12 months" },
    { months: 24, label: "24 months" },
    { months: 36, label: "36 months" },
    { months: 48, label: "48 months" },
    { months: 60, label: "60 months" },
  ],
  mortgage: [
    { months: 120, label: "10 years" },
    { months: 180, label: "15 years" },
    { months: 240, label: "20 years" },
    { months: 360, label: "30 years" },
  ],
};

const INITIAL_FORM = {
  purpose: "",
  principal: "",
  termMonths: "",
  propertyAddress: "",
  downPayment: "",
};

export default function LoanApplicationForm({ userId, loanType, onSubmitted }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isMortgage = loanType === "mortgage";
  const purposeOptions = PURPOSE_OPTIONS[loanType] || [];
  const termOptions = TERM_OPTIONS[loanType] || [];

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const principal = Number(form.principal);
    const termMonths = Number(form.termMonths);

    if (!form.purpose) {
      setError("Please select a purpose for this application.");
      return;
    }
    if (!principal || principal <= 0) {
      setError("Enter a loan amount greater than zero.");
      return;
    }
    if (!termMonths) {
      setError("Please select a term.");
      return;
    }
    if (isMortgage && !form.propertyAddress.trim()) {
      setError("Property address is required for a mortgage application.");
      return;
    }

    setLoading(true);
    try {
      await submitLoanApplication(userId, {
        loanType,
        purpose: form.purpose,
        principal,
        termMonths,
        propertyAddress: isMortgage ? form.propertyAddress.trim() : "",
        downPayment:
          isMortgage && form.downPayment ? Number(form.downPayment) : null,
      });
      setSubmitted(true);
      setForm(INITIAL_FORM);
      onSubmitted?.();
    } catch (err) {
      console.error("Loan application failed:", err);
      setError("We couldn't submit your application. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
        <CheckCircle2
          className="mx-auto h-8 w-8 text-emerald-600"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-semibold text-emerald-800">
          Application submitted
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Our underwriting team will review your request. You&rsquo;ll see it
          listed above as &ldquo;Pending Review&rdquo;.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Submit another application
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      noValidate
    >
      <h3 className="text-sm font-bold text-slate-900">
        {isMortgage ? "Apply for a Mortgage" : "Apply for a New Loan"}
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Submitted applications are reviewed by our underwriting team before a
        rate or payment is assigned.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <AlertCircle
            className="h-4 w-4 shrink-0 mt-0.5 text-rose-600"
            aria-hidden="true"
          />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="purpose"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Purpose
          </label>
          <select
            id="purpose"
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="" disabled>
              Select a purpose
            </option>
            {purposeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="termMonths"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            Term
          </label>
          <select
            id="termMonths"
            name="termMonths"
            value={form.termMonths}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="" disabled>
              Select a term
            </option>
            {termOptions.map((option) => (
              <option key={option.months} value={option.months}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="principal"
            className="text-xs font-semibold uppercase tracking-widest text-slate-500"
          >
            {isMortgage ? "Loan Amount Requested" : "Amount Requested"}
          </label>
          <input
            id="principal"
            name="principal"
            type="number"
            min="1"
            step="0.01"
            value={form.principal}
            onChange={handleChange}
            placeholder="25000"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {isMortgage && (
          <div>
            <label
              htmlFor="downPayment"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Down Payment (optional)
            </label>
            <input
              id="downPayment"
              name="downPayment"
              type="number"
              min="0"
              step="0.01"
              value={form.downPayment}
              onChange={handleChange}
              placeholder="60000"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        )}

        {isMortgage && (
          <div className="sm:col-span-2">
            <label
              htmlFor="propertyAddress"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Property Address
            </label>
            <input
              id="propertyAddress"
              name="propertyAddress"
              type="text"
              value={form.propertyAddress}
              onChange={handleChange}
              placeholder="123 Maple Street, Austin, TX"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting
          </>
        ) : (
          <>
            Submit Application
            <Send className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
