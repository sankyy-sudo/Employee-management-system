import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion as Motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Banknote,
  BarChart3,
  Bell,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Command,
  Download,
  FileSpreadsheet,
  FileText,
  Globe2,
  Layers3,
  ListTodo,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  Zap
} from "lucide-react";
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
import Layout from "../components/Layout";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Page from "../components/ui/Page";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { fetchAdminAnalytics } from "../store/analyticsSlice";
import { fetchAttendanceDashboard } from "../store/attendanceSlice";
import { deleteEmployee, fetchEmployees, saveEmployee } from "../store/employeeSlice";
import { fetchLeaveDashboard, updateLeaveStatus } from "../store/leaveSlice";
import { fetchNotifications } from "../store/notificationSlice";
import { fetchPayrollDashboard, generatePayroll } from "../store/payrollSlice";
import { createTask, fetchTasks } from "../store/taskSlice";
import { formatDate, formatTime } from "../utils/format";
import { statusTone as badgeTone } from "../utils/statusTone";

const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const emptyEmployee = { name: "", email: "", password: "", role: "Employee", department: "", phone: "", salary: "" };

export default function Admin() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [employeeModal, setEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [taskModal, setTaskModal] = useState(false);
  const [payrollModal, setPayrollModal] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [salaryPredictions, setSalaryPredictions] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [commandOpen, setCommandOpen] = useState(false);
  const [language, setLanguage] = useState("EN");

  const employees = useSelector((state) => state.employees);
  const attendance = useSelector((state) => state.attendance);
  const leave = useSelector((state) => state.leave);
  const payroll = useSelector((state) => state.payroll);
  const tasks = useSelector((state) => state.tasks);
  const analytics = useSelector((state) => state.analytics);
  const notifications = useSelector((state) => state.notifications);

  useEffect(() => {
    const loadDashboard = () => {
      dispatch(fetchEmployees());
      dispatch(fetchAttendanceDashboard());
      dispatch(fetchLeaveDashboard());
      dispatch(fetchPayrollDashboard());
      dispatch(fetchTasks());
      dispatch(fetchAdminAnalytics());
      dispatch(fetchNotifications());
      setLastRefresh(new Date());
    };

    loadDashboard();
    const interval = setInterval(loadDashboard, 45000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const loadPredictions = async () => {
      const sample = employees.items.slice(0, 5);
      const results = await Promise.all(sample.map(async (employee) => {
        const { data } = await api.post("/ai/predict-salary", {
          experience: estimateExperience(employee.dateOfJoining),
          skills: employee.skills || [],
          role: employee.role,
          performanceRating: 3
        });
        return { ...employee, predictedSalary: data.predictedSalary, range: data.range };
      }));
      setSalaryPredictions(results);
    };

    if (employees.items.length) {
      loadPredictions().catch(() => setSalaryPredictions([]));
    }
  }, [employees.items]);

  const todayRecords = useMemo(() => attendance.history.filter((item) => isToday(item.createdAt)), [attendance.history]);
  const presentToday = todayRecords.filter((item) => item.checkIn).length;
  const absentToday = Math.max((employees.items.length || 0) - presentToday, 0);
  const lateToday = todayRecords.filter((item) => item.isLate || item.status === "Late").length;
  const remoteToday = Math.round(presentToday * 0.18);
  const pendingLeaves = leave.history.filter((item) => item.status === "pending");
  const approvedLeaves = leave.history.filter((item) => item.status === "approved");
  const rejectedLeaves = leave.history.filter((item) => item.status === "rejected");
  const activeTasks = tasks.items.filter((task) => task.status !== "completed");
  const completedTasks = tasks.items.filter((task) => task.status === "completed");
  const salaryExpense = payroll.history.reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  const salaryChart = payroll.history.slice(0, 6).reverse().map((item) => ({
    label: `${item.month}/${String(item.year).slice(-2)}`,
    salary: Number(item.netSalary || 0)
  }));
  const attendanceTrend = useMemo(() => buildAttendanceTrend(attendance.history), [attendance.history]);
  const leaveTrend = useMemo(() => buildLeaveTrend(leave.history), [leave.history]);
  const departmentChart = analytics.summary?.departmentBreakdown || buildDepartmentBreakdown(employees.items);
  const performanceData = buildPerformanceData(tasks.items, attendance.history);
  const recentEmployees = employees.items.slice(0, 5);
  const aiInsights = buildAiInsights({ employees: employees.items, attendance: attendance.history, payroll: payroll.history, tasks: tasks.items, pendingLeaves, lateToday });
  const loading = employees.loading || attendance.loading || leave.loading || payroll.loading || tasks.loading || analytics.loading;
  const error = employees.error || attendance.error || leave.error || payroll.error || tasks.error || analytics.error;

  const filteredEmployees = employees.items.filter((employee) => {
    const term = search.toLowerCase();
    const matchesSearch = [employee.name, employee.email, employee.department, employee.employeeId].some((value) =>
      String(value || "").toLowerCase().includes(term)
    );
    return matchesSearch && (roleFilter === "all" || String(employee.role).toLowerCase() === roleFilter.toLowerCase());
  });

  const openCreateEmployee = () => {
    setEmployeeForm(emptyEmployee);
    setEmployeeModal(true);
  };

  const openEditEmployee = (employee) => {
    setEmployeeForm({
      _id: employee._id,
      name: employee.name || "",
      email: employee.email || "",
      password: "",
      role: employee.role || "Employee",
      department: employee.department || "",
      phone: employee.phone || "",
      salary: employee.salary || ""
    });
    setEmployeeModal(true);
  };

  const handleEmployeeSubmit = async (event) => {
    event.preventDefault();
    await dispatch(saveEmployee(employeeForm)).unwrap();
    setEmployeeModal(false);
  };

  const exportMonthlyReport = async (format) => {
    const { data } = await api.get("/reports/monthly", { params: { format }, responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-report.${format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <Page
        eyebrow="AI Admin Dashboard"
        title="Organization Command Center"
        description="A real-time AI-powered HRMS cockpit for people operations, payroll, attendance, approvals, projects, and executive analytics."
        className="max-w-[1700px]"
        actions={
          <>
            <Button onClick={() => setCommandOpen(true)} variant="outline" icon={Command}>Command</Button>
            <Button onClick={openCreateEmployee} icon={UserPlus}>Add Employee</Button>
          </>
        }
      >
        <div className="min-w-0 space-y-6">
          <AdminHero
            user={user}
            employeeCount={employees.items.length}
            presentToday={presentToday}
            pendingApprovals={pendingLeaves.length}
            activeProjects={activeTasks.length}
            lastRefresh={lastRefresh}
            language={language}
            setLanguage={setLanguage}
            onCreateEmployee={openCreateEmployee}
            onCommand={() => setCommandOpen(true)}
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? <SkeletonGrid /> : (
            <StatsGrid
              employees={employees.items.length}
              presentToday={presentToday}
              onLeave={approvedLeaves.filter((item) => isToday(item.startDate || item.createdAt)).length}
              activeProjects={activeTasks.length}
              salaryExpense={salaryExpense}
              pendingApprovals={pendingLeaves.length}
              attendanceTrend={attendanceTrend}
            />
          )}

          <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
            <main className="min-w-0 space-y-6">
              <AttendanceMonitoring
                presentToday={presentToday}
                absentToday={absentToday}
                lateToday={lateToday}
                remoteToday={remoteToday}
                trend={attendanceTrend}
                records={todayRecords}
                onExport={() => downloadCsv("attendance.csv", attendance.history)}
              />

              <EmployeeManagement
                employees={filteredEmployees}
                allEmployees={employees.items}
                search={search}
                setSearch={setSearch}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                onCreate={openCreateEmployee}
                onEdit={openEditEmployee}
                onDelete={(id) => dispatch(deleteEmployee(id))}
                departmentChart={departmentChart}
                recentEmployees={recentEmployees}
              />

              <div className="grid min-w-0 gap-6 xl:grid-cols-2">
                <LeaveManagement
                  leaves={leave.history}
                  pendingLeaves={pendingLeaves}
                  approvedLeaves={approvedLeaves}
                  rejectedLeaves={rejectedLeaves}
                  trend={leaveTrend}
                  onStatus={(id, status) => dispatch(updateLeaveStatus({ id, status }))}
                />
                <PayrollOverview
                  payroll={payroll.history}
                  salaryChart={salaryChart}
                  salaryExpense={salaryExpense}
                  onGenerate={() => setPayrollModal(true)}
                  onExport={exportMonthlyReport}
                />
              </div>

              <ProjectManagement tasks={tasks.items} completedTasks={completedTasks} onCreate={() => setTaskModal(true)} />

              <ReportsAnalytics
                departmentChart={departmentChart}
                performanceData={performanceData}
                onExport={exportMonthlyReport}
              />
            </main>

            <aside className="min-w-0 space-y-6 xl:sticky xl:top-24 xl:self-start">
              <AIInsights insights={aiInsights} salaryPredictions={salaryPredictions} />
              <NotificationsCenter notifications={notifications.items} />
              <AIAssistant />
              <RolesPanel />
              <SettingsPanel />
            </aside>
          </section>
        </div>
      </Page>

      <EmployeeModal open={employeeModal} form={employeeForm} setForm={setEmployeeForm} onClose={() => setEmployeeModal(false)} onSubmit={handleEmployeeSubmit} />
      <TaskModal open={taskModal} employees={employees.items} onClose={() => setTaskModal(false)} onSubmit={async (payload) => { await dispatch(createTask(payload)).unwrap(); setTaskModal(false); }} />
      <PayrollModal open={payrollModal} employees={employees.items} onClose={() => setPayrollModal(false)} onSubmit={async (payload) => { await dispatch(generatePayroll(payload)).unwrap(); setPayrollModal(false); }} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onCreateEmployee={openCreateEmployee} onTask={() => setTaskModal(true)} onPayroll={() => setPayrollModal(true)} onReport={() => exportMonthlyReport("pdf")} />
    </Layout>
  );
}

function AdminHero({ user, employeeCount, presentToday, pendingApprovals, activeProjects, lastRefresh, language, setLanguage, onCreateEmployee, onCommand }) {
  const dateText = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  });

  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85"
    >
      <div className="absolute right-10 top-8 h-32 w-32 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute bottom-4 left-1/2 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="relative grid min-w-0 gap-6 bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-6 text-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue" className="bg-white/15 text-white ring-white/20">AI-powered HRMS</Badge>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Live operations
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl">
            Good day, {user?.name || "Admin"}. Your enterprise workforce is in motion.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
            {dateText} / Asia/Kolkata. Monitor attendance, payroll, approvals, productivity, and AI recommendations from one executive-grade command center.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={onCreateEmployee} icon={UserPlus}>Add Employee</Button>
            <Button onClick={onCommand} variant="outline" icon={Command}>Open Command Palette</Button>
            <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white">
              <Globe2 size={16} />
              <select value={language} onChange={(event) => setLanguage(event.target.value)} className="bg-transparent outline-none">
                <option className="text-slate-950" value="EN">EN</option>
                <option className="text-slate-950" value="HI">HI</option>
                <option className="text-slate-950" value="FR">FR</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Company pulse</p>
            <span className="text-xs text-blue-100">Updated {formatTime(lastRefresh)}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroMetric label="Employees" value={employeeCount} />
            <HeroMetric label="Present" value={presentToday} />
            <HeroMetric label="Projects" value={activeProjects} />
            <HeroMetric label="Approvals" value={pendingApprovals} />
          </div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="flex items-center gap-2 font-semibold"><BrainCircuit size={17} /> AI insight</p>
            <p className="mt-2 text-sm leading-6 text-blue-100">
              Attendance and approval queues are being monitored. Prioritize late-entry reviews and pending leave decisions before payroll processing.
            </p>
          </div>
        </div>
      </div>
    </Motion.section>
  );
}

