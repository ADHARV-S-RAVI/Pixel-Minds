import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode, FC } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  PlusSquare,
  User,
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
  Trash2,
  ArrowRight,
  Sparkles,
  Rocket,
  Lightbulb,
  BookOpen,
  PenSquare,
  MessageSquare,
  Sun,
  Moon,
  ChevronRight,
  Code2,
  GraduationCap,
  Flag,
  ShieldCheck,
  Compass,
  HelpCircle,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X
} from 'lucide-react';
import { opps } from './data';
import type { Opp } from './data';
import { AnnouncementModal } from './components/AnnouncementModal';
import { ReportModal } from './components/ReportModal';
import { AuthPromptModal } from './components/AuthPromptModal';
import { ConfirmModal } from './components/ConfirmModal';
import { SidebarGooeyNav } from './components/GooeyNav';
import { grad, getCategoryMeta } from './utils/meta';
import { useApp } from './store';
import { NotificationBell } from './components/NotificationBell';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { createCommunityPost, deleteCommunityPost, formatTimeAgo, togglePostLike, getPostComments, addPostComment } from './services/community';
import { renderWithHashtags, validateMessageSafety, sanitizeInput } from './utils/text';
import {
  IconHeart,
  IconMessage,
  IconShare,
  IconBookmark,
  IconRepeat,
  IconRocket,
  IconTrophy,
  IconLightbulb,
  IconBook,
  IconCompass,
  IconCalendar,
  IconMapPin,
  IconExternalLink,
  IconClock,
  IconSend,
  IconFlag,
  IconTrash,
  IconPen,
  IconBriefcase,
  IconLink,
  IconBadge
} from './components/FeedIcons';
import { SearchAutocomplete } from './components/SearchAutocomplete';

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
  <Link to="/" className="flex items-center gap-2 font-bold tracking-tight group shrink-0 min-w-0">
    <img
      src="/logo.png"
      alt="Pixel Minds"
      className="h-7 w-auto sm:h-8 max-h-8 object-contain transition-transform group-hover:scale-105 shrink-0"
    />
    <span className={`text-sm sm:text-base font-extrabold tracking-tight truncate ${light ? 'text-white' : 'text-[#0e1b33]'}`}>
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
  const { saved, toggle, share } = useApp();
  const [showReport, setShowReport] = useState(false);
  const on = saved.includes(String(o.id));

  // Dark variant matching reference "Featured Opportunity"
  if (variant === 'dark') {
    return (
      <div className="group relative flex flex-col justify-between rounded-[28px] pm-glass-card border-2 border-blue-400/40 bg-white/85 backdrop-blur-2xl p-5 sm:p-6 text-[#0e1b33] shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[310px] h-full max-w-full">
        {/* Soft Ambient Sky-Blue Glow in Corner */}
        <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl max-w-full" />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-700 shadow-2xs">
            <Code2 size={13} className="text-blue-600 shrink-0" />
            <span className="truncate">Featured · {o.cat}</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Report"
              title="Report Opportunity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowReport(true);
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-rose-50 border border-slate-200/80 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer shrink-0 select-none active:scale-95"
            >
              <Flag size={13} />
            </button>
            <button
              type="button"
              aria-label={on ? 'Unsave' : 'Save'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(String(o.id));
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-slate-500 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer shrink-0 select-none active:scale-95"
            >
              <Bookmark size={15} fill={on ? '#2563eb' : 'none'} className={on ? 'text-blue-600' : 'text-slate-500'} />
            </button>
          </div>
        </div>

        {/* Title & Organization */}
        <div className="mb-3 relative z-10">
          <Link to={'/opportunities/' + o.id}>
            <h3 className="font-extrabold text-lg sm:text-xl text-[#0e1b33] tracking-tight leading-snug line-clamp-2 group-hover:text-blue-600 transition">
              {o.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-1">{o.org}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-slate-600 mb-3.5 relative z-10">
          <span className="flex items-center gap-1.5 shrink-0">
            <Calendar size={13} className="text-blue-600" />
            <span>
              {o.deadline}{' '}
              {o.isExpired || o.days <= 0 ? (
                <span className="font-semibold text-rose-600">· Closed</span>
              ) : (
                `· ${o.days === 1 ? '1d left' : `${o.days}d left`}`
              )}
            </span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            <MapPin size={13} className="text-blue-600" />
            <span>{o.mode}</span>
          </span>
          {o.prize && (
            <span className="flex items-center gap-1.5 font-bold text-amber-600 shrink-0">
              <Trophy size={13} className="text-amber-500" />
              <span className="truncate max-w-[150px]">{o.prize}</span>
            </span>
          )}
        </div>

        {/* Skill Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5 relative z-10">
          {o.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded-lg bg-white/90 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
              {s}
            </span>
          ))}
          {o.skills.length > 3 && (
            <span className="text-[10px] text-slate-500 font-medium self-center">
              +{o.skills.length - 3}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-200/60 mt-auto relative z-10">
          <Link
            to={'/opportunities/' + o.id}
            className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md shadow-blue-500/20 px-3 py-2 text-xs font-bold transition active:scale-[0.98]"
          >
            <span>View Details</span>
            <ArrowRight size={13} />
          </Link>
          <button
            onClick={() => share(o.title, '/opportunities/' + o.id)}
            className="flex-1 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 px-3 py-2 text-xs font-bold text-[#0e1b33] hover:text-blue-600 transition active:scale-[0.98] shadow-2xs cursor-pointer"
          >
            <Share2 size={13} className="text-blue-600 shrink-0" />
            <span>Refer &amp; Earn</span>
            <span className="rounded-md bg-blue-100 px-1 py-0.2 text-[10px] font-extrabold text-blue-700 shrink-0">+25</span>
          </button>
        </div>

        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          targetType="opportunity"
          targetId={String(o.id)}
          targetTitle={o.title}
          targetContent={`${o.org} · ${o.cat} · ${o.description || ''}`}
        />
      </div>
    );
  }

  // Light variant matching reference "Trending Opportunities"
  const isHackathon = o.cat.toLowerCase().includes('hackathon');
  const isInternship = o.cat.toLowerCase().includes('internship');
  const isScholarship = o.cat.toLowerCase().includes('scholarship');

  return (
    <div className="group relative flex flex-col justify-between rounded-[22px] pm-glass-card p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-white/85 text-[#0e1b33] overflow-hidden min-h-[220px] h-full max-w-full">
      <div>
        {/* Top Header: Category Tag & Save Bookmark */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          {isHackathon ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/90 border border-blue-200/80 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              <Code2 size={12} className="text-blue-600 shrink-0" />
              <span>Hackathon</span>
            </span>
          ) : isInternship ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              <Briefcase size={12} className="text-emerald-600 shrink-0" />
              <span>Internship</span>
            </span>
          ) : isScholarship ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              <GraduationCap size={12} className="text-amber-600 shrink-0" />
              <span>Scholarship</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              <span>{o.cat}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Report"
              title="Report Opportunity"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowReport(true);
              }}
              className="grid h-7 w-7 place-items-center rounded-full bg-white/70 hover:bg-rose-50 border border-white/80 text-slate-400 hover:text-rose-600 transition-colors shadow-2xs cursor-pointer shrink-0 select-none active:scale-95"
            >
              <Flag size={12} />
            </button>
            <button
              type="button"
              aria-label={on ? 'Unsave' : 'Save'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(String(o.id));
              }}
              className="grid h-7 w-7 place-items-center rounded-full bg-white/70 hover:bg-white border border-white/80 text-slate-500 hover:text-blue-600 transition-colors shadow-2xs cursor-pointer shrink-0 select-none active:scale-95"
            >
              <Bookmark size={14} fill={on ? '#2563eb' : 'none'} className={on ? 'text-blue-600' : 'text-slate-500'} />
            </button>
          </div>
        </div>

        {/* Title & Organization */}
        <div className="mb-2">
          <Link to={'/opportunities/' + o.id}>
            <h3 className="font-extrabold text-sm sm:text-base text-[#0e1b33] tracking-tight leading-snug line-clamp-2 group-hover:text-blue-600 transition">
              {o.title}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{o.org}</p>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-2">
          <span className="flex items-center gap-1.5 shrink-0">
            <Calendar size={13} className="text-slate-400" />
            <span>
              {o.deadline}{' '}
              {o.isExpired || o.days <= 0 ? (
                <span className="font-semibold text-rose-600">· Closed</span>
              ) : (
                `· ${o.days === 1 ? '1d left' : `${o.days}d left`}`
              )}
            </span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
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

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="opportunity"
        targetId={String(o.id)}
        targetTitle={o.title}
        targetContent={`${o.org} · ${o.cat} · ${o.description || ''}`}
      />
    </div>
  );
};

