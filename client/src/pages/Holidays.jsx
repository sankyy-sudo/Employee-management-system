import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Page from "../components/ui/Page";
import { Input, Textarea } from "../components/ui/Form";

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
    const calendar = buildAdminCalendar(data);
    setCalendarDays(calendar);
    setStats({
      workingDays: calendar.filter((day) => day.isWorkingDay).length,
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

  const isManager = user.role !== "employee";

  return (
    <Layout>
      <Page eyebrow="Holiday Calendar" title="National Holidays" description="Manage holiday policy, working days, and employee-visible calendar context.">
        <div className={`grid gap-6 ${isManager ? "xl:grid-cols-[0.82fr_1.18fr]" : ""}`}>
          {isManager && (
            <Card className="p-6">
              <SectionHeader title="Add Holiday" description="Holidays are visible to employees and excluded from leave day deductions." />
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Input label="Holiday Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <Input label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                <Textarea label="Description" required={false} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <Button type="submit" variant="secondary" className="w-full">Save Holiday</Button>
              </form>
            </Card>
          )}

          <section className="space-y-6">
            <Card className="p-6">
              <SectionHeader title="Upcoming Holidays" actions={<Badge tone="blue">{holidays.length} listed</Badge>} />
              <div className="mt-5 space-y-3">
                {holidays.map((holiday) => (
                  <div key={holiday._id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          <CalendarDays size={18} />
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{holiday.name}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(holiday.date)}</p>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{holiday.description || "National holiday"}</p>
                        </div>
                      </div>

                      {isManager && <Button onClick={() => handleDelete(holiday._id)} variant="danger" size="sm">Delete</Button>}
                    </div>
                  </div>
                ))}

                {!holidays.length && <EmptyState title="No holidays configured yet" />}
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeader
                eyebrow="Working Calendar"
                title={monthTitle}
                actions={<CalendarStats stats={stats} employee={user.role === "employee"} />}
              />

              <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day) => (
                  <div key={day.date} className={`min-h-20 rounded-2xl border p-2 text-xs ${calendarClassName(day.status)}`}>
                    <p className="font-semibold">{new Date(day.date).getDate()}</p>
                    <p className="mt-1 line-clamp-2 text-[11px]">{day.holidayName || humanizeCalendarStatus(day.status)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </Page>
    </Layout>
  );
}

function CalendarStats({ stats, employee }) {
  return (
    <>
      <Badge>Working days {stats?.workingDays ?? 0}</Badge>
      {employee && (
        <>
          <Badge tone="emerald">Present {stats?.presentDays ?? 0}</Badge>
          <Badge tone="amber">Absent {stats?.absentDays ?? 0}</Badge>
          <Badge tone="blue">Leave left {stats?.totalLeavesLeft ?? 0}</Badge>
        </>
      )}
    </>
  );
}

function calendarClassName(status) {
  if (status === "holiday") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300";
  if (status === "present") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (status === "leave") return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
  if (status === "absent") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  if (status === "weekend") return "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400";
  return "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
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
  const holidayMap = new Map(holidays.map((holiday) => [normalizeDate(holiday.date).toISOString(), holiday]));
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
