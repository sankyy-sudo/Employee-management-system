import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  name: "",
  email: "",
  password: "",
  department: "",
  role: "employee"
};

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const isRegister = mode === "register";

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }

      navigate("/dashboard");
    } catch (err) {
      const serverMessage =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : "");
      setError(serverMessage || "Unable to continue right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="soft-grid relative overflow-hidden rounded-[36px] bg-slate-950 p-10 text-white shadow-[0_30px_80px_rgba(15,23,42,0.26)]"
        >
          <div className="absolute right-[-4rem] top-[-4rem] h-44 w-44 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[-3rem] h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <p className="text-sm uppercase tracking-[0.4em] text-blue-200">Employee Suite</p>
          <h1 className="relative mt-6 max-w-xl text-5xl font-bold leading-tight md:text-6xl">
            Run employee profiles, leave operations, holidays, chat, and admin work from one place.
          </h1>
          <p className="relative mt-6 max-w-xl text-lg leading-8 text-slate-300">
            The frontend is now structured to connect directly to the live backend on
            `http://localhost:5001/api`, with role-based access for admin, HR, and employee sections.
          </p>

          <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
            <Feature title="Profiles" detail="Store skills, joining dates, family details, and appreciation" />
            <Feature title="Leave Flow" detail="Apply leave, manage balances, and approve requests" />
            <Feature title="HR View" detail="Manage employees, leave approvals, and holiday operations" />
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleSubmit}
          className="glass-panel relative overflow-hidden rounded-[36px] p-8"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
            {isRegister ? "Create account" : "Welcome back"}
          </p>
          <h2 className="mt-4 text-3xl font-bold text-slate-900">
            {isRegister ? "Register your workspace profile" : "Sign in to continue"}
          </h2>

          <div className="mt-8 space-y-4">
            {isRegister && (
              <>
                <Input label="Full name" name="name" value={form.name} onChange={handleChange} />
                <Input label="Department" name="department" value={form.department} onChange={handleChange} />
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </>
            )}

            <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Please wait..." : isRegister ? "Create account" : "Login"}
          </button>

          <p className="mt-6 text-sm text-slate-600">
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <Link
              to={isRegister ? "/login" : "/register"}
              className="font-semibold text-blue-600"
            >
              {isRegister ? "Login" : "Register"}
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}

function Feature({ title, detail }) {
  return (
    <div className="lift-hover rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{detail}</p>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        {...props}
        required
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
      />
    </label>
  );
}
