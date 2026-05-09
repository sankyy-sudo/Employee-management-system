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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Eye,
  Filter,
  Flag,
  Layers3,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import getSocket from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";

const emptyProject = {
  name: "",
  clientName: "",
  description: "",
  startDate: "",
  deadline: "",
  timezone: "Asia/Kolkata",
  priority: "Medium",
  status: "Pending",
  progress: 0
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

export default function Projects() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || "").trim().toLowerCase() === "admin";
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("");
  const [projectModal, setProjectModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignmentDraft, setAssignmentDraft] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!isAdmin) {
      return () => { active = false; };
    }

    Promise.all([api.get("/projects"), api.get("/employees")]).then(([projectRes, employeeRes]) => {
      if (!active) return;
      setProjects(projectRes.data || []);
      setEmployees(employeeRes.data || []);
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
    const handleProjectUpdate = (event) => {
      if (event?.project?._id) {
        setProjects((current) => event.type === "deleted"
          ? current.filter((project) => project._id !== event.project._id)
          : upsertProject(current, event.project));
        setSelectedProject((current) => current?._id === event.project._id ? event.project : current);
      }
      setActivityFeed((current) => [buildProjectActivity(event), ...current].slice(0, 8));
      setMessage(event?.message || "Project workspace updated in real time.");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("project:updated", handleProjectUpdate);

    if (!socket.connected) socket.connect();
    else handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("project:updated", handleProjectUpdate);
    };
  }, [isAdmin, user]);

  const activeProjects = projects.filter((project) => project.status === "Active");
  const completedProjects = projects.filter((project) => project.status === "Completed");
  const pendingProjects = projects.filter((project) => project.status === "Pending");
  const overdueProjects = projects.filter((project) => isOverdue(project));
  const assignedEmployeeCount = new Set(projects.flatMap((project) => getAssignments(project).map((assignment) => String(assignment.employee?._id || assignment.employee)))).size;
  const departments = useMemo(() => Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))), [employees]);
  const progressAverage = projects.length ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / projects.length) : 0;
  const projectTrend = buildProjectTrend(projects);
  const statusMix = buildStatusMix(projects);
  const departmentLoad = buildDepartmentLoad(projects);

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    return projects.filter((project) => {
      const assignments = getAssignments(project);
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || assignments.some((assignment) => assignment.employee?.department === departmentFilter);
      const matchesEmployee = employeeFilter === "all" || assignments.some((assignment) => String(assignment.employee?._id || assignment.employee) === employeeFilter);
      const matchesPriority = priorityFilter === "all" || project.priority === priorityFilter;
      const matchesDeadline = !deadlineFilter || normalizeDate(project.deadline).toISOString().slice(0, 10) === deadlineFilter;
      const searchText = [
        project.name,
        project.projectId,
        project.clientName,
        project.status,
        project.priority,
        project.description,
        ...assignments.map((assignment) => `${assignment.employee?.name} ${assignment.employee?.department}`)
      ].join(" ").toLowerCase();

      return matchesStatus && matchesDepartment && matchesEmployee && matchesPriority && matchesDeadline && (!term || searchText.includes(term));
    });
  }, [projects, query, statusFilter, departmentFilter, employeeFilter, priorityFilter, deadlineFilter]);

  const createProject = async (payload) => {
    const { data } = await api.post("/projects", payload);
    setProjects((current) => upsertProject(current, data));
    setProjectModal(false);
    setMessage("Project created successfully.");
  };

  const updateProject = async (project, payload) => {
    const { data } = await api.put(`/projects/${project._id}`, { ...project, ...payload });
    setProjects((current) => upsertProject(current, data));
    setSelectedProject((current) => current?._id === project._id ? data : current);
    setMessage("Project updated successfully.");
  };

  const deleteProject = async (project) => {
    await api.delete(`/projects/${project._id}`);
    setProjects((current) => current.filter((item) => item._id !== project._id));
    setSelectedProject(null);
    setDetailsOpen(false);
    setMessage("Project deleted successfully.");
  };

  const openDetails = (project) => {
    setSelectedProject(project);
    setDetailsOpen(true);
  };

  const openAssign = (project) => {
    setSelectedProject(project);
    setDetailsOpen(false);
    setAssignmentDraft(getAssignments(project).map((assignment) => ({
      employee: assignment.employee?._id || assignment.employee,
      role: assignment.role || "Contributor",
      joiningDate: toInputDate(assignment.joiningDate),
      deadline: toInputDate(assignment.deadline || project.deadline),
      notes: assignment.notes || ""
    })));
    setAssignModal(true);
  };

  const submitAssignments = async () => {
    const { data } = await api.post(`/projects/${selectedProject._id}/assign`, { assignments: assignmentDraft });
    setProjects((current) => upsertProject(current, data));
    setSelectedProject(data);
    setAssignModal(false);
    setMessage("Employee assignments synced.");
  };

  const removeEmployee = async (project, employeeId) => {
    const { data } = await api.delete(`/projects/${project._id}/employees/${employeeId}`);
    setProjects((current) => upsertProject(current, data));
    setSelectedProject(data);
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl">
          <Card className="p-6">
            <EmptyState icon={BriefcaseBusiness} title="Access Denied" description="Project Management is available only for admin users." />
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1700px] space-y-6">
        <Motion.section variants={itemMotion} className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
          <div className="grid gap-0 xl:grid-cols-[1.22fr_0.78fr]">
            <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-5 text-white sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue" className="bg-white/15 text-white ring-white/20">Project Command Center</Badge>
                <Badge tone={socketConnected ? "emerald" : "amber"} className="bg-white/10 text-white ring-white/20">{socketConnected ? "Live sync" : "Syncing"}</Badge>
                <Badge tone="slate" className="bg-white/10 text-white ring-white/20">{projects.length} projects</Badge>
              </div>
              <div className="mt-6 max-w-4xl">
                <p className="text-sm font-semibold text-blue-100">Admin Project Management</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
                  Assign work, monitor delivery, and keep every project moving.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                  Manage projects, employee assignments, progress, timelines, risk, workload, and real-time delivery alerts from one enterprise-grade workspace.
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroMetric icon={BriefcaseBusiness} label="Active projects" value={activeProjects.length} />
                <HeroMetric icon={Users} label="Assigned employees" value={assignedEmployeeCount} />
                <HeroMetric icon={Target} label="Avg progress" value={`${progressAverage}%`} />
              </div>
            </div>

            <div className="border-t border-white/15 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70 sm:p-7 xl:border-l xl:border-t-0">
              <ProjectPulse active={activeProjects.length} delayed={projects.filter((project) => project.status === "Delayed").length} overdue={overdueProjects.length} progress={progressAverage} />
            </div>
          </div>
        </Motion.section>

        {message && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            {message}
          </Motion.div>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={Layers3} title="Total Projects" value={projects.length} detail="All delivery workstreams" tone="blue" data={projectTrend.map((item) => item.total)} />
            <KpiCard icon={BriefcaseBusiness} title="Active Projects" value={activeProjects.length} detail="Currently in delivery" tone="emerald" data={projectTrend.map((item) => item.active)} />
            <KpiCard icon={CheckCircle2} title="Completed Projects" value={completedProjects.length} detail="Closed successfully" tone="emerald" data={buildMiniSeries(completedProjects.length)} />
            <KpiCard icon={Users} title="Employees Assigned" value={assignedEmployeeCount} detail="Unique team members" tone="blue" data={buildMiniSeries(assignedEmployeeCount)} />
            <KpiCard icon={ClipboardList} title="Pending Projects" value={pendingProjects.length} detail="Awaiting kickoff" tone="amber" data={buildMiniSeries(pendingProjects.length)} />
            <KpiCard icon={AlertTriangle} title="Overdue Projects" value={overdueProjects.length} detail="Past deadline" tone={overdueProjects.length ? "rose" : "emerald"} data={buildMiniSeries(overdueProjects.length)} />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion}>
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="Projects"
              title="Project Management Table"
              description="Search, filter, assign employees, update status, track progress, and manage deadlines."
              actions={<Button onClick={() => setProjectModal(true)} icon={Plus}>Create Project</Button>}
            />
            <ProjectFilters
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              employeeFilter={employeeFilter}
              setEmployeeFilter={setEmployeeFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              deadlineFilter={deadlineFilter}
              setDeadlineFilter={setDeadlineFilter}
              departments={departments}
              employees={employees}
            />
            <ProjectTable
              projects={filteredProjects}
              onView={openDetails}
              onAssign={openAssign}
              onUpdate={updateProject}
              onDelete={deleteProject}
            />
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader eyebrow="Realtime" title="Project Activity & Alerts" description="Assignments, deadline risk, delivery updates, and project status changes." actions={<LiveSyncBadge connected={socketConnected} />} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <AlertTile icon={Send} label="New assignments" value={activityFeed.filter((event) => event.type === "assigned").length} tone="blue" />
              <AlertTile icon={CalendarClock} label="Deadline risk" value={overdueProjects.length} tone="amber" />
              <AlertTile icon={CheckCircle2} label="Completed" value={completedProjects.length} tone="emerald" />
              <AlertTile icon={AlertTriangle} label="Delayed" value={projects.filter((project) => project.status === "Delayed").length} tone="rose" />
            </div>
            <div className="mt-5 space-y-3">
              {activityFeed.map((event) => <ActivityItem key={event.id} event={event} />)}
              {!activityFeed.length && <EmptyState icon={Sparkles} title="No live project activity yet" description="Project updates and assignments will appear here." />}
            </div>
          </Card>

          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader eyebrow="Assignments" title="Team Workload & Skill Suggestions" description="Availability and workload signals for assignment planning." />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {employees.slice(0, 8).map((employee) => <EmployeeWorkload key={employee._id} employee={employee} projects={projects} />)}
              {!employees.length && <EmptyState icon={Users} title="No employees found" />}
            </div>
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-3">
          <AnalyticsCard title="Project Trend" description="Active and completed project movement.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectTrend}>
                <defs>
                  <linearGradient id="projectFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="active" stroke="#2563EB" strokeWidth={3} fill="url(#projectFill)" />
                <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Department Load" description="Assignments by department.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentLoad}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="department" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Status Mix" description="Project stages across the portfolio.">
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
      </Motion.div>

      <ProjectModal open={projectModal} onClose={() => setProjectModal(false)} onSubmit={createProject} />
      <AssignModal
        open={assignModal}
        project={selectedProject}
        employees={employees}
        assignmentDraft={assignmentDraft}
        setAssignmentDraft={setAssignmentDraft}
        onClose={() => setAssignModal(false)}
        onSubmit={submitAssignments}
      />
      <ProjectDetailsDrawer
        project={detailsOpen ? selectedProject : null}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedProject(null);
        }}
        onAssign={openAssign}
        onUpdate={updateProject}
        onRemoveEmployee={removeEmployee}
      />
    </Layout>
  );
}

