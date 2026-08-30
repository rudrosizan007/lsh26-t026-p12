# Pennywise

**Live:** https://lsh26-t026-p12.vercel.app

## What it does

Pennywise is a lightweight expense tracker and month-end
forecaster for a salaried person. Log expenses in seconds (by hand or by
scanning a receipt photo), and the dashboard immediately shows what you've
spent, what you have left right now, and — using a transparent, simple
forecast — what you'll probably have left at the end of the month. A Savings
screen turns "I want to save ৳X/month" into an actual projected completion
date, based on your real forecasted surplus rather than a naive
target-divided-by-contribution guess.

Built for the LofiStack Hackathon 2026.

## Core features

1. **Expense entry, including receipt OCR** — add an expense by hand, or
   snap/upload a photo of a receipt. The photo is read with an in-browser
   OCR engine, run through a deterministic parser, and shown back to you for
   review before anything is saved. A field the parser isn't confident about
   is always left blank rather than guessed.
2. **Monthly dashboard** — salary vs. spending, available money right now,
   category breakdown, largest expenses, and a month-over-month comparison
   against the same number of elapsed days last month.
3. **Dynamic forecast** — expected remaining spending, expected month-end
   position (surplus or shortfall), and at least three data-driven insights
   that change as your data changes.
4. **Savings pockets** — a target, an item, a monthly contribution, and a
   completion date that comes from simulating your forecasted monthly
   surplus month-by-month (with DPS-style compounding interest), not from
   `target ÷ contribution`.

## How to run

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). That's it —
there is no separate server to start.

To build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Environment variables

**None are required.** Receipt scanning runs entirely in the browser via
Tesseract.js — there is no external OCR/AI API, no API key, and no backend
service to configure. The OCR engine's worker script, WASM core, and English
language data are bundled locally under `public/tesseract/` and served as
static files, so it also works without reaching any third-party CDN at
runtime.

## What's mocked

- **"Load demo data"** populates a deterministic, realistic month (plus a
  full previous month for comparison) and three savings pockets, so the app
  is interesting to look at without manual data entry. It's editable and
  deletable like any other data, and never loads automatically.
- **DPS interest** is a projection for this app only — see below. It is not
  connected to any real bank product.
- There is no authentication and no multi-user support; all data is a single
  local ledger in the browser's `localStorage`.

## Forecast methodology

1. Split this month's expenses into **fixed/recurring** (rent, and anything
   the user flags as recurring or that falls in Rent/Utilities/Mobile/
   Education) and **variable** (everything else).
2. `dailyVariableRate = variableSpentSoFar / elapsedDays`.
   For the first 3 days of a month, if last month's data exists, this rate is
   blended 50/50 with last month's variable daily rate, since 1–2 data points
   alone are too noisy to trust.
3. `expectedRemainingSpending = dailyVariableRate × remainingDays`, plus any
   recurring expense from last month that hasn't recurred yet this month
   (e.g. rent not yet paid this month).
4. `expectedMonthEndSpending = spentSoFar + expectedRemainingSpending`.
   `expectedMoneyLeft = salary − expectedMonthEndSpending`.
5. If one expense is more than 40% of spending so far, it's flagged as a
   possible one-off, and an adjusted forecast excluding it is shown
   alongside the primary number (the primary "spent so far" figure is never
   altered).
6. A confidence label (Early estimate / Moderate / Good) is shown next to
   the forecast based on how many days of data exist, so the number is never
   presented with false precision. Below 2 recorded expenses in the current
   month, the forecast is replaced with "not enough spending data yet."

This is a deliberately simple, explainable method — not a statistical model.

## DPS methodology

Every savings pocket projection uses an **8% annual rate**, compounded
**monthly**: each month, the stated (or forecast-scaled) contribution is
added to the balance first, then that month's interest
(`balance × 8% / 12`) is calculated and added to the balance. Interest
compounds because it stays in the balance for future months' interest
calculations. This is simulated month-by-month (capped at 600 months) to
find the actual completion date — never computed as `target ÷ contribution`.

If a pocket's own stated contribution can't fit inside the forecasted
monthly surplus across all pockets combined, contributions are scaled down
proportionally (not first-come-first-served), and this is shown to the user
rather than done silently.

This is a projection for planning purposes only, not a guaranteed return or
a real financial product.

## Limitations

- **OCR accuracy** depends on photo quality, lighting, and receipt layout.
  It's tuned for the common Bangladeshi receipt pattern of clearly labelled
  totals (TOTAL / GRAND TOTAL / AMOUNT DUE / PAYABLE / NET TOTAL) — receipts
  without one of these labels fall back to a best-guess scan of all numbers
  on the page, which is always marked low-confidence and forces manual entry
  of the amount rather than risk silently using the wrong number.
- **Merchant name detection** is a heuristic (roughly: the first plausible
  text line that isn't a phone number, address, date, or common receipt
  label) and can occasionally pick up a slogan or address fragment on
  unusually formatted receipts — always editable before saving.
- **Date parsing** assumes day-before-month for ambiguous numeric dates
  (the Bangladeshi/international convention), which will misread US-style
  MM/DD dates.
- **The forecast is intentionally simple.** It does not model seasonality,
  irregular income, or category-specific trends.
- Everything lives in one browser's `localStorage` — clearing site data or
  switching browsers/devices loses the ledger. There is no sync or backup.

## What we would build next

- Sync/backup (even something as simple as JSON export/import) so data isn't
  tied to one browser.
- A confirmed-merchant list so the shop-name heuristic improves over time
  from the user's own corrections.
- Multi-currency support beyond BDT.
- A richer "what-if" panel (reduce category X by Y% and see the effect on
  every open pocket at once) — the current build only ships the four scored
  requirements plus the small quality-of-life bonuses (inline contribution
  editing, automatic recurring-expense badges) that don't put those four at
  risk.
- Batch receipt upload for catching up a backlog of paper receipts at once.
