import { useMemo, useState, useEffect, useRef } from "react";
import Dashboard from "./components/Dashboard";
import ExpenseList from "./components/ExpenseList";
import ExpenseForm from "./components/ExpenseForm";
import Savings from "./components/Savings";
import Modal from "./components/Modal";
import Toast from "./components/Toast";
import Button from "./components/ui/Button";
import SplashScreen from "./components/SplashScreen";
import logo from "./assets/logo.png";
import {
  loadState,
  saveState,
  emptyState,
  addExpense,
  updateExpense,
  deleteExpense,
  addPocket,
  updatePocket,
  deletePocket,
} from "./lib/storage";
import {
  calculateForecast,
  categoryBreakdown,
  topExpenses,
  monthComparison,
  detectRecurringKeys,
  dailySpending,
  cumulativeSeries,
} from "./lib/forecast";
import { generateInsights } from "./lib/insights";
import { projectAllPockets } from "./lib/dps";
import { buildDemoState } from "./lib/demoData";
import { formatMonthYear, pct } from "./lib/format";

const TABS = [
  { key: "dashboard", label: "Home" },
  { key: "expenses", label: "Expenses" },
  { key: "savings", label: "Savings" },
];

function goalCompletionLabel(pocket, info) {
  const reached = pocket.currentBalance >= pocket.target && pocket.target > 0;
  if (reached) return "Target reached";
  const status = info?.projection?.status;
  if (status === "ok") return `Expected by ${formatMonthYear(info.projection.completionDate)}`;
  if (status === "no-contribution") return "Set a monthly contribution to see a date";
  if (status === "no-surplus") return "Forecast has no surplus yet";
  if (status === "too-long") return "Over 50 years — increase your contribution";
  return "Set a target to see a date";
}

let toastCounter = 0;
const SPLASH_SEEN_KEY = "pennywise-splash-seen";

function hasSeenSplash() {
  try {
    return Boolean(localStorage.getItem(SPLASH_SEEN_KEY));
  } catch {
    return true;
  }
}

