import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!["admin", "hr"].includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
