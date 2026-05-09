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
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Clock3,
  Filter,
  Flame,
  Inbox,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, humanizeTaskStatus } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";

const emptyTask = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  status: "todo",
  assignedTo: ""
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

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ ...emptyTask, assignedTo: user?.name || "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks", { params: { assignedTo: user?.name } });
      setTasks(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/tasks", { params: { assignedTo: user?.name } }).then(({ data }) => {
      if (!active) return;
      setTasks(data || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const filteredTasks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const priority = normalizePriority(task.priority);
      const matchesPriority = priorityFilter === "all" || priority === priorityFilter;
      const searchText = [task.title, task.description, task.status, task.priority, task.assignedBy?.name, formatDate(task.dueDate)].join(" ").toLowerCase();
      return matchesPriority && (!term || searchText.includes(term));
    });
  }, [tasks, query, priorityFilter]);

  const grouped = {
    todo: filteredTasks.filter((task) => task.status === "todo"),
    inprogress: filteredTasks.filter((task) => task.status === "inprogress"),
    completed: filteredTasks.filter((task) => task.status === "completed")
  };

  const openTasks = tasks.filter((task) => task.status !== "completed");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const urgentTasks = openTasks.filter((task) => ["high", "urgent"].includes(normalizePriority(task.priority)));
  const overdueTasks = openTasks.filter((task) => isOverdue(task));
  const dueSoonTasks = openTasks.filter((task) => isDueSoon(task));
  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const focusScore = Math.min(98, Math.max(42, completionRate + grouped.inprogress.length * 8 - overdueTasks.length * 12));
  const priorityMix = buildPriorityMix(tasks);
  const flowTrend = buildFlowTrend(tasks);
  const statusMix = buildStatusMix(tasks);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/tasks", { ...form, assignedTo: user?.name, priority: normalizePriority(form.priority) });
      setForm({ ...emptyTask, assignedTo: user?.name || "" });
      setMessage("Task created and added to your workflow.");
      await loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (taskId, status) => {
    setMessage("");
    await api.put(`/tasks/${taskId}`, { status });
    setMessage(status === "completed" ? "Task completed. Nice momentum." : "Task moved forward.");
    await loadData();
  };

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1600px] space-y-6">
        <Motion.section variants={itemMotion} className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">Task workspace</Badge>
                <Badge tone={urgentTasks.length ? "rose" : "emerald"}>{urgentTasks.length} high priority</Badge>
                <Badge tone={overdueTasks.length ? "amber" : "slate"}>{overdueTasks.length} overdue</Badge>
              </div>
              <div className="mt-6 max-w-3xl">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">My delivery queue</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Turn scattered work into a focused execution board.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Create tasks, move work across stages, watch deadlines, and track productivity with a clean SaaS-grade workspace.
                </p>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroMetric icon={ListChecks} label="Open tasks" value={openTasks.length} tone="blue" />
                <HeroMetric icon={CheckCircle2} label="Completion" value={`${completionRate}%`} tone="emerald" />
                <HeroMetric icon={CalendarClock} label="Due soon" value={dueSoonTasks.length} tone="amber" />
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/60 sm:p-7 xl:border-l xl:border-t-0">
              <SectionLabel icon={Sparkles} title="Workflow pulse" />
              <div className="mt-5 space-y-3">
                <BriefRow label="Focus score" value={`${focusScore}%`} tone={focusScore > 75 ? "emerald" : "amber"} />
                <BriefRow label="In progress" value={grouped.inprogress.length} tone="blue" />
                <BriefRow label="Blocked risk" value={overdueTasks.length} tone={overdueTasks.length ? "rose" : "emerald"} />
                <BriefRow label="Next deadline" value={formatDate(getNextDeadline(openTasks)?.dueDate)} tone="amber" />
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard icon={CircleDashed} title="To Do" value={grouped.todo.length} detail="Ready to pick up" tone="slate" />
            <KpiCard icon={Timer} title="In Progress" value={grouped.inprogress.length} detail="Currently active" tone="blue" />
            <KpiCard icon={CheckCircle2} title="Completed" value={completedTasks.length} detail={`${completionRate}% completion`} tone="emerald" />
            <KpiCard icon={AlertTriangle} title="Deadline Risk" value={overdueTasks.length} detail={`${dueSoonTasks.length} due soon`} tone={overdueTasks.length ? "rose" : "amber"} />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Create" title="New Task" description="Capture the next unit of work with owner, priority, and deadline context." />
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input label="Task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <Textarea label="Description" required={false} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} />
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
                <Input label="Due date" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
              </div>
              <TaskPreview form={form} />
              <Button type="submit" disabled={submitting} className="w-full" icon={Plus}>
                {submitting ? "Saving..." : "Create Task"}
              </Button>
            </form>
          </Card>

          <div className="grid gap-6">
            <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
              <SectionHeader eyebrow="Board" title="Execution Board" description="Linear-style task lanes for active delivery." actions={<Badge tone="blue">{filteredTasks.length} visible</Badge>} />
              <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_220px]">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Search size={16} className="text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tasks, status, dates, owner"
                    className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100"
                    aria-label="Search tasks"
                  />
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <Filter size={16} className="text-slate-400" />
                  <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter priority">
                    <option value="all">All priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                <TaskColumn title="To Do" icon={CircleDashed} items={grouped.todo} nextStatus="inprogress" onUpdate={updateStatus} tone="slate" />
                <TaskColumn title="In Progress" icon={Timer} items={grouped.inprogress} nextStatus="completed" onUpdate={updateStatus} tone="blue" />
                <TaskColumn title="Completed" icon={CheckCircle2} items={grouped.completed} nextStatus="completed" onUpdate={updateStatus} tone="emerald" />
              </div>
            </Card>
          </div>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Deadlines" title="Deadline Radar" description="Upcoming, overdue, and high-priority work that needs attention." />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <DeadlineList title="Due Soon" icon={CalendarClock} items={dueSoonTasks} empty="Nothing urgent in the next few days." />
              <DeadlineList title="Overdue" icon={AlertTriangle} items={overdueTasks} empty="No overdue work. Keep it tidy." danger />
            </div>
          </Card>

          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader eyebrow="Activity" title="Workflow Timeline" description="Recent task movement and delivery signal." />
            <div className="mt-5 space-y-4">
              {tasks.slice(0, 5).map((task) => <TimelineItem key={task._id} task={task} />)}
              {!tasks.length && <EmptyState icon={Inbox} title="No task activity yet" description="Create a task to start building your workflow history." />}
            </div>
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-3">
          <AnalyticsCard title="Flow Trend" description="Task creation and completion momentum.">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowTrend}>
                <defs>
                  <linearGradient id="taskFlowFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="created" stroke="#2563EB" strokeWidth={3} fill="url(#taskFlowFill)" />
                <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Priority Load" description="Work distribution by urgency.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityMix}>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#F59E0B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsCard>

          <AnalyticsCard title="Status Mix" description="A clean breakdown of work stages.">
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
    </Layout>
  );
}

