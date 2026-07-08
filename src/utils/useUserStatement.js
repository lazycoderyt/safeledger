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
import { db } from "@/libs/firebase";

/**
 * utils/useUserStatement.js
 * Streams a user's full transaction history (newest first, capped at
 * STATEMENT_TRANSACTION_LIMIT as a sane ceiling against an unbounded
 * read) and groups it by calendar month, the way a bank statement
 * would — each group carries its own credit/debit subtotals, and the
 * overall totals cover every transaction currently loaded.
 *
 * @param {string} userId
 */

const STATEMENT_TRANSACTION_LIMIT = 500;

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function useUserStatement(userId) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const transactionsQuery = query(
      collection(db, "transactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(STATEMENT_TRANSACTION_LIMIT),
    );

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        setTransactions(snapshot.docs.map((docSnap) => docSnap.data()));
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Failed to stream account statement:", err);
        setLoading(false);
        setError(true);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  const totals = transactions.reduce(
    (acc, txn) => {
      const isFailed = txn.status === "Failed";
      if (!isFailed) {
        if (txn.type === "credit") acc.totalCredits += txn.amount || 0;
        else acc.totalDebits += txn.amount || 0;
      }
      acc.transactionCount += 1;
      return acc;
    },
    { totalCredits: 0, totalDebits: 0, transactionCount: 0 },
  );

  const groupMap = new Map();
  for (const txn of transactions) {
    const date = txn.createdAt?.toDate?.() || null;
    const key = date ? monthKeyOf(date) : "undated";
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        label: date ? monthLabelOf(date) : "Undated",
        transactions: [],
        totalCredits: 0,
        totalDebits: 0,
      });
    }
    const group = groupMap.get(key);
    group.transactions.push(txn);
    if (txn.status !== "Failed") {
      if (txn.type === "credit") group.totalCredits += txn.amount || 0;
      else group.totalDebits += txn.amount || 0;
    }
  }

  return {
    transactions,
    groups: Array.from(groupMap.values()),
    totals,
    loading,
    error,
    truncated: transactions.length >= STATEMENT_TRANSACTION_LIMIT,
  };
}
