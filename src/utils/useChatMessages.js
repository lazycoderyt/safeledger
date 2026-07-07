"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useChatMessages.js
 * Streams `chats/{userId}/messages` in ascending chronological order.
 * Shared by the member's chat page and the admin conversation view —
 * same subcollection, same ordering, either side.
 *
 * @param {string} userId - The thread to stream (always the member's
 *   uid, regardless of who's viewing).
 */
export function useChatMessages(userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const messagesQuery = query(
      collection(db, "chats", userId, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snap) => {
        setMessages(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Failed to stream chat messages:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userId]);

  return { messages, loading, error };
}
