import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useAuth();
  const role = String(user?.role || "").trim().toLowerCase();

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
