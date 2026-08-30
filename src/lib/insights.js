import { formatBDT } from "./format";

/**
 * Deterministic "what stands out" rules. Only numbers already computed by
 * forecast.js / dps.js feed these — nothing here is hardcoded advice.
 * Candidates are ranked by priority and the top few survive (build brief
 * section 22).
 */
export function generateInsights({ forecast, breakdown, comparison, top, pocketSummary }) {
  const candidates = [];
  const usedCategories = new Set();

  if (forecast.outlier) {
    const oneOff = forecast.outlier.expense;
    candidates.push({
      id: "outlier",
      priority: 1,
      icon: "!",
      tone: "warning",
      title: "Large one-off expense",
      text: `Your forecast is affected by a ${formatBDT(oneOff.amount)} expense at ${
        oneOff.shop || oneOff.category
      }. Excluding it, expected month-end spending is ${formatBDT(
        forecast.outlier.projectedTotalSpend
      )}.`,
    });
  }

  if (pocketSummary && pocketSummary.totalRequested > 0 && pocketSummary.scaled) {
    candidates.push({
      id: "pocket-affordability",
      priority: 2,
      icon: "⚠",
      tone: "warning",
      title: "Savings plan ahead of cash flow",
      text: `Your planned pocket contributions total ${formatBDT(
        pocketSummary.totalRequested
      )} a month, but your forecasted surplus is only ${formatBDT(pocketSummary.monthlyAvailable)}.`,
    });
  }

  if (forecast.hasEnoughData) {
    if (forecast.projectedLeftover >= 0) {
      candidates.push({
        id: "forecast",
        priority: 3,
        icon: "●",
        tone: "positive",
        title: "Forecast",
        text: `At your current spending pattern, you're on track to have ${formatBDT(
          forecast.projectedLeftover
        )} left at month end.`,
      });
    } else {
      candidates.push({
        id: "forecast",
        priority: 3,
        icon: "⚠",
        tone: "negative",
        title: "Forecast",
        text: `At your current pace, you may end the month ${formatBDT(
          Math.abs(forecast.projectedLeftover)
        )} short.`,
      });
    }
  }

  if (comparison.hasHistory) {
    const increasable = comparison.categoryChanges.filter((c) => c.change !== null && c.current > 0);
    const biggestIncrease = [...increasable].sort((a, b) => b.change - a.change)[0];
    const decreasable = comparison.categoryChanges.filter(
      (c) => c.change !== null && c.previous > 0
    );
    const biggestDecrease = [...decreasable].sort((a, b) => a.change - b.change)[0];

    if (biggestIncrease && biggestIncrease.change > 10) {
      usedCategories.add(biggestIncrease.category);
      candidates.push({
        id: "increase",
        priority: 4,
        icon: "↑",
        tone: "warning",
        title: biggestIncrease.category,
        text: `You've spent ${formatBDT(biggestIncrease.current)} on ${biggestIncrease.category.toLowerCase()}, ${Math.round(
          biggestIncrease.change
        )}% more than this time last month.`,
      });
    }
    if (
      biggestDecrease &&
      biggestDecrease.change < -10 &&
      !usedCategories.has(biggestDecrease.category)
    ) {
      usedCategories.add(biggestDecrease.category);
      candidates.push({
        id: "decrease",
        priority: 5,
        icon: "↓",
        tone: "positive",
        title: biggestDecrease.category,
        text: `You've spent ${formatBDT(biggestDecrease.current)} on ${biggestDecrease.category.toLowerCase()}, ${Math.round(
          Math.abs(biggestDecrease.change)
        )}% less than this time last month.`,
      });
    }
  }

  if (top && top.length > 0) {
    const largest = top[0];
    candidates.push({
      id: "largest-expense",
      priority: 6,
      icon: "●",
      tone: "neutral",
      title: "Largest expense",
      text: `${largest.shop ? largest.shop : largest.category} was your largest expense at ${formatBDT(
        largest.amount
      )}.`,
    });
  }

  if (breakdown.rows.length > 0) {
    const topCat = breakdown.rows[0];
    if (topCat.percent >= 25 && !usedCategories.has(topCat.category)) {
      candidates.push({
        id: "largest-category",
        priority: 7,
        icon: "●",
        tone: "neutral",
        title: `${topCat.category} is your largest category`,
        text: `${topCat.category} makes up ${Math.round(topCat.percent)}% of this month's spending at ${formatBDT(
          topCat.amount
        )}.`,
      });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, 4);
}
