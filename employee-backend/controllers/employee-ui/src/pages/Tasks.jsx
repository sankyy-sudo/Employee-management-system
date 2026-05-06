import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, humanizeTaskStatus } from "../utils/format";

const emptyTask = {
  title: "",
  description: "",
  priority: "Medium",
  dueDate: "",
  status: "todo",
  assignedTo: ""
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ ...emptyTask, assignedTo: user.name });

  const loadData = async () => {
    const { data } = await api.get("/tasks", { params: { assignedTo: user.name } });
    setTasks(data);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/tasks", { ...form, assignedTo: user.name });
    setForm({ ...emptyTask, assignedTo: user.name });
    await loadData();
  };

  const updateStatus = async (taskId, status) => {
    await api.put(`/tasks/${taskId}`, { status });
    await loadData();
  };

  const grouped = {
    todo: tasks.filter((task) => task.status === "todo"),
    inprogress: tasks.filter((task) => task.status === "inprogress"),
    completed: tasks.filter((task) => task.status === "completed")
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="glass-panel rounded-[30px] p-6">
            <h1 className="text-2xl font-semibold">My Tasks</h1>
            <p className="mt-2 text-sm text-slate-500">
              Track your own work items and update progress from to-do to completed.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Task title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <label className="block text-sm font-medium text-slate-700">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  rows="4"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Priority
                  <select
                    value={form.priority}
                    onChange={(event) => setForm({ ...form, priority: event.target.value })}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Due date
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
                Save Task
              </button>
            </form>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <TaskColumn title="To Do" items={grouped.todo} nextStatus="inprogress" onUpdate={updateStatus} />
            <TaskColumn title="In Progress" items={grouped.inprogress} nextStatus="completed" onUpdate={updateStatus} />
            <TaskColumn title="Completed" items={grouped.completed} nextStatus="completed" onUpdate={updateStatus} />
          </section>
        </div>
      </motion.div>
    </Layout>
  );
}

function TaskColumn({ title, items, nextStatus, onUpdate }) {
  return (
    <div className="glass-panel rounded-[30px] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-sm">{items.length}</span>
      </div>

      <div className="space-y-3">
        {items.map((task) => (
          <div key={task._id} className="lift-hover rounded-[24px] border border-white/70 bg-white/70 p-4">
            <p className="font-semibold text-slate-900">{task.title}</p>
            <p className="mt-1 text-sm text-slate-500">{task.description || "No description"}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              {humanizeTaskStatus(task.status)} • Due {formatDate(task.dueDate)}
            </p>
            {task.status !== "completed" && (
              <button
                onClick={() => onUpdate(task._id, nextStatus)}
                className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {nextStatus === "completed" ? "Mark Completed" : "Move to Progress"}
              </button>
            )}
          </div>
        ))}

        {!items.length && <p className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate-500">No tasks here.</p>}
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}