function ProjectPulse({ active, delayed, overdue, progress }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Portfolio health</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{progress}%</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Average progress across active work.</p>
        </div>
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400" />
          <Target size={22} />
        </span>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusTile label="Active" value={active} />
        <StatusTile label="Delayed" value={delayed} />
        <StatusTile label="Overdue" value={overdue} />
      </div>
    </div>
  );
}

function ProjectFilters({ query, setQuery, statusFilter, setStatusFilter, departmentFilter, setDepartmentFilter, employeeFilter, setEmployeeFilter, priorityFilter, setPriorityFilter, deadlineFilter, setDeadlineFilter, departments, employees }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(135px,0.5fr))]">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search project, client, ID, employee" className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100" aria-label="Search projects" />
      </div>
      <FilterSelect icon={Filter} value={statusFilter} onChange={setStatusFilter} options={[["all", "All status"], ...projectStatuses.map((status) => [status, status])]} />
      <FilterSelect icon={Users} value={departmentFilter} onChange={setDepartmentFilter} options={[["all", "All departments"], ...departments.map((department) => [department, department])]} />
      <FilterSelect icon={UserPlus} value={employeeFilter} onChange={setEmployeeFilter} options={[["all", "All employees"], ...employees.map((employee) => [employee._id, employee.name])]} />
      <FilterSelect icon={Flag} value={priorityFilter} onChange={setPriorityFilter} options={[["all", "All priority"], ["Low", "Low"], ["Medium", "Medium"], ["High", "High"], ["Critical", "Critical"]]} />
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CalendarClock size={16} className="text-slate-400" />
        <input value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)} type="date" className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100" aria-label="Filter deadline" />
      </label>
    </div>
  );
}