export default function App() {
  const [state, setState] = useState(() => loadState() || emptyState());
  const [tab, setTab] = useState("dashboard");
  const [expenseModal, setExpenseModal] = useState(null); // { mode: 'create' | 'edit', expense? }
  const [toasts, setToasts] = useState([]);
  const [showSplash, setShowSplash] = useState(() => !hasSeenSplash());
  const today = useMemo(() => new Date(), []);
  const timers = useRef([]);

  function dismissSplash() {
    try {
      localStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // localStorage unavailable — just skip persisting; splash will show again next visit
    }
    setShowSplash(false);
  }

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function showToast(message) {
    const id = ++toastCounter;
    setToasts((t) => [...t, { id, message }]);
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
    timers.current.push(timer);
  }

  const forecast = useMemo(
    () => calculateForecast(state.expenses, state.salary, today),
    [state.expenses, state.salary, today]
  );
  const breakdown = useMemo(() => categoryBreakdown(state.expenses, today), [state.expenses, today]);
  const top = useMemo(() => topExpenses(state.expenses, today), [state.expenses, today]);
  const comparison = useMemo(() => monthComparison(state.expenses, today), [state.expenses, today]);
  const recurringKeys = useMemo(
    () => detectRecurringKeys(state.expenses, today),
    [state.expenses, today]
  );
  const projectionsInfo = useMemo(
    () => projectAllPockets(state.pockets, forecast.projectedLeftover, state.dpsAnnualRatePercent, today),
    [state.pockets, forecast.projectedLeftover, state.dpsAnnualRatePercent, today]
  );
  const insights = useMemo(
    () =>
      generateInsights({
        forecast,
        breakdown,
        comparison,
        top,
        pocketSummary: {
          totalRequested: projectionsInfo.totalRequested,
          scaled: projectionsInfo.scaled,
          monthlyAvailable: projectionsInfo.monthlyAvailable,
        },
      }),
    [forecast, breakdown, comparison, top, projectionsInfo]
  );

  const dailySeries = useMemo(() => dailySpending(state.expenses, today), [state.expenses, today]);
  const trendSeries = useMemo(
    () => cumulativeSeries(state.expenses, today, forecast),
    [state.expenses, today, forecast]
  );

  const goalCards = useMemo(
    () =>
      state.pockets.slice(0, 3).map((p) => {
        const info = projectionsInfo.projections.find((x) => x.pocket.id === p.id);
        return {
          id: p.id,
          name: p.name,
          currentBalance: p.currentBalance,
          target: p.target,
          progress: Math.min(100, pct(p.currentBalance, p.target)),
          reached: p.currentBalance >= p.target && p.target > 0,
          completionLabel: goalCompletionLabel(p, info),
        };
      }),
    [state.pockets, projectionsInfo]
  );

  const monthLabel = formatMonthYear(today);
  const lastUsed = state.expenses.length
    ? { category: state.expenses[state.expenses.length - 1].category, shop: "" }
    : null;

  function handleSetSalary(n) {
    setState((s) => ({ ...s, salary: n }));
    showToast("Salary updated");
  }

  function handleSaveExpense(draft) {
    if (expenseModal?.mode === "edit") {
      setState((s) => updateExpense(s, expenseModal.expense.id, draft));
      showToast("Expense updated");
    } else {
      setState((s) => addExpense(s, draft));
      showToast("Expense added");
    }
    setExpenseModal(null);
  }

  function handleDeleteExpense(id) {
    setState((s) => deleteExpense(s, id));
    setExpenseModal(null);
    showToast("Expense deleted");
  }

  function handleLoadDemo() {
    setState(buildDemoState());
    showToast("Demo data loaded");
  }

  function handleAddPocket(data) {
    setState((s) => addPocket(s, data));
    showToast("Pocket created");
  }

  function handleUpdatePocket(id, updates) {
    setState((s) => updatePocket(s, id, updates));
  }

  function handleDeletePocket(id) {
    setState((s) => deletePocket(s, id));
    showToast("Pocket deleted");
  }

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <header className="sticky top-0 z-30 bg-[#fafaf9]/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold text-stone-900">
            <img src={logo} alt="" className="h-7 w-7" />
            Pennywise
          </span>
          <nav className="hidden sm:flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  tab === t.key ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <Button
            variant="accent"
            shape="pill"
            className="hidden sm:inline-flex"
            onClick={() => setExpenseModal({ mode: "create" })}
          >
            + Add expense
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {tab === "dashboard" && (
          <Dashboard
            state={state}
            today={today}
            monthLabel={monthLabel}
            forecast={forecast}
            breakdown={breakdown}
            top={top}
            comparison={comparison}
            insights={insights}
            trendSeries={trendSeries}
            dailySeries={dailySeries}
            goalCards={goalCards}
            onSetSalary={handleSetSalary}
            onOpenAddExpense={() => setExpenseModal({ mode: "create" })}
            onLoadDemo={handleLoadDemo}
            onGoToSavings={() => setTab("savings")}
          />
        )}

        {tab === "expenses" && (
          <div className="flex flex-col gap-6 pb-24">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-stone-900">Expenses</h1>
              {state.expenses.length > 0 && (
                <button
                  onClick={handleLoadDemo}
                  className="hidden sm:block text-sm text-stone-500 hover:text-stone-700"
                >
                  Reload demo data
                </button>
              )}
            </div>
            <ExpenseList
              expenses={state.expenses}
              onEdit={(expense) => setExpenseModal({ mode: "edit", expense })}
              recurringKeys={recurringKeys}
            />
            {state.expenses.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-stone-900 font-medium">No expenses yet</p>
                <p className="text-stone-500 text-sm max-w-xs">
                  Add your first expense and we'll start showing where your money goes.
                </p>
                <Button variant="accent" shape="pill" onClick={() => setExpenseModal({ mode: "create" })}>
                  + Add expense
                </Button>
                <button onClick={handleLoadDemo} className="text-sm text-stone-500 underline underline-offset-2 hover:text-stone-700">
                  Load demo data
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "savings" && (
          <Savings
            pockets={state.pockets}
            projectionsInfo={projectionsInfo}
            annualRatePercent={state.dpsAnnualRatePercent}
            onAddPocket={handleAddPocket}
            onUpdatePocket={handleUpdatePocket}
            onDeletePocket={handleDeletePocket}
          />
        )}
      </main>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-stone-200 flex items-stretch justify-around h-16"
        aria-label="Primary"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium min-h-[44px] transition-colors ${
              tab === t.key ? "text-emerald-700" : "text-stone-500"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tab === t.key ? "bg-emerald-600" : "bg-transparent"}`} />
            {t.label}
          </button>
        ))}
      </nav>

      <button
        onClick={() => setExpenseModal({ mode: "create" })}
        aria-label="Add expense"
        className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-emerald-600 text-white text-2xl font-light shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        +
      </button>

      {expenseModal && (
        <Modal title={expenseModal.mode === "edit" ? "Edit expense" : "Add expense"} onClose={() => setExpenseModal(null)}>
          <ExpenseForm
            mode={expenseModal.mode}
            initialExpense={expenseModal.expense}
            expenses={state.expenses}
            salary={state.salary}
            lastUsed={lastUsed}
            onSave={handleSaveExpense}
            onDelete={handleDeleteExpense}
          />
        </Modal>
      )}

      <Toast toasts={toasts} />

      {showSplash && <SplashScreen onDone={dismissSplash} />}
    </div>
  );
}
