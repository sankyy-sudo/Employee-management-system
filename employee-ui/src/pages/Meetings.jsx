import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";

const emptyMeeting = {
  title: "",
  agenda: "",
  scheduledFor: "",
  meetingLink: ""
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [form, setForm] = useState(emptyMeeting);

  const loadMeetings = async () => {
    const { data } = await api.get("/meetings");
    setMeetings(data);
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await api.post("/meetings", form);
    setForm(emptyMeeting);
    await loadMeetings();
  };

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="mt-2 text-sm text-slate-500">Schedule internal syncs and client calls.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Meeting title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <Input
              label="Agenda"
              value={form.agenda}
              onChange={(event) => setForm({ ...form, agenda: event.target.value })}
            />
            <label className="block text-sm font-medium text-slate-700">
              Schedule
              <input
                type="datetime-local"
                required
                value={form.scheduledFor}
                onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </label>
            <Input
              label="Meeting link"
              value={form.meetingLink}
              onChange={(event) => setForm({ ...form, meetingLink: event.target.value })}
            />
            <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white">
              Schedule Meeting
            </button>
          </form>
        </section>

        <section className="glass-panel rounded-[30px] p-6">
          <h2 className="text-2xl font-semibold">Upcoming Meetings</h2>
          <div className="mt-4 space-y-4">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="lift-hover rounded-[28px] border border-white/70 bg-white/70 p-5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{meeting.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{meeting.agenda || "No agenda provided"}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {new Date(meeting.scheduledFor).toLocaleString()}
                    </p>
                  </div>
                  {meeting.meetingLink && (
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-center font-semibold text-white"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!meetings.length && <p className="text-sm text-slate-500">No meetings scheduled yet.</p>}
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
