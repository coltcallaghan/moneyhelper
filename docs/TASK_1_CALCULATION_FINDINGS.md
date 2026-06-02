# Task 1 — Calculation Accuracy Findings

**Date:** 2026-06-02
**Status:** Verification complete — NO code changed in this task.
**Scope:** Every financial calculation in `src/App.js`, `src/actionPlanMOD.js`,
`src/actionPlanCivilian.js`, checked against the documented model (README.md /
docs/PROJECT_DESCRIPTION.md) and published 2025/26 HMRC figures.

All numbers below were reproduced by executing the actual functions from the
codebase in isolation.

---

## Summary table

| # | Severity | Location | Issue |
|---|----------|----------|-------|
| 1 | **HIGH** | `App.js` `getMarginalTaxRate` vs `calcIncomeTax` | Two different taper models coexist; marginal rate disagrees with the actual tax derivative |
| 2 | **HIGH** | `App.js` `calcIncomeTax` | Band-shrinking + "lostPA × 20%" are two compensating bugs. Correct **only** for standard £12,570 PA; under-taxes any non-standard PA (0T, BR, K-codes) |
| 3 | **MEDIUM** | `projectPot` (App.js) vs test scripts | Two inconsistent FV formulas: annuity-**due** in app, annuity-**ordinary** (+rounding) in tests. ~4.4% divergence |
| 4 | **MEDIUM** | `calcMixScenarios` (App.js) | ISA contribution not capped at £20,000 allowance |
| 5 | **LOW** | `calcIncomeTax` taper band | `Math.floor((gross-100000)/2)` makes the 60% rate apply in £2 steps (minor granularity) |
| 6 | INFO | AFPS ×25 gate | Behaves exactly as documented — confirmed correct |
| 7 | INFO | `projectPot` r=0; real-return conversion | Both handled correctly — confirmed |

---

## Finding 1 — Marginal tax rate contradicts the actual tax function (HIGH)

**Where:** `App.js` `getMarginalTaxRate` (lines ~139-148) vs `calcIncomeTax` (lines ~118-136).

**Correct?** The brief requires the taper-band marginal rate to be 60%.
`getMarginalTaxRate` returns `0.60` in £100k–£125,140. **But** the actual
derivative of `calcIncomeTax` is only **40% per £1** in that band:

```
calcIncomeTax(110001) − calcIncomeTax(110000) = 0.4000   (not 0.60)
```

**Bug:** The two functions model the taper differently. `getMarginalTaxRate`
hard-codes 0.60; `calcIncomeTax` produces the 60% effect only as an **average
across the whole band** (£100k→£110k costs £6,000 extra = 60% averaged), not as
a per-pound marginal rate. The action plans consume `getMarginalTaxRate` (the
`taxRate` that drives SIPP relief and AP net cost), so allocation maths and the
displayed tax bill rest on inconsistent models.

---

## Finding 2 — Compensating bugs in `calcIncomeTax`: correct for £12,570 PA only (HIGH)

**Where:** `App.js` `calcIncomeTax` (lines ~118-136).

Two separate errors exist and **cancel out exactly — but only when the personal
allowance is the standard £12,570.**

**Bug 2a — band edges shrunk by PA:**
```js
const basic  = Math.max(0, 50270  - Math.max(0, pa));
const higher = Math.max(0, 125140 - Math.max(0, pa));
```
HMRC bands are defined on **taxable income** with a **fixed basic-rate band
width of £37,700**; the higher/additional thresholds (£50,270 / £125,140) are
*gross* figures. Subtracting `pa` from them shrinks the bands as PA falls, which
under-taxes.

**Bug 2b — explicit "lost PA × 20%" charge:**
```js
const lostPA = Math.max(0, (taxInfo.pa || 0) - pa);
if (lostPA > 0) tax += lostPA * 0.20;
```
A synthetic 20% charge on lost allowance.

**Net effect (verified) — standard PA, app matches HMRC exactly:**

| gross | app | true HMRC | match |
|---|---|---|---|
| £30,000 | £3,486 | £3,486 | ✓ |
| £70,000 | £15,432 | £15,432 | ✓ |
| £100,000 | £27,432 | £27,432 | ✓ |
| £110,000 | £33,432 | £33,432 | ✓ |
| £125,140 | £42,516 | £42,516 | ✓ |
| £150,000 | £53,703 | £53,703 | ✓ |

