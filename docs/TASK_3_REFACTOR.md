# Task 3 — Refactor App.js into Pure, Testable Modules

**Date:** 2026-06-25
**Status:** Complete. Build passes; legacy Node scripts byte-identical throughout;
all calculation behaviour unchanged (verified per step).

## Goal

Extract the calculation logic out of the ~2,600-line `App.js` monolith into
separate, UI-free modules so the whole calculation layer can be unit-tested in
Node without a browser, with calculation fully separated from presentation. No
calculation behaviour was to change — the numbers the app produces must be
identical before and after.

## What we did (incremental, one commit per step)

| Step | Commit | Module created | Moved out of App.js |
|---|---|---|---|
| 1 | `e7219fc` | `utils/taxCalculations.js` (150) | parseTaxCode, inferStatePensionAge, getEffectivePA, calcIncomeTax, getMarginalTaxRate, calcNI, getMarginalNI |
| 2 | `7a383c3` | `utils/pensionModelling.js` (92) | projectPot, calcMixScenarios |
| 3 | `8211f54` | `utils/allocationEngine.js` (142) | shared SIPP/ISA/GIA step builders + mode ordering (de-duplicated from both action-plan files) |
| 4 | `eceb2e2` | `utils/buildResults.js` (579) | the core calculation orchestration engine |
| 5 | `bbe4037` | `utils/formatters.js` (22), `utils/chartHelpers.js` (39) | fmtGBP, fmtPct, computeLabelPositions |
| 6 | `8336173` | `components/*.jsx` (7 files) | StepProgress, ActionPlanCard, MixCard, RetirementTimelineChart, TotalWealthChart, RetirementPictureCard, ResultCard |
| 7 | `68df817` | `components/SavedCalculationsPanel.jsx` (68) | saved-calculations list UI |

### `App.js`: 2,613 → 766 lines (−71%)

`App.js` now holds only `getCalcSummary` and the top-level `App()` component
(form state, the 4-step wizard, page layout, save/compare orchestration). Every
calculation lives in a pure module; every result card lives in `components/`.

## Why these boundaries

- **taxCalculations / pensionModelling** — the pure financial primitives. No
  React, no DOM, deterministic. These are the prime targets for the Task 4 unit
  tests (taper, NI, FV at r=0, negative real return, ISA cap, mix).
- **allocationEngine** — both action-plan builders had an identical copy of the
  SIPP step, ISA step, GIA overflow and mode-ordering logic. Extracting it
  removed ~190 lines of duplication; `actionPlanMOD` (236→143) keeps only its
  AFPS-15 Added Pension step, `actionPlanCivilian` (149→54) became a thin wrapper.
- **buildResults** — the orchestration engine. Pure aside from the injected
  `fmtGBP`/`fmtPct` formatters (passed in rather than imported so the engine
  stays free of UI coupling). This is the single most valuable extraction for
  testing: a whole scenario can now be driven in Node.
- **components/** — presentation only. Each takes `results`/props and renders;
  shared helpers (`formatters`, `chartHelpers`) are imported, not duplicated.

## Purity and dependency injection

Every extracted calculation function is pure: same input → same output, no React
state, no DOM, no side effects. Where a calculation needs to produce a
human-readable string (e.g. action-plan step descriptions), the `fmtGBP`/`fmtPct`
formatters are **injected as parameters** rather than imported, so the
calculation modules have zero UI dependency and can be tested with trivial stub
formatters.

Each exported function has a JSDoc block describing inputs, outputs and key
assumptions (e.g. "assumes 2025/26 tax year").

## How "no behaviour change" was verified at every step

1. **Build gate** — `react-scripts build` after each step. CRA fails the build
   on any undefined reference, unused import, or JSX/prop error, so a green
   build proves the wiring is intact.
2. **Legacy scripts byte-identical** — `test-runner.js`, `detailed-tests.js`,
   `test-added-pension.js` output diffed against a baseline captured before the
   refactor. Identical after every commit.
3. **Golden-value harnesses** — small Node ES-module harnesses imported the
   *actual* extracted modules and checked them against the figures verified in
   live testing:
   - tax: 30k/70k/110k/125,140/160k, taper PA, NI, 0T — all match.
   - projectPot: r=0 → C×n, years=0, negative real return.
   - allocation: MOD Target-Age (retire<67) → ISA £20k + SIPP £7,500 (AP
     skipped); civilian maxReturn = SIPP-first, earliestFire = ISA-first.
   - **buildResults end-to-end**: the £160k / retire-55 scenario reproduces
     exactly — income tax £58,203, ISA pot £1,150,837, SIPP pot £429,673, total
     net worth £2,009,571, FIRE £750,000, maxReturn ISA £234,200.

## Files still over the 400-line target (deliberate)

- **`buildResults.js` (579)** — one cohesive orchestration function. Splitting a
  single sequential calculation into arbitrary sub-files would hurt readability
  and traceability more than it helps; it is pure and fully testable as one unit.
- **`App.js` (766)** — the single stateful `App()` React component (form state,
  wizard, layout). Splitting further means lifting interdependent `useState`
  hooks and form handlers — high churn, real regression risk, and not verifiable
  by the Node scripts. The brief's core intent (calculation fully separated from
  presentation) is met; this residual is presentation/state only.

## Note for the next deploy

The component split is pure presentation and is guarded by the build, but the
React UI is not exercised by the Node test scripts. The **SavedCalculationsPanel**
(save / rename / delete / compare / select) in particular is worth a quick
manual click-through after the next `npm run deploy`.

## Final structure

```
src/
  App.js                         766   orchestration + form/layout (App component)
  utils/
    taxCalculations.js           150   pure: tax, NI, PA taper, marginal rates
    pensionModelling.js           92   pure: projectPot, calcMixScenarios
    allocationEngine.js          142   pure: shared SIPP/ISA/GIA step builders
    buildResults.js              579   orchestration engine (formatters injected)
    formatters.js                 22   fmtGBP, fmtPct
    chartHelpers.js               39   computeLabelPositions
  components/
    RetirementTimelineChart.jsx  291
    RetirementPictureCard.jsx    251
    TotalWealthChart.jsx         223
    ActionPlanCard.jsx           127
    MixCard.jsx                   76
    ResultCard.jsx                71
    SavedCalculationsPanel.jsx    68
    StepProgress.jsx              27
  actionPlanMOD.js               143   MOD plan (AP step + shared engine)
  actionPlanCivilian.js           54   civilian plan (thin wrapper over engine)
```
