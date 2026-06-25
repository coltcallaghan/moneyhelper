// ─────────────────────────────────────────────────────────────────────────────
// buildResults.js — core calculation ORCHESTRATION engine.
//
// Takes the user's form inputs and produces the full results object the UI
// renders (tax summary, per-mode action plans + phase allocations, pots,
// per-mode net worth, recommendations, mortgage/cash analysis). It composes the
// pure calculation modules (taxCalculations, pensionModelling) and the action-
// plan builders (MOD/civilian). Formatters (fmtGBP, fmtPct) are injected so this
// module stays free of React/UI coupling. Aside from those formatters it is
// deterministic: same inputs → same output. Assumes the 2025/26 tax year.
// ─────────────────────────────────────────────────────────────────────────────

import { parseTaxCode, getEffectivePA, calcIncomeTax, getMarginalTaxRate, calcNI, getMarginalNI } from './taxCalculations';
import { projectPot, calcMixScenarios, sippHigherRateRelief, reliefEligibleGross } from './pensionModelling';
import { buildMODActionPlan } from '../actionPlanMOD';
import { buildCivilianActionPlan } from '../actionPlanCivilian';

/**
 * Build the full results object from the user's inputs.
 * @param {object} form - All form fields plus injected `fmtGBP` and `fmtPct` formatters.
 * @returns {object} The results object consumed by the UI.
 */
