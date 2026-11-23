import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './ui';
import { Landing, Opportunities, OppDetail, Feed, Profile, Leaderboard, Admin, FAQ, Support } from './pages';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { ReferralOnboardingModal } from './components/ReferralOnboardingModal';
import { PixelClickEffect } from './components/PixelClickEffect';
import { useAuth } from './contexts/AuthContext';
import { safeRedirectUrl } from './utils/text';

// Route Code-Splitting for secondary & heavy pages (GSAP, Auth Forms, Settings, Admin Login)
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(m => ({ default: m.AdminLogin })));
const Applications = lazy(() => import('./pages/Applications').then(m => ({ default: m.Applications })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const SubmitOpportunity = lazy(() => import('./pages/SubmitOpportunity').then(m => ({ default: m.SubmitOpportunity })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const ErrorPage = lazy(() => import('./pages/ErrorPage').then(m => ({ default: m.ErrorPage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));

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
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const pendingRedirect = sessionStorage.getItem('pm_auth_redirect') || localStorage.getItem('pm_auth_redirect');
      if (pendingRedirect) {
        sessionStorage.removeItem('pm_auth_redirect');
        localStorage.removeItem('pm_auth_redirect');
        // Validate redirect target to prevent open redirect vulnerabilities
        const safeTarget = safeRedirectUrl(pendingRedirect, '/');
        navigate(safeTarget, { replace: true });
      }
    }
  }, [user, navigate]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Analytics />
      <ReferralOnboardingModal />
      <PixelClickEffect />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/opportunities/:id" element={<OppDetail />} />
            <Route
              path="/bookmarks"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route path="/feed" element={<Feed />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/support" element={<Support />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* User Protected Routes */}
            <Route
              path="/submit"
              element={
                <ProtectedRoute>
                  <SubmitOpportunity />
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

          {/* Dedicated 404, 500 & Global Fallback Routes outside Layout shell */}
          <Route path="/404" element={<NotFound />} />
          <Route path="/500" element={<ErrorPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
