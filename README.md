# Soldiers Fortune — Math & Logic (overview)

This document explains, in UK English, the core mathematical models and fiscal assumptions used by the Soldiers Fortune web app. It is intended for developers and auditors who want to understand how numbers are calculated; it is not financial advice.

## High-level summary
- Projections use yearly contributions compounded at a real return (nominal return adjusted for inflation).
- The app compares Stocks & Shares ISAs (tax-free growth and withdrawals) with SIPP (pension) contributions which receive tax relief and are partially taxable in retirement.
- For serving personnel the AFPS‑15 "Added Pension" (AP) is modelled as an additional DB-style pension with a lifetime cap; the app computes the implied cost and resulting pension value.

## Recent changes
- Fix: Corrected `phaseAllocations` construction so phased allocations compute cumulative `startAge`/`endAge` and per-vehicle amounts correctly — fixes timeline and phased ISA pot computations.
- Fix: Prevent division-by-zero in `calcMixScenarios` when `returnRate === 0` by using a safe fallback for the FV factor.
- Fix: Moved `fmtGBP` and `fmtPct` formatter initialisations so they are defined before any function uses them (prevents runtime reference errors).
 - Enhancement: AFPS‑15 inclusion is now decided dynamically by comparing a notional "efficiency" metric for AP vs allocating the same budget into a SIPP (and by a high marginal tax+NI heuristic). This prevents the action plan from always prioritising AP when SIPP/ISA would be superior for the same gross budget.
 - Enhancement: SIPP top-up limits derived from a PA-driven FV factor are used to decide how much to allocate to SIPP vs ISA (see the SIPP/PA note below).

## Important constants & limits used
- Personal Allowance (default): £12,570 (used unless a different tax code is parsed).
- Income tax bands (England/Wales assumptions for 2025/26 in this model):
  - Basic rate band up to £50,270 (20%).
  - Higher rate up to £125,140 (40%).
  - Additional rate above that (45%).
  - Special behaviour: the personal allowance tapers away for gross income above £100,000, creating an effective 60% marginal rate between £100,000 and £125,140 in the model.
- ISA annual subscription limit: £20,000.
- SIPP gross contribution cap applied in the model: up to £60,000 gross (subject to salary cap logic used in `buildResults`). The code derives a net-equivalent SIPP limit as `Math.floor(Math.min(60000, salary) / 1.25)`.
- AFPS‑15 Added Pension lifetime cap (used in calculations): £8,571.21 (represented in code as `AP_LIFETIME_MAX = 8571.21`).

## Tax code parsing and marginal tax rate logic
- The app accepts common tax codes (e.g. `1257L`, `BR`, `D0`, `D1`, `NT`, `0T`, `Kxxx`).
- Behaviour:
  - `BR` = all taxed at 20% (no personal allowance applied).
  - `D0` = all taxed at 40%.
  - `D1` = all taxed at 45%.
  - `NT` = no tax deducted.
  - `0T` = no personal allowance this year.
  - `K` codes reduce the allowance (negative allowance logic).
- Effective personal allowance: the function `getEffectivePA(gross, basePa)` applies the taper: if gross > £100,000, allowance reduces by £1 for every £2 of income above £100k (to minimum 0). That creates the 60% effective marginal rate in the affected band.

## Income tax & NI calculations
- Income tax is computed with the allowances described above and the band thresholds used in the code. The `calcIncomeTax(gross, taxInfo)` function returns the annual income tax liability.
- National Insurance (NI) is modelled simplistically in `calcNI(salary)` with two marginal rates used by the app: 8% between the lower threshold and upper threshold, and 2% above that. These are simplified approximations intended for guidance.

## How SIPP contributions are modelled (government top-up / tax relief)
- User-facing contribution is treated as the net cost (what the individual pays) in several places. The model applies the basic-rate top-up (the usual 20% relief) by computing:

  sippGovTopUp = sippNet × (20 / 80)

  This is equivalent to the common finance convention where a £80 net contribution becomes £100 gross after the 20% basic-rate top-up (i.e. net × 1.25).
- If the taxpayer is in a higher marginal band (e.g. 40%), the model computes an extra relief amount as:

  sippExtraRelief = sippGross × (taxRate − 0.20)  (only if taxRate > 0.20)

  This extra relief is assumed claimable via self-assessment and reduces the net cost to the contributor.

## ISA modelling
- ISA contributions are assumed to grow tax-free and remain accessible at any time.
- The app computes two ISA pot sizes:
  - `_phasePot`: the ISA pot computed from the actual phased allocations produced by the action-plan builder (used for timelines and phased projections).
  - `isaPotAllIn`: the pot if the full contribution each year were invested into an ISA (used for comparison cards).

