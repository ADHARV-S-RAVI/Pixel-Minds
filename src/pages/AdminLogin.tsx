import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserProfile } from '../services/users';
import { useAuth } from '../contexts/AuthContext';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      // 2. Fetch and check role from user profile
      const profile = await getUserProfile(data.user.id);
      console.log('[AdminLogin Debug] Profile returned from DB:', profile);

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('User profile record not found in database. Contact system administrator.');
      }

      if (profile.role !== 'admin') {
        console.warn('[AdminLogin Debug] User lacks admin privileges. Role is:', profile.role);
        await supabase.auth.signOut();
        throw new Error('Access denied. Administrator privileges required.');
      }

      if (profile.status === 'suspended') {
        console.warn('[AdminLogin Debug] Admin account suspended');
        await supabase.auth.signOut();
        throw new Error('This administrator account is currently suspended.');
      }

      // 3. Refresh context state
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
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background Sky-Blue Glow Orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-sky-500/15 via-blue-600/10 to-transparent blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl bg-[#11243D]/95 backdrop-blur-2xl border border-sky-500/20 p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(11,22,40,0.6)] text-white relative overflow-hidden">
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <img src="/logo.png" alt="Pixel Minds" className="h-10 w-auto mb-3 object-contain drop-shadow" />
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Admin Control Center
            </h2>
            <p className="mt-1 text-xs text-slate-300 font-medium">
              Sign in with authorized administrator credentials
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="break-words">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
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
                  className="block w-full pl-10 pr-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                  placeholder="admin@pixelminds.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer"
              >
                {loading ? 'Authenticating Admin...' : 'Enter Admin Panel'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <Link to="/" className="text-slate-400 hover:text-white inline-flex items-center gap-1 font-medium transition">
              <ArrowLeft size={13} /> <span>Return to Home</span>
            </Link>
            <span className="text-slate-500 text-[11px]">Protected by Supabase Auth</span>
          </div>
        </div>
      </div>
    </div>
  );
}
