import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Bell, ChevronDown, LogOut, Menu, MessageSquare, Moon, Search, Settings, Sun, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";

const titles = {
  "/dashboard": "Dashboard",
  "/profile": "Employee Profile",
  "/admin": "Admin Command Center",
  "/attendance": "Attendance",
  "/tasks": "Tasks",
  "/payroll": "Payroll",
  "/reports": "Reports",
  "/leaves": "Leave Management",
  "/documents": "Documents",
  "/ai": "AI Workspace",
  "/chat": "Chat",
  "/meetings": "Meetings",
  "/employees": "Employees"
};

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem("ems-theme") === "dark");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ems-theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuClick} className="rounded-2xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Employee Portal</p>
            <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-white">{titles[pathname] || "Workspace"}</h1>
          </div>
        </div>

        <div className="hidden min-w-0 max-w-md flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex">
          <Search size={16} className="text-slate-400" aria-hidden="true" />
          <input className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 dark:text-slate-200" placeholder="Search people, tasks, reports" aria-label="Global search" />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/chat" className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:flex" aria-label="Messages">
            <MessageSquare size={18} />
          </Link>
          <button type="button" onClick={() => setDark((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-blue-600" />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pr-2 text-left shadow-sm transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40"
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              <Avatar name={user?.name} />
              <div className="hidden max-w-36 text-right sm:block">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role}</p>
              </div>
              <ChevronDown size={16} className={`hidden text-slate-400 transition sm:block ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <Motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                    <p className="font-semibold text-slate-950 dark:text-white">{user?.name || "Team Member"}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user?.email || user?.department || "Employee workspace"}</p>
                  </div>
                  <Link onClick={() => setProfileOpen(false)} to="/profile" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                    <UserRound size={16} /> Employee profile
                  </Link>
                  <Link onClick={() => setProfileOpen(false)} to="/ai" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                    <Settings size={16} /> Workspace tools
                  </Link>
                  <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10">
                    <LogOut size={16} /> Logout
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
