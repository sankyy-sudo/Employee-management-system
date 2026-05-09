import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion as Motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Coffee,
  Download,
  FileUp,
  Flame,
  ListChecks,
  MessageSquare,
  Plane,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Video,
  WalletCards,
} from "lucide-react";
import Layout from "../components/Layout";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { fetchAttendanceDashboard, markAttendance } from "../store/attendanceSlice";
import { applyLeave, fetchLeaveDashboard } from "../store/leaveSlice";
import { fetchMoodAnalytics, submitMood } from "../store/moodSlice";
import { fetchNotifications } from "../store/notificationSlice";
import { fetchPayrollDashboard } from "../store/payrollSlice";
import { fetchTasks } from "../store/taskSlice";
import { formatDate, formatTime, humanizeTaskStatus } from "../utils/format";
import { statusTone as badgeTone } from "../utils/statusTone";

const pageMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.24, ease: "easeOut" } }
};

const moodOptions = [
  { mood: "happy", label: "Focused", face: "01" },
  { mood: "neutral", label: "Steady", face: "02" },
  { mood: "stressed", label: "Loaded", face: "03" },
  { mood: "angry", label: "Blocked", face: "04" }
];

const chartGrid = "rgba(148, 163, 184, 0.18)";
const chartAxis = "#64748B";

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [summary, setSummary] = useState(null);
  const [localLoading, setLocalLoading] = useState(true);
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
  const notifications = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchAttendanceDashboard());
    dispatch(fetchLeaveDashboard());
    dispatch(fetchPayrollDashboard());
    dispatch(fetchTasks());
    dispatch(fetchMoodAnalytics());
    dispatch(fetchNotifications());

    const loadWorkspaceData = async () => {
      setLocalLoading(true);
      try {
        const [meetingsRes, holidaysRes, summaryRes] = await Promise.allSettled([
          api.get("/meetings"),
          api.get("/holidays"),
          api.get("/dashboard/employee-summary")
        ]);

        if (meetingsRes.status === "fulfilled") setMeetings(meetingsRes.value.data || []);
        if (holidaysRes.status === "fulfilled") setHolidays(holidaysRes.value.data || []);
        if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data || null);
      } finally {
        setLocalLoading(false);
      }
    };

    loadWorkspaceData();
  }, [dispatch]);

  const todayAttendance = attendance.today;
  const pendingTasks = tasks.items.filter((task) => task.status !== "completed");
  const completedTasks = tasks.items.filter((task) => task.status === "completed");
  const urgentTasks = pendingTasks.filter((task) => priorityTone(task.priority) === "rose");
  const leaveBalanceTotal = Object.values(leave.balance || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const workingHours = getWorkingHours(todayAttendance);
  const attendancePercent = getAttendancePercent(attendance.summary?.stats, summary?.stats);
  const latestPayroll = payroll.latest;
  const loading = attendance.loading || leave.loading || payroll.loading || tasks.loading || notifications.loading || localLoading;
  const error = attendance.error || leave.error || payroll.error || tasks.error || notifications.error || mood.error;
  const meetingsToday = meetings.filter((meeting) => isToday(meeting.scheduledFor));
  const upcomingMeetings = meetings.filter((meeting) => new Date(meeting.scheduledFor) >= startOfToday()).slice(0, 5);
  const upcomingHolidays = holidays.filter((holiday) => new Date(holiday.date) >= startOfToday()).slice(0, 4);
  const attendanceTrend = buildAttendanceTrend(attendance.history);
  const heatmapDays = buildHeatmap(attendance.history, summary?.monthlyCalendar);
  const workHourTrend = buildWorkHourTrend(attendance.history);
  const productivityData = buildProductivityData(tasks.items, mood.analytics?.trend);
  const payrollChart = payroll.history.slice(0, 6).reverse().map((item) => ({
    label: `${item.month}/${String(item.year).slice(-2)}`,
    salary: item.netSalary || 0
  }));
  const leaveBreakdown = [
    { name: "Casual", value: Number(leave.balance.casual || 0), color: "#2563EB" },
    { name: "Sick", value: Number(leave.balance.sick || 0), color: "#10B981" },
    { name: "Paid", value: Number(leave.balance.paid || 0), color: "#F59E0B" }
  ];
  const performanceScore = Math.min(96, Math.max(62, 78 + completedTasks.length * 2 - urgentTasks.length * 3));
  const firstName = (user?.name || "there").split(" ")[0];

  if (["admin", "hr"].includes(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  const handleLeaveSubmit = async (event) => {
    event.preventDefault();
    await dispatch(applyLeave(leaveForm)).unwrap();
    setLeaveModalOpen(false);
    setLeaveForm({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  };

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1600px] space-y-6">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        <Motion.section variants={itemMotion} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-0 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">Employee workspace</Badge>
                <Badge tone={todayAttendance?.checkIn && !todayAttendance?.checkOut ? "emerald" : "slate"}>
                  {todayAttendance?.checkIn && !todayAttendance?.checkOut ? "Clocked in" : "Ready to start"}
                </Badge>
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{dayGreeting()}, {firstName}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Run the day from one focused workspace.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  You have {pendingTasks.length} open tasks, {meetingsToday.length} meeting{meetingsToday.length === 1 ? "" : "s"} today, and {leaveBalanceTotal} leave days available.
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <QuickAction icon={Plane} label="Apply Leave" onClick={() => setLeaveModalOpen(true)} />
                <QuickAction icon={CalendarCheck} label="Mark Attendance" onClick={() => dispatch(markAttendance(todayAttendance?.checkIn && !todayAttendance?.checkOut ? "checkout" : "checkin"))} />
                <QuickAction icon={Video} label="Join Meeting" to={upcomingMeetings[0]?.meetingLink || "/meetings"} external={Boolean(upcomingMeetings[0]?.meetingLink)} />
                <QuickAction icon={FileUp} label="Upload Document" to="/documents" />
                <QuickAction icon={WalletCards} label="View Payroll" to="/payroll" />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-7 xl:border-l xl:border-t-0">
              <SectionLabel icon={Radio} title="Today's Operating Brief" />
              <div className="mt-5 space-y-3">
                <BriefRow label="Status" value={todayAttendance?.status || "Not marked"} tone={statusTone(todayAttendance?.status)} />
                <BriefRow label="Work hours" value={workingHours} tone="blue" />
                <BriefRow label="Next meeting" value={upcomingMeetings[0] ? formatTime(upcomingMeetings[0].scheduledFor) : "No meeting"} tone="emerald" />
                <BriefRow label="Focus load" value={`${urgentTasks.length} urgent`} tone={urgentTasks.length ? "rose" : "slate"} />
              </div>
            </div>
          </div>
        </Motion.section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={CalendarCheck} title="Attendance" value={`${attendancePercent}%`} detail="Month health" trend="+4.2%" tone="blue" />
            <KpiCard icon={Clock3} title="Leave Balance" value={`${leaveBalanceTotal}d`} detail={`CL ${leave.balance.casual ?? 0} / SL ${leave.balance.sick ?? 0}`} trend="Available" tone="emerald" />
            <KpiCard icon={BriefcaseBusiness} title="Tasks Pending" value={pendingTasks.length} detail={`${completedTasks.length} completed`} trend={urgentTasks.length ? `${urgentTasks.length} urgent` : "On track"} tone={urgentTasks.length ? "rose" : "blue"} />
            <KpiCard icon={CalendarClock} title="Meetings Today" value={meetingsToday.length} detail={upcomingMeetings[0]?.title || "No next sync"} trend="Live" tone="amber" />
            <KpiCard icon={Sparkles} title="Performance" value={`${performanceScore}%`} detail="Composite score" trend="+6 pts" tone="emerald" />
            <KpiCard icon={Timer} title="Work Hours" value={workingHours} detail={`Break ${estimateBreakTime(todayAttendance)}`} trend="Today" tone="slate" />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Workflow"
              title="Work Queue"
              description="Tasks, meetings, approvals, deadlines, team activity, and notifications in one scan-friendly board."
              actions={<Button as="link" variant="outline" size="sm" icon={ArrowRight} onClick={() => {}}>Open Workspace</Button>}
            />

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <WorkflowColumn title="Today" icon={ListChecks} count={pendingTasks.length}>
                {pendingTasks.slice(0, 4).map((task) => <TaskCard key={task._id} task={task} />)}
                {!pendingTasks.length && <EmptyState icon={CheckCircle2} title="No tasks pending" description="Your queue is clear. New work will appear here." />}
              </WorkflowColumn>

              <WorkflowColumn title="Meetings" icon={Video} count={upcomingMeetings.length}>
                {upcomingMeetings.slice(0, 4).map((meeting) => <MeetingCard key={meeting._id} meeting={meeting} />)}
                {!upcomingMeetings.length && <EmptyState icon={CalendarClock} title="No meetings" description="Scheduled syncs and calls will show up here." />}
              </WorkflowColumn>

              <WorkflowColumn title="Approvals" icon={ShieldCheck} count={leave.history.filter((item) => item.status === "pending").length}>
                {leave.history.filter((item) => item.status === "pending").slice(0, 4).map((item) => <ApprovalCard key={item._id} item={item} />)}
                {!leave.history.filter((item) => item.status === "pending").length && <EmptyState icon={ShieldCheck} title="No pending approvals" description="Leave requests awaiting review will appear here." />}
              </WorkflowColumn>
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-5 sm:p-6">
              <SectionHeader eyebrow="Pulse" title="Team Activity" />
              <div className="mt-5 space-y-4">
                <TimelineItem icon={Flame} title="Task momentum" detail={`${completedTasks.length} tasks completed this cycle`} time="This month" tone="emerald" />
                <TimelineItem icon={Coffee} title="Break balance" detail={`Estimated break time ${estimateBreakTime(todayAttendance)}`} time="Today" tone="amber" />
                <TimelineItem icon={MessageSquare} title="Wellbeing signal" detail={`Burnout risk: ${mood.analytics?.burnoutRisk || "low"}`} time="Latest" tone="blue" />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <SectionHeader eyebrow="Inbox" title="Notifications" actions={<Badge tone="blue">{notifications.items.length}</Badge>} />
              <div className="mt-5 space-y-3">
                {notifications.items.slice(0, 4).map((item) => <NotificationCard key={item._id || item.title} item={item} />)}
                {!notifications.items.length && (
                  <>
                    <NotificationCard item={{ title: "Attendance reminder", message: "Check out before leaving for the day." }} />
                    <NotificationCard item={{ title: "Payroll update", message: latestPayroll ? `Payslip generated for ${latestPayroll.month}/${latestPayroll.year}.` : "No latest payroll available." }} />
                  </>
                )}
              </div>
            </Card>
          </div>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5 sm:p-6">
            <SectionHeader
              eyebrow="Attendance"
              title="Live Workday"
              description="Clock status, work hours, attendance heatmap, and trend visibility."
              actions={<><Button onClick={() => dispatch(markAttendance("checkin"))} size="sm">Check In</Button><Button onClick={() => dispatch(markAttendance("checkout"))} variant="secondary" size="sm">Check Out</Button></>}
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white"><Timer size={20} /></span>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current session</p>
                    <p className="text-2xl font-bold text-slate-950 dark:text-white">{workingHours}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <ProgressMetric label="Attendance" value={attendancePercent} />
                  <ProgressMetric label="Workday" value={Math.min(100, toHourNumber(workingHours) / 8 * 100)} />
                  <ProgressMetric label="Break health" value={74} />
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3} fill="url(#attendanceFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6">
              <SectionLabel icon={CalendarCheck} title="Monthly Heatmap" />
              <div className="mt-3 grid grid-cols-7 gap-2">
                {heatmapDays.map((day) => <HeatmapDay key={day.date} day={day} />)}
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader eyebrow="Leave" title="Leave Command Center" description="Balances, history, approval badges, calendar context, and holidays." actions={<Button onClick={() => setLeaveModalOpen(true)} variant="outline" size="sm" icon={Plus}>Apply</Button>} />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <LeaveBalance label="Casual" value={leave.balance.casual ?? 0} tone="blue" />
              <LeaveBalance label="Sick" value={leave.balance.sick ?? 0} tone="emerald" />
              <LeaveBalance label="Paid" value={leave.balance.paid ?? 0} tone="amber" />
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-3">
                {leave.history.slice(0, 5).map((item) => <LeaveTimeline key={item._id} item={item} />)}
                {!leave.history.length && <EmptyState icon={Plane} title="No leave requests" description="Submitted leave requests will appear as a timeline." action={<Button onClick={() => setLeaveModalOpen(true)} size="sm">Apply Leave</Button>} />}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-semibold text-slate-950 dark:text-white">Upcoming holidays</p>
                <div className="mt-4 space-y-3">
                  {upcomingHolidays.map((holiday) => (
                    <div key={holiday._id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{holiday.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(holiday.date)}</p>
                      </div>
                      <Badge tone="blue">Holiday</Badge>
                    </div>
                  ))}
                  {!upcomingHolidays.length && <EmptyState icon={CalendarCheck} title="No holidays listed" />}
                </div>
              </div>
            </div>
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-3">
          <AnalyticsCard title="Productivity Analytics" description="Tasks completed, mood score, and focus trend.">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="focus" stroke="#2563EB" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="mood" stroke="#10B981" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Work Hour Trends" description="Daily work-hour consistency across recent records.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workHourTrend}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="hours" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Leave Analytics" description="Balance distribution and request pattern.">
            <div className="grid h-full grid-cols-[0.85fr_1.15fr] items-center gap-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leaveBreakdown} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={4}>
                    {leaveBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {leaveBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span>
                    <span className="font-semibold text-slate-950 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCard>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
          <Card className="p-5 sm:p-6">
            <SectionHeader eyebrow="Compensation" title="Payroll Snapshot" actions={<Button variant="outline" size="sm" icon={Download}>Payslip</Button>} />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MiniMetric label="Basic" value={currency(latestPayroll?.basicSalary)} />
              <MiniMetric label="Bonus" value={currency(latestPayroll?.bonus)} />
              <MiniMetric label="Deduction" value={currency(latestPayroll?.deductions)} />
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollChart}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="salary" fill="#2563EB" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <SectionHeader eyebrow="Wellbeing" title="Mood Check-in" description="A lightweight signal to keep workload visible." />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {moodOptions.map((item) => (
                <Motion.button
                  key={item.mood}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => dispatch(submitMood({ mood: item.mood }))}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-blue-500/10"
                >
                  <span className="text-xs font-semibold text-slate-400">{item.face}</span>
                  <span className="mt-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                </Motion.button>
              ))}
            </div>
          </Card>
        </Motion.section>
      </Motion.div>

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
          <Textarea label="Reason" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} />
          <Button type="submit" className="w-full">Submit Request</Button>
        </form>
      </Modal>
    </Layout>
  );
}

