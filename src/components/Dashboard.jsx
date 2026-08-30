import { useState } from "react";
import Modal from "./Modal";
import Button from "./ui/Button";
import SpendingTrendChart from "./charts/SpendingTrendChart";
import DailyBarChart from "./charts/DailyBarChart";
import CategoryDonut from "./charts/CategoryDonut";
import ForecastBar from "./charts/ForecastBar";
import { formatBDT, formatDateShort } from "../lib/format";

const CONFIDENCE_META = {
  good: { label: "Good confidence", desc: "Sufficient spending history" },
  moderate: { label: "Moderate confidence", desc: "Enough recent spending data" },
  early: { label: "Early estimate", desc: "Limited spending history" },
};

function monthProgressLabel(elapsedDays, totalDays, remainingDays) {
  const fraction = elapsedDays / totalDays;
  const stage =
    fraction < 0.34 ? "You're early in the month" : fraction < 0.7 ? "You're about halfway through the month" : "You're near the end of the month";
  if (remainingDays === 0) return "This is the last day of the month";
  return `${stage} · ${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`;
}

function ChangeAmount({ current, previous, change }) {
  if (change === null) {
    return <span className="text-stone-500 text-sm font-medium">New this month</span>;
  }
  const delta = current - previous;
  if (Math.abs(delta) < 1) {
    return <span className="text-stone-500 text-sm">No change</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-sm font-medium tabular-nums ${up ? "text-red-600" : "text-emerald-600"}`}>
      {up ? "↑" : "↓"} {formatBDT(Math.abs(delta))}
      <span className="text-stone-500 font-normal"> ({Math.round(Math.abs(change))}%)</span>
    </span>
  );
}

function ToneIcon({ tone, icon }) {
  const cls =
    tone === "warning"
      ? "text-amber-600 bg-amber-50"
      : tone === "negative"
      ? "text-red-600 bg-red-50"
      : tone === "positive"
      ? "text-emerald-700 bg-emerald-50"
      : "text-stone-600 bg-stone-100";
  return (
    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${cls}`}>
      {icon}
    </span>
  );
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">{children}</p>;
}

