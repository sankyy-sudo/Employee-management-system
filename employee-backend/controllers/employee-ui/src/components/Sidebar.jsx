import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  ClipboardCheck,
  FileText,
  Home,
  Plane,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  ListTodo
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const employeeMenu = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Attendance", path: "/attendance", icon: ClipboardCheck },
    { name: "Leave", path: "/leaves", icon: Plane },
    { name: "Payroll", path: "/ai", icon: WalletCards },
    { name: "Tasks", path: "/tasks", icon: ListTodo },
    { name: "Profile", path: "/documents", icon: UserRound }
  ];

  const adminMenu = [
    { name: "Dashboard", path: "/admin", icon: ShieldCheck },
    { name: "Employees", path: "/admin#employees", icon: Users },
    { name: "Attendance", path: "/admin#attendance", icon: ClipboardCheck },
    { name: "Leaves", path: "/admin#leaves", icon: Plane },
    { name: "Payroll", path: "/admin#payroll", icon: WalletCards },
    { name: "Tasks", path: "/admin#tasks", icon: ListTodo },
    { name: "Reports", path: "/admin#reports", icon: FileText },
    { name: "Settings", path: "/admin#settings", icon: Settings }
  ];

  const menu = ["admin", "hr"].includes(user?.role) ? adminMenu : employeeMenu;

  return (
    <aside className="relative z-10 hidden w-72 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
      <div className="flex h-full flex-col">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Computing-Mind</h1>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Logged in as</p>
          <p className="mt-2 text-base font-semibold text-slate-950">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.department || "Team Member"} - {user?.role}</p>
        </div>

        <nav className="space-y-2">
          {menu.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`group flex items-center gap-3 rounded-2xl p-3 transition ${
                pathname === item.path
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${pathname === item.path ? "bg-white/15" : "bg-slate-100 group-hover:bg-white"}`}>
                <item.icon size={18} />
              </span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-sm font-medium">Today Focus</p>
          <p className="mt-2 text-xs text-slate-300">Attendance, priority tasks, leave, and mood check-in.</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-4/5 rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    </aside>
  );
}
