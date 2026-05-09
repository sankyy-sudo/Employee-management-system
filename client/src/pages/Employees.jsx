import { Fragment, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  GraduationCap,
  HeartPulse,
  Home,
  IdCard,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  WalletCards,
  X
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Page from "../components/ui/Page";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { formatDate, formatDateTime, formatTime } from "../utils/format";
import { statusTone } from "../utils/statusTone";

const emptyEmployee = {
  employeeId: "",
  name: "",
  email: "",
  password: "",
  phone: "+91",
  role: "Employee",
  department: "",
  designation: "",
  status: "Active",
  projectId: "",
  gender: "",
  dateOfJoining: "",
  dateOfBirth: "",
  bloodGroup: "",
  permanentAddress: "",
  currentAddress: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  motherName: "",
  fatherName: "",
  siblings: "",
  familyInsuranceDetails: "",
  emergencyContact: { name: "", relation: "", phone: "" },
  skills: "",
  projectsWorkedOn: "",
  projectHistory: "",
  shiftDetails: "",
  experience: "",
  performanceSummary: "",
  appreciation: "",
  salary: ""
};

const formSteps = ["Identity", "Role", "Address", "Family", "Professional"];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [formStep, setFormStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [actionMenu, setActionMenu] = useState("");
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [joiningFilter, setJoiningFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWorkspace = async () => {
    setLoading(true);
    setError("");
    try {
      const [employeeRes, attendanceRes, leaveRes, payrollRes] = await Promise.all([
        api.get("/employees"),
        api.get("/attendance"),
        api.get("/leaves"),
        api.get("/payrolls")
      ]);
      setEmployees(employeeRes.data || []);
      setAttendance(attendanceRes.data || []);
      setLeaves(leaveRes.data || []);
      setPayroll(payrollRes.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load employee workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/employees"),
      api.get("/attendance"),
      api.get("/leaves"),
      api.get("/payrolls")
    ]).then(([employeeRes, attendanceRes, leaveRes, payrollRes]) => {
      if (!active) return;
      setEmployees(employeeRes.data || []);
      setAttendance(attendanceRes.data || []);
      setLeaves(leaveRes.data || []);
      setPayroll(payrollRes.data || []);
      setLoading(false);
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError.response?.data?.message || "Unable to load employee workspace.");
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const departments = useMemo(() => Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))).sort(), [employees]);
  const analytics = useMemo(() => buildAnalytics(employees, leaves), [employees, leaves]);
  const filteredEmployees = useMemo(() => {
    const term = query.trim().toLowerCase();
    const today = new Date();

    return employees
      .filter((employee) => {
        const matchesSearch = !term || [
          employee.name,
          employee.email,
          employee.employeeId,
          employee.department,
          employee.designation,
          employee.phone
        ].some((value) => String(value || "").toLowerCase().includes(term));
        const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
        const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
        const joinedDate = employee.dateOfJoining ? new Date(employee.dateOfJoining) : null;
        const matchesJoining = joiningFilter === "all"
          || (joiningFilter === "30" && joinedDate && today - joinedDate <= 30 * 86400000)
          || (joiningFilter === "90" && joinedDate && today - joinedDate <= 90 * 86400000);
        return matchesSearch && matchesDepartment && matchesStatus && matchesJoining;
      })
      .sort((a, b) => String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""), undefined, { numeric: true }));
  }, [departmentFilter, employees, joiningFilter, query, sortKey, statusFilter]);

  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const visibleEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyEmployee);
    setFormStep(0);
    setEmployeeModalOpen(true);
  };

  const openEdit = (employee) => {
    setEditingId(employee._id);
    setForm(toEmployeeForm(employee));
    setFormStep(0);
    setEmployeeModalOpen(true);
  };

  const openProfile = async (employee) => {
    setSelectedEmployee(employee);
    setProfileOpen(true);
    setDocuments([]);
    try {
      const { data } = await api.get("/documents", { params: { employeeId: employee._id } });
      setDocuments(data || []);
    } catch {
      setDocuments([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = toEmployeePayload(form);
      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        setMessage("Employee updated successfully.");
      } else {
        await api.post("/employees", payload);
        setMessage("Employee added successfully.");
      }
      setEmployeeModalOpen(false);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save employee.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/employees/${deleteTarget._id}`);
      setMessage(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete employee.");
    } finally {
      setSaving(false);
    }
  };

  const confirmStatus = async () => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "Active" ? "Inactive" : "Active";
    setSaving(true);
    try {
      await api.put(`/employees/${statusTarget._id}`, { status: nextStatus });
      setEmployees((current) => current.map((employee) => employee._id === statusTarget._id ? { ...employee, status: nextStatus } : employee));
      setSelectedEmployee((current) => current?._id === statusTarget._id ? { ...current, status: nextStatus } : current);
      setMessage(`${statusTarget.name} ${nextStatus === "Active" ? "activated" : "suspended"}.`);
      setStatusTarget(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update employee status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Page
        eyebrow="Admin Employee Management"
        title="People Operations Dashboard"
        description="Manage employees, lifecycle status, profile details, documents, attendance, payroll, leaves, and activity from one premium HRMS workspace."
        className="max-w-[1700px]"
        actions={<Button onClick={openCreate} icon={Plus}>Add Employee</Button>}
      >
        <div className="min-w-0 space-y-6">
          <HeroSection onCreate={openCreate} employees={employees} analytics={analytics} />

          {message && <Alert tone="blue" text={message} />}
          {error && <Alert tone="rose" text={error} />}

          {loading ? <SkeletonGrid /> : <AnalyticsGrid analytics={analytics} />}

          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="Directory"
              title="Employee Management"
              description="Search, filter, sort, view, edit, suspend, activate, and delete employee records."
              actions={<Badge tone="blue">{filteredEmployees.length} shown</Badge>}
            />

            <EmployeeFilters
              query={query}
              setQuery={(value) => {
                setQuery(value);
                setPage(1);
              }}
              departmentFilter={departmentFilter}
              setDepartmentFilter={(value) => {
                setDepartmentFilter(value);
                setPage(1);
              }}
              statusFilter={statusFilter}
              setStatusFilter={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
              joiningFilter={joiningFilter}
              setJoiningFilter={(value) => {
                setJoiningFilter(value);
                setPage(1);
              }}
              sortKey={sortKey}
              setSortKey={setSortKey}
              departments={departments}
            />

            <EmployeeTable
              employees={visibleEmployees}
              actionMenu={actionMenu}
              setActionMenu={setActionMenu}
              onView={openProfile}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onStatus={setStatusTarget}
            />

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
              </div>
            </div>
          </Card>
        </div>
      </Page>

      <EmployeeFormModal
        open={employeeModalOpen}
        form={form}
        setForm={setForm}
        step={formStep}
        setStep={setFormStep}
        editing={Boolean(editingId)}
        saving={saving}
        onClose={() => setEmployeeModalOpen(false)}
        onSubmit={handleSubmit}
      />
      <EmployeeProfileDrawer
        open={profileOpen}
        employee={selectedEmployee}
        documents={documents}
        attendance={attendance}
        leaves={leaves}
        payroll={payroll}
        onClose={() => setProfileOpen(false)}
        onEdit={openEdit}
        onStatus={setStatusTarget}
      />
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete employee?"
        description={deleteTarget ? `This will permanently delete ${deleteTarget.name}. This action cannot be undone.` : ""}
        actionLabel="Delete Employee"
        danger
        saving={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmModal
        open={Boolean(statusTarget)}
        title={statusTarget?.status === "Active" ? "Suspend employee?" : "Activate employee?"}
        description={statusTarget ? `${statusTarget.name} will be marked as ${statusTarget.status === "Active" ? "Inactive" : "Active"}.` : ""}
        actionLabel={statusTarget?.status === "Active" ? "Suspend" : "Activate"}
        danger={statusTarget?.status === "Active"}
        saving={saving}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatus}
      />
    </Layout>
  );
}

function HeroSection({ onCreate, employees, analytics }) {
  return (
    <Motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-6 text-white lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue" className="bg-white/15 text-white ring-white/20">Enterprise HRMS</Badge>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-white/15">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Live employee records
            </span>
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-bold tracking-tight sm:text-5xl">Admin employee management, upgraded for modern HR teams.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
            Add, edit, suspend, activate, inspect profiles, verify documents, and track each employee lifecycle from a single premium command center.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={onCreate} icon={Plus}>Add Employee</Button>
            <a href="#employee-table" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20">
              <Search size={16} /> Browse Directory
            </a>
          </div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">People pulse</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <HeroMetric label="Employees" value={employees.length} />
            <HeroMetric label="Active" value={analytics.active} />
            <HeroMetric label="Departments" value={analytics.departmentCount} />
            <HeroMetric label="Approvals" value={analytics.pendingApprovals} />
          </div>
        </div>
      </div>
    </Motion.section>
  );
}

function AnalyticsGrid({ analytics }) {
  const cards = [
    { label: "Total Employees", value: analytics.total, icon: Users, tone: "blue", trend: "+12%" },
    { label: "Active Employees", value: analytics.active, icon: UserCheck, tone: "emerald", trend: "+8%" },
    { label: "Employees On Leave", value: analytics.onLeave, icon: CalendarDays, tone: "amber", trend: "-3%" },
    { label: "New Joiners", value: analytics.newJoiners, icon: BadgeCheck, tone: "blue", trend: "+5%" },
    { label: "Pending Approvals", value: analytics.pendingApprovals, icon: ShieldAlert, tone: "rose", trend: "Live" },
    { label: "Department Count", value: analytics.departmentCount, icon: BriefcaseBusiness, tone: "slate", trend: "Org" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {cards.map((card, index) => <AnalyticsCard key={card.label} card={card} index={index} />)}
    </div>
  );
}

function AnalyticsCard({ card, index }) {
  const Icon = card.icon;
  const data = Array.from({ length: 8 }, (_, item) => ({ value: 20 + ((item + index) % 5) * 9 }));
  return (
    <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card hover className="overflow-hidden border-white/70 bg-white/85 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass(card.tone)}`}>
            <Icon size={19} />
          </span>
          <Badge tone={card.tone}>{card.trend}</Badge>
        </div>
        <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">{card.value}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{card.label}</p>
        <div className="mt-3 h-12 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950">
          <Sparkline data={data} />
        </div>
      </Card>
    </Motion.div>
  );
}

