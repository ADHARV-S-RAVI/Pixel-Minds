import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './ui';
import { Landing, Opportunities, OppDetail, Feed, Profile, Leaderboard, Submit, Admin, FAQ, Support } from './pages';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { ReferralOnboardingModal } from './components/ReferralOnboardingModal';
import { useAuth } from './contexts/AuthContext';

// Route Code-Splitting for secondary & heavy pages (GSAP, Auth Forms, Settings, Admin Login)
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));

function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6" role="status" aria-label="Loading page">
      <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const pendingRedirect = sessionStorage.getItem('pm_auth_redirect') || localStorage.getItem('pm_auth_redirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('pm_auth_redirect');
        localStorage.removeItem('pm_auth_redirect');
        navigate(pendingRedirect, { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <ErrorBoundary>
      <Analytics />
      <ReferralOnboardingModal />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OppDetail />} />
            <Route path="/bookmarks" element={<Opportunities />} />
            <Route path="/applications" element={<Profile />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/support" element={<Support />} />
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
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
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
      </Suspense>
    </ErrorBoundary>
  );
}
