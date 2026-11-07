import { useState, useEffect, useRef, useMemo } from 'react';
import type { FC } from 'react';
import {
  Share2,
  Eye,
  UserPlus,
  Zap,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Minus,
  Crown,
  RotateCcw,
  Sparkles,
  Trophy
} from 'lucide-react';
import { Avatar } from './ui';
import { PixelMark } from './components/PixelMark';
import { tierInfo, rankOf } from './data';
import { getLeaderboardUsers, type LeaderboardUserEntry } from './services/users';
import { useAuth } from './contexts/AuthContext';
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

const evts: [number, string][] = [
  [50, 'Shared Smart India Hackathon'],
  [25, 'Friend joined via your link'],
  [10, 'Posted in community feed'],
  [50, 'Opportunity verified & approved'],
  [25, 'Referral milestone reached'],
  [15, '7-day active streak bonus']
];

const Bar: FC<{ pct: number; on: boolean }> = ({ pct, on }) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
    <div
      style={{ width: on ? pct + '%' : '0%' }}
      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 transition-[width] duration-1000 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)]"
    />
  </div>
);

const Delta: FC<{ d: number }> = ({ d }) =>
  d === 0 ? (
    <span className="flex items-center text-xs font-semibold text-slate-400">
      <Minus size={12} />
    </span>
  ) : (
    <span className={`flex items-center text-xs font-bold ${d > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {d > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {Math.abs(d)}
    </span>
  );

export function PixelGrid({ pct }: { pct: number }) {
  const lit = Math.round((pct / 100) * 80);
  const [h, setH] = useState<string>('');
  return (
    <div>
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2" onMouseLeave={() => setH('')}>
        {Array.from({ length: 80 }, (_, i) => {
          const [p, e] = evts[i % 6];
          const on = i < lit;
          return (
            <button
              key={i}
              aria-label={on ? `+${p} Pixels · ${e}` : 'Locked Pixel'}
              onMouseEnter={() => setH(on ? `+${p} Pixels · ${e}` : 'Keep contributing to illuminate this Pixel')}
              onFocus={() => setH(on ? `+${p} Pixels · ${e}` : 'Locked Pixel')}
              style={on ? { animationDelay: `${i * 20}ms` } : undefined}
              className={`aspect-square rounded-[4px] sm:rounded-md transition-all duration-300 ${
                on
                  ? 'pm-light bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_0_8px_rgba(56,189,248,0.5)] hover:scale-110'
                  : 'bg-slate-200/70 border border-slate-300/50 hover:bg-slate-300/80'
              }`}
            />
          );
        })}
      </div>
      <p className="mt-3 h-5 text-xs font-semibold text-slate-500">
        {h || `${lit} of 80 Pixels illuminated toward your next rank`}
      </p>
    </div>
  );
}

const steps: [any, string, string][] = [
  [Share2, '1. Share Opportunity', 'Send your unique link to peers'],
  [Eye, '2. Friend Visits', 'They explore the opportunity details'],
  [UserPlus, '3. Friend Joins', 'They create a Pixel Minds account'],
  [Zap, '4. +25 Pixels Earned', 'Instantly credited to your balance']
];

export function ReferralPanel() {
  const { user } = useAuth();
  const [k, setK] = useState(0);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [t, setT] = useState('Global');
  const [on, setOn] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUserEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setOn(true), 100);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getLeaderboardUsers(50)
      .then((data) => {
        if (mounted) {
          setLeaderboardUsers(data);
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

  const basePixels = userProfile?.pixels ?? 0;
  const k = t === 'Global' ? 1 : t === 'Monthly' ? 0.4 : 0.12;
  const mine = basePixels;
  const ti = tierInfo(mine);

  const list = useMemo(() => {
    let pool = [...leaderboardUsers];

    // If logged-in user is not in pool, add them so they can always view their rank
    if (user?.uid && !pool.some((u) => u.id === user.uid)) {
      pool.push({
        id: user.uid,
        rank: pool.length + 1,
        name: userProfile?.displayName || user.displayName || 'You',
        pixels: mine,
        contribs: userProfile?.contributions || 0,
        avatarUrl: userProfile?.photoURL || user.photoURL || undefined,
        role: userProfile?.role || 'user'
      });
    }

    // Sort descending by score
    pool.sort((a, b) => {
      const aScore = a.id === user?.uid ? mine : a.pixels;
      const bScore = b.id === user?.uid ? mine : b.pixels;
      return bScore - aScore;
    });

    return pool.map((u, i) => {
      const isMe = user?.uid && u.id === user.uid;
      const currentScore = isMe ? mine : u.pixels;
      return {
        ...u,
        rank: i + 1,
        name: isMe && (userProfile?.displayName || user?.displayName)
          ? (userProfile?.displayName || user?.displayName)!
          : u.name,
        pixels: Math.round(currentScore * k),
        raw: currentScore,
        mv: 0,
        avatarUrl: isMe ? (userProfile?.photoURL || user?.photoURL || u.avatarUrl) : u.avatarUrl
      };
    });
  }, [leaderboardUsers, user?.uid, userProfile, mine, k]);

  const myRank = user?.uid ? list.findIndex((u) => u.id === user.uid) + 1 : 0;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0e1b33]">
          Community Leaderboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Discover opportunities, refer peers, earn Pixels and rise to Pixel Legend.
        </p>
      </div>

      {/* User Pixel Balance Card matching the frosted glass canvas theme */}
      <div className="relative overflow-hidden rounded-3xl pm-glass-card bg-white/85 backdrop-blur-2xl border border-white/90 p-6 sm:p-8 shadow-sm text-[#0e1b33]">
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

        <div className="relative z-10 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
              <PixelMark s={6} />
              <span>Your Pixel Balance</span>
            </p>

            <div className="relative mt-2 flex items-baseline gap-3">
              <p className="text-5xl font-black tracking-tight text-[#0e1b33] sm:text-6xl">
                <Count n={mine} />
              </p>
              <span className="text-sm font-bold text-slate-500">Pixels</span>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100/90 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-700">
                {myRank > 0 ? `Rank #${myRank}` : 'Rank #—'}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/90 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                {ti.name}
              </span>
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="text-slate-700">{ti.name}</span>
                <span className="text-slate-500">
                  {ti.next ? `${ti.toGo.toLocaleString('en-IN')} Pixels to ${ti.next}` : 'Peak Rank Achieved 🏆'}
                </span>
              </div>
              <Bar pct={ti.pct} on={on} />
            </div>
          </div>

          <div className="bg-white/60 p-4 rounded-2xl border border-white/80 backdrop-blur-md shadow-2xs">
            <PixelGrid pct={ti.pct} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/90 bg-white/80 p-1 shadow-xs backdrop-blur-md">
          {['Global', 'Monthly', 'Weekly'].map((x) => (
            <button
              key={x}
              onClick={() => setT(x)}
              className={`rounded-full px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                t === x
                  ? 'bg-[#112240] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0e1b33] hover:bg-white/80'
              }`}
            >
              {x}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Sparkles size={14} className="text-blue-500" />
          <span>Real-time platform activity</span>
        </div>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white/60 animate-pulse border border-white/80" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <ul className="space-y-2.5">
          {list.map((u, i) => {
            const ui = tierInfo(u.raw);
            const me = user?.uid && u.id === user.uid;
            const top = i < 3;
            return (
              <li
                key={u.id || u.rank}
                style={{ animationDelay: `${i * 50}ms` }}
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
                        {rankOf(u.raw)}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 max-w-xs">
                    <Bar pct={ui.pct} on={on} />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-blue-600">
                    <Count n={u.pixels} />
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-slate-400">
                    Pixels <Delta d={u.mv} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-3xl pm-glass-card bg-white/80 p-8 text-center text-slate-500 border border-white/90">
          <Trophy size={32} className="mx-auto text-blue-500/60 mb-2" />
          <p className="font-bold text-sm text-[#0e1b33]">No members on the leaderboard yet</p>
          <p className="text-xs mt-1">Share opportunities, refer friends, and participate to claim the #1 spot!</p>
        </div>
      )}
    </main>
  );
}
