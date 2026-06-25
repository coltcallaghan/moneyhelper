import { buildSIPPStep, buildISAStep, buildGIAStep, allocateSippIsaInOrder } from './utils/allocationEngine';

// Action Plan logic for civilian / non-MOD users
export function buildCivilianActionPlan({
  contribution, years, realReturnRate, taxRate, niRate, age, retirementAge,
  sippNetLimit, salary, fmtGBP, fmtPct, projectPot, alreadyLeft, optMode = 'maxReturn'
}) {
  // Civilian plan never offers AFPS Added Pension — allocate based on optimization mode
  // maxReturn: SIPP -> ISA -> GIA (prioritizes tax efficiency)
  // targetRetirement: ISA -> SIPP -> GIA (prioritizes accessible income at retirement age)
  function buildPhaseSteps(budget, phaseYears) {
    const steps = [];
    const makeSipp = (maxBudget) => buildSIPPStep({ maxBudget, phaseYears, realReturnRate, taxRate, sippNetLimit, salary, projectPot, fmtGBP, fmtPct });
    const makeIsa  = (maxBudget) => buildISAStep({ maxBudget, phaseYears, realReturnRate, projectPot, fmtGBP });

    let remaining = allocateSippIsaInOrder({ steps, remaining: budget, optMode, makeSipp, makeIsa });

    if (remaining > 0) steps.push(buildGIAStep(remaining));

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

