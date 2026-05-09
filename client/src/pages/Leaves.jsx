import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  Inbox,
  MessageSquare,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";
import Modal from "../components/ui/Modal";
import getSocket from "../lib/socket";

const initialForm = {
  leaveType: "paid",
  startDate: "",
  endDate: "",
  reason: "",
  emergencyContact: ""
};

const pageMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } }
};

const chartGrid = "rgba(148, 163, 184, 0.18)";
const chartAxis = "#64748B";

export default function Leaves() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);

  const isAdmin = user?.role === "admin";

  const loadData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [leaveRes, holidayRes] = await Promise.all([
          api.get("/leaves"),
          api.get("/holidays", { params: { all: true } })
        ]);
        setLeaves(leaveRes.data || []);
        setHolidays(holidayRes.data || []);
        setBalance(null);
        return;
      }

      const [balanceRes, leaveRes, holidayRes] = await Promise.all([
        api.get("/leaves/balance"),
        api.get("/leaves"),
        api.get("/holidays", { params: { all: true } })
      ]);
      setBalance(balanceRes.data?.leaveBalance || {});
      setLeaves(leaveRes.data || []);
      setHolidays(holidayRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const requests = isAdmin
      ? [api.get("/leaves"), api.get("/holidays", { params: { all: true } })]
      : [api.get("/leaves/balance"), api.get("/leaves"), api.get("/holidays", { params: { all: true } })];

    Promise.all(requests).then((responses) => {
      if (!active) return;
      if (isAdmin) {
        setLeaves(responses[0].data || []);
        setHolidays(responses[1].data || []);
        setBalance(null);
      } else {
        setBalance(responses[0].data?.leaveBalance || {});
        setLeaves(responses[1].data || []);
        setHolidays(responses[2].data || []);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (user?._id || user?.id) socket.emit("join", user._id || user.id);
    };

    const handleDisconnect = () => setSocketConnected(false);

    const handleLeaveUpdate = async (event) => {
      if (event?.leave?._id) {
        setLeaves((current) => upsertLeave(current, event.leave));
        setSelectedLeave((current) => current?._id === event.leave._id ? event.leave : current);
      }

      setActivityFeed((current) => [buildLeaveActivity(event), ...current].slice(0, 8));
      setMessage(event?.message || "Leave workflow updated in real time.");

      if (!isAdmin) {
        const eventEmployeeId = String(event?.employee?._id || event?.employee?.id || event?.leave?.employee?._id || event?.leave?.employee || "");
        const currentUserId = String(user?._id || user?.id || "");
        if (!eventEmployeeId || eventEmployeeId === currentUserId) {
          try {
            const { data } = await api.get("/leaves/balance");
            setBalance(data?.leaveBalance || {});
          } catch {
            // The leave record still updated; balance refresh can recover on the next load.
          }
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("leave:updated", handleLeaveUpdate);

    if (!socket.connected) socket.connect();
    else handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("leave:updated", handleLeaveUpdate);
    };
  }, [isAdmin, user]);

  const pendingApprovals = leaves.filter((leave) => leave.status === "pending");
  const approvedLeaves = leaves.filter((leave) => leave.status === "approved");
  const rejectedLeaves = leaves.filter((leave) => leave.status === "rejected");
  const displayHolidays = useMemo(() => mergeHolidayData(holidays), [holidays]);
  const upcomingHolidays = displayHolidays.filter((holiday) => new Date(holiday.date) >= startOfToday()).slice(0, 6);
  const employeesOnLeave = approvedLeaves.filter((leave) => isDateInRange(new Date(), leave.startDate, leave.endDate));
  const departments = useMemo(() => Array.from(new Set(leaves.map((leave) => leave.employee?.department).filter(Boolean))), [leaves]);
  const leaveTypes = ["paid", "sick", "casual", "medical", "emergency"];
  const filteredLeaves = useMemo(() => {
    const term = query.trim().toLowerCase();
    return leaves.filter((leave) => {
      const matchesStatus = statusFilter === "all" || leave.status === statusFilter;
      const matchesType = typeFilter === "all" || leave.leaveType === typeFilter;
      const matchesDepartment = departmentFilter === "all" || leave.employee?.department === departmentFilter;
      const matchesDate = !dateFilter || isDateInRange(new Date(dateFilter), leave.startDate, leave.endDate);
      const searchText = [
        leave.employee?.name,
        leave.employee?.employeeId,
        leave.employee?.department,
        leave.employee?.designation,
        leave.leaveType,
        leave.status,
        leave.reason,
        formatDate(leave.startDate),
        formatDate(leave.endDate)
      ].join(" ").toLowerCase();
      return matchesStatus && matchesType && matchesDepartment && matchesDate && (!term || searchText.includes(term));
    });
  }, [leaves, query, statusFilter, typeFilter, departmentFilter, dateFilter]);

  const totalBalance = Object.values(balance || {}).reduce((sum, value) => sum + Number(value || 0), 0);
  const requestedDays = getRequestedDays(form.startDate, form.endDate);
  const availability = buildTeamAvailability(leaves);
  const calendarDays = buildLeaveCalendar(leaves, displayHolidays);
  const balanceChart = buildBalanceChart(balance);
  const trendChart = buildLeaveTrend(leaves);
  const statusMix = buildStatusMix(leaves);

  const handleApply = async (event) => {
    event.preventDefault();
    if (step < 3) {
      setStep((value) => value + 1);
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/leaves", form);
      setForm(initialForm);
      setStep(1);
      setMessage("Leave request submitted. Your approval timeline is now live.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (leaveId, status, comment = adminComment) => {
    if (!isAdmin) return;
    setMessage("");
    const { data } = await api.patch(`/leaves/${leaveId}/status`, { status, adminComment: comment });
    setLeaves((current) => upsertLeave(current, data));
    setSelectedLeave((current) => current?._id === leaveId ? data : current);
    setAdminComment("");
    setMessage(status === "approved" ? "Leave request approved." : "Leave request rejected.");
    await loadData();
  };

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1600px] space-y-6">
        <Motion.section variants={itemMotion} className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">Leave workspace</Badge>
                <Badge tone={pendingApprovals.length ? "amber" : "emerald"}>{pendingApprovals.length} pending</Badge>
                <Badge tone="slate">{upcomingHolidays.length} holidays</Badge>
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{isAdmin ? "Approval Command Center" : `Hi ${user?.name || "there"}`}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Plan time away without losing operational visibility.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Manage requests, balances, approval flow, team coverage, holidays, and leave analytics from one calm enterprise workspace.
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroMetric icon={Plane} label={isAdmin ? "Open queue" : "Leave balance"} value={isAdmin ? pendingApprovals.length : `${totalBalance}d`} tone="blue" />
                <HeroMetric icon={CheckCircle2} label="Approved" value={approvedLeaves.length} tone="emerald" />
                <HeroMetric icon={CalendarDays} label="Upcoming holidays" value={upcomingHolidays.length} tone="amber" />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-7 xl:border-l xl:border-t-0">
              <SectionLabel icon={Sparkles} title="Real-time leave status" />
              <div className="mt-5 space-y-3">
                <BriefRow label="Pending" value={pendingApprovals.length} tone="amber" />
                <BriefRow label="Approved" value={approvedLeaves.length} tone="emerald" />
                <BriefRow label="Rejected" value={rejectedLeaves.length} tone="rose" />
                <BriefRow label="Coverage risk" value={availability.riskLabel} tone={availability.riskTone} />
              </div>
            </div>
          </div>
        </Motion.section>

        {message && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            {message}
          </Motion.div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: isAdmin ? 6 : 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className={`grid gap-4 md:grid-cols-2 ${isAdmin ? "xl:grid-cols-6" : "xl:grid-cols-4"}`}>
            {isAdmin ? (
              <>
                <KpiCard icon={Inbox} title="Total Leave Requests" value={leaves.length} detail="All employee requests" tone="blue" data={trendChart.map((item) => item.requests)} />
                <KpiCard icon={Clock3} title="Pending Approvals" value={pendingApprovals.length} detail="Awaiting admin decision" tone="amber" data={[1, 2, 3, pendingApprovals.length]} />
                <KpiCard icon={CheckCircle2} title="Approved Leaves" value={approvedLeaves.length} detail={`${getApprovalRate(leaves)}% approval rate`} tone="emerald" data={buildMiniSeries(approvedLeaves.length)} />
                <KpiCard icon={X} title="Rejected Leaves" value={rejectedLeaves.length} detail="Declined requests" tone="rose" data={buildMiniSeries(rejectedLeaves.length)} />
                <KpiCard icon={Users} title="Employees On Leave" value={employeesOnLeave.length} detail="Currently away today" tone="blue" data={buildMiniSeries(employeesOnLeave.length)} />
                <KpiCard icon={CalendarCheck} title="Upcoming Holidays" value={upcomingHolidays.length} detail="National/company calendar" tone="amber" data={buildMiniSeries(upcomingHolidays.length)} />
              </>
            ) : (
              <>
                <KpiCard icon={Clock3} title="Pending Requests" value={pendingApprovals.length} detail="Awaiting decision" tone="amber" />
                <KpiCard icon={ShieldCheck} title="Approval Rate" value={`${getApprovalRate(leaves)}%`} detail={`${approvedLeaves.length} approved total`} tone="emerald" />
                <KpiCard icon={TimerReset} title="Requested Days" value={`${sumDays(leaves)}d`} detail="Across visible records" tone="blue" />
                <KpiCard icon={Users} title="Team Availability" value={`${availability.available}%`} detail={availability.riskLabel} tone={availability.riskTone} />
              </>
            )}
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            {isAdmin ? (
              <ApprovalSummary pendingApprovals={pendingApprovals} processed={approvedLeaves.length + rejectedLeaves.length} />
            ) : (
              <ApplyLeaveCard
                form={form}
                setForm={setForm}
                step={step}
                setStep={setStep}
                requestedDays={requestedDays}
                submitting={submitting}
                onSubmit={handleApply}
              />
            )}
          </Card>

          <div className="grid gap-6">
            {!isAdmin && (
              <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
                <SectionHeader eyebrow="Balance" title="Leave Balance Overview" description="Circular usage indicators for each leave type." />
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {balanceChart.map((item) => <BalanceTracker key={item.name} item={item} />)}
                </div>
              </Card>
            )}

            <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
              <SectionHeader eyebrow="Calendar" title="Leave Calendar" description="Interactive month view with leave and holiday highlights." actions={<Badge tone="blue">{new Date().toLocaleString(undefined, { month: "long" })}</Badge>} />
              <LeaveCalendar days={calendarDays} />
            </Card>
          </div>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Requests" title={isAdmin ? "All Leave Requests" : "My Leave Requests"} description="Search, filter, audit status, and act on pending approvals." actions={<Badge tone="blue">{filteredLeaves.length} shown</Badge>} />
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(150px,0.5fr))]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Search size={16} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search employee, reason, dates, status"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100"
                  aria-label="Search leave requests"
                />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Filter size={16} className="text-slate-400" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter leave status">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Plane size={16} className="text-slate-400" />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter leave type">
                  <option value="all">All types</option>
                  {leaveTypes.map((type) => <option key={type} value={type}>{capitalize(type)}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Users size={16} className="text-slate-400" />
                <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} disabled={!isAdmin} className="w-full bg-transparent text-sm font-medium text-slate-700 disabled:opacity-50 dark:text-slate-100" aria-label="Filter department">
                  <option value="all">All departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CalendarDays size={16} className="text-slate-400" />
                <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100" aria-label="Filter leave date" />
              </label>
            </div>
            <LeaveTable rows={filteredLeaves} user={user} isAdmin={isAdmin} onStatusChange={handleStatusChange} onView={(leave) => { setSelectedLeave(leave); setAdminComment(leave.adminComment || ""); }} />
          </Card>

          <div className="grid gap-6">
            <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
              <SectionHeader eyebrow="Workflow" title="Approval Timeline" actions={<Badge tone={pendingApprovals.length ? "amber" : "emerald"}>{pendingApprovals.length ? "Action needed" : "Clear"}</Badge>} />
              <div className="mt-5 space-y-4">
                {(pendingApprovals.length ? pendingApprovals : leaves.slice(0, 4)).map((leave) => <TimelineItem key={leave._id} leave={leave} />)}
                {!leaves.length && <EmptyState icon={Inbox} title="No timeline yet" description="Requests will appear here as soon as they are submitted." />}
              </div>
            </Card>

            {isAdmin && (
              <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
                <SectionHeader eyebrow="Realtime" title="Live Leave Activity" description="New requests, approvals, rejections, medical alerts, and leave sync events." actions={<LiveSyncBadge connected={socketConnected} />} />
                <div className="mt-5 space-y-3">
                  {activityFeed.map((event) => <ActivityItem key={event.id} event={event} />)}
                  {!activityFeed.length && <EmptyState icon={MessageSquare} title="No live leave updates yet" description="Real-time approval activity will appear here." />}
                </div>
              </Card>
            )}

            {isAdmin && (
              <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
                <SectionHeader eyebrow="Leave Watch" title="Employees Currently On Leave" actions={<Badge tone="blue">{employeesOnLeave.length} away</Badge>} />
                <div className="mt-5 space-y-3">
                  {employeesOnLeave.slice(0, 5).map((leave) => <OnLeaveItem key={leave._id} leave={leave} />)}
                  {!employeesOnLeave.length && <EmptyState icon={CheckCircle2} title="No employees on leave today" description="Approved leave overlap will show here automatically." />}
                </div>
              </Card>
            )}

            <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
              <SectionHeader eyebrow="Coverage" title="Team Availability" description="A lightweight visualization of who is available, pending, or away." />
              <div className="mt-5 space-y-4">
                <AvailabilityBar label="Available" value={availability.available} tone="emerald" />
                <AvailabilityBar label="Pending review" value={availability.pending} tone="amber" />
                <AvailabilityBar label="Away approved" value={availability.away} tone="blue" />
              </div>
            </Card>

            <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
              <SectionHeader eyebrow="Holidays" title="Holiday Highlights" />
              <div className="mt-5 space-y-3">
                {upcomingHolidays.map((holiday) => <HolidayItem key={holiday._id} holiday={holiday} />)}
                {!upcomingHolidays.length && <EmptyState icon={CalendarCheck} title="No upcoming holidays" />}
              </div>
            </Card>
          </div>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-3">
          <AnalyticsCard title="Leave Trend" description="Request volume and approval momentum.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChart}>
                <defs>
                  <linearGradient id="leaveFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={3} fill="url(#leaveFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Leave Days By Type" description="A clean view of requested days by leave type.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buildTypeDays(leaves)}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="days" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Status Mix" description="Pending, approved, and rejected request distribution.">
            <div className="grid h-full grid-cols-[0.85fr_1.15fr] items-center gap-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusMix} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={4}>
                    {statusMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusMix.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}
                    </span>
                    <span className="font-semibold text-slate-950 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </AnalyticsCard>
        </Motion.section>

        <LeaveDetailsDrawer
          leave={selectedLeave}
          adminComment={adminComment}
          setAdminComment={setAdminComment}
          onClose={() => setSelectedLeave(null)}
          onStatusChange={handleStatusChange}
          isAdmin={isAdmin}
        />
      </Motion.div>
    </Layout>
  );
}

function ApplyLeaveCard({ form, setForm, step, setStep, requestedDays, submitting, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <SectionHeader eyebrow="Apply" title="Multi-step Leave Request" description="A guided request flow that keeps dates, policy context, and confirmation separate." />
      <StepIndicator step={step} />

      <div className="mt-6 min-h-[300px]">
        {step === 1 && (
          <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Select label="Leave Type" value={form.leaveType} onChange={(event) => setForm({ ...form, leaveType: event.target.value })}>
              <option value="paid">Paid Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="medical">Medical Leave</option>
              <option value="emergency">Emergency Leave</option>
            </Select>
            <InfoPanel icon={Plane} title="Choose the right leave type" detail="Balances are checked by the backend when the request is submitted." />
          </Motion.div>
        )}

        {step === 2 && (
          <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Start Date" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              <Input label="End Date" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
            </div>
            <InfoPanel icon={CalendarDays} title={`${requestedDays || 0} requested day(s)`} detail="Holiday-only requests can be auto-approved by the backend policy." />
          </Motion.div>
        )}

        {step === 3 && (
          <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Textarea label="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
            <Input label="Emergency Contact" required={false} value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} placeholder="Name and phone number" />
            <ReviewBox form={form} requestedDays={requestedDays} />
          </Motion.div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" disabled={step === 1 || submitting} onClick={() => setStep((value) => Math.max(1, value - 1))} className="sm:flex-1">
          Back
        </Button>
        <Button type="submit" disabled={submitting} className="sm:flex-1" icon={step === 3 ? Check : ArrowRight}>
          {step === 3 ? submitting ? "Submitting..." : "Submit Request" : "Continue"}
        </Button>
      </div>
    </form>
  );
}

function ApprovalSummary({ pendingApprovals, processed }) {
  return (
    <>
      <SectionHeader eyebrow="Approvals" title="Approval Command Panel" description="Review pending employee requests and keep decisions moving." />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SummaryTile icon={Clock3} label="Pending requests" value={pendingApprovals.length} tone="amber" />
        <SummaryTile icon={CheckCircle2} label="Processed requests" value={processed} tone="emerald" />
      </div>
      <div className="mt-5 space-y-3">
        {pendingApprovals.slice(0, 4).map((leave) => (
          <div key={leave._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{leave.employee?.name || "Employee"}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{capitalize(leave.leaveType)} leave - {leave.days} day(s)</p>
              </div>
              <Badge tone="amber">Pending</Badge>
            </div>
          </div>
        ))}
        {!pendingApprovals.length && <EmptyState icon={CheckCircle2} title="Approval queue is clear" description="New employee requests will appear here." />}
      </div>
    </>
  );
}

function StepIndicator({ step }) {
  const steps = ["Type", "Dates", "Review"];
  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {steps.map((label, index) => {
        const active = step >= index + 1;
        return (
          <div key={label} className={`rounded-2xl border px-3 py-3 ${active ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Step {index + 1}</p>
            <p className="mt-1 font-semibold">{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function BalanceTracker({ item }) {
  const data = [{ name: item.name, value: item.percent, fill: item.color }];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold capitalize text-slate-950 dark:text-white">{item.name}</p>
      <div className="relative mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="96%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={16} background={{ fill: "rgba(148, 163, 184, 0.16)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-slate-950 dark:text-white">{item.value}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">days</p>
        </div>
      </div>
    </div>
  );
}

function LeaveCalendar({ days }) {
  return (
    <>
      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => <CalendarCell key={day.key} day={day} />)}
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Legend color="bg-blue-500" label="Leave" />
        <Legend color="bg-amber-500" label="Pending" />
        <Legend color="bg-indigo-500" label="Holiday" />
        <Legend color="bg-slate-300 dark:bg-slate-700" label="Weekend" />
      </div>
    </>
  );
}

function CalendarCell({ day }) {
  if (day.blank) return <div className="aspect-square" />;

  const colors = {
    leave: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    pending: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    holiday: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300",
    weekend: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400",
    working: "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
  };

  return (
    <Motion.div whileHover={{ y: -2 }} className={`aspect-square rounded-2xl border p-2 text-left shadow-sm ${colors[day.status] || colors.working}`} title={`${formatDate(day.date)} - ${day.label || day.status}`}>
      <p className="text-sm font-bold">{new Date(day.date).getDate()}</p>
      <p className="mt-1 hidden text-[11px] font-medium capitalize sm:block">{day.label || day.status}</p>
    </Motion.div>
  );
}

function LeaveDetailsDrawer({ leave, adminComment, setAdminComment, onClose, onStatusChange, isAdmin }) {
  const documents = getMedicalDocuments(leave);
  return (
    <Modal open={Boolean(leave)} title="Leave Request Details" description="Employee context, leave dates, documents, remarks, and approval actions." onClose={onClose} panelClassName="max-w-5xl p-0">
      {leave && (
        <div className="px-6 pb-6">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start gap-4">
                <AvatarInitial name={leave.employee?.name} status={leave.status} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">{leave.employee?.name || "Employee"}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{leave.employee?.employeeId || "EMS"} / {leave.employee?.department || "Team"}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{leave.employee?.designation || "Team Member"}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <DetailLine label="Leave Type" value={capitalize(leave.leaveType)} />
                <DetailLine label="Start Date" value={formatDate(leave.startDate)} />
                <DetailLine label="End Date" value={formatDate(leave.endDate)} />
                <DetailLine label="Total Days" value={`${leave.days} day(s)`} />
                <DetailLine label="Applied Date" value={formatDate(leave.createdAt)} />
                <DetailLine label="Emergency Contact" value={leave.emergencyContact || leave.employee?.phone || "Not provided"} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Approval Status</p>
                    <div className="mt-2"><StatusBadge leave={leave} /></div>
                  </div>
                  <Badge tone={leave.leaveType === "medical" ? "rose" : leave.leaveType === "emergency" ? "amber" : "blue"}>{capitalize(leave.leaveType)}</Badge>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{leave.reason || "No reason provided."}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionLabel icon={FileText} title="Medical & Supporting Documents" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {documents.map((document) => <DocumentCard key={document.url || document.name} document={document} />)}
                  {!documents.length && <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">No medical certificates, prescriptions, or supporting files are attached.</div>}
                </div>
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <Textarea label="Admin Notes" required={false} value={adminComment} onChange={(event) => setAdminComment(event.target.value)} placeholder="Add context for the employee notification or audit trail." />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => onStatusChange(leave._id, "approved", adminComment)} disabled={leave.status === "approved"} variant="success" size="sm" icon={Check}>Approve Leave</Button>
                    <Button onClick={() => onStatusChange(leave._id, "rejected", adminComment)} disabled={leave.status === "rejected"} variant="danger" size="sm" icon={X}>Reject Leave</Button>
                    <Button variant="outline" size="sm" icon={MessageSquare}>Notify Employee</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate font-semibold text-slate-950 dark:text-white">{value || "--"}</span>
    </div>
  );
}

function DocumentCard({ document }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <FileText size={18} className="text-blue-600 dark:text-blue-300" />
      <p className="mt-3 font-semibold text-slate-950 dark:text-white">{document.name || "Supporting Document"}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{document.type || "Medical file"}</p>
      {document.url && <Button onClick={() => window.open(document.url, "_blank")} variant="outline" size="sm" icon={Download} className="mt-3">Download</Button>}
    </div>
  );
}

function AvatarInitial({ name = "Employee", status = "pending", size = "md" }) {
  const sizes = { md: "h-10 w-10", lg: "h-16 w-16 text-lg" };
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 ${sizes[size] || sizes.md}`}>
      <span className={`absolute right-0 top-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${status === "approved" ? "bg-emerald-500" : status === "rejected" ? "bg-rose-500" : "animate-pulse bg-amber-500"}`} />
      {initials(name)}
    </span>
  );
}

function StatusBadge({ leave }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${leave.status === "approved" ? "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.8)]" : leave.status === "rejected" ? "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.7)]" : "animate-pulse bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.8)]"}`} />
      <Badge tone={statusTone(leave.status)}>{capitalize(leave.status)}</Badge>
    </span>
  );
}

function LeaveTable({ rows, user, isAdmin, onStatusChange, onView }) {
  const headers = isAdmin
    ? ["Photo", "Employee Name", "Employee ID", "Department", "Leave Type", "Leave Dates", "Total Days", "Reason", "Medical Document", "Approval Status", "Applied Date", "Actions"]
    : ["Employee", "Type", "Date Range", "Days", "Reason", "Status", "Actions"];

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-auto">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {headers.map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((leave) => (
              <tr key={leave._id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                {isAdmin ? (
                  <>
                    <td className="px-4 py-4"><AvatarInitial name={leave.employee?.name} status={leave.status} /></td>
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{leave.employee?.name || "Employee"}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{leave.employee?.employeeId || "EMS"}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{leave.employee?.department || "Team"}</td>
                  </>
                ) : (
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900 dark:text-white">{leave.employee?.name || user?.name || "Employee"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{leave.employee?.department || "Team"}</p>
                  </td>
                )}
                <td className="px-4 py-4 capitalize text-slate-700 dark:text-slate-300">{leave.leaveType}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{formatDate(leave.startDate)} - {formatDate(leave.endDate)}</td>
                <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{leave.days}</td>
                <td className="max-w-xs px-4 py-4 text-slate-600 dark:text-slate-300">{leave.reason || "No reason provided"}</td>
                {isAdmin && <td className="px-4 py-4"><Badge tone={getMedicalDocuments(leave).length ? "emerald" : leave.leaveType === "medical" ? "amber" : "slate"}>{getMedicalDocuments(leave).length ? "Uploaded" : leave.leaveType === "medical" ? "Required" : "Not needed"}</Badge></td>}
                <td className="px-4 py-4">
                  <Motion.span initial={{ scale: 0.96 }} animate={{ scale: 1 }}>
                    <StatusBadge leave={leave} />
                  </Motion.span>
                  {leave.autoApproved && <Badge tone="emerald" className="mt-2">Auto approved</Badge>}
                </td>
                {isAdmin && <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(leave.createdAt)}</td>}
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onView?.(leave)} variant="outline" size="sm" icon={Eye}>View</Button>
                    {getMedicalDocuments(leave).length > 0 && <Button onClick={() => window.open(getMedicalDocuments(leave)[0].url, "_blank")} variant="outline" size="sm" icon={Download}>Docs</Button>}
                    {isAdmin && leave.status === "pending" && (
                      <>
                      <Button onClick={() => onStatusChange(leave._id, "approved")} variant="success" size="sm" icon={Check}>Approve</Button>
                      <Button onClick={() => onStatusChange(leave._id, "rejected")} variant="danger" size="sm" icon={X}>Reject</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="p-4"><EmptyState icon={Inbox} title="No leave records found" description="Try a different search or status filter." /></div>}
    </div>
  );
}

function TimelineItem({ leave }) {
  const approved = leave.status === "approved";
  const rejected = leave.status === "rejected";
  return (
    <div className="flex gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${approved ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : rejected ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
        {approved ? <CheckCircle2 size={17} /> : rejected ? <X size={17} /> : <Clock3 size={17} />}
      </span>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-slate-950 dark:text-white">{leave.employee?.name || "Employee"} - {capitalize(leave.leaveType)}</p>
          <Badge tone={statusTone(leave.status)}>{capitalize(leave.status)}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(leave.startDate)} to {formatDate(leave.endDate)} - {leave.days} day(s)</p>
      </div>
    </div>
  );
}

function AvailabilityBar({ label, value, tone }) {
  const colors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500"
  };
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full rounded-full ${colors[tone] || colors.blue}`} />
      </div>
    </div>
  );
}

function HolidayItem({ holiday }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950 dark:text-white">{holiday.name}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(holiday.date)}</p>
      </div>
      <Badge tone="blue">Holiday</Badge>
    </div>
  );
}

function LiveSyncBadge({ connected }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${connected ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"}`}>
      <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.9)]" : "bg-amber-500"}`} />
      {connected ? "Live" : "Syncing"}
    </span>
  );
}

function ActivityItem({ event }) {
  const colors = {
    approved: "bg-emerald-500",
    rejected: "bg-rose-500",
    pending: "bg-amber-500",
    default: "bg-blue-500"
  };
  return (
    <Motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[event.status] || colors.default}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{event.message}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(event.timestamp)}</p>
      </div>
    </Motion.div>
  );
}

function OnLeaveItem({ leave }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3">
        <AvatarInitial name={leave.employee?.name} status="approved" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{leave.employee?.name || "Employee"}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{leave.employee?.department || "Team"} / {formatDate(leave.endDate)}</p>
        </div>
      </div>
      <Badge tone="blue">{capitalize(leave.leaveType)}</Badge>
    </div>
  );
}