function Sparkline({ data }) {
  const values = data.map((item) => Number(item.value || 0));
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

function EmployeeFilters({ query, setQuery, departmentFilter, setDepartmentFilter, statusFilter, setStatusFilter, joiningFilter, setJoiningFilter, sortKey, setSortKey, departments }) {
  return (
    <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_170px_160px]">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, ID, department, phone" className="w-full bg-transparent text-sm outline-none dark:text-slate-100" />
      </div>
      <FilterSelect icon={BriefcaseBusiness} value={departmentFilter} onChange={setDepartmentFilter}>
        <option value="all">All departments</option>
        {departments.map((department) => <option key={department} value={department}>{department}</option>)}
      </FilterSelect>
      <FilterSelect icon={ShieldCheck} value={statusFilter} onChange={setStatusFilter}>
        <option value="all">All status</option>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </FilterSelect>
      <FilterSelect icon={CalendarDays} value={joiningFilter} onChange={setJoiningFilter}>
        <option value="all">Any joining</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </FilterSelect>
      <FilterSelect icon={Filter} value={sortKey} onChange={setSortKey}>
        <option value="name">Sort by name</option>
        <option value="department">Department</option>
        <option value="dateOfJoining">Joining date</option>
        <option value="status">Status</option>
      </FilterSelect>
    </div>
  );
}

