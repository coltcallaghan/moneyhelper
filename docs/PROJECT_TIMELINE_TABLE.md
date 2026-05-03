# Soldiers Fortune — Comprehensive Project Timeline
## February 1, 2026 – September 14, 2026

---

## Phase Overview

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| **Phase 1: Exploratory & MVP** | Feb 1 – Mar 14 (6 weeks) | Problem understanding, testing, bug fixes | ✅ COMPLETE |
| **Phase 2: User Validation & Refinement** | Mar 15 – Apr 11 (4 weeks) | User testing, feedback, code refactoring | ⬜ PENDING |
| **Phase 3: Expert Review & Scaling** | Apr 12 – May 9 (4 weeks) | Financial adviser review, compliance, optimization | ⬜ PENDING |
| **Phase 4: Deployment & Monitoring** | May 10 – Jun 6 (4 weeks) | Production deployment, analytics, monitoring | ⬜ PENDING |
| **Phase 5: Evaluation & Dissertation** | Jun 7 – Sep 14 (14 weeks) | Final testing, user feedback analysis, dissertation writing | ⬜ PENDING |

---

## Detailed Weekly Timeline

### **PHASE 1: Exploratory & MVP (Feb 1 – Mar 14)**

| Week | Dates | Development Work | Dissertation Work | Deliverables | Status |
|------|-------|------------------|-------------------|---------------|--------|
| **1** | Feb 1–7 | Problem understanding, domain learning (tax, pensions, AFPS-15) | Read assignment brief; define learning outcomes (LO5, LO7, LO8) | README started; architecture documented | ✅ DONE |
| **2** | Feb 8–14 | Exploratory testing: create test scenarios (MOD £70k, Civilian £150k); discover allocation bug | Outline TMA structure; identify key argument | test-runner.js, detailed-tests.js created | ✅ DONE |
| **3** | Feb 15–21 | **Bug Fix Week**: Trace allocation bug to 3 files; reorder logic for mode-specific priorities; validate fix | Draft problem statement section (~800 words) | Allocation bug fixed; test suite validates | ✅ DONE |
| **4** | Feb 22–28 | Edge case handling: division-by-zero, formatter initialization; create comprehensive test documentation | Write technical approach section (~600 words) | PROJECT_LOG.md started; TESTING_SUMMARY.md | ✅ DONE |
| **5** | Mar 1–7 | Code refinement: minor lint fixes, documentation polish, README completion | Write reflective analysis draft (~1000 words) | README complete; TESTING_INDEX.md created | ✅ DONE |
| **6** | Mar 8–14 | MVP finalization: build succeeds, all tests passing, deployment-ready; create PROJECT_DESCRIPTION.md | Complete first draft of main TMA body (3000 words) | PROJECT_DESCRIPTION.md, PROJECT_LOG.md, APPENDIX_2_REFLECTIVE_SUMMARY.md | ✅ DONE |

**Phase 1 Deliverables:**
- ✅ MVP codebase (3,413 lines, 15 files, 20 commits)
- ✅ Test suite (8 scenarios, 3 executable runners)
- ✅ Critical bug fixed and validated
- ✅ 60KB documentation (README, test docs, project log)
- ✅ TMA framework prepared (first draft 3000 words)

---

### **PHASE 2: User Validation & Refinement (Mar 15 – Apr 11)**

| Week | Dates | Development Work | Dissertation Work | Deliverables | Status |
|------|-------|------------------|-------------------|---------------|--------|
| **7** | Mar 15–21 | Recruit 5–10 users (MOD, civilian, general audiences) | Revise TMA draft based on feedback; strengthen evidence | Recruitment plan, USER_FEEDBACK.md started | ⬜ PENDING |
| **8** | Mar 22–28 | Conduct think-aloud sessions: observe user navigation, collect qualitative feedback | Analyze feedback themes; write analysis section | User feedback summary (5–10 users) | ⬜ PENDING |
| **9** | Mar 29–Apr 4 | Prioritize feedback: identify top 3 issues/enhancements; plan refinements | Draft "Lessons Learned" section; update learning outcomes evidence | REFINEMENT_PLAN.md | ⬜ PENDING |
| **10** | Apr 5–11 | Implement top-3 feedback items: UI improvements, calculation clarifications, missing features | Integrate user feedback into TMA narrative; strengthen LO7 (critical analysis) | Refined MVP with user-validated features | ⬜ PENDING |

