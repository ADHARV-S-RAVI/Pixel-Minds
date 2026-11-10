import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, LogIn, UserPlus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionText?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  title = 'Join the Community',
  description = 'Sign in or create a free Pixel Minds account to like posts, join discussions, and earn Pixels.',
  actionText = 'interact with community posts'
}) => {
  const location = useLocation();
  const redirectUrl = location.pathname + location.search;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/95 dark:bg-[#11243D]/95 backdrop-blur-2xl border border-blue-500/20 p-6 sm:p-7 shadow-2xl text-[#0e1b33] dark:text-white">
        {/* Glow decoration */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-500/15 blur-2xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow-md shadow-blue-500/20 mb-3.5">
            <Sparkles size={24} />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#0e1b33] dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
            {description}
          </p>
          <div className="mt-2 text-[11px] font-semibold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-800/40">
            Sign in required to {actionText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          <Link
            to={`/login?redirect=${encodeURIComponent(redirectUrl)}&msg=${encodeURIComponent('Please sign in to continue.')}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-md shadow-blue-500/20 transition active:scale-[0.98] cursor-pointer"
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </Link>

          <Link
            to={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold text-[#0e1b33] dark:text-white bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 transition active:scale-[0.98] cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Create Free Account</span>
          </Link>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

