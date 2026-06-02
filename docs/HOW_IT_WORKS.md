# How Soldiers Fortune Works — Plain English Guide

This explains the logic behind the app in simple terms. No code, no jargon where
it can be avoided. Read it top to bottom and you'll understand what every number
on the screen means and where it comes from.

---

## The big idea

You tell the app about yourself (age, salary, savings, when you want to retire).
The app works out **how much tax you pay**, **how to split your savings** across
three "pots", and **how much income you'll have in retirement**. It then shows
this as cards and charts.

Everything is shown in **today's money** — i.e. adjusted for inflation — so the
numbers mean what they sound like.

---

## The three savings pots

| Pot | What it is | Key rule |
|---|---|---|
| **ISA** | Stocks & Shares ISA | Tax-free. You can put in **£20,000/yr** max. Access any time. |
| **SIPP** | Private pension | Government adds 25% on top. **Locked until age 57.** Taxed when you draw it. |
| **Added Pension** | AFPS-15 (forces only) | A guaranteed pension for life. **Only available while serving.** Locked until State Pension Age (67). |

You also have a **DB pension** (your existing forces pension) and the **State
Pension**, both of which start at 67.

---

## Step 1 — Working out your tax

The app uses the official **2025/26 UK tax bands** (England, Wales & NI):

- First **£12,570** — no tax (the "personal allowance")
- Next slice up to **£50,270** — taxed at **20%**
- £50,270 to **£125,140** — taxed at **40%**
- Above £125,140 — taxed at **45%**

**The £100k trap:** if you earn over £100,000, your tax-free £12,570 shrinks by
£1 for every £2 you earn, disappearing completely at £125,140. In that band you
effectively lose **60p of every extra £1** to tax. The app models this exactly.

**National Insurance** is added on top (a simplified 8% then 2%).

> *Example:* On a £160,000 salary the app shows £58,203 income tax and £5,211 NI
> — both match the official HMRC figures.

---

## Step 2 — Growing your money over time

Money invested grows each year. The app uses the standard compound-growth
formula for regular yearly contributions:

> **Future value = yearly amount × growth factor**

Two important details:

1. **Real growth, not headline growth.** If investments grow 7%/yr but inflation
   is 2.5%/yr, the *real* growth is about **4.4%/yr**. The app uses the real
   figure so everything stays in today's money.
2. **Contributions are counted from the start of each year** (slightly more
   growth than counting from year-end).

If growth is 0%, the app just adds up the contributions (no broken maths).

---

## Step 3 — The Action Plan (how to split your money)

This is the heart of the app. It decides how much of your yearly budget goes into
each pot, in a sensible order. The order depends on which **mode** you pick:

| Mode | Goal | Order it fills pots |
|---|---|---|
| **Max Return** | Biggest pot at the end | SIPP first (best tax relief), then ISA |
| **Earliest FIRE** | Retire as soon as possible | ISA first (accessible any age), then SIPP |
| **Target Age** | Hit a chosen retirement age | ISA first (so money's available), then SIPP |

Rules the plan always respects:
- ISA never exceeds **£20,000/yr** (anything over needs a normal investment account).
- SIPP is capped at sensible limits.
- **Added Pension is only included if it's genuinely worth it.** If you're
  retiring *before* 67, AP money would be locked away and useless to you early —
  so the plan correctly puts **£0** into it and uses ISA/SIPP instead.

The plan can have **two phases** for serving personnel: while serving (Added
Pension available) and after leaving (budget redirected to ISA/SIPP).

---

## Step 4 — Added Pension (the forces-specific bit)

If you buy Added Pension, the app works out how much guaranteed yearly pension
that buys, using the AFPS-15 cost tables. There's a lifetime cap
(**£8,571.21/yr** of pension). To compare it fairly against ISA/SIPP, the app
treats the guaranteed pension as a lump sum worth **25× the yearly amount**.

**Important:** the Added Pension shown in your results only reflects what the
**Action Plan actually decided to buy**. If the plan put £0 into it, you won't
see phantom AP income later.

---

## Step 5 — Your retirement income

The app assumes you withdraw **4% of a pot per year** (the standard "safe
withdrawal rate"). It then builds your income in stages, because different money
unlocks at different ages:

- **From your retirement age:** ISA only (always accessible).
- **From 57:** SIPP unlocks too (you can take 25% as a tax-free lump sum, and
  draw down the rest — taxed as income).
- **From 67:** everything else kicks in — DB pension, Added Pension (if bought),
  and the State Pension.

All of these are added up to show your total yearly income at each life stage,
and compared against your **FIRE target** (the income you said you want, ×25 to
get the pot you need).

---

## Step 6 — Net worth

A simple tally of everything you'd own at retirement, all in today's money:

> **Total = ISA pot + SIPP pot + Added Pension (commuted) + DB pension (commuted)
> + property equity + cash**

Each item is shown as its own line, and they add up exactly to the total.

---

## How the cards stay consistent

A key principle (and the focus of several fixes): **every card uses the same
underlying plan.** The Action Plan, the income timeline, the Net Worth tally and
the Retirement Picture all read the *same* per-mode split of your money. So if
the Action Plan says "mostly ISA", the income and net-worth cards reflect mostly
ISA too — and they change together when you switch mode.

---

## What the app deliberately does **not** do

- It is **not** regulated financial advice — it's an illustration.
- It uses **England/Wales/NI** tax bands (not Scottish rates).
- It assumes a **steady** growth rate (real markets go up and down).
- NI is a **simplified** approximation.
- The Added Pension ×25 conversion is **indicative**, not an official actuarial
  figure.

Always check with HMRC and an FCA-authorised adviser before making real
decisions.

---

## One-line summary of each screen

| Screen | What it tells you |
|---|---|
| **Tax Summary** | Your income tax, NI and take-home pay |
| **FIRE Number** | The pot you need for your target income (×25) |
| **Action Plan** | Exactly how to split your yearly budget across pots |
| **Income Timeline** | Your yearly income by age, source by source |
| **Accumulated Wealth** | How your pots grow over time |
| **Retirement Picture** | Your total income at each life stage (55, 57, 67+) |
| **Net Worth** | Everything you'll own at retirement, added up |
| **Mix Analysis / Comparison** | "What if" you used each pot on its own |
