import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './ui';
import { Landing, Opportunities, OppDetail, Feed, Profile, Leaderboard, Submit, Admin } from './pages';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AdminLogin } from './pages/AdminLogin';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const pendingRedirect = sessionStorage.getItem('pm_auth_redirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('pm_auth_redirect');
        navigate(pendingRedirect, { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/opportunities/:id" element={<OppDetail />} />
          <Route path="/bookmarks" element={<Opportunities />} />
          <Route path="/applications" element={<Profile />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* User Protected Routes */}
          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <Submit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={<Profile />}
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route
            path="/console"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
