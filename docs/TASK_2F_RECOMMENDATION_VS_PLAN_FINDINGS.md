# Task 2f — Recommendation Net Cost vs Action Plan, and SIPP Relief Base (Investigation)

**Date:** 2026-06-02
**Status:** Investigation complete. One fix applied (Issue A wording/consistency),
one documented as an edge-case limitation (Issue B). Build passes.
**Scenario tested:** serving, age 30, £160,000 salary, £27,500/yr, retire 60,
£80k ISA, £9k DB, £40k cash, property £10k / mortgage £37k. Target Age mode.

**Important framing:** every figure on the page reconciles arithmetically and
the cross-card pots/income are consistent (verified). The two items below are a
**presentation inconsistency** and a **modelling edge case**, not arithmetic
errors.

---

## Cross-card reconciliation (all correct, £160k)

| Quantity | Computed | Card |
|---|---|---|
| Income tax | £58,203 | £58,203 |
| NI | £5,211 | £5,211 |
| Net Worth total (incl. DB + property) | £2,409,785 | £2,409,785 |
| ISA income | £61,624 | £61,624 |
| SIPP drawdown / lump | £17,582 / £146,517 | same |
| Retirement Picture totals | £79,206 / £99,708 | same |
| SIPP / ISA / AP efficiency | 113.66 / 56.02 / 14.70 | same |

---

## Issue A — Recommendation "net cost" contradicts the Action Plan (MEDIUM, presentation)

**Where:** Recommendation card + Full Comparison grid vs the Action Plan.

The Recommendation says **"SIPP — net cost to you £18,906, projected pot
£2,148,913, best for Target Age"**. But the **Action Plan only allocates
£7,500/yr to SIPP** (the bulk goes to ISA, £20,000/yr). The recommendation and
comparison cards model a **standalone "put the entire £27,500 into this one
vehicle"** scenario; the action plan models the **actual blended plan**. Both
are internally correct, but presented side by side they look contradictory — a
user sees "best = SIPP, £18,906 net" above a plan that is mostly ISA.

This is the same *family* as Tasks 2b–2e (a card implying a different allocation
than the plan), but here the comparison grid is **intentionally** a per-vehicle
"what if" — so the right fix is to **label it clearly**, not to change the maths.

**Verification:** SIPP standalone net £18,906 = £27,500 − (£34,375 × 25%);
efficiency 113.66 = £2,148,913 / £18,906. Correct as a standalone figure.

### Fix applied
Clarify, in the comparison section heading, that each card shows the result of
putting the **whole** contribution into that single vehicle (a comparison), and
that the **Action Plan** above is the actual recommended split. No numbers
change. (Wording-only; keeps the useful per-vehicle comparison while removing
the apparent contradiction.)

---

## Issue B — SIPP higher-rate relief base (LOW, edge case — documented, not changed)

**Where:** `actionPlanMOD.js` / `actionPlanCivilian.js` (`sExtra = sGross ×
(taxRate − 0.20)`) and `App.js` `sippExtraRelief`.

The model grants higher-rate relief as `(marginalRate − 20%) × grossSIPP`, using
the **salary's** marginal rate, and assumes the whole gross contribution
receives relief.

**At £160k this is correct** — the entire SIPP gross sits in the 45% band and is
well within earnings, so £2,344 (step) and £8,594 (standalone) relief are right.

**Two real-world caveats it doesn't model** (both rare for this app's audience):

1. **Relief limited to 100% of earnings.** HMRC only gives pension tax relief on
   contributions up to your earnings (or £3,600). The app would over-credit
   relief if SIPP *gross* exceeded salary (e.g. earn £5k, contribute £27.5k).
   For the tested cases SIPP gross < salary, so it does not bite.
2. **Relief that straddles a band.** If only part of the gross falls in the
   higher-rate band, blended relief would be lower than `(marginal − 20%) ×
   gross`. The app applies the top marginal rate to the whole contribution.

**Decision:** left unchanged. Both are edge cases that don't affect the
documented test scenarios, and modelling them precisely needs the contribution
split across bands — a larger change better suited to the Task 3 refactor (pure
`pensionModelling.js`) with dedicated tests. Recorded here as a known limitation
for the TM470 evaluation.

---

## Summary

- **Issue A:** real presentation inconsistency → fixed by labelling the
  comparison as per-vehicle "what if", leaving figures intact.
- **Issue B:** correct for the tested incomes; two edge cases (earnings cap,
  band-straddling relief) documented as limitations, to be modelled during the
  Task 3 refactor with unit tests.
- All cross-card numbers verified consistent at both £16k and £160k.
