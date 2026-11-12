import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkUsernameAvailable, updateUserProfile } from '../services/users';
import { PixelMark } from './PixelMark';

export const UsernameOnboardingModal: React.FC = () => {
  const { user, userProfile, loading: authLoading, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<{
    checking: boolean;
    valid: boolean;
    available: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only prompt when authenticated and profile has completely loaded without a username
    if (authLoading || !user?.uid || !userProfile) {
      setIsOpen(false);
      return;
    }

    // Do not interrupt while OAuth redirect or code exchange is in URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('code') || url.hash.includes('access_token=')) {
        return;
      }
    }

    // If username is already established, do nothing
    if (userProfile.username && userProfile.username.trim()) {
      setIsOpen(false);
      return;
    }

    // Pre-populate suggestion from display name or email if possible
    if (!username) {
      const candidate = (
        userProfile.displayName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        ''
      )
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .slice(0, 16);
      if (candidate.length >= 3) {
        setUsername(candidate);
      }
    }

    setIsOpen(true);
  }, [user?.uid, userProfile, authLoading]);

  // Real-time debounce check for username availability
  useEffect(() => {
    const raw = username.trim().toLowerCase();
    if (!raw) {
      setStatus(null);
      return;
    }

    if (raw.length < 3) {
      setStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Username must be at least 3 characters.'
      });
      return;
    }

    if (raw.length > 20) {
      setStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Username cannot exceed 20 characters.'
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(raw)) {
      setStatus({
        checking: false,
        valid: false,
        available: false,
        message: 'Only letters, numbers, and underscores are allowed.'
      });
      return;
    }

    setStatus({ checking: true, valid: true, available: false, message: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailable(raw, user?.uid);
        setStatus({
          checking: false,
          valid: res.available,
          available: res.available,
          message: res.available ? `@${raw} is available` : (res.error || 'Username already taken.')
        });
      } catch {
        setStatus({
          checking: false,
          valid: false,
          available: false,
          message: 'Error verifying availability.'
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, user?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setError('');

    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) {
      setError('Please choose a username of at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
      setError('Only letters, numbers, and underscores are allowed (3–20 chars).');
      return;
    }

    if (status && !status.available && !status.checking) {
      setError(status.message || 'Please choose an available username.');
      return;
    }

    try {
      setSaving(true);
      // Double check availability before final save
      const check = await checkUsernameAvailable(clean, user.uid);
      if (!check.available) {
        setError(check.error || 'This username was just claimed. Please choose another.');
        return;
      }

      await updateUserProfile(user.uid, { username: clean });
      if (refreshProfile) {
        await refreshProfile();
      }
      setIsOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save username. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-[#11243D]/95 backdrop-blur-2xl border border-sky-500/25 p-7 sm:p-8 text-white shadow-2xl overflow-hidden">
        {/* Glow corner */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-sky-400/15 blur-2xl" />

        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 mb-3 shadow-xs">
            <PixelMark s={8} />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Outfit',sans-serif]">
            Choose Your Username
          </h2>
          <p className="mt-1.5 text-xs text-slate-300 max-w-xs">
            Every Pixel Minds member has a unique username for mentions (<span className="text-sky-400 font-semibold">@username</span>) and community discovery.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-500/15 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="onboarding-username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Unique Handle <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-xs sm:text-sm">@</span>
              <input
                id="onboarding-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''))}
                className={`block w-full pl-8 pr-10 py-2.5 bg-[#0B1628]/80 border ${
                  status
                    ? status.available
                      ? 'border-emerald-500/80 focus:border-emerald-400 focus:ring-emerald-400'
                      : 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-400'
                    : 'border-slate-700/80 focus:border-sky-400 focus:ring-sky-400'
                } rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 transition-all`}
                placeholder="pixel_builder"
                maxLength={20}
              />
              {status?.checking && (
                <div className="absolute right-3 top-3">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400/30 border-t-sky-400" />
                </div>
              )}
              {status && !status.checking && (
                <div className="absolute right-3 top-2.5">
                  {status.available ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-400" />
                  )}
                </div>
              )}
            </div>
            {status && (
              <p className={`mt-1.5 text-[11px] font-medium ${status.available ? 'text-emerald-400' : 'text-rose-400'}`}>
                {status.message}
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              3 to 20 characters. Letters, numbers, and underscores only.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || (status !== null && !status.available)}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer mt-3"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Saving username...</span>
              </>
            ) : (
              <>
                <span>Set Username &amp; Continue</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
