import { useState } from "react";
import Modal from "./Modal";
import PocketCard from "./PocketCard";
import Button from "./ui/Button";
import { formatBDT } from "../lib/format";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-shadow";

function PocketForm({ initial, monthlyAvailable, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [item, setItem] = useState(initial?.item ?? "");
  const [target, setTarget] = useState(initial?.target ?? "");
  const [currentBalance, setCurrentBalance] = useState(initial?.currentBalance ?? "");
  const [monthlyContribution, setMonthlyContribution] = useState(initial?.monthlyContribution ?? "");
  const [error, setError] = useState("");

  function submit() {
    const targetNum = Number(target);
    const balanceNum = Number(currentBalance) || 0;
    const contribNum = Number(monthlyContribution) || 0;

    if (!name.trim()) {
      setError("Give this pocket a name.");
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      setError("Target amount must be greater than ৳0.");
      return;
    }
    if (balanceNum < 0 || contribNum < 0) {
      setError("Amounts can't be negative.");
      return;
    }

    onSave({
      name: name.trim(),
      item: item.trim(),
      target: targetNum,
      currentBalance: balanceNum,
      monthlyContribution: contribNum,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-stone-600 mb-1.5 block">What are you saving for?</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptop" className={inputClass} autoFocus />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-600 mb-1.5 block">Item details</label>
        <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. MacBook Air" className={inputClass} />
      </div>
      <div>
        <label className="text-sm font-medium text-stone-600 mb-1.5 block">Target amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">৳</span>
          <input
            type="number"
            min="0"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="120000"
            className={`${inputClass} pl-8`}
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-stone-600 mb-1.5 block">Already saved</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">৳</span>
          <input
            type="number"
            min="0"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            placeholder="0"
            className={`${inputClass} pl-8`}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-stone-600">Monthly contribution</label>
          {monthlyAvailable > 0 && (
            <span className="text-xs text-stone-500">
              Available based on forecast: <span className="font-medium text-stone-700">{formatBDT(monthlyAvailable)}</span>
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-medium">৳</span>
          <input
            type="number"
            min="0"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="10000"
            className={`${inputClass} pl-8`}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button variant="secondary" shape="inline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button shape="inline" className="flex-1" onClick={submit}>
          {initial ? "Save changes" : "Create pocket"}
        </Button>
      </div>
    </div>
  );
}

export default function Savings({
  pockets,
  projectionsInfo,
  annualRatePercent,
  onAddPocket,
  onUpdatePocket,
  onDeletePocket,
}) {
  const [creating, setCreating] = useState(false);
  const [editingPocket, setEditingPocket] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const totalPlanned = pockets.reduce((a, p) => a + (p.monthlyContribution || 0), 0);
  const byId = new Map(projectionsInfo.projections.map((p) => [p.pocket.id, p]));

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Savings</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {pockets.length} {pockets.length === 1 ? "pocket" : "pockets"} · {formatBDT(totalPlanned)} planned monthly
          </p>
        </div>
        <Button shape="pill" className="whitespace-nowrap" onClick={() => setCreating(true)}>
          + Create pocket
        </Button>
      </div>

      {projectionsInfo.scaled && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5">
          <p className="text-amber-900 font-medium text-sm">Your savings plan is ahead of your cash flow</p>
          <div className="flex justify-between text-sm text-amber-800 mt-2">
            <span>Planned contributions</span>
            <span className="font-medium">{formatBDT(projectionsInfo.totalRequested)}/month</span>
          </div>
          <div className="flex justify-between text-sm text-amber-800">
            <span>Forecasted surplus</span>
            <span className="font-medium">{formatBDT(projectionsInfo.monthlyAvailable)}/month</span>
          </div>
          <p className="text-xs text-amber-700 mt-2">
            Completion dates below use contributions scaled proportionally to your forecast.
          </p>
        </div>
      )}

      {pockets.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-300">
          <p className="text-stone-900 font-medium mb-1">No savings pockets yet</p>
          <p className="text-stone-500 text-sm mb-4">Create a pocket for something you're saving toward.</p>
          <Button shape="pill" className="mx-auto" onClick={() => setCreating(true)}>
            + Create pocket
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pockets.map((p) => {
            const info = byId.get(p.id);
            return (
              <PocketCard
                key={p.id}
                pocket={p}
                effectiveContribution={info?.effectiveContribution ?? 0}
                isScaled={projectionsInfo.scaled}
                projection={info?.projection ?? { status: "invalid-target" }}
                annualRatePercent={annualRatePercent}
                onUpdateContribution={(id, value) => onUpdatePocket(id, { monthlyContribution: value })}
                onEdit={setEditingPocket}
                onDelete={setDeletingId}
              />
            );
          })}
        </div>
      )}

      {creating && (
        <Modal title="Create a savings pocket" onClose={() => setCreating(false)}>
          <PocketForm
            monthlyAvailable={projectionsInfo.monthlyAvailable}
            onCancel={() => setCreating(false)}
            onSave={(data) => {
              onAddPocket(data);
              setCreating(false);
            }}
          />
        </Modal>
      )}

      {editingPocket && (
        <Modal title="Edit pocket" onClose={() => setEditingPocket(null)}>
          <PocketForm
            initial={editingPocket}
            monthlyAvailable={projectionsInfo.monthlyAvailable}
            onCancel={() => setEditingPocket(null)}
            onSave={(data) => {
              onUpdatePocket(editingPocket.id, data);
              setEditingPocket(null);
            }}
          />
        </Modal>
      )}

      {deletingId && (
        <Modal title="Delete this pocket?" onClose={() => setDeletingId(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-stone-600">This can't be undone.</p>
            <div className="flex gap-3">
              <Button variant="secondary" shape="inline" className="flex-1" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                shape="inline"
                className="flex-1"
                onClick={() => {
                  onDeletePocket(deletingId);
                  setDeletingId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