function FilterSelect({ icon, value, onChange, children }) {
  const Icon = icon;
  return (
    <label className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon size={16} className="shrink-0 text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none dark:text-slate-100">
        {children}
      </select>
    </label>
  );
}

function EmployeeTable({ employees, actionMenu, setActionMenu, onView, onEdit, onDelete, onStatus }) {
  return (
    <div id="employee-table" className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {["Employee", "Employee ID", "Department", "Designation", "Status", "Joining Date", "Actions"].map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee._id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                <td className="px-4 py-4"><EmployeeIdentity employee={employee} /></td>
                <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">{employee.employeeId || "--"}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{employee.department || "--"}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{employee.designation || employee.role || "--"}</td>
                <td className="px-4 py-4"><Badge tone={statusTone(employee.status)}>{employee.status || "Active"}</Badge></td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(employee.dateOfJoining)}</td>
                <td className="px-4 py-4">
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={() => setActionMenu(actionMenu === employee._id ? "" : employee._id)} icon={MoreHorizontal}>Actions</Button>
                    <AnimatePresence>
                      {actionMenu === employee._id && (
                        <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-800 dark:bg-slate-900">
                          <ActionItem icon={Eye} label="View Employee" onClick={() => { setActionMenu(""); onView(employee); }} />
                          <ActionItem icon={Edit3} label="Edit Employee" onClick={() => { setActionMenu(""); onEdit(employee); }} />
                          <ActionItem icon={employee.status === "Active" ? ShieldAlert : ShieldCheck} label={employee.status === "Active" ? "Suspend Employee" : "Activate Employee"} onClick={() => { setActionMenu(""); onStatus(employee); }} />
                          <ActionItem icon={Trash2} label="Delete Employee" danger onClick={() => { setActionMenu(""); onDelete(employee); }} />
                        </Motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!employees.length && <div className="p-5"><EmptyState icon={Users} title="No employees found" description="Try changing search or filters." /></div>}
    </div>
  );
}

function EmployeeIdentity({ employee }) {
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

function ActionItem({ icon, label, onClick, danger = false }) {
  const Icon = icon;
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${danger ? "text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
      <Icon size={16} /> {label}
    </button>
  );
}

function EmployeeFormModal({ open, form, setForm, step, setStep, editing, saving, onClose, onSubmit }) {
  const next = () => setStep((value) => Math.min(formSteps.length - 1, value + 1));
  const previous = () => setStep((value) => Math.max(0, value - 1));

  return (
    <Modal open={open} title={editing ? "Edit Employee" : "Add Employee"} description="Complete employee profile metadata across identity, role, address, family, and professional details." onClose={onClose} panelClassName="max-w-5xl p-0">
      <form onSubmit={onSubmit}>
        <div className="border-b border-slate-200 px-6 pb-5 dark:border-slate-800">
          <div className="grid gap-2 sm:grid-cols-5">
            {formSteps.map((label, index) => (
              <button key={label} type="button" onClick={() => setStep(index)} className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${step === index ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          <AnimatePresence mode="wait">
            <Motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid gap-4 md:grid-cols-2">
              {step === 0 && <IdentityStep form={form} setForm={setForm} editing={editing} />}
              {step === 1 && <RoleStep form={form} setForm={setForm} />}
              {step === 2 && <AddressStep form={form} setForm={setForm} />}
              {step === 3 && <FamilyStep form={form} setForm={setForm} />}
              {step === 4 && <ProfessionalStep form={form} setForm={setForm} />}
            </Motion.div>
          </AnimatePresence>
        </div>
        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Step {step + 1} of {formSteps.length}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={step === 0 || saving} onClick={previous}>Back</Button>
            {step < formSteps.length - 1 ? <Button type="button" onClick={next}>Next</Button> : <Button type="submit" disabled={saving} icon={saving ? Clock3 : CheckCircle2}>{saving ? "Saving..." : editing ? "Update Employee" : "Create Employee"}</Button>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function IdentityStep({ form, setForm, editing }) {
  return (
    <>
      <Input label="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Employee ID" required={false} value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} />
      <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Input label={editing ? "Password (optional)" : "Password"} type="password" required={!editing} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <Input label="Phone Number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <Select label="Gender" required={false} value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
        <option value="">Select gender</option>
        <option value="Female">Female</option>
        <option value="Male">Male</option>
        <option value="Non-binary">Non-binary</option>
        <option value="Prefer not to say">Prefer not to say</option>
      </Select>
      <Input label="Date of Birth" required={false} type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
      <Input label="Blood Group" required={false} value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} />
    </>
  );
}

function RoleStep({ form, setForm }) {
  return (
    <>
      <Input label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
      <Input label="Designation" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
      <Select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
        <option value="Employee">Employee</option>
        <option value="hr">HR</option>
        <option value="admin">Admin</option>
      </Select>
      <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </Select>
      <Input label="Date of Joining" type="date" value={form.dateOfJoining} onChange={(event) => setForm({ ...form, dateOfJoining: event.target.value })} />
      <Input label="Project ID" required={false} value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} />
      <Input label="Salary" required={false} type="number" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} />
      <Input label="Shift Details" required={false} value={form.shiftDetails} onChange={(event) => setForm({ ...form, shiftDetails: event.target.value })} />
    </>
  );
}

function AddressStep({ form, setForm }) {
  return (
    <>
      <Textarea label="Permanent Address" className="md:col-span-2" value={form.permanentAddress} onChange={(event) => setForm({ ...form, permanentAddress: event.target.value })} />
      <Textarea label="Current Address" className="md:col-span-2" value={form.currentAddress} onChange={(event) => setForm({ ...form, currentAddress: event.target.value })} />
      <Input label="City" required={false} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
      <Input label="State" required={false} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
      <Input label="Country" required={false} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
      <Input label="Postal Code" required={false} value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
    </>
  );
}

function FamilyStep({ form, setForm }) {
  return (
    <>
      <Input label="Father Name" required={false} value={form.fatherName} onChange={(event) => setForm({ ...form, fatherName: event.target.value })} />
      <Input label="Mother Name" required={false} value={form.motherName} onChange={(event) => setForm({ ...form, motherName: event.target.value })} />
      <Input label="Sibling Details" required={false} value={form.siblings} onChange={(event) => setForm({ ...form, siblings: event.target.value })} />
      <Input label="Emergency Contact" required={false} value={form.emergencyContact.name} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: event.target.value } })} />
      <Input label="Emergency Relation" required={false} value={form.emergencyContact.relation} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relation: event.target.value } })} />
      <Input label="Emergency Phone" required={false} value={form.emergencyContact.phone} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: event.target.value } })} />
      <Textarea label="Family Insurance Details" required={false} className="md:col-span-2" value={form.familyInsuranceDetails} onChange={(event) => setForm({ ...form, familyInsuranceDetails: event.target.value })} />
    </>
  );
}

