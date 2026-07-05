import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import EventReminders from './components/EventReminders';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import Discussions from './pages/Discussions';
import Events from './pages/Events';
import Profile from './pages/Profile';
import AdminPanel from './pages/AdminPanel';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

/**
 * App Router — Role-gated routes
 *
 *  /             → Public (LandingPage)
 *  /dashboard    → Public (visitors can view map + issues)
 *  /discussions  → Public (visitors can browse discussions)
 *  /events       → Public (visitors can view events)
 *  /report       → Auth required (CITIZEN, OFFICIAL, MODERATOR, ADMIN)
 *  /profile      → Auth required (any logged-in user)
 *  /admin        → ADMIN only
 */
function AppContent() {
  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <Navbar />
      <div className="flex-grow">
        <Routes>
          {/* Public routes — accessible by VISITOR and all roles */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/events" element={<Events />} />

          {/* Protected: must be logged in to report issues */}
          <Route
            path="/report"
            element={
              <ProtectedRoute requireAuth={true}>
                <ReportIssue />
              </ProtectedRoute>
            }
          />

          {/* Protected: must be logged in to view/edit profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute requireAuth={true}>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin/Moderator panel — ADMIN gets full panel, MODERATOR gets moderation-only view */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAuth={true} allowedRoles={['ADMIN', 'MODERATOR']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
      <EventReminders />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
