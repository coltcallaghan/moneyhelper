# Task 4 — Migrate Tests to a Framework (Jest)

**Date:** 2026-06-25
**Status:** Complete. `npm test` → **51 tests, 4 suites, all passing.** Legacy
Node scripts still run. Build unaffected.

## What we did

1. **Re-enabled the test runner.** `package.json`'s `test` script was stubbed
   (`"Tests are disabled in this workspace."`). Restored it to
   `react-scripts test`, which ships Jest with CRA — **no new dependencies**.
2. **Removed the stale CRA boilerplate.** The default `src/App.test.js`
   ("renders learn react link") tested text the app doesn't contain. Deleted it.
3. **Neutralised `src/setupTests.js`.** It imported `@testing-library/jest-dom`,
   which isn't installed. Our tests are pure-function (no DOM matchers), so the
   import was removed rather than adding a dependency just to satisfy it. (A note
   in the file explains how to re-add it if component/DOM tests are introduced.)
4. **Wrote Jest suites** for the pure calculation modules extracted in Task 3,
   using `describe` / `it` / `expect`, covering every boundary value the brief
   lists plus the figures verified during live testing.

This was possible cleanly *because* of Task 3: the calculation layer is now pure
and importable, so it can be unit-tested in Node with no browser and no React.

## Test files

| File | Tests | Covers |
|---|---|---|
| `src/utils/taxCalculations.test.js` | tax code parsing, taper, income tax, marginal rates, NI, SPA | |
| `src/utils/pensionModelling.test.js` | `projectPot` (r=0, years≤0, annuity-due, negative real return), `calcMixScenarios` (ISA cap, relief) | |
| `src/utils/allocationEngine.test.js` | ISA £20k boundary, SIPP top-up/relief, GIA overflow, mode ordering | |
| `src/utils/buildResults.test.js` | end-to-end £160k scenario, net-worth sums, AFPS gate behaviour, civilian exclusion | |

## Boundary-value cases required by the brief — all included

- **Personal allowance taper at £100,000 / £110,000 / £125,140** —
  `taxCalculations.test.js`. Also asserts the band carries a genuine **60%**
  effective marginal rate (£100k→£110k costs £6,000 on £10,000).
- **ISA contribution at exactly £20,000 and just over** —
  `allocationEngine.test.js`: at £20,000 the whole budget is allocated; at
  £20,001 it caps to £20,000 and emits the GIA-overflow warning.
- **Annuity future value at r = 0** — `pensionModelling.test.js`: `projectPot`
  returns `C × n` (no divide-by-zero).
- **Negative real return (inflation > nominal)** —
  `pensionModelling.test.js`: matches the algebraic value and is below the
  straight sum `C × n`.
- **AFPS-15 efficiency gate** — `buildResults.test.js`. The gate (`>= 90%` of the
  SIPP-equivalent efficiency, tightened to `100%` and tax-shortcut disabled when
  retiring before SPA) is exercised through the real pipeline. In practice the
  SIPP alternative usually wins, so AP is **excluded** across realistic serving
  scenarios (retire 55 *and* retire 67 both → £0 AP bought); the option-level
  AFPS pension is always capped at the £8,571.21/yr lifetime max. These tests pin
  that behaviour down. (The exact `>=` boundary at 90% was proven in Task 1; it
  lives inline in `actionPlanMOD.js` and would need its own export to assert in
  isolation — noted for a future refactor if finer gate testing is wanted.)

## Result

```
$ npm test
Test Suites: 4 passed, 4 total
Tests:       51 passed, 51 total
```

The Jest suite is now the source of truth and locks in every number verified
across the live-testing sessions, so any future change that breaks a calculation
fails CI immediately. The original Node scripts (`test-runner.js`,
`detailed-tests.js`, `test-added-pension.js`) still run for narrative/manual use.

## Notes / future work

- No DOM/component tests yet (the brief's focus is calculation correctness). To
  add them later: `npm i -D @testing-library/react @testing-library/jest-dom`
  and restore the `setupTests.js` import.
- `buildResults.js` and `App.js` remain > 400 lines by design (see
  `TASK_3_REFACTOR.md`); they don't affect testability of the pure layer.
