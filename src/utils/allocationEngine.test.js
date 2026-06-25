import { buildSIPPStep, buildISAStep, buildGIAStep, allocateSippIsaInOrder, ISA_ANNUAL_LIMIT } from './allocationEngine';
import { projectPot } from './pensionModelling';

// Trivial stub formatters keep these tests pure and dependency-free.
const fmtGBP = (n) => '£' + Math.round(n);
const fmtPct = (n) => `${Math.round(n * 100)}%`;

const isaArgs = (maxBudget) => ({ maxBudget, phaseYears: 20, realReturnRate: 0.04, projectPot, fmtGBP });
const sippArgs = (maxBudget, taxRate) => ({ maxBudget, phaseYears: 20, realReturnRate: 0.04, taxRate, sippNetLimit: 48000, projectPot, fmtGBP, fmtPct });

describe('buildISAStep — £20,000 annual limit boundary', () => {
  it('allocates the whole budget when at or below £20,000', () => {
    expect(buildISAStep(isaArgs(20000)).gross).toBe(20000);
    expect(buildISAStep(isaArgs(15000)).gross).toBe(15000);
  });
  it('caps at exactly £20,000 when just over', () => {
    const step = buildISAStep(isaArgs(20001));
    expect(step.gross).toBe(20000);
    expect(step.netAlloc).toBe(20000);
    expect(step.note).toMatch(/£20,000/); // warns about the overflow
  });
  it('returns null for a non-positive budget', () => {
    expect(buildISAStep(isaArgs(0))).toBeNull();
  });
  it('exposes the statutory limit constant', () => {
    expect(ISA_ANNUAL_LIMIT).toBe(20000);
  });
});

describe('buildSIPPStep', () => {
  it('gives a 25% government top-up (gross = 1.25 × net)', () => {
    const step = buildSIPPStep(sippArgs(10000, 0.20));
    expect(step.govTopUp).toBeCloseTo(step.gross * 0.25, 6);
  });
  it('higher-rate (40%) reduces net cost below the gross allocation', () => {
    const step = buildSIPPStep(sippArgs(10000, 0.40));
    expect(step.netCost).toBeLessThan(step.gross);
    expect(step.note).toMatch(/Self Assessment/);
  });
  it('returns null for a non-positive budget', () => {
    expect(buildSIPPStep(sippArgs(0, 0.40))).toBeNull();
  });
});

describe('buildGIAStep', () => {
  it('returns a GIA overflow step for the leftover budget', () => {
    const step = buildGIAStep(5000);
    expect(step.vehicle).toBe('General Investment Account');
    expect(step.gross).toBe(5000);
    expect(step.netCost).toBe(5000);
  });
});

describe('allocateSippIsaInOrder — mode-based ordering', () => {
  const makeSipp = (b) => buildSIPPStep(sippArgs(b, 0.20));
  const makeIsa  = (b) => buildISAStep(isaArgs(b));

  it('maxReturn fills SIPP first, then ISA', () => {
    const steps = [];
    allocateSippIsaInOrder({ steps, remaining: 30000, optMode: 'maxReturn', makeSipp, makeIsa });
    expect(steps[0].vehicle).toBe('SIPP (Private Pension)');
  });
  it('earliestFire fills ISA first (capped £20k), then SIPP', () => {
    const steps = [];
    const left = allocateSippIsaInOrder({ steps, remaining: 30000, optMode: 'earliestFire', makeSipp, makeIsa });
    expect(steps[0].vehicle).toBe('Stocks & Shares ISA');
    expect(steps[0].gross).toBe(20000);
    expect(steps[1].vehicle).toBe('SIPP (Private Pension)');
    expect(left).toBeGreaterThanOrEqual(0);
  });
  it('targetRetirement also fills ISA first', () => {
    const steps = [];
    allocateSippIsaInOrder({ steps, remaining: 30000, optMode: 'targetRetirement', makeSipp, makeIsa });
    expect(steps[0].vehicle).toBe('Stocks & Shares ISA');
  });
});