**Phase 2 Deliverables:**
- User feedback from 5–10 real users
- Top-3 prioritized refinements implemented
- USER_FEEDBACK.md (analysis of themes, patterns, insights)
- Updated codebase with user-driven improvements
- TMA draft revised with user evidence (4000 words)

---

### **PHASE 3: Expert Review & Scaling (Apr 12 – May 9)**

| Week | Dates | Development Work | Dissertation Work | Deliverables | Status |
|------|-------|------------------|-------------------|---------------|--------|
| **11** | Apr 12–18 | Code refactoring: split App.js into modules (formatters, tax, NI utilities) | Draft "Technical Design" section with architecture diagrams; explain modular approach | Refactored codebase; modular utils/ directory | ⬜ PENDING |
| **12** | Apr 19–25 | Set up GitHub Actions: auto-run tests on push; add CI/CD pipeline | Write "Quality Assurance" section explaining test automation | CI/CD pipeline working; tests auto-validate on commits | ⬜ PENDING |
| **13** | Apr 26–May 2 | Engage financial adviser for expert review: share MVP, README, test docs; collect feedback | Incorporate expert feedback into "Regulatory Compliance" section | Expert review findings; compliance checklist | ⬜ PENDING |
| **14** | May 3–9 | Implement compliance adjustments (if needed); validate calculations against HMRC 2025/26 rules; update documentation | Complete "Evaluation Framework" section; explain how MVP addresses LO8 (evaluate solutions) | EXPERT_REVIEW_FINDINGS.md; updated README | ⬜ PENDING |

**Phase 3 Deliverables:**
- Modular, refactored codebase (App.js split into utils)
- GitHub Actions CI/CD pipeline operational
- Expert financial adviser review completed
- Compliance validation against HMRC rules
- TMA sections: Technical Design, QA, Compliance (5000 words total)

---

### **PHASE 4: Deployment & Monitoring (May 10 – Jun 6)**

| Week | Dates | Development Work | Dissertation Work | Deliverables | Status |
|------|-------|------------------|-------------------|---------------|--------|
| **15** | May 10–16 | Deploy to production: `npm run build && npm run deploy` to soldiersfortune.co.uk | Write "Deployment Strategy" section | Live deployment at soldiersfortune.co.uk | ⬜ PENDING |
| **16** | May 17–23 | Set up analytics: Google Analytics or Plausible to track usage, conversion, bounce rate | Track initial user metrics; begin "Impact & Outcomes" section | Analytics dashboard operational; baseline metrics | ⬜ PENDING |
| **17** | May 24–30 | Monitor for errors: JavaScript exceptions, calculation bugs, performance issues | Analyze early user behavior; write "User Adoption" section | MONITORING_REPORT.md (Week 1 live data) | ⬜ PENDING |
| **18** | Jun 1–6 | Performance optimization (if needed): optimize bundle size, reduce load time; fix any bugs found in live | Complete "Scaling & Performance" section | Optimized codebase; performance metrics baseline | ⬜ PENDING |

**Phase 4 Deliverables:**
- Production deployment live at soldiersfortune.co.uk
- Analytics and monitoring operational
- Initial user metrics (usage, bounce rate, error rate)
- Performance optimization completed
- TMA sections: Deployment, Impact, Outcomes (3000 words)

---

### **PHASE 5: Evaluation & Dissertation (Jun 7 – Sep 14, 14 weeks)**

