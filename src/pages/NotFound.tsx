import { Link, useNavigate } from 'react-router-dom';
import { Home, Compass, ArrowLeft, AlertCircle } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 select-none">
      <div className="relative max-w-md w-full rounded-3xl pm-glass-card border border-white/80 dark:border-slate-800/80 p-8 text-center shadow-xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 overflow-hidden">
        {/* Soft Background Blur Orb */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-blue-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        {/* 404 Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 grid place-items-center mb-5 text-blue-600 dark:text-sky-400 shadow-xs">
          <AlertCircle size={32} />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-[#0e1b33] dark:text-white tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
          Page Not Found
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          The link you followed may be broken, or the page may have been removed. Let&apos;s get you back on track!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95"
          >
            <Home size={14} />
            <span>Return Home</span>
          </Link>

          <Link
            to="/opportunities"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs font-bold text-blue-600 dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition cursor-pointer active:scale-95"
          >
            <Compass size={14} />
            <span>Explore</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
