import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";

const initialForm = {
  name: "",
  date: "",
  description: ""
};

export default function Holidays() {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [calendarDays, setCalendarDays] = useState([]);
  const [stats, setStats] = useState(null);

  const loadData = async () => {
    const holidayRequest = api.get("/holidays");

    if (user.role === "employee") {
      const [{ data: holidayData }, { data: summary }] = await Promise.all([
        holidayRequest,
        api.get("/dashboard/employee-summary")
      ]);
      setHolidays(holidayData);
      setCalendarDays(summary.monthlyCalendar || []);
      setStats(summary.stats);
      return;
    }

    const { data } = await holidayRequest;
    setHolidays(data);
    setCalendarDays(buildAdminCalendar(data));
    setStats({
      workingDays: buildAdminCalendar(data).filter((day) => day.isWorkingDay).length,
      holidayCount: data.length
    });
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/holidays", form);
    setForm(initialForm);
    await loadData();
  };

  const handleDelete = async (holidayId) => {
    await api.delete(`/holidays/${holidayId}`);
    await loadData();
  };

  const monthTitle = useMemo(() => {
    const baseDate = calendarDays[0]?.date || new Date();
    return new Date(baseDate).toLocaleString([], { month: "long", year: "numeric" });
  }, [calendarDays]);

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        {user.role !== "employee" && (
          <section className="glass-panel rounded-[30px] p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">National Holidays</p>
            <h1 className="mt-3 text-2xl font-semibold">Add Holiday</h1>
            <p className="mt-2 text-sm text-slate-500">
              Holidays are visible to employees and excluded from leave day deductions.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Holiday Name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
              <label className="block text-sm font-medium text-slate-700">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="mt-1 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                />
              </label>

              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
                Save Holiday
              </button>
            </form>
          </section>
        )}

        <section className="space-y-6">
          <div className="glass-panel rounded-[30px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">National Holiday Calendar</p>
                <h2 className="mt-2 text-2xl font-semibold">Upcoming Holidays</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {holidays.length} listed
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {holidays.map((holiday) => (
                <div key={holiday._id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{holiday.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatDate(holiday.date)}</p>
                      <p className="mt-2 text-sm text-slate-600">{holiday.description || "National holiday"}</p>
                    </div>

                    {user.role !== "employee" && (
                      <button
                        onClick={() => handleDelete(holiday._id)}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {!holidays.length && (
                <div className="rounded-[22px] bg-slate-50/80 p-4 text-sm text-slate-500">
                  No holidays configured yet.
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel rounded-[30px] p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Working Calendar</p>
                <h2 className="mt-2 text-2xl font-semibold">{monthTitle}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge text={`Working days ${stats?.workingDays ?? 0}`} tone="bg-slate-100 text-slate-700" />
                {user.role === "employee" && (
                  <>
                    <Badge text={`Present ${stats?.presentDays ?? 0}`} tone="bg-emerald-50 text-emerald-700" />
                    <Badge text={`Absent ${stats?.absentDays ?? 0}`} tone="bg-amber-50 text-amber-700" />
                    <Badge text={`Leave left ${stats?.totalLeavesLeft ?? 0}`} tone="bg-blue-50 text-blue-700" />
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <div
                  key={day.date}
                  className={`min-h-20 rounded-[18px] border p-2 text-xs ${calendarClassName(day.status)}`}
                >
                  <p className="font-semibold">{new Date(day.date).getDate()}</p>
                  <p className="mt-1 line-clamp-2 text-[11px]">
                    {day.holidayName || humanizeCalendarStatus(day.status)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required
        {...props}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function Badge({ text, tone }) {
  return <span className={`rounded-full px-3 py-1 text-sm ${tone}`}>{text}</span>;
}

function calendarClassName(status) {
  if (status === "holiday") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "leave") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "absent") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "weekend") return "border-slate-200 bg-slate-100 text-slate-500";
  return "border-slate-200 bg-white/70 text-slate-600";
}

function humanizeCalendarStatus(status) {
  if (status === "present") return "Present";
  if (status === "leave") return "Leave";
  if (status === "absent") return "Absent";
  if (status === "weekend") return "Weekend";
  if (status === "holiday") return "Holiday";
  if (status === "working") return "Working";
  return "Upcoming";
}

function buildAdminCalendar(holidays) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const holidayMap = new Map(
    holidays.map((holiday) => [normalizeDate(holiday.date).toISOString(), holiday])
  );
  const days = [];
  const cursor = new Date(monthStart);

  while (cursor <= monthEnd) {
    const day = normalizeDate(cursor);
    const key = day.toISOString();
    const holiday = holidayMap.get(key);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    days.push({
      date: new Date(day),
      holidayName: holiday?.name || "",
      isWorkingDay: !holiday && !weekend,
      status: holiday ? "holiday" : weekend ? "weekend" : "working"
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
