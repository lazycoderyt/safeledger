"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * hooks/useAdminUserDetail.js
 * Streams one user's `profiles/{id}` and `accounts/{id}` documents
 * live, for admin detail/edit pages.
 *
 * @param {string} userId
 */
export function useAdminUserDetail(userId) {
  const [profile, setProfile] = useState(null);
  const [account, setAccount] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfileLoaded(true);
      setAccountLoaded(true);
      return undefined;
    }

    const unsubscribeProfile = onSnapshot(
      doc(db, "profiles", userId),
      (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setProfileLoaded(true);
      },
      (err) => {
        console.error("Failed to stream profile:", err);
        setError(true);
        setProfileLoaded(true);
      },
    );

    const unsubscribeAccount = onSnapshot(
      doc(db, "accounts", userId),
      (snap) => {
        setAccount(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setAccountLoaded(true);
      },
      (err) => {
        console.error("Failed to stream account:", err);
        setError(true);
        setAccountLoaded(true);
      },
    );

    return () => {
      unsubscribeProfile();
      unsubscribeAccount();
    };
  }, [userId]);

  return {
    profile,
    account,
    loading: !(profileLoaded && accountLoaded),
    error,
  };
}
