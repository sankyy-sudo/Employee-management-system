import { motion as Motion } from "framer-motion";

export default function Card({ children, className = "", hover = false, ...props }) {
  return (
    <Motion.section
      whileHover={hover ? { y: -3 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`min-w-0 rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...props}
    >
      {children}
    </Motion.section>
  );
}

export function SectionHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
