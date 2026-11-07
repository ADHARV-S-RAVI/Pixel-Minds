import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PixelMark } from '../components/PixelMark';
import { validateReferralCode, recordReferralSignup } from '../services/referrals';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Academic details
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [branch, setBranch] = useState('');

  // Referral / Coupon code expandable
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralStatus, setReferralStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
    referrerName?: string;
  } | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { signupWithEmail, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const redirect = searchParams.get('redirect') || (location.state as any)?.from?.pathname || '/';
  const infoMsg = searchParams.get('msg') || ((searchParams.get('redirect') || (location.state as any)?.from) ? 'Please sign up or log in to continue.' : '');

  const handleVerifyReferral = async () => {
    if (!referralCode.trim()) {
      setReferralStatus({
        checked: true,
        valid: false,
        message: 'Please enter a referral code or coupon code.'
      });
      return;
    }

    try {
      setVerifyingCode(true);
      const res = await validateReferralCode(referralCode);
      setReferralStatus({
        checked: true,
        valid: res.valid,
        message: res.message,
        referrerName: res.referrerName
      });
      if (res.valid) {
        const clean = referralCode.trim().toUpperCase();
        localStorage.setItem('pm_ref_code', clean);
        sessionStorage.setItem('pm_ref_code', clean);
      }
    } catch {
      setReferralStatus({
        checked: true,
        valid: false,
        message: 'Unable to verify code. Please try again.'
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // If a referral code was entered but not verified yet, verify it now
    let activeReferral = referralCode.trim().toUpperCase();
    if (activeReferral && (!referralStatus || !referralStatus.checked)) {
      const res = await validateReferralCode(activeReferral);
      if (!res.valid) {
        setError(res.message);
        setReferralStatus({
          checked: true,
          valid: false,
          message: res.message
        });
        return;
      }
      localStorage.setItem('pm_ref_code', activeReferral);
      sessionStorage.setItem('pm_ref_code', activeReferral);
    }

    try {
      setLoading(true);
      await signupWithEmail(email, password, name, {
        college: college.trim(),
        course: course.trim(),
        yearOfStudy: yearOfStudy.trim(),
        branch: branch.trim()
      });

      // If user session was immediately established and referral was verified, record it
      if (user?.id && activeReferral && referralStatus?.valid) {
        try {
          await recordReferralSignup(activeReferral, user.id);
        } catch (refErr) {
          console.warn('[Signup] Referral record note:', refErr);
        }
      }

      navigate(redirect);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        err.code === 'auth/email-already-in-use' ||
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('user already exists')
      ) {
        setError('This email is already registered.');
      } else if (
        err.code === 'auth/weak-password' ||
        msg.toLowerCase().includes('password should be at least') ||
        msg.toLowerCase().includes('password is too short')
      ) {
        setError('Password should be at least 6 characters.');
      } else if (msg.includes('Please check your email to confirm')) {
        setSuccessMsg(msg);
      } else {
        setError(msg || 'Unable to sign up. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      if (redirect && redirect !== '/') {
        sessionStorage.setItem('pm_auth_redirect', redirect);
      }
      if (referralCode.trim()) {
        const clean = referralCode.trim().toUpperCase();
        localStorage.setItem('pm_ref_code', clean);
        sessionStorage.setItem('pm_ref_code', clean);
      }
      await loginWithGoogle();
      navigate(redirect);
    } catch {
      setError('Unable to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background Sky-Blue Glow Orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-sky-500/15 via-blue-600/10 to-transparent blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="rounded-3xl bg-[#11243D]/95 backdrop-blur-2xl border border-sky-500/20 p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(11,22,40,0.6)] text-white relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-sky-400/10 blur-2xl" />

          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 mb-3 shadow-xs">
              <PixelMark s={8} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Create your account
            </h2>
            <p className="mt-1.5 text-xs text-slate-300">
              Already have an account?{' '}
              <Link
                to={redirect !== '/' ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
                className="font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {infoMsg && (
            <div className="mb-5 bg-sky-500/15 border border-sky-500/30 text-sky-200 px-4 py-3 rounded-2xl text-xs flex items-center gap-2" role="status">
              <Info size={16} className="text-sky-400 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              {successMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* 1. Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* 2. Email Address */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Email address <span className="text-rose-400">*</span>
              </label>
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
            </div>

            {/* 3. Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Password <span className="text-rose-400">*</span>
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
                  Confirm Password <span className="text-rose-400">*</span>
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
                    placeholder="Repeat password"
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
            </div>

            {/* Academic Information */}
            <div className="pt-3 border-t border-slate-700/60">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400 mb-3">
                Academic Information
              </p>

              <div className="space-y-4">
                {/* 4. College / University */}
                <div>
                  <label htmlFor="college" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    College / University
                  </label>
                  <input
                    id="college"
                    name="college"
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    placeholder="e.g. Stanford University / IIT Delhi"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 5. Course / Degree */}
                  <div>
                    <label htmlFor="course" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Course / Degree
                    </label>
                    <input
                      id="course"
                      name="course"
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                      placeholder="e.g. B.Tech / BCA / B.Sc"
                    />
                  </div>

                  {/* 6. Current Year (Year of Study) */}
                  <div>
                    <label htmlFor="yearOfStudy" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                      Current Year
                    </label>
                    <select
                      id="yearOfStudy"
                      name="yearOfStudy"
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-[#0B1628] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    >
                      <option value="" className="bg-[#0B1628] text-slate-400">Select Year</option>
                      <option value="1st Year" className="bg-[#0B1628] text-white">1st Year</option>
                      <option value="2nd Year" className="bg-[#0B1628] text-white">2nd Year</option>
                      <option value="3rd Year" className="bg-[#0B1628] text-white">3rd Year</option>
                      <option value="4th Year" className="bg-[#0B1628] text-white">4th Year</option>
                      <option value="Postgraduate" className="bg-[#0B1628] text-white">Postgraduate</option>
                      <option value="Graduate / Alum" className="bg-[#0B1628] text-white">Graduate / Alum</option>
                    </select>
                  </div>
                </div>

                {/* 7. Branch / Department */}
                <div>
                  <label htmlFor="branch" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Branch / Department
                  </label>
                  <input
                    id="branch"
                    name="branch"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#0B1628]/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>
            </div>

            {/* Expandable Coupon Code / Referral Code Section */}
            <div className="pt-3 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setShowReferralInput(!showReferralInput)}
                className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-300 hover:text-sky-300 transition-colors py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Tag size={14} className="text-sky-400" />
                  Have a Coupon Code or Referral Code?
                </span>
                {showReferralInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showReferralInput && (
                <div className="mt-3 space-y-2 p-3.5 rounded-2xl bg-[#0B1628]/50 border border-slate-700/70">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase());
                        setReferralStatus(null);
                      }}
                      placeholder="e.g. PM-XXXXXX"
                      className="flex-1 px-3.5 py-2 bg-[#0B1628] border border-slate-700 rounded-xl text-xs font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyReferral}
                      disabled={verifyingCode || !referralCode.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition cursor-pointer shrink-0"
                    >
                      {verifyingCode ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {referralStatus && (
                    <div
                      className={`text-xs p-2.5 rounded-xl flex items-start gap-2 ${
                        referralStatus.valid
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border border-rose-500/25 text-rose-300'
                      }`}
                    >
                      {referralStatus.valid ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{referralStatus.message}</span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Referral codes reward your friend with Pixels when you join. Promotional coupon codes will be enabled in upcoming releases.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex justify-center items-center gap-2 py-3 px-4 rounded-full text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(14,165,233,0.3)] cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/60" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#11243D] text-slate-400">or continue with</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-700/80 rounded-full text-xs font-semibold text-white bg-[#0B1628]/60 hover:bg-[#0B1628] disabled:opacity-50 transition-all cursor-pointer active:scale-[0.98]"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
