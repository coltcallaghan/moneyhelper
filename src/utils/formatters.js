// ─────────────────────────────────────────────────────────────────────────────
// formatters.js — shared display formatters (GBP currency, percentages).
// Pure, UI-agnostic helpers used by the React components and injected into the
// calculation engine so its human-readable strings match the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a number as GBP currency (en-GB), e.g. 1234.5 → "£1,235".
 * @param {number} n - The amount.
 * @param {number} [dec=0] - Maximum fraction digits.
 * @returns {string}
 */
export const fmtGBP = (n, dec = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: dec }).format(n);

/**
 * Format a decimal as a percentage, e.g. 0.45 → "45%".
 * @param {number} n - The decimal value.
 * @param {number} [dec=0] - Fraction digits.
 * @returns {string}
 */
export const fmtPct = (n, dec = 0) => `${(n * 100).toFixed(dec)}%`;
