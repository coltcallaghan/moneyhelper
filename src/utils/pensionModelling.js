// ─────────────────────────────────────────────────────────────────────────────
// pensionModelling.js — PURE investment-growth and ISA/SIPP mix helpers.
//
// Every function here is pure (no React, no DOM, no side effects) so the
// projection layer can be unit-tested in Node without a browser. All monetary
// values are in today's money (callers pass a REAL return rate, i.e. already
// inflation-adjusted). Assumes the 2025/26 tax year for retirement-tax checks.
// ─────────────────────────────────────────────────────────────────────────────

import { calcIncomeTax } from './taxCalculations';

// 2025/26 higher-rate threshold (gross income at which 40% tax starts).
const HIGHER_RATE_THRESHOLD = 50270;
// Minimum gross pension contribution that always attracts relief, regardless of
// earnings (HMRC: the higher of £3,600 gross or 100% of relevant earnings).
const MIN_RELIEVABLE_GROSS = 3600;

/**
 * Gross SIPP contribution that actually attracts tax relief, capped at HMRC's
 * "100% of relevant earnings (or £3,600)" limit. Above this the basic-rate
 * government top-up and any higher-rate relief should not be credited.
 * If `salary` is not provided the gross is returned uncapped (legacy behaviour).
 * @param {number} grossWanted - The intended gross contribution.
 * @param {number} [salary] - Relevant UK earnings for the year.
 * @returns {number} Relief-eligible gross (≤ grossWanted).
 */
export function reliefEligibleGross(grossWanted, salary) {
  if (typeof salary !== 'number') return grossWanted;
  return Math.min(grossWanted, Math.max(salary, MIN_RELIEVABLE_GROSS));
}

/**
 * Higher-rate (and additional-rate) extra tax relief on a SIPP contribution,
 * claimed via self-assessment on top of the 20% basic-rate top-up. Relief at
 * (marginal − 20%) applies only to the portion of the GROSS contribution that
 * sits in the higher/additional band — i.e. the income that was actually taxed
 * above 20%. Below the higher-rate threshold there is no extra relief.
 * If `salary` is omitted the whole gross is treated as higher-rate (legacy
 * behaviour, exact for incomes where the gross is fully inside the top band).
 * @param {number} gross - Gross SIPP contribution.
 * @param {number} marginalRate - Marginal income tax rate now (decimal).
 * @param {number} [salary] - Relevant earnings, to bound the higher-band portion.
 * @returns {number} Extra relief amount.
 */
export function sippHigherRateRelief(gross, marginalRate, salary) {
  if (marginalRate <= 0.20 || gross <= 0) return 0;
  const higherBandIncome = (typeof salary === 'number')
    ? Math.max(0, salary - HIGHER_RATE_THRESHOLD)
    : gross; // legacy: assume the whole gross sits in the higher band
  return (marginalRate - 0.20) * Math.min(gross, higherBandIncome);
}

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
    const sippExtra    = sippHigherRateRelief(sippGross, taxRate);
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