function QuickAction({ icon, label, to, external, onClick }) {
  const ActionIcon = icon;
  const className = "group flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40";
  const body = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-300">
        <ActionIcon size={18} />
      </span>
      <span className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        {label}
        <ArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
      </span>
    </>
  );

  if (to && external) return <a href={to} target="_blank" rel="noreferrer" className={className}>{body}</a>;
  if (to) return <Link to={to} className={className}>{body}</Link>;
  return <button type="button" onClick={onClick} className={className}>{body}</button>;
}

function KpiCard({ icon, title, value, detail, trend, tone }) {
  const KpiIcon = icon;
  const toneClass = {
    blue: "from-blue-50 to-white text-blue-700 dark:from-blue-500/10 dark:to-slate-900 dark:text-blue-300",
    emerald: "from-emerald-50 to-white text-emerald-700 dark:from-emerald-500/10 dark:to-slate-900 dark:text-emerald-300",
    amber: "from-amber-50 to-white text-amber-700 dark:from-amber-500/10 dark:to-slate-900 dark:text-amber-300",
    rose: "from-rose-50 to-white text-rose-700 dark:from-rose-500/10 dark:to-slate-900 dark:text-rose-300",
    slate: "from-slate-50 to-white text-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300"
  }[tone] || "";

  return (
    <Motion.article whileHover={{ y: -3 }} className={`rounded-2xl border border-slate-200 bg-gradient-to-br p-4 shadow-sm transition dark:border-slate-800 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/85 shadow-sm dark:bg-slate-950/70"><KpiIcon size={18} /></span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[11px] font-semibold shadow-sm dark:bg-slate-950/70">
          <TrendingUp size={12} /> {trend}
        </span>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </Motion.article>
  );
}

function WorkflowColumn({ title, icon, count, children }) {
  const ColumnIcon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><ColumnIcon size={17} /></span>
          <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
        </div>
        <Badge>{count}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-5 text-slate-950 dark:text-white">{task.title}</p>
        <Badge tone={priorityTone(task.priority)}>{task.priority || "Medium"}</Badge>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{task.description || "No description added."}</p>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold text-slate-400">
        <span>{humanizeTaskStatus(task.status)}</span>
        <span>Due {formatDate(task.dueDate)}</span>
      </div>
    </div>
  );
}

function MeetingCard({ meeting }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Video size={17} /></span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{meeting.title}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(meeting.scheduledFor)} at {formatTime(meeting.scheduledFor)}</p>
          {meeting.meetingLink && <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-700">Join call</a>}
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({ item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold capitalize text-slate-950 dark:text-white">{item.leaveType} leave</p>
        <StatusPill value={item.status} />
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{formatDate(item.startDate)} - {formatDate(item.endDate)}</p>
    </div>
  );
}

function TimelineItem({ icon, title, detail, time, tone }) {
  const TimelineIcon = icon;
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
  };
  return (
    <div className="flex gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[tone] || colors.blue}`}><TimelineIcon size={17} /></span>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
          <span className="shrink-0 text-xs text-slate-400">{time}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function NotificationCard({ item }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
        <Bell size={17} />
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950 dark:text-white">{item.title || item.type || "Notification"}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.message || item.description || "New workspace update available."}</p>
      </div>
    </div>
  );
}

function LeaveBalance({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</p>
        <Badge tone={tone}>{value} days</Badge>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white dark:bg-slate-900">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Number(value || 0) * 10)}%` }} />
      </div>
    </div>
  );
}

function LeaveTimeline({ item }) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize text-slate-950 dark:text-white">{item.leaveType} leave</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(item.startDate)} - {formatDate(item.endDate)} - {item.days || 1} day{Number(item.days || 1) === 1 ? "" : "s"}</p>
        </div>
        <StatusPill value={item.status} />
      </div>
    </div>
  );
}

