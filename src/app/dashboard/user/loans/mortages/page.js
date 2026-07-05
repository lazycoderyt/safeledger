"use client";

import { Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUserLoans } from "@/utils/Useuserloans";
import LoanCard from "@/components/user/Loancard";
import LoanApplicationForm from "@/components/user/Loanapplicationform";

/**
 * app/dashboard/user/loans/mortgages/page.js
 * Active Mortgages — lists the user's real mortgage documents from
 * Firestore (`loans` where loanType == "mortgage"), with amortization
 * progress for active mortgages, and lets them apply for a new one.
 * No mock data anywhere on this page.
 */
export default function ActiveMortgagesPage() {
  const { user } = useAuth();
  const { loans, loading, error } = useUserLoans(user?.uid, "mortgage");

  return (
    <div className="mx-auto max-w-4xl space-y-8 bg-white p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Active Mortgages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your home financing and track amortization progress.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900">Your Mortgages</h2>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-400">Loading your mortgages…</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
              <p className="text-sm text-rose-700">
                Couldn&rsquo;t load your mortgages right now. Please try again
                shortly.
              </p>
            </div>
          ) : loans.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Home
                className="mx-auto h-8 w-8 text-slate-300"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No mortgages on file yet
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Apply below to start financing your next home.
              </p>
            </div>
          ) : (
            loans.map((loan) => <LoanCard key={loan.id} loan={loan} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900">
          Apply for a Mortgage
        </h2>
        <div className="mt-4">
          <LoanApplicationForm userId={user?.uid} loanType="mortgage" />
        </div>
      </div>
    </div>
  );
}
