import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar as CalendarIcon,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Hand,
  Link as LinkIcon,
  ListFilter,
  Loader2,
  MessageSquare,
  Mic,
  Monitor,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
  XCircle
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
import Page from "../components/ui/Page";
import Skeleton from "../components/ui/Skeleton";
import { Input, Select, Textarea } from "../components/ui/Form";
import { formatDate, formatTime } from "../utils/format";

const meetingTypes = [
  { value: "team-sync", label: "Team Sync" },
  { value: "one-on-one", label: "1:1" },
  { value: "client-call", label: "Client Call" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" }
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" }
];

const detailTabs = ["Overview", "Live Room", "Notes", "Activity"];

const emptyMeeting = {
  title: "",
  agenda: "",
  scheduledFor: "",
  durationMinutes: 30,
  attendees: [],
  department: "",
  type: "team-sync",
  priority: "medium",
  meetingLink: "",
  notes: ""
};

const statusStyles = {
  ongoing: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  today: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  upcoming: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
  completed: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
  past: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"
};

const priorityTones = {
  low: "slate",
  medium: "blue",
  high: "amber",
  urgent: "rose"
};

export default function Meetings() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState(() => ({ ...emptyMeeting, scheduledFor: nextMeetingSlot() }));
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadMeetings = useCallback(async () => {
    const { data } = await api.get("/meetings");
    setMeetings(data);
    setSelectedMeeting((current) => {
      const currentId = current?._id;
      return data.find((meeting) => meeting._id === currentId) || data[0] || null;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      setLoading(true);
      setError("");
      try {
        const [meetingResponse, employeeResponse] = await Promise.all([
          api.get("/meetings"),
          api.get("/employees")
        ]);

        if (!active) return;
        setMeetings(meetingResponse.data);
        setTeam(employeeResponse.data);
        setSelectedMeeting(meetingResponse.data[0] || null);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load meetings.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadWorkspace();

    return () => {
      active = false;
    };
  }, []);

  const meetingGroups = useMemo(() => buildMeetingGroups(meetings), [meetings]);
  const analytics = useMemo(() => buildAnalytics(meetings), [meetings]);
  const filteredMeetings = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return meetings;
    return meetings.filter((meeting) => [meeting.title, meeting.agenda, meeting.department, meeting.type, meeting.priority, ...(meeting.attendees || [])]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase().includes(value)));
  }, [meetings, query]);

  const departments = useMemo(() => {
    const values = team.map((member) => member.department).filter(Boolean);
    return Array.from(new Set(values)).sort();
  }, [team]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        organizer: user?.name || "Workspace Admin",
        durationMinutes: Number(form.durationMinutes || 30),
        attendees: form.attendees.filter(Boolean)
      };
      const { data } = await api.post("/meetings", payload);
      setMessage("Meeting scheduled successfully.");
      setSelectedMeeting(data);
      setScheduleOpen(false);
      setForm({ ...emptyMeeting, scheduledFor: nextMeetingSlot() });
      await loadMeetings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to schedule meeting.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (meeting, status) => {
    if (!meeting?._id) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/meetings/${meeting._id}`, { status });
      setSelectedMeeting(data);
      await loadMeetings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update meeting.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (meeting) => {
    if (!meeting?._id || !window.confirm("Delete this meeting?")) return;
    setSaving(true);
    setError("");
    try {
      await api.delete(`/meetings/${meeting._id}`);
      setMessage("Meeting deleted.");
      await loadMeetings();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete meeting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <Page
        eyebrow="Meetings"
        title="Collaboration Hub"
        description="Plan, join, and review meetings from a polished EMS workspace designed for fast team coordination."
        className="max-w-[1600px]"
        actions={
          <Button onClick={() => setScheduleOpen(true)} icon={CalendarPlus}>
            Schedule Meeting
          </Button>
        }
      >
        <div className="space-y-6">
          <MeetingHero analytics={analytics} onSchedule={() => setScheduleOpen(true)} nextMeeting={meetingGroups.nextMeeting} />

          {message && (
            <Motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </Motion.div>
          )}

          {error && (
            <Motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle size={17} />
              {error}
            </Motion.div>
          )}

          <AnalyticsGrid analytics={analytics} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
            <main className="space-y-6">
              <MeetingCommandBar query={query} setQuery={setQuery} onSchedule={() => setScheduleOpen(true)} />

              {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Skeleton className="h-64" />
                  <Skeleton className="h-64" />
                </div>
              ) : (
                <>
                  <MeetingSection
                    title="Ongoing Meetings"
                    description="Live collaboration rooms and calls happening right now."
                    meetings={meetingGroups.ongoing}
                    emptyTitle="No live meetings"
                    emptyDescription="Ongoing meetings will appear here with join controls."
                    onSelect={setSelectedMeeting}
                    selectedMeeting={selectedMeeting}
                  />

                  <MeetingBoard
                    groups={meetingGroups}
                    filteredMeetings={filteredMeetings}
                    query={query}
                    selectedMeeting={selectedMeeting}
                    onSelect={setSelectedMeeting}
                  />

                  <CalendarTimeline meetings={meetings} selectedMeeting={selectedMeeting} onSelect={setSelectedMeeting} />
                </>
              )}
            </main>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <MeetingDetails
                meeting={selectedMeeting}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onStatus={updateStatus}
                onDelete={deleteMeeting}
                saving={saving}
              />
              <ActivityFeed meetings={meetings} />
            </aside>
          </div>
        </div>

        <ScheduleMeetingModal
          open={scheduleOpen}
          form={form}
          setForm={setForm}
          team={team}
          departments={departments}
          saving={saving}
          onClose={() => setScheduleOpen(false)}
          onSubmit={handleSubmit}
        />
      </Page>
    </Layout>
  );
}

function MeetingHero({ analytics, onSchedule, nextMeeting }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85"
    >
      <div className="grid gap-6 bg-gradient-to-r from-blue-600 via-slate-950 to-emerald-600 p-6 text-white lg:grid-cols-[1fr_360px] lg:p-7">
        <div className="min-w-0">
          <Badge tone="blue" className="bg-white/15 text-white ring-white/20">Meetings workspace</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">Your collaboration day, organized around action.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            See what is live, what needs preparation, and what has already happened without leaving the employee workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={onSchedule} icon={Plus}>Quick Schedule</Button>
            {nextMeeting?.meetingLink && (
              <a href={nextMeeting.meetingLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20">
                <ExternalLink size={16} />
                Join Next
              </a>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Next up</p>
          {nextMeeting ? (
            <div className="mt-4">
              <h2 className="text-xl font-semibold">{nextMeeting.title}</h2>
              <p className="mt-2 text-sm text-blue-100">{formatDate(nextMeeting.scheduledFor)} / {formatTime(nextMeeting.scheduledFor)}</p>
              <div className="mt-4 flex items-center gap-2">
                <ParticipantStack attendees={nextMeeting.attendees} />
                <span className="text-sm text-blue-100">{nextMeeting.attendees?.length || 0} attendees</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-blue-100">
              No upcoming meetings yet. Schedule a sync to start the week with clarity.
            </div>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <MiniMetric value={analytics.today} label="Today" />
            <MiniMetric value={analytics.ongoing} label="Live" />
            <MiniMetric value={analytics.upcoming} label="Upcoming" />
          </div>
        </div>
      </div>
    </Motion.section>
  );
}

function AnalyticsGrid({ analytics }) {
  const cards = [
    { label: "Today's Meetings", value: analytics.today, icon: CalendarDays, tone: "blue", detail: "scheduled for today" },
    { label: "Live Rooms", value: analytics.ongoing, icon: Radio, tone: "emerald", detail: "currently ongoing" },
    { label: "This Week", value: analytics.week, icon: BarChart3, tone: "amber", detail: `${analytics.weekHours}h planned` },
    { label: "Completed", value: analytics.completed, icon: CheckCircle2, tone: "slate", detail: "meeting history" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
          >
            <Card hover className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone === "emerald" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : card.tone === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : card.tone === "blue" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                  <Icon size={20} />
                </span>
                <Badge tone={card.tone}>{card.detail}</Badge>
              </div>
              <p className="mt-5 text-3xl font-bold text-slate-950 dark:text-white">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            </Card>
          </Motion.div>
        );
      })}
    </div>
  );
}

function MeetingCommandBar({ query, setQuery, onSchedule }) {
  return (
    <Card className="border-white/70 bg-white/85 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search meetings, agenda, department, attendees"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            aria-label="Search meetings"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" type="button">
            <ListFilter size={16} />
            Smart Filters
          </button>
          <Button onClick={onSchedule} icon={CalendarPlus} variant="secondary">Schedule</Button>
        </div>
      </div>
    </Card>
  );
}

function MeetingSection({ title, description, meetings, emptyTitle, emptyDescription, onSelect, selectedMeeting }) {
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader eyebrow="Live" title={title} description={description} />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting._id}
            meeting={meeting}
            selected={selectedMeeting?._id === meeting._id}
            onSelect={() => onSelect(meeting)}
            compact={false}
          />
        ))}
        {!meetings.length && (
          <div className="lg:col-span-2">
            <EmptyState icon={Video} title={emptyTitle} description={emptyDescription} />
          </div>
        )}
      </div>
    </Card>
  );
}

function MeetingBoard({ groups, filteredMeetings, query, selectedMeeting, onSelect }) {
  if (query.trim()) {
    return (
      <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
        <SectionHeader eyebrow="Search" title="Search Results" description={`Showing meetings that match "${query.trim()}".`} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              selected={selectedMeeting?._id === meeting._id}
              onSelect={() => onSelect(meeting)}
              compact={false}
            />
          ))}
          {!filteredMeetings.length && (
            <div className="lg:col-span-2">
              <EmptyState icon={Search} title="No matching meetings" description="Try searching by title, agenda, department, priority, or attendee." />
            </div>
          )}
        </div>
      </Card>
    );
  }

  const columns = [
    { title: "Today", meetings: groups.today, description: "What needs attention now" },
    { title: "Upcoming", meetings: groups.upcoming, description: "Future meetings and reminders" },
    { title: "History", meetings: groups.history, description: "Completed, past, and cancelled" }
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {columns.map((column) => (
        <Card key={column.title} className="min-h-[360px] border-white/70 bg-white/85 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{column.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{column.description}</p>
            </div>
            <Badge tone="slate">{column.meetings.length}</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {column.meetings.map((meeting) => (
              <MeetingCard
                key={meeting._id}
                meeting={meeting}
                selected={selectedMeeting?._id === meeting._id}
                onSelect={() => onSelect(meeting)}
                compact
              />
            ))}
            {!column.meetings.length && <EmptyState title={`No ${column.title.toLowerCase()} meetings`} description="This lane is clear." />}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MeetingCard({ meeting, selected, onSelect, compact }) {
  const meta = getMeetingMeta(meeting);
  const typeLabel = getMeetingTypeLabel(meeting.type);

  return (
    <Motion.div
      role="button"
      tabIndex={0}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative w-full overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-950 ${
        selected
          ? "border-blue-300 ring-4 ring-blue-500/10 dark:border-blue-500/50"
          : "border-slate-200 hover:border-blue-200 dark:border-slate-800 dark:hover:border-blue-500/40"
      }`}
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${meta.status === "ongoing" ? "bg-emerald-500" : meta.status === "cancelled" ? "bg-rose-500" : "bg-blue-500"}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={meta.status} />
            <Badge tone={priorityTones[meeting.priority] || "slate"}>{meeting.priority || "medium"}</Badge>
          </div>
          <h3 className={`${compact ? "mt-3 text-base" : "mt-4 text-lg"} line-clamp-2 font-semibold text-slate-950 dark:text-white`}>{meeting.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{meeting.agenda || "No agenda provided"}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-300">
          <Video size={18} />
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2"><CalendarClock size={15} /> {formatDate(meeting.scheduledFor)} / {formatTime(meeting.scheduledFor)}</span>
        <span className="flex items-center gap-2"><Clock3 size={15} /> {meeting.durationMinutes || 30} min / {typeLabel}</span>
        {!compact && <span className="flex items-center gap-2"><ShieldCheck size={15} /> Organized by {meeting.organizer || "EMS Workspace"}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <ParticipantStack attendees={meeting.attendees} />
        {meeting.meetingLink ? (
          <a
            href={meeting.meetingLink}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            Join
            <ExternalLink size={13} />
          </a>
        ) : (
          <span className="text-xs font-semibold text-slate-400">No link</span>
        )}
      </div>
    </Motion.div>
  );
}

function MeetingDetails({ meeting, activeTab, setActiveTab, onStatus, onDelete, saving }) {
  if (!meeting) {
    return (
      <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
        <EmptyState icon={CalendarClock} title="No meeting selected" description="Select a meeting to view agenda, participants, live room, notes, and timeline." />
      </Card>
    );
  }

  const meta = getMeetingMeta(meeting);

  return (
    <Card className="overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <StatusBadge status={meta.status} light />
            <h2 className="mt-3 line-clamp-2 text-2xl font-bold tracking-tight">{meeting.title}</h2>
            <p className="mt-2 text-sm text-blue-100">{formatDate(meeting.scheduledFor)} / {formatTime(meeting.scheduledFor)} / {meeting.durationMinutes || 30} min</p>
          </div>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 transition hover:bg-white/20" aria-label="More meeting actions">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {meeting.meetingLink && (
            <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
              <ExternalLink size={15} />
              Join
            </a>
          )}
          <Button size="sm" variant="outline" disabled={saving} onClick={() => onStatus(meeting, "completed")} icon={CheckCircle2}>Complete</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => onStatus(meeting, "cancelled")} icon={XCircle}>Cancel</Button>
          <Button size="sm" variant="danger" disabled={saving} onClick={() => onDelete(meeting)} icon={Trash2}>Delete</Button>
        </div>
      </div>

      <div className="border-b border-slate-200 p-2 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {detailTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {activeTab === "Overview" && <MeetingOverview meeting={meeting} />}
        {activeTab === "Live Room" && <LiveMeetingRoom meeting={meeting} />}
        {activeTab === "Notes" && <MeetingNotes meeting={meeting} />}
        {activeTab === "Activity" && <MeetingActivity meeting={meeting} />}
      </div>
    </Card>
  );
}