function AnalyticsCard({ title, description, children }) {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader title={title} description={description} />
      <div className="mt-5 h-72">{children}</div>
    </Card>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function ProgressMetric({ label, value }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        <span>{Math.round(width)}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white dark:bg-slate-900">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function HeatmapDay({ day }) {
  const className = {
    present: "bg-emerald-500",
    late: "bg-amber-500",
    absent: "bg-rose-500",
    leave: "bg-blue-500",
    holiday: "bg-indigo-400",
    weekend: "bg-slate-300 dark:bg-slate-700",
    working: "bg-slate-200 dark:bg-slate-800"
  }[day.status] || "bg-slate-200 dark:bg-slate-800";

  return (
    <div className="group relative aspect-square rounded-lg border border-white/70 bg-slate-100 p-1 dark:border-slate-900 dark:bg-slate-800" title={`${formatDate(day.date)} - ${day.status}`}>
      <div className={`h-full w-full rounded-md ${className}`} />
    </div>
  );
}

function SectionLabel({ icon, title }) {
  const LabelIcon = icon;
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><LabelIcon size={16} /></span>
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
    </div>
  );
}

function BriefRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

function StatusPill({ value = "" }) {
  return <Badge tone={badgeTone(value)}>{value || "N/A"}</Badge>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lift dark:border-slate-800 dark:bg-slate-900">
      {label && <p className="mb-1 font-semibold text-slate-950 dark:text-white">{label}</p>}
      {payload.map((item) => (
        <p key={item.dataKey} className="text-slate-600 dark:text-slate-300">
          <span className="font-semibold capitalize" style={{ color: item.color }}>{item.name || item.dataKey}</span>: {item.value}
        </p>
      ))}
    </div>
  );
}

