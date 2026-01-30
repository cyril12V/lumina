import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './lib/api';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import CalendarView from './components/calendar/CalendarView';
import TasksManager from './components/tasks/TasksManager';
import FinanceDashboard from './components/finance/FinanceDashboard';
import EspaceClientDashboard from './components/espace-client/EspaceClientDashboard';
import ProfileSettings from './components/profile/ProfileSettings';
import NotificationsPage from './components/notifications/NotificationsPage';
import ClientPortal from './components/client-portal/ClientPortal';
import JoinTeam from './pages/JoinTeam';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = auth.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Public Route - redirects to dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = auth.isAuthenticated();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route path="/join-team/:token" element={<JoinTeam />} />

        {/* Client portal (public with token) */}
        <Route path="/client/:token" element={<ClientPortal />} />

        {/* Protected dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="tasks" element={<TasksManager />} />
          <Route path="finance" element={<FinanceDashboard />} />
          <Route path="espace-client" element={<EspaceClientDashboard />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
