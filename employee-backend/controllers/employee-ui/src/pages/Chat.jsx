import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatTime } from "../utils/format";

export default function Chat() {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const loadTeam = async () => {
      const { data } = await api.get("/employees");
      const filtered = data.filter((member) => member._id !== user._id);
      setTeam(filtered);
      setSelectedUser(filtered[0] || null);
    };

    loadTeam();
  }, [user]);

  const loadMessages = async (targetUser) => {
    if (!targetUser) return;

    const { data } = await api.get("/messages", {
      params: { userA: user.name, userB: targetUser.name }
    });
    setMessages(data);
  };

  useEffect(() => {
    loadMessages(selectedUser);
    if (!selectedUser) return undefined;

    const interval = setInterval(() => loadMessages(selectedUser), 4000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  const sendMessage = async () => {
    if (!text.trim() || !selectedUser) return;

    await api.post("/messages/send", {
      sender: user.name,
      receiver: selectedUser.name,
      text
    });
    setText("");
    await loadMessages(selectedUser);
  };

  const recipients = useMemo(() => team.filter(Boolean), [team]);

  return (
    <Layout>
      <div className="overflow-hidden rounded-[28px] bg-white/80 shadow-lg backdrop-blur">
        <div className="grid min-h-[75vh] lg:grid-cols-[320px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-950 p-5 text-white">
            <p className="text-sm uppercase tracking-[0.35em] text-blue-200">Chat</p>
            <h1 className="mt-3 text-2xl font-bold">Team Conversation</h1>

            <div className="mt-6 space-y-3">
              {recipients.map((member) => (
                <button
                  key={member._id}
                  onClick={() => setSelectedUser(member)}
                  className={`w-full rounded-2xl p-4 text-left transition ${
                    selectedUser?._id === member._id ? "bg-blue-500" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-sm text-blue-100">{member.department || member.role}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-xl font-semibold">{selectedUser?.name || "Select a teammate"}</h2>
              <p className="text-sm text-slate-500">{selectedUser?.email || "Choose a conversation to begin."}</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/80 p-5">
              {messages.map((message) => {
                const own = message.sender === user.name;
                return (
                  <div key={message._id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-lg rounded-3xl px-4 py-3 shadow ${
                        own ? "bg-blue-600 text-white" : "bg-white text-slate-900"
                      }`}
                    >
                      <p>{message.text}</p>
                      <p className={`mt-2 text-xs ${own ? "text-blue-100" : "text-slate-400"}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {!messages.length && <p className="text-sm text-slate-500">No messages yet.</p>}
            </div>

            <div className="flex gap-3 border-t border-slate-100 p-5">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                placeholder="Type a message"
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
              <button onClick={sendMessage} className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white">
                Send
              </button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
