import {
  parseTaxCode, getEffectivePA, calcIncomeTax, getMarginalTaxRate,
  calcNI, getMarginalNI, inferStatePensionAge,
} from './taxCalculations';

const STD = parseTaxCode('1257L'); // standard £12,570 allowance

describe('parseTaxCode', () => {
  it('defaults to the standard £12,570 allowance for blank/standard codes', () => {
    expect(parseTaxCode('').pa).toBe(12570);
    expect(parseTaxCode('1257L').pa).toBe(12570);
    expect(parseTaxCode('1257L').mode).toBe('normal');
  });
  it('handles flat-rate codes BR / D0 / D1', () => {
    expect(parseTaxCode('BR')).toMatchObject({ mode: 'flat', flatRate: 0.20, pa: 0 });
    expect(parseTaxCode('D0')).toMatchObject({ mode: 'flat', flatRate: 0.40 });
    expect(parseTaxCode('D1')).toMatchObject({ mode: 'flat', flatRate: 0.45 });
  });
  it('handles 0T (no allowance) and NT (no tax)', () => {
    expect(parseTaxCode('0T')).toMatchObject({ mode: 'normal', pa: 0 });
    expect(parseTaxCode('NT').mode).toBe('nt');
  });
  it('parses a numeric allowance and strips emergency suffixes', () => {
    expect(parseTaxCode('1100L').pa).toBe(11000);
    expect(parseTaxCode('1257L W1').pa).toBe(12570);
  });
  it('handles K codes as negative allowance', () => {
    expect(parseTaxCode('K500')).toMatchObject({ mode: 'k', pa: -5000 });
  });
});

describe('getEffectivePA — £100k personal allowance taper', () => {
  it('keeps the full allowance at or below £100,000', () => {
    expect(getEffectivePA(100000, 12570)).toBe(12570);
    expect(getEffectivePA(50000, 12570)).toBe(12570);
  });
  it('reduces the allowance to £7,570 at £110,000 (£1 lost per £2 over £100k)', () => {
    expect(getEffectivePA(110000, 12570)).toBe(7570);
  });
  it('reaches £0 at £125,140', () => {
    expect(getEffectivePA(125140, 12570)).toBe(0);
    expect(getEffectivePA(130000, 12570)).toBe(0);
  });
});

describe('calcIncomeTax — 2025/26 England/Wales/NI', () => {
  it('basic rate (20%) below the higher-rate threshold', () => {
    expect(calcIncomeTax(30000, STD)).toBeCloseTo(3486, 0);
    expect(calcIncomeTax(50270, STD)).toBeCloseTo(7540, 0);
    expect(calcIncomeTax(70000, STD)).toBeCloseTo(15432, 0);
  });
  describe('personal allowance taper band (£100k–£125,140)', () => {
    it('£100,000 — full allowance, no taper yet', () => {
      expect(calcIncomeTax(100000, STD)).toBeCloseTo(27432, 0);
    });
    it('£110,000 — allowance tapered to £7,570', () => {
      expect(calcIncomeTax(110000, STD)).toBeCloseTo(33432, 0);
    });
    it('£125,140 — allowance fully gone', () => {
      expect(calcIncomeTax(125140, STD)).toBeCloseTo(42516, 0);
    });
    it('the taper band carries a genuine 60% effective marginal rate', () => {
      // £100k → £110k costs £6,000 extra tax on £10,000 of income = 60%.
      const extra = calcIncomeTax(110000, STD) - calcIncomeTax(100000, STD);
      expect(extra).toBeCloseTo(6000, 0);
      expect(extra / 10000).toBeCloseTo(0.60, 5);
    });
  });
  it('additional rate (45%) above £125,140', () => {
    expect(calcIncomeTax(160000, STD)).toBeCloseTo(58203, 0);
  });
  it('flat codes and NT', () => {
    expect(calcIncomeTax(50000, parseTaxCode('BR'))).toBeCloseTo(10000, 0); // 20% flat
    expect(calcIncomeTax(50000, parseTaxCode('NT'))).toBe(0);
  });
  it('non-standard allowance (0T) is taxed correctly — no under-taxing', () => {
    // The old code under-taxed this by £2,514; the fixed band-width method is exact.
    expect(calcIncomeTax(60000, parseTaxCode('0T'))).toBeCloseTo(16460, 0);
  });
});

describe('getMarginalTaxRate', () => {
  it('returns the correct band rate, including the 60% taper trap', () => {
    expect(getMarginalTaxRate(30000, STD)).toBe(0.20);
    expect(getMarginalTaxRate(60000, STD)).toBe(0.40);
    expect(getMarginalTaxRate(110000, STD)).toBe(0.60);
    expect(getMarginalTaxRate(160000, STD)).toBe(0.45);
  });
  it('is 0 below the allowance and follows flat codes', () => {
    expect(getMarginalTaxRate(10000, STD)).toBe(0);
    expect(getMarginalTaxRate(40000, parseTaxCode('D0'))).toBe(0.40);
  });
});

describe('calcNI and getMarginalNI (simplified 8% / 2%)', () => {
  it('no NI below the primary threshold', () => {
    expect(calcNI(12570)).toBe(0);
  });
  it('8% between £12,570 and £50,270, 2% above', () => {
    expect(calcNI(16000)).toBeCloseTo(274, 0);
    expect(calcNI(70000)).toBeCloseTo(3410.6, 1);
    expect(calcNI(160000)).toBeCloseTo(5210.6, 1);
  });
  it('marginal NI rate by band', () => {
    expect(getMarginalNI(10000)).toBe(0);
    expect(getMarginalNI(40000)).toBe(0.08);
    expect(getMarginalNI(80000)).toBe(0.02);
  });
});

describe('inferStatePensionAge', () => {
  it('maps younger ages to SPA 67', () => {
    expect(inferStatePensionAge(30)).toBe(67);
  });
});
