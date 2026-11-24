import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const EXCLUDED_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/admin/login',
];

export function Footer() {
  const location = useLocation();
  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  // Route exclusions: Auth and Admin consoles where a footer is inappropriate
  const isExcluded =
    EXCLUDED_PATHS.includes(location.pathname) ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/console');

  if (isExcluded) {
    return null;
  }

  const handleFaqClick = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      const el = document.getElementById('faq');
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="mt-auto w-full pt-6 pb-4 lg:pb-6 text-slate-600 dark:text-slate-400">
      <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#07101f]/70 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5 shadow-xs transition-colors">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
          {/* Left: Logo, Name & Tagline */}
          <div className="space-y-1">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Pixel Minds Logo"
                className="h-5 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                Pixel<span className="text-sky-500">Minds</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Discover opportunities. Build your future.
            </p>
          </div>

          {/* Right: Key Utility Navigation Links */}
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <Link
              to="/privacy-policy"
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Terms and Conditions
            </Link>
            <a
              href="mailto:info.pixellminds@gmail.com"
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Help &amp; Support
            </a>
            <Link
              to="/#faq"
              onClick={handleFaqClick}
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              FAQs
            </Link>
          </nav>
        </div>

        {/* Subtle Divider & Bottom Section */}
        <div className="border-t border-slate-200/70 dark:border-slate-800/70 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div>
            &copy; {currentYear} Pixel Minds. All rights reserved.
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            Empowering the next generation of builders
          </div>
        </div>
      </div>
    </footer>
  );
}
