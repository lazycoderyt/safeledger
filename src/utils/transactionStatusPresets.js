/**
 * utils/transactionStatusPresets.js
 * Hardcoded catalog of global transaction-status messages an admin can
 * put in front of every user's transfer attempt (e.g. "our systems are
 * experiencing network issues"). Pure data + one resolver function — no
 * Firestore or React dependencies, safe to import from both the admin
 * settings page and the user-facing transfer page.
 *
 * The live setting itself is a single document at
 * `settings/transactionStatus`:
 *   {
 *     presetId: one of PRESET ids below,
 *     customMessage: string,   // only meaningful when presetId === "custom"
 *     blockTransfers: boolean, // whether transfers are actually prevented
 *     updatedAt: Timestamp,
 *     updatedBy: string | null // admin uid
 *   }
 */

export const TRANSACTION_STATUS_PRESETS = [
  {
    id: "none",
    label: "No Active Message",
    description: "Transfers proceed normally. No banner is shown.",
    message: "",
    defaultBlocking: false,
    tone: "neutral",
  },
  {
    id: "bad-network",
    label: "Bad Network",
    description: "Connectivity issues on our end.",
    message:
      "We're currently experiencing network connectivity issues on our end. Please try your transfer again in a few minutes.",
    defaultBlocking: true,
    tone: "warning",
  },
  {
    id: "restricted-account",
    label: "Restricted Account",
    description: "Accounts under a verification hold.",
    message:
      "Transfers are temporarily restricted while your account is under review. Please contact support to resolve this.",
    defaultBlocking: true,
    tone: "danger",
  },
  {
    id: "maintenance",
    label: "Scheduled Maintenance",
    description: "Planned downtime for transfers.",
    message:
      "Wire transfers are temporarily unavailable while we perform scheduled maintenance. Please check back shortly.",
    defaultBlocking: true,
    tone: "warning",
  },
  {
    id: "security-review",
    label: "Security Review",
    description: "Transfers paused for a routine security check.",
    message:
      "Your transfer is on hold while our team completes a routine security review. This is usually resolved within a few hours.",
    defaultBlocking: true,
    tone: "warning",
  },
  {
    id: "custom",
    label: "Custom Message",
    description: "Write your own message from scratch.",
    message: "",
    defaultBlocking: true,
    tone: "warning",
  },
];

export const TRANSACTION_STATUS_PRESET_IDS = TRANSACTION_STATUS_PRESETS.map(
  (preset) => preset.id,
);

export function getPresetById(presetId) {
  return (
    TRANSACTION_STATUS_PRESETS.find((preset) => preset.id === presetId) || null
  );
}

/**
 * Resolves the raw `settings/transactionStatus` document (or null, if it
 * doesn't exist yet) into the concrete banner a user should see. Missing
 * doc / unknown presetId both fail open to "none" — brand-new
 * deployments or a corrupted doc never silently lock out transfers.
 *
 * @param {Object|null} raw - The Firestore document data, or null.
 * @returns {{ presetId: string, label: string, message: string, blocking: boolean, tone: string, updatedAt: any, updatedBy: string|null }}
 */
export function resolveTransactionStatus(raw) {
  const preset = getPresetById(raw?.presetId) || getPresetById("none");

  const message =
    preset.id === "custom" ? (raw?.customMessage || "").trim() : preset.message;

  const blocking =
    preset.id === "none"
      ? false
      : typeof raw?.blockTransfers === "boolean"
        ? raw.blockTransfers
        : preset.defaultBlocking;

  return {
    presetId: preset.id,
    label: preset.label,
    message,
    blocking: Boolean(message) && blocking,
    tone: preset.tone,
    updatedAt: raw?.updatedAt || null,
    updatedBy: raw?.updatedBy || null,
  };
}
