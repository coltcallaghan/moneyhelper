# Soldiers Fortune — Project Description & Scope

## Description

Soldiers Fortune is a browser application that models UK retirement outcomes and recommends phased, tax‑aware saving plans (MOD vs civilian). It projects pension/ISA/SIPP growth, tax and NI impacts, and produces ranked action plans and visual timelines to support individual decision‑making. The deliverable is an interactive web app, documentation, and evaluation demonstrating feasibility and initial user feedback.

---

## Goals

### Primary Goals
1. **Empower UK Armed Forces Personnel and civilians** to make informed, tax-efficient retirement saving decisions by providing real-time, personalised projections based on current UK tax rules and thresholds.

2. **Provide accurate, transparent retirement modelling** covering:
   - ISA (Stocks & Shares) growth and withdrawal strategies
   - SIPP (Self-Invested Personal Pension) contributions with tax relief and retirement drawdown
   - AFPS-15 Added Pension evaluation for serving personnel
   - National Insurance and Income Tax calculations (2025/26 thresholds)
   - Inflation-adjusted projections and real returns

3. **Support multiple optimization modes** allowing users to prioritize different retirement outcomes:
   - Max Return: Maximize capital at retirement
   - Earliest FIRE: Minimize time to financial independence
   - Target Age: Plan around a specific retirement age

4. **Generate ranked, actionable guidance** via phased action plans that:
   - Allocate contributions across vehicles (Added Pension, SIPP, ISA) based on tax efficiency and user goals
   - Display allocations by phase (e.g., pre-retirement, transition, early retirement)
   - Compare outcomes visually with charts and timelines
   - Enable users to understand the trade-offs between saving vehicles

### Secondary Goals
- Provide clear, accessible educational content (e.g., tax code parsing, National Insurance thresholds)
- Maintain compliance and transparency with regulatory disclaimers
- Demonstrate feasibility of a practical retirement planning tool with real-world complexity
- Gather user feedback to validate the tool's usefulness and accuracy

---

## Scope

### In Scope (MVP + Delivered Features)

#### Core Calculations Engine
- **Tax Calculations**: Income tax across bands (20%, 40%, 45%), personal allowance tapering (£100k–£125,140), flat-rate and special tax codes (BR, D0, D1, NT, K-codes)
- **National Insurance**: Simplified 8% and 2% marginal rates
- **SIPP Modelling**: Gross contribution limits (£60,000 cap), basic-rate tax relief, extra-relief claims, and retirement drawdown (75% as income, 25% tax-free lump sum)
- **ISA Modelling**: £20,000 annual subscription limit, tax-free growth and withdrawal
- **AFPS-15 Added Pension**: Lifetime cap (£8,571.21/year), cost-per-£100 factors, capital-equivalence calculation (×25 proxy), efficiency comparison vs SIPP
- **Investment Growth**: Compound annual returns with inflation adjustment; real return = (1 + nominal) / (1 + inflation) − 1
- **Retirement Income**: 4% safe-withdrawal-rate proxy for income modelling

#### User Interface (Multi-Step Form)
1. **Service Status**: MOD (serving personnel) vs civilian classification
2. **Personal Details**: Age, salary, tax code, existing pension value
3. **Existing Savings**: Current ISA/SIPP/cash pots
4. **Goals & Projection**: Contribution amount, retirement age, return assumptions

#### Results & Visualizations
- **Projection Mode Toggle**: Three optimization modes (Max Return, Earliest FIRE, Target Age) affecting all results
- **Recommendation Card**: Ranked action plan with suggested allocations and net worth projection
- **Action Plan Details**: Phased allocations (start/end age, per-vehicle contribution breakdown)
- **Mix Analysis**: ISA/SIPP split efficiency comparison with visual charts
- **Timeline Chart**: Area chart showing ISA/SIPP/AP growth over time with user retirement age marked
- **Saved Calculations**: Local persistence of prior inputs and results

#### Documentation
- `README.md`: Mathematical models and fiscal assumptions (UK 2025/26)
- Tax code parsing guide
- Test suite documentation with realistic scenario validation
- In-app disclaimer and educational hints

