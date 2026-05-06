import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const moods = [
  { label: "Happy", value: "happy", face: ":)" },
  { label: "Neutral", value: "neutral", face: ":|" },
  { label: "Stressed", value: "stressed", face: ":/" },
  { label: "Angry", value: "angry", face: ":(" }
];

export default function AIWorkspace() {
  const { user } = useAuth();
  const [salaryForm, setSalaryForm] = useState({
    experience: 2,
    skills: Array.isArray(user?.skills) ? user.skills.join(", ") : "react,node,mongodb",
    role: user?.role || "employee",
    performanceRating: 3
  });
  const [salary, setSalary] = useState(null);
  const [career, setCareer] = useState(null);
  const [moodAnalytics, setMoodAnalytics] = useState(null);
  const [note, setNote] = useState("");
  const [report, setReport] = useState(null);

  const load = async () => {
    const [careerRes, moodRes, reportRes] = await Promise.all([
      api.get("/ai/career-growth"),
      api.get("/moods/analytics"),
      api.get("/reports/monthly")
    ]);
    setCareer(careerRes.data);
    setMoodAnalytics(moodRes.data);
    setReport(reportRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const predictSalary = async (event) => {
    event.preventDefault();
    const { data } = await api.post("/ai/predict-salary", {
      ...salaryForm,
      skills: salaryForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean)
    });
    setSalary(data);
  };

  const saveMood = async (mood) => {
    const { data } = await api.post("/moods", { mood, note });
    setMoodAnalytics(data.analytics);
    setNote("");
  };

  const downloadReport = async (format) => {
    const { data } = await api.get("/reports/monthly", {
      params: { format },
      responseType: "blob"
    });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-report.${format === "pdf" ? "pdf" : "csv"}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const salaryChart = salary
    ? [
        { name: "Min", value: salary.range.min },
        { name: "Predicted", value: salary.predictedSalary },
        { name: "Max", value: salary.range.max }
      ]
    : [];

  return (
    <Layout>
      <h1 className="mb-6 text-2xl font-semibold">AI Workspace</h1>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-xl font-semibold">Salary Prediction</h2>
          <form onSubmit={predictSalary} className="mt-5 grid gap-4 md:grid-cols-2">
            <Input label="Experience" type="number" value={salaryForm.experience} onChange={(event) => setSalaryForm({ ...salaryForm, experience: event.target.value })} />
            <Input label="Performance" type="number" min="1" max="5" value={salaryForm.performanceRating} onChange={(event) => setSalaryForm({ ...salaryForm, performanceRating: event.target.value })} />
            <Input label="Role" value={salaryForm.role} onChange={(event) => setSalaryForm({ ...salaryForm, role: event.target.value })} />
            <Input label="Skills" value={salaryForm.skills} onChange={(event) => setSalaryForm({ ...salaryForm, skills: event.target.value })} />
            <button className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white md:col-span-2">
              Predict Salary
            </button>
          </form>

          {salary && (
            <div className="mt-6">
              <p className="text-3xl font-bold text-slate-900">₹{salary.predictedSalary.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-sm text-slate-500">
                Range ₹{salary.range.min.toLocaleString("en-IN")} to ₹{salary.range.max.toLocaleString("en-IN")}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salaryChart}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-xl font-semibold">Career Growth Tracker</h2>
          <div className="mt-5 rounded-[24px] bg-white/70 p-5">
            <p className="text-sm text-slate-500">Promotion Path</p>
            <p className="mt-2 text-2xl font-bold">{career?.currentRole} to {career?.nextRole}</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${career?.readiness || 0}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600">{career?.readiness || 0}% readiness</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(career?.requiredSkills || []).map((skill) => (
              <div key={skill} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium">{skill}</div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{career?.recommendation}</p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-xl font-semibold">Mood Tracking</h2>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {moods.map((item) => (
              <button key={item.value} onClick={() => saveMood(item.value)} className="rounded-[22px] bg-white/80 px-4 py-4 text-center shadow-sm">
                <span className="block text-2xl">{item.face}</span>
                <span className="mt-2 block text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-[24px] bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Burnout Risk</p>
            <p className="mt-2 text-2xl font-bold capitalize">{moodAnalytics?.burnoutRisk || "low"}</p>
          </div>
        </section>

        <section className="glass-panel rounded-[30px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Monthly HR Report</h2>
            <div className="flex gap-2">
              <button onClick={() => downloadReport("pdf")} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">PDF</button>
              <button onClick={() => downloadReport("excel")} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Excel</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report?.charts || []}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </Layout>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input {...props} required className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
    </label>
  );
}
