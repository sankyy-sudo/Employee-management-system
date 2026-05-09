import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  AlertCircle,
  CheckCheck,
  Clock3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Users,
  Video
} from "lucide-react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatTime } from "../utils/format";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Page from "../components/ui/Page";
import Skeleton from "../components/ui/Skeleton";

const quickReplies = [
  "On it.",
  "Can you share more context?",
  "Thanks, received.",
  "I'll update you shortly."
];

export default function Chat() {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [team, setTeam] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserId = getUserId(selectedUser);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadTeam = async () => {
      if (!currentUserId) return;

      setLoadingTeam(true);
      setError("");
      try {
        const { data } = await api.get("/employees");
        if (!active) return;
        const filtered = data.filter((member) => getUserId(member) !== currentUserId);
        setTeam(filtered);
        setSelectedUser((current) => {
          const currentId = getUserId(current);
          return filtered.some((member) => getUserId(member) === currentId) ? current : filtered[0] || null;
        });
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load teammates.");
      } finally {
        if (active) setLoadingTeam(false);
      }
    };

    loadTeam();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    let active = true;
    let interval;

    const loadMessages = async (silent = false) => {
      if (!currentUserId || !selectedUserId) {
        setMessages([]);
        return;
      }

      if (!silent) setLoadingMessages(true);
      try {
        const { data } = await api.get("/messages", {
          params: { userA: currentUserId, userB: selectedUserId }
        });
        if (active) setMessages(data);
      } catch (requestError) {
        if (active && !silent) setError(requestError.response?.data?.message || "Unable to load messages.");
      } finally {
        if (active && !silent) setLoadingMessages(false);
      }
    };

    loadMessages();
    if (selectedUserId) {
      interval = setInterval(() => loadMessages(true), 4000);
    }

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [currentUserId, selectedUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedUserId]);

  const recipients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return team.filter((member) => {
      if (!query) return true;
      return [member.name, member.email, member.department, member.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [search, team]);

  const activeMembers = useMemo(() => team.filter((member) => getPresence(member).status === "online").length, [team]);
  const lastMessage = messages[messages.length - 1];

  const sendMessage = async (event) => {
    event?.preventDefault();
    const trimmedText = text.trim();

    if (!trimmedText || !selectedUserId || !currentUserId || sending) return;

    const optimisticId = `draft-${Date.now()}`;
    const optimisticMessage = {
      _id: optimisticId,
      sender: currentUserId,
      receiver: selectedUserId,
      text: trimmedText,
      seen: false,
      pending: true,
      createdAt: new Date().toISOString()
    };

    setMessages((current) => [...current, optimisticMessage]);
    setText("");
    setSending(true);
    setError("");

    try {
      const { data } = await api.post("/messages/send", {
        sender: currentUserId,
        receiver: selectedUserId,
        text: trimmedText
      });
      setMessages((current) => current.map((message) => (message._id === optimisticId ? data : message)));
    } catch (requestError) {
      setMessages((current) => current.filter((message) => message._id !== optimisticId));
      setText(trimmedText);
      setError(requestError.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <Page
        eyebrow="Chat"
        title="Team Conversation"
        description="A focused communication hub for quick alignment, handoffs, and employee support."
        className="max-w-[1600px]"
        actions={
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            {activeMembers} active now
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <Card className="overflow-hidden border-white/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
            <div className="grid min-h-[720px] lg:h-[calc(100vh-210px)] lg:min-h-[680px] lg:grid-cols-[360px_1fr]">
              <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/70 lg:border-b-0 lg:border-r">
                <div className="border-b border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">People</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Inbox</h2>
                    </div>
                    <Badge tone="blue">{team.length} teammates</Badge>
                  </div>
                  <div className="relative mt-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search people"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      aria-label="Search teammates"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                  {loadingTeam && (
                    <div className="space-y-3">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </div>
                  )}

                  {!loadingTeam && recipients.map((member) => (
                    <RecipientButton
                      key={getUserId(member)}
                      member={member}
                      active={selectedUserId === getUserId(member)}
                      onClick={() => setSelectedUser(member)}
                    />
                  ))}

                  {!loadingTeam && !recipients.length && (
                    <EmptyState
                      icon={Users}
                      title="No teammates found"
                      description="Try a different name, department, or role."
                    />
                  )}
                </div>
              </aside>

              <section className="flex min-w-0 min-h-0 flex-col">
                <ConversationHeader selectedUser={selectedUser} lastMessage={lastMessage} />

                {error && (
                  <div className="mx-5 mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                    <AlertCircle size={17} />
                    {error}
                  </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 dark:from-slate-950 dark:to-slate-900 sm:p-5">
                  {loadingMessages && (
                    <div className="space-y-4">
                      <Skeleton className="h-20 max-w-md" />
                      <Skeleton className="ml-auto h-20 max-w-md" />
                      <Skeleton className="h-20 max-w-sm" />
                    </div>
                  )}

                  {!loadingMessages && !selectedUser && (
                    <EmptyState
                      icon={MessageCircle}
                      title="Select a conversation"
                      description="Choose a teammate from the inbox to start messaging."
                    />
                  )}

                  {!loadingMessages && selectedUser && !messages.length && (
                    <div className="flex h-full items-center justify-center">
                      <EmptyState
                        icon={Sparkles}
                        title="No messages yet"
                        description={`Start a focused conversation with ${selectedUser.name}.`}
                        action={<Button onClick={() => setText("Hi, can we sync on this?")} variant="outline">Use quick opener</Button>}
                      />
                    </div>
                  )}

                  {!loadingMessages && Boolean(messages.length) && (
                    <div className="space-y-4">
                      {messages.map((message, index) => {
                        const own = isOwnMessage(message, user);
                        const dateLabel = formatMessageDay(message.createdAt);
                        const previousLabel = formatMessageDay(messages[index - 1]?.createdAt);

                        return (
                          <Fragment key={message._id}>
                            {dateLabel !== previousLabel && <DateDivider label={dateLabel} />}
                            <MessageBubble message={message} own={own} />
                          </Fragment>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                <Composer
                  disabled={!selectedUser || sending}
                  selectedUser={selectedUser}
                  text={text}
                  setText={setText}
                  sending={sending}
                  onSubmit={sendMessage}
                />
              </section>
            </div>
          </Card>

          <aside className="space-y-5">
            <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Workspace</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Chat Health</h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  <ShieldCheck size={19} />
                </span>
              </div>
              <div className="mt-5 grid gap-3">
                <InsightRow icon={Users} label="Reachable teammates" value={team.length} />
                <InsightRow icon={MessageCircle} label="Open thread messages" value={messages.length} />
                <InsightRow icon={Clock3} label="Last activity" value={lastMessage ? formatTime(lastMessage.createdAt) : "--"} />
              </div>
            </Card>

            <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Quick Replies</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => setText(reply)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </Page>
    </Layout>
  );
}

function RecipientButton({ member, active, onClick }) {
  const presence = getPresence(member);

  return (
    <Motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
        active
          ? "border-blue-200 bg-blue-50 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10"
          : "border-transparent bg-white hover:border-slate-200 hover:bg-white dark:bg-slate-900/70 dark:hover:border-slate-800"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={member.name} size="sm" />
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${presence.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{member.name}</p>
          <span className="shrink-0 text-xs text-slate-400">{presence.label}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{member.department || member.role || member.email}</p>
      </div>
    </Motion.button>
  );
}

function ConversationHeader({ selectedUser, lastMessage }) {
  const presence = getPresence(selectedUser);

  return (
    <div className="border-b border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={selectedUser?.name || "Team"} />
            {selectedUser && <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 ${presence.dot}`} />}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-slate-950 dark:text-white">{selectedUser?.name || "Select a teammate"}</h2>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {selectedUser ? `${selectedUser.email || selectedUser.role || "Employee"} / ${presence.description}` : "Choose a conversation to begin."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={lastMessage ? "emerald" : "slate"}>{lastMessage ? "synced" : "ready"}</Badge>
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" aria-label="Start video call">
            <Video size={17} />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:text-blue-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300" aria-label="More chat actions">
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, own }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex ${own ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[min(36rem,82%)] rounded-2xl px-4 py-3 shadow-sm ${
        own
          ? "rounded-br-md bg-blue-600 text-white"
          : "rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
        <div className={`mt-2 flex items-center justify-end gap-1.5 text-xs ${own ? "text-blue-100" : "text-slate-400"}`}>
          <span>{formatTime(message.createdAt)}</span>
          {own && (message.pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />)}
        </div>
      </div>
    </Motion.div>
  );
}

function Composer({ disabled, selectedUser, text, setText, sending, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit(event);
            }
          }}
          disabled={disabled}
          rows={2}
          placeholder={selectedUser ? `Message ${selectedUser.name}` : "Select a teammate to message"}
          className="max-h-36 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed dark:text-slate-100"
          aria-label="Message text"
        />
        <div className="flex flex-col gap-3 border-t border-slate-200 px-2 pt-2 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-900" aria-label="Attach file">
              <Paperclip size={17} />
            </button>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-900" aria-label="Add emoji">
              <Smile size={17} />
            </button>
          </div>
          <Button type="submit" disabled={disabled || !text.trim()} icon={sending ? Loader2 : Send} variant="secondary">
            {sending ? "Sending" : "Send"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DateDivider({ label }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800">{label}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function InsightRow({ icon, label, value }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Icon size={16} />
        {label}
      </span>
      <span className="font-semibold text-slate-950 dark:text-white">{value}</span>
    </div>
  );
}

function getUserId(member) {
  return String(member?._id || member?.id || "");
}

function getActorId(actor) {
  if (!actor) return "";
  if (typeof actor === "object") return getUserId(actor);
  return String(actor);
}

function isOwnMessage(message, user) {
  const sender = getActorId(message.sender);
  return sender === getUserId(user) || sender === user?.name;
}

function getPresence(member) {
  if (!member) {
    return {
      status: "offline",
      label: "Offline",
      description: "No presence data",
      dot: "bg-slate-300"
    };
  }

  const lastSeen = member.lastSeenAt ? new Date(member.lastSeenAt).getTime() : 0;
  const minutesAway = lastSeen ? (Date.now() - lastSeen) / 60000 : Number.POSITIVE_INFINITY;

  if (minutesAway <= 10) {
    return {
      status: "online",
      label: "Online",
      description: "Available now",
      dot: "bg-emerald-500"
    };
  }

  if (minutesAway <= 120) {
    return {
      status: "recent",
      label: "Recent",
      description: "Active recently",
      dot: "bg-amber-500"
    };
  }

  return {
    status: "offline",
    label: "Away",
    description: "May respond later",
    dot: "bg-slate-300"
  };
}

function formatMessageDay(value) {
  if (!value) return "Today";

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric"
  });
}
