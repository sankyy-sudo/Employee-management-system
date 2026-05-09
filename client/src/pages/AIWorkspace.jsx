import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BrainCircuit, Download, Sparkles } from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Page from "../components/ui/Page";
import { Input, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";

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
      <Page eyebrow="AI Workspace" title="AI Workspace" description="Use workforce intelligence for salary prediction, career readiness, mood signals, and monthly reports.">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <SectionHeader title="Salary Prediction" description="Estimate compensation from experience, role, skills, and performance." />
            <form onSubmit={predictSalary} className="mt-5 grid gap-4 md:grid-cols-2">
              <Input label="Experience" type="number" value={salaryForm.experience} onChange={(event) => setSalaryForm({ ...salaryForm, experience: event.target.value })} />
              <Input label="Performance" type="number" min="1" max="5" value={salaryForm.performanceRating} onChange={(event) => setSalaryForm({ ...salaryForm, performanceRating: event.target.value })} />
              <Input label="Role" value={salaryForm.role} onChange={(event) => setSalaryForm({ ...salaryForm, role: event.target.value })} />
              <Input label="Skills" value={salaryForm.skills} onChange={(event) => setSalaryForm({ ...salaryForm, skills: event.target.value })} />
              <Button type="submit" icon={Sparkles} className="md:col-span-2">Predict Salary</Button>
            </form>

            {salary ? (
              <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <p className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Rs {salary.predictedSalary.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Range Rs {salary.range.min.toLocaleString("en-IN")} to Rs {salary.range.max.toLocaleString("en-IN")}
                </p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="mt-6"><EmptyState title="No prediction yet" description="Run a salary prediction to see a range and chart." /></div>
            )}
          </Card>

          <Card className="p-6">
            <SectionHeader title="Career Growth Tracker" description="Promotion readiness and recommended skill focus." />
            <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Promotion Path</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{career?.currentRole || "Current"} to {career?.nextRole || "Next"}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${career?.readiness || 0}%` }} />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{career?.readiness || 0}% readiness</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(career?.requiredSkills || []).map((skill) => <Badge key={skill}>{skill}</Badge>)}
            </div>
            {career?.recommendation && <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{career.recommendation}</p>}
          </Card>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <SectionHeader title="Mood Tracking" description="Capture a quick wellbeing signal and optional context note." />
            <Textarea label="Optional note" required={false} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context if useful" />
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {moods.map((item) => (
                <button key={item.value} onClick={() => saveMood(item.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-blue-500/10">
                  <span className="block text-2xl">{item.face}</span>
                  <span className="mt-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Burnout Risk</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-2xl font-semibold capitalize text-slate-950 dark:text-white">{moodAnalytics?.burnoutRisk || "low"}</p>
                <Badge tone={statusTone(moodAnalytics?.burnoutRisk || "low")}>{moodAnalytics?.burnoutRisk || "low"}</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader
              title="Monthly HR Report"
              description="Export monthly workforce analytics when the backend report is ready."
              actions={<><Button onClick={() => downloadReport("pdf")} variant="secondary" size="sm" icon={Download}>PDF</Button><Button onClick={() => downloadReport("excel")} variant="success" size="sm" icon={Download}>Excel</Button></>}
            />
            <div className="mt-5 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report?.charts || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!report?.charts?.length && <EmptyState title="No report chart data" icon={BrainCircuit} />}
          </Card>
        </div>
      </Page>
    </Layout>
  );
}
