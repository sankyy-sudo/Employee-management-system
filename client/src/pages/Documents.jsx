import { Navigate } from "react-router-dom";

export default function Documents() {
  return <Navigate to="/profile?tab=Documents" replace />;
}
