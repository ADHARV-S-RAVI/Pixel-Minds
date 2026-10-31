import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PixelMark } from '../components/PixelMark';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPasswordForEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
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
      setMessage('Password reset link has been sent to your email. Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background Champagne Glow Orb */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#DFB76C]/10 via-[#C5A059]/5 to-transparent blur-3xl -z-10" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl bg-[#141418]/92 backdrop-blur-2xl border border-white/12 p-8 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] text-white relative overflow-hidden">
          {/* Header Brand */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="p-2.5 rounded-2xl bg-white/10 border border-white/15 mb-3 shadow-xs">
              <PixelMark s={8} />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Reset your password
            </h2>
            <p className="mt-1.5 text-xs text-zinc-400 max-w-xs">
              Enter the email associated with your account and we will send you a reset link.
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs" role="alert">
              <div className="font-bold mb-1">Check your email</div>
              <p className="text-xs text-emerald-300/90 leading-relaxed">{message}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Email address
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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 rounded-full text-xs font-bold text-zinc-950 bg-gradient-to-r from-[#C5A059] to-[#DFB76C] hover:brightness-105 active:scale-[0.98] focus:outline-none disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(212,175,55,0.3)] cursor-pointer mt-2"
            >
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#DFB76C] hover:underline transition-colors"
            >
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
