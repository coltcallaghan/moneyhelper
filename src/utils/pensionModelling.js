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
 * AFPS-15 Added Pension inclusion gate. Decides whether the allocation engine
 * should buy Added Pension for a phase, comparing its capital-equivalent
 * efficiency against the SIPP alternative. Include when AP efficiency is at least
 * `minRatio` of the SIPP efficiency — 90% normally, tightened to 100% when
 * retiring before State Pension Age (the pension is then locked away longer). A
 * very high combined tax+NI saving (>= 50%) also includes AP, but only when NOT
 * retiring early. The boundary is inclusive (`>=`): at exactly the ratio, AP is
 * included.
 * @param {object} args
 * @param {number} args.apEfficiency - AP capital-equivalent value per £ net cost.
 * @param {number} args.sippEfficiency - SIPP pot value per £ net cost (same budget).
 * @param {boolean} args.retiresTooEarlyForAP - true if retiring before SPA (67).
 * @param {number} args.taxRate - Marginal income tax rate (decimal).
 * @param {number} args.niRate - Marginal NI rate (decimal).
 * @returns {boolean} Whether to include Added Pension.
 */
export function shouldIncludeAddedPension({ apEfficiency, sippEfficiency, retiresTooEarlyForAP, taxRate, niRate }) {
  const minRatio = retiresTooEarlyForAP ? 1.0 : 0.9;
  const beatsSipp = apEfficiency >= sippEfficiency * minRatio;
  const highReliefShortcut = (taxRate + niRate) >= 0.5 && !retiresTooEarlyForAP;
  return beatsSipp || highReliefShortcut;
}

// AFPS-15 Added Pension constants (2025/26).
export const AP_LIFETIME_MAX = 8571.21;        // max £/yr of Added Pension purchasable over a career
const AP_PERIODIC_LOADING = 1.37;              // periodic-payment cost loading vs lump sum
const EDP_LUMP_MULTIPLE = 2.25;                // Early Departure Payment lump = 2.25 × pension
const EDP_INCOME_RATE = 0.34;                  // EDP income = 34% of pension

/**
 * Compute AFPS-15 Added Pension parameters and the comparison "option" object.
 * Pure: same inputs → same output. Mirrors the AFPS cost-per-£100 model, the
 * £8,571.21/yr lifetime cap, the ×25 capital equivalence, and EDP eligibility.
 * Assumes the 2025/26 scheme year.
 * @param {object} a
 * @param {number} a.contribution - Annual budget the user can invest.
 * @param {number} a.age - Current age.
 * @param {number} [a.leaveAge] - Age leaving service (undefined = serve to retire).
 * @param {number} a.retirementAge - Target retirement age.
 * @param {number} a.yearsService - Years served so far (for EDP eligibility).
 * @param {number} a.taxRate - Marginal income tax rate (decimal).
 * @param {number} a.niRate - Marginal NI rate (decimal).
 * @param {number} a.apCostPer100 - User-supplied cost per £100 of pension (0 = estimate).
 * @param {string} a.apPaymentType - 'periodic' applies the periodic loading.
 * @param {boolean} a.isServing - Whether the user is currently serving.
 * @returns {object} AP params + the `addedPension` comparison option.
 */
export function computeAddedPension({
  contribution, age, leaveAge, retirementAge, yearsService,
  taxRate, niRate, apCostPer100, apPaymentType, isServing,
}) {
  const apTaxSaving = contribution * taxRate;
  const apNISaving = contribution * niRate;
  const apNetCost = contribution - apTaxSaving - apNISaving;

  let effectiveLeaveAge;
  let alreadyLeft = false;
  if (typeof leaveAge !== 'undefined' && leaveAge !== null && !isNaN(leaveAge) && leaveAge <= age) {
    alreadyLeft = true;
    effectiveLeaveAge = age;
  } else {
    effectiveLeaveAge = Math.min(Math.max(leaveAge || retirementAge, age + 1), retirementAge);
  }
  const leaveYears = Math.max(0, effectiveLeaveAge - age);

  const AP_MAX_MULTIPLES = AP_LIFETIME_MAX / 100;
  const estimatedCostPer100sp = Math.round(800 * Math.pow(1.042, (age || 30) - 20));
  const estimatedCostPer100ap = apPaymentType === 'periodic' ? Math.round(estimatedCostPer100sp * AP_PERIODIC_LOADING) : estimatedCostPer100sp;
  const costPer100actual = apCostPer100 > 0 ? apCostPer100 : estimatedCostPer100ap;
  const blocksPerYear = costPer100actual > 0 ? (contribution / costPer100actual) : 0;
  const pensionPerYear = blocksPerYear * 100;

  const totalPensionRaw = pensionPerYear * leaveYears;
  const totalPensionAcquired = Math.min(totalPensionRaw, AP_LIFETIME_MAX);
  const willHitCap = totalPensionRaw > AP_LIFETIME_MAX;
  const yearsToHitCap = pensionPerYear > 0 ? Math.ceil(AP_LIFETIME_MAX / pensionPerYear) : leaveYears;
  const apMaxAnnualByLifetime = leaveYears > 0
    ? Math.round((AP_LIFETIME_MAX / 100) * costPer100actual / leaveYears)
    : Math.round(AP_MAX_MULTIPLES * costPer100actual);
  const apMaxContrib = Math.min(apMaxAnnualByLifetime, 60000);
  const apLimitExceeded = !alreadyLeft && (willHitCap || contribution > 60000);

  const edpEligible = age >= 40 && (yearsService || 0) >= 20 && age < 60;
  const edpLumpSum = edpEligible ? totalPensionAcquired * EDP_LUMP_MULTIPLE : 0;
  const edpIncome = edpEligible ? totalPensionAcquired * EDP_INCOME_RATE : 0;
  const apPot = totalPensionAcquired * 25 + edpLumpSum;

  const addedPension = isServing
    ? {
        id: 'addedpension', name: 'AFPS 15 Added Pension', icon: '🎖️', color: '#10b981',
        costToYou: alreadyLeft ? 0 : apNetCost,
        taxSaving: alreadyLeft ? 0 : apTaxSaving,
        niSaving: alreadyLeft ? 0 : apNISaving,
        potAtRetirement: apPot,
        annualIncomeAtRetirement: totalPensionAcquired,
        edpEligible, edpLumpSum, edpIncome, totalPensionAcquired, pensionPerYear, leaveYears,
        limitExceeded: apLimitExceeded,
        limitNote: alreadyLeft ? 'Already left — no further contributions' : (willHitCap ? `Career cap reached after ${yearsToHitCap} yrs` : null),
      }
    : {
        id: 'addedpension', name: 'AFPS 15 Added Pension', icon: '🎖️', color: '#10b981',
        costToYou: 0, taxSaving: 0, niSaving: 0, potAtRetirement: 0, annualIncomeAtRetirement: 0,
        edpEligible: false, edpLumpSum: 0, edpIncome: 0, totalPensionAcquired: 0, pensionPerYear: 0, leaveYears: 0,
        limitExceeded: false, limitNote: 'Not available unless currently serving',
      };

  return {
    addedPension, alreadyLeft, leaveYears, costPer100actual, apMaxContrib,
    apNetCost, apTaxSaving, apNISaving, totalPensionAcquired, AP_LIFETIME_MAX,
    edpEligible, edpLumpSum, edpIncome,
  };
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
