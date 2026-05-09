import { motion as Motion } from "framer-motion";

export default function DashboardCard({ title, value, detail, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  };

  return (
    <Motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {detail && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{detail}</p>}
    </Motion.div>
  );
}
