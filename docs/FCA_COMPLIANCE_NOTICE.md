# FCA Compliance & Regulatory Status Notice
**Soldiers Fortune — Educational Simulation Tool**

---

## Executive Summary

**Soldiers Fortune is an EDUCATIONAL SIMULATION tool demonstrating the feasibility of retirement planning calculations. It is NOT an FCA-authorised service and does not provide regulated financial advice.**

All projections are illustrative, based on 2025/26 tax rules, and assume constant conditions. Any public deployment would require full FCA regulatory review and compliance framework before launch.

---

## Regulatory Status

### Current Status: NOT FCA-Regulated

| Aspect | Status |
|--------|--------|
| **FCA Authorisation** | ❌ Not authorised; not required for educational tool |
| **Regulated Advice** | ❌ Does NOT provide personalised financial advice |
| **FSMA 2000 Coverage** | ✅ Compliant as educational tool (outside FSMA scope) |
| **Live Deployment** | ❌ Not suitable without FCA compliance review |
| **GDPR Compliance** | ✅ Full compliance (local data storage, no transmission) |
| **Accessibility (WCAG)** | ✅ AAA compliance target |

### What This Tool Provides

✅ **Educational Simulation**
- Generic illustration of tax efficiency concepts
- Scenario exploration (what-if modelling)
- Learning tool for retirement planning concepts

✅ **Transparency & Auditability**
- Open-source code, all calculations documented
- Test suite validating against HMRC rules
- README explaining all assumptions

✅ **Governance-Ready**
- Clear scope documentation
- Explicit disclaimer of limitations
- Evidence of calculation accuracy

### What This Tool Does NOT Provide

❌ **Personalised Financial Advice**
- No assessment of individual suitability
- No adviser relationship
- No ongoing monitoring

❌ **Regulated Recommendation**
- Tool does not recommend specific action
- User explores scenarios; user decides
- Responsibility remains with user

❌ **FCA-Regulated Protections**
- No FCA complaints procedure
- No professional indemnity insurance cover
- No consumer compensation scheme access

---

## Mandatory Disclaimers for Any Deployment

### **Site Banner (required on all pages)**
```
⚠️ EDUCATIONAL SIMULATION ONLY
This tool is NOT FCA-regulated financial advice.
Projections are illustrative and assume constant conditions.
Seek FCA-authorised advice before making financial decisions.
```

### **Pre-Results Disclaimer (before showing projections)**
```
ILLUSTRATIVE PROJECTIONS ONLY

These projections are based on your inputs and UK tax rules as of February 2026.
They do NOT:
• Constitute regulated financial advice
• Account for your individual circumstances
• Guarantee investment returns or pension growth
• Supersede guidance from an FCA-authorised adviser
• Consider changes in tax rules, employment, or personal circumstances

You are solely responsible for verifying suitability and consulting a qualified adviser.
```

### **Results Card Labels**
- Change "Recommended Allocation" → "Illustrative Allocation (not a recommendation)"
- Add: "Assumes stable employment, constant returns, no life changes"

---

## Key Differences from Regulated Advice

| Aspect | This Tool | Regulated Advice |
|--------|-----------|------------------|
| **Personalisation** | Generic, user-provided inputs only | Adviser assesses suitability |
| **Accountability** | Educational tool; user decides | Adviser liable for suitability |
| **FCA Oversight** | No | Yes (FCA-authorised adviser) |
| **Complaints** | User responsibility | FCA complaints procedure |
| **Insurance** | N/A | Professional indemnity required |
| **Ongoing Relationship** | None; one-off use | Ongoing adviser relationship |

---

## Path to FCA Compliance (If Future Deployment Desired)

### Phase 1: Regulatory Review (4–6 weeks)
1. **Accuracy Assessment**: FCA reviews calculations against official HMRC rules
2. **Completeness Review**: Check all material limitations are disclosed
3. **Consumer Risk Assessment**: Evaluate potential for user harm from misuse
4. **Governance Assessment**: Review update procedures, error handling, etc.

### Phase 2: Compliance Framework (4–8 weeks)
1. **Annual Update Procedure**: Tax rules change every April; need formal update process
2. **Error Correction Protocol**: How are calculation bugs fixed and communicated?
3. **Complaints Handling**: Even non-regulated tools benefit from fair complaints process
4. **Data Protection Audit**: Security review, data retention policy
5. **Professional Indemnity Insurance**: PI cover (even for educational tools)

