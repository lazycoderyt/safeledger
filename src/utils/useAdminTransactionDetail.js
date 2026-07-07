"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useAdminTransactionDetail.js
 * Streams one transaction document, then (once its userId is known)
 * streams the owning user's profile too, for the admin transaction
 * edit page.
 *
 * @param {string} transactionId
 */
export function useAdminTransactionDetail(transactionId) {
  const [transaction, setTransaction] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactionLoaded, setTransactionLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setTransactionLoaded(true);
      setProfileLoaded(true);
      return undefined;
    }

    const unsubscribeTransaction = onSnapshot(
      doc(db, "transactions", transactionId),
      (snap) => {
        setTransaction(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setTransactionLoaded(true);
      },
      (err) => {
        console.error("Failed to stream transaction:", err);
        setError(true);
        setTransactionLoaded(true);
      },
    );

    return () => unsubscribeTransaction();
  }, [transactionId]);

  useEffect(() => {
    if (!transaction?.userId) {
      if (transactionLoaded) setProfileLoaded(true);
      return undefined;
    }

    const unsubscribeProfile = onSnapshot(
      doc(db, "profiles", transaction.userId),
      (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setProfileLoaded(true);
      },
      (err) => {
        console.error("Failed to stream transaction owner's profile:", err);
        setError(true);
        setProfileLoaded(true);
      },
    );

    return () => unsubscribeProfile();
  }, [transaction?.userId, transactionLoaded]);

  return {
    transaction,
    profile,
    loading: !(transactionLoaded && profileLoaded),
    error,
  };
}
