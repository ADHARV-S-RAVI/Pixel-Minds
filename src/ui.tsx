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
  ArrowRight,
  Sparkles,
  Rocket,
  Lightbulb,
  BookOpen,
  PenSquare,
  MessageSquare
} from 'lucide-react';
import { opps } from './data';
import type { Opp } from './data';
import { AnnouncementModal } from './components/AnnouncementModal';
import { grad, getCategoryMeta } from './utils/meta';
import { useApp } from './store';
import { PixelMark } from './components/PixelMark';
import { NotificationBell } from './components/NotificationBell';
import { useAuth } from './contexts/AuthContext';
import { createCommunityPost, updateCommunityPost, deleteCommunityPost, formatTimeAgo } from './services/community';

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
    <div className="rounded-3xl bg-[#141418]/92 backdrop-blur-2xl border border-white/12 p-5 sm:p-6 shadow-xl text-white">
      {/* Mode Selector Tabs */}
      <div className="flex border-b border-white/10 pb-3 mb-4 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setComposerMode('update')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            composerMode === 'update'
              ? 'bg-white/12 text-[#DFB76C] shadow-xs border border-[#C5A059]/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/6'
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
              ? 'bg-white/12 text-[#DFB76C] shadow-xs border border-[#C5A059]/40'
              : 'text-zinc-400 hover:text-white hover:bg-white/6'
          }`}
        >
          <Rocket size={14} />
          <span>Share Upcoming Hackathon</span>
        </button>
      </div>

      {composerMode === 'hackathon' ? (
        /* ================= Share Upcoming Hackathon Form ================= */
        <div className="space-y-3.5">
          <div className="rounded-2xl bg-[#C5A059]/10 border border-[#C5A059]/25 p-3.5 text-xs text-[#EAD5AB] flex items-start gap-2.5">
            <Rocket size={16} className="text-[#DFB76C] shrink-0 mt-0.5" />
            <p>
              Know an upcoming hackathon? Share the details with the community to help fellow developers discover opportunities and form teams!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Hackathon Name <span className="text-[#DFB76C]">*</span>
              </label>
              <input
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                placeholder="e.g. Smart India Hackathon 2026"
                className="w-full rounded-xl bg-white/6 border border-white/12 px-3.5 py-2 text-xs text-white outline-none focus:border-[#C5A059]/70 placeholder-zinc-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Date / Schedule <span className="text-[#DFB76C]">*</span>
              </label>
              <input
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                placeholder="e.g. Nov 14 - 16, 2026 (or Deadline)"
                className="w-full rounded-xl bg-white/6 border border-white/12 px-3.5 py-2 text-xs text-white outline-none focus:border-[#C5A059]/70 placeholder-zinc-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Location & Mode <span className="text-[#DFB76C]">*</span>
              </label>
              <input
                value={hLoc}
                onChange={(e) => setHLoc(e.target.value)}
                placeholder="e.g. Online (Virtual), Bengaluru, or Hybrid"
                className="w-full rounded-xl bg-white/6 border border-white/12 px-3.5 py-2 text-xs text-white outline-none focus:border-[#C5A059]/70 placeholder-zinc-500 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Registration Link (URL) <span className="text-[#DFB76C]">*</span>
              </label>
              <input
                value={hLink}
                onChange={(e) => setHLink(e.target.value)}
                type="url"
                placeholder="https://hackathon-website.com/register"
                className="w-full rounded-xl bg-white/6 border border-white/12 px-3.5 py-2 text-xs text-white outline-none focus:border-[#C5A059]/70 placeholder-zinc-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Description & Highlights (Prizes, tracks, or teammate callouts)
            </label>
            <textarea
              value={hDesc}
              onChange={(e) => setHDesc(e.target.value)}
              rows={2}
              placeholder="Themes (AI, Web3, CleanTech), eligibility, cash prizes, or if you are looking to assemble a squad..."
              className="w-full resize-none rounded-xl bg-white/6 border border-white/12 px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#C5A059]/70 placeholder-zinc-500 transition"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[11px] text-zinc-400">Strictly text-only · No uploads needed</span>
            <button
              disabled={!hName.trim() || !hDate.trim() || !hLoc.trim() || !hLink.trim() || posting}
              onClick={postHackathon}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#C5A059] to-[#DFB76C] px-5 py-2 text-xs font-bold text-zinc-950 shadow-sm hover:brightness-105 disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
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
            <span className="text-[11px] font-semibold text-zinc-400 mr-1">Topic:</span>
            {categories.map((c) => {
              const IconComp = c.icon;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#C5A059]/20 text-[#DFB76C] border border-[#C5A059]/50 shadow-xs'
                      : 'bg-white/6 text-zinc-400 border border-white/8 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <IconComp size={11} className={isSelected ? 'text-[#DFB76C]' : 'text-zinc-400'} />
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
                className="w-full resize-none rounded-2xl bg-white/6 border border-white/10 px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-[#C5A059]/70 text-white placeholder:text-zinc-500 transition leading-relaxed"
              />
              <div className="flex justify-end text-[10px] text-zinc-500">
                {t.length}/1200
              </div>
            </div>
          </div>

          {pick && (
            <select
              value={oid}
              onChange={(e) => setOid(e.target.value)}
              className="w-full rounded-xl bg-white/8 border border-white/12 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-[#C5A059]/70"
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
              placeholder="https://example.com/github-repo-or-resource"
              className="w-full rounded-xl bg-white/8 border border-white/12 px-3.5 py-2 text-xs outline-none focus:border-[#C5A059]/70 text-white placeholder-zinc-500"
            />
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-3">
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
                  <I size={13} className={a ? 'text-[#DFB76C]' : 'text-zinc-400'} />
                  <span className="hidden sm:inline">{l}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!t.trim() || posting}
              onClick={postStandard}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#C5A059] to-[#DFB76C] px-5 py-2 text-xs font-bold text-zinc-950 shadow-sm hover:brightness-105 disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
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
    <div id={String(p.id)} className="rounded-3xl bg-[#141418]/90 backdrop-blur-2xl border border-white/12 p-5 sm:p-6 shadow-xl text-white transition hover:border-white/20">
      {/* Author Header */}
      <div className="flex items-center justify-between gap-3">
        <Link to={authorProfileUrl} className="flex items-center gap-3 min-w-0 group cursor-pointer">
          <Avatar name={p.user} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate group-hover:text-[#DFB76C] transition">
              {p.user}
            </p>
            <p className="text-xs text-zinc-400">
              {p.role} · {p.time}
            </p>
          </div>
        </Link>
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

      {/* Post Content */}
      {isHackathon && parsedDetails ? (
        /* Structured Hackathon Highlight Box */
        <div className="mt-3.5 rounded-2xl bg-gradient-to-br from-[#1C1D24] to-[#121317] border border-[#C5A059]/35 p-4 sm:p-5 space-y-3.5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C5A059]/20 text-[#DFB76C] text-[11px] font-bold border border-[#C5A059]/40 uppercase tracking-wider">
              <Rocket size={12} />
              Upcoming Hackathon
            </span>
            {parsedDetails.link && (
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#DFB76C] hover:underline"
              >
                <span>Registration Link</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div>
            <h3 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-white">
              {parsedDetails.name}
            </h3>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
              {parsedDetails.date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 text-zinc-300 border border-white/10">
                  <Calendar size={12} className="text-[#C5A059]" />
                  {parsedDetails.date}
                </span>
              )}
              {parsedDetails.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 text-zinc-300 border border-white/10">
                  <MapPin size={12} className="text-[#DFB76C]" />
                  {parsedDetails.location}
                </span>
              )}
            </div>
          </div>

          {parsedDetails.description && (
            <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
              {parsedDetails.description}
            </p>
          )}

          {parsedDetails.link && (
            <div className="pt-1.5">
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#C5A059] to-[#DFB76C] px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-md hover:brightness-105 active:scale-[0.98] transition cursor-pointer"
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
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : p.category === 'Idea'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : p.category === 'Learning'
                    ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                    : p.category === 'Experience'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-white/8 text-zinc-300 border-white/10'
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

          <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">{p.text}</p>

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
        </div>
      )}

      {/* Attached Opportunity Preview (if linked) */}
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

      {/* Interaction Bar */}
      <div className="mt-4 flex justify-between border-t border-white/10 pt-2.5 text-xs text-zinc-300">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            liked ? 'text-rose-400 font-semibold' : ''
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} className={liked ? 'scale-110 transition-transform' : ''} />
          <span>{likesCount}</span>
        </button>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            open ? 'text-[#DFB76C] font-semibold' : ''
          }`}
          title="Comments"
        >
          <MessageCircle size={15} />
          <span>{comments.length > 0 ? comments.length : (p.comments || 0)}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer"
          title="Share"
        >
          <Share2 size={15} />
          <span>Share</span>
        </button>

        <button
          onClick={() => toggle('p' + p.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/8 transition cursor-pointer ${
            isSaved ? 'text-[#DFB76C] font-semibold' : ''
          }`}
          title={isSaved ? 'Unsave' : 'Save'}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          <span>Save</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {open && (
        <div className="mt-3.5 space-y-3 border-t border-white/10 pt-3">
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
                    <div className="rounded-2xl bg-white/6 px-3.5 py-2.5 text-xs text-zinc-200 border border-white/8 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link
                          to={commentUserUrl}
                          className="font-bold text-white hover:text-[#DFB76C] transition"
                        >
                          {c.authorName}
                        </Link>
                        {c.createdAt && (
                          <span className="text-[10px] text-zinc-500">
                            {formatTimeAgo(c.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed text-zinc-300">{c.text}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-500 py-1 text-center">No comments yet. Start the conversation!</p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Avatar name={currentUserName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={30} />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
              placeholder="Add a comment to this discussion…"
              className="min-w-0 flex-1 rounded-full bg-white/6 border border-white/12 px-4 py-2 text-xs outline-none focus:border-[#C5A059]/70 text-white placeholder-zinc-500"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || submittingComment}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#DFB76C] text-zinc-950 font-bold disabled:opacity-40 transition cursor-pointer shrink-0 hover:brightness-105"
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
