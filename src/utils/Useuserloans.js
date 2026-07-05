"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * hooks/useUserLoans.js
 * Streams a user's loan/mortgage documents from the root `loans`
 * collection, filtered by `loanType`. Uses a single compound equality
 * filter and sorts client-side (newest first) to avoid requiring a
 * composite Firestore index.
 *
 * @param {string} userId
 * @param {"institutional"|"mortgage"} loanType
 */
export function useUserLoans(userId, loanType) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoans([]);
      setLoading(false);
      return undefined;
    }

    const loansQuery = query(
      collection(db, "loans"),
      where("userId", "==", userId),
      where("loanType", "==", loanType),
    );

    const unsubscribe = onSnapshot(
      loansQuery,
      (snapshot) => {
        const rows = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        rows.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        );
        setLoans(rows);
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Failed to stream loans:", err);
        setLoading(false);
        setError(true);
      },
    );

    return () => unsubscribe();
  }, [userId, loanType]);

  return { loans, loading, error };
}
