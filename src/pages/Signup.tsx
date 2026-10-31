import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PixelMark } from '../components/PixelMark';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await signupWithEmail(email, password, name, {
        college: college.trim(),
        course: course.trim(),
        yearOfStudy: yearOfStudy.trim(),
        branch: branch.trim()
      });
      navigate('/');
    } catch (err: any) {
      const msg = err.message || '';
      if (err.code === 'auth/email-already-in-use' || msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists')) {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password' || msg.toLowerCase().includes('password should be at least') || msg.toLowerCase().includes('password is too short')) {
        setError('Password should be at least 6 characters.');
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
      await loginWithGoogle();
      navigate('/');
    } catch {
      setError('Unable to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background Champagne Glow Orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#DFB76C]/10 via-[#C5A059]/5 to-transparent blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="rounded-3xl bg-[#141418]/92 backdrop-blur-2xl border border-white/12 p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] text-white relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#DFB76C]/15 blur-2xl" />

          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 mb-3 shadow-xs">
              <PixelMark s={8} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Create your account
            </h2>
            <p className="mt-1.5 text-xs text-zinc-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#DFB76C] hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
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
                className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Password <span className="text-rose-400">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#DFB76C] mb-3">
                Academic Information
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="college" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    College / University
                  </label>
                  <input
                    id="college"
                    name="college"
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                    placeholder="e.g. Stanford University / IIT Delhi"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="course" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Course / Degree
                    </label>
                    <input
                      id="course"
                      name="course"
                      type="text"
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                      placeholder="e.g. B.Tech / BCA / B.Sc"
                    />
                  </div>

                  <div>
                    <label htmlFor="yearOfStudy" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                      Year of Study
                    </label>
                    <select
                      id="yearOfStudy"
                      name="yearOfStudy"
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="block w-full px-4 py-2.5 bg-zinc-900 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                    >
                      <option value="" className="bg-zinc-900 text-zinc-400">Select Year</option>
                      <option value="1st Year" className="bg-zinc-900 text-white">1st Year</option>
                      <option value="2nd Year" className="bg-zinc-900 text-white">2nd Year</option>
                      <option value="3rd Year" className="bg-zinc-900 text-white">3rd Year</option>
                      <option value="4th Year" className="bg-zinc-900 text-white">4th Year</option>
                      <option value="Postgraduate" className="bg-zinc-900 text-white">Postgraduate</option>
                      <option value="Graduate / Alum" className="bg-zinc-900 text-white">Graduate / Alum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="branch" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Branch / Department
                  </label>
                  <input
                    id="branch"
                    name="branch"
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-white/6 border border-white/12 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] transition-all"
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex justify-center items-center py-3 px-4 rounded-full text-xs font-bold text-zinc-950 bg-gradient-to-r from-[#C5A059] to-[#DFB76C] hover:brightness-105 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(212,175,55,0.3)] cursor-pointer"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#141418] text-zinc-400">or continue with</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-white/12 rounded-full text-xs font-semibold text-white bg-white/6 hover:bg-white/12 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.98]"
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
