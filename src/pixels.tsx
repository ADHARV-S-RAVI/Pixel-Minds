import { useState, useEffect, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';
import { Avatar } from './ui';
import { PixelMark } from './components/PixelMark';
import { users, moves, tierInfo, rankOf } from './data';
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
  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
    <div
      style={{ width: on ? pct + '%' : '0%' }}
      className="h-full rounded-full bg-gradient-to-r from-[#DFB76C] via-[#C5A059] to-[#997D46] transition-[width] duration-1000 ease-out shadow-[0_0_12px_rgba(212,175,55,0.4)]"
    />
  </div>
);

const Delta: FC<{ d: number }> = ({ d }) =>
  d === 0 ? (
    <span className="flex items-center text-xs font-semibold text-zinc-500">
      <Minus size={12} />
    </span>
  ) : (
    <span className={`flex items-center text-xs font-bold ${d > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                  ? 'pm-light bg-gradient-to-br from-[#DFB76C] to-[#C5A059] shadow-[0_0_8px_rgba(223,183,108,0.5)] hover:scale-110'
                  : 'bg-white/5 border border-white/8 hover:bg-white/10'
              }`}
            />
          );
        })}
      </div>
      <p className="mt-3 h-5 text-xs font-semibold text-zinc-400">
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
          <div key={l as string} className="rounded-2xl bg-[#141418]/90 backdrop-blur-xl border border-white/12 p-4 text-center shadow-lg text-white">
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#DFB76C] to-[#C5A059] sm:text-3xl">
              <Count n={v as number} pre={p as string} />
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-[#141418]/90 backdrop-blur-xl border border-white/12 p-5 sm:p-6 shadow-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">Your Referral Journey</h3>
            <p className="text-xs text-zinc-400 mt-0.5">How you earn Pixels by inviting friends</p>
          </div>
          <button
            onClick={() => setK(k + 1)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/8 hover:bg-white/14 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
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
                    ? 'border-[#DFB76C]/40 bg-gradient-to-br from-[#1C1C24] to-[#121218] text-white shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl ${
                    i === 3 ? 'bg-[#DFB76C] text-zinc-950 shadow-xs' : 'bg-white/10 text-[#DFB76C] border border-white/10'
                  }`}
                >
                  <I size={16} />
                </span>
                <p className="mt-2 text-xs font-bold text-white">{t}</p>
                <p className={`text-[11px] mt-0.5 ${i === 3 ? 'text-[#DFB76C]' : 'text-zinc-400'}`}>{d}</p>
              </div>
              {i < 3 && (
                <span style={{ animationDelay: `${i * 350 + 200}ms` }} className="pm-in text-[#DFB76C]">
                  <ArrowRight size={16} className="hidden sm:block" />
                  <ArrowDown size={16} className="sm:hidden" />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-3xl bg-[#141418]/90 backdrop-blur-xl border border-white/12 shadow-xl overflow-hidden text-white">
        <div className="border-b border-white/10 p-4 font-bold text-sm text-white">
          Recent Referral Activity
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-400">Loading referral activity...</div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus size={28} className="mx-auto text-zinc-600 mb-2" />
            <p className="font-bold text-xs text-zinc-200">No referrals yet</p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
              Share opportunities using your referral link to earn +25 Pixels when your friends sign up.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
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
                  className="pm-in flex items-center gap-3 p-4 hover:bg-white/5 transition"
                >
                  <Avatar name={displayName} photoURL={refItem.referredUserAvatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {refItem.opportunityTitle || 'Pixel Minds Invitation'}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {displayName} · {dateStr}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-extrabold ${isCompleted ? 'text-[#DFB76C]' : 'text-zinc-400'}`}>
                      +{refItem.pixelsRewarded || 25} Pixels
                    </p>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
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

  useEffect(() => {
    const id = setTimeout(() => setOn(true), 100);
    return () => clearTimeout(id);
  }, []);

  const basePixels = userProfile?.pixels ?? 0;
  const k = t === 'Global' ? 1 : t === 'Monthly' ? 0.4 : 0.12;
  const mine = basePixels;
  const ti = tierInfo(mine);

  const list = users.map((u, i) => {
    const isMe = i === 0;
    const currentScore = isMe ? mine : u.pixels;
    return {
      ...u,
      name: isMe && (userProfile?.displayName || user?.displayName) ? (userProfile?.displayName || user?.displayName)! : u.name,
      pixels: Math.round(currentScore * k),
      raw: currentScore,
      mv: moves[i]
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">
          Community Leaderboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Discover opportunities, refer peers, earn Pixels and rise to Pixel Legend.
        </p>
      </div>

      {/* User Pixel Balance Card in Dark Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#1C1C22]/95 to-[#121216]/98 backdrop-blur-2xl border border-white/12 p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] text-white">
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
              className="pm-float absolute rounded-xs bg-[#DFB76C]/20 shadow-[0_0_6px_rgba(223,183,108,0.4)]"
            />
          ))}
        </div>

        <div className="relative grid gap-6 md:grid-cols-2 items-center">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#DFB76C]">
              <PixelMark s={6} />
              <span>Your Pixel Balance</span>
            </p>

            <div className="relative mt-2 flex items-baseline gap-3">
              <p className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                <Count n={mine} />
              </p>
              <span className="text-sm font-bold text-zinc-400">Pixels</span>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#DFB76C]/15 border border-[#DFB76C]/30 px-3 py-1 text-xs font-bold text-[#DFB76C]">
                Rank #{mine > 0 ? 1 : '—'}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/12 px-3 py-1 text-xs font-semibold text-zinc-200">
                {ti.name}
              </span>
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span className="text-zinc-200">{ti.name}</span>
                <span className="text-zinc-400">
                  {ti.next ? `${ti.toGo.toLocaleString('en-IN')} Pixels to ${ti.next}` : 'Peak Rank Achieved 🏆'}
                </span>
              </div>
              <Bar pct={ti.pct} on={on} />
            </div>
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <PixelGrid pct={ti.pct} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-zinc-200/80 bg-white/80 p-1 shadow-xs backdrop-blur-md">
          {['Global', 'Monthly', 'Weekly'].map((x) => (
            <button
              key={x}
              onClick={() => setT(x)}
              className={`rounded-full px-5 py-1.5 text-xs font-bold transition cursor-pointer ${
                t === x
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              {x}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
          <Sparkles size={14} className="text-[#C5A059]" />
          <span>Top builders receive exclusive Discord perks &amp; badges</span>
        </div>
      </div>

      {/* Leaderboard List */}
      <ul className="space-y-2.5">
        {list.map((u, i) => {
          const ui = tierInfo(u.raw);
          const me = i === 0;
          const top = i < 3;
          return (
            <li
              key={u.rank}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`pm-in flex items-center gap-3 rounded-2xl p-3.5 sm:gap-4 sm:p-4 transition ${
                me
                  ? 'bg-gradient-to-r from-[#1C1C22] to-[#141418] border border-[#DFB76C]/40 text-white shadow-lg ring-1 ring-[#DFB76C]/20'
                  : top
                  ? 'bg-gradient-to-r from-[#1C1C22]/95 to-[#16161C]/95 border border-white/12 text-white shadow-md'
                  : 'bg-white/90 border border-zinc-200/80 text-zinc-900 shadow-xs hover:border-zinc-300'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${
                  i === 0 
                    ? 'bg-gradient-to-br from-[#DFB76C] to-[#997D46] text-zinc-950 shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                    : i === 1
                    ? 'bg-zinc-200 text-zinc-800 border border-zinc-300'
                    : i === 2
                    ? 'bg-amber-900/30 text-amber-300 border border-amber-700/40'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {i === 0 ? <Crown size={17} /> : u.rank}
              </span>

              <Avatar name={u.name} size={top ? 42 : 36} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <p className={`truncate text-xs sm:text-sm font-bold ${top ? 'text-white' : 'text-zinc-950'}`}>
                    {u.name}
                    {me && (
                      <span className="ml-2 rounded-md bg-[#DFB76C] px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-950">
                        YOU
                      </span>
                    )}
                  </p>
                  <span className="hidden sm:inline">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${top ? 'bg-white/10 border-white/12 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'}`}>
                      {rankOf(u.raw)}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 max-w-xs">
                  <Bar pct={ui.pct} on={on} />
                </div>
              </div>

              <div className="text-right">
                <p className={`text-sm font-black ${top ? 'text-[#DFB76C]' : 'text-zinc-950'}`}>
                  <Count n={u.pixels} />
                </p>
                <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-zinc-400">
                  Pixels <Delta d={u.mv} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Referral journey section */}
      <section className="pt-4">
        <h2 className="mb-3 text-xl font-extrabold tracking-tight text-zinc-950">Referred by You</h2>
        <ReferralPanel />
      </section>
    </main>
  );
}