function Card({ children, className = "", ...props }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

function SalaryModal({ initial, onSave, onClose }) {
  const [value, setValue] = useState(initial || "");
  const [error, setError] = useState("");
  return (
    <Modal title="Set your monthly salary" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">৳</span>
          <input
            autoFocus
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="50000"
            className="w-full pl-8 pr-4 py-3 rounded-xl border border-stone-200 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          onClick={() => {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) {
              setError("Enter a valid amount.");
              return;
            }
            onSave(n);
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

export default function Dashboard({
  state,
  today,
  monthLabel,
  forecast,
  breakdown,
  top,
  comparison,
  insights,
  trendSeries,
  dailySeries,
  goalCards,
  onSetSalary,
  onOpenAddExpense,
  onLoadDemo,
  onGoToSavings,
}) {
  const [editingSalary, setEditingSalary] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const noExpenses = state.expenses.length === 0;
  const noSalaryYet = state.salary === 0;

  if (noExpenses && noSalaryYet) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-20 px-6 animate-fade-in">
        <h1 className="text-2xl font-semibold text-stone-900">Pennywise</h1>
        <p className="text-stone-600 max-w-sm">Know where your salary is going.</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto">
          <Button variant="secondary" shape="pill" onClick={() => setEditingSalary(true)}>
            Set salary
          </Button>
          <Button variant="accent" shape="pill" onClick={onOpenAddExpense}>
            + Add your first expense
          </Button>
        </div>
        <button onClick={onLoadDemo} className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-700 mt-1">
          Load demo data
        </button>
        {editingSalary && (
          <SalaryModal
            initial={state.salary || ""}
            onClose={() => setEditingSalary(false)}
            onSave={(n) => {
              onSetSalary(n);
              setEditingSalary(false);
            }}
          />
        )}
      </div>
    );
  }

  const overspend = state.salary > 0 && forecast.spentSoFar > state.salary ? forecast.spentSoFar - state.salary : 0;
  const confMeta = CONFIDENCE_META[forecast.confidence];
  const availableTone = forecast.availableNow < 0 ? "text-red-600" : "text-emerald-700";

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <p className="text-stone-500 text-sm">{monthLabel}</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-stone-900">
          {monthProgressLabel(forecast.elapsedDays, forecast.totalDays, forecast.remainingDays)}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial position */}
        <Card className="order-1 flex flex-col gap-5">
          <div>
            <p className="text-stone-500 text-sm mb-1">You have</p>
            <p className={`text-4xl font-semibold tabular-nums ${availableTone}`}>{formatBDT(forecast.availableNow)}</p>
            <p className="text-stone-500 text-sm mt-1">available now</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4 border-t border-stone-100">
            <button onClick={() => setEditingSalary(true)} className="text-left">
              <p className="text-xs text-stone-500 mb-0.5">Salary</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">{formatBDT(state.salary)}</p>
            </button>
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Spent</p>
              <p className={`text-lg font-semibold tabular-nums ${overspend > 0 ? "text-red-600" : "text-stone-900"}`}>
                {formatBDT(forecast.spentSoFar)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Expected at month end</p>
              <p className="text-lg font-semibold text-stone-900 tabular-nums">
                {forecast.hasEnoughData ? formatBDT(forecast.projectedTotalSpend) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 mb-0.5">Expected left</p>
              <p className={`text-xl font-bold tabular-nums ${availableTone}`}>
                {forecast.hasEnoughData ? formatBDT(forecast.projectedLeftover) : "—"}
              </p>
            </div>
          </div>
          {overspend > 0 && (
            <p className="text-sm text-red-600 font-medium">{formatBDT(overspend)} over your salary this month</p>
          )}
        </Card>

        {/* Month-end forecast */}
        <Card className="order-2 flex flex-col gap-3">
          <SectionLabel>Month-end forecast</SectionLabel>
          {!forecast.hasEnoughData ? (
            <div>
              <p className="text-stone-700 font-medium">Your forecast is still forming.</p>
              <p className="text-stone-500 text-sm mt-1">
                Add a few expenses and we'll estimate where you'll finish the month.
              </p>
            </div>
          ) : (
            <>
              <div>
                {forecast.projectedLeftover >= 0 ? (
                  <>
                    <p className="text-stone-500 text-sm">You're on track to spend</p>
                    <p className="text-3xl font-semibold text-stone-900 tabular-nums">
                      {formatBDT(forecast.projectedTotalSpend)}
                    </p>
                    <p className="text-stone-500 text-sm mt-1">
                      by the end of the month, leaving{" "}
                      <span className="text-emerald-700 font-medium">{formatBDT(forecast.projectedLeftover)}</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-stone-500 text-sm">At this pace you may be</p>
                    <p className="text-3xl font-semibold text-red-600 tabular-nums">
                      {formatBDT(Math.abs(forecast.projectedLeftover))} short
                    </p>
                    <p className="text-stone-500 text-sm mt-1">by the end of the month.</p>
                  </>
                )}
              </div>

              <ForecastBar
                spentSoFar={forecast.spentSoFar}
                projectedTotalSpend={forecast.projectedTotalSpend}
                salary={state.salary}
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-stone-500">Based on spending through {formatDateShort(forecast.asOfDate)}</p>
                {confMeta && (
                  <span className="text-xs font-medium text-stone-600 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {confMeta.label}
                  </span>
                )}
              </div>

              {forecast.outlier && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                  This includes a large {formatBDT(forecast.outlier.expense.amount)} expense at{" "}
                  {forecast.outlier.expense.shop || forecast.outlier.expense.category}.
                  <div className="flex justify-between mt-1.5 text-xs">
                    <span>Excluding it, expected left</span>
                    <span className="font-medium">{formatBDT(forecast.outlier.projectedLeftover)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 self-start"
              >
                How we calculated this {showBreakdown ? "⌃" : "⌄"}
              </button>
              {showBreakdown && (
                <div className="text-sm text-stone-600 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Recorded spending</span>
                    <span className="font-medium tabular-nums">{formatBDT(forecast.spentSoFar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected remaining</span>
                    <span className="font-medium tabular-nums">
                      {formatBDT(forecast.forecastRemainingVariable + forecast.remainingExpectedRecurring)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-stone-200">
                    <span>Expected month-end</span>
                    <span className="font-medium tabular-nums">{formatBDT(forecast.projectedTotalSpend)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* What stands out — shown before the trend chart on mobile, after it on desktop */}
        {insights.length > 0 && (
          <div className="order-3 md:order-5">
            <SectionLabel>What stands out</SectionLabel>
            <div className="flex flex-col gap-2">
              {insights.map((ins) => (
                <div key={ins.id} className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                  <ToneIcon tone={ins.tone} icon={ins.icon} />
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{ins.title}</p>
                    <p className="text-stone-600 text-sm mt-0.5">{ins.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spending trend + daily spending */}
        <Card className="order-4 md:order-3 md:col-span-2">
          <SectionLabel>Spending trend</SectionLabel>
          <SpendingTrendChart series={trendSeries} salary={state.salary} />
          <div className="mt-6 pt-5 border-t border-stone-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-3">Daily spending</p>
            <DailyBarChart days={dailySeries} monthStart={forecast.monthStart} />
          </div>
        </Card>

        {/* Categories: composition + ranked bars */}
        <div className="order-5 md:order-4">
          <SectionLabel>Where your money went</SectionLabel>
          <Card>
            {breakdown.rows.length === 0 ? (
              <p className="text-stone-500 text-sm text-center py-4">No spending recorded this month yet.</p>
            ) : (
              <>
                <CategoryDonut rows={breakdown.rows} total={breakdown.total} />
                <div className="flex flex-col gap-3 mt-6 pt-5 border-t border-stone-100">
                  {breakdown.rows.map((row) => (
                    <button key={row.category} onClick={() => setActiveCategory(row.category)} className="text-left group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">
                          {row.category}
                        </span>
                        <span className="text-sm text-stone-500 tabular-nums">
                          {formatBDT(row.amount)} · {Math.round(row.percent)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-stone-800 group-hover:bg-emerald-500 transition-colors"
                          style={{ width: `${(row.amount / breakdown.rows[0].amount) * 100}%` }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Compared with last month */}
        <div className="order-6 md:col-span-2">
          <SectionLabel>Compared with last month</SectionLabel>
          {!comparison.hasHistory ? (
            <p className="text-stone-500 text-sm">Not enough history for comparison yet.</p>
          ) : (
            <Card className="p-0 divide-y divide-stone-100">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-stone-700 font-medium text-sm">Total spending</span>
                <ChangeAmount current={comparison.currentTotal} previous={comparison.prevTotal} change={comparison.totalChange} />
              </div>
              {comparison.categoryChanges
                .filter((c) => c.change !== null && (c.current > 0 || c.previous > 0))
                .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
                .slice(0, 3)
                .map((c) => (
                  <div key={c.category} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-stone-600 text-sm">{c.category}</span>
                    <ChangeAmount current={c.current} previous={c.previous} change={c.change} />
                  </div>
                ))}
            </Card>
          )}
        </div>

        {/* Your goals */}
        {goalCards.length > 0 && (
          <div className="order-7 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Your goals</p>
              <button onClick={onGoToSavings} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                See all →
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goalCards.map((g) => (
                <button
                  key={g.id}
                  onClick={onGoToSavings}
                  className="text-left rounded-2xl border border-stone-200 bg-white p-4 hover:border-stone-300 transition-colors"
                >
                  <p className="font-medium text-stone-900">{g.name}</p>
                  <p className="text-sm text-stone-500 tabular-nums mt-0.5">
                    {formatBDT(g.currentBalance)} / {formatBDT(g.target)}
                  </p>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full ${g.reached ? "bg-emerald-500" : "bg-emerald-400"}`}
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-500 mt-2">{g.completionLabel}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Largest expenses */}
        <div className="order-8 md:col-span-2">
          <SectionLabel>Largest expenses</SectionLabel>
          {top.length === 0 ? (
            <p className="text-stone-500 text-sm">No expenses recorded this month yet.</p>
          ) : (
            <Card className="p-0 divide-y divide-stone-100">
              {top.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{e.shop || e.category}</p>
                    <p className="text-stone-500 text-xs">
                      {e.category} · {formatDateShort(e.date)}
                    </p>
                  </div>
                  <p className="font-semibold text-stone-900 tabular-nums">{formatBDT(e.amount)}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {editingSalary && (
        <SalaryModal
          initial={state.salary || ""}
          onClose={() => setEditingSalary(false)}
          onSave={(n) => {
            onSetSalary(n);
            setEditingSalary(false);
          }}
        />
      )}

      {activeCategory && (
        <Modal title={activeCategory} onClose={() => setActiveCategory(null)}>
          <CategoryDrilldown category={activeCategory} expenses={state.expenses} today={today} comparison={comparison} />
        </Modal>
      )}
    </div>
  );
}

function CategoryDrilldown({ category, expenses, today, comparison }) {
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const items = expenses
    .filter((e) => e.category === category && e.date.startsWith(monthKey))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = items.reduce((a, e) => a + e.amount, 0);
  const match = comparison.hasHistory ? comparison.categoryChanges.find((c) => c.category === category) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-2xl font-semibold text-stone-900">{formatBDT(total)}</p>
        <p className="text-stone-500 text-sm">this month</p>
        {match && match.change !== null && (
          <div className="mt-1 flex items-center gap-1.5">
            <ChangeAmount current={match.current} previous={match.previous} change={match.change} />
            <span className="text-stone-500 text-sm">vs same period last month</span>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100">
        {items.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-stone-900 text-sm">{e.shop || e.category}</p>
              <p className="text-stone-500 text-xs">{formatDateShort(e.date)}</p>
            </div>
            <p className="font-semibold text-stone-900 tabular-nums">{formatBDT(e.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