function TaskColumn({ title, icon, items, nextStatus, onUpdate, tone }) {
  const ColumnIcon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
            <ColumnIcon size={17} />
          </span>
          <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>
        </div>
        <Badge tone={tone}>{items.length}</Badge>
      </div>

      <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
        {items.map((task) => (
          <TaskCard key={task._id} task={task} nextStatus={nextStatus} onUpdate={onUpdate} />
        ))}
        {!items.length && <EmptyState title="No tasks here" description="Tasks will appear here as their status changes." />}
      </div>
    </div>
  );
}

function TaskCard({ task, nextStatus, onUpdate }) {
  const completed = task.status === "completed";
  return (
    <Motion.article whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-5 text-slate-950 dark:text-white">{task.title}</p>
        <Badge tone={statusTone(task.priority || "medium")}>{normalizePriority(task.priority)}</Badge>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{task.description || "No description added."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(task.status)}>{humanizeTaskStatus(task.status)}</Badge>
        <Badge tone={isOverdue(task) ? "rose" : isDueSoon(task) ? "amber" : "slate"}>Due {formatDate(task.dueDate)}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-400">
          <p className="truncate">By {task.assignedBy?.name || "Self"}</p>
          <p className="mt-1">Focus {getTaskScore(task)}%</p>
        </div>
        {!completed && (
          <Button onClick={() => onUpdate(task._id, nextStatus)} variant={nextStatus === "completed" ? "success" : "secondary"} size="sm" icon={ArrowRight}>
            {nextStatus === "completed" ? "Complete" : "Start"}
          </Button>
        )}
      </div>
    </Motion.article>
  );
}

