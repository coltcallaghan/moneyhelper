import { buildSIPPStep, buildISAStep, buildGIAStep, allocateSippIsaInOrder } from './utils/allocationEngine';

// Action Plan logic for MOD (serving) users
export function buildMODActionPlan({
  contribution, years, realReturnRate, taxRate, niRate, age, leaveAge, retirementAge,
  apPaymentType, apCostPer100, sippNetLimit, fmtGBP, fmtPct, projectPot,
  addedPension, apMaxContrib, costPer100actual, AP_LIFETIME_MAX, alreadyLeft, yearsService, optMode = 'maxReturn'
}) {
  // Local helpers and variables (mirror previous in-file logic)
  const leaveYears = addedPension ? addedPension.leaveYears : Math.max(0, Math.min(leaveAge, retirementAge) - age);

  function buildPhaseSteps(budget, includeAP, phaseYears) {
    const steps = [];
    let remaining = budget;

      // AP — only if still serving in this phase. Decide dynamically whether AP
      // is actually more efficient than SIPP for this budget; avoid always
      // prioritising AP just because it's available.
      // Critical: AP is not accessible until State Pension Age (67). If retiring before 67,
      // the pension is locked away and inaccessible. This makes AP poor for early retirement.
      const yearsUntilSPA = Math.max(0, 67 - age);
      const retiresTooEarlyForAP = retirementAge < 67;
      const skipAPForEarlyRetire = (optMode === 'earliestFire' || optMode === 'targetRetirement') && retiresTooEarlyForAP;

      if (includeAP && !alreadyLeft && leaveYears > 0 && remaining > 0 && !skipAPForEarlyRetire) {
        const apAlloc = Math.min(remaining, apMaxContrib);
        if (apAlloc > 0) {
          const apNet = apAlloc * (1 - taxRate - niRate);
          const apSaved = apAlloc - apNet;
          const apBPY = apAlloc / costPer100actual;
          const apPensionForPhase = Math.min(apBPY * 100, AP_LIFETIME_MAX);

          // Estimate AP 'efficiency' comparable to other wrappers: treat AP pension as a capital-equivalent (×25)
          // BUT: account for the delay if retiring before SPA (67)
          const apCapitalEq = apPensionForPhase * 25; // capital equivalent of the guaranteed pension
          let apEfficiency = apNet > 0 ? (apCapitalEq / apNet) : 0;

          // Discount AP efficiency if retiring before SPA: money is inaccessible during those years
          if (retiresTooEarlyForAP && yearsUntilSPA > 0) {
            // Reduce efficiency by treating it as a delayed investment (7-year delay on average)
            const delayPenalty = Math.pow(1 + realReturnRate, -yearsUntilSPA); // discount for delay
            apEfficiency = apEfficiency * delayPenalty;
          }

          // Quick estimate for SIPP efficiency on the same budget (if all allocated instead to SIPP)
          const sippGrossIfAll = apAlloc * 1.25;
          const sippPotIfAll = projectPot(sippGrossIfAll, phaseYears, realReturnRate);
          const sippNetIfAll = apAlloc - (taxRate > 0.20 ? sippGrossIfAll * (taxRate - 0.20) : 0);
          const sippEfficiency = sippNetIfAll > 0 ? (sippPotIfAll / sippNetIfAll) : 0;

          // Only include AP if it looks reasonably efficient compared with SIPP, or
          // if the marginal tax/NI benefits are very large (i.e., taxRate+niRate high).
          // If retiring before SPA, require AP to be MORE efficient (not just 90% of SIPP)
          const minEfficiencyRatio = retiresTooEarlyForAP ? 1.0 : 0.9; // stricter for early retirement
          const includeAPActual = (apEfficiency >= sippEfficiency * minEfficiencyRatio) || ((taxRate + niRate) >= 0.5 && !retiresTooEarlyForAP);

          if (includeAPActual) {
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
    }

    // SIPP/ISA (in mode order) and GIA overflow via the shared allocation engine.
    const makeSipp = (maxBudget) => buildSIPPStep({ maxBudget, phaseYears, realReturnRate, taxRate, sippNetLimit, projectPot, fmtGBP, fmtPct });
    const makeIsa  = (maxBudget) => buildISAStep({ maxBudget, phaseYears, realReturnRate, projectPot, fmtGBP });

    remaining = allocateSippIsaInOrder({ steps, remaining, optMode, makeSipp, makeIsa });

    if (remaining > 0) steps.push(buildGIAStep(remaining));

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

      // Warning if retiring before SIPP unlock age (57)
      const sippUnlockAge = 57;
      const retireBeforeSippUnlock = retirementAge < sippUnlockAge;
      let subtitleSuffix = '';
      if (retireBeforeSippUnlock) {
        subtitleSuffix = ` ⚠️ Retiring at ${retirementAge} means SIPP is inaccessible until 57 — prioritize ISA (£20k/yr limit) for accessible income during ages ${phase2Start}-56.`;
      }

      phases.push({
        label: alreadyLeft
          ? `Now to Retirement (age ${phase2Start}–${retirementAge})`
          : `After Leaving MOD (age ${phase2Start}–${retirementAge})`,
        subtitle: (alreadyLeft
          ? `${phase2Years} year${phase2Years !== 1 ? 's' : ''} — no AP available, redirect full budget to SIPP + ISA`
          : `${phase2Years} year${phase2Years !== 1 ? 's' : ''} — AP no longer available, full ${fmtGBP(contribution)}/yr redirected to SIPP + ISA`) + subtitleSuffix,
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

