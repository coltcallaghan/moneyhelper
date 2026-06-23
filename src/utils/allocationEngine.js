// ─────────────────────────────────────────────────────────────────────────────
// allocationEngine.js — shared, PURE budget-allocation step builders used by
// both the MOD and civilian action plans. Extracting these removes the
// duplicated SIPP/ISA/GIA logic that previously lived in both builders.
//
// These functions are pure: given the same inputs they return the same step
// objects. Formatter functions (fmtGBP, fmtPct) and projectPot are injected so
// the engine stays free of UI/import coupling. Assumes 2025/26: ISA £20,000
// annual limit, basic-rate band, SIPP 25% government top-up.
// ─────────────────────────────────────────────────────────────────────────────

const ISA_ANNUAL_LIMIT = 20000;
// SIPP net contribution that keeps retirement drawdown within the £12,570 PA:
// pot × 0.75 × 0.04 = 12,570 → pot = 419,000; back out the annual net amount.
const PA_FILLED_POT = 12570 / (0.75 * 0.04);

/**
 * Build a SIPP allocation step for a phase, or null if nothing fits.
 * Allocates up to the relevant limit given the marginal tax rate, computes the
 * 25% government top-up, higher-rate extra relief, and the projected pot.
 * @param {object} args
 * @param {number} args.maxBudget - Net budget available for this step.
 * @param {number} args.phaseYears - Years this phase runs.
 * @param {number} args.realReturnRate - Real return rate (decimal).
 * @param {number} args.taxRate - Marginal income tax rate now (decimal).
 * @param {number} args.sippNetLimit - Max net SIPP contribution allowed.
 * @param {function} args.projectPot - (annualContrib, years, r) => pot.
 * @param {function} args.fmtGBP - Currency formatter.
 * @param {function} args.fmtPct - Percentage formatter.
 * @returns {object|null} A SIPP step (with netAlloc) or null.
 */
export function buildSIPPStep({ maxBudget, phaseYears, realReturnRate, taxRate, sippNetLimit, projectPot, fmtGBP, fmtPct }) {
  if (maxBudget <= 0) return null;

  const fvFactorLocal = (phaseYears > 0 && realReturnRate !== 0)
    ? ((Math.pow(1 + realReturnRate, phaseYears) - 1) / realReturnRate) * (1 + realReturnRate)
    : phaseYears;
  const sippMaxForPALocal = Math.min((PA_FILLED_POT / fvFactorLocal) / 1.25, maxBudget);

  let sippAlloc;
  let sippReason;
  if (taxRate >= 0.40) {
    sippAlloc = Math.min(maxBudget, sippNetLimit);
    sippReason = taxRate >= 0.60
      ? `60% taper trap — SIPP saves 60% now, ~20% tax in retirement = permanent 40% saving per £1.`
      : `Higher-rate: ${fmtPct(taxRate)} relief now vs ~20% in retirement = permanent ${fmtPct(taxRate - 0.20)} saving.`;
  } else if (taxRate >= 0.20) {
    sippAlloc = Math.min(maxBudget, Math.max(0, sippMaxForPALocal), sippNetLimit);
    sippReason = sippMaxForPALocal < maxBudget
      ? `Basic-rate: SIPP top-up is best up to where retirement drawdown stays within your £12,570 PA (no tax). Beyond this, ISA avoids the 20% withdrawal tax.`
      : `Basic-rate: all SIPP drawdown stays within PA at retirement — the 25% govt top-up is pure profit.`;
  } else {
    sippAlloc = Math.min(maxBudget, Math.max(0, sippMaxForPALocal), sippNetLimit);
    sippReason = `The SIPP's 25% government top-up applies even at 0% tax. Keep drawdown within PA.`;
  }

  if (sippAlloc <= 0) return null;

  const sAlloc = Math.round(sippAlloc);
  const sGross = sAlloc * 1.25;
  const sExtra = taxRate > 0.20 ? sGross * (taxRate - 0.20) : 0;
  const sNet = sAlloc - sExtra;
  const sSaved = sAlloc - sNet;
  const sGovTopUp = sGross - sAlloc;
  const sPotEst = projectPot(sGross, phaseYears, realReturnRate);
  return {
    vehicle: 'SIPP (Private Pension)', icon: '🏦', color: '#8b5cf6', priority: 2,
    gross: sAlloc, netCost: sNet, saving: sSaved, govTopUp: sGovTopUp,
    outcome: `${fmtGBP(sAlloc)} net → ${fmtGBP(sGross)} invested (govt adds ${fmtGBP(sGovTopUp)}) → grows to ${fmtGBP(sPotEst, 0)} over ${phaseYears} yrs`,
    reason: sippReason,
    note: taxRate > 0.20 ? `Claim ${fmtGBP(sExtra, 0)}/yr back via Self Assessment.` : null,
    netAlloc: sAlloc,
  };
}

