import { useState, useEffect, useRef, useMemo } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  Share2,
  Eye,
  UserPlus,
  Zap,
  ArrowRight,
  ArrowDown,
  Crown,
  RotateCcw,
  Sparkles,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  History,
  FileText,
  Award,
  Flame,
  Users,
  Rocket,
  Copy,
  Check
} from 'lucide-react';
import { Avatar } from './ui';
import { PixelMark } from './components/PixelMark';
import { tierInfo, rankOf, tiers } from './data';
import { PixelProgressIllustration } from './components/PixelProgressIllustration';
import { LevelUpOverlay } from './components/LevelUpOverlay';
import { getLeaderboardUsers, getUserGlobalRank, type LeaderboardUserEntry } from './services/users';
import { useAuth } from './contexts/AuthContext';
import { useApp } from './store';
import { getUserReferrals } from './services/referrals';
import type { Referral } from './types';

function useCount(t: number, ms = 1100) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const s = from.current,
      st = performance.now();
    let r = 0;
    const f = (n: number) => {
      const p = Math.min(1, (n - st) / ms);
      setV(Math.round(s + (t - s) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) r = requestAnimationFrame(f);
      else from.current = t;
    };
    r = requestAnimationFrame(f);
    return () => cancelAnimationFrame(r);
  }, [t, ms]);
  return v;
}

export const Count: FC<{ n: number; pre?: string }> = ({ n, pre = '' }) => {
  const v = useCount(n);
  return (
    <>
      {pre}
      {v.toLocaleString('en-IN')}
    </>
  );
};

export const Bar: FC<{ pct: number; on: boolean }> = ({ pct, on }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300/40 dark:border-slate-600/40 relative">
    <div
      style={{ width: on ? `${Math.min(100, Math.max(0, pct))}%` : '0%' }}
      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 transition-[width] duration-1000 ease-out shadow-[0_0_10px_rgba(56,189,248,0.4)]"
    />
  </div>
);

export function PixelGrid({ pct }: { pct: number }) {
  return (
    <PixelProgressIllustration
      pct={pct}
      levelName="Pixel Progression"
      levelNumber={1}
    />
  );
}

const steps: [any, string, string][] = [
  [Share2, '1. Share Opportunity', 'Send your unique link to peers'],
  [Eye, '2. Friend Visits', 'They explore the opportunity details'],
  [UserPlus, '3. Friend Joins', 'They create a Pixel Minds account'],
  [Zap, '4. +25 Pixels Earned', 'Instantly credited to your balance']
];

