import { formatBDT, formatDateShort } from "../../lib/format";

/**
 * Spending by day — the one chart that actually shows spikes a monthly
 * total can hide. Horizontally scrollable so a full month fits on a phone
 * without shrinking bars to illegibility.
 */
export default function DailyBarChart({ days, monthStart }) {
  if (days.length === 0) {
    return <p className="text-sm text-stone-500 py-4 text-center">No spending recorded yet.</p>;
  }

  const max = Math.max(...days.map((d) => d.amount), 1);
  const monthPrefix = monthStart.slice(0, 7);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex items-end gap-1.5 h-24 min-w-max pb-1">
        {days.map((d) => {
          const isToday = d.day === days[days.length - 1].day;
          const heightPct = Math.max(4, (d.amount / max) * 100);
          const dateISO = `${monthPrefix}-${String(d.day).padStart(2, "0")}`;
          return (
            <div key={d.day} className="flex flex-col items-center gap-1 w-3.5 shrink-0">
              <div className="h-20 w-full flex items-end">
                <div
                  title={`${formatDateShort(dateISO)}: ${formatBDT(d.amount)}`}
                  className={`w-full rounded-sm transition-colors ${
                    isToday ? "bg-emerald-600" : d.amount > 0 ? "bg-stone-700" : "bg-stone-100"
                  }`}
                  style={{ height: `${d.amount > 0 ? heightPct : 4}%` }}
                />
              </div>
              {(d.day === 1 || d.day % 5 === 0) && (
                <span className="text-[10px] text-stone-400 tabular-nums">{d.day}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
