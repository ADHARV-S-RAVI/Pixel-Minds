import { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Award,
  FileText,
  Users as U,
  LayoutGrid,
  ClipboardList,
  Calendar,
  MapPin,
  Trophy,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Upload,
  CheckCircle2,
  Clock,
  Edit3,
  Megaphone,
  MessageSquare,
  Coins,
  Sliders,
  History,
  ShieldCheck,
  Lock,
  GraduationCap,
  Building2,
  X,
  XCircle,
  AlertCircle,
  Bell,
  Send,
  Inbox,
  Trash2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Code2,
  ArrowRight,
  Share2,
  Flag
} from 'lucide-react';
import { SubmissionDetailModal } from './components/SubmissionDetailModal';
import { ReportModal } from './components/ReportModal';
import { FAQSection } from './components/FAQSection';
import { getCategoryMeta } from './utils/meta';
import { renderWithHashtags } from './utils/text';
import { SearchAutocomplete } from './components/SearchAutocomplete';
import { useApp } from './store';
import {
  ReferBtn,
  Btn,
  BtnLink,
  Card,
  Badge,
  Avatar,
  OppCard,
  PostCard,
  Composer,
  SectionTitle
} from './ui';
import { opps as initialOpps, cats, rankOf } from './data';
import type { Opp } from './data';
import {
  COURSE_OPTIONS,
  getBranchesForCourse,
  isPredefinedCourse,
  isPredefinedBranch
} from './data/academicOptions';
import type { 
  User as UserType, 
  RewardConfig, 
  AuditLog, 
  Announcement, 
  CommunityPost,
  OpportunityStatus,
  Opportunity,
  PixelTransaction,
  AdminSentNotification
} from './types';
import { useAuth } from './contexts/AuthContext';
import {
  getPublishedOpportunities,
  getOpportunityById,
  submitOpportunity as submitToFirestore,
  getPendingSubmissions,
  getAllOpportunities,
  updateOpportunityAdmin,
  incrementOpportunityViews,
  incrementApplyClicks,
  getUserSubmissions,
  getSharedOpportunities,
  recordOpportunityShare,
  submitOpportunityAdmin,
  deleteOpportunityAdmin
} from './services/opportunities';
import { uploadImage, deleteStorageFile, validateOpportunityImageFile, parseOpportunityImages } from './services/storage';
import {
  formatTimestampToDateInput,
  parseDateInputToTimestamp,
  formatDateToDDMMYYYY,
  validateOpportunityDates,
  getOpportunityDeadlineInfo
} from './utils/dateUtils';
import { updateUserProfile, getUserProfile, getLeaderboardUsers, getUserGlobalRank, type LeaderboardUserEntry } from './services/users';
import { getRecentPlatformActivities, type RecentActivityItem } from './services/activity';
import { getUserCommunityPosts } from './services/community';
import {
  DEFAULT_REWARD_CONFIG,
  getRewardConfig,
  updateRewardConfig,
  adjustUserPixels,
  getPixelTransactions,
  getAllUsersAdmin,
  toggleUserSuspension,
  createAdminCommunityPost,
  getCommunityPosts,
  deleteCommunityPost,
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getAuditLogs,
  recordAuditLog,
  sendAdminNotification,
  getAdminSentNotifications,
  deleteAdminNotification
} from './services/admin';
import { uploadAnnouncementImage } from './services/announcements';
import { getUserApplications, confirmOpportunityRegistration, type UserApplication } from './services/applications';
import { getAllReports, resolveReport, dismissReport, deleteReportedItem, type ReportItem } from './services/reports';

const W: FC<{ children: any; className?: string; id?: string }> = ({ children, className = '', id }) => (
  <main id={id} className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</main>
);

