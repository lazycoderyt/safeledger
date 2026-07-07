"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatMessages } from "@/utils/useChatMessages";
import { useChatThreadMeta } from "@/utils/useChatThreadMeta";
import { sendChatMessage, markChatThreadRead } from "@/utils/authHelper";

/**
 * app/dashboard/admin/messages/[id]/page.js
 * Admin side of one member's support thread. Same bounded-panel,
 * normal-document-flow composer approach as the member's page (see
 * that file's header comment) so the on-screen keyboard behaves
 * correctly on both iOS and Android here too.
 */

const MAX_MESSAGE_LENGTH = 2000;
const TEXTAREA_MAX_HEIGHT = 120;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatTimestamp(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateDivider(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "";
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function MessageBubble({ message }) {
  const isMine = message.senderRole === "admin";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
          isMine
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {!isMine && (
          <p className="mb-0.5 text-[11px] font-semibold text-slate-500">
            {message.senderName || "Member"}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.text}
        </p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isMine ? "text-indigo-100" : "text-slate-400"
          }`}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function AdminChatThreadPage() {
  const params = useParams();
  const userId = params?.id;
  const { user: currentAdmin } = useAuth();

  const { messages, loading: messagesLoading } = useChatMessages(userId);
  const { thread, loading: threadLoading } = useChatThreadMeta(userId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const textareaRef = useRef(null);
  const scrollBottomRef = useRef(null);

  // Mark read on open, and keep clearing it for as long as this thread
  // stays open and new member messages keep arriving.
  useEffect(() => {
    if (!userId) return;
    if ((thread?.unreadByAdmin || 0) > 0) {
      markChatThreadRead(userId, "admin").catch((err) =>
        console.error("Failed to mark thread read:", err),
      );
    }
  }, [userId, thread?.unreadByAdmin]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || !userId || !currentAdmin?.uid) return;

    setSending(true);
    setSendError("");
    try {
      await sendChatMessage(userId, {
        senderUid: currentAdmin.uid,
        senderRole: "admin",
        senderName: "SafeLedger Support",
        text: trimmed,
      });
      setText("");
      requestAnimationFrame(autoGrow);
    } catch (err) {
      console.error("Failed to send reply:", err);
      setSendError(
        err.message || "Couldn't send that reply. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  let lastDateLabel = "";

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col bg-white p-4 sm:h-[calc(100vh-5rem)] sm:p-6 lg:p-8">
      <div className="shrink-0">
        <Link
          href="/dashboard/admin/messages"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Support Messages
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700">
            {getInitials(thread?.userName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900">
              {threadLoading ? "Loading…" : thread?.userName || "Unknown User"}
            </p>
            <p className="truncate text-xs text-slate-500">
              {thread?.userEmail || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 [-webkit-overflow-scrolling:touch]">
          {messagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-600">
                No messages yet
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const dateLabel = formatDateDivider(message.createdAt);
                const showDivider = dateLabel && dateLabel !== lastDateLabel;
                if (showDivider) lastDateLabel = dateLabel;
                return (
                  <div key={message.id}>
                    {showDivider && (
                      <div className="my-3 flex items-center justify-center">
                        <span className="rounded-full bg-slate-200/80 px-3 py-1 text-[11px] font-medium text-slate-500">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <MessageBubble message={message} />
                  </div>
                );
              })}
              <div ref={scrollBottomRef} />
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-3">
          {sendError && (
            <div
              role="alert"
              className="mb-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
            >
              <AlertCircle
                className="h-3.5 w-3.5 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              {sendError}
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <label htmlFor="adminReply" className="sr-only">
              Type a reply
            </label>
            <textarea
              id="adminReply"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                autoGrow();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply…"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="true"
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH}
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send reply"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2
                  className="h-4.5 w-4.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-4.5 w-4.5" aria-hidden="true" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
