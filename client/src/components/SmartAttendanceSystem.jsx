import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  BarChart3,
  Camera,
  CheckCircle2,
  CreditCard,
  Download,
  Fingerprint,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Volume2,
  XCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useVoiceRecognition } from "../hooks/useVoiceRecognition";
import { useWebcamFace } from "../hooks/useWebcamFace";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

const methodLabels = {
  face_recognition: "Face Recognition",
  voice_recognition: "Voice Recognition",
  rfid_scan: "RFID Scan",
  rfid_card: "RFID Card",
  biometric: "Biometric Device",
  manual: "Manual"
};

const chartColors = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#7C3AED", "#0F172A"];

export default function SmartAttendanceSystem({ onAttendanceMarked }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());
  const [tab, setTab] = useState("face");
  const tabs = [
    { id: "face", label: t("attendance.face"), icon: Camera },
    { id: "voice", label: t("attendance.voice"), icon: Mic },
    { id: "rfid", label: t("attendance.rfid"), icon: CreditCard },
    { id: "logs", label: t("attendance.logs"), icon: BarChart3 },
    ...(isAdmin ? [{ id: "cards", label: t("attendance.adminCards"), icon: ShieldCheck }] : [])
  ];

  return (
    <Motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">AI + IoT</Badge>
            <Badge tone="emerald">JWT secured</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{t("attendance.smartTitle")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("attendance.smartSubtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {tab === "face" && <FaceAttendancePanel onAttendanceMarked={onAttendanceMarked} />}
        {tab === "voice" && <VoiceAttendancePanel onAttendanceMarked={onAttendanceMarked} />}
        {tab === "rfid" && <RFIDScanPanel onAttendanceMarked={onAttendanceMarked} />}
        {tab === "logs" && <SmartAttendanceLogs />}
        {tab === "cards" && isAdmin && <RFIDAdminPanel />}
      </div>
    </Motion.section>
  );
}

function FaceAttendancePanel({ onAttendanceMarked }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const {
    videoRef,
    canvasRef,
    active,
    error: cameraError,
    start,
    stop,
    captureDescriptor
  } = useWebcamFace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const hasFace = Boolean(user?.faceProfile?.embedding?.length);

  const enroll = async () => {
    await runFaceAction(async () => {
      const descriptor = await captureDescriptor();
      const { data } = await api.post("/attendance/face/enroll", {
        embedding: descriptor.embedding,
        model: "browser-face-descriptor"
      });
      const nextUser = { ...user, faceProfile: data.faceProfile };
      setUser(nextUser);
      setMessage("Face profile registered securely.");
    });
  };

  const mark = async (action) => {
    await runFaceAction(async () => {
      if (!hasFace) throw new Error("Register your face before marking face attendance.");
      const descriptor = await captureDescriptor();
      await api.post("/attendance", {
        action,
        method: "face_recognition",
        faceEmbedding: descriptor.embedding,
        liveness: descriptor.liveness
      });
      setMessage(action === "checkout" ? "Face checkout saved." : "Face attendance marked.");
      onAttendanceMarked?.();
    });
  };

  const runFaceAction = async (runner) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await runner();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Face attendance failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800">
        <div className="relative aspect-video">
          {active ? (
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <Camera size={52} />
            </div>
          )}
          <canvas ref={canvasRef} width={720} height={540} className="hidden" />
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge tone={active ? "emerald" : "slate"}>{active ? "Camera live" : "Camera off"}</Badge>
            <Badge tone={hasFace ? "emerald" : "amber"}>{hasFace ? "Face enrolled" : "Enrollment needed"}</Badge>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Face Recognition</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Webcam-based face descriptor verification with liveness checks and duplicate prevention.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={active ? stop : start} variant="outline" icon={active ? XCircle : Camera}>
            {active ? t("attendance.stopCamera") : t("attendance.startCamera")}
          </Button>
          <Button onClick={enroll} disabled={!active || busy} icon={UserPlus}>{t("attendance.registerFace")}</Button>
          <Button onClick={() => mark("checkin")} disabled={!active || busy} icon={CheckCircle2}>{t("attendance.checkIn")}</Button>
          <Button onClick={() => mark("checkout")} disabled={!active || busy} variant="danger" icon={Fingerprint}>{t("attendance.checkOut")}</Button>
        </div>
        {busy && <StatusLine tone="blue" icon={Loader2} text="Processing face descriptor..." spin />}
        {(error || cameraError) && <StatusLine tone="rose" icon={XCircle} text={error || cameraError} />}
        {message && <StatusLine tone="emerald" icon={CheckCircle2} text={message} />}
      </div>
    </div>
  );
}

