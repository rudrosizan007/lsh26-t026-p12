import { formatBDT, formatDateLong, todayISO } from "../lib/format";

function dayLabel(dateStr) {
  const todayStr = todayISO();
  const t = new Date(todayStr + "T00:00:00");
  const yest = new Date(t);
  yest.setDate(yest.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(
    yest.getDate()
  ).padStart(2, "0")}`;

  if (dateStr === todayStr) return "Today";
  if (dateStr === yestStr) return "Yesterday";
  return formatDateLong(dateStr);
}

export default function ExpenseList({ expenses, onEdit, recurringKeys }) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <p className="text-stone-900 font-medium mb-1">No expenses yet</p>
        <p className="text-stone-500 text-sm">Add your first expense to see where your money is going.</p>
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const groups = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) {
      last.items.push(e);
    } else {
      groups.push({ date: e.date, items: [e] });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.date}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2 px-1">
            {dayLabel(group.date)}
          </h3>
          <div className="rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden bg-white">
            {group.items.map((e) => (
              <button
                key={e.id}
                onClick={() => onEdit(e)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-900">{e.shop || e.category}</p>
                    {(e.isRecurring || recurringKeys?.has(e.id)) && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">{e.category}</p>
                </div>
                <p className="font-semibold text-stone-900">{formatBDT(e.amount)}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
