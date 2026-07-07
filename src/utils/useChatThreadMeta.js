"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useChatThreadMeta.js
 * Streams the parent `chats/{userId}` document itself — unread
 * counters, last-message preview, participant name/email. Used
 * wherever something needs the thread's metadata without pulling
 * every message (nav badges, the admin conversation header, etc).
 *
 * @param {string} userId
 */
export function useChatThreadMeta(userId) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setThread(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(db, "chats", userId),
      (snap) => {
        setThread(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to stream chat thread metadata:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { thread, loading, error };
}
