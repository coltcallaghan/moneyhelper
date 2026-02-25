# Recent Changes Summary

## 1. Single-Compute Results Architecture
**Problem:** Toggling between Max Return / Earliest FIRE / Target Age modes was recomputing results every toggle, causing spurious auto-saves and unnecessary recalculation.

**Solution:** Compute all three modes at form submission and store them together. Toggle is now pure display logic.

**Changes:**
- **src/App.js (buildResults function):**
  - Remove `optMode` parameter from function signature
  - Compute all 3 modes in a loop (MODES = ['maxReturn', 'earliestFire', 'targetRetirement'])
  - Build actionPlan + phaseAllocations for each mode
  - Return `results.modes` containing all three mode-specific data
  - Keep top-level actionPlan/phaseAllocations for backward compat with saved calcs

- **src/App.js (component):**
  - Remove `submittedParamsRef` (no longer needed)
  - Remove `useEffect([optMode])` recomputation hook
  - Update `handleSubmit` to call `buildResults(params)` without optMode
  - Add `activeResults` derivation in JSX that selects from `displayResults.modes[optMode]`
  - Pass `activeResults` to ActionPlanCard, RetirementTimelineChart, TotalWealthChart, RetirementPictureCard

**Benefits:**
- ✅ No more auto-saves on toggle (results only change on form submit)
- ✅ Instant toggle response (no recalculation)
- ✅ Cleaner architecture (toggle = pure display selection)
- ✅ All results update atomically when submitted

---

## 2. Fixed ISA Allocation in Earliest FIRE & Target Age Modes
**Problem:** In earliestFire and targetRetirement modes, ISA allocation was being calculated as "remaining - SIPP" instead of having full budget available first.

**Root Cause:** Both SIPP and ISA steps were pre-computed before applying mode-based ordering, so ISA always got whatever was left after SIPP (which was calculated as if maxReturn mode).

**Solution:** Reorder the allocation logic so steps are built in mode-specific order.

**Changes:**
- **src/actionPlanCivilian.js (lines 77-102):**
  - For `maxReturn`: Build SIPP first, then ISA with remaining budget
  - For `earliestFire` / `targetRetirement`: Build ISA first, then SIPP with remaining budget

- **src/actionPlanMOD.js (lines 121-146):**
  - Same fix applied to MOD user action plans

**Impact:**
- ✅ Earliest FIRE now correctly allocates full ISA budget (up to £20k limit)
- ✅ SIPP gets remainder in that mode (more accessible income focus)
- ✅ Max Return still prioritizes SIPP first (more tax-efficient)
- ✅ All allocation constraints respected (£20k ISA limit, contribution total, etc.)

**Example:**
- Before fix (earliest fire, £30k contrib): ISA ~£10k, SIPP ~£20k (WRONG)
- After fix (earliest fire, £30k contrib): ISA £20k, SIPP ~£10k (CORRECT)

---

## 3. Testing & Verification
**Files Added:**
- `src/actionPlan.test.js` - Jest unit tests for allocation logic
- `test-runner.js` - Standalone Node script for manual verification
- `TEST_RESULTS.md` - Comprehensive test results and verification checklist

**Test Coverage:**
- ✅ ISA allocation order per mode
- ✅ SIPP allocation order per mode
- ✅ Annual limit enforcement (£20k ISA)
- ✅ Total budget constraint (no overspend)
- ✅ GIA overflow behavior
- ✅ Phase boundaries (MOD serving vs post-leave)
- ✅ Mode-specific labels and descriptions

---

## 4. Misc: Toggle Positioning
**Change:** Moved optimization mode toggle from below Net Worth Summary to above Action Plan card.

**File:** `src/App.js` (JSX)

**Reason:** Better visual hierarchy - toggle is more prominent and closer to the results it controls.

---

## Summary of Files Modified

| File | Changes | Lines |
|---|---|---|
| src/App.js | Compute all 3 modes, remove optMode recomputation, add activeResults derivation | Multiple |
| src/actionPlanCivilian.js | Fix ISA/SIPP allocation order per mode | 77-102 |
| src/actionPlanMOD.js | Fix ISA/SIPP allocation order per mode | 121-146 |
| src/actionPlan.test.js | NEW - Unit tests for allocation logic | All |
| test-runner.js | NEW - Manual verification script | All |
| TEST_RESULTS.md | NEW - Comprehensive test report | All |
| CHANGES_SUMMARY.md | NEW - This file | All |

---

## Build Status
✅ `npm run build` - **Success**
- No errors or warnings
- Bundle size stable (~182KB gzipped)

---

## Next Steps for User Testing

1. **Clear browser cache** to ensure latest code is loaded
2. **Test with different contributions:**
   - Small: £5k/yr
   - Medium: £20k/yr
   - Large: £50k/yr
3. **Toggle between modes** and verify:
   - Action Plan step order changes
   - RetirementTimelineChart ISA/SIPP proportions change
   - Total numbers in RetirementPictureCard update
4. **Check edge cases:**
   - Retirement age < SIPP unlock age (57)
   - High earner with 45%+ tax rate
   - Already left MOD service
5. **Verify savings:** Toggle between modes should NOT create new auto-save entries

---

## Backward Compatibility
✅ Saved calculations from before these changes will still work:
- Results include both `actionPlan`/`phaseAllocations` (for old saved calcs)
- AND `modes` field (for new mode-switching)
- JSX falls back to top-level fields if `modes` unavailable

---

## Known Limitations (Not in scope)
- Tests require Jest setup to run fully (currently disabled in package.json)
- Use `node test-runner.js` for manual verification instead
- Full integration testing should be done manually in browser with various form inputs