| Week | Dates | Development Work | Dissertation Work | Deliverables | Status |
|------|-------|------------------|-------------------|---------------|--------|
| **19** | Jun 7–13 | Monitor production: collect 2 weeks of live data; respond to user issues | Begin dissertation final write: introduction (500 words) | Live data summary (2 weeks) | ⬜ PENDING |
| **20** | Jun 14–20 | Continue monitoring; set up feedback form (email + comment collection) | Write methodology section (800 words); explain development process | Feedback form deployed; first batch of feedback | ⬜ PENDING |
| **21** | Jun 21–27 | Address critical bugs found in live (if any); plan scaling improvements | Write main findings section (1500 words); explain test results, user feedback | Bug fixes deployed (if any); production stable | ⬜ PENDING |
| **22** | Jun 28–Jul 4 | Retrospective: document lessons learned from live deployment | Write learning outcomes section (1000 words); address LO5, LO7, LO8 | DEPLOYMENT_RETROSPECTIVE.md | ⬜ PENDING |
| **23** | Jul 5–11 | Plan Phase 6: user interviews (deeper insights); feature roadmap for next iteration | Write "Future Work & Recommendations" section (800 words) | ROADMAP.md; interview plan | ⬜ PENDING |
| **24** | Jul 12–18 | Conduct user interviews: 3–5 deep-dive conversations (30 min each) with power users | Integrate interview insights into findings; strengthen critical analysis (LO7) | Interview transcripts & analysis | ⬜ PENDING |
| **25** | Jul 19–25 | Analyze interview data: themes, patterns, unexpected findings | Write "Critical Analysis" section (1200 words); reflect on assumptions | INTERVIEW_ANALYSIS.md | ⬜ PENDING |
| **26** | Jul 26–Aug 1 | Final evaluation: quantify impact (users reached, calculations trusted, decisions made) | Draft conclusion section (600 words); summarize key achievements | FINAL_EVALUATION_REPORT.md | ⬜ PENDING |
| **27** | Aug 2–8 | Create visual summaries: user journey map, allocation effectiveness charts, timeline | Write executive summary (300 words) | Visualization files & summary | ⬜ PENDING |
| **28** | Aug 9–15 | Polish live site: final UX improvements, documentation, help section | Complete full TMA draft (8000 words); self-review | Polished production environment | ⬜ PENDING |
| **29** | Aug 16–22 | Final bug sweep: comprehensive testing; edge case validation; performance tuning | Review and edit TMA: consistency, citations, references | QA_FINAL_REPORT.md; production stable | ⬜ PENDING |
| **30** | Aug 23–29 | Prepare code & documentation for handover; clean up repo | Finalize Appendices: Appendix 1 (code), Appendix 2 (PROJECT_LOG.md), Appendix 3 (test output), Appendix 4 (commit history) | Code repository cleaned; documentation complete | ⬜ PENDING |
| **31** | Aug 30–Sep 5 | Final live monitoring; prepare success metrics summary | Final proofread; format TMA document; verify all references | FINAL_METRICS_SUMMARY.md | ⬜ PENDING |
| **32** | Sep 6–14 | Post-launch support: respond to any final user issues | **TMA SUBMISSION READY** ✅ | Final submission package | ⬜ PENDING |

**Phase 5 Deliverables (Dissertation Writing):**
- Introduction (500 words)
- Methodology (800 words)
- Findings & Analysis (1500 words + interview insights)
- Learning Outcomes Evidence (LO5, LO7, LO8) (1000 words)
- Critical Analysis & Reflection (1200 words)
- Future Work & Recommendations (800 words)
- Conclusion (600 words)
- **Total Main Body: ~8000 words**
- **Appendices:**
  - Appendix 1: Architecture & Code Samples
  - Appendix 2: PROJECT_LOG.md (Reflective Journal)
  - Appendix 3: Test Output & Metrics
  - Appendix 4: Commit History
  - Appendix 5: Interview Transcripts
  - Appendix 6: User Feedback Summary

**Phase 5 Development Deliverables:**
- Production-ready codebase with 4+ months live data
- User interview analysis (3–5 users, deep insights)
- Quantified impact metrics (users, trust, decisions)
- Documentation complete and polished
- Code repository clean and well-documented

---

## Summary: Time Allocation by Activity

### **Development Work (60% of time)**

| Activity | Hours/Week | Weeks | Total Hours |
|----------|-----------|-------|-------------|
| Exploratory testing & problem understanding | 12 | 6 (Phase 1) | 72 |
| User testing & feedback incorporation | 10 | 4 (Phase 2) | 40 |
| Code refactoring & CI/CD setup | 10 | 4 (Phase 3) | 40 |
| Deployment & monitoring | 8 | 4 (Phase 4) | 32 |
| Production support & optimization | 8 | 14 (Phase 5) | 112 |
| **Total Development** | | | **296 hours** |

### **Dissertation Work (40% of time)**

