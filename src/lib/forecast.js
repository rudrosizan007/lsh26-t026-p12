import { isFixedCategory } from "./storage";
import { pct, safeDiv } from "./format";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysInMonthOf(isoDateInMonth) {
  const d = new Date(isoDateInMonth + "T00:00:00");
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function getMonthRange(date) {
  const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth(), totalDays);
  return { start: toISO(start), end: toISO(end), totalDays };
}

function filterExpensesInRange(expenses, startISO, endISO) {
  return expenses.filter((e) => e.date >= startISO && e.date <= endISO);
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

function keyFor(expense) {
  return `${(expense.shop || "").trim().toLowerCase()}|${expense.category}`;
}

function findExpectedRemainingFixed(currentMonthExpenses, prevMonthExpenses) {
  const currentFixedKeys = new Set(
    currentMonthExpenses
      .filter((e) => isFixedCategory(e.category, e.isRecurring))
      .map(keyFor)
  );
  const prevFixed = prevMonthExpenses.filter((e) => isFixedCategory(e.category, e.isRecurring));
  const seen = new Map();
  for (const e of prevFixed) {
    seen.set(keyFor(e), { amount: e.amount, category: e.category, shop: e.shop });
  }
  let total = 0;
  const items = [];
  for (const [key, info] of seen) {
    if (!currentFixedKeys.has(key)) {
      total += info.amount;
      items.push(info);
    }
  }
  return { total, items };
}

/**
 * Combines known fixed/recurring spending, an already-happened actuals total,
 * and a variable daily-rate projection into a single month-end estimate.
 * See build brief section 18 for the exact algorithm this implements.
 */
export function calculateForecast(expenses, salary, today) {
  const { start, totalDays } = getMonthRange(today);
  const elapsedDays = today.getDate();
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const todayISOStr = toISO(today);

  const currentMonthExpenses = filterExpensesInRange(expenses, start, todayISOStr);
  const spentSoFar = sum(currentMonthExpenses.map((e) => e.amount));

  const variableCurrent = currentMonthExpenses.filter(
    (e) => !isFixedCategory(e.category, e.isRecurring)
  );
  const variableSpentSoFar = sum(variableCurrent.map((e) => e.amount));

  const prevMonthAnchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevRange = getMonthRange(prevMonthAnchor);
  const prevMonthExpenses = filterExpensesInRange(expenses, prevRange.start, prevRange.end);
  const hasPrevMonth = prevMonthExpenses.length > 0;

  let dailyVariableRate = safeDiv(variableSpentSoFar, elapsedDays);

  if (elapsedDays <= 3 && hasPrevMonth) {
    const prevVariable = prevMonthExpenses.filter(
      (e) => !isFixedCategory(e.category, e.isRecurring)
    );
    const prevVariableTotal = sum(prevVariable.map((e) => e.amount));
    const prevDailyRate = safeDiv(prevVariableTotal, daysInMonthOf(prevRange.start));
    dailyVariableRate = dailyVariableRate * 0.5 + prevDailyRate * 0.5;
  }

  const forecastRemainingVariable = dailyVariableRate * remainingDays;

  const { total: remainingExpectedRecurring, items: recurringItems } = findExpectedRemainingFixed(
    currentMonthExpenses,
    prevMonthExpenses
  );

  const projectedTotalSpend = spentSoFar + forecastRemainingVariable + remainingExpectedRecurring;
  const projectedLeftover = salary - projectedTotalSpend;

  let outlier = null;
  if (currentMonthExpenses.length > 0 && spentSoFar > 0) {
    const largest = [...currentMonthExpenses].sort((a, b) => b.amount - a.amount)[0];
    if (largest.amount / spentSoFar > 0.4) {
      const isLargestVariable = !isFixedCategory(largest.category, largest.isRecurring);
      const adjustedSpentSoFar = spentSoFar - largest.amount;
      const adjustedVariableSpentSoFar = isLargestVariable
        ? variableSpentSoFar - largest.amount
        : variableSpentSoFar;
      const adjustedDailyRate = safeDiv(adjustedVariableSpentSoFar, elapsedDays);
      const adjustedForecastRemaining = adjustedDailyRate * remainingDays;
      const adjustedProjectedTotalSpend =
        adjustedSpentSoFar + adjustedForecastRemaining + remainingExpectedRecurring;
      outlier = {
        expense: largest,
        projectedTotalSpend: adjustedProjectedTotalSpend,
        projectedLeftover: salary - adjustedProjectedTotalSpend,
      };
    }
  }

  const totalExpenseCount = currentMonthExpenses.length;
  const hasEnoughData = totalExpenseCount >= 2;
  let confidence = "insufficient";
  if (hasEnoughData) {
    if (elapsedDays <= 3) confidence = hasPrevMonth ? "moderate" : "early";
    else if (elapsedDays <= 7) confidence = "moderate";
    else confidence = "good";
  }

  return {
    monthStart: start,
    asOfDate: todayISOStr,
    elapsedDays,
    remainingDays,
    totalDays,
    spentSoFar,
    variableSpentSoFar,
    forecastRemainingVariable,
    remainingExpectedRecurring,
    recurringItems,
    projectedTotalSpend,
    projectedLeftover,
    availableNow: salary - spentSoFar,
    hasEnoughData,
    confidence,
    outlier,
  };
}

export function categoryBreakdown(expenses, today) {
  const { start, end } = getMonthRange(today);
  const currentMonthExpenses = filterExpensesInRange(expenses, start, end);
  const total = sum(currentMonthExpenses.map((e) => e.amount));
  const map = new Map();
  for (const e of currentMonthExpenses) {
    map.set(e.category, (map.get(e.category) || 0) + e.amount);
  }
  const rows = [...map.entries()]
    .map(([category, amount]) => ({ category, amount, percent: pct(amount, total) }))
    .sort((a, b) => b.amount - a.amount);
  return { rows, total };
}

/**
 * Per-day totals for the current month, for the daily-spending chart —
 * answers "which days spiked", not shown as a decorative sparkline.
 */
export function dailySpending(expenses, today) {
  const { start } = getMonthRange(today);
  const elapsedDays = today.getDate();
  const currentMonthExpenses = filterExpensesInRange(expenses, start, toISO(today));

  const byDay = new Map();
  for (const e of currentMonthExpenses) {
    const day = Number(e.date.slice(8, 10));
    byDay.set(day, (byDay.get(day) || 0) + e.amount);
  }

  const days = [];
  for (let d = 1; d <= elapsedDays; d += 1) {
    days.push({ day: d, amount: byDay.get(d) || 0 });
  }
  return days;
}

/**
 * Cumulative actual spending through today, plus a straight-line continuation
 * to the already-computed forecast total. Reuses forecast's own numbers
 * (rather than re-deriving a trajectory) so the chart can never disagree with
 * the headline forecast figures shown elsewhere on the dashboard.
 */
export function cumulativeSeries(expenses, today, forecast) {
  const { start, totalDays } = getMonthRange(today);
  const elapsedDays = today.getDate();
  const currentMonthExpenses = filterExpensesInRange(expenses, start, toISO(today));

  const byDay = new Map();
  for (const e of currentMonthExpenses) {
    const day = Number(e.date.slice(8, 10));
    byDay.set(day, (byDay.get(day) || 0) + e.amount);
  }

  const actual = [];
  let running = 0;
  for (let d = 1; d <= elapsedDays; d += 1) {
    running += byDay.get(d) || 0;
    actual.push({ day: d, amount: running });
  }

  const projected = [];
  if (forecast.hasEnoughData && totalDays > elapsedDays) {
    const span = totalDays - elapsedDays;
    for (let d = elapsedDays; d <= totalDays; d += 1) {
      const t = (d - elapsedDays) / span;
      projected.push({ day: d, amount: running + (forecast.projectedTotalSpend - running) * t });
    }
  }

  return { actual, projected, totalDays, elapsedDays };
}

export function topExpenses(expenses, today, limit = 5) {
  const { start, end } = getMonthRange(today);
  const currentMonthExpenses = filterExpensesInRange(expenses, start, end);
  return [...currentMonthExpenses].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

function computeChange(current, previous) {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  return Number.isFinite(change) ? change : 0;
}

/**
 * Bonus: badge-only recurring detection. Does not affect forecast
 * classification (which relies on the stored isRecurring flag + fixed
 * categories) — this only flags expenses whose shop shows up again next
 * month at a similar amount, per build brief bonus 2.
 */
export function detectRecurringKeys(expenses, today) {
  const { start, end } = getMonthRange(today);
  const currentMonthExpenses = filterExpensesInRange(expenses, start, end);

  const prevMonthAnchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevRange = getMonthRange(prevMonthAnchor);
  const prevMonthExpenses = filterExpensesInRange(expenses, prevRange.start, prevRange.end);

  const recurringKeys = new Set();
  for (const cur of currentMonthExpenses) {
    if (!cur.shop) continue;
    const match = prevMonthExpenses.find(
      (prev) =>
        prev.shop &&
        prev.shop.trim().toLowerCase() === cur.shop.trim().toLowerCase() &&
        Math.abs(prev.amount - cur.amount) / Math.max(prev.amount, 1) <= 0.15
    );
    if (match) recurringKeys.add(cur.id);
  }
  return recurringKeys;
}

export function monthComparison(expenses, today) {
  const elapsedDays = today.getDate();
  const curStart = getMonthRange(today).start;
  const currentSlice = filterExpensesInRange(expenses, curStart, toISO(today));

  const prevMonthAnchor = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevRange = getMonthRange(prevMonthAnchor);
  const prevFullMonthExpenses = filterExpensesInRange(expenses, prevRange.start, prevRange.end);

  if (prevFullMonthExpenses.length === 0) {
    return { hasHistory: false };
  }

  const prevDaysInMonth = daysInMonthOf(prevRange.start);
  const compareDays = Math.min(elapsedDays, prevDaysInMonth);
  const prevSliceEndDate = new Date(
    prevMonthAnchor.getFullYear(),
    prevMonthAnchor.getMonth(),
    compareDays
  );
  const prevSlice = filterExpensesInRange(expenses, prevRange.start, toISO(prevSliceEndDate));

  const currentTotal = sum(currentSlice.map((e) => e.amount));
  const prevTotal = sum(prevSlice.map((e) => e.amount));

  const categories = new Set([...currentSlice, ...prevSlice].map((e) => e.category));
  const categoryChanges = [...categories]
    .map((category) => {
      const cur = sum(currentSlice.filter((e) => e.category === category).map((e) => e.amount));
      const prev = sum(prevSlice.filter((e) => e.category === category).map((e) => e.amount));
      return { category, current: cur, previous: prev, change: computeChange(cur, prev) };
    })
    .sort((a, b) => b.current - a.current);

  return {
    hasHistory: true,
    compareDays,
    currentTotal,
    prevTotal,
    totalChange: computeChange(currentTotal, prevTotal),
    categoryChanges,
  };
}