/**
 * Build an ISA allocation step for a phase, or null if nothing fits.
 * Capped at the £20,000 statutory annual subscription limit.
 * @param {object} args - maxBudget, phaseYears, realReturnRate, projectPot, fmtGBP.
 * @returns {object|null} An ISA step (with netAlloc) or null.
 */
export function buildISAStep({ maxBudget, phaseYears, realReturnRate, projectPot, fmtGBP }) {
  if (maxBudget <= 0) return null;

  const isaAlloc = Math.min(maxBudget, ISA_ANNUAL_LIMIT);
  const isaPotEst = projectPot(isaAlloc, phaseYears, realReturnRate);
  return {
    vehicle: 'Stocks & Shares ISA', icon: '💰', color: '#3b82f6', priority: 3,
    gross: isaAlloc, netCost: isaAlloc, saving: 0,
    outcome: `Grows tax-free to ${fmtGBP(isaPotEst, 0)} → ${fmtGBP(isaPotEst * 0.04, 0)}/yr income over ${phaseYears} yrs`,
    reason: 'Tax-free growth and withdrawals. No lock-in — accessible at any age. Great for bridging to pension age 57.',
    note: isaAlloc >= ISA_ANNUAL_LIMIT && maxBudget > ISA_ANNUAL_LIMIT
      ? `⚠️ ISA limit is £20,000/yr. The remaining ${fmtGBP(maxBudget - ISA_ANNUAL_LIMIT)} would need a GIA.`
      : null,
    netAlloc: isaAlloc,
  };
}

/**
 * Build a General Investment Account overflow step for any budget left after the
 * tax-advantaged wrappers are full.
 * @param {number} remaining - Budget left over.
 * @returns {object} A GIA step.
 */
export function buildGIAStep(remaining) {
  return {
    vehicle: 'General Investment Account', icon: '📊', color: '#94a3b8', priority: 4,
    gross: remaining, netCost: remaining, saving: 0,
    outcome: `Invest in a GIA — gains subject to CGT (£3,000 exempt). Dividends taxed above £1,000.`,
    reason: 'All tax-advantaged wrappers full. A GIA still grows wealth, just without a tax shelter.',
    note: null,
  };
}

/**
 * Apply the SIPP/ISA pair to a remaining budget in the order dictated by the
 * optimisation mode, pushing built steps onto `steps` and returning the budget
 * still unallocated. maxReturn fills SIPP first (tax efficiency); other modes
 * fill ISA first (accessible at any age).
 * @param {object} args
 * @param {Array} args.steps - Step array to push onto (mutated).
 * @param {number} args.remaining - Net budget available.
 * @param {string} args.optMode - 'maxReturn' | 'earliestFire' | 'targetRetirement'.
 * @param {function} args.makeSipp - (budget) => SIPP step or null.
 * @param {function} args.makeIsa - (budget) => ISA step or null.
 * @returns {number} Remaining budget after the two steps.
 */
export function allocateSippIsaInOrder({ steps, remaining, optMode, makeSipp, makeIsa }) {
  const order = optMode === 'maxReturn'
    ? [makeSipp, makeIsa]   // SIPP first: maximise long-run tax-advantaged pot
    : [makeIsa, makeSipp];  // ISA first: accessible at any age (FIRE / target age)
  for (const make of order) {
    const step = make(remaining);
    if (step) {
      steps.push(step);
      remaining -= step.netAlloc;
    }
  }
  return remaining;
}

export { ISA_ANNUAL_LIMIT, PA_FILLED_POT };