function ProfessionalStep({ form, setForm }) {
  return (
    <>
      <Input label="Skills" required={false} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
      <Input label="Assigned Projects" required={false} value={form.projectsWorkedOn} onChange={(event) => setForm({ ...form, projectsWorkedOn: event.target.value })} />
      <Input label="Experience" required={false} value={form.experience} onChange={(event) => setForm({ ...form, experience: event.target.value })} />
      <Input label="Performance Summary" required={false} value={form.performanceSummary} onChange={(event) => setForm({ ...form, performanceSummary: event.target.value })} />
      <Textarea label="Project History" required={false} value={form.projectHistory} onChange={(event) => setForm({ ...form, projectHistory: event.target.value })} />
      <Textarea label="Appreciation Received" required={false} value={form.appreciation} onChange={(event) => setForm({ ...form, appreciation: event.target.value })} />
    </>
  );
}

function EmployeeProfileDrawer({ open, employee, documents, attendance, leaves, payroll, onClose, onEdit, onStatus }) {
  const employeeId = employee?._id;
  const employeeAttendance = attendance.filter((item) => String(item.userId || item.employee?._id || item.employee) === String(employeeId));
  const employeeLeaves = leaves.filter((item) => String(item.employee?._id || item.employee) === String(employeeId));
  const employeePayroll = payroll.filter((item) => String(item.employee?._id || item.employee) === String(employeeId));
  const attendancePercent = Math.min(100, Math.round((employeeAttendance.filter((item) => item.checkIn).length / Math.max(employeeAttendance.length, 1)) * 100));
  const lateEntries = employeeAttendance.filter((item) => item.isLate || item.status === "Late").length;
  const workingHours = employeeAttendance.reduce((sum, item) => sum + Number(item.workMinutes || 0), 0) / 60;

  return (
    <AnimatePresence>
      {open && employee && (
        <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <Motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.22, ease: "easeOut" }} className="ml-auto h-full w-full max-w-6xl overflow-y-auto bg-slate-50 shadow-lift dark:bg-slate-950">
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <Avatar name={employee.name} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{employee.employeeId || "No ID"}</Badge>
                      <Badge tone={statusTone(employee.status)}>{employee.status || "Active"}</Badge>
                      <Badge tone="slate">{employee.department || "No department"}</Badge>
                    </div>
                    <h2 className="mt-2 truncate text-2xl font-bold text-slate-950 dark:text-white">{employee.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{employee.designation || employee.role || "Employee"} / Last seen {formatDateTime(employee.lastSeenAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => onEdit(employee)} icon={Edit3}>Edit</Button>
                  <Button onClick={() => onStatus(employee)} variant={employee.status === "Active" ? "danger" : "success"} icon={employee.status === "Active" ? ShieldAlert : ShieldCheck}>
                    {employee.status === "Active" ? "Suspend" : "Activate"}
                  </Button>
                  <Button onClick={onClose} variant="outline" icon={X}>Close</Button>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <ProfileMetric label="Attendance" value={`${attendancePercent}%`} icon={Activity} />
                <ProfileMetric label="Working Hours" value={workingHours.toFixed(1)} icon={Clock3} />
                <ProfileMetric label="Late Entries" value={lateEntries} icon={AlertTriangle} />
                <ProfileMetric label="Documents" value={documents.length} icon={FolderOpen} />
              </div>

              <ProfileSection title="Personal Information" icon={UserRound}>
                <InfoGrid items={[
                  ["Full Name", employee.name],
                  ["Employee ID", employee.employeeId],
                  ["Project ID", employee.projectId],
                  ["Email", employee.email],
                  ["Phone Number", employee.phone],
                  ["Gender", employee.gender],
                  ["Date of Birth", formatDate(employee.dateOfBirth)],
                  ["Blood Group", employee.bloodGroup],
                  ["Date of Joining", formatDate(employee.dateOfJoining)],
                  ["Department", employee.department],
                  ["Designation", employee.designation || employee.role],
                  ["Employment Status", employee.status || "Active"]
                ]} />
              </ProfileSection>

              <ProfileSection title="Address Information" icon={MapPin}>
                <InfoGrid items={[
                  ["Permanent Address", employee.permanentAddress],
                  ["Current Address", employee.currentAddress],
                  ["City", employee.city],
                  ["State", employee.state],
                  ["Country", employee.country],
                  ["Postal Code", employee.postalCode]
                ]} />
              </ProfileSection>

              <ProfileSection title="Family Information" icon={HeartPulse}>
                <InfoGrid items={[
                  ["Father Name", employee.fatherName],
                  ["Mother Name", employee.motherName],
                  ["Sibling Details", employee.siblings],
                  ["Emergency Contact", `${employee.emergencyContact?.name || "--"} ${employee.emergencyContact?.relation || ""} ${employee.emergencyContact?.phone || ""}`],
                  ["Family Insurance Details", employee.familyInsuranceDetails]
                ]} />
              </ProfileSection>

              <ProfileSection title="Professional Information" icon={BriefcaseBusiness}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <TagPanel title="Skills" items={employee.skills} />
                  <TagPanel title="Assigned Projects" items={employee.projectsWorkedOn} />
                  <InfoCard label="Experience" value={employee.experience || estimateExperience(employee.dateOfJoining) + " years"} />
                  <InfoCard label="Shift Details" value={employee.shiftDetails} />
                  <InfoCard label="Performance Summary" value={employee.performanceSummary || "Performance summary pending."} />
                  <InfoCard label="Appreciation Received" value={employee.appreciation} />
                  <InfoCard label="Project History" value={employee.projectHistory} wide />
                </div>
              </ProfileSection>

              <div className="grid gap-6 xl:grid-cols-2">
                <ProfileSection title="Attendance Information" icon={CalendarDays}>
                  <InfoGrid items={[
                    ["Attendance Percentage", `${attendancePercent}%`],
                    ["Clock In / Out Records", employeeAttendance.length],
                    ["Working Hours", workingHours.toFixed(1)],
                    ["Late Entries", lateEntries]
                  ]} />
                  <Timeline items={employeeAttendance.slice(0, 5).map((item) => ({
                    icon: Clock3,
                    title: item.status || "Attendance activity",
                    detail: `${formatTime(item.checkIn)} - ${formatTime(item.checkOut)} / ${formatDate(item.createdAt)}`
                  }))} empty="No attendance history." />
                </ProfileSection>

                <ProfileSection title="Leave Information" icon={CalendarDays}>
                  <InfoGrid items={[
                    ["Paid Leave", employee.leaveBalance?.paid ?? 0],
                    ["Sick Leave", employee.leaveBalance?.sick ?? 0],
                    ["Casual Leave", employee.leaveBalance?.casual ?? 0],
                    ["Pending Requests", employeeLeaves.filter((item) => item.status === "pending").length]
                  ]} />
                  <Timeline items={employeeLeaves.slice(0, 5).map((item) => ({
                    icon: CalendarDays,
                    title: `${item.leaveType} leave`,
                    detail: `${item.status} / ${item.days} day(s) / ${formatDate(item.createdAt)}`
                  }))} empty="No leave history." />
                </ProfileSection>
              </div>

              <ProfileSection title="Payroll Information" icon={WalletCards}>
                <InfoGrid items={[
                  ["Salary Summary", currency(employee.salary)],
                  ["Payslip History", employeePayroll.length],
                  ["Bonus Details", currency(employeePayroll.reduce((sum, item) => sum + Number(item.bonus || 0), 0))],
                  ["Overtime Details", "Tracked in payroll processing"],
                  ["Deductions", currency(employeePayroll.reduce((sum, item) => sum + Number(item.deductions || 0), 0))]
                ]} />
              </ProfileSection>

              <ProfileSection title="Documents" icon={FileText}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {documents.map((document) => <DocumentCard key={document._id} document={document} />)}
                  {!documents.length && <EmptyState icon={FolderOpen} title="No documents uploaded" description="Resume, identity proof, certificates, offer letters, and medical documents will appear here." />}
                </div>
              </ProfileSection>

              <ProfileSection title="Employee Activity Timeline" icon={Activity}>
                <Timeline items={buildActivity(employee, employeeAttendance, employeeLeaves, employeePayroll)} empty="No activity yet." />
              </ProfileSection>
            </div>
          </Motion.aside>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileSection({ title, icon, children }) {
  const Icon = icon;
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <SectionHeader eyebrow={<span className="flex items-center gap-2"><Icon size={15} /> Details</span>} title={title} />
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value]) => <InfoCard key={label} label={label} value={value} />)}
    </div>
  );
}

