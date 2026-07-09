/**
 * utils/cryptogenacc.js
 * Pure helper for generating institutional-style US account identifiers.
 * No external dependencies — safe to import on client or server.
 */

/**
 * Generates a random 10-to-12 digit numeric string formatted to resemble
 * a standard US checking/institutional account number. Uses
 * crypto.getRandomValues when available (browser/modern Node) and falls
 * back to Math.random otherwise.
 *
 * @returns {string} A 10-to-12 digit account number, e.g. "4839021157"
 */
export function generateUSAccountNumber() {
  const length = Math.random() < 0.5 ? 10 : 12;
  let digits = "";

  const hasCrypto =
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function";

  if (hasCrypto) {
    const buffer = new Uint32Array(length);
    crypto.getRandomValues(buffer);
    for (let i = 0; i < length; i++) {
      const digit = buffer[i] % 10;
      // avoid a leading zero so the identifier always reads as full-length
      digits +=
        i === 0 && digit === 0 ? String(1 + (buffer[i] % 9)) : String(digit);
    }
  } else {
    for (let i = 0; i < length; i++) {
      const digit = Math.floor(Math.random() * 10);
      digits +=
        i === 0 && digit === 0
          ? String(1 + Math.floor(Math.random() * 9))
          : String(digit);
    }
  }

  return digits;
}

/**
 * Formats a raw account number string into grouped, human-readable
 * blocks of 4 for display purposes (e.g. "4839 0211 57").
 * Purely presentational — the stored/authoritative value stays ungrouped.
 *
 * @param {string} accountNumber
 * @returns {string}
 */
export function formatAccountNumberDisplay(accountNumber) {
  if (!accountNumber) return "";
  return accountNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function randomDigits(count) {
  const hasCrypto =
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function";

  let digits = "";
  if (hasCrypto) {
    const buffer = new Uint32Array(count);
    crypto.getRandomValues(buffer);
    for (let i = 0; i < count; i++) digits += String(buffer[i] % 10);
  } else {
    for (let i = 0; i < count; i++)
      digits += String(Math.floor(Math.random() * 10));
  }
  return digits;
}

/**
 * Generates a full set of card details for a newly-provisioned virtual
 * card: a 16-digit number, a 3-digit CVV, and an expiry 3 years out from
 * issuance. Called once at provisioning time and persisted — never
 * regenerated on render — so a given card keeps the same number for
 * its lifetime.
 *
 * @returns {{ cardNumber: string, last4: string, cvv: string, expiry: string }}
 */
export function generateCardDetails() {
  const cardNumber = `4${randomDigits(15)}`; // Visa-style leading 4
  const cvv = randomDigits(3);

  const issued = new Date();
  const expiryDate = new Date(issued.getFullYear() + 3, issued.getMonth(), 1);
  const mm = String(expiryDate.getMonth() + 1).padStart(2, "0");
  const yy = String(expiryDate.getFullYear()).slice(-2);

  return {
    cardNumber,
    last4: cardNumber.slice(-4),
    cvv,
    expiry: `${mm}/${yy}`,
  };
}

/**
 * Formats a raw 16-digit card number into grouped blocks of 4 for
 * display (e.g. "4839 0211 5723 4892").
 *
 * @param {string} cardNumber
 * @returns {string}
 */
export function formatCardNumberDisplay(cardNumber) {
  if (!cardNumber) return "";
  return cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
}

// Unambiguous alphabet for human-read/typed reference codes — no 0/O
// or 1/I, which are the two most common transcription mistakes.
const TRANSACTION_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFromAlphabet(count, alphabet) {
  const hasCrypto =
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function";

  let out = "";
  if (hasCrypto) {
    const buffer = new Uint32Array(count);
    crypto.getRandomValues(buffer);
    for (let i = 0; i < count; i++) {
      out += alphabet[buffer[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < count; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return out;
}

/**
 * Generates a human-readable bank-statement-style transaction
 * reference, e.g. "TXN-20260709-7K3M9QXZ" — a date stamp (so it sorts
 * and reads naturally) plus 8 random unambiguous characters (so
 * collisions are effectively impossible even generated client-side,
 * without needing a database round-trip to check for one).
 *
 * @param {Date} [date] - Defaults to now.
 * @returns {string}
 */
export function generateTransactionId(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `TXN-${y}${m}${d}-${randomFromAlphabet(8, TRANSACTION_ID_ALPHABET)}`;
}