function TaskPreview({ form }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Preview</p>
          <p className="mt-2 font-semibold text-slate-950 dark:text-white">{form.title || "Untitled task"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{form.description || "Add a useful description for future you."}</p>
        </div>
        <Badge tone={statusTone(form.priority)}>{form.priority}</Badge>
      </div>
    </div>
  );
}

function DeadlineList({ title, icon, items, empty, danger = false }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}><Icon size={17} /></span>
          <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
        </div>
        <Badge tone={danger ? "rose" : "amber"}>{items.length}</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {items.slice(0, 5).map((task) => (
          <div key={task._id} className="rounded-2xl bg-white p-4 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">{task.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Due {formatDate(task.dueDate)} - {normalizePriority(task.priority)}</p>
          </div>
        ))}
        {!items.length && <EmptyState icon={CheckCircle2} title={empty} />}
      </div>
    </div>
  );
}

function TimelineItem({ task }) {
  const completed = task.status === "completed";
  return (
    <div className="flex gap-3">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${completed ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
        {completed ? <CheckCircle2 size={17} /> : <ClipboardList size={17} />}
      </span>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-slate-950 dark:text-white">{task.title}</p>
          <Badge tone={statusTone(task.status)}>{humanizeTaskStatus(task.status)}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Due {formatDate(task.dueDate)} - {normalizePriority(task.priority)} priority</p>
      </div>
    </div>
  );
}

function KpiCard({ icon, title, value, detail, tone }) {
  const Icon = icon;
  return (
    <Motion.article whileHover={{ y: -3 }} className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-blue-600 dark:bg-slate-950 dark:text-blue-300"><Icon size={19} /></span>
        <Badge tone={tone}><TrendingUp size={12} /> Live</Badge>
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </Motion.article>
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

function normalizePriority(priority = "") {
  return String(priority || "medium").toLowerCase();
}

function isOverdue(task) {
  if (!task?.dueDate || task.status === "completed") return false;
  return normalizeDate(task.dueDate) < normalizeDate(new Date());
}

function isDueSoon(task) {
  if (!task?.dueDate || task.status === "completed" || isOverdue(task)) return false;
  const due = normalizeDate(task.dueDate);
  const today = normalizeDate(new Date());
  return due - today <= 3 * 86400000;
}

function getNextDeadline(tasks = []) {
  return tasks.filter((task) => task.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
}

function getTaskScore(task) {
  let score = task.status === "completed" ? 100 : task.status === "inprogress" ? 68 : 36;
  if (["high", "urgent"].includes(normalizePriority(task.priority))) score -= 8;
  if (isOverdue(task)) score -= 20;
  return Math.max(10, Math.min(100, score));
}

function buildPriorityMix(tasks = []) {
  return ["urgent", "high", "medium", "low"].map((priority) => ({
    label: priority.charAt(0).toUpperCase() + priority.slice(1),
    count: tasks.filter((task) => normalizePriority(task.priority) === priority).length
  }));
}

function buildStatusMix(tasks = []) {
  const data = [
    { name: "To Do", value: tasks.filter((task) => task.status === "todo").length, color: "#64748B" },
    { name: "In Progress", value: tasks.filter((task) => task.status === "inprogress").length, color: "#2563EB" },
    { name: "Completed", value: tasks.filter((task) => task.status === "completed").length, color: "#10B981" }
  ];
  return data.some((item) => item.value) ? data : data.map((item, index) => ({ ...item, value: index === 0 ? 1 : 0 }));
}

function buildFlowTrend(tasks = []) {
  const buckets = new Map();
  tasks.forEach((task) => {
    const date = new Date(task.createdAt || task.dueDate || Date.now());
    const label = date.toLocaleDateString(undefined, { weekday: "short" });
    const current = buckets.get(label) || { label, created: 0, completed: 0 };
    current.created += 1;
    if (task.status === "completed") current.completed += 1;
    buckets.set(label, current);
  });
  const data = Array.from(buckets.values()).slice(-7);
  return data.length ? data : ["Mon", "Tue", "Wed", "Thu", "Fri"].map((label, index) => ({ label, created: index + 1, completed: Math.max(0, index - 1) }));
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
