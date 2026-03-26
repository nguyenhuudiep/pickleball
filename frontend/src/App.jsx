import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PublicMembersPage } from './pages/PublicMembersPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { CourtsPage } from './pages/CourtsPage';
import { BookingsPage } from './pages/BookingsPage';
import { FinancialPage } from './pages/FinancialPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentParticipantsPage } from './pages/TournamentParticipantsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PermissionRoute = ({ children, permission }) => {
  const { hasPermission, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  let fallbackPath = '/bookings';
  if (user?.role !== 'member') {
    if (hasPermission('view_dashboard')) fallbackPath = '/dashboard';
    else if (hasPermission('view_bookings')) fallbackPath = '/bookings';
    else if (hasPermission('view_tournaments')) fallbackPath = '/tournaments';
  }

  return hasPermission(permission) ? children : <Navigate to={fallbackPath} />;
};

const DefaultRoute = () => {
  const { isAuthenticated, user, hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user?.role === 'member') {
    return <Navigate to={hasPermission('view_bookings') ? '/bookings' : '/tournaments'} />;
  }

  if (hasPermission('view_dashboard')) return <Navigate to="/dashboard" />;
  if (hasPermission('view_bookings')) return <Navigate to="/bookings" />;
  if (hasPermission('view_tournaments')) return <Navigate to="/tournaments" />;

  return <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/members-public" element={<PublicMembersPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_dashboard">
                  <DashboardPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/members"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_members">
                  <MembersPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courts"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_courts">
                  <CourtsPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_bookings">
                  <BookingsPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_financial">
                  <FinancialPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_reports">
                  <ReportsPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="view_tournaments">
                  <TournamentsPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:id/participants"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="manage_tournaments">
                  <TournamentParticipantsPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="manage_users">
                  <UsersPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<DefaultRoute />} />
          <Route path="*" element={<DefaultRoute />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
