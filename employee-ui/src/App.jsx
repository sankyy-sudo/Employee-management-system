import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Chat from "./pages/Chat";
import Meetings from "./pages/Meetings";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Employees from "./pages/Employees";
import Leaves from "./pages/Leaves";
import Holidays from "./pages/Holidays";
import Documents from "./pages/Documents";
import AIWorkspace from "./pages/AIWorkspace";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import EmployeeRoute from "./components/EmployeeRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <EmployeeRoute>
                <Attendance />
              </EmployeeRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <EmployeeRoute>
                <Tasks />
              </EmployeeRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <EmployeeRoute>
                <Reports />
              </EmployeeRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves"
          element={
            <ProtectedRoute>
              <Leaves />
            </ProtectedRoute>
          }
        />
        <Route
          path="/holidays"
          element={
            <ProtectedRoute>
              <Holidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AIWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meetings"
          element={
            <ProtectedRoute>
              <Meetings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Employees />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Admin />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
