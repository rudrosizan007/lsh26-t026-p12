import { useMemo, useState } from "react";
import ReceiptScanner from "./ReceiptScanner";
import Modal from "./Modal";
import Button from "./ui/Button";
import { CATEGORIES } from "../lib/storage";
import { formatBDT, formatDateLong, todayISO } from "../lib/format";

function frequentCategories(expenses, limit = 4) {
  const counts = new Map();
  for (const e of expenses) counts.set(e.category, (counts.get(e.category) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([c]) => c);
}

function recentShops(expenses, limit = 6) {
  const seen = new Set();
  const shops = [];
  for (let i = expenses.length - 1; i >= 0 && shops.length < limit; i -= 1) {
    const shop = (expenses[i].shop || "").trim();
    const key = shop.toLowerCase();
    if (shop && !seen.has(key)) {
      seen.add(key);
      shops.push(shop);
    }
  }
  return shops;
}

function confidenceMeta(tier) {
  if (tier === "high") return { label: "✓ Confident", tone: "text-emerald-600 bg-emerald-50" };
  if (tier === "medium") return { label: "⚠ Check this", tone: "text-amber-600 bg-amber-50" };
  return { label: "! Couldn't read", tone: "text-red-600 bg-red-50" };
}

function findDuplicate(expenses, draft, excludeId) {
  const shop = (draft.shop || "").trim().toLowerCase();
  if (!shop) return null;
  return expenses.find((e) => {
    if (e.id === excludeId) return false;
    if (e.date !== draft.date) return false;
    if ((e.shop || "").trim().toLowerCase() !== shop) return false;
    const tolerance = e.amount * 0.01;
    return Math.abs(e.amount - draft.amount) <= tolerance;
  });
}

function Field({ label, tier, children, hint }) {
  const meta = tier ? confidenceMeta(tier) : null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-stone-600">{label}</label>
        {meta && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.tone}`}>{meta.label}</span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-amber-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow";

export default function ExpenseForm({
  mode,
  initialExpense,
  expenses,
  salary,
  lastUsed,
  onSave,
  onDelete,
}) {
  const [view, setView] = useState(mode === "create" ? "scan-chooser" : "manual");
  const [amount, setAmount] = useState(initialExpense?.amount ?? "");
  const [category, setCategory] = useState(initialExpense?.category ?? lastUsed?.category ?? "Food");
  const [shop, setShop] = useState(initialExpense?.shop ?? lastUsed?.shop ?? "");
  const [date, setDate] = useState(initialExpense?.date ?? todayISO());
  const [isRecurring, setIsRecurring] = useState(initialExpense?.isRecurring ?? false);
  const [ocrTiers, setOcrTiers] = useState(null);
  const [error, setError] = useState("");
  const [pendingDuplicate, setPendingDuplicate] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const quickCategories = useMemo(() => frequentCategories(expenses), [expenses]);
  const shopSuggestions = useMemo(() => recentShops(expenses), [expenses]);

  function handleExtracted(data) {
    setOcrTiers({ amount: data.amount.tier, date: data.date.tier, shop: data.shop.tier });
    // A LOW tier means the field isn't trustworthy enough to show at all —
    // the user must type it themselves rather than see (and maybe miss) a bad guess.
    setAmount(data.amount.tier !== "low" && data.amount.value !== null ? data.amount.value : "");
    setDate(data.date.tier !== "low" && data.date.value !== null ? data.date.value : todayISO());
    setShop(data.shop.tier !== "low" && data.shop.value !== null ? data.shop.value : "");
    setView("manual");
  }

  const amountNum = Number(amount);
  const isLarge = salary > 0 && Number.isFinite(amountNum) && amountNum > salary * 0.3;

  function attemptSave(skipDuplicateCheck) {
    setError("");
    if (amount === "" || !Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter an amount greater than ৳0.");
      return;
    }
    if (!date) {
      setError("Choose a date.");
      return;
    }
    if (date > todayISO()) {
      setError("Date can't be in the future.");
      return;
    }

    const draft = { amount: amountNum, category, shop: shop.trim(), date, isRecurring };

    if (!skipDuplicateCheck) {
      const dup = findDuplicate(expenses, draft, initialExpense?.id);
      if (dup) {
        setPendingDuplicate(dup);
        return;
      }
    }

    onSave(draft);
  }

  if (view === "scan-chooser") {
    return <ReceiptScanner onExtracted={handleExtracted} onManualFallback={() => setView("manual")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {ocrTiers && (
        <p className="text-sm text-stone-500 -mt-1">Review receipt — check before saving.</p>
      )}

      <Field label="Amount" tier={ocrTiers?.amount}>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">৳</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            autoFocus={view === "manual" && !ocrTiers}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={ocrTiers?.amount === "low" ? "Enter amount" : "0"}
            className={`${inputClass} pl-8 text-lg font-semibold`}
          />
        </div>
        {ocrTiers?.amount === "low" && (
          <p className="text-xs text-amber-600 mt-1">
            We couldn't reliably read the amount. Please enter it manually.
          </p>
        )}
      </Field>

      {isLarge && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2.5">
          This expense is unusually large compared with your salary.
        </div>
      )}

      <Field label="Category">
        {quickCategories.length > 0 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto -mx-1 px-1">
            {quickCategories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? "bg-stone-900 text-white border-stone-900"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Shop" tier={ocrTiers?.shop}>
        <input
          type="text"
          list="recent-shops"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="e.g. Chillox"
          className={inputClass}
        />
        <datalist id="recent-shops">
          {shopSuggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {ocrTiers?.shop === "low" && (
          <p className="text-xs text-amber-600 mt-1">Couldn't read this reliably. Enter manually.</p>
        )}
      </Field>

      <Field label="Date" tier={ocrTiers?.date}>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
        {ocrTiers?.date === "low" && (
          <p className="text-xs text-amber-600 mt-1">Couldn't read this reliably. Enter manually.</p>
        )}
      </Field>

      <label className="flex items-center gap-2 text-sm text-stone-600 select-none">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500/30"
        />
        Recurring expense (rent, subscriptions, bills)
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        {mode === "edit" && (
          <Button variant="destructive-ghost" shape="inline" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
        <Button shape="inline" className="flex-1" onClick={() => attemptSave(false)}>
          {ocrTiers ? "Confirm expense" : mode === "edit" ? "Save changes" : "Add expense"}
        </Button>
      </div>

      {pendingDuplicate && (
        <Modal title="Possible duplicate" onClose={() => setPendingDuplicate(null)} z="z-[70]">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-600">This looks like a duplicate of an existing expense.</p>
            <div className="rounded-xl border border-stone-200 p-4">
              <p className="font-medium text-stone-900">{pendingDuplicate.shop || pendingDuplicate.category}</p>
              <p className="text-sm text-stone-500">
                {pendingDuplicate.category} · {formatDateLong(pendingDuplicate.date)}
              </p>
              <p className="text-lg font-semibold text-stone-900 mt-1">{formatBDT(pendingDuplicate.amount)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" shape="inline" className="flex-1" onClick={() => setPendingDuplicate(null)}>
                Cancel
              </Button>
              <Button
                shape="inline"
                className="flex-1"
                onClick={() => {
                  setPendingDuplicate(null);
                  attemptSave(true);
                }}
              >
                Add anyway
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete this expense?" onClose={() => setConfirmDelete(false)} z="z-[70]">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-stone-200 p-4">
              <p className="font-medium text-stone-900">{initialExpense?.shop || initialExpense?.category}</p>
              <p className="text-lg font-semibold text-stone-900 mt-1">{formatBDT(initialExpense?.amount)}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" shape="inline" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" shape="inline" className="flex-1" onClick={() => onDelete(initialExpense.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
