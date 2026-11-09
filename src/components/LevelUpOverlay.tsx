import React from 'react';
import { Sparkles, Trophy, ArrowRight, Rocket, Globe, Gem, Crown, CheckCircle2, X } from 'lucide-react';
import { CelebrationConfetti } from './CelebrationConfetti';

export interface LevelMeta {
  level: number;
  name: string;
  objectName: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const LEVEL_METAS: Record<number, LevelMeta> = {
  1: { level: 1, name: 'Pixel Starter', objectName: 'Cyber Velocity Rocket', icon: Rocket },
  2: { level: 2, name: 'Pixel Scout', objectName: 'Cosmic Ringed Planet', icon: Globe },
  3: { level: 3, name: 'Pixel Contributor', objectName: 'Radiant Cyber Diamond', icon: Gem },
  4: { level: 4, name: 'Pixel Builder', objectName: 'Champions Digital Trophy', icon: Trophy },
  5: { level: 5, name: 'Pixel Master', objectName: 'Imperial Royal Crown', icon: Crown },
  6: { level: 6, name: 'Pixel Legend', objectName: 'Astral Supernova Artifact', icon: Sparkles }
};

interface LevelUpOverlayProps {
  isOpen: boolean;
  prevLevelNumber: number;
  unlockedLevelNumber: number;
  onContinue: () => void;
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({
  isOpen,
  prevLevelNumber,
  unlockedLevelNumber,
  onContinue
}) => {
  if (!isOpen) return null;

  const safePrev = Math.max(1, Math.min(6, prevLevelNumber));
  const safeNext = Math.max(1, Math.min(6, unlockedLevelNumber));

  const prevMeta = LEVEL_METAS[safePrev] || LEVEL_METAS[1];
  const nextMeta = LEVEL_METAS[safeNext] || LEVEL_METAS[2];

  const PrevIcon = prevMeta.icon;
  const NextIcon = nextMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-300">
      {/* Confetti effect */}
      <CelebrationConfetti active={isOpen} />

      {/* Glassmorphism Modal Card */}
      <div
        className="relative w-full max-w-lg rounded-3xl pm-glass-card bg-white/95 dark:bg-slate-900/95 border border-white/90 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-[#0e1b33] dark:text-white overflow-hidden text-center transition-all scale-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        {/* Subtle Radial Glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl" />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={onContinue}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Top Celebration Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/15 via-cyan-400/20 to-purple-500/20 border border-blue-400/40 text-xs font-black text-blue-700 dark:text-sky-300 mb-3 shadow-xs animate-pulse">
          <Sparkles size={13} className="text-blue-500 dark:text-cyan-400" />
          <span>LEVEL UP CELEBRATION</span>
        </div>

        {/* Congratulatory Headline */}
        <h2 id="levelup-title" className="text-2xl sm:text-3xl font-black tracking-tight text-[#0e1b33] dark:text-white">
          Congratulations!
        </h2>
        <p className="mt-1 text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-sky-400 dark:via-cyan-300 dark:to-purple-400">
          You've reached {nextMeta.name}!
        </p>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          You've powered through Level {prevMeta.level} with your verified builder contributions. A brand new unique illustration has been unlocked!
        </p>

        {/* Level Progression Visual Comparison: Prev ➔ Next */}
        <div className="mt-6 grid grid-cols-11 items-center gap-2 p-3 sm:p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
          {/* Previous Level Card */}
          <div className="col-span-5 flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            <div className="h-10 w-10 rounded-xl bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-1.5">
              <PrevIcon size={20} />
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Level {prevMeta.level}</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-full">
              {prevMeta.name}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10} /> 100% Completed
            </span>
          </div>

          {/* Animated Arrow Connector */}
          <div className="col-span-1 flex justify-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-md animate-bounce">
              <ArrowRight size={15} />
            </div>
          </div>

          {/* Newly Unlocked Level Card */}
          <div className="col-span-5 flex flex-col items-center p-3 rounded-xl bg-gradient-to-b from-blue-50/90 to-sky-50/90 dark:from-slate-800/90 dark:to-blue-950/40 border-2 border-blue-400/70 dark:border-cyan-400/60 shadow-xs relative">
            <div className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
              Unlocked
            </div>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 mb-1.5 mt-1">
              <NextIcon size={20} />
            </div>
            <span className="text-[10px] uppercase font-extrabold text-blue-600 dark:text-sky-400">
              Level {nextMeta.level}
            </span>
            <span className="text-xs font-extrabold text-[#0e1b33] dark:text-white truncate max-w-full">
              {nextMeta.name}
            </span>
            <span className="mt-1 text-[10px] font-bold text-blue-700 dark:text-cyan-300 truncate">
              {nextMeta.objectName}
            </span>
          </div>
        </div>

        {/* Subtext info */}
        <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
          The new illustration begins with all blocks unfilled. Continue contributing to illuminate its blocks!
        </p>

        {/* Continue Action Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm tracking-wide shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Continue to Level {nextMeta.level}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