function InfoCard({ label, value, wide = false }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 ${wide ? "lg:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 break-words font-semibold text-slate-950 dark:text-white">{value || "--"}</p>
    </div>
  );
}

function ProfileMetric({ label, value, icon }) {
  const Icon = icon;
  return (
    <Card className="border-white/70 bg-white/85 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Icon size={18} /></span>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
    </Card>
  );
}

function TagPanel({ title, items = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items?.length ? items.map((item) => <Badge key={item} tone="blue">{item}</Badge>) : <p className="text-sm text-slate-500 dark:text-slate-400">No records yet.</p>}
      </div>
    </div>
  );
}

function DocumentCard({ document }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <FileText className="text-blue-600 dark:text-blue-300" size={22} />
      <p className="mt-3 font-semibold text-slate-950 dark:text-white">{document.title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{humanizeDocumentType(document.documentType)} / {formatBytes(document.size)}</p>
      <div className="mt-4 flex gap-2">
        <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-semibold text-white">
          <Eye size={15} /> Preview
        </a>
        <a href={document.fileUrl} target="_blank" rel="noreferrer" download className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <Download size={15} /> Download
        </a>
      </div>
    </div>
  );
}

function Timeline({ items, empty }) {
  if (!items.length) return <EmptyState icon={Activity} title={empty} />;
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={`${item.title}-${index}`} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Icon size={17} /></span>
            <div className="min-w-0 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
              <p className="font-semibold text-slate-950 dark:text-white">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmModal({ open, title, description, actionLabel, danger, saving, onClose, onConfirm }) {
  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button variant={danger ? "danger" : "success"} disabled={saving} onClick={onConfirm}>{saving ? "Working..." : actionLabel}</Button>
      </div>
    </Modal>
  );
}

