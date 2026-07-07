"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useAdminLoanDetail.js
 * Streams one loan document, then (once its userId is known) streams
 * the applicant's profile too, for the admin loan approval/rejection
 * page.
 *
 * @param {string} loanId
 */
export function useAdminLoanDetail(loanId) {
  const [loan, setLoan] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loanLoaded, setLoanLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!loanId) {
      setLoanLoaded(true);
      setProfileLoaded(true);
      return undefined;
    }

    const unsubscribeLoan = onSnapshot(
      doc(db, "loans", loanId),
      (snap) => {
        setLoan(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoanLoaded(true);
      },
      (err) => {
        console.error("Failed to stream loan:", err);
        setError(true);
        setLoanLoaded(true);
      },
    );

    return () => unsubscribeLoan();
  }, [loanId]);

  useEffect(() => {
    if (!loan?.userId) {
      if (loanLoaded) setProfileLoaded(true);
      return undefined;
    }

    const unsubscribeProfile = onSnapshot(
      doc(db, "profiles", loan.userId),
      (snap) => {
        setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setProfileLoaded(true);
      },
      (err) => {
        console.error("Failed to stream loan applicant's profile:", err);
        setError(true);
        setProfileLoaded(true);
      },
    );

    return () => unsubscribeProfile();
  }, [loan?.userId, loanLoaded]);

  return {
    loan,
    profile,
    loading: !(loanLoaded && profileLoaded),
    error,
  };
}
