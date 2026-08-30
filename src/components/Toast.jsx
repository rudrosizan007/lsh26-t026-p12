export default function Toast({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up rounded-full bg-stone-900 text-white text-sm font-medium px-4 py-2.5 shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
