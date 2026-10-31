import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode, FC } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Compass,
  PlusSquare,
  Users,
  User,
  Search,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Calendar,
  MapPin,
  Trophy,
  Link2,
  CalendarDays,
  Briefcase,
  Send,
  ExternalLink,
  LogIn,
  LogOut,
  ShieldCheck,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { opps } from './data';
import type { Opp } from './data';
import { AnnouncementModal } from './components/AnnouncementModal';
import { grad, getCategoryMeta } from './utils/meta';
import { useApp } from './store';
import { PixelMark } from './components/PixelMark';
import { NotificationBell } from './components/NotificationBell';
import { useAuth } from './contexts/AuthContext';
import { createCommunityPost, deleteCommunityPost } from './services/community';

const cls = (v: string, c = '') =>
  `inline-flex items-center justify-center gap-2 min-h-10 rounded-full px-5 py-2.5 text-xs font-bold transition cursor-pointer select-none ${
    v === 'primary'
      ? 'bg-[#141418] text-white hover:bg-[#1E1E24] border border-white/15 shadow-[0_10px_25px_-8px_rgba(0,0,0,0.5),0_0_15px_-4px_rgba(212,175,55,0.25)] hover:shadow-[0_14px_28px_-6px_rgba(0,0,0,0.6),0_0_20px_-3px_rgba(212,175,55,0.35)] active:scale-[0.98]'
      : v === 'cream'
      ? 'bg-[#F7F4EE] hover:bg-white text-zinc-950 border border-zinc-300/80 shadow-xs hover:shadow active:scale-[0.98]'
      : v === 'gold'
      ? 'bg-gradient-to-r from-[#C5A059] to-[#DFB76C] text-zinc-950 border border-[#EBD197]/40 shadow-[0_6px_20px_rgba(212,175,55,0.35)] hover:brightness-105 active:scale-[0.98]'
      : v === 'ghost'
      ? 'text-zinc-300 hover:text-white hover:bg-white/8 active:bg-white/12'
      : v === 'danger'
      ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 active:scale-[0.98]'
      : 'border border-white/15 bg-white/8 text-zinc-200 hover:bg-white/14 hover:text-white active:scale-[0.98]'
  } ${c}`;

export const Btn: FC<any> = ({ children, v = 'primary', className = '', ...p }) => (
  <button {...p} className={cls(v, className)}>
    {children}
  </button>
);

export const BtnLink: FC<any> = ({ to, children, v = 'primary', className = '', ...p }) => (
  <Link to={to} className={cls(v, className)} {...p}>
    {children}
  </Link>
);

export const Card: FC<{ children: ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick
}) => (
  <div
    onClick={onClick}
    className={`rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md ${className}`}
  >
    {children}
  </div>
);

export const Badge: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-lg bg-zinc-900/5 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 border border-zinc-200/80 ${className}`}>
    {children}
  </span>
);

export const Avatar: FC<{ name?: string; size?: number; photoURL?: string; className?: string }> = ({
  name = 'User',
  size = 40,
  photoURL,
  className = ''
}) => {
  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 ring-1 ring-white/20 shadow-xs ${className}`}
      />
    );
  }
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.36)) }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#24242C] to-[#141418] font-bold text-[#DFB76C] border border-[#DFB76C]/30 ring-1 ring-white/10 select-none shadow-xs ${className}`}
    >
      {initials || 'PM'}
    </div>
  );
};

export const Logo: FC<{ light?: boolean }> = ({ light = false }) => (
  <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight group shrink-0">
    <span className="p-1.5 rounded-xl bg-white/10 border border-white/15 transition group-hover:scale-105 group-hover:border-[#DFB76C]/40 shadow-xs">
      <PixelMark s={6} />
    </span>
    <span className={`text-base font-extrabold tracking-tight ${light ? 'text-zinc-900' : 'text-white'}`}>
      Pixel Minds
    </span>
  </Link>
);