const Mini: FC<{ title?: string }> = ({ title = 'Top Contributors' }) => {
  const [topUsers, setTopUsers] = useState<LeaderboardUserEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    getLeaderboardUsers(4)
      .then((data) => {
        if (mounted) setTopUsers(data.users || []);
      })
      .catch((err) => console.error('Failed to load top users:', err));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-3xl pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 p-5 shadow-sm text-[#0e1b33]">
      <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200/60">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Trophy size={14} className="text-blue-600" />
          <span>{title}</span>
        </h3>
        <Link to="/leaderboard" className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold">
          View All
        </Link>
      </div>
      <div className="space-y-2.5">
        {topUsers.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No contributors yet</p>
        ) : (
          topUsers.map((u, idx) => (
            <div key={u.id || idx} className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-xl hover:bg-blue-50/50 transition">
              <Avatar name={u.name} photoURL={u.avatarUrl} size={30} />
              <div className="flex-1 text-xs font-semibold text-[#0e1b33] truncate">{u.name}</div>
              <span className="text-xs font-extrabold text-blue-600">{u.pixels}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// LANDING / HOME PAGE
// ==========================================
export function Landing() {
  const [firestoreOpps, setFirestoreOpps] = useState<Opp[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getRecentPlatformActivities(4)
      .then((acts) => {
        if (mounted) {
          setRecentActivities(acts);
          setActivitiesLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setActivitiesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    getPublishedOpportunities(undefined, 50)
      .then((res) => {
        if (res.opportunities && res.opportunities.length > 0) {
          const mapped: Opp[] = res.opportunities.map((o) => {
            const dInfo = getOpportunityDeadlineInfo(o.deadline);
            return {
              id: o.id,
              title: o.title,
              org: o.organizer,
              cat: o.category,
              mode: o.mode ? o.mode.charAt(0).toUpperCase() + o.mode.slice(1) : 'Online',
              deadline: dInfo.formattedDeadline,
              days: dInfo.daysRemaining,
              rawDeadline: o.deadline,
              isExpired: dInfo.isExpired,
              prize: o.prize || 'Certificate',
              skills: o.skills || ['Tech'],
              description: o.description,
              officialUrl: o.officialUrl,
              imageUrl: o.imageUrl,
              views: o.views,
              applyClicks: o.applyClicks,
              featured: o.featured,
              stipend: o.stipend,
              eligibility: o.eligibility,
              teamSize: o.teamSize,
              additionalInfo: o.additionalInfo,
              source: o.source
            };
          });
          setFirestoreOpps(mapped);
        }
      })
      .catch(() => {});

    getCommunityPosts(false)
      .then((posts) => {
        setCommunityPosts(posts);
      })
      .catch(() => {});
  }, []);

  const allOpps = useMemo(() => {
    const combined = [...firestoreOpps];
    const seenTitles = new Set(firestoreOpps.map(o => o.title.toLowerCase().trim()));
    for (const opp of initialOpps) {
      if (!seenTitles.has(opp.title.toLowerCase().trim())) {
        combined.push(opp);
      }
    }
    // Only display genuinely upcoming opportunities (exclude expired)
    return combined.filter(
      (o) =>
        !o.isExpired &&
        o.id !== '38bee408-e867-497e-a94d-ac423b317297' &&
        !o.title.toLowerCase().includes('wow india')
    );
  }, [firestoreOpps]);
  // If an opportunity is marked featured by admin, prioritize it in featured/trending
  const featuredOpps = allOpps.filter(o => o.featured);
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const prevFeatured = () => {
    const listLen = featuredOpps.length || allOpps.length || 1;
    setFeaturedIndex((i) => (i <= 0 ? listLen - 1 : i - 1));
  };

  const nextFeatured = () => {
    const listLen = featuredOpps.length || allOpps.length || 1;
    setFeaturedIndex((i) => (i + 1) % listLen);
  };

  const currentFeaturedOpp = featuredOpps.length > 0
    ? featuredOpps[featuredIndex % featuredOpps.length]
    : allOpps[featuredIndex % allOpps.length] || allOpps[0];

  const trending = featuredOpps.length > 0 
    ? [...featuredOpps, ...allOpps.filter(o => !o.featured)].slice(0, 6)
    : allOpps.slice(0, 6);
  const hackathons = allOpps.filter((o) => ['Hackathons', 'Competitions'].includes(o.cat));
  const internships = allOpps.filter((o) => ['Internships', 'Fellowships', 'Startup Programs'].includes(o.cat));
  const events = allOpps.filter((o) => ['Events', 'Workshops', 'Conferences'].includes(o.cat));
  const feedItems = communityPosts;

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* DASHBOARD GRID: CENTER CONTENT (Hero + Trending) + RIGHT (Featured + Recent) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* CENTER COLUMN (Hero Section + Trending Opportunities) */}
        <div className="xl:col-span-8 space-y-6 min-w-0">
          {/* Hero Section Card matching reference */}
          <div className="pm-glass rounded-[28px] p-5 sm:p-8 relative overflow-hidden border border-white/90 shadow-sm flex flex-col justify-between max-w-full">
            {/* Ambient subtle light-blue glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-blue-400/15 blur-3xl max-w-full" />

            {/* Flex container between Text & 3D Crystal Orb */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-md w-full">
                {/* Headline matching image */}
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#0e1b33] tracking-tight leading-[1.12]">
                  Discover. Share.<br />
                  <span className="text-[#2563eb]">Earn Pixels.</span>
                </h1>

                {/* Subtitle */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3.5 max-w-sm">
                  Find hackathons, internships, events, workshops and scholarships curated for the next generation of tech builders.
                </p>

                {/* CTA Buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <Link to="/opportunities" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white px-5 sm:px-6 py-3 text-xs font-bold shadow-md shadow-slate-900/10 transition active:scale-[0.98] cursor-pointer">
                      <span>Explore Opportunities</span>
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                  <Link to="/submit" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/80 hover:bg-white text-[#0e1b33] border border-white/90 px-5 sm:px-6 py-3 text-xs font-bold shadow-xs transition active:scale-[0.98] cursor-pointer">
                      <Upload size={14} className="text-[#2563eb]" />
                      <span>Share an Opportunity</span>
                    </button>
                  </Link>
                </div>

                {/* Stats Row with vertical dividers matching reference */}
                <div className="mt-8 flex items-center justify-between sm:justify-start gap-3 sm:gap-7 pt-5 border-t border-slate-200/60">
                  <div>
                    <p className="text-lg sm:text-2xl font-black text-[#0e1b33] tracking-tight">2,400+</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">opportunities</p>
                  </div>
                  <div className="h-8 w-px bg-slate-300/60" />
                  <div>
                    <p className="text-lg sm:text-2xl font-black text-[#0e1b33] tracking-tight">18k</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">builders</p>
                  </div>
                  <div className="h-8 w-px bg-slate-300/60" />
                  <div>
                    <p className="text-lg sm:text-2xl font-black text-[#0e1b33] tracking-tight">1.2M</p>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Pixels awarded</p>
                  </div>
                </div>
              </div>

              {/* 3D Crystal Blue Orb matching reference */}
              <div className="relative hidden md:flex items-center justify-center shrink-0 w-52 h-52 lg:w-72 lg:h-72 my-auto ml-auto">
                <img
                  src="/hero-orb.jpg"
                  alt="Pixel Minds Tech Orb"
                  className="w-full h-full object-contain drop-shadow-xl select-none pointer-events-none rounded-full"
                />
                {/* Floating Node Badges */}
                <div className="absolute top-10 left-2 rounded-full bg-white/95 border border-white shadow-lg p-2.5 text-[#2563eb] flex items-center justify-center animate-bounce duration-1000">
                  <Code2 size={18} />
                </div>
                <div className="absolute top-4 right-8 rounded-full bg-[#2563eb] text-white shadow-lg p-2.5 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div className="absolute bottom-8 right-3 rounded-full bg-white/95 border border-white shadow-lg p-2.5 text-[#2563eb] flex items-center justify-center">
                  <Calendar size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Trending Opportunities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#0e1b33] tracking-tight">Trending Opportunities</h2>
                <span className="text-[#2563eb] font-bold">↗</span>
              </div>
              <Link to="/opportunities" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition bg-white/60 hover:bg-white px-3 py-1.5 rounded-full border border-white/80 shadow-2xs">
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {trending.slice(0, 3).map((o) => (
                <OppCard key={o.id} o={o} variant="light" />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Featured Opportunity Card + Recent Activity) */}
        <div className="xl:col-span-4 space-y-6 w-full grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-5 xl:gap-6">
          {/* Featured Opportunity Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-[#0e1b33] tracking-tight">Featured Opportunity</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevFeatured}
                  aria-label="Previous featured"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/70 hover:bg-white text-slate-700 border border-white/80 shadow-xs transition hover:text-blue-600 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={nextFeatured}
                  aria-label="Next featured"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white/70 hover:bg-white text-slate-700 border border-white/80 shadow-xs transition hover:text-blue-600 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <OppCard o={currentFeaturedOpp} variant="dark" />
          </div>

          {/* Recent Activity Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-[#0e1b33] tracking-tight">Recent Activity</h2>
              <Link to="/feed" className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition bg-white/60 hover:bg-white px-3 py-1.5 rounded-full border border-white/80 shadow-2xs">
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="pm-glass-card rounded-[24px] p-4 sm:p-5 space-y-3.5 border border-white/90 shadow-sm">
              {activitiesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading recent activities...</div>
              ) : recentActivities.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-2">
                    <Sparkles size={16} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No recent activity yet</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[200px] mx-auto">
                    Platform activities will appear as members join and share opportunities.
                  </p>
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 border border-blue-100 text-sm shadow-2xs">
                      {act.badge}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#0e1b33] font-bold truncate">
                        {act.title}
                      </p>
                      {act.subtitle && (
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                          {act.subtitle}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-slate-400 shrink-0" />
                        <span>{act.timeAgo}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECONDARY SECTIONS: Categories, Hackathons, Internships, etc. */}
      {/* ============================================================ */}
      <div className="space-y-12 pt-6">
        {/* Explore Categories */}
        <section>
          <SectionTitle t="Explore Categories" subtitle="Browse opportunities tailored to your tech career pathway" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {cats.map((c) => {
              const metaInfo = getCategoryMeta(c);
              const I = metaInfo.Icon;
              const count = allOpps.filter((o) => o.cat === c).length;
              return (
                <Link key={c} to={'/opportunities?cat=' + encodeURIComponent(c)} className="group">
                  <div className="rounded-2xl pm-glass-card border border-white/90 p-4 shadow-2xs transition-all duration-200 group-hover:-translate-y-1 group-hover:border-blue-400/50 group-hover:shadow-md">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 shadow-2xs group-hover:bg-[#112240] group-hover:text-white transition">
                      <I size={18} />
                    </div>
                    <p className="text-xs font-bold text-[#0e1b33] group-hover:text-blue-600 transition">{c}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{count || 12}+ listed</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Upcoming Hackathons & Competitions */}
        <section>
          <SectionTitle t="Upcoming Hackathons & Competitions" to="/opportunities?cat=Hackathons" subtitle="High-impact hackathons and tech contests closing soon" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {hackathons.slice(0, 4).map((o) => {
              const metaInfo = getCategoryMeta(o.cat);
              const I = metaInfo.Icon;
              return (
                <div
                  key={o.id}
                  className="group relative flex flex-col justify-between rounded-2xl pm-glass-card border border-white/90 p-4 sm:p-5 hover:border-blue-400/60 hover:shadow-md transition-all duration-200 text-[#0e1b33] min-h-[160px] h-full"
                >
                  <div>
                    {/* Top Badges Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/90 border border-blue-200/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                          <I size={12} className="text-blue-600 shrink-0" />
                          <span className="truncate">{o.cat || 'Hackathon'}</span>
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {o.mode}
                        </span>
                      </div>
                      {o.isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                          <span>Closed</span>
                        </span>
                      ) : o.days > 0 && o.days <= 14 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full shrink-0">
                          <Clock size={10} className="text-amber-600" />
                          <span>{o.days === 1 ? '1d left' : `${o.days}d left`}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Title & Organization */}
                    <Link to={'/opportunities/' + o.id} className="block group-hover:text-blue-600 transition">
                      <h3 className="font-extrabold text-sm sm:text-base text-[#0e1b33] tracking-tight leading-snug line-clamp-2">
                        {o.title}
                      </h3>
                    </Link>
                    {o.org && (
                      <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                        by {o.org}
                      </p>
                    )}
                  </div>

                  {/* Bottom Footer: Deadline, Prize & View Button */}
                  <div className="mt-3.5 pt-3 border-t border-slate-200/50 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 min-w-0">
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-[11px] font-medium text-slate-600">{o.deadline}</span>
                      </span>
                      {o.prize && (
                        <span className="flex items-center gap-1 font-bold text-amber-600 shrink-0">
                          <Trophy size={12} className="text-amber-500" />
                          <span className="text-[11px] truncate max-w-[120px] sm:max-w-[140px]">{o.prize}</span>
                        </span>
                      )}
                    </div>

                    <BtnLink
                      to={'/opportunities/' + o.id}
                      v="outline"
                      className="!py-1.5 !px-3.5 !text-xs !min-h-8 shrink-0 !rounded-full hover:!border-blue-400 hover:!text-blue-600"
                    >
                      <span>View</span>
                      <ArrowRight size={12} />
                    </BtnLink>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Internships & Fellowships */}
        <section>
          <SectionTitle t="Internships & Fellowships" to="/opportunities?cat=Internships" subtitle="Fast-track your developer career" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {internships.slice(0, 3).map((o) => (
              <OppCard key={o.id} o={o} variant="light" />
            ))}
          </div>
        </section>

        {/* Tech Events & Workshops */}
        <section>
          <SectionTitle t="Tech Events & Workshops" to="/opportunities?cat=Events" subtitle="Learn new frameworks and meet builders" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.slice(0, 3).map((o) => (
              <OppCard key={o.id} o={o} variant="light" />
            ))}
          </div>
        </section>

        {/* Community Activity & Leaderboard Preview */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <SectionTitle t="Community Pulse" to="/feed" subtitle="Real-time discussions from fellow builders" />
            {feedItems.length > 0 ? (
              feedItems.slice(0, 2).map((p: any) => (
                <PostCard key={p.id} p={p} />
              ))
            ) : (
              <div className="rounded-2xl pm-glass-card border border-white/90 p-6 text-center text-slate-500 shadow-2xs">
                <MessageSquare size={28} className="mx-auto text-blue-500/50 mb-2" />
                <p className="text-xs font-bold text-[#0e1b33]">No community posts yet</p>
                <p className="text-[11px] text-slate-500 mt-1">Be the first to share your hackathon experience or project ideas in the feed!</p>
                <Link to="/feed" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
                  <span>Visit Feed</span> &rarr;
                </Link>
              </div>
            )}
          </div>
          <div>
            <SectionTitle t="Top Pixel Holders" to="/leaderboard" />
            <Mini title="Monthly Ranks" />
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />

        {/* Share CTA Banner */}
        <section className="rounded-3xl border border-white/90 pm-glass-card p-8 sm:p-12 text-center text-[#0e1b33] shadow-sm relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
          <h2 className="text-2xl font-black tracking-tight text-[#0e1b33] sm:text-3xl font-display">
            Found an exciting tech opportunity?
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-sm text-slate-600">
            Submit hackathons, events, or internships. Once verified, you'll earn +50 Pixels and help hundreds of students apply.
          </p>
          <Link to="/submit">
            <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#112240] hover:bg-[#1a335e] px-8 py-3 text-sm font-bold text-white shadow-md shadow-slate-900/10 active:scale-[0.98] transition cursor-pointer">
              <Sparkles size={16} />
              <span>Share an Opportunity</span>
            </button>
          </Link>
        </section>
      </div>
    </div>
  );
}

// ==========================================
// OPPORTUNITIES DISCOVERY PAGE
// ==========================================
export function Opportunities() {
  const [sp, setSp] = useSearchParams();
  const location = useLocation();
  const { saved } = useApp();
  const isSavedFilter = location.pathname === '/bookmarks' || sp.get('saved') === 'true';
  const [q, setQ] = useState(sp.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(sp.get('q') || '');
  const [c, setCat] = useState(sp.get('cat') || 'All');
  const [m, setM] = useState('Any');
  const [d, setD] = useState('Any');
  const [s, setS] = useState('deadline');
  const [firestoreOpps, setFirestoreOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounce search input by 300ms to eliminate network race conditions and lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  useEffect(() => {
    setQ(sp.get('q') || '');
    setCat(sp.get('cat') || 'All');
  }, [sp]);

  useEffect(() => {
    if (location.hash === '#discover-opportunities') {
      const el = document.getElementById('discover-opportunities');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location.hash]);

  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    getPublishedOpportunities(undefined, 50, c !== 'All' ? c : undefined, debouncedQ || undefined)
      .then((res) => {
        if (!isCurrent) return;
        if (res.opportunities) {
          const mapped: Opp[] = res.opportunities.map((o) => {
            const dInfo = getOpportunityDeadlineInfo(o.deadline);
            return {
              id: o.id,
              title: o.title,
              org: o.organizer,
              cat: o.category,
              mode: o.mode ? o.mode.charAt(0).toUpperCase() + o.mode.slice(1) : 'Online',
              deadline: dInfo.formattedDeadline,
              days: dInfo.daysRemaining,
              rawDeadline: o.deadline,
              isExpired: dInfo.isExpired,
              prize: o.prize || 'Certificate',
              skills: o.skills || ['Tech'],
              description: o.description,
              officialUrl: o.officialUrl,
              imageUrl: o.imageUrl,
              views: o.views,
              applyClicks: o.applyClicks,
              featured: o.featured,
              stipend: o.stipend,
              eligibility: o.eligibility,
              teamSize: o.teamSize,
              additionalInfo: o.additionalInfo,
              location: o.location,
              source: o.source
            };
          });
          setFirestoreOpps(mapped);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [c, debouncedQ]);

  const allOpps = useMemo(() => {
    const combined = [...firestoreOpps];
    const seenTitles = new Set(firestoreOpps.map(o => o.title.toLowerCase().trim()));
    for (const opp of initialOpps) {
      if (!seenTitles.has(opp.title.toLowerCase().trim())) {
        combined.push(opp);
      }
    }
    // Only display genuinely upcoming opportunities (exclude expired)
    return combined.filter(
      (o) =>
        !o.isExpired &&
        o.days > 0 &&
        o.id !== '38bee408-e867-497e-a94d-ac423b317297' &&
        !o.title.toLowerCase().includes('wow india')
    );
  }, [firestoreOpps]);

  const cleanSearch = debouncedQ.trim().toLowerCase();
  const list = allOpps
    .filter((o) => {
      if (isSavedFilter && !saved.includes(String(o.id))) return false;
      if (c !== 'All' && o.cat !== c) return false;
      if (m !== 'Any' && o.mode.toLowerCase() !== m.toLowerCase()) return false;
      if (d !== 'Any' && o.days > (d === '10' ? 10 : 30)) return false;
      if (cleanSearch) {
        const searchCorpus = [
          o.title,
          o.org,
          o.cat,
          ...(o.skills || []),
          o.description || '',
          o.location || ''
        ].join(' ').toLowerCase();
        const terms = cleanSearch.split(/\s+/).filter(Boolean);
        return terms.every(term => searchCorpus.includes(term));
      }
      return true;
    })
    .sort((a, b) => (s === 'deadline' ? a.days - b.days : Number(b.id) - Number(a.id)));

  const sel =
    'rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#162B45] px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-xs cursor-pointer hover:border-blue-400 transition';

  return (
    <W id="discover-opportunities" className="py-8 space-y-7 scroll-mt-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#6E655C] backdrop-blur-md mb-2 shadow-xs">
            <Sparkles size={12} className="text-[#C5A059]" />
            Curated Tech Programs & Competitions
          </div>
          <h1 className="font-['Outfit',sans-serif] text-3xl font-extrabold tracking-tight text-[#16171D] sm:text-4xl flex items-center gap-2.5">
            {isSavedFilter ? (
              <>
                <Bookmark className="text-sky-500 fill-sky-500" size={28} />
                <span>Saved Bookmarks</span>
              </>
            ) : (
              <span>Discover Opportunities</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#7D756C] mt-1 max-w-xl">
            {isSavedFilter
              ? 'All tech programs, hackathons, and internships you have marked for easy tracking.'
              : 'Search hackathons, internships, fellowships, and tech conferences worldwide curated for modern builders.'}
          </p>
        </div>

        <Link to="/submit" className="shrink-0">
          <Btn className="!text-xs !py-2.5 !px-4">
            + Share Opportunity
          </Btn>
        </Link>
      </div>

      {/* Search Bar with Autocomplete Predictions */}
      <SearchAutocomplete
        value={q}
        onChange={(val) => {
          setQ(val);
          setSp((prev) => {
            if (val) prev.set('q', val);
            else prev.delete('q');
            return prev;
          });
        }}
        onSubmit={(val) => {
          setQ(val);
          setSp((prev) => {
            if (val) prev.set('q', val);
            else prev.delete('q');
            return prev;
          });
        }}
        placeholder="Search by title, organizer, or skills (e.g. AI, React, Cloud, Web3)..."
        showShortcut={false}
        inputClassName="w-full rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#162B45] py-3 pl-11 pr-10 text-xs sm:text-sm text-[#0e1b33] dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs transition"
      />

      {/* Category Filter Chips */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <button
          onClick={() => {
            setSp((prev) => {
              if (isSavedFilter) prev.delete('saved');
              else prev.set('saved', 'true');
              return prev;
            });
          }}
          className={`shrink-0 rounded-full border-2 px-4 py-2 text-xs font-bold transition duration-200 cursor-pointer flex items-center gap-1.5 ${
            isSavedFilter
              ? 'border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-500/25'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#162B45] text-slate-700 dark:text-slate-100 hover:text-sky-500'
          }`}
        >
          <Bookmark size={13} fill={isSavedFilter ? 'currentColor' : 'none'} />
          <span>Bookmarks ({saved.length})</span>
        </button>
        {['All', ...cats].map((x) => {
          const isActive = c === x;
          return (
            <button
              key={x}
              onClick={() => {
                setCat(x);
                setSp((prev) => {
                  if (x !== 'All') prev.set('cat', x);
                  else prev.delete('cat');
                  return prev;
                });
              }}
              className={`shrink-0 rounded-full border-2 px-4 py-2 text-xs font-bold transition duration-200 cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#162B45] text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#1c3656] hover:text-blue-600 dark:hover:text-sky-300'
              }`}
            >
              {x}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters & Counter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <select className={sel} value={m} onChange={(e) => setM(e.target.value)}>
          {['Any mode', 'Online', 'Onsite', 'Hybrid', 'Remote'].map((x) => (
            <option key={x} value={x.startsWith('Any') ? 'Any' : x} className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">
              {x}
            </option>
          ))}
        </select>

        <select className={sel} value={d} onChange={(e) => setD(e.target.value)}>
          <option value="Any" className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">Any deadline</option>
          <option value="10" className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">Closing in 10 days</option>
          <option value="30" className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">Closing in 30 days</option>
        </select>

        <select className={sel} value={s} onChange={(e) => setS(e.target.value)}>
          <option value="deadline" className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">Sort: Closing soon</option>
          <option value="new" className="bg-white dark:bg-[#162B45] text-[#0e1b33] dark:text-white">Sort: Newest</option>
        </select>

        <span className="shrink-0 sm:ml-auto self-center text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap pl-2">
          <b className="text-blue-600 dark:text-sky-400 font-extrabold">{list.length}</b> opportunities available
        </span>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-3xl bg-stone-200/50 animate-pulse border border-black/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {list.map((o) => (
            <OppCard key={o.id} o={o} />
          ))}
        </div>
      )}

      {!list.length && !loading && (
        <Card className="py-16 text-center pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          {isSavedFilter ? (
            <div className="space-y-3">
              <Bookmark size={40} className="mx-auto text-sky-500/60" />
              <p className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D]">No bookmarked opportunities yet</p>
              <p className="text-xs text-[#7D756C] max-w-sm mx-auto">
                Click the bookmark ribbon on any hackathon, internship, or competition card to save it here for quick reference.
              </p>
              <button
                onClick={() => setSp((prev) => { prev.delete('saved'); return prev; })}
                className="mt-3 inline-block px-5 py-2.5 rounded-full bg-[#112240] text-xs font-bold text-white hover:bg-[#1a335e] transition cursor-pointer shadow-xs"
              >
                Browse All Opportunities
              </button>
            </div>
          ) : (
            <div>
              <p className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D] dark:text-white">No opportunities matched your criteria</p>
              <p className="text-xs text-[#7D756C] dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {q
                  ? `No active opportunities found matching "${q}". Try one of the popular categories below or reset your filters:`
                  : 'Try resetting your filters or submit an opportunity you know!'}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto">
                {['Hackathons', 'Internships', 'Fellowships', 'Competitions', 'AI', 'React'].map((kw) => (
                  <button
                    key={kw}
                    onClick={() => {
                      setQ(kw);
                      setSp((prev) => {
                        prev.set('q', kw);
                        return prev;
                      });
                    }}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {q && (
                  <button
                    onClick={() => {
                      setQ('');
                      setSp((prev) => {
                        prev.delete('q');
                        return prev;
                      });
                    }}
                    className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#162B45] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => {
                    setQ('');
                    setCat('All');
                    setM('Any');
                    setD('Any');
                    setSp(new URLSearchParams());
                  }}
                  className="px-4 py-2 rounded-full bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
                >
                  Reset All Filters
                </button>
                <Link to="/submit" className="inline-block">
                  <Btn className="!text-xs !py-2 !px-4">Share an Opportunity</Btn>
                </Link>
              </div>
            </div>
          )}
        </Card>
      )}
    </W>
  );
}

// ==========================================
// OPPORTUNITY DETAILS PAGE
// ==========================================
export function OppDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [firestoreOpp, setFirestoreOpp] = useState<Opp | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const { saved, toggle, link, copy, applied, trackApplication, code, say } = useApp();

  useEffect(() => {
    if (id) {
      getOpportunityById(id).then((o) => {
        if (o) {
          const dInfo = getOpportunityDeadlineInfo(o.deadline);
          setFirestoreOpp({
            id: o.id,
            title: o.title,
            org: o.organizer,
            cat: o.category,
            mode: o.mode ? o.mode.charAt(0).toUpperCase() + o.mode.slice(1) : 'Online',
            deadline: dInfo.formattedDeadline,
            days: dInfo.daysRemaining,
            rawDeadline: o.deadline,
            isExpired: dInfo.isExpired,
            prize: o.prize || 'Certificate',
            skills: o.skills || ['Tech'],
            description: o.description,
            officialUrl: o.officialUrl,
            imageUrl: o.imageUrl,
            views: o.views,
            applyClicks: o.applyClicks,
            featured: o.featured,
            stipend: o.stipend,
            eligibility: o.eligibility,
            teamSize: o.teamSize,
            additionalInfo: o.additionalInfo,
            location: o.location,
            source: o.source
          });
          incrementOpportunityViews(id);
        }
      });
    }
  }, [id]);

  const [selectedImgIdx, setSelectedImgIdx] = useState(0);

  const defaultOpp = initialOpps.find((x) => String(x.id) === String(id));
  const o = firestoreOpp || defaultOpp;

  if (!o) {
    return (
      <W className="py-20 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Opportunity Not Found</h1>
        <p className="text-xs text-slate-500 mt-1">The opportunity might have been archived or removed.</p>
        <BtnLink to="/opportunities" className="mt-5">
          Browse Opportunities
        </BtnLink>
      </W>
    );
  }

  const catMeta = getCategoryMeta(o.cat);
  const Ic = catMeta.Icon;
  const isSaved = saved.includes(String(o.id));
  const isDone = applied.includes(o.id);
  const ref = link('/opportunities/' + o.id);
  const images = parseOpportunityImages(o.imageUrl);

  const handleApply = () => {
    if (!user) {
      sessionStorage.setItem('pm_auth_redirect', `/opportunities/${o.id}`);
      navigate('/login');
      say('Please sign in or register to apply for opportunities.');
      return;
    }
    if (id) incrementApplyClicks(id);
    trackApplication({
      id: o.id,
      title: o.title,
      organizer: o.org,
      category: o.cat,
      mode: o.mode,
      deadline: o.deadline,
      officialUrl: o.officialUrl
    });
    const targetUrl = o.officialUrl || `https://www.google.com/search?q=${encodeURIComponent(o.title + ' ' + o.org + ' apply')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <W className="py-6 space-y-7">
      {/* Banner Header - Celestial Dark Glass */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#112240] via-[#1d3557] to-[#1e40af] p-7 text-white sm:p-10 shadow-xl border border-blue-400/30">
        {/* Subtle warm celestial glow and orbital arc */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-10 h-72 w-72 text-sky-400/15"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="1" />
          <path d="M10 100 Q 100 20 190 100" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
        </svg>

        <div className="relative z-10 flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#DFB76C] border border-white/15 shadow-xs">
            <Ic size={13} className="text-[#DFB76C]" />
            {o.cat}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white/70 border border-white/10">
            <MapPin size={11} className="text-sky-300" />
            {o.location ? `${o.mode} (${o.location})` : o.mode}
          </span>
        </div>

        <h1 className="relative z-10 font-['Outfit',sans-serif] text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
          {o.title}
        </h1>
        <p className="relative z-10 mt-2 text-sm sm:text-base font-medium text-white/75">
          Organized by <span className="text-sky-300 font-semibold">{o.org}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Details */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [Calendar, 'Deadline', o.isExpired || o.days <= 0 ? `${o.deadline} · Closed` : `${o.deadline} · ${o.days === 1 ? '1d left' : `${o.days}d left`}`],
              [MapPin, 'Mode / Location', o.location ? `${o.mode} (${o.location})` : o.mode],
              [Trophy, 'Reward / Prize', o.prize || (o.stipend ? `Stipend: ${o.stipend}` : 'Recognition')],
              [Sparkles, 'Category', o.cat]
            ].map(([I, l, v]: any) => (
              <Card key={l} className="p-4 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <div className="flex items-center justify-between">
                  <I size={17} className="text-sky-500" />
                </div>
                <p className="mt-3 text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">{l}</p>
                <p className="text-xs font-extrabold text-[#16171D] mt-0.5 truncate">{v}</p>
              </Card>
            ))}
          </div>

          {/* Banner Media if uploaded */}
          {images.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-3xl overflow-hidden border border-black/10 shadow-sm max-h-96 bg-slate-100">
                <img src={images[selectedImgIdx] || images[0]} alt={o.title} className="w-full max-h-96 object-cover transition-all duration-300" />
              </div>
              {images.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImgIdx(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        selectedImgIdx === idx ? 'border-sky-500 shadow-md ring-2 ring-sky-500/30' : 'border-black/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Card className="p-6 sm:p-7 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33] space-y-6">
            <div>
              <h2 className="font-['Outfit',sans-serif] text-lg font-bold text-[#16171D]">About the Opportunity</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#4A453F] whitespace-pre-line">
                {renderWithHashtags(
                  o.description ||
                    `${o.title}, organized by ${o.org}, is a verified ${o.mode.toLowerCase()} program tailored for ambitious developers and students. Applications close on ${o.deadline}. Register early to secure your spot.`
                )}
              </p>
            </div>

            {/* Additional specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-black/8 pt-5 text-xs">
              {o.stipend && (
                <div className="p-3 rounded-2xl bg-black/[0.03] border border-black/5">
                  <span className="font-semibold text-[#8C827A] block">Stipend / Grant:</span>
                  <span className="font-bold text-[#16171D] text-sm mt-0.5 block">{o.stipend}</span>
                </div>
              )}
              {o.teamSize && (
                <div className="p-3 rounded-2xl bg-black/[0.03] border border-black/5">
                  <span className="font-semibold text-[#8C827A] block">Team Size:</span>
                  <span className="font-bold text-[#16171D] text-sm mt-0.5 block">{o.teamSize}</span>
                </div>
              )}
              {o.eligibility && (
                <div className="sm:col-span-2 p-3 rounded-2xl bg-black/[0.03] border border-black/5">
                  <span className="font-semibold text-[#8C827A] block">Eligibility Criteria:</span>
                  <span className="font-bold text-[#16171D] mt-0.5 block">{o.eligibility}</span>
                </div>
              )}
              {o.additionalInfo && (
                <div className="sm:col-span-2 p-3 rounded-2xl bg-black/[0.03] border border-black/5">
                  <span className="font-semibold text-[#8C827A] block">Additional Instructions:</span>
                  <span className="text-[#4A453F] whitespace-pre-line mt-0.5 block">{o.additionalInfo}</span>
                </div>
              )}
            </div>

            <div className="border-t border-black/8 pt-5">
              <h2 className="font-['Outfit',sans-serif] text-sm font-bold uppercase tracking-wider text-[#16171D]">Skills &amp; Tech Stack</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.skills.map((s) => (
                  <Badge key={s} className="!px-3.5 !py-1 text-xs font-semibold !rounded-full bg-black/[0.05] text-[#2D2A26] border-black/8 hover:border-[#C5A059]/40">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Actions */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-3.5 p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
            {o.isExpired || o.days <= 0 ? (
              <div className="space-y-2">
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-center">
                  <span className="text-xs font-bold text-amber-700 block">Applications Closed</span>
                  <span className="text-[11px] text-amber-600/80 block mt-0.5">The deadline for this opportunity has passed ({o.deadline}).</span>
                </div>
                {o.officialUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(o.officialUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full py-2.5 rounded-full border border-slate-200 bg-white/70 hover:bg-white text-slate-600 hover:text-[#0e1b33] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    View Official Archive
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
            ) : (
              <Btn onClick={handleApply} className="w-full !py-3 !rounded-full">
                {isDone ? (
                  <>
                    <Check size={16} />
                    Registered
                  </>
                ) : (
                  <>
                    Apply on Official Site
                    <ExternalLink size={15} />
                  </>
                )}
              </Btn>
            )}

            <ReferBtn title={o.title} path={'/opportunities/' + o.id} className="w-full !py-3 !rounded-full" />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggle(String(o.id))}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-white/80 hover:bg-white text-slate-700 hover:text-[#0e1b33] px-3.5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer select-none active:scale-[0.98] truncate"
              >
                <Bookmark size={14} fill={isSaved ? '#38BDF8' : 'none'} className={`shrink-0 ${isSaved ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="truncate">{isSaved ? 'Saved' : 'Save Bookmark'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                title="Report Opportunity"
                className="inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 py-2.5 rounded-full border border-slate-200/90 dark:border-white/10 bg-white/80 hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 transition text-xs font-bold cursor-pointer shrink-0 shadow-xs select-none active:scale-[0.98] truncate"
              >
                <Flag size={14} className="shrink-0" />
                <span>Report</span>
              </button>
            </div>
          </Card>

          <Card className="p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33] space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C827A]">Your Referral Link</h3>
            <p className="text-xs text-[#5D574F]">
              Code <b className="font-bold text-[#16171D]">{code}</b>. Earn <span className="font-bold text-[#C5A059]">+25 Pixels</span> when peers register via your link.
            </p>
            <div className="mt-2.5 flex gap-2">
              <input
                readOnly
                value={ref}
                onFocus={(e) => e.target.select()}
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs font-mono text-[#2D2A26] outline-none"
              />
              <Btn
                v="outline"
                aria-label="Copy link"
                onClick={() => {
                  copy(ref);
                  if (user?.uid && o?.id) {
                    recordOpportunityShare(user.uid, String(o.id));
                  }
                }}
                className="!min-h-9 !px-3 !rounded-xl"
              >
                <Copy size={14} />
              </Btn>
            </div>
          </Card>
        </aside>
      </div>

      {/* Related Opportunities */}
      <section className="mt-12 pt-8 border-t border-black/8">
        <SectionTitle t="More Opportunities You Might Like" to="/opportunities" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {initialOpps
            .filter((x) => String(x.id) !== String(o.id))
            .slice(0, 3)
            .map((x) => (
              <OppCard key={x.id} o={x} />
            ))}
        </div>
      </section>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="opportunity"
        targetId={String(o.id)}
        targetTitle={o.title}
        targetContent={`${o.org} · ${o.cat} · ${o.description || ''}`}
      />
    </W>
  );
}

// ==========================================
// FEED PAGE
// ==========================================
export function Feed() {
  const { userProfile, user, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [feedSearch, setFeedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const userName = userProfile?.displayName || user?.displayName || (user ? 'Pixel Builder' : 'Guest Builder');
  const pixels = userProfile?.pixels ?? 0;
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (user?.uid) {
      getUserGlobalRank(user.uid).then((res) => {
        if (mounted) setGlobalRank(res.rank);
      }).catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, [user?.uid, pixels]);

  // Always refresh latest profile data upon visiting Feed page to keep pixel count fresh
  useEffect(() => {
    if (user?.uid && refreshProfile) {
      refreshProfile();
    }
  }, [user?.uid]);

  const loadFeed = async () => {
    setRefreshing(true);
    try {
      const data = await getCommunityPosts(false);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const allPosts = posts;

  // Filter posts based on active category and search
  const filteredPosts = allPosts.filter((p: any) => {
    if (filterCategory !== 'All') {
      if (filterCategory === 'Upcoming Hackathons') {
        const isHack =
          p.category === 'Upcoming Hackathon' ||
          p.category === 'Hackathon' ||
          (typeof p.text === 'string' && p.text.includes('🚀 Upcoming Hackathon:'));
        if (!isHack) return false;
      } else if (filterCategory === 'Experiences' && p.category !== 'Experience') {
        return false;
      } else if (filterCategory === 'Achievements' && p.category !== 'Achievement') {
        return false;
      } else if (filterCategory === 'Ideas' && p.category !== 'Idea') {
        return false;
      } else if (filterCategory === 'Learnings' && p.category !== 'Learning') {
        return false;
      }
    }

    if (feedSearch.trim()) {
      const q = feedSearch.toLowerCase().trim();
      const matchText = typeof p.text === 'string' && p.text.toLowerCase().includes(q);
      const matchAuthor = typeof p.authorName === 'string' && p.authorName.toLowerCase().includes(q);
      const matchCat = typeof p.category === 'string' && p.category.toLowerCase().includes(q);
      if (!matchText && !matchAuthor && !matchCat) return false;
    }

    return true;
  });

  const feedCategories = [
    { id: 'All', label: 'All Updates' },
    { id: 'Upcoming Hackathons', label: '🚀 Hackathons' },
    { id: 'Experiences', label: '✨ Experiences' },
    { id: 'Achievements', label: '🏆 Achievements' },
    { id: 'Ideas', label: '💡 Ideas' },
    { id: 'Learnings', label: '🧠 Learnings' }
  ];

  const UserProfileWidget = () => (
    <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
      <div className="h-18 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10" />
        <svg
          aria-hidden="true"
          className="absolute -right-4 -bottom-4 h-24 w-24 text-white/20"
          viewBox="0 0 100 100"
          fill="none"
        >
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="relative z-10 -mt-8 px-4 pb-4">
        <div className="rounded-full ring-3 ring-white w-fit shadow-md">
          <Avatar
            name={userName}
            photoURL={userProfile?.photoURL || user?.photoURL || undefined}
            size={56}
          />
        </div>
        <p className="mt-2.5 font-['Outfit',sans-serif] font-bold text-[#0e1b33] text-sm">{userName}</p>
        <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
          <Sparkles size={11} className="text-blue-500" />
          {rankOf(pixels)}
        </p>

        <div className="mt-4 flex justify-between border-t border-slate-200/60 pt-3 text-xs">
          <span className="text-slate-500">Pixel Balance</span>
          <b className="text-blue-600 font-bold">{pixels} Pixels</b>
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">Global Rank</span>
          <b className="text-[#0e1b33] font-bold">{globalRank ? `#${globalRank}` : (user ? 'Not ranked yet' : '—')}</b>
        </div>
      </div>
    </Card>
  );

  const QuickNavWidget = () => (
    <Card className="p-2 text-xs font-semibold text-slate-700 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm">
      <Link to="/opportunities" className="block rounded-xl px-3.5 py-2.5 hover:bg-blue-50/70 hover:text-blue-600 transition">
        Explore Opportunities
      </Link>
      <Link to="/leaderboard" className="block rounded-xl px-3.5 py-2.5 hover:bg-blue-50/70 hover:text-blue-600 transition">
        Leaderboard &amp; Badges
      </Link>
      <Link to="/profile" className="block rounded-xl px-3.5 py-2.5 hover:bg-blue-50/70 hover:text-blue-600 transition">
        My Submissions &amp; Activity
      </Link>
    </Card>
  );

  return (
    <div className="w-full max-w-[1440px] mx-auto py-2 sm:py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,1fr)_290px] gap-5 items-start">
        {/* Left Sidebar: User Card (Visible on XL displays, stays sticky) */}
        <aside className="hidden xl:block space-y-4 sticky top-6">
          <UserProfileWidget />
          <QuickNavWidget />
        </aside>

        {/* Center Main Feed Column (min-w-0 guarantees responsiveness and prevents blowouts) */}
        <section className="space-y-4 min-w-0">
          {/* Category Filters Bar */}
          <div className="rounded-2xl pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 p-3 sm:p-4 text-[#0e1b33] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-['Outfit',sans-serif] font-bold text-sm text-[#0e1b33]">Community Feed</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs">
                  {filteredPosts.length} posts
                </span>
              </div>

              {/* Feed Search Input */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  placeholder="Search updates or authors..."
                  className="w-full rounded-full bg-white/80 border border-slate-200/80 pl-8 pr-7 py-1.5 text-xs text-[#0e1b33] placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition"
                />
                {feedSearch && (
                  <button
                    type="button"
                    onClick={() => setFeedSearch('')}
                    className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills with clean scroll and no scrollbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none no-scrollbar -mx-1 px-1 pt-1 border-t border-slate-200/60">
              {feedCategories.map((fc) => (
                <button
                  key={fc.id}
                  onClick={() => setFilterCategory(fc.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    filterCategory === fc.id
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'bg-white/80 text-slate-600 hover:text-[#0e1b33] hover:bg-white border border-slate-200/80'
                  }`}
                >
                  {fc.label}
                </button>
              ))}
            </div>
          </div>

          <Composer onPostCreated={(newPost) => setPosts(prev => [newPost, ...prev])} />

          {filteredPosts.length > 0 ? (
            filteredPosts.map((p: any) => (
              <PostCard
                key={p.id}
                p={p}
                onPostDeleted={(id) => setPosts(prev => prev.filter(item => String(item.id) !== String(id)))}
              />
            ))
          ) : (
            <Card className="text-center py-12 text-slate-500 text-xs pm-glass-card bg-white/80 border border-white/90">
              <p className="font-semibold text-sm text-[#0e1b33] mb-1">No posts in this category yet</p>
              <p className="mb-4">Be the first to share an update, or browse all community updates.</p>
              <button
                onClick={() => setFilterCategory('All')}
                className="px-4 py-2 rounded-full bg-[#112240] hover:bg-[#1a335e] text-xs font-bold text-white transition cursor-pointer shadow-xs"
              >
                View All Posts
              </button>
            </Card>
          )}
        </section>

        {/* Right Sidebar: Deadlines & Trending (Always fully visible on LG and XL) */}
        <aside className="hidden lg:block space-y-4 sticky top-6">
          {/* On LG displays (when left column is hidden), show User Profile here so it is never lost */}
          <div className="xl:hidden space-y-4">
            <UserProfileWidget />
            <QuickNavWidget />
          </div>

          <Card className="p-4 sm:p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-200/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock size={14} className="text-blue-600" />
                <span>Closing Soon</span>
              </h3>
              <button
                onClick={loadFeed}
                disabled={refreshing}
                className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline font-semibold cursor-pointer disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="space-y-2">
              {[...initialOpps]
                .filter((o) => !o.isExpired && o.days > 0)
                .sort((a, b) => a.days - b.days)
                .slice(0, 3)
                .map((o) => (
                  <Link
                    key={o.id}
                    to={'/opportunities/' + o.id}
                    className="flex justify-between items-center text-xs group p-2 rounded-xl hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition"
                  >
                    <span className="truncate pr-2 font-medium text-[#0e1b33] group-hover:text-blue-600 transition">
                      {o.title}
                    </span>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200/60 shadow-2xs">
                      {o.days}d
                    </span>
                  </Link>
                ))}
            </div>
          </Card>

          <Mini />
        </aside>
      </div>
    </div>
  );
}

// ==========================================
// PROFILE PAGE
// ==========================================
import { ReferralPanel as RP } from './pixels';

export function Profile() {
  const { userProfile, user, refreshProfile, updatePassword, incrementPixels } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [tab, setTab] = useState(location.pathname === '/applications' ? 'My Applications' : 'Posts');
  const [userSubs, setUserSubs] = useState<Opp[]>([]);
  const [rawSubmissions, setRawSubmissions] = useState<Opportunity[]>([]);
  const [selectedSubForModal, setSelectedSubForModal] = useState<Opportunity | null>(null);
  const [editing, setEditing] = useState(false);
  const [bioInput, setBioInput] = useState(userProfile?.bio || 'Tech builder & hackathon enthusiast on Pixel Minds.');
  const [savingBio, setSavingBio] = useState(false);
  const { say } = useApp();

  // Always refresh latest profile data upon visiting Profile page
  useEffect(() => {
    if (user?.uid && refreshProfile) {
      refreshProfile();
    }
  }, [user?.uid]);

  const [userApplications, setUserApplications] = useState<UserApplication[]>([]);
  const [confirmingAppId, setConfirmingAppId] = useState<string | null>(null);

  const loadApplications = () => {
    if (user?.uid) {
      getUserApplications(user.uid).then(setUserApplications).catch(() => {});
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadApplications();
    }
  }, [user]);

  // Live seconds tick so countdown timers update continuously
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (tab === 'My Applications') {
      const interval = setInterval(() => setClockTick((c) => c + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [tab]);

  const handleConfirmRegistration = async (appId: string) => {
    if (!user?.uid) return;
    setConfirmingAppId(appId);
    try {
      const res = await confirmOpportunityRegistration(
        user.uid,
        appId,
        user.email || undefined,
        userProfile?.displayName || user.displayName || undefined
      );
      say(res.message);
      if (res.success) {
        if (incrementPixels && res.pixelsRewarded > 0) {
          incrementPixels(res.pixelsRewarded);
        }
        loadApplications();
        if (refreshProfile) await refreshProfile();
      }
    } catch (err: any) {
      say(err?.message || 'Failed to confirm registration');
    } finally {
      setConfirmingAppId(null);
    }
  };

  // URL query parameter tab syncing (e.g. from notification links or sidebar)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      const lower = tabParam.toLowerCase();
      if (lower === 'submissions' || lower === 'mysubmissions' || lower === 'my submissions') {
        setTab('My Submissions');
      } else if (lower === 'applications' || lower === 'myapplications' || lower === 'my applications') {
        setTab('My Applications');
      } else {
        setTab(tabParam);
      }
    }
  }, [searchParams]);

  // Target User check for viewing other user's public profile
  const targetUid = searchParams.get('uid');
  const targetName = searchParams.get('name');
  const isViewingOtherUser = Boolean(targetUid && (!user || targetUid !== user.uid));

  const [otherUser, setOtherUser] = useState<UserType | null>(null);
  const [otherUserPosts, setOtherUserPosts] = useState<CommunityPost[]>([]);
  const [loadingOtherUser, setLoadingOtherUser] = useState(false);

  useEffect(() => {
    if (isViewingOtherUser && targetUid) {
      setLoadingOtherUser(true);
      Promise.all([
        getUserProfile(targetUid),
        getUserCommunityPosts(targetUid)
      ])
        .then(([profile, posts]) => {
          setOtherUser(profile);
          setOtherUserPosts(posts || []);
        })
        .catch((err) => {
          console.error('Failed to load user profile or posts:', err);
          setOtherUserPosts([]);
        })
        .finally(() => {
          setLoadingOtherUser(false);
        });
    }
  }, [isViewingOtherUser, targetUid, targetName]);

  // Academic / Profile settings edit state
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [collegeInput, setCollegeInput] = useState(userProfile?.college || '');
  const [courseInput, setCourseInput] = useState(userProfile?.course || '');
  const [customCourseInput, setCustomCourseInput] = useState('');
  const [yearInput, setYearInput] = useState(userProfile?.yearOfStudy || '');
  const [branchInput, setBranchInput] = useState(userProfile?.branch || '');
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Sync inputs when userProfile loads
  useEffect(() => {
    if (userProfile) {
      setNameInput(userProfile.displayName || '');
      setBioInput(userProfile.bio || 'Tech builder & hackathon enthusiast on Pixel Minds.');
      setCollegeInput(userProfile.college || '');
      setYearInput(userProfile.yearOfStudy || '');

      const existingCourse = userProfile.course || '';
      if (isPredefinedCourse(existingCourse)) {
        setCourseInput(existingCourse);
        setCustomCourseInput('');
      } else if (existingCourse) {
        setCourseInput('Other');
        setCustomCourseInput(existingCourse);
      } else {
        setCourseInput('');
        setCustomCourseInput('');
      }

      const existingBranch = userProfile.branch || '';
      if (existingCourse && isPredefinedBranch(existingCourse, existingBranch)) {
        setBranchInput(existingBranch);
        setCustomBranchInput('');
      } else if (existingBranch) {
        setBranchInput('Other');
        setCustomBranchInput(existingBranch);
      } else {
        setBranchInput('');
        setCustomBranchInput('');
      }
    }
  }, [userProfile]);

  const userName = userProfile?.displayName || user?.displayName || 'Pixel Builder';
  const userPixels = userProfile?.pixels ?? 0;

  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [userTransactions, setUserTransactions] = useState<PixelTransaction[]>([]);
  const [sharedOpps, setSharedOpps] = useState<Opp[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);
  const [rankLoading, setRankLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      getUserGlobalRank(user.uid).then((res) => {
        setGlobalRank(res.rank);
        setRankLoading(false);
      }).catch(() => {
        setRankLoading(false);
      });

      getUserSubmissions(user.uid).then((subs) => {
        setRawSubmissions(subs);
        const subIdParam = searchParams.get('id') || searchParams.get('sub');
        if (subIdParam) {
          const matched = subs.find(s => s.id === subIdParam);
          if (matched) setSelectedSubForModal(matched);
        }
        const mapped: Opp[] = subs.map((s) => {
          const dInfo = getOpportunityDeadlineInfo(s.deadline);
          return {
            id: s.id,
            title: s.title,
            org: s.organizer,
            cat: s.category,
            mode: s.mode ? s.mode.charAt(0).toUpperCase() + s.mode.slice(1) : 'Online',
            deadline: dInfo.formattedDeadline,
            days: dInfo.daysRemaining,
            rawDeadline: s.deadline,
            isExpired: dInfo.isExpired,
            prize: s.prize || 'Certificate',
            skills: s.skills || ['Tech'],
            description: s.description,
            officialUrl: s.officialUrl
          };
        });
        setUserSubs(mapped);
      });

      getUserCommunityPosts(user.uid).then((posts) => {
        setUserPosts(posts);
      }).catch(() => {});

      getPixelTransactions(user.uid).then((txs) => {
        setUserTransactions(txs);
      }).catch(() => {});

      getSharedOpportunities(user.uid).then((shared) => {
        const mapped: Opp[] = shared.map((o) => {
          const dInfo = getOpportunityDeadlineInfo(o.deadline);
          return {
            id: o.id,
            title: o.title,
            org: o.organizer,
            cat: o.category,
            mode: o.mode ? o.mode.charAt(0).toUpperCase() + o.mode.slice(1) : 'Online',
            deadline: dInfo.formattedDeadline,
            days: dInfo.daysRemaining,
            rawDeadline: o.deadline,
            isExpired: dInfo.isExpired,
            prize: o.prize || 'Certificate',
            skills: o.skills || ['Tech'],
            description: o.description,
            officialUrl: o.officialUrl,
            imageUrl: o.imageUrl
          };
        });
        setSharedOpps(mapped);
      }).catch(() => {});
    }
  }, [user, searchParams]);

  const handleSaveBio = async () => {
    if (!user?.uid) return;
    setSavingBio(true);
    try {
      await updateUserProfile(user.uid, { bio: bioInput });
      if (refreshProfile) await refreshProfile();
      say('Profile bio updated');
      setEditing(false);
    } catch {
      say('Failed to update profile');
    } finally {
      setSavingBio(false);
    }
  };

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setSavingSettings(true);
    try {
      const finalCourse = courseInput === 'Other' ? customCourseInput.trim() : courseInput.trim();
      const finalBranch = (courseInput === 'Other' || branchInput === 'Other')
        ? customBranchInput.trim()
        : branchInput.trim();

      await updateUserProfile(user.uid, {
        displayName: nameInput.trim(),
        bio: bioInput.trim(),
        college: collegeInput.trim(),
        course: finalCourse,
        yearOfStudy: yearInput.trim(),
        branch: finalBranch
      });
      if (refreshProfile) await refreshProfile();
      say('Profile details updated successfully');
    } catch {
      say('Failed to update profile details');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwdError('Passwords do not match.');
      return;
    }

    setChangingPwd(true);
    try {
      await updatePassword(newPassword);
      setPwdSuccess('Password changed successfully.');
      setNewPassword('');
      setConfirmNewPassword('');
      say('Password changed successfully');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPwd(false);
    }
  };

  if (isViewingOtherUser) {
    const profileName = otherUser?.displayName || targetName || 'Community Member';
    const profileRole = otherUser?.role === 'admin' ? 'Community Admin' : 'Pixel Member';
    const profileBio = otherUser?.bio || 'Active hackathon participant and builder in the Pixel Minds community.';
    const profilePixels = otherUser?.pixels || 1200;

    return (
      <W className="max-w-4xl py-8 space-y-6">
        {/* Navigation Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] px-4 py-2 text-xs font-bold text-[#16171D] transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Community Feed</span>
          </Link>
          <span className="text-xs text-[#7D756C] font-semibold">Community Member Profile</span>
        </div>

        {/* Public Profile Card */}
        <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          <div className="h-36 bg-gradient-to-r from-[#0B1628] via-[#11243D] to-[#162B45] relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/10" />
            <svg
              aria-hidden="true"
              className="absolute -right-8 -top-8 h-48 w-48 text-sky-400/20"
              viewBox="0 0 100 100"
              fill="none"
            >
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
              <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
              <path d="M5 50 Q 50 10 95 50" stroke="currentColor" strokeWidth="0.8" />
            </svg>
          </div>

          <div className="relative z-10 px-6 pb-6">
            <div className="-mt-14 w-fit rounded-full ring-4 ring-white shadow-xl">
              <Avatar
                name={profileName}
                photoURL={otherUser?.photoURL || undefined}
                size={84}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-['Outfit',sans-serif] text-2xl font-extrabold text-[#16171D] sm:text-3xl">
                    {profileName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#16171D] text-[#DFB76C] text-xs font-bold">
                    {profileRole}
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[#5D574F]">
                  {profileBio}
                </p>

                {(otherUser?.college || otherUser?.course || otherUser?.branch) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#4A453F]">
                    {otherUser.college && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] text-[#2D2A26] font-medium border border-black/6">
                        <Building2 size={12} className="text-[#C5A059]" />
                        {otherUser.college}
                      </span>
                    )}
                    {(otherUser.course || otherUser.branch) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] text-[#2D2A26] font-medium border border-black/6">
                        <GraduationCap size={12} className="text-[#C5A059]" />
                        {[otherUser.course, otherUser.branch].filter(Boolean).join(' - ')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.04] text-[#16171D] text-xs font-bold border border-black/6">
                  <Sparkles size={12} className="text-[#C5A059]" />
                  {rankOf(profilePixels)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">Pixel Balance</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-[#C5A059] text-lg mt-0.5">{profilePixels} Pixels</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">Posts Shared</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-[#16171D] text-lg mt-0.5">{otherUserPosts.length}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">Community Standing</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-[#16171D] text-lg mt-0.5">Verified Builder</p>
              </div>
            </div>
          </div>
        </Card>

        {/* User's Posts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-black/8">
            <h2 className="font-['Outfit',sans-serif] text-lg font-bold text-[#16171D] flex items-center gap-2">
              <span>Posts by {profileName}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-black/[0.05] text-[#5D574F] font-semibold">
                {otherUserPosts.length}
              </span>
            </h2>
          </div>

          {loadingOtherUser ? (
            <Card className="text-center py-12 text-[#8C827A] text-xs pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              Loading posts...
            </Card>
          ) : otherUserPosts.length > 0 ? (
            otherUserPosts.map((p) => (
              <PostCard
                key={p.id}
                p={p}
                onPostDeleted={(id) => setOtherUserPosts((prev) => prev.filter((item) => String(item.id) !== String(id)))}
              />
            ))
          ) : (
            <Card className="text-center py-12 text-[#8C827A] text-xs pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <p className="font-semibold text-sm text-[#16171D] mb-1">No posts shared yet</p>
              <p>This user hasn't published any updates or hackathons to the community feed yet.</p>
            </Card>
          )}
        </div>
      </W>
    );
  }

  if (!user && !isViewingOtherUser) {
    return (
      <W className="max-w-md py-16 text-center space-y-4">
        <Card className="p-8 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
          <div className="w-16 h-16 rounded-full bg-[#16171D] text-[#DFB76C] grid place-items-center mx-auto mb-4 shadow-md">
            <Sparkles size={28} />
          </div>
          <h2 className="font-['Outfit',sans-serif] text-xl font-bold text-[#16171D]">Sign in to View Your Profile</h2>
          <p className="text-xs text-[#7D756C] mt-1 mb-6 leading-relaxed">
            Sign in to track your opportunity submissions, review feedback, earn Pixels, and view your community contributions.
          </p>
          <BtnLink to="/login" v="gold" className="w-full">Sign In to Pixel Minds</BtnLink>
        </Card>
      </W>
    );
  }

  return (
    <W className="max-w-4xl py-8 space-y-7">
      <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
        <div className="h-36 bg-gradient-to-r from-[#0B1628] via-[#11243D] to-[#162B45] relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/10" />
          <svg
            aria-hidden="true"
            className="absolute -right-8 -top-8 h-48 w-48 text-sky-400/20"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" />
            <path d="M5 50 Q 50 10 95 50" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        </div>
        <div className="relative z-10 px-6 pb-6">
          <div className="-mt-14 w-fit rounded-full ring-4 ring-white shadow-xl">
            <Avatar
              name={userName}
              photoURL={userProfile?.photoURL || user?.photoURL || undefined}
              size={84}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-['Outfit',sans-serif] text-2xl font-extrabold text-[#16171D] sm:text-3xl">{userName}</h1>
              {editing ? (
                <div className="mt-2.5 flex gap-2 max-w-md">
                  <input
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs text-[#16171D] outline-none focus:border-[#C5A059]"
                  />
                  <Btn onClick={handleSaveBio} disabled={savingBio} className="!min-h-8 !px-3.5 !py-1 !text-xs !rounded-xl">
                    Save
                  </Btn>
                  <Btn v="ghost" onClick={() => setEditing(false)} className="!min-h-8 !px-2.5 !py-1 !text-xs !rounded-xl">
                    Cancel
                  </Btn>
                </div>
              ) : (
                <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-[#5D574F]">
                  {userProfile?.bio || bioInput}
                </p>
              )}

              {/* Academic Tags */}
              {(userProfile?.college || userProfile?.course || userProfile?.branch || userProfile?.yearOfStudy) && (
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-[#4A453F]">
                  {userProfile.college && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] text-[#2D2A26] font-medium border border-black/6">
                      <Building2 size={12} className="text-[#C5A059]" />
                      {userProfile.college}
                    </span>
                  )}
                  {(userProfile.course || userProfile.branch) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] text-[#2D2A26] font-medium border border-black/6">
                      <GraduationCap size={12} className="text-[#C5A059]" />
                      {[userProfile.course, userProfile.branch].filter(Boolean).join(' - ')}
                    </span>
                  )}
                  {userProfile.yearOfStudy && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#16171D] text-[#DFB76C] font-semibold text-[11px]">
                      {userProfile.yearOfStudy}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!editing && (
                <Btn v="outline" onClick={() => setEditing(true)} className="!min-h-9 !py-1.5 !px-3.5 !text-xs !rounded-full">
                  <Edit3 size={13} />
                  Edit Bio
                </Btn>
              )}
              <Btn v="ghost" onClick={() => setTab('Settings')} className="!min-h-9 !py-1.5 !text-xs text-[#5D574F] !rounded-full">
                Settings
              </Btn>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Pixels Balance', `${userPixels} Pixels`],
              ['Global Rank', rankLoading ? '...' : (globalRank ? `#${globalRank}` : 'Not ranked yet')],
              ['Contributions', rawSubmissions.length || userSubs.length || 0],
              ['Builder Level', rankOf(userPixels)]
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">{l}</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-[#0e1b33] text-lg mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {['Posts', 'My Applications', 'My Submissions', 'Shared Opportunities', 'Pixel History', 'Referrals', 'Achievements', 'Settings'].map((t) => {
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#16171D] text-[#DFB76C] shadow-md shadow-black/15 ring-1 ring-[#C5A059]/30'
                  : 'bg-white/70 text-[#5D574F] border border-black/6 hover:bg-white hover:text-[#16171D]'
              }`}
            >
              <span>{t}</span>
              {t === 'My Applications' && userApplications.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  {userApplications.length}
                </span>
              )}
              {t === 'My Submissions' && rawSubmissions.length > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
                }`}>
                  {rawSubmissions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'Posts' && (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((p) => (
                <PostCard
                  key={p.id}
                  p={p}
                  onPostDeleted={(id) => setUserPosts((prev) => prev.filter((item) => String(item.id) !== String(id)))}
                />
              ))
            ) : (
              <Card className="text-center py-12 text-[#8C827A] text-xs pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                No posts shared yet. Share an update on the Community Feed!
              </Card>
            )}
          </div>
        )}

        {tab === 'My Applications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/8">
              <div>
                <h3 className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D]">My Registered Applications</h3>
                <p className="text-xs text-[#7D756C]">
                  Track programs you've applied for. Confirm your completed registration to claim your Pixel rewards!
                </p>
              </div>
              <BtnLink to="/opportunities" className="!py-2 !px-4 !text-xs !min-h-9 !rounded-full shadow-xs">
                + Explore More
              </BtnLink>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Applied</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-[#0e1b33] text-lg mt-0.5">{userApplications.length}</p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Confirmed</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-emerald-600 text-lg mt-0.5">
                  {userApplications.filter(a => a.status === 'confirmed').length}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Cooldown</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-amber-600 text-lg mt-0.5">
                  {userApplications.filter(a => a.status === 'pending_confirmation').length}
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-3.5 border border-black/6 shadow-xs">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Pixels Claimed</p>
                <p className="font-['Outfit',sans-serif] font-extrabold text-blue-600 text-lg mt-0.5">
                  +{userApplications.filter(a => a.rewardClaimed).reduce((sum, a) => sum + (a.pixelsRewarded || 10), 0)}
                </p>
              </div>
            </div>

            {userApplications.length === 0 ? (
              <Card className="text-center py-16 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33] p-8">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} />
                </div>
                <h4 className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D] mb-1">
                  You haven't applied for any opportunities yet.
                </h4>
                <p className="text-xs text-[#7D756C] mb-5 max-w-sm mx-auto">
                  Browse hackathons, internships, and fellowships. Click "Apply on Official Site" to track your applications and unlock +10 Pixels per registration!
                </p>
                <BtnLink to="/opportunities" className="!py-2.5 !px-5 !text-xs !rounded-full">
                  Browse Opportunities
                </BtnLink>
              </Card>
            ) : (
              <div className="space-y-3">
                {userApplications.map((app) => {
                  const elapsedMs = Date.now() - app.appliedAt;
                  const THREE_MINS_MS = 3 * 60 * 1000;
                  const remainingSecs = Math.max(0, Math.ceil((THREE_MINS_MS - elapsedMs) / 1000));
                  const isReadyToConfirm = app.status === 'pending_confirmation' && remainingSecs === 0;
                  const isConfirmed = app.status === 'confirmed';

                  return (
                    <Card key={app.id} className="p-4 sm:p-5 pm-glass-card bg-white/90 backdrop-blur-xl border border-white/90 shadow-xs hover:border-blue-200 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200/60 uppercase">
                              {app.category}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {app.mode} · Deadline: {app.deadline}
                            </span>
                          </div>
                          <Link to={`/opportunities/${app.opportunityId}`} className="block">
                            <h4 className="font-bold text-sm sm:text-base text-[#0e1b33] hover:text-blue-600 transition truncate">
                              {app.opportunityTitle}
                            </h4>
                          </Link>
                          <p className="text-xs text-slate-500">{app.organizer}</p>
                        </div>

                        {/* Status / Confirm Action */}
                        <div className="sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>✓ Registered (+10 Pixels)</span>
                            </span>
                          ) : isReadyToConfirm ? (
                            <button
                              onClick={() => handleConfirmRegistration(app.id)}
                              disabled={confirmingAppId === app.id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                            >
                              <Sparkles size={13} />
                              <span>{confirmingAppId === app.id ? 'Confirming...' : 'Confirm Registration & Claim +10'}</span>
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                                <Clock size={13} className="text-amber-600 animate-spin" />
                                <span>Verifying ({Math.floor(remainingSecs / 60)}m {remainingSecs % 60}s left)</span>
                              </span>
                              <p className="text-[10px] text-slate-400 max-w-[200px] text-left sm:text-right">
                                Complete your registration on their portal. Confirmation unlocks in 3 mins.
                              </p>
                            </div>
                          )}

                          {app.officialUrl && (
                            <a
                              href={app.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                            >
                              <span>Official Site</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'My Submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/8">
              <div>
                <h3 className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D]">My Opportunity Submissions</h3>
                <p className="text-xs text-[#7D756C]">
                  Track verification status and reviewer feedback for your submitted opportunities.
                </p>
              </div>
              <BtnLink to="/submit" className="!py-2 !px-4 !text-xs !min-h-9 !rounded-full shadow-xs">
                + Submit New
              </BtnLink>
            </div>

            {rawSubmissions.length === 0 ? (
              <Card className="text-center py-16 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33] p-8">
                <div className="w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#C5A059]">
                  <FileText size={24} />
                </div>
                <h4 className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D] mb-1">
                  You haven't submitted any opportunities yet.
                </h4>
                <p className="text-xs text-[#7D756C] mb-5 max-w-sm mx-auto">
                  Know about a hackathon, internship, workshop, or tech event? Submit it for review to earn +50 Pixels!
                </p>
                <BtnLink to="/submit" className="!py-2.5 !px-5 !text-xs !rounded-full">
                  Submit an Opportunity
                </BtnLink>
              </Card>
            ) : (
              <div className="space-y-3">
                {rawSubmissions.map((sub) => {
                  const isPending = sub.status === 'pending';
                  const isApproved = sub.status === 'approved' || sub.status === 'published';
                  const isRejected = sub.status === 'rejected';

                  return (
                    <Card
                      key={sub.id}
                      onClick={() => setSelectedSubForModal(sub)}
                      className="p-5 transition hover:border-[#C5A059]/40 hover:shadow-md cursor-pointer space-y-3 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-bold text-[#2D2A26] border border-black/8">
                              {sub.category}
                            </span>
                            {isPending && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-500/20">
                                <Clock size={11} /> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-500/20">
                                <CheckCircle2 size={11} /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-500/20">
                                <XCircle size={11} /> Rejected
                              </span>
                            )}
                          </div>
                          <h4 className="font-['Outfit',sans-serif] text-base font-bold text-[#16171D] truncate hover:text-[#C5A059] transition">
                            {sub.title}
                          </h4>
                          <p className="text-xs text-[#7D756C]">
                            Organizer:{' '}
                            <span className="font-semibold text-[#2D2A26]">
                              {sub.organizer || 'Not specified'}
                            </span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs text-[#7D756C] font-medium">
                            Submitted:{' '}
                            {new Date(sub.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                          {sub.updatedAt && sub.updatedAt !== sub.createdAt && (
                            <p className="text-[11px] text-[#A69E95] mt-0.5">
                              Updated:{' '}
                              {new Date(sub.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Reviewer Feedback / Rejection Reason Callout */}
                      {sub.adminNotes && (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-[11px] text-rose-800">
                            <AlertCircle size={12} />
                            <span>Reviewer Feedback / Rejection Reason:</span>
                          </div>
                          <p className="leading-relaxed pl-4 font-medium">{sub.adminNotes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-black/6 text-xs text-[#7D756C]">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} className="text-[#C5A059]" />
                          Deadline:{' '}
                          {new Date(sub.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="font-semibold text-[#16171D] hover:text-[#C5A059] inline-flex items-center gap-1">
                          View Details &rarr;
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'Shared Opportunities' && (
          <div>
            {sharedOpps.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {sharedOpps.map((o) => (
                  <OppCard key={o.id} o={o} />
                ))}
              </div>
            ) : (
              <Card className="p-10 text-center pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                  <Share2 size={22} />
                </div>
                <h3 className="text-sm font-bold text-[#16171D]">No Shared Opportunities Yet</h3>
                <p className="mt-1 text-xs text-[#7D756C] max-w-sm mx-auto leading-relaxed">
                  You haven&apos;t shared any opportunities yet. Share hackathons, internships, or events with your friends to earn Pixels when they join!
                </p>
                <div className="mt-4">
                  <BtnLink to="/opportunities" className="!text-xs !rounded-full !px-5">
                    Browse Opportunities
                  </BtnLink>
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'Pixel History' && (
          <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
            <div className="border-b border-black/8 p-4 font-bold text-sm text-[#16171D] flex justify-between items-center">
              <span>Pixel Transaction Ledger</span>
              <span className="text-xs font-bold text-[#C5A059]">Current Balance: {userPixels} Pixels</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-xs">
                <thead className="bg-black/[0.02] text-[#8C827A] font-bold uppercase tracking-wider border-b border-black/8">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Reason / Description</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/6">
                  {userTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-black/[0.02] transition">
                      <td className="px-4 py-3.5 text-[#7D756C]">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[#16171D]">{tx.reason}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                          tx.type === 'earn' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                          tx.type === 'spend' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' :
                          'bg-sky-500/10 text-sky-700 border-sky-500/20'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-extrabold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} Pixels
                      </td>
                    </tr>
                  ))}
                  {userTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#8C827A]">
                        No transactions recorded yet in ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'Referrals' && <RP />}

        {tab === 'Achievements' && (
          <div className="grid gap-3.5 sm:grid-cols-3">
            {[
              'First Opportunity Shared',
              '10 Verified Submissions',
              'Hackathon Hunter',
              'Top 10 Monthly Leaderboard',
              '7-Day Streak Active',
              'Pixel Master Tier'
            ].map((a) => (
              <Card key={a} className="flex items-center gap-3.5 p-4 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#16171D] text-[#DFB76C] shadow-sm">
                  <Award size={19} />
                </div>
                <span className="text-xs font-bold text-[#16171D]">{a}</span>
              </Card>
            ))}
          </div>
        )}

        {tab === 'Settings' && (
          <div className="space-y-6">
            {/* Academic & Profile Details Card */}
            <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <h2 className="text-sm font-bold text-[#16171D] uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-[#C5A059]" />
                Profile &amp; Academic Information
              </h2>
              <form onSubmit={handleSaveAllSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                      placeholder="Your Name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26] mb-1">College / University</label>
                    <input
                      type="text"
                      value={collegeInput}
                      onChange={(e) => setCollegeInput(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                      placeholder="e.g. Stanford / IIT Delhi"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26] mb-1">Bio</label>
                  <textarea
                    rows={2}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder="A short description about yourself..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26] mb-1">Course / Degree</label>
                    <select
                      value={courseInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCourseInput(val);
                        setBranchInput('');
                        if (val !== 'Other') {
                          setCustomCourseInput('');
                        }
                      }}
                      className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                    >
                      <option value="">Select Course</option>
                      {COURSE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    {courseInput === 'Other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customCourseInput}
                          onChange={(e) => setCustomCourseInput(e.target.value)}
                          placeholder="Enter your course name"
                          className="w-full rounded-xl border border-[#C5A059]/60 bg-white px-3 py-2 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26] mb-1">Year of Study</label>
                    <select
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                      <option value="Graduate / Alum">Graduate / Alum</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#2D2A26] mb-1">Branch / Department</label>
                    {courseInput && courseInput !== 'Other' ? (
                      <>
                        <select
                          value={branchInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBranchInput(val);
                            if (val !== 'Other') {
                              setCustomBranchInput('');
                            }
                          }}
                          className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D] cursor-pointer"
                        >
                          <option value="">Select Branch</option>
                          {getBranchesForCourse(courseInput).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>

                        {branchInput === 'Other' && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={customBranchInput}
                              onChange={(e) => setCustomBranchInput(e.target.value)}
                              placeholder="Enter your branch / specialization"
                              className="w-full rounded-xl border border-[#C5A059]/60 bg-white px-3 py-2 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={customBranchInput}
                        onChange={(e) => setCustomBranchInput(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                        placeholder={courseInput === 'Other' ? "Enter your branch / specialization" : "Select course first or enter branch"}
                      />
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Btn type="submit" disabled={savingSettings} className="!text-xs !rounded-full !px-5">
                    {savingSettings ? 'Saving...' : 'Save Profile Changes'}
                  </Btn>
                </div>
              </form>
            </Card>

            {/* Change Password Card */}
            <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <h2 className="text-sm font-bold text-[#16171D] uppercase tracking-wider mb-2 flex items-center gap-2">
                <Lock size={16} className="text-[#C5A059]" />
                Change Password
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Update your account password securely.
              </p>

              {pwdError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs">
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs">
                  {pwdSuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-[#2D2A26] mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D2A26] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>

                <div className="pt-2">
                  <Btn type="submit" disabled={changingPwd} className="!text-xs !rounded-full !px-5">
                    {changingPwd ? 'Updating Password...' : 'Update Password'}
                  </Btn>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>

      {/* Submission Detail Modal */}
      <SubmissionDetailModal
        submission={selectedSubForModal}
        isOpen={!!selectedSubForModal}
        onClose={() => setSelectedSubForModal(null)}
      />
    </W>
  );
}

// ==========================================
// SUBMIT OPPORTUNITY PAGE
// ==========================================
const FormField = ({ label, children, required = false }: any) => (
  <label className="block text-xs font-bold text-[#2D2A26]">
    {label} {required && <span className="text-[#C5A059]">*</span>}
    <div className="mt-1.5 font-normal">{children}</div>
  </label>
);

const SectionCard = ({ title: cardTitle, children }: any) => (
  <Card className="p-5 sm:p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33] space-y-4">
    <h2 className="font-['Outfit',sans-serif] text-sm font-bold text-[#16171D] uppercase tracking-wider">{cardTitle}</h2>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </Card>
);

const inpStyle =
  'w-full rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-xs outline-none focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]/30 text-[#16171D] placeholder:text-[#9E958C] shadow-xs transition';

export function Submit() {
  const { user } = useAuth();
  const { say } = useApp();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [category, setCategory] = useState(cats[0]);
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [skills, setSkills] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [prize, setPrize] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (imageUrls.length >= 3) {
      say('Maximum 3 images allowed per opportunity.');
      e.target.value = '';
      return;
    }

    if (imageUrls.length + files.length > 3) {
      say(`You can only upload up to 3 images in total. You can select ${3 - imageUrls.length} more.`);
      e.target.value = '';
      return;
    }

    // Validate all files first (format and size)
    for (const f of files) {
      const v = validateOpportunityImageFile(f);
      if (!v.valid) {
        say(v.error || 'Invalid file.');
        e.target.value = '';
        return;
      }
    }

    setUploadingImage(true);
    const uploadedBatch: string[] = [];

    try {
      for (const f of files) {
        const url = await uploadImage(f, 'opportunity-banners');
        uploadedBatch.push(url);
      }
      setImageUrls((prev) => [...prev, ...uploadedBatch]);
      say(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`);
    } catch (err: any) {
      // Clean up orphaned uploads from this failed batch
      for (const url of uploadedBatch) {
        await deleteStorageFile(url);
      }
      say(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = imageUrls[indexToRemove];
    setImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (urlToRemove) {
      await deleteStorageFile(urlToRemove);
      say('Image removed');
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!user?.uid) {
      setError('You must be signed in to submit an opportunity. Please sign in and try again.');
      return;
    }

    if (!title.trim() || !organizer.trim() || !officialUrl.trim() || !description.trim()) {
      setError('Please fill in all required fields (Title, Organizer, Application Link, Description).');
      return;
    }

    if (!deadline.trim()) {
      setError('Application deadline is required.');
      return;
    }

    if (!officialUrl.startsWith('http://') && !officialUrl.startsWith('https://')) {
      setError('Official URL must begin with http:// or https://');
      return;
    }

    const dateVal = validateOpportunityDates({ startDate, endDate, deadline });
    if (!dateVal.valid) {
      setError(dateVal.error || 'Please provide valid dates.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await submitToFirestore(user.uid, {
        title: title.trim(),
        organizer: organizer.trim(),
        category,
        mode,
        description: description.trim(),
        eligibility: eligibility.trim() || 'Open to all students & builders',
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        startDate: startDate ? parseDateInputToTimestamp(startDate) : Date.now(),
        endDate: endDate ? parseDateInputToTimestamp(endDate) : (startDate ? parseDateInputToTimestamp(startDate) + 86400000 : Date.now() + 86400000),
        deadline: parseDateInputToTimestamp(deadline),
        prize: prize.trim(),
        officialUrl: officialUrl.trim(),
        imageUrl: imageUrls.length > 0 ? imageUrls.join(',') : ''
      });

      setDone(true);
      say('Opportunity submitted for review (+50 Pixels pending)');
    } catch (err: any) {
      console.error('Error submitting opportunity:', err);
      setError(err?.message || 'Failed to submit opportunity. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <W className="max-w-xl py-20 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#16171D] text-[#DFB76C] shadow-lg border border-white/10">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="mt-5 font-['Outfit',sans-serif] text-2xl font-extrabold text-[#16171D]">Submitted for Verification</h1>
        <p className="mt-2 text-xs text-[#5D574F] leading-relaxed max-w-sm mx-auto">
          Thanks for contributing to the community! Our moderators will verify the opportunity shortly, and you will receive{' '}
          <b className="text-[#C5A059]">+50 Pixels</b> once approved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <BtnLink to="/opportunities" v="outline" className="!text-xs !rounded-full !px-5">
            Browse Opportunities
          </BtnLink>
          <Btn onClick={() => setDone(false)} className="!text-xs !rounded-full !px-5">
            Submit Another
          </Btn>
        </div>
      </W>
    );
  }

  return (
    <W className="max-w-3xl space-y-7 py-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#6E655C] backdrop-blur-md mb-2 shadow-xs">
          <Sparkles size={12} className="text-[#C5A059]" />
          Earn +50 Pixels Upon Approval
        </div>
        <h1 className="font-['Outfit',sans-serif] text-3xl font-extrabold tracking-tight text-[#16171D] sm:text-4xl">
          Share an Opportunity
        </h1>
        <p className="text-xs sm:text-sm text-[#7D756C] mt-1">
          Help 800+ tech community members discover your event, hackathon, workshop, or program.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-4 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <SectionCard title="Basic Information">
        <FormField label="Title" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inpStyle}
            placeholder="e.g. Smart India Hackathon 2026"
          />
        </FormField>
        <FormField label="Organizer / Organization" required>
          <input
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            className={inpStyle}
            placeholder="e.g. Ministry of Education"
          />
        </FormField>
        <FormField label="Category" required>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inpStyle}>
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Mode" required>
          <select value={mode} onChange={(e: any) => setMode(e.target.value)} className={inpStyle}>
            <option value="online">Online</option>
            <option value="offline">Onsite / In-Person</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </FormField>
      </SectionCard>

      <SectionCard title="Opportunity Details">
        <div className="sm:col-span-2">
          <FormField label="Full Description" required>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inpStyle}
              placeholder="Provide key details, problem statements, formats, perks, and expectations..."
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Eligibility &amp; Tags">
        <FormField label="Eligibility">
          <input
            value={eligibility}
            onChange={(e) => setEligibility(e.target.value)}
            className={inpStyle}
            placeholder="e.g. College students, open to all streams"
          />
        </FormField>
        <FormField label="Skills / Tags (comma separated)">
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className={inpStyle}
            placeholder="e.g. React, Python, Cloud, AI"
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Key Dates">
        <FormField label="Start Date">
          <input
            type="date"
            value={startDate}
            min="1000-01-01"
            max="9999-12-31"
            onChange={(e) => setStartDate(e.target.value)}
            className={inpStyle}
          />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-[#7D756C]">Format: DD/MM/YYYY</span>
            {startDate && formatDateToDDMMYYYY(startDate) && (
              <span className="font-semibold text-[#16171D]">
                Display: {formatDateToDDMMYYYY(startDate)}
              </span>
            )}
          </div>
        </FormField>
        <FormField label="End Date">
          <input
            type="date"
            value={endDate}
            min={startDate || "1000-01-01"}
            max="9999-12-31"
            onChange={(e) => setEndDate(e.target.value)}
            className={inpStyle}
          />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-[#7D756C]">Format: DD/MM/YYYY</span>
            {endDate && formatDateToDDMMYYYY(endDate) && (
              <span className="font-semibold text-[#16171D]">
                Display: {formatDateToDDMMYYYY(endDate)}
              </span>
            )}
          </div>
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Application Deadline" required>
            <input
              type="date"
              value={deadline}
              min="1000-01-01"
              max={endDate || "9999-12-31"}
              onChange={(e) => setDeadline(e.target.value)}
              className={inpStyle}
              required
            />
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-[#7D756C]">Format: DD/MM/YYYY</span>
              {deadline && formatDateToDDMMYYYY(deadline) && (
                <span className="font-semibold text-[#16171D]">
                  Display: {formatDateToDDMMYYYY(deadline)}
                </span>
              )}
            </div>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Rewards &amp; Official Link">
        <FormField label="Prize or Stipend">
          <input
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            className={inpStyle}
            placeholder="e.g. ₹1,00,000 / ₹40k per month"
          />
        </FormField>
        <FormField label="Official Application URL" required>
          <input
            type="url"
            value={officialUrl}
            onChange={(e) => setOfficialUrl(e.target.value)}
            className={inpStyle}
            placeholder="https://example.com/apply"
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Opportunity Images (Max 3, up to 2 MB each)">
        <div className="sm:col-span-2 space-y-3">
          {imageUrls.length < 3 && (
            <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-black/15 bg-white/50 p-4 text-center cursor-pointer hover:bg-white hover:border-[#C5A059]/50 transition">
              <Upload size={22} className="text-[#C5A059] mb-1.5" />
              <span className="text-xs font-semibold text-[#2D2A26]">
                {uploadingImage ? 'Uploading image...' : `Add images (${imageUrls.length}/3) · JPEG, PNG, or WebP up to 2 MB`}
              </span>
              <span className="text-[11px] text-[#8C827A] mt-0.5">
                First image will serve as the primary cover banner
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImagesUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
          )}

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {imageUrls.map((url, idx) => (
                <div key={url + idx} className="relative rounded-2xl overflow-hidden border border-black/10 aspect-video bg-stone-100 shadow-sm group">
                  <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                    {idx === 0 ? 'Primary Banner' : `Image ${idx + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition cursor-pointer shadow-sm"
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <div className="flex justify-end gap-3 pt-2">
        <Btn v="outline" onClick={() => navigate(-1)} className="!text-xs !rounded-full !px-5">
          Cancel
        </Btn>
        <Btn onClick={handleSubmit} disabled={submitting || uploadingImage} className="!text-xs !rounded-full !px-6">
          {submitting ? 'Submitting...' : 'Submit Opportunity (+50 Pixels)'}
        </Btn>
      </div>
    </W>
  );
}

// ==========================================
// ADMIN CONSOLE
// ==========================================
const adminTabs: [string, any][] = [
  ['Overview', LayoutGrid],
  ['Submissions', ClipboardList],
  ['Reports & Moderation', AlertCircle],
  ['Opportunities', FileText],
  ['Community Posts', MessageSquare],
  ['Announcements', Megaphone],
  ['Notifications', Bell],
  ['Users & Pixels', U],
  ['Reward Config', Sliders],
  ['Audit Logs', History]
];

const AdminOpportunityForm = ({ opp, onBack }: any) => {
  const { user } = useAuth();
  const { say } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);

  const [title, setTitle] = useState(opp?.title || '');
  const [description, setDescription] = useState(opp?.description || '');
  const [organizer, setOrganizer] = useState(opp?.organizer || '');
  const [category, setCategory] = useState(opp?.category || cats[0]);
  const [deadline, setDeadline] = useState(formatTimestampToDateInput(opp?.deadline));
  const [startDate, setStartDate] = useState(formatTimestampToDateInput(opp?.startDate));
  const [endDate, setEndDate] = useState(formatTimestampToDateInput(opp?.endDate));
  const [mode, setMode] = useState(opp?.mode || 'online');
  const [location, setLocation] = useState(opp?.location || '');
  const [eligibility, setEligibility] = useState(opp?.eligibility || '');
  const [skills, setSkills] = useState(opp?.skills?.join(', ') || '');
  const [prize, setPrize] = useState(opp?.prize || '');
  const [stipend, setStipend] = useState(opp?.stipend || '');
  const [teamSize, setTeamSize] = useState(opp?.teamSize || '');
  const [officialUrl, setOfficialUrl] = useState(opp?.officialUrl || '');
  const [imageUrl, setImageUrl] = useState(opp?.imageUrl || '');
  const [imageUrls, setImageUrls] = useState<string[]>(parseOpportunityImages(opp?.imageUrl));
  const [featured, setFeatured] = useState(opp?.featured || false);
  const [additionalInfo, setAdditionalInfo] = useState(opp?.additionalInfo || '');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    if (imageUrls.length >= 3) {
      say('Maximum 3 images allowed per opportunity.');
      e.target.value = '';
      return;
    }

    if (imageUrls.length + files.length > 3) {
      say(`Maximum 3 images allowed. You can select ${3 - imageUrls.length} more.`);
      e.target.value = '';
      return;
    }

    for (const f of files) {
      const v = validateOpportunityImageFile(f);
      if (!v.valid) {
        say(v.error || 'Invalid file.');
        e.target.value = '';
        return;
      }
    }

    setUploadingImage(true);
    const uploadedBatch: string[] = [];
    try {
      for (const f of files) {
        const url = await uploadImage(f, 'opportunity-banners');
        uploadedBatch.push(url);
      }
      setImageUrls((prev) => {
        const updated = [...prev, ...uploadedBatch];
        if (!imageUrl && updated.length > 0) setImageUrl(updated[0]);
        return updated;
      });
      say('Images uploaded successfully');
    } catch (err: any) {
      for (const url of uploadedBatch) {
        await deleteStorageFile(url);
      }
      say(err.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = imageUrls[indexToRemove];
    setImageUrls((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      setImageUrl(updated[0] || '');
      return updated;
    });
    if (urlToRemove) {
      await deleteStorageFile(urlToRemove);
      say('Image removed');
    }
  };

  const handleSave = async (status: OpportunityStatus) => {
    if (!title.trim() || !organizer.trim() || !officialUrl.trim() || !description.trim()) {
      say('Please fill in all required fields (Title, Organizer, Application Link, Description).');
      return;
    }

    if (!deadline.trim()) {
      say('Application deadline is required.');
      return;
    }

    const dateVal = validateOpportunityDates({ startDate, endDate, deadline });
    if (!dateVal.valid) {
      say(dateVal.error || 'Please provide valid dates.');
      return;
    }

    setSubmitting(true);
    const data = {
      title: title.trim(),
      description: description.trim(),
      organizer: organizer.trim(),
      category,
      deadline: parseDateInputToTimestamp(deadline),
      startDate: startDate ? parseDateInputToTimestamp(startDate) : Date.now(),
      endDate: endDate ? parseDateInputToTimestamp(endDate) : (startDate ? parseDateInputToTimestamp(startDate) + 86400000 : Date.now() + 86400000),
      mode,
      location: location.trim(),
      eligibility: eligibility.trim(),
      skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      prize: prize.trim(),
      stipend: stipend.trim(),
      teamSize: teamSize.trim(),
      officialUrl: officialUrl.trim(),
      imageUrl: imageUrls.length > 0 ? imageUrls.join(',') : (imageUrl || ''),
      featured,
      additionalInfo: additionalInfo.trim(),
      status
    };

    try {
      if (opp?.id) {
        await updateOpportunityAdmin(opp.id, data);
        await recordAuditLog({
          adminId: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@pixelminds.org',
          action: `Edited Opportunity (${title})`,
          targetType: 'opportunity',
          targetId: opp.id,
          previousValue: opp,
          newValue: data
        });
        say(`Opportunity updated and saved as ${status}`);
      } else {
        const created = await submitOpportunityAdmin(user?.uid || 'admin', data);
        await recordAuditLog({
          adminId: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@pixelminds.org',
          action: `Published Opportunity (${title})`,
          targetType: 'opportunity',
          targetId: created.id,
          newValue: data
        });
        say(`Opportunity created and saved as ${status}`);
      }
      onBack();
    } catch {
      say('Error saving opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!opp?.id) return;
    if (!confirm('Are you sure you want to permanently delete this opportunity?')) return;
    try {
      await deleteOpportunityAdmin(opp.id);
      try {
        await recordAuditLog({
          adminId: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@pixelminds.org',
          action: `Deleted Opportunity (${opp.title})`,
          targetType: 'opportunity',
          targetId: opp.id
        });
      } catch (logErr) {
        console.warn('Audit log write note:', logErr);
      }
      say('Opportunity deleted successfully');
      onBack();
    } catch (err: any) {
      console.error('Error deleting opportunity:', err);
      say(err?.message || 'Error deleting opportunity');
    }
  };

  const handleDuplicate = async () => {
    setSubmitting(true);
    const data = {
      title: title + ' (Copy)',
      description,
      organizer,
      category,
      deadline: parseDateInputToTimestamp(deadline),
      startDate: startDate ? parseDateInputToTimestamp(startDate) : Date.now(),
      endDate: endDate ? parseDateInputToTimestamp(endDate) : Date.now() + 86400000,
      mode,
      location,
      eligibility,
      skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean),
      prize,
      stipend,
      teamSize,
      officialUrl,
      imageUrl: imageUrls[0] || imageUrl || '',
      featured,
      additionalInfo,
      status: 'draft' as OpportunityStatus
    };
    try {
      const copy = await submitOpportunityAdmin(user?.uid || 'admin', data);
      await recordAuditLog({
        adminId: user?.uid || 'admin',
        adminEmail: user?.email || 'admin@pixelminds.org',
        action: `Duplicated Opportunity (${title})`,
        targetType: 'opportunity',
        targetId: copy.id
      });
      say('Duplicated as Draft successfully');
      onBack();
    } catch {
      say('Error duplicating opportunity');
    } finally {
      setSubmitting(false);
    }
  };

  if (preview) {
    const fakeOpp = {
      id: opp?.id || 'preview',
      title: title || 'Untitled',
      org: organizer || 'Organizer',
      cat: category,
      mode: mode.charAt(0).toUpperCase() + mode.slice(1),
      deadline: deadline ? new Date(deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
      days: deadline ? Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)) : 0,
      prize: prize || 'Recognition',
      skills: skills.split(',').map((s: string) => s.trim()).filter(Boolean) || ['Tech'],
      description,
      officialUrl,
      imageUrl,
      views: opp?.views || 0,
      applyClicks: opp?.applyClicks || 0,
      featured,
      stipend,
      location,
      teamSize,
      eligibility,
      additionalInfo
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Preview Opportunity</h2>
          <Btn v="outline" onClick={() => setPreview(false)} className="!text-xs">Exit Preview</Btn>
        </div>
        <div className="max-w-sm mx-auto">
          <OppCard o={fakeOpp} />
        </div>
        <div className="flex gap-2 justify-center mt-4">
           <Btn onClick={() => handleSave('published')} className="!text-xs">Publish Now</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-bold text-sm">← Back to List</button>
           <h2 className="text-xl font-extrabold text-slate-900">{opp ? 'Edit Opportunity' : 'Create Opportunity'}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {opp && (
            <>
               <Btn v="danger" onClick={handleDelete} className="!text-xs !min-h-9">Delete</Btn>
               <Btn v="outline" onClick={handleDuplicate} className="!text-xs !min-h-9">Duplicate</Btn>
               {opp.status !== 'archived' && (
                 <Btn v="outline" onClick={() => {
                   if (confirm('Archive this opportunity? It will be removed from public discovery.')) {
                     handleSave('archived');
                   }
                 }} className="!text-xs !min-h-9">Archive</Btn>
               )}
               {opp.status !== 'expired' && (
                 <Btn v="outline" onClick={() => handleSave('expired')} className="!text-xs !min-h-9">Mark Expired</Btn>
               )}
            </>
          )}
          <Btn v="outline" onClick={() => setPreview(true)} className="!text-xs !min-h-9">Preview</Btn>
          <Btn v="outline" onClick={() => handleSave('draft')} disabled={submitting} className="!text-xs !min-h-9 text-amber-600 border-amber-200 bg-amber-50">Save Draft</Btn>
          <Btn onClick={() => handleSave('published')} disabled={submitting} className="!text-xs !min-h-9">Publish</Btn>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Basic Info</h3>
          <FormField label="Title"><input value={title} onChange={e=>setTitle(e.target.value)} className={inpStyle} /></FormField>
          <FormField label="Organizer / Company"><input value={organizer} onChange={e=>setOrganizer(e.target.value)} className={inpStyle} /></FormField>
          <FormField label="Category">
            <select value={category} onChange={e=>setCategory(e.target.value)} className={inpStyle}>
               {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Description"><textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} className={inpStyle} /></FormField>
          <FormField label="Official Website / Apply URL"><input type="url" value={officialUrl} onChange={e=>setOfficialUrl(e.target.value)} className={inpStyle} /></FormField>
          <FormField label="Banner / Cover Images (Max 3, up to 2 MB each)">
            {imageUrls.length < 3 && (
              <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-2 text-center cursor-pointer hover:bg-slate-100/60 transition mt-1">
                <span className="text-[11px] font-semibold text-slate-700">
                  {uploadingImage ? 'Uploading image...' : `Add image (${imageUrls.length}/3) · JPEG, PNG, or WebP up to 2 MB`}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImagesUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            )}
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {imageUrls.map((url, idx) => (
                  <div key={url + idx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video max-h-28 bg-slate-100 group">
                    <img src={url} alt={`Cover ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/60 text-white text-[9px] font-bold">
                      {idx === 0 ? 'Primary' : `#${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </FormField>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mt-2 cursor-pointer">
             <input type="checkbox" checked={featured} onChange={e=>setFeatured(e.target.checked)} className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4" />
             Feature this opportunity on Homepage
          </label>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Details & Dates</h3>
          <div className="grid grid-cols-2 gap-3">
             <FormField label="Mode">
               <select value={mode} onChange={e=>setMode(e.target.value)} className={inpStyle}>
                 <option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option>
               </select>
             </FormField>
             <FormField label="Location"><input value={location} onChange={e=>setLocation(e.target.value)} className={inpStyle} placeholder="e.g. Bengaluru / Global" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input
                type="date"
                value={startDate}
                min="1000-01-01"
                max="9999-12-31"
                onChange={e=>setStartDate(e.target.value)}
                className={inpStyle}
              />
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Format: DD/MM/YYYY</span>
                {startDate && formatDateToDDMMYYYY(startDate) && (
                  <span className="font-semibold text-slate-700">
                    Display: {formatDateToDDMMYYYY(startDate)}
                  </span>
                )}
              </div>
            </FormField>
            <FormField label="End Date">
              <input
                type="date"
                value={endDate}
                min={startDate || "1000-01-01"}
                max="9999-12-31"
                onChange={e=>setEndDate(e.target.value)}
                className={inpStyle}
              />
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Format: DD/MM/YYYY</span>
                {endDate && formatDateToDDMMYYYY(endDate) && (
                  <span className="font-semibold text-slate-700">
                    Display: {formatDateToDDMMYYYY(endDate)}
                  </span>
                )}
              </div>
            </FormField>
          </div>
          <FormField label="Application Deadline" required>
            <input
              type="date"
              value={deadline}
              min="1000-01-01"
              max={endDate || "9999-12-31"}
              onChange={e=>setDeadline(e.target.value)}
              className={inpStyle}
              required
            />
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Format: DD/MM/YYYY</span>
              {deadline && formatDateToDDMMYYYY(deadline) && (
                <span className="font-semibold text-slate-700">
                  Display: {formatDateToDDMMYYYY(deadline)}
                </span>
              )}
            </div>
          </FormField>
          
          <div className="grid grid-cols-2 gap-3">
             <FormField label="Prize"><input value={prize} onChange={e=>setPrize(e.target.value)} className={inpStyle} placeholder="e.g. ₹1,00,000" /></FormField>
             <FormField label="Stipend"><input value={stipend} onChange={e=>setStipend(e.target.value)} className={inpStyle} placeholder="e.g. ₹40,000/mo" /></FormField>
          </div>
          
          <FormField label="Eligibility"><input value={eligibility} onChange={e=>setEligibility(e.target.value)} className={inpStyle} placeholder="e.g. 2026/2027 Graduates" /></FormField>
          <FormField label="Skills / Tags (comma separated)"><input value={skills} onChange={e=>setSkills(e.target.value)} className={inpStyle} placeholder="React, Node.js, AI" /></FormField>
          <FormField label="Team Size"><input value={teamSize} onChange={e=>setTeamSize(e.target.value)} className={inpStyle} placeholder="e.g. 1-4 members" /></FormField>
          <FormField label="Additional Information"><textarea rows={2} value={additionalInfo} onChange={e=>setAdditionalInfo(e.target.value)} className={inpStyle} placeholder="Any specific instructions, perks, or Discord links..." /></FormField>
        </Card>
      </div>
    </div>
  );
};

const AdminCMS = ({ allOppsList, loadData }: any) => {
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingOpp, setEditingOpp] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline' | 'views'>('newest');
  const { say } = useApp();
  
  if (view === 'create' || view === 'edit') {
    return <AdminOpportunityForm opp={editingOpp} onBack={() => { setView('list'); loadData(); }} />;
  }

  const filteredList = allOppsList
    .filter((o: any) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (categoryFilter !== 'All' && o.category !== categoryFilter) return false;
      if (sourceFilter !== 'All' && (o.source || 'user') !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (o.title?.toLowerCase().includes(q) || o.organizer?.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'deadline') return (a.deadline || 0) - (b.deadline || 0);
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const handleUpdateStatus = async (id: string, status: string, title?: string) => {
    try {
      await updateOpportunityAdmin(id, { status: status as any });
      await recordAuditLog({
        adminId: user?.uid || 'admin',
        adminEmail: user?.email || 'admin@pixelminds.org',
        action: `Changed status to ${status}`,
        targetType: 'opportunity',
        targetId: id,
        reason: `Admin updated status of ${title || id}`
      });
      say(`Opportunity marked as ${status}`);
      loadData();
    } catch {
      say('Failed to update status');
    }
  };

  const handleToggleFeature = async (id: string, current: boolean, title: string) => {
    try {
      await updateOpportunityAdmin(id, { featured: !current });
      await recordAuditLog({
        adminId: user?.uid || 'admin',
        adminEmail: user?.email || 'admin@pixelminds.org',
        action: !current ? 'Featured opportunity' : 'Unfeatured opportunity',
        targetType: 'opportunity',
        targetId: id,
        reason: title
      });
      say(!current ? 'Opportunity featured on homepage' : 'Opportunity unfeatured');
      loadData();
    } catch {
      say('Failed to update featured status');
    }
  };

  const handleDeleteWithConfirm = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      await deleteOpportunityAdmin(id);
      try {
        await recordAuditLog({
          adminId: user?.uid || 'admin',
          adminEmail: user?.email || 'admin@pixelminds.org',
          action: 'Deleted opportunity',
          targetType: 'opportunity',
          targetId: id,
          reason: title
        });
      } catch (logErr) {
        console.warn('Audit log write note:', logErr);
      }
      say('Opportunity permanently deleted');
      loadData();
    } catch (err: any) {
      console.error('Error deleting opportunity:', err);
      say(err?.message || 'Failed to delete opportunity');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Comprehensive Filters */}
      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-[#C5A059]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or organizer..."
              className="w-full pl-9 pr-3 py-2 rounded-full border border-black/10 text-xs bg-white/80 text-[#16171D] placeholder-[#9E958C] outline-none focus:border-[#C5A059] shadow-xs"
            />
          </div>
          <Btn onClick={() => { setEditingOpp(null); setView('create'); }} className="!text-xs !min-h-9 !rounded-full !px-4 shadow-md">
            <Sparkles size={14} className="mr-1.5 text-[#DFB76C]" />
            + Create Opportunity
          </Btn>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold outline-none focus:border-[#C5A059] bg-white/80 text-[#2D2A26] cursor-pointer">
            <option value="All">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="archived">Archived</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold outline-none focus:border-[#C5A059] bg-white/80 text-[#2D2A26] cursor-pointer">
            <option value="All">All Categories</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold outline-none focus:border-[#C5A059] bg-white/80 text-[#2D2A26] cursor-pointer">
            <option value="All">All Sources</option>
            <option value="admin">Source: Admin</option>
            <option value="user">Source: User</option>
          </select>

          <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-semibold outline-none focus:border-[#C5A059] bg-white/80 text-[#2D2A26] cursor-pointer ml-auto">
            <option value="newest">Sort: Newest</option>
            <option value="deadline">Sort: Deadline</option>
            <option value="views">Sort: Most Viewed</option>
          </select>

          <span className="text-[#8C827A] font-medium">{filteredList.length} matching</span>
        </div>
      </div>

      <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Title &amp; Organizer</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map((o: any) => (
                <tr key={o.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3.5 max-w-[220px]">
                    <div className="font-bold text-slate-900 truncate">{o.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{o.organizer}</div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{o.category}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${o.source === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {o.source === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${
                      o.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      o.status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      o.status === 'archived' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      o.status === 'expired' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => handleToggleFeature(o.id, !!o.featured, o.title)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border transition ${
                        o.featured 
                          ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {o.featured ? '★ Featured' : '☆ Standard'}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    {o.status === 'draft' && (
                      <Btn v="outline" onClick={() => handleUpdateStatus(o.id, 'published', o.title)} className="!py-1 !px-2 !min-h-7 !text-[11px] text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">Publish</Btn>
                    )}
                    {o.status === 'published' && (
                      <Btn v="outline" onClick={() => handleUpdateStatus(o.id, 'draft', o.title)} className="!py-1 !px-2 !min-h-7 !text-[11px] text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100">Unpublish</Btn>
                    )}
                    <Btn v="outline" onClick={() => { setEditingOpp(o); setView('edit'); }} className="!py-1 !px-2 !min-h-7 !text-[11px]">Edit</Btn>
                    <Btn v="danger" onClick={() => handleDeleteWithConfirm(o.id, o.title)} className="!py-1 !px-2 !min-h-7 !text-[11px]">Delete</Btn>
                  </td>
                </tr>
              ))}
              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No opportunities found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export function Admin() {
  const [t, setT] = useState('Overview');
  const [pendingOpps, setPendingOpps] = useState<any[]>([]);
  const [allOppsList, setAllOppsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rewardConfig, setRewardConfig] = useState<RewardConfig>(DEFAULT_REWARD_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const { user } = useAuth();
  const { say } = useApp();

  // Dialog States
  const [selectedUserForPixel, setSelectedUserForPixel] = useState<UserType | null>(null);
  const [pixelAmount, setPixelAmount] = useState<number>(25);
  const [pixelReason, setPixelReason] = useState<string>('');
  const [adjustingPixel, setAdjustingPixel] = useState(false);

  // New Post State
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postText, setPostText] = useState('');
  const [postCategory, setPostCategory] = useState('Announcements');
  const [postLink, setPostLink] = useState('');

  // New Announcement State
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annCtaText, setAnnCtaText] = useState('Learn More');
  const [annCtaLink, setAnnCtaLink] = useState('');
  const [annImageUrl, setAnnImageUrl] = useState('');
  const [uploadingAnnImage, setUploadingAnnImage] = useState(false);

  // Dedicated Admin Notifications State
  const [adminNotifications, setAdminNotifications] = useState<AdminSentNotification[]>([]);
  const [showCreateNotif, setShowCreateNotif] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'everyone' | 'user'>('everyone');
  const [notifTargetUserId, setNotifTargetUserId] = useState<string>('');
  const [notifLink, setNotifLink] = useState('');
  const [notifType, setNotifType] = useState<'system' | 'announcement' | 'opportunity' | 'offer' | 'reminder'>('system');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Dedicated Reports & Moderation State
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'opportunity' | 'post' | 'resolved'>('all');
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [pending, all, uList, posts, anns, logs, config, notifs, reports] = await Promise.all([
        getPendingSubmissions().catch((err) => { console.warn('Pending submissions load error:', err); return []; }),
        getAllOpportunities().catch((err) => { console.warn('All opps load error:', err); return []; }),
        getAllUsersAdmin().catch((err) => { console.warn('Users load error:', err); return []; }),
        getCommunityPosts(true).catch((err) => { console.warn('Community posts load error:', err); return []; }),
        getAnnouncements(false).catch((err) => { console.warn('Announcements load error:', err); return []; }),
        getAuditLogs(50).catch((err) => { console.warn('Audit logs load error:', err); return []; }),
        getRewardConfig().catch((err) => { console.warn('Reward config load error:', err); return DEFAULT_REWARD_CONFIG; }),
        getAdminSentNotifications().catch((err) => { console.warn('Admin notifications load error:', err); return []; }),
        getAllReports().catch((err) => { console.warn('Reports load error:', err); return []; })
      ]);
      setPendingOpps(pending);
      setAllOppsList(all);
      setUsersList(uList);
      setCommunityPosts(posts);
      setAnnouncements(anns);
      setAuditLogs(logs);
      setRewardConfig(config);
      setAdminNotifications(notifs);
      setReportsList(reports);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  // Verification Inspection & Rejection Dialog States
  const [selectedSubmissionForDetails, setSelectedSubmissionForDetails] = useState<any | null>(null);
  const [rejectingSubmissionId, setRejectingSubmissionId] = useState<string | null>(null);
  const [rejectionModalReason, setRejectionModalReason] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'published' | 'rejected', reason?: string) => {
    const opp = pendingOpps.find(o => o.id === id);
    if (!reason && status === 'published' && !confirm(`Are you sure you want to approve and publish this submission?`)) return;
    try {
      await updateOpportunityAdmin(id, { status, rejectionReason: reason, adminNotes: reason });
      await recordAuditLog({
        adminId: user?.uid || 'admin',
        adminEmail: user?.email || 'admin@pixelminds.org',
        action: `${status === 'published' ? 'Approved' : 'Rejected'} submission`,
        targetType: 'opportunity',
        targetId: id,
        reason: reason || opp?.title || 'User submission'
      });
      say(`Submission marked as ${status === 'published' ? 'approved & published' : 'rejected'} successfully`);
      loadData();
    } catch {
      say('Failed to update submission status');
    }
  };

  const handleSaveRewardConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await updateRewardConfig(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        rewardConfig
      );
      say('Reward configuration saved successfully');
      loadData();
    } catch {
      say('Failed to save reward config');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAdjustPixelSubmit = async () => {
    if (!selectedUserForPixel) return;
    if (!pixelReason.trim()) {
      say('Please provide a reason for the Pixel adjustment');
      return;
    }
    setAdjustingPixel(true);
    try {
      await adjustUserPixels(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        selectedUserForPixel.id,
        pixelAmount,
        pixelReason.trim()
      );
      say(`Pixel adjustment recorded (${pixelAmount >= 0 ? '+' : ''}${pixelAmount} Pixels)`);
      setSelectedUserForPixel(null);
      setPixelReason('');
      loadData();
    } catch {
      say('Failed to adjust user Pixels');
    } finally {
      setAdjustingPixel(false);
    }
  };

  const handleToggleUserSuspension = async (targetUser: UserType) => {
    const newStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    const actionName = newStatus === 'suspended' ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionName} user ${targetUser.displayName}?`)) return;
    try {
      await toggleUserSuspension(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        targetUser.id,
        newStatus,
        `Admin clicked ${actionName}`
      );
      say(`User ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`);
      loadData();
    } catch {
      say(`Failed to ${actionName} user`);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim()) return;
    try {
      await createAdminCommunityPost(
        {
          uid: user?.uid || 'admin',
          email: user?.email || 'admin@pixelminds.org',
          displayName: 'Pixel Minds Official'
        },
        {
          text: postText.trim(),
          category: postCategory,
          link: postLink.trim() || undefined,
          status: 'published'
        }
      );
      say('Community post published to Feed successfully');
      setPostText('');
      setPostLink('');
      setShowCreatePost(false);
      loadData();
    } catch {
      say('Failed to create community post');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this community post?')) return;
    try {
      await deleteCommunityPost(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        postId
      );
      say('Community post deleted');
      loadData();
    } catch {
      say('Failed to delete post');
    }
  };

  const handleAnnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAnnImage(true);
    try {
      const url = await uploadAnnouncementImage(file);
      setAnnImageUrl(url);
      say('Announcement banner uploaded successfully');
    } catch (err: any) {
      console.error('Banner upload error:', err);
      say(err?.message || 'Failed to upload banner. You can also paste an image URL.');
    } finally {
      setUploadingAnnImage(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) return;
    try {
      await createAnnouncement(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        {
          title: annTitle.trim(),
          message: annMessage.trim(),
          ctaText: annCtaText.trim() || undefined,
          ctaLink: annCtaLink.trim() || undefined,
          imageUrl: annImageUrl.trim() || undefined,
          startDate: Date.now(),
          endDate: Date.now() + 86400000 * 7,
          status: 'published'
        }
      );
      say('Announcement published on website');
      setAnnTitle('');
      setAnnMessage('');
      setAnnCtaText('Learn More');
      setAnnCtaLink('');
      setAnnImageUrl('');
      setShowCreateAnnouncement(false);
      loadData();
    } catch {
      say('Failed to create announcement');
    }
  };

  const handleSendAdminNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      say('Title and message are required.');
      return;
    }
    if (notifTarget === 'user' && !notifTargetUserId) {
      say('Please select a specific recipient user.');
      return;
    }

    setSendingNotif(true);
    try {
      const res = await sendAdminNotification({
        adminId: user?.uid,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        target: notifTarget,
        targetUserId: notifTarget === 'user' ? notifTargetUserId : undefined,
        link: notifLink.trim() || undefined,
        type: notifType
      });
      say(`Notification sent successfully to ${res.count} recipient${res.count === 1 ? '' : 's'}!`);
      setNotifTitle('');
      setNotifMessage('');
      setNotifLink('');
      setNotifTarget('everyone');
      setNotifTargetUserId('');
      setShowCreateNotif(false);
      const updatedList = await getAdminSentNotifications();
      setAdminNotifications(updatedList);
    } catch (err: any) {
      console.error('Failed to send notification:', err);
      say(err?.message || 'Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const [deletingNotifId, setDeletingNotifId] = useState<string | null>(null);

  const handleDeleteNotification = async (notifId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete notification "${title}"? This will also remove it from all recipients' notification inboxes.`)) {
      return;
    }

    setDeletingNotifId(notifId);
    try {
      await deleteAdminNotification(notifId);
      await recordAuditLog({
        adminId: user?.uid || 'admin',
        adminEmail: user?.email || 'admin@pixelminds.org',
        action: 'Deleted notification',
        targetType: 'system' as any,
        targetId: notifId,
        reason: title
      });
      say('Notification deleted successfully');
      const updatedList = await getAdminSentNotifications();
      setAdminNotifications(updatedList);
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      say(err?.message || 'Failed to delete notification');
    } finally {
      setDeletingNotifId(null);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(
        { uid: user?.uid || 'admin', email: user?.email || 'admin@pixelminds.org' },
        annId
      );
      say('Announcement removed');
      loadData();
    } catch (err: any) {
      console.error('Failed to remove announcement:', err);
      say(err?.message || 'Failed to remove announcement');
    }
  };

  const handleResolveReport = async (reportId: string, notes?: string) => {
    setResolvingReportId(reportId);
    try {
      await resolveReport(reportId, notes || 'Verified and marked resolved by Admin', {
        uid: user?.uid || 'admin',
        email: user?.email || 'admin@pixelminds.org'
      });
      say('Report marked as resolved');
      const updated = await getAllReports();
      setReportsList(updated);
    } catch (err: any) {
      say(err?.message || 'Failed to resolve report');
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    setResolvingReportId(reportId);
    try {
      await dismissReport(reportId, {
        uid: user?.uid || 'admin',
        email: user?.email || 'admin@pixelminds.org'
      });
      say('Report dismissed');
      const updated = await getAllReports();
      setReportsList(updated);
    } catch (err: any) {
      say(err?.message || 'Failed to dismiss report');
    } finally {
      setResolvingReportId(null);
    }
  };

  const handleDeleteReportedItem = async (report: ReportItem) => {
    if (!confirm(`Are you sure you want to permanently delete this reported ${report.targetType}? This will delete the content from the website immediately.`)) return;
    setResolvingReportId(report.id);
    try {
      await deleteReportedItem(report.id, report.targetType, report.targetId, {
        uid: user?.uid || 'admin',
        email: user?.email || 'admin@pixelminds.org'
      });
      say(`Reported ${report.targetType} deleted permanently and report resolved`);
      loadData();
      const updated = await getAllReports();
      setReportsList(updated);
    } catch (err: any) {
      say(err?.message || 'Failed to delete reported item');
    } finally {
      setResolvingReportId(null);
    }
  };

  // Real dashboard metrics
  const totalViews = allOppsList.reduce((acc, o) => acc + (o.views || 0), 0);
  const totalApplyClicks = allOppsList.reduce((acc, o) => acc + (o.applyClicks || 0), 0);
  const totalPixels = usersList.reduce((acc, u) => acc + (u.pixels || 0), 0);
  const publishedCount = allOppsList.filter(o => o.status === 'published').length;

  return (
    <W className="grid gap-6 py-8 md:grid-cols-[230px_1fr]">
      {/* Admin Sidebar Navigation */}
      <nav className="flex gap-1.5 overflow-x-auto md:flex-col pb-2 md:pb-0 scrollbar-hide">
        {adminTabs.map(([n, I]) => {
          const isActive = t === n;
          return (
            <button
              key={n}
              onClick={() => setT(n)}
              className={`flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-[#16171D] text-[#DFB76C] shadow-md shadow-black/15 ring-1 ring-[#C5A059]/30'
                  : 'bg-white/60 text-[#5D574F] border border-black/5 hover:bg-white hover:text-[#16171D]'
              }`}
            >
              <I size={15} className={isActive ? 'text-[#DFB76C]' : 'text-[#8C827A]'} />
              <span>{n}</span>
              {n === 'Submissions' && pendingOpps.length > 0 && (
                <span className="ml-auto rounded-full bg-[#DFB76C] px-2 py-0.5 text-[10px] font-bold text-[#16171D]">
                  {pendingOpps.length}
                </span>
              )}
              {n === 'Reports & Moderation' && reportsList.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {reportsList.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Admin Panel Body */}
      <section className="min-w-0 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-['Outfit',sans-serif] text-2xl font-extrabold text-[#16171D]">{t}</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/80 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200/80 shadow-2xs transition"
              title="Return to public website"
            >
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </Link>
            <Badge className="bg-[#16171D] text-[#DFB76C] font-bold border-white/10 !rounded-full !px-3.5 !py-1">
              <ShieldCheck size={13} className="mr-1.5 inline text-[#C5A059]" /> Admin Control Active
            </Badge>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {t === 'Overview' && (
          <>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {[
                ['Live Opportunities', publishedCount.toString()],
                ['Pending Review', pendingOpps.length.toString()],
                ['Registered Users', usersList.length.toString()],
                ['Pixels Issued', totalPixels.toLocaleString('en-IN')],
                ['Total Views', totalViews.toLocaleString('en-IN')],
                ['Apply Clicks', totalApplyClicks.toLocaleString('en-IN')],
                ['Community Posts', communityPosts.length.toString()],
                ['Active Announcements', announcements.filter(a => a.status === 'published').length.toString()]
              ].map(([l, v]) => (
                <Card key={l as string} className="p-4 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                  <p className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">{l}</p>
                  <p className="mt-1 font-['Outfit',sans-serif] text-2xl font-extrabold text-[#16171D]">{v}</p>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <div className="border-b border-black/8 p-4 font-bold text-sm text-[#16171D] flex justify-between items-center">
                <span>Pending Community Submissions</span>
                <span className="text-xs font-semibold text-[#8C827A]">{pendingOpps.length} awaiting review</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Organizer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingOpps.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{o.title}</td>
                        <td className="px-4 py-3.5">{o.category}</td>
                        <td className="px-4 py-3.5 text-slate-600">{o.organizer}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <Clock size={11} /> Pending
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Btn v="outline" onClick={() => setSelectedSubmissionForDetails(o)} className="!py-1 !px-2.5 !text-[11px] !min-h-7">
                            View Details
                          </Btn>
                          <Btn onClick={() => handleUpdateStatus(o.id, 'published')} className="!py-1 !px-2.5 !text-[11px] !min-h-7 bg-emerald-600 hover:bg-emerald-700">
                            Approve
                          </Btn>
                          <Btn v="danger" onClick={() => { setRejectingSubmissionId(o.id); setRejectionModalReason(''); }} className="!py-1 !px-2.5 !text-[11px] !min-h-7">
                            Reject
                          </Btn>
                        </td>
                      </tr>
                    ))}
                    {pendingOpps.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No pending submissions. All reviewed!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* SUBMISSIONS TAB */}
        {t === 'Submissions' && (
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-4 font-bold text-sm text-slate-900 flex justify-between items-center">
              <span>Community Opportunity Submissions Queue</span>
              <span className="text-xs font-semibold text-slate-500">{pendingOpps.length} pending</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Title &amp; Link</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingOpps.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{o.title}</div>
                        <a href={o.officialUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 mt-0.5">
                          {o.officialUrl} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="px-4 py-3.5">{o.category}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{o.submitterName || 'User'}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                          {o.submitterEmail || o.createdBy}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 capitalize">{o.mode}</td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <Btn v="outline" onClick={() => setSelectedSubmissionForDetails(o)} className="!py-1 !px-2.5 !text-[11px] !min-h-7">
                          View Details
                        </Btn>
                        <Btn onClick={() => handleUpdateStatus(o.id, 'published')} className="!py-1 !px-2.5 !text-[11px] !min-h-7 bg-emerald-600 hover:bg-emerald-700">
                          Approve
                        </Btn>
                        <Btn v="danger" onClick={() => { setRejectingSubmissionId(o.id); setRejectionModalReason(''); }} className="!py-1 !px-2.5 !text-[11px] !min-h-7">
                          Reject
                        </Btn>
                      </td>
                    </tr>
                  ))}
                  {pendingOpps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        No pending community submissions in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* REPORTS & MODERATION TAB */}
        {t === 'Reports & Moderation' && (() => {
          const filteredReports = reportsList.filter((r) => {
            if (reportFilter === 'pending') return r.status === 'pending';
            if (reportFilter === 'opportunity') return r.targetType === 'opportunity';
            if (reportFilter === 'post') return r.targetType === 'post';
            if (reportFilter === 'resolved') return r.status === 'resolved' || r.status === 'dismissed';
            return true;
          });

          return (
            <div className="space-y-4">
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Flag size={16} className="text-rose-500" />
                    Reports &amp; Community Moderation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspect user-flagged opportunities and community feed posts. Verify legitimacy, delete offending items, or dismiss false reports.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    {reportsList.filter(r => r.status === 'pending').length} Awaiting Action
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all', label: `All Reports (${reportsList.length})` },
                  { id: 'pending', label: `Pending (${reportsList.filter(r => r.status === 'pending').length})` },
                  { id: 'opportunity', label: `Opportunities (${reportsList.filter(r => r.targetType === 'opportunity').length})` },
                  { id: 'post', label: `Feed Posts (${reportsList.filter(r => r.targetType === 'post').length})` },
                  { id: 'resolved', label: `Resolved (${reportsList.filter(r => r.status === 'resolved' || r.status === 'dismissed').length})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setReportFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                      reportFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white/80 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Reports List */}
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const isPending = report.status === 'pending';
                  const isOpportunity = report.targetType === 'opportunity';
                  const isResolving = resolvingReportId === report.id;

                  return (
                    <Card key={report.id} className="p-4 pm-glass-card bg-white/90 border border-white/90 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                            isOpportunity
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isOpportunity ? <FileText size={11} /> : <MessageSquare size={11} />}
                            {isOpportunity ? 'Opportunity' : 'Community Post'}
                          </span>

                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold capitalize border ${
                            report.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : report.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {report.status === 'pending' ? <Clock size={10} /> : report.status === 'resolved' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {report.status}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            Reported on {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium">
                          Reported by: <span className="font-semibold text-slate-800">{report.reporterEmail || report.reporterId || 'Anonymous'}</span>
                        </div>
                      </div>

                      {/* Reason & Content */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">Flagged Reason:</span>
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {report.reason}
                          </span>
                        </div>

                        {report.details && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                            <span className="font-bold text-slate-700 block text-[11px] mb-0.5">Reporter Context / Explanation:</span>
                            {report.details}
                          </div>
                        )}

                        {/* Reported Item Details */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center justify-between">
                            <span>Item Identifier: <span className="font-mono text-[11px] text-blue-700 font-semibold">{report.targetId}</span></span>
                            {isOpportunity && (
                              <Link
                                to={`/opportunities/${report.targetId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                              >
                                View Live Opportunity <ExternalLink size={11} />
                              </Link>
                            )}
                          </div>
                          {report.targetTitle && (
                            <p className="text-slate-700 font-semibold">
                              Target: <span className="font-bold text-slate-900">{report.targetTitle}</span>
                            </p>
                          )}
                          {report.targetSnippet && (
                            <p className="text-slate-600 italic bg-white/70 p-2 rounded-lg border border-slate-200/50 mt-1">
                              "{report.targetSnippet}"
                            </p>
                          )}
                        </div>

                        {report.notes && (
                          <div className="text-xs text-slate-500 italic">
                            Admin note: {report.notes}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons for Pending Reports */}
                      {isPending && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => handleDismissReport(report.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
                          >
                            Dismiss Report
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => handleResolveReport(report.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={13} />
                            Mark Resolved
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => handleDeleteReportedItem(report)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Trash2 size={13} />
                            Verify &amp; Delete Content
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}

                {filteredReports.length === 0 && (
                  <Card className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No reports in this view</p>
                      <p className="text-xs text-slate-400">All community submissions and opportunities are currently in good standing.</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          );
        })()}

        {/* OPPORTUNITIES CMS TAB */}
        {t === 'Opportunities' && (
          <AdminCMS allOppsList={allOppsList} loadData={loadData} />
        )}

        {/* COMMUNITY POSTS TAB */}
        {t === 'Community Posts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin Community Posts</h3>
                <p className="text-xs text-slate-500">Publish announcements, internship alerts, or hackathon tips directly to the public Feed</p>
              </div>
              <Btn onClick={() => setShowCreatePost(!showCreatePost)} className="!text-xs !min-h-9 shadow-xs">
                <Sparkles size={14} className="mr-1.5" />
                + Create Community Post
              </Btn>
            </div>

            {showCreatePost && (
              <Card className="p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#16171D]">New Admin Post</h4>
                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Category</label>
                    <select value={postCategory} onChange={e=>setPostCategory(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]">
                      {['Announcements', 'Internships', 'Hackathons', 'Jobs', 'Workshops', 'Scholarships', 'Competitions', 'Events', 'Courses', 'Tech Updates'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Message Content</label>
                    <textarea
                      rows={3}
                      value={postText}
                      onChange={e=>setPostText(e.target.value)}
                      placeholder="Write your announcement or community update here..."
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Resource Link (optional)</label>
                    <input
                      type="url"
                      value={postLink}
                      onChange={e=>setPostLink(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Btn v="outline" onClick={() => setShowCreatePost(false)} className="!text-xs !rounded-full !px-4">Cancel</Btn>
                    <Btn type="submit" className="!text-xs !rounded-full !px-5">Publish to Feed</Btn>
                  </div>
                </form>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Author</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Content</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {communityPosts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900">{p.user}</td>
                        <td className="px-4 py-3.5 text-slate-600">{p.category || 'Discussion'}</td>
                        <td className="px-4 py-3.5 max-w-[280px] truncate text-slate-700">{p.text}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.source === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {p.source === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Btn v="danger" onClick={() => handleDeletePost(p.id)} className="!py-1 !px-2.5 !text-[11px] !min-h-7">Delete</Btn>
                        </td>
                      </tr>
                    ))}
                    {communityPosts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No community posts found in Firestore.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {t === 'Announcements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Website Announcements</h3>
                <p className="text-xs text-slate-500">Highlighted banner announcements displayed prominently at the top of the public website</p>
              </div>
              <Btn onClick={() => setShowCreateAnnouncement(!showCreateAnnouncement)} className="!text-xs !min-h-9 shadow-xs">
                <Megaphone size={14} className="mr-1.5" />
                + Create Announcement
              </Btn>
            </div>

            {showCreateAnnouncement && (
              <Card className="p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-black/8 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#16171D]">New Website Announcement</h4>
                    <span className="text-[11px] text-[#7D756C]">Visible to all visitors in the announcement banner modal</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Headline</label>
                    <input
                      value={annTitle}
                      onChange={e=>setAnnTitle(e.target.value)}
                      placeholder="e.g. Smart India Hackathon registrations live!"
                      className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Announcement Message</label>
                    <textarea
                      rows={2}
                      value={annMessage}
                      onChange={e=>setAnnMessage(e.target.value)}
                      placeholder="Detailed update or instructions for students..."
                      className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      required
                    />
                  </div>

                  {/* Banner Image Upload & Preview */}
                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Banner Image (Optional)</label>
                    {annImageUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-2xl overflow-hidden border border-black/10 aspect-[16/9] max-h-48 bg-stone-100">
                          <img src={annImageUrl} alt="Announcement banner preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAnnImageUrl('')}
                            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 text-white hover:bg-black/90 transition shadow-sm"
                            title="Remove image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-emerald-700 font-medium">✓ Image uploaded to storage</span>
                          <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#C5A059] hover:text-[#DFB76C] cursor-pointer">
                            <Upload size={12} />
                            <span>Replace image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAnnImageUpload}
                              className="hidden"
                              disabled={uploadingAnnImage}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 rounded-2xl border-2 border-dashed border-black/15 bg-white/50 p-4 text-center cursor-pointer hover:bg-white hover:border-[#C5A059]/50 transition">
                        <Upload size={22} className="text-[#C5A059] mb-1.5" />
                        <span className="text-xs font-semibold text-[#2D2A26]">
                          {uploadingAnnImage ? 'Uploading image...' : 'Click or drop to upload banner image (16:9 ratio)'}
                        </span>
                        <span className="text-[10px] text-[#8C827A] mt-0.5">PNG, JPG, WebP up to 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAnnImageUpload}
                          className="hidden"
                          disabled={uploadingAnnImage}
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5D574F] block mb-1">Destination Link (Optional)</label>
                      <input
                        type="url"
                        value={annCtaLink}
                        onChange={e=>setAnnCtaLink(e.target.value)}
                        placeholder="https://... or /opportunities"
                        className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      />
                      <span className="text-[10px] text-[#8C827A] mt-0.5 block">Clicking the banner image or CTA button will navigate here</span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#5D574F] block mb-1">CTA Button Text</label>
                      <input
                        value={annCtaText}
                        onChange={e=>setAnnCtaText(e.target.value)}
                        placeholder="e.g. Learn More / Apply"
                        className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-black/8">
                    <Btn v="outline" onClick={() => setShowCreateAnnouncement(false)} className="!text-xs !rounded-full !px-4">Cancel</Btn>
                    <Btn type="submit" disabled={uploadingAnnImage} className="!text-xs !rounded-full !px-5">
                      Publish Announcement
                    </Btn>
                  </div>
                </form>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Banner</th>
                      <th className="px-4 py-3">Headline</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Destination Link</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {announcements.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          {a.imageUrl ? (
                            <div className="w-16 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                              <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="inline-block text-[10px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-100">
                              No image
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 max-w-[180px] truncate">{a.title}</td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-[220px] truncate">{a.message}</td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-[140px] truncate">
                          {a.ctaLink ? (
                            <a href={a.ctaLink} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-1">
                              <span>Link</span>
                              <ExternalLink size={10} />
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${
                            a.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Btn v="danger" onClick={() => handleDeleteAnnouncement(a.id)} className="!py-1 !px-2.5 !text-[11px] !min-h-7">Delete</Btn>
                        </td>
                      </tr>
                    ))}
                    {announcements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No announcements published yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {t === 'Notifications' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin Notification Center</h3>
                <p className="text-xs text-slate-500">Send notifications directly to user Notification Bells (broadcast to Everyone or target specific users)</p>
              </div>
              <Btn onClick={() => setShowCreateNotif(!showCreateNotif)} className="!text-xs !min-h-9 shadow-xs">
                <Bell size={14} className="mr-1.5" />
                + Compose Notification
              </Btn>
            </div>

            {showCreateNotif && (
              <Card className="p-5 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                <form onSubmit={handleSendAdminNotification} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-black/8 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#16171D]">Compose Notification</h4>
                    <span className="text-[11px] text-[#7D756C]">Delivered directly to user NotificationBell</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Notification Title</label>
                    <input
                      value={notifTitle}
                      onChange={e=>setNotifTitle(e.target.value)}
                      placeholder="e.g. New Hackathon Announced / Submission Review Update"
                      className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#5D574F] block mb-1">Target Audience</label>
                      <select
                        value={notifTarget}
                        onChange={(e: any) => setNotifTarget(e.target.value)}
                        className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      >
                        <option value="everyone">Everyone (All registered users)</option>
                        <option value="user">Specific User</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#5D574F] block mb-1">Notification Category / Type</label>
                      <select
                        value={notifType}
                        onChange={(e: any) => setNotifType(e.target.value)}
                        className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      >
                        <option value="system">System Notice</option>
                        <option value="opportunity">Opportunity Update</option>
                        <option value="announcement">Announcement</option>
                        <option value="offer">Special Offer / Reward</option>
                        <option value="reminder">Reminder</option>
                      </select>
                    </div>
                  </div>

                  {notifTarget === 'user' && (
                    <div>
                      <label className="text-xs font-semibold text-[#5D574F] block mb-1">Select Registered Recipient</label>
                      <select
                        value={notifTargetUserId}
                        onChange={e=>setNotifTargetUserId(e.target.value)}
                        className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                        required
                      >
                        <option value="">-- Choose a user --</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || 'User'} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Message Body</label>
                    <textarea
                      rows={3}
                      value={notifMessage}
                      onChange={e=>setNotifMessage(e.target.value)}
                      placeholder="Write your notification message here..."
                      className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#5D574F] block mb-1">Destination URL (Optional)</label>
                    <input
                      value={notifLink}
                      onChange={e=>setNotifLink(e.target.value)}
                      placeholder="e.g. /opportunities or /profile?tab=My+Submissions or https://example.com"
                      className="w-full rounded-xl border border-black/10 p-2.5 text-xs outline-none focus:border-[#C5A059] bg-white/80 text-[#16171D]"
                    />
                    <span className="text-[10px] text-[#8C827A] mt-0.5 block">When the user clicks the notification in their bell, they will be navigated here</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-black/8">
                    <Btn v="outline" onClick={() => setShowCreateNotif(false)} className="!text-xs !rounded-full !px-4">Cancel</Btn>
                    <Btn type="submit" disabled={sendingNotif} className="!text-xs !rounded-full !px-5 inline-flex items-center gap-1.5">
                      <Send size={13} />
                      <span>{sendingNotif ? 'Dispatching...' : 'Send Notification'}</span>
                    </Btn>
                  </div>
                </form>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 p-4 font-bold text-sm text-slate-900 flex justify-between items-center">
                <span>Sent Notifications History</span>
                <span className="text-xs font-semibold text-slate-500">{adminNotifications.length} logged</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Title &amp; Message</th>
                      <th className="px-4 py-3">Recipients</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Destination Link</th>
                      <th className="px-4 py-3 text-right">Date Sent</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminNotifications.map((n) => (
                      <tr key={n.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 max-w-[280px]">
                          <div className="font-bold text-slate-900 truncate">{n.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{n.message}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            n.recipientsCount > 1 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}>
                            {n.targetDescription}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="capitalize px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {n.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-[160px] truncate">
                          {n.link ? (
                            <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {n.link}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-400 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(n.id, n.title)}
                            disabled={deletingNotifId === n.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/60 transition disabled:opacity-50"
                            title="Delete notification"
                          >
                            <Trash2 size={13} className={deletingNotifId === n.id ? 'animate-spin' : ''} />
                            <span>{deletingNotifId === n.id ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {adminNotifications.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
                              <Inbox size={20} className="opacity-60" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">No notifications sent yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Click '+ Compose Notification' above to broadcast a notification.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* USERS & PIXELS TAB */}
        {t === 'Users & Pixels' && (
          <div className="space-y-4">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
              <h3 className="text-sm font-bold text-slate-900">User Moderation &amp; Pixel Adjustments</h3>
              <p className="text-xs text-slate-500">View real registered users, grant or deduct Pixels with transaction histories, and suspend/reactivate accounts</p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Pixels</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Pixel &amp; Account Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <Avatar name={u.displayName} photoURL={u.photoURL} size={28} />
                          <span>{u.displayName}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${u.role === 'admin' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-sky-600">{u.pixels || 0}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${u.status === 'suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <Btn v="outline" onClick={() => setSelectedUserForPixel(u)} className="!py-1 !px-2.5 !text-[11px] !min-h-7">
                            <Coins size={12} className="mr-1 text-amber-500" /> Adjust Pixels
                          </Btn>
                          <Btn
                            v={u.status === 'suspended' ? 'outline' : 'danger'}
                            onClick={() => handleToggleUserSuspension(u)}
                            className="!py-1 !px-2.5 !text-[11px] !min-h-7"
                          >
                            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </Btn>
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pixel Adjustment Modal Dialog */}
            {selectedUserForPixel && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-6 space-y-4 shadow-2xl pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
                  <div className="flex items-center justify-between border-b border-black/8 pb-3">
                    <h3 className="font-['Outfit',sans-serif] font-bold text-sm text-[#16171D]">Adjust Pixels for {selectedUserForPixel.displayName}</h3>
                    <button onClick={() => setSelectedUserForPixel(null)} className="text-[#8C827A] hover:text-[#16171D] font-bold text-base cursor-pointer">✕</button>
                  </div>
                  <div>
                    <p className="text-xs text-[#7D756C]">Current Balance: <b className="text-[#C5A059] font-bold">{selectedUserForPixel.pixels || 0} Pixels</b></p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Amount (+ to grant, - to deduct)</label>
                    <input
                      type="number"
                      value={pixelAmount}
                      onChange={e => setPixelAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Reason for Adjustment</label>
                    <input
                      value={pixelReason}
                      onChange={e => setPixelReason(e.target.value)}
                      placeholder="e.g. Hackathon winner bonus / Community moderation"
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-black/8">
                    <Btn v="outline" onClick={() => setSelectedUserForPixel(null)} className="!text-xs !rounded-full !px-4">Cancel</Btn>
                    <Btn onClick={handleAdjustPixelSubmit} disabled={adjustingPixel} className="!text-xs !rounded-full !px-5">
                      {adjustingPixel ? 'Recording...' : 'Record Transaction'}
                    </Btn>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* REWARD CONFIGURATION TAB */}
        {t === 'Reward Config' && (
          <div className="space-y-4">
            <div className="bg-white/60 p-4 rounded-2xl border border-black/6">
              <h3 className="font-['Outfit',sans-serif] text-sm font-bold text-[#16171D]">Centralized Reward Configuration</h3>
              <p className="text-xs text-[#7D756C]">All components dynamically reference these Firestore values for rewarding actions across the website</p>
            </div>

            <Card className="p-6 pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <form onSubmit={handleSaveRewardConfig} className="space-y-4 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Share Opportunity</label>
                    <input
                      type="number"
                      value={rewardConfig.shareOpportunity}
                      onChange={e => setRewardConfig({...rewardConfig, shareOpportunity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Submit Opportunity</label>
                    <input
                      type="number"
                      value={rewardConfig.submitOpportunity}
                      onChange={e => setRewardConfig({...rewardConfig, submitOpportunity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Approved Opportunity</label>
                    <input
                      type="number"
                      value={rewardConfig.approvedOpportunity}
                      onChange={e => setRewardConfig({...rewardConfig, approvedOpportunity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Referral Signup</label>
                    <input
                      type="number"
                      value={rewardConfig.referralSignup}
                      onChange={e => setRewardConfig({...rewardConfig, referralSignup: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Valid Report</label>
                    <input
                      type="number"
                      value={rewardConfig.validReport}
                      onChange={e => setRewardConfig({...rewardConfig, validReport: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#2D2A26] block mb-1">Daily Activity Bonus</label>
                    <input
                      type="number"
                      value={rewardConfig.dailyActivity}
                      onChange={e => setRewardConfig({...rewardConfig, dailyActivity: Number(e.target.value)})}
                      className="w-full rounded-xl border border-black/10 bg-white/80 p-2.5 text-xs outline-none focus:border-[#C5A059] text-[#16171D]"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Btn type="submit" disabled={savingConfig} className="!text-xs !rounded-full !px-5">
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </Btn>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {t === 'Audit Logs' && (
          <div className="space-y-4">
            <div className="bg-white/60 p-4 rounded-2xl border border-black/6">
              <h3 className="font-['Outfit',sans-serif] text-sm font-bold text-[#16171D]">Admin Audit Trail</h3>
              <p className="text-xs text-[#7D756C]">Immutable chronological history of all administrative operations, target entities, and value updates</p>
            </div>

            <Card className="overflow-hidden pm-glass-card bg-white/85 backdrop-blur-xl border border-white/90 shadow-sm text-[#0e1b33]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-black/[0.02] text-[#8C827A] font-bold uppercase tracking-wider border-b border-black/8">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Target</th>
                      <th className="px-4 py-3">Reason / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/6 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-black/[0.02] transition">
                        <td className="px-4 py-3 text-[#7D756C] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#16171D]">{log.adminEmail}</td>
                        <td className="px-4 py-3 font-bold text-[#C5A059]">{log.action}</td>
                        <td className="px-4 py-3 text-[#5D574F] uppercase text-[10px]">{log.targetType}</td>
                        <td className="px-4 py-3 text-[#7D756C] max-w-[200px] truncate">{log.reason || log.targetId}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-sans">
                          No audit entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </section>

      {/* Submission Detail Inspection Modal */}
      <SubmissionDetailModal
        submission={selectedSubmissionForDetails}
        isOpen={!!selectedSubmissionForDetails}
        onClose={() => setSelectedSubmissionForDetails(null)}
        isAdmin
        onApprove={(id) => handleUpdateStatus(id, 'published')}
        onReject={(id, reason) => handleUpdateStatus(id, 'rejected', reason)}
      />

      {/* Admin Rejection Reason Modal */}
      {rejectingSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Reject Opportunity Submission</h3>
              <button
                onClick={() => setRejectingSubmissionId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You can optionally provide a reason or reviewer feedback for the submitter. This will be visible on their profile and sent via notification.
            </p>
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectionModalReason}
                onChange={(e) => setRejectionModalReason(e.target.value)}
                placeholder="e.g. Official application URL is unreachable or opportunity is outside our tech scope..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectingSubmissionId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = rejectingSubmissionId;
                  const reason = rejectionModalReason.trim();
                  setRejectingSubmissionId(null);
                  await handleUpdateStatus(id, 'rejected', reason);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </W>
  );
}

// Leaderboard and Referral Exports
export { Leaderboard } from './pixels';

// FAQ & Support Page Exports
export function FAQ() {
  return (
    <div className="py-2">
      <FAQSection />
    </div>
  );
}

export function Support() {
  return (
    <div className="py-2">
      <FAQSection />
    </div>
  );
}
export { FAQSection } from './components/FAQSection';
export { Explore } from './pages/Explore';

