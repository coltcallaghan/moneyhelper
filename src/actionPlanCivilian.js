// Action Plan logic for civilian / non-MOD users
export function buildCivilianActionPlan({
  contribution, years, realReturnRate, taxRate, niRate, age, retirementAge,
  sippNetLimit, fmtGBP, fmtPct, projectPot, alreadyLeft, optMode = 'maxReturn'
}) {
  // Civilian plan never offers AFPS Added Pension — allocate based on optimization mode
  // maxReturn: SIPP -> ISA -> GIA (prioritizes tax efficiency)
  // targetRetirement: ISA -> SIPP -> GIA (prioritizes accessible income at retirement age)
  function buildPhaseSteps(budget, phaseYears) {
    const steps = [];
    let remaining = budget;

    // Helper to build SIPP step
    const buildSIPPStep = (maxBudget) => {
      if (maxBudget <= 0) return null;

      const paFilledPotLocal = 12570 / (0.75 * 0.04);
      const fvFactorLocal = (phaseYears > 0 && realReturnRate !== 0)
        ? ((Math.pow(1 + realReturnRate, phaseYears) - 1) / realReturnRate) * (1 + realReturnRate)
        : phaseYears;
      const sippMaxForPALocal = Math.min((paFilledPotLocal / fvFactorLocal) / 1.25, maxBudget);

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
    };

    // Helper to build ISA step
    const buildISAStep = (maxBudget) => {
      if (maxBudget <= 0) return null;

      const isaAlloc = Math.min(maxBudget, 20000);
      const isaPotEst = projectPot(isaAlloc, phaseYears, realReturnRate);
      return {
        vehicle: 'Stocks & Shares ISA', icon: '💰', color: '#3b82f6', priority: 3,
        gross: isaAlloc, netCost: isaAlloc, saving: 0,
        outcome: `Grows tax-free to ${fmtGBP(isaPotEst, 0)} → ${fmtGBP(isaPotEst * 0.04, 0)}/yr income over ${phaseYears} yrs`,
        reason: 'Tax-free growth and withdrawals. No lock-in — accessible at any age. Great for bridging to pension age 57.',
        note: isaAlloc >= 20000 && maxBudget > 20000
          ? `⚠️ ISA limit is £20,000/yr. The remaining ${fmtGBP(maxBudget - 20000)} would need a GIA.`
          : null,
        netAlloc: isaAlloc,
      };
    };

    // Build in appropriate order based on mode
    if (optMode === 'maxReturn') {
      // Max Return: SIPP first (tax efficiency maximises long-run pot), then ISA
      const sippStep = buildSIPPStep(remaining);
      if (sippStep) {
        steps.push(sippStep);
        remaining -= sippStep.netAlloc;
      }
      const isaStep = buildISAStep(remaining);
      if (isaStep) {
        steps.push(isaStep);
        remaining -= isaStep.netAlloc;
      }
    } else {
      // Earliest FIRE & Target Retirement: ISA first (accessible at any age), then SIPP
      const isaStep = buildISAStep(remaining);
      if (isaStep) {
        steps.push(isaStep);
        remaining -= isaStep.netAlloc;
      }
      const sippStep = buildSIPPStep(remaining);
      if (sippStep) {
        steps.push(sippStep);
        remaining -= sippStep.netAlloc;
      }
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

  // For civilians: treat entire time horizon as a single phase
  const phases = [];
  const totalYears = years > 0 ? years : Math.max(0, retirementAge - age);
  if (totalYears > 0) {
    const steps = buildPhaseSteps(contribution, totalYears);
    const modeLabel = optMode === 'maxReturn'
      ? `Exactly how to allocate your ${fmtGBP(contribution)}/yr for maximum efficiency`
      : optMode === 'earliestFire'
        ? `How to allocate your ${fmtGBP(contribution)}/yr for earliest possible retirement`
        : `How to allocate your ${fmtGBP(contribution)}/yr to reach your target retirement age`;
    phases.push({
      label: modeLabel,
      subtitle: `${totalYears} year${totalYears !== 1 ? 's' : ''}`,
      years: totalYears, icon: '📋', steps,
      totalGross: steps.reduce((s, st) => s + st.gross, 0),
      totalNet: steps.reduce((s, st) => s + st.netCost, 0),
    });
  }

  const allSteps = phases.flatMap(p => p.steps);
  const totalGross = allSteps.reduce((s, st) => s + st.gross, 0);
  const totalNet = allSteps.reduce((s, st) => s + st.netCost, 0);

  return {
    phases,
    totalGross: contribution,
    totalNet: phases.reduce((s, p) => s + p.totalNet, 0),
    totalSaved: totalGross - totalNet,
    alreadyLeft,
  };
}

