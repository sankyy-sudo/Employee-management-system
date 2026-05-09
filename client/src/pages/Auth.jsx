import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Input, Select } from "../components/ui/Form";

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

  if (user) return <Navigate to="/dashboard" replace />;

  const isRegister = mode === "register";

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
      const serverMessage = err.response?.data?.message || (typeof err.response?.data === "string" ? err.response.data : "");
      setError(serverMessage || "Unable to continue right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <Motion.section initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="soft-grid rounded-2xl bg-slate-950 p-8 text-white shadow-lift sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
            <Building2 size={22} aria-hidden="true" />
          </div>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Employee Suite</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
            Run people operations from a calm, connected workspace.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            Profiles, attendance, leave, payroll, documents, reporting, and AI signals are organized into a production-ready HRMS experience.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Feature title="Role-based" detail="Admin, HR, and employee access flows." />
            <Feature title="Operational" detail="Approvals, payroll, reports, and attendance." />
            <Feature title="Scalable" detail="Reusable UI patterns for new modules." />
          </div>
        </Motion.section>

        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <ShieldCheck size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{isRegister ? "Create account" : "Welcome back"}</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{isRegister ? "Register your profile" : "Sign in to EMS"}</h2>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {isRegister && (
                <>
                  <Input label="Full name" name="name" value={form.name} onChange={handleChange} />
                  <Input label="Department" name="department" value={form.department} onChange={handleChange} />
                  <Select label="Role" name="role" value={form.role} onChange={handleChange}>
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </Select>
                </>
              )}

              <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
              <Input label="Password" name="password" type="password" value={form.password} onChange={handleChange} />
            </div>

            {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

            <Button type="submit" disabled={submitting} className="mt-6 w-full">
              {submitting ? "Please wait..." : isRegister ? "Create account" : "Login"}
            </Button>

            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
              {isRegister ? "Already have an account?" : "Need an account?"}{" "}
              <Link to={isRegister ? "/login" : "/register"} className="font-semibold text-blue-600 dark:text-blue-400">
                {isRegister ? "Login" : "Register"}
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Feature({ title, detail }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <CheckCircle2 className="text-blue-300" size={18} aria-hidden="true" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-5 text-slate-300">{detail}</p>
    </div>
  );
}
