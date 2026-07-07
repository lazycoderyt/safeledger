"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MessageCircle, ChevronRight } from "lucide-react";
import { useAdminChatThreads } from "@/utils/useAdminChatThreads";

/**
 * app/dashboard/admin/messages/page.js
 * Support inbox — one row per member who has ever messaged support,
 * newest activity first. Tapping a row opens
 * /dashboard/admin/messages/[id] to read and reply.
 */

function getInitials(name) {
  if (!name || name === "Unknown User") return "?";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatRelativeTime(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ThreadRow({ thread }) {
  const unread = thread.unreadByAdmin || 0;
  return (
    <Link
      href={`/dashboard/admin/messages/${thread.id}`}
      className="flex items-center gap-3 px-4 py-4 sm:px-5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold border ${
          unread > 0
            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
            : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
      >
        {getInitials(thread.userName)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-sm ${unread > 0 ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}
          >
            {thread.userName}
          </p>
          <span className="shrink-0 text-[11px] text-slate-400">
            {formatRelativeTime(thread.lastMessageAt)}
          </span>
        </div>
        <p
          className={`truncate text-xs ${unread > 0 ? "font-medium text-slate-700" : "text-slate-500"}`}
        >
          {thread.lastSenderRole === "admin" ? "You: " : ""}
          {thread.lastMessage || "No messages yet"}
        </p>
      </div>

      {unread > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
          {unread}
        </span>
      )}
      <ChevronRight
        className="h-4 w-4 shrink-0 text-slate-300"
        aria-hidden="true"
      />
    </Link>
  );
}

export default function AdminMessagesPage() {
  const { threads, loading, error } = useAdminChatThreads();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = threads.filter((thread) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    return (
      thread.userName?.toLowerCase().includes(term) ||
      thread.userEmail?.toLowerCase().includes(term) ||
      thread.lastMessage?.toLowerCase().includes(term)
    );
  });

  const totalUnread = threads.filter(
    (thread) => (thread.unreadByAdmin || 0) > 0,
  ).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Support Messages
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Every member conversation in one inbox.
          {totalUnread > 0 && (
            <span className="ml-1 font-semibold text-indigo-700">
              {totalUnread} unread.
            </span>
          )}
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by member, email, or message"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Loading conversations…
          </p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-rose-600">
            Couldn&rsquo;t load messages right now. Please try again shortly.
          </p>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <MessageCircle
              className="mx-auto h-8 w-8 text-slate-300"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-600">
              {searchTerm
                ? "No conversations match your search"
                : "No messages yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