| Activity | Hours/Week | Weeks | Total Hours |
|----------|-----------|-------|-------------|
| Problem statement & context | 8 | 6 (Phase 1) | 48 |
| Technical approach & methodology | 8 | 4 (Phase 2) | 32 |
| Expert review & compliance analysis | 8 | 4 (Phase 3) | 32 |
| Deployment & metrics analysis | 8 | 4 (Phase 4) | 32 |
| Dissertation writing (main body) | 12 | 14 (Phase 5) | 168 |
| **Total Dissertation** | | | **312 hours** |

**Grand Total: 608 hours (32 weeks × 19 hours/week)**

---

## Key Milestones

| Date | Milestone | Impact |
|------|-----------|--------|
| **Feb 28, 2026** | MVP complete, exploratory testing finished | Start of Phase 2 |
| **Mar 14, 2026** | PROJECT_LOG.md & APPENDIX_2_REFLECTIVE_SUMMARY.md complete | TMA framework ready |
| **Apr 11, 2026** | User validation complete, top-3 refinements implemented | Production-ready MVP |
| **May 9, 2026** | Expert review finished, compliance validation done | Ready to deploy |
| **May 16, 2026** | 🚀 **Live deployment** at soldiersfortune.co.uk | Go-live |
| **Jun 7, 2026** | 2 weeks of live production data collected | Begin evaluation phase |
| **Jul 25, 2026** | User interview analysis complete | Deep insights gathered |
| **Aug 15, 2026** | TMA first draft complete (8000 words) | Ready for final polish |
| **Aug 29, 2026** | TMA final review & formatting complete | Ready to submit |
| **Sep 14, 2026** | 🎓 **TMA SUBMISSION DEADLINE** | Project complete ✅ |

---

## Dependencies & Critical Path

```
Feb 1–14    Problem Understanding → Testing
              ↓
Feb 15–28   Bug Fix → Validation
              ↓
Mar 1–14    MVP Finalization + TMA Framework Start
              ↓
Mar 15–Apr 11  User Testing & Feedback (CRITICAL - informs refinement)
              ↓
Apr 12–May 9   Expert Review & Code Refactoring (must complete before deployment)
              ↓
May 10–Jun 6   DEPLOYMENT (go-live)
              ↓
Jun 7–Aug 15   Evaluation + Data Analysis + Dissertation Writing (CRITICAL - all evidence)
              ↓
Aug 16–29   Final Polish + TMA Completion
              ↓
Sep 6–14    Final Checks + Submission
```

---

## Risk Management & Contingencies

| Risk | Impact | Mitigation | Timeline |
|------|--------|-----------|----------|
| User recruitment fails (< 5 users) | Cannot validate MVP with real feedback | Start recruitment in Week 6; have backup recruiting channels | Week 7 start |
| Expert review identifies major flaws | Need significant redesign | Plan 1-week buffer in Phase 3 for major fixes; start review early (Week 13) | Week 13 |
| Live deployment has critical bugs | Reputational damage; can't collect live data | Comprehensive QA in Phase 4; run extensive testing before deploy | Week 15 |
| Interview recruitment fails | Missing deep insights for dissertation | Plan fallback: survey 20+ users instead of 5 interviews | Week 24 |
| TMA runs over word count | Must cut content; lose evidence | Monitor word count weekly in Phase 5; use appendices liberally | Week 19 onwards |

---

## Learning Outcomes Mapping to Timeline

### **LO5: Manage Work Independently**
- **Evidence Window**: Feb 1 – Sep 14 (entire project)
- **Key Demonstrations**:
  - Week 1–4: Organize 4-week exploratory phase with clear learning goals
  - Week 7–10: Independently prioritize user feedback and plan refinements
  - Week 19–32: Manage parallel development and dissertation writing (60/40 split)
- **TMA Reference**: PROJECT_LOG.md (Weeks 1–4) + weekly summaries (Weeks 19–32)

### **LO7: Analyse Critically**
- **Evidence Window**: Feb 8 – Aug 29
- **Key Demonstrations**:
  - Week 2–3: Root cause analysis of allocation bug; question assumptions
  - Week 8–9: Analyze user feedback themes; identify patterns vs. outliers
  - Week 24–25: Interview analysis; challenge own design assumptions
