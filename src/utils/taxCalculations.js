// ─────────────────────────────────────────────────────────────────────────────
// taxCalculations.js — PURE income tax, National Insurance, personal allowance
// taper and marginal-rate helpers (England/Wales/NI, 2025/26 tax year).
//
// Every function here is a pure function: no React, no DOM, no side effects,
// same input always gives the same output. This lets the whole tax layer be
// unit-tested in Node without a browser.
//
// 2025/26 figures (gov.uk/income-tax-rates): Personal Allowance £12,570;
// basic-rate band width £37,700 (20%); higher rate (40%) to £125,140;
// additional rate (45%) above; PA tapered £1 per £2 over £100,000, gone at
// £125,140. NI is a simplified 8% / 2% approximation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an HMRC tax code into a personal-allowance descriptor.
 * Handles standard codes (e.g. 1257L), flat codes (BR/D0/D1), NT, 0T, K codes,
 * and S/C (Scottish/Welsh) prefixes. Assumes 2025/26 standard allowance.
 * @param {string} code - The tax code (case-insensitive; emergency suffixes stripped).
 * @returns {{pa:number, mode:'normal'|'flat'|'nt'|'k', flatRate?:number, scottish?:boolean, note:string}}
 */
export function parseTaxCode(code) {
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
      note: `Personal allowance: £${pa.toLocaleString()}${scottish ? ' (Scottish taxpayer — income tax bands differ slightly)' : ''}`
    };
  }
  return { pa: 12570, mode: 'normal', note: 'Unrecognised code — using standard £12,570 allowance' };
}

/**
 * Infer State Pension Age from current age (approximate mapping by birth year).
 * @param {number} age - Current age in years.
 * @returns {number} 65, 66 or 67.
 */
export function inferStatePensionAge(age) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - (age || 0);
  // Approximate mapping:
  // Born <= 1953  => SPA 65
  // Born 1954-1959 => SPA 66
  // Born >= 1960  => SPA 67
  if (birthYear <= 1953) return 65;
  if (birthYear <= 1959) return 66;
  return 67;
}

/**
 * Effective personal allowance after the £100k taper (£1 lost per £2 over £100k).
 * @param {number} gross - Adjusted net income.
 * @param {number} basePa - The starting personal allowance from the tax code.
 * @returns {number} The tapered allowance (never below 0). Assumes 2025/26.
 */
export function getEffectivePA(gross, basePa) {
  if (gross <= 100000 || basePa <= 0) return basePa;
  const reduction = Math.min(basePa, Math.floor((gross - 100000) / 2));
  return Math.max(0, basePa - reduction);
}

/**
 * Income tax for England/Wales/NI, 2025/26. Bands apply to TAXABLE income
 * (gross − personal allowance): fixed £37,700 basic-rate band at 20%, 40% up to
 * the £125,140 gross additional-rate threshold, 45% above. The 60% effective
 * marginal rate in the £100k–£125,140 taper band emerges naturally (each £1 of
 * allowance lost pushes £1 more into the 40% band) — no separate charge needed.
 * @param {number} gross - Taxable pay for the year.
 * @param {{mode:string, flatRate?:number, pa:number}} taxInfo - From parseTaxCode.
 * @returns {number} Income tax due.
 */
export function calcIncomeTax(gross, taxInfo) {
  if (taxInfo.mode === 'nt')   return 0;
  if (taxInfo.mode === 'flat') return Math.max(0, gross * taxInfo.flatRate);
  const pa          = getEffectivePA(gross, taxInfo.pa);
  const taxable     = Math.max(0, gross - pa);
  const basicBand   = 37700;                            // 20% band width (fixed)
  const higherTop   = Math.max(0, 125140 - Math.max(0, pa)); // 40% up to here (taxable)
  let tax = 0;
  if (taxable > 0)         tax += Math.min(taxable, basicBand) * 0.20;
  if (taxable > basicBand) tax += (Math.min(taxable, higherTop) - basicBand) * 0.40;
  if (taxable > higherTop) tax += (taxable - higherTop) * 0.45;
  return Math.max(0, tax);
}

/**
 * Marginal income tax rate at a given income, including the 60% taper trap
 * between £100k and £125,140. Assumes 2025/26 England/Wales/NI bands.
 * @param {number} gross - Income level.
 * @param {{mode:string, flatRate?:number, pa:number}} taxInfo - From parseTaxCode.
 * @returns {number} Marginal rate as a decimal (e.g. 0.40).
 */
export function getMarginalTaxRate(gross, taxInfo) {
  if (!taxInfo || taxInfo.mode === 'nt')   return 0;
  if (taxInfo.mode === 'flat') return taxInfo.flatRate;
  const pa = getEffectivePA(gross, taxInfo.pa);
  if (gross <= pa)       return 0;
  if (gross <= 50270)    return 0.20;
  if (gross <= 100000)   return 0.40;
  if (gross <= 125140)   return 0.60; // 40% on income + 40% on the £0.50 of PA lost per £1 = effective 60%
  return 0.45;
}

/**
 * Simplified employee National Insurance for 2025/26: 8% between £12,570 and
 * £50,270, 2% above. An approximation for guidance only.
 * @param {number} salary - Gross salary.
 * @returns {number} NI due.
 */
export function calcNI(salary) {
  if (salary <= 12570) return 0;
  return Math.min(salary - 12570, 50270 - 12570) * 0.08 + Math.max(0, salary - 50270) * 0.02;
}

/**
 * Marginal NI rate at a given salary (simplified 2025/26 bands).
 * @param {number} salary - Salary level.
 * @returns {number} 0, 0.08 or 0.02.
 */
export function getMarginalNI(salary) {
  if (salary <= 12570) return 0;
  if (salary <= 50270) return 0.08;
  return 0.02;
}
