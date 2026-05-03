# Soldiers Fortune

A React web application that helps UK Armed Forces personnel and civilians model retirement outcomes and build tax-aware savings plans.

> **Disclaimer:** This tool is a simulation for illustrative purposes only and does not provide regulated financial advice. For personalised advice, consult an FCA-authorised financial adviser.

---

## What it does

Users complete a 4-step wizard entering their service status, personal details, current savings, and retirement goals. The app then produces:

- **Tax summary** — income tax and NI breakdown based on salary and tax code
- **FIRE number** — target pot size based on desired retirement income
- **Phased action plan** — ranked allocation strategy across ISA, SIPP, and AFPS-15 Added Pension (MOD personnel only)
- **Retirement income timeline** — chart showing projected income by age
- **Accumulated wealth chart** — compound growth visualisation
- **Side-by-side comparison** — ISA vs SIPP vs AFPS-15 efficiency

Three optimisation modes let users switch between **Max Return**, **Earliest FIRE**, and **Target Age** to see how their action plan changes.

---

## Key financial modelling

- Real (inflation-adjusted) returns using `(1 + nominal) / (1 + inflation) − 1`
- Standard annuity future value: `FV = C × ((1 + r)^n − 1) / r × (1 + r)`
- Income tax using 2025/26 England/Wales bands including the £100k–£125,140 personal allowance taper (60% effective marginal rate)
- SIPP tax relief: basic-rate top-up plus higher-rate relief via self-assessment
- AFPS-15 Added Pension modelled against a DB capital equivalence (×25 proxy), included only when efficiency ≥ 90% of equivalent SIPP allocation
- ISA withdrawals modelled at a 4% safe withdrawal rate

See [docs/PROJECT_DESCRIPTION.md](docs/PROJECT_DESCRIPTION.md) for full detail.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19.2.4 |
| Charts | Recharts |
| Language | JavaScript (ES2022) |
| Deployment | GitHub Pages |

---

## Project structure

```
src/
  App.js                  # Central orchestration, tax/NI calculations, results
  actionPlanMOD.js        # Phased allocations for serving personnel
  actionPlanCivilian.js   # Phased allocations for civilians
  steps/                  # 4-step wizard components
  components/             # Shared UI components
docs/
  PROJECT_DESCRIPTION.md  # Problem statement and scope
  PROJECT_LOG.md          # Weekly development journal
  PROJECT_TIMELINE_TABLE.md
  FCA_COMPLIANCE_NOTICE.md
  APPENDIX_2_REFLECTIVE_SUMMARY.md
test-runner.js            # Quick scenario tests
detailed-tests.js         # Realistic tax and allocation scenarios
architecture.drawio       # System architecture diagram
```

---

## Running locally

```bash
npm install
npm start        # http://localhost:3000
npm test         # unit tests
node test-runner.js      # scenario tests
node detailed-tests.js   # detailed tax/allocation tests
```

---

## Deployment

```bash
npm run build
npm run deploy   # pushes to gh-pages branch → soldiersfortune.co.uk
```

---

## Assumptions and limitations

- NI rates are simplified approximations for guidance purposes
- AFPS-15 ×25 capital equivalence is indicative, not an official actuarial conversion
- Tax thresholds are fixed at 2025/26 values
- Returns are modelled at a constant annual rate; real markets are stochastic
