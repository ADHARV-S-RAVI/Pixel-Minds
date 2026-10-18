import React, { useState } from 'react';
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
  Trash2
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
  `inline-flex items-center justify-center gap-2 min-h-10 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
    v === 'primary'
      ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-sm hover:shadow active:scale-[0.98]'
      : v === 'ghost'
      ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      : v === 'danger'
      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
      : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300'
  } ${c}`;

export const Btn: FC<any> = ({ children, v = 'primary', className = '', ...p }) => (
  <button {...p} className={cls(v, className)}>
    {children}
  </button>
);

export const BtnLink: FC<any> = ({ to, children, v = 'primary', className = '' }) => (
  <Link to={to} className={cls(v, className)}>
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
    className={`rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}
  >
    {children}
  </div>
);

export const Badge: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-100/80 ${className}`}>
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
        className={`rounded-full object-cover shrink-0 ring-2 ring-slate-100 ${className}`}
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
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-sky-200 font-bold text-sky-800 ring-2 ring-white select-none ${className}`}
    >
      {initials || 'PM'}
    </div>
  );
};

export const Logo: FC = () => (
  <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 group">
    <span className="p-1 rounded-lg bg-sky-50 border border-sky-100 transition group-hover:scale-105">
      <PixelMark s={6} />
    </span>
    <span className="text-base font-extrabold text-slate-900 tracking-tight">Pixel Minds</span>
  </Link>
);

export const BackBtn: FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  if (loc.pathname === '/') return null;
  return (
    <button
      aria-label="Go back"
      onClick={() => (loc.key === 'default' ? nav('/') : nav(-1))}
      className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition"
    >
      <ArrowLeft size={20} />
    </button>
  );
};

export const SectionTitle: FC<{ t: string; to?: string; subtitle?: string }> = ({ t, to, subtitle }) => (
  <div className="mb-4 flex items-end justify-between">
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{t}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {to && (
      <Link to={to} className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition">
        View all &rarr;
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
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:shadow hover:brightness-105 active:scale-[0.98] ${className}`}
    >
      <PixelMark s={5} />
      <span>Refer &amp; Earn</span>
      <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">+25</span>
    </button>
  );
};

