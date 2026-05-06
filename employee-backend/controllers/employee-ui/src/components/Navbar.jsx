import { useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="relative z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Employee Portal</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-950">Today</h1>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:text-blue-600">
          <Bell size={18} />
        </button>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{user?.role}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-semibold text-white">
          {user?.name?.[0] || "U"}
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-3 text-sm text-white transition hover:bg-slate-700 sm:px-4">
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}
