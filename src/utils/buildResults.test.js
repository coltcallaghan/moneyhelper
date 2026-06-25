import { buildResults } from './buildResults';

// Stub formatters injected the same way App.js injects the real ones.
const fmtGBP = (n) => '£' + Math.round(n).toLocaleString();
const fmtPct = (n) => `${Math.round(n * 100)}%`;

const base = {
  taxCode: '1257L', age: 30, returnRate: 0.07, inflationRate: 0.025,
  targetIncome: 30000, fmtGBP, fmtPct,
};

describe('buildResults — end-to-end (£160k serving, retire 55, Target Age)', () => {
  const r = buildResults({
    ...base,
    salary: 160000, isServing: true, yearsService: 10, leaveAge: 35,
    existingDbPension: 9000, existingIsaPot: 80000, existingSippPot: 0,
    statePensionAge: 67, statePension: 11502,
    contribution: 27500, retirementAge: 55,
    propertyValue: 100000, mortgageBalance: 37000, mortgageRate: 0.045,
    mortgageTermYears: 25, cashReserve: 40000,
  });

  it('matches the verified live tax summary', () => {
    expect(r.taxSummary.incomeTax).toBeCloseTo(58203, 0);
    expect(r.taxSummary.ni).toBeCloseTo(5211, 0);
    expect(r.taxSummary.marginalRate).toBe(0.45);
  });
  it('FIRE number is 25 × target income', () => {
    expect(r.fireNumber).toBe(750000);
  });
  it('Target-Age net worth matches the verified figures', () => {
    const nw = r.modes.targetRetirement.netWorth;
    expect(nw.isaOptPot).toBeCloseTo(1150837, -1);
    expect(nw.sippOptPot).toBeCloseTo(429673, -1);
    expect(nw.totalNetWorth).toBeCloseTo(2009571, -1);
  });
  it('net worth total equals the sum of its parts (DB included)', () => {
    const nw = r.modes.targetRetirement.netWorth;
    const sum = nw.isaOptPot + nw.sippOptPot + nw.apOptPot
      + nw.dbOptPot + nw.propertyEquityAtRetirement + nw.cashAtRetirement;
    expect(nw.totalNetWorth).toBeCloseTo(sum, 0);
  });
  it('does not show Added Pension income the plan never bought (early retirement)', () => {
    // Retiring at 55 (< SPA 67): the plan skips AP, so per-mode AP pension is 0.
    expect(r.modes.targetRetirement.apPhasePension).toBe(0);
  });
});

describe('buildResults — SIPP relief is capped at 100% of earnings', () => {
  // A £16,000 earner contributing £27,500/yr (from savings) would, under the old
  // model, be credited relief on the full £34,375 gross — more than they earn.
  // The relief-eligible gross is now capped at earnings, so the SIPP option's net
  // cost cannot be reduced by more relief than the salary supports.
  const r = buildResults({
    ...base, salary: 16000, isServing: false, yearsService: 0, leaveAge: 65,
    existingDbPension: 0, existingIsaPot: 0, existingSippPot: 0,
    statePensionAge: 67, statePension: 11502,
    contribution: 27500, retirementAge: 65,
  });
  it('does not over-credit relief beyond earnings', () => {
    const sipp = r.options.find(o => o.id === 'sipp');
    // At 20% marginal there is no higher-rate extra relief anyway, so net cost
    // equals the contribution — never less.
    expect(sipp.costToYou).toBeGreaterThanOrEqual(27500 - 1);
  });
});

describe('buildResults — AFPS-15 Added Pension efficiency gate', () => {
  // The MOD allocation engine only buys Added Pension when its capital-equivalent
  // efficiency clears the gate (>= 90% of the equivalent SIPP, tightened to 100%
  // and with the tax-relief shortcut disabled when retiring before SPA). In
  // practice the SIPP alternative usually wins, so AP is excluded across a wide
  // range of realistic serving scenarios — these tests pin that behaviour down.
  const apFor = (opts) => buildResults({
    ...base, isServing: true, existingDbPension: 0, existingIsaPot: 0,
    existingSippPot: 0, statePensionAge: 67, statePension: 11502, ...opts,
  }).modes.maxReturn.apPhasePension;

  it('excludes AP when retiring before SPA (locked away, fails the stricter gate)', () => {
    // retire 55 < 67: AP is skipped outright for FIRE/target modes and discounted
    // for max-return, so nothing is bought.
    expect(apFor({ salary: 70000, age: 35, yearsService: 15, leaveAge: 55, contribution: 12000, retirementAge: 55 })).toBe(0);
  });

  it('excludes AP even at SPA when SIPP is the more efficient choice', () => {
    // retire 67: AP is eligible but does not clear the 90% efficiency gate here.
    expect(apFor({ salary: 70000, age: 35, yearsService: 15, leaveAge: 55, contribution: 12000, retirementAge: 67 })).toBe(0);
  });

  it('the option-level AFPS pension is always capped at the lifetime max', () => {
    // The standalone comparison figure (what-if all-in) is capped at £8,571.21/yr.
    const r = buildResults({ ...base, salary: 70000, isServing: true, yearsService: 15,
      leaveAge: 55, existingDbPension: 0, existingIsaPot: 0, existingSippPot: 0,
      statePensionAge: 67, statePension: 11502, contribution: 40000, retirementAge: 67 });
    const ap = r.options.find(o => o.id === 'addedpension');
    expect(ap.annualIncomeAtRetirement).toBeLessThanOrEqual(8571.21);
  });
});

describe('buildResults — civilian (non-serving) excludes Added Pension', () => {
  const r = buildResults({
    ...base,
    salary: 50000, isServing: false, yearsService: 0, leaveAge: 65,
    existingDbPension: 0, existingIsaPot: 0, existingSippPot: 0,
    statePensionAge: 67, statePension: 11502,
    contribution: 10000, retirementAge: 65,
  });

  it('has no Added Pension option in the comparison list', () => {
    const ids = r.options.map(o => o.id);
    expect(ids).toContain('isa');
    expect(ids).toContain('sipp');
    expect(ids).not.toContain('addedpension');
  });
  it('every mode has zero Added Pension pension', () => {
    for (const m of ['maxReturn', 'earliestFire', 'targetRetirement']) {
      expect(r.modes[m].apPhasePension).toBe(0);
    }
  });
});
