import { useState } from "react";
import { formatBDT, formatMonthYear, pct } from "../lib/format";

function CompletionMessage({ projection }) {
  switch (projection.status) {
    case "reached":
      return <p className="text-emerald-700 font-semibold">Target reached</p>;
    case "invalid-target":
      return <p className="text-stone-500 text-sm">Set a target amount to see a completion date.</p>;
    case "no-contribution":
      return <p className="text-stone-500 text-sm">Set a monthly contribution to see a completion date.</p>;
    case "no-surplus":
      return (
        <p className="text-amber-700 text-sm">
          Your current forecast doesn't leave money for new savings. Completion date unavailable until
          the forecast has a positive surplus.
        </p>
      );
    case "too-long":
      return <p className="text-amber-700 text-sm">Over 50 years. Increase your contribution.</p>;
    case "ok":
      return <p className="text-2xl font-semibold text-stone-900">{formatMonthYear(projection.completionDate)}</p>;
    default:
      return null;
  }
}

export default function PocketCard({
  pocket,
  effectiveContribution,
  isScaled,
  projection,
  annualRatePercent,
  onUpdateContribution,
  onEdit,
  onDelete,
}) {
  const [showHow, setShowHow] = useState(false);
  const progress = Math.min(100, pct(pocket.currentBalance, pocket.target));
  const reached = pocket.currentBalance >= pocket.target && pocket.target > 0;

  function nudge(delta) {
    const next = Math.max(0, pocket.monthlyContribution + delta);
    onUpdateContribution(pocket.id, next);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">{pocket.name}</h3>
          {pocket.item && <p className="text-sm text-stone-500">{pocket.item}</p>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(pocket)}
            aria-label="Edit pocket"
            className="text-stone-500 hover:text-stone-700 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(pocket.id)}
            aria-label="Delete pocket"
            className="text-stone-500 hover:text-red-600 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-semibold text-stone-900">{formatBDT(pocket.currentBalance)}</span>
          <span className="text-stone-500 text-sm">/ {formatBDT(pocket.target)}</span>
        </div>
        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${reached ? "bg-emerald-500" : "bg-emerald-400"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-sm text-stone-500 mb-2">Monthly contribution</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nudge(-500)}
            className="h-9 w-9 shrink-0 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center justify-center text-base transition-colors"
            aria-label="Decrease contribution"
          >
            −
          </button>
          <span className="font-medium text-stone-900 flex-1 text-center tabular-nums truncate">
            {formatBDT(pocket.monthlyContribution)}
          </span>
          <button
            onClick={() => nudge(500)}
            className="h-9 w-9 shrink-0 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 flex items-center justify-center text-base transition-colors"
            aria-label="Increase contribution"
          >
            +
          </button>
        </div>
      </div>

      {isScaled && projection.status === "ok" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Scaled to {formatBDT(effectiveContribution)}/month based on your forecasted surplus.
        </p>
      )}

      <div className="border-t border-stone-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">Expected by</p>
        <CompletionMessage projection={projection} />
      </div>

      {projection.status === "ok" && (
        <div className="border-t border-stone-100 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-500">DPS projection · {annualRatePercent}% annual rate</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-sm text-stone-500">Estimated interest</span>
            <span className="font-semibold text-emerald-700">{formatBDT(projection.interestEarned)}</span>
          </div>
          <button
            onClick={() => setShowHow((v) => !v)}
            className="text-xs text-stone-500 hover:text-stone-700 mt-2 flex items-center gap-1"
          >
            How this works {showHow ? "⌃" : "⌄"}
          </button>
          {showHow && (
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              Each month your contribution is added first. Interest is then calculated on the new
              balance at {annualRatePercent}% annually (divided by 12) and added to the pocket. Interest
              compounds because it stays in the balance.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
