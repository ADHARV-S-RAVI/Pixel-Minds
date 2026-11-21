import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './ui';
import { Landing, Opportunities, OppDetail, Feed, Profile, Leaderboard, Admin, FAQ, Support, Explore, Applications } from './pages';
import { SubmitOpportunity } from './pages/SubmitOpportunity';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AdminLogin } from './pages/AdminLogin';
import { NotFound } from './pages/NotFound';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Terms } from './pages/Terms';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { ReferralOnboardingModal } from './components/ReferralOnboardingModal';
import { PixelClickEffect } from './components/PixelClickEffect';
import { useAuth } from './contexts/AuthContext';
import { safeRedirectUrl } from './utils/text';

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
        const safeTarget = safeRedirectUrl(pendingRedirect);
        if (safeTarget !== '/') {
          navigate(safeTarget, { replace: true });
        }
      }
    }
  }, [user, navigate]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Analytics />
      <ReferralOnboardingModal />
      <PixelClickEffect />
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

        {/* Dedicated 404 & Global Fallback Routes outside Layout shell */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