function KpiCard({ icon, title, value, detail, tone, data = [] }) {
  const Icon = icon;
  const colors = {
    blue: "from-blue-600/12 to-sky-500/5 text-blue-700 dark:text-blue-300",
    emerald: "from-emerald-600/12 to-teal-500/5 text-emerald-700 dark:text-emerald-300",
    amber: "from-amber-500/14 to-orange-500/5 text-amber-700 dark:text-amber-300",
    rose: "from-rose-500/14 to-red-500/5 text-rose-700 dark:text-rose-300"
  };
  return (
    <Motion.article whileHover={{ y: -3 }} className={`overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${colors[tone] || colors.blue} bg-white/80 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-950/80"><Icon size={19} /></span>
        <Badge tone={tone}><TrendingUp size={12} /> Live</Badge>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
      <div className="mt-4 h-11 overflow-hidden rounded-xl bg-white/70 dark:bg-slate-950/70">
        <MiniSparkline data={data} />
      </div>
    </Motion.article>
  );
}

function MiniSparkline({ data = [] }) {
  const source = data.length ? data : [2, 4, 3, 6, 5, 7, 6];
  const values = source.map((item) => Number(item || 0));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 40 - (value / max) * 32;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 44" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,44 ${points} 100,44`} fill="rgba(37,99,235,0.14)" stroke="none" />
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function HeroMetric({ icon, label, value, tone }) {
  const Icon = icon;
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone] || colors.blue}`}><Icon size={18} /></span>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function SummaryTile({ icon, label, value, tone }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      <Badge tone={tone} className="mt-3">Realtime</Badge>
    </div>
  );
}

function InfoPanel({ icon, title, detail }) {
  const Icon = icon;
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <div>
        <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

function ReviewBox({ form, requestedDays }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-950 dark:text-white">Request summary</p>
      <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Type: <span className="font-semibold capitalize text-slate-950 dark:text-white">{form.leaveType}</span></p>
        <p>Dates: <span className="font-semibold text-slate-950 dark:text-white">{formatDate(form.startDate)} to {formatDate(form.endDate)}</span></p>
        <p>Days: <span className="font-semibold text-slate-950 dark:text-white">{requestedDays || 0}</span></p>
      </div>
    </div>
  );
}

function AnalyticsCard({ title, description, children }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader title={title} description={description} />
      <div className="mt-5 h-72">{children}</div>
    </Card>
  );
}

function SectionLabel({ icon, title }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><Icon size={16} /></span>
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

function Legend({ color, label }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lift dark:border-slate-800 dark:bg-slate-900">
      {label && <p className="mb-1 font-semibold text-slate-950 dark:text-white">{label}</p>}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="text-slate-600 dark:text-slate-300">
          <span className="font-semibold capitalize" style={{ color: item.color || item.payload?.color }}>{item.name || item.dataKey}</span>: {item.value}
        </p>
      ))}
    </div>
  );
}

function buildBalanceChart(balance = {}) {
  const max = { paid: 18, sick: 10, casual: 7, medical: 10, emergency: 5 };
  const colors = { paid: "#2563EB", sick: "#10B981", casual: "#F59E0B", medical: "#EF4444", emergency: "#8B5CF6" };
  return ["paid", "sick", "casual"].map((name) => {
    const value = Number(balance?.[name] || 0);
    return {
      name,
      value,
      color: colors[name],
      percent: Math.max(0, Math.min(100, (value / max[name]) * 100))
    };
  });
}

function buildLeaveCalendar(leaves = [], holidays = []) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const holidayMap = new Map(holidays.map((holiday) => [normalizeDate(holiday.date).toDateString(), holiday]));
  const days = [];

  for (let i = 0; i < monthStart.getDay(); i += 1) {
    days.push({ key: `blank-${i}`, blank: true });
  }

  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const day = normalizeDate(cursor);
    const holiday = holidayMap.get(day.toDateString());
    const leave = leaves.find((item) => day >= normalizeDate(item.startDate) && day <= normalizeDate(item.endDate));
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const status = holiday ? "holiday" : leave ? leave.status === "pending" ? "pending" : "leave" : weekend ? "weekend" : "working";
    days.push({
      key: day.toISOString(),
      date: new Date(day),
      status,
      label: holiday?.name || leave?.leaveType || status
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function buildLeaveTrend(leaves = []) {
  const buckets = new Map();
  leaves.forEach((leave) => {
    const date = new Date(leave.createdAt || leave.startDate);
    const label = date.toLocaleDateString(undefined, { month: "short" });
    buckets.set(label, (buckets.get(label) || 0) + 1);
  });
  const data = Array.from(buckets.entries()).map(([label, requests]) => ({ label, requests })).slice(-6);
  return data.length ? data : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label, index) => ({ label, requests: Math.max(0, index - 1) }));
}

function buildTypeDays(leaves = []) {
  return ["paid", "sick", "casual", "medical", "emergency"].map((type) => ({
    label: capitalize(type),
    days: leaves.filter((leave) => leave.leaveType === type).reduce((sum, leave) => sum + Number(leave.days || 0), 0)
  }));
}

function buildStatusMix(leaves = []) {
  const data = [
    { name: "Pending", value: leaves.filter((leave) => leave.status === "pending").length, color: "#F59E0B" },
    { name: "Approved", value: leaves.filter((leave) => leave.status === "approved").length, color: "#10B981" },
    { name: "Rejected", value: leaves.filter((leave) => leave.status === "rejected").length, color: "#EF4444" }
  ];
  return data.some((item) => item.value) ? data : data.map((item, index) => ({ ...item, value: index === 1 ? 1 : 0 }));
}

function buildTeamAvailability(leaves = []) {
  const approved = leaves.filter((leave) => leave.status === "approved").length;
  const pending = leaves.filter((leave) => leave.status === "pending").length;
  const total = Math.max(10, leaves.length + 8);
  const away = Math.round((approved / total) * 100);
  const pendingPercent = Math.round((pending / total) * 100);
  const available = Math.max(0, 100 - away - pendingPercent);
  const riskLabel = pendingPercent + away > 35 ? "High risk" : pendingPercent + away > 18 ? "Watch" : "Healthy";
  const riskTone = riskLabel === "High risk" ? "rose" : riskLabel === "Watch" ? "amber" : "emerald";
  return { available, pending: pendingPercent, away, riskLabel, riskTone };
}

function getRequestedDays(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function getApprovalRate(leaves = []) {
  const processed = leaves.filter((leave) => leave.status !== "pending");
  if (!processed.length) return 0;
  return Math.round((processed.filter((leave) => leave.status === "approved").length / processed.length) * 100);
}

function sumDays(leaves = []) {
  return leaves.reduce((sum, leave) => sum + Number(leave.days || 0), 0);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function upsertLeave(leaves = [], nextLeave) {
  const id = String(nextLeave?._id || "");
  if (!id) return leaves;
  const exists = leaves.some((leave) => String(leave._id) === id);
  const nextLeaves = exists
    ? leaves.map((leave) => String(leave._id) === id ? { ...leave, ...nextLeave } : leave)
    : [nextLeave, ...leaves];
  return nextLeaves.sort((a, b) => new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0));
}

function buildLeaveActivity(event = {}) {
  const leave = event.leave || {};
  const employee = event.employee || leave.employee || {};
  return {
    id: `${leave._id || event.timestamp}-${Math.random().toString(36).slice(2)}`,
    message: event.message || `${employee.name || "Employee"} leave ${leave.status || "updated"}`,
    status: leave.status || "default",
    timestamp: event.timestamp || new Date().toISOString()
  };
}

function mergeHolidayData(holidays = []) {
  const byDate = new Map();
  [...getNationalHolidayFallbacks(), ...holidays].forEach((holiday) => {
    const key = normalizeDate(holiday.date).toDateString();
    byDate.set(key, { ...holiday, _id: holiday._id || key });
  });
  return Array.from(byDate.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getNationalHolidayFallbacks() {
  const year = new Date().getFullYear();
  return [
    { name: "New Year's Day", date: new Date(year, 0, 1), description: "National holiday", isNationalHoliday: true },
    { name: "Republic Day", date: new Date(year, 0, 26), description: "National holiday", isNationalHoliday: true },
    { name: "Independence Day", date: new Date(year, 7, 15), description: "National holiday", isNationalHoliday: true },
    { name: "Gandhi Jayanti", date: new Date(year, 9, 2), description: "National holiday", isNationalHoliday: true },
    { name: "Christmas Day", date: new Date(year, 11, 25), description: "Public holiday", isNationalHoliday: true }
  ];
}

function isDateInRange(date, startDate, endDate) {
  const target = normalizeDate(date);
  return target >= normalizeDate(startDate) && target <= normalizeDate(endDate);
}

function getMedicalDocuments(leave) {
  return Array.isArray(leave?.medicalDocuments) ? leave.medicalDocuments.filter((document) => document?.name || document?.url) : [];
}

function buildMiniSeries(value = 0) {
  const number = Number(value || 0);
  return [Math.max(0, number - 2), Math.max(0, number - 1), number, number + 1, Math.max(0, number)];
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function initials(name = "Employee") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EM";
}

function capitalize(value = "") {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}