export function buildResults({ salary, taxCode, age, yearsService, leaveAge, apCostPer100, apPaymentType, existingDbPension, existingIsaPot, existingSippPot, statePensionAge, statePension, contribution, retirementAge, returnRate, inflationRate, targetIncome, salSacrifice = 0, flatRateExpenses = 0, manualTaxablePay = 0, propertyValue = 0, mortgageBalance = 0, mortgageRate = 0, mortgageTermYears = 0, monthlyMortgage = 0, propertyAppRate = 0.02, cashReserve = 0, monthlyExpenses = 0, isServing = false, fmtGBP, fmtPct }) {
  const taxInfo  = parseTaxCode(taxCode);
  const years    = Math.max(0, retirementAge - age);

  // Build per-phase allocation breakdown for the chart
  // Each phase has: { startAge, endAge, ap, sippNet, sippGross, isa }
  let phaseAllocations = [];

  // If user provided payslip deductions, use adjusted salary for tax calc
  const hasDeductions = salSacrifice > 0 || flatRateExpenses > 0 || manualTaxablePay > 0;
  const adjustedSalary = manualTaxablePay > 0
    ? manualTaxablePay
    : salary - salSacrifice - flatRateExpenses;
  const niableSalary = salary - salSacrifice; // NI ignores flat-rate expenses
  const taxBasis = hasDeductions ? adjustedSalary : salary;
  const niBasis  = hasDeductions ? niableSalary : salary;

  const taxRate  = getMarginalTaxRate(taxBasis, taxInfo);
  const niRate   = getMarginalNI(niBasis);
  // SIPP limits (used by action plan builders)
  const sippGrossLimit = Math.min(60000, salary || 0);
  const sippNetLimit = Math.floor(sippGrossLimit / 1.25);
  // Real return rate: strip out inflation so all projections are in today's purchasing power
  const realReturnRate = (1 + returnRate) / (1 + inflationRate) - 1;
  const incomeTax     = calcIncomeTax(taxBasis, taxInfo);
  const ni            = calcNI(niBasis);
  // ── AFPS 15 Added Pension (compute parameters used by action plan) ───────
  const apTaxSaving = contribution * taxRate;
  const apNISaving = contribution * niRate;
  const apNetCost = contribution - apTaxSaving - apNISaving;

  let effectiveLeaveAge;
  let alreadyLeft = false;
  if (typeof leaveAge !== 'undefined' && leaveAge !== null && !isNaN(leaveAge) && leaveAge <= age) {
    // Explicitly marked as already left — reflect that state (no future contributions)
    alreadyLeft = true;
    effectiveLeaveAge = age;
  } else {
    // If a leaveAge is provided, ensure it is at least one year older than current age
    effectiveLeaveAge = Math.min(Math.max(leaveAge || retirementAge, age + 1), retirementAge);
  }
  const leaveYears = Math.max(0, effectiveLeaveAge - age);

  const AP_LIFETIME_MAX = 8571.21;
  const AP_MAX_MULTIPLES = AP_LIFETIME_MAX / 100;
  const PERIODIC_LOADING = 1.37;
  const estimatedCostPer100sp = Math.round(800 * Math.pow(1.042, (age || 30) - 20));
  const estimatedCostPer100ap = apPaymentType === 'periodic' ? Math.round(estimatedCostPer100sp * PERIODIC_LOADING) : estimatedCostPer100sp;
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
  const edpLumpSum = edpEligible ? totalPensionAcquired * 2.25 : 0;
  const edpIncome = edpEligible ? totalPensionAcquired * 0.34 : 0;
  const apPot = totalPensionAcquired * 25 + edpLumpSum;

  let addedPension;
  if (isServing) {
    addedPension = {
      id: 'addedpension', name: 'AFPS 15 Added Pension', icon: '🎖️', color: '#10b981',
      costToYou: alreadyLeft ? 0 : apNetCost,
      taxSaving: alreadyLeft ? 0 : apTaxSaving,
      niSaving: alreadyLeft ? 0 : apNISaving,
      potAtRetirement: apPot,
      annualIncomeAtRetirement: totalPensionAcquired,
      edpEligible, edpLumpSum, edpIncome, totalPensionAcquired, pensionPerYear, leaveYears,
      limitExceeded: apLimitExceeded,
      limitNote: alreadyLeft ? 'Already left — no further contributions' : (willHitCap ? `Career cap reached after ${yearsToHitCap} yrs` : null),
    };
  } else {
    addedPension = {
      id: 'addedpension', name: 'AFPS 15 Added Pension', icon: '🎖️', color: '#10b981',
      costToYou: 0, taxSaving: 0, niSaving: 0, potAtRetirement: 0, annualIncomeAtRetirement: 0,
      edpEligible: false, edpLumpSum: 0, edpIncome: 0, totalPensionAcquired: 0, pensionPerYear: 0, leaveYears: 0,
      limitExceeded: false, limitNote: 'Not available unless currently serving',
    };
  }
  // ── Action Plan: Compute all 3 modes at once ──
  const MODES = ['maxReturn', 'earliestFire', 'targetRetirement'];
  const modeData = {};

  for (const mode of MODES) {
    let ap;
    if (isServing && typeof leaveAge !== 'undefined' && typeof yearsService !== 'undefined' && leaveAge > age) {
      // MOD user (serving)
      ap = buildMODActionPlan({
        contribution, years, realReturnRate, taxRate, niRate, age, leaveAge, retirementAge,
        apPaymentType, apCostPer100, sippNetLimit, salary, fmtGBP, fmtPct, projectPot,
        addedPension, apMaxContrib, costPer100actual, AP_LIFETIME_MAX, alreadyLeft, yearsService, optMode: mode
      });
    } else {
      // Civilian or veteran
      ap = buildCivilianActionPlan({
        contribution, years, realReturnRate, taxRate, niRate, age, retirementAge,
        sippNetLimit, salary, fmtGBP, fmtPct, projectPot, alreadyLeft, optMode: mode
      });
    }

    // Build phaseAllocations for this mode
    let pa = [];
    if (ap && ap.phases) {
      let cumulativeYears = 0;
      pa = ap.phases.map(p => {
        const phaseStartAge = age + cumulativeYears;
        const phaseEndAge   = phaseStartAge + p.years;
        cumulativeYears    += p.years;
        return {
          startAge:  phaseStartAge,
          endAge:    phaseEndAge,
          ap:        p.steps.find(s => s.vehicle === 'AFPS 15 Added Pension')?.gross ?? 0,
          sippNet:   p.steps.find(s => s.vehicle === 'SIPP (Private Pension)')?.gross ?? 0,
          sippGross: (p.steps.find(s => s.vehicle === 'SIPP (Private Pension)')?.gross ?? 0) * 1.25,
          isa:       p.steps.find(s => s.vehicle === 'Stocks & Shares ISA')?.gross ?? 0
        };
      });
    }
    modeData[mode] = { actionPlan: ap, phaseAllocations: pa };
  }

  // Use maxReturn as the default for backward compat
  const actionPlan = modeData.maxReturn.actionPlan;
  phaseAllocations = modeData.maxReturn.phaseAllocations;

  // ── ISA calculation using actual phase allocations ───────────────────────
  const isaLimit = 20000;
  // Compute both a phase-based ISA pot (used by timeline) and an "all-in" ISA pot
  let isaPotPhase = parseFloat(existingIsaPot) || 0;
  if (phaseAllocations && phaseAllocations.length > 0) {
    let pot = isaPotPhase;
    for (const ph of phaseAllocations) {
      const phaseYears = Math.max(0, (ph.endAge || retirementAge) - (ph.startAge || age));
      if (ph.isa && ph.isa > 0 && phaseYears > 0) {
        pot = pot * Math.pow(1 + realReturnRate, phaseYears) + projectPot(ph.isa, phaseYears, realReturnRate);
      } else if (phaseYears > 0) {
        pot = pot * Math.pow(1 + realReturnRate, phaseYears);
      }
    }
    isaPotPhase = pot;
  } else {
    isaPotPhase = existingIsaPot > 0 ? (existingIsaPot * Math.pow(1 + realReturnRate, years)) : 0;
  }
  // For the comparison card, show the pot you'd get if you invested into an ISA.
  // Cap the annual subscription at the statutory £20,000 limit — anything above
  // would have to go into a GIA, so an "all-in ISA" comparison must not exceed it.
  const existingIsaGrowth = (existingIsaPot > 0 ? existingIsaPot * Math.pow(1 + realReturnRate, years) : 0);
  const isaPotAllIn = projectPot(Math.min(contribution, isaLimit), years, realReturnRate) + existingIsaGrowth;
  const isaIncome = isaPotAllIn * 0.04;
  const isa = {
    id: 'isa', name: 'Stocks & Shares ISA', icon: '💰', color: '#3b82f6',
    costToYou: contribution, taxSaving: 0, niSaving: 0,
    potAtRetirement: isaPotAllIn,
    annualIncomeAtRetirement: isaIncome,
    limitExceeded: contribution > isaLimit,
    _phasePot: isaPotPhase,
  };

  // Compute the phase-based ISA pot for an arbitrary mode's phase allocations.
  // Mirrors the isaPotPhase computation above so net worth can be made
  // mode-aware (the Action Plan, timeline and recommendation already react to
  // the optimisation toggle; net worth previously did not).
  const isaPhasePotForAllocs = (allocs) => {
    let pot = parseFloat(existingIsaPot) || 0;
    if (allocs && allocs.length > 0) {
      for (const ph of allocs) {
        const phaseYears = Math.max(0, (ph.endAge || retirementAge) - (ph.startAge || age));
        if (ph.isa && ph.isa > 0 && phaseYears > 0) {
          pot = pot * Math.pow(1 + realReturnRate, phaseYears) + projectPot(ph.isa, phaseYears, realReturnRate);
        } else if (phaseYears > 0) {
          pot = pot * Math.pow(1 + realReturnRate, phaseYears);
        }
      }
      return pot;
    }
    return existingIsaPot > 0 ? (existingIsaPot * Math.pow(1 + realReturnRate, years)) : 0;
  };

  // Phase-based SIPP pot for a mode's phase allocations — uses the GROSS SIPP
  // contribution per phase (net × 1.25 govt top-up) so the Retirement Picture
  // and Net Worth derive SIPP from the SAME allocation the Action Plan shows,
  // rather than assuming the whole contribution goes into a SIPP.
  const sippPhasePotForAllocs = (allocs) => {
    let pot = parseFloat(existingSippPot) || 0;
    if (allocs && allocs.length > 0) {
      for (const ph of allocs) {
        const phaseYears = Math.max(0, (ph.endAge || retirementAge) - (ph.startAge || age));
        if (ph.sippGross && ph.sippGross > 0 && phaseYears > 0) {
          pot = pot * Math.pow(1 + realReturnRate, phaseYears) + projectPot(ph.sippGross, phaseYears, realReturnRate);
        } else if (phaseYears > 0) {
          pot = pot * Math.pow(1 + realReturnRate, phaseYears);
        }
      }
      return pot;
    }
    return existingSippPot > 0 ? (existingSippPot * Math.pow(1 + realReturnRate, years)) : 0;
  };

  // Phase-based Added Pension annual pension actually BOUGHT by a mode's plan.
  // Uses the AP gross allocation per phase (ph.ap) against the cost-per-£100
  // factor, accumulated over the years served in that phase, capped at the
  // AFPS-15 lifetime maximum. If the allocation engine bought no AP (e.g. early
  // retirement before SPA), this is 0 — so the Retirement Picture / Net Worth /
  // comparison no longer show AP income the plan never told the user to buy.
  // costPer100actual / AP_LIFETIME_MAX are defined above in this scope.
  const apPensionForAllocs = (allocs) => {
    if (!isServing || !allocs || allocs.length === 0 || costPer100actual <= 0) return 0;
    let pension = 0;
    for (const ph of allocs) {
      const phaseYears = Math.max(0, (ph.endAge || retirementAge) - (ph.startAge || age));
      if (ph.ap && ph.ap > 0 && phaseYears > 0) {
        // Each year the AP gross buys (ap / costPer100) × £100 of annual pension.
        pension += (ph.ap / costPer100actual) * 100 * phaseYears;
      }
    }
    return Math.min(pension, AP_LIFETIME_MAX);
  };

  // ── SIPP calculation ───────────────────────────────────────────────────
  const sippGovTopUp = contribution * (20 / 80);
  const sippGross = contribution + sippGovTopUp;
  // Higher-rate extra relief is band-aware (only the gross sitting in the
  // higher/additional band) and limited to relief-eligible gross (HMRC caps
  // relief at 100% of earnings or £3,600). For typical cases where the gross is
  // within earnings and fully in the top band this equals the old figure.
  const reliefGross = reliefEligibleGross(sippGross, salary);
  const sippExtraRelief = sippHigherRateRelief(reliefGross, taxRate, salary);
  const sippNetCost = contribution - sippExtraRelief;
  const existingSippGrowth = (existingSippPot > 0 ? existingSippPot * Math.pow(1 + realReturnRate, years) : 0);
  const sippPot = projectPot(sippGross, years, realReturnRate) + existingSippGrowth;
  const sippTaxFreeLump = sippPot * 0.25;
  const sippAnnualDrawdown = sippPot * 0.75 * 0.04;
  const sipp = {
    id: 'sipp', name: 'SIPP (Private Pension)', icon: '🏦', color: '#8b5cf6',
    costToYou: sippNetCost, taxSaving: sippGovTopUp + sippExtraRelief, niSaving: 0,
    potAtRetirement: sippPot,
    annualIncomeAtRetirement: sippAnnualDrawdown,
    taxFreeLump: sippTaxFreeLump,
    limitExceeded: contribution > sippNetLimit,
  };

  // ── Rank by efficiency ─────────────────────────────────────────────────────
  // Efficiency = pot value per £1 of personal net cost (tax/NI savings already
  // reflected in the lower costToYou, so we don't add them to the numerator).
  // Exclude MOD-only option for civilians
  const baseOptions = [isa, sipp];
  const optionsList = isServing ? [...baseOptions, addedPension] : baseOptions;

  const options = optionsList.map(o => ({
    ...o,
    efficiency: o.costToYou > 0 ? o.potAtRetirement / o.costToYou : 1,
  }));
  options.sort((a, b) => b.efficiency - a.efficiency);
  options.forEach((o, i) => (o.rank = i + 1));
  const maxEfficiency = options[0].efficiency;

  // Build user-facing pros/cons/highlights for each option
  options.forEach(o => {
    if (!Array.isArray(o.highlights)) o.highlights = [];
    if (typeof o.incomeBreakdown === 'undefined') o.incomeBreakdown = null;

    if (o.id === 'sipp') {
      o.pros = o.pros || 'Generous tax relief and government top-up — great for long-term growth.';
      o.cons = o.cons || 'Locked until 57; withdrawals above PA are taxable.';
      o.highlights = o.highlights.length ? o.highlights : [
        `Govt top-up: ${fmtGBP(o.taxSaving || 0)}`,
        `Tax relief now: ${fmtPct(taxRate)}`,
      ];
      o.incomeBreakdown = o.incomeBreakdown || [
        { label: 'Tax-free lump (25%)', value: fmtGBP(o.taxFreeLump || 0) },
        { label: 'Annual drawdown (est)', value: fmtGBP(o.annualIncomeAtRetirement || 0) },
      ];
    } else if (o.id === 'isa') {
      o.pros = o.pros || 'Tax-free growth and flexible access — ideal for medium-term goals.';
      o.cons = o.cons || 'No upfront tax relief; annual allowance applies.';
      o.highlights = o.highlights.length ? o.highlights : [
        `Tax-free withdrawals`,
        `Annual allowance: £20,000`,
      ];
      o.incomeBreakdown = o.incomeBreakdown || [
        { label: 'Annual drawdown (est)', value: fmtGBP(o.annualIncomeAtRetirement || 0) },
      ];
    } else if (o.id === 'addedpension') {
      if (isServing) {
        o.pros = o.pros || 'Very high efficiency for serving personnel — guaranteed CPI-linked pension for life.';
        o.cons = o.cons || 'Career cap applies; contributions may be limited.';
        o.highlights = o.highlights.length ? o.highlights : [
          `Guaranteed CPI-linked pension`,
          o.limitExceeded ? 'Career cap: may be reached' : 'No cap hit expected',
        ];
        o.incomeBreakdown = o.incomeBreakdown || [
          { label: 'Annual AFPS pension', value: fmtGBP(o.annualIncomeAtRetirement || 0) },
          ...(o.edpEligible ? [{ label: 'EDP lump (one-off)', value: fmtGBP(o.edpLumpSum || 0) }] : []),
        ];
      } else {
        o.pros = o.pros || 'Not available unless currently serving.';
        o.cons = o.cons || 'Only applies to active MOD service members.';
        o.highlights = [];
        o.incomeBreakdown = null;
      }
    } else {
      if (typeof o.pros === 'undefined') o.pros = '';
      if (typeof o.cons === 'undefined') o.cons = '';
    }
  });

  // ── Recommendation ──────────────────────────────────────────────────────────
  // Choose best option. If early retirement is a goal (retirementAge < SPA or < SIPP unlock),
  // prefer the option that produces the highest immediate income at target retirement age
  // (this tends to minimise FIRE age). Otherwise fall back to efficiency ranking.
  const retireAge = retirementAge || 60;
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

  // ── Max Return Best: pick option with highest accessible income from its unlock age ──
  const maxReturnBest = options.reduce((b, o) => (o.earlyInc > (b.earlyInc || 0) ? o : b), options[0]);
  let maxReturnReason = '';
  if (maxReturnBest.id === 'addedpension') {
    maxReturnReason = `Added Pension provides ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr from age ${statePensionAge} — a guaranteed, CPI-linked income stream for life. With a ${fmtGBP(contribution)} annual contribution, you get maximum security and lifelong indexation.`;
  } else if (maxReturnBest.id === 'sipp') {
    maxReturnReason = `SIPP gives you ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr from age 57 onwards — the highest accessible income you can build with your current contributions. Flexible drawdown means you control your income.`;
  } else {
    maxReturnReason = `ISA provides ${fmtGBP(maxReturnBest.annualIncomeAtRetirement, 0)}/yr immediately accessible — the maximum you can withdraw tax-free at any age. Perfect for having money available when you need it.`;
  }

  // ── Earliest FIRE: find which option lets you hit targetIncome at youngest age ──
  const fireTarget = (targetIncome && targetIncome > 0) ? targetIncome : 0;
  let earliestFireBest = options[0];
  let earliestFireAge = Infinity;

  if (fireTarget > 0) {
    options.forEach(o => {
      let age_at_target = Infinity;
      if (o.id === 'isa') {
        // ISA: accessible at any age, simple 4% calculation
        const existing = existingIsaPot || 0;
        const fvFactor = (years > 0 && realReturnRate !== 0)
          ? ((Math.pow(1 + realReturnRate, years) - 1) / realReturnRate) * (1 + realReturnRate)
          : years;
        for (let yr = 1; yr <= 80; yr++) {
          const pot = existing * Math.pow(1 + realReturnRate, yr) + contribution * fvFactor / (years > 0 ? years : 1) * yr;
          if (pot * 0.04 >= fireTarget) { age_at_target = age + yr; break; }
        }
      } else if (o.id === 'sipp') {
        // SIPP: accessible from 57, then 4% of drawdown pot minus tax (assumes ~20% tax in retirement)
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
        // AP: accessible from SPA, fixed pension + potential drawdown
        if (statePensionAge > age) {
          const yrs_to_spa = statePensionAge - age;
          const apInc = o.annualIncomeAtRetirement || 0;
          // For AP scenario, also count the ISA pot from contribution
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

  const mixData = calcMixScenarios(contribution, years, realReturnRate, taxRate);

  // ── Action Plan: phased allocation of your budget ──────────────────────────
  // Phase 1: while still serving (AP + SIPP + ISA)
  // Phase 2: after leaving MOD (SIPP + ISA only — AP budget redirected)
  // If already left or leaveAge <= age, there's only one phase (no AP).
  // If leaveAge >= retirementAge, there's also only one phase (serving throughout).

  // Action plan logic moved to separate modules (MOD vs Civilian)

  // Net worth at retirement
  // Prefer the phase-based ISA pot (matches the Action Plan) when phase allocations exist;
  // otherwise fall back to the "all-in" ISA pot used for comparison.
  const isaOptPot   = (isa && Object.prototype.hasOwnProperty.call(isa, '_phasePot') && phaseAllocations && phaseAllocations.length > 0)
    ? isa._phasePot
    : isa.potAtRetirement;
  const sippOptPot  = sipp.potAtRetirement;
  const apOptPot    = addedPension.potAtRetirement;
  const cashAtRetirement = cashReserve; // kept at nominal (inflation erodes it)
  // FIRE number (4% rule) if user provided a target income
  const fireNumber = (targetIncome && targetIncome > 0) ? targetIncome * 25 : 0;

  // ── Target Retirement Best: prioritise accessible income at target retirement age ──
  // This alternative recommendation focuses on hitting your target income at your target
  // retirement age, rather than maximising overall pot efficiency.
  const targetBest = options.reduce((b, o) => o.earlyInc > (b.earlyInc || 0) ? o : b, options[0]);
  let targetRecReason = '';
  if (targetBest.id === 'addedpension') {
    if (retireAge >= statePensionAge) {
      targetRecReason = `For your retirement goal, Added Pension provides ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr from age ${statePensionAge} — a guaranteed, CPI-linked income stream for life.`;
    } else {
      targetRecReason = `Added Pension locks until ${statePensionAge}, so it won't help reach your target at age ${retireAge}. Consider ISA or SIPP for immediate retirement access.`;
    }
  } else if (targetBest.id === 'sipp') {
    if (retireAge >= 57) {
      targetRecReason = `With SIPP, you'd have ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr accessible from age 57 — matching your ${retireAge} retirement target with flexible, tax-efficient drawdown.`;
    } else {
      targetRecReason = `SIPP unlocks at 57, which is after your target retirement age (${retireAge}). Prioritise ISA for earlier access.`;
    }
  } else if (targetBest.id === 'isa') {
    targetRecReason = `ISA provides the highest accessible income at age ${retireAge} — ${fmtGBP(targetBest.annualIncomeAtRetirement, 0)}/yr. Fully flexible, tax-free, and withdrawable at any age.`;
  }

  // Tax summary helpers
  const effectivePA = getEffectivePA(taxBasis, taxInfo.pa);
  const effTaxRate = (salary > 0) ? ((incomeTax + ni) / salary) : 0;
  const takeHome = salary - incomeTax - ni - salSacrifice - flatRateExpenses;

  // Cash / emergency analysis
  const hasCash = (cashReserve > 0 || monthlyExpenses > 0);
  const emergencyTarget = monthlyExpenses * 6;
  const emergencyShortfall = Math.max(0, emergencyTarget - cashReserve);
  const emergencyOk = cashReserve >= emergencyTarget;

  // Simple mortgage summary (used for equity and a basic overpay/invest verdict)
  const equityNow = propertyValue - mortgageBalance;
  const yearsUntilRetirement = Math.max(0, retirementAge - age);
  const yearsToRepayBeforeRetire = Math.min(mortgageTermYears, yearsUntilRetirement);
  // Compute an effective monthly payment if none provided, using amortisation formula
  const monthlyRate = mortgageRate; // mortgageRate is already a decimal (e.g., 0.045 for 4.5%)
  const monthsTotal = mortgageTermYears * 12;
  const computedMonthly = (monthlyMortgage > 0)
    ? monthlyMortgage
    : (mortgageBalance > 0 && monthsTotal > 0
      ? (monthlyRate > 0
          ? (mortgageBalance * (monthlyRate / 12)) / (1 - Math.pow(1 + (monthlyRate / 12), -monthsTotal))
          : mortgageBalance / monthsTotal)
      : 0);

  // Remaining balance at retirement: amortisation formula for k payments
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
  // Grow property value to retirement using the house appreciation rate
  const propertyValueAtRetire = propertyValue > 0 ? Math.round(propertyValue * Math.pow(1 + propertyAppRate, yearsUntilRetirement)) : 0;
  const equityRetirement = propertyValueAtRetire - remainingBalanceAtRetire;
  const shouldOverpay = mortgageRate > 0.05 && mortgageBalance > 0;
  const mortgageVerdict = shouldOverpay
    ? 'High mortgage rate — consider overpaying the mortgage if you have excess cash.'
    : 'Low mortgage rate — consider investing excess cash for potentially higher returns.';

  // Estimate total interest over remaining term (payments - principal)
  const totalInterestEst = (computedMonthly > 0 && monthsTotal > 0)
    ? Math.max(0, (computedMonthly * monthsTotal) - mortgageBalance)
    : 0;

  // Estimate mortgage paid-off age (using monthsTotal)
  const mortgagePaidOffAge = (monthsTotal > 0 && mortgageBalance > 0)
    ? age + Math.ceil(monthsTotal / 12)
    : null;
  const mortgageAnalysis = {
    propertyValue, mortgageBalance, mortgageRate, mortgageTermYears, monthlyMortgage,
    equityNow, equityRetirement, shouldOverpay, verdict: mortgageVerdict,
    totalInterestEst, mortgagePaidOffAge
  };
  const propertyEquityAtRetirement = mortgageAnalysis ? mortgageAnalysis.equityRetirement : propertyValueAtRetire;
  const liquidWealth  = isaOptPot + sippOptPot;
  const dbOptPot = existingDbPension * 25;
  // Include the commuted DB pension in net worth — it is a capital-equivalent
  // asset shown as its own row, and the AP commuted value is already counted, so
  // omitting DB made the displayed rows not sum to the total.
  const totalNetWorth = liquidWealth + apOptPot + dbOptPot + propertyEquityAtRetirement + cashAtRetirement;

  // Per-mode net worth and phase pots. Both ISA and SIPP vary by optimisation
  // mode (their phase allocations differ); AP/property/cash/DB are
  // mode-independent. Deriving SIPP from the phase allocation makes the Net
  // Worth card AND the Retirement Picture card use the SAME split the Action
  // Plan shows, instead of assuming the whole contribution goes into a SIPP.
  // For maxReturn the phase-based SIPP equals the full-contribution sippOptPot
  // (verified), so maxReturn output is unchanged.
  for (const mode of MODES) {
    const modeIsaOptPot  = isaPhasePotForAllocs(modeData[mode].phaseAllocations);
    const modeSippOptPot = sippPhasePotForAllocs(modeData[mode].phaseAllocations);
    // Added Pension actually bought by THIS mode's plan (0 if the engine skipped
    // AP, e.g. early retirement). Income, EDP lump and capital-equivalent pot all
    // scale from it so the cards never show AP the plan didn't allocate.
    const modeApPension = apPensionForAllocs(modeData[mode].phaseAllocations);
    const modeEdpLump   = edpEligible ? modeApPension * 2.25 : 0;
    const modeEdpIncome = edpEligible ? modeApPension * 0.34 : 0;
    const modeApOptPot  = modeApPension * 25 + modeEdpLump;
    const modeLiquid = modeIsaOptPot + modeSippOptPot;
    // Phase pots the Retirement Picture card consumes for income (4% SWR etc.)
    modeData[mode].isaPhasePot   = modeIsaOptPot;
    modeData[mode].sippPhasePot  = modeSippOptPot;
    modeData[mode].apPhasePension = modeApPension;
    modeData[mode].apPhaseEdpLump = modeEdpLump;
    modeData[mode].apPhaseEdpIncome = modeEdpIncome;
    modeData[mode].netWorth = {
      isaOptPot: modeIsaOptPot,
      sippOptPot: modeSippOptPot,
      apOptPot: modeApOptPot, cashAtRetirement, propertyEquityAtRetirement, dbOptPot,
      liquidWealth: modeLiquid,
      totalNetWorth: modeLiquid + modeApOptPot + dbOptPot + propertyEquityAtRetirement + cashAtRetirement,
    };
  }

  return {
    options, maxEfficiency, fireNumber, years, retirementAge, mixData, existingDbPension, statePensionAge, statePension,
    inflationRate, realReturnRate, returnRate, actionPlan, phaseAllocations, contribution, salary, leaveYears: leaveYears,
    recommendation: { maxReturnBest, maxReturnReason, earliestFireBest, earliestFireReason, targetBest, targetReason: targetRecReason },
    taxSummary: { incomeTax, ni, takeHome, effectiveTaxRate: effTaxRate, marginalRate: taxRate, niRate, effectivePA, taxInfo, adjustedSalary: taxBasis, niableSalary: niBasis, salSacrifice, flatRateExpenses, hasDeductions },
    mortgageAnalysis,
    cashAnalysis: hasCash ? { cashReserve, monthlyExpenses, emergencyTarget, emergencyShortfall, emergencyOk } : null,
    netWorth: { isaOptPot, sippOptPot, apOptPot, cashAtRetirement, propertyEquityAtRetirement, liquidWealth, totalNetWorth, dbOptPot },
    sippNetLimit, apMaxContrib,
    modes: modeData,  // { maxReturn: {actionPlan, phaseAllocations}, earliestFire: {...}, targetRetirement: {...} }
  };
}