### Out of Scope (Beyond MVP)

- **Regulatory compliance**: Full FCA-regulated financial advice designation (tool explicitly disclaims this)
- **Advanced scenarios**: Spousal combined planning, divorce settlements, inheritance
- **Multiple properties**: Mortgage optimization across portfolios
- **Cryptocurrency/alternative assets**: Modelling limited to traditional wrappers (ISA, SIPP, DB pension)
- **Auto-rebalancing**: Dynamic portfolio allocation management
- **API integrations**: Live data feeds from HMRC, pension providers, or stock exchanges
- **Mobile app**: Native iOS/Android (web-only for now)
- **Localization**: Non-English language versions or regional variants (Scottish/Welsh tax bands noted but not fully modelled)

---

## Impact

### User Impact
- **Decision-making support**: Armed Forces personnel and high-earners can evaluate tax-efficient retirement strategies without consulting an adviser (for initial exploration)
- **Time savings**: Rapid scenario comparison (e.g., "what if I increase contributions by £5k?") via interactive form and instant recalculation
- **Cost savings**: Avoids some upfront adviser consultations by providing self-service analysis
- **Tax awareness**: Users understand the implications of tax bands, NI thresholds, and pension tax relief in their specific circumstances
- **Transparency**: All calculations are auditable via the README and code comments

### Technical Impact
- **Codebase**: ~3,400 lines of React/JavaScript across modular step components and calculation engines
- **Performance**: Fast recalculation on form input change (real-time feedback)
- **Maintainability**: Separation of concerns (action plan builders for MOD vs civilian, tax/NI in App.js)
- **Testability**: Comprehensive test suite (unit and integration scenarios) validating allocation logic and edge cases
- **Deployment**: Automated build/deploy via GitHub Pages to soldiersfortune.co.uk

### Market Impact (Potential)
- **Service personnel value**: Fills a gap in retirement planning tools tailored to UK Armed Forces unique benefits (AFPS-15, Added Pension)
- **Emerging market**: First tool to openly model AFPS-15 Added Pension efficiency vs SIPP alternatives
- **User base**: Applicable to:
  - ~80,000 serving UK Armed Forces personnel
  - ~120,000 retired/ex-service personnel
  - High-earning UK civilians seeking ISA/SIPP optimization (secondary audience)

### Educational Impact
- **Open-source approach**: Code and mathematical documentation available for audit and learning
- **Accuracy benchmark**: Can serve as a reference model for other fintech tools and financial advisers
- **User education**: In-app hints and disclaimer educate users on UK tax rules, pension regulations, and tool limitations

### Risk Mitigation
- **Regulatory compliance**: Clear disclaimers ("This tool is for guidance only") protect against mis-selling claims
- **Accuracy**: Embedded test suite and README documentation enable validation by external auditors and advisers
- **Feedback loop**: Saved calculations and user input history support iterative improvement and validation against real outcomes

---

## Success Metrics (Indicators)

- **Usage**: Positive engagement from target user base (Armed Forces personnel, high-earners)
- **Feedback**: Qualitative user feedback on tool usefulness, calculation accuracy, and interface clarity
- **Code quality**: Zero unresolved bugs in core calculations; all tests passing
- **Transparency**: Clear documentation of assumptions and limitations to support regulatory confidence
- **Adoption**: Recommendation/referral by financial advisers as a screening or educational tool

---

## Technical Stack

- **Framework**: React 19.2.4 with Create React App
- **Visualization**: Recharts (area/line charts for projections)
- **Build/Deploy**: GitHub Pages (soldiersfortune.co.uk)
- **Testing**: Node.js test runners (test-runner.js, detailed-tests.js)
- **Documentation**: Markdown (README.md, TESTING_SUMMARY.md, etc.)

---

## Disclaimer

This tool is **illustrative and for educational guidance only**. It does NOT:
- Provide regulated financial advice
- Replace FCA-authorised financial advisers
- Guarantee investment returns or outcomes

Users should consult independent financial advisers before making significant retirement decisions. Tax treatment and official rules should be verified with HMRC and current government guidance.
