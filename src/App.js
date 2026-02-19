import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { buildMODActionPlan } from './actionPlanMOD';
import { buildCivilianActionPlan } from './actionPlanCivilian';

// ── Info Hint popup ───────────────────────────────────────────────────────
function InfoHint({ children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span className="info-hint-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`info-hint-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="More information"
        aria-expanded={open}
      >
        i
      </button>
      {open && (
        <div className="info-hint-popup" role="dialog">
          <div className="info-hint-popup-header">
            <span className="info-hint-popup-title">Info</span>
            <button type="button" className="info-hint-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="info-hint-popup-body">{children}</div>
        </div>
      )}
    </span>
  );
}

// Utility: Generate a short summary for a calculation (for display in saved list)
function getCalcSummary(form, results) {
  if (!form || !results) return 'Incomplete calculation';
  return `${form.age || '?'}y, £${form.salary || '?'} salary, £${form.contribution || '?'} invest, retire @${form.retirementAge || '?'} — Net Worth: ${results.netWorth ? fmtGBP(results.netWorth.totalNetWorth, 0) : '?'}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAX CODE PARSING
// Determines your personal allowance from HMRC tax code.
// Common codes: 1257L (standard), BR (flat 20%), D0 (40%), D1 (45%),
//               NT (no tax), 0T (no PA), K[n] (negative PA),
//               S prefix (Scottish), C prefix (Welsh)
// ─────────────────────────────────────────────────────────────────────────────
function parseTaxCode(code) {
  if (!code || !code.trim()) {
    return { pa: 12570, mode: 'normal', note: 'Standard 1257L — personal allowance £12,570' };
  }
  const upper = code.toUpperCase().trim().replace(/\s/g, '');
  const cleaned = upper.replace(/(W1|M1|X)$/, ''); // strip emergency suffixes

  if (cleaned === 'BR') return { pa: 0,     mode: 'flat', flatRate: 0.20, note: 'All income taxed at 20% — no personal allowance' };
  if (cleaned === 'D0') return { pa: 0,     mode: 'flat', flatRate: 0.40, note: 'All income taxed at higher rate (40%)' };
  if (cleaned === 'D1') return { pa: 0,     mode: 'flat', flatRate: 0.45, note: 'All income taxed at additional rate (45%)' };
  if (cleaned === 'NT') return { pa: 99999, mode: 'nt',   note: 'NT — no tax deducted' };
  if (cleaned === '0T') return { pa: 0,     mode: 'normal', note: '0T — no personal allowance this year' };

  // K codes: negative allowance (e.g. company benefits, underpaid tax)
  const kMatch = cleaned.match(/^[SC]?K(\d+)$/);
  if (kMatch) {
    const extra = parseInt(kMatch[1]) * 10;
    return { pa: -extra, mode: 'k', note: `K code — adds £${extra.toLocaleString()} of extra taxable income (reduces your allowance)` };
  }

  let working = cleaned;
  let scottish = false;
  if (working.startsWith('S')) { scottish = true; working = working.slice(1); }
  else if (working.startsWith('C')) { working = working.slice(1); }

  // Standard: e.g. 1257L, 1100M, 810T
  const stdMatch = working.match(/^(\d+)[A-Z]?$/);
  if (stdMatch) {
    const pa = parseInt(stdMatch[1]) * 10;
    return {
      pa, mode: 'normal', scottish,
      note: `Personal allowance: £${pa.toLocaleString()}${scottish ? ' (Scottish taxpayer — income tax bands differ slightly)' : ''}`,
    };
  }
  return { pa: 12570, mode: 'normal', note: 'Unrecognised code — using standard £12,570 allowance' };
}

// ─────────────────────────────────────────────────────────────────────────────
// INCOME TAX  (England/Wales 2025/26)
// Key: The personal allowance TAPERS between £100k–£125,140, creating a
// hidden 60% effective marginal rate in that band.
// ─────────────────────────────────────────────────────────────────────────────
function getEffectivePA(gross, basePa) {
  if (gross <= 100000 || basePa <= 0) return basePa;
  const reduction = Math.min(basePa, Math.floor((gross - 100000) / 2));
  return Math.max(0, basePa - reduction);
}

function calcIncomeTax(gross, taxInfo) {
  if (taxInfo.mode === 'nt')   return 0;
  if (taxInfo.mode === 'flat') return Math.max(0, gross * taxInfo.flatRate);
  const pa       = getEffectivePA(gross, taxInfo.pa);
  const taxable  = Math.max(0, gross - pa);
  const basic    = Math.max(0, 50270  - Math.max(0, pa));
  const higher   = Math.max(0, 125140 - Math.max(0, pa));
  let tax = 0;
  if (taxable > 0)       tax += Math.min(taxable, basic) * 0.20;
  if (taxable > basic)   tax += (Math.min(taxable, higher) - basic) * 0.40;
  if (taxable > higher)  tax += (taxable - higher) * 0.45;
  return Math.max(0, tax);
}

// Marginal rate — includes the 60% taper trap at £100k–£125,140
function getMarginalTaxRate(gross, taxInfo) {
  if (!taxInfo || taxInfo.mode === 'nt')   return 0;
  if (taxInfo.mode === 'flat') return taxInfo.flatRate;
  const pa = getEffectivePA(gross, taxInfo.pa);
  if (gross <= pa)       return 0;
  if (gross <= 50270)    return 0.20;
  if (gross <= 100000)   return 0.40;
  if (gross <= 125140)   return 0.60; // 40% + 20% on lost PA = effective 60%
  return 0.45;
}

function calcNI(salary) {
  if (salary <= 12570) return 0;
  return Math.min(salary - 12570, 50270 - 12570) * 0.08 + Math.max(0, salary - 50270) * 0.02;
}

function getMarginalNI(salary) {
  if (salary <= 12570) return 0;
  if (salary <= 50270) return 0.08;
  return 0.02;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOUND GROWTH  (inspired by FIRE repo)
// FV of annual contributions: C × [(1+r)^n − 1] / r × (1+r)
// ─────────────────────────────────────────────────────────────────────────────
function projectPot(annualContrib, years, r) {
  if (years <= 0) return annualContrib;
  if (r === 0)    return annualContrib * years;
  return annualContrib * ((Math.pow(1 + r, years) - 1) / r) * (1 + r);
}

const fmtGBP = (n, dec = 0) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: dec }).format(n);
const fmtPct = (n, dec = 0) => `${(n * 100).toFixed(dec)}%`;

// ─────────────────────────────────────────────────────────────────────────────
// ISA / SIPP MIX ANALYSIS
// Tries 5 splits and finds the optimal blend for net income at retirement.
// Key insight: SIPP income in retirement is taxable (above PA); ISA is tax-free.
// ─────────────────────────────────────────────────────────────────────────────
function calcMixScenarios(contribution, years, returnRate, taxRate) {
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
    const isaContrib   = contribution * isa;
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
      totalNetIncome, incomePerPound,
    };
  });

  const bestIdx = scenarios.reduce(
    (b, s, i) => s.incomePerPound > scenarios[b].incomePerPound ? i : b, 0
  );

  // "Sweet spot": max SIPP where retirement drawdown stays within personal allowance (no tax)
  // sippPot * 0.75 * 0.04 = 12570 → sippPot = 419,000
  const paFilledPot  = 12570 / (0.75 * 0.04);
  const fvFactor     = years > 0 ? ((Math.pow(1 + returnRate, years) - 1) / returnRate) * (1 + returnRate) : 1;
  const sippMaxForPA = Math.min((paFilledPot / fvFactor) / 1.25, contribution); // net equiv

  return { scenarios, bestIdx, sippMaxForPA };
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildResults({ salary, taxCode, age, yearsService, leaveAge, apCostPer100, apPaymentType, existingDbPension, existingIsaPot, existingSippPot, statePensionAge, statePension, contribution, retirementAge, returnRate, inflationRate, targetIncome, salSacrifice = 0, flatRateExpenses = 0, manualTaxablePay = 0, propertyValue = 0, mortgageBalance = 0, mortgageRate = 0, mortgageTermYears = 0, monthlyMortgage = 0, cashReserve = 0, monthlyExpenses = 0, isServing = false }) {
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

  const effectiveLeaveAge = Math.min(Math.max(leaveAge || retirementAge, age), retirementAge);
  const leaveYears = Math.max(0, effectiveLeaveAge - age);
  const alreadyLeft = (typeof leaveAge !== 'undefined' && leaveAge <= age) || false;

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
  // ── Action Plan: Use separate logic for MOD and civilian users ──
  let actionPlan;
  if (isServing && typeof leaveAge !== 'undefined' && typeof yearsService !== 'undefined' && leaveAge > age) {
    // MOD user (serving)
    actionPlan = buildMODActionPlan({
      contribution, years, realReturnRate, taxRate, niRate, age, leaveAge, retirementAge,
      apPaymentType, apCostPer100, sippNetLimit, fmtGBP, fmtPct, projectPot,
      addedPension, apMaxContrib, costPer100actual, AP_LIFETIME_MAX, alreadyLeft, yearsService
    });
  } else {
    // Civilian or veteran
    actionPlan = buildCivilianActionPlan({
      contribution, years, realReturnRate, taxRate, niRate, age, retirementAge,
      sippNetLimit, fmtGBP, fmtPct, projectPot, alreadyLeft
    });
  }
  phaseAllocations = actionPlan && actionPlan.phases ? actionPlan.phases.flatMap(p => p.steps.map((step, i) => ({
    startAge: age + (i === 0 ? 0 : p.years),
    endAge: age + p.years,
    ap: step.vehicle === 'AFPS 15 Added Pension' ? step.gross : 0,
    sippNet: step.vehicle === 'SIPP (Private Pension)' ? step.gross : 0,
    sippGross: step.vehicle === 'SIPP (Private Pension)' ? step.gross * 1.25 : 0,
    isa: step.vehicle === 'Stocks & Shares ISA' ? step.gross : 0,
  }))) : [];

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
  // For the comparison card, show the pot you'd get if you invested the full contribution into an ISA
  const existingIsaGrowth = (existingIsaPot > 0 ? existingIsaPot * Math.pow(1 + realReturnRate, years) : 0);
  const isaPotAllIn = projectPot(contribution, years, realReturnRate) + existingIsaGrowth;
  const isaIncome = isaPotAllIn * 0.04;
  const isa = {
    id: 'isa', name: 'Stocks & Shares ISA', icon: '💰', color: '#3b82f6',
    costToYou: contribution, taxSaving: 0, niSaving: 0,
    potAtRetirement: isaPotAllIn,
    annualIncomeAtRetirement: isaIncome,
    limitExceeded: contribution > isaLimit,
    _phasePot: isaPotPhase,
  };

  // ── SIPP calculation ───────────────────────────────────────────────────
  const sippGovTopUp = contribution * (20 / 80);
  const sippGross = contribution + sippGovTopUp;
  const sippExtraRelief = taxRate > 0.20 ? sippGross * (taxRate - 0.20) : 0;
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
  const best = options[0];
  let recReason = '';
  if (best.id === 'addedpension') {
    if (edpEligible)
      recReason = `You've hit the EDP point (age ${age}, ${yearsService} yrs). Every £1 of Added Pension boosts your tax-free EDP lump sum by £2.25, on top of a guaranteed CPI-linked pension for life. This is the single most powerful financial move available to you right now.`;
    else if (taxRate >= 0.60)
      recReason = `You're in the personal allowance taper zone — your effective marginal rate is 60%! Salary sacrifice into Added Pension saves 60p in every £1 of income tax alone, plus NI on top. This is the highest-efficiency savings option available.`;
    else
      recReason = `Salary sacrifice saves you ${fmtPct(taxRate)} income tax AND ${fmtPct(niRate)} NI on the full contribution. Your ${fmtGBP(contribution)} gross investment costs just ${fmtGBP(apNetCost)} net — buying a government-backed guaranteed pension indexed to inflation for life.`;
  } else if (best.id === 'sipp') {
    recReason = `As a ${taxRate >= 0.40 ? 'higher-rate' : 'basic-rate'} taxpayer, your SIPP converts ${fmtGBP(sippNetCost)} of net cost into ${fmtGBP(sippGross)} invested (growing to ${fmtGBP(sippPot)} by age ${retirementAge}).${taxRate >= 0.40 ? ` Remember to claim your extra ${fmtGBP(sippExtraRelief)}/yr back via Self Assessment.` : ''}`;
  } else {
    recReason = `With your current tax position, the ISA offers the best balance: tax-free growth, full flexibility, no lock-in, and accessible at any age. Ideal for medium-term goals or bridging to pension access age (57).`;
  }

  const mixData = calcMixScenarios(contribution, years, realReturnRate, taxRate);

  // ── Action Plan: phased allocation of your budget ──────────────────────────
  // Phase 1: while still serving (AP + SIPP + ISA)
  // Phase 2: after leaving MOD (SIPP + ISA only — AP budget redirected)
  // If already left or leaveAge <= age, there's only one phase (no AP).
  // If leaveAge >= retirementAge, there's also only one phase (serving throughout).

  // Action plan logic moved to separate modules (MOD vs Civilian)

  // Net worth at retirement
  const isaOptPot   = isa.potAtRetirement;
  const sippOptPot  = sipp.potAtRetirement;
  const apOptPot    = addedPension.potAtRetirement;
  const cashAtRetirement = cashReserve; // kept at nominal (inflation erodes it)
  // FIRE number (4% rule) if user provided a target income
  const fireNumber = (targetIncome && targetIncome > 0) ? targetIncome * 25 : 0;

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
  const remainingBalanceAtRetire = Math.max(0, mortgageBalance - (monthlyMortgage * 12 * yearsToRepayBeforeRetire));
  const equityRetirement = propertyValue - remainingBalanceAtRetire;
  const shouldOverpay = mortgageRate > 0.05 && mortgageBalance > 0;
  const mortgageVerdict = shouldOverpay
    ? 'High mortgage rate — consider overpaying the mortgage if you have excess cash.'
    : 'Low mortgage rate — consider investing excess cash for potentially higher returns.';
  // Estimate total interest over remaining term (approx): payments - principal
  const totalInterestEst = (monthlyMortgage > 0 && mortgageTermYears > 0)
    ? Math.max(0, (monthlyMortgage * 12 * mortgageTermYears) - mortgageBalance)
    : 0;
  // Estimate mortgage paid-off age if payments provided
  const mortgagePaidOffAge = (monthlyMortgage > 0 && mortgageBalance > 0)
    ? age + Math.ceil(mortgageBalance / (monthlyMortgage * 12))
    : null;
  const mortgageAnalysis = {
    propertyValue, mortgageBalance, mortgageRate, mortgageTermYears, monthlyMortgage,
    equityNow, equityRetirement, shouldOverpay, verdict: mortgageVerdict,
    totalInterestEst, mortgagePaidOffAge,
  };
  const propertyEquityAtRetirement = mortgageAnalysis ? mortgageAnalysis.equityRetirement : propertyValue;
  const liquidWealth  = isaOptPot + sippOptPot;
  const totalNetWorth = liquidWealth + apOptPot + propertyEquityAtRetirement + cashAtRetirement;

  return {
    options, maxEfficiency, fireNumber, years, retirementAge, mixData, existingDbPension, statePensionAge, statePension,
    inflationRate, realReturnRate, returnRate, actionPlan, phaseAllocations, contribution, salary, leaveYears: leaveYears,
    recommendation: { best, reason: recReason },
    taxSummary: { incomeTax, ni, takeHome, effectiveTaxRate: effTaxRate, marginalRate: taxRate, niRate, effectivePA, taxInfo, adjustedSalary: taxBasis, niableSalary: niBasis, salSacrifice, flatRateExpenses, hasDeductions },
    mortgageAnalysis,
    cashAnalysis: hasCash ? { cashReserve, monthlyExpenses, emergencyTarget, emergencyShortfall, emergencyOk } : null,
    netWorth: { isaOptPot, sippOptPot, apOptPot, cashAtRetirement, propertyEquityAtRetirement, liquidWealth, totalNetWorth },
    // Expose helpful limits for UI actions (e.g., maximise tax savings)
    sippNetLimit, apMaxContrib,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION PLAN CARD
// Shows a phased, prioritised step-by-step allocation of the user's budget
// ─────────────────────────────────────────────────────────────────────────────
function ActionPlanCard({ results }) {
  const { actionPlan, contribution } = results;
  const { phases, alreadyLeft } = actionPlan;

  if (!phases || phases.length === 0) return null;

  const multiPhase = phases.length > 1;

  return (
    <div className="action-plan-card">
      <div className="ap-header">
        <span className="ap-header-icon">🗺️</span>
        <div>
          <p className="ap-title">Your Action Plan</p>
          <p className="ap-subtitle">
            {multiPhase
              ? `How to allocate your ${fmtGBP(contribution)}/yr — changes when you leave MOD service`
              : `Exactly how to allocate your ${fmtGBP(contribution)}/yr for maximum efficiency`}
          </p>
        </div>
      </div>

      {alreadyLeft && (
        <p className="ap-left-note">You've left MOD service — Added Pension contributions are no longer possible. Your existing Added Pension is preserved and CPI-linked.</p>
      )}

      {phases.map((phase, pi) => (
        <div key={pi} className="ap-phase">
          <div className="ap-phase-header">
            <span className="ap-phase-icon">{phase.icon}</span>
            <div>
              <p className="ap-phase-label">{phase.label}</p>
              <p className="ap-phase-subtitle">{phase.subtitle}</p>
            </div>
          </div>

          <div className="ap-steps">
            {phase.steps.map((step, i) => (
              <div key={i} className="ap-step" style={{ '--step-color': step.color }}>
                <div className="ap-step-number">Step {i + 1}</div>
                <div className="ap-step-header">
                  <span className="ap-step-icon">{step.icon}</span>
                  <span className="ap-step-vehicle">{step.vehicle}</span>
                  <span className="ap-step-amount" style={{ color: step.color }}>{fmtGBP(step.gross)}/yr</span>
                </div>
                <div className="ap-step-body">
                  <div className="ap-step-money">
                    <div className="ap-step-money-row">
                      <span className="ap-money-label">Gross contribution</span>
                      <span className="ap-money-value">{fmtGBP(step.gross)}/yr</span>
                    </div>
                    {step.saving > 0 && (
                      <div className="ap-step-money-row">
                        <span className="ap-money-label">Tax + NI saved</span>
                        <span className="ap-money-value positive">−{fmtGBP(step.saving)}/yr</span>
                      </div>
                    )}
                    {step.govTopUp > 0 && (
                      <div className="ap-step-money-row">
                        <span className="ap-money-label">Govt top-up</span>
                        <span className="ap-money-value positive">+{fmtGBP(step.govTopUp)}/yr</span>
                      </div>
                    )}
                    <div className="ap-step-money-row ap-net-row">
                      <span className="ap-money-label">Net cost to you</span>
                      <span className="ap-money-value">{fmtGBP(step.netCost)}/yr</span>
                    </div>
                  </div>
                  <p className="ap-step-outcome">→ {step.outcome}</p>
                  <p className="ap-step-reason">{step.reason}</p>
                  {step.note && <p className="ap-step-note">💡 {step.note}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="ap-phase-totals">
            <div className="ap-summary-row">
              <span>Phase budget</span>
              <span className="ap-summary-value">{fmtGBP(phase.totalGross)}/yr × {phase.years} yr{phase.years !== 1 ? 's' : ''}</span>
            </div>
            <div className="ap-summary-row">
              <span>Net cost to you</span>
              <span className="ap-summary-value">{fmtGBP(phase.totalNet)}/yr</span>
            </div>
            {phase.totalGross > phase.totalNet && (
              <div className="ap-summary-row ap-summary-saving">
                <span>Tax + NI savings</span>
                <span className="ap-summary-value positive">{fmtGBP(phase.totalGross - phase.totalNet)}/yr</span>
              </div>
            )}
          </div>

          {multiPhase && pi < phases.length - 1 && (
            <div className="ap-phase-transition">
              <span className="ap-transition-arrow">↓</span>
              <span>When you leave MOD, redirect Added Pension budget into SIPP + ISA</span>
            </div>
          )}
        </div>
      ))}

      {/* Overall summary across all phases */}
      <div className="ap-summary">
        <p className="ap-summary-title">Overall Summary</p>
        {phases.map((phase, pi) => (
          <div key={pi} className="ap-summary-row">
            <span>{phase.icon} {phase.label}</span>
            <span className="ap-summary-value">{fmtGBP(phase.totalNet)}/yr net for {phase.years} yr{phase.years !== 1 ? 's' : ''}</span>
          </div>
        ))}
        {phases[0] && phases[0].totalGross > phases[0].totalNet && (
          <p className="ap-summary-note">
            {multiPhase ? 'While serving: f' : 'F'}or every £1 you spend, {fmtGBP(phases[0].totalGross / phases[0].totalNet, 2)} is invested — a {fmtPct((phases[0].totalGross - phases[0].totalNet) / phases[0].totalNet)} boost from tax relief and salary sacrifice.
            That's {fmtGBP(phases[0].totalGross / 12, 0)}/month gross from just {fmtGBP(phases[0].totalNet / 12, 0)}/month net.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MIX CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function MixCard({ mixData, taxRate, contribution, years }) {
  const { scenarios, bestIdx, sippMaxForPA } = mixData;
  const best     = scenarios[bestIdx];
  const maxIncome = Math.max(...scenarios.map(s => s.totalNetIncome));
  const sippCapped = sippMaxForPA < contribution * 0.9;

  let advice = '';
  if (taxRate >= 0.60) {
    advice = `You're in the 60% personal allowance taper zone — every £1 into a SIPP costs just 40p after tax relief. ISA offers zero upfront relief. Max out SIPP (and AFPS 15 Added Pension) before putting anything into an ISA.`;
  } else if (taxRate >= 0.40) {
    advice = `As a higher-rate taxpayer, SIPP contributions attract 40% relief now but withdrawals are likely taxed at 20% in retirement — a permanent 20p-in-the-pound saving on top of the government's 25% top-up. Max SIPP first. Once you hit the Annual Allowance, use ISA for penalty-free access before age 57.`;
  } else if (taxRate >= 0.20) {
    if (sippCapped) {
      advice = `As a basic-rate taxpayer, SIPP's 25% top-up is great — but if your SIPP annual income at retirement exceeds £12,570 you'll pay 20% on the excess, largely cancelling the top-up benefit. Optimal split: ~${fmtGBP(sippMaxForPA)}/yr into SIPP (keeping retirement drawdown within your personal allowance), the rest into ISA for fully tax-free income on top.`;
    } else {
      advice = `At this contribution level all of your SIPP income stays within the personal allowance at retirement, so 100% SIPP wins on pure maths thanks to the 25% top-up. Add ISA if you want penalty-free access before age 57 — nearly the same long-term result with added flexibility.`;
    }
  } else {
    advice = `You're below the income tax threshold — the SIPP's 25% government top-up applies automatically even at 0% tax. ISA is simpler and more flexible (no lock-in). A split favours whichever you value more: growth (SIPP) or access (ISA).`;
  }

  return (
    <div className="mix-card">
      <div className="mix-header">
        <span className="mix-icon">⚖️</span>
        <div className="mix-header-text">
          <p className="mix-title">ISA + SIPP Mix Analysis</p>
          <p className="mix-subtitle">{years} year projection in today's money — optimal split for your tax position</p>
        </div>
        <div className="mix-best-pill">{best.label} ⭐</div>
      </div>
      <p className="mix-advice">{advice}</p>
      <div className="mix-table">
        <div className="mix-table-head">
          <span>Split</span>
          <span>Net cost / yr</span>
          <span>Total pot</span>
          <span>Net income / yr</span>
          <span className="mix-bar-col">Relative income</span>
        </div>
        {scenarios.map((s, i) => {
          const barW = maxIncome > 0 ? (s.totalNetIncome / maxIncome) * 100 : 0;
          return (
            <div key={i} className={`mix-table-row${i === bestIdx ? ' mix-best-row' : ''}`}>
              <span className="mix-split-label">
                {i === bestIdx && <span className="mix-star">★ </span>}
                {s.label}
              </span>
              <span>{fmtGBP(s.netCost)}</span>
              <span>{fmtGBP(s.totalPot)}</span>
              <span className="positive">{fmtGBP(s.totalNetIncome, 0)}/yr</span>
              <span className="mix-bar-cell">
                <div className="mix-bar-bg">
                  <div className="mix-bar-fill" style={{ width: `${barW}%`, opacity: i === bestIdx ? 1 : 0.5 }} />
                </div>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mix-footnote">
        Net income = ISA drawdown (always tax-free) + SIPP drawdown after estimated income tax at retirement.
        The SIPP 25% tax-free lump sum is shown separately in the card below and not included in the annual income column above.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RETIREMENT TIMELINE CHART
// Stacked area chart: income from each source vs retirement age
// ─────────────────────────────────────────────────────────────────────────────
function RetirementTimelineChart({ results, form }) {
  const currentAge      = parseInt(form.age)            || 30;
  const nominalRate     = parseFloat(form.returnRate)   || 0.07;
  const inflationRate   = parseFloat(form.inflationRate) || 0.025;
  const returnRate      = (1 + nominalRate) / (1 + inflationRate) - 1;
  const existingIsa     = parseFloat(form.existingIsaPot)  || 0;
  const existingSipp    = parseFloat(form.existingSippPot) || 0;
  const targetIncome    = results.fireNumber > 0 ? results.fireNumber / 25 : 0;
  const dbPension       = results.existingDbPension || 0;
  const statePensionAge = results.statePensionAge || 67;
  const statePension    = results.statePension || 0;

  // Use the action plan's per-phase allocation (matches what the Action Plan card shows)
  const phaseAllocs = results.phaseAllocations || [];

  const apOpt      = results.options.find(o => o.id === 'addedpension');
  const leaveYears = apOpt?.leaveYears || 0;
  const apPerYear  = apOpt?.pensionPerYear || 0; // uncapped £/yr of pension bought
  const AP_CHART_MAX = 8571.21;

  const maxAge      = Math.max(75, parseInt(form.retirementAge) + 10);
  const targetRetAge = parseInt(form.retirementAge) || 60;
  const retPA  = { pa: 12570, mode: 'normal' };

  const data = [];
  let retirePossibleAge = null;
  let hasApIncome  = false;

  // Helper: find the phase allocation for a given age
  const getAllocForAge = (ageAtYear) => {
    for (const pa of phaseAllocs) {
      if (ageAtYear >= pa.startAge && ageAtYear < pa.endAge) return pa;
    }
    // After all phases (past retirement), no new contributions
    return { ap: 0, sippNet: 0, sippGross: 0, isa: 0 };
  };

  // Accumulate pots year by year using actual per-phase contributions
  let isaPotAcc  = existingIsa;
  let sippPotAcc = existingSipp;

  for (let R = currentAge + 1; R <= maxAge; R++) {
    const alloc = getAllocForAge(R - 1); // contributions made during the year ending at age R

    // ISA: compound existing + add this year's contribution
    isaPotAcc = isaPotAcc * (1 + returnRate) + alloc.isa;
    const isaIncome = R >= targetRetAge ? Math.round(isaPotAcc * 0.04) : 0;

    // SIPP: compound existing + add this year's gross contribution (incl govt top-up)
    sippPotAcc = sippPotAcc * (1 + returnRate) + alloc.sippGross;
    const sippUnlockAge = Math.max(57, targetRetAge);
    const sippDraw      = R >= sippUnlockAge ? sippPotAcc * 0.75 * 0.04 : 0;
    const sippTax       = sippDraw > 0 ? calcIncomeTax(sippDraw, retPA) : 0;
    const sippNetInc    = Math.round(Math.max(0, sippDraw - sippTax));

    // AFPS 15 Added Pension grows until leaveAge, then stays fixed
    const yrs           = R - currentAge;
    const apYrs         = Math.min(yrs, leaveYears);
    const apAccrued     = Math.round(Math.min(apPerYear * apYrs, AP_CHART_MAX));
    const apIncome      = R >= statePensionAge ? apAccrued : 0;
    if (apIncome > 0) hasApIncome = true;

    // DB pension only accessible from state pension age
    const dbIncome = R >= statePensionAge ? Math.round(dbPension) : 0;

    // State pension — only from state pension age
    const spIncome = (statePension > 0 && R >= statePensionAge) ? Math.round(statePension) : 0;

    const total = isaIncome + sippNetInc + apIncome + dbIncome + spIncome;
    if (retirePossibleAge === null && targetIncome > 0 && total >= targetIncome) {
      retirePossibleAge = R;
    }

    data.push({
      age:              R,
      'DB Pension':     dbIncome,
      'Added Pension':  apIncome,
      'ISA Income':     isaIncome,
      'SIPP (net)':     sippNetInc,
      ...(statePension > 0 ? { 'State Pension': spIncome } : {}),
    });
  }

  // Derive the effective ISA/SIPP split from the action plan for display
  const totalContrib = results.contribution || 1;
  const phase2 = phaseAllocs.length > 1 ? phaseAllocs[phaseAllocs.length - 1] : phaseAllocs[0];
  const chartSippPct = Math.round(((phase2?.sippNet || 0) / totalContrib) * 100);
  const chartIsaPct  = Math.round(((phase2?.isa || 0) / totalContrib) * 100);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-icon">📈</span>
        <div>
          <p className="chart-title">Retirement Income Timeline</p>
          <p className="chart-subtitle">
            Allocation: {chartIsaPct}% ISA · {chartSippPct}% SIPP{phaseAllocs.length > 1 ? ` (after MOD)` : ''} — drawdown starts at age {targetRetAge}
            {retirePossibleAge
              ? ` — target reached at age ${retirePossibleAge} 🎯`
              : targetIncome > 0
                ? ` — target not reached by age ${maxAge}`
                : ''}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={data} margin={{ top: 16, right: 30, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="gradDB"   x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradAP"   x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#34d399" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#34d399" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradISA"  x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradSIPP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.25}/>
            </linearGradient>
            <linearGradient id="gradSP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.25}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="age"
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={v => v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}
            itemStyle={{ color: '#cbd5e1', fontSize: 13 }}
            formatter={(value, name) => [fmtGBP(value, 0) + '/yr', name]}
            labelFormatter={v => {
              const row = data.find(d => d.age === v);
              if (!row) return `Age ${v}`;
              const total = (row['DB Pension'] || 0) + (row['Added Pension'] || 0)
                          + (row['ISA Income'] || 0) + (row['SIPP (net)'] || 0)
                          + (row['State Pension'] || 0);
              return `Age ${v}  —  Total: ${fmtGBP(total, 0)}/yr`;
            }}
          />

          {dbPension > 0 && (
            <Area type="monotone" dataKey="DB Pension"    stackId="1" stroke="#10b981" fill="url(#gradDB)"   strokeWidth={1.5} />
          )}
          {hasApIncome && (
            <Area type="monotone" dataKey="Added Pension" stackId="1" stroke="#34d399" fill="url(#gradAP)"   strokeWidth={1.5} />
          )}
          <Area   type="monotone" dataKey="ISA Income"    stackId="1" stroke="#3b82f6" fill="url(#gradISA)"  strokeWidth={1.5} />
          <Area   type="monotone" dataKey="SIPP (net)"    stackId="1" stroke="#8b5cf6" fill="url(#gradSIPP)" strokeWidth={1.5} />
          {statePension > 0 && (
            <Area type="monotone" dataKey="State Pension" stackId="1" stroke="#f59e0b" fill="url(#gradSP)"   strokeWidth={1.5} />
          )}

          {targetIncome > 0 && (
            <ReferenceLine
              y={targetIncome}
              stroke="#e2e8f0"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{ value: `Target: ${fmtGBP(targetIncome, 0)}/yr`, position: 'insideTopLeft', fill: '#e2e8f0', fontSize: 11 }}
            />
          )}
          {retirePossibleAge && (
            <ReferenceLine
              x={retirePossibleAge}
              stroke="#22d3ee"
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{ value: `Age ${retirePossibleAge}`, position: 'insideTop', fill: '#22d3ee', fontSize: 11 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Coloured-text key */}
      <div className="chart-key">
        {dbPension > 0 && <span className="chart-key-item" style={{ color: '#10b981' }}>● DB Pension <span className="chart-key-note">(from age {statePensionAge}, CPI-linked)</span></span>}
        {hasApIncome  && <span className="chart-key-item" style={{ color: '#34d399' }}>● Added Pension <span className="chart-key-note">(from age {statePensionAge}, CPI-linked)</span></span>}
        <span className="chart-key-item" style={{ color: '#3b82f6' }}>● ISA Income <span className="chart-key-note">(tax-free, always accessible)</span></span>
        <span className="chart-key-item" style={{ color: '#a78bfa' }}>● SIPP (net of tax) <span className="chart-key-note">(accessible age 57+)</span></span>
        {statePension > 0 && <span className="chart-key-item" style={{ color: '#f59e0b' }}>● State Pension <span className="chart-key-note">(from age {statePensionAge}, {fmtGBP(statePension, 0)}/yr)</span></span>}
        {targetIncome > 0 && <span className="chart-key-item" style={{ color: '#e2e8f0' }}>— Target income <span className="chart-key-note">({fmtGBP(targetIncome, 0)}/yr)</span></span>}
        {retirePossibleAge && <span className="chart-key-item" style={{ color: '#22d3ee' }}>| Earliest retirement <span className="chart-key-note">(age {retirePossibleAge})</span></span>}
      </div>

      {retirePossibleAge && (
        <div className="chart-retire-callout">
          <span className="chart-retire-emoji">🎯</span>
          <div>
            <strong>Earliest retirement age: {retirePossibleAge}</strong> — {retirePossibleAge - currentAge} year{retirePossibleAge - currentAge !== 1 ? 's' : ''} from now,{' '}
            using a {chartIsaPct}% ISA / {chartSippPct}% SIPP split.
            {retirePossibleAge < 57 && (
              <span className="chart-retire-warning"> ⚠️ Before age 57 your SIPP is inaccessible — income before then comes from ISA{dbPension > 0 ? ', DB pension' : ''}{hasApIncome ? ' and Added Pension' : ''} only.</span>
            )}
          </div>
        </div>
      )}
      {!retirePossibleAge && targetIncome > 0 && (
        <div className="chart-retire-callout chart-retire-miss">
          <span className="chart-retire-emoji">📊</span>
          <div>Target of {fmtGBP(targetIncome, 0)}/yr is not reached by age {maxAge} on current contributions. Try increasing your annual investment or adjusting your target income.</div>
        </div>
      )}
      <p className="chart-footnote">
        All figures in today's money (adjusted for {fmtPct(inflationRate, 1)}/yr inflation). Income at 4% SWR. SIPP net of tax (PA £12,570). SIPP locked until 57. DB + State Pension from age {statePensionAge}. Real growth: {fmtPct(returnRate, 1)}/yr ({fmtPct(nominalRate, 1)} nominal − {fmtPct(inflationRate, 1)} inflation).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTAL WEALTH CHART
// Shows accumulated pot values (ISA + SIPP) over time vs FIRE number
// ─────────────────────────────────────────────────────────────────────────────
function TotalWealthChart({ results, form }) {
  const currentAge   = parseInt(form.age)           || 30;
  const nominalRate  = parseFloat(form.returnRate)  || 0.07;
  const inflationRate = parseFloat(form.inflationRate) || 0.025;
  const returnRate   = (1 + nominalRate) / (1 + inflationRate) - 1;
  const existingIsa  = parseFloat(form.existingIsaPot)  || 0;
  const existingSipp = parseFloat(form.existingSippPot) || 0;
  const targetRetAge = parseInt(form.retirementAge) || 60;
  const fireNumber   = results.fireNumber || 0;

  // Use action plan's per-phase allocation (matches the timeline chart and action plan card)
  const phaseAllocs = results.phaseAllocations || [];

  const maxAge = Math.max(75, targetRetAge + 10);

  const wealthData = [];
  let fireAge = null;
  let isaPotAcc  = existingIsa;
  let sippPotAcc = existingSipp;

  // Helper: find the phase allocation for a given age
  const getAllocForAge = (ageAtYear) => {
    for (const pa of phaseAllocs) {
      if (ageAtYear >= pa.startAge && ageAtYear < pa.endAge) return pa;
    }
    return { ap: 0, sippNet: 0, sippGross: 0, isa: 0 };
  };

  for (let R = currentAge + 1; R <= maxAge; R++) {
    const alloc = getAllocForAge(R - 1);

    isaPotAcc  = isaPotAcc * (1 + returnRate) + alloc.isa;
    sippPotAcc = sippPotAcc * (1 + returnRate) + alloc.sippGross;

    const isaPot  = Math.round(isaPotAcc);
    const sippPot = Math.round(sippPotAcc);
    const total   = isaPot + sippPot;

    if (fireNumber > 0 && fireAge === null && total >= fireNumber) fireAge = R;

    wealthData.push({ age: R, 'ISA Pot': isaPot, 'SIPP Pot': sippPot });
  }

  // Derive the effective split for display
  const totalContrib = results.contribution || 1;
  const phase2 = phaseAllocs.length > 1 ? phaseAllocs[phaseAllocs.length - 1] : phaseAllocs[0];
  const chartSippPct = Math.round(((phase2?.sippNet || 0) / totalContrib) * 100);
  const chartIsaPct  = Math.round(((phase2?.isa || 0) / totalContrib) * 100);
  const peakTotal   = wealthData.length > 0
    ? wealthData[wealthData.length - 1]['ISA Pot'] + wealthData[wealthData.length - 1]['SIPP Pot']
    : 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <span className="chart-icon">💰</span>
        <div>
          <p className="chart-title">Total Accumulated Wealth</p>
          <p className="chart-subtitle">
            {chartIsaPct}% ISA · {chartSippPct}% SIPP split{phaseAllocs.length > 1 ? ' (after MOD)' : ''}
            {fireAge
              ? ` — FIRE number reached at age ${fireAge} 🔥`
              : fireNumber > 0
                ? ` — FIRE number not reached by age ${maxAge}`
                : ''}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={wealthData} margin={{ top: 16, right: 30, bottom: 20, left: 10 }}>
          <defs>
            <linearGradient id="wgradISA"  x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.20}/>
            </linearGradient>
            <linearGradient id="wgradSIPP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.85}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.20}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="age"
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 12 }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={v => v >= 1000000 ? `£${(v / 1000000).toFixed(1)}m` : v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}
            labelStyle={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 6 }}
            itemStyle={{ color: '#cbd5e1', fontSize: 13 }}
            formatter={(value, name) => [fmtGBP(value, 0), name]}
            labelFormatter={v => {
              const row = wealthData.find(d => d.age === v);
              const tot = row ? row['ISA Pot'] + row['SIPP Pot'] : 0;
              return `Age ${v}  —  Total: ${fmtGBP(tot, 0)}`;
            }}
          />
          <Area type="monotone" dataKey="ISA Pot"  stackId="1" stroke="#3b82f6" fill="url(#wgradISA)"  strokeWidth={1.5} />
          <Area type="monotone" dataKey="SIPP Pot" stackId="1" stroke="#8b5cf6" fill="url(#wgradSIPP)" strokeWidth={1.5} />

          {fireNumber > 0 && (
            <ReferenceLine
              y={fireNumber}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{ value: `FIRE: ${fmtGBP(fireNumber, 0)}`, position: 'insideTopLeft', fill: '#f59e0b', fontSize: 11 }}
            />
          )}
          <ReferenceLine
            x={targetRetAge}
            stroke="#22d3ee"
            strokeDasharray="4 3"
            strokeWidth={2}
            label={{ value: `Retire ${targetRetAge}`, position: 'insideTop', fill: '#22d3ee', fontSize: 11 }}
          />
          {fireAge && fireAge !== targetRetAge && (
            <ReferenceLine
              x={fireAge}
              stroke="#f97316"
              strokeDasharray="4 3"
              strokeWidth={2}
              label={{ value: `FIRE ${fireAge}`, position: 'insideTopRight', fill: '#f97316', fontSize: 11 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Coloured-text key */}
      <div className="chart-key">
        <span className="chart-key-item" style={{ color: '#3b82f6' }}>● ISA Pot <span className="chart-key-note">(tax-free, no lock-in)</span></span>
        <span className="chart-key-item" style={{ color: '#a78bfa' }}>● SIPP Pot <span className="chart-key-note">(accessible age 57+, gross value)</span></span>
        {fireNumber > 0 && <span className="chart-key-item" style={{ color: '#f59e0b' }}>— FIRE number <span className="chart-key-note">({fmtGBP(fireNumber, 0)} = 25× target income)</span></span>}
        <span className="chart-key-item" style={{ color: '#22d3ee' }}>| Target retirement <span className="chart-key-note">(age {targetRetAge})</span></span>
        {fireAge && fireAge !== targetRetAge && <span className="chart-key-item" style={{ color: '#f97316' }}>| FIRE age <span className="chart-key-note">(age {fireAge} — pot hits FIRE number)</span></span>}
      </div>

      {fireAge && (
        <div className="chart-retire-callout">
          <span className="chart-retire-emoji">🔥</span>
          <div>
            <strong>Pot reaches FIRE number ({fmtGBP(fireNumber, 0)}) at age {fireAge}</strong>
            {fireAge < targetRetAge
              ? ` — ${targetRetAge - fireAge} year${targetRetAge - fireAge !== 1 ? 's' : ''} before your target retirement age. You could retire early!`
              : ` — ${fireAge - targetRetAge} year${fireAge - targetRetAge !== 1 ? 's' : ''} after your target retirement age.`}
          </div>
        </div>
      )}
      {!fireAge && fireNumber > 0 && (
        <div className="chart-retire-callout chart-retire-miss">
          <span className="chart-retire-emoji">📊</span>
          <div>
            Pot reaches {fmtGBP(peakTotal, 0)} by age {maxAge} — {fmtGBP(fireNumber - peakTotal, 0)} short of FIRE number.
            Consider increasing contributions or accepting a lower safe withdrawal amount.
          </div>
        </div>
      )}
      <p className="chart-footnote">
        All values in today's money ({fmtPct(inflationRate, 1)}/yr inflation adjusted). Pots shown gross (before drawdown). SIPP at full market value — 75% taxable on withdrawal. FIRE = 25× target income (4% SWR). Real growth: {fmtPct(returnRate, 1)}/yr.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RETIREMENT PICTURE CARD
// Shows every income source combined — DB pension, Added Pension, ISA, SIPP
// ─────────────────────────────────────────────────────────────────────────────
function RetirementPictureCard({ results, isServing }) {
  const isaOpt  = results.options.find(o => o.id === 'isa');
  const sippOpt = results.options.find(o => o.id === 'sipp');
  const apOpt   = results.options.find(o => o.id === 'addedpension');

  const dbAnnual        = results.existingDbPension || 0;
  const statePension    = results.statePension      || 0;
  const statePensionAge = results.statePensionAge   || 67;
  const retirementAge   = results.retirementAge     || 60;
  const hasDeferredIncome = retirementAge < statePensionAge;

  const apAnnualFull = (isServing && apOpt) ? apOpt.totalPensionAcquired || 0 : 0;
  const edpLump    = (isServing && apOpt) ? apOpt.edpLumpSum || 0 : 0;
  const edpAnnual  = (isServing && apOpt) ? apOpt.edpIncome || 0 : 0;
  const isaAnnual  = isaOpt?.annualIncomeAtRetirement || 0;
  const sippAnnual = sippOpt?.annualIncomeAtRetirement || 0;
  const sippLump   = sippOpt?.taxFreeLump || 0;

  // Income available immediately at target retirement age
  const earlyTotal = isaAnnual + sippAnnual + (apOpt?.edpEligible ? edpAnnual : 0);
  // Full income once state pension age reached (everything kicks in)
  const fullTotal  = earlyTotal + dbAnnual + apAnnualFull + statePension;

  const fireTarget      = results.fireNumber > 0 ? results.fireNumber / 25 : 0;
  // Use the full total for FIRE progress — that's your eventual steady-state
  const fireProgressAmt = hasDeferredIncome ? fullTotal : earlyTotal + dbAnnual + apAnnualFull + statePension;
  const fireProgress    = fireTarget > 0 ? Math.min(100, (fireProgressAmt / fireTarget) * 100) : 0;

  // Build sources for early retirement phase
  const earlySources = [
    (apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income',           annual: edpAnnual,  color: '#6ee7b7', note: 'Enhanced Departure Payment',          icon: '\uD83C\uDFC6' },
    isaAnnual > 0                         && { label: 'ISA Drawdown (4%/yr)',         annual: isaAnnual,  color: '#3b82f6', note: '100% tax-free income',               icon: '\uD83D\uDCB0' },
    sippAnnual > 0                        && { label: 'SIPP Drawdown (4% of 75%)',    annual: sippAnnual, color: '#a78bfa', note: 'Taxable above personal allowance',  icon: '\uD83C\uDFE6' },
  ].filter(Boolean);

  // Deferred sources that unlock at state pension age
  const deferredSources = [
    dbAnnual > 0     && { label: 'AFPS 15 DB Pension (from statement)', annual: dbAnnual,      color: '#10b981', icon: '\uD83C\uDF96\uFE0F' },
    (isServing && apAnnualFull > 0) && { label: 'AFPS 15 Added Pension (calculated)',  annual: apAnnualFull,  color: '#34d399', icon: '\u2795' },
    statePension > 0 && { label: 'State Pension',                       annual: statePension,  color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F' },
  ].filter(Boolean);

  // All sources combined (for non-deferred display when retirementAge >= SPA)
  const allSources = [
    dbAnnual > 0                          && { label: 'AFPS 15 DB Pension (from statement)', annual: dbAnnual,      color: '#10b981', note: 'Guaranteed, CPI-linked for life',      icon: '\uD83C\uDF96\uFE0F' },
    (isServing && apAnnualFull > 0)      && { label: 'AFPS 15 Added Pension (calculated)',  annual: apAnnualFull,  color: '#34d399', note: 'Guaranteed, CPI-linked for life',      icon: '\u2795' },
    (isServing && apOpt?.edpEligible && edpAnnual > 0) && { label: 'EDP Annual Income',                  annual: edpAnnual,     color: '#6ee7b7', note: 'Enhanced Departure Payment',           icon: '\uD83C\uDFC6' },
    isaAnnual > 0                         && { label: 'ISA Drawdown (4%/yr)',                 annual: isaAnnual,     color: '#3b82f6', note: '100% tax-free income',                icon: '\uD83D\uDCB0' },
    sippAnnual > 0                        && { label: 'SIPP Drawdown (4% of 75%)',            annual: sippAnnual,    color: '#a78bfa', note: 'Taxable above personal allowance',   icon: '\uD83C\uDFE6' },
    statePension > 0                      && { label: 'State Pension',                       annual: statePension,  color: '#f59e0b', note: 'Full new State Pension',              icon: '\uD83C\uDFDB\uFE0F' },
  ].filter(Boolean);

  const oneOffs = [
    sippLump > 0                         && { label: 'SIPP 25% Tax-Free Lump Sum', value: sippLump, color: '#a78bfa', note: 'Take at retirement — zero tax',    icon: '\uD83C\uDFE6' },
    (apOpt?.edpEligible && edpLump > 0)  && { label: 'EDP Tax-Free Lump Sum',      value: edpLump,  color: '#10b981', note: '2.25\u00d7 added pension — zero tax', icon: '\uD83C\uDFC6' },
  ].filter(Boolean);

  const renderSourceRow = (s, i) => (
    <div key={i} className="rp-source-row">
      <span className="rp-source-icon">{s.icon}</span>
      <div className="rp-source-info">
        <span className="rp-source-label">{s.label}</span>
        {s.note && <span className="rp-source-note">{s.note}</span>}
      </div>
      <span className="rp-source-value" style={{ color: s.color }}>{fmtGBP(s.annual, 0)}/yr</span>
    </div>
  );

  return (
    <div className="retirement-picture-card">
      <div className="rp-header">
        <span className="rp-header-icon">🌅</span>
        <div>
          <p className="rp-title">Total Retirement Picture</p>
          <p className="rp-subtitle">All projected income in today's money — {results.years} years from now</p>
        </div>
      </div>

      {!hasDeferredIncome ? (
        /* Retirement age >= SPA: everything accessible at once */
        <div className="rp-sources">
          <p className="rp-phase-label">📅 From age {retirementAge} — all income accessible</p>
          {allSources.length === 0 && (
            <p className="rp-empty">Fill in the inputs above to see your full retirement picture.</p>
          )}
          {allSources.map(renderSourceRow)}
          {fullTotal > 0 && (
            <div className="rp-total-row">
              <span className="rp-total-label">Σ Total Annual Income</span>
              <span className="rp-total-value">{fmtGBP(fullTotal, 0)}/yr</span>
            </div>
          )}
        </div>
      ) : (
        /* Retirement age < SPA: show two phases */
        <>
          <div className="rp-sources">
            <p className="rp-phase-label">📅 Phase 1: Age {retirementAge}–{statePensionAge - 1} — early retirement</p>
            <p className="rp-phase-note">Only ISA, SIPP, and EDP income available before state pension age</p>
            {earlySources.length === 0 && (
              <p className="rp-empty">No income sources available at age {retirementAge}. Consider ISA/SIPP contributions.</p>
            )}
            {earlySources.map(renderSourceRow)}
            {earlyTotal > 0 && (
              <div className="rp-total-row">
                <span className="rp-total-label">Σ Income age {retirementAge}–{statePensionAge - 1}</span>
                <span className="rp-total-value">{fmtGBP(earlyTotal, 0)}/yr</span>
              </div>
            )}
          </div>

          <div className="rp-sources rp-phase-full">
            <p className="rp-phase-label">📅 Phase 2: From age {statePensionAge} — full income unlocked</p>
            <p className="rp-phase-note">DB pension, Added Pension, and State Pension all become accessible</p>
            {deferredSources.map((s, i) => (
              <div key={`def-${i}`} className="rp-source-row rp-source-new">
                <span className="rp-source-icon">{s.icon}</span>
                <div className="rp-source-info">
                  <span className="rp-source-label">{s.label}</span>
                  <span className="rp-source-note">Unlocks at age {statePensionAge} — guaranteed, CPI-linked</span>
                </div>
                <span className="rp-source-value" style={{ color: s.color }}>+{fmtGBP(s.annual, 0)}/yr</span>
              </div>
            ))}
            {earlySources.map((s, i) => (
              <div key={`cont-${i}`} className="rp-source-row rp-source-continued">
                <span className="rp-source-icon">{s.icon}</span>
                <div className="rp-source-info">
                  <span className="rp-source-label">{s.label}</span>
                  <span className="rp-source-note">Continues from phase 1</span>
                </div>
                <span className="rp-source-value" style={{ color: s.color, opacity: 0.6 }}>{fmtGBP(s.annual, 0)}/yr</span>
              </div>
            ))}
            <div className="rp-total-row rp-total-full">
              <span className="rp-total-label">Σ Total from age {statePensionAge}</span>
              <span className="rp-total-value">{fmtGBP(fullTotal, 0)}/yr</span>
            </div>
          </div>
        </>
      )}

      {oneOffs.length > 0 && (
        <div className="rp-oneoffs">
          <p className="rp-oneoffs-title">One-off Lump Sums at Retirement</p>
          {oneOffs.map((o, i) => (
            <div key={i} className="rp-source-row">
              <span className="rp-source-icon">{o.icon}</span>
              <div className="rp-source-info">
                <span className="rp-source-label">{o.label}</span>
                <span className="rp-source-note">{o.note}</span>
              </div>
              <span className="rp-source-value" style={{ color: o.color }}>{fmtGBP(o.value)}</span>
            </div>
          ))}
        </div>
      )}

      {fireTarget > 0 && fireProgressAmt > 0 && (
        <div className="rp-fire-progress">
          <div className="rp-fire-header">
            <span>FIRE target: {fmtGBP(fireTarget, 0)}/yr needed</span>
            <span className={fireProgress >= 100 ? 'rp-fire-pct achieved' : 'rp-fire-pct'}>{fireProgress.toFixed(0)}% covered</span>
          </div>
          <div className="rp-fire-track">
            <div className="rp-fire-fill" style={{ width: `${Math.min(100, fireProgress)}%` }} />
          </div>
          <p className="rp-fire-note">
            {fireProgress >= 100
              ? `\uD83C\uDF89 Your full income from age ${statePensionAge} (${fmtGBP(fireProgressAmt, 0)}/yr) meets or exceeds your FIRE target!`
              : `${fmtGBP(Math.max(0, fireTarget - fireProgressAmt), 0)}/yr short of FIRE target at age ${statePensionAge} \u2014 consider increasing contributions or adjusting retirement age.`}
            {hasDeferredIncome && earlyTotal < fireTarget && earlyTotal > 0 && `\n(Note: only ${fmtGBP(earlyTotal, 0)}/yr available at age ${retirementAge} before pensions unlock.)`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function ResultCard({ option, maxEfficiency, years }) {
  const rankEmoji = ['🥇', '🥈', '🥉'][option.rank - 1];
  const barWidth  = Math.min(100, (option.efficiency / maxEfficiency) * 100);
  return (
    <div className="result-card" style={{ '--card-color': option.color }}>
      <div className="result-card-header">
        <span className="result-icon">{option.icon}</span>
        <span className="result-rank">{rankEmoji}</span>
      </div>
      <h3 className="result-card-name">{option.name}</h3>
      {option.limitExceeded && option.limitNote && (
        <div className="limit-warning-banner">⚠️ {option.limitNote}</div>
      )}
      <div className="result-stats">
        <div className="result-stat">
          <span className="stat-label">Net cost to you / yr</span>
          <span className="stat-value">{fmtGBP(option.costToYou)}</span>
        </div>
        {(option.taxSaving + option.niSaving) > 0 && (
          <div className="result-stat">
            <span className="stat-label">Tax + NI saved</span>
            <span className="stat-value positive">+{fmtGBP(option.taxSaving + option.niSaving)}</span>
          </div>
        )}
        <div className="result-stat">
          <span className="stat-label">Projected pot at retirement</span>
          <span className="stat-value positive">{fmtGBP(option.potAtRetirement)}</span>
        </div>
      </div>
      {option.incomeBreakdown && (
        <div className="income-breakdown">
          <p className="income-breakdown-title">💷 At Retirement ({years} yrs time)</p>
          {option.incomeBreakdown.map((item, i) => (
            <div key={i} className="income-breakdown-row">
              <span className="ib-label">{item.label}</span>
              <div className="ib-right">
                <span className="ib-value">{item.value}</span>
                {item.note && <span className="ib-note">{item.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="efficiency-section">
        <div className="efficiency-label">
          <span>Efficiency score</span>
          <span className="efficiency-score">{option.efficiency.toFixed(2)}×</span>
        </div>
        <div className="efficiency-bar">
          <div className="efficiency-bar-fill" style={{ width: `${barWidth}%`, background: option.color }} />
        </div>
      </div>
      <ul className="highlights-list">
        {option.highlights.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
      <div className="result-footer">
        <div className="result-pros">✅ {option.pros}</div>
        <div className="result-cons">⚠️ {option.cons}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
const RETURN_PRESETS = [
  { label: 'Conservative 5%', value: 0.05 },
  { label: 'Balanced 7%',     value: 0.07 },
  { label: 'Growth 9%',       value: 0.09 },
];

const INFLATION_PRESETS = [
  { label: 'Low 2%',      value: 0.02  },
  { label: 'Target 2.5%', value: 0.025 },
  { label: 'High 4%',     value: 0.04  },
];

function App() {
  // Set browser tab title on mount
  useEffect(() => {
    document.title = 'Soldiers Fortune';
  }, []);

  useEffect(() => {
    const prevent = (e) => {
      if (document.activeElement?.type === 'number') e.preventDefault();
    };
    document.addEventListener('wheel', prevent, { passive: false });
    return () => document.removeEventListener('wheel', prevent);
  }, []);
  const [form, setForm] = useState({
    isServing: true,
    salary: '', taxCode: '', age: '', yearsService: '',
    leaveAge: '', apCostPer100: '', apPaymentType: 'single',
    existingDbPension: '', existingIsaPot: '', existingSippPot: '',
    statePensionAge: '67', statePension: '11502',
    salSacrifice: '', flatRateExpenses: '', manualTaxablePay: '',
    propertyValue: '', mortgageBalance: '', mortgageRate: '', mortgageTermYears: '', monthlyMortgage: '',
    cashReserve: '', monthlyExpenses: '',
    contribution: '', contributionFreq: 'annual', retirementAge: '60', returnRate: '0.07', inflationRate: '0.025', targetIncome: '',
  });
  const [showPayslipDetails, setShowPayslipDetails] = useState(false);
  const [showPropertyDetails, setShowPropertyDetails] = useState(false);
  const [results, setResults] = useState(null);

  // Clear previous results when serving toggle changes (forces recalculation)
  useEffect(() => {
    setResults(null);
  }, [form.isServing]);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const taxSummaryRef = useRef(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    const salary        = parseFloat(form.salary)        || 0;
    const age           = parseInt(form.age)              || 30;
    const yearsService  = parseInt(form.yearsService)     || 0;
    const retirementAge  = parseInt(form.retirementAge)    || 60;
    const leaveAge       = parseInt(form.leaveAge)         || retirementAge;
    const apCostPer100      = parseFloat(form.apCostPer100)      || 0;
    const existingDbPension = parseFloat(form.existingDbPension) || 0;
    const existingIsaPot    = parseFloat(form.existingIsaPot)    || 0;
    const existingSippPot   = parseFloat(form.existingSippPot)   || 0;
    const statePensionAge   = parseInt(form.statePensionAge)     || 67;
    const statePension      = parseFloat(form.statePension)      || 0;
    const salSacrifice      = parseFloat(form.salSacrifice)      || 0;
    const flatRateExpenses  = parseFloat(form.flatRateExpenses)  || 0;
    const manualTaxablePay  = parseFloat(form.manualTaxablePay)  || 0;
    const propertyValue     = parseFloat(form.propertyValue)     || 0;
    const mortgageBalance   = parseFloat(form.mortgageBalance)   || 0;
    const mortgageRate      = (parseFloat(form.mortgageRate)      || 0) / 100;
    const mortgageTermYears = parseFloat(form.mortgageTermYears) || 0;
    const monthlyMortgage   = parseFloat(form.monthlyMortgage)   || 0;
    const cashReserve       = parseFloat(form.cashReserve)       || 0;
    const monthlyExpenses   = parseFloat(form.monthlyExpenses)   || 0;
    const contributionRaw  = parseFloat(form.contribution)      || 0;
    const contribution      = form.contributionFreq === 'monthly' ? contributionRaw * 12 : contributionRaw;
    const returnRate        = parseFloat(form.returnRate)        || 0.07;
    const inflationRate     = parseFloat(form.inflationRate)     || 0.025;
    const targetIncome      = parseFloat(form.targetIncome)      || salary * 0.67;
    if (salary <= 0 || contribution <= 0) return;
    setResults(buildResults({
      salary, taxCode: form.taxCode, age,
      yearsService: form.isServing ? yearsService : 0,
      leaveAge: form.isServing ? leaveAge : retirementAge,
      apCostPer100: form.isServing ? apCostPer100 : 0,
      apPaymentType: form.isServing ? form.apPaymentType : 'single',
      existingDbPension: form.isServing ? existingDbPension : 0,
      existingIsaPot, existingSippPot, statePensionAge, statePension, contribution, retirementAge, returnRate, inflationRate, targetIncome, salSacrifice, flatRateExpenses, manualTaxablePay, propertyValue, mortgageBalance, mortgageRate, mortgageTermYears, monthlyMortgage, cashReserve, monthlyExpenses,
      isServing: !!form.isServing
    }));
    setTimeout(() => {
      if (taxSummaryRef.current) {
        taxSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Max-tax helper removed per request

  // Live tax preview — use adjusted salary if payslip details provided
  const liveSalary  = parseFloat(form.salary) || 0;
  const liveTaxInfo = parseTaxCode(form.taxCode);
  const liveSalSac  = parseFloat(form.salSacrifice) || 0;
  const liveFlatExp = parseFloat(form.flatRateExpenses) || 0;
  const liveManualTaxable = parseFloat(form.manualTaxablePay) || 0;
  const liveAdjustedSalary = liveManualTaxable > 0
    ? liveManualTaxable
    : liveSalary - liveSalSac - liveFlatExp;
  const liveNiableSalary = liveSalary - liveSalSac;
  const liveHasDeductions = liveSalSac > 0 || liveFlatExp > 0 || liveManualTaxable > 0;
  const liveTaxBasis = liveHasDeductions ? liveAdjustedSalary : liveSalary;
  const liveNIBasis  = liveHasDeductions ? liveNiableSalary : liveSalary;
  const liveMarginal = liveSalary > 0 ? getMarginalTaxRate(liveTaxBasis, liveTaxInfo) : null;
  const liveNI       = liveSalary > 0 ? getMarginalNI(liveNIBasis)                   : null;

  // Live inflation-adjusted return
  const liveNominal    = parseFloat(form.returnRate)    || 0.07;
  const liveInflation  = parseFloat(form.inflationRate) || 0.025;
  const liveRealReturn = (1 + liveNominal) / (1 + liveInflation) - 1;

  // Live contribution limit hints
  const liveAge          = parseInt(form.age) || 30;
  const liveRetAge       = parseInt(form.retirementAge) || 60;
  const liveLeaveAge     = parseInt(form.leaveAge) || liveRetAge;
  const liveLeaveYears   = Math.max(0, Math.min(liveLeaveAge, liveRetAge) - liveAge);
  const liveEstCost100   = Math.round(800 * Math.pow(1.042, liveAge - 20));
  const livePeriodicLoading = 1.37; // ~37% more expensive for monthly vs single premium
  const liveCostPer100Base  = parseFloat(form.apCostPer100) || liveEstCost100;
  const liveCostPer100   = form.apPaymentType === 'periodic' && !form.apCostPer100
    ? Math.round(liveEstCost100 * livePeriodicLoading)
    : liveCostPer100Base;
  const liveApMaxContrib = liveLeaveYears > 0
    ? Math.min(Math.round((8571.21 / 100) * liveCostPer100 / liveLeaveYears), 60000)
    : Math.min(Math.round(85 * liveCostPer100), 60000);
  const liveSippNetLimit = liveSalary > 0 ? Math.floor(Math.min(60000, liveSalary) / 1.25) : 0;
  const liveContribRaw    = parseFloat(form.contribution) || 0;
  const liveContrib        = form.contributionFreq === 'monthly' ? liveContribRaw * 12 : liveContribRaw;

  // ── Local Save/Compare State ──
  const [savedCalcs, setSavedCalcs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_savedCalcs') || '[]');
    } catch {
      return [];
    }
  });
  const [compareIdx, setCompareIdx] = useState(null); // index of saved calc to compare
  // Editing state for rename feature
  const [editingIdx, setEditingIdx] = useState(null);
  const [tempNames, setTempNames] = useState(() => savedCalcs.map(c => c.name || c.summary));

  // Save calculations to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('sf_savedCalcs', JSON.stringify(savedCalcs));
  }, [savedCalcs]);

  // Save current calculation
  function handleSaveCalculation() {
    if (!results) return;
    const summary = getCalcSummary(form, results);
    setSavedCalcs(prev => {
      const nextIdx = prev.length + 1;
      return [
        { form: { ...form }, results, summary, ts: Date.now(), name: `Calculation ${nextIdx}` },
        ...prev.slice(0, 9)
      ];
    });
    setTempNames(prev => [`Calculation ${savedCalcs.length + 1}`, ...prev.slice(0, 9)]);
  }

  // Delete a saved calculation
  function handleDeleteSaved(idx) {
    setSavedCalcs(prev => prev.filter((_, i) => i !== idx));
    if (compareIdx === idx) setCompareIdx(null);
  }

  // Load a saved calculation into main view (show all results as if just calculated)
  function handleCompareSaved(idx) {
    if (savedCalcs[idx]) {
      setForm({ ...savedCalcs[idx].form });
      setResults(savedCalcs[idx].results);
      setCompareIdx(null); // Hide compare card
      setTimeout(() => {
        if (taxSummaryRef.current) {
          taxSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  // Render compare card if selected
  function renderCompareCard() {
    if (compareIdx == null || !savedCalcs[compareIdx]) return null;
    const { form: cForm, results: cResults, summary } = savedCalcs[compareIdx];
    return (
      <div className="compare-card">
        <div className="compare-header">Comparison: <span>{summary}</span> <button className="compare-close" onClick={() => setCompareIdx(null)}>✕</button></div>
        <div className="compare-body">
          <div><strong>Net Worth:</strong> {cResults.netWorth ? fmtGBP(cResults.netWorth.totalNetWorth, 0) : '?'}</div>
          <div><strong>Liquid Wealth:</strong> {cResults.netWorth ? fmtGBP(cResults.netWorth.liquidWealth, 0) : '?'}</div>
          <div><strong>ISA Pot:</strong> {cResults.netWorth ? fmtGBP(cResults.netWorth.isaOptPot, 0) : '?'}</div>
          <div><strong>SIPP Pot:</strong> {cResults.netWorth ? fmtGBP(cResults.netWorth.sippOptPot, 0) : '?'}</div>
          <div><strong>Retirement Age:</strong> {cForm.retirementAge}</div>
          <div><strong>Salary:</strong> {fmtGBP(cForm.salary, 0)}</div>
          <div><strong>Contribution:</strong> {fmtGBP(cForm.contribution, 0)} /{cForm.contributionFreq === 'monthly' ? 'mo' : 'yr'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        {/* Removed header-badge bubble helmet/title */}
        <h1 className="main-title-with-helmet">
          <img src={process.env.PUBLIC_URL + '/military-hat.png'} alt="Military Helmet" style={{height: '2.8em', verticalAlign: 'middle', marginRight: '0.7em'}} />
          Soldiers Fortune
        </h1>
        <p>Your one-stop shop for UK Armed Forces personnel to understand, plan, and optimise your finances — including ISA, SIPP, AFPS 15 Added Pension, mortgage, cash reserves, and more. All calculations use real UK tax rules and inflation-adjusted projections.</p>
        <div className="disclaimer-box">
          <span className="disclaimer-icon">⚠️</span>
          <span className="disclaimer-text">This tool is for guidance only. Please seek independent financial advice before making any major decisions.</span>
        </div>
      </header>

      {/* ── Body: 2-col on desktop ── */}
      <div className={`app-body${results ? ' has-results' : ''}`}>
      <div className="app-col-left">

      {/* ── Input Form ── */}
      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '1em' }}>
            <label htmlFor="isServing" style={{ fontWeight: 600 }}>
              <input
                id="isServing"
                name="isServing"
                type="checkbox"
                checked={form.isServing}
                onChange={handleChange}
                style={{ marginRight: '0.5em' }}
              />
              Currently serving in the military (show MOD-specific options)
            </label>
          </div>
          <p className="form-section-label">Your Details</p>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="salary">Annual Salary<span className="required-star">*</span></label>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="salary" name="salary" type="number" placeholder="35000" value={form.salary} onChange={handleChange} required />
            </div>
            </div>
            <div className="form-group">
              <label htmlFor="taxCode">Tax Code <span className="label-hint">(e.g. 1257L, BR, D0, K100)</span></label>
              <input id="taxCode" className="bare-input" name="taxCode" type="text" placeholder="1257L"
                value={form.taxCode} onChange={handleChange} />
              {form.taxCode && (
                <span className="input-hint tax-code-note">{parseTaxCode(form.taxCode).note}</span>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="age">Age<span className="required-star">*</span></label>
              <input id="age" className="bare-input" name="age" type="number" placeholder="35" min="18" max="65" value={form.age} onChange={handleChange} required />
            </div>
            {form.isServing && (
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="yearsService">Years of Reckonable Service <span className="label-hint">(for EDP eligibility only)</span><span className="required-star">*</span></label>
                  <InfoHint>Only used to check EDP eligibility (age 40–59 + 20 yrs service). Has no effect on the Added Pension calculation itself.</InfoHint>
                </div>
                <input id="yearsService" className="bare-input" name="yearsService" type="number" placeholder="10" min="0" max="45" value={form.yearsService} onChange={handleChange} required={form.isServing} />
              </div>
            )}

            {/* Collapsible payslip details */}
            {form.isServing && (
              <div className="form-group payslip-toggle-wrapper" style={{ gridColumn: '1 / -1' }}>
                <button type="button" className={`payslip-toggle-btn ${showPayslipDetails ? 'active' : ''}`}
                  onClick={() => setShowPayslipDetails(prev => !prev)}>
                  <span className="payslip-toggle-icon">{showPayslipDetails ? '▾' : '▸'}</span>
                  🎖️ I have my MOD payslip — fine-tune my tax calculation
                </button>
                <InfoHint>Optional: enter figures from your payslip to get more accurate tax/NI calculations. If you skip this, the app uses your gross salary which is fine for most estimates.</InfoHint>
                {showPayslipDetails && (
                  <div className="payslip-details-panel">
                    <div className="payslip-annual-callout">
                      <strong>⚠️ Use annual (full-year) figures</strong> — from your <strong>March payslip</strong> (year-to-date totals) or your <strong>P60</strong>. Don't use a single month's figures — they won't match the annual tax calculation.
                    </div>
                    <p className="payslip-panel-intro">
                      Your MOD payslip shows both monthly and year-to-date (YTD) columns. Use the <strong>YTD totals</strong> from your final payslip of the tax year (March/April), or your P60. The gaps between Gross, NIable, and Taxable Pay are your pre-tax deductions.
                    </p>
                    <div className="deductions-grid">
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <div className="label-row">
                          <label htmlFor="manualTaxablePay" className="sub-label">Easiest: Actual Taxable Pay <span className="label-hint">(annual YTD from payslip or P60)</span></label>
                          <InfoHint>Just copy the YTD “Taxable Pay” figure from your end-of-year payslip or P60. This is the quickest way — it overrides the two optional fields below.</InfoHint>
                        </div>
                        <div className="input-wrap">
                          <span className="input-prefix">£</span>
                          <input id="manualTaxablePay" name="manualTaxablePay" type="number" placeholder="0" min="0" value={form.manualTaxablePay} onChange={handleChange} />
                          <span className="input-suffix">/yr</span>
                        </div>
                      </div>
                      <div className="deductions-divider">— or break it down manually —</div>
                      <div className="form-group">
                        <div className="label-row">
                          <label htmlFor="salSacrifice" className="sub-label">Salary Sacrifice / Pension Deductions <span className="label-hint">(annual YTD)</span></label>
                          <InfoHint>
                            Annual total: YTD Gross Pay − YTD NIable Pay from your payslip. Includes: Added Pension contributions, SAYE, Cycle to Work, childcare vouchers.
                            {liveSalary > 0 && !form.salSacrifice && <><br/><strong style={{color:'#f59e0b'}}>Tip:</strong> Your gross is {fmtGBP(liveSalary)}. Find your YTD "NIable Pay" — the difference is this field.</>}
                          </InfoHint>
                        </div>
                        <div className="input-wrap">
                          <span className="input-prefix">£</span>
                          <input id="salSacrifice" name="salSacrifice" type="number" placeholder="0" min="0" value={form.salSacrifice} onChange={handleChange} />
                          <span className="input-suffix">/yr</span>
                        </div>
                      </div>
                      <div className="form-group">
                        <div className="label-row">
                          <label htmlFor="flatRateExpenses" className="sub-label">Flat-Rate Employment Expenses <span className="label-hint">(annual)</span></label>
                          <InfoHint>Annual total of HMRC-approved deductions: uniform/laundry allowance (£91.63/yr standard for Armed Forces), professional subscriptions, tools. These reduce taxable pay but NOT NIable pay.</InfoHint>
                        </div>
                        <div className="input-wrap">
                          <span className="input-prefix">£</span>
                          <input id="flatRateExpenses" name="flatRateExpenses" type="number" placeholder="0" min="0" value={form.flatRateExpenses} onChange={handleChange} />
                          <span className="input-suffix">/yr</span>
                        </div>
                      </div>
                    </div>

                    {/* Live payslip reconciliation */}
                    {liveSalary > 0 && (liveSalSac > 0 || liveFlatExp > 0 || liveManualTaxable > 0) && (() => {
                      const niable = liveSalary - liveSalSac;
                      const taxable = liveManualTaxable > 0 ? liveManualTaxable : liveSalary - liveSalSac - liveFlatExp;
                      return (
                        <div className="payslip-reconciliation">
                          <p className="payslip-title">📋 Annual Payslip Reconciliation</p>
                          <div className="payslip-rows">
                            <div className="payslip-row">
                              <span>Gross Pay</span>
                              <span>{fmtGBP(liveSalary)}</span>
                            </div>
                            {liveSalSac > 0 && <div className="payslip-row deduction">
                              <span>− Salary sacrifice / pension</span>
                              <span>−{fmtGBP(liveSalSac)}</span>
                            </div>}
                            <div className="payslip-row subtotal">
                              <span>= NIable Pay</span>
                              <span>{fmtGBP(niable)}</span>
                            </div>
                            {liveFlatExp > 0 && !liveManualTaxable && <div className="payslip-row deduction">
                              <span>− Flat-rate expenses</span>
                              <span>−{fmtGBP(liveFlatExp)}</span>
                            </div>}
                            <div className="payslip-row subtotal">
                              <span>= Taxable Pay</span>
                              <span style={{ color: '#22d3ee', fontWeight: 700 }}>{fmtGBP(taxable)}</span>
                            </div>
                            {liveManualTaxable > 0 && liveSalSac > 0 && liveFlatExp > 0 && Math.abs(taxable - (liveSalary - liveSalSac - liveFlatExp)) > 50 && (
                              <div className="payslip-row note">
                                <span>ℹ️ Manual taxable pay used — differs from calculated by {fmtGBP(Math.abs(taxable - (liveSalary - liveSalSac - liveFlatExp)))}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {form.isServing && (
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="leaveAge">Expected Age When Leaving MOD <span className="label-hint">(for AFPS 15)</span></label>
                  <InfoHint>Leave blank to assume you serve until retirement. AFPS 15 contributions stop at this age.</InfoHint>
                </div>
                <input id="leaveAge" className="bare-input" name="leaveAge" type="number" placeholder={form.retirementAge || '60'} min="18" max="75" value={form.leaveAge} onChange={handleChange} />
              </div>
            )}
            {form.isServing && (
              <div className="form-group">
                <div className="label-row">
                  <label>AFPS 15 Payment Method</label>
                  <InfoHint>
                    {form.apPaymentType === 'periodic'
                      ? 'Monthly salary sacrifice — most common. Costs ~37% more per £100 block than single premium due to time-value loading.'
                      : 'One-off lump sum per year. Cheaper per £100 block but requires a larger upfront payment.'}
                  </InfoHint>
                </div>
                <div className="preset-buttons">
                  <button type="button" className={`preset-btn ${form.apPaymentType === 'periodic' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, apPaymentType: 'periodic' }))}>
                    📅 Monthly (periodic)
                  </button>
                  <button type="button" className={`preset-btn ${form.apPaymentType === 'single' ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, apPaymentType: 'single' }))}>
                    💵 Single Premium (lump sum)
                  </button>
                </div>
              </div>
            )}
            {form.isServing && (
              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="apCostPer100">AFPS 15 Cost per £100/yr Added Pension <span className="label-hint">(from your factor table — optional)</span></label>
                  <InfoHint>
                    The cost to buy £100/yr of added pension for life ({form.apPaymentType === 'periodic' ? 'monthly periodic rate' : 'single premium rate'}).
                    Leave blank to use this age-based estimate. If you have a quote, enter the exact figure here — it overrides the estimate.
                  </InfoHint>
                </div>
                <div className="input-wrap">
                  <span className="input-prefix">£</span>
                  <input id="apCostPer100" name="apCostPer100" type="number" placeholder={form.apPaymentType === 'periodic' ? Math.round(liveEstCost100 * 1.37) : liveEstCost100} min="500" max="20000" step="1" value={form.apCostPer100} onChange={handleChange} />
                </div>
                {liveAge > 0 && (
                  <div className="ap-factor-table">
                    <p className="ap-factor-title">Approximate factors by age ({form.apPaymentType === 'periodic' ? 'periodic ≈ single × 1.37' : 'single premium'})</p>
                    <div className="ap-factor-grid">
                      {[[20,820],[25,1010],[30,1240],[35,1530],[40,1890],[45,2370],[50,3020],[55,3960],[60,5190],[65,6820]].map(([a, cost]) => {
                        const displayCost = form.apPaymentType === 'periodic' ? Math.round(cost * 1.37) : cost;
                        return (
                          <div key={a} className={`ap-factor-cell ${liveAge === a ? 'highlight' : liveAge > a - 3 && liveAge <= a + 2 ? 'nearby' : ''}`}>
                            <span className="ap-factor-age">Age {a}</span>
                            <span className="ap-factor-cost">{fmtGBP(displayCost, 0)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="ap-factor-note">Approximate — actual values from your booklet/quote may differ. Your estimate: <strong style={{color:'#22d3ee'}}>{fmtGBP(form.apPaymentType === 'periodic' ? Math.round(liveEstCost100 * 1.37) : liveEstCost100, 0)}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="form-section-label">Current Pots &amp; Pension Statement <span className="label-hint">(optional — needed for full retirement picture)</span></p>
          <div className="form-grid">
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="existingDbPension">MOD DB Pension — Annual Statement Value <span className="label-hint">(£/yr at retirement)</span></label>
                <InfoHint>The projected annual pension shown on your latest MOD pension statement (your AFPS 15 defined benefit). Enter 0 or leave blank if not yet received.</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="existingDbPension" name="existingDbPension" type="number" placeholder="12000" min="0" value={form.existingDbPension} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="existingIsaPot">Existing ISA Balance</label>
                <InfoHint>Current value of your Stocks &amp; Shares or Cash ISA. Will compound at your chosen growth rate until retirement.</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="existingIsaPot" name="existingIsaPot" type="number" placeholder="5000" min="0" value={form.existingIsaPot} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="existingSippPot">Existing SIPP / Pension Pot Balance</label>
                <InfoHint>Current value of any SIPP or workplace pension. Will compound at your chosen growth rate until retirement.</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="existingSippPot" name="existingSippPot" type="number" placeholder="10000" min="0" value={form.existingSippPot} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* ── Property & Cash Reserves (collapsible) ─────────────────────── */}
          <button
            type="button"
            className={`section-toggle-btn property-toggle${showPropertyDetails ? ' open' : ''}`}
            onClick={() => setShowPropertyDetails(v => !v)}
            aria-expanded={showPropertyDetails}
          >
            <span className="toggle-arrow">{showPropertyDetails ? '▼' : '▶'}</span>
            <span className="toggle-icon">🏠</span>
            <span className="toggle-label">I have a mortgage & cash savings — include in my plan</span>
          </button>
          {showPropertyDetails && (
            <>
              <p className="form-section-label">Property &amp; Mortgage</p>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="propertyValue">Property Value <span className="label-hint">(estimated current market value)</span></label>
                  <div className="input-wrap">
                    <span className="input-prefix">£</span>
                    <input id="propertyValue" name="propertyValue" type="number" placeholder="300000" min="0" value={form.propertyValue} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="mortgageBalance">Mortgage Balance Remaining</label>
                  <div className="input-wrap">
                    <span className="input-prefix">£</span>
                    <input id="mortgageBalance" name="mortgageBalance" type="number" placeholder="200000" min="0" value={form.mortgageBalance} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="mortgageRate">Mortgage Interest Rate</label>
                  <div className="input-wrap">
                    <input id="mortgageRate" name="mortgageRate" type="number" step="0.01" placeholder="4.5" min="0" max="20" value={form.mortgageRate} onChange={handleChange} />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="mortgageTermYears">Remaining Term</label>
                  <div className="input-wrap">
                    <input id="mortgageTermYears" name="mortgageTermYears" type="number" placeholder="25" min="0" max="40" value={form.mortgageTermYears} onChange={handleChange} />
                    <span className="input-suffix">yrs</span>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="monthlyMortgage">Monthly Mortgage Payment</label>
                  <div className="input-wrap">
                    <span className="input-prefix">£</span>
                    <input id="monthlyMortgage" name="monthlyMortgage" type="number" placeholder="1100" min="0" value={form.monthlyMortgage} onChange={handleChange} />
                    <span className="input-suffix">/mo</span>
                  </div>
                </div>
              </div>

              {(() => {
                const pv = parseFloat(form.propertyValue) || 0;
                const mb = parseFloat(form.mortgageBalance) || 0;
                const eq = Math.max(0, pv - mb);
                const ltv = pv > 0 ? (mb / pv) * 100 : 0;
                return pv > 0 ? (
                  <div className="reconciliation-box" style={{ marginTop: '0.5rem' }}>
                    <span>Equity: <strong>{fmtGBP(eq, 0)}</strong></span>
                    <span style={{ marginLeft: '1.5rem' }}>LTV: <strong>{ltv.toFixed(1)}%</strong></span>
                  </div>
                ) : null;
              })()}

              <p className="form-section-label" style={{ marginTop: '1rem' }}>Cash Reserves</p>
              <div className="form-grid">
                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="cashReserve">Current Cash / Emergency Fund</label>
                    <InfoHint>Total easily accessible cash savings (current account + easy-access savings)</InfoHint>
                  </div>
                  <div className="input-wrap">
                    <span className="input-prefix">£</span>
                    <input id="cashReserve" name="cashReserve" type="number" placeholder="10000" min="0" value={form.cashReserve} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <div className="label-row">
                    <label htmlFor="monthlyExpenses">Monthly Living Expenses <span className="label-hint">(exc. mortgage)</span></label>
                    <InfoHint>Used to calculate your emergency fund target (6 months)</InfoHint>
                  </div>
                  <div className="input-wrap">
                    <span className="input-prefix">£</span>
                    <input id="monthlyExpenses" name="monthlyExpenses" type="number" placeholder="2000" min="0" value={form.monthlyExpenses} onChange={handleChange} />
                    <span className="input-suffix">/mo</span>
                  </div>
                </div>
              </div>

              {(() => {
                const me = parseFloat(form.monthlyExpenses) || 0;
                const cr = parseFloat(form.cashReserve) || 0;
                if (me <= 0) return null;
                const target = me * 6;
                const months = me > 0 ? cr / me : 0;
                const ok = cr >= target;
                return (
                  <div className="reconciliation-box" style={{ marginTop: '0.5rem' }}>
                    <span>Emergency fund: <strong style={{ color: ok ? '#34d399' : '#f87171' }}>{months.toFixed(1)} months</strong></span>
                    <span style={{ marginLeft: '1rem' }}>Target: <strong>6 months ({fmtGBP(target, 0)})</strong></span>
                    {!ok && <span style={{ marginLeft: '1rem', color: '#f87171' }}>⚠️ Shortfall: {fmtGBP(target - cr, 0)}</span>}
                    {ok && <span style={{ marginLeft: '1rem', color: '#34d399' }}>✅ Fully funded</span>}
                  </div>
                );
              })()}
            </>
          )}

          <p className="form-section-label">Contribution &amp; Projection Settings</p>
          <div className="form-grid">
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="contribution">Amount to Invest<span className="required-star">*</span></label>
                <InfoHint>
                  {form.contributionFreq === 'monthly'
                    ? `Gross monthly amount — ${fmtGBP(liveContrib, 0)}/yr annualised. Compared across all three options.`
                    : 'Gross annual amount to compare across all three options'}
                </InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="contribution" name="contribution" type="number" placeholder={form.contributionFreq === 'monthly' ? '300' : '3600'} value={form.contribution} onChange={handleChange} required />
                <span className="input-suffix">/{form.contributionFreq === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              <div className="preset-buttons" style={{ marginTop: '0.4rem' }}>
                <button type="button" className={`preset-btn ${form.contributionFreq === 'monthly' ? 'active' : ''}`}
                  onClick={() => {
                    const raw = parseFloat(form.contribution) || 0;
                    setForm(prev => ({
                      ...prev,
                      contributionFreq: 'monthly',
                      contribution: prev.contributionFreq === 'annual' && raw > 0 ? String(Math.round(raw / 12)) : prev.contribution,
                    }));
                  }}>
                  📅 Monthly
                </button>
                <button type="button" className={`preset-btn ${form.contributionFreq === 'annual' ? 'active' : ''}`}
                  onClick={() => {
                    const raw = parseFloat(form.contribution) || 0;
                    setForm(prev => ({
                      ...prev,
                      contributionFreq: 'annual',
                      contribution: prev.contributionFreq === 'monthly' && raw > 0 ? String(raw * 12) : prev.contribution,
                    }));
                  }}>
                  📆 Annual
                </button>
              </div>
              {liveContrib > 0 && (
                <div className="live-limits">
                  {liveContrib > 20000 && <span className="limit-warn">⚠️ ISA: exceeds £20,000/yr allowance</span>}
                  {liveSippNetLimit > 0 && liveContrib > liveSippNetLimit && <span className="limit-warn">⚠️ SIPP: exceeds your Annual Allowance net limit of {fmtGBP(liveSippNetLimit)}</span>}
                  {form.isServing && liveContrib > liveApMaxContrib && <span className="limit-warn">⚠️ AFPS 15: exceeds max contribution of ~{fmtGBP(liveApMaxContrib)}/yr for your age</span>}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="retirementAge">Target Retirement Age<span className="required-star">*</span></label>
              <input id="retirementAge" className="bare-input" name="retirementAge" type="number" placeholder="60" min="40" max="75" value={form.retirementAge} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="statePensionAge">State Pension Age</label>
                <InfoHint>Currently 66, rising to 67 by 2028. DB pension and State Pension will only appear in the chart from this age.</InfoHint>
              </div>
              <input id="statePensionAge" className="bare-input" name="statePensionAge" type="number" placeholder="67" min="60" max="75" value={form.statePensionAge} onChange={handleChange} />
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="statePension">State Pension (annual) <span className="label-hint">(optional)</span></label>
                <InfoHint>Full new State Pension is £11,502/yr (2025/26). Check your forecast at gov.uk/check-state-pension.</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="statePension" name="statePension" type="number" placeholder="11502" min="0" value={form.statePension} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="targetIncome">Target Annual Retirement Income <span className="required-star">*</span></label>
                <InfoHint>Used to calculate your FIRE number (25× rule)</InfoHint>
              </div>
              <div className="input-wrap">
                <span className="input-prefix">£</span>
                <input id="targetIncome" name="targetIncome" type="number" placeholder="25000" value={form.targetIncome} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="returnRate">Expected Annual Return (nominal) <span className="label-hint">(before inflation)</span><span className="required-star">*</span></label>
              <input id="returnRate" className="bare-input" name="returnRate" type="number" placeholder="0.07" min="0" max="0.20" step="0.01" value={form.returnRate} onChange={handleChange} required />
              <div className="preset-buttons">
                {RETURN_PRESETS.map(p => (
                  <button key={p.value} type="button" className={`preset-btn ${parseFloat(form.returnRate) === p.value ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, returnRate: String(p.value) }))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="inflationRate">Expected Inflation Rate<span className="required-star">*</span></label>
                <InfoHint>Bank of England target is 2%. All projections shown in today's purchasing power after adjusting for inflation.</InfoHint>
              </div>
              <input id="inflationRate" className="bare-input" name="inflationRate" type="number" placeholder="0.025" min="0" max="0.10" step="0.005" value={form.inflationRate} onChange={handleChange} required />
              <div className="preset-buttons">
                {INFLATION_PRESETS.map(p => (
                  <button key={p.value} type="button" className={`preset-btn ${parseFloat(form.inflationRate) === p.value ? 'active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, inflationRate: String(p.value) }))}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live tax preview */}
          {liveMarginal !== null && (
            <div className="tax-info-bar">
              <span>📊 Marginal income tax: <strong style={{ color: liveMarginal >= 0.60 ? '#fb923c' : liveMarginal >= 0.40 ? '#f472b6' : '#22d3ee' }}>{fmtPct(liveMarginal)}</strong></span>
              <span>👷 NI: <strong>{fmtPct(liveNI)}</strong></span>
              <span>💸 Combined: <strong>{fmtPct(liveMarginal + liveNI)}</strong></span>
              {liveMarginal >= 0.60 && <span className="tax-warning">⚠️ You're in the 60% PA taper trap!</span>}
              {liveHasDeductions && (
                <span className="tax-band-label">
                  (on {fmtGBP(liveTaxBasis, 0)} taxable — {fmtGBP(liveSalary - liveTaxBasis, 0)} in pre-tax deductions)
                </span>
              )}
              <span className="tax-band-label">
                {liveMarginal === 0    && '(Below personal allowance)'}
                {liveMarginal === 0.20 && '(Basic rate)'}
                {liveMarginal === 0.40 && '(Higher rate)'}
                {liveMarginal === 0.60 && '(PA taper zone — effective 60%)'}
                {liveMarginal === 0.45 && '(Additional rate)'}
              </span>
            </div>
          )}

          {liveSalary > 0 && (
            <div className="tax-info-bar" style={{ marginTop: '0.5rem' }}>
              <span>📈 Nominal return: <strong>{fmtPct(liveNominal, 1)}</strong>/yr</span>
              <span>📉 Inflation: <strong>{fmtPct(liveInflation, 1)}</strong>/yr</span>
              <span>💹 Real return: <strong style={{ color: '#22d3ee' }}>{fmtPct(liveRealReturn, 1)}</strong>/yr</span>
              <span className="tax-band-label">(all projections in today's money)</span>
            </div>
          )}

          <button className="btn-calculate" type="submit" disabled={!form.targetIncome}>Calculate My Best Option →</button>
        </form>
      </div>

      {/* ── Save/Compare Controls ── */}
      <div className="save-compare-bar">
        <button className="btn-save-calc" onClick={handleSaveCalculation} disabled={!results}>💾 Save Calculation</button>
        {savedCalcs.length > 0 && (
          <div className="saved-list-vertical">
            <span className="saved-list-title">Saved Calculations</span>
            <ul className="saved-list-ul">
              {savedCalcs.map((c, i) => {
                const editing = editingIdx === i;
                const tempName = tempNames[i] || c.name || c.summary;
                function handleRenameStart() {
                  setEditingIdx(i);
                  setTempNames(prev => prev.map((n, idx) => idx === i ? c.name || c.summary : n));
                }
                function handleRenameSave() {
                  setEditingIdx(null);
                  setSavedCalcs(prev => prev.map((item, idx) => {
                    if (idx === i) {
                      let newName = tempName.trim();
                      if (newName === '') {
                        newName = `Calculation ${idx + 1}`;
                      }
                      return { ...item, name: newName };
                    }
                    return item;
                  }));
                }
                function handleRenameCancel() {
                  setEditingIdx(null);
                  setTempNames(prev => prev.map((n, idx) => idx === i ? c.name || c.summary : n));
                }
                return (
                  <li key={c.ts} className={`saved-item-vertical${i === compareIdx ? ' selected' : ''}`}> 
                    <div className="saved-item-main">
                      <button className="saved-item-summary" onClick={() => handleCompareSaved(i)}>{c.name && c.name.trim() !== '' ? c.name : c.summary}</button>
                      <button className="delete-btn" onClick={() => handleDeleteSaved(i)} title="Delete">🗑️</button>
                    </div>
                    <div className="saved-item-actions">
                      {!editing ? (
                        <button className="rename-btn" title="Rename calculation" onClick={handleRenameStart}>✏️ Rename</button>
                      ) : (
                        <>
                          <input
                            className="rename-input"
                            value={tempName}
                            onChange={e => setTempNames(prev => prev.map((n, idx) => idx === i ? e.target.value : n))}
                            autoFocus
                          />
                          <button className="rename-btn" style={{color:'#10b981'}} onClick={handleRenameSave} title="Save name">💾 Save</button>
                          <button className="rename-btn" style={{color:'#f87171'}} onClick={handleRenameCancel} title="Cancel rename">✖️ Cancel</button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {renderCompareCard()}
      </div>{/* end app-col-left */}

      <div className="app-col-right">
      {/* ── Results ── */}
      {results && (
        <div className="results-section">

          {/* Tax summary */}
          <div className="tax-summary-card" ref={taxSummaryRef}>
            <p className="form-section-label" style={{ marginBottom: '1rem' }}>Your Tax Summary (2025/26)</p>
            <div className="tax-summary-grid">
              {results.taxSummary.hasDeductions && (
                <>
                  <div className="tax-summary-item">
                    <span className="ts-label">Gross Pay</span>
                    <span className="ts-value">{fmtGBP(results.salary)}</span>
                    <span className="ts-sub">
                      {results.taxSummary.salSacrifice > 0 && `−${fmtGBP(results.taxSummary.salSacrifice)} sal. sacrifice`}
                      {results.taxSummary.salSacrifice > 0 && results.taxSummary.flatRateExpenses > 0 && ', '}
                      {results.taxSummary.flatRateExpenses > 0 && `−${fmtGBP(results.taxSummary.flatRateExpenses)} expenses`}
                    </span>
                  </div>
                  <div className="tax-summary-item">
                    <span className="ts-label">Taxable Pay</span>
                    <span className="ts-value">{fmtGBP(results.taxSummary.adjustedSalary)}</span>
                    <span className="ts-sub">{fmtGBP(results.salary - results.taxSummary.adjustedSalary)} sheltered from tax</span>
                  </div>
                </>
              )}
              <div className="tax-summary-item">
                <span className="ts-label">Personal Allowance</span>
                <span className="ts-value">{results.taxSummary.taxInfo.pa <= 0 ? 'None' : fmtGBP(results.taxSummary.effectivePA)}</span>
                {results.taxSummary.effectivePA !== results.taxSummary.taxInfo.pa && results.taxSummary.taxInfo.pa > 0 && (
                  <span className="ts-sub">Tapered from {fmtGBP(results.taxSummary.taxInfo.pa)}</span>
                )}
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">Income Tax</span>
                <span className="ts-value negative">{fmtGBP(results.taxSummary.incomeTax)}</span>
                <span className="ts-sub">Effective rate: {fmtPct(results.taxSummary.effectiveTaxRate, 1)}</span>
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">National Insurance</span>
                <span className="ts-value negative">{fmtGBP(results.taxSummary.ni)}</span>
                {results.taxSummary.hasDeductions && (
                  <span className="ts-sub">On NIable pay of {fmtGBP(results.taxSummary.niableSalary)}</span>
                )}
              </div>
              <div className="tax-summary-item">
                <span className="ts-label">Take-home Pay</span>
                <span className="ts-value positive">{fmtGBP(results.taxSummary.takeHome)}</span>
                <span className="ts-sub">Marginal rate: {fmtPct(results.taxSummary.marginalRate)}{results.taxSummary.marginalRate >= 0.60 ? ' ⚠️' : ''} | {fmtGBP(results.taxSummary.takeHome / 12, 0)}/mo</span>
              </div>
            </div>
            {results.taxSummary.taxInfo.note && (
              <div className="tax-code-info">
                <span>🏷️ Tax code: {results.taxSummary.taxInfo.note}</span>
              </div>
            )}
          </div>

          {/* FIRE number */}
          {results.fireNumber > 0 && form.targetIncome && parseFloat(form.targetIncome) > 0 && (
            <div className="fire-card">
              <div className="fire-header">
                <span className="fire-emoji">🔥</span>
                <div>
                  <p className="fire-label">Your FIRE Number (25× rule)</p>
                  <p className="fire-number">{fmtGBP(results.fireNumber)}</p>
                </div>
              </div>
              <p className="fire-sub">
                Based on a 4% safe withdrawal rate — you need {fmtGBP(results.fireNumber)} in today's money to sustainably withdraw {fmtGBP(results.fireNumber / 25, 0)}/yr.
                All projections adjusted for {fmtPct(results.inflationRate, 1)}/yr inflation (real growth: {fmtPct(results.realReturnRate, 1)}/yr).
              </p>
            </div>
          )}

          {/* Action Plan */}
          <ActionPlanCard results={results} />

          {/* Retirement Income Timeline */}
          <RetirementTimelineChart results={results} form={form} />

          {/* Total Wealth */}
          <TotalWealthChart results={results} form={form} />

          {/* Total Retirement Picture */}
          <RetirementPictureCard results={results} isServing={form.isServing} />

          {/* Mortgage vs Invest Analysis */}
          {results.mortgageAnalysis && (
            <div className="mortgage-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>🏠 Mortgage vs Invest Analysis</p>
              <div className="mortgage-verdict">
                <span className={`mortgage-verdict-badge ${results.mortgageAnalysis.shouldOverpay ? 'overpay' : 'invest'}`}>
                  {results.mortgageAnalysis.shouldOverpay ? '🏠 Overpay Mortgage' : '📈 Invest Instead'}
                </span>
                <p className="mortgage-verdict-text">{results.mortgageAnalysis.verdict}</p>
              </div>
              <div className="tax-summary-grid" style={{ marginTop: '1rem' }}>
                <div className="tax-summary-item">
                  <span className="ts-label">Property Value</span>
                  <span className="ts-value">{fmtGBP(results.mortgageAnalysis.propertyValue, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Mortgage Balance</span>
                  <span className="ts-value negative">{fmtGBP(results.mortgageAnalysis.mortgageBalance, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Current Equity</span>
                  <span className="ts-value positive">{fmtGBP(results.mortgageAnalysis.equityNow, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Mortgage Rate</span>
                  <span className="ts-value">{fmtPct(results.mortgageAnalysis.mortgageRate, 2)}</span>
                  <span className="ts-sub">Guaranteed return if overpaying</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Real Investment Return</span>
                  <span className="ts-value">{fmtPct(results.realReturnRate, 2)}</span>
                  <span className="ts-sub">Expected (not guaranteed)</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Est. Total Interest Cost</span>
                  <span className="ts-value negative">{fmtGBP(results.mortgageAnalysis.totalInterestEst, 0)}</span>
                  <span className="ts-sub">Over remaining {results.mortgageAnalysis.mortgageTermYears}yr term</span>
                </div>
                {results.mortgageAnalysis.mortgagePaidOffAge && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Mortgage Paid Off</span>
                    <span className="ts-value">Age {results.mortgageAnalysis.mortgagePaidOffAge}</span>
                    <span className="ts-sub">{results.mortgageAnalysis.mortgagePaidOffAge <= results.retirementAge ? '✅ Before retirement' : '⚠️ After retirement'}</span>
                  </div>
                )}
              </div>
              <div className="mortgage-note">
                <p>💡 <strong>Key insight:</strong> Mortgage overpayment gives a <em>guaranteed, risk-free, tax-free</em> return equal to your mortgage rate.
                Investment returns are uncertain. Even if expected returns are higher, the risk-free nature of mortgage overpayment has real value.</p>
                <p style={{ marginTop: '0.5rem' }}>🎯 <strong>Suggested priority:</strong> Emergency fund (6 months) → {results.mortgageAnalysis.shouldOverpay ? 'Mortgage overpayment → ISA/SIPP' : 'AP/SIPP/ISA (per Action Plan) → Mortgage overpayment'}</p>
              </div>
            </div>
          )}

          {/* Cash Reserves */}
          {results.cashAnalysis && (
            <div className="cash-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>🏦 Cash Reserve Health</p>
              <div className="tax-summary-grid">
                <div className="tax-summary-item">
                  <span className="ts-label">Cash Reserves</span>
                  <span className="ts-value">{fmtGBP(results.cashAnalysis.cashReserve, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Monthly Expenses</span>
                  <span className="ts-value">{fmtGBP(results.cashAnalysis.monthlyExpenses, 0)}/mo</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">Emergency Cover</span>
                  <span className={`ts-value ${results.cashAnalysis.emergencyOk ? 'positive' : 'negative'}`}>
                    {results.cashAnalysis.monthlyExpenses > 0 ? `${(results.cashAnalysis.cashReserve / results.cashAnalysis.monthlyExpenses).toFixed(1)} months` : '—'}
                  </span>
                  <span className="ts-sub">Target: 6 months ({fmtGBP(results.cashAnalysis.emergencyTarget, 0)})</span>
                </div>
                {results.cashAnalysis.emergencyShortfall > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Shortfall</span>
                    <span className="ts-value negative">{fmtGBP(results.cashAnalysis.emergencyShortfall, 0)}</span>
                    <span className="ts-sub">⚠️ Build this before investing</span>
                  </div>
                )}
              </div>
              {!results.cashAnalysis.emergencyOk && results.cashAnalysis.monthlyExpenses > 0 && (
                <div className="mortgage-note" style={{ marginTop: '0.75rem' }}>
                  <p>⚠️ <strong>Priority:</strong> Your emergency fund covers less than 6 months of expenses. Build this up in easy-access savings <em>before</em> investing or making mortgage overpayments.</p>
                </div>
              )}
            </div>
          )}

          {/* Net Worth Summary */}
          {(results.netWorth.totalNetWorth > 0) && (
            <div className="networth-card">
              <p className="form-section-label" style={{ marginBottom: '1rem' }}>💰 Projected Net Worth at Retirement</p>
              <div className="tax-summary-grid">
                <div className="tax-summary-item">
                  <span className="ts-label">ISA Pot</span>
                  <span className="ts-value">{fmtGBP(results.netWorth.isaOptPot, 0)}</span>
                </div>
                <div className="tax-summary-item">
                  <span className="ts-label">SIPP Pot</span>
                  <span className="ts-value">{fmtGBP(results.netWorth.sippOptPot, 0)}</span>
                </div>
                {results.netWorth.apOptPot > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Added Pension (commuted)</span>
                    <span className="ts-value">{fmtGBP(results.netWorth.apOptPot, 0)}</span>
                    <span className="ts-sub">DB value — not a pot you can access</span>
                  </div>
                )}
                {results.netWorth.propertyEquityAtRetirement > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Property Equity</span>
                    <span className="ts-value">{fmtGBP(results.netWorth.propertyEquityAtRetirement, 0)}</span>
                  </div>
                )}
                {results.netWorth.cashAtRetirement > 0 && (
                  <div className="tax-summary-item">
                    <span className="ts-label">Cash (nominal)</span>
                    <span className="ts-value">{fmtGBP(results.netWorth.cashAtRetirement, 0)}</span>
                    <span className="ts-sub">Eroded by inflation if not invested</span>
                  </div>
                )}
                <div className="tax-summary-item" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
                  <span className="ts-label" style={{ fontWeight: 700 }}>Liquid Wealth (ISA + SIPP)</span>
                  <span className="ts-value positive" style={{ fontSize: '1.15rem' }}>{fmtGBP(results.netWorth.liquidWealth, 0)}</span>
                </div>
                <div className="tax-summary-item" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
                  <span className="ts-label" style={{ fontWeight: 700 }}>Total Net Worth</span>
                  <span className="ts-value positive" style={{ fontSize: '1.25rem' }}>{fmtGBP(results.netWorth.totalNetWorth, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="recommendation-card">
            <div className="rec-header">
              <span className="rec-badge">Best Option</span>
              <h2>{results.recommendation.best.icon} {results.recommendation.best.name}</h2>
            </div>
            <p className="rec-reason">{results.recommendation.reason}</p>
            <div className="rec-stats">
              <div className="rec-stat">
                <span className="rec-stat-label">Net cost to you</span>
                <span className="rec-stat-value">{fmtGBP(results.recommendation.best.costToYou)}</span>
              </div>
              <div className="rec-stat">
                <span className="rec-stat-label">Efficiency score</span>
                <span className="rec-stat-value rec-efficiency">{results.recommendation.best.efficiency.toFixed(2)}×</span>
              </div>
              <div className="rec-stat">
                <span className="rec-stat-label">Projected pot</span>
                <span className="rec-stat-value">{fmtGBP(results.recommendation.best.potAtRetirement)}</span>
              </div>
              <div className="rec-stat">
                <span className="rec-stat-label">Annual income</span>
                <span className="rec-stat-value">{fmtGBP(results.recommendation.best.annualIncomeAtRetirement, 0)}/yr</span>
              </div>
            </div>
          </div>

          {/* Mix analysis */}
          <MixCard
            mixData={results.mixData}
            taxRate={results.taxSummary.marginalRate}
            contribution={parseFloat(form.contribution) || 0}
            years={results.years}
          />

          {/* Full comparison */}
          <p className="results-heading">Full Comparison ({results.years} years — all values in today's money at {fmtPct(results.realReturnRate, 1)}/yr real growth)</p>
          <div className="results-grid">
            {results.options.map(o => (
              <ResultCard key={o.id} option={o} maxEfficiency={results.maxEfficiency} years={results.years} />
            ))}
          </div>

          <p className="disclaimer">
            ⚠️ Illustrative only. All values in today's purchasing power (adjusted for {fmtPct(parseFloat(form.inflationRate) || 0.025, 1)}/yr inflation).
            Uses 2025/26 UK tax rates. Investment returns are not guaranteed. AFPS 15 and State Pension are CPI-linked (constant in real terms). Seek independent financial advice.
          </p>
        </div>
      )}
      </div>{/* end app-col-right */}
      </div>{/* end app-body */}
    </div>
  );
}

export default App;
