import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PixelMark } from '../components/PixelMark';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkRecoveryContext = async () => {
      try {
        if (typeof window === 'undefined') return;

        // 1. Inspect URL parameters and Hash fragment for errors
        const searchParams = new URLSearchParams(window.location.search);
        let hashParams = new URLSearchParams();
        if (window.location.hash.startsWith('#')) {
          hashParams = new URLSearchParams(window.location.hash.substring(1));
        }

        const rawError = searchParams.get('error') || hashParams.get('error');
        const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
        const errorDesc = searchParams.get('error_description') || hashParams.get('error_description');

        if (rawError || errorCode || errorDesc) {
          if (mounted) {
            const friendly = errorCode === 'otp_expired'
              ? 'Your password reset link has expired. Please request a new link.'
              : (errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Invalid or expired password reset link.');
            setError(friendly);
            setVerifyingSession(false);
            setHasValidSession(false);
          }
          return;
        }

        // 2. Check for token_hash (used by custom Supabase recovery email templates)
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
        const tokenType = (searchParams.get('type') || hashParams.get('type') || 'recovery') as any;

        if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: tokenType,
          });

          if (verifyError) {
            if (mounted) {
              setError(verifyError.message || 'The reset link could not be verified. It may have expired.');
              setVerifyingSession(false);
              setHasValidSession(false);
            }
            return;
          }
        }

        // 3. Check for PKCE auth code in URL
        const authCode = searchParams.get('code');
        if (authCode) {
          try {
            await supabase.auth.exchangeCodeForSession(authCode);
          } catch (codeErr: any) {
            console.warn('[ResetPassword] Code exchange note:', codeErr?.message);
          }
        }

        // 4. Verify that an active session or recovery session exists
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setHasValidSession(true);
            setError('');
          } else {
            // Check if there is an access token in the hash fragment
            const accessToken = hashParams.get('access_token');
            if (accessToken) {
              setHasValidSession(true);
              setError('');
            } else {
              setHasValidSession(false);
            }
          }
          setVerifyingSession(false);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('[ResetPassword] Error verifying session:', err);
          setError(err?.message || 'Could not verify recovery session.');
          setVerifyingSession(false);
        }
      }
    };

    checkRecoveryContext();

    // Also listen to recovery auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setHasValidSession(true);
        setError('');
        setVerifyingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The recovery link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden max-w-full">
      {/* Background Sky-Blue Glow Orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-sky-500/15 via-blue-600/10 to-transparent blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl bg-[#11243D]/95 backdrop-blur-2xl border border-sky-500/20 p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(11,22,40,0.6)] text-white relative overflow-hidden">
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 mb-3 shadow-xs">
              <PixelMark s={8} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Create new password
            </h2>
            <p className="mt-1.5 text-xs text-slate-300">
              Please enter and confirm your new account password.
            </p>
          </div>

          {verifyingSession ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
              <p className="text-xs text-slate-300 font-medium">Verifying password reset link...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5" role="alert">
                  <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span>{error}</span>
                    <div>
                      <Link
                        to="/forgot-password"
                        className="font-bold underline text-rose-200 hover:text-white inline-block mt-1"
                      >
                        Request a new reset link &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {success ? (
                <div className="space-y-4 text-center">
                  <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-4 rounded-2xl text-xs">
                    <div className="font-bold mb-1 text-emerald-200 flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span>Password Updated Successfully!</span>
                    </div>
                    <p className="text-xs text-emerald-300/90">
                      Your password has been changed. Redirecting to login in 3 seconds...
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="inline-block w-full text-center py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 transition shadow-md shadow-sky-500/20"
                  >
                    Go to Sign in
                  </Link>
                </div>
              ) : !hasValidSession && !error ? (
                <div className="text-center py-4 space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/25 text-amber-200 px-4 py-3.5 rounded-2xl text-xs">
                    <p className="font-semibold mb-1">No active password reset session found.</p>
                    <p className="text-amber-300/80 text-[11px]">
                      Please enter your 6-digit recovery code on the Forgot Password page or request a fresh code below.
                    </p>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-full text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 transition"
                  >
                    <span>Enter 6-Digit Code / Request New Code</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-4 py-2.5 pr-10 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        placeholder="Min. 6 characters"
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

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-4 py-2.5 pr-10 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                        placeholder="Repeat new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-colors"
            >
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
