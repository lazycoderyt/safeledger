"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";
import { resolveTransactionStatus } from "@/utils/transactionStatusPresets";

/**
 * utils/useTransactionStatus.js
 * Streams the single global `settings/transactionStatus` document live
 * and resolves it into the concrete banner every reader (admin config
 * page, user transfer page) needs. A missing document — e.g. a brand
 * new deployment where no admin has set anything yet — resolves to
 * "no active message, not blocking" rather than an error.
 */
export function useTransactionStatus() {
  const [rawStatus, setRawStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "transactionStatus"),
      (snap) => {
        setRawStatus(snap.exists() ? snap.data() : null);
        setLoading(false);
        setError(false);
      },
      (err) => {
        console.error("Failed to stream transaction status:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return {
    raw: rawStatus,
    status: resolveTransactionStatus(rawStatus),
    loading,
    error,
  };
}
