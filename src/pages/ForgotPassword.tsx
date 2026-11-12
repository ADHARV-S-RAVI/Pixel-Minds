import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, RotateCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PixelMark } from '../components/PixelMark';
import { OtpInput } from '../components/OtpInput';

export function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { resetPasswordForEmail, verifyRecoveryOtp, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Step 1: Submit Email for Recovery OTP
  const handleSendRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);
      await resetPasswordForEmail(email.trim());
      setStep('otp');
      setResendCooldown(60);
      setMessage(`If an account is associated with ${email.trim()}, a 6-digit verification code has been sent.`);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('504') || msg.toLowerCase().includes('gateway timeout')) {
        setError('Server timeout dispatching recovery email. Please ensure custom SMTP in Supabase is using port 587 with STARTTLS, or try again.');
      } else if (msg.toLowerCase().includes('user not found') || msg.toLowerCase().includes('no user')) {
        // Generic response to prevent user enumeration
        setStep('otp');
        setResendCooldown(60);
        setMessage(`If an account is associated with ${email.trim()}, a 6-digit verification code has been sent.`);
      } else {
        setError(msg || 'Failed to send password recovery code. Please check your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Recovery OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const token = (codeToVerify || otp).trim();
    if (token.length !== 6) {
      setError('Please enter the full 6-digit recovery code.');
      return;
    }

    try {
      setError('');
      setMessage('');
      setLoading(true);
      await verifyRecoveryOtp(email.trim(), token);
      setStep('new_password');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('expired')) {
        setError('Recovery code has expired. Please click "Resend code" below.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('token')) {
        setError('Invalid 6-digit code. Please check your email and try again.');
      } else {
        setError(msg || 'Failed to verify recovery code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend Recovery OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;

    try {
      setError('');
      setMessage('');
      setResendCooldown(60);
      await resetPasswordForEmail(email.trim());
      setMessage(`A new 6-digit recovery code has been sent to ${email.trim()}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please try again.');
    }
  };

  // Step 3: Set New Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(password);
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Your recovery session may have expired.');
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

            {step === 'email' && (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Reset your password
                </h2>
                <p className="mt-1.5 text-xs text-slate-300 max-w-xs">
                  Enter the email associated with your account and we will send you a 6-digit recovery code.
                </p>
              </>
            )}

            {step === 'otp' && (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Enter recovery code
                </h2>
                <p className="mt-1.5 text-xs text-slate-300 max-w-xs">
                  We sent a 6-digit code to <span className="font-semibold text-sky-400">{email}</span>
                </p>
              </>
            )}

            {step === 'new_password' && (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Create new password
                </h2>
                <p className="mt-1.5 text-xs text-slate-300 max-w-xs">
                  Your code was verified. Please enter your new password below.
                </p>
              </>
            )}

            {step === 'success' && (
              <>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Password updated!
                </h2>
                <p className="mt-1.5 text-xs text-slate-300 max-w-xs">
                  Your password has been changed successfully. You can now sign in with your new credentials.
                </p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs flex items-start gap-2" role="alert">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 'email' && (
            <form className="space-y-4" onSubmit={handleSendRecoveryCode}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    placeholder="you@example.com"
                  />
                  <Mail size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
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
                    <span>Sending code...</span>
                  </>
                ) : (
                  <>
                    <span>Send recovery code</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Enter 6-digit OTP */}
          {step === 'otp' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider text-center">
                  Enter 6-Digit Recovery Code
                </label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (error) setError('');
                  }}
                  onComplete={(completedOtp) => handleVerifyOtp(completedOtp)}
                  disabled={loading}
                  hasError={Boolean(error)}
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Verifying code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Code & Continue</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-700/60 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 font-semibold text-sky-400 hover:text-sky-300 disabled:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <RotateCw size={13} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    setError('');
                    setMessage('');
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Change email</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 'new_password' && (
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <div>
                <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-pass"
                    name="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 pr-10 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-pass" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm-pass"
                    name="confirm-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 pr-10 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    placeholder="Repeat new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

          {/* STEP 4: Success Screen */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-xs text-slate-300">
                You can now log in to Pixel Minds using your new password.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer"
              >
                <span>Go to Sign In</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to sign in</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
