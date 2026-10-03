import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode, FC } from 'react';
import { Copy, Check, X, MessageCircle, Send, MoreHorizontal, Share2 } from 'lucide-react';
import { PixelMark } from './components/PixelMark';
import { useAuth } from './contexts/AuthContext';

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
  const { userProfile } = useAuth();

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      if (refParam && refParam.trim()) {
        localStorage.setItem('pm_ref_code', refParam.trim().toUpperCase());
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
  const [applied, setApplied] = useState<(number | string)[]>(() => ld('pm_applied', []));
  const [extra, setExtra] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [sh, setSh] = useState<{ title: string; path: string } | null>(null);
  const [ok, setOk] = useState(false);

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  const toggle = (k: string) => {
    setSaved((s) => {
      const n = s.includes(k) ? s.filter((x) => x !== k) : [...s, k];
      sv('pm_saved', n);
      say(s.includes(k) ? 'Removed from saved' : 'Saved to bookmarks');
      return n;
    });
  };

  const apply = (id: number | string) => {
    setApplied((a) => {
      if (a.includes(id)) return a;
      const n = [...a, id];
      sv('pm_applied', n);
      say('Marked as registered (+10 Pixels)');
      return n;
    });
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
        addPost,
        link,
        copy,
        say,
        share: (title: string, path: string) => setSh({ title, path })
      }}
    >
      {children}

      {/* Referral Share Modal */}
      {sh && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-xs sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={() => setSh(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="pm-in w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl border border-slate-200"
          >
            <div className="relative bg-gradient-to-br from-sky-500 to-sky-600 p-6 text-white">
              <button
                aria-label="Close"
                onClick={() => setSh(null)}
                className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <X size={18} />
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-100">
                <PixelMark s={6} />
                Refer &amp; Earn
              </span>
              <h3 className="mt-1.5 pr-6 text-xl font-bold leading-snug">{sh.title}</h3>
              <p className="mt-1 text-sm text-sky-100">Share this opportunity with your network and earn Pixels.</p>

              <div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sky-700 shadow-md">
                <PixelMark s={9} />
                <span className="text-lg font-extrabold">+25 Pixels</span>
                <span className="text-xs font-medium text-slate-500">per friend who joins</span>
                {ok && <span className="pm-rise absolute -top-1 right-2 text-sm font-extrabold text-sky-600">+25</span>}
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your unique referral link</p>
              <div className="mt-2 flex gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-mono text-slate-700 outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => copy(url)}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-white transition ${
                    ok ? 'bg-emerald-600' : 'bg-sky-500 hover:bg-sky-600'
                  }`}
                >
                  {ok ? <Check size={15} className="pm-pop" /> : <Copy size={15} />}
                  {ok ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2.5 text-xs text-slate-500">
                Code <b className="font-semibold text-slate-800">{code}</b> is embedded into this link. Pixels are credited automatically when friends join.
              </p>

              <div className="mt-6 grid grid-cols-4 gap-2 text-center">
                {ch.map(([n, I, c, h]) => (
                  <a
                    key={n}
                    href={h}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 group"
                  >
                    <span
                      style={{ backgroundColor: c }}
                      className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm transition group-hover:scale-105"
                    >
                      <I size={20} />
                    </span>
                    {n}
                  </a>
                ))}
                <button
                  onClick={other}
                  className="flex flex-col items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 group"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 shadow-sm transition group-hover:scale-105">
                    <MoreHorizontal size={20} />
                  </span>
                  More
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div className="pm-pop fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xl md:bottom-6 border border-slate-700/50">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
};