- **TMA Reference**: APPENDIX_2_REFLECTIVE_SUMMARY.md + interview analysis section

### **LO8: Evaluate Solutions**
- **Evidence Window**: Feb 22 – Sep 5
- **Key Demonstrations**:
  - Week 4–5: Test suite validates allocation logic against tax law
  - Week 13–14: Expert review validates compliance and correctness
  - Week 26–31: Live metrics quantify impact (users, decisions, trust)
- **TMA Reference**: TEST_DETAILED_RESULTS.md + FINAL_EVALUATION_REPORT.md

---

## TMA Structure & Timeline Integration

| TMA Section | Word Count | Development Phase | Dissertation Phase | Due |
|-------------|-----------|-------------------|-------------------|-----|
| Introduction | 500 | Phase 1 (research) | Week 19 (write) | Aug 15 |
| Problem Statement | 800 | Phase 1 (understand) | Week 19 (write) | Aug 15 |
| Technical Design | 1000 | Phase 1–3 (build) | Week 25 (write) | Aug 20 |
| Methodology | 800 | Phase 1–2 (execute) | Week 20 (write) | Aug 15 |
| Findings | 1500 | Phase 2–5 (data) | Week 26–28 (write) | Aug 25 |
| Critical Analysis | 1200 | Phase 2–5 (reflect) | Week 25–29 (write) | Aug 29 |
| Learning Outcomes | 1000 | Phase 1–5 (ongoing) | Week 28–29 (write) | Aug 29 |
| Future Work | 800 | Phase 5 (evaluate) | Week 23 (write) | Aug 20 |
| Conclusion | 600 | Phase 5 (conclude) | Week 31 (write) | Aug 29 |
| **Total Main Body** | **~8000** | | | **Aug 29** |
| **Appendices** | Supporting | All phases | Week 30–31 (compile) | **Sep 6** |

---

## Success Criteria by Phase

### **Phase 1 (Feb 1–Mar 14): MVP Complete & Tested**
- ✅ Codebase compiles; no errors/warnings
- ✅ 8 test scenarios all passing
- ✅ Critical bug found and fixed
- ✅ 60KB documentation complete
- ✅ TMA framework prepared (first draft 3000 words)

### **Phase 2 (Mar 15–Apr 11): User-Validated MVP**
- ✅ 5–10 users tested; feedback collected
- ✅ Top-3 priorities implemented
- ✅ No major flaws discovered
- ✅ TMA draft revised (4000 words)

### **Phase 3 (Apr 12–May 9): Expert-Reviewed & Compliant**
- ✅ Code refactored into modules
- ✅ CI/CD pipeline operational
- ✅ Expert review completed; compliance validated
- ✅ TMA includes expert validation (5000 words)

### **Phase 4 (May 10–Jun 6): Live & Monitored**
- ✅ Production deployment successful
- ✅ Analytics operational; baseline metrics captured
- ✅ Zero critical bugs in first 4 weeks live
- ✅ TMA sections: deployment, impact (3000 words)

### **Phase 5 (Jun 7–Sep 14): Evaluated & Documented**
- ✅ 4+ months live data collected
- ✅ 3–5 user interviews completed
- ✅ Impact quantified (users, decisions, trust)
- ✅ **TMA complete and submitted (8000 words + appendices)**

---

## Notes for Self-Management

1. **Parallel Work**: Weeks 1–32 require balancing development (60%) and dissertation (40%). Use calendar blocking to separate contexts.

2. **Evidence Collection**: From Week 7 onwards, continuously collect evidence (user feedback, metrics, interviews) for dissertation. Don't wait until Week 26 to start analysis.

3. **Risk Buffer**: Build in 1-week buffers after Phase 2, 3, and 4 for unexpected issues. Use Phase 5 Weeks 30–32 as final contingency.

4. **Dissertation Integration**: Don't treat dissertation as separate from development. Each phase produces evidence (tests, feedback, metrics) that feeds directly into writing.

5. **Learning Outcomes**: Throughout the project, document evidence of LO5, LO7, LO8. Don't try to retroactively prove these at the end.

---

**Timeline Created**: 2026-02-28
**Total Duration**: 26 weeks (Feb 1 – Sep 14, 2026)
**Estimated Hours**: 608 (19 hours/week)
**Status**: Ready to execute ✅
