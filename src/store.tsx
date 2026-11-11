import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode, FC } from 'react';
import { Copy, Check, X, MessageCircle, Send, MoreHorizontal, Share2 } from 'lucide-react';
import { PixelMark } from './components/PixelMark';
import { useAuth } from './contexts/AuthContext';
import { recordOpportunityApplication } from './services/applications';
import { recordOpportunityShare } from './services/opportunities';
import { toggleBookmarkRecord, getUserBookmarks } from './services/community';
import { supabase } from './lib/supabase';

const ld = <T,>(k: string, d: T): T => {
  try {
    const item = localStorage.getItem(k);
    return item ? JSON.parse(item) : d;
  } catch {
    return d;
  }
};

const sv = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // ignore
  }
};

const mkCode = () => 'PIXEL-' + Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export interface AppContextType {
  code: string;
  saved: string[];
  applied: (number | string)[];
  extra: any[];
  toggle: (k: string) => void;
  apply: (id: number | string) => void;
  trackApplication: (opp: {
    id: string | number;
    title: string;
    organizer?: string;
    category?: string;
    mode?: string;
    deadline?: string;
    officialUrl?: string;
  }) => Promise<void>;
  addPost: (p: any) => void;
  link: (path: string) => string;
  copy: (t: string) => Promise<void>;
  say: (m: string) => void;
  share: (title: string, path: string) => void;
}