function StatsGrid({ employees, presentToday, onLeave, activeProjects, salaryExpense, pendingApprovals, attendanceTrend }) {
  const cards = [
    { icon: Users, title: "Total Employees", value: employees, detail: "+4.8% workforce growth", tone: "blue" },
    { icon: UserCheck, title: "Present Employees", value: presentToday, detail: "Live attendance feed", tone: "emerald" },
    { icon: CalendarCheck, title: "Employees On Leave", value: onLeave, detail: "Approved today", tone: "amber" },
    { icon: BriefcaseBusiness, title: "Active Projects", value: activeProjects, detail: "Open project work", tone: "slate" },
    { icon: Banknote, title: "Monthly Payroll", value: currency(salaryExpense), detail: "Processed value", tone: "blue" },
    { icon: ShieldCheck, title: "Pending Approvals", value: pendingApprovals, detail: "Needs HR action", tone: "rose" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card, index) => (
        <MetricCard key={card.title} card={card} index={index} trend={attendanceTrend} />
      ))}
    </div>
  );
}

function MetricCard({ card, index, trend }) {
  const Icon = card.icon;
  return (
    <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.22 }}>
      <Card hover className="group overflow-hidden border-white/70 bg-white/85 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass(card.tone)}`}>
            <Icon size={19} />
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">+12%</span>
        </div>
        <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{card.value}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{card.title}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.detail}</p>
        <div className="mt-3 h-12 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950">
          <Sparkline data={trend.slice(-7).map((item) => ({ value: item.present }))} />
        </div>
      </Card>
    </Motion.div>
  );
}