function MeetingOverview({ meeting }) {
  return (
    <div className="space-y-5">
      <InfoBlock icon={FileText} label="Agenda" value={meeting.agenda || "No agenda added yet."} />
      <div>
        <p className="text-sm font-semibold text-slate-950 dark:text-white">Participants</p>
        <div className="mt-3 grid gap-2">
          {(meeting.attendees || []).length ? meeting.attendees.map((attendee) => (
            <div key={attendee} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
              <Avatar name={attendee} size="sm" />
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{attendee}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Participant</p>
              </div>
            </div>
          )) : <EmptyState icon={Users} title="No participants" description="Add participants while scheduling the meeting." />}
        </div>
      </div>
      <InfoBlock icon={LinkIcon} label="Meeting Link" value={meeting.meetingLink || "No link attached."} />
    </div>
  );
}

function LiveMeetingRoom({ meeting }) {
  const attendees = meeting.attendees?.length ? meeting.attendees : ["Waiting room"];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {attendees.slice(0, 4).map((attendee, index) => (
          <div key={`${attendee}-${index}`} className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white dark:border-slate-800">
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {index === 0 ? "Host" : "Participant"}
            </div>
            <div className="flex h-full items-center justify-center">
              <Avatar name={attendee} size="lg" className="ring-4 ring-white/10" />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="truncate text-sm font-semibold">{attendee}</span>
              <Mic size={16} className="text-emerald-300" />
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-4 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-lift backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <ControlButton icon={Mic} label="Mute" />
          <ControlButton icon={Video} label="Camera" />
          <ControlButton icon={Monitor} label="Share" />
          <ControlButton icon={Hand} label="Raise hand" />
          <ControlButton icon={Radio} label="Recording" active />
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white"><MessageSquare size={17} /> Meeting chat</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Live meeting chat placeholder. WebRTC/video calling logic is intentionally not implemented here.</p>
      </div>
    </div>
  );
}

function MeetingNotes({ meeting }) {
  return (
    <div className="space-y-4">
      <InfoBlock icon={FileText} label="Notes" value={meeting.notes || "No notes captured yet."} />
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="font-semibold text-slate-950 dark:text-white">Attachments</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Attach documents, decks, or follow-up files from the Documents module.</p>
      </div>
    </div>
  );
}

function MeetingActivity({ meeting }) {
  const meta = getMeetingMeta(meeting);
  const items = [
    { icon: CalendarPlus, title: "Meeting scheduled", detail: `Created ${formatDate(meeting.createdAt)}.` },
    { icon: Bell, title: "Reminder queued", detail: `Reminder set before ${formatTime(meeting.scheduledFor)}.` },
    { icon: Users, title: "Participants invited", detail: `${meeting.attendees?.length || 0} attendee(s) attached.` },
    { icon: CheckCircle2, title: "Current state", detail: `Status is ${humanizeStatus(meta.status)}.` }
  ];

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"><Icon size={17} /></span>
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarTimeline({ meetings, selectedMeeting, onSelect }) {
  const weekDays = getWeekDays();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
        <SectionHeader eyebrow="Calendar" title="Weekly Timeline" description="A compact weekly view for upcoming meeting load." />
        <div className="mt-5 grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayMeetings = meetings.filter((meeting) => sameDay(meeting.scheduledFor, day.date));
            return (
              <div key={day.key} className="min-h-40 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{day.label}</p>
                    <p className="text-lg font-bold text-slate-950 dark:text-white">{day.date.getDate()}</p>
                  </div>
                  <Badge tone={dayMeetings.length ? "blue" : "slate"}>{dayMeetings.length}</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <button
                      key={meeting._id}
                      type="button"
                      onClick={() => onSelect(meeting)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                        selectedMeeting?._id === meeting._id
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-500/10"
                      }`}
                    >
                      <span className="block truncate">{meeting.title}</span>
                      <span className="mt-0.5 block opacity-75">{formatTime(meeting.scheduledFor)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
        <SectionHeader eyebrow="Planner" title="Monthly Heatmap" description="Meeting density for planning load." />
        <MonthHeatmap meetings={meetings} />
      </Card>
    </div>
  );
}

function MonthHeatmap({ meetings }) {
  const cells = getMonthCells();

  return (
    <div className="mt-5 grid grid-cols-7 gap-2">
      {cells.map((cell) => {
        const count = cell.inMonth ? meetings.filter((meeting) => sameDay(meeting.scheduledFor, cell.date)).length : 0;
        return (
          <div
            key={cell.key}
            className={`aspect-square rounded-xl border p-2 text-xs font-semibold ${
              !cell.inMonth
                ? "border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-900 dark:bg-slate-950 dark:text-slate-700"
                : count >= 3
                  ? "border-blue-300 bg-blue-600 text-white"
                  : count === 2
                    ? "border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-200"
                    : count === 1
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950"
            }`}
            title={`${formatDate(cell.date)}: ${count} meeting(s)`}
          >
            <span>{cell.date.getDate()}</span>
          </div>
        );
      })}
    </div>
  );
}

function ActivityFeed({ meetings }) {
  const recent = [...meetings].sort((a, b) => new Date(b.createdAt || b.scheduledFor) - new Date(a.createdAt || a.scheduledFor)).slice(0, 5);

  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
      <SectionHeader eyebrow="Activity" title="Team Meeting Feed" description="Recent scheduling and collaboration signals." />
      <div className="mt-5 space-y-3">
        {recent.map((meeting) => (
          <div key={meeting._id} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"><CalendarClock size={17} /></span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950 dark:text-white">{meeting.title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{meeting.organizer || "EMS"} scheduled for {formatTime(meeting.scheduledFor)}</p>
            </div>
          </div>
        ))}
        {!recent.length && <EmptyState icon={Bell} title="No activity yet" description="Meeting activity appears after the first schedule is created." />}
      </div>
    </Card>
  );
}

function ScheduleMeetingModal({ open, form, setForm, team, departments, saving, onClose, onSubmit }) {
  const toggleAttendee = (name) => {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.includes(name)
        ? current.attendees.filter((item) => item !== name)
        : [...current.attendees, name]
    }));
  };

  return (
    <Modal
      open={open}
      title="Schedule Meeting"
      description="Create a focused collaboration session with agenda, attendees, priority, and join details."
      onClose={onClose}
      panelClassName="max-w-5xl p-0"
    >
      <form onSubmit={onSubmit}>
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input label="Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Weekly product sync" />
              </div>
              <Input label="Date & Time" type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })} />
              <Input label="Duration" type="number" min="5" step="5" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
              <Select label="Meeting Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                {meetingTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Select>
              <Select label="Priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                {priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </Select>
              <Select label="Department" required={false} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </Select>
              <Input label="Meeting Link" required={false} value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} placeholder="https://meet.google.com/..." />
            </div>

            <Textarea label="Agenda" rows={4} value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} placeholder="Discuss blockers, decisions, and next actions." />
            <Textarea label="Notes" required={false} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Preparation notes, attachments, or context." />
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
              <p className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300"><Sparkles size={16} /> Smart setup</p>
              <p className="mt-2 text-sm leading-6 text-blue-700/80 dark:text-blue-200/80">
                Add the agenda and participants now so the meeting card has all context before the call starts.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white"><UserPlus size={17} /> Participants</p>
                <Badge tone="blue">{form.attendees.length}</Badge>
              </div>
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {team.map((member) => (
                  <label key={member._id} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 transition hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-500/10">
                    <input
                      type="checkbox"
                      checked={form.attendees.includes(member.name)}
                      onChange={() => toggleAttendee(member.name)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Avatar name={member.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{member.name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{member.department || member.role}</span>
                    </span>
                  </label>
                ))}
                {!team.length && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">No employees available.</p>}
              </div>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">Meeting metadata is saved through the existing meetings API.</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} icon={saving ? Loader2 : CalendarPlus}>{saving ? "Scheduling..." : "Schedule Meeting"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function StatusBadge({ status, light = false }) {
  const content = humanizeStatus(status);

  if (light) {
    return <span className="inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold capitalize text-white ring-1 ring-white/20">{content}</span>;
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[status] || statusStyles.upcoming}`}>
      {content}
    </span>
  );
}

function ParticipantStack({ attendees = [] }) {
  const visible = attendees.slice(0, 4);
  const overflow = Math.max(attendees.length - visible.length, 0);

  return (
    <div className="flex items-center">
      {visible.map((attendee) => (
        <Avatar key={attendee} name={attendee} size="sm" className="-ml-2 first:ml-0 ring-2 ring-white dark:ring-slate-950" />
      ))}
      {overflow > 0 && (
        <span className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-950">
          +{overflow}
        </span>
      )}
      {!attendees.length && (
        <span className="text-xs font-semibold text-slate-400">No attendees</span>
      )}
    </div>
  );
}

function InfoBlock({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><Icon size={17} /> {label}</p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500 dark:text-slate-400">{value}</p>
    </div>
  );
}

function ControlButton({ icon, label, active = false }) {
  const Icon = icon;
  return (
    <button
      type="button"
      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
        active
          ? "bg-rose-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
      }`}
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </button>
  );
}

function MiniMetric({ value, label }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-blue-100">{label}</p>
    </div>
  );
}

function buildMeetingGroups(meetings) {
  const now = new Date();
  const enriched = meetings.map((meeting) => ({ meeting, meta: getMeetingMeta(meeting, now) }));
  const notCancelled = enriched.filter(({ meta }) => meta.status !== "cancelled");

  return {
    ongoing: enriched.filter(({ meta }) => meta.status === "ongoing").map(({ meeting }) => meeting),
    today: notCancelled.filter(({ meta }) => meta.status === "today").map(({ meeting }) => meeting),
    upcoming: notCancelled.filter(({ meta }) => meta.status === "upcoming").map(({ meeting }) => meeting),
    history: enriched.filter(({ meta }) => ["past", "completed", "cancelled"].includes(meta.status)).map(({ meeting }) => meeting).slice(-8).reverse(),
    nextMeeting: notCancelled.find(({ meeting, meta }) => ["ongoing", "today", "upcoming"].includes(meta.status) && new Date(meeting.scheduledFor) >= now)?.meeting
  };
}

function buildAnalytics(meetings) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const meta = meetings.map((meeting) => ({ meeting, status: getMeetingMeta(meeting, now).status }));
  const weekMeetings = meta.filter(({ meeting }) => {
    const date = new Date(meeting.scheduledFor);
    return date >= startOfWeek && date < endOfWeek;
  });

  return {
    today: meta.filter(({ status }) => ["today", "ongoing"].includes(status)).length,
    ongoing: meta.filter(({ status }) => status === "ongoing").length,
    upcoming: meta.filter(({ status }) => ["today", "upcoming"].includes(status)).length,
    completed: meta.filter(({ status }) => ["completed", "past"].includes(status)).length,
    week: weekMeetings.length,
    weekHours: Math.round(weekMeetings.reduce((sum, { meeting }) => sum + Number(meeting.durationMinutes || 30), 0) / 60)
  };
}

function getMeetingMeta(meeting, currentDate = new Date()) {
  if (!meeting) return { status: "upcoming" };
  if (meeting.status === "cancelled") return { status: "cancelled" };
  if (meeting.status === "completed") return { status: "completed" };

  const start = new Date(meeting.scheduledFor);
  const duration = Number(meeting.durationMinutes || 30);
  const end = new Date(start.getTime() + duration * 60000);

  if (start <= currentDate && currentDate <= end) return { status: "ongoing" };
  if (sameDay(start, currentDate) && start > currentDate) return { status: "today" };
  if (start < currentDate) return { status: "past" };
  return { status: "upcoming" };
}

function humanizeStatus(status) {
  if (status === "today") return "Today";
  if (status === "ongoing") return "Live now";
  if (status === "past") return "Past";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return "Upcoming";
}

function getMeetingTypeLabel(value) {
  return meetingTypes.find((type) => type.value === value)?.label || "Team Sync";
}

function sameDay(value, date) {
  if (!value || !date) return false;
  const first = new Date(value);
  const second = new Date(date);
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function getWeekDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString(),
      date,
      label: date.toLocaleDateString([], { weekday: "short" })
    };
  });
}

function getMonthCells() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString(),
      date,
      inMonth: date.getMonth() === today.getMonth()
    };
  });
}

function nextMeetingSlot() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + (30 - (date.getMinutes() % 30)));
  date.setSeconds(0, 0);
  return toDateTimeInput(date);
}

function toDateTimeInput(date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