function Alert({ tone, text }) {
  const classes = tone === "rose"
    ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${classes}`}>{text}</div>;
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

function buildAnalytics(employees, leaves) {
  const now = new Date();
  const departments = new Set(employees.map((employee) => employee.department).filter(Boolean));
  return {
    total: employees.length,
    active: employees.filter((employee) => (employee.status || "Active") === "Active").length,
    onLeave: leaves.filter((leave) => leave.status === "approved" && new Date(leave.startDate) <= now && new Date(leave.endDate) >= now).length,
    newJoiners: employees.filter((employee) => employee.dateOfJoining && now - new Date(employee.dateOfJoining) <= 30 * 86400000).length,
    pendingApprovals: leaves.filter((leave) => leave.status === "pending").length,
    departmentCount: departments.size
  };
}

function toEmployeeForm(employee) {
  return {
    ...emptyEmployee,
    ...employee,
    password: "",
    role: String(employee.role || "Employee").toLowerCase() === "employee" ? "Employee" : employee.role || "Employee",
    status: employee.status || "Active",
    dateOfJoining: toInputDate(employee.dateOfJoining),
    dateOfBirth: toInputDate(employee.dateOfBirth),
    skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : "",
    projectsWorkedOn: Array.isArray(employee.projectsWorkedOn) ? employee.projectsWorkedOn.join(", ") : "",
    emergencyContact: {
      name: employee.emergencyContact?.name || "",
      relation: employee.emergencyContact?.relation || "",
      phone: employee.emergencyContact?.phone || ""
    }
  };
}

function toEmployeePayload(form) {
  const payload = {
    ...form,
    skills: form.skills,
    projectsWorkedOn: form.projectsWorkedOn,
    salary: Number(form.salary || 0)
  };
  if (!payload.password) delete payload.password;
  return payload;
}

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function estimateExperience(dateOfJoining) {
  if (!dateOfJoining) return 0;
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

function humanizeDocumentType(type = "") {
  return type.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ") || "Document";
}

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function buildActivity(employee, attendance, leaves, payroll) {
  return [
    { icon: UserRound, title: "Profile updated", detail: `Employee profile last updated ${formatDateTime(employee.updatedAt)}.` },
    ...attendance.slice(0, 3).map((item) => ({ icon: Clock3, title: "Attendance activity", detail: `${item.status || "Check-in"} on ${formatDate(item.createdAt)}` })),
    ...leaves.slice(0, 3).map((item) => ({ icon: CalendarDays, title: "Leave activity", detail: `${item.leaveType} leave ${item.status} for ${item.days} day(s).` })),
    ...payroll.slice(0, 2).map((item) => ({ icon: WalletCards, title: "Payroll update", detail: `Payslip ${item.month}/${item.year} generated for ${currency(item.netSalary)}.` })),
    { icon: Sparkles, title: "Project activity", detail: employee.projectsWorkedOn?.length ? `${employee.projectsWorkedOn.length} active project assignment(s).` : "No active project assignments recorded." }
  ];
}
