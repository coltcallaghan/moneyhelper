# Task 2e — DB Pension Shown But Excluded From Net Worth Total (Investigation & Fix)

**Date:** 2026-06-02
**Status:** Fixed. Build passes. (Commit + deploy per your go-ahead.)
**Trigger:** During cross-card consistency checking of the live Target-Age output,
the Net Worth card listed "DB Pension (commuted) £225,000" as a row but the
**Total Net Worth (£1,620,510) did not include it** — the displayed rows did not
sum to the stated total.

---

## The bug

**File:** `src/App.js` (`buildResults`, ~lines 770-772 and the per-mode loop
~line 803).

```js
const liquidWealth  = isaOptPot + sippOptPot;
const dbOptPot = existingDbPension * 25;                     // computed + displayed
const totalNetWorth = liquidWealth + apOptPot + propertyEquityAtRetirement + cashAtRetirement;
//                                   ^^^^^^^ AP included, dbOptPot OMITTED
```

`dbOptPot` (the user's existing DB pension commuted at ×25) is computed and shown
as its own Net Worth row, but left out of `totalNetWorth`. The Added Pension
commuted value (`apOptPot`, also a ×25 DB-style figure) **is** included — so two
equivalent commuted-pension assets were treated inconsistently, and a £225,000
line item was displayed but silently not summed.

It was also inconsistent **across cards**: the DB pension income (£9,000/yr) *is*
counted in the Retirement Picture (Phase 3), while the DB capital was
shown-but-excluded in Net Worth.

### Verification (reported case)

```
rows shown:  ISA 1,150,837 + SIPP 429,673 + DB 225,000 + Cash 40,000 = 1,845,510
old total:   liquid 1,580,510 + cash 40,000 (+AP 0 +property 0)       = 1,620,510  ← DB missing
```

---

## The fix

Include `dbOptPot` in `totalNetWorth`, in both the legacy calculation and the
per-mode loop. This matches the existing AP convention (commuted DB-style values
count toward net worth) and makes the displayed rows sum exactly to the total.

```js
// before
const totalNetWorth = liquidWealth + apOptPot + propertyEquityAtRetirement + cashAtRetirement;
// after
const totalNetWorth = liquidWealth + apOptPot + dbOptPot + propertyEquityAtRetirement + cashAtRetirement;
```

(and the same `+ dbOptPot` added to the per-mode `totalNetWorth`.)

### Before / after (reported case)

| | before | after |
|---|---|---|
| DB Pension (commuted) row | £225,000 (shown) | £225,000 (shown) |
| Total Net Worth | £1,620,510 (rows don't sum) | **£1,845,510** (rows sum exactly) |

ISA, SIPP, AP, property and cash figures are unchanged; only the total now
includes the DB row it already displays.

### Verification

- Rows now sum to the total (table above).
- `react-scripts build` — succeeds, no errors.

---

## Full cross-card consistency status (after 2b–2e)

For the Target-Age reference case, all cards now agree:

| Quantity | Cards | Consistent |
|---|---|---|
| ISA pot £1,150,837 / income £46,033 | Net Worth, Recommendation, Comparison, Retirement Picture | ✅ |
| SIPP pot £429,673 / drawdown £12,890 / lump £107,418 | Net Worth, Retirement Picture | ✅ |
| Added Pension (£0 when not allocated) | Retirement Picture, Net Worth | ✅ (Task 2d) |
| DB pension: income in Picture **and** capital in Net Worth total | Retirement Picture, Net Worth | ✅ (this fix) |
| Net Worth total = sum of its rows | Net Worth | ✅ (this fix) |

### Known cosmetic / intentional items (not wrong numbers)

- **Timeline chart** still renders a faint "Added Pension" key entry/band when AP
  income is £0 (series not suppressed at zero). Cosmetic only — no incorrect
  figure. Candidate for a later tidy-up.
- **Full Comparison** AP card still shows the standalone £214,280 / £8,571 — the
  intentional "what-if you put it all here" view documented in Task 2d.
