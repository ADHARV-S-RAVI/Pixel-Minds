import React, { useState, useEffect } from 'react';
import { Tag, Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { validateReferralCode, recordReferralSignup } from '../services/referrals';

export const ReferralOnboardingModal: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;

    // Do not run check while auth is initializing or if user is not signed in
    if (authLoading || !user?.uid) {
      return;
    }

    // Do not interrupt an active OAuth callback URL in progress
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('code') || url.hash.includes('access_token=')) {
        return;
      }
    }

    const checkOnboardingStatus = async () => {
      // 1. Fast check: user metadata or local storage
      const meta = (user as any)?.user_metadata;
      if (meta?.referral_onboarded) {
        return;
      }

      const localKey = `pm_ref_onboarded_${user.uid}`;
      if (localStorage.getItem(localKey) === 'true') {
        return;
      }

      // 2. Database check: check if user already applied a referral
      try {
        const { data: existingRef } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_user_id', user.uid)
          .maybeSingle();

        if (existingRef) {
          // User already has a referral record
          localStorage.setItem(localKey, 'true');
          await supabase.auth.updateUser({ data: { referral_onboarded: true } }).catch(() => {});
          return;
        }
      } catch (err) {
        console.warn('[ReferralOnboardingModal] Check note:', err);
      }

      // 3. User is eligible for referral onboarding popup
      if (mounted) {
        const storedCode =
          sessionStorage.getItem('pm_ref_code') ||
          localStorage.getItem('pm_ref_code') ||
          '';
        if (storedCode) {
          setReferralCode(storedCode.toUpperCase());
        }
        setIsOpen(true);
      }
    };

    checkOnboardingStatus();

    return () => {
      mounted = false;
    };
  }, [user?.uid, authLoading]);

  const markOnboarded = async () => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(`pm_ref_onboarded_${user.uid}`, 'true');
      sessionStorage.removeItem('pm_ref_code');
      localStorage.removeItem('pm_ref_code');
      await supabase.auth.updateUser({ data: { referral_onboarded: true } });
    } catch (err) {
      console.warn('[ReferralOnboardingModal] Mark onboarded note:', err);
    }
  };

  const handleApply = async () => {
    if (!referralCode.trim()) {
      setError('Please enter a referral code or click Skip.');
      return;
    }

    if (!user?.uid) return;

    setError('');
    setSubmitting(true);

    try {
      const cleanCode = referralCode.trim().toUpperCase();

      // Validate
      const validation = await validateReferralCode(cleanCode);
      if (!validation.valid) {
        setError(validation.message || 'Invalid referral code.');
        setSubmitting(false);
        return;
      }

      // Record referral
      const result = await recordReferralSignup(cleanCode, user.uid);
      if (!result.success) {
        setError(result.message || 'Failed to apply referral code.');
        setSubmitting(false);
        return;
      }

      setSuccess(`Referral code applied! Connected with ${validation.referrerName || 'your referrer'}.`);
      await markOnboarded();

      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err: any) {
      setError(err?.message || 'Unable to apply code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await markOnboarded();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0e1b33] border border-sky-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white space-y-5 overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-500/15 blur-3xl" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-xs">
              <Tag size={20} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-sky-400">
                <Sparkles size={11} />
                Welcome Builder
              </span>
              <h3 className="text-lg font-black tracking-tight text-white leading-snug">
                Have a Referral Code?
              </h3>
            </div>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Skip"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed relative z-10">
          Were you invited by a friend, peer, or mentor? Enter their unique referral code below to link your account and award them <span className="font-bold text-sky-400">+25 Pixels</span>.
        </p>

        {/* Input Form */}
        <div className="space-y-3 relative z-10">
          <div className="relative">
            <input
              type="text"
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase());
                setError('');
              }}
              disabled={submitting || Boolean(success)}
              placeholder="e.g. PM-XXXXXX"
              className="w-full px-4 py-3 bg-[#07101f] border border-slate-700 rounded-xl text-sm font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition"
            />
          </div>

          {error && (
            <div className="text-xs p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="text-xs p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting || Boolean(success) || !referralCode.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {submitting ? 'Applying...' : 'Apply Code'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting || Boolean(success)}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center relative z-10">
          This prompt only appears once. You can skip if you don't have an invitation code.
        </p>
      </div>
    </div>
  );
};
