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
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  Landmark,
  Mail,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";
import getSocket from "../lib/socket";

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

export default function Payroll() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [salaryFilter, setSalaryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("");
  const [payrollModal, setPayrollModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [message, setMessage] = useState("");

  const isAdmin = user?.role === "admin";

  const loadData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [payrollRes, employeeRes] = await Promise.all([api.get("/payrolls"), api.get("/employees")]);
      setPayrolls(payrollRes.data || []);
      setEmployees(employeeRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    if (!isAdmin) {
      return () => {
        active = false;
      };
    }

    Promise.all([api.get("/payrolls"), api.get("/employees")]).then((responses) => {
      if (!active) return;
      setPayrolls(responses[0].data || []);
      setEmployees(responses[1].data || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (user?._id || user?.id) socket.emit("join", user._id || user.id);
    };
    const handleDisconnect = () => setSocketConnected(false);
    const handlePayrollUpdate = (event) => {
      if (event?.payroll?._id) {
        setPayrolls((current) => upsertPayroll(current, event.payroll));
        setSelectedPayroll((current) => current?._id === event.payroll._id ? event.payroll : current);
      }
      setActivityFeed((current) => [buildPayrollActivity(event), ...current].slice(0, 8));
      setMessage(event?.message || "Payroll updated in real time.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("payroll:updated", handlePayrollUpdate);

    if (!socket.connected) socket.connect();
    else handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("payroll:updated", handlePayrollUpdate);
    };
  }, [isAdmin, user]);

  const filteredPayrolls = useMemo(() => {
    const term = query.trim().toLowerCase();
    return payrolls.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || item.employee?.department === departmentFilter;
      const salary = Number(item.netSalary || 0);
      const matchesSalary = salaryFilter === "all"
        || (salaryFilter === "low" && salary < 50000)
        || (salaryFilter === "mid" && salary >= 50000 && salary < 100000)
        || (salaryFilter === "high" && salary >= 100000);
      const matchesPeriod = !periodFilter || `${item.year}-${String(item.month).padStart(2, "0")}` === periodFilter;
      const searchText = [
        item.employee?.name,
        item.employee?.employeeId,
        item.employee?.email,
        item.employee?.department,
        item.status,
        item.month,
        item.year,
        item.netSalary
      ].join(" ").toLowerCase();
      return matchesStatus && matchesDepartment && matchesSalary && matchesPeriod && (!term || searchText.includes(term));
    });
  }, [payrolls, query, statusFilter, departmentFilter, salaryFilter, periodFilter]);

  const latest = payrolls[0] || null;
  const netTotal = payrolls.reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  const deductionTotal = payrolls.reduce((sum, item) => sum + Number(item.deductions || 0), 0);
  const bonusTotal = payrolls.reduce((sum, item) => sum + Number(item.bonus || 0), 0);
  const overtimeTotal = payrolls.reduce((sum, item) => sum + Number(item.overtimeAmount || 0), 0);
  const processedEmployees = new Set(payrolls.map((item) => String(item.employee?._id || item.employee))).size;
  const paidCount = payrolls.filter((item) => item.status === "paid").length;
  const pendingApprovals = payrolls.filter((item) => ["pending", "draft", "processed"].includes(item.status));
  const approvedCount = payrolls.filter((item) => ["approved", "paid"].includes(item.status)).length;
  const processingRate = payrolls.length ? Math.round((payrolls.filter((item) => ["approved", "paid"].includes(item.status)).length / payrolls.length) * 100) : 0;
  const departments = useMemo(() => Array.from(new Set(payrolls.map((item) => item.employee?.department).filter(Boolean))), [payrolls]);
  const payrollTrend = buildPayrollTrend(payrolls);
  const salaryDistribution = buildSalaryDistribution(payrolls);
  const departmentAnalytics = buildDepartmentAnalytics(payrolls, employees);
  const deductionBreakdown = buildDeductionBreakdown(latest);
  const compensationInsights = buildCompensationInsights(payrolls);

  const downloadPayslip = async (payroll) => {
    const { data } = await api.get(`/payrolls/${payroll._id}/payslip`, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payslip-${payroll.month}-${payroll.year}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPayrollCsv = () => {
    const rows = filteredPayrolls.map((item) => ({
      employee: item.employee?.name || "Employee",
      department: item.employee?.department || "",
      period: `${item.month}/${item.year}`,
      basicSalary: item.basicSalary,
      hra: item.hra,
      allowances: item.allowances,
      bonus: item.bonus,
      deductions: item.deductions,
      netSalary: item.netSalary,
      status: item.status
    }));
    downloadCsv("payroll-report.csv", rows);
  };

  const createPayroll = async (payload) => {
    setMessage("");
    const { data } = await api.post("/payrolls", payload);
    setPayrolls((current) => upsertPayroll(current, data));
    setPayrollModal(false);
    setMessage("Payroll generated successfully.");
    await loadData();
  };

  const updatePayroll = async (payroll, payload) => {
    const baseDeductions = Math.max(0, Number(payroll.deductions || 0) - Number(payroll.taxDeduction || 0) - Number(payroll.leaveDeduction || 0));
    const deductionDelta = payload.deductions === undefined ? 0 : Number(payload.deductions || 0) - Number(payroll.deductions || 0);
    const requestPayload = {
      employee: payroll.employee?._id || payroll.employee,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.basicSalary,
      hra: payroll.hra,
      allowances: payroll.allowances,
      bonus: payroll.bonus,
      attendancePercentage: payroll.attendancePercentage,
      overtimeHours: payroll.overtimeHours,
      overtimeAmount: payroll.overtimeAmount,
      taxDeduction: payroll.taxDeduction,
      leaveDeduction: payroll.leaveDeduction,
      status: payroll.status,
      notes: payroll.notes,
      ...payload,
      deductions: Math.max(0, baseDeductions + deductionDelta)
    };
    const { data } = await api.put(`/payrolls/${payroll._id}`, requestPayload);
    setPayrolls((current) => upsertPayroll(current, data));
    setSelectedPayroll((current) => current?._id === payroll._id ? data : current);
    setMessage(payload.status === "approved" ? "Payroll approved successfully." : "Payroll updated successfully.");
  };

  const exportPayrollJson = () => {
    const blob = new Blob([JSON.stringify(filteredPayrolls, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payroll-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl">
          <Card className="p-6">
            <EmptyState icon={ShieldCheck} title="Access Denied" description="Payroll Management is available only for admin users." />
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1600px] space-y-6">
        <Motion.section variants={itemMotion} className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">Payroll command center</Badge>
                <Badge tone={processingRate >= 80 ? "emerald" : "amber"}>{processingRate}% processed</Badge>
                <Badge tone="slate">{payrolls.length} records</Badge>
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Admin Payroll Operations</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Payroll visibility with enterprise-grade clarity.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Review salary, deductions, bonuses, payslips, payment history, and payroll analytics in one polished workspace.
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroMetric icon={WalletCards} label="Net payroll" value={currency(netTotal)} tone="blue" />
                <HeroMetric icon={TrendingDown} label="Deductions" value={currency(deductionTotal)} tone="amber" />
                <HeroMetric icon={Sparkles} label="Bonuses" value={currency(bonusTotal)} tone="emerald" />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-7 xl:border-l xl:border-t-0">
              <SectionLabel icon={ShieldCheck} title="Real-time payroll status" />
              <div className="mt-5 space-y-3">
                <BriefRow label="Paid records" value={paidCount} tone="emerald" />
                <BriefRow label="Pending approvals" value={pendingApprovals.length} tone="amber" />
                <BriefRow label="Approved" value={approvedCount} tone="blue" />
                <BriefRow label="Latest period" value={latest ? `${latest.month}/${latest.year}` : "--"} tone="slate" />
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
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={Banknote} title="Total Payroll Processed" value={currency(netTotal)} detail={`${processingRate}% approved or paid`} tone="blue" data={payrollTrend.map((item) => item.net)} />
            <KpiCard icon={Clock3} title="Pending Payroll Approvals" value={pendingApprovals.length} detail="Awaiting admin approval" tone="amber" data={buildMiniSeries(pendingApprovals.length)} />
            <KpiCard icon={CreditCard} title="Total Salary Paid" value={currency(netTotal)} detail={`${paidCount} marked paid`} tone="emerald" data={payrollTrend.map((item) => item.net)} />
            <KpiCard icon={CalendarClock} title="Overtime Payments" value={currency(overtimeTotal)} detail="Attendance-based overtime" tone="blue" data={buildMiniSeries(overtimeTotal)} />
            <KpiCard icon={Sparkles} title="Bonus Distribution" value={currency(bonusTotal)} detail="Incentives applied" tone="emerald" data={buildMiniSeries(bonusTotal)} />
            <KpiCard icon={UserRound} title="Employees Processed" value={processedEmployees} detail="Unique payroll employees" tone="blue" data={buildMiniSeries(processedEmployees)} />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader
              eyebrow="Salary"
              title="Salary Overview"
              description="Interactive compensation composition with live payroll status."
              actions={<Button onClick={() => setPayrollModal(true)} icon={Plus}>Generate Payroll</Button>}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SalaryTile label="Basic Salary" value={currency(latest?.basicSalary)} icon={Banknote} />
              <SalaryTile label="HRA" value={currency(latest?.hra)} icon={WalletCards} />
              <SalaryTile label="Allowances" value={currency(latest?.allowances)} icon={Sparkles} />
              <SalaryTile label="Bonus" value={currency(latest?.bonus)} icon={TrendingUp} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <CircularPayroll value={processingRate} label="Processing status" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-semibold text-slate-950 dark:text-white">Payroll processing status</p>
                <div className="mt-4 space-y-3">
                  <ProgressRow label="Gross to net accuracy" value={94} tone="blue" />
                  <ProgressRow label="Payslip readiness" value={payrolls.length ? 100 : 0} tone="emerald" />
                  <ProgressRow label="Payment completion" value={payrolls.length ? Math.round((paidCount / payrolls.length) * 100) : 0} tone="amber" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Payslips" title="Payslip Management" description="Preview salary structure and download generated payslips." actions={<div className="flex flex-wrap gap-2"><Button onClick={exportPayrollCsv} variant="outline" icon={Download}>CSV</Button><Button onClick={exportPayrollJson} variant="outline" icon={Download}>JSON</Button></div>} />
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(130px,0.5fr))]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Search size={16} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search employee, department, period"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100"
                  aria-label="Search payroll"
                />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Filter size={16} className="text-slate-400" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter payroll status">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="processed">Processed</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <UserRound size={16} className="text-slate-400" />
                <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter department">
                  <option value="all">All departments</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Banknote size={16} className="text-slate-400" />
                <select value={salaryFilter} onChange={(event) => setSalaryFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter salary range">
                  <option value="all">All salary</option>
                  <option value="low">&lt; 50k</option>
                  <option value="mid">50k - 100k</option>
                  <option value="high">100k+</option>
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <CalendarClock size={16} className="text-slate-400" />
                <input value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)} type="month" className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100" aria-label="Filter payroll period" />
              </label>
            </div>
            <PayslipList rows={filteredPayrolls.slice(0, 6)} onDownload={downloadPayslip} onView={setSelectedPayroll} onUpdate={updatePayroll} />
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Deductions" title="Tax & Deduction Breakdown" description="Visualize statutory deductions, leave impact, and net-pay movement." />
            <div className="mt-6 grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deductionBreakdown} innerRadius={50} outerRadius={82} dataKey="value" paddingAngle={4}>
                      {deductionBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {deductionBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />{item.name}</span>
                    <span className="font-bold text-slate-950 dark:text-white">{currency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Compensation" title="Employee Payroll Table" description="Attendance-aware payroll ledger with approval, payslip, bonus, deduction, and salary actions." />
            <CompensationTable rows={filteredPayrolls} onDownload={downloadPayslip} onView={setSelectedPayroll} onUpdate={updatePayroll} />
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-3">
          <AnalyticsCard title="Monthly Payroll Trends" description="Gross salary, net pay, and deductions over time.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={payrollTrend}>
                <defs>
                  <linearGradient id="payrollFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="net" stroke="#2563EB" strokeWidth={3} fill="url(#payrollFill)" />
                <Area type="monotone" dataKey="deductions" stroke="#F59E0B" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Salary Distribution" description="Compensation bands across generated payroll.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salaryDistribution}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Department Payroll" description="Department-wise compensation exposure.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentAnalytics}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="department" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Insights" title="Compensation Insights" description="Bonus, deduction, and net-pay quality signals." />
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {compensationInsights.map((item) => <InsightCard key={item.label} item={item} />)}
            </div>
          </Card>

          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="History" title="Payment History" actions={<Badge tone="blue">{payrolls.length} payments</Badge>} />
            <div className="mt-5 space-y-3">
              {payrolls.slice(0, 5).map((item) => <PaymentHistoryItem key={item._id} item={item} />)}
              {!payrolls.length && <EmptyState icon={ReceiptText} title="No payroll history yet" description="Generated payroll records will appear here." />}
            </div>
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion}>
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Realtime" title="Payroll Activity & Alerts" description="Pending approvals, salary generation, payslip downloads, and payroll update events." actions={<LiveSyncBadge connected={socketConnected} />} />
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AlertTile icon={Clock3} label="Pending approvals" value={pendingApprovals.length} tone="amber" />
              <AlertTile icon={CheckCircle2} label="Approved payroll" value={approvedCount} tone="emerald" />
              <AlertTile icon={CalendarClock} label="Missing attendance risk" value={payrolls.filter((item) => Number(item.attendancePercentage || 0) < 50).length} tone="rose" />
              <AlertTile icon={FileText} label="Payslips ready" value={payrolls.length} tone="blue" />
            </div>
            <div className="mt-5 space-y-3">
              {activityFeed.map((event) => <ActivityItem key={event.id} event={event} />)}
              {!activityFeed.length && <EmptyState icon={ReceiptText} title="No live payroll updates yet" description="Payroll generation and approval updates will appear here." />}
            </div>
          </Card>
        </Motion.section>
      </Motion.div>

      <PayrollDetailsDrawer payroll={selectedPayroll} onClose={() => setSelectedPayroll(null)} onDownload={downloadPayslip} onUpdate={updatePayroll} />
      <PayrollModal open={payrollModal} employees={employees} onClose={() => setPayrollModal(false)} onSubmit={createPayroll} />
    </Layout>
  );
}

function PayslipList({ rows, onDownload, onView, onUpdate }) {
  return (
    <div className="mt-5 space-y-3">
      {rows.map((item) => (
        <Motion.div key={item._id} whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <FileText size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{item.employee?.name || "Employee"} - {item.month}/{item.year}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Net {currency(item.netSalary)} - Gross {currency(grossSalary(item))}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              <Button onClick={() => onView(item)} variant="outline" size="sm" icon={Eye}>View</Button>
              {item.status !== "approved" && <Button onClick={() => onUpdate(item, { status: "approved" })} variant="success" size="sm" icon={CheckCircle2}>Approve</Button>}
              <Button onClick={() => onDownload(item)} variant="outline" size="sm" icon={Download}>Payslip</Button>
            </div>
          </div>
        </Motion.div>
      ))}
      {!rows.length && <EmptyState icon={ReceiptText} title="No payslips found" description="Generated payslips will appear here." />}
    </div>
  );
}

function CompensationTable({ rows, onDownload, onView, onUpdate }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-auto">
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {["Photo", "Employee Name", "Employee ID", "Department", "Salary", "Attendance %", "Overtime Hours", "Bonus", "Deductions", "Net Salary", "Payroll Status", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item._id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                <td className="px-4 py-4"><PayrollAvatar name={item.employee?.name} status={item.status} /></td>
                <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{item.employee?.name || "Employee"}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{item.employee?.employeeId || "EMS"}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{item.employee?.department || "Team"}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{currency(item.basicSalary)}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{Number(item.attendancePercentage ?? 100)}%</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{Number(item.overtimeHours || 0).toFixed(1)}h</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{currency(item.bonus)}</td>
                <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{currency(item.deductions)}</td>
                <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{currency(item.netSalary)}</td>
                <td className="px-4 py-4"><Badge tone={statusTone(item.status)}>{item.status}</Badge></td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => onView(item)} variant="outline" size="sm" icon={Eye}>View</Button>
                    <Button onClick={() => onDownload(item)} variant="outline" size="sm" icon={Download}>PDF</Button>
                    {item.status !== "approved" && <Button onClick={() => onUpdate(item, { status: "approved" })} variant="success" size="sm" icon={CheckCircle2}>Approve</Button>}
                    <Button onClick={() => onUpdate(item, { bonus: Number(item.bonus || 0) + 1000 })} variant="outline" size="sm" icon={Plus}>Bonus</Button>
                    <Button onClick={() => onUpdate(item, { deductions: Number(item.deductions || 0) + 500 })} variant="outline" size="sm" icon={TrendingDown}>Deduct</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="p-4"><EmptyState icon={InboxIcon} title="No compensation records" description="Try changing search or filters." /></div>}
    </div>
  );
}

function PayrollDetailsDrawer({ payroll, onClose, onDownload, onUpdate }) {
  return (
    <Modal open={Boolean(payroll)} title="Payroll Details" description="Salary structure, attendance calculation, payslip history, and approval workflow." onClose={onClose} panelClassName="max-w-5xl p-0">
      {payroll && (
        <div className="px-6 pb-6">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start gap-4">
                <PayrollAvatar name={payroll.employee?.name} status={payroll.status} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">{payroll.employee?.name || "Employee"}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{payroll.employee?.employeeId || "EMS"} / {payroll.employee?.department || "Team"}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{payroll.employee?.designation || "Team Member"}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                <DetailLine label="Payroll Period" value={`${payroll.month}/${payroll.year}`} />
                <DetailLine label="Attendance" value={`${Number(payroll.attendancePercentage ?? 100)}%`} />
                <DetailLine label="Overtime Hours" value={`${Number(payroll.overtimeHours || 0).toFixed(1)}h`} />
                <DetailLine label="Payment Status" value={payroll.status} />
                <DetailLine label="Generated" value={formatDate(payroll.createdAt)} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionLabel icon={Banknote} title="Salary Information" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <DetailLine label="Base Salary" value={currency(payroll.basicSalary)} />
                  <DetailLine label="Attendance-Based" value={currency(Math.round(Number(payroll.basicSalary || 0) * Number(payroll.attendancePercentage ?? 100) / 100))} />
                  <DetailLine label="Overtime Amount" value={currency(payroll.overtimeAmount)} />
                  <DetailLine label="Bonus Amount" value={currency(payroll.bonus)} />
                  <DetailLine label="Tax Deduction" value={currency(payroll.taxDeduction)} />
                  <DetailLine label="Leave Deduction" value={currency(payroll.leaveDeduction)} />
                  <DetailLine label="Other Deductions" value={currency(payroll.deductions)} />
                  <DetailLine label="Final Salary" value={currency(payroll.netSalary)} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionLabel icon={ReceiptText} title="Payslip Section" />
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{payroll.notes || "Attendance, leave, overtime, bonus, and deduction calculations are ready for this payroll period."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => onDownload(payroll)} variant="outline" size="sm" icon={Download}>Download PDF</Button>
                  <Button onClick={() => onDownload(payroll)} variant="outline" size="sm" icon={Eye}>Preview Payslip</Button>
                  <Button variant="outline" size="sm" icon={Mail}>Send Email</Button>
                  <Button onClick={() => onUpdate(payroll, { status: "approved" })} disabled={payroll.status === "approved"} variant="success" size="sm" icon={CheckCircle2}>Approve Payroll</Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionLabel icon={Edit3} title="Quick Adjustments" />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => onUpdate(payroll, { basicSalary: Number(payroll.basicSalary || 0) + 1000 })} variant="outline" size="sm" icon={Edit3}>Edit Salary</Button>
                  <Button onClick={() => onUpdate(payroll, { bonus: Number(payroll.bonus || 0) + 1000 })} variant="outline" size="sm" icon={Plus}>Add Bonus</Button>
                  <Button onClick={() => onUpdate(payroll, { deductions: Number(payroll.deductions || 0) + 500 })} variant="outline" size="sm" icon={TrendingDown}>Add Deduction</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DetailLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate font-semibold capitalize text-slate-950 dark:text-white">{value || "--"}</span>
    </div>
  );
}

function PayrollModal({ open, employees, onClose, onSubmit }) {
  const now = new Date();
  const [form, setForm] = useState({ employee: "", month: now.getMonth() + 1, year: now.getFullYear(), basicSalary: "", hra: "", allowances: "", bonus: "", deductions: "" });
  return (
    <Modal open={open} title="Generate Payroll" onClose={onClose}>
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

function SalaryTile({ label, value, icon }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function CircularPayroll({ value, label }) {
  const data = [{ name: label, value: Math.max(0, Math.min(100, value)), fill: "#2563EB" }];
  return (
    <div className="relative h-64 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="96%" data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" cornerRadius={16} background={{ fill: "rgba(148, 163, 184, 0.16)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-slate-950 dark:text-white">{value}%</p>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, tone }) {
  const colors = { blue: "bg-blue-600", emerald: "bg-emerald-500", amber: "bg-amber-500" };
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-white dark:bg-slate-900">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} className={`h-full rounded-full ${colors[tone] || colors.blue}`} />
      </div>
    </div>
  );
}

function InsightCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{item.value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
    </div>
  );
}

function PaymentHistoryItem({ item }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><ReceiptText size={17} /></span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{item.employee?.name || "Employee"} - {item.month}/{item.year}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generated {formatDate(item.createdAt)}</p>
        </div>
      </div>
      <Badge tone={statusTone(item.status)}>{item.status}</Badge>
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
  return (
    <Motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${event.type === "approved" ? "bg-emerald-500" : event.type === "generated" ? "bg-blue-500" : "bg-amber-500"}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{event.message}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(event.timestamp)}</p>
      </div>
    </Motion.div>
  );
}

function AlertTile({ icon, label, value, tone }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      <Badge tone={tone} className="mt-2">Realtime</Badge>
    </div>
  );
}

function PayrollAvatar({ name = "Employee", status = "pending", size = "md" }) {
  const sizes = { md: "h-10 w-10", lg: "h-16 w-16 text-lg" };
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 ${sizes[size] || sizes.md}`}>
      <span className={`absolute right-0 top-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${["approved", "paid"].includes(status) ? "bg-emerald-500" : status === "pending" ? "animate-pulse bg-amber-500" : "bg-blue-500"}`} />
      {initials(name)}
    </span>
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
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
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
      <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
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

function AnalyticsCard({ title, description, children }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader title={title} description={description} />
      <div className="mt-5 h-72">{children}</div>
    </Card>
  );
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

function grossSalary(item = {}) {
  return Number(item.basicSalary || 0) + Number(item.hra || 0) + Number(item.allowances || 0) + Number(item.bonus || 0);
}

function buildDeductionBreakdown(item = {}) {
  const deductions = Number(item?.deductions || 0);
  return [
    { name: "Estimated tax", value: Math.round(deductions * 0.58), color: "#2563EB" },
    { name: "Leave impact", value: Math.round(deductions * 0.24), color: "#F59E0B" },
    { name: "Other deductions", value: Math.max(0, deductions - Math.round(deductions * 0.82)), color: "#EF4444" }
  ];
}

function buildPayrollTrend(rows = []) {
  const data = rows.slice(0, 8).reverse().map((item) => ({
    label: `${item.month}/${String(item.year).slice(-2)}`,
    gross: grossSalary(item),
    net: Number(item.netSalary || 0),
    deductions: Number(item.deductions || 0)
  }));
  return data.length ? data : [{ label: "No data", gross: 0, net: 0, deductions: 0 }];
}

function buildSalaryDistribution(rows = []) {
  const bands = [
    { label: "<25k", min: 0, max: 25000 },
    { label: "25-50k", min: 25000, max: 50000 },
    { label: "50-100k", min: 50000, max: 100000 },
    { label: "100k+", min: 100000, max: Infinity }
  ];
  return bands.map((band) => ({
    label: band.label,
    count: rows.filter((item) => Number(item.netSalary || 0) >= band.min && Number(item.netSalary || 0) < band.max).length
  }));
}

function buildDepartmentAnalytics(payrolls = [], employees = []) {
  const map = new Map();
  payrolls.forEach((item) => {
    const department = item.employee?.department || employees.find((employee) => employee._id === item.employee?._id)?.department || "Team";
    map.set(department, (map.get(department) || 0) + Number(item.netSalary || 0));
  });
  const data = Array.from(map.entries()).map(([department, total]) => ({ department, total }));
  return data.length ? data : [{ department: "No data", total: 0 }];
}

function buildCompensationInsights(rows = []) {
  const total = rows.length || 1;
  const avgNet = rows.reduce((sum, item) => sum + Number(item.netSalary || 0), 0) / total;
  const avgDeductions = rows.reduce((sum, item) => sum + Number(item.deductions || 0), 0) / total;
  const bonusRecords = rows.filter((item) => Number(item.bonus || 0) > 0).length;
  return [
    { icon: CreditCard, label: "Average net pay", value: currency(avgNet), detail: "Across visible records" },
    { icon: Landmark, label: "Average deduction", value: currency(avgDeductions), detail: "Tax and policy impact" },
    { icon: Sparkles, label: "Bonus coverage", value: `${Math.round((bonusRecords / total) * 100)}%`, detail: "Records with incentives" }
  ];
}

function upsertPayroll(rows = [], nextPayroll) {
  const id = String(nextPayroll?._id || "");
  if (!id) return rows;
  const exists = rows.some((item) => String(item._id) === id);
  const nextRows = exists
    ? rows.map((item) => String(item._id) === id ? { ...item, ...nextPayroll } : item)
    : [nextPayroll, ...rows];
  return nextRows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function buildPayrollActivity(event = {}) {
  return {
    id: `${event.payroll?._id || event.timestamp}-${Math.random().toString(36).slice(2)}`,
    type: event.type || "updated",
    message: event.message || "Payroll updated",
    timestamp: event.timestamp || new Date().toISOString()
  };
}

function buildMiniSeries(value = 0) {
  const number = Math.max(0, Number(value || 0));
  return [Math.max(0, number * 0.2), Math.max(0, number * 0.45), Math.max(0, number * 0.7), number, Math.max(0, number * 0.9)];
}

function initials(name = "Employee") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EM";
}

function currency(value) {
  if (!value) return "Rs 0";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
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

function InboxIcon(props) {
  return <ReceiptText {...props} />;
}
