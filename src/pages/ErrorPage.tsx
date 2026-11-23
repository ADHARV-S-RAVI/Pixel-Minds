import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home, ArrowLeft } from '@/components/Icons';

export function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateError = (location.state as { error?: string; message?: string } | null);
  const errorMessage = stateError?.error || stateError?.message || 'An unexpected server error occurred while processing your request.';

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(errorMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 select-none pm-bg-canvas">
      <div className="max-w-md w-full pm-glass-card rounded-[32px] border border-white/80 dark:border-white/10 p-6 sm:p-8 text-center space-y-6 shadow-2xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/80">
        {/* Glow & Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
          <AlertTriangle size={36} className="animate-pulse" />
        </div>

        {/* Heading & Reassurance */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            500 · System Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e1b33] dark:text-white font-['Outfit',sans-serif] tracking-tight">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
            Our servers ran into an issue or the application encountered an unhandled exception. Your session data is completely safe.
          </p>
        </div>

        {/* Collapsible Error Message */}
        <div className="text-left rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <span>Error Description</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="font-mono text-xs text-rose-600 dark:text-rose-400 break-words whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
            {errorMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0e1b33] dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reload Page</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0e1b33] dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <Home size={14} />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
