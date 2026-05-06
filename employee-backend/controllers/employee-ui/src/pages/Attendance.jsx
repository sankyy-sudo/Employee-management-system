import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatTime } from "../utils/format";
import { createEmbeddingFromVideo } from "../utils/faceEmbedding";

export default function Attendance() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [liveness, setLiveness] = useState({ blinkDetected: false, headMovementDetected: false });
  const [message, setMessage] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const loadAttendance = async () => {
    const [historyRes, summaryRes] = await Promise.all([
      api.get("/attendance"),
      api.get("/attendance/summary")
    ]);

    setHistory(historyRes.data);
    setSummary(summaryRes.data);
  };

  useEffect(() => {
    loadAttendance();
  }, [user]);

  const today = history[0];

  const workingHours = useMemo(() => {
    if (!today?.checkIn || !today?.checkOut) return "--";
    const diff = new Date(today.checkOut) - new Date(today.checkIn);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }, [today]);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    setCameraActive(true);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const enrollFace = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      if (!cameraActive) await startCamera();
      const embedding = await createEmbeddingFromVideo(videoRef.current);
      await api.post("/attendance/face/enroll", { embedding });
      setMessage("Face profile enrolled successfully.");
    } finally {
      setSubmitting(false);
    }
  };

  const markAttendance = async (action) => {
    setSubmitting(true);
    setMessage("");
    try {
      const payload = { action };
      if (action === "checkin" && cameraActive) {
        payload.faceEmbedding = await createEmbeddingFromVideo(videoRef.current);
        payload.liveness = liveness;
      }
      await api.post("/attendance", payload);
      await loadAttendance();
    } catch (error) {
      setMessage(error.response?.data?.message || "Attendance failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-6 text-2xl font-semibold">Attendance</h1>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Present Days" value={String(summary?.stats.presentDays ?? 0)} />
          <StatCard title="Checked Out" value={String(summary?.stats.checkedOutDays ?? 0)} />
          <StatCard title="Monthly Records" value={String(summary?.stats.totalRecords ?? 0)} />
          <StatCard title="Working Hours" value={String(summary?.stats.totalWorkingHours ?? "--")} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="glass-panel rounded-[30px] p-6">
            <h2 className="text-xl font-semibold">Today's Status</h2>
            <div className="soft-grid relative mt-6 overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white">
              <div className="absolute right-[-2rem] top-[-1rem] h-28 w-28 rounded-full bg-cyan-400/20 blur-3xl" />
              <p className="text-sm uppercase tracking-[0.3em] text-blue-200">Current state</p>
              <h3 className="mt-3 text-3xl font-bold">{today?.status || "Not Marked"}</h3>
              <p className="mt-2 text-slate-300">
                Check in: {formatTime(today?.checkIn)} • Check out: {formatTime(today?.checkOut)}
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <InfoCard title="Working Hours" value={workingHours} />
              <InfoCard title="Face Verified" value={today?.faceVerified ? "Yes" : "No"} />
            </div>

            <div className="mt-6 rounded-[24px] bg-white/70 p-4">
              <video ref={videoRef} autoPlay muted playsInline className="h-48 w-full rounded-[20px] bg-slate-900 object-cover" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={cameraActive ? stopCamera : startCamera} className="rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white">
                  {cameraActive ? "Stop Camera" : "Start Camera"}
                </button>
                <button type="button" disabled={submitting || !cameraActive} onClick={enrollFace} className="rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
                  Enroll Face
                </button>
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <input type="checkbox" checked={liveness.blinkDetected} onChange={(event) => setLiveness({ ...liveness, blinkDetected: event.target.checked })} />
                  Blink detected
                </label>
                <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                  <input type="checkbox" checked={liveness.headMovementDetected} onChange={(event) => setLiveness({ ...liveness, headMovementDetected: event.target.checked })} />
                  Head movement
                </label>
              </div>
              {message && <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</p>}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={submitting}
                onClick={() => markAttendance("checkin")}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                Check In
              </button>
              <button
                disabled={submitting}
                onClick={() => markAttendance("checkout")}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:opacity-70"
              >
                Check Out
              </button>
            </div>
          </section>

          <section className="glass-panel rounded-[30px] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Monthly Report</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {summary?.month}/{summary?.year}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Check In</th>
                    <th className="pb-3">Check Out</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Face</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id} className="border-t border-slate-100">
                      <td className="py-3">{formatDate(item.createdAt)}</td>
                      <td className="py-3">{formatTime(item.checkIn)}</td>
                      <td className="py-3">{formatTime(item.checkOut)}</td>
                      <td className="py-3">{item.status}</td>
                      <td className="py-3">{item.faceVerified ? "Verified" : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!history.length && <p className="py-6 text-sm text-slate-500">No attendance records yet.</p>}
            </div>
          </section>
        </div>
      </motion.div>
    </Layout>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="glass-panel lift-hover rounded-[28px] p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-3 text-3xl font-bold text-slate-900">{value}</h2>
    </div>
  );
}

function InfoCard({ title, value }) {
  return (
    <div className="lift-hover rounded-[24px] bg-white/70 p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
