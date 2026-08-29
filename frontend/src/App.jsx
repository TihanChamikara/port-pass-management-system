import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './features/authStore';
import { useThemeStore } from './features/themeStore';
import MainLayout from './components/MainLayout';

// MUI Theming
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Lazy load pages
const LoginPage        = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage    = React.lazy(() => import('./pages/DashboardPage'));
const VisitorRequestPage = React.lazy(() => import('./pages/VisitorRequestPage'));
const ExternalVisitorRequestPage = React.lazy(() => import('./pages/ExternalVisitorRequestPage'));
const OpsApprovalPage  = React.lazy(() => import('./pages/OpsApprovalPage'));
const PassIssuingPage  = React.lazy(() => import('./pages/PassIssuingPage'));
const GateControlPage  = React.lazy(() => import('./pages/GateControlPage'));
const GroupPassPage    = React.lazy(() => import('./pages/GroupPassPage'));
const ReportsPage      = React.lazy(() => import('./pages/ReportsPage'));
const AuditLogsPage    = React.lazy(() => import('./pages/AuditLogsPage'));
const PassesPage       = React.lazy(() => import('./pages/PassesPage'));
const DeptManagerPage  = React.lazy(() => import('./pages/DeptManagerPage'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuthStore();
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

function App() {
  const { fetchMe, token } = useAuthStore();
  const { darkMode } = useThemeStore();

  // Keep MUI theme in sync
  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#0ea5e9' },
      background: {
        default: darkMode ? '#0b1120' : '#f1f5f9',
        paper:   darkMode ? '#0f172a' : '#ffffff',
      },
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans','Inter',-apple-system,sans-serif",
    },
  });

  // Apply data-theme attribute to <html> for CSS variable dark overrides
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (token) fetchMe();
  }, [token]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <React.Suspense fallback={<div style={{ padding: 50, textAlign: 'center' }}>Loading application...</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/visitor-request" element={<VisitorRequestPage />} />
          <Route path="/external-visitor-request" element={<ExternalVisitorRequestPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside MainLayout */}
          <Route element={<MainLayout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approve-requests"
              element={
                <ProtectedRoute allowedRoles={['admin', 'operations_officer']}>
                  <OpsApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issue-passes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'pass_officer']}>
                  <PassIssuingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/passes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'pass_officer']}>
                  <PassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gate-control"
              element={
                <ProtectedRoute allowedRoles={['admin', 'security_gate_officer']}>
                  <GateControlPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group-passes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'pass_officer']}>
                  <GroupPassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dept-approvals"
              element={
                <ProtectedRoute allowedRoles={['admin', 'department_manager']}>
                  <DeptManagerPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/visitor-request" />} />
        </Routes>
      </React.Suspense>
    </ThemeProvider>
  );
}

export default App;
