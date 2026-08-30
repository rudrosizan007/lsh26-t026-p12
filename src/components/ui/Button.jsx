const VARIANT_CLASSES = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300",
  accent: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
  secondary:
    "border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:text-stone-300 disabled:border-stone-200",
  destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  "destructive-ghost": "border border-red-200 text-red-600 hover:bg-red-50",
  ghost: "text-stone-600 hover:bg-stone-100",
};

const SHAPE_CLASSES = {
  block: "rounded-xl py-3 px-4 w-full",
  inline: "rounded-xl px-4 py-3",
  pill: "rounded-full px-4 py-2.5 text-sm",
};

/**
 * Single source of button styling so "primary action" always looks the same
 * everywhere (Nielsen heuristic 4: consistency and standards).
 */
export default function Button({ variant = "primary", shape = "block", className = "", children, ...props }) {
  const base =
    "font-medium transition-colors inline-flex items-center justify-center gap-2 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 " +
    "disabled:cursor-not-allowed min-h-[44px]";
  return (
    <button
      className={`${base} ${SHAPE_CLASSES[shape]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
