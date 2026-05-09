import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function EmployeeRoute({ children }) {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();

  if (["admin", "hr"].includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
