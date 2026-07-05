"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * hooks/useAdminOverview.js
 * Streams the figures the admin dashboard needs: total registered
 * users, total balance across every ledger account, and the actual
 * list (not just a count) of pending transactions and pending loan
 * applications, so the dashboard can show real actionable rows.
 *
 * Note: user/account counts here download the full `profiles` and
 * `accounts` collections client-side to compute a count/sum. Fine at
 * demo/small scale; at real scale this should move to Cloud
 * Functions maintaining rollup counters, or Firestore aggregation
 * queries (getCountFromServer / getAggregateFromServer).
 */
export function useAdminOverview() {
  const [userCount, setUserCount] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(
      collection(db, "profiles"),
      (snap) => setUserCount(snap.size),
      (err) => console.error("Failed to stream users:", err),
    );

    const unsubscribeAccounts = onSnapshot(
      collection(db, "accounts"),
      (snap) => {
        const sum = snap.docs.reduce(
          (total, docSnap) => total + (docSnap.data().availableBalance || 0),
          0,
        );
        setTotalBalance(sum);
      },
      (err) => console.error("Failed to stream accounts:", err),
    );

    const pendingTxnQuery = query(
      collection(db, "transactions"),
      where("status", "==", "Pending"),
    );
    const unsubscribeTxns = onSnapshot(
      pendingTxnQuery,
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        rows.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        );
        setPendingTransactions(rows);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to stream pending transactions:", err);
        setLoading(false);
      },
    );

    const pendingLoanQuery = query(
      collection(db, "loans"),
      where("status", "==", "Pending Review"),
    );
    const unsubscribeLoans = onSnapshot(
      pendingLoanQuery,
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        rows.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        );
        setPendingLoans(rows);
      },
      (err) => console.error("Failed to stream pending loans:", err),
    );

    return () => {
      unsubscribeUsers();
      unsubscribeAccounts();
      unsubscribeTxns();
      unsubscribeLoans();
    };
  }, []);

  return {
    userCount,
    totalBalance,
    pendingTransactions,
    pendingLoans,
    loading,
  };
}
