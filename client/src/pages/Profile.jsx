import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import {
  RadialBar,
  RadialBarChart
} from "recharts";
import {
  Activity,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Contact,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileCheck2,
  FileText,
  Fingerprint,
  Filter,
  FolderOpen,
  Grid2X2,
  HeartPulse,
  Home,
  Image,
  Inbox,
  List,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import { Field, Input, Select, Textarea } from "../components/ui/Form";
import { statusTone } from "../utils/statusTone";

const pageMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } }
};

const tabs = [
  "Overview",
  "Documents",
  "Professional",
  "Leaves",
  "Payroll",
  "Activity",
  "Security",
  "System"
];

const initialDocumentForm = {
  title: "",
  documentType: "resume",
  file: null
};

const documentTypes = [
  { value: "aadhaar_card", label: "Aadhaar Card", group: "Identity" },
  { value: "pan_card", label: "PAN Card", group: "Identity" },
  { value: "resume", label: "Resume", group: "Career" },
  { value: "offer_letter", label: "Offer Letter", group: "Employment" },
  { value: "certificate", label: "Certificate", group: "Education" },
  { value: "experience_letter", label: "Experience Letter", group: "Employment" },
  { value: "salary_slip", label: "Salary Slip", group: "Payroll" },
  { value: "id_proof", label: "ID Proof", group: "Identity" },
  { value: "education_document", label: "Educational Document", group: "Education" },
  { value: "project_document", label: "Project Document", group: "Work" },
  { value: "error_screenshot", label: "Error Screenshot", group: "Work" },
  { value: "other", label: "Other", group: "General" }
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);
  const [documentSubmitting, setDocumentSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentQuery, setDocumentQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [documentView, setDocumentView] = useState("grid");
  const [previewDocument, setPreviewDocument] = useState(null);
  const [replaceDocument, setReplaceDocument] = useState(null);
  const [replaceForm, setReplaceForm] = useState(initialDocumentForm);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/auth/me").then(({ data }) => {
      if (!active) return;
      setProfile(data);
      setUser(data);
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [setUser]);

  const profileId = profile?._id || profile?.id;
  const role = String(user?.role || profile?.role || "").toLowerCase();
  const isManager = ["admin", "hr"].includes(role);
  const completion = Number(profile?.profileCompletion || getProfileCompletion(profile));
  const documentStats = useMemo(() => buildDocumentStats(documents), [documents]);
  const activity = useMemo(() => buildActivity(profile, documents), [profile, documents]);

  const activeTab = normalizeTab(searchParams.get("tab"));

  const changeTab = useCallback((tab) => {
    setSearchParams(tab === "Overview" ? {} : { tab });
  }, [setSearchParams]);

  const loadDocuments = useCallback(async () => {
    if (!profileId) return;

    setDocumentsLoading(true);
    try {
      const { data } = await api.get("/documents", {
        params: isManager ? { employeeId: profileId } : {}
      });
      setDocuments(data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load documents.");
    } finally {
      setDocumentsLoading(false);
    }
  }, [isManager, profileId]);

  useEffect(() => {
    if (!profileId) return undefined;

    let active = true;
    api.get("/documents", {
      params: isManager ? { employeeId: profileId } : {}
    }).then(({ data }) => {
      if (!active) return;
      setDocuments(data || []);
      setDocumentsLoading(false);
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError.response?.data?.message || "Unable to load documents.");
      setDocumentsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isManager, profileId]);

  const handleProfileUpdate = useCallback(async (payload) => {
    if (!profileId) {
      setError("Profile data is not ready yet. Please try again.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.put(`/employees/${profileId}`, payload);
      setProfile(data);
      setUser(data);
      setEditOpen(false);
      setMessage("Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }, [profileId, setUser]);

  const downloadProfile = useCallback(() => {
    const rows = flattenProfile(profile);
    const csv = ["Field,Value", ...rows.map(([key, value]) => `${JSON.stringify(key)},${JSON.stringify(value ?? "")}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile?.employeeId || "employee"}-profile.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [profile]);

  const handleDocumentSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!documentForm.file) return;

    setDocumentSubmitting(true);
    setUploadProgress(0);
    setError("");
    setMessage("");

    try {
      const payload = new FormData();
      payload.append("title", documentForm.title || documentForm.file.name);
      payload.append("documentType", documentForm.documentType);
      payload.append("file", documentForm.file);

      if (isManager && profileId) {
        payload.append("employeeId", profileId);
      }

      await api.post("/documents", payload, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (eventProgress) => {
          if (!eventProgress.total) return;
          setUploadProgress(Math.round((eventProgress.loaded * 100) / eventProgress.total));
        }
      });

      setDocumentForm(initialDocumentForm);
      setMessage("Document uploaded successfully.");
      await loadDocuments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to upload document.");
    } finally {
      setDocumentSubmitting(false);
      setUploadProgress(0);
    }
  }, [documentForm, isManager, loadDocuments, profileId]);

  const handleDocumentDelete = useCallback(async (documentId) => {
    if (!documentId || !window.confirm("Delete this document?")) return;

    setError("");
    setMessage("");
    try {
      await api.delete(`/documents/${documentId}`);
      setMessage("Document deleted.");
      setPreviewDocument((current) => current?._id === documentId ? null : current);
      await loadDocuments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete document.");
    }
  }, [loadDocuments]);

  const openReplaceDocument = useCallback((document) => {
    setReplaceDocument(document);
    setReplaceForm({
      title: document.title || "",
      documentType: document.documentType || "resume",
      file: null
    });
  }, []);

  const handleDocumentReplace = useCallback(async (event) => {
    event.preventDefault();
    if (!replaceDocument?._id) return;

    setReplaceSubmitting(true);
    setReplaceProgress(0);
    setError("");
    setMessage("");

    try {
      const payload = new FormData();
      payload.append("title", replaceForm.title || replaceDocument.title);
      payload.append("documentType", replaceForm.documentType || replaceDocument.documentType);
      if (replaceForm.file) payload.append("file", replaceForm.file);

      await api.put(`/documents/${replaceDocument._id}`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (eventProgress) => {
          if (!eventProgress.total) return;
          setReplaceProgress(Math.round((eventProgress.loaded * 100) / eventProgress.total));
        }
      });

      setReplaceDocument(null);
      setReplaceForm(initialDocumentForm);
      setMessage("Document updated successfully.");
      await loadDocuments();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update document.");
    } finally {
      setReplaceSubmitting(false);
      setReplaceProgress(0);
    }
  }, [loadDocuments, replaceDocument, replaceForm]);

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-[1600px] space-y-6">
          <Skeleton className="h-72" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1600px] space-y-6">
        <ProfileHeader profile={profile} completion={completion} documentStats={documentStats} onEdit={() => setEditOpen(true)} onDownload={downloadProfile} />

        {message && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            {message}
          </Motion.div>
        )}

        {error && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </Motion.div>
        )}

        <Motion.div variants={itemMotion} className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <ProfilePanel profile={profile} completion={completion} documentStats={documentStats} />
            <TabPanel activeTab={activeTab} setActiveTab={changeTab} />
          </aside>

          <main className="space-y-6">
            {activeTab === "Overview" && (
              <>
                <WorkspaceSummary profile={profile} documentStats={documentStats} />
                <PersonalDetails profile={profile} />
                <FamilyEmergency profile={profile} />
                <Recognition profile={profile} />
              </>
            )}

            {activeTab === "Documents" && (
              <DocumentsWorkspace
                documents={documents}
                loading={documentsLoading}
                form={documentForm}
                setForm={setDocumentForm}
                submitting={documentSubmitting}
                uploadProgress={uploadProgress}
                query={documentQuery}
                setQuery={setDocumentQuery}
                typeFilter={documentTypeFilter}
                setTypeFilter={setDocumentTypeFilter}
                view={documentView}
                setView={setDocumentView}
                onSubmit={handleDocumentSubmit}
                onDelete={handleDocumentDelete}
                onReplace={openReplaceDocument}
                onPreview={setPreviewDocument}
                profile={profile}
              />
            )}

            {activeTab === "Professional" && (
              <>
                <ProfessionalDetails profile={profile} />
                <ActivityTimeline items={activity} />
              </>
            )}

            {activeTab === "Leaves" && <LeaveAnalytics profile={profile} />}

            {activeTab === "Payroll" && <PayrollOverview profile={profile} documents={documents} />}

            {activeTab === "Activity" && <ActivityTimeline items={activity} />}

            {activeTab === "Security" && <SecuritySection profile={profile} />}

            {activeTab === "System" && <SystemInformation profile={profile} activity={activity} />}
          </main>
        </Motion.div>
      </Motion.div>

      <EditProfileModal key={`${profileId || "profile"}-${profile?.updatedAt || ""}-${editOpen ? "open" : "closed"}`} open={editOpen} profile={profile} saving={saving} onClose={() => setEditOpen(false)} onSubmit={handleProfileUpdate} />
      <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
      <ReplaceDocumentModal
        document={replaceDocument}
        form={replaceForm}
        setForm={setReplaceForm}
        submitting={replaceSubmitting}
        progress={replaceProgress}
        onClose={() => setReplaceDocument(null)}
        onSubmit={handleDocumentReplace}
      />
    </Layout>
  );
}

function ProfileHeader({ profile, completion, documentStats, onEdit, onDownload }) {
  return (
    <Motion.section variants={itemMotion} className="sticky top-[73px] z-20 overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div className="bg-gradient-to-r from-blue-600 via-slate-900 to-emerald-600 p-5 text-white sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar name={profile?.name} size="lg" className="h-20 w-20 rounded-2xl text-2xl ring-4 ring-white/20" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{profile?.employeeId || "No employee ID"}</Badge>
                <Badge tone={statusTone(profile?.role)}>{profile?.role || "Employee"}</Badge>
                <Badge tone={statusTone(profile?.status || "Active")}>{profile?.status || "Active"}</Badge>
              </div>
              <h1 className="mt-3 truncate text-3xl font-bold tracking-tight sm:text-4xl">{profile?.name || "Employee"}</h1>
              <p className="mt-2 text-sm text-blue-100">{profile?.department || "No department"} / Last seen {formatDateTime(profile?.lastSeenAt)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onEdit} icon={Edit3}>Edit Profile</Button>
            <Link to="/chat" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100">
              <MessageSquare size={16} /> Message
            </Link>
            <Button onClick={onDownload} variant="outline" icon={Download}>Download</Button>
            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20" aria-label="More actions">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-3">
        <MiniStat label="Profile completion" value={`${completion}%`} />
        <MiniStat label="Documents" value={`${documentStats.total} files`} />
        <MiniStat label="Security" value={profile?.faceProfile?.enrolledAt ? "Enrolled" : "Not enrolled"} />
      </div>
    </Motion.section>
  );
}

function ProfilePanel({ profile, completion, documentStats }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <Avatar name={profile?.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{profile?.name || "Employee"}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{profile?.email}</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Completion</span>
          <span>{completion}%</span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-slate-100 dark:bg-slate-800">
          <Motion.div initial={{ width: 0 }} animate={{ width: `${completion}%` }} className="h-full rounded-full bg-blue-600" />
        </div>
      </div>
      <div className="mt-5 space-y-3 text-sm">
        <KeyValue icon={BriefcaseBusiness} label="Department" value={profile?.department} />
        <KeyValue icon={Phone} label="Phone" value={profile?.phone} />
        <KeyValue icon={CalendarDays} label="Joined" value={formatDate(profile?.dateOfJoining)} />
        <KeyValue icon={WalletCards} label="Salary" value={currency(profile?.salary)} />
        <KeyValue icon={FolderOpen} label="Documents" value={`${documentStats.total} files`} />
      </div>
    </Card>
  );
}

function TabPanel({ activeTab, setActiveTab }) {
  return (
    <Card className="border-white/70 bg-white/80 p-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            activeTab === tab
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          {tab}
          {activeTab === tab && <span className="h-2 w-2 rounded-full bg-blue-600" />}
        </button>
      ))}
    </Card>
  );
}

function WorkspaceSummary({ profile, documentStats }) {
  const cards = [
    { icon: FileCheck2, label: "Verified Documents", value: documentStats.verified, tone: "emerald" },
    { icon: FolderOpen, label: "Employee Files", value: documentStats.total, tone: "blue" },
    { icon: CalendarDays, label: "Leave Balance", value: sumLeave(profile?.leaveBalance), tone: "amber" },
    { icon: WalletCards, label: "Monthly Salary", value: currency(profile?.salary), tone: "slate" }
  ];

  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Workspace" title="Employee Workspace Summary" description="Profile, document, leave, payroll, and security signals in one employee hub." />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Motion.div key={card.label} whileHover={{ y: -2 }} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                <Icon size={18} />
              </span>
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{card.label}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="truncate text-2xl font-bold text-slate-950 dark:text-white">{card.value}</p>
                <Badge tone={card.tone}>Live</Badge>
              </div>
            </Motion.div>
          );
        })}
      </div>
    </Card>
  );
}

function DocumentsWorkspace({
  documents,
  loading,
  form,
  setForm,
  submitting,
  uploadProgress,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  view,
  setView,
  onSubmit,
  onDelete,
  onReplace,
  onPreview,
  profile
}) {
  const filteredDocuments = useMemo(() => {
    const term = query.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesType = typeFilter === "all" || document.documentType === typeFilter;
      const text = [
        document.title,
        document.originalName,
        document.documentType,
        document.employee?.name,
        document.employee?.department,
        document.uploadedBy?.name
      ].join(" ").toLowerCase();
      return matchesType && (!term || text.includes(term));
    });
  }, [documents, query, typeFilter]);

  const stats = buildDocumentStats(documents);

  const setFile = (file) => {
    if (!file) return;
    setForm((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-white/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="grid gap-6 bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-5 text-white sm:p-6 lg:grid-cols-[1fr_340px]">
          <div>
            <Badge tone="blue" className="bg-white/15 text-white ring-white/20">Document vault</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Employee files and verification documents</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
              Upload, preview, organize, and manage important employee documents directly inside {profile?.name || "the employee"}'s workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniMetric label="Files" value={stats.total} />
            <MiniMetric label="Verified" value={stats.verified} />
            <MiniMetric label="Pending" value={stats.pending} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          <SectionHeader eyebrow="Upload" title="Add Document" description="Add PDFs, images, certificates, salary slips, and HR verification files." />
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Document Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <Select label="Document Type" value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
              {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>

            <Field label="File" hint={form.file ? `${form.file.name} / ${formatBytes(form.file.size)}` : "PDF, DOC, DOCX, JPG, PNG, WEBP supported"}>
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setFile(event.dataTransfer.files?.[0]);
                }}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-blue-500/10"
              >
                <UploadCloud className="text-blue-600 dark:text-blue-300" size={30} />
                <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{form.file ? form.file.name : "Drop file here or browse"}</span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Drag-and-drop upload surface with native file picker</span>
                <input
                  required
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setFile(event.target.files?.[0])}
                  className="sr-only"
                />
              </label>
            </Field>

            {submitting && (
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Uploading</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <Motion.div animate={{ width: `${uploadProgress}%` }} className="h-full rounded-full bg-blue-600" />
                </div>
              </div>
            )}

            <Button type="submit" disabled={submitting || !form.file} icon={UploadCloud} className="w-full" variant="secondary">
              {submitting ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </Card>

        <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
          <SectionHeader
            eyebrow="Library"
            title="Documents"
            description="Search, filter, preview, download, and remove employee files."
            actions={<Badge tone="blue">{filteredDocuments.length} shown</Badge>}
          />

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_210px_auto]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Search size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
                aria-label="Search documents"
              />
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Filter size={16} className="text-slate-400" />
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100" aria-label="Filter documents">
                <option value="all">All types</option>
                {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <ViewButton active={view === "grid"} onClick={() => setView("grid")} icon={Grid2X2} label="Grid view" />
              <ViewButton active={view === "list"} onClick={() => setView("list")} icon={List} label="List view" />
            </div>
          </div>

          <div className={view === "grid" ? "mt-5 grid gap-3 md:grid-cols-2" : "mt-5 grid gap-3"}>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40" />)
            ) : (
              filteredDocuments.map((document) => (
                <DocumentCard
                  key={document._id}
                  document={document}
                  compact={view === "list"}
                  onDelete={onDelete}
                  onReplace={onReplace}
                  onPreview={onPreview}
                />
              ))
            )}
            {!loading && !filteredDocuments.length && (
              <div className={view === "grid" ? "md:col-span-2" : ""}>
                <EmptyState title="No documents found" description="Uploaded files and verification documents will appear here." icon={Inbox} />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ViewButton({ active, onClick, icon, label }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}
      aria-label={label}
      title={label}
    >
      <Icon size={16} />
    </button>
  );
}

function DocumentCard({ document, compact, onDelete, onReplace, onPreview }) {
  const url = getDocumentUrl(document);
  const typeLabel = humanizeDocumentType(document.documentType);
  const verified = isVerifiedDocument(document);

  return (
    <Motion.article whileHover={{ y: -2 }} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${compact ? "lg:flex lg:items-center lg:justify-between lg:gap-4" : ""}`}>
      <div className="flex min-w-0 gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
          <FileTypeIcon mimeType={document.mimeType} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{document.title}</p>
            <Badge tone={verified ? "emerald" : "amber"}>{verified ? "Verified" : "Pending HR"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{typeLabel} / {document.employee?.name || "Employee"}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{document.originalName} / {formatBytes(document.size)}</p>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "mt-4 lg:mt-0" : "mt-5"}`}>
        <Badge tone="slate">{document.storageProvider || "local"}</Badge>
        <Badge tone="blue">{formatDate(document.createdAt)}</Badge>
        {onPreview && (
          <button onClick={() => onPreview(document)} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" type="button">
            <Eye size={15} /> Preview
          </button>
        )}
        {onReplace && (
          <button onClick={() => onReplace(document)} className="inline-flex h-9 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200" type="button">
            <UploadCloud size={15} /> Replace
          </button>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">
          <Download size={15} /> Download
        </a>
        {onDelete && <Button onClick={() => onDelete(document._id)} variant="danger" size="sm" icon={Trash2}>Delete</Button>}
      </div>
    </Motion.article>
  );
}

function DocumentPreviewModal({ document, onClose }) {
  const url = document ? getDocumentUrl(document) : "";
  const isImage = document?.mimeType?.includes("image");
  const isPdf = document?.mimeType?.includes("pdf");

  return (
    <Modal open={Boolean(document)} title={document?.title || "Document Preview"} description={document ? `${humanizeDocumentType(document.documentType)} / ${document.originalName}` : ""} onClose={onClose} panelClassName="max-w-5xl p-0">
      {document && (
        <div className="p-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            {isImage ? (
              <img src={url} alt={document.title} className="max-h-[65vh] w-full object-contain" />
            ) : isPdf ? (
              <iframe src={url} title={document.title} className="h-[65vh] w-full" />
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <FileText className="text-blue-600 dark:text-blue-300" size={42} />
                <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">Preview unavailable</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">This file type is stored securely and can be opened in a new tab or downloaded.</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge tone={isVerifiedDocument(document) ? "emerald" : "amber"}>{isVerifiedDocument(document) ? "Verified" : "Pending HR"}</Badge>
              <Badge tone="slate">{formatBytes(document.size)}</Badge>
              <Badge tone="blue">{formatDateTime(document.createdAt)}</Badge>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Download size={15} /> Open File
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

function ReplaceDocumentModal({ document, form, setForm, submitting, progress, onClose, onSubmit }) {
  const setFile = (file) => {
    if (!file) return;
    setForm((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.[^/.]+$/, "")
    }));
  };

  return (
    <Modal
      open={Boolean(document)}
      title="Replace Document"
      description={document ? `Update metadata or replace the file for ${document.title}.` : ""}
      onClose={onClose}
      panelClassName="max-w-3xl p-0"
    >
      {document && (
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 sm:col-span-2">
              Leave the file empty to update only the title or document type. Choosing a file replaces the stored document.
            </div>

            <Input label="Document Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <Select label="Document Type" value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}>
              {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>

            <div className="sm:col-span-2">
              <Field label="Replacement File" hint={form.file ? `${form.file.name} / ${formatBytes(form.file.size)}` : `Current file: ${document.originalName}`}>
                <label
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    setFile(event.dataTransfer.files?.[0]);
                  }}
                  className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-blue-500/10"
                >
                  <UploadCloud className="text-blue-600 dark:text-blue-300" size={28} />
                  <span className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{form.file ? form.file.name : "Drop replacement file or browse"}</span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Optional file replacement with native file picker</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => setFile(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              </Field>
            </div>

            {submitting && (
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950 sm:col-span-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Updating</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <Motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-blue-600" />
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Updates are saved through the existing document module permissions.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting} icon={UploadCloud}>{submitting ? "Updating..." : "Update Document"}</Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PersonalDetails({ profile }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Personal" title="Personal Details" description="Core identity and contact information." />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard icon={Mail} label="Email" value={profile?.email} />
        <InfoCard icon={Phone} label="Phone" value={profile?.phone} />
        <InfoCard icon={CalendarDays} label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
        <InfoCard icon={HeartPulse} label="Blood Group" value={profile?.bloodGroup} />
        <InfoCard icon={Home} label="Current Address" value={profile?.currentAddress} wide />
        <InfoCard icon={MapPin} label="Permanent Address" value={profile?.permanentAddress} wide />
      </div>
    </Card>
  );
}

function ProfessionalDetails({ profile }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Professional" title="Professional Details" description="Role, compensation, skills, projects, and career context." />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={BriefcaseBusiness} label="Department" value={profile?.department} />
        <InfoCard icon={BadgeCheck} label="Role" value={profile?.role} />
        <InfoCard icon={WalletCards} label="Salary" value={currency(profile?.salary)} />
        <InfoCard icon={CalendarDays} label="Joining Date" value={formatDate(profile?.dateOfJoining)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TagSection title="Skills" items={profile?.skills} empty="No skills added yet" />
        <ProjectSection items={profile?.projectsWorkedOn} />
      </div>
    </Card>
  );
}

function LeaveAnalytics({ profile }) {
  const leaveItems = [
    { label: "Paid Leave", value: Number(profile?.leaveBalance?.paid || 0), max: 18, color: "#2563EB" },
    { label: "Sick Leave", value: Number(profile?.leaveBalance?.sick || 0), max: 10, color: "#10B981" },
    { label: "Casual Leave", value: Number(profile?.leaveBalance?.casual || 0), max: 7, color: "#F59E0B" }
  ];

  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Leave" title="Leave Balance Analytics" description="Circular balance indicators for all leave categories." />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {leaveItems.map((item) => <LeaveCard key={item.label} item={item} />)}
      </div>
    </Card>
  );
}

function PayrollOverview({ profile, documents }) {
  const salaryDocuments = documents.filter((document) => document.documentType === "salary_slip");
  const monthlySalary = Number(profile?.salary || 0);
  const annualSalary = monthlySalary * 12;

  return (
    <div className="space-y-6">
      <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <SectionHeader eyebrow="Payroll" title="Payroll & Compensation Summary" description="A compact compensation view connected to employee profile and salary slip documents." />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard icon={WalletCards} label="Monthly Salary" value={currency(monthlySalary)} />
          <InfoCard icon={Activity} label="Annual Estimate" value={currency(annualSalary)} />
          <InfoCard icon={FileCheck2} label="Salary Slips" value={`${salaryDocuments.length} uploaded`} />
        </div>
      </Card>
      <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <SectionHeader eyebrow="Transactions" title="Recent Payroll Documents" description="Salary slips uploaded to this employee workspace." />
        <div className="mt-5 grid gap-3">
          {salaryDocuments.map((document) => <DocumentCard key={document._id} document={document} compact />)}
          {!salaryDocuments.length && <EmptyState icon={WalletCards} title="No salary slips yet" description="Uploaded salary slips will appear here for quick payroll review." />}
        </div>
      </Card>
    </div>
  );
}

function FamilyEmergency({ profile }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="People" title="Emergency & Family" description="Family context and emergency contact details." />
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard icon={Contact} label="Emergency Name" value={profile?.emergencyContact?.name} />
        <InfoCard icon={Users} label="Relation" value={profile?.emergencyContact?.relation} />
        <InfoCard icon={Phone} label="Emergency Phone" value={profile?.emergencyContact?.phone} />
        <InfoCard icon={Users} label="Siblings" value={profile?.siblings} />
        <InfoCard icon={UserRound} label="Father Name" value={profile?.fatherName} />
        <InfoCard icon={UserRound} label="Mother Name" value={profile?.motherName} />
      </div>
    </Card>
  );
}

function SecuritySection({ profile }) {
  const enrolled = Boolean(profile?.faceProfile?.enrolledAt);
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Security" title="Face Profile Security" description="Enterprise security metadata only. No recognition logic is implemented here." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Fingerprint size={20} /></span>
          <p className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">{enrolled ? "Enrolled" : "Not Enrolled"}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Security verification badge</p>
          <Badge tone={enrolled ? "emerald" : "amber"} className="mt-4">{enrolled ? "Verified metadata" : "Setup pending"}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={ShieldCheck} label="Face Model" value={profile?.faceProfile?.model} />
          <InfoCard icon={CalendarDays} label="Enrolled At" value={formatDateTime(profile?.faceProfile?.enrolledAt)} />
          <InfoCard icon={Clock3} label="Updated At" value={formatDateTime(profile?.faceProfile?.updatedAt)} />
        </div>
      </div>
    </Card>
  );
}

function Recognition({ profile }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Recognition" title="Appreciation & Recognition" description="A focused view of employee appreciation and achievement signals." />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">
          <Award className="text-amber-700 dark:text-amber-300" size={26} />
          <p className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{profile?.appreciation || "No appreciation note yet"}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Recognition cards can be expanded into awards, peer kudos, and HR feedback.</p>
        </div>
        <div className="space-y-3">
          <RecognitionBadge label="Reliable contributor" />
          <RecognitionBadge label="Team player" />
          <RecognitionBadge label="Growth ready" />
        </div>
      </div>
    </Card>
  );
}

function ActivityTimeline({ items }) {
  return (
    <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
      <SectionHeader eyebrow="Timeline" title="Activity Timeline" description="Profile, login, HR, leave, and attendance activity signals." />
      <div className="mt-6 space-y-4">
        {items.map((item) => <TimelineItem key={item.title} item={item} />)}
      </div>
    </Card>
  );
}

function SystemInformation({ profile, activity }) {
  return (
    <>
      <Card className="border-white/70 bg-white/80 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <SectionHeader eyebrow="System" title="System Information" description="Account metadata and lifecycle timestamps." />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={CalendarDays} label="Created At" value={formatDateTime(profile?.createdAt)} />
          <InfoCard icon={Clock3} label="Updated At" value={formatDateTime(profile?.updatedAt)} />
          <InfoCard icon={Activity} label="Last Seen" value={formatDateTime(profile?.lastSeenAt)} />
          <InfoCard icon={ShieldCheck} label="Security Status" value="Protected account" />
        </div>
      </Card>
      <ActivityTimeline items={activity} />
    </>
  );
}

function EditProfileModal({ open, profile, saving, onClose, onSubmit }) {
  const initialForm = useMemo(() => toEditForm(profile), [profile]);
  const [form, setForm] = useState(initialForm);
  const role = String(profile?.role || "").toLowerCase();
  const canManageSensitiveFields = ["admin", "hr"].includes(role);
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  const requestClose = useCallback(() => {
    if (saving) return;
    if (hasUnsavedChanges && !window.confirm("Discard unsaved profile changes?")) return;
    onClose();
  }, [hasUnsavedChanges, onClose, saving]);

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      department: form.department,
      salary: form.salary,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth,
      dateOfJoining: form.dateOfJoining,
      bloodGroup: form.bloodGroup,
      currentAddress: form.currentAddress,
      permanentAddress: form.permanentAddress,
      motherName: form.motherName,
      fatherName: form.fatherName,
      siblings: form.siblings,
      skills: form.skills,
      projectsWorkedOn: form.projectsWorkedOn,
      appreciation: form.appreciation,
      emergencyContact: {
        name: form.emergencyName,
        relation: form.emergencyRelation,
        phone: form.emergencyPhone
      }
    };

    if (canManageSensitiveFields) {
      payload.role = form.role === "employee" ? "Employee" : form.role;
      payload.status = form.status;
      payload.leaveBalance = {
        paid: Number(form.paidLeave || 0),
        sick: Number(form.sickLeave || 0),
        casual: Number(form.casualLeave || 0)
      };
    }

    onSubmit(payload);
  };

  return (
    <Modal open={open} title="Edit Profile" description="Update employee profile details without leaving the workspace." onClose={requestClose} panelClassName="max-w-4xl p-0">
      <form onSubmit={submit}>
        <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 sm:col-span-2">
          Changes are saved to the existing employee profile API. Role, status, and leave balance are only editable by HR/Admin accounts.
        </div>
        <Input label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Input label="Department" required={false} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
        <Input label="Salary" type="number" required={false} value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} />
        <Select label="Role" value={form.role} disabled={!canManageSensitiveFields} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="Employee">Employee</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </Select>
        <Select label="Status" value={form.status} disabled={!canManageSensitiveFields} onChange={(event) => setForm({ ...form, status: event.target.value })}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
        <Input label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Input label="Blood Group" required={false} value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} />
        <Input label="Date of Birth" type="date" required={false} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
        <Input label="Date of Joining" type="date" required={false} value={form.dateOfJoining} onChange={(event) => setForm({ ...form, dateOfJoining: event.target.value })} />
        <Input label="Father Name" required={false} value={form.fatherName} onChange={(event) => setForm({ ...form, fatherName: event.target.value })} />
        <Input label="Mother Name" required={false} value={form.motherName} onChange={(event) => setForm({ ...form, motherName: event.target.value })} />
        <Input label="Siblings" required={false} value={form.siblings} onChange={(event) => setForm({ ...form, siblings: event.target.value })} />
        <Input label="Emergency Name" required={false} value={form.emergencyName} onChange={(event) => setForm({ ...form, emergencyName: event.target.value })} />
        <Input label="Emergency Relation" required={false} value={form.emergencyRelation} onChange={(event) => setForm({ ...form, emergencyRelation: event.target.value })} />
        <Input label="Emergency Phone" required={false} value={form.emergencyPhone} onChange={(event) => setForm({ ...form, emergencyPhone: event.target.value })} />
        <Input label="Paid Leave" type="number" required={false} disabled={!canManageSensitiveFields} value={form.paidLeave} onChange={(event) => setForm({ ...form, paidLeave: event.target.value })} />
        <Input label="Sick Leave" type="number" required={false} disabled={!canManageSensitiveFields} value={form.sickLeave} onChange={(event) => setForm({ ...form, sickLeave: event.target.value })} />
        <Input label="Casual Leave" type="number" required={false} disabled={!canManageSensitiveFields} value={form.casualLeave} onChange={(event) => setForm({ ...form, casualLeave: event.target.value })} />
        <Textarea label="Skills (comma separated)" required={false} value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
        <Textarea label="Projects (comma separated)" required={false} value={form.projectsWorkedOn} onChange={(event) => setForm({ ...form, projectsWorkedOn: event.target.value })} />
        <Textarea label="Current Address" required={false} value={form.currentAddress} onChange={(event) => setForm({ ...form, currentAddress: event.target.value })} />
        <Textarea label="Permanent Address" required={false} value={form.permanentAddress} onChange={(event) => setForm({ ...form, permanentAddress: event.target.value })} />
        <Textarea label="Appreciation" required={false} value={form.appreciation} onChange={(event) => setForm({ ...form, appreciation: event.target.value })} className="sm:col-span-2" />
        </div>
        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">{hasUnsavedChanges ? "You have unsaved changes." : "No unsaved changes."}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={requestClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !hasUnsavedChanges}>{saving ? "Saving..." : "Save Profile"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function LeaveCard({ item }) {
  const percent = Math.max(0, Math.min(100, (item.value / item.max) * 100));
  const data = [{ name: item.label, value: percent, fill: item.color }];
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-950 dark:text-white">{item.label}</p>
      <div className="relative mt-3 h-44">
        <svg width="0" height="0" />
        <div className="absolute inset-0">
          <ResponsiveRadial data={data} />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-slate-950 dark:text-white">{item.value}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">days left</p>
        </div>
      </div>
    </div>
  );
}

function ResponsiveRadial({ data }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <RadialBarChart width={176} height={176} innerRadius="72%" outerRadius="96%" data={data} startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" cornerRadius={16} background={{ fill: "rgba(148, 163, 184, 0.16)" }} />
      </RadialBarChart>
    </div>
  );
}

function InfoCard({ icon, label, value, wide = false }) {
  const Icon = icon;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 ${wide ? "xl:col-span-2" : ""}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950 dark:text-white">{value || "--"}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">{label}</p>
    </div>
  );
}

function KeyValue({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
      <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Icon size={15} />{label}</span>
      <span className="truncate font-semibold text-slate-950 dark:text-white">{value || "--"}</span>
    </div>
  );
}

function TagSection({ title, items = [], empty }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items?.length ? items.map((item) => <Badge key={item} tone="blue">{item}</Badge>) : <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>}
      </div>
    </div>
  );
}

function ProjectSection({ items = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="font-semibold text-slate-950 dark:text-white">Projects Worked On</p>
      <div className="mt-4 grid gap-3">
        {items?.length ? items.map((item) => (
          <div key={item} className="rounded-2xl bg-white p-4 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">{item}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Project contribution record</p>
          </div>
        )) : <p className="text-sm text-slate-500 dark:text-slate-400">No projects added yet</p>}
      </div>
    </div>
  );
}

function RecognitionBadge({ label }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-300"><Award size={17} /></span>
      <p className="font-semibold text-slate-950 dark:text-white">{label}</p>
    </div>
  );
}

function TimelineItem({ item }) {
  const Icon = item.icon;
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Icon size={17} /></span>
      <div className="min-w-0 flex-1 border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-slate-950 dark:text-white">{item.title}</p>
          <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
      </div>
    </div>
  );
}

function buildActivity(profile, documents = []) {
  const latestDocuments = documents.slice(0, 3).map((document) => ({
    icon: UploadCloud,
    title: "Document uploaded",
    detail: `${document.title || document.originalName} was added to the employee workspace.`,
    time: formatDate(document.createdAt)
  }));

  return [
    { icon: Activity, title: "Profile viewed", detail: "Profile metadata synced from the authenticated user session.", time: "Now" },
    { icon: Clock3, title: "Last login activity", detail: `Last seen ${formatDateTime(profile?.lastSeenAt)}.`, time: "Recent" },
    { icon: CalendarDays, title: "Joined organization", detail: `Date of joining ${formatDate(profile?.dateOfJoining)}.`, time: "HR" },
    { icon: ShieldCheck, title: "Security profile", detail: profile?.faceProfile?.enrolledAt ? "Face profile metadata is enrolled." : "Face profile metadata is not enrolled.", time: "Security" },
    { icon: Sparkles, title: "Recognition updated", detail: profile?.appreciation || "No appreciation note recorded yet.", time: "People" },
    ...latestDocuments
  ];
}

function toEditForm(profile = {}) {
  return {
    name: profile.name || "",
    email: profile.email || "",
    department: profile.department || "",
    role: String(profile.role || "Employee").toLowerCase() === "employee" ? "Employee" : profile.role || "Employee",
    status: String(profile.status || "Active").toLowerCase() === "inactive" ? "Inactive" : "Active",
    salary: profile.salary ?? "",
    phone: profile.phone || "",
    dateOfBirth: toDateInput(profile.dateOfBirth),
    dateOfJoining: toDateInput(profile.dateOfJoining),
    bloodGroup: profile.bloodGroup || "",
    currentAddress: profile.currentAddress || "",
    permanentAddress: profile.permanentAddress || "",
    motherName: profile.motherName || "",
    fatherName: profile.fatherName || "",
    siblings: profile.siblings || "",
    skills: (profile.skills || []).join(", "),
    projectsWorkedOn: (profile.projectsWorkedOn || []).join(", "),
    appreciation: profile.appreciation || "",
    emergencyName: profile.emergencyContact?.name || "",
    emergencyRelation: profile.emergencyContact?.relation || "",
    emergencyPhone: profile.emergencyContact?.phone || "",
    paidLeave: profile.leaveBalance?.paid ?? 0,
    sickLeave: profile.leaveBalance?.sick ?? 0,
    casualLeave: profile.leaveBalance?.casual ?? 0
  };
}

function flattenProfile(profile = {}) {
  return [
    ["Employee ID", profile.employeeId],
    ["Name", profile.name],
    ["Email", profile.email],
    ["Role", profile.role],
    ["Department", profile.department],
    ["Phone", profile.phone],
    ["Status", profile.status],
    ["Salary", profile.salary],
    ["DOB", profile.dateOfBirth],
    ["Blood Group", profile.bloodGroup],
    ["Current Address", profile.currentAddress],
    ["Permanent Address", profile.permanentAddress],
    ["Mother", profile.motherName],
    ["Father", profile.fatherName],
    ["Siblings", profile.siblings],
    ["Skills", (profile.skills || []).join(", ")],
    ["Projects", (profile.projectsWorkedOn || []).join(", ")],
    ["Joining Date", profile.dateOfJoining],
    ["Appreciation", profile.appreciation],
    ["Emergency Contact", `${profile.emergencyContact?.name || ""} ${profile.emergencyContact?.relation || ""} ${profile.emergencyContact?.phone || ""}`],
    ["Leave Balance", JSON.stringify(profile.leaveBalance || {})],
    ["Face Profile", JSON.stringify(profile.faceProfile || {})],
    ["Created At", profile.createdAt],
    ["Updated At", profile.updatedAt],
    ["Last Seen At", profile.lastSeenAt]
  ];
}

function getProfileCompletion(profile = {}) {
  const fields = ["phone", "dateOfJoining", "dateOfBirth", "skills", "projectsWorkedOn", "bloodGroup", "permanentAddress", "currentAddress", "motherName", "fatherName", "siblings", "emergencyContact", "appreciation"];
  const completed = fields.filter((field) => {
    const value = profile?.[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value) return Object.values(value).some(Boolean);
    return Boolean(value);
  }).length;
  return Math.round((completed / fields.length) * 100);
}

function sumLeave(balance = {}) {
  return Number(balance.paid || 0) + Number(balance.sick || 0) + Number(balance.casual || 0);
}

function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

function currency(value) {
  if (!value) return "Rs 0";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function normalizeTab(value) {
  const match = tabs.find((tab) => tab.toLowerCase() === String(value || "").toLowerCase());
  return match || "Overview";
}

function buildDocumentStats(documents = []) {
  const verified = documents.filter(isVerifiedDocument).length;
  return {
    total: documents.length,
    verified,
    pending: Math.max(documents.length - verified, 0),
    identity: documents.filter((document) => ["aadhaar_card", "pan_card", "id_proof"].includes(document.documentType)).length,
    payroll: documents.filter((document) => document.documentType === "salary_slip").length
  };
}

function isVerifiedDocument(document = {}) {
  return ["aadhaar_card", "pan_card", "id_proof", "offer_letter", "salary_slip"].includes(document.documentType);
}

function getDocumentUrl(document = {}) {
  return document.fileUrl || `${api.defaults.baseURL?.replace("/api", "")}/uploads/${document.fileName}`;
}

function FileTypeIcon({ mimeType = "" }) {
  if (mimeType.includes("image")) return <Image size={18} />;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return <FileArchive size={18} />;
  return <FileText size={18} />;
}

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function humanizeDocumentType(type) {
  const option = documentTypes.find((item) => item.value === type);
  return option?.label || "Document";
}
