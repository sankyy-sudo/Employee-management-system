import { AnimatePresence, motion as Motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ open, title, description, children, onClose, panelClassName = "" }) {
  const hasCustomPadding = /\bp-\d+\b|\bpx-\d+\b|\bpy-\d+\b/.test(panelClassName);

  return (
    <AnimatePresence>
      {open && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose?.();
          }}
        >
          <Motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lift dark:border-slate-800 dark:bg-slate-900 ${hasCustomPadding ? "" : "p-6"} ${panelClassName}`}
          >
            <div className={`flex items-start justify-between gap-4 ${hasCustomPadding ? "px-6 pt-6" : ""}`}>
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
                {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