export const BackBtn: FC<{ light?: boolean }> = ({ light = false }) => {
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname === '/') return null;
  return (
    <button
      aria-label="Go back"
      onClick={() => (loc.key === 'default' ? nav('/') : nav(-1))}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
        light 
          ? 'text-zinc-700 hover:bg-zinc-200/70 active:bg-zinc-300' 
          : 'text-zinc-300 hover:bg-white/10 hover:text-white active:bg-white/15'
      }`}
    >
      <ArrowLeft size={18} />
    </button>
  );
};

export const SectionTitle: FC<{ t: string; to?: string; subtitle?: string; light?: boolean }> = ({ t, to, subtitle, light = false }) => (
  <div className="mb-5 flex items-end justify-between">
    <div>
      <h2 className={`text-2xl font-extrabold tracking-tight sm:text-3xl ${light ? 'text-white' : 'text-zinc-950'}`}>
        {t}
      </h2>
      {subtitle && <p className="text-xs sm:text-sm text-zinc-500 mt-1">{subtitle}</p>}
    </div>
    {to && (
      <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-[#C5A059] hover:text-[#DFB76C] transition">
        <span>View all</span>
        <ArrowRight size={13} />
      </Link>
    )}
  </div>
);

export const ReferBtn: FC<{ title: string; path: string; className?: string }> = ({
  title,
  path,
  className = ''
}) => {
  const { share } = useApp();
  return (
    <button
      onClick={() => share(title, path)}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#FAF7F0] hover:bg-white text-zinc-950 px-4 py-2 text-xs font-bold shadow-xs transition hover:shadow active:scale-[0.98] ${className}`}
    >
      <Users size={14} className="text-[#997D46]" />
      <span>Refer &amp; Earn</span>
      <span className="rounded-md bg-zinc-900/10 px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-800">+25</span>
    </button>
  );
};

