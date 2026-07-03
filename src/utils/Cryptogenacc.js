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
