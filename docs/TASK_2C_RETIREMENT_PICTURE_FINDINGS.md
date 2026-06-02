# Task 2c — Retirement Picture Allocation Mismatch (Investigation & Fix)

**Date:** 2026-06-02
**Status:** Fixed. Build passes. Committed. (Deploy pending your go-ahead.)
**Trigger:** User reported the **Total Retirement Picture** card showed a
SIPP-heavy income split even though the **Action Plan** (Target Age mode) said
to put the majority into an ISA.

This is a **separate bug** from Task 2b (which fixed the Net Worth card and the
comparison ISA cap). The Retirement Picture is its own component
(`RetirementPictureCard`) with its own calculation, untouched by 2b.

---

## The bug

`RetirementPictureCard` combined **two incompatible allocation scenarios** in
one view:

- **ISA income** (line ~1480/1484): from `isaOpt._phasePot` — the
  **maxReturn-default** phase ISA pot. For the reported case (serving, higher
  rate, SIPP-first) that is the existing-£80k-only growth → small ISA.
- **SIPP income** (line ~1485): from `sippOpt.annualIncomeAtRetirement`, which
  is computed assuming the **whole contribution** goes into a SIPP → large SIPP.

So ISA was read from an "ISA gets almost nothing" allocation while SIPP was read
from a "100% into SIPP" allocation — two scenarios that cannot both be true.
Result: an ISA-light / SIPP-heavy picture that contradicted an ISA-first Action
Plan. It was also mode-blind: ISA always used the maxReturn default regardless
of the selected toggle.

### Verification against the reported live output

Inputs: serving, age 30, leave 35, retire 55, £160k salary, £27,500/yr
contribution, £80k existing ISA, 4.39% real return, Target Age mode selected.

| Card figure (old) | value | what it actually modelled |
|---|---|---|
| ISA Drawdown | £9,368/yr | existing £80k only (maxReturn `_phasePot`), **not** the Target-Age £20k/yr ISA |
| SIPP Drawdown | £47,264/yr | full £27,500/yr into SIPP |

Reproduced in isolation: existing £80k × 1.0439²⁵ = £234,187 → £9,367/yr;
full SIPP £34,375 gross × 25y annuity-due = £1,575,413 → ×0.75×0.04 = £47,262/yr.
Both match the reported PDF (£9,368 / £47,264).

---

## The fix

Derive **both** ISA and SIPP income from the **same per-mode phase
allocations** the Action Plan uses.

**Files:** `src/App.js`.

1. Added `sippPhasePotForAllocs(allocs)` (~line 452) — mirrors the existing
   `isaPhasePotForAllocs`, accumulating each phase's **gross** SIPP
   contribution (`ph.sippGross`) over that phase's years, starting from any
   existing SIPP pot.

2. In the per-mode loop (~line 758), compute `isaPhasePot` and `sippPhasePot`
   for each mode, attach them to `modeData[mode]`, and build the per-mode
   `netWorth` from **both** (SIPP is now phase-based too, not the
   full-contribution `sippOptPot`).

3. Passed the active mode's pots through `activeResults`
   (`activeIsaPhasePot`, `activeSippPhasePot`, ~line 2200).

4. `RetirementPictureCard` (~line 1476) now reads those:
   - `isaAnnual = isaPhasePot × 0.04`
   - `sippAnnual = sippPhasePot × 0.75 × 0.04` (4% of the 75% left after the lump)
   - `sippLump = sippPhasePot × 0.25`
   - Falls back to the legacy option figures for calculations saved before this
     change.

### Before / after (reported case)

| Mode | card | ISA income | SIPP income |
|---|---|---|---|
| Max Return | before & after | £9,367/yr | £47,262/yr (unchanged — this mode really is SIPP-first) |
| **Target Age** | before (bug) | £9,368/yr | £47,264/yr |
| **Target Age** | **after (fix)** | **£46,032/yr** | **£12,890/yr** |

The Target-Age picture is now ISA-heavy, matching its ISA-first Action Plan.

### Why maxReturn is unchanged

For maxReturn (higher rate, SIPP gets the full budget across both phases), the
phase-accumulated SIPP pot equals the single-shot full-contribution pot:
£1,575,413 in both — verified diff £0. So net worth and the Retirement Picture
for maxReturn are byte-identical to before; only the modes that actually
allocate differently (Target Age, Earliest FIRE) change — correctly.

### Verification

- Per-mode ISA and SIPP pots reproduced in isolation (tables above) — match the
  reported live figures and the Action Plan allocations.
- `react-scripts build` — succeeds, no errors.
- maxReturn output confirmed unchanged.

---

## Consistency note

After Tasks 2b + 2c, all three cards (Action Plan, Net Worth, Retirement
Picture) now derive ISA and SIPP from the **same per-mode phase allocations** and
follow the optimisation toggle together. This removes the class of
"numbers contradict each other across cards" defects — useful evidence for the
TM470 testing/evaluation chapter.
