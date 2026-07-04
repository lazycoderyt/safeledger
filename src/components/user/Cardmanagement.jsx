"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Landmark,
  Sliders,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/libs/firebase";
import {
  ensureCardProvisioned,
  updateCardSettings,
  getCardDocId,
} from "@/utils/authHelper";
import {
  formatAccountNumberDisplay,
  formatCardNumberDisplay,
} from "@/utils/Cryptogenacc";
import VirtualCard from "@/components/user/Virtualcard";
import RecentTransactions from "@/components/user/Recenttransaction";

/**
 * components/user/CardManagementSuite.jsx
 * Shared suite powering both /dashboard/user/cards/debit and
 * /dashboard/user/cards/credit. Every figure shown is either read live
 * from Firestore or an honest zero/empty state — nothing is fabricated
 * in the component itself. Reuses the existing VirtualCard and
 * RecentTransactions components rather than duplicating them.
 * Stack: Next.js + Tailwind CSS + lucide-react + Firestore
 */

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/* ------------------------------------------------------------------ */
/* Freeze toggle switch                                                */
/* ------------------------------------------------------------------ */
function FreezeToggle({ frozen, onToggle, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={frozen}
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        frozen ? "bg-amber-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          frozen ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Card Operations panel                                               */
/* ------------------------------------------------------------------ */
function CardOperationsPanel({ frozen, onToggleFrozen, updating }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Card Operations</h3>
      <p className="mt-1 text-xs text-slate-500">
        Manage authorization controls for this card in real time.
      </p>

      <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-900">Freeze Card</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {frozen
              ? "All new authorizations are blocked."
              : "Card is active and accepting transactions."}
          </p>
        </div>
        <FreezeToggle
          frozen={frozen}
          onToggle={onToggleFrozen}
          disabled={updating}
        />
      </div>

      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
      >
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        Report Lost or Stolen
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Spending Controls panel — real month-to-date spend + a persisted   */
/* ceiling stored on the card document                                */
/* ------------------------------------------------------------------ */
function SpendingVelocityPanel({
  userId,
  variant,
  spendingLimit,
  onLimitChange,
}) {
  const [localLimit, setLocalLimit] = useState(spendingLimit ?? 5000);
  const [spent, setSpent] = useState(0);
  const [loadingSpend, setLoadingSpend] = useState(true);

  useEffect(() => {
    setLocalLimit(spendingLimit ?? 5000);
  }, [spendingLimit]);

  // Stream this user's transactions and sum month-to-date debits
  // client-side. Kept to a single equality filter (userId) to avoid
  // requiring a composite Firestore index for the demo; at scale this
  // would move to a range query with a composite index, or a
  // server-aggregated counter.
  useEffect(() => {
    if (!userId) {
      setLoadingSpend(false);
      return undefined;
    }

    const monthStart = startOfCurrentMonth();
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const monthToDateDebits = snapshot.docs
          .map((docSnap) => docSnap.data())
          .filter((txn) => {
            if (txn.type !== "debit" || txn.status === "Failed") return false;
            const created = txn.createdAt?.toDate?.();
            return created && created >= monthStart;
          })
          .reduce((sum, txn) => sum + (txn.amount || 0), 0);

        setSpent(monthToDateDebits);
        setLoadingSpend(false);
      },
      (error) => {
        console.error("Failed to compute month-to-date spend:", error);
        setLoadingSpend(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const percent =
    localLimit > 0 ? Math.min(100, Math.round((spent / localLimit) * 100)) : 0;
  const nearLimit = percent >= 90;

  function handleSliderChange(e) {
    setLocalLimit(Number(e.target.value));
  }

  function handleCommit() {
    if (localLimit !== spendingLimit) {
      onLimitChange(localLimit);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          <Sliders className="h-4 w-4 text-blue-600" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-slate-900">
          Monthly Spending Velocity
        </h3>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {loadingSpend ? (
              <span className="text-base font-medium text-slate-400">
                Loading…
              </span>
            ) : (
              formatCurrency(spent)
            )}
          </span>
          <span className="text-sm text-slate-500">
            of {formatCurrency(localLimit)} limit
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              nearLimit ? "bg-amber-500" : "bg-blue-600"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {percent}% of monthly ceiling used
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor={`spendingLimit-${variant}`}
          className="text-xs font-semibold uppercase tracking-widest text-slate-500"
        >
          Adjust Monthly Ceiling
        </label>
        <input
          id={`spendingLimit-${variant}`}
          type="range"
          min={500}
          max={10000}
          step={100}
          value={localLimit}
          onChange={handleSliderChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          onKeyUp={handleCommit}
          className="mt-3 w-full accent-blue-600"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
          <span>$500</span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {formatCurrency(localLimit)}
          </span>
          <span>$10,000</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contextual panel — Debit: live funding account from Firestore      */
/* ------------------------------------------------------------------ */
function FundingAccountPanel({ userId, profile }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onSnapshot(
      doc(db, "accounts", userId),
      (snap) => {
        setAccount(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load account balance:", error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [userId]);

  const accountNumber = profile?.accountNumber || account?.accountNumber;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          <Landmark className="h-4 w-4 text-blue-600" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-slate-900">
          Linked Funding Account
        </h3>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Account Number
          </p>
          <p className="mt-1 font-mono text-base font-semibold text-slate-900">
            {accountNumber ? formatAccountNumberDisplay(accountNumber) : "—"}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Available Balance
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {loading ? (
              <span className="text-base font-medium text-slate-400">
                Loading…
              </span>
            ) : (
              formatCurrency(account?.availableBalance ?? 0)
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contextual panel — Credit: real line breakdown from the card doc   */
/* ------------------------------------------------------------------ */
function CreditLineBreakdownPanel({ userId, card, onRequestIncrease }) {
  const totalApproved = card?.totalApproved ?? 0;
  const utilized = card?.utilizedBalance ?? 0;
  const available = Math.max(0, totalApproved - utilized);
  const utilizationPercent =
    totalApproved > 0 ? Math.round((utilized / totalApproved) * 100) : 0;
  const isPending = totalApproved === 0;
  const requestPending = Boolean(card?.limitIncreaseRequested);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
          <Wallet className="h-4 w-4 text-blue-600" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-slate-900">
          Credit Line Breakdown
        </h3>
      </div>

      {isPending ? (
        <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Application Pending Approval
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Your credit line request is under review. You&rsquo;ll be notified
            as soon as a decision is made.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Total Approved
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatCurrency(totalApproved)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Utilized Balance
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatCurrency(utilized)}
              </p>
            </div>
          </div>

          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {utilizationPercent}% utilized
          </p>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Available Credit Runway
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {formatCurrency(available)}
            </p>
          </div>

          <button
            type="button"
            onClick={onRequestIncrease}
            disabled={requestPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-emerald-600 disabled:cursor-default transition-colors"
          >
            {requestPending ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Request Submitted
              </>
            ) : (
              <>
                Request Limit Increase
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main export                                                        */
/* ------------------------------------------------------------------ */
export default function CardManagementSuite({ variant = "debit" }) {
  const { user, profile } = useAuth();
  const [card, setCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [updatingFreeze, setUpdatingFreeze] = useState(false);

  const isDebit = variant === "debit";
  const pageTitle = isDebit ? "Corporate Debit" : "Credit Lines";
  const pageSubtitle = isDebit
    ? "Manage your primary spending card and linked funding account."
    : "Manage your revolving credit line and repayment card.";

  // Provision the card document on first visit (idempotent — a no-op
  // if it already exists), then subscribe to it live.
  useEffect(() => {
    if (!user?.uid) {
      setCardLoading(false);
      return undefined;
    }

    let unsubscribe;
    ensureCardProvisioned(user.uid, variant)
      .catch((error) => console.error("Failed to provision card:", error))
      .finally(() => {
        unsubscribe = onSnapshot(
          doc(db, "cards", getCardDocId(user.uid, variant)),
          (snap) => {
            setCard(snap.exists() ? snap.data() : null);
            setCardLoading(false);
          },
          (error) => {
            console.error("Failed to stream card document:", error);
            setCardLoading(false);
          },
        );
      });

    return () => unsubscribe?.();
  }, [user?.uid, variant]);

  async function handleToggleFrozen() {
    if (!user?.uid || !card) return;
    setUpdatingFreeze(true);
    try {
      await updateCardSettings(user.uid, variant, { frozen: !card.frozen });
    } catch (error) {
      console.error("Failed to update freeze state:", error);
    } finally {
      setUpdatingFreeze(false);
    }
  }

  async function handleLimitChange(nextLimit) {
    if (!user?.uid) return;
    try {
      await updateCardSettings(user.uid, variant, { spendingLimit: nextLimit });
    } catch (error) {
      console.error("Failed to update spending limit:", error);
    }
  }

  async function handleRequestIncrease() {
    if (!user?.uid) return;
    try {
      await updateCardSettings(user.uid, variant, {
        limitIncreaseRequested: true,
      });
    } catch (error) {
      console.error("Failed to submit limit increase request:", error);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {pageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p>
      </div>

      {/* Hero: card + operations panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          {cardLoading ? (
            <div className="flex h-56 w-full max-w-md items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
              <span className="text-sm text-slate-400">Loading card…</span>
            </div>
          ) : (
            <VirtualCard
              name={profile?.name}
              last4={card?.last4}
              fullNumber={formatCardNumberDisplay(card?.cardNumber)}
              cvv={card?.cvv}
              expiry={card?.expiry}
              frozen={Boolean(card?.frozen)}
              cardLabel={isDebit ? "DEBIT CARD" : "CREDIT CARD"}
            />
          )}
        </div>
        <CardOperationsPanel
          frozen={Boolean(card?.frozen)}
          onToggleFrozen={handleToggleFrozen}
          updating={updatingFreeze || cardLoading}
        />
      </div>

      {/* Advanced controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingVelocityPanel
          userId={user?.uid}
          variant={variant}
          spendingLimit={card?.spendingLimit}
          onLimitChange={handleLimitChange}
        />
        {isDebit ? (
          <FundingAccountPanel userId={user?.uid} profile={profile} />
        ) : (
          <CreditLineBreakdownPanel
            userId={user?.uid}
            card={card}
            onRequestIncrease={handleRequestIncrease}
          />
        )}
      </div>

      <RecentTransactions userId={user?.uid} title="Recent Card Clearings" />
    </div>
  );
}