function VoiceAttendancePanel({ onAttendanceMarked }) {
  const { t } = useTranslation();
  const voice = useVoiceRecognition();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const mark = async () => {
      if (!voice.transcript) return;
      setBusy(true);
      setError("");
      setMessage("");
      try {
        const { data } = await api.post("/attendance/voice", {
          transcript: voice.transcript,
          language: voice.language,
          attempts: voice.attempts
        });
        setMessage(data.message || "Voice attendance marked.");
        onAttendanceMarked?.();
      } catch (err) {
        setError(err.response?.data?.message || "Voice attendance failed.");
      } finally {
        setBusy(false);
      }
    };
    mark();
  }, [onAttendanceMarked, voice.attempts, voice.language, voice.transcript]);

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className={`mx-auto flex h-36 w-36 items-center justify-center rounded-full ${voice.listening ? "animate-pulse bg-blue-600 text-white shadow-[0_0_60px_rgba(37,99,235,0.35)]" : "bg-white text-blue-600 dark:bg-slate-900"}`}>
          {voice.listening ? <Volume2 size={48} /> : <Mic size={48} />}
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">Voice Attendance</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Say "Mark my attendance" after selecting your language.</p>
        <select
          value={voice.language}
          onChange={(event) => voice.setLanguage(event.target.value)}
          className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <option value="en-US">English</option>
          <option value="hi-IN">Hindi</option>
          <option value="fr-FR">French</option>
          <option value="es-ES">Spanish</option>
        </select>
        <Button onClick={voice.listening ? voice.stop : voice.start} className="mt-4 w-full" disabled={!voice.supported || busy} icon={voice.listening ? MicOff : Mic}>
          {voice.listening ? "Stop" : t("attendance.listen")}
        </Button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Recognition Result</h3>
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Transcript</p>
          <p className="mt-2 min-h-12 text-xl font-semibold text-slate-950 dark:text-white">{voice.transcript || "Waiting for microphone input..."}</p>
        </div>
        {busy && <StatusLine tone="blue" icon={Loader2} text="Validating command..." spin />}
        {(error || voice.error) && <StatusLine tone="rose" icon={XCircle} text={error || voice.error} />}
        {message && <StatusLine tone="emerald" icon={CheckCircle2} text={message} />}
      </div>
    </div>
  );
}

