"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Landmark,
  ArrowLeftRight,
  CreditCard,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import BalanceCard from "@/components/user/Balancecard";
import RecentTransactions from "@/components/user/Recenttransaction";

/**
 * app/dashboard/user/page.js
 * Core user dashboard — the primary financial cockpit a member sees
 * immediately after signing in. Clean, white, trustworthy corporate
 * theme; fully responsive from mobile up.
 */

const QUICK_ACTIONS = [
  { label: "Account Info", href: "/dashboard/user/accounts", icon: Landmark },
  { label: "Transfer", href: "/dashboard/user/transfer", icon: ArrowLeftRight },
  { label: "Card", href: "/dashboard/user/cards/debit", icon: CreditCard },
  { label: "Statement", href: "/dashboard/user/statement", icon: FileText },
];

function TaxRefundBanner() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-blue-100 bg-blue-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600/10">
          <Landmark className="h-5 w-5 text-blue-600" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Claim your IRS tax refund
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Have your refund deposited directly into your Apex Global account —
            no waiting on a paper check.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Tax Refund
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function QuickActions() {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">
        What do you want to do today?
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose from our popular actions below.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-transparent px-4 py-6 text-center transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
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

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState(null);

  // Stream the ledger document live so BalanceCard's headline balance
  // (and the quick-action rails around it) stay in sync with any
  // credits/debits recorded elsewhere in the app.
  useEffect(() => {
    if (!user?.uid) {
      setAccount(null);
      return undefined;
    }

    const accountRef = doc(db, "accounts", user.uid);
    const unsubscribe = onSnapshot(
      accountRef,
      (snapshot) => setAccount(snapshot.exists() ? snapshot.data() : null),
      (error) => console.error("Failed to stream account ledger:", error),
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 bg-white p-6 sm:p-8">
      <BalanceCard account={account} />
      <TaxRefundBanner />
      <QuickActions />
      <RecentTransactions userId={user?.uid} />
    </div>
  );
}
