import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  Clock3,
  Download,
  Smile,
  Timer,
  WalletCards
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Layout from "../components/Layout";
import DashboardCard from "../components/ui/DashboardCard";
import DataTable from "../components/ui/DataTable";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { fetchAttendanceDashboard, markAttendance } from "../store/attendanceSlice";
import { applyLeave, fetchLeaveDashboard } from "../store/leaveSlice";
import { fetchMoodAnalytics, submitMood } from "../store/moodSlice";
import { fetchPayrollDashboard } from "../store/payrollSlice";
import { fetchTasks } from "../store/taskSlice";
import { formatDate, formatTime, humanizeTaskStatus } from "../utils/format";

const moodOptions = [
  { mood: "happy", label: "Happy", face: ":)" },
  { mood: "neutral", label: "Neutral", face: ":|" },
  { mood: "stressed", label: "Stressed", face: ":/" },
  { mood: "angry", label: "Angry", face: ":(" }
];

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: ""
  });

  const attendance = useSelector((state) => state.attendance);
  const leave = useSelector((state) => state.leave);
  const payroll = useSelector((state) => state.payroll);
  const tasks = useSelector((state) => state.tasks);
  const mood = useSelector((state) => state.mood);

  useEffect(() => {
    dispatch(fetchAttendanceDashboard());
    dispatch(fetchLeaveDashboard());
    dispatch(fetchPayrollDashboard());
    dispatch(fetchTasks());
    dispatch(fetchMoodAnalytics());
  }, [dispatch]);

  if (["admin", "hr"].includes(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  const todayAttendance = attendance.today;
  const pendingTasks = tasks.items.filter((task) => task.status !== "completed");
  const leaveBalanceTotal = Object.values(leave.balance || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const workingHours = getWorkingHours(todayAttendance);
  const latestPayroll = payroll.latest;
  const loading = attendance.loading || leave.loading || payroll.loading || tasks.loading;
  const error = attendance.error || leave.error || payroll.error || tasks.error || mood.error;

  const payrollChart = payroll.history.slice(0, 6).reverse().map((item) => ({
    label: `${item.month}/${String(item.year).slice(-2)}`,
    salary: item.netSalary || 0
  }));

  const performanceTrend = useMemo(() => [
    { month: "Jan", score: 72 },
    { month: "Feb", score: 76 },
    { month: "Mar", score: 81 },
    { month: "Apr", score: 84 }
  ], []);

  const moodTrend = (mood.analytics?.trend || []).slice().reverse().map((item) => ({
    date: new Date(item.date).toLocaleDateString(undefined, { weekday: "short" }),
    score: item.score
  }));

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    await dispatch(applyLeave(leaveForm)).unwrap();
    setLeaveModalOpen(false);
    setLeaveForm({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Employee Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Good to see you, {user?.name}</h1>
            <p className="mt-2 text-slate-500">Your workday at a glance: attendance, leave, salary, tasks, and wellbeing.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm">
            <p className="font-medium text-slate-950">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <p className="mt-1 text-slate-500">{user?.department || "Team member"}</p>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DashboardCard icon={CalendarCheck} tone={statusTone(todayAttendance?.status)} title="Today's Status" value={todayAttendance?.status || "Not marked"} detail={`In ${formatTime(todayAttendance?.checkIn)}`} />
            <DashboardCard icon={Timer} title="Hours Today" value={workingHours} detail={`Out ${formatTime(todayAttendance?.checkOut)}`} />
            <DashboardCard icon={Clock3} tone="emerald" title="Leave Balance" value={`${leaveBalanceTotal} days`} detail={`CL ${leave.balance.casual ?? 0} / SL ${leave.balance.sick ?? 0}`} />
            <DashboardCard icon={WalletCards} tone="amber" title="Latest Salary" value={latestPayroll ? currency(latestPayroll.netSalary) : "--"} detail={latestPayroll ? `${latestPayroll.month}/${latestPayroll.year}` : "No payslip yet"} />
            <DashboardCard icon={BriefcaseBusiness} tone="rose" title="Pending Tasks" value={String(pendingTasks.length)} detail={`${tasks.items.length} assigned total`} />
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Attendance</h2>
                <p className="mt-1 text-sm text-slate-500">Check in, check out, and track your monthly attendance.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => dispatch(markAttendance("checkin"))} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Check In</button>
                <button onClick={() => dispatch(markAttendance("checkout"))} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Check Out</button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <MiniMetric label="Monthly Present" value={attendance.summary?.stats?.presentDays ?? 0} />
              <MiniMetric label="Checked Out" value={attendance.summary?.stats?.checkedOutDays ?? 0} />
              <MiniMetric label="Monthly Hours" value={attendance.summary?.stats?.totalWorkingHours ?? "--"} />
            </div>
            <div className="mt-5">
              <DataTable rows={attendance.history.slice(0, 5)} columns={[
                { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
                { key: "checkIn", label: "Login", render: (row) => formatTime(row.checkIn) },
                { key: "checkOut", label: "Logout", render: (row) => formatTime(row.checkOut) },
                { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> }
              ]} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Leave</h2>
                <p className="mt-1 text-sm text-slate-500">Balances and recent leave requests.</p>
              </div>
              <button onClick={() => setLeaveModalOpen(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Apply Leave</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <MiniMetric label="Casual" value={leave.balance.casual ?? 0} />
              <MiniMetric label="Sick" value={leave.balance.sick ?? 0} />
              <MiniMetric label="Paid" value={leave.balance.paid ?? 0} />
            </div>
            <div className="mt-5">
              <DataTable rows={leave.history.slice(0, 5)} columns={[
                { key: "leaveType", label: "Type" },
                { key: "startDate", label: "From", render: (row) => formatDate(row.startDate) },
                { key: "days", label: "Days" },
                { key: "status", label: "Status", render: (row) => <StatusPill value={row.status} /> }
              ]} />
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Payroll</h2>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <Download size={16} /> Payslip
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Basic" value={currency(latestPayroll?.basicSalary)} />
              <MiniMetric label="Bonus" value={currency(latestPayroll?.bonus)} />
              <MiniMetric label="Deduction" value={currency(latestPayroll?.deductions)} />
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="salary" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Assigned Tasks</h2>
            <div className="mt-5 space-y-3">
              {tasks.items.slice(0, 5).map((task) => (
                <div key={task._id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">Due {formatDate(task.dueDate)} - {humanizeTaskStatus(task.status)}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill value={task.priority || "medium"} />
                    <StatusPill value={task.status} />
                  </div>
                </div>
              ))}
              {!tasks.items.length && <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No tasks assigned.</p>}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Performance</h2>
            <p className="mt-1 text-sm text-slate-500">KPI score and feedback trend.</p>
            <div className="mt-5">
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-slate-500">Current KPI</span>
                <span className="text-3xl font-semibold text-slate-950">84%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-[84%] rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="mt-5 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrend}>
                  <XAxis dataKey="month" />
                  <Tooltip />
                  <Area dataKey="score" stroke="#10b981" fill="#d1fae5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Mood Check-in</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {moodOptions.map((item) => (
                <button key={item.mood} onClick={() => dispatch(submitMood({ mood: item.mood }))} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                  <span className="text-2xl">{item.face}</span>
                  <span className="mt-2 block text-sm font-semibold text-slate-800">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodTrend}>
                  <XAxis dataKey="date" />
                  <Tooltip />
                  <Area dataKey="score" stroke="#f59e0b" fill="#fef3c7" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Notifications</h2>
            <div className="mt-5 space-y-3">
              <Activity icon={Clock3} title="Attendance reminder" detail="Check out before leaving for the day." />
              <Activity icon={Banknote} title="Payroll update" detail={latestPayroll ? `Payslip generated for ${latestPayroll.month}/${latestPayroll.year}.` : "No latest payroll available."} />
              <Activity icon={Smile} title="Wellbeing" detail={`Burnout risk: ${mood.analytics?.burnoutRisk || "low"}.`} />
            </div>
          </section>
        </div>
      </div>

      <Modal open={leaveModalOpen} title="Apply Leave" onClose={() => setLeaveModalOpen(false)}>
        <form onSubmit={handleLeaveSubmit} className="space-y-4">
          <Select label="Leave Type" value={leaveForm.leaveType} onChange={(event) => setLeaveForm({ ...leaveForm, leaveType: event.target.value })}>
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="paid">Paid Leave</option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start Date" type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} />
            <Input label="End Date" type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} />
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Reason
            <textarea value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Submit Request</button>
        </form>
      </Modal>
    </Layout>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusPill({ value = "" }) {
  const normalized = String(value).toLowerCase();
  const className = normalized.includes("approved") || normalized.includes("completed") || normalized.includes("present")
    ? "bg-emerald-50 text-emerald-700"
    : normalized.includes("pending") || normalized.includes("late") || normalized.includes("high")
      ? "bg-amber-50 text-amber-700"
      : normalized.includes("rejected") || normalized.includes("urgent")
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{value || "N/A"}</span>;
}

function Activity({ icon: Icon, title, detail }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...props} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select {...props} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500">
        {children}
      </select>
    </label>
  );
}

function getWorkingHours(record) {
  if (!record?.checkIn) return "--";
  const end = record.checkOut ? new Date(record.checkOut) : new Date();
  const diff = end - new Date(record.checkIn);
  if (diff <= 0) return "00:00";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function statusTone(status = "") {
  const normalized = status.toLowerCase();
  if (normalized.includes("late")) return "amber";
  if (normalized.includes("absent")) return "rose";
  if (normalized.includes("in") || normalized.includes("present")) return "emerald";
  return "blue";
}

function currency(value) {
  if (!value) return "--";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}
