import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Bookmark,
  Compass,
  Trophy,
  HelpCircle,
  Settings,
  FileText,
  LogOut,
  Award,
  ShieldCheck,
  X,
} from '@/components/Icons';
import { useAuth } from '../contexts/AuthContext';

export interface AccountMenuContentProps {
  onClose: () => void;
  showCloseButton?: boolean;
}

export const AccountMenuContent: React.FC<AccountMenuContentProps> = ({
  onClose,
  showCloseButton = false,
}) => {
  const { user, userProfile, logout } = useAuth();
  const displayName = userProfile?.displayName || user?.displayName || 'Pixel Member';
  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="w-full">
      {/* Header info */}
      <div className="px-3.5 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#0e1b33] dark:text-white truncate">
            {displayName}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {user?.email || 'Guest Builder'}
          </p>
          {user && (
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
              <Award size={13} className="text-sky-500" />
              <span>{userProfile?.pixels ?? 0} Pixels</span>
            </div>
          )}
        </div>
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close profile menu"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Menu Options */}
      <div className="py-1.5 space-y-0.5">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onClose}
            className="flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#DFB76C] bg-[#16171D] hover:bg-[#20222a] border border-[#C5A059]/40 hover:border-[#DFB76C] transition mb-1.5 shadow-xs min-h-[40px] cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck size={15} className="text-[#C5A059] shrink-0" />
              <span>Admin Console</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider bg-[#DFB76C]/20 text-[#DFB76C] px-1.5 py-0.5 rounded font-black">
              Admin
            </span>
          </Link>
        )}
        {/* 1. My Profile */}
        <Link
          to="/profile"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <User size={15} className="text-slate-400 shrink-0" />
          <span>My Profile</span>
        </Link>
        {/* 2. My Applications */}
        <Link
          to="/applications"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <FileText size={15} className="text-slate-400 shrink-0" />
          <span>My Applications</span>
        </Link>
        {/* 3. Settings */}
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <Settings size={15} className="text-slate-400 shrink-0" />
          <span>Settings</span>
        </Link>
        {/* 4. Bookmarks */}
        <Link
          to="/bookmarks"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <Bookmark size={15} className="text-slate-400 shrink-0" />
          <span>Bookmarks</span>
        </Link>
        {/* 5. Explore */}
        <Link
          to="/explore"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <Compass size={15} className="text-sky-500 shrink-0" />
          <span>Explore</span>
        </Link>
        {/* 6. Leaderboard */}
        <Link
          to="/leaderboard"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <Trophy size={15} className="text-amber-500 shrink-0" />
          <span>Leaderboard</span>
        </Link>
        {/* 7. Help & Support */}
        <Link
          to="/support"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
        >
          <HelpCircle size={15} className="text-slate-400 shrink-0" />
          <span>Help & Support</span>
        </Link>
      </div>

      {/* Sign Out / Sign In */}
      <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5 mt-1">
        {user ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer min-h-[40px] active:bg-rose-100/60"
          >
            <LogOut size={15} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            to="/login"
            onClick={onClose}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer min-h-[40px]"
          >
            <LogOut size={15} className="shrink-0 rotate-180" />
            <span>Sign In / Sign Up</span>
          </Link>
        )}
      </div>
    </div>
  );
};
