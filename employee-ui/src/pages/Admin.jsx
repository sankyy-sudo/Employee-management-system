import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle,
  Banknote,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarCheck,
  Download,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Smile,
  Trash2,
  UserCheck,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
import api from "../lib/api";
import { fetchAttendanceDashboard } from "../store/attendanceSlice";
import { fetchAdminAnalytics } from "../store/analyticsSlice";
import { deleteEmployee, fetchEmployees, saveEmployee } from "../store/employeeSlice";
import { fetchLeaveDashboard, updateLeaveStatus } from "../store/leaveSlice";
import { fetchNotifications } from "../store/notificationSlice";
import { fetchPayrollDashboard, generatePayroll } from "../store/payrollSlice";
import { createTask, fetchTasks } from "../store/taskSlice";
import { formatDate, formatTime, humanizeTaskStatus } from "../utils/format";

const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const emptyEmployee = { name: "", email: "", password: "", role: "employee", department: "", phone: "", salary: "" };

export default function Admin() {
  const dispatch = useDispatch();
  const [employeeModal, setEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [taskModal, setTaskModal] = useState(false);
  const [payrollModal, setPayrollModal] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [salaryPredictions, setSalaryPredictions] = useState([]);

  const employees = useSelector((state) => state.employees);
  const attendance = useSelector((state) => state.attendance);
  const leave = useSelector((state) => state.leave);
  const payroll = useSelector((state) => state.payroll);
  const tasks = useSelector((state) => state.tasks);
  const analytics = useSelector((state) => state.analytics);
  const notifications = useSelector((state) => state.notifications);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchAttendanceDashboard());
    dispatch(fetchLeaveDashboard());
    dispatch(fetchPayrollDashboard());
    dispatch(fetchTasks());
    dispatch(fetchAdminAnalytics());
    dispatch(fetchNotifications());
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
  const pendingLeaves = leave.history.filter((item) => item.status === "pending");
  const activeTasks = tasks.items.filter((task) => task.status !== "completed");
  const salaryExpense = payroll.history.reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  const faceLogs = attendance.history.filter((item) => item.faceVerified || item.faceMatchScore !== null).slice(0, 8);
  const stressedMoods = analytics.moods.filter((item) => ["stressed", "angry"].includes(item.mood)).slice(0, 5);
  const loading = employees.loading || attendance.loading || leave.loading || payroll.loading || tasks.loading || analytics.loading;
  const error = employees.error || attendance.error || leave.error || payroll.error || tasks.error || analytics.error;

  const filteredEmployees = employees.items.filter((employee) => {
    const term = search.toLowerCase();
    const matchesSearch = [employee.name, employee.email, employee.department].some((value) =>
      String(value || "").toLowerCase().includes(term)
    );
    return matchesSearch && (roleFilter === "all" || employee.role === roleFilter);
  });

  const attendanceTrend = buildAttendanceTrend(attendance.history);
  const leaveTrend = buildLeaveTrend(leave.history);
  const salaryChart = payroll.history.slice(0, 6).reverse().map((item) => ({
    label: `${item.month}/${String(item.year).slice(-2)}`,
    salary: item.netSalary || 0
  }));
  const departmentChart = analytics.summary?.departmentBreakdown || [];

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
      role: employee.role || "employee",
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
    link.download = `monthly-report.${format === "pdf" ? "pdf" : "csv"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Organization Command Center</h1>
            <p className="mt-2 text-slate-500">Monitor workforce health, approve operations, and act on salary, leave, and attendance signals.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openCreateEmployee} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
              <Plus size={16} /> Add Employee
            </button>
            <button onClick={() => exportMonthlyReport("pdf")} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
              <Download size={16} /> Monthly PDF
            </button>
          </div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <DashboardCard icon={Users} title="Total Employees" value={employees.items.length} detail="+ stable workforce" />
            <DashboardCard icon={UserCheck} tone="emerald" title="Present Today" value={presentToday} detail="Live attendance" />
            <DashboardCard icon={AlertTriangle} tone="rose" title="Absent Today" value={absentToday} detail="Needs review" />
            <DashboardCard icon={CalendarCheck} tone="amber" title="Pending Leaves" value={pendingLeaves.length} detail="Awaiting action" />
            <DashboardCard icon={Banknote} tone="blue" title="Salary Expense" value={currency(salaryExpense)} detail="Processed payroll" />
            <DashboardCard icon={BriefcaseBusiness} tone="slate" title="Active Tasks" value={activeTasks.length} detail="Open work items" />
          </div>
        )}

        <section id="employees" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Employee Management</h2>
              <p className="mt-1 text-sm text-slate-500">Search, filter, edit roles, assign departments, and manage employee records.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" className="bg-transparent text-sm outline-none" />
              </div>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none">
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <DataTable
              rows={filteredEmployees}
              columns={[
                { key: "name", label: "Employee", render: (row) => <div><p className="font-semibold text-slate-950">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
                { key: "department", label: "Department", render: (row) => row.department || "Unassigned" },
                { key: "role", label: "Role", render: (row) => <Pill value={row.role} /> },
                { key: "status", label: "Status", render: (row) => <Pill value={row.status || "Active"} /> },
                { key: "salary", label: "Salary", render: (row) => currency(row.salary) },
                { key: "actions", label: "Actions", render: (row) => (
                  <div className="flex gap-2">
                    <button onClick={() => openEditEmployee(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">Edit</button>
                    <button onClick={() => dispatch(deleteEmployee(row._id))} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"><Trash2 size={14} /></button>
                  </div>
                ) }
              ]}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]" id="attendance">
          <Panel title="Attendance Monitoring" description="Daily attendance, late indicators, face logs, and trend export.">
            <div className="grid gap-4 md:grid-cols-3">
              <MiniMetric label="Today Records" value={todayRecords.length} />
              <MiniMetric label="Late Check-ins" value={todayRecords.filter((item) => item.isLate || item.status === "Late").length} />
              <MiniMetric label="Face Verified" value={todayRecords.filter((item) => item.faceVerified).length} />
            </div>
            <div className="mt-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area dataKey="present" stroke="#2563eb" fill="#dbeafe" />
                  <Area dataKey="late" stroke="#f59e0b" fill="#fef3c7" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <button onClick={() => downloadCsv("attendance.csv", attendance.history)} className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Export Attendance</button>
          </Panel>

          <Panel title="Face Recognition Logs" description="Face check-ins and fraud flags.">
            <DataTable
              rows={faceLogs}
              empty="No face recognition logs yet."
              columns={[
                { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
                { key: "checkIn", label: "Check-in", render: (row) => formatTime(row.checkIn) },
                { key: "score", label: "Score", render: (row) => row.faceMatchScore ? row.faceMatchScore.toFixed(2) : "--" },
                { key: "fraud", label: "Flag", render: (row) => <Pill value={row.faceVerified && (!row.faceMatchScore || row.faceMatchScore >= 0.9) ? "clear" : "review"} /> }
              ]}
            />
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2" id="leaves">
          <Panel title="Leave Management" description="Approve or reject leave requests and monitor trends.">
            <DataTable
              rows={leave.history.slice(0, 8)}
              columns={[
                { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
                { key: "leaveType", label: "Type" },
                { key: "days", label: "Days" },
                { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> },
                { key: "actions", label: "Actions", render: (row) => row.status === "pending" ? (
                  <div className="flex gap-2">
                    <button onClick={() => dispatch(updateLeaveStatus({ id: row._id, status: "approved" }))} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Approve</button>
                    <button onClick={() => dispatch(updateLeaveStatus({ id: row._id, status: "rejected" }))} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Reject</button>
                  </div>
                ) : "-" }
              ]}
            />
          </Panel>
          <Panel title="Leave Trends" description="Monthly leave approvals and requests.">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leaveTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="requests" fill="#2563eb" radius={[8, 8, 0, 0]} />
                <Bar dataKey="approved" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" id="payroll">
          <Panel title="Payroll Management" description="Generate salaries, review breakdowns, and compare salary history.">
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => setPayrollModal(true)} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Generate Salary</button>
              <button onClick={() => exportMonthlyReport("excel")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Export Excel</button>
            </div>
            <DataTable
              rows={payroll.history.slice(0, 6)}
              columns={[
                { key: "employee", label: "Employee", render: (row) => row.employee?.name || "Employee" },
                { key: "period", label: "Period", render: (row) => `${row.month}/${row.year}` },
                { key: "netSalary", label: "Net", render: (row) => currency(row.netSalary) },
                { key: "status", label: "Status", render: (row) => <Pill value={row.status} /> }
              ]}
            />
          </Panel>
          <Panel title="Salary History" description="Net salary distribution across processed payroll.">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salaryChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="salary" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]" id="tasks">
          <Panel title="Task Management" description="Assign tasks and track delivery status.">
            <div className="mb-4">
              <button onClick={() => setTaskModal(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Assign Task</button>
            </div>
            <DataTable
              rows={tasks.items.slice(0, 8)}
              columns={[
                { key: "title", label: "Task" },
                { key: "assignedTo", label: "Owner", render: (row) => row.assignedTo?.name || "Employee" },
                { key: "dueDate", label: "Deadline", render: (row) => formatDate(row.dueDate) },
                { key: "priority", label: "Priority", render: (row) => <Pill value={row.priority || "medium"} /> },
                { key: "status", label: "Status", render: (row) => <Pill value={humanizeTaskStatus(row.status)} /> }
              ]}
            />
          </Panel>
          <Panel title="Notifications" description="Recent operational alerts.">
            <div className="space-y-3">
              {notifications.items.slice(0, 6).map((item) => (
                <div key={item._id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.message}</p>
                </div>
              ))}
              {!notifications.items.length && <Empty text="No notifications yet." />}
            </div>
          </Panel>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3" id="reports">
          <Panel title="Analytics & Reports" description="Attendance, leaves, salary, and department metrics.">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={departmentChart} dataKey="count" nameKey="department" innerRadius={50} outerRadius={82}>
                  {departmentChart.map((entry, index) => <Cell key={entry.department} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Panel>
          <Panel title="AI Salary Prediction" description="Suggested salary compared with current salary.">
            <div className="space-y-3">
              {salaryPredictions.map((item) => (
                <div key={item._id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">Current {currency(item.salary)}</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-700">{currency(item.predictedSalary)}</p>
                  </div>
                </div>
              ))}
              {!salaryPredictions.length && <Empty text="No predictions available." />}
            </div>
          </Panel>
          <Panel title="Mood Analytics" description="Weekly wellbeing and stressed employee alerts.">
            <div className="space-y-3">
              {stressedMoods.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-2xl bg-amber-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-950">{item.employee?.name || "Employee"}</p>
                    <p className="text-sm text-amber-700">{item.mood} - {formatDate(item.createdAt)}</p>
                  </div>
                  <Smile className="text-amber-600" size={20} />
                </div>
              ))}
              {!stressedMoods.length && <Empty text="No stressed mood alerts." />}
            </div>
          </Panel>
        </div>

        <section id="settings" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-slate-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Settings</h2>
              <p className="mt-1 text-sm text-slate-500">Role access, policy configuration, and organization preferences can live here as the product grows.</p>
            </div>
          </div>
        </section>
      </div>

      <EmployeeModal open={employeeModal} form={employeeForm} setForm={setEmployeeForm} onClose={() => setEmployeeModal(false)} onSubmit={handleEmployeeSubmit} />
      <TaskModal open={taskModal} employees={employees.items} onClose={() => setTaskModal(false)} onSubmit={async (payload) => { await dispatch(createTask(payload)).unwrap(); setTaskModal(false); }} />
      <PayrollModal open={payrollModal} employees={employees.items} onClose={() => setPayrollModal(false)} onSubmit={async (payload) => { await dispatch(generatePayroll(payload)).unwrap(); setPayrollModal(false); }} />
    </Layout>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Pill({ value = "" }) {
  const normalized = String(value).toLowerCase();
  const className = normalized.includes("approved") || normalized.includes("active") || normalized.includes("clear") || normalized.includes("completed")
    ? "bg-emerald-50 text-emerald-700"
    : normalized.includes("pending") || normalized.includes("review") || normalized.includes("high")
      ? "bg-amber-50 text-amber-700"
      : normalized.includes("rejected") || normalized.includes("urgent") || normalized.includes("angry")
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{value || "N/A"}</span>;
}

function Empty({ text }) {
  return <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">{text}</p>;
}

function EmployeeModal({ open, form, setForm, onClose, onSubmit }) {
  return (
    <Modal open={open} title={form._id ? "Edit Employee" : "Add Employee"} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Input label="Password" type="password" required={!form._id} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <Input label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
        <Select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="employee">Employee</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </Select>
        <Input label="Salary" type="number" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} />
        <button className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white sm:col-span-2">Save Employee</button>
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
        <button className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Assign Task</button>
      </form>
    </Modal>
  );
}

function PayrollModal({ open, employees, onClose, onSubmit }) {
  const now = new Date();
  const [form, setForm] = useState({ employee: "", month: now.getMonth() + 1, year: now.getFullYear(), basicSalary: "", hra: "", allowances: "", bonus: "", deductions: "" });
  return (
    <Modal open={open} title="Generate Salary" onClose={onClose}>
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
        <button className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white sm:col-span-2">Generate Payroll</button>
      </form>
    </Modal>
  );
}

function Input({ label, required = true, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...props} required={required} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
    </label>
  );
}

function Select({ label, children, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select {...props} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-blue-500">
        {children}
      </select>
    </label>
  );
}

function isToday(value) {
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
