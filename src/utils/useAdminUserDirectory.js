"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * hooks/useAdminUserDirectory.js
 * Streams the `profiles` and `accounts` collections and merges them by
 * UID into one flat list — every user with their real, live balance
 * attached. Used by the admin's user-facing list pages (balance
 * adjustments, user directory).
 *
 * Note: like useAdminOverview, this downloads both full collections
 * client-side. Fine at demo/small scale; revisit with pagination or
 * server-side search at real scale.
 */
export function useAdminUserDirectory() {
  const [profiles, setProfiles] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
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

    const unsubscribeAccounts = onSnapshot(
      collection(db, "accounts"),
      (snap) => {
        setAccounts(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setAccountsLoaded(true);
      },
      (err) => {
        console.error("Failed to stream accounts:", err);
        setError(true);
        setAccountsLoaded(true);
      },
    );

    return () => {
      unsubscribeProfiles();
      unsubscribeAccounts();
    };
  }, []);

  const accountsById = new Map(
    accounts.map((account) => [account.id, account]),
  );

  const users = profiles.map((profile) => {
    const account = accountsById.get(profile.id);
    return {
      id: profile.id,
      name: profile.name || "Unnamed User",
      email: profile.email || "—",
      accountNumber: profile.accountNumber || account?.accountNumber || "",
      avatarUrl: profile.avatarUrl || "",
      role: profile.role || "user",
      availableBalance: account?.availableBalance ?? null,
      currency: account?.currency || "USD",
      accountStatus: account?.status || "unknown",
    };
  });

  return { users, loading: !(profilesLoaded && accountsLoaded), error };
}
