import { motion as Motion } from "framer-motion";

export default function Page({ eyebrow, title, description, actions, children, className = "" }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className={`mx-auto w-full min-w-0 max-w-7xl ${className}`}
    >
      {(title || description || actions) && (
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{eyebrow}</p>}
            {title && <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">{title}</h1>}
            {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Motion.div>
  );
}
