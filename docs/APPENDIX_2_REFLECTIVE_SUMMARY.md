 # Appendix 2: Reflective Summary — Soldiers Fortune Development

**Extracted from PROJECT_LOG.md for TMA Submission**

---

## Overview

This appendix documents the exploratory and development work for **Soldiers Fortune**, a UK retirement planning calculator. Over 4 weeks, the project progressed from problem understanding through to a validated MVP with comprehensive testing framework. The development demonstrates systematic problem-solving, critical analysis, and solution evaluation (LO5, LO7, LO8).

---

## What Went Well & Why ✅

### 1. **Systematic Exploratory Testing Approach**
**What**: Created test scenarios (MOD user £70k salary, Civilian £150k salary) and wrote executable test runners to validate allocation logic.

**Why it worked**:
- Tests force explicit thinking about edge cases (e.g., "What happens when ISA limit is £20k but user wants to contribute £40k?")
- Test failures provide concrete evidence of bugs, not subjective "feels wrong" feedback
- Test documentation serves as living specification—anyone can understand expected behavior

**Outcome**: Discovered critical allocation bug in Week 2 (ISA underallocated in Earliest FIRE mode) before users were affected.

### 2. **Transparency & Auditability in Financial Calculations**
**What**: Created detailed README explaining all tax/NI assumptions, included test breakdowns showing tax calculations by band, and added code comments explaining allocation order per mode.

**Why it worked**:
- Financial software requires trust; users/advisers must be able to verify calculations
- Transparent documentation allows independent review without being a domain expert
- Helps future maintainers understand *why* a calculation exists, not just *what* it does

**Outcome**: 48KB of test documentation allowing someone to understand exactly how the tool works and validate correctness against HMRC 2025/26 rules.

### 3. **User-Centric Feature Design (3-Mode Optimization)**
**What**: Added toggle between Max Return, Earliest FIRE, and Target Age optimization modes instead of a single "best recommendation."

**Why it worked**:
- Recognized different users have different retirement goals
- Mode toggle propagates to all result sections (recommendation, action plan, charts)
- Allows users to explore trade-offs and understand tax implications

**Outcome**: Users can now compare outcomes (e.g., "Max Return gives me £500k but I work until 68; Earliest FIRE gives £420k but I retire at 55").

### 4. **Code Quality & Modular Architecture**
**What**: Maintained separation of concerns (MOD action plan builder separate from civilian; step forms separate from results; tax functions in one place).

**Why it worked**:
- Easier to find and fix bugs (allocation bug traced to 3 specific files, not entire codebase)
- Clear commits (20 commits over 4 weeks with descriptive messages) make history understandable
- No build errors; code compiles cleanly

**Outcome**: MVP is deployable and maintainable; regression risk is manageable with test suite.

---

## What Didn't Go Well & Why ❌

### 1. **Late Discovery of Edge Cases**
**What**: Division-by-zero error (when `returnRate === 0`) wasn't caught until Week 3; should have been tested in Week 2.

**Why it happened**:
- Didn't create comprehensive edge case checklist upfront
- Initial tests focused on "happy path" (normal investment returns)
- Only discovered during re-testing of allocation bug

**Impact**: Minor (caught early, fixed quickly), but revealed gap in test planning.

**What I'll Do**: Add "edge case checklist" to code review template before Week 7 work.

### 2. **Code Organization (App.js Bloat)**
**What**: App.js is 2,479 lines containing UI orchestration, tax/NI calculations, result building, AND JSX.

**Why it matters**:
- Making changes requires navigating a large file
- Formatter functions (`fmtGBP`, `fmtPct`) defined mid-file, leading to initialization-order bugs
- Hard for new contributors to understand code at a glance

**Current mitigation**: README comments and inline documentation help, but not ideal.

**What I'll Do**: In Week 7 refactoring phase, extract into modules:
- `utils/formatters.js` (formatting functions)
- `utils/taxCalculations.js` (tax/NI logic)
- `utils/niCalculations.js` (separate module for clarity)

### 3. **Missing User Validation**
**What**: Tests are synthetic; no real Armed Forces personnel or high-earners have used the tool yet.

**Why it's risky**:
- Tool may solve the wrong problem or miss important scenarios
- UI might be confusing despite looking clear to developers
- Calculations might not match user expectations (e.g., "Why isn't my current ISA balance counted?")

**Current status**: MVP is complete but unvalidated with target audience.

**What I'll Do**: Week 5–6 dedicated to user testing with 5–10 real users; think-aloud sessions to observe behavior and collect feedback.

### 4. **No Automated Test Framework (Yet)**
**What**: Tests are Node.js console.log files; no Jest/Vitest setup despite `setupTests.js` existing.

**Why it's risky**:
- Tests don't run automatically; easy to forget to re-run after code changes
- Risk of regression if someone modifies allocation logic without validation
- No CI/CD integration to catch bugs before deployment

**Current mitigation**: Manual discipline (tests documented and easy to run: `node detailed-tests.js`)

**What I'll Do**: Set up GitHub Actions to auto-run test suite on every push (Week 5).

---

## Critical Problems Solved & Validation Evidence

