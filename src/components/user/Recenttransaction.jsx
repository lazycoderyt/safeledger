"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Coffee,
  Server,
  ShoppingBag,
  Plane,
  Fuel,
  Landmark,
  ArrowLeftRight,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { db } from "@/libs/firebase";

/**
 * components/user/RecentTransactions.jsx
 * Live-streamed list of the signed-in user's most recent ledger
 * transactions, read straight from the root `transactions` collection
 * written by `recordTransaction()` in utils/authHelper.js.
 */

const CATEGORY_ICONS = {
  Dining: Coffee,
  SaaS: Server,
  Retail: ShoppingBag,
  Travel: Plane,
  Fuel: Fuel,
  Refund: Landmark,
  Transfer: ArrowLeftRight,
  General: Receipt,
};

const STATUS_STYLES = {
  Completed: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700",
  },
  Pending: { icon: Clock, className: "bg-amber-50 text-amber-700" },
  Failed: { icon: XCircle, className: "bg-rose-50 text-rose-700" },
};

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

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TransactionRow({ txn }) {
  const Icon = CATEGORY_ICONS[txn.category] || Receipt;
  const statusMeta = STATUS_STYLES[txn.status] || STATUS_STYLES.Completed;
  const StatusIcon = statusMeta.icon;
  const isCredit = txn.type === "credit";

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 hover:bg-slate-50/60 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isCredit ? "bg-emerald-50" : "bg-slate-100"
          }`}
        >
          <Icon
            className={`h-4 w-4 ${isCredit ? "text-emerald-600" : "text-slate-500"}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {txn.description}
          </p>
          <p className="text-xs text-slate-500">{formatDate(txn.createdAt)}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold ${
            isCredit ? "text-emerald-600" : "text-slate-900"
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isCredit ? "+" : "-"}
          {formatCurrency(txn.amount, txn.currency)}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          {txn.status}
        </span>
      </div>
    </div>
  );
}

export default function RecentTransactions({ userId, maxItems = 8 }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }

    const transactionsQuery = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(maxItems),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        setTransactions(snapshot.docs.map((docSnap) => docSnap.data()));
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Failed to stream transactions:", err);
        setLoading(false);
        setError(true);
      },
    );

    return () => unsubscribe();
  }, [userId, maxItems]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <h3 className="text-sm font-bold text-slate-900">
          Recent Transactions
        </h3>
      </div>

      {loading ? (
        <div className="px-4 py-10 sm:px-6 text-center text-sm text-slate-400">
          Loading transactions…
        </div>
      ) : error ? (
        <div className="px-4 py-10 sm:px-6 text-center text-sm text-rose-600">
          Couldn&rsquo;t load your transactions right now.
        </div>
      ) : transactions.length === 0 ? (
        <div className="px-4 py-10 sm:px-6 text-center">
          <p className="text-sm font-medium text-slate-600">
            No transactions yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Activity on your account will show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </div>
      )}
    </div>
  );
}
