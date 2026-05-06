export default function DashboardCard({ title, value, detail, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
      {detail && <p className="mt-3 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}
