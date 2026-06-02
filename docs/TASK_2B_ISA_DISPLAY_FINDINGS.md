# Task 2b — ISA Pot Display Inconsistency (Investigation)

**Date:** 2026-06-02
**Status:** Investigation only — NO code changed. Awaiting decision on fixes.
**Trigger:** Live output for a serving MOD user (£160k salary, £27,500/yr
contribution, age 30, leave 35, retire 55, £80k existing ISA) shows three
different ISA figures on one screen.

---

## Summary

The app displays **three different, mutually inconsistent ISA pot values
simultaneously**. Two distinct root causes:

| Card | ISA value (live) | Source variable | What it models |
|---|---|---|---|
| Recommendation + Comparison ("ISA" option) | **£1,494,575** (£59,783/yr) | `isaPotAllIn` | Entire £27,500/yr into ISA — **ignores the £20,000 cap** |
| Net Worth ("ISA Pot") | **£234,200** | `_phasePot` (maxReturn) | maxReturn allocation → SIPP-first, so ISA = existing £80k growth only |
| Action Plan (Target Age, the selected mode) | **£20,000/yr → £647,496** | per-mode `phaseAllocations` | ISA capped at £20k, for the *selected* mode |

All three were reproduced numerically (matches live to rounding).

---

## Problem 1 — Uncapped ISA in recommendation & comparison cards (HIGH)

**Where:** `App.js` `buildResults`, lines ~417-428.

```js
const isaPotAllIn = projectPot(contribution, years, realReturnRate) + existingIsaGrowth;
const isaIncome   = isaPotAllIn * 0.04;
const isa = { ... potAtRetirement: isaPotAllIn, annualIncomeAtRetirement: isaIncome,
              limitExceeded: contribution > isaLimit, _phasePot: isaPotPhase };
```

`isaPotAllIn` projects the **full** `contribution` into an ISA with no
`Math.min(…, 20000)`. For the live case it models £27,500/yr into an ISA —
£7,500/yr above the statutory limit — producing the headline
"**ISA provides the highest accessible income at age 55 — £59,783/yr**", which
is not legally achievable.

This is the same family as Task 1 Finding 4 (the Mix card, already fixed). The
`limitExceeded` flag is set but never used to cap the projected pot or income.

**Verification:**
```
projectPot(27500, 25, 0.0439) + 80000×1.0439^25  = £1,494,517  (live £1,494,575)
income @4%                                        = £59,781     (live £59,783/yr)
```

**Impact:** The "best option" recommendation and the side-by-side comparison
overstate the ISA by treating it as uncapped. The ISA can be ranked #1 on an
unachievable basis.

---

## Problem 2 — Net Worth ignores the selected optimization mode (MEDIUM)

**Where:** `App.js` lines ~396-397 and ~617-619; UI line ~2370.

```js
const actionPlan      = modeData.maxReturn.actionPlan;   // hardcoded maxReturn
phaseAllocations      = modeData.maxReturn.phaseAllocations;
...
const isaOptPot = (… _phasePot && phaseAllocations.length>0) ? isa._phasePot : isa.potAtRetirement;
```

`netWorth` (and therefore the Net Worth card) is computed **once** from the
hardcoded `maxReturn` phase allocations. The mode toggle (`optMode`) correctly
re-selects the Action Plan, timeline, and recommendation per mode
(lines 2163-2164, 2422) — but **not** `netWorth`.

Result: with "Target Age" selected (ISA-first → £20k/yr ISA, ISA pot grows to
£647,496 in the Action Plan), the Net Worth card still shows the maxReturn ISA
of **£234,200** (existing £80k only, because maxReturn puts SIPP first and the
budget is exhausted before ISA). The Net Worth card therefore **contradicts the
Action Plan directly above it**.

**Verification (maxReturn, SIPP-first, higher-rate so SIPP takes all £27,500,
ISA gets no new money):**
```
existing ISA 80000 × 1.0439^25 = £234,187   (live £234,200)
```

---

## Why this matters for assessment (TM470)

- Three contradictory numbers for the same quantity undermines the
  "transparent, auditable" claim in PROJECT_DESCRIPTION.md and the tutor's
  emphasis on testing/evaluation evidence.
- Both are good, concrete examples for the evaluation chapter: one a
  domain-rule violation (ISA cap), one a state-management bug (stale derived
  value not reacting to the mode toggle).

---

## Recommended fixes (for approval)

**Problem 1 — cap the comparison ISA at £20,000/yr.** Mirror the Mix-card fix:
```js
const isaPotAllIn = projectPot(Math.min(contribution, 20000), years, realReturnRate) + existingIsaGrowth;
```
This makes the recommendation/comparison ISA consistent with the action plan
and the law. Changes the ISA pot/income shown for any contribution > £20k
(intended correction). For contributions ≤ £20k, no change.

> Consideration: if `contribution > 20000`, the excess would in reality go to a
> GIA. The comparison card models pure-ISA, so capping is the minimal correct
> fix; optionally note "excess would need a GIA" (the action plan already says
> this).

**Problem 2 — make Net Worth mode-aware.** Compute `netWorth` per mode (inside
the existing `for (const mode of MODES)` loop) and have the UI read
`displayResults.modes[optMode].netWorth`, the same way it reads the action plan
and recommendation. Larger change (touches the results shape and one UI
binding); behaviour for `maxReturn` stays identical.

**No deploy until you've reviewed** — these change user-visible numbers
(intentionally), unlike the Task 2 tax fix.

---

## What was done (fixes applied)

**Status:** Both fixes approved and applied. Build passes. Not yet deployed.

### Fix 1 — cap the comparison/recommendation ISA at £20,000/yr

**File:** `src/App.js` `buildResults` (~line 419).

```js
// before
const isaPotAllIn = projectPot(contribution, years, realReturnRate) + existingIsaGrowth;
// after
const isaPotAllIn = projectPot(Math.min(contribution, isaLimit), years, realReturnRate) + existingIsaGrowth;
```

**Before / after (live case: £27,500/yr, 25 yrs, 4.39% real, £80k existing ISA):**

| | ISA pot | Income @4% |
|---|---|---|
| before (uncapped) | £1,494,575 | £59,783/yr |
| after (capped £20k) | £1,150,791 | £46,032/yr |

For contributions ≤ £20,000 there is no change. The recommendation headline and
the comparison "ISA" option now reflect an achievable subscription.

### Fix 2 — make the Net Worth card follow the optimisation toggle

**Files:** `src/App.js` `buildResults` (new `isaPhasePotForAllocs` helper ~line
432; per-mode `netWorth` built in a loop ~line 715) and the Net Worth card UI
(~line 2400, now reads `displayResults.modes[optMode].netWorth` via an IIFE,
with a fallback to the legacy `displayResults.netWorth` for previously-saved
calculations).

Only the ISA pot varies by mode; SIPP, AP, property, cash and DB are
mode-independent, so they are reused unchanged.

**Before / after (live case, ISA pot shown in Net Worth card):**

| Selected mode | before | after |
|---|---|---|
| Max Return | £234,187 | £234,187 (unchanged) |
| Target Age | £234,187 (frozen, wrong) | £1,150,791 (matches its Action Plan) |
| Earliest FIRE | £234,187 (frozen, wrong) | reflects that mode's ISA allocation |

`maxReturn` output is byte-identical to before (verified). The Net Worth card no
longer contradicts the Action Plan above it.

### Verification

- Per-mode ISA pots reproduced in isolation against the live figures (tables
  above) — match to rounding.
- `react-scripts build` — succeeds, no errors.
- maxReturn net worth confirmed unchanged (£234,187 ≈ live £234,200).
