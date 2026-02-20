// Action Plan logic for MOD (serving) users
export function buildMODActionPlan({
  contribution, years, realReturnRate, taxRate, niRate, age, leaveAge, retirementAge,
  apPaymentType, apCostPer100, sippNetLimit, fmtGBP, fmtPct, projectPot,
  addedPension, apMaxContrib, costPer100actual, AP_LIFETIME_MAX, alreadyLeft, yearsService
}) {
  // Local helpers and variables (mirror previous in-file logic)
  const leaveYears = addedPension ? addedPension.leaveYears : Math.max(0, Math.min(leaveAge, retirementAge) - age);

  function buildPhaseSteps(budget, includeAP, phaseYears) {
    const steps = [];
    let remaining = budget;

    // AP — only if still serving in this phase
    if (includeAP && !alreadyLeft && leaveYears > 0 && remaining > 0) {
      const apAlloc = Math.min(remaining, apMaxContrib);
      if (apAlloc > 0) {
        const apNet = apAlloc * (1 - taxRate - niRate);
        const apSaved = apAlloc - apNet;
        const apBPY = apAlloc / costPer100actual;
        const apPensionForPhase = Math.min(apBPY * 100, AP_LIFETIME_MAX);
        steps.push({
          vehicle: 'AFPS 15 Added Pension', icon: '🎖️', color: '#10b981', priority: 1,
          gross: apAlloc, netCost: apNet, saving: apSaved,
          outcome: `Buys ${fmtGBP(apPensionForPhase, 0)}/yr guaranteed CPI-linked pension for life`,
          reason: `Salary sacrifice saves ${fmtPct(taxRate)} income tax + ${fmtPct(niRate)} NI = ${fmtPct(taxRate + niRate)} total. Every ${fmtGBP(1)} gross costs just ${fmtGBP(1 - taxRate - niRate, 2)} net.`,
          note: apAlloc >= apMaxContrib
            ? `Capped at ~${fmtGBP(apMaxContrib)}/yr to stay within the ${fmtGBP(AP_LIFETIME_MAX, 0)}/yr career limit on pension receivable over ${leaveYears} years.`
            : null,
        });
        remaining -= apAlloc;
      }
    }

    // SIPP
    const paFilledPotLocal = 12570 / (0.75 * 0.04);
    const fvFactorLocal = (phaseYears > 0 && realReturnRate !== 0)
      ? ((Math.pow(1 + realReturnRate, phaseYears) - 1) / realReturnRate) * (1 + realReturnRate)
      : phaseYears;
    const sippMaxForPALocal = Math.min((paFilledPotLocal / fvFactorLocal) / 1.25, remaining);

    if (remaining > 0) {
      let sippAlloc;
      let sippReason;

      if (taxRate >= 0.40) {
        sippAlloc = Math.min(remaining, sippNetLimit);
        sippReason = taxRate >= 0.60
          ? `60% taper trap — SIPP saves 60% now, ~20% tax in retirement = permanent 40% saving per £1.`
          : `Higher-rate: ${fmtPct(taxRate)} relief now vs ~20% in retirement = permanent ${fmtPct(taxRate - 0.20)} saving.`;
      } else if (taxRate >= 0.20) {
        sippAlloc = Math.min(remaining, Math.max(0, sippMaxForPALocal), sippNetLimit);
        sippReason = sippMaxForPALocal < remaining
          ? `Basic-rate: SIPP top-up is best up to where retirement drawdown stays within your £12,570 PA (no tax). Beyond this, ISA avoids the 20% withdrawal tax.`
          : `Basic-rate: all SIPP drawdown stays within PA at retirement — the 25% govt top-up is pure profit.`;
      } else {
        sippAlloc = Math.min(remaining, Math.max(0, sippMaxForPALocal), sippNetLimit);
        sippReason = `The SIPP's 25% government top-up applies even at 0% tax. Keep drawdown within PA.`;
      }

      if (sippAlloc > 0) {
        const sAlloc = Math.round(sippAlloc);
        const sGross = sAlloc * 1.25;
        const sExtra = taxRate > 0.20 ? sGross * (taxRate - 0.20) : 0;
        const sNet = sAlloc - sExtra;
        const sSaved = sAlloc - sNet;
        const sGovTopUp = sGross - sAlloc;
        const sPotEst = projectPot(sGross, phaseYears, realReturnRate);
        steps.push({
          vehicle: 'SIPP (Private Pension)', icon: '🏦', color: '#8b5cf6', priority: 2,
          gross: sAlloc, netCost: sNet, saving: sSaved, govTopUp: sGovTopUp,
          outcome: `${fmtGBP(sAlloc)} net → ${fmtGBP(sGross)} invested (govt adds ${fmtGBP(sGovTopUp)}) → grows to ${fmtGBP(sPotEst, 0)} over ${phaseYears} yrs`,
          reason: sippReason,
          note: taxRate > 0.20 ? `Claim ${fmtGBP(sExtra, 0)}/yr back via Self Assessment.` : null,
        });
        remaining -= sAlloc;
      }
    }

    // ISA
    if (remaining > 0) {
      const isaAlloc = Math.min(remaining, 20000);
      const isaPotEst = projectPot(isaAlloc, phaseYears, realReturnRate);
      steps.push({
        vehicle: 'Stocks & Shares ISA', icon: '💰', color: '#3b82f6', priority: 3,
        gross: isaAlloc, netCost: isaAlloc, saving: 0,
        outcome: `Grows tax-free to ${fmtGBP(isaPotEst, 0)} → ${fmtGBP(isaPotEst * 0.04, 0)}/yr income over ${phaseYears} yrs`,
        reason: 'Tax-free growth and withdrawals. No lock-in — accessible at any age. Great for bridging to pension age 57.',
        note: isaAlloc >= 20000 && remaining > 20000
          ? `⚠️ ISA limit is £20,000/yr. The remaining ${fmtGBP(remaining - 20000)} would need a GIA.`
          : null,
      });
      remaining -= isaAlloc;
    }

    // GIA overflow
    if (remaining > 0) {
      steps.push({
        vehicle: 'General Investment Account', icon: '📊', color: '#94a3b8', priority: 4,
        gross: remaining, netCost: remaining, saving: 0,
        outcome: `Invest in a GIA — gains subject to CGT (£3,000 exempt). Dividends taxed above £1,000.`,
        reason: 'All tax-advantaged wrappers full. A GIA still grows wealth, just without a tax shelter.',
        note: null,
      });
    }

    return steps;
  }

  // Determine phases
  const phases = [];
  const servingUntil = Math.min(Math.max(leaveAge, age), retirementAge);
  const servingYears = Math.max(0, servingUntil - age);
  const postLeaveYears = Math.max(0, retirementAge - servingUntil);

  if (!alreadyLeft && servingYears > 0) {
    const phase1Steps = buildPhaseSteps(contribution, true, servingYears);
    phases.push({
      label: `While Serving (age ${age}–${servingUntil})`,
      subtitle: `${servingYears} year${servingYears !== 1 ? 's' : ''} — includes AFPS 15 Added Pension via salary sacrifice`,
      years: servingYears, icon: '🎖️',
      steps: phase1Steps,
      totalGross: phase1Steps.reduce((s, st) => s + st.gross, 0),
      totalNet: phase1Steps.reduce((s, st) => s + st.netCost, 0),
    });
  }

  if (postLeaveYears > 0 || alreadyLeft) {
    const phase2Years = alreadyLeft ? years : postLeaveYears;
    const phase2Start = alreadyLeft ? age : servingUntil;
    if (phase2Years > 0) {
      const phase2Steps = buildPhaseSteps(contribution, false, phase2Years);
      phases.push({
        label: alreadyLeft
          ? `Now to Retirement (age ${phase2Start}–${retirementAge})`
          : `After Leaving MOD (age ${phase2Start}–${retirementAge})`,
        subtitle: alreadyLeft
          ? `${phase2Years} year${phase2Years !== 1 ? 's' : ''} — no AP available, redirect full budget to SIPP + ISA`
          : `${phase2Years} year${phase2Years !== 1 ? 's' : ''} — AP no longer available, full ${fmtGBP(contribution)}/yr redirected to SIPP + ISA`,
        years: phase2Years, icon: alreadyLeft ? '📋' : '🔄',
        steps: phase2Steps,
        totalGross: phase2Steps.reduce((s, st) => s + st.gross, 0),
        totalNet: phase2Steps.reduce((s, st) => s + st.netCost, 0),
      });
    }
  }

  const allSteps = phases.flatMap(p => p.steps);
  const apTotalGross = allSteps.reduce((s, st) => s + st.gross, 0);
  const apTotalNet = allSteps.reduce((s, st) => s + st.netCost, 0);
  const apTotalSaved = apTotalGross - apTotalNet;

  return {
    phases,
    totalGross: contribution,
    totalNet: phases.reduce((s, p) => s + p.totalNet, 0),
    totalSaved: apTotalSaved,
    alreadyLeft,
  };
}

