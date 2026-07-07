"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Ban,
} from "lucide-react";
import { useTransactionStatus } from "@/utils/useTransactionStatus";
import { setTransactionStatusMessage } from "@/utils/authHelper";
import { TRANSACTION_STATUS_PRESETS } from "@/utils/transactionStatusPresets";
import { useAuth } from "@/context/AuthContext";

/**
 * app/dashboard/admin/settings/page.js
 * Global Transaction Status — a single message + block toggle that
 * applies to every user in the app at once. Shown to a user right when
 * they try to make a transfer (see
 * src/app/dashboard/user/transfer/page.js). Presets are hardcoded in
 * utils/transactionStatusPresets.js; admins can also write a fully
 * custom message.
 *
 * Saving a change that BLOCKS transfers app-wide is gated behind a
 * type-to-confirm phrase, same pattern as deleting a transaction or
 * changing a user's role — this is the highest-blast-radius action in
 * the admin console (it can stop every user from transacting), so it
 * gets the same friction. Saving a non-blocking message (including
 * clearing it back to "none") goes through immediately.
 */

const CONFIRM_PHRASE = "I confirm this admin action now";

function normalizePhrase(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  if (!date) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Banner({ tone, icon: Icon, children }) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${toneClasses}`}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-sm">{children}</p>
    </div>
  );
}

export default function AdminTransactionStatusPage() {
  const { user: currentAdmin } = useAuth();
  const {
    raw,
    status: liveStatus,
    loading,
    error: loadError,
  } = useTransactionStatus();

  const [initialized, setInitialized] = useState(false);
  const [presetId, setPresetId] = useState("none");
  const [customMessage, setCustomMessage] = useState("");
  const [blockTransfers, setBlockTransfers] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Confirmation gate — only shown when the pending save would block
  // transfers app-wide.
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const phraseMatches =
    normalizePhrase(confirmInput) === normalizePhrase(CONFIRM_PHRASE);

  // Populate the form once, from whatever's currently live — after that
  // the inputs are the source of truth for what's being edited.
  useEffect(() => {
    if (!initialized && !loading) {
      setPresetId(raw?.presetId || "none");
      setCustomMessage(raw?.customMessage || "");
      setBlockTransfers(
        typeof raw?.blockTransfers === "boolean" ? raw.blockTransfers : false,
      );
      setInitialized(true);
    }
  }, [raw, loading, initialized]);

  const selectedPreset =
    TRANSACTION_STATUS_PRESETS.find((p) => p.id === presetId) ||
    TRANSACTION_STATUS_PRESETS[0];
  const previewMessage =
    presetId === "custom" ? customMessage.trim() : selectedPreset.message;

  function selectPreset(preset) {
    setPresetId(preset.id);
    setBlockTransfers(preset.id === "none" ? false : preset.defaultBlocking);
    setSaveError("");
    setSaveSuccess(false);
  }

  function validate() {
    if (presetId === "custom" && !customMessage.trim()) {
      return "Enter a custom message, or choose one of the presets instead.";
    }
    return "";
  }

  async function commitSave() {
    setSaving(true);
    setSaveError("");
    try {
      await setTransactionStatusMessage(currentAdmin?.uid, {
        presetId,
        customMessage,
        blockTransfers: presetId === "none" ? false : blockTransfers,
      });
      setSaveSuccess(true);
      setShowConfirm(false);
      setConfirmInput("");
    } catch (err) {
      console.error("Failed to update transaction status:", err);
      setSaveError(
        err.message || "Couldn't save this status. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveSuccess(false);

    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError("");

    const willBlock = presetId !== "none" && blockTransfers;
    if (willBlock) {
      setShowConfirm(true);
      return;
    }
    await commitSave();
  }

  async function handleConfirmedSave(e) {
    e.preventDefault();
    if (!phraseMatches) return;
    await commitSave();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 bg-white p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Transaction Status
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Set a global message every user sees when they try to make a transfer.
          This applies app-wide, not per user.
        </p>
      </div>

      {/* Currently live status */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Currently Live
        </p>
        {loading ? (
          <p className="mt-2 text-sm text-slate-400">Loading…</p>
        ) : loadError ? (
          <p className="mt-2 text-sm text-rose-600">
            Couldn&rsquo;t load the current status.
          </p>
        ) : liveStatus.presetId === "none" ? (
          <p className="mt-2 text-sm text-slate-600">
            No active message. Transfers proceed normally.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {liveStatus.label}
              {liveStatus.blocking && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                  <Ban className="h-3 w-3" aria-hidden="true" />
                  Blocking transfers
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-slate-600">{liveStatus.message}</p>
            <p className="mt-2 text-xs text-slate-400">
              Last updated {formatDate(raw?.updatedAt)}
            </p>
          </>
        )}
      </div>

      {saveError && (
        <Banner tone="error" icon={AlertCircle}>
          {saveError}
        </Banner>
      )}
      {saveSuccess && (
        <Banner tone="success" icon={CheckCircle2}>
          Transaction status updated. Every user will see this the next time
          they try to transfer.
        </Banner>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        noValidate
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          Set Status Message
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TRANSACTION_STATUS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              aria-pressed={presetId === preset.id}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                presetId === preset.id
                  ? "border-indigo-600 bg-indigo-50/60"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">
                {preset.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {preset.description}
              </span>
            </button>
          ))}
        </div>

        {presetId === "custom" && (
          <div className="mt-5">
            <label
              htmlFor="customMessage"
              className="text-xs font-semibold uppercase tracking-widest text-slate-500"
            >
              Custom Message
            </label>
            <textarea
              id="customMessage"
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Transfers over $10,000 require a callback verification this week."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>
        )}

        {presetId !== "none" && (
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <input
              type="checkbox"
              checked={blockTransfers}
              onChange={(e) => setBlockTransfers(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <span className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">
                Block transfers
              </span>{" "}
              while this message is shown. If unchecked, users still see the
              message but can complete their transfer normally.
            </span>
          </label>
        )}

        {previewMessage && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Preview
            </p>
            <p className="mt-1 text-sm text-slate-700">{previewMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !initialized}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving
            </>
          ) : (
            "Save Status"
          )}
        </button>
      </form>

      {showConfirm && (
        <form
          onSubmit={handleConfirmedSave}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5"
          noValidate
        >
          <div className="flex items-start gap-2.5">
            <KeyRound
              className="h-4 w-4 shrink-0 mt-0.5 text-amber-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Confirm blocking every user&rsquo;s transfers
              </p>
              <p className="mt-1 text-xs text-amber-800">
                This message will prevent every user in the app from completing
                a transfer until it&rsquo;s changed. Type the phrase below
                exactly to confirm.
              </p>
            </div>
          </div>

          <p className="mt-3 select-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-sm text-slate-900">
            {CONFIRM_PHRASE}
          </p>

          <label htmlFor="confirmInput" className="sr-only">
            Type the confirmation phrase
          </label>
          <input
            id="confirmInput"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Type the phrase above"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
          />

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setConfirmInput("");
              }}
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!phraseMatches || saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              {saving ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Saving
                </>
              ) : (
                "Confirm & Block Transfers"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
