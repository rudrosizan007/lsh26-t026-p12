import { formatBDT, pct } from "../../lib/format";

const PALETTE = ["#059669", "#34d399", "#d97706", "#57534e", "#a8a29e", "#d6d3d1"];
const MAX_SLICES = 6;
const SIZE = 160;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Composition of spending by category. Only earns its place because a donut
 * answers "what share of my money went where" faster than a list of numbers.
 * Capped at 6 slices — smaller categories fold into "Other" rather than
 * producing an unreadable rainbow.
 */
export default function CategoryDonut({ rows, total }) {
  if (rows.length === 0 || total <= 0) {
    return <p className="text-sm text-stone-500 py-6 text-center">No spending recorded this month yet.</p>;
  }

  const top = rows.slice(0, MAX_SLICES - 1);
  const restTotal = rows.slice(MAX_SLICES - 1).reduce((a, r) => a + r.amount, 0);
  const slices = restTotal > 0 ? [...top, { category: "Other", amount: restTotal }] : top;

  const { arcs } = slices.reduce(
    (acc, s, i) => {
      const fraction = s.amount / total;
      const dash = fraction * CIRCUMFERENCE;
      acc.arcs.push({
        color: PALETTE[i % PALETTE.length],
        dasharray: `${dash} ${CIRCUMFERENCE - dash}`,
        dashoffset: -acc.offset,
        category: s.category,
        amount: s.amount,
        percent: pct(s.amount, total),
      });
      acc.offset += dash;
      return acc;
    },
    { arcs: [], offset: 0 }
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Spending split across ${slices.length} categories, totaling ${formatBDT(total)}`}
        >
          {arcs.map((a) => (
            <circle
              key={a.category}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold text-stone-900 tabular-nums">{formatBDT(total)}</span>
          <span className="text-xs text-stone-500">spent</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {arcs.map((a) => (
          <div key={a.category} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-stone-700 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: a.color }}
                aria-hidden="true"
              />
              <span className="truncate">{a.category}</span>
            </span>
            <span className="text-stone-500 tabular-nums shrink-0">
              {formatBDT(a.amount)} · {Math.round(a.percent)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
