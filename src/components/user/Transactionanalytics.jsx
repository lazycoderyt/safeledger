"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * hooks/useTransactionAnalytics.js
 * Streams a user's full transaction history from Firestore and derives
 * every analytics figure (totals, category breakdown, monthly trend)
 * client-side. Nothing here is fabricated — an account with no
 * transactions yields `hasData: false` and all-zero aggregates rather
 * than placeholder numbers.
 *
 * Note: this streams the user's entire transaction history with a
 * single equality filter (userId) to avoid requiring a composite
 * Firestore index. Fine for a personal ledger's transaction volume;
 * revisit with pagination or server-side aggregation at real scale.
 */

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function useTransactionAnalytics(userId, { trendMonths = 6 } = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return undefined;
    }

    const transactionsQuery = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap) => docSnap.data())
          .filter((txn) => Boolean(txn.createdAt?.toDate));
        setTransactions(rows);
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Failed to stream transactions for analytics:", err);
        setLoading(false);
        setError(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // ---- Totals (failed transactions never moved money, so they're
  // excluded from credit/debit/net figures but still counted in the
  // status breakdown) ----
  const settled = transactions.filter((txn) => txn.status !== "Failed");
  const totalCredits = settled
    .filter((txn) => txn.type === "credit")
    .reduce((sum, txn) => sum + (txn.amount || 0), 0);
  const totalDebits = settled
    .filter((txn) => txn.type === "debit")
    .reduce((sum, txn) => sum + (txn.amount || 0), 0);
  const netChange = totalCredits - totalDebits;
  const transactionCount = transactions.length;
  const completedCount = transactions.filter(
    (txn) => txn.status === "Completed",
  ).length;
  const pendingCount = transactions.filter(
    (txn) => txn.status === "Pending",
  ).length;
  const failedCount = transactions.filter(
    (txn) => txn.status === "Failed",
  ).length;
  const averageTransaction =
    transactionCount > 0
      ? transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0) /
        transactionCount
      : 0;

  // ---- Spending by category (debits only, settled) ----
  const categoryTotals = {};
  settled
    .filter((txn) => txn.type === "debit")
    .forEach((txn) => {
      const category = txn.category || "General";
      categoryTotals[category] =
        (categoryTotals[category] || 0) + (txn.amount || 0);
    });
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const categoryGrandTotal = categoryBreakdown.reduce(
    (sum, c) => sum + c.total,
    0,
  );

  // ---- Monthly credit/debit trend, last `trendMonths` including now ----
  const now = new Date();
  const buckets = [];
  for (let i = trendMonths - 1; i >= 0; i--) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(bucketDate),
      label: `${MONTH_LABELS[bucketDate.getMonth()]} ${bucketDate.getFullYear()}`,
      credits: 0,
      debits: 0,
    });
  }
  const bucketIndexByKey = new Map(
    buckets.map((bucket, idx) => [bucket.key, idx]),
  );
  settled.forEach((txn) => {
    const created = txn.createdAt.toDate();
    const idx = bucketIndexByKey.get(monthKey(created));
    if (idx === undefined) return; // outside the trend window
    if (txn.type === "credit") buckets[idx].credits += txn.amount || 0;
    else buckets[idx].debits += txn.amount || 0;
  });

  return {
    loading,
    error,
    hasData: transactions.length > 0,
    totals: {
      totalCredits,
      totalDebits,
      netChange,
      transactionCount,
      completedCount,
      pendingCount,
      failedCount,
      averageTransaction,
    },
    categoryBreakdown,
    categoryGrandTotal,
    monthlyTrend: buckets,
  };
}