function RFIDScanPanel({ onAttendanceMarked }) {
  const { t } = useTranslation();
  const [cardNumber, setCardNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const scan = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/rfid/scan", { cardNumber: cardNumber.trim(), action: "checkin" });
      setMessage(`${data.employee?.name || "Employee"} marked ${data.attendance?.status || "Present"}.`);
      setCardNumber("");
      onAttendanceMarked?.();
    } catch (err) {
      setError(err.response?.data?.message || "RFID scan failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={scan} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="text-lg font-bold text-slate-950 dark:text-white">RFID / Smart Card Scanner</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use a keyboard-wedge RFID reader or manual smart card input.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          placeholder={t("attendance.cardPlaceholder")}
          className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
          autoComplete="off"
        />
        <Button type="submit" disabled={busy || !cardNumber.trim()} icon={busy ? Loader2 : CreditCard}>
          {busy ? "Processing" : t("attendance.scanCard")}
        </Button>
      </div>
      {error && <StatusLine tone="rose" icon={XCircle} text={error} />}
      {message && <StatusLine tone="emerald" icon={CheckCircle2} text={message} />}
    </form>
  );
}

function SmartAttendanceLogs() {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance/analytics");
      setAnalytics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const methodData = useMemo(() => (analytics?.byMethod || []).map((item) => ({
    name: methodLabels[item._id] || item._id || "Unknown",
    value: item.count
  })), [analytics]);

  const exportLogs = () => {
    const rows = analytics?.recentLogs || [];
    const csv = [
      "Employee,Method,Status,Check In,Check Out",
      ...rows.map((row) => [
        JSON.stringify(row.userId?.name || ""),
        JSON.stringify(methodLabels[row.method] || row.method || ""),
        JSON.stringify(row.status || ""),
        JSON.stringify(row.checkIn ? new Date(row.checkIn).toLocaleString() : ""),
        JSON.stringify(row.checkOut ? new Date(row.checkOut).toLocaleString() : "")
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-attendance-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">Attendance Analytics</h3>
          <Button onClick={load} variant="outline" size="sm" icon={RefreshCw}>Refresh</Button>
        </div>
        <div className="mt-5 h-64">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={methodData.length ? methodData : [{ name: "No logs", value: 1 }]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {(methodData.length ? methodData : [{ name: "No logs" }]).map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">Biometric Attendance Logs</h3>
          <Button onClick={exportLogs} variant="outline" size="sm" icon={Download}>{t("attendance.export")}</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                <th className="py-3">Employee</th>
                <th className="py-3">Method</th>
                <th className="py-3">Status</th>
                <th className="py-3">Check In</th>
                <th className="py-3">Check Out</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.recentLogs || []).map((row) => (
                <tr key={row._id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">{row.userId?.name || "Employee"}</td>
                  <td className="py-3">{methodLabels[row.method] || row.method}</td>
                  <td className="py-3"><Badge tone={row.status === "Late" ? "amber" : "emerald"}>{row.status}</Badge></td>
                  <td className="py-3">{row.checkIn ? new Date(row.checkIn).toLocaleTimeString() : "-"}</td>
                  <td className="py-3">{row.checkOut ? new Date(row.checkOut).toLocaleTimeString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RFIDAdminPanel() {
  const [employees, setEmployees] = useState([]);
  const [cards, setCards] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [employeeRes, cardsRes] = await Promise.all([api.get("/employees"), api.get("/rfid/cards")]);
    setEmployees(employeeRes.data || []);
    setCards(cardsRes.data || []);
    setEmployeeId((current) => current || employeeRes.data?.[0]?._id || "");
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const issue = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/rfid/cards", { employeeId, cardNumber: cardNumber.trim() || undefined, cardType: "proximity" });
      setCardNumber("");
      setMessage("Card assigned successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to issue card.");
    }
  };

  const updateStatus = async (cardId, status) => {
    await api.put(`/rfid/cards/${cardId}/status`, { status });
    await load();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <form onSubmit={issue} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Assign RFID Card</h3>
        <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} - {employee.employeeId}</option>)}
        </select>
        <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="Optional physical card number" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
        <Button type="submit" className="mt-4 w-full" icon={CreditCard}>Assign card</Button>
        {error && <StatusLine tone="rose" icon={XCircle} text={error} />}
        {message && <StatusLine tone="emerald" icon={CheckCircle2} text={message} />}
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <h3 className="text-lg font-bold text-slate-950 dark:text-white">Card Inventory</h3>
        <div className="mt-4 space-y-3">
          {cards.map((card) => (
            <div key={card._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{card.employee?.name || card.cardHolderName}</p>
                <p className="text-sm text-slate-500">{card.cardNumber} / used {card.usageCount || 0} times</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={card.status === "active" ? "emerald" : "amber"}>{card.status}</Badge>
                <Button onClick={() => updateStatus(card._id, card.status === "active" ? "inactive" : "active")} variant="outline" size="sm">
                  {card.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button onClick={() => updateStatus(card._id, "lost")} variant="danger" size="sm">Lost</Button>
              </div>
            </div>
          ))}
          {!cards.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900">No cards assigned yet.</p>}
        </div>
      </div>
    </div>
  );
}

function StatusLine({ tone, icon, text, spin = false }) {
  const IconComponent = icon;
  const styles = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
  };

  return (
    <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${styles[tone] || styles.blue}`}>
      <IconComponent size={17} className={spin ? "animate-spin" : ""} />
      {text}
    </div>
  );
}
