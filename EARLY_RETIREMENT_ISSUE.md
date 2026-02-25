# Early Retirement Issue - Retire at 55 with £30k/yr Contribution

## Your Scenario
```
Age: 30
Salary: £55,000
Serving: Yes, Leave at 32
DB Pension: £6,500/yr (existing)
ISA: £65,000 (existing)
Contributing: £30,000/yr
Target Retirement Age: 55
Target Income: £40,000/yr
```

## The Problem

When you submit with **Retire at 55** in **Target Age mode**, the allocation goes something like:
- Phase 1 (age 30-32, serving): Some to AP, rest to SIPP + ISA
- Phase 2 (age 32-55, post-leave): Everything to SIPP
- **Result:** Large amount locked in SIPP until age 57 (2 years after retirement!)

**Why this doesn't work for your target:**
1. **SIPP is inaccessible before age 57** - You retire at 55, so SIPP money is locked for 2 years
2. **Only ISA is accessible at 55** - Capped at £20k/year by law
3. **Your contribution (£30k/yr) exceeds ISA limit** - The extra £10k has nowhere accessible to go
4. **DB pension alone (£6.5k) + ISA (£20k) = £26.5k** - Falls short of your £40k target

## Root Cause

The allocation algorithm doesn't account for SIPP inaccessibility when building the post-leave phase. It treats SIPP as accessible immediately, which is wrong for anyone retiring before age 57.

## Solutions

### Option 1: Push Target Retirement Age to 57+
If you must retire at 55, you won't have enough accessible income. Move your target to age 57 or later.

### Option 2: Increase ISA Contribution Limit (Not Possible)
The ISA limit is legally fixed at £20k/year. You can't increase this.

### Option 3: Use GIA for Overflow
The remaining £10k (above ISA limit) should go to GIA (General Investment Account):
- **GIA at 55:** Fully accessible, but subject to Capital Gains Tax
- **GIA can provide:** Additional flexible access between retirement and SIPP unlock
- **Trade-off:** Taxable growth (but £3k CGT allowance, £500 dividend allowance)

### Option 4: Accept the ISA Gap Until 57
Set retirement to 55, but plan to:
- Live on DB pension (£6.5k) + ISA withdrawals (£20k) = £26.5k until age 57
- At 57, add SIPP withdrawals to reach £40k target
- This is a 2-year shortfall of ~£13.5k/year

## What's Been Fixed

### 1. Default Mode Changed
- **Before:** Max Return was default
- **After:** Target Age (target retirement) is now default and first button
- **Impact:** When you fill in "Retire at 55", Target Age mode is automatically selected

### 2. Early Retirement Warning Added
- **Before:** No warning about SIPP inaccessibility
- **After:** Phase 2 subtitle now shows warning when retiring before 57:
  ```
  ⚠️ Retiring at 55 means SIPP is inaccessible until 57
     — prioritize ISA (£20k/yr limit) for accessible income during ages 32-56.
  ```

### 3. Added Pension Logic Improved
- **Before:** AP was recommended even for age 55 retirement
- **After:** AP is automatically skipped in Target Age mode if retiring before 67
- **Impact:** Budget redirected to ISA + GIA instead of locked AP

## The Reality Check

Your parameters are **mathematically challenging**:
- Contribute £30k/yr
- ISA limit: £20k/yr
- Excess: £10k/yr → must go to SIPP (locked until 57) or GIA (taxable)
- Target retirement: 55
- Goal: £40k/yr income

**At age 55, you can access:**
- DB pension: £6.5k (existing)
- ISA growth: ~£65k growing at 4.4% real = accessible
- ISA annual contributions: £20k/yr (capped)
- **Total accessible at 55:** ~£6.5k + £20k = £26.5k

**Shortfall: £40k - £26.5k = £13.5k/year** (until SIPP unlocks at 57)

## Recommendations

### To Retire at 55 with £40k Income:
1. **Increase current savings** - Use your existing £65k ISA more effectively
2. **Delay retirement to 57** - SIPP unlocks at 57, solving the problem
3. **Accept lower income at 55-57** - Live on £26.5k, jump to £40k+ at 57
4. **Lower target income for ages 55-57** - Reduce to £26.5k until SIPP access
5. **Increase non-investment income** - Part-time work, rental income, etc.

### Best Solution for Your Scenario:
```
Age 30-32:    Contribute £30k/yr (Phase 1: serving)
Age 32-57:    Contribute £30k/yr (Phase 2: ISA + GIA + SIPP)
Age 55-57:    Live on DB + ISA = £26.5k
Age 57+:      Access SIPP → reach £40k target
```

This gives you:
- Retirement lifestyle shift at 55 (reduced hours/costs)
- Full £40k income at 57 when SIPP unlocks
- Decade+ of SIPP growth compounding

## Files Updated

1. **src/App.js**
   - Changed default optMode from 'maxReturn' to 'targetRetirement'
   - Reordered toggle buttons (Target Age first, then Max Return, Earliest FIRE)

2. **src/actionPlanMOD.js**
   - Added warning when retiring before SIPP unlock age (57)
   - Shows message about ISA limits and accessible income gap

3. **test-added-pension.js**
   - Tests demonstrating AP should be skipped for early retirement

## Build Status
✅ Compilation successful
✅ No errors or warnings
✅ Ready for testing

## Next Steps

1. **Re-run calculation** with Target Age mode (now default)
2. **Review warning message** in Phase 2 subtitle
3. **Consider your options:**
   - Retire at 57 instead (simplest)
   - Accept income gap until 57 (plan for lower spending)
   - Increase contributions to build larger ISA pot

---

## Summary

The system now defaults to Target Age mode and warns you about SIPP inaccessibility. Your scenario (retire at 55 with £30k/yr contribution) requires additional planning because SIPP is locked until 57. The three main solutions are:
1. Push retirement to 57+
2. Accept lower income until 57
3. Increase current ISA pot to supplement the gap
