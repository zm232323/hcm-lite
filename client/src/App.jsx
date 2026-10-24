import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { Loader } from './components/shared/Loader';

import SetupPage from './features/setup/SetupPage';
import LoginPage from './features/auth/LoginPage';
import ChangePasswordPage from './features/auth/ChangePasswordPage';
import DashboardPage from './features/dashboard/DashboardPage';
import SettingsPage from './features/settings/SettingsPage';
import DepartmentsPage from './features/org/DepartmentsPage';
import DesignationsPage from './features/org/DesignationsPage';
import LeaveTypesPage from './features/org/LeaveTypesPage';
import HolidaysPage from './features/org/HolidaysPage';
import HrUsersPage from './features/users/HrUsersPage';
import AuditPage from './features/audit/AuditPage';
import EmployeesPage from './features/employees/EmployeesPage';
import EmployeeDetailPage from './features/employees/EmployeeDetailPage';
import MyProfilePage from './features/employees/MyProfilePage';
import MyAttendancePage from './features/attendance/MyAttendancePage';
import AttendanceBoardPage from './features/attendance/AttendanceBoardPage';
import AttendanceCorrectionsPage from './features/attendance/AttendanceCorrectionsPage';
import MyLeavesPage from './features/leave/MyLeavesPage';
import LeaveApprovalsPage from './features/leave/LeaveApprovalsPage';
import SalaryStructuresPage from './features/payroll/SalaryStructuresPage';
import PayrollRunsPage from './features/payroll/PayrollRunsPage';
import MyPayslipsPage from './features/payroll/MyPayslipsPage';
import AnnouncementsPage from './features/announcements/AnnouncementsPage';
import NotificationsPage from './features/notifications/NotificationsPage';

import api from './lib/api';

function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'hr')) {
      api.get('/settings').then((r) => setCompanyName(r.data.companyName)).catch(() => {});
    }
  }, [user]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} companyName={companyName} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function SetupGuard() {
  const [initialized, setInitialized] = useState(null);
  useEffect(() => {
    api.get('/setup/status').then((r) => setInitialized(r.data.initialized)).catch(() => setInitialized(true));
  }, []);
  if (initialized === null) return <Loader className="min-h-screen" />;
  if (!initialized) return <Navigate to="/setup" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SetupGuard />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* Protected shell routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell><DashboardPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><SettingsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><DepartmentsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/designations"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><DesignationsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave-types"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><LeaveTypesPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/holidays"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><HolidaysPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><HrUsersPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute roles={['admin']}>
            <AppShell><AuditPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><EmployeesPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/me"
        element={
          <ProtectedRoute roles={['employee']}>
            <AppShell><MyProfilePage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute roles={['admin', 'hr', 'employee']}>
            <AppShell><EmployeeDetailPage /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Attendance & Leave routes */}
      <Route
        path="/attendance/my"
        element={
          <ProtectedRoute roles={['employee']}>
            <AppShell><MyAttendancePage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/board"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><AttendanceBoardPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance/corrections"
        element={
          <ProtectedRoute roles={['admin', 'hr', 'employee']}>
            <AppShell><AttendanceCorrectionsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/my"
        element={
          <ProtectedRoute roles={['employee']}>
            <AppShell><MyLeavesPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/approvals"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><LeaveApprovalsPage /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Payroll routes */}
      <Route
        path="/payroll/salary"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><SalaryStructuresPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/runs"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <AppShell><PayrollRunsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute roles={['admin', 'hr']}>
            <Navigate to="/payroll/runs" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll/my"
        element={
          <ProtectedRoute roles={['employee']}>
            <AppShell><MyPayslipsPage /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Communications */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AppShell><AnnouncementsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppShell><NotificationsPage /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
