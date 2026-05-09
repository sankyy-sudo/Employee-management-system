import { Inbox } from "lucide-react";

export default function EmptyState({ title = "No records found", description, icon = Inbox, action }) {
  const EmptyIcon = icon;
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
        <EmptyIcon size={20} aria-hidden="true" />
      </div>
      <p className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
