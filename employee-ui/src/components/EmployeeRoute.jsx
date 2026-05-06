import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function EmployeeRoute({ children }) {
  const { user } = useAuth();

  if (user?.role !== "employee") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
