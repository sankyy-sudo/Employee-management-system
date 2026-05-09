import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { CheckCircle2, Clock3, FileCheck2, Filter, Inbox, Search, Send, Sparkles } from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { Input, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";

const emptyReport = { title: "", task: "", description: "" };

const pageMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemMotion = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
};

export default function Reports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports", {
        params: { submittedBy: user?.name }
      });
      setReports(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get("/reports", { params: { submittedBy: user?.name } }).then(({ data }) => {
      if (!active) return;
      setReports(data || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const filteredReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const text = [report.title, report.task, report.description, report.status, report.submittedBy].join(" ").toLowerCase();
      return matchesStatus && (!term || text.includes(term));
    });
  }, [reports, query, statusFilter]);

  const pendingCount = reports.filter((report) => report.status === "pending").length;
  const reviewedCount = reports.filter((report) => report.status === "reviewed").length;
  const approvedCount = reports.filter((report) => report.status === "approved").length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await api.post("/reports", {
        ...form,
        submittedBy: user?.name
      });
      setForm(emptyReport);
      setMessage("Report submitted successfully.");
      await loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1280px] space-y-6">
        <Motion.section variants={itemMotion} className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">Reports</Badge>
                <Badge tone="slate">{reports.length} total</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Simple work reports</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Submit short progress updates and keep your report history easy to review.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
              <Metric icon={Clock3} label="Pending" value={pendingCount} tone="amber" />
              <Metric icon={Sparkles} label="Reviewed" value={reviewedCount} tone="blue" />
              <Metric icon={CheckCircle2} label="Approved" value={approvedCount} tone="emerald" />
            </div>
          </div>
        </Motion.section>

        {message && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            {message}
          </Motion.div>
        )}

        <Motion.section variants={itemMotion} className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader title="Submit Report" description="Keep it brief: what you did, what it relates to, and any notes." />
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input label="Report title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              <Input label="Related task" required={false} value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} />
              <Textarea label="Report details" rows={7} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              <Button type="submit" disabled={submitting} className="w-full" icon={Send}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </Card>

          <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
            <SectionHeader title="Report History" actions={<Badge tone="blue">{filteredReports.length} shown</Badge>} />
            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_200px]">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Search size={16} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search reports"
                  className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-100"
                  aria-label="Search reports"
                />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <Filter size={16} className="text-slate-400" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 dark:text-slate-100" aria-label="Filter reports">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                </select>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)
              ) : (
                filteredReports.map((report) => <ReportItem key={report._id} report={report} />)
              )}
              {!loading && !filteredReports.length && <EmptyState title="No reports found" description="Submitted reports will appear here." icon={Inbox} />}
            </div>
          </Card>
        </Motion.section>
      </Motion.div>
    </Layout>
  );
}

function Metric({ icon, label, value, tone }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-blue-600 dark:bg-slate-900 dark:text-blue-300">
        <Icon size={16} />
      </span>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
        <Badge tone={tone}>Live</Badge>
      </div>
    </div>
  );
}

function ReportItem({ report }) {
  return (
    <Motion.article whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <FileCheck2 size={17} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-950 dark:text-white">{report.title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {report.task || "General update"} / {formatDateTime(report.submittedAt)}
            </p>
          </div>
        </div>
        <Badge tone={statusTone(report.status)}>{report.status}</Badge>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{report.description}</p>
    </Motion.article>
  );
}