### **Problem 1: Allocation Logic Bug (Week 2–3)**

**Problem Identified**: In Earliest FIRE mode, ISA allocation was calculated as "remainder after SIPP" instead of prioritizing ISA (which is accessible, unlike SIPP).

**Evidence**:
```
Before fix (MOD user, £40k contribution):
  Earliest FIRE: ISA £10k, SIPP £20k ❌

After fix:
  Earliest FIRE: ISA £20k, SIPP £8k ✅
```

**Root cause**: Allocation order in `actionPlanMOD.js` and `actionPlanCivilian.js` was hardcoded, not mode-aware.

**Solution**: Reordered allocation logic to respect mode-specific priorities:
- **maxReturn**: SIPP first (tax relief) → ISA → GIA
- **earliestFire**: ISA first (accessible) → SIPP → GIA
- **targetRetirement**: ISA first (accessible) → SIPP → GIA

**Validation**: Re-ran test suite; all scenarios now produce correct allocations. Bug is fixed.

### **Problem 2: Edge Case Handling (Week 3)**

**Problem Identified**: Division-by-zero error when `returnRate === 0` (valid scenario: inflation only, no real growth).

**Solution**: Added safe fallback using algebraic limit: `FV = C × n` (contribution × years).

**Validation**: Added test case; confirmed no errors and mathematically correct result.

---

## Learning & Skill Development Strategy

### **Domain Knowledge Acquired** 📚
- **UK Tax System**: Personal allowance, tax bands, national insurance, marginal rate calculation
- **Pension Vehicles**: ISA (flexible, £20k/year), SIPP (locked until 55, £60k gross), AFPS-15 AP (DB-style, capped)
- **Tax Relief**: Basic (20%) vs. extra relief via self-assessment; how it reduces net cost

### **Development Skills Strengthened** 🛠️
- **Testing discipline**: Writing executable tests to validate financial calculations
- **Code organization**: Modular architecture for maintainability
- **Documentation**: Making complex logic transparent and auditable

### **Skills Still to Develop** (Planned)

| Skill | Target | Plan |
|-------|--------|------|
| **User-Centric Design** | Learn if tool solves real user problem | Week 5–6: User testing with 5–10 real users |
| **Regulatory Compliance** | Validate calculations align with HMRC + FCA guidance | Week 9–10: Expert review by financial adviser |
| **DevOps/Monitoring** | Set up deployment + analytics | Week 11–12: Deploy to production + track usage |
| **Prioritization** | Decide what to build first based on user feedback | Week 7–8: Feedback analysis + feature prioritization |

---

## Confidence Assessment

| Aspect | Confidence | Evidence |
|--------|------------|----------|
| **Core calculations are correct** | 8/10 | Tested against HMRC rules; edge cases handled |
| **Code is maintainable** | 6/10 | Modular, but App.js is large; refactoring planned |
| **UI is intuitive** | 5/10 | Not user-tested yet; assumed intuitive but needs validation |
| **Tool solves real user problem** | 4/10 | No market validation yet; addressing in Week 5 |
| **Ready to deploy** | 8/10 | Builds cleanly; tests pass; no errors |
| **Overall feasibility** | 6.5/10 | MVP complete; user validation pending |

---

## Summary: What's Next

### **Immediate (Week 5)**
- ✅ Complete this project log and appendix
- ⬜ Recruit users for think-aloud testing
- ⬜ Set up GitHub Actions for automated testing
- ⬜ Begin refactoring App.js into modules

### **Short-term (Week 6–8)**
- ⬜ Conduct user testing; collect feedback
- ⬜ Implement top-3 feedback items
- ⬜ Code refactoring (split App.js into modules)

### **Mid-term (Week 9–10)**
- ⬜ Expert review by financial adviser
- ⬜ Validate calculations against HMRC/FCA guidance

### **Launch (Week 11–12)**
- ⬜ Deploy to production (soldiersfortune.co.uk)
- ⬜ Set up analytics and monitoring

### **Evaluation (Week 13–14)**
- ⬜ Write final EVALUATION_REPORT.md
- ⬜ Summarize user feedback, metrics, and recommendations

---

## Self-Assessment: Learning Outcomes

### **LO5: Manage Work Independently** ✅
**Evidence**: Organized 4-week exploratory phase into clear phases (Week 1: Understanding, Week 2: Testing, Week 3: Fixing, Week 4: Validating). Created weekly log, identified risks, and set strategy for next phases.
**Grade**: 8/10

### **LO7: Analyse Critically** ✅
**Evidence**: Root cause analysis of allocation bug; questioned assumptions (Is AP always best?); identified edge cases; evaluated trade-offs between design decisions.
**Grade**: 7/10

### **LO8: Evaluate Solutions** ✅
**Evidence**: Tested solutions against HMRC rules; compared before/after bug fix with test data; created evaluation framework; planned user validation as next step.
**Grade**: 7/10

---

**Full project log available in PROJECT_LOG.md**
**Codebase: 3,413 lines across 15 files; 20 commits; 48KB documentation**
**Status: MVP COMPLETE → User Validation (Week 5)**
