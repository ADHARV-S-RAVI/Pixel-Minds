import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
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

  // 2. Authenticated non-admin users are denied access and redirected to homepage
  if (userProfile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 3. Authenticated admin allowed
  return <>{children}</>;
};
