import { formatBDT } from "../../lib/format";

const VIEW_W = 400;
const VIEW_H = 140;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;

function toPath(points, scaleX, scaleY) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.day)} ${scaleY(p.amount)}`).join(" ");
}

/**
 * Answers "am I spending faster than I should?" — actual spend so far vs a
 * straight-line continuation to the forecast, against the salary ceiling.
 */
export default function SpendingTrendChart({ series, salary }) {
  const { actual, projected, totalDays } = series;
  if (actual.length < 2) {
    return (
      <p className="text-sm text-stone-500 py-6 text-center">
        Add a few more expenses to see your spending trend.
      </p>
    );
  }

  const maxAmount = Math.max(
    salary || 0,
    ...actual.map((p) => p.amount),
    ...projected.map((p) => p.amount)
  );
  const safeMax = maxAmount > 0 ? maxAmount * 1.08 : 1;

  const scaleX = (day) => (day / totalDays) * VIEW_W;
  const scaleY = (amount) =>
    PAD_TOP + (1 - amount / safeMax) * (VIEW_H - PAD_TOP - PAD_BOTTOM);

  const actualPath = toPath(actual, scaleX, scaleY);
  const projectedPath =
    projected.length > 1 ? toPath(projected, scaleX, scaleY) : "";
  const last = actual[actual.length - 1];
  const salaryY = salary > 0 ? scaleY(Math.min(salary, safeMax)) : null;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="w-full h-32"
        role="img"
        aria-label={`Cumulative spending: ${formatBDT(last.amount)} so far, projected ${formatBDT(
          projected[projected.length - 1]?.amount ?? last.amount
        )} by month end, against a salary of ${formatBDT(salary)}`}
      >
        {salaryY !== null && (
          <line
            x1="0"
            y1={salaryY}
            x2={VIEW_W}
            y2={salaryY}
            stroke="#d6d3d1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}
        {projectedPath && (
          <path d={projectedPath} fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="5 4" />
        )}
        <path d={actualPath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={scaleX(last.day)} cy={scaleY(last.amount)} r="3.5" fill="#059669" />
      </svg>
      <div className="flex items-center gap-4 mt-2 text-xs text-stone-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-emerald-600 inline-block" /> Actual
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="2" viewBox="0 0 12 2" aria-hidden="true">
            <line x1="0" y1="1" x2="12" y2="1" stroke="#d97706" strokeWidth="2" strokeDasharray="3 2" />
          </svg>
          Forecast
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-stone-300 inline-block" /> Salary ({formatBDT(salary)})
        </span>
      </div>
    </div>
  );
}
