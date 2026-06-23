// ─────────────────────────────────────────────────────────────────────────────
// pensionModelling.js — PURE investment-growth and ISA/SIPP mix helpers.
//
// Every function here is pure (no React, no DOM, no side effects) so the
// projection layer can be unit-tested in Node without a browser. All monetary
// values are in today's money (callers pass a REAL return rate, i.e. already
// inflation-adjusted). Assumes the 2025/26 tax year for retirement-tax checks.
// ─────────────────────────────────────────────────────────────────────────────

import { calcIncomeTax } from './taxCalculations';

/**
 * Future value of a regular ANNUAL contribution (annuity-due — contributions at
 * the start of each year): FV = C × ((1+r)^n − 1) / r × (1 + r).
 * Falls back to the algebraic limit C × n when r = 0 (no divide-by-zero), and
 * returns the single contribution when years <= 0. r may be negative (a valid
 * negative real return when inflation exceeds the nominal return).
 * @param {number} annualContrib - Amount invested each year.
 * @param {number} years - Number of years.
 * @param {number} r - Real return rate per year (decimal).
 * @returns {number} Projected pot value.
 */
export function projectPot(annualContrib, years, r) {
  if (years <= 0) return annualContrib;
  if (r === 0)    return annualContrib * years;
  return annualContrib * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}

/**
 * ISA vs SIPP mix analysis. Tries five splits and finds the blend with the best
 * net income per £1 of personal cost. SIPP income in retirement is taxable
 * above the personal allowance; ISA income is tax-free. ISA contributions are
 * capped at the £20,000 statutory annual limit. Assumes 2025/26 retirement tax
 * (standard £12,570 personal allowance) and a 4% safe withdrawal rate.
 * @param {number} contribution - Total annual contribution budget.
 * @param {number} years - Years until retirement.
 * @param {number} returnRate - Real return rate per year (decimal).
 * @param {number} taxRate - Marginal income tax rate now (decimal), for SIPP relief.
 * @returns {{scenarios:Array<object>, bestIdx:number, sippMaxForPA:number}}
 */
export function calcMixScenarios(contribution, years, returnRate, taxRate) {
  const retirementPA = { pa: 12570, mode: 'normal' };
  const splits = [
    { isa: 1.00, label: '100% ISA' },
    { isa: 0.75, label: '75% ISA · 25% SIPP' },
    { isa: 0.50, label: '50% ISA · 50% SIPP' },
    { isa: 0.25, label: '25% ISA · 75% SIPP' },
    { isa: 0.00, label: '100% SIPP' },
  ];

  const scenarios = splits.map(({ isa, label }) => {
    const sippNet      = contribution * (1 - isa);
    // Cap ISA at the statutory £20,000 annual subscription limit.
    const isaContrib   = Math.min(contribution * isa, 20000);
    const sippGovTopUp = sippNet * (20 / 80);
    const sippGross    = sippNet + sippGovTopUp;
    const sippExtra    = taxRate > 0.20 ? sippGross * (taxRate - 0.20) : 0;
    const netCost      = isaContrib + sippNet - sippExtra;

    const isaPot    = projectPot(isaContrib, years, returnRate);
    const sippPot   = projectPot(sippGross, years, returnRate);
    const totalPot  = isaPot + sippPot;

    const isaIncome     = isaPot * 0.04;
    const sippLump      = sippPot * 0.25;
    const sippDrawdown  = sippPot * 0.75 * 0.04;
    const sippTax       = calcIncomeTax(sippDrawdown, retirementPA);
    const sippNetIncome = sippDrawdown - sippTax;
    const totalNetIncome = isaIncome + sippNetIncome;
    const incomePerPound = netCost > 0 ? totalNetIncome / netCost : 0;

    return {
      label, isa, netCost, isaPot, sippPot, totalPot,
      sippLump, isaIncome, sippNetIncome, sippDrawdown, sippTax,
      totalNetIncome, incomePerPound
    };
  });

  const bestIdx = scenarios.reduce(
    (b, s, i) => s.incomePerPound > scenarios[b].incomePerPound ? i : b, 0
  );

  // "Sweet spot": max SIPP where retirement drawdown stays within personal allowance (no tax)
  // sippPot * 0.75 * 0.04 = 12570 → sippPot = 419,000
  const paFilledPot  = 12570 / (0.75 * 0.04);
  const fvFactor = (years > 0 && returnRate !== 0)
    ? ((Math.pow(1 + returnRate, years) - 1) / returnRate) * (1 + returnRate)
    : years;
  const sippMaxForPA = Math.min((paFilledPot / fvFactor) / 1.25, contribution); // net equiv

  return { scenarios, bestIdx, sippMaxForPA };
}