## Projection math (compound growth)
- The function used for the future value of repeated annual contributions is the standard annuity future value:

  FV = C × ((1 + r)^n − 1) / r × (1 + r)

  where:
  - `C` = annual contribution,
  - `r` = real return rate (nominal return adjusted for inflation), and
  - `n` = number of years.
 - Implementation note / safe-fallback: when `r === 0` the code avoids division-by-zero and uses the algebraic limit `FV = C × n` (or equivalently uses the `phaseYears` value directly for the contribution accumulation factor).
- Existing pots are grown with simple compounding: existing × (1 + r)^n.
- Real return is calculated as: realReturnRate = (1 + nominal) / (1 + inflation) − 1. This keeps projections in today's money.

## Retirement income modelling
- ISA retirement income is modelled as pot × 0.04 (a 4% safe-withdrawal-rate proxy).
- SIPP retirement modelling: the app splits the SIPP pot into 25% tax‑free lump sum and 75% drawdown. Drawdown income is modelled as 75% of the pot × 0.04, and income tax on that drawdown is estimated using the personal allowance at retirement.

## AFPS‑15 Added Pension modelling
- The app computes AFPS‑15 Added Pension (AP) contributions using a per-£100/yr cost factor which can be provided by the user (or estimated). Important values in the code:
  - `AP_LIFETIME_MAX = 8571.21` — maximum added pension (in £/yr) allowed by the lifetime cap used in the model.
  - `costPer100actual` — the cost per £100 of added pension per year; if the user supplies a value it is used, otherwise an estimated cost is used.
 - `pensionPerYear` — number of £100 units bought per year, derived from contribution divided by cost-per-£100 (code: `apBPY = apAlloc / costPer100actual`).
 - `totalPensionAcquired` — capped at `AP_LIFETIME_MAX`.
 - `apPot` — the notional capital value of the added pension in retirement used in comparisons. The code uses a simple DB capital equivalence:

  apCapitalEq = totalPensionAcquired × 25

  (the ×25 proxy converts an annual DB-style pension into a rough lump-sum capital-equivalent used for wrapper-efficiency comparisons).

 - AP inclusion decision: the MOD action-plan builder computes an "AP efficiency" metric (capital-equivalent bought per unit net cost) and compares it to an equivalent SIPP efficiency computed by projecting the same gross budget into a SIPP. AP is only included for the phase if either:
   - apEfficiency ≥ 0.9 × sippEfficiency, or
   - (taxRate + niRate) ≥ 0.5 (i.e. very high marginal tax/NI makes AP favourable).

  This prevents always prioritising AP where a SIPP (or ISA) would give equal or better retirement capital for the same net cost.

## Action plan and phased allocations
- The app builds a per-phase action plan (either MOD or civilian variant) which defines yearly allocations across vehicles such as AFPS Added Pension, SIPP, and ISA. Each phase lists start/end ages and per-vehicle gross allocations.
- These allocations are used to compute `_phasePot` values for ISAs and phased growth for chart timelines, which gives a more realistic picture than an "all-in" comparison.
Note: `startAge`/`endAge` for phases are computed cumulatively (each phase starts when the previous one ends), ensuring timeline and phased pot computations align with the action plan.

## Mix analysis and efficiency
- The app evaluates a set of ISA/SIPP splits (100% ISA → 100% SIPP in predefined increments) and compares them by an efficiency metric defined roughly as `potAtRetirement / netCostToYou`.
- It also identifies the split that maximises income per pound of net cost, and computes a "sweet spot" where SIPP drawdown remains within personal allowance in retirement (so withdrawals are untaxed).

## Simplifying assumptions & limitations
- Some UK rules are modelled approximately for simplicity (for example NI calculation and some band edges). Use this tool for guidance only.
- The AFPS‑15 modelling uses simplified equivalence (e.g. ×25 as a lump-capital proxy) which is indicative and not the official actuarial conversion.
- Tax rules and thresholds change over time; the app uses the embedded thresholds and parsing logic in the codebase and is not a substitute for up-to-date official guidance.
- Investment returns are modelled with constant annual returns (nominal, then adjusted to real). Real markets are stochastic and results are illustrative.

## Files of interest (for maintainers)
- `src/App.js` — central orchestration (`buildResults`, UI wiring, constants).
- `src/actionPlanMOD.js` and `src/actionPlanCivilian.js` — generators that build phased allocations and guidance specific to serving personnel or civilians.
- `src/__tests__/buildResults.test.js` — unit tests for core calculations.

## Where to look if you change assumptions
- If you change the nominal/inflation assumptions or tax band thresholds, update the constants and helper functions in `src/App.js` (search for `getEffectivePA`, `calcIncomeTax`, `calcNI`, and `AP_LIFETIME_MAX`).

## Disclaimer
This README explains how the app calculates projections and should be used for developer understanding only. It does not constitute financial advice. For decisions about pensions, ISA usage, AFPS‑15, and tax planning, consult a qualified financial adviser or HMRC guidance.
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