export const OppCard: FC<{ o: Opp }> = ({ o }) => {
  const { saved, toggle } = useApp();
  const catMeta = getCategoryMeta(o.cat);
  const Ic = catMeta.Icon;
  const on = saved.includes(String(o.id));

  return (
    <div className="group relative flex flex-col rounded-3xl bg-gradient-to-b from-[#1C1C22]/95 to-[#121216]/98 backdrop-blur-2xl border border-white/12 p-5 sm:p-6 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),0_0_25px_-5px_rgba(212,175,55,0.18)] hover:border-[#C5A059]/40 overflow-hidden text-white">
      {/* Decorative Celestial Orbital Curved Lines Art in Background */}
      <svg
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 text-white/5 opacity-60 transition-opacity duration-300 group-hover:opacity-100 group-hover:text-[#DFB76C]/10"
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <ellipse cx="80" cy="80" rx="75" ry="35" stroke="currentColor" strokeWidth="1.2" transform="rotate(-30 80 80)" />
        <circle cx="80" cy="80" r="45" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="125" cy="50" r="3" fill="#DFB76C" opacity="0.8" />
      </svg>

      {/* Top Header: Category Tag & Save Bookmark */}
      <div className="relative z-10 flex items-center justify-between gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 border border-white/12 px-3 py-1 text-xs font-semibold text-zinc-200 backdrop-blur-md">
          <Ic size={13} className="text-[#DFB76C]" />
          <span>{o.cat}</span>
        </span>
        <button
          aria-label={on ? 'Unsave' : 'Save'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(String(o.id));
          }}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/8 hover:bg-white/16 border border-white/12 text-zinc-300 hover:text-white transition shadow-xs cursor-pointer"
        >
          <Bookmark size={15} fill={on ? '#DFB76C' : 'none'} className={on ? 'text-[#DFB76C]' : 'text-zinc-300'} />
        </button>
      </div>

      {/* Title & Organization */}
      <div className="relative z-10 mb-3">
        <Link to={'/opportunities/' + o.id}>
          <h3 className="font-bold text-lg sm:text-xl text-white tracking-tight leading-snug line-clamp-1 group-hover:text-[#DFB76C] transition">
            {o.title}
          </h3>
        </Link>
        <p className="text-xs text-zinc-400 font-medium mt-1 line-clamp-1">{o.org}</p>
      </div>

      {/* Metadata Badges with Champagne Gold Icons */}
      <div className="relative z-10 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-zinc-300 mb-4">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-[#DFB76C]" />
          <span>{o.deadline} {o.days ? `· ${o.days}d left` : ''}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#DFB76C]" />
          <span>{o.mode}</span>
        </span>
        {o.prize && (
          <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
            <Trophy size={13} className="text-[#DFB76C]" />
            <span>{o.prize}</span>
          </span>
        )}
      </div>

      {/* Skill Tags */}
      <div className="relative z-10 flex flex-wrap gap-1.5 mb-5">
        {o.skills.slice(0, 3).map((s) => (
          <span key={s} className="rounded-lg bg-white/6 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
            {s}
          </span>
        ))}
        {o.skills.length > 3 && (
          <span className="text-[10px] text-zinc-400 font-medium self-center">
            +{o.skills.length - 3}
          </span>
        )}
      </div>

      {/* Action Buttons: View Details & Refer Button */}
      <div className="relative z-10 mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
        <Link
          to={'/opportunities/' + o.id}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/12 px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
        >
          <span>View Details</span>
          <ArrowRight size={13} />
        </Link>
        <ReferBtn title={o.title} path={'/opportunities/' + o.id} className="!py-2 !text-xs !min-h-9" />
      </div>
    </div>
  );
};

export const Composer: FC<{ onPostCreated?: (p: any) => void }> = ({ onPostCreated }) => {
  const { addPost, say } = useApp();
  const { userProfile, user } = useAuth();
  const [t, setT] = useState('');
  const [pick, setPick] = useState('');
  const [oid, setOid] = useState<number | string>(0);
  const [lnk, setLnk] = useState('');
  const [showL, setShowL] = useState(false);
  const [posting, setPosting] = useState(false);

  const userName = userProfile?.displayName || user?.displayName || 'Community Builder';
  const list = pick === 'event' ? opps.filter((o) => ['Events', 'Workshops', 'Conferences'].includes(o.cat)) : opps;

  const post = async () => {
    if (!t.trim()) return;
    if (!user?.uid) {
      say('Please sign in to post to the community');
      return;
    }

    setPosting(true);
    try {
      const newPost = await createCommunityPost(
        {
          id: user.uid,
          displayName: userName,
          role: userProfile?.role || 'user'
        },
        {
          text: t.trim(),
          opp: oid || undefined,
          link: lnk.trim() || undefined,
          category: pick === 'event' ? 'Events' : (pick === 'opp' ? 'Opportunities' : 'General'),
          status: 'published'
        }
      );

      if (onPostCreated) {
        onPostCreated(newPost);
      } else {
        addPost(newPost);
      }

      setT('');
      setPick('');
      setOid(0);
      setLnk('');
      setShowL(false);
      say('Posted to community feed (+10 Pixels)');
    } catch (err: any) {
      console.error('Failed to create post:', err);
      say(err?.message || 'Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const tools: [any, string, () => void, boolean][] = [
    [Briefcase, 'Opportunity', () => { setPick(pick === 'opp' ? '' : 'opp'); setOid(0); }, pick === 'opp'],
    [CalendarDays, 'Event', () => { setPick(pick === 'event' ? '' : 'event'); setOid(0); }, pick === 'event'],
    [Link2, 'Link', () => setShowL(!showL), showL]
  ];

  return (
    <div className="rounded-3xl bg-[#141418]/92 backdrop-blur-2xl border border-white/12 p-5 shadow-xl text-white">
      <div className="flex gap-3">
        <Avatar name={userName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={40} />
        <textarea
          value={t}
          onChange={(e) => setT(e.target.value)}
          rows={t ? 3 : 1}
          placeholder="Share an update, ask a question, or discuss opportunities..."
          className="w-full resize-none rounded-2xl bg-white/6 border border-white/10 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-[#C5A059]/70 text-white placeholder:text-zinc-500 transition"
        />
      </div>

      {pick && (
        <select
          value={oid}
          onChange={(e) => setOid(e.target.value)}
          className="mt-3 w-full rounded-xl bg-white/8 border border-white/12 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-[#C5A059]/70"
        >
          <option value={0} className="bg-zinc-900 text-zinc-300">Attach {pick === 'event' ? 'an event' : 'an opportunity'}…</option>
          {list.map((o) => (
            <option key={o.id} value={o.id} className="bg-zinc-900 text-zinc-200">
              {o.title} ({o.org})
            </option>
          ))}
        </select>
      )}

      {showL && (
        <input
          value={lnk}
          onChange={(e) => setLnk(e.target.value)}
          type="url"
          placeholder="https://example.com/resource"
          className="mt-3 w-full rounded-xl bg-white/8 border border-white/12 px-3.5 py-2 text-xs outline-none focus:border-[#C5A059]/70 text-white placeholder-zinc-500"
        />
      )}

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex gap-1.5 text-zinc-400">
          {tools.map(([I, l, f, a]) => (
            <button
              key={l}
              onClick={f}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                a 
                  ? 'bg-[#C5A059]/20 text-[#DFB76C] border border-[#C5A059]/40' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/8'
              }`}
            >
              <I size={14} className={a ? 'text-[#DFB76C]' : 'text-zinc-400'} />
              <span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
        <button
          disabled={!t.trim() || posting}
          onClick={post}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#C5A059] to-[#DFB76C] px-5 py-2 text-xs font-bold text-zinc-950 shadow-sm hover:brightness-105 disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
        >
          <Send size={13} />
          <span>{posting ? 'Posting...' : 'Post'}</span>
        </button>
      </div>
    </div>
  );
};

export const PostCard: FC<{ p: any; onPostDeleted?: (id: string) => void }> = ({ p, onPostDeleted }) => {
  const { saved, toggle, share, say } = useApp();
  const { userProfile, user } = useAuth();
  const o = opps.find((x) => String(x.id) === String(p.opp));
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<[string, string][]>([]);
  const [commentText, setCommentText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isSaved = saved.includes('p' + p.id);
  const currentUserName = userProfile?.displayName || user?.displayName || 'Aarav Mehta';
  const canDelete = user && (user.uid === p.userId || userProfile?.role === 'admin');

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setDeleting(true);
    try {
      await deleteCommunityPost(String(p.id));
      say('Post deleted');
      if (onPostDeleted) onPostDeleted(String(p.id));
    } catch (err) {
      console.error('Failed to delete post:', err);
      say('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const sendComment = () => {
    if (!commentText.trim()) return;
    setComments([...comments, [currentUserName, commentText.trim()]]);
    setCommentText('');
  };

  if (deleting) return null;

  return (
    <div className="rounded-3xl bg-[#141418]/90 backdrop-blur-2xl border border-white/12 p-5 sm:p-6 shadow-xl text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={p.user} size={38} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{p.user}</p>
            <p className="text-xs text-zinc-400">
              {p.role} · {p.time}
            </p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            title="Delete post"
            className="text-zinc-400 hover:text-rose-400 transition p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-zinc-200">{p.text}</p>

      {p.link && (
        <a
          href={p.link}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-flex items-center gap-1.5 truncate text-xs font-semibold text-[#DFB76C] hover:underline"
        >
          <ExternalLink size={13} />
          <span>{p.link}</span>
        </a>
      )}

      {p.img && (
        <div className="mt-3.5 h-48 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10" />
      )}

      {o && (
        <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div
            style={{ background: grad(o.cat) }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-xs border border-white/10"
          >
            {(() => {
              const Ic = getCategoryMeta(o.cat).Icon;
              return <Ic size={20} className="text-[#DFB76C]" />;
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{o.title}</p>
            <p className="text-[11px] text-zinc-400">
              {o.org} · {o.deadline} · {o.mode}
            </p>
          </div>
          <Link
            to={'/opportunities/' + o.id}
            className="rounded-lg bg-white/10 hover:bg-white/18 text-white px-3 py-1.5 text-xs font-semibold border border-white/10"
          >
            View
          </Link>
        </div>
      )}

      <div className="mt-4 flex justify-between border-t border-white/10 pt-2.5 text-xs text-zinc-300">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            liked ? 'text-rose-400 font-semibold' : ''
          }`}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          <span>{p.likes + (liked ? 1 : 0)}</span>
        </button>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            open ? 'text-[#DFB76C] font-semibold' : ''
          }`}
        >
          <MessageCircle size={15} />
          <span>{p.comments + comments.length}</span>
        </button>

        <button
          onClick={() => share(p.text.slice(0, 60), '/feed')}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer"
        >
          <Share2 size={15} />
          <span>Share</span>
        </button>

        <button
          onClick={() => toggle('p' + p.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            isSaved ? 'text-[#DFB76C] font-semibold' : ''
          }`}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          <span>Save</span>
        </button>
      </div>

      {open && (
        <div className="mt-3.5 space-y-2.5 border-t border-white/10 pt-3">
          {comments.map(([n, t], i) => (
            <div key={i} className="flex gap-2 items-start">
              <Avatar name={n} size={26} />
              <div className="rounded-2xl bg-white/6 px-3.5 py-2 text-xs text-zinc-200 border border-white/8 flex-1">
                <b className="mr-1.5 font-bold text-white">{n}</b>
                {t}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendComment()}
              placeholder="Write a comment…"
              className="min-w-0 flex-1 rounded-full bg-white/6 border border-white/12 px-4 py-2 text-xs outline-none focus:border-[#C5A059]/70 text-white placeholder-zinc-500"
            />
            <button
              onClick={sendComment}
              disabled={!commentText.trim()}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#DFB76C] text-zinc-950 font-bold disabled:opacity-40 transition cursor-pointer shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const navItems = [
  ['/', 'Home', Home],
  ['/opportunities', 'Explore', Compass],
  ['/submit', 'Create', PlusSquare],
  ['/feed', 'Feed', Users],
  ['/profile', 'Profile', User]
] as const;

export const Layout: FC = () => {
  const { user, userProfile, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
    if (target && target.value) {
      navigate(`/opportunities?q=${encodeURIComponent(target.value)}`);
    }
  };

  return (
    <div className="min-h-screen pm-bg-canvas flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 relative overflow-x-hidden selection:bg-[#C5A059]/30 selection:text-zinc-900">
      {/* Subtle Warm Champagne Glow Orbs in Background */}
      <div className="pointer-events-none fixed -top-40 right-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-b from-[#DFB76C]/12 via-[#C5A059]/5 to-transparent blur-3xl -z-10" />
      <div className="pointer-events-none fixed -bottom-32 left-10 h-[500px] w-[500px] rounded-full bg-gradient-to-t from-[#C5A059]/10 to-transparent blur-3xl -z-10" />

      {/* Active Announcement Popup Modal */}
      <AnnouncementModal />

      {/* Floating Dark Glassmorphism Header Capsule */}
      <div className="sticky top-3 sm:top-4 z-40 max-w-7xl mx-auto px-3 sm:px-6 w-full">
        <header className="flex h-14 sm:h-16 items-center justify-between gap-3 px-3.5 sm:px-5 rounded-2xl md:rounded-full bg-[#121317]/92 backdrop-blur-2xl border border-white/12 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] text-white">
          <div className="flex items-center gap-3 shrink-0">
            <BackBtn />
            <Logo />
          </div>

          {/* Desktop Search Bar embedded inside Dark Capsule */}
          <form onSubmit={handleSearchSubmit} className="relative hidden max-w-xs flex-1 md:block mx-2">
            <Search size={15} className="absolute left-3.5 top-3 text-zinc-400" />
            <input
              ref={searchInputRef}
              name="q"
              placeholder="Search opportunities, events, tags..."
              className="w-full rounded-full bg-white/6 hover:bg-white/10 focus:bg-white/10 border border-white/10 py-2 pl-9 pr-14 text-xs text-white placeholder-zinc-400 outline-none focus:border-[#C5A059]/70 focus:ring-1 focus:ring-[#C5A059]/40 transition"
            />
            <span className="absolute right-3 top-2.5 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 border border-white/10 select-none">
              Ctrl K
            </span>
          </form>

          {/* Desktop Navigation Links & CTAs */}
          <nav className="ml-auto hidden items-center gap-1.5 md:flex shrink-0">
            {[
              ['/opportunities', 'Opportunities'],
              ['/feed', 'Feed'],
              ['/leaderboard', 'Leaderboard']
            ].map(([to, l]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                      : 'text-zinc-300 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                {l}
              </NavLink>
            ))}

            {/* + Share Opportunity Button */}
            <Link to="/submit" className="ml-1">
              <button className="inline-flex items-center gap-1.5 rounded-full bg-white/8 hover:bg-white/16 border border-white/15 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:border-[#DFB76C]/40 cursor-pointer">
                <PlusSquare size={14} className="text-[#DFB76C]" />
                <span>Share Opportunity</span>
              </button>
            </Link>

            {/* Admin link if role is admin */}
            {userProfile?.role === 'admin' && (
              <Link to="/admin" className="text-zinc-400 hover:text-[#DFB76C] p-2 rounded-full hover:bg-white/8 transition" title="Admin Console">
                <ShieldCheck size={18} />
              </Link>
            )}

            {/* Notification Bell */}
            <NotificationBell className="ml-0.5" />

            {/* Auth User Menu or Sign In */}
            {user ? (
              <div className="relative ml-1.5">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-[#DFB76C]/40 transition cursor-pointer"
                >
                  <Avatar
                    name={userProfile?.displayName || user.displayName || 'User'}
                    photoURL={userProfile?.photoURL || user.photoURL || undefined}
                    size={34}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-3 w-56 rounded-3xl border border-white/15 bg-[#141418]/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50 text-white pm-in"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate">
                        {userProfile?.displayName || user.displayName || 'User'}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#DFB76C]">
                        <PixelMark s={4} />
                        <span>{userProfile?.pixels ?? 0} Pixels</span>
                      </div>
                    </div>

                    <div className="py-1.5">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/8 hover:text-white transition"
                      >
                        <User size={14} className="text-zinc-400" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/8 hover:text-white transition"
                      >
                        <Trophy size={14} className="text-[#DFB76C]" />
                        <span>Leaderboard &amp; Badges</span>
                      </Link>
                      {userProfile?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#DFB76C] hover:bg-white/8 transition"
                        >
                          <ShieldCheck size={14} />
                          <span>Admin Console</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-white/10 pt-1.5">
                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/8 transition"
                >
                  <LogIn size={14} />
                  <span>Log In</span>
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-[#F7F4EE] hover:bg-white text-zinc-950 font-bold text-xs px-4 py-2 shadow-xs transition hover:shadow active:scale-[0.98]"
                >
                  Join Free
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Right Icons */}
          <div className="ml-auto flex items-center gap-2 md:hidden shrink-0">
            <Link to="/opportunities" aria-label="Search" className="grid h-9 w-9 place-items-center text-zinc-300 hover:text-white">
              <Search size={18} />
            </Link>
            <NotificationBell />
            <Link to={user ? '/profile' : '/login'}>
              <Avatar
                name={userProfile?.displayName || user?.displayName || 'User'}
                photoURL={userProfile?.photoURL || user?.photoURL || undefined}
                size={32}
              />
            </Link>
          </div>
        </header>
      </div>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar in Dark Glassmorphism */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#121317]/95 backdrop-blur-2xl md:hidden text-zinc-400 shadow-2xl"
      >
        {navItems.map(([to, l, I]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition ${
                isActive ? 'text-[#DFB76C]' : 'text-zinc-400 hover:text-white'
              }`
            }
          >
            {l === 'Create' ? (
              <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-[#DFB76C] to-[#997D46] text-zinc-950 shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                <I size={16} />
              </span>
            ) : (
              <I size={19} />
            )}
            <span>{l}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
