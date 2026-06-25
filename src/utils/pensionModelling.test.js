import { projectPot, calcMixScenarios } from './pensionModelling';

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
