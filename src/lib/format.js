const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatBDT(amount) {
  const safe = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(safe);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}৳${nf.format(Math.abs(rounded))}`;
}

export function formatNumber(amount) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return nf.format(Math.round(safe));
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonthYear(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function pct(part, whole) {
  if (!whole || !Number.isFinite(whole) || whole <= 0) return 0;
  const value = (part / whole) * 100;
  return Number.isFinite(value) ? value : 0;
}

export function safeDiv(a, b) {
  if (!b || !Number.isFinite(b) || b === 0) return 0;
  const value = a / b;
  return Number.isFinite(value) ? value : 0;
}
