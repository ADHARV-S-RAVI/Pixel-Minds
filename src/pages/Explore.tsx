import { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Trophy,
  Bookmark,
  Share2,
  ExternalLink,
  Sparkles,
  Search,
  RotateCcw,
  Users,
  ArrowRight,
  X,
  ShieldCheck,
  Tag,
  MoveRight,
  MoveLeft,
  MousePointerClick,
} from 'lucide-react';
import { ClickStack } from '../components/ClickStack';
import { useApp } from '../store';
import { getPublishedOpportunities } from '../services/opportunities';
import { VERIFIED_OPPORTUNITIES } from '../data/verifiedOpportunities';
import { getCategoryMeta, grad } from '../utils/meta';
import type { Opportunity } from '../types';

const CATEGORIES = [
  'All',
  'Hackathons',
  'Events',
  'Workshops',
  'Internships',
  'Competitions',
  'Conferences',
] as const;

type CategoryFilter = (typeof CATEGORIES)[number];
type ModeFilter = 'all' | 'online' | 'offline' | 'hybrid';

export function Explore() {
  const { saved, toggle, share } = useApp();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [selectedMode, setSelectedMode] = useState<ModeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Full Details Modal Overlay State
  const [activeDetailOpp, setActiveDetailOpp] = useState<Opportunity | null>(null);

  // Close details modal on Escape key
  useEffect(() => {
    if (!activeDetailOpp) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDetailOpp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDetailOpp]);

  // Load real opportunity data from Supabase & Verified Opportunities repository
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const { opportunities: supabaseOpps } = await getPublishedOpportunities(undefined, 100);

        // Merge Supabase opportunities with local verified opportunities, deduplicating by ID
        const seenIds = new Set<string>();
        const combined: Opportunity[] = [];

        // 1. Add Supabase published records
        for (const opp of supabaseOpps) {
          if (!seenIds.has(opp.id)) {
            seenIds.add(opp.id);
            combined.push(opp);
          }
        }

        // 2. Add verified opportunities repository to ensure rich, diverse catalog
        for (const v of VERIFIED_OPPORTUNITIES) {
          if (!seenIds.has(v.id)) {
            seenIds.add(v.id);
            combined.push({
              id: v.id,
              title: v.title,
              description: v.description,
              category: v.category,
              organizer: v.organizer,
              deadline: new Date(v.deadline).getTime(),
              startDate: v.startDate ? new Date(v.startDate).getTime() : Date.now(),
              endDate: v.endDate ? new Date(v.endDate).getTime() : Date.now(),
              location: v.location,
              mode: v.mode,
              prize: v.prize,
              stipend: v.stipend,
              eligibility: v.eligibility,
              teamSize: v.whoCanParticipate || '1-4 Members',
              skills: v.skills,
              imageUrl: v.imageUrl,
              officialUrl: v.applyUrl || v.sourceUrl,
              status: 'published',
              views: 120,
              applyClicks: 45,
              shares: 18,
              source: 'admin',
              featured: false,
              createdBy: 'pixel-minds-team',
              createdAt: Date.now() - 86400000,
              updatedAt: Date.now(),
            });
          }
        }

        if (isMounted) {
          // Sort by upcoming deadlines (active first)
          const now = Date.now();
          const sorted = combined.sort((a, b) => {
            const aExpired = a.deadline < now;
            const bExpired = b.deadline < now;
            if (aExpired && !bExpired) return 1;
            if (!aExpired && bExpired) return -1;
            return a.deadline - b.deadline;
          });

          setOpportunities(sorted);
        }
      } catch (err) {
        console.error('Error loading Explore opportunities:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter opportunities based on category, mode, and search query
  const filteredOpportunities = useMemo(() => {
    const now = Date.now();

    return opportunities.filter((opp) => {
      // 1. Hide expired opportunities (deadline was > 7 days ago) to keep feed fresh
      const isExpired = opp.deadline < now - 7 * 86400000;
      if (isExpired) return false;

      // 2. Category Filter
      if (selectedCategory !== 'All') {
        const catNorm = opp.category.toLowerCase();
        const filterNorm = selectedCategory.toLowerCase();
        if (!catNorm.includes(filterNorm) && !filterNorm.includes(catNorm)) {
          return false;
        }
      }

      // 3. Mode Filter
      if (selectedMode !== 'all') {
        if (opp.mode !== selectedMode) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = opp.title.toLowerCase().includes(q);
        const matchesOrganizer = opp.organizer.toLowerCase().includes(q);
        const matchesSkills = opp.skills.some((s) => s.toLowerCase().includes(q));
        const matchesLocation = opp.location.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOrganizer && !matchesSkills && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [opportunities, selectedCategory, selectedMode, searchQuery]);

  // Reset index when filters change so user starts at the first card of the new filter
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory, selectedMode, searchQuery]);

  const activeOpp = filteredOpportunities[currentIndex] || null;

  // Handle register / apply click
  const handleApplyClick = (opp: Opportunity) => {
    window.open(opp.officialUrl || 'https://google.com', '_blank', 'noopener,noreferrer');
  };

  // Helper date formatter
  const formatDate = (ts: number) => {
    if (!ts) return 'TBA';
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate days remaining to deadline
  const getDaysLeft = (deadline: number) => {
    const diff = deadline - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* ============================================================ */}
      {/* 1. HEADER SECTION: Title, Subtitle, Story-mode pill */}
      {/* ============================================================ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 text-xs font-bold text-blue-600 dark:text-sky-400 mb-2">
            <Compass size={14} className="animate-spin-slow" />
            <span>Interactive Story Stack</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0e1b33] dark:text-white tracking-tight">
            Discover Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            Find your next hackathon, event or opportunity. Browse cards like stories, tap to cycle, and swipe right for full details.
          </p>
        </div>

        {/* Quick Mode Filters */}
        <div className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-white/80 dark:border-white/10 backdrop-blur-md shadow-2xs self-start md:self-auto">
          {(['all', 'online', 'offline', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                selectedMode === mode
                  ? 'bg-[#112240] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. CATEGORY CHIPS & SEARCH BAR */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Horizontal Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pm-scrollbar max-w-full">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-102'
                    : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px] sm:w-64 shrink-0">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search events, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full bg-white/80 dark:bg-slate-900/80 border border-white/90 dark:border-white/10 py-2 pl-9 pr-8 text-xs text-[#0e1b33] dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN EXPERIENCE: Stories-style Card Stack & Navigation */}
      {/* ============================================================ */}
      <div className="flex flex-col items-center justify-center pt-2 sm:pt-4">
        {loading ? (
          <div className="w-[340px] sm:w-[400px] h-[540px] sm:h-[600px] rounded-[32px] pm-glass border border-white/90 flex flex-col items-center justify-center gap-3 animate-pulse shadow-xl">
            <Compass size={36} className="text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Loading verified opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          /* Empty State */
          <div className="w-full max-w-md p-8 rounded-[32px] pm-glass border border-white/90 text-center flex flex-col items-center justify-center gap-4 shadow-lg my-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Sparkles size={28} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0e1b33] dark:text-white">
                No opportunities found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                No hackathons or events matched your current filters. Try switching category or clearing the search.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedMode('all');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 w-full">
            {/* Top Stories-Style Progress Bar */}
            <div className="w-full max-w-[390px] sm:max-w-[420px] px-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              {/* Segmented story progress indicator */}
              <div className="flex-1 flex items-center gap-1">
                {filteredOpportunities.slice(0, Math.min(24, filteredOpportunities.length)).map((_, idx) => {
                  const isDone = idx < currentIndex;
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={idx}
                      className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 transition-all"
                    >
                      <div
                        className={`h-full transition-all duration-300 ${
                          isDone
                            ? 'bg-blue-600 w-full'
                            : isCurrent
                            ? 'bg-blue-500 w-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Counter */}
              <span className="font-extrabold text-[11px] text-[#0e1b33] dark:text-white shrink-0 bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                {currentIndex + 1} of {filteredOpportunities.length}
              </span>
            </div>

            {/* Click Stack Container */}
            <div className="relative">
              <ClickStack
                items={filteredOpportunities.map((opp) => {
                  const meta = getCategoryMeta(opp.category);
                  const isBookmarked = saved.includes(String(opp.id));
                  const daysLeft = getDaysLeft(opp.deadline);
                  const isClosingSoon = daysLeft > 0 && daysLeft <= 7;

                  return (
                    <div
                      key={opp.id}
                      className="group relative w-full h-full rounded-[28px] overflow-hidden bg-slate-900 border border-white/20 shadow-2xl flex flex-col justify-between text-white select-none"
                      style={{
                        background: opp.imageUrl ? '#0e1b33' : grad(opp.category),
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      }}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      {/* Event Poster / Cover Image */}
                      {opp.imageUrl ? (
                        <img
                          src={opp.imageUrl}
                          alt={opp.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none no-drag-img"
                          draggable={false}
                          loading="lazy"
                        />
                      ) : (
                        /* Polished Artistic Fallback Graphic */
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 opacity-40 pointer-events-none select-none">
                          <meta.Icon size={120} className="text-white/30" />
                          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
                        </div>
                      )}

                      {/* Multilayered Darkness Gradient for Perfect Legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b33] via-[#0e1b33]/40 to-[#0e1b33]/70 pointer-events-none select-none" />

                      {/* ============================================================ */}
                      {/* CARD TOP BAR: Category, Mode, Bookmark, Share */}
                      {/* ============================================================ */}
                      <div className="relative z-10 p-4 sm:p-5 flex items-start justify-between gap-2 pointer-events-none select-none">
                        <div className="flex flex-wrap items-center gap-2 pointer-events-none">
                          {/* Category Tag */}
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-sm border border-white/20 pointer-events-none select-none"
                            style={{
                              backgroundColor: `${meta.accent}26`,
                              color: meta.accent,
                            }}
                          >
                            <meta.Icon size={12} />
                            <span>{opp.category}</span>
                          </span>

                          {/* Mode Badge */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20 pointer-events-none select-none">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                opp.mode === 'online'
                                  ? 'bg-emerald-400'
                                  : opp.mode === 'hybrid'
                                  ? 'bg-amber-400'
                                  : 'bg-sky-400'
                              }`}
                            />
                            <span className="capitalize">{opp.mode}</span>
                          </span>

                          {/* Closing Soon alert */}
                          {isClosingSoon && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white text-[10px] font-black tracking-wide animate-pulse shadow-sm pointer-events-none select-none">
                              <Clock size={10} />
                              <span>{daysLeft}d left!</span>
                            </span>
                          )}
                        </div>

                        {/* Top Right Action Buttons (Bookmark & Share) */}
                        <div
                          className="flex items-center gap-1.5 pointer-events-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            data-no-drag="true"
                            onClick={() => toggle(String(opp.id))}
                            className={`p-2 rounded-full backdrop-blur-md border transition cursor-pointer ${
                              isBookmarked
                                ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/30'
                                : 'bg-black/30 hover:bg-black/50 text-white border-white/20'
                            }`}
                            title={isBookmarked ? 'Remove Bookmark' : 'Save Opportunity'}
                          >
                            <Bookmark size={15} className={isBookmarked ? 'fill-white' : ''} />
                          </button>

                          <button
                            type="button"
                            data-no-drag="true"
                            onClick={() => share(opp.title, `/opportunities/${opp.id}`)}
                            className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white border border-white/20 backdrop-blur-md transition cursor-pointer"
                            title="Share Opportunity"
                          >
                            <Share2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* ============================================================ */}
                      {/* CARD BOTTOM CONTENT: Title, Organizer, Specs & Swipe Hint */}
                      {/* ============================================================ */}
                      <div className="relative z-10 p-5 sm:p-6 space-y-3.5 pointer-events-none select-none">
                        {/* Organizer badge */}
                        <div className="flex items-center gap-2 pointer-events-none">
                          <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-black text-white pointer-events-none">
                            {opp.organizer.charAt(0)}
                          </div>
                          <span className="text-xs font-semibold text-slate-300 truncate max-w-[240px] pointer-events-none">
                            {opp.organizer}
                          </span>
                          <ShieldCheck size={14} className="text-sky-400 shrink-0 pointer-events-none" />
                        </div>

                        {/* Event Title */}
                        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight line-clamp-2 pointer-events-none select-none">
                          {opp.title}
                        </h2>

                        {/* Spec Pills: Date, Deadline, Prize, Location */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-200 pointer-events-none select-none">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 pointer-events-none">
                            <Calendar size={12} className="text-sky-400" />
                            <span>{formatDate(opp.startDate)}</span>
                          </div>

                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 pointer-events-none">
                            <Clock size={12} className="text-amber-400" />
                            <span>Deadline: {formatDate(opp.deadline)}</span>
                          </div>

                          {opp.prize && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/30 text-amber-300 font-bold pointer-events-none">
                              <Trophy size={12} />
                              <span className="truncate max-w-[140px]">{opp.prize}</span>
                            </div>
                          )}

                          {opp.location && opp.mode !== 'online' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 pointer-events-none">
                              <MapPin size={12} className="text-rose-400" />
                              <span className="truncate max-w-[120px]">{opp.location}</span>
                            </div>
                          )}
                        </div>

                        {/* Swipe Right Callout Banner */}
                        <div className="pt-2 pointer-events-auto">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDetailOpp(opp);
                            }}
                            className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] border border-white/25 backdrop-blur-md flex items-center justify-between transition cursor-pointer text-xs font-extrabold text-white group select-none pointer-events-auto"
                          >
                            <span className="flex items-center gap-1.5 pointer-events-none">
                              <Sparkles size={13} className="text-sky-400 group-hover:rotate-12 transition-transform" />
                              <span>Swipe right to learn more</span>
                            </span>
                            <span className="inline-flex items-center gap-1 text-sky-300 pointer-events-none">
                              <span>Full Details</span>
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                cardWidth="min(92vw, 400px)"
                cardHeight="min(75vh, 580px)"
                spreadX={0}
                spreadY={-18}
                duration={0.35}
                ease="power3.out"
                visibleCount={4}
                depthScale={0.05}
                depthOpacity={0.82}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onSwipeRight={(index) => {
                  const opp = filteredOpportunities[index];
                  if (opp) setActiveDetailOpp(opp);
                }}
              />
            </div>

            {/* ============================================================ */}
            {/* Interactive Gestures & Instructions Section */}
            {/* ============================================================ */}
            <div
              className="pointer-events-none select-none w-full max-w-[400px] rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-md p-2.5 sm:p-3 shadow-xs space-y-2 mx-auto"
              aria-label="Gesture instructions"
            >
              {/* Instruction 1: Tap */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <MousePointerClick size={14} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <strong className="font-bold text-[#0e1b33] dark:text-white">Tap</strong>
                  <span className="text-slate-500 dark:text-slate-400">– Move to next card</span>
                </div>
              </div>

              {/* Instruction 2: Swipe Left */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-700 dark:text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <MoveLeft size={14} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <strong className="font-bold text-[#0e1b33] dark:text-white">Swipe left</strong>
                  <span className="text-slate-500 dark:text-slate-400">– Move to next card</span>
                </div>
              </div>

              {/* Instruction 3: Swipe Right */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50 text-xs text-blue-700 dark:text-sky-300">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MoveRight size={14} className="animate-nudge-right" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <strong className="font-bold text-blue-700 dark:text-sky-300">Swipe right</strong>
                  <span className="text-blue-600/80 dark:text-sky-400/80">– View full event details</span>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* 4. STORIES CONTROLS: Prev, Counter, Next, Details Buttons */}
            {/* ============================================================ */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className={`p-3 rounded-full pm-glass border border-white/80 dark:border-white/10 shadow-sm transition cursor-pointer flex items-center justify-center ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'text-[#0e1b33] dark:text-white hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95'
                }`}
                title="Previous Card (Left Arrow)"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeOpp) setActiveDetailOpp(activeOpp);
                }}
                className="px-5 py-2.5 rounded-full bg-[#112240] hover:bg-[#1a335e] text-white text-xs font-extrabold shadow-md shadow-slate-900/10 flex items-center gap-2 active:scale-98 transition cursor-pointer"
              >
                <span>View Full Details</span>
                <ExternalLink size={14} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((prev) => Math.min(filteredOpportunities.length - 1, prev + 1))
                }
                disabled={currentIndex === filteredOpportunities.length - 1}
                className={`p-3 rounded-full pm-glass border border-white/80 dark:border-white/10 shadow-sm transition cursor-pointer flex items-center justify-center ${
                  currentIndex === filteredOpportunities.length - 1
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'text-[#0e1b33] dark:text-white hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95'
                }`}
                title="Next Card (Right Arrow / Space)"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. FULL EVENT DETAILS OVERLAY MODAL */}
      {/* ============================================================ */}
      {activeDetailOpp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in"
          onClick={() => setActiveDetailOpp(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[32px] bg-white dark:bg-slate-900 border border-white/90 dark:border-white/10 shadow-2xl p-6 sm:p-8 space-y-6 text-[#0e1b33] dark:text-white pm-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveDetailOpp(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer z-10"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>

            {/* Event Poster Header */}
            <div className="relative w-full h-52 sm:h-64 rounded-2xl overflow-hidden bg-slate-900">
              {activeDetailOpp.imageUrl ? (
                <img
                  src={activeDetailOpp.imageUrl}
                  alt={activeDetailOpp.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white"
                  style={{ background: grad(activeDetailOpp.category) }}
                >
                  <Compass size={64} className="text-white/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Badges on Poster */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                  {activeDetailOpp.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-900/90 text-[#0e1b33] dark:text-white capitalize shadow-sm">
                  {activeDetailOpp.mode} Mode
                </span>
              </div>
            </div>

            {/* Title & Organizer Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-sky-400">
                <span>Organized by {activeDetailOpp.organizer}</span>
                <ShieldCheck size={14} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0e1b33] dark:text-white tracking-tight">
                {activeDetailOpp.title}
              </h2>
            </div>

            {/* Key Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={11} className="text-blue-500" />
                  <span>Start Date</span>
                </p>
                <p className="text-xs font-extrabold text-[#0e1b33] dark:text-white mt-1">
                  {formatDate(activeDetailOpp.startDate)}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={11} className="text-amber-500" />
                  <span>Deadline</span>
                </p>
                <p className="text-xs font-extrabold text-[#0e1b33] dark:text-white mt-1">
                  {formatDate(activeDetailOpp.deadline)}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy size={11} className="text-emerald-500" />
                  <span>Prize / Stipend</span>
                </p>
                <p className="text-xs font-extrabold text-[#0e1b33] dark:text-white mt-1 truncate">
                  {activeDetailOpp.prize || activeDetailOpp.stipend || 'Recognition & Perks'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin size={11} className="text-rose-500" />
                  <span>Location</span>
                </p>
                <p className="text-xs font-extrabold text-[#0e1b33] dark:text-white mt-1 truncate">
                  {activeDetailOpp.location || 'Online'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#0e1b33] dark:text-white uppercase tracking-wider">
                About this Opportunity
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {activeDetailOpp.description}
              </p>
            </div>

            {/* Eligibility & Team Size */}
            {(activeDetailOpp.eligibility || activeDetailOpp.teamSize) && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#0e1b33] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={13} className="text-blue-500" />
                  <span>Eligibility &amp; Team Requirements</span>
                </h4>
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  {activeDetailOpp.eligibility && (
                    <p>
                      <span className="font-bold text-[#0e1b33] dark:text-white">Eligibility:</span>{' '}
                      {activeDetailOpp.eligibility}
                    </p>
                  )}
                  {activeDetailOpp.teamSize && (
                    <p>
                      <span className="font-bold text-[#0e1b33] dark:text-white">Team Size:</span>{' '}
                      {activeDetailOpp.teamSize}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Skills & Technologies */}
            {activeDetailOpp.skills && activeDetailOpp.skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#0e1b33] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={13} className="text-indigo-500" />
                  <span>Recommended Skills</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeDetailOpp.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(String(activeDetailOpp.id))}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                    saved.includes(String(activeDetailOpp.id))
                      ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <Bookmark
                    size={15}
                    className={saved.includes(String(activeDetailOpp.id)) ? 'fill-white' : ''}
                  />
                  <span>
                    {saved.includes(String(activeDetailOpp.id)) ? 'Saved' : 'Save for Later'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    share(activeDetailOpp.title, `/opportunities/${activeDetailOpp.id}`)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>
              </div>

              {/* Main Official Register / Apply Button */}
              <button
                type="button"
                onClick={() => handleApplyClick(activeDetailOpp)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-blue-500/25 active:scale-98 transition cursor-pointer ml-auto"
              >
                <span>Register / Visit Website</span>
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Explore;