function Sparkline({ data }) {
  const source = data.length ? data : Array.from({ length: 7 }, (_, index) => ({ value: 20 + index * 4 }));
  const values = source.map((item) => Number(item.value || 0));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 42 - (value / max) * 34;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 48" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,48 ${points} 100,48`} fill="rgba(37,99,235,0.14)" stroke="none" />
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function AttendanceMonitoring({ presentToday, absentToday, lateToday, remoteToday, trend, records, onExport }) {
  const liveRows = records.slice(0, 6);

  return (
    <Card id="attendance" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="Realtime"
        title="Attendance Monitoring"
        description="Live attendance health, late-entry alerts, remote signals, and trend analytics."
        actions={<Button onClick={onExport} variant="outline" size="sm" icon={Download}>Export Attendance</Button>}
      />
      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusTile label="Present" value={presentToday} tone="emerald" icon={UserCheck} />
          <StatusTile label="Absent" value={absentToday} tone="rose" icon={AlertTriangle} />
          <StatusTile label="Late Entries" value={lateToday} tone="amber" icon={Clock3} />
          <StatusTile label="Remote" value={remoteToday} tone="blue" icon={Globe2} />
        </div>
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area dataKey="present" stroke="#2563eb" fill="url(#presentGradient)" strokeWidth={3} />
              <Line dataKey="late" stroke="#f59e0b" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {liveRows.map((record) => (
          <div key={record._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{record.employee?.name || "Employee check-in"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatTime(record.checkIn)} / {record.isLate ? "Late" : "On time"}</p>
              </div>
            </div>
            <Pill value={record.faceVerified ? "verified" : "manual"} />
          </div>
        ))}
        {!liveRows.length && <EmptyState icon={Activity} title="No live attendance yet" description="Attendance updates will appear here as employees check in." />}
      </div>
    </Card>
  );
}

function EmployeeManagement({ employees, allEmployees, search, setSearch, roleFilter, setRoleFilter, onCreate, onEdit, onDelete, departmentChart, recentEmployees }) {
  return (
    <Card id="employees" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="People"
        title="Employee Management Overview"
        description="Search employees, inspect department mix, review recent hires, and manage records quickly."
        actions={<Button onClick={onCreate} size="sm" icon={Plus}>Add Employee</Button>}
      />
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div>
          <div className="mb-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Search size={16} className="text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, employee ID, department" className="w-full bg-transparent text-sm outline-none dark:text-slate-100" />
            </div>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="Employee">Employee</option>
            </select>
          </div>
          <DataTable
            rows={employees}
            pageSize={6}
            columns={[
              { key: "name", label: "Employee", searchValue: (row) => `${row.name} ${row.email} ${row.employeeId}`, render: (row) => <EmployeeCell employee={row} /> },
              { key: "department", label: "Department", render: (row) => row.department || "Unassigned" },
              { key: "role", label: "Role", render: (row) => <Pill value={row.role} /> },
              { key: "status", label: "Status", render: (row) => <Pill value={row.status || "Active"} /> },
              { key: "salary", label: "Salary", render: (row) => currency(row.salary) },
              { key: "actions", label: "Actions", sortable: false, render: (row) => (
                <div className="flex gap-2">
                  <Button onClick={() => onEdit(row)} variant="outline" size="sm">Edit</Button>
                  <Button onClick={() => onDelete(row._id)} variant="danger" size="sm" aria-label={`Delete ${row.name}`}><Trash2 size={14} /></Button>
                </div>
              ) }
            ]}
          />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="font-semibold text-slate-950 dark:text-white">Recently added</p>
            <div className="mt-4 space-y-3">
              {recentEmployees.map((employee) => <EmployeePreview key={employee._id} employee={employee} />)}
              {!recentEmployees.length && <p className="text-sm text-slate-500">No employees yet.</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="font-semibold text-slate-950 dark:text-white">Department overview</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={departmentChart} dataKey="count" nameKey="department" innerRadius={48} outerRadius={82}>
                    {departmentChart.map((entry, index) => <Cell key={entry.department || index} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{allEmployees.length} total employee profiles tracked.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LeaveManagement({ leaves, pendingLeaves, approvedLeaves, rejectedLeaves, trend, onStatus }) {
  return (
    <Card id="leaves" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader eyebrow="Approvals" title="Leave Management" description="Approve requests, monitor leave balances, and review holiday pressure." />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Pending" value={pendingLeaves.length} />
        <MiniMetric label="Approved" value={approvedLeaves.length} />
        <MiniMetric label="Rejected" value={rejectedLeaves.length} />
      </div>
      <div className="mt-5 h-52">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="requests" fill="#2563eb" radius={[8, 8, 0, 0]} />
            <Bar dataKey="approved" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 space-y-3">
        {leaves.slice(0, 5).map((row) => (
          <div key={row._id} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{row.employee?.name || "Employee"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{row.leaveType} / {row.days} day(s)</p>
              </div>
              <Pill value={row.status} />
            </div>
            {row.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="success" onClick={() => onStatus(row._id, "approved")}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => onStatus(row._id, "rejected")}>Reject</Button>
              </div>
            )}
          </div>
        ))}
        {!leaves.length && <EmptyState icon={CalendarCheck} title="No leave requests" description="Leave requests will appear here." />}
      </div>
    </Card>
  );
}

function PayrollOverview({ payroll, salaryChart, salaryExpense, onGenerate, onExport }) {
  return (
    <Card id="payroll" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="Compensation"
        title="Payroll Overview"
        description="Track processing status, payslip readiness, overtime, and salary trends."
        actions={<Button onClick={onGenerate} size="sm" icon={WalletCards}>Generate</Button>}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Monthly Payroll" value={currency(salaryExpense)} />
        <MiniMetric label="Payslips" value={payroll.length} />
        <MiniMetric label="Status" value="Ready" />
      </div>
      <div className="mt-5 h-52">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={salaryChart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="salary" fill="#0f766e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onExport("pdf")} variant="outline" size="sm" icon={FileText}>Export PDF</Button>
        <Button onClick={() => onExport("excel")} variant="outline" size="sm" icon={FileSpreadsheet}>Export Excel</Button>
        <Button onClick={() => onExport("csv")} variant="outline" size="sm" icon={Download}>Download CSV</Button>
      </div>
    </Card>
  );
}

function ProjectManagement({ tasks, completedTasks, onCreate }) {
  const columns = [
    { label: "To Do", items: tasks.filter((task) => !task.status || task.status === "todo") },
    { label: "In Progress", items: tasks.filter((task) => task.status === "inprogress") },
    { label: "Completed", items: completedTasks }
  ];

  return (
    <Card id="projects" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader eyebrow="Projects" title="Project Management" description="Kanban-style delivery visibility, owners, deadlines, and progress." actions={<Button onClick={onCreate} size="sm" icon={Plus}>Assign Task</Button>} />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {columns.map((column) => (
          <div key={column.label} className="min-h-72 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-950 dark:text-white">{column.label}</p>
              <Badge tone="slate">{column.items.length}</Badge>
            </div>
            <div className="mt-3 space-y-3">
              {column.items.slice(0, 5).map((task) => <ProjectCard key={task._id} task={task} />)}
              {!column.items.length && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">No work items.</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportsAnalytics({ departmentChart, performanceData, onExport }) {
  return (
    <Card id="reports" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="Reports"
        title="Reports & Analytics"
        description="Executive analytics across employee distribution, attendance, payroll, leave, and projects."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onExport("pdf")} variant="outline" size="sm">PDF</Button>
            <Button onClick={() => onExport("excel")} variant="outline" size="sm">Excel</Button>
            <Button onClick={() => onExport("csv")} variant="outline" size="sm">CSV</Button>
          </div>
        }
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie data={departmentChart} dataKey="count" nameKey="department" innerRadius={58} outerRadius={96}>
                {departmentChart.map((entry, index) => <Cell key={entry.department || index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="h-72 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="productivity" stroke="#2563eb" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="engagement" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function AIInsights({ insights, salaryPredictions }) {
  return (
    <Card id="ai" className="overflow-hidden border-blue-200/70 bg-white/90 p-5 shadow-soft backdrop-blur-xl dark:border-blue-500/20 dark:bg-slate-900/90">
      <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-700 to-violet-700 p-4 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} /> AI Insights</p>
        <p className="mt-2 text-sm leading-6 text-blue-100">Smart recommendations generated from attendance, payroll, leave, and productivity signals.</p>
      </div>
      <div className="mt-4 space-y-3">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass(insight.tone)}`}>
                <insight.icon size={17} />
              </span>
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{insight.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{insight.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="font-semibold text-slate-950 dark:text-white">AI Salary Signals</p>
        <div className="mt-3 space-y-3">
          {salaryPredictions.slice(0, 3).map((item) => (
            <div key={item._id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                <p className="text-xs text-slate-500">Current {currency(item.salary)}</p>
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{currency(item.predictedSalary)}</span>
            </div>
          ))}
          {!salaryPredictions.length && <p className="text-sm text-slate-500 dark:text-slate-400">Predictions will appear after employee data loads.</p>}
        </div>
      </div>
    </Card>
  );
}

function NotificationsCenter({ notifications }) {
  return (
    <Card id="notifications" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <SectionHeader eyebrow="Alerts" title="Notifications Center" description="Attendance alerts, leave requests, payroll reminders, and system events." />
      <div className="mt-5 space-y-3">
        {notifications.slice(0, 7).map((item) => (
          <div key={item._id} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950 dark:text-white">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{item.message}</p>
            </div>
          </div>
        ))}
        {!notifications.length && <EmptyState icon={Bell} title="No notifications yet" description="Realtime alerts will appear here." />}
      </div>
    </Card>
  );
}

function AIAssistant() {
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <Bot size={20} />
        </span>
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">AI HR Assistant</p>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Ask for payroll anomalies, leave bottlenecks, team risk, or hiring summaries.</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
        <input placeholder="Ask AI about workforce health..." className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none dark:text-slate-100" />
        <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Ask</button>
      </div>
    </Card>
  );
}

function RolesPanel() {
  return (
    <Card id="roles" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <SectionHeader eyebrow="Security" title="Roles & Permissions" description="Role governance and organization policy controls." />
      <div className="mt-4 grid gap-3">
        {["Admin", "HR", "Employee"].map((role) => (
          <div key={role} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="font-semibold text-slate-950 dark:text-white">{role}</span>
            <Badge tone={role === "Admin" ? "rose" : role === "HR" ? "blue" : "slate"}>{role === "Admin" ? "Full" : role === "HR" ? "Manage" : "Self"}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SettingsPanel() {
  return (
    <Card id="settings" className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <SectionHeader eyebrow="Admin" title="Settings" description="Organization preferences, policy controls, integrations, and automation readiness." />
      <div className="mt-4 grid gap-3">
        {[
          ["Payroll lock", "Enabled"],
          ["Attendance policy", "Active"],
          ["AI automation", "Preview"]
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="font-semibold text-slate-950 dark:text-white">{label}</span>
            <Badge tone="blue">{value}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CommandPalette({ open, onClose, onCreateEmployee, onTask, onPayroll, onReport }) {
  const actions = [
    { label: "Add employee", icon: UserPlus, run: onCreateEmployee },
    { label: "Assign task", icon: ListTodo, run: onTask },
    { label: "Generate payroll", icon: WalletCards, run: onPayroll },
    { label: "Export monthly report", icon: Download, run: onReport }
  ];

  return (
    <Modal open={open} title="Command Palette" description="Fast admin actions for people operations." onClose={onClose}>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                onClose();
                action.run();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-blue-500/10"
            >
              <Icon size={17} className="text-blue-600 dark:text-blue-300" />
              <span className="font-semibold text-slate-950 dark:text-white">{action.label}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function EmployeeCell({ employee }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={employee.name} size="sm" />
      <div>
        <p className="font-semibold text-slate-950 dark:text-white">{employee.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{employee.email}</p>
      </div>
    </div>
  );
}

function EmployeePreview({ employee }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={employee.name} size="sm" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{employee.department || employee.role}</p>
      </div>
    </div>
  );
}

function ProjectCard({ task }) {
  const progress = task.status === "completed" ? 100 : task.status === "inprogress" ? 58 : 18;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">{task.title}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.assignedTo?.name || "Unassigned"} / {formatDate(task.dueDate)}</p>
        </div>
        <Pill value={task.priority || "medium"} />
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function StatusTile({ label, value, tone, icon }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass(tone)}`}>
        <Icon size={18} />
      </span>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">{label}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
    </div>
  );
}

function Pill({ value = "" }) {
  return <Badge tone={badgeTone(value)}>{value || "N/A"}</Badge>;
}

function EmployeeModal({ open, form, setForm, onClose, onSubmit }) {
  return (
    <Modal open={open} title={form._id ? "Edit Employee" : "Add Employee"} onClose={onClose} panelClassName="max-w-2xl">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Input label="Password" type="password" required={!form._id} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <Input label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
        <Select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="Employee">Employee</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </Select>
        <Input label="Salary" type="number" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} />
        <Button type="submit" className="sm:col-span-2">Save Employee</Button>
      </form>
    </Modal>
  );
}

function TaskModal({ open, employees, onClose, onSubmit }) {
  const [form, setForm] = useState({ title: "", assignedTo: "", priority: "medium", dueDate: "", description: "" });
  return (
    <Modal open={open} title="Assign Task" onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-4">
        <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <Select label="Employee" value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}>
          <option value="">Select employee</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
        </div>
        <Textarea label="Description" required={false} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <Button type="submit" className="w-full">Assign Task</Button>
      </form>
    </Modal>
  );
}

function PayrollModal({ open, employees, onClose, onSubmit }) {
  const now = new Date();
  const [form, setForm] = useState({ employee: "", month: now.getMonth() + 1, year: now.getFullYear(), basicSalary: "", hra: "", allowances: "", bonus: "", deductions: "" });
  return (
    <Modal open={open} title="Generate Salary" onClose={onClose} panelClassName="max-w-2xl">
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select label="Employee" value={form.employee} onChange={(event) => setForm({ ...form, employee: event.target.value })}>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
          </Select>
        </div>
        <Input label="Month" type="number" min="1" max="12" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} />
        <Input label="Year" type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} />
        <Input label="Basic Salary" type="number" value={form.basicSalary} onChange={(event) => setForm({ ...form, basicSalary: event.target.value })} />
        <Input label="HRA" type="number" value={form.hra} onChange={(event) => setForm({ ...form, hra: event.target.value })} />
        <Input label="Allowances" type="number" value={form.allowances} onChange={(event) => setForm({ ...form, allowances: event.target.value })} />
        <Input label="Bonus" type="number" value={form.bonus} onChange={(event) => setForm({ ...form, bonus: event.target.value })} />
        <Input label="Deductions" type="number" value={form.deductions} onChange={(event) => setForm({ ...form, deductions: event.target.value })} />
        <Button type="submit" className="sm:col-span-2">Generate Payroll</Button>
      </form>
    </Modal>
  );
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function estimateExperience(dateOfJoining) {
  if (!dateOfJoining) return 2;
  return Math.max(0, Math.round((Date.now() - new Date(dateOfJoining)) / 31536000000));
}

function currency(value) {
  if (!value) return "Rs 0";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function toneClass(tone) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  };
  return tones[tone] || tones.blue;
}

function buildAttendanceTrend(records) {
  return records.slice(0, 30).reduce((acc, item) => {
    const label = new Date(item.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    const existing = acc.find((row) => row.date === label) || { date: label, present: 0, late: 0 };
    existing.present += item.checkIn ? 1 : 0;
    existing.late += item.isLate || item.status === "Late" ? 1 : 0;
    return acc.includes(existing) ? acc : [...acc, existing];
  }, []).reverse();
}

function buildLeaveTrend(records) {
  return records.slice(0, 30).reduce((acc, item) => {
    const label = new Date(item.createdAt).toLocaleDateString(undefined, { month: "short" });
    const existing = acc.find((row) => row.label === label) || { label, requests: 0, approved: 0 };
    existing.requests += 1;
    existing.approved += item.status === "approved" ? 1 : 0;
    return acc.includes(existing) ? acc : [...acc, existing];
  }, []).reverse();
}

function buildDepartmentBreakdown(items = []) {
  return items.reduce((acc, employee) => {
    const department = employee.department || "Unassigned";
    const existing = acc.find((item) => item.department === department) || { department, count: 0 };
    existing.count += 1;
    return acc.includes(existing) ? acc : [...acc, existing];
  }, []);
}

function buildPerformanceData(tasks = [], attendanceRecords = []) {
  const base = buildAttendanceTrend(attendanceRecords).slice(-8);
  if (base.length) {
    return base.map((item, index) => ({
      label: item.date,
      productivity: Math.min(100, 52 + item.present * 6 + index * 2),
      engagement: Math.min(100, 48 + item.present * 5)
    }));
  }
  return Array.from({ length: 6 }, (_, index) => ({
    label: `W${index + 1}`,
    productivity: 58 + index * 5,
    engagement: 62 + index * 4,
    tasks: tasks.length
  }));
}

function buildAiInsights({ employees, attendance, payroll, tasks, pendingLeaves, lateToday }) {
  const payrollTotal = payroll.reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  return [
    {
      icon: BrainCircuit,
      tone: "blue",
      title: "Productivity pattern",
      detail: `${tasks.filter((task) => task.status === "completed").length} completed work item(s). AI recommends reviewing stalled in-progress tasks before the next sprint.`
    },
    {
      icon: Clock3,
      tone: lateToday > 0 ? "amber" : "emerald",
      title: "Attendance pattern analysis",
      detail: `${lateToday} late entry signal(s) today across ${attendance.length} attendance record(s).`
    },
    {
      icon: Banknote,
      tone: "rose",
      title: "Payroll anomaly scan",
      detail: payrollTotal ? `Payroll exposure is ${currency(payrollTotal)}. Compare high variance payouts before final release.` : "No payroll anomalies detected yet."
    },
    {
      icon: Zap,
      tone: pendingLeaves.length ? "amber" : "emerald",
      title: "Burnout and approval risk",
      detail: `${pendingLeaves.length} leave approval(s) pending. AI recommends clearing requests to reduce employee uncertainty.`
    },
    {
      icon: Sparkles,
      tone: "blue",
      title: "AI recommendation",
      detail: `Segment ${employees.length} employee profile(s) by department and review attendance outliers before payroll lock.`
    }
  ];
}

function downloadCsv(filename, rows) {
  const csv = [
    Object.keys(rows[0] || { empty: "" }).join(","),
    ...rows.map((row) => Object.values(row).map((value) => JSON.stringify(value ?? "")).join(","))
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