**Where it breaks — non-standard PA (no lost-PA compensation below £100k):**

| gross | base PA | app tax | true HMRC | error |
|---|---|---|---|---|
| £60,000 | £10,000 | £11,946 | £12,460 | **−£514** |
| £60,000 | £0 (0T) | £13,946 | £16,460 | **−£2,514** |

The app silently **under-taxes** these users. The brief's stated check
(£110,000 → allowance £7,570, 60% trap) **passes** — only the standard-PA path
is exercised there.

**Recommended fix (Task 2):** use the fixed £37,700 basic-band width and
**remove** the `lostPA × 20%` line. Standard-PA outputs stay byte-identical
(verified); non-standard PAs become correct.

---

## Finding 3 — Inconsistent future-value formula between app and tests (MEDIUM)

**Where:** `App.js` `projectPot` (lines ~165-169) vs `test-runner.js:20-26`,
`detailed-tests.js:61`.

- App `projectPot`: `C × ((1+r)^n − 1)/r × (1+r)` — annuity **due** (start-of-year). Matches the documented model.
- Test scripts: `C × ((1+r)^n − 1)/r` (no `× (1+r)`) plus `Math.round` — annuity **ordinary**.

For C=£10,000, n=20, r=4.4%: app = **£324,108**, tests = **£310,449** — a
**4.4% (= 1+r) discrepancy**. The app formula matches the documented model; the
test scripts are wrong. Relevant to Task 4: the Jest suite must assert the
*app's* values.

---

## Finding 4 — ISA £20,000 cap not enforced in mix analysis (MEDIUM)

**Where:** `App.js` `calcMixScenarios` (lines ~187-205). `isaContrib =
contribution * isa` is projected with no `Math.min(…, 20000)`. A £30,000
contribution at the "100% ISA" split models £30,000/yr into an ISA, exceeding
the statutory £20,000 allowance. The action-plan builders correctly cap ISA via
`Math.min(maxBudget, 20000)`, so this is isolated to the Mix card.

---

## Finding 5 — Taper granularity (LOW)

`Math.floor((gross − 100000) / 2)` means PA only drops in whole pounds per £2 of
income, so the 60% effect lands in £2 steps (£0.40 then £0.80 per £1). Matches
HMRC's "£1 for every £2" rule reasonably. **No fix recommended.**

---

## Confirmed CORRECT (no action)

- **Finding 6 — AFPS-15 ×25 & 90% gate.** `actionPlanMOD.js` lines ~33-53.
  `apCapitalEq = pension × 25`. Gate `apEfficiency >= sippEfficiency * 0.9` →
  at **exactly 90% the AP is included** (`>=`), excluded just below. Tightens to
  `1.0` for pre-SPA retirement, as documented. Lifetime cap £8,571.21 applied.
- **Finding 7a — `projectPot` at r=0.** Returns `C × n` (no divide-by-zero).
- **Finding 7b — real return.** `(1+nominal)/(1+inflation) − 1`: inflation 0 →
  nominal; inflation > nominal → negative real return, correctly produced and
  handled.
- **NI:** £150k → £5,010.60, £70k → £3,410.60 — matches the simplified 8%/2%
  model (acknowledged as an approximation in README).
- **SIPP relief straddling £50,270:** higher-rate relief `sippGross × (taxRate −
  0.20)` applied above £50,270, consistent with the documented model.

---

## Recommendation for Task 2 (priority order)

1. **Findings 1 + 2 together** — unify on one correct taper model (fixed £37,700
   band, single 60%-producing mechanism, drop the `lostPA × 20%` line).
   Standard-PA outputs stay identical; non-standard PAs get fixed.
2. **Finding 4** — add `Math.min(isaContrib, 20000)` in `calcMixScenarios`.
3. **Finding 3** — align the test FV formula with the app (folds into Task 4).

Findings 5, 6, 7 need no change.

**Key reassurance:** fixing Finding 2 will NOT change any number the app
currently shows for standard-tax-code users — it only corrects non-standard tax
codes and removes the latent contradiction with the marginal-rate function.
