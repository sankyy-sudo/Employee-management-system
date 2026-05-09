import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  FileText,
  Home,
  LayoutGrid,
  MessageSquare,
  Plane,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
  ListTodo
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./ui/Avatar";

const employeeSections = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: Home },
      { name: "Profile", path: "/profile", icon: UserRound },
      { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
      { name: "Leaves", path: "/leaves", icon: Plane },
      { name: "Tasks", path: "/tasks", icon: ListTodo },
      { name: "Reports", path: "/reports", icon: FileText }
    ]
  },
  {
    label: "People",
    items: [
      { name: "Documents", path: "/documents", icon: FileText },
      { name: "AI Workspace", path: "/ai", icon: Sparkles },
      { name: "Chat", path: "/chat", icon: MessageSquare },
      { name: "Meetings", path: "/meetings", icon: Calendar }
    ]
  }
];

const adminSections = [
  {
    label: "Command",
    items: [
      { name: "Dashboard", path: "/admin", icon: ShieldCheck },
      { name: "Employees", path: "/employees", icon: Users },
      { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
      { name: "Leave Management", path: "/leaves", icon: Plane },
      { name: "Payroll", path: "/payroll", icon: WalletCards },
      { name: "Projects", path: "/projects", icon: ListTodo }
    ]
  },
  {
    label: "Operations",
    items: [
      { name: "HRMS", path: "/profile", icon: UserRound },
      { name: "Reports & Analytics", path: "/admin#reports", icon: BarChart3 },
      { name: "AI Automation", path: "/admin#ai", icon: Sparkles },
      { name: "Notifications", path: "/admin#notifications", icon: MessageSquare },
      { name: "Roles & Permissions", path: "/admin#roles", icon: ShieldCheck },
      { name: "Settings", path: "/admin#settings", icon: Settings }
    ]
  }
];

export default function Sidebar({ mobileOpen, onMobileClose, collapsed, onCollapsedChange }) {
  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white/95 shadow-soft backdrop-blur-xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/95 lg:block ${collapsed ? "w-24" : "w-72"}`}>
        <SidebarContent collapsed={collapsed} onCollapsedChange={onCollapsedChange} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm lg:hidden" onClick={onMobileClose}>
            <Motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full w-80 max-w-[86vw] border-r border-slate-200 bg-white p-4 shadow-lift dark:border-slate-800 dark:bg-slate-950"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <Brand />
                <button onClick={onMobileClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close navigation">
                  <X size={18} />
                </button>
              </div>
              <SidebarNav collapsed={false} onNavigate={onMobileClose} />
            </Motion.aside>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarContent({ collapsed, onCollapsedChange }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between">
        <Brand collapsed={collapsed} />
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft size={18} className={`transition ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>
      <SidebarNav collapsed={collapsed} />
    </div>
  );
}

function Brand({ collapsed = false }) {
  return (
    <Link to="/dashboard" className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
        <LayoutGrid size={20} aria-hidden="true" />
      </span>
      {!collapsed && (
        <span>
          <span className="block text-base font-semibold tracking-tight text-slate-950 dark:text-white">Computing-Mind</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">Employee OS</span>
        </span>
      )}
    </Link>
  );
}

function SidebarNav({ collapsed, onNavigate }) {
  const { pathname, hash } = useLocation();
  const { user } = useAuth();
  const role = String(user?.role || "").trim().toLowerCase();
  const sections = role === "admin" ? adminSections : employeeSections;

  return (
    <div className="mt-8 flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        {sections.map((section) => (
          <nav key={section.label} aria-label={section.label}>
            {!collapsed && <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{section.label}</p>}
            <div className="space-y-1">
              {section.items.map((item) => {
                const [path, itemHash] = item.path.split("#");
                const active = pathname === path && (itemHash ? hash === `#${itemHash}` : !hash);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.name : undefined}
                  >
                    {active && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-blue-600" />}
                    <item.icon size={18} aria-hidden="true" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>
        ))}
      </div>

      <div className={`mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 ${collapsed ? "px-2" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <Avatar name={user?.name} size="md" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{user?.name || "Team Member"}</p>
              <p className="truncate text-xs capitalize text-slate-500 dark:text-slate-400">{user?.department || user?.role || "Workspace"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
