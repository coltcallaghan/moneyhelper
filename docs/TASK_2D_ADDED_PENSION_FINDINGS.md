# Task 2d — Added Pension Shown But Not Allocated (Investigation & Fix)

**Date:** 2026-06-02
**Status:** Fixed. Build passes. (Commit + deploy per your go-ahead.)
**Trigger:** On the live Target-Age output (serving, retire at 55), the **Total
Retirement Picture** showed "AFPS 15 Added Pension £8,571/yr" from age 67, even
though the **Action Plan allocated £0 to Added Pension** (only ISA + SIPP steps).

Same *class* of defect as Tasks 2b/2c (a card showing figures from a different
scenario than the plan actually chose), but for the **Added Pension** vehicle,
and it affected **three** places at once.

---

## The bug

`buildResults` computes the AP option's `totalPensionAcquired` from the user's
**whole contribution** run against the AFPS-15 cost factors
(`pensionPerYear × leaveYears`, capped at the lifetime max), **independently of
whether the allocation engine bought any AP.**

For the reported case the engine **correctly skips AP** — retiring at 55 is
before State Pension Age (67), so `actionPlanMOD.js` (`skipAPForEarlyRetire`,
and the efficiency gate with a ~37-year delay penalty) allocates £0 to AP in
every mode. But the AP *option object* still reported the full capped
`totalPensionAcquired = £8,571.21`, which three cards then displayed:

| Card | showed (wrong) | should be |
|---|---|---|
| Retirement Picture — AP income (age 67+) | £8,571/yr | £0 |
| Net Worth — Added Pension (commuted) | £214,280 (= 8,571 × 25) | £0 |
| Phase 3 (67+) total | £87,996/yr | £79,425/yr |

It was also a **latent net-worth overstatement in maxReturn**: maxReturn also
allocates £0 to AP here (the 37-year delay penalty crushes AP efficiency:
1.0439⁻³⁷ ≈ 0.20), so the £214,280 AP pot was wrong in every mode, not just the
displayed one.

### Verification

```
costPer100 ≈ 800 × 1.042^(30−20) ≈ £1,207
full-contribution AP: (27,500 / 1,207) × 100 × 5 yrs ≈ £11,392 → capped £8,571.21
plan-allocated AP (ph.ap = 0 in all phases)          → £0
```

---

## The fix

Derive Added Pension income/lump/pot from the **AP actually bought by the active
mode's phase allocations** (`ph.ap`), mirroring the ISA and SIPP phase fixes.

**File:** `src/App.js`.

1. Added `apPensionForAllocs(allocs)` (~line 472): sums each phase's AP gross
   (`ph.ap`) ÷ cost-per-£100 × £100 × phase-years, capped at `AP_LIFETIME_MAX`.
   Returns **0** when the plan bought no AP.

2. In the per-mode loop (~line 781): compute `apPhasePension`, `apPhaseEdpLump`
   (× 2.25), `apPhaseEdpIncome` (× 0.34) and `apOptPot` (pension × 25 + EDP
   lump) **per mode**, and use them in that mode's `netWorth`.

3. Passed the active mode's AP values through `activeResults`
   (`activeApPhasePension`, `activeApPhaseEdpLump`, `activeApPhaseEdpIncome`,
   ~line 2276).

4. `RetirementPictureCard` (~line 1531) now reads those for `apAnnualFull`,
   `edpLump`, `edpAnnual`, with a fallback to the legacy option figures for
   calculations saved before this change.

### Before / after (reported case: serving, retire 55, Target Age)

| Figure | before | after |
|---|---|---|
| Retirement Picture AP income (67+) | £8,571/yr | **£0** (not shown) |
| Phase 3 (67+) total | £87,996/yr | **£79,425/yr** |
| Net Worth — Added Pension | £214,280 | **£0** |
| Net Worth — Total | £1,834,790 | **£1,620,510** |

### Conditional correctness (not a blanket zero)

`apPensionForAllocs` reads what the plan bought, so:

- **Retire < 67** → engine skips AP (`ph.ap = 0`) → no AP income shown. ✅
- **Retire ≥ 67** → engine allocates AP (`ph.ap > 0`) → AP income shows,
  proportional to what was actually bought. ✅

So Added Pension still appears for users it genuinely makes sense for.

### Verification

- AP allocation traced for both retire-before-SPA and retire-at/after-SPA.
- `react-scripts build` — succeeds, no errors.

---

## Known remaining difference (intentional, documented)

The **Full Comparison** grid still shows a standalone "AFPS 15 Added Pension"
card (£214,280 pot / £8,571/yr). That grid presents each vehicle as a
**hypothetical "what if you put your contribution here"** comparison (the ISA
and SIPP cards there are also standalone hypotheticals), so it is a different
view from the plan by design. It is *not* part of the Retirement Picture or Net
Worth, which now reflect the actual plan. Flag for a future decision if the
standalone AP card should also respect the early-retirement accessibility
caveat.

After Tasks 2b + 2c + 2d, the **Action Plan, Net Worth and Retirement Picture**
all derive ISA, SIPP and Added Pension from the same per-mode phase allocations
and agree with each other.
