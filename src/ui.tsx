import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode, FC } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  PlusSquare,
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
  LogOut,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Sparkles,
  Rocket,
  Lightbulb,
  BookOpen,
  PenSquare,
  MessageSquare,
  Sun,
  ChevronRight,
  Code2,
  GraduationCap
} from 'lucide-react';
import { opps } from './data';
import type { Opp } from './data';
import { AnnouncementModal } from './components/AnnouncementModal';
import { SidebarGooeyNav } from './components/GooeyNav';
import { grad, getCategoryMeta } from './utils/meta';
import { useApp } from './store';
import { NotificationBell } from './components/NotificationBell';
import { useAuth } from './contexts/AuthContext';
import { createCommunityPost, updateCommunityPost, deleteCommunityPost, formatTimeAgo } from './services/community';

const cls = (v: string, c = '') =>
  `inline-flex items-center justify-center gap-2 min-h-10 rounded-full px-5 py-2.5 text-xs font-bold transition cursor-pointer select-none ${
    v === 'primary'
      ? 'bg-[#112240] text-white hover:bg-[#1a335e] border border-transparent shadow-md shadow-slate-900/10 active:scale-[0.98]'
      : v === 'blue'
      ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-md shadow-blue-500/20 active:scale-[0.98]'
      : v === 'cream' || v === 'outline'
      ? 'bg-white/80 hover:bg-white text-[#0e1b33] border border-white/90 shadow-xs active:scale-[0.98]'
      : v === 'gold'
      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md active:scale-[0.98]'
      : v === 'ghost'
      ? 'text-slate-600 hover:text-[#0e1b33] hover:bg-white/60 active:bg-white/80'
      : v === 'danger'
      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 active:scale-[0.98]'
      : 'border border-white/80 bg-white/70 text-slate-700 hover:bg-white hover:text-[#0e1b33] active:scale-[0.98]'
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
    className={`rounded-3xl border border-white/85 bg-white/75 shadow-sm backdrop-blur-xl text-[#0e1b33] ${className}`}
  >
    {children}
  </div>
);

export const Badge: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-lg bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/80 ${className}`}>
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
        className={`rounded-full object-cover shrink-0 ring-2 ring-white/60 shadow-xs ${className}`}
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
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] font-bold text-white shadow-xs select-none ring-2 ring-white/60 ${className}`}
    >
      {initials || 'PM'}
    </div>
  );
};

