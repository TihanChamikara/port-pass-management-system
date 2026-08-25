import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";

import AppLayout from "../components/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuthStore } from "../features/auth/authStore";
import DashboardPage from "../pages/DashboardPage";
import LoginPage from "../pages/LoginPage";
import PassesPage from "../pages/PassesPage";
import UserManagementPage from "../pages/UserManagementPage";
import WelcomePage from "../pages/WelcomePage";
import PublicVisitorRequestPage from "../pages/PublicVisitorRequestPage";
import OperationsApprovalPage from "../pages/OperationsApprovalPage";
import PassGenerationPage from "../pages/PassGenerationPage";

export default function App() {
  const token = useAuthStore((state) => state.token);
  const loadMe = useAuthStore((state) => state.loadMe);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/visitor-request" element={<PublicVisitorRequestPage />} />
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      
      {/* Protected routes */}
      <Route
        path="/welcome"
        element={
          <ProtectedRoute>
            <WelcomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="passes" element={<PassesPage />} />
        <Route path="admin/users" element={<UserManagementPage />} />
        <Route path="operations/approvals" element={<OperationsApprovalPage />} />
        <Route path="pass/generation" element={<PassGenerationPage />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? "/" : "/login"} replace />} />
    </Routes>
  );
}
