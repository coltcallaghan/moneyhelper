// ─────────────────────────────────────────────────────────────────────────────
// mortgageAnalysis.js — PURE mortgage / property-equity helper. Computes the
// effective monthly payment (if not supplied), the remaining balance and
// property value at retirement, an overpay-vs-invest verdict, and total interest.
// No React, no DOM. Rates are decimals (0.045 = 4.5%).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object} a
 * @param {number} a.propertyValue - Current property value.
 * @param {number} a.mortgageBalance - Outstanding mortgage balance.
 * @param {number} a.mortgageRate - Annual mortgage interest rate (decimal).
 * @param {number} a.mortgageTermYears - Remaining mortgage term in years.
 * @param {number} a.monthlyMortgage - Monthly payment (0 = compute from amortisation).
 * @param {number} a.propertyAppRate - Annual house-price appreciation (decimal).
 * @param {number} a.age - Current age.
 * @param {number} a.retirementAge - Target retirement age.
 * @returns {{mortgageAnalysis: object, propertyEquityAtRetirement: number}}
 */
export function computeMortgageAnalysis({
  propertyValue = 0, mortgageBalance = 0, mortgageRate = 0, mortgageTermYears = 0,
  monthlyMortgage = 0, propertyAppRate = 0.02, age, retirementAge,
}) {
  const equityNow = propertyValue - mortgageBalance;
  const yearsUntilRetirement = Math.max(0, retirementAge - age);
  const yearsToRepayBeforeRetire = Math.min(mortgageTermYears, yearsUntilRetirement);
  const monthlyRate = mortgageRate; // already a decimal
  const monthsTotal = mortgageTermYears * 12;
  const computedMonthly = (monthlyMortgage > 0)
    ? monthlyMortgage
    : (mortgageBalance > 0 && monthsTotal > 0
      ? (monthlyRate > 0
          ? (mortgageBalance * (monthlyRate / 12)) / (1 - Math.pow(1 + (monthlyRate / 12), -monthsTotal))
          : mortgageBalance / monthsTotal)
      : 0);

  // Remaining balance at retirement: amortisation for k payments.
  const monthsUntilRetire = Math.min(monthsTotal, yearsToRepayBeforeRetire * 12);
  let remainingBalanceAtRetire = mortgageBalance;
  if (monthsUntilRetire > 0 && computedMonthly > 0) {
    const r = monthlyRate / 12;
    if (r === 0) {
      remainingBalanceAtRetire = Math.max(0, mortgageBalance - computedMonthly * monthsUntilRetire);
    } else {
      const pow = Math.pow(1 + r, monthsUntilRetire);
      remainingBalanceAtRetire = Math.max(0, mortgageBalance * pow - computedMonthly * ((pow - 1) / r));
    }
  }
  const propertyValueAtRetire = propertyValue > 0 ? Math.round(propertyValue * Math.pow(1 + propertyAppRate, yearsUntilRetirement)) : 0;
  const equityRetirement = propertyValueAtRetire - remainingBalanceAtRetire;
  const shouldOverpay = mortgageRate > 0.05 && mortgageBalance > 0;
  const verdict = shouldOverpay
    ? 'High mortgage rate — consider overpaying the mortgage if you have excess cash.'
    : 'Low mortgage rate — consider investing excess cash for potentially higher returns.';

  const totalInterestEst = (computedMonthly > 0 && monthsTotal > 0)
    ? Math.max(0, (computedMonthly * monthsTotal) - mortgageBalance)
    : 0;
  const mortgagePaidOffAge = (monthsTotal > 0 && mortgageBalance > 0)
    ? age + Math.ceil(monthsTotal / 12)
    : null;

  const mortgageAnalysis = {
    propertyValue, mortgageBalance, mortgageRate, mortgageTermYears, monthlyMortgage,
    equityNow, equityRetirement, shouldOverpay, verdict,
    totalInterestEst, mortgagePaidOffAge,
  };
  return { mortgageAnalysis, propertyEquityAtRetirement: equityRetirement };
}