const Ctx = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || urlParams.get('referral');
      if (refParam && refParam.trim()) {
        const clean = refParam.trim().toUpperCase();
        localStorage.setItem('pm_ref_code', clean);
        sessionStorage.setItem('pm_ref_code', clean);
      }
    } catch {
      // ignore
    }
  }, []);

  const [localCode] = useState(() => {
    let c = ld('pm_code', '');
    if (!c) {
      c = mkCode();
      sv('pm_code', c);
    }
    return c;
  });

  const code = userProfile?.referralId || localCode;

  const [saved, setSaved] = useState<string[]>(() => ld('pm_saved', []));

  // Sync saved bookmarks with user account / Supabase if available
  useEffect(() => {
    if (!user?.uid) return;

    let isSubscribed = true;
    const loadUserSaved = async () => {
      try {
        const remoteBookmarks = await getUserBookmarks(user.uid);
        if (!isSubscribed) return;

        if (remoteBookmarks && remoteBookmarks.length > 0) {
          setSaved((prev) => {
            const merged = Array.from(new Set([...prev, ...remoteBookmarks]));
            sv('pm_saved', merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Bookmarks profile sync note:', err);
      }
    };

    loadUserSaved();

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid]);

  const [applied, setApplied] = useState<(number | string)[]>(() => ld('pm_applied', []));
  const [extra, setExtra] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [sh, setSh] = useState<{ title: string; path: string } | null>(null);
  const [ok, setOk] = useState(false);

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  const toggle = async (k: string) => {
    const isCurrentlySaved = saved.includes(k);
    const updated = isCurrentlySaved ? saved.filter((x) => x !== k) : [...saved, k];

    setSaved(updated);
    sv('pm_saved', updated);
    say(isCurrentlySaved ? 'Removed from saved' : 'Saved to bookmarks');

    // Synchronize to user_bookmarks database table and analytics
    if (user?.uid) {
      try {
        await toggleBookmarkRecord(k, user.uid);
      } catch (err) {
        console.warn('[toggle] Remote bookmark sync notice:', err);
      }

      try {
        await supabase.from('analytics_events').insert({
          user_id: user.uid,
          event_name: isCurrentlySaved ? 'unbookmark_opportunity' : 'bookmark_opportunity',
          target_type: k.startsWith('p') ? 'post' : 'opportunity',
          target_id: k.startsWith('p') ? k.slice(1) : k,
          metadata: { timestamp: Date.now() }
        });
      } catch (err) {
        console.warn('Bookmark analytics note:', err);
      }
    }
  };

  const apply = (id: number | string) => {
    setApplied((a) => {
      const idStr = String(id);
      if (a.includes(idStr)) return a;
      const n = [...a, idStr];
      sv('pm_applied', n);
      say('Registration opened! Complete registration, then confirm in My Applications after 3 mins to claim +10 Pixels.');
      return n;
    });
  };

  const trackApplication = async (opp: {
    id: string | number;
    title: string;
    organizer?: string;
    category?: string;
    mode?: string;
    deadline?: string;
    officialUrl?: string;
  }) => {
    const oppIdStr = String(opp.id);
    setApplied((a) => {
      if (a.includes(oppIdStr)) return a;
      const n = [...a, oppIdStr];
      sv('pm_applied', n);
      return n;
    });

    if (user?.uid) {
      try {
        await recordOpportunityApplication(
          user.uid,
          {
            id: oppIdStr,
            title: opp.title,
            organizer: opp.organizer,
            category: opp.category,
            mode: opp.mode,
            deadline: opp.deadline,
            officialUrl: opp.officialUrl
          },
          user.email || undefined,
          userProfile?.displayName || undefined
        );
      } catch (err) {
        console.warn('Could not record application:', err);
      }
    }

    say('Registration opened! Complete registration, then confirm in My Applications after 3 mins to claim +10 Pixels.');
  };

  const addPost = (p: any) => {
    setExtra((e) => [p, ...e]);
  };

  const link = (path: string) => {
    try {
      const u = new URL(path, window.location.origin);
      u.searchParams.set('ref', code);
      return u.toString();
    } catch {
      return `${window.location.origin}${path}?ref=${code}`;
    }
  };

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      const a = document.createElement('textarea');
      a.value = t;
      document.body.appendChild(a);
      a.select();
      document.execCommand('copy');
      a.remove();
    }
    say('Link copied · +25 Pixels when a friend joins');
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  };

  const url = sh ? link(sh.path) : '';
  const txt = sh ? `Check this out on Pixel Minds: ${sh.title}` : '';

  const other = () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title: sh?.title, text: txt, url }).catch(() => {});
    } else {
      copy(url);
    }
  };

  const ch: [string, any, string, string][] = sh
    ? [
        ['WhatsApp', MessageCircle, '#22c55e', `https://wa.me/?text=${encodeURIComponent(txt + ' ' + url)}`],
        ['Share Link', Share2, '#0a66c2', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],
        ['Telegram', Send, '#0ea5e9', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(txt)}`]
      ]
    : [];

  return (
    <Ctx.Provider
      value={{
        code,
        saved,
        applied,
        extra,
        toggle,
        apply,
        trackApplication,
        addPost,
        link,
        copy,
        say,
        share: (title: string, path: string) => {
          setSh({ title, path });
          if (user?.uid && path.includes('/opportunities/')) {
            const oppId = path.split('/opportunities/')[1]?.split('?')[0];
            if (oppId) recordOpportunityShare(user.uid, oppId);
          }
        }
      }}
    >
      {children}

      {/* Referral Share Modal */}
      {/* Refer & Earn Modal */}
      {sh && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-md sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setSh(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pm-in w-full overflow-hidden rounded-t-3xl bg-[#FAF7F2] shadow-2xl sm:max-w-md sm:rounded-3xl border border-black/10"
          >
            <div className="relative bg-gradient-to-br from-[#0B1628] via-[#11243D] to-[#162B45] p-6 text-white overflow-hidden border-b border-sky-500/20">
              {/* Celestial glow & orbital arcs */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/15 blur-2xl" />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 text-sky-400/20"
                viewBox="0 0 100 100"
                fill="none"
              >
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
                <path d="M5 50 Q 50 10 95 50" stroke="currentColor" strokeWidth="0.8" />
              </svg>

              <button
                aria-label="Close"
                onClick={() => setSh(null)}
                className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition cursor-pointer"
              >
                <X size={17} />
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                <PixelMark s={6} />
                Refer &amp; Earn
              </span>
              <h3 className="font-['Outfit',sans-serif] mt-1.5 pr-6 text-xl font-bold leading-snug text-white">{sh.title}</h3>
              <p className="mt-1 text-xs text-white/70">Share this opportunity with your peers and earn Pixels.</p>

              <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sky-400 shadow-md backdrop-blur-md border-sky-500/20">
                <PixelMark s={9} />
                <span className="text-base font-extrabold text-white">+25 Pixels</span>
                <span className="text-xs font-medium text-white/60">per friend who joins</span>
                {ok && <span className="pm-rise absolute -top-1 right-2 text-sm font-extrabold text-sky-400">+25</span>}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">Your unique referral link</p>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.target.select()}
                    className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-3.5 py-2 text-xs font-mono text-[#16171D] outline-none focus:border-[#C5A059]"
                  />
                  <button
                    onClick={() => copy(url)}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white transition cursor-pointer ${
                      ok ? 'bg-emerald-600' : 'bg-[#112240] hover:bg-[#1a335e] text-white border border-transparent shadow-md shadow-slate-900/10'
                    }`}
                  >
                    {ok ? <Check size={15} className="pm-pop text-white" /> : <Copy size={15} />}
                    {ok ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[#7D756C]">
                  Code <b className="font-bold text-[#16171D]">{code}</b> is embedded into this link. Pixels are credited automatically when peers register.
                </p>
              </div>

              <div className="pt-2 border-t border-black/6">
                <p className="text-[11px] font-bold text-[#8C827A] uppercase tracking-wider mb-2.5">Share via social</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {ch.map(([n, I, c, h]) => (
                    <a
                      key={n}
                      href={h}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[#5D574F] hover:text-[#16171D] group"
                    >
                      <span
                        style={{ backgroundColor: c }}
                        className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm transition group-hover:scale-105"
                      >
                        <I size={18} />
                      </span>
                      {n}
                    </a>
                  ))}
                  <button
                    onClick={other}
                    className="flex flex-col items-center gap-1 text-[11px] font-semibold text-[#5D574F] hover:text-[#16171D] group cursor-pointer"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/5 text-[#2D2A26] border border-black/8 shadow-sm transition group-hover:scale-105">
                      <MoreHorizontal size={18} />
                    </span>
                    More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="pm-pop fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#0B1628]/95 backdrop-blur-xl px-5 py-2.5 text-xs font-semibold text-white shadow-2xl md:bottom-6 border border-sky-500/25 flex items-center gap-2">
          <PixelMark s={6} />
          <span>{toast}</span>
        </div>
      )}
    </Ctx.Provider>
  );
};
