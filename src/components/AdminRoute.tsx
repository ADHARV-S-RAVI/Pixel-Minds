import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from '@/components/Icons';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show spinner while initializing auth or while user is authenticated but profile is still loading
  if (loading || (currentUser && userProfile === null)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-sky-500"></div>
      </div>
    );
  }

  // 1. Unauthenticated users are redirected to the dedicated Admin Login portal
  if (!currentUser) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // 2. Handle suspended account (blocks suspended admins)
  if (userProfile?.status === 'suspended' || userProfile?.is_suspended === true) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white border border-rose-200 p-8 rounded-2xl max-w-md text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Account Suspended</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your administrative account has been suspended. Please contact platform administration if you believe this is in error.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Return to Homepage
          </a>
        </div>
      </div>
    );
  }

  // 3. Authenticated non-admin users are denied access and redirected to homepage
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 4. Authenticated admin allowed
  return <>{children}</>;
};
