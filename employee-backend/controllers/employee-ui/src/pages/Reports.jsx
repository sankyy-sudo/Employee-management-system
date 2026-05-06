import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";

const emptyReport = { title: "", task: "", description: "" };

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(emptyReport);

  const loadReports = async () => {
    const { data } = await api.get("/reports", {
      params: { submittedBy: user.name }
    });
    setReports(data);
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/reports", {
      ...form,
      submittedBy: user.name
    });
    setForm(emptyReport);
    await loadReports();
  };

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <h1 className="text-2xl font-semibold">My Reports</h1>
          <p className="mt-2 text-sm text-slate-500">Submit your daily or weekly work update here.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Report title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <Input
              label="Related task"
              value={form.task}
              onChange={(event) => setForm({ ...form, task: event.target.value })}
            />
            <label className="block text-sm font-medium text-slate-700">
              Report details
              <textarea
                required
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows="6"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </label>
            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">
              Submit Report
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-2xl font-semibold">My Report Feed</h2>
          <div className="mt-4 space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="lift-hover rounded-[28px] border border-white/70 bg-white/70 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{report.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.submittedBy} • {formatDateTime(report.submittedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {report.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-600">{report.description}</p>
              </div>
            ))}
            {!reports.length && <p className="text-sm text-slate-500">No reports available yet.</p>}
          </div>
        </section>
      </div>
    </Layout>
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