export const Composer: FC<{ onPostCreated?: (p: any) => void; isModal?: boolean }> = ({ onPostCreated, isModal = false }) => {
  const { addPost, say } = useApp();
  const { userProfile, user, incrementPixels } = useAuth();
  const [composerMode, setComposerMode] = useState<'update' | 'hackathon'>('update');

  // Standard Update / Experience state
  const [postTitle, setPostTitle] = useState('');
  const [t, setT] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'Experience' | 'Achievement' | 'Idea' | 'Learning' | 'General'>('Experience');
  const [pick, setPick] = useState('');
  const [oid, setOid] = useState<number | string>(0);
  const [lnk, setLnk] = useState('');
  const [showL, setShowL] = useState(false);

  // Mention autocomplete state
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);

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
    { id: 'Experience', label: 'Experience', icon: IconCompass },
    { id: 'Achievement', label: 'Achievement', icon: IconTrophy },
    { id: 'Idea', label: 'Idea', icon: IconLightbulb },
    { id: 'Learning', label: 'Learning', icon: IconBook },
    { id: 'General', label: 'General', icon: IconMessage }
  ] as const;

  // Search people for @mentions as the user types
  const handleTextChange = async (val: string, cursorPos: number) => {
    setT(val);
    setMentionCursorPos(cursorPos);
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\-\.]*)$/);
    if (mentionMatch) {
      const q = mentionMatch[1];
      setMentionQuery(q);
      try {
        const { globalSearch } = await import('./services/search');
        const res = await globalSearch(q || 'a', 5);
        setMentionSuggestions(res.people || []);
      } catch {
        setMentionSuggestions([]);
      }
    } else {
      setMentionQuery(null);
      setMentionSuggestions([]);
    }
  };

  const selectMention = (person: any) => {
    const rawName = person.name || person.displayName || 'user';
    const cleanUsername = rawName.replace(/\s+/g, '_').toLowerCase();
    const textBeforeCursor = t.slice(0, mentionCursorPos);
    const textAfterCursor = t.slice(mentionCursorPos);
    const replacedBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_\-\.]*)$/, `@${cleanUsername} `);
    setT(replacedBefore + textAfterCursor);
    setMentionQuery(null);
    setMentionSuggestions([]);
  };

  const postStandard = async () => {
    if (!postTitle.trim()) {
      say('Please enter a post title');
      return;
    }
    if (!t.trim()) {
      say('Please enter a post description');
      return;
    }
    if (!user?.uid) {
      say('Please sign in to post to the community');
      return;
    }

    const safety = validateMessageSafety(`${postTitle} ${t}`);
    if (!safety.safe) {
      say(safety.error || 'Message contains unsafe script or HTML injection.');
      return;
    }

    setPosting(true);
    try {
      const cleanTitle = sanitizeInput(postTitle.trim());
      const cleanDesc = sanitizeInput(t.trim());
      const combinedText = `${cleanTitle}\n\n${cleanDesc}`;

      const newPost = await createCommunityPost(
        {
          id: user.uid,
          displayName: userName,
          role: userProfile?.role || 'Pixel Member'
        },
        {
          title: cleanTitle,
          description: cleanDesc,
          text: combinedText,
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

      setPostTitle('');
      setT('');
      setPick('');
      setOid(0);
      setLnk('');
      setShowL(false);
      incrementPixels?.(10);
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

    const safety = validateMessageSafety(`${hName} ${hDate} ${hLoc} ${hDesc} ${hLink}`);
    if (!safety.safe) {
      say(safety.error || 'Hackathon details contain unsafe script or HTML injection.');
      return;
    }

    setPosting(true);
    try {
      const cleanName = sanitizeInput(hName.trim());
      const cleanDate = sanitizeInput(hDate.trim());
      const cleanLoc = sanitizeInput(hLoc.trim());
      const cleanLink = sanitizeInput(hLink.trim());
      const cleanDesc = sanitizeInput(hDesc.trim());

      const hackTitle = `Upcoming Hackathon: ${cleanName}`;
      const hackDesc = `Dates: ${cleanDate}\nLocation: ${cleanLoc}\nRegistration: ${cleanLink}\n\n${cleanDesc || 'Upcoming hackathon shared by the Pixel Minds community. Check the registration link for full participation guidelines and tracks!'}`;
      const formattedText = `${hackTitle}\n\n${hackDesc}`;

      const newPost = await createCommunityPost(
        {
          id: user.uid,
          displayName: userName,
          role: userProfile?.role || 'Pixel Member'
        },
        {
          title: hackTitle,
          description: hackDesc,
          text: formattedText,
          category: 'Upcoming Hackathon',
          link: cleanLink,
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
      incrementPixels?.(15);
      say('Upcoming hackathon shared with community! (+15 Pixels)');
    } catch (err: any) {
      console.error('Failed to share hackathon:', err);
      say(err?.message || 'Failed to share hackathon. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const tools: [any, string, () => void, boolean][] = [
    [IconBriefcase, 'Attach Opportunity', () => { setPick(pick === 'opp' ? '' : 'opp'); setOid(0); }, pick === 'opp'],
    [IconCalendar, 'Attach Event', () => { setPick(pick === 'event' ? '' : 'event'); setOid(0); }, pick === 'event'],
    [IconLink, 'Add Link', () => setShowL(!showL), showL]
  ];

  return (
    <div className={isModal ? "text-[#0e1b33] dark:text-white" : "mt-8 pt-5 pb-2 text-[#0e1b33] dark:text-white border-t border-slate-300/40 dark:border-slate-700/40"}>
      {/* Mode Selector Tabs */}
      <div className="flex pb-3 mb-4 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setComposerMode('update')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            composerMode === 'update'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0e1b33] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <IconPen size={14} />
          <span>Share Experience / Idea</span>
        </button>

        <button
          type="button"
          onClick={() => setComposerMode('hackathon')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer shrink-0 ${
            composerMode === 'hackathon'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0e1b33] dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <IconRocket size={14} />
          <span>Share Upcoming Hackathon</span>
        </button>
      </div>

      {composerMode === 'hackathon' ? (
        /* ================= Share Upcoming Hackathon Form ================= */
        <div className="space-y-3.5">
          <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <IconRocket size={16} className="text-[#2563eb] shrink-0 mt-0.5" />
            <p>
              Know an upcoming hackathon? Share the details with the community to help fellow developers discover opportunities and form teams!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hackathon Name <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                placeholder="e.g. Smart India Hackathon 2026" className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-3.5 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date / Schedule <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hDate}
                onChange={(e) => setHDate(e.target.value)}
                placeholder="e.g. Nov 14 - 16, 2026 (or Deadline)" className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-3.5 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Location & Mode <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hLoc}
                onChange={(e) => setHLoc(e.target.value)}
                placeholder="e.g. Online (Virtual), Bengaluru, or Hybrid" className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-3.5 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Registration Link (URL) <span className="text-[#2563eb]">*</span>
              </label>
              <input
                value={hLink}
                onChange={(e) => setHLink(e.target.value)}
                type="url"
                placeholder="https://hackathon-website.com/register" className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-3.5 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description & Highlights (Prizes, tracks, or teammate callouts)
            </label>
            <textarea
              value={hDesc}
              onChange={(e) => setHDesc(e.target.value)}
              rows={2}
              placeholder="Themes (AI, Web3, CleanTech), eligibility, cash prizes, or if you are looking to assemble a squad..." className="w-full resize-none rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-3.5 py-2.5 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 placeholder-slate-400 transition shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
            <span className="text-[11px] text-slate-500">Strictly text-only · No uploads needed</span>
            <button
              disabled={!hName.trim() || !hDate.trim() || !hLoc.trim() || !hLink.trim() || posting}
              onClick={postHackathon}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
            >
              <IconRocket size={13} />
              <span>{posting ? 'Publishing...' : 'Share Hackathon'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* ================= Standard Experience / Update Form ================= */
        <div className="space-y-3.5">
          {/* Category Tag Selection */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mr-1">Topic:</span>
            {categories.map((c) => {
              const IconComp = c.icon;
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-slate-700 hover:text-[#0e1b33] hover:bg-white'
                  }`}
                >
                  <IconComp size={11} className={isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Avatar name={userName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={40} />
            <div className="flex-1 space-y-2 relative">
              <input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                maxLength={100}
                placeholder="Post title (compulsory)..."
                className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-4 py-2 text-xs sm:text-sm font-bold outline-none focus:border-blue-500 text-[#0e1b33] dark:text-white placeholder:text-slate-400 placeholder:font-normal transition shadow-2xs"
              />
              <textarea
                value={t}
                onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart || e.target.value.length)}
                onKeyUp={(e: any) => handleTextChange(e.target.value, e.target.selectionStart || e.target.value.length)}
                onClick={(e: any) => handleTextChange(e.target.value, e.target.selectionStart || e.target.value.length)}
                maxLength={1200}
                rows={t ? 3 : 2}
                placeholder={
                  selectedCategory === 'Experience'
                    ? 'Share your hackathon recap, sprint experience, or takeaways... (type @ to mention someone)'
                    : selectedCategory === 'Achievement'
                    ? 'Share your hackathon win, podium finish, grant, or milestone... (type @ to mention someone)'
                    : selectedCategory === 'Idea'
                    ? 'Pitch a problem statement or hackathon project idea to brainstorm with the community... (type @ to mention someone)'
                    : selectedCategory === 'Learning'
                    ? 'Share key tech insights, architecture tips, or lessons from your builds... (type @ to mention someone)'
                    : 'Share an update or ask a question to fellow builders... (type @ to mention someone)'
                }
                className="w-full resize-none rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 hover:border-slate-400 px-4 py-3 text-xs sm:text-sm outline-none focus:border-blue-500 text-[#0e1b33] dark:text-white placeholder:text-slate-400 transition leading-relaxed shadow-xs"
              />

              {/* @mention autocomplete popup */}
              {mentionQuery !== null && mentionSuggestions.length > 0 && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-50">
                  <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Mention People</p>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {mentionSuggestions.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => selectMention(person)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Avatar name={person.name} photoURL={person.avatar} size={22} />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{person.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">@{person.name.replace(/\s+/g, '_').toLowerCase()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end text-[10px] text-slate-400">
                {t.length}/1200
              </div>
            </div>
          </div>

          {pick && (
            <select
              value={oid}
              onChange={(e) => setOid(e.target.value)}
              className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 px-3 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500"
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
              className="w-full rounded-xl bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 px-3.5 py-2 text-xs outline-none focus:border-blue-500 text-[#0e1b33] dark:text-white placeholder-slate-400"
            />
          )}

          <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
            <div className="flex gap-1.5 text-slate-500">
              {tools.map(([I, l, f, a]) => (
                <button
                  key={l}
                  onClick={f}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    a
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0e1b33] dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <I size={13} className={a ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  <span className="hidden sm:inline">{l}</span>
                </button>
              ))}
            </div>
            <button
              disabled={!t.trim() || posting}
              onClick={postStandard}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-40 transition active:scale-[0.98] cursor-pointer"
            >
              <IconSend size={13} />
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
  authorAvatar?: string;
  text: string;
  createdAt: number;
  likes?: number;
  liked?: boolean;
  isEdited?: boolean;
}

export const PostCard: FC<{ p: any; onPostDeleted?: (id: string) => void; onPostCreated?: (p: any) => void }> = ({ p, onPostDeleted, onPostCreated }) => {
  const { saved, toggle, say, addPost } = useApp();
  const { userProfile, user, incrementPixels } = useAuth();
  const [showReport, setShowReport] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authActionText, setAuthActionText] = useState('interact with community posts');
  const [reposting, setReposting] = useState(false);
  const [repostsCount, setRepostsCount] = useState<number>(p.reposts || 0);
  const [sharesCount, setSharesCount] = useState<number>(p.shares || 0);
  const o = opps.find((x) => String(x.id) === String(p.opp));

  // Sync reposts & shares count if p changes
  useEffect(() => {
    if (typeof p.reposts === 'number') setRepostsCount(p.reposts);
    if (typeof p.shares === 'number') setSharesCount(p.shares);
  }, [p.reposts, p.shares]);

  // Likes state with localStorage persistence
  const [liked, setLiked] = useState(() => {
    try {
      return localStorage.getItem(`pm_post_liked_${p.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [likesCount, setLikesCount] = useState<number>(p.likes || 0);

  // Synchronize likesCount if p.likes updates from server/parent
  useEffect(() => {
    if (typeof p.likes === 'number') {
      setLikesCount(p.likes);
    }
  }, [p.likes]);

  const [showLikers, setShowLikers] = useState(false);
  const [likersList, setLikersList] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const handleOpenLikers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLikers(true);
    setLoadingLikers(true);
    try {
      const { getPostLikes } = await import('./services/community');
      const list = await getPostLikes(String(p.id));
      setLikersList(list);
    } catch {
      setLikersList([]);
    } finally {
      setLoadingLikers(false);
    }
  };
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<PostCommentItem[]>(() => {
    try {
      const stored = localStorage.getItem(`pm_post_comments_${p.id}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (open) {
      getPostComments(String(p.id), user?.uid)
        .then((items) => {
          if (items && items.length > 0) setComments(items);
        })
        .catch(() => {});
    }
  }, [open, p.id, user?.uid]);

  const [deleting, setDeleting] = useState(false);
  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Edit Post state
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState(p.title || '');
  const [editPostDesc, setEditPostDesc] = useState(p.description || p.text || '');
  const [savingPostEdit, setSavingPostEdit] = useState(false);

  // Edit Comment state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);

  const isSaved = saved.includes('p' + p.id);
  const savedCount = (p.bookmarksCount ?? p.savesCount ?? 0) + (isSaved ? 1 : 0);
  const currentUserName = userProfile?.displayName || user?.displayName || 'Community Member';
  const canDelete = user && (user.uid === p.userId || userProfile?.role === 'admin');
  const canEdit = user && (user.uid === p.userId || userProfile?.role === 'admin');

  // Handle Like toggle with strict authentication check
  const handleLike = async () => {
    if (!user) {
      setAuthActionText('like community posts');
      setShowAuthModal(true);
      return;
    }

    const wasLiked = liked;
    const nextLiked = !wasLiked;
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));

    // Optimistic UI updates
    setLiked(nextLiked);
    setLikesCount(nextCount);
    try {
      localStorage.setItem(`pm_post_liked_${p.id}`, String(nextLiked));
      localStorage.setItem(`pm_post_liked_${p.id}_${user.uid}`, String(nextLiked));
    } catch {}

    try {
      const res = await togglePostLike(String(p.id), user.uid, wasLiked, likesCount);
      setLiked(res.liked);
      setLikesCount(res.likesCount);
      localStorage.setItem(`pm_post_liked_${p.id}`, String(res.liked));
      localStorage.setItem(`pm_post_liked_${p.id}_${user.uid}`, String(res.liked));
    } catch (err) {
      console.warn('Could not sync like to server:', err);
      // Rollback on failure
      setLiked(wasLiked);
      setLikesCount(likesCount);
    }
  };

  // Handle send comment with strict authentication check
  const handleSendComment = async () => {
    if (!user) {
      setAuthActionText('join this discussion and post comments');
      setShowAuthModal(true);
      return;
    }

    if (!commentText.trim()) return;
    const safety = validateMessageSafety(commentText);
    if (!safety.safe) {
      say(safety.error || 'Comment contains unsafe script or HTML injection.');
      return;
    }
    setSubmittingComment(true);

    try {
      const cleanComment = sanitizeInput(commentText.trim());
      const created = await addPostComment(
        String(p.id),
        cleanComment,
        {
          id: user.uid,
          name: currentUserName,
          role: userProfile?.role || 'Pixel Member',
          avatar: userProfile?.photoURL || user?.photoURL || undefined
        },
        comments.length
      );
      const updated = [...comments, created];
      setComments(updated);
      setCommentText('');
      localStorage.setItem(`pm_post_comments_${p.id}`, JSON.stringify(updated));
      incrementPixels?.(2);
      say('Comment posted (+2 Pixels)');
    } catch (err) {
      console.warn('Could not sync comment to server:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Comment Like with database persistence
  const handleCommentLike = async (commentId: string) => {
    if (!user) {
      setAuthActionText('like comments');
      setShowAuthModal(true);
      return;
    }

    const targetComment = comments.find((c) => c.id === commentId);
    const storageKey = `pm_comment_liked_${commentId}_${user.uid}`;
    const wasLiked = Boolean(
      targetComment?.liked ||
      (typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true') ||
      (typeof window !== 'undefined' && localStorage.getItem(`pm_comment_liked_${commentId}`) === 'true')
    );
    const currentLikes = targetComment?.likes || 0;
    const newLiked = !wasLiked;
    const newCount = Math.max(0, currentLikes + (newLiked ? 1 : -1));

    // Optimistic UI update immediately
    setComments((prev) => {
      const updated = prev.map((c) => (c.id === commentId ? { ...c, liked: newLiked, likes: newCount } : c));
      try {
        localStorage.setItem(`pm_post_comments_${p.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      localStorage.setItem(storageKey, String(newLiked));
      localStorage.setItem(`pm_comment_liked_${commentId}`, String(newLiked));
    } catch {}

    try {
      const { toggleCommentLike } = await import('./services/community');
      const res = await toggleCommentLike(commentId, user.uid, wasLiked, currentLikes);
      setComments((prev) => {
        const updated = prev.map((c) => (c.id === commentId ? { ...c, liked: res.liked, likes: res.likesCount } : c));
        try {
          localStorage.setItem(`pm_post_comments_${p.id}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      try {
        localStorage.setItem(storageKey, String(res.liked));
        localStorage.setItem(`pm_comment_liked_${commentId}`, String(res.liked));
      } catch {}
    } catch (err) {
      console.warn('Could not sync comment like to server:', err);
    }
  };

  // Handle Comment Deletion (Author or Admin)
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      const { deletePostComment } = await import('./services/community');
      const res = await deletePostComment(commentId, String(p.id), user.uid);
      if (res.success) {
        const remaining = comments.filter((c) => c.id !== commentId);
        setComments(remaining);
        try {
          localStorage.setItem(`pm_post_comments_${p.id}`, JSON.stringify(remaining));
        } catch {}
        say('Comment deleted');
      }
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
      say(err?.message || 'Failed to delete comment');
    }
  };

  // Handle Edit Post
  const handleSavePostEdit = async () => {
    if (!editPostTitle.trim() || !editPostDesc.trim()) {
      say('Title and description cannot be empty');
      return;
    }
    setSavingPostEdit(true);
    try {
      const { updateCommunityPost } = await import('./services/community');
      const updatedText = `${editPostTitle.trim()}\n\n${editPostDesc.trim()}`;
      await updateCommunityPost(String(p.id), {
        title: editPostTitle.trim(),
        description: editPostDesc.trim(),
        text: updatedText
      });
      p.title = editPostTitle.trim();
      p.description = editPostDesc.trim();
      p.text = updatedText;
      p.isEdited = true;
      setIsEditingPost(false);
      say('Post updated successfully');
    } catch (err: any) {
      say(err?.message || 'Failed to update post');
    } finally {
      setSavingPostEdit(false);
    }
  };

  // Handle Edit Comment
  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentText.trim() || !user) {
      say('Comment cannot be empty');
      return;
    }
    setSavingCommentEdit(true);
    try {
      const { updatePostComment } = await import('./services/community');
      await updatePostComment(commentId, editCommentText.trim(), user.uid);
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: editCommentText.trim(), isEdited: true } : c))
      );
      setEditingCommentId(null);
      say('Comment updated');
    } catch (err: any) {
      say(err?.message || 'Failed to update comment');
    } finally {
      setSavingCommentEdit(false);
    }
  };

  // Handle Repost with database persistence
  const handleRepost = async () => {
    if (!user) {
      setAuthActionText('repost community content');
      setShowAuthModal(true);
      return;
    }
    if (reposting) return;
    setReposting(true);
    try {
      const originalAuthor = p.user || 'Community Builder';
      const repostTitle = `Repost from @${originalAuthor}`;
      const repostText = `Reposted from @${originalAuthor}:\n\n${p.text || ''}`;
      const newPost = await createCommunityPost(
        {
          id: user.uid,
          displayName: currentUserName,
          role: userProfile?.role || 'Pixel Member'
        },
        {
          title: repostTitle,
          description: p.text || '',
          text: repostText,
          category: p.category || 'General',
          opp: p.opp || undefined,
          link: p.link || undefined,
          status: 'published'
        }
      );

      // Record interaction in database ledger
      try {
        const { recordPostInteraction } = await import('./services/community');
        const res = await recordPostInteraction(String(p.id), user.uid, 'repost');
        if (res.success && typeof res.count === 'number') {
          setRepostsCount(res.count);
        } else {
          setRepostsCount((c) => c + 1);
        }
      } catch {
        setRepostsCount((c) => c + 1);
      }

      if (onPostCreated) {
        onPostCreated(newPost);
      } else {
        addPost(newPost);
      }
      incrementPixels?.(2, 'Reposted community post', 'Community repost reward');
      say('Post reposted to community! (+2 Pixels)');
    } catch (err: any) {
      console.error('Failed to repost:', err);
      say(err?.message || 'Failed to repost');
    } finally {
      setReposting(false);
    }
  };

  // Handle share link with Web Share API and desktop clipboard fallback
  const handleShare = async () => {
    if (!p?.id || String(p.id).trim() === '' || String(p.id) === 'undefined') {
      say('Unable to share: Post ID is missing or invalid.');
      return;
    }

    if (user?.uid) {
      try {
        const { recordPostInteraction } = await import('./services/community');
        const res = await recordPostInteraction(String(p.id), user.uid, 'share');
        if (res.success && typeof res.count === 'number') {
          setSharesCount(res.count);
        } else {
          setSharesCount((c) => c + 1);
        }
      } catch {
        setSharesCount((c) => c + 1);
      }
    } else {
      setSharesCount((c) => c + 1);
    }

    // Determine production / current domain cleanly
    let baseOrigin = 'https://pixelmindss.vercel.app';
    if (typeof window !== 'undefined' && window.location?.origin) {
      const locOrigin = window.location.origin;
      if (locOrigin !== 'null' && !locOrigin.includes('localhost') && !locOrigin.includes('127.0.0.1')) {
        baseOrigin = locOrigin;
      } else if (import.meta.env.DEV) {
        baseOrigin = locOrigin;
      }
    }

    const shareUrl = `${baseOrigin}/feed#${encodeURIComponent(String(p.id))}`;
    const author = p.user || 'Pixel Builder';
    const postSnippet = p.text ? (p.text.length > 80 ? p.text.substring(0, 77) + '...' : p.text) : 'Check out this post on Pixel Minds';

    const shareData = {
      title: `${author} on Pixel Minds`,
      text: postSnippet,
      url: shareUrl
    };

    // 1. Try Web Share API (native mobile share sheet)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        say('Post shared successfully!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('[handleShare] Web Share API notice, attempting clipboard fallback:', err);
      }
    }

    // 2. Clipboard fallback (Desktop or unsupported browsers)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        say('Post link copied to clipboard!');
        return;
      }

      // Legacy fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (success) {
        say('Post link copied to clipboard!');
      } else {
        throw new Error('Fallback copy command failed.');
      }
    } catch (clipErr) {
      console.error('[handleShare] Clipboard copy failure:', clipErr);
      say('Unable to copy link automatically. Please copy the URL from your address bar.');
    }
  };

  const handleDelete = async () => {
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
    (typeof p.text === 'string' && (p.text.includes('Upcoming Hackathon:') || p.text.includes('🚀 Upcoming Hackathon:')));

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
    <div id={String(p.id)} className="rounded-3xl pm-glass-card bg-white/35 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-5 sm:p-6 shadow-[0_12px_36px_rgba(14,50,120,0.08)] text-[#0e1b33] dark:text-white transition hover:shadow-md">
      {/* Author Header */}
      <div className="flex items-center justify-between gap-3">
        <Link to={authorProfileUrl} className="flex items-center gap-3 min-w-0 group cursor-pointer">
          <Avatar name={p.user} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#0e1b33] dark:text-white truncate group-hover:text-blue-600 transition">
              {p.user}
            </p>
            <p className="text-xs text-[#0e1b33] dark:text-slate-300 font-medium flex items-center gap-1.5">
              <span>{p.role} · {p.time}</span>
              {p.isEdited && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                  (edited)
                </span>
              )}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {canEdit && !isEditingPost && (
            <button
              type="button"
              onClick={() => {
                setEditPostTitle(p.title || '');
                setEditPostDesc(p.description || p.text || '');
                setIsEditingPost(true);
              }}
              title="Edit Post"
              className="text-slate-400 hover:text-blue-600 transition p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer select-none active:scale-95"
            >
              <PenSquare size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowReport(true)}
            title="Report Post"
            className="text-slate-400 hover:text-rose-500 transition p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer select-none active:scale-95"
          >
            <IconFlag size={14} />
          </button>
          {canDelete && (
            <button
              onClick={() => setShowDeletePostConfirm(true)}
              title={userProfile?.role === 'admin' ? "Delete post (Admin)" : "Delete post"}
              className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            >
              <IconTrash size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Post Content */}
      {isHackathon && parsedDetails ? (
        /* Hackathon Post - clean streamlined layout, no boxed inner card */
        <div className="mt-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-sky-300 text-[11px] font-bold border border-blue-400/30 uppercase tracking-wider">
              <IconRocket size={12} />
              Upcoming Hackathon
            </span>
            {parsedDetails.link && (
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline"
              >
                <span>Registration Link</span>
                <IconExternalLink size={12} />
              </a>
            )}
          </div>

          <div>
            <h3 className="font-['Outfit',sans-serif] text-base sm:text-lg font-bold text-[#0e1b33] dark:text-white">
              {parsedDetails.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {parsedDetails.date && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-700/40 font-medium">
                  <IconCalendar size={12} className="text-blue-600 dark:text-sky-400" />
                  {parsedDetails.date}
                </span>
              )}
              {parsedDetails.location && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border border-blue-200/60 dark:border-blue-700/40 font-medium">
                  <IconMapPin size={12} className="text-blue-600 dark:text-sky-400" />
                  {parsedDetails.location}
                </span>
              )}
            </div>
          </div>

          {/* Description moved down naturally into feed flow */}
          {parsedDetails.description && (
            <p className="pt-1 text-xs sm:text-sm leading-relaxed text-[#0e1b33] dark:text-slate-100 font-normal whitespace-pre-wrap">
              {renderWithHashtags(parsedDetails.description)}
            </p>
          )}

          {parsedDetails.link && (
            <div className="pt-1">
              <a
                href={parsedDetails.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl bg-[#112240] hover:bg-[#1a335e] px-5 py-2.5 text-xs font-bold text-white shadow-sm active:scale-[0.98] transition cursor-pointer"
              >
                <span>Register for Hackathon</span>
                <IconExternalLink size={13} />
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Regular Text Post */
        <div className="mt-3.5 space-y-2.5">
          {isEditingPost ? (
            <div className="space-y-3 bg-white/70 dark:bg-slate-800/70 p-4 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Post Title
                </label>
                <input
                  type="text"
                  value={editPostTitle}
                  onChange={(e) => setEditPostTitle(e.target.value)}
                  maxLength={100}
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-[#0e1b33] dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Post Description
                </label>
                <textarea
                  rows={3}
                  value={editPostDesc}
                  onChange={(e) => setEditPostDesc(e.target.value)}
                  maxLength={1200}
                  className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingPost(false)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingPostEdit}
                  onClick={handleSavePostEdit}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-50"
                >
                  {savingPostEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {p.category && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      p.category === 'Achievement'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : p.category === 'Idea'
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                        : p.category === 'Learning'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                        : p.category === 'Experience'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {p.category === 'Achievement' && <IconTrophy size={11} />}
                    {p.category === 'Idea' && <IconLightbulb size={11} />}
                    {p.category === 'Learning' && <IconBook size={11} />}
                    {p.category === 'Experience' && <IconCompass size={11} />}
                    <span>{p.category}</span>
                  </span>
                </div>
              )}

              {/* Post Title */}
              {p.title && (
                <h4 className="font-['Outfit',sans-serif] text-sm sm:text-base font-bold text-[#0e1b33] dark:text-white">
                  {p.title}
                </h4>
              )}

              {/* Post message/description moved down cleanly */}
              <p className="text-xs sm:text-sm leading-relaxed text-[#0e1b33] dark:text-slate-100 font-normal whitespace-pre-wrap">
                {renderWithHashtags(p.description || p.text)}
              </p>

              {p.link && (
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 inline-flex items-center gap-1.5 truncate text-xs font-semibold text-blue-600 dark:text-sky-400 hover:underline"
                >
                  <IconExternalLink size={13} />
                  <span>{p.link}</span>
                </a>
              )}
            </>
          )}
        </div>
      )}

      {/* Attached Opportunity Preview (if linked) */}
      {o && (
        <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 p-3">
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
            <p className="truncate text-xs font-bold text-[#0e1b33] dark:text-white">{o.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {o.org} · {o.deadline} · {o.mode}
            </p>
          </div>
          <Link
            to={'/opportunities/' + o.id}
            className="rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-[#0e1b33] dark:text-white px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 shadow-2xs"
          >
            View
          </Link>
        </div>
      )}

      {/* Interaction Bar with names positioned below the icons */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-2.5 text-[11px] text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <button
              onClick={handleLike}
              className={`flex flex-col items-center justify-center p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${
                liked ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-[#0e1b33] dark:text-slate-100'
              }`}
              title={liked ? 'Unlike' : 'Like'}
            >
              <IconHeart size={16} fill={liked ? 'currentColor' : 'none'} className={liked ? 'scale-110 transition-transform' : ''} />
            </button>
            {likesCount > 0 && (
              <button
                type="button"
                onClick={handleOpenLikers}
                className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 transition"
                title="View who liked this post"
              >
                {likesCount}
              </button>
            )}
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Likes</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setOpen(!open)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${
              open ? 'text-blue-600 dark:text-sky-400 font-bold' : 'text-[#0e1b33] dark:text-slate-100'
            }`}
            title="Comments"
          >
            <div className="flex items-center gap-1">
              <IconMessage size={16} />
              <span className="text-[11px]">{comments.length > 0 ? comments.length : (p.comments || 0)}</span>
            </div>
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Comments</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleRepost}
            disabled={reposting}
            className="flex flex-col items-center justify-center p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer font-medium text-[#0e1b33] dark:text-slate-100 disabled:opacity-50"
            title="Repost to community"
          >
            <div className="flex items-center gap-1">
              <IconRepeat size={16} className={reposting ? 'animate-spin' : ''} />
              <span className="text-[11px]">{repostsCount}</span>
            </div>
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Repost</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer font-medium text-[#0e1b33] dark:text-slate-100"
            title="Share"
          >
            <div className="flex items-center gap-1">
              <IconShare size={16} />
              <span className="text-[11px]">{sharesCount}</span>
            </div>
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Share</span>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => toggle('p' + p.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-full hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer font-medium ${
              isSaved ? 'text-blue-600 dark:text-sky-400 font-bold' : 'text-[#0e1b33] dark:text-slate-100'
            }`}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            <div className="flex items-center gap-1">
              <IconBookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
              <span className="text-[11px]">{savedCount}</span>
            </div>
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Save</span>
        </div>
      </div>

      {/* Likers Modal */}
      {showLikers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <IconHeart size={15} className="text-rose-600" fill="currentColor" />
                Liked by ({likesCount})
              </h3>
              <button
                type="button"
                onClick={() => setShowLikers(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-3 max-h-60 overflow-y-auto space-y-2.5">
              {loadingLikers ? (
                <p className="text-xs text-slate-500 py-3 text-center">Loading likers...</p>
              ) : likersList.length > 0 ? (
                likersList.map((liker) => (
                  <Link
                    key={liker.id}
                    to={`/profile?uid=${liker.id}&name=${encodeURIComponent(liker.name)}`}
                    className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <Avatar name={liker.name} photoURL={liker.avatar} size={28} />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{liker.name}</span>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center font-medium">No likers recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Comments Section */}
      {open && (
        <div className="mt-3.5 space-y-3 border-t border-slate-200/50 dark:border-slate-800/50 pt-3">
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {comments.length > 0 ? (
              comments.map((c) => {
                const commentUserUrl = c.authorId
                  ? `/profile?uid=${c.authorId}&name=${encodeURIComponent(c.authorName)}`
                  : `/profile?name=${encodeURIComponent(c.authorName)}`;
                const isCommentLiked = Boolean(
                  c.liked ||
                  (typeof window !== 'undefined' && user?.uid && localStorage.getItem(`pm_comment_liked_${c.id}_${user.uid}`) === 'true') ||
                  (typeof window !== 'undefined' && localStorage.getItem(`pm_comment_liked_${c.id}`) === 'true')
                );
                return (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <Link to={commentUserUrl}>
                      <Avatar name={c.authorName} size={28} />
                    </Link>
                    <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs text-[#0e1b33] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link
                          to={commentUserUrl}
                          className="font-bold text-[#0e1b33] dark:text-white hover:text-blue-600 transition"
                        >
                          {c.authorName}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          {c.isEdited && (
                            <span className="text-[9px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-700/60 px-1 py-0.2 rounded">
                              (edited)
                            </span>
                          )}
                          {c.createdAt && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      {editingCommentId === c.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={2}
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            maxLength={500}
                            className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-[#0e1b33] dark:text-white outline-none focus:border-blue-500 resize-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingCommentEdit}
                              onClick={() => handleSaveCommentEdit(c.id)}
                              className="px-3 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50"
                            >
                              {savingCommentEdit ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="leading-relaxed text-[#0e1b33] dark:text-slate-200 font-normal">{renderWithHashtags(c.text)}</p>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {user && (user.uid === c.authorId || userProfile?.role === 'admin') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(c.id);
                                      setEditCommentText(c.text);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-blue-600 transition cursor-pointer font-medium"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingCommentId(c.id)}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 transition cursor-pointer font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCommentLike(c.id)}
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold transition cursor-pointer px-2 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                isCommentLiked ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <IconHeart size={12} fill={isCommentLiked ? 'currentColor' : 'none'} />
                              <span>{c.likes || 0}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-600 py-1 text-center font-medium">No comments yet. Start the conversation!</p>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <Avatar name={currentUserName} photoURL={userProfile?.photoURL || user?.photoURL || undefined} size={30} />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onFocus={() => {
                if (!user) {
                  setAuthActionText('join this discussion and post comments');
                  setShowAuthModal(true);
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
              placeholder={user ? "Add a comment to this discussion…" : "Sign in to add a comment…"}
              className="min-w-0 flex-1 rounded-full bg-white/70 dark:bg-slate-800/70 border border-white/80 dark:border-slate-700 px-4 py-2 text-xs outline-none focus:border-blue-500 text-[#0e1b33] dark:text-white placeholder-slate-400"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || submittingComment}
              className="grid h-8 w-8 place-items-center rounded-full bg-[#112240] text-white font-bold disabled:opacity-40 transition cursor-pointer shrink-0 hover:bg-[#1a335e]"
              title="Post comment"
            >
              <IconSend size={13} />
            </button>
          </div>
        </div>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="post"
        targetId={String(p.id)}
        targetTitle={`Post by ${p.user}`}
        targetContent={p.text}
      />

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        actionText={authActionText}
      />

      <ConfirmModal
        isOpen={showDeletePostConfirm}
        title="Delete Community Post"
        message="Are you sure you want to permanently delete this post? This action cannot be undone."
        confirmLabel="Delete Post"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeletePostConfirm(false)}
      />

      <ConfirmModal
        isOpen={Boolean(deletingCommentId)}
        title="Delete Comment"
        message="Are you sure you want to remove this comment from the discussion?"
        confirmLabel="Delete Comment"
        variant="danger"
        onConfirm={() => {
          if (deletingCommentId) {
            handleDeleteComment(deletingCommentId);
            setDeletingCommentId(null);
          }
        }}
        onCancel={() => setDeletingCommentId(null)}
      />
    </div>
  );
};

const navItems = [
  ['/', 'Home', Home],
  ['/opportunities', 'Explore', Compass],
  ['/submit', 'Create', PlusSquare],
  ['/feed', 'Feed', MessageSquare],
  ['/profile', 'Profile', User]
] as const;

export const Layout: FC = () => {
  const { user, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const guestTriggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Desktop sidebar collapse/expand state (persisted)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('pm_desktop_sidebar_open') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('pm_desktop_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  // Floating Interactive Story Stack button state (persisted in sessionStorage per session)
  const [showStoryStackBtn, setShowStoryStackBtn] = useState(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('pm_story_stack_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissStoryStack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowStoryStackBtn(false);
    try {
      sessionStorage.setItem('pm_story_stack_dismissed', 'true');
    } catch {
      // ignore storage write errors
    }
  };

  // Close profile dropdown on navigation
  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        userMenuRef.current?.contains(target) ||
        mobileMenuRef.current?.contains(target) ||
        guestTriggerRef.current?.contains(target)
      ) {
        return;
      }
      setShowUserMenu(false);
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showUserMenu]);

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

  const [navSearchQuery, setNavSearchQuery] = useState('');

  // Sync search state with URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get('q');
    if (location.pathname.startsWith('/opportunities') && qParam !== null) {
      setNavSearchQuery(qParam);
    } else if (!location.pathname.startsWith('/opportunities')) {
      setNavSearchQuery('');
    }
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const clean = navSearchQuery.trim();
    if (clean) {
      navigate(`/opportunities?q=${encodeURIComponent(clean)}`);
    } else {
      navigate('/opportunities');
    }
  };

  const displayName = userProfile?.displayName || user?.displayName || 'Pixel Builder';
  const isAdmin = userProfile?.role === 'admin' || user?.email === 'admin@pixelminds.org';

  return (
    <div className="min-h-screen pm-bg-canvas flex flex-col lg:flex-row p-2.5 sm:p-4 lg:p-6 gap-3 sm:gap-5 selection:bg-blue-500/20 selection:text-[#0e1b33] overflow-x-hidden max-w-full">
      {/* Active Announcement Popup Modal */}
      <AnnouncementModal />

      {/* ============================================================ */}
      {/* 1. LEFT VERTICAL SIDEBAR (Desktop matching reference image) */}
      {/* ============================================================ */}
      {/* Document flow spacer to preserve layout geometry & prevent main content overlap */}
      <div
        className={`hidden lg:block shrink-0 pointer-events-none transition-all duration-300 ${
          sidebarOpen ? 'w-56 xl:w-64' : 'w-16 xl:w-20'
        }`}
        aria-hidden="true"
      />

      {/* Pinned Fixed Sidebar - collapses to a strip on left with icons */}
      <aside
        style={{
          top: '24px',
          left: '24px',
          height: 'calc(100vh - 48px)'
        }}
        className={`hidden lg:flex shrink-0 flex-col justify-between pm-glass rounded-[28px] ${
          sidebarOpen ? 'w-56 xl:w-64 p-4 xl:p-5' : 'w-16 xl:w-20 p-2.5 xl:p-3 items-center'
        } fixed z-30 shadow-lg shadow-blue-900/10 transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col min-h-0 flex-1 sidebar-scroll-container overscroll-contain pr-1 w-full">
          {/* Logo toggles sidebar between open and strip mode */}
          <div className="pt-1 pb-3 xl:pb-4 shrink-0 flex items-center justify-center w-full">
            <button
              type="button"
              onClick={toggleSidebar}
              title={sidebarOpen ? "Click to collapse sidebar" : "Click to expand sidebar"}
              className={`flex items-center ${sidebarOpen ? 'gap-2 px-2 w-full justify-start' : 'justify-center w-full'} font-bold tracking-tight group shrink-0 cursor-pointer select-none transition-transform active:scale-95`}
            >
              <img
                src="/logo.png"
                alt="Pixel Minds"
                className="h-7 w-auto sm:h-8 max-h-8 object-contain transition-transform group-hover:scale-105 shrink-0"
              />
              {sidebarOpen && (
                <span className="text-sm sm:text-base font-extrabold tracking-tight truncate text-[#0e1b33] dark:text-white">
                  Pixel Minds
                </span>
              )}
            </button>
          </div>

          {/* Navigation Links with GooeyNav liquid animation effect */}
          <SidebarGooeyNav collapsed={!sidebarOpen} />

          {/* Admin Console Quick Access (For Administrators) */}
          {isAdmin && (
            <div className="pt-2.5 shrink-0 w-full">
              <Link
                to="/admin"
                title="Admin Console"
                className={`flex items-center ${sidebarOpen ? 'justify-between px-3.5' : 'justify-center p-2'} py-2 rounded-xl bg-[#16171D] hover:bg-[#20222a] text-[#DFB76C] border border-[#C5A059]/40 hover:border-[#DFB76C] shadow-md shadow-black/10 transition group`}
              >
                <span className="flex items-center gap-2.5 text-xs font-extrabold truncate">
                  <ShieldCheck size={16} className="text-[#C5A059] shrink-0" />
                  {sidebarOpen && <span className="truncate">Admin Console</span>}
                </span>
                {sidebarOpen && <ChevronRight size={13} className="text-[#DFB76C] group-hover:translate-x-0.5 transition shrink-0" />}
              </Link>
            </div>
          )}
        </div>

        {/* Bottom User Profile Widget */}
        <div className="pt-3.5 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0 mt-auto w-full">
          <Link
            to={user ? '/profile' : '/login'}
            title={displayName}
            className={`flex items-center ${sidebarOpen ? 'gap-3 p-2 xl:p-2.5' : 'justify-center p-1.5'} rounded-2xl bg-white/40 hover:bg-white/90 dark:bg-slate-800/40 dark:hover:bg-slate-800/90 border border-white/60 dark:border-white/10 hover:border-white/90 transition shadow-xs group`}
          >
            <Avatar
              name={displayName}
              photoURL={userProfile?.photoURL || user?.photoURL || undefined}
              size={sidebarOpen ? 36 : 30}
            />
            {sidebarOpen && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition">
                    {displayName}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                    {user ? 'View Profile' : 'Sign In'}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
              </>
            )}
          </Link>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. RIGHT SECTION: TOP NAV BAR + MAIN CONTENT */}
      {/* ============================================================ */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-5 pb-20 lg:pb-0 max-w-full">
        {/* Top Navigation Bar */}
        <header className="pm-glass rounded-[20px] sm:rounded-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shadow-sm relative z-30 max-w-full">

          {/* Mobile Logo on left */}
          <div className="flex items-center gap-2 lg:hidden min-w-0 shrink">
            <Logo />
          </div>

          {/* Search Bar matching reference image with Predictions & Autocomplete */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl hidden sm:block">
            <SearchAutocomplete
              inputRef={searchInputRef}
              value={navSearchQuery}
              onChange={(val) => setNavSearchQuery(val)}
              onSubmit={(clean) => {
                if (clean) navigate(`/opportunities?q=${encodeURIComponent(clean)}`);
                else navigate('/opportunities');
              }}
              placeholder="Search opportunities, events, tags..."
            />
          </form>

          {/* Right Controls: Sun toggle, + Share Opportunity (desktop/tablet only), NotificationBell, User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-auto">
            {/* Sun / Moon Theme Toggle */}
            <button
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
              className={`grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-full transition cursor-pointer shadow-xs shrink-0 ${
                theme === 'dark'
                  ? 'bg-[#162B45] text-amber-400 border border-white/10 hover:text-amber-300 hover:bg-[#1c3656]'
                  : 'bg-white text-slate-800 border-2 border-slate-200/90 hover:text-blue-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="text-amber-400 transition-transform duration-200 hover:rotate-45" />
              ) : (
                <Moon size={16} className="text-slate-800 transition-transform duration-200 hover:-rotate-12" />
              )}
            </button>

            {/* Admin Console Quick Button (Tablet/Desktop only when logged in as Admin) */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#16171D] hover:bg-[#20222a] text-[#DFB76C] border border-[#C5A059]/40 hover:border-[#DFB76C] px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-bold shadow-md shadow-black/10 transition active:scale-[0.98] cursor-pointer shrink-0"
                title="Admin Console"
              >
                <ShieldCheck size={14} className="text-[#C5A059]" />
                <span className="hidden md:inline">Admin Console</span>
                <span className="md:hidden">Admin</span>
              </Link>
            )}

            {/* + Share Opportunity - Hidden on mobile screens to keep header compact; accessible via bottom bar */}
            <Link to="/submit" className="hidden md:inline-flex shrink-0">
              <button className="inline-flex items-center gap-1.5 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white px-4 sm:px-5 py-2.5 text-xs font-bold shadow-md shadow-slate-900/10 transition active:scale-[0.98] cursor-pointer">
                <span className="text-sm font-black leading-none">+</span>
                <span>Share Opportunity</span>
              </button>
            </Link>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Avatar Menu or Auth Buttons */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="User profile menu"
                  className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-sky-500/40 transition cursor-pointer"
                >
                  <Avatar
                    name={displayName}
                    photoURL={userProfile?.photoURL || user.photoURL || undefined}
                    size={36}
                  />
                </button>

                {showUserMenu && (
                  <div
                    className="hidden lg:block absolute right-0 top-full mt-2.5 w-64 rounded-3xl border border-white/90 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-2.5 shadow-2xl z-[100] text-[#0e1b33] dark:text-white pm-in"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <p className="text-xs font-bold text-[#0e1b33] dark:text-white truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                        <Sparkles size={13} className="text-sky-500" />
                        <span>{userProfile?.pixels ?? 0} Pixels</span>
                      </div>
                    </div>

                    <div className="py-1.5 space-y-0.5">
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#DFB76C] bg-[#16171D] hover:bg-[#20222a] border border-[#C5A059]/40 hover:border-[#DFB76C] transition mb-1.5 shadow-xs min-h-[40px]"
                        >
                          <span className="flex items-center gap-2.5">
                            <ShieldCheck size={15} className="text-[#C5A059] shrink-0" />
                            <span>Admin Console</span>
                          </span>
                          <span className="text-[10px] uppercase tracking-wider bg-[#DFB76C]/20 text-[#DFB76C] px-1.5 py-0.5 rounded font-black">Admin</span>
                        </Link>
                      )}
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <Settings size={15} className="text-slate-400 shrink-0" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        to="/bookmarks"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <Bookmark size={15} className="text-slate-400 shrink-0" />
                        <span>Bookmarks</span>
                      </Link>
                      <Link
                        to="/explore"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <Compass size={15} className="text-sky-500 shrink-0" />
                        <span>Explore</span>
                      </Link>
                      <Link
                        to="/leaderboard"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <Trophy size={15} className="text-amber-500 shrink-0" />
                        <span>Leaderboard</span>
                      </Link>
                      <Link
                        to="/support"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800"
                      >
                        <HelpCircle size={15} className="text-slate-400 shrink-0" />
                        <span>Help & Support</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5 mt-1">
                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer min-h-[40px] active:bg-rose-100/60"
                      >
                        <LogOut size={15} className="shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Guest Profile Menu Button on Mobile */}
                <button
                  ref={guestTriggerRef}
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-label="Guest profile menu"
                  className="sm:hidden grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200/90 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  <User size={16} />
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-[#0e1b33] font-bold text-[11px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 border border-slate-200/80 shadow-xs transition active:scale-[0.98] shrink-0"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-[11px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-md shadow-sky-500/20 transition active:scale-[0.98] shrink-0 whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Search Bar for small screens with Predictions & Autocomplete */}
        <div className="sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <SearchAutocomplete
              value={navSearchQuery}
              onChange={(val) => setNavSearchQuery(val)}
              onSubmit={(clean) => {
                if (clean) navigate(`/opportunities?q=${encodeURIComponent(clean)}`);
                else navigate('/opportunities');
              }}
              placeholder="Search opportunities, events, tags..."
              showShortcut={false}
              inputClassName="w-full rounded-full bg-white/70 hover:bg-white/90 focus:bg-white border border-white/90 py-2.5 pl-11 pr-10 text-xs text-[#0e1b33] placeholder-slate-400 outline-none focus:border-blue-500 shadow-xs"
            />
          </form>
        </div>

        {/* Main Routed Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Profile Dropdown / Sheet (Opened via Top Header Profile Icon) */}
      {showUserMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Dimmed backdrop - covers entire viewport behind menu */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setShowUserMenu(false)}
            aria-hidden="true"
          />

          {/* Container aligned top-right, transparent to pointer events outside the card */}
          <div className="relative z-10 flex flex-col items-end justify-start p-3 pt-16 sm:pt-20 pointer-events-none h-full w-full">
            {/* Mobile Profile Menu Card - receives pointer events */}
            <div
              ref={mobileMenuRef}
              className="pointer-events-auto relative w-full max-w-[280px] rounded-3xl border border-white/90 bg-white/95 dark:bg-[#0f1d33]/95 backdrop-blur-2xl p-3 shadow-2xl text-[#0e1b33] dark:text-white animate-in fade-in slide-in-from-top-3 duration-200 max-h-[calc(100vh-5.5rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header info */}
              <div className="px-3.5 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0e1b33] dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || 'Guest Builder'}
                  </p>
                  {user && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
                      <Sparkles size={13} className="text-sky-500" />
                      <span>{userProfile?.pixels ?? 0} Pixels</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(false)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  aria-label="Close profile menu"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Menu Options: Exact 6 options in order */}
              <div className="py-1.5 space-y-0.5">
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#DFB76C] bg-[#16171D] hover:bg-[#20222a] border border-[#C5A059]/40 hover:border-[#DFB76C] transition mb-1.5 shadow-xs min-h-[40px] cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShieldCheck size={15} className="text-[#C5A059] shrink-0" />
                      <span>Admin Console</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider bg-[#DFB76C]/20 text-[#DFB76C] px-1.5 py-0.5 rounded font-black">Admin</span>
                  </Link>
                )}
                {/* 1. My Profile */}
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <User size={15} className="text-slate-400 shrink-0" />
                  <span>My Profile</span>
                </Link>
                {/* 1b. Settings */}
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <Settings size={15} className="text-slate-400 shrink-0" />
                  <span>Settings</span>
                </Link>
                {/* 2. Bookmarks */}
                <Link
                  to="/bookmarks"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <Bookmark size={15} className="text-slate-400 shrink-0" />
                  <span>Bookmarks</span>
                </Link>
                {/* 3. Explore (Interactive Story Stack) */}
                <Link
                  to="/explore"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <Compass size={15} className="text-sky-500 shrink-0" />
                  <span>Explore</span>
                </Link>
                {/* 4. Leaderboard */}
                <Link
                  to="/leaderboard"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <Trophy size={15} className="text-amber-500 shrink-0" />
                  <span>Leaderboard</span>
                </Link>
                {/* 5. Help & Support */}
                <Link
                  to="/support"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-sky-600 transition min-h-[40px] active:bg-slate-100 dark:active:bg-slate-800 cursor-pointer"
                >
                  <HelpCircle size={15} className="text-slate-400 shrink-0" />
                  <span>Help & Support</span>
                </Link>
              </div>

              {/* 6. Sign Out / Sign In */}
              <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5 mt-1">
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer min-h-[40px] active:bg-rose-100/60"
                  >
                    <LogOut size={15} className="shrink-0" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setShowUserMenu(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer min-h-[40px]"
                  >
                    <LogOut size={15} className="shrink-0 rotate-180" />
                    <span>Sign In / Sign Up</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Story Stack Button (Mobile Only) */}
      {showStoryStackBtn && location.pathname !== '/explore' && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-3.5 sm:right-5 z-30 lg:hidden flex items-center shadow-lg shadow-sky-500/20 rounded-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Link
            to="/explore"
            className="flex items-center gap-2 pl-3.5 pr-2.5 py-2 rounded-l-full bg-gradient-to-r from-[#112240] to-[#1e3a8a] text-white border-y border-l border-sky-400/40 text-xs font-bold active:scale-95 transition shadow-sm select-none"
            aria-label="Interactive Story Stack"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500/25 text-sky-300 border border-sky-400/30 shrink-0">
              <Layers size={13} />
            </span>
            <span className="tracking-tight whitespace-nowrap font-extrabold text-[11px] sm:text-xs">Story Stack</span>
          </Link>
          <button
            type="button"
            onClick={handleDismissStoryStack}
            aria-label="Dismiss Story Stack button"
            className="grid h-[38px] w-7 place-items-center rounded-r-full bg-[#112240] hover:bg-[#1a335e] text-slate-400 hover:text-white border-y border-r border-sky-400/40 transition cursor-pointer select-none active:bg-slate-800"
            title="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar in Frosted Glass */}
      <nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/90 dark:border-slate-800/80 bg-white/85 dark:bg-[#0f1d33]/90 backdrop-blur-2xl lg:hidden text-slate-500 shadow-xl"
      >
        {navItems.map(([to, l, I]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-h-[58px] py-1.5 px-0.5 w-full text-[10px] font-semibold transition active:scale-95 ${
                isActive
                  ? 'text-[#2563eb] dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0e1b33] dark:hover:text-white'
              }`
            }
          >
            <div className="h-7 w-full flex items-center justify-center shrink-0">
              {l === 'Create' ? (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#112240] dark:bg-sky-500 text-white shadow-sm">
                  <I size={14} />
                </span>
              ) : (
                <I size={18} className="shrink-0" />
              )}
            </div>
            <span className="truncate max-w-full tracking-tight leading-none mt-1 select-none text-center">
              {l}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