export function ReferralPanel() {
  const { user, userProfile } = useAuth();
  const { copy } = useApp();
  const [copied, setCopied] = useState(false);
  const [k, setK] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const myReferralCode = userProfile?.referralId || '';
  const myReferralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${myReferralCode}`
    : `https://pixelminds.org/signup?ref=${myReferralCode}`;

  const handleCopyLink = () => {
    if (!myReferralLink) return;
    copy(myReferralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchReferrals = async () => {
      if (!user?.uid) {
        setReferrals([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getUserReferrals(user.uid);
        if (isMounted) setReferrals(data);
      } catch (err) {
        console.error('Failed to load user referrals:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReferrals();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, k]);

  const friendsReferred = referrals.length;
  const joinedCount = referrals.filter((r) => r.status === 'completed').length;
  const pixelsEarned = referrals
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + (r.pixelsRewarded || 25), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Friends Referred', friendsReferred, ''],
          ['Successful Joined', joinedCount, ''],
          ['Pixels Earned', pixelsEarned, '+']
        ].map(([l, v, p]) => (
          <div key={l as string} className="rounded-2xl pm-glass-card bg-white/80 backdrop-blur-xl border border-white/90 p-4 text-center shadow-xs text-[#0e1b33]">
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-500 sm:text-3xl">
              <Count n={v as number} pre={p as string} />
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{l}</p>
          </div>
        ))}
      </div>

      {/* Your Unique Referral Code & Link Card */}
      {myReferralCode && (
        <div className="rounded-3xl pm-glass-card bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-white/90 backdrop-blur-xl border border-blue-200/80 p-5 sm:p-6 shadow-sm text-[#0e1b33]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Sparkles size={14} />
                <span>Your Unique Referral Link</span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Share this link or your code <b className="font-mono text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded-md">{myReferralCode}</b> with friends. Earn <span className="font-bold text-amber-600">+25 Pixels</span> when they sign up!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs font-bold border border-blue-200">
                +25 Pixels / Signup
              </span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <input
              readOnly
              value={myReferralLink}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-xl border border-blue-200/90 bg-white/95 px-3.5 py-2 text-xs font-mono text-[#0e1b33] outline-none select-all shadow-2xs"
            />
            <button
              onClick={handleCopyLink}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition shadow-sm active:scale-95 cursor-pointer ${
                copied ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 p-5 sm:p-6 shadow-sm text-[#0e1b33]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#0e1b33] text-sm sm:text-base">Your Referral Journey</h3>
            <p className="text-xs text-slate-500 mt-0.5">How you earn Pixels by inviting friends</p>
          </div>
          <button
            onClick={() => setK(k + 1)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Replay</span>
          </button>
        </div>

        <ol className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {steps.map(([I, t, d], i) => (
            <li key={k + '-' + i} className="flex flex-col items-center gap-2 sm:flex-1 sm:flex-row">
              <div
                style={{ animationDelay: `${i * 350}ms` }}
                className={`pm-in w-full flex-1 rounded-2xl border p-3.5 transition ${
                  i === 3
                    ? 'border-blue-400/60 bg-blue-50/80 text-blue-950 shadow-xs'
                    : 'border-slate-200/70 bg-white/80'
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl ${
                    i === 3 ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-100 text-blue-700 border border-blue-200/60'
                  }`}
                >
                  <I size={16} />
                </span>
                <p className="mt-2 text-xs font-bold text-[#0e1b33]">{t}</p>
                <p className={`text-[11px] mt-0.5 ${i === 3 ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}>{d}</p>
              </div>
              {i < 3 && (
                <span style={{ animationDelay: `${i * 350 + 200}ms` }} className="pm-in text-blue-500">
                  <ArrowRight size={16} className="hidden sm:block" />
                  <ArrowDown size={16} className="sm:hidden" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm overflow-hidden text-[#0e1b33]">
        <div className="border-b border-slate-200/70 p-4 font-bold text-sm text-[#0e1b33]">
          Recent Referral Activity
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading referral activity...</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-xs text-slate-700">No referrals yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Share opportunities using your referral link to earn +25 Pixels when your friends sign up.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {referrals.map((refItem, i) => {
              const displayName = refItem.referredUserName || 'Member';
              const dateStr = new Date(refItem.createdAt).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric'
              });
              const isCompleted = refItem.status === 'completed';

              return (
                <li
                  key={refItem.id || i}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="pm-in flex items-center gap-3 p-4 hover:bg-blue-50/40 transition"
                >
                  <Avatar name={displayName} photoURL={refItem.referredUserAvatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#0e1b33]">
                      {refItem.opportunityTitle || 'Pixel Minds Invitation'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {displayName} · {dateStr}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-extrabold ${isCompleted ? 'text-blue-600' : 'text-slate-400'}`}>
                      +{refItem.pixelsRewarded || 25} Pixels
                    </p>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {refItem.status || 'Completed'}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Leaderboard() {
  const { userProfile, user } = useAuth();
  const [on, setOn] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUserEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setOn(true), 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLeaderboardUsers(20)
      .then((res) => {
        if (mounted) {
          setLeaderboardUsers(res.users);
          setTotalCount(res.totalCount);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load leaderboard users:', err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (user?.uid) {
      getUserGlobalRank(user.uid)
        .then((res) => {
          if (mounted) setMyRank(res.rank);
        })
        .catch(() => {});
    } else {
      setMyRank(null);
    }
    return () => {
      mounted = false;
    };
  }, [user?.uid, userProfile?.pixels]);

  // Level-Up Celebration Modal State
  const storageKey = `pm_level_celebrated_${user?.uid || 'guest'}`;
  const [celebrationModal, setCelebrationModal] = useState<{
    isOpen: boolean;
    prevLevel: number;
    unlockedLevel: number;
  }>({
    isOpen: false,
    prevLevel: 1,
    unlockedLevel: 2
  });

  // Track if holding previous completed level in view before clicking continue
  const [pendingLevelUp, setPendingLevelUp] = useState<{
    prevLevel: number;
    unlockedLevel: number;
  } | null>(null);

  const mine = userProfile?.pixels ?? 0;
  const ti = tierInfo(mine);

  // Auto-detect real level upgrade & trigger celebration only once per level
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        // Initialize with user's current level so existing levels aren't spammed
        localStorage.setItem(storageKey, ti.level.toString());
        return;
      }

      const lastCelebrated = parseInt(stored, 10);
      if (ti.level > lastCelebrated) {
        // User has upgraded to a new level!
        setPendingLevelUp({
          prevLevel: ti.level - 1,
          unlockedLevel: ti.level
        });
        setCelebrationModal({
          isOpen: true,
          prevLevel: ti.level - 1,
          unlockedLevel: ti.level
        });
      }
    } catch {
      // Handle restricted environments gracefully
    }
  }, [ti.level, storageKey]);

  // When holding pending level-up, show previous completed tier at 100% with final glowing animation
  const effectiveTier = useMemo(() => {
    if (pendingLevelUp) {
      const prevLvl = pendingLevelUp.prevLevel;
      const prevIdx = Math.max(0, prevLvl - 1);
      const prevMin = tiers[prevIdx][0];
      const prevNext = tiers[prevIdx + 1] ? tiers[prevIdx + 1][0] : 10000;
      return {
        name: tiers[prevIdx][1],
        level: prevLvl,
        maxLevel: tiers.length,
        minPixels: prevMin,
        nextPixels: prevNext,
        next: tiers[prevIdx + 1] ? tiers[prevIdx + 1][1] : null,
        toGo: 0,
        pct: 100, // Completed at 100% with final glowing animation!
        isMaxLevel: false
      };
    }
    return ti;
  }, [pendingLevelUp, ti]);

  const displayedPixels = useMemo(() => {
    if (pendingLevelUp) {
      const prevIdx = Math.max(0, pendingLevelUp.prevLevel - 1);
      return tiers[prevIdx + 1] ? tiers[prevIdx + 1][0] : 10000;
    }
    return mine;
  }, [pendingLevelUp, mine]);

  const handleContinueLevelUp = () => {
    try {
      localStorage.setItem(storageKey, ti.level.toString());
    } catch {}
    setPendingLevelUp(null);
    setCelebrationModal((prev) => ({ ...prev, isOpen: false }));
  };

  const remainingCount = Math.max(0, totalCount - leaderboardUsers.length);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0e1b33]">
          Community Leaderboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Discover opportunities, refer peers, earn Pixels, and climb the verified builder leaderboard.
        </p>
      </div>

      {/* User Pixel Balance Card */}
      <div className="relative overflow-hidden rounded-3xl pm-glass-card bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/90 dark:border-white/10 p-6 sm:p-8 shadow-sm text-[#0e1b33] dark:text-white transition-all">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                bottom: `${(i * 13) % 30}%`,
                width: 6 + (i % 3) * 3,
                height: 6 + (i % 3) * 3,
                animationDelay: `${i * 0.45}s`
              }}
              className="pm-float absolute rounded-xs bg-blue-400/20 shadow-[0_0_6px_rgba(56,189,248,0.3)]"
            />
          ))}
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-12 items-center">
          {/* Left Column: Progress Info, Metrics & Thin Progress Bar */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
            <div>
              {/* Header Label and Global Rank */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                  <PixelMark s={6} />
                  <span>Pixel Progression</span>
                </p>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100/90 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800/80 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                    {myRank ? `Rank #${myRank}` : (user ? 'Unranked' : 'Sign in to view rank')}
                  </span>
                </div>
              </div>

              {/* Current Pixel Balance */}
              <div className="relative mt-2 flex items-baseline gap-3">
                <p className="text-5xl font-black tracking-tight text-[#0e1b33] dark:text-white sm:text-6xl">
                  <Count n={displayedPixels} />
                </p>
                <span className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">Pixels</span>
              </div>
            </div>

            {/* Level & Progression Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400">
                    <Rocket size={13} className="text-blue-500" />
                    <span>Level {effectiveTier.level} of {effectiveTier.maxLevel}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0e1b33] dark:text-white tracking-tight mt-0.5">
                    {effectiveTier.name}
                  </h3>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    {effectiveTier.isMaxLevel ? 'Status' : 'Target'}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {effectiveTier.isMaxLevel ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center sm:justify-end gap-1 font-extrabold">
                        <Trophy size={13} /> Peak Rank Achieved
                      </span>
                    ) : (
                      `Level ${effectiveTier.level + 1}: ${effectiveTier.next}`
                    )}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Details */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-blue-500" />
                    <span>Progress to Next Rank</span>
                  </span>
                  <span className="text-blue-600 dark:text-sky-400 font-extrabold">
                    {effectiveTier.pct}%
                  </span>
                </div>

                {/* Thin Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60 border border-slate-300/40 dark:border-slate-600/40 relative">
                  <div
                    style={{ width: on ? `${effectiveTier.pct}%` : '0%' }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{effectiveTier.minPixels.toLocaleString('en-IN')} Pixels</span>
                  <span>
                    {effectiveTier.isMaxLevel
                      ? '0 Pixels remaining · Maximum Level'
                      : `${effectiveTier.toGo.toLocaleString('en-IN')} Pixels to Level ${effectiveTier.level + 1}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Achievement / Max Level State or Milestone Tips */}
            {effectiveTier.isMaxLevel ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 border border-amber-300/60 dark:border-amber-500/30 flex items-start gap-3.5 shadow-2xs">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Crown size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Maximum-Level Achievement State</span>
                    <Trophy size={13} className="text-amber-600" />
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    You have unlocked the highest tier in the community! All illustration blocks are fully illuminated with maximum cosmic energy and permanent leaderboard prestige.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-500">Earn Pixels:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11px] font-bold text-[#0e1b33] dark:text-slate-200">
                  <Zap size={11} className="text-blue-500" /> +25 Invite Peer
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-[11px] font-bold text-[#0e1b33] dark:text-slate-200">
                  <Sparkles size={11} className="text-indigo-500" /> +50 Share Opportunity
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Unique Pixel-Art Illustration */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <PixelProgressIllustration
              pct={effectiveTier.pct}
              levelName={effectiveTier.name}
              levelNumber={effectiveTier.level}
              isMaxLevel={effectiveTier.isMaxLevel}
              nextLevelName={effectiveTier.next}
              pixelsToGo={effectiveTier.toGo}
            />
          </div>
        </div>
      </div>

      {/* Level-Up Celebration Overlay */}
      <LevelUpOverlay
        isOpen={celebrationModal.isOpen}
        prevLevelNumber={celebrationModal.prevLevel}
        unlockedLevelNumber={celebrationModal.unlockedLevel}
        onContinue={handleContinueLevelUp}
      />

      {/* Leaderboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#0e1b33] flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            <span>Top 20 Builders</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Rankings based on total verified Pixels earned</p>
        </div>
      </div>

      {/* Leaderboard List: Top 20 Scrollable Area */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/60 animate-pulse border border-white/80" />
          ))}
        </div>
      ) : leaderboardUsers.length > 0 ? (
        <div className="space-y-3">
          <div className="max-h-[580px] sm:max-h-[640px] overflow-y-auto pr-1.5 space-y-2.5 rounded-2xl pm-scrollbar">
            <ul className="space-y-2.5">
              {leaderboardUsers.map((u, i) => {
                const me = Boolean(user?.uid && u.id === user.uid);
                const effectivePixels = me ? (userProfile?.pixels ?? u.pixels) : u.pixels;
                const ui = tierInfo(effectivePixels);
                const top = i < 3;
                return (
                  <li
                    key={u.id || u.rank}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`pm-in flex items-center gap-3 rounded-2xl p-3.5 sm:gap-4 sm:p-4 transition pm-glass-card ${
                      me
                        ? 'bg-gradient-to-r from-blue-50/95 via-sky-50/80 to-white/95 border-2 border-blue-400/60 text-[#0e1b33] shadow-md ring-1 ring-blue-400/20'
                        : top
                        ? 'bg-white/90 border border-blue-200/80 text-[#0e1b33] shadow-xs hover:border-blue-300'
                        : 'bg-white/75 border border-white/90 text-[#0e1b33] shadow-2xs hover:border-blue-200'
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${
                        i === 0 
                          ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-xs' 
                          : i === 1
                          ? 'bg-slate-200 text-slate-800 border border-slate-300'
                          : i === 2
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {i === 0 ? <Crown size={17} /> : u.rank}
                    </span>

                    <Avatar name={u.name} photoURL={u.avatarUrl} size={top ? 42 : 36} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <p className="truncate text-xs sm:text-sm font-bold text-[#0e1b33]">
                          {u.name}
                          {me && (
                            <span className="ml-2 rounded-md bg-blue-600 text-white px-1.5 py-0.5 text-[10px] font-extrabold shadow-2xs">
                              YOU
                            </span>
                          )}
                        </p>
                        <span className="hidden sm:inline">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200/80 text-slate-600">
                            {rankOf(effectivePixels)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 max-w-xs">
                        <Bar pct={ui.pct} on={on} />
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-blue-600">
                        <Count n={effectivePixels} />
                      </p>
                      <div className="text-[10px] font-semibold text-slate-400">
                        Pixels
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Users beyond top 20 footer */}
          {remainingCount > 0 && (
            <div className="p-3.5 rounded-2xl pm-glass-card bg-white/70 border border-white/90 text-center shadow-xs">
              <p className="text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>+ {remainingCount} more builders on the global leaderboard</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl pm-glass-card bg-white/80 p-8 text-center text-slate-500 border border-white/90">
          <Trophy size={32} className="mx-auto text-blue-500/60 mb-2" />
          <p className="font-bold text-sm text-[#0e1b33]">No members on the leaderboard yet</p>
          <p className="text-xs mt-1">Share opportunities, refer friends, and participate to claim the #1 spot!</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* EXPLANATION SECTION: How to Earn Pixels */}
      {/* ============================================================ */}
      <section className="rounded-[28px] pm-glass-card bg-white/85 backdrop-blur-2xl border border-white/90 p-6 sm:p-8 shadow-sm text-[#0e1b33] space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-700 shadow-2xs mb-2">
              <Sparkles size={13} className="text-blue-600" />
              <span>Platform Rewards &amp; Reputation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#0e1b33] tracking-tight">
              How to Earn Pixels
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Pixels are reward points recognizing authentic contributions to the Pixel Minds student and developer community.
              Earn Pixels to level up your Builder Tier, earn exclusive platform badges, and climb the global rankings.
            </p>
          </div>

          <Link
            to="/profile?tab=Pixel+History"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-3.5 py-2 rounded-xl border border-blue-200/60 transition shadow-2xs"
          >
            <History size={14} />
            <span>View Transaction History</span>
          </Link>
        </div>

        {/* 7 Core Reward Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {/* Action 1 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                <Award size={16} />
              </span>
              <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                +50 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Approved Opportunity</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded once your submitted hackathon or competition is verified and published by our moderators.
            </p>
          </div>

          {/* Action 2 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                <UserPlus size={16} />
              </span>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/60">
                +25 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Refer a Friend</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded when an invited friend or classmate successfully registers on Pixel Minds using your referral code.
            </p>
          </div>

          {/* Action 3 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700 font-bold">
                <FileText size={16} />
              </span>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                +20 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Submit Opportunity</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded immediately when you submit a new tech event, hackathon, or internship for verification.
            </p>
          </div>

          {/* Action 4 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                <ShieldCheck size={16} />
              </span>
              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                +15 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Helpful Report</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded for reporting expired, duplicate, or broken opportunities to help keep community data accurate.
            </p>
          </div>

          {/* Action 5 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-100 text-sky-700 font-bold">
                <Share2 size={16} />
              </span>
              <span className="text-xs font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200/60">
                +10 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Share Opportunity</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded when you share opportunities or competition links with your peers and study groups.
            </p>
          </div>

          {/* Action 6 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-100 text-purple-700 font-bold">
                <CheckCircle2 size={16} />
              </span>
              <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/60">
                +10 Pixels
              </span>
            </div>
            <h3 className="text-xs font-bold text-[#0e1b33]">Profile Completion</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Awarded for completing your academic details including College, Course, Branch, and Bio.
            </p>
          </div>

          {/* Action 7 */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 shadow-xs space-y-2 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700 font-bold">
                  <Flame size={16} />
                </span>
                <div>
                  <h3 className="text-xs font-bold text-[#0e1b33]">Daily Activity Streak</h3>
                  <p className="text-[11px] text-slate-500">Log in and engage with competitions daily</p>
                </div>
              </div>
              <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/60">
                +5 Pixels / day
              </span>
            </div>
          </div>
        </div>

        {/* Verification & Transparency Rules */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-[#0e1b33] flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Fair Play &amp; Verification Rules</span>
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 leading-relaxed pl-1">
            <li>Self-referrals and duplicate accounts are strictly prohibited and automatically detected.</li>
            <li>Referral bonuses require the referred member to complete email verification or OAuth registration.</li>
            <li>All earned Pixels are recorded in an immutable ledger under <b>My Profile &rarr; Pixel History</b>.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