export const Logo: FC<{ light?: boolean }> = ({ light = false }) => (
  <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight group shrink-0">
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white shrink-0 group-hover:scale-105 transition-transform">
      <div className="h-4.5 w-4.5 rounded-md border-2 border-white flex items-center justify-center bg-blue-500/40">
        <div className="h-1.5 w-1.5 rounded-xs bg-white" />
      </div>
    </div>
    <span className={`text-base font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#0e1b33]'}`}>
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
        light ? 'text-white hover:bg-white/20' : 'text-slate-700 hover:bg-white/80 active:bg-white border border-transparent hover:border-white/80'
      }`}
    >
      <ArrowLeft size={18} />
    </button>
  );
};

export const SectionTitle: FC<{ t: string; to?: string; subtitle?: string; light?: boolean }> = ({ t, to, subtitle, light = false }) => (
  <div className="mb-5 flex items-end justify-between">
    <div>
      <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${light ? 'text-white' : 'text-[#0e1b33]'}`}>
        {t}
      </h2>
      {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {to && (
      <Link to={to} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition bg-white/60 hover:bg-white px-3 py-1.5 rounded-full border border-white/80 shadow-2xs">
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
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white/80 hover:bg-white text-[#0e1b33] border border-white/90 px-3.5 py-2 text-xs font-bold shadow-xs transition hover:shadow active:scale-[0.98] ${className}`}
    >
      <Share2 size={13} className="text-[#2563eb]" />
      <span>Refer &amp; Earn</span>
      <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">+25</span>
    </button>
  );
};

export const OppCard: FC<{ o: Opp; variant?: 'light' | 'dark' }> = ({ o, variant = 'light' }) => {
  const { saved, toggle } = useApp();
  const on = saved.includes(String(o.id));

  // Dark variant matching reference "Featured Opportunity"
  if (variant === 'dark') {
    return (
      <div className="group relative flex flex-col justify-between rounded-3xl pm-dark-featured p-5 sm:p-6 text-white shadow-xl transition-all duration-300 hover:shadow-2xl overflow-hidden min-h-[310px]">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold text-blue-200">
            <Code2 size={13} className="text-blue-300" />
            <span>{o.cat}</span>
          </span>
          <button
            aria-label={on ? 'Unsave' : 'Save'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(String(o.id));
            }}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white transition shadow-xs cursor-pointer"
          >
            <Bookmark size={15} fill={on ? '#60a5fa' : 'none'} className={on ? 'text-blue-400' : 'text-white'} />
          </button>
        </div>

        {/* Title & Organization */}
        <div className="mb-3">
          <Link to={'/opportunities/' + o.id}>
            <h3 className="font-extrabold text-lg sm:text-xl text-white tracking-tight leading-snug line-clamp-1 group-hover:text-blue-300 transition">
              {o.title}
            </h3>
          </Link>
          <p className="text-xs text-blue-200/70 font-medium mt-1 line-clamp-1">{o.org}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-blue-100/90 mb-3.5">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-blue-300" />
            <span>{o.deadline} {o.days ? `· ${o.days}d left` : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-blue-300" />
            <span>{o.mode}</span>
          </span>
          {o.prize && (
            <span className="flex items-center gap-1.5 font-bold text-amber-300">
              <Trophy size={13} className="text-amber-400" />
              <span>{o.prize}</span>
            </span>
          )}
        </div>

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {o.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg bg-white/10 border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-100">
              {s}
            </span>
          ))}
          {o.skills.length > 3 && (
            <span className="text-[10px] text-blue-200/60 font-medium self-center">
              +{o.skills.length - 3}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 mt-auto">
          <Link
            to={'/opportunities/' + o.id}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-[#1d3557] hover:bg-[#274775] border border-white/15 px-3 py-2 text-xs font-bold text-white transition active:scale-[0.98]"
          >
            <span>View Details</span>
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: o.title, url: window.location.origin + '/opportunities/' + o.id }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.origin + '/opportunities/' + o.id);
              }
            }}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
          >
            <Share2 size={13} />
            <span>Refer &amp; Earn</span>
            <span className="rounded-md bg-white/15 px-1 py-0.2 text-[10px] font-extrabold text-blue-200">+25</span>
          </button>
        </div>
      </div>
    );
  }

  // Light variant matching reference "Trending Opportunities"
  const isHackathon = o.cat.toLowerCase().includes('hackathon');
  const isInternship = o.cat.toLowerCase().includes('internship');
  const isScholarship = o.cat.toLowerCase().includes('scholarship');

  return (
    <div className="group relative flex flex-col justify-between rounded-[22px] pm-glass-card p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-white/85 text-[#0e1b33] overflow-hidden min-h-[220px]">
      <div>
        {/* Top Header: Category Tag & Save Bookmark */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {isHackathon ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 border border-blue-200/80 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              <Code2 size={12} className="text-blue-600" />
              <span>Hackathon</span>
            </span>
          ) : isInternship ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <Briefcase size={12} className="text-emerald-600" />
              <span>Internship</span>
            </span>
          ) : isScholarship ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              <GraduationCap size={12} className="text-amber-600" />
              <span>Scholarship</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              <span>{o.cat}</span>
            </span>
          )}

          <button
            aria-label={on ? 'Unsave' : 'Save'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(String(o.id));
            }}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/70 hover:bg-white border border-white/80 text-slate-500 hover:text-blue-600 transition shadow-2xs cursor-pointer"
          >
            <Bookmark size={14} fill={on ? '#2563eb' : 'none'} className={on ? 'text-blue-600' : 'text-slate-500'} />
          </button>
        </div>

        {/* Title & Organization */}
        <div className="mb-2">
          <Link to={'/opportunities/' + o.id}>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0e1b33] tracking-tight leading-snug line-clamp-1 group-hover:text-blue-600 transition">
              {o.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{o.org}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-2">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <span>{o.deadline} {o.days ? `· ${o.days}d left` : ''}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            <span>{o.mode}</span>
          </span>
        </div>
      </div>

      {/* Skill Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-200/50">
        {o.skills.slice(0, 3).map((s) => (
          <span key={s} className="rounded-lg bg-white/90 border border-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
            {s}
          </span>
        ))}
        {o.skills.length > 3 && (
          <span className="text-[10px] text-slate-400 font-medium self-center">
            +{o.skills.length - 3}
          </span>
        )}
      </div>
    </div>
  );
};

export const Composer: FC<{ onPostCreated?: (p: any) => void }> = ({ onPostCreated }) => {
  const { addPost, say } = useApp();
  const { userProfile, user } = useAuth();
  const [composerMode, setComposerMode] = useState<'update' | 'hackathon'>('update');

  // Standard Update / Experience state
  const [t, setT] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Experience' | 'Achievement' | 'Idea' | 'Learning' | 'General'>('Experience');
  const [pick, setPick] = useState('');
  const [oid, setOid] = useState<number | string>(0);
  const [lnk, setLnk] = useState('');
  const [showL, setShowL] = useState(false);

  // Share Upcoming Hackathon form state
  const [hName, setHName] = useState('');
  const [hDate, setHDate] = useState('');
  const [hLoc, setHLoc] = useState('');
  const [hLink, setHLink] = useState('');
  const [hDesc, setHDesc] = useState('');

  const [posting, setPosting] = useState(false);

  const userName = userProfile?.displayName || user?.displayName || 'Community Builder';
  const list = pick === 'event' ? opps.filter((o) => ['Events', 'Workshops', 'Conferences'].includes(o.cat)) : opps;

  const categories = [
    { id: 'Experience', label: 'Experience', icon: Sparkles },
    { id: 'Achievement', label: 'Achievement', icon: Trophy },
    { id: 'Idea', label: 'Idea', icon: Lightbulb },
    { id: 'Learning', label: 'Learning', icon: BookOpen },
    { id: 'General', label: 'General', icon: MessageSquare }
  ] as const;

  const postStandard = async () => {
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
          role: userProfile?.role || 'Pixel Member'
        },
        {
          text: t.trim(),
          category: selectedCategory,
          opp: oid || undefined,
          link: lnk.trim() || undefined,
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
      say(`Shared ${selectedCategory.toLowerCase()} with community (+10 Pixels)`);
    } catch (err: any) {
      console.error('Failed to create post:', err);
      say(err?.message || 'Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const postHackathon = async () => {
    if (!hName.trim() || !hDate.trim() || !hLoc.trim() || !hLink.trim()) {
      say('Please fill in hackathon name, date, location, and registration link');
      return;
    }
    if (!user?.uid) {
      say('Please sign in to share a hackathon');
      return;
    }

    setPosting(true);
    try {
      const formattedText = `🚀 Upcoming Hackathon: ${hName.trim()}\n📅 Dates: ${hDate.trim()}\n📍 Location: ${hLoc.trim()}\n🔗 Registration: ${hLink.trim()}\n\n${hDesc.trim() || 'Upcoming hackathon shared by the Pixel Minds community. Check the registration link for full participation guidelines and tracks!'}`;

      const newPost = await createCommunityPost(
        {
          id: user.uid,
          displayName: userName,
          role: userProfile?.role || 'Pixel Member'
        },
        {
          text: formattedText,
          category: 'Upcoming Hackathon',
          link: hLink.trim(),
          status: 'published'
        }
      );

      if (onPostCreated) {
        onPostCreated(newPost);
      } else {
        addPost(newPost);
      }

      setHName('');
      setHDate('');
      setHLoc('');
      setHLink('');
      setHDesc('');
      setComposerMode('update');
      say('Upcoming hackathon shared with community! (+15 Pixels)');
    } catch (err: any) {
      console.error('Failed to share hackathon:', err);
      say(err?.message || 'Failed to share hackathon. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const tools: [any, string, () => void, boolean][] = [
    [Briefcase, 'Attach Opportunity', () => { setPick(pick === 'opp' ? '' : 'opp'); setOid(0); }, pick === 'opp'],
    [CalendarDays, 'Attach Event', () => { setPick(pick === 'event' ? '' : 'event'); setOid(0); }, pick === 'event'],
    [Link2, 'Add Link', () => setShowL(!showL), showL]
  ];

  return (
    <div className="rounded-3xl pm-glass-card border border-white/90 p-5 sm:p-6 shadow-sm text-[#0e1b33]">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-slate-200/60 pb-3 mb-4 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setComposerMode('update')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            composerMode === 'update'
              ? 'bg-blue-100/90 text-[#2563eb] shadow-xs border border-blue-200/80'
              : 'text-slate-600 hover:text-[#0e1b33] hover:bg-white/60'
          }`}
        >
          <PenSquare size={14} />
          <span>Share Experience / Idea</span>
        </button>

        <button
          type="button"
          onClick={() => setComposerMode('hackathon')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            composerMode === 'hackathon'
              ? 'bg-blue-100/90 text-[#2563eb] shadow-xs border border-blue-200/80'
              : 'text-slate-600 hover:text-[#0e1b33] hover:bg-white/60'
          }`}
        >
          <Rocket size={14} />
          <span>Share Upcoming Hackathon</span>
        </button>
      </div>

      {composerMode === 'hackathon' ? (
        /* ================= Share Upcoming Hackathon Form ================= */
        <div className="space-y-3.5">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-200/80 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
            <Rocket size={16} className="text-[#2563eb] shrink-0 mt-0.5" />
            <p>
              Know an upcoming hackathon? Share the details with the community to help fellow developers discover opportunities and form teams!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Hackathon Name <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                placeholder="e.g. Smart India Hackathon 2026"
                className="w-full rounded-xl bg-white/70 border border-white/90 px-3.5 py-2 text-xs text-[#0e1b33] outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Date / Schedule <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                placeholder="e.g. Nov 14 - 16, 2026 (or Deadline)"
                className="w-full rounded-xl bg-white/70 border border-white/90 px-3.5 py-2 text-xs text-[#0e1b33] outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Location & Mode <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hLoc}
                onChange={(e) => setHLoc(e.target.value)}
                placeholder="e.g. Online (Virtual), Bengaluru, or Hybrid"
                className="w-full rounded-xl bg-white/70 border border-white/90 px-3.5 py-2 text-xs text-[#0e1b33] outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Registration Link (URL) <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hLink}
                onChange={(e) => setHLink(e.target.value)}
                type="url"
                placeholder="https://hackathon-website.com/register"
                className="w-full rounded-xl bg-white/70 border border-white/90 px-3.5 py-2 text-xs text-[#0e1b33] outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Description & Highlights (Prizes, tracks, or teammate callouts)
            </label>
            <textarea
              value={hDesc}
              onChange={(e) => setHDesc(e.target.value)}
              rows={2}
              placeholder="Themes (AI, Web3, CleanTech), eligibility, cash prizes, or if you are looking to assemble a squad..."
              className="w-full resize-none rounded-xl bg-white/70 border border-white/90 px-3.5 py-2.5 text-xs text-[#0e1b33] outline-none focus:border-blue-500 focus:bg-white placeholder-slate-400 transition"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
            <span className="text-[11px] text-slate-500">Strictly text-only · No uploads needed</span>
            <button
              disabled={!hName.trim() || !hDate.trim() || !hLoc.trim() || !hLink.trim() || posting}
              onClick={postHackathon}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
            >
              <Rocket size={13} />
              <span>{posting ? 'Publishing...' : 'Share Hackathon'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= Standard Experience / Update Form ================= */
        <div className="space-y-3.5">
          {/* Category Tag Selection */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 mr-1">Topic:</span>
            {categories.map((c) => {
              const IconComp = c.icon;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-100/90 text-[#2563eb] border border-blue-200/80 shadow-xs'
                      : 'bg-white/60 text-slate-600 border border-white/80 hover:text-[#0e1b33] hover:bg-white'
                  }`}
                >
                  <IconComp size={11} className={isSelected ? 'text-[#2563eb]' : 'text-slate-500'} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Avatar name={userName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={40} />
            <div className="flex-1 space-y-1">
              <textarea
                value={t}
                onChange={(e) => setT(e.target.value)}
                maxLength={1200}
                rows={t ? 3 : 2}
                placeholder={
                  selectedCategory === 'Experience'
                    ? 'Share your hackathon recap, sprint experience, or takeaways...'
                    : selectedCategory === 'Achievement'
                    ? 'Share your hackathon win, podium finish, grant, or milestone...'
                    : selectedCategory === 'Idea'
                    ? 'Pitch a problem statement or hackathon project idea to brainstorm with the community...'
                    : selectedCategory === 'Learning'
                    ? 'Share key tech insights, architecture tips, or lessons from your builds...'
                    : 'Share an update or ask a question to fellow builders...'
                }
                className="w-full resize-none rounded-2xl bg-white/70 border border-white/90 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-blue-500 focus:bg-white text-[#0e1b33] placeholder:text-slate-400 transition leading-relaxed shadow-2xs"
              />
              <div className="flex justify-end text-[10px] text-slate-400">
                {t.length}/1200
              </div>
            </div>
          </div>

          {pick && (
            <select
              value={oid}
              onChange={(e) => setOid(e.target.value)}
              className="w-full rounded-xl bg-white/70 border border-white/90 px-3 py-2 text-xs text-[#0e1b33] outline-none focus:border-blue-500"
            >
              <option value={0} className="bg-white text-slate-700">Attach {pick === 'event' ? 'an event' : 'an opportunity'}…</option>
              {list.map((o) => (
                <option key={o.id} value={o.id} className="bg-white text-[#0e1b33]">
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
              placeholder="https://example.com/github-repo-or-resource"
              className="w-full rounded-xl bg-white/70 border border-white/90 px-3.5 py-2 text-xs outline-none focus:border-blue-500 text-[#0e1b33] placeholder-slate-400"
            />
          )}

          <div className="flex items-center justify-between border-t border-slate-200/60 pt-3">
            <div className="flex gap-1.5 text-slate-500">
              {tools.map(([I, l, f, a]) => (
                <button
                  key={l}
                  onClick={f}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    a
                      ? 'bg-blue-100/90 text-[#2563eb] border border-blue-200/80'
                      : 'text-slate-600 hover:text-[#0e1b33] hover:bg-white/70'
                  }`}
                >
                  <I size={13} className={a ? 'text-[#2563eb]' : 'text-slate-500'} />
                  <span className="hidden sm:inline">{l}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!t.trim() || posting}
              onClick={postStandard}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
            >
              <Send size={13} />
              <span>{posting ? 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export interface PostCommentItem {
  id: string;
  authorName: string;
  authorRole?: string;
  authorId?: string;
  text: string;
  createdAt: number;
}

export const PostCard: FC<{ p: any; onPostDeleted?: (id: string) => void }> = ({ p, onPostDeleted }) => {
  const { saved, toggle, say } = useApp();
  const { userProfile, user } = useAuth();
  const o = opps.find((x) => String(x.id) === String(p.opp));

  // Likes state with localStorage persistence
  const [liked, setLiked] = useState(() => {
    try {
      return localStorage.getItem(`pm_post_liked_${p.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [likesCount, setLikesCount] = useState<number>(p.likes || 0);

  // Comments state with localStorage persistence & seeding
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostCommentItem[]>(() => {
    try {
      const stored = localStorage.getItem(`pm_post_comments_${p.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    // Seed initial comments for mock posts if comments > 0
    if (p.comments > 0 && String(p.id).startsWith('post-')) {
      return [
        {
          id: 'c1_' + p.id,
          authorName: 'Aarav Mehta',
          authorRole: 'Pixel Member',
          authorId: 'user-aarav',
          text: 'Great share! Bookmarked this.',
          createdAt: Date.now() - 3600000
        }
      ];
    }
    return [];
  });
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const isSaved = saved.includes('p' + p.id);
  const currentUserName = userProfile?.displayName || user?.displayName || 'Community Member';
  const canDelete = user && (user.uid === p.userId || userProfile?.role === 'admin');

  // Handle Like toggle
  const handleLike = async () => {
    const nextLiked = !liked;
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikesCount(nextCount);
    try {
      localStorage.setItem(`pm_post_liked_${p.id}`, String(nextLiked));
      await updateCommunityPost(String(p.id), { likes: nextCount });
    } catch (err) {
      console.warn('Could not sync like to server:', err);
    }
  };

  // Handle send comment
  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    const newComment: PostCommentItem = {
      id: 'c_' + Date.now(),
      authorName: currentUserName,
      authorRole: userProfile?.role || 'Pixel Member',
      authorId: user?.uid,
      text: commentText.trim(),
      createdAt: Date.now()
    };
    const updated = [...comments, newComment];
    setComments(updated);
    setCommentText('');
    try {
      localStorage.setItem(`pm_post_comments_${p.id}`, JSON.stringify(updated));
      await updateCommunityPost(String(p.id), { comments: updated.length });
      say('Comment posted (+2 Pixels)');
    } catch (err) {
      console.warn('Could not sync comment to server:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle share link
  const handleShare = () => {
    const url = `${window.location.origin}/feed#${p.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      say('Post link copied to clipboard!');
    } else {
      say('Post link ready to share');
    }
  };

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

  if (deleting) return null;

  // Check if upcoming hackathon post
  const isHackathon =
    p.category === 'Upcoming Hackathon' ||
    p.category === 'Hackathon' ||
    (typeof p.text === 'string' && p.text.includes('🚀 Upcoming Hackathon:'));

  const parsedDetails = isHackathon
    ? (() => {
        if (p.hackathonDetails) return p.hackathonDetails;
        const text = p.text || '';
        const nameMatch = text.match(/Upcoming Hackathon:\s*([^\n]+)/i);
        const dateMatch = text.match(/Dates?:\s*([^\n]+)/i);
        const locMatch = text.match(/Location:\s*([^\n]+)/i);
        const linkMatch = text.match(/Registration:\s*([^\n]+)/i);
        const parts = text.split(/\n\s*\n/);
        const desc = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

        return {
          name: nameMatch ? nameMatch[1].replace(/^\*\*|\*\*$/g, '').trim() : 'Upcoming Hackathon',
          date: dateMatch ? dateMatch[1].replace(/^\*\*|\*\*$/g, '').trim() : '',
          location: locMatch ? locMatch[1].replace(/^\*\*|\*\*$/g, '').trim() : '',
          link: p.link || (linkMatch ? linkMatch[1].replace(/^\*\*|\*\*$/g, '').trim() : ''),
          description: desc.trim()
        };
      })()
    : null;

  const authorProfileUrl = p.userId
    ? `/profile?uid=${p.userId}&name=${encodeURIComponent(p.user)}`
    : `/profile?name=${encodeURIComponent(p.user)}`;

  return (
    <div id={String(p.id)} className="rounded-3xl pm-glass-card border border-white/90 p-5 sm:p-6 shadow-sm text-[#0e1b33] transition hover:shadow-md">
      {/* Author Header */}
      <div className="flex items-center justify-between gap-3">
        <Link to={authorProfileUrl} className="flex items-center gap-3 min-w-0 group cursor-pointer">
          <Avatar name={p.user} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0e1b33] truncate group-hover:text-blue-600 transition">
              {p.user}
            </p>
            <p className="text-xs text-slate-500">
              {p.role} · {p.time}
            </p>
          </div>
        </Link>
        {canDelete && (
          <button
            onClick={handleDelete}
            title="Delete post"
            className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Post Content */}
      {isHackathon && parsedDetails ? (
        /* Structured Hackathon Highlight Box */
        <div className="mt-3.5 rounded-2xl bg-white/80 border border-blue-200/80 p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 uppercase tracking-wider">
              <Rocket size={12} />
              Upcoming Hackathon
            </span>
            {parsedDetails.link && (
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                <span>Registration Link</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div>
            <h3 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-[#0e1b33]">
              {parsedDetails.name}
            </h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {parsedDetails.date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-900 border border-blue-200/60 font-medium">
                  <Calendar size={12} className="text-blue-600" />
                  {parsedDetails.date}
                </span>
              )}
              {parsedDetails.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-900 border border-blue-200/60 font-medium">
                  <MapPin size={12} className="text-blue-600" />
                  {parsedDetails.location}
                </span>
              )}
            </div>
          </div>

          {parsedDetails.description && (
            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {parsedDetails.description}
            </p>
          )}

          {parsedDetails.link && (
            <div className="pt-1.5">
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[#112240] hover:bg-[#1a335e] px-5 py-2.5 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition cursor-pointer"
              >
                <span>Register for Hackathon</span>
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Regular Text Post */
        <div className="mt-3.5 space-y-2.5">
          {p.category && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  p.category === 'Achievement'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : p.category === 'Idea'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : p.category === 'Learning'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : p.category === 'Experience'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {p.category === 'Achievement' && <Trophy size={11} />}
                {p.category === 'Idea' && <Lightbulb size={11} />}
                {p.category === 'Learning' && <BookOpen size={11} />}
                {p.category === 'Experience' && <Sparkles size={11} />}
                <span>{p.category}</span>
              </span>
            </div>
          )}

          <p className="text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{p.text}</p>

          {p.link && (
            <a
              href={p.link}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 truncate text-xs font-semibold text-blue-600 hover:underline"
            >
              <ExternalLink size={13} />
              <span>{p.link}</span>
            </a>
          )}
        </div>
      )}

      {/* Attached Opportunity Preview (if linked) */}
      {o && (
        <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-white/90 bg-white/70 p-3">
          <div
            style={{ background: grad(o.cat) }}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-xs border border-white/10"
          >
            {(() => {
              const Ic = getCategoryMeta(o.cat).Icon;
              return <Ic size={20} className="text-white" />;
            })()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[#0e1b33]">{o.title}</p>
            <p className="text-[11px] text-slate-500">
              {o.org} · {o.deadline} · {o.mode}
            </p>
          </div>
          <Link
            to={'/opportunities/' + o.id}
            className="rounded-lg bg-white hover:bg-slate-50 text-[#0e1b33] px-3 py-1.5 text-xs font-semibold border border-slate-200 shadow-2xs"
          >
            View
          </Link>
        </div>
      )}

      {/* Interaction Bar */}
      <div className="mt-4 flex justify-between border-t border-slate-200/60 pt-2.5 text-xs text-slate-600">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/70 transition cursor-pointer ${
            liked ? 'text-rose-600 font-semibold' : ''
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} className={liked ? 'scale-110 transition-transform' : ''} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/70 transition cursor-pointer ${
            open ? 'text-blue-600 font-semibold' : ''
          }`}
          title="Comments"
        >
          <MessageCircle size={15} />
          <span>{comments.length > 0 ? comments.length : (p.comments || 0)}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/70 transition cursor-pointer"
          title="Share"
        >
          <Share2 size={15} />
          <span>Share</span>
        </button>

        <button
          onClick={() => toggle('p' + p.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/70 transition cursor-pointer ${
            isSaved ? 'text-blue-600 font-semibold' : ''
          }`}
          title={isSaved ? 'Unsave' : 'Save'}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          <span>Save</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {open && (
        <div className="mt-3.5 space-y-3 border-t border-slate-200/60 pt-3">
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {comments.length > 0 ? (
              comments.map((c) => {
                const commentUserUrl = c.authorId
                  ? `/profile?uid=${c.authorId}&name=${encodeURIComponent(c.authorName)}`
                  : `/profile?name=${encodeURIComponent(c.authorName)}`;
                return (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <Link to={commentUserUrl}>
                      <Avatar name={c.authorName} size={28} />
                    </Link>
                    <div className="rounded-2xl bg-white/80 px-3.5 py-2.5 text-xs text-slate-700 border border-white/90 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link
                          to={commentUserUrl}
                          className="font-bold text-[#0e1b33] hover:text-blue-600 transition"
                        >
                          {c.authorName}
                        </Link>
                        {c.createdAt && (
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(c.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-slate-600">{c.text}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-1 text-center">No comments yet. Start the conversation!</p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Avatar name={currentUserName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={30} />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
              placeholder="Add a comment to this discussion…"
              className="min-w-0 flex-1 rounded-full bg-white/70 border border-white/90 px-4 py-2 text-xs outline-none focus:border-blue-500 text-[#0e1b33] placeholder-slate-400"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || submittingComment}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#112240] text-white font-bold disabled:opacity-40 transition cursor-pointer shrink-0 hover:bg-[#1a335e]"
              title="Post comment"
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
  ['/opportunities', 'Explore', Trophy],
  ['/submit', 'Create', PlusSquare],
  ['/feed', 'Feed', MessageSquare],
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

  const displayName = userProfile?.displayName || user?.displayName || 'Nithin N';

  return (
    <div className="min-h-screen pm-bg-canvas flex flex-col lg:flex-row p-3 sm:p-5 lg:p-6 gap-5 selection:bg-blue-500/20 selection:text-[#0e1b33]">
      {/* Active Announcement Popup Modal */}
      <AnnouncementModal />

      {/* ============================================================ */}
      {/* 1. LEFT VERTICAL SIDEBAR (Desktop matching reference image) */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex w-60 xl:w-64 shrink-0 flex-col justify-between pm-glass rounded-[28px] p-5 sticky top-6 self-start min-h-[calc(100vh-3rem)] shadow-lg shadow-blue-900/5">
        <div>
          {/* Logo */}
          <div className="px-2 pt-1 pb-6">
            <Logo />
          </div>

          {/* Navigation Links with GooeyNav liquid animation effect */}
          <SidebarGooeyNav isAdmin={userProfile?.role === 'admin'} />
        </div>

        {/* Bottom User Profile Widget */}
        <div className="pt-4 border-t border-slate-200/50">
          <Link
            to={user ? '/profile' : '/login'}
            className="flex items-center gap-3 p-2 rounded-2xl bg-white/40 hover:bg-white/90 border border-white/60 hover:border-white/90 transition shadow-xs group"
          >
            <Avatar
              name={displayName}
              photoURL={userProfile?.photoURL || user?.photoURL || undefined}
              size={36}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0e1b33] truncate group-hover:text-blue-600 transition">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user ? 'View Profile' : 'Sign In'}
              </p>
            </div>
            <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. RIGHT SECTION: TOP NAV BAR + MAIN CONTENT */}
      {/* ============================================================ */}
      <div className="flex-1 min-w-0 flex flex-col gap-5 pb-20 lg:pb-0">
        {/* Top Navigation Bar */}
        <header className="pm-glass rounded-[24px] sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 shadow-sm">
          {/* Mobile Logo on left */}
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>

          {/* Search Bar matching reference image */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl hidden sm:block">
            <Search size={16} className="absolute left-4 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              name="q"
              placeholder="Search opportunities, events, tags..."
              className="w-full rounded-full bg-white/70 hover:bg-white/90 focus:bg-white border border-white/90 py-2.5 pl-11 pr-16 text-xs text-[#0e1b33] placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition shadow-xs"
            />
            <span className="absolute right-4 top-2.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-200 select-none shadow-2xs">
              Ctrl K
            </span>
          </form>

          {/* Right Controls matching reference: Sun toggle, + Share Opportunity, NotificationBell */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Sun Theme Toggle */}
            <button
              aria-label="Toggle theme"
              onClick={() => {}}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/70 hover:bg-white text-slate-700 border border-white/90 shadow-xs transition hover:text-blue-600 cursor-pointer"
            >
              <Sun size={18} />
            </button>

            {/* + Share Opportunity (Navy Blue Button) */}
            <Link to="/submit">
              <button className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white px-4 sm:px-5 py-2.5 text-xs font-bold shadow-md shadow-slate-900/10 transition active:scale-[0.98] cursor-pointer">
                <span className="text-sm font-black leading-none">+</span>
                <span className="hidden sm:inline">Share Opportunity</span>
                <span className="sm:hidden">Share</span>
              </button>
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Avatar Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-blue-500/40 transition cursor-pointer"
                >
                  <Avatar
                    name={displayName}
                    photoURL={userProfile?.photoURL || user.photoURL || undefined}
                    size={36}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-3 w-56 rounded-3xl border border-white/90 bg-white/95 backdrop-blur-2xl p-2.5 shadow-2xl z-50 text-[#0e1b33] pm-in"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-200/60">
                      <p className="text-xs font-bold text-[#0e1b33] truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <Sparkles size={13} className="text-blue-500" />
                        <span>{userProfile?.pixels ?? 0} Pixels</span>
                      </div>
                    </div>

                    <div className="py-1.5">
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/70 hover:text-blue-600 transition"
                      >
                        <User size={14} className="text-slate-400" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100/70 hover:text-blue-600 transition"
                      >
                        <Trophy size={14} className="text-amber-500" />
                        <span>Leaderboard &amp; Badges</span>
                      </Link>
                      {userProfile?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                        >
                          <ShieldCheck size={14} />
                          <span>Admin Console</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-200/60 pt-1.5">
                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-white/70 hover:bg-white text-[#0e1b33] font-bold text-xs px-3.5 py-2 shadow-xs transition active:scale-[0.98]"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Search Bar for small screens */}
        <div className="sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search size={16} className="absolute left-4 top-3 text-slate-400" />
            <input
              name="q"
              placeholder="Search opportunities, events, tags..."
              className="w-full rounded-full bg-white/70 hover:bg-white/90 focus:bg-white border border-white/90 py-2.5 pl-11 pr-4 text-xs text-[#0e1b33] placeholder-slate-400 outline-none focus:border-blue-500 shadow-xs"
            />
          </form>
        </div>

        {/* Main Routed Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar in Frosted Glass */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/90 bg-white/85 backdrop-blur-2xl lg:hidden text-slate-500 shadow-xl"
      >
        {navItems.map(([to, l, I]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition ${
                isActive ? 'text-[#2563eb]' : 'text-slate-500 hover:text-[#0e1b33]'
              }`
            }
          >
            {l === 'Create' ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#112240] text-white shadow-md shadow-slate-900/15">
                <I size={16} />
              </span>
            ) : (
              <I size={18} />
            )}
            <span>{l}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
