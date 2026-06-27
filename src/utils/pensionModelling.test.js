import { projectPot, calcMixScenarios, sippHigherRateRelief, reliefEligibleGross, shouldIncludeAddedPension } from './pensionModelling';

describe('shouldIncludeAddedPension — AFPS-15 efficiency gate', () => {
  // Not retiring early: gate is 90% of SIPP efficiency, boundary inclusive.
  const normal = { retiresTooEarlyForAP: false, taxRate: 0.20, niRate: 0.08 };
  it('includes AP at EXACTLY 90% of SIPP efficiency (>= boundary)', () => {
    expect(shouldIncludeAddedPension({ ...normal, apEfficiency: 90, sippEfficiency: 100 })).toBe(true);
  });
  it('excludes AP just below 90% of SIPP efficiency', () => {
    expect(shouldIncludeAddedPension({ ...normal, apEfficiency: 89.99, sippEfficiency: 100 })).toBe(false);
  });
  it('includes AP comfortably above the threshold', () => {
    expect(shouldIncludeAddedPension({ ...normal, apEfficiency: 100, sippEfficiency: 100 })).toBe(true);
  });

  // Retiring before SPA: gate tightens to 100%, and the high-relief shortcut is off.
  const early = { retiresTooEarlyForAP: true, taxRate: 0.20, niRate: 0.08 };
  it('requires AP to MATCH or beat SIPP (100%) when retiring before SPA', () => {
    expect(shouldIncludeAddedPension({ ...early, apEfficiency: 100, sippEfficiency: 100 })).toBe(true);
    expect(shouldIncludeAddedPension({ ...early, apEfficiency: 99.99, sippEfficiency: 100 })).toBe(false);
    // 90% would have passed the normal gate but fails the early-retirement gate:
    expect(shouldIncludeAddedPension({ ...early, apEfficiency: 90, sippEfficiency: 100 })).toBe(false);
  });

  // High combined relief (>=50%) is a shortcut — but only when NOT retiring early.
  it('includes AP on the high tax+NI shortcut even if it trails SIPP (not early)', () => {
    expect(shouldIncludeAddedPension({ retiresTooEarlyForAP: false, taxRate: 0.45, niRate: 0.05, apEfficiency: 10, sippEfficiency: 100 })).toBe(true);
  });
  it('disables the high-relief shortcut when retiring before SPA', () => {
    expect(shouldIncludeAddedPension({ retiresTooEarlyForAP: true, taxRate: 0.45, niRate: 0.05, apEfficiency: 10, sippEfficiency: 100 })).toBe(false);
  });
});

describe('sippHigherRateRelief — band-aware higher-rate relief', () => {
  it('is zero at or below the basic rate', () => {
    expect(sippHigherRateRelief(10000, 0.20, 40000)).toBe(0);
    expect(sippHigherRateRelief(10000, 0, 40000)).toBe(0);
  });
  it('legacy (no salary) credits relief on the whole gross', () => {
    expect(sippHigherRateRelief(10000, 0.40)).toBeCloseTo(2000, 6); // 20% of 10,000
  });
  it('is identical to legacy when the whole gross sits in the higher band', () => {
    // £160k salary: higher-band income £109,730 dwarfs any plausible gross.
    expect(sippHigherRateRelief(34375, 0.45, 160000)).toBeCloseTo(sippHigherRateRelief(34375, 0.45), 6);
  });
  it('only credits relief on the portion of gross in the higher band (straddle)', () => {
    // salary £55,000 → only £4,730 is in the 40% band; relief = 20% × 4,730.
    expect(sippHigherRateRelief(12500, 0.40, 55000)).toBeCloseTo(946, 0);
  });
  it('credits no extra relief when salary is entirely basic-rate', () => {
    expect(sippHigherRateRelief(5000, 0.40, 45000)).toBe(0); // nothing above £50,270
  });
});

describe('reliefEligibleGross — 100%-of-earnings cap (HMRC)', () => {
  it('returns the gross uncapped when no salary is given (legacy)', () => {
    expect(reliefEligibleGross(34375)).toBe(34375);
  });
  it('caps relief-eligible gross at earnings when the contribution exceeds them', () => {
    expect(reliefEligibleGross(34375, 5000)).toBe(5000);
  });
  it('does not cap when the gross is within earnings', () => {
    expect(reliefEligibleGross(9375, 160000)).toBe(9375);
  });
  it('honours the £3,600 minimum-relievable floor for low earners', () => {
    expect(reliefEligibleGross(5000, 2000)).toBe(3600);
  });
});

describe('projectPot — annuity-due future value', () => {
  it('uses the algebraic limit C × n when r = 0 (no divide-by-zero)', () => {
    expect(projectPot(1000, 10, 0)).toBe(10000);
    expect(projectPot(20000, 25, 0)).toBe(500000);
  });
  it('returns the single contribution when years <= 0', () => {
    expect(projectPot(5000, 0, 0.05)).toBe(5000);
    expect(projectPot(5000, -3, 0.05)).toBe(5000);
  });
  it('computes annuity-DUE FV: C × ((1+r)^n − 1) / r × (1+r)', () => {
    // 20,000/yr, 25yr, 4.39% real ≈ the live "100% ISA" pot of ~£916,636.
    expect(projectPot(20000, 25, 0.0439)).toBeCloseTo(916636, -2); // within ~£100
  });
  it('is annuity-DUE, i.e. (1+r)× larger than the ordinary annuity', () => {
    const r = 0.05, n = 20, C = 1000;
    const ordinary = C * ((Math.pow(1 + r, n) - 1) / r);
    expect(projectPot(C, n, r)).toBeCloseTo(ordinary * (1 + r), 6);
  });
  it('handles a NEGATIVE real return (inflation > nominal) without breaking', () => {
    const r = -0.02, n = 10, C = 1000;
    const expected = C * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    expect(projectPot(C, n, r)).toBeCloseTo(expected, 6);
    expect(projectPot(C, n, r)).toBeLessThan(C * n); // erodes below straight sum
  });
});

describe('calcMixScenarios', () => {
  const mix = calcMixScenarios(27500, 25, 0.0439, 0.45);

  it('returns the five splits with a best index and PA sweet-spot', () => {
    expect(mix.scenarios).toHaveLength(5);
    expect(mix.scenarios[0].label).toBe('100% ISA');
    expect(mix.scenarios[4].label).toBe('100% SIPP');
    expect(typeof mix.bestIdx).toBe('number');
    expect(typeof mix.sippMaxForPA).toBe('number');
  });
  it('caps the ISA leg at the £20,000 statutory limit', () => {
    // 100% ISA split of a £27,500 budget must invest only £20,000, not £27,500.
    const isaOnly = mix.scenarios[0];
    expect(isaOnly.isaPot).toBeCloseTo(projectPot(20000, 25, 0.0439), 0);
  });
  it('gives higher-rate SIPP extra relief (lower net cost than gross)', () => {
    const sippOnly = mix.scenarios[4];
    expect(sippOnly.netCost).toBeLessThan(27500); // 45% relief reduces net cost
  });
});