### Phase 3: Ongoing Governance
1. **Annual Tax Review**: Update rules by end of April each year
2. **User Feedback Loop**: Collect issues from advisers and users
3. **Accuracy Monitoring**: Track user reports of calculation errors
4. **Regulatory Updates**: Stay informed of FSMA/FCA rule changes

### Phase 4: Adviser Liaison (Optional but Recommended)
1. **Establish network** of financial advisers who use tool for client screening
2. **Collect feedback** on real-world limitations and edge cases
3. **Share improvements** to demonstrate ongoing commitment to accuracy
4. **Publish guidance** on when tool is suitable vs when personalised advice needed

---

## Calculation Accuracy & Validation

### How This Tool Ensures Accuracy

**1. Test Suite Validation**
- 8 realistic scenarios tested against calculated outcomes
- Tax calculations verified against HMRC 2025/26 rules
- Edge cases handled (division-by-zero, personal allowance taper)
- All tests passing; no build warnings or errors

**2. Documentation**
- README.md documents all mathematical formulas
- References to HMRC sources for tax rates and thresholds
- Code comments explain every calculation
- Assumptions explicitly stated

**3. Transparency**
- Source code available on GitHub for external audit
- Test output publicly available showing correctness
- No "black box" calculations; everything is auditable

**4. Limitations Disclosed**
- Tool uses simplified NI rates (8%, 2%) not exact HMRC calculation
- Personal allowance taper correctly modelled (£100k–£125,140)
- AFPS-15 modelling uses ×25 capital equivalence (approximate)
- No spouse/joint modelling
- No inheritance tax calculation
- No complex pension interactions

---

## Data Privacy & GDPR Compliance

### Data Handling
- ✅ All data stored **locally** in user's browser (localStorage)
- ✅ **Zero** data sent to servers
- ✅ **Zero** analytics or tracking
- ✅ User has **full control** to delete anytime
- ✅ **No third-party services** access user data

### GDPR Compliance
- ✅ Privacy-by-design (no data collection needed)
- ✅ No personal identifiers collected (no name, email, account)
- ✅ No cookies (except localStorage, which user controls)
- ✅ No data processors or transfers
- ✅ No data retention policy needed (user controls retention)

---

## Accessibility (Equality, Diversity & Inclusion)

### Current Compliance
- ✅ High contrast (WCAG AAA target)
- ✅ Readable fonts (minimum 16px base)
- ✅ Keyboard navigation supported
- ✅ Form labels linked to inputs
- ✅ No time-based interactions
- ⏳ Screen-reader testing (future improvement)

### Future Accessibility Improvements
- [ ] Screen-reader testing with JAWS/NVDA
- [ ] Transcripts for any video content
- [ ] Support for voice input
- [ ] Multiple language versions (future)

---

## UK English & Regulatory Language

This document and all user-facing materials use:
- ✅ UK English spellings (e.g., "organisation", "realise", "licence")
- ✅ UK regulatory terminology (FCA, FSMA, HMRC)
- ✅ UK pension scheme names (AFPS-15, SIPP, ISA)
- ✅ UK tax rates and thresholds (2025/26 specific)
- ✅ GBP currency (£)

---

## Statement of Regulatory Intent

**This project DOES NOT seek or require FCA authorisation.** It is an educational proof-of-concept demonstrating the feasibility of automated retirement planning calculations.

Should anyone wish to commercialise similar calculations in future:
1. Full FCA regulatory review would be required
2. Compliance framework would need to be established
3. Professional indemnity insurance would be mandatory
4. Annual governance review would be needed

**Current scope**: Academic demonstration and learning outcomes only.

---

## Quick Reference: Compliance Checklist

- [ ] **Disclaimer present**: "Educational simulation, not FCA advice"
- [ ] **Limitation disclosed**: "Illustrative only, assumes constant conditions"
- [ ] **User responsibility stated**: "Consult FCA-authorised adviser"
- [ ] **Data privacy**: "All data stored locally, no transmission"
- [ ] **Accuracy caveat**: "Based on Feb 2026 tax rules, rules change annually"
- [ ] **Accessibility**: "WCAG AAA compliance target"
- [ ] **Source code**: "Available for external audit"
- [ ] **Test results**: "Publicly available for verification"

---

**Document Created**: March 2, 2026
**Status**: Ready for TMA submission
**Next Review**: Post-dissertation (if commercial deployment considered)