export const OppCard: FC<{ o: Opp }> = ({ o }) => {
  const { saved, toggle } = useApp();
  const catMeta = getCategoryMeta(o.cat);
  const Ic = catMeta.Icon;
  const on = saved.includes(String(o.id));

  return (
    <Card className="group flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-md hover:border-sky-200">
      <div
        style={{ background: grad(o.cat) }}
        className="relative flex h-28 items-end justify-between overflow-hidden p-3.5"
      >
        <Ic size={96} strokeWidth={1.2} className="absolute -right-4 -top-4 text-white/20 select-none" />
        <span className="relative flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-xs">
          <Ic size={13} className="text-sky-600" />
          {o.cat}
        </span>
        <button
          aria-label={on ? 'Unsave' : 'Save'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(String(o.id));
          }}
          className="relative grid h-8 w-8 place-items-center rounded-full bg-white/95 text-slate-700 hover:bg-white transition shadow-xs"
        >
          <Bookmark size={15} fill={on ? '#0284c7' : 'none'} className={on ? 'text-sky-600' : 'text-slate-600'} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link to={'/opportunities/' + o.id}>
            <h3 className="font-bold text-slate-900 leading-snug hover:text-sky-600 transition line-clamp-1">
              {o.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{o.org}</p>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Calendar size={13} className="text-sky-500" />
            {o.deadline} {o.days ? `· ${o.days}d left` : ''}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-sky-500" />
            {o.mode}
          </span>
          {o.prize && (
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Trophy size={13} className="text-amber-500" />
              {o.prize}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {o.skills.slice(0, 3).map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
          {o.skills.length > 3 && (
            <span className="text-[10px] text-slate-400 font-medium self-center">+{o.skills.length - 3}</span>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <BtnLink to={'/opportunities/' + o.id} v="outline" className="!py-2 !text-xs !min-h-9">
            Details
          </BtnLink>
          <ReferBtn title={o.title} path={'/opportunities/' + o.id} className="!py-2 !text-xs !min-h-9" />
        </div>
      </div>
    </Card>
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
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar name={userName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={40} />
        <textarea
          value={t}
          onChange={(e) => setT(e.target.value)}
          rows={t ? 3 : 1}
          placeholder="Share an update, ask a question, or discuss opportunities..."
          className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {pick && (
        <select
          value={oid}
          onChange={(e) => setOid(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-500"
        >
          <option value={0}>Attach {pick === 'event' ? 'an event' : 'an opportunity'}…</option>
          {list.map((o) => (
            <option key={o.id} value={o.id}>
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
          className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-sky-500 text-slate-800"
        />
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex gap-1 text-slate-500">
          {tools.map(([I, l, f, a]) => (
            <Btn
              key={l}
              v="ghost"
              onClick={f}
              className={`!min-h-8 !px-2.5 !py-1 !text-xs ${a ? '!bg-sky-50 !text-sky-700 border border-sky-200' : ''}`}
            >
              <I size={15} className="text-sky-500" />
              <span className="hidden sm:inline">{l}</span>
            </Btn>
          ))}
        </div>
        <Btn disabled={!t.trim() || posting} onClick={post} className="!min-h-8 !px-4 !py-1 !text-xs disabled:opacity-40">
          <Send size={13} />
          {posting ? 'Posting...' : 'Post'}
        </Btn>
      </div>
    </Card>
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={p.user} size={38} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{p.user}</p>
            <p className="text-xs text-slate-500">
              {p.role} · {p.time}
            </p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            title="Delete post"
            className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-800">{p.text}</p>

      {p.link && (
        <a
          href={p.link}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 flex items-center gap-1.5 truncate text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
        >
          <ExternalLink size={13} />
          {p.link}
        </a>
      )}

      {p.img && <div className="mt-3 h-48 rounded-xl bg-gradient-to-br from-sky-100 via-sky-50 to-slate-100 border border-slate-200/60" />}

      {o && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <div
            style={{ background: grad(o.cat) }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-xs"
          >
            {(() => {
              const Ic = getCategoryMeta(o.cat).Icon;
              return <Ic size={20} />;
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-900">{o.title}</p>
            <p className="text-[11px] text-slate-500">
              {o.org} · {o.deadline} · {o.mode}
            </p>
          </div>
          <BtnLink to={'/opportunities/' + o.id} v="outline" className="!py-1 !px-2.5 !text-xs !min-h-8">
            View
          </BtnLink>
        </div>
      )}

      <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-xs text-slate-600">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition ${
            liked ? 'text-rose-600 font-semibold' : ''
          }`}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          {p.likes + (liked ? 1 : 0)}
        </button>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition ${
            open ? 'text-sky-600 font-semibold' : ''
          }`}
        >
          <MessageCircle size={15} />
          {p.comments + comments.length}
        </button>

        <button
          onClick={() => share(p.text.slice(0, 60), '/feed')}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition"
        >
          <Share2 size={15} />
          Share
        </button>

        <button
          onClick={() => toggle('p' + p.id)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 hover:bg-slate-100 transition ${
            isSaved ? 'text-sky-600 font-semibold' : ''
          }`}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          Save
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
          {comments.map(([n, t], i) => (
            <div key={i} className="flex gap-2 items-start">
              <Avatar name={n} size={26} />
              <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-800 border border-slate-100 flex-1">
                <b className="mr-1.5 font-bold text-slate-900">{n}</b>
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
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-sky-500 text-slate-800"
            />
            <Btn
              onClick={sendComment}
              disabled={!commentText.trim()}
              className="!min-h-8 !px-3 !py-1 !text-xs disabled:opacity-40"
            >
              <Send size={13} />
            </Btn>
          </div>
        </div>
      )}
    </Card>
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
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
    if (target && target.value) {
      navigate(`/opportunities?q=${encodeURIComponent(target.value)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Active Announcement Popup Modal */}
      <AnnouncementModal />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <BackBtn />
          <Logo />

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative hidden max-w-xs flex-1 md:block ml-4">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              name="q"
              placeholder="Search opportunities, events, tags..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:bg-white transition"
            />
          </form>

          {/* Desktop Navigation Links */}
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {[
              ['/opportunities', 'Opportunities'],
              ['/feed', 'Feed'],
              ['/leaderboard', 'Leaderboard']
            ].map(([to, l]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {l}
              </NavLink>
            ))}

            <Link to="/submit" className="ml-2">
              <Btn className="!py-2 !px-3.5 !text-xs !min-h-9 shadow-xs">
                <PlusSquare size={14} />
                Share Opportunity
              </Btn>
            </Link>

            {/* Admin link if role is admin */}
            {userProfile?.role === 'admin' && (
              <Link to="/admin" className="ml-1 text-slate-600 hover:text-sky-600 p-2 rounded-lg" title="Admin Console">
                <ShieldCheck size={18} className="text-sky-600" />
              </Link>
            )}

            {/* Notification Bell */}
            <NotificationBell className="ml-1" />

            {/* Auth User Menu or Sign In */}
            {user ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-sky-200 transition"
                >
                  <Avatar
                    name={userProfile?.displayName || user.displayName || 'User'}
                    photoURL={userProfile?.photoURL || user.photoURL || undefined}
                    size={34}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 pm-in"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {userProfile?.displayName || user.displayName || 'User'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-sky-600">
                        <PixelMark s={4} />
                        <span>{userProfile?.pixels ?? 0} Pixels</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <User size={14} className="text-slate-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Trophy size={14} className="text-slate-400" />
                        Leaderboard &amp; Badges
                      </Link>
                      {userProfile?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                        >
                          <ShieldCheck size={14} className="text-sky-500" />
                          Admin Console
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <BtnLink to="/login" v="ghost" className="!py-2 !px-3 !text-xs !min-h-9">
                  <LogIn size={14} />
                  Log In
                </BtnLink>
                <BtnLink to="/signup" className="!py-2 !px-3.5 !text-xs !min-h-9">
                  Join Free
                </BtnLink>
              </div>
            )}
          </nav>

          {/* Mobile Right Icons */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Link to="/opportunities" aria-label="Search" className="grid h-9 w-9 place-items-center text-slate-600">
              <Search size={19} />
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
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden"
      >
        {navItems.map(([to, l, I]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition ${
                isActive ? 'text-sky-600' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            {l === 'Create' ? (
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500 text-white shadow-xs">
                <I size={17} />
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
