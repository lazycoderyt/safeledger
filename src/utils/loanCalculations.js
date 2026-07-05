/**
 * utils/loanCalculations.js
 * Pure amortization math for loans and mortgages. No Firestore or React
 * dependencies — safe to unit test or reuse anywhere.
 */

/**
 * Standard fixed-rate amortization formula.
 *
 * @param {number} principal - Loan amount.
 * @param {number} annualRatePercent - Annual interest rate, e.g. 6.5 for 6.5%.
 * @param {number} termMonths - Loan term in months.
 * @returns {number} The fixed monthly payment.
 */
export function calculateMonthlyPayment(
  principal,
  annualRatePercent,
  termMonths,
) {
  if (!principal || !termMonths) return 0;
  const monthlyRate = (annualRatePercent || 0) / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Converts a term in months to a human label, e.g. 360 -> "30 years",
 * 18 -> "18 months".
 *
 * @param {number} termMonths
 * @returns {string}
 */
export function formatTermLabel(termMonths) {
  if (!termMonths) return "—";
  if (termMonths % 12 === 0) {
    const years = termMonths / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${termMonths} months`;
}