function FilterSelect({ icon, value, onChange, options }) {
  const Icon = icon;
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Icon size={16} className="text-slate-400" />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100">
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </label>
  );
}

const projectStatuses = ["Active", "Completed", "Pending", "In Review", "Delayed", "Cancelled"];

function ProjectTable({ projects, onView, onAssign, onUpdate, onDelete }) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-auto">
        <table className="w-full min-w-[1260px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {["Project Name", "Project ID", "Client Name", "Assigned Employees", "Team Size", "Status", "Priority", "Deadline", "Progress", "Actions"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const assignments = getAssignments(project);
              return (
                <tr key={project._id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{project.name}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{project.projectId}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{project.clientName || "Internal"}</td>
                  <td className="px-4 py-4"><AvatarStack assignments={assignments} /></td>
                  <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{assignments.length}</td>
                  <td className="px-4 py-4"><ProjectStatusBadge status={project.status} /></td>
                  <td className="px-4 py-4"><Badge tone={priorityTone(project.priority)}>{project.priority}</Badge></td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDate(project.deadline)}</td>
                  <td className="px-4 py-4"><ProgressPill value={project.progress} /></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => onView(project)} variant="outline" size="sm" icon={Eye}>View</Button>
                      <Button onClick={() => onAssign(project)} variant="outline" size="sm" icon={UserPlus}>Assign</Button>
                      <Button onClick={() => onUpdate(project, { status: nextStatus(project.status), progress: Math.min(100, Number(project.progress || 0) + 10) })} variant="outline" size="sm" icon={Edit3}>Update</Button>
                      <Button onClick={() => onDelete(project)} variant="danger" size="sm" icon={Trash2}>Delete</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!projects.length && <div className="p-4"><EmptyState icon={BriefcaseBusiness} title="No projects found" description="Create a project or adjust your filters." /></div>}
    </div>
  );
}

function ProjectModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyProject);
  return (
    <Modal open={open} title="Create Project" description="Add project scope, client, timeline, priority, and delivery status." onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); setForm(emptyProject); }} className="grid gap-4 sm:grid-cols-2">
        <Input label="Project Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input label="Client Name" required={false} value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
        <div className="sm:col-span-2"><Textarea label="Description" required={false} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
        <Input label="Start Date" type="date" required={false} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
        <Input label="Deadline" type="date" required={false} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} />
        <Select label="Priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
          {["Low", "Medium", "High", "Critical"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </Select>
        <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </Select>
        <Input label="Timezone" required={false} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
        <Input label="Progress %" type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} />
        <Button type="submit" className="sm:col-span-2" icon={Plus}>Create Project</Button>
      </form>
    </Modal>
  );
}

function AssignModal({ open, project, employees, assignmentDraft, setAssignmentDraft, onClose, onSubmit }) {
  const [search, setSearch] = useState("");
  const filteredEmployees = employees.filter((employee) => [employee.name, employee.employeeId, employee.department, ...(employee.skills || [])].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const selectedIds = new Set(assignmentDraft.map((assignment) => String(assignment.employee)));

  const toggleEmployee = (employee) => {
    if (selectedIds.has(String(employee._id))) {
      setAssignmentDraft((current) => current.filter((assignment) => String(assignment.employee) !== String(employee._id)));
      return;
    }

    setAssignmentDraft((current) => [...current, {
      employee: employee._id,
      role: suggestedRole(employee),
      joiningDate: toInputDate(new Date()),
      deadline: toInputDate(project?.deadline),
      notes: ""
    }]);
  };

  const updateDraft = (employeeId, patch) => {
    setAssignmentDraft((current) => current.map((assignment) => String(assignment.employee) === String(employeeId) ? { ...assignment, ...patch } : assignment));
  };

  return (
    <Modal open={open} title="Assign Employees" description={project ? `Assign team members to ${project.name}` : "Assign team members"} onClose={onClose} panelClassName="max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Search size={16} className="text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees, skills, department" className="w-full bg-transparent text-sm dark:text-slate-100" />
          </div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {filteredEmployees.map((employee) => (
              <EmployeeAssignmentCard key={employee._id} employee={employee} selected={selectedIds.has(String(employee._id))} projects={[]} onClick={() => toggleEmployee(employee)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <SectionLabel icon={UserPlus} title="Selected Assignment Stack" />
          <div className="mt-4 space-y-3">
            {assignmentDraft.map((assignment) => {
              const employee = employees.find((item) => String(item._id) === String(assignment.employee)) || {};
              return (
                <div key={assignment.employee} className="rounded-2xl bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name || "Employee"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{employee.department || "Team"}</p>
                    </div>
                    <button type="button" onClick={() => toggleEmployee(employee)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={assignment.role} onChange={(event) => updateDraft(assignment.employee, { role: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white" placeholder="Project role" />
                    <input value={assignment.joiningDate} onChange={(event) => updateDraft(assignment.employee, { joiningDate: event.target.value })} type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                    <input value={assignment.deadline} onChange={(event) => updateDraft(assignment.employee, { deadline: event.target.value })} type="date" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white" />
                    <input value={assignment.notes} onChange={(event) => updateDraft(assignment.employee, { notes: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white" placeholder="Project notes" />
                  </div>
                </div>
              );
            })}
            {!assignmentDraft.length && <EmptyState icon={Users} title="No employees selected" description="Choose one or more employees from the suggestion list." />}
          </div>
          <Button onClick={onSubmit} disabled={!assignmentDraft.length} className="mt-4 w-full" icon={Send}>Sync Assignments</Button>
        </div>
      </div>
    </Modal>
  );
}

function ProjectDetailsDrawer({ project, onClose, onAssign, onUpdate, onRemoveEmployee }) {
  const assignments = getAssignments(project);
  return (
    <Modal open={Boolean(project)} title="Project Details" description="Project information, assigned employees, progress, milestones, and activity timeline." onClose={onClose} panelClassName="max-w-6xl p-0">
      {project && (
        <div className="px-6 pb-6">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
              <SectionLabel icon={BriefcaseBusiness} title="Project Information" />
              <div className="mt-4 space-y-3">
                <DetailLine label="Project Name" value={project.name} />
                <DetailLine label="Project ID" value={project.projectId} />
                <DetailLine label="Client Name" value={project.clientName || "Internal"} />
                <DetailLine label="Start Date" value={formatDate(project.startDate)} />
                <DetailLine label="Deadline" value={formatDate(project.deadline)} />
                <DetailLine label="Priority" value={project.priority} />
                <DetailLine label="Status" value={project.status} />
                <DetailLine label="Timezone" value={project.timezone} />
              </div>
              <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description || "No project description provided."}</p>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionLabel icon={Target} title="Project Progress" />
                  <ProjectStatusBadge status={project.status} />
                </div>
                <div className="mt-4"><ProgressPill value={project.progress} /></div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StatusTile label="Tasks" value={`${Math.round(Number(project.progress || 0))}% done`} />
                  <StatusTile label="Team Size" value={assignments.length} />
                  <StatusTile label="Milestones" value={(project.milestones || []).length || 4} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionLabel icon={Users} title="Assigned Employees" />
                  <Button onClick={() => onAssign(project)} variant="outline" size="sm" icon={UserPlus}>Assign</Button>
                </div>
                <div className="mt-4 space-y-3">
                  {assignments.map((assignment) => (
                    <AssignedEmployeeRow key={assignment.employee?._id || assignment.employee} project={project} assignment={assignment} onRemove={onRemoveEmployee} />
                  ))}
                  {!assignments.length && <EmptyState icon={Users} title="No employees assigned" />}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <SectionLabel icon={CalendarClock} title="Activity Timeline" />
                <div className="mt-4 space-y-3">
                  {["Project created", "Scope reviewed", "Team assigned", "Progress updated"].map((label, index) => (
                    <div key={label} className="flex gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">{label}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{index === 0 ? formatDate(project.createdAt) : "Planned milestone"}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => onUpdate(project, { progress: Math.min(100, Number(project.progress || 0) + 10) })} variant="outline" size="sm" icon={TrendingUp}>Track Progress</Button>
                  <Button onClick={() => onUpdate(project, { status: nextStatus(project.status) })} variant="outline" size="sm" icon={Edit3}>Update Status</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function EmployeeAssignmentCard({ employee, selected, onClick }) {
  return (
    <Motion.button type="button" whileHover={{ y: -2 }} onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-blue-300 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <Avatar name={employee.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{employee.employeeId || "EMS"} / {employee.department || "Team"}</p>
          </div>
        </div>
        <Badge tone={selected ? "blue" : availabilityTone(employee)}>{selected ? "Selected" : getAvailability(employee)}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(employee.skills || []).slice(0, 4).map((skill) => <Badge key={skill} tone="slate">{skill}</Badge>)}
        {!(employee.skills || []).length && <Badge tone="slate">Generalist</Badge>}
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Suggested role: {suggestedRole(employee)} / Workload {getWorkload(employee)}%</p>
    </Motion.button>
  );
}

function EmployeeWorkload({ employee, projects }) {
  const assigned = projects.filter((project) => getAssignments(project).some((assignment) => String(assignment.employee?._id || assignment.employee) === String(employee._id)));
  const workload = Math.min(100, assigned.length * 28 + getWorkload(employee) * 0.2);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        <Avatar name={employee.name} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{employee.department || "Team"}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
        <span>Workload</span>
        <span>{Math.round(workload)}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-900">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, workload)}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{assigned.length} active assignment(s)</p>
    </div>
  );
}

function AssignedEmployeeRow({ project, assignment, onRemove }) {
  const employee = assignment.employee || {};
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={employee.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name || "Employee"}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{assignment.role || "Contributor"} / {employee.department || "Team"}</p>
          </div>
        </div>
        <Button onClick={() => onRemove(project, employee._id || assignment.employee)} variant="outline" size="sm" icon={X}>Remove</Button>
      </div>
      <div className="mt-3"><ProgressPill value={assignment.progress || project.progress || 0} /></div>
    </div>
  );
}

function AvatarStack({ assignments }) {
  if (!assignments.length) return <Badge tone="slate">Unassigned</Badge>;
  return (
    <div className="flex items-center">
      {assignments.slice(0, 4).map((assignment, index) => (
        <span key={assignment.employee?._id || assignment.employee || index} className="-ml-2 first:ml-0">
          <Avatar name={assignment.employee?.name || "Employee"} />
        </span>
      ))}
      {assignments.length > 4 && <Badge tone="blue" className="ml-2">+{assignments.length - 4}</Badge>}
    </div>
  );
}

function Avatar({ name = "Employee" }) {
  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 ring-2 ring-white dark:bg-blue-500/10 dark:text-blue-300 dark:ring-slate-900">
      <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
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
    <Motion.article whileHover={{ y: -3 }} className={`overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${colors[tone] || colors.blue} bg-white/85 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-950/80"><Icon size={19} /></span>
        <Badge tone={tone}><TrendingUp size={12} /> Live</Badge>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
      <div className="mt-4 h-11 overflow-hidden rounded-xl bg-white/70 dark:bg-slate-950/70"><MiniSparkline data={data} /></div>
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

function HeroMetric({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <Icon size={18} className="text-blue-100" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function StatusTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function ProgressPill({ value = 0 }) {
  const progress = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
      </div>
    </div>
  );
}

function ProjectStatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${statusColor(status)}`} />
      <Badge tone={projectStatusTone(status)}>{status}</Badge>
    </span>
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

function SectionLabel({ icon, title }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300"><Icon size={16} /></span>
      <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
    </div>
  );
}

function AlertTile({ icon, label, value, tone }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      <Badge tone={tone} className="mt-2">Live</Badge>
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
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${event.type === "deleted" ? "bg-rose-500" : event.type === "assigned" ? "bg-blue-500" : "bg-emerald-500"}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{event.message}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(event.timestamp)}</p>
      </div>
    </Motion.div>
  );
}

function AnalyticsCard({ title, description, children }) {
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
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

function getAssignments(project) {
  return Array.isArray(project?.assignments) ? project.assignments : [];
}

function upsertProject(projects = [], nextProject) {
  const id = String(nextProject?._id || "");
  if (!id) return projects;
  const exists = projects.some((project) => String(project._id) === id);
  const nextProjects = exists
    ? projects.map((project) => String(project._id) === id ? { ...project, ...nextProject } : project)
    : [nextProject, ...projects];
  return nextProjects.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function buildProjectActivity(event = {}) {
  return {
    id: `${event.project?._id || event.timestamp}-${Math.random().toString(36).slice(2)}`,
    type: event.type || "updated",
    message: event.message || "Project updated",
    timestamp: event.timestamp || new Date().toISOString()
  };
}

function isOverdue(project) {
  if (!project?.deadline || ["Completed", "Cancelled"].includes(project.status)) return false;
  return normalizeDate(project.deadline) < normalizeDate(new Date());
}

function nextStatus(status) {
  const order = ["Pending", "Active", "In Review", "Completed"];
  return order[Math.min(order.indexOf(status) + 1, order.length - 1)] || "Active";
}

function statusColor(status) {
  const map = {
    Active: "animate-pulse bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.8)]",
    Completed: "bg-emerald-500",
    Pending: "animate-pulse bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.8)]",
    "In Review": "bg-blue-500",
    Delayed: "animate-pulse bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.8)]",
    Cancelled: "bg-slate-500"
  };
  return map[status] || "bg-slate-500";
}

function projectStatusTone(status) {
  if (["Active", "Completed"].includes(status)) return "emerald";
  if (status === "Pending") return "amber";
  if (status === "Delayed" || status === "Cancelled") return "rose";
  return "blue";
}

function priorityTone(priority) {
  if (priority === "Critical") return "rose";
  if (priority === "High") return "amber";
  if (priority === "Low") return "slate";
  return "blue";
}

function getWorkload(employee) {
  const base = (employee.projectsWorkedOn?.length || 0) * 22;
  return Math.min(96, Math.max(18, base || (employee.skills?.length || 1) * 12));
}

function getAvailability(employee) {
  const workload = getWorkload(employee);
  if (workload > 76) return "Busy";
  if (workload > 48) return "Limited";
  return "Available";
}

function availabilityTone(employee) {
  const availability = getAvailability(employee);
  if (availability === "Available") return "emerald";
  if (availability === "Limited") return "amber";
  return "rose";
}

function suggestedRole(employee) {
  const skills = (employee.skills || []).join(" ").toLowerCase();
  if (skills.includes("design")) return "Product Designer";
  if (skills.includes("react") || skills.includes("frontend")) return "Frontend Engineer";
  if (skills.includes("node") || skills.includes("backend")) return "Backend Engineer";
  if (skills.includes("qa") || skills.includes("test")) return "QA Analyst";
  if (employee.department) return `${employee.department} Contributor`;
  return "Contributor";
}

function buildProjectTrend(projects = []) {
  const rows = projects.slice(0, 8).reverse();
  if (!rows.length) return [{ label: "No data", total: 0, active: 0, completed: 0 }];
  return rows.map((project) => ({
    label: new Date(project.createdAt || project.startDate || Date.now()).toLocaleDateString(undefined, { month: "short" }),
    total: projects.length,
    active: project.status === "Active" ? 1 : 0,
    completed: project.status === "Completed" ? 1 : 0
  }));
}

function buildStatusMix(projects = []) {
  const colors = {
    Active: "#10B981",
    Completed: "#2563EB",
    Pending: "#F59E0B",
    "In Review": "#6366F1",
    Delayed: "#EF4444",
    Cancelled: "#64748B"
  };
  const data = projectStatuses.map((status) => ({
    name: status,
    value: projects.filter((project) => project.status === status).length,
    color: colors[status]
  }));
  return data.some((item) => item.value) ? data : data.map((item, index) => ({ ...item, value: index === 0 ? 1 : 0 }));
}

function buildDepartmentLoad(projects = []) {
  const map = new Map();
  projects.forEach((project) => {
    getAssignments(project).forEach((assignment) => {
      const department = assignment.employee?.department || "Team";
      map.set(department, (map.get(department) || 0) + 1);
    });
  });
  const data = Array.from(map.entries()).map(([department, count]) => ({ department, count }));
  return data.length ? data : [{ department: "No data", count: 0 }];
}

function buildMiniSeries(value = 0) {
  const number = Math.max(0, Number(value || 0));
  return [Math.max(0, number - 2), Math.max(0, number - 1), number, number + 1, Math.max(0, number)];
}

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function initials(name = "Employee") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EM";
}
