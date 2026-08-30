import { useEffect } from "react";

export default function Modal({ title, onClose, children, wide = false, z = "z-50" }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 ${z} flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-[2px] p-0 sm:p-4 animate-fade-in`}
      onClick={onClose}
    >
      <div
        className={`w-full ${
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        } max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-xl border border-stone-200 animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-500 hover:text-stone-700 rounded-full p-1.5 hover:bg-stone-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6 pt-3">{children}</div>
      </div>
    </div>
  );
}
