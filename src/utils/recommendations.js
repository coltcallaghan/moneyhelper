// ─────────────────────────────────────────────────────────────────────────────
// recommendations.js — PURE recommendation logic for the three optimisation
// modes (Max Return, Earliest FIRE, Target Age). Extracted from buildResults so
// the (lengthy) reason-string and earliest-FIRE-search logic can be tested and
// read in isolation. No React, no DOM. Assumes 2025/26 access ages (SIPP 57).
// ─────────────────────────────────────────────────────────────────────────────

import { calcIncomeTax } from './taxCalculations';

/**
 * Build the per-mode "best vehicle" recommendations and their explanatory
 * reasons. Annotates each option with `earlyInc` (accessible income from its
 * unlock age) and `fireAge` (age it would reach the FIRE target), matching the
 * original in-place behaviour.
 *
 * @param {object} a
 * @param {Array} a.options - Ranked option objects (isa/sipp/addedpension).
 * @param {number} a.retirementAge - Target retirement age.
 * @param {number} a.statePensionAge - State Pension Age.
 * @param {number} a.age - Current age.
 * @param {number} a.years - Years to retirement.
 * @param {number} a.realReturnRate - Real return rate (decimal).
 * @param {number} a.contribution - Annual contribution.
 * @param {number} a.targetIncome - Desired retirement income (FIRE target).
 * @param {number} a.existingIsaPot - Existing ISA value.
 * @param {number} a.existingSippPot - Existing SIPP value.
 * @param {function} a.fmtGBP - Currency formatter.
 * @returns {{maxReturnBest, maxReturnReason, earliestFireBest, earliestFireReason, targetBest, targetReason}}
 */
