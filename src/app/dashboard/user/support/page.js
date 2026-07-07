"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  Headset,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useChatMessages } from "@/utils/useChatMessages";
import { useChatThreadMeta } from "@/utils/useChatThreadMeta";
import {
  ensureChatThread,
  sendChatMessage,
  markChatThreadRead,
} from "@/utils/authHelper";

/**
 * app/dashboard/user/support/page.js
 * Live chat with the SafeLedger support team — one thread per member,
 * visible to any admin from /dashboard/admin/messages.
 *
 * The message list scrolls inside a height-bounded panel rather than
 * pinning the composer with `position: fixed` to the viewport edge.
 * That's a deliberate choice for iOS/Android compatibility: fixed-to-
 * viewport composers are the classic spot where the on-screen keyboard
 * covers the input or leaves a dead gap when it opens, because mobile
 * browsers resize the *visual* viewport but not always the *layout*
 * viewport. Keeping the composer in normal document flow means the
 * browser's own "scroll the focused input into view" behavior just
 * works, on both platforms, with no manual viewport math.
 */

const MAX_MESSAGE_LENGTH = 2000;
const TEXTAREA_MAX_HEIGHT = 120;

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
  const isMine = message.senderRole === "user";
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 sm:max-w-[70%] ${
          isMine
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
        }`}
      >
        {!isMine && (
          <p className="mb-0.5 text-[11px] font-semibold text-blue-600">
            {message.senderName || "Support"}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.text}
        </p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isMine ? "text-blue-100" : "text-slate-400"
          }`}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function SupportChatPage() {
  const { user, profile } = useAuth();
  const { messages, loading: messagesLoading } = useChatMessages(user?.uid);
  const { thread } = useChatThreadMeta(user?.uid);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [threadReady, setThreadReady] = useState(false);

  const textareaRef = useRef(null);
  const scrollBottomRef = useRef(null);
  const listRef = useRef(null);

  // Create the thread (idempotent) the first time this page is opened
  // for this user, and mark it as read once we know it exists.
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    ensureChatThread(user.uid, {
      name: profile?.name,
      email: profile?.email || user.email,
    })
      .then(() => {
        if (!cancelled) setThreadReady(true);
      })
      .catch((err) => {
        console.error("Failed to initialize support thread:", err);
        if (!cancelled) setThreadReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, profile?.name, profile?.email, user?.email]);

  // Keep clearing the user's unread counter for as long as this page
  // is open and support has an unread reply waiting.
  useEffect(() => {
    if (!user?.uid) return;
    if ((thread?.unreadByUser || 0) > 0) {
      markChatThreadRead(user.uid, "user").catch((err) =>
        console.error("Failed to mark support thread read:", err),
      );
    }
  }, [user?.uid, thread?.unreadByUser]);

  // Auto-scroll to the newest message.
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
    if (!trimmed || sending || !user?.uid) return;

    setSending(true);
    setSendError("");
    try {
      await sendChatMessage(user.uid, {
        senderUid: user.uid,
        senderRole: "user",
        senderName: profile?.name || user.email,
        text: trimmed,
      });
      setText("");
      requestAnimationFrame(autoGrow);
    } catch (err) {
      console.error("Failed to send message:", err);
      setSendError(
        err.message || "Couldn't send that message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    // isComposing guards against Enter being fired mid-keystroke by
    // predictive/IME keyboards (common on both iOS and Android for
    // languages like Japanese, Korean, and Chinese) — without this
    // check, confirming a suggestion can accidentally send the message.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  }

  let lastDateLabel = "";

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col bg-white p-4 sm:h-[calc(100vh-5rem)] sm:p-6 lg:p-8">
      <div className="shrink-0">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <MessageCircle className="h-5 w-5 text-blue-600" aria-hidden="true" />
          Support Chat
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Message the SafeLedger support team directly — we typically reply
          within one business day.
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 [-webkit-overflow-scrolling:touch]"
        >
          {messagesLoading || !threadReady ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">Loading conversation…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Headset className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-600">
                No messages yet
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                Send us a message below and a member of our support team will
                get back to you here.
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
            <label htmlFor="chatMessage" className="sr-only">
              Type a message
            </label>
            <textarea
              id="chatMessage"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
                autoGrow();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              autoCapitalize="sentences"
              spellCheck="true"
              disabled={sending}
              maxLength={MAX_MESSAGE_LENGTH}
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
