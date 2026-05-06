import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";

const initialForm = {
  leaveType: "paid",
  startDate: "",
  endDate: "",
  reason: ""
};

export default function Leaves() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (user.role !== "employee") {
      const { data } = await api.get("/leaves");
      setLeaves(data);
      setBalance(null);
      return;
    }

    const [balanceRes, leaveRes] = await Promise.all([api.get("/leaves/balance"), api.get("/leaves")]);
    setBalance(balanceRes.data.leaveBalance);
    setLeaves(leaveRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await api.post("/leaves", form);
      setForm(initialForm);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (leaveId, status) => {
    await api.patch(`/leaves/${leaveId}/status`, { status });
    await loadData();
  };

  const pendingApprovals = leaves.filter((leave) => leave.status === "pending");

  return (
    <Layout>
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="glass-panel rounded-[30px] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Leave Management</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {user.role !== "employee" ? "Leave Approval" : "Apply Leave"}
          </h1>

          {user.role !== "employee" ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] bg-white/70 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Admin Access</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  Admins do not apply for leave.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Review employee leave requests below and approve or reject them from the request list.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] bg-white/70 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Pending Requests</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{pendingApprovals.length}</p>
                </div>
                <div className="rounded-[22px] bg-white/70 p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Processed Requests</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {leaves.filter((leave) => leave.status !== "pending").length}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {Object.entries(balance || {}).map(([key, value]) => (
                  <div key={key} className="rounded-[22px] bg-white/70 p-4 shadow-sm">
                    <p className="text-sm capitalize text-slate-500">{key} balance</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleApply} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Leave Type
                  <select
                  value={form.leaveType}
                  onChange={(event) => setForm({ ...form, leaveType: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >
                  <option value="paid">Paid</option>
                  <option value="sick">Sick</option>
                  <option value="casual">Casual</option>
                </select>
              </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Start Date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  />
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Reason
                  <textarea
                    required
                    value={form.reason}
                    onChange={(event) => setForm({ ...form, reason: event.target.value })}
                    className="mt-1 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  />
                </label>

                <button
                  disabled={submitting}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
                >
                  {submitting ? "Submitting..." : "Apply Leave"}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="space-y-6">
          <div className="glass-panel rounded-[30px] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-500">History</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {user.role !== "employee" ? "All Leave Requests" : "My Leave History"}
                </h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {leaves.length} records
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {leaves.map((leave) => (
                <div key={leave._id} className="rounded-[24px] border border-white/70 bg-white/75 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {leave.employee?.name || user.name} • {capitalize(leave.leaveType)} Leave
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)} • {leave.days} day(s)
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{leave.reason}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(leave.status)}`}>
                        {capitalize(leave.status)}
                      </span>
                      {leave.autoApproved && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Holiday Auto Approval
                        </span>
                      )}
                      {user.role !== "employee" && leave.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange(leave._id, "approved")}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(leave._id, "rejected")}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {!leaves.length && <EmptyState text="No leave records available yet." />}
            </div>
          </div>

          {user.role !== "employee" && (
            <div className="glass-panel rounded-[30px] p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Admin Queue</p>
              <h2 className="mt-2 text-2xl font-semibold">Pending Approvals</h2>
              <div className="mt-4 space-y-3">
                {pendingApprovals.map((leave) => (
                  <div key={leave._id} className="rounded-[22px] bg-white/70 p-4">
                    <p className="font-semibold">{leave.employee?.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {leave.employee?.department || "Team"} • {leave.days} day(s)
                    </p>
                  </div>
                ))}
                {!pendingApprovals.length && <EmptyState text="All leave requests are handled." />}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        required
        {...props}
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
      />
    </label>
  );
}

function EmptyState({ text }) {
  return <div className="rounded-[22px] bg-slate-50/80 p-4 text-sm text-slate-500">{text}</div>;
}

function capitalize(value = "") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusClassName(status) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}
