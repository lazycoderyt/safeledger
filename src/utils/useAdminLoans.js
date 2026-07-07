"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useAdminLoans.js
 * Streams the entire `loans` collection (every user, every loan type)
 * joined with `profiles` so each row carries the applicant's name/email,
 * for the admin loan-review pages.
 *
 * Note: like the other admin directory hooks, this downloads both full
 * collections client-side. Fine at demo/small scale; at real
 * application volume this needs pagination rather than one unbounded
 * listener.
 */
export function useAdminLoans() {
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loansLoaded, setLoansLoaded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribeLoans = onSnapshot(
      collection(db, "loans"),
      (snap) => {
        setLoans(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setLoansLoaded(true);
      },
      (err) => {
        console.error("Failed to stream loans:", err);
        setError(true);
        setLoansLoaded(true);
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
      unsubscribeLoans();
      unsubscribeProfiles();
    };
  }, []);

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  const rows = loans
    .map((loan) => {
      const owner = profilesById.get(loan.userId);
      return {
        ...loan,
        userName: owner?.name || "Unknown User",
        userEmail: owner?.email || "—",
      };
    })
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    );

  return {
    loans: rows,
    loading: !(loansLoaded && profilesLoaded),
    error,
  };
}
