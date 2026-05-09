import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-lift dark:border-slate-800 dark:bg-slate-900">
      <CheckCircle2 className="mt-0.5 text-emerald-500" size={18} aria-hidden="true" />
      <p className="flex-1 text-slate-700 dark:text-slate-200">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Dismiss notification">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
