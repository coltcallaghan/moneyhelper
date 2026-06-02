# Task 2 — Calculation Fixes & Changelog

**Date:** 2026-06-02
**Status:** Complete. Fixes approved from
[TASK_1_CALCULATION_FINDINGS.md](TASK_1_CALCULATION_FINDINGS.md): Findings 1+2,
3, and 4. (Findings 5/6/7 confirmed correct — no change.)

All changes verified with before/after numeric output and against true 2025/26
HMRC figures. The production build (`react-scripts build`) succeeds and all
three legacy Node scripts still run.

---

## Tax bands used (authoritative source)

Verified against **https://www.gov.uk/income-tax-rates** (England, Wales &
Northern Ireland — Scotland excluded, consistent with the project's documented
limitation). These are the 2025/26 values, frozen and unchanged for 2026/27.

| Band | Rate | Applies to (gross income) |
|---|---|---|
| Personal Allowance | 0% | First £12,570 (standard code `1257L`) |
| Basic rate | 20% | £12,571 → £50,270 |
| Higher rate | 40% | £50,271 → £125,140 |
| Additional rate | 45% | Over £125,140 |
| PA taper | — | PA reduced £1 per £2 of income over £100,000; £0 at £125,140 |

National Insurance (employee, simplified): 8% on £12,570→£50,270, 2% above
£50,270.

### Why the code uses a fixed `basicBand = 37700`

The 20% band is a **fixed £37,700 width of _taxable_ income** (income after the
personal allowance), not a function of the allowance:

```
£50,270 (higher-rate threshold) − £12,570 (personal allowance) = £37,700
```

It does **not** shrink when the personal allowance is tapered. Example at
£110,000 (PA tapered to £7,570): taxable income £102,430, of which the first
£37,700 is taxed at 20% and the remainder at 40% up to the £125,140 gross
threshold.

The **old** code computed `basic = 50270 − pa`, which wrongly *widened* the 20%
band as the allowance fell — the root of the non-standard-PA under-taxing bug
(Finding 2). Pinning the band to the constant `37700` makes it correct for any
allowance. (A future refactor — Task 3 — should name this `BASIC_RATE_LIMIT` in
`taxCalculations.js` alongside the other thresholds.)

---

## Change 1 — Income tax taper, unified to the correct HMRC model (Findings 1+2)

**File:** `src/App.js` — `calcIncomeTax` (and comment in `getMarginalTaxRate`).

**What changed**
- Replaced the band-shrinking method (`basic = 50270 − pa`, `higher = 125140 −
  pa`) with the correct HMRC method: a **fixed £37,700 basic-rate band width** on
  taxable income, 40% up to the `£125,140 − PA` taxable threshold, 45% above.
- **Removed** the synthetic `lostPA × 20%` charge. It double-counted and only
  cancelled the band-shrink error for the standard £12,570 allowance.

**Why**
- The 60% effective marginal rate in the £100k–£125,140 taper band now emerges
  naturally and genuinely (each £1 of income over £100k loses £0.50 of PA, both
  taxed at 40% → 60%), instead of being faked by an averaging artefact.
- The old code under-taxed any non-standard tax code (`0T`, `BR`-derived,
  K-codes, etc.) because the compensating charge was absent below £100k.

**Before / after (standard PA £12,570 — identical, verified):**

| gross | before | after | true HMRC |
|---|---|---|---|
| £30,000 | £3,486 | £3,486 | £3,486 |
| £70,000 | £15,432 | £15,432 | £15,432 |
| £100,000 | £27,432 | £27,432 | £27,432 |
| £110,000 | £33,432 | £33,432 | £33,432 |
| £125,140 | £42,516 | £42,516 | £42,516 |
| £150,000 | £53,703 | £53,703 | £53,703 |

**Before / after (non-standard PA — bug fixed):**

| case | before | after | true HMRC |
|---|---|---|---|
| £60,000, 0T (PA £0) | £13,946 (−£2,514) | £16,460 | £16,460 |

60% trap is now real: `calcIncomeTax(110000) − calcIncomeTax(100000) = £6,000`
on £10,000 = 60%.

**Impact:** No change to any number shown to standard-tax-code users. Corrects
under-taxing for non-standard tax codes and removes the model contradiction.

---

## Change 2 — ISA £20,000 cap enforced in mix analysis (Finding 4)

**File:** `src/App.js` — `calcMixScenarios`.

**What changed:** `isaContrib = contribution * isa` →
`isaContrib = Math.min(contribution * isa, 20000)`.

**Why:** The Mix card could model more than the statutory £20,000/yr ISA
subscription limit (e.g. £30,000 at the 100% ISA split).

**Before / after:** £30,000 contribution, 100% ISA split: `isaContrib`
£30,000 → **£20,000**.

---

## Change 3 — Future-value formula aligned in legacy test script (Finding 3)

**File:** `test-runner.js` — `projectPot`.

**What changed:** Switched from the annuity-**ordinary** formula
`C × ((1+r)^n − 1)/r` (with `Math.round`) to the annuity-**due** formula used by
the app: `C × ((1+r)^n − 1)/r × (1+r)`; also added the `years <= 0` guard.

**Why:** The app and the documented model use annuity-due (contributions at the
start of each year). The script under-stated FV by a factor of `(1+r)`.

**Before / after:** C=£10,000, n=20, r=4.4%: £310,449 → **£324,108** (now
matches `App.js` `projectPot`).

> Note: `detailed-tests.js` is a hardcoded narrative illustration and its inline
> `fvFactor` is used only for a PA-fill illustration, not contribution FV, so it
> was left unchanged. The authoritative FV assertions move to the Jest suite in
> Task 4.

---

## Verification performed

- Re-ran each fixed formula in isolation against true HMRC 2025/26 figures
  (table above).
- `react-scripts build` — succeeds, no errors.
- `node test-runner.js`, `node detailed-tests.js`, `node test-added-pension.js`
  — all run without error.

## Not changed (confirmed correct in Task 1)

- Finding 5 (taper £2 granularity) — matches HMRC "£1 per £2" rule.
- Finding 6 (AFPS-15 ×25 and 90% inclusion gate).
- Finding 7 (`projectPot` r=0 fallback; real-return conversion incl. negative).