function getWorkingHours(record) {
  if (!record?.checkIn) return "00:00";
  const end = record.checkOut ? new Date(record.checkOut) : new Date();
  const diff = end - new Date(record.checkIn);
  if (diff <= 0) return "00:00";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toHourNumber(value) {
  const [hours = 0, minutes = 0] = String(value).split(":").map(Number);
  return hours + minutes / 60;
}

function estimateBreakTime(record) {
  if (!record?.checkIn) return "00:00";
  const hours = toHourNumber(getWorkingHours(record));
  if (hours < 4) return "00:15";
  if (hours < 7) return "00:35";
  return "00:50";
}

function statusTone(status = "") {
  const normalized = status.toLowerCase();
  if (normalized.includes("late")) return "amber";
  if (normalized.includes("absent")) return "rose";
  if (normalized.includes("in") || normalized.includes("present")) return "emerald";
  return "blue";
}

function priorityTone(priority = "") {
  const normalized = priority.toLowerCase();
  if (normalized.includes("high") || normalized.includes("urgent")) return "rose";
  if (normalized.includes("low")) return "emerald";
  return "amber";
}

function getAttendancePercent(stats, summaryStats) {
  const present = Number(stats?.presentDays ?? summaryStats?.presentDays ?? 0);
  const total = Number(stats?.workingDays ?? summaryStats?.workingDays ?? present);
  if (!total) return present ? 100 : 0;
  return Math.round((present / total) * 100);
}

function buildAttendanceTrend(records = []) {
  const source = records.slice(0, 8).reverse();
  if (!source.length) return fallbackSeries("hours", 6, 7);
  return source.map((record) => ({
    label: new Date(record.createdAt || record.checkIn).toLocaleDateString(undefined, { weekday: "short" }),
    hours: Number(toHourNumber(getWorkingHours(record)).toFixed(1))
  }));
}

function buildWorkHourTrend(records = []) {
  const source = records.slice(0, 7).reverse();
  if (!source.length) return fallbackSeries("hours", 7, 8);
  return source.map((record) => ({
    label: new Date(record.createdAt || record.checkIn).toLocaleDateString(undefined, { day: "2-digit" }),
    hours: Number(toHourNumber(getWorkingHours(record)).toFixed(1))
  }));
}

function buildProductivityData(tasks = [], moodTrend = []) {
  const base = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return base.map((label, index) => ({
    label,
    focus: Math.min(100, 62 + tasks.filter((task) => task.status === "completed").length * 5 + index * 4),
    mood: Math.round((moodTrend[index]?.score || 62 + index * 5))
  }));
}

function buildHeatmap(records = [], monthlyCalendar = []) {
  if (monthlyCalendar?.length) {
    return monthlyCalendar.map((day) => ({ date: day.date, status: day.status || "working" }));
  }

  const recordMap = new Map(records.map((record) => [normalizeDate(record.createdAt || record.checkIn).toDateString(), record]));
  const today = new Date();
  const days = [];
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  while (cursor <= end) {
    const record = recordMap.get(normalizeDate(cursor).toDateString());
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    days.push({
      date: new Date(cursor),
      status: record?.status?.toLowerCase() || (weekend ? "weekend" : "working")
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function fallbackSeries(key, length, value) {
  return Array.from({ length }, (_, index) => ({
    label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index] || `D${index + 1}`,
    [key]: Math.max(0, value - Math.abs(index - 3))
  }));
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isToday(value) {
  const date = new Date(value);
  const today = startOfToday();
  return date >= today && date < new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function currency(value) {
  if (!value) return "--";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}
