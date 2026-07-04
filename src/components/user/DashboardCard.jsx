"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import BalanceCard from "@/components/user/BalanceCard";

/**
 * app/dashboard/user/page.jsx
 * Core user dashboard — the primary financial cockpit a member sees
 * immediately after signing in.
 */

const CLEARANCE_LEVELS = {
  admin: "Level 3 · Administrator Clearance",
  user: "Level 1 · Standard Access Clearance",
};

function getFirstName(name) {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0];
}

function getInitial(name) {
  if (!name) return "S";
  return name.trim().charAt(0).toUpperCase();
}

function formatCurrency(amount, currency = "USD") {
  const value = typeof amount === "number" ? amount : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/* ------------------------------------------------------------------ */
/* Identity banner                                                    */
/* ------------------------------------------------------------------ */
function AccountBanner({ profile }) {
  const clearance = CLEARANCE_LEVELS[profile?.role] || CLEARANCE_LEVELS.user;

  return (
    <div className="flex items-center gap-4">
      {profile?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatarUrl}
          alt={profile?.name ? `${profile.name}'s avatar` : "User avatar"}
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-xl font-bold text-white shadow-sm ring-2 ring-white"
        >
          {getInitial(profile?.name)}
        </span>
      )}

      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Welcome back, {getFirstName(profile?.name)}
        </h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
          <ShieldCheck
            className="h-3.5 w-3.5 shrink-0 text-blue-600"
            aria-hidden="true"
          />
          {clearance}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Secondary ledger summary modules — fills out the expansion grid    */
/* ------------------------------------------------------------------ */
function SummaryCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tracking-tight ${accent || "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main export                                                        */
/* ------------------------------------------------------------------ */
export default function UserDashboardPage() {
  const { user, profile } = useAuth();

  const [account, setAccount] = useState(null);

  // Stream the ledger document directly from Firestore so the summary
  // modules below reflect live balance/metrics updates.
  useEffect(() => {
    if (!user?.uid) {
      setAccount(null);
      return;
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
    <div className="mx-auto max-w-6xl space-y-6 p-6 sm:space-y-8 sm:p-8">
      <AccountBanner profile={profile} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <BalanceCard />
        </div>
        <SummaryCard
          label="Ledger Balance"
          value={formatCurrency(account?.ledgerBalance, account?.currency)}
        />
        <SummaryCard
          label="Credits Received"
          value={account?.metrics?.totalCreditsCount ?? 0}
          accent="text-emerald-600"
        />
      </div>
    </div>
  );
}
