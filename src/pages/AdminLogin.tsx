import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserProfile } from '../services/users';
import { useAuth } from '../contexts/AuthContext';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      console.log('[AdminLogin Debug] Initiating Supabase Auth signInWithPassword for:', cleanEmail);

      // 1. Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (authError) {
        console.error('[AdminLogin Debug] Supabase Auth Error:', {
          message: authError.message,
          status: authError.status,
          name: authError.name
        });

        const msg = authError.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email not confirmed. In Supabase Dashboard -> Auth -> Users, please confirm the email or disable email confirmations in Auth settings.');
        } else if (msg.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid administrator email or password.');
        } else {
          throw new Error(msg || 'Authentication failed. Please verify your Supabase Auth configuration.');
        }
      }

      if (!data.user) {
        throw new Error('No user data returned from Supabase Auth.');
      }

      console.log('[AdminLogin Debug] Supabase Auth Success:', {
        userId: data.user.id,
        email: data.user.email,
        sessionActive: !!data.session
      });

      // 2. Fetch and verify admin role
      const profile = await getUserProfile(data.user.id);
      console.log('[AdminLogin Debug] User Profile Result:', {
        userId: data.user.id,
        profileFound: !!profile,
        role: profile?.role,
        isSuspended: profile?.status === 'suspended'
      });

      if (!profile) {
        // Sign out user since profile is missing
        await supabase.auth.signOut();
        throw new Error(`Profile record not found for user ID "${data.user.id}" in public.profiles. Please check public.profiles table in Supabase.`);
      }

      if (profile.role !== 'admin') {
        // Immediately sign out non-admin user trying to access admin portal
        await supabase.auth.signOut();
        throw new Error(`Access denied. Account role is "${profile.role}", but "admin" is required for Admin Control Center.`);
      }

      if (profile.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('This administrator account is currently suspended.');
      }

      // 3. Refresh context and redirect to Admin Control Center
      await refreshProfile();
      console.log('[AdminLogin Debug] Admin verified successfully. Navigating to:', from);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('[AdminLogin Debug] Caught Error:', err.message);
      setError(err.message || 'Unable to sign in to admin portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-sky-500/10 text-sky-600 rounded-2xl flex items-center justify-center border border-sky-200/80 shadow-xs">
            <Shield size={24} className="stroke-[2.2]" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold text-slate-900 tracking-tight">
          Admin Control Center
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Sign in with authorized administrator credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="break-words">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow bg-white"
                  placeholder="admin@pixelminds.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow bg-white"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {loading ? 'Authenticating Admin...' : 'Enter Admin Panel'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/" className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 font-medium transition">
              <ArrowLeft size={13} /> Return to Home
            </Link>
            <span className="text-slate-400 text-[11px]">Protected by Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
