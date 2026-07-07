"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useAdminTransactions.js
 * Streams the entire `transactions` collection (every user) joined
 * with `profiles` so each row carries the owning user's name/email,
 * for the admin transaction oversight pages.
 *
 * Note: like the other admin directory hooks, this downloads both full
 * collections client-side. Fine at demo/small scale; at real
 * transaction volume this needs pagination (e.g. cursor-based
 * `startAfter` + `limit`) rather than one unbounded listener.
 */
export function useAdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribeTransactions = onSnapshot(
      collection(db, "transactions"),
      (snap) => {
        setTransactions(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setTransactionsLoaded(true);
      },
      (err) => {
        console.error("Failed to stream transactions:", err);
        setError(true);
        setTransactionsLoaded(true);
      },
    );

    const unsubscribeProfiles = onSnapshot(
      collection(db, "profiles"),
      (snap) => {
        setProfiles(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setProfilesLoaded(true);
      },
      (err) => {
        console.error("Failed to stream profiles:", err);
        setError(true);
        setProfilesLoaded(true);
      },
    );

    return () => {
      unsubscribeTransactions();
      unsubscribeProfiles();
    };
  }, []);

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  const rows = transactions
    .map((txn) => {
      const owner = profilesById.get(txn.userId);
      return {
        ...txn,
        userName: owner?.name || "Unknown User",
        userEmail: owner?.email || "—",
      };
    })
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    );

  return {
    transactions: rows,
    loading: !(transactionsLoaded && profilesLoaded),
    error,
  };
}
