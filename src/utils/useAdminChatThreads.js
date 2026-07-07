"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/libs/firebase";

/**
 * utils/useAdminChatThreads.js
 * Streams every chat thread (one per member who has ever messaged
 * support) joined with `profiles` for a reliably up-to-date name/email,
 * for the admin support inbox. Falls back to the thread's own
 * denormalized userName/userEmail if a profile can't be found.
 *
 * Also exposes `totalUnreadThreads` — the count of threads with at
 * least one unread-by-admin message — for nav badges.
 */
export function useAdminChatThreads() {
  const [threads, setThreads] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribeThreads = onSnapshot(
      collection(db, "chats"),
      (snap) => {
        setThreads(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
        );
        setThreadsLoaded(true);
      },
      (err) => {
        console.error("Failed to stream chat threads:", err);
        setError(true);
        setThreadsLoaded(true);
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
      unsubscribeThreads();
      unsubscribeProfiles();
    };
  }, []);

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );

  const rows = threads
    .map((thread) => {
      const owner = profilesById.get(thread.id);
      return {
        ...thread,
        userName: owner?.name || thread.userName || "Unknown User",
        userEmail: owner?.email || thread.userEmail || "—",
      };
    })
    .sort(
      (a, b) =>
        (b.lastMessageAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0) -
        (a.lastMessageAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0),
    );

  const totalUnreadThreads = rows.filter(
    (thread) => (thread.unreadByAdmin || 0) > 0,
  ).length;

  return {
    threads: rows,
    totalUnreadThreads,
    loading: !(threadsLoaded && profilesLoaded),
    error,
  };
}