export function buildRecommendation({
  options, retirementAge, statePensionAge, age, years, realReturnRate,
  contribution, targetIncome, existingIsaPot, existingSippPot, fmtGBP,
}) {
  const retireAge = retirementAge || 60;

  // Accessible income from each vehicle's unlock age.
  options.forEach(o => {
    if (o.id === 'isa') {
      o.earlyInc = (o.potAtRetirement || 0) * 0.04;
    } else if (o.id === 'sipp') {
      o.earlyInc = (retireAge >= 57) ? (o.annualIncomeAtRetirement || 0) : 0;
    } else if (o.id === 'addedpension') {
      o.earlyInc = (retireAge >= statePensionAge) ? (o.annualIncomeAtRetirement || 0) : 0;
    } else {
      o.earlyInc = 0;
    }
  });

  // ── Max Return: highest accessible income from its unlock age ──
  const maxReturnBest = options.reduce((b, o) => (o.earlyInc > (b.earlyInc || 0) ? o : b), options[0]);
  let maxReturnReason = '';
  if (maxReturnBest.id === 'addedpension') {
    maxReturnReason = `Added Pension provides ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr from age ${statePensionAge} — a guaranteed, CPI-linked income stream for life. With a ${fmtGBP(contribution)} annual contribution, you get maximum security and lifelong indexation.`;
  } else if (maxReturnBest.id === 'sipp') {
    maxReturnReason = `SIPP gives you ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr from age 57 onwards — the highest accessible income you can build with your current contributions. Flexible drawdown means you control your income.`;
  } else {
    maxReturnReason = `ISA provides ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr immediately accessible — the maximum you can withdraw tax-free at any age. Perfect for having money available when you need it.`;
  }

  // ── Earliest FIRE: which option reaches targetIncome at the youngest age ──
  const fireTarget = (targetIncome && targetIncome > 0) ? targetIncome : 0;
  let earliestFireBest = options[0];
  let earliestFireAge = Infinity;

  if (fireTarget > 0) {
    options.forEach(o => {
      let age_at_target = Infinity;
      if (o.id === 'isa') {
        const existing = existingIsaPot || 0;
        const fvFactor = (years > 0 && realReturnRate !== 0)
          ? ((Math.pow(1 + realReturnRate, years) - 1) / realReturnRate) * (1 + realReturnRate)
          : years;
        for (let yr = 1; yr <= 80; yr++) {
          const pot = existing * Math.pow(1 + realReturnRate, yr) + contribution * fvFactor / (years > 0 ? years : 1) * yr;
          if (pot * 0.04 >= fireTarget) { age_at_target = age + yr; break; }
        }
      } else if (o.id === 'sipp') {
        if (57 > age) {
          const yrs_to_57 = 57 - age;
          const existing = existingSippPot || 0;
          const sippGross = contribution * 1.25;
          for (let yr = yrs_to_57; yr <= 80; yr++) {
            const pot = existing * Math.pow(1 + realReturnRate, yr) + sippGross * ((Math.pow(1 + realReturnRate, Math.max(0, yr - 1)) - 1) / realReturnRate);
            const drawdown = pot * 0.75 * 0.04;
            const taxOnDraw = calcIncomeTax(drawdown, { pa: 12570, mode: 'normal' });
            const netInc = Math.max(0, drawdown - taxOnDraw);
            if (netInc >= fireTarget) { age_at_target = age + yr; break; }
          }
        }
      } else if (o.id === 'addedpension') {
        if (statePensionAge > age) {
          const yrs_to_spa = statePensionAge - age;
          const apInc = o.annualIncomeAtRetirement || 0;
          const isaGross = contribution * 0.75; // rough split
          for (let yr = yrs_to_spa; yr <= 80; yr++) {
            const isaPot = isaGross * ((Math.pow(1 + realReturnRate, yr) - 1) / realReturnRate);
            const isaInc = isaPot * 0.04;
            if (apInc + isaInc >= fireTarget) { age_at_target = statePensionAge; break; }
          }
        }
      }
      o.fireAge = age_at_target;
      if (age_at_target < earliestFireAge) {
        earliestFireAge = age_at_target;
        earliestFireBest = o;
      }
    });
  }
  let earliestFireReason = '';
  if (fireTarget <= 0) {
    earliestFireReason = `No target income set. This mode compares which vehicle reaches your FIRE goal at the earliest age.`;
  } else if (earliestFireAge === Infinity) {
    earliestFireReason = `With current contributions, none of the vehicles reach your £${fireTarget.toLocaleString()}/yr target income. Increase contributions or lower your retirement target.`;
  } else {
    const veh = earliestFireBest.id === 'isa' ? 'ISA' : (earliestFireBest.id === 'sipp' ? 'SIPP' : 'Added Pension');
    earliestFireReason = `${veh} lets you reach your £${fireTarget.toLocaleString()}/yr target income by age ${Math.floor(earliestFireAge)} — the earliest possible retirement with your current contributions.`;
  }

  // ── Target Age: prioritise accessible income at the target retirement age ──
  const targetBest = options.reduce((b, o) => o.earlyInc > (b.earlyInc || 0) ? o : b, options[0]);
  let targetReason = '';
  if (targetBest.id === 'addedpension') {
    targetReason = retireAge >= statePensionAge
      ? `For your retirement goal, Added Pension provides ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr from age ${statePensionAge} — a guaranteed, CPI-linked income stream for life.`
      : `Added Pension locks until ${statePensionAge}, so it won't help reach your target at age ${retireAge}. Consider ISA or SIPP for immediate retirement access.`;
  } else if (targetBest.id === 'sipp') {
    targetReason = retireAge >= 57
      ? `With SIPP, you'd have ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr accessible from age 57 — matching your ${retireAge} retirement target with flexible, tax-efficient drawdown.`
      : `SIPP unlocks at 57, which is after your target retirement age (${retireAge}). Prioritise ISA for earlier access.`;
  } else if (targetBest.id === 'isa') {
    targetReason = `ISA provides the highest accessible income at age ${retireAge} — ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr. Fully flexible, tax-free, and withdrawable at any age.`;
  }

  return { maxReturnBest, maxReturnReason, earliestFireBest, earliestFireReason, targetBest, targetReason };
}
