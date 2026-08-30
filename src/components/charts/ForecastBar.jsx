import { formatBDT, pct } from "../../lib/format";

/**
 * One bar, three numbers: what's actually spent, what's projected, and the
 * salary ceiling they're measured against. Answers "how much room is left"
 * without requiring chart-reading skill.
 */
export default function ForecastBar({ spentSoFar, projectedTotalSpend, salary }) {
  if (!(salary > 0)) return null;

  const actualPct = Math.min(100, pct(spentSoFar, salary));
  const forecastPct = Math.min(100, pct(projectedTotalSpend, salary));
  const isOver = projectedTotalSpend > salary;

  return (
    <div>
      <div className="relative h-3 rounded-full bg-stone-100 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${isOver ? "bg-red-200" : "bg-amber-200"}`}
          style={{ width: `${forecastPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-stone-900"
          style={{ width: `${actualPct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-stone-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-900 inline-block" /> Actual {formatBDT(spentSoFar)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full inline-block ${isOver ? "bg-red-300" : "bg-amber-300"}`} />
          Forecast {formatBDT(projectedTotalSpend)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-200 inline-block" /> Salary {formatBDT(salary)}
        </span>
      </div>
    </div>
  );
}
