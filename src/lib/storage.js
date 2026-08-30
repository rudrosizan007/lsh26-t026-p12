export const STORAGE_KEY = "ledger-state";

export const CATEGORIES = [
  "Rent",
  "Groceries",
  "Utilities",
  "Food",
  "Transport",
  "Education",
  "Health",
  "Mobile",
  "Entertainment",
  "Clothing",
  "Other",
];

export const FIXED_CATEGORIES = new Set(["Rent", "Utilities", "Mobile", "Education"]);

export function isFixedCategory(category, isRecurring) {
  return isRecurring || FIXED_CATEGORIES.has(category);
}

export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyState() {
  return {
    salary: 0,
    expenses: [],
    pockets: [],
    dpsAnnualRatePercent: 8,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      salary: Number.isFinite(parsed.salary) ? parsed.salary : 0,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      pockets: Array.isArray(parsed.pockets) ? parsed.pockets : [],
      dpsAnnualRatePercent: Number.isFinite(parsed.dpsAnnualRatePercent)
        ? parsed.dpsAnnualRatePercent
        : 8,
    };
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — fail silently, app still works in-memory
  }
}

export function addExpense(state, expense) {
  const newExpense = {
    id: makeId(),
    date: expense.date,
    category: expense.category,
    shop: expense.shop || "",
    amount: Number(expense.amount) || 0,
    isRecurring: Boolean(expense.isRecurring),
  };
  return { ...state, expenses: [...state.expenses, newExpense] };
}

export function updateExpense(state, id, updates) {
  return {
    ...state,
    expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
  };
}

export function deleteExpense(state, id) {
  return { ...state, expenses: state.expenses.filter((e) => e.id !== id) };
}

export function addPocket(state, pocket) {
  const newPocket = {
    id: makeId(),
    name: pocket.name,
    item: pocket.item || "",
    target: Number(pocket.target) || 0,
    currentBalance: Number(pocket.currentBalance) || 0,
    monthlyContribution: Number(pocket.monthlyContribution) || 0,
  };
  return { ...state, pockets: [...state.pockets, newPocket] };
}

export function updatePocket(state, id, updates) {
  return {
    ...state,
    pockets: state.pockets.map((p) => (p.id === id ? { ...p, ...updates } : p)),
  };
}

export function deletePocket(state, id) {
  return { ...state, pockets: state.pockets.filter((p) => p.id !== id) };
}
