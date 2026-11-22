import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass, ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  Trophy, Bookmark, Share2, ExternalLink, X, RotateCcw, Users, ArrowRight,
  ShieldCheck, Tag, HelpCircle,
} from '@/components/Icons';
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
type GuideStep = 'swipe-both' | 'swipe-right-only' | 'swipe-left-only' | 'mobile-explore';

const ONBOARDING_STORAGE_KEY = 'pm_explore_gesture_hint_v5';

/** Clean, natural tilted pointer hand SVG with thumb and index finger extended */
function PointerHandIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ transform: 'rotate(-14deg)' }}
    >
      {/* Subtle drop shadow */}
      <path
        d="M21 7C19.3431 7 18 8.34315 18 10V23.5L13.6 20.4C12.2 19.4 10.2 19.7 9.2 21.1C8.3 22.4 8.5 24.2 9.7 25.2L18.4 33.4C20.2 35.1 22.6 36 25.1 36H30.5C35.2 36 39 32.2 39 27.5V19.5C39 17.8 37.7 16.5 36 16.5C35.3 16.5 34.6 16.8 34.1 17.2C33.8 15.8 32.5 14.8 31 14.8C30.2 14.8 29.5 15.1 28.9 15.6C28.5 14.3 27.3 13.4 25.9 13.4C25.2 13.4 24.5 13.7 24 14.1V10C24 8.34315 22.6569 7 21 7Z"
        fill="rgba(15, 23, 42, 0.35)"
        transform="translate(1.5, 2.5)"
      />
      {/* Main Hand Body (Index + Thumb out, 3 folded fingers) */}
      <path
        d="M21 7C19.3431 7 18 8.34315 18 10V23.5L13.6 20.4C12.2 19.4 10.2 19.7 9.2 21.1C8.3 22.4 8.5 24.2 9.7 25.2L18.4 33.4C20.2 35.1 22.6 36 25.1 36H30.5C35.2 36 39 32.2 39 27.5V19.5C39 17.8 37.7 16.5 36 16.5C35.3 16.5 34.6 16.8 34.1 17.2C33.8 15.8 32.5 14.8 31 14.8C30.2 14.8 29.5 15.1 28.9 15.6C28.5 14.3 27.3 13.4 25.9 13.4C25.2 13.4 24.5 13.7 24 14.1V10C24 8.34315 22.6569 7 21 7Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Folded Finger Creases */}
      <path
        d="M24 14.2V20.5M29 15.7V21M34 17.3V21.5"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

  // Interactive Gesture Guide State
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [guideStep, setGuideStep] = useState<GuideStep>('swipe-both');
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const guideTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastGuideTapTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show gesture guide on first visit (persists until user completes gesture or clicks "Next" / "Got it")
  useEffect(() => {
    if (loading || opportunities.length === 0) return;
    try {
      if (localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true') {
        setGuideStep('swipe-both');
        setShowGestureGuide(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [loading, opportunities.length]);

  const dismissGestureGuide = () => {
    setShowGestureGuide(false);
    setGuideStep('swipe-both');
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  // Pressing Next / Got it skips remaining swipe sub-steps (1a & 1b)
  const handleStep1ButtonClick = () => {
    if (isMobileView) {
      setGuideStep('mobile-explore');
    } else {
      dismissGestureGuide();
    }
  };

  // Interactive swipe tracking on the Step 1 overlay
  const handleStep1PointerDown = (e: React.PointerEvent) => {
    guideTouchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleStep1PointerUp = (e: React.PointerEvent) => {
    if (!guideTouchStartRef.current) return;
    const dx = e.clientX - guideTouchStartRef.current.x;
    const dy = e.clientY - guideTouchStartRef.current.y;
    guideTouchStartRef.current = null;

    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        // Left swipe performed
        setCurrentIndex((prev) => Math.min(filteredOpportunities.length - 1, prev + 1));
        if (guideStep === 'swipe-both') {
          // 1a done -> show 1b (Details right swipe)
          setGuideStep('swipe-right-only');
        } else if (guideStep === 'swipe-left-only') {
          // Both 1b and 1a done -> move to mobile Explore guide or finish
          handleStep1ButtonClick();
        }
      } else if (dx > 0) {
        // Right swipe performed
        const opp = filteredOpportunities[currentIndex];
        if (opp) setActiveDetailOpp(opp);
        if (guideStep === 'swipe-both') {
          // 1b done first -> show 1a (Skip left swipe)
          setGuideStep('swipe-left-only');
        } else if (guideStep === 'swipe-right-only') {
          // Both 1a and 1b done -> move to mobile Explore guide or finish
          handleStep1ButtonClick();
        }
      }
    }
  };

  // Interactive double-tap handler on Step 2 (Mobile Explore spotlight)
  const handleStep2Tap = () => {
    const now = performance.now();
    if (now - lastGuideTapTimeRef.current < 320) {
      lastGuideTapTimeRef.current = 0;
      dismissGestureGuide();
    } else {
      lastGuideTapTimeRef.current = now;
    }
  };

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

  // Load opportunities
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const { opportunities: supabaseOpps } = await getPublishedOpportunities(undefined, 100);

        const seenIds = new Set<string>();
        const combined: Opportunity[] = [];

        for (const opp of supabaseOpps) {
          if (!seenIds.has(opp.id)) {
            seenIds.add(opp.id);
            combined.push(opp);
          }
        }

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

  const filteredOpportunities = useMemo(() => {
    const now = Date.now();

    return opportunities.filter((opp) => {
      const isExpired = opp.deadline < now - 7 * 86400000;
      if (isExpired) return false;

      if (selectedCategory !== 'All') {
        const catNorm = opp.category.toLowerCase();
        const filterNorm = selectedCategory.toLowerCase();
        if (!catNorm.includes(filterNorm) && !filterNorm.includes(catNorm)) {
          return false;
        }
      }

      if (selectedMode !== 'all') {
        if (opp.mode !== selectedMode) return false;
      }

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

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedCategory, selectedMode, searchQuery]);

  const activeOpp = filteredOpportunities[currentIndex] || null;

  const handleApplyClick = (opp: Opportunity) => {
    if (!opp.officialUrl) return;
    try {
      const parsed = new URL(opp.officialUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        window.open(opp.officialUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return 'TBA';
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysLeft = (deadline: number) => {
    const diff = deadline - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-20 lg:pb-12">
      {/* Clean Pointer Hand & Arrow Keyframes */}
      <style>{`
        /* Both Left & Right Swipe (4s loop) */
        @keyframes pmHandBoth {
          0%, 6% {
            transform: translate(-50%, 0%) translateX(0px) rotate(0deg) scale(1);
          }
          24%, 34% {
            transform: translate(-50%, 0%) translateX(-82px) rotate(-14deg) scale(0.94);
          }
          46%, 54% {
            transform: translate(-50%, 0%) translateX(0px) rotate(0deg) scale(1);
          }
          74%, 84% {
            transform: translate(-50%, 0%) translateX(82px) rotate(14deg) scale(0.94);
          }
          95%, 100% {
            transform: translate(-50%, 0%) translateX(0px) rotate(0deg) scale(1);
          }
        }

        /* Right-Only Swipe (2.2s loop) */
        @keyframes pmHandRightOnly {
          0%, 12% {
            transform: translate(-50%, 0%) translateX(-20px) rotate(0deg) scale(1);
          }
          55%, 72% {
            transform: translate(-50%, 0%) translateX(82px) rotate(14deg) scale(0.94);
          }
          92%, 100% {
            transform: translate(-50%, 0%) translateX(-20px) rotate(0deg) scale(1);
          }
        }

        /* Left-Only Swipe (2.2s loop) */
        @keyframes pmHandLeftOnly {
          0%, 12% {
            transform: translate(-50%, 0%) translateX(20px) rotate(0deg) scale(1);
          }
          55%, 72% {
            transform: translate(-50%, 0%) translateX(-82px) rotate(-14deg) scale(0.94);
          }
          92%, 100% {
            transform: translate(-50%, 0%) translateX(20px) rotate(0deg) scale(1);
          }
        }

        @keyframes pmLeftCueReveal {
          0%, 10%, 44%, 100% {
            opacity: 0;
            transform: translateX(12px);
          }
          22%, 36% {
            opacity: 1;
            transform: translateX(0px);
          }
        }

        @keyframes pmRightCueReveal {
          0%, 56%, 94%, 100% {
            opacity: 0;
            transform: translateX(-12px);
          }
          70%, 86% {
            opacity: 1;
            transform: translateX(0px);
          }
        }

        @keyframes pmSoloCueReveal {
          0%, 15%, 92%, 100% {
            opacity: 0;
            transform: scale(0.95);
          }
          42%, 76% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pmLeftArrowGrow {
          0%, 10%, 44%, 100% {
            width: 0px;
            opacity: 0;
          }
          24%, 36% {
            width: 76px;
            opacity: 1;
          }
        }

        @keyframes pmRightArrowGrow {
          0%, 56%, 94%, 100% {
            width: 0px;
            opacity: 0;
          }
          72%, 86% {
            width: 76px;
            opacity: 1;
          }
        }

        @keyframes pmSoloArrowGrow {
          0%, 15%, 92%, 100% {
            width: 0px;
            opacity: 0;
          }
          45%, 76% {
            width: 80px;
            opacity: 1;
          }
        }

        /* Mobile Step 2: Double-Tap Pointer Hand */
        @keyframes pmHandDoubleTap {
          0%, 100% {
            transform: translate(-50%, 0%) scale(1);
          }
          15% {
            transform: translate(-50%, 6px) scale(0.86);
          }
          30% {
            transform: translate(-50%, 0%) scale(1);
          }
          45% {
            transform: translate(-50%, 6px) scale(0.86);
          }
          62% {
            transform: translate(-50%, 0%) scale(1);
          }
        }

        @keyframes pmTapRipple1 {
          0%, 12% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          17% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.75; }
          48% { transform: translate(-50%, -50%) scale(1.65); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1.65); opacity: 0; }
        }

        @keyframes pmTapRipple2 {
          0%, 42% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          47% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.75; }
          80% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
      `}</style>

      {/* ============================================================ */}
      {/* 1. FILTER CONTROLS */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide max-w-full pt-1">
        <div className="flex items-center gap-1 bg-white/60 dark:bg-slate-900/60 p-1 rounded-2xl border border-white/80 dark:border-white/10 backdrop-blur-md shadow-2xs shrink-0">
          {(['all', 'online', 'offline', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer whitespace-nowrap ${
                selectedMode === mode
                  ? 'bg-[#112240] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-white/70 dark:hover:bg-slate-800'
              }`}
            >
              {mode === 'all' ? 'All Modes' : mode}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-300/60 dark:bg-slate-700/60 shrink-0" aria-hidden="true" />

        <div className="flex items-center gap-2 shrink-0">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs ${
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
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN EXPERIENCE: Stories-style Card Stack */}
      {/* ============================================================ */}
      <div className="flex flex-col items-center justify-center pt-2 sm:pt-4">
        {loading ? (
          <div className="w-[340px] sm:w-[400px] h-[540px] sm:h-[600px] rounded-[32px] pm-glass border border-white/90 flex flex-col items-center justify-center gap-3 animate-pulse shadow-xl">
            <Compass size={36} className="text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Loading verified opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="w-full max-w-md p-8 rounded-[32px] pm-glass border border-white/90 text-center flex flex-col items-center justify-center gap-4 shadow-lg my-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Compass size={28} />
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
            <div className="w-full max-w-[390px] sm:max-w-[420px] px-2 flex items-center justify-between gap-2.5 text-xs text-slate-500">
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
                            ? 'bg-blue-500 w-full'
                            : 'w-0'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <span className="font-extrabold text-[11px] text-[#0e1b33] dark:text-white shrink-0 bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                {currentIndex + 1} of {filteredOpportunities.length}
              </span>

              <button
                type="button"
                onClick={() => {
                  setGuideStep('swipe-both');
                  setShowGestureGuide(true);
                }}
                title="Replay gesture guide"
                aria-label="Replay gesture guide"
                className="grid h-6 w-6 place-items-center rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-slate-500 hover:text-blue-600 dark:hover:text-sky-400 transition cursor-pointer shrink-0"
              >
                <HelpCircle size={13} />
              </button>
            </div>

            {/* Card Stack Row with Flanking Left & Right Arrows on Desktop */}
            <div className="relative flex items-center justify-center gap-5 lg:gap-8 w-full">
              {/* DESKTOP LEFT BUTTON: Dismiss / Move to Next Card */}
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((prev) => Math.min(filteredOpportunities.length - 1, prev + 1));
                  if (showGestureGuide) {
                    if (guideStep === 'swipe-both') setGuideStep('swipe-right-only');
                    else if (guideStep === 'swipe-left-only') handleStep1ButtonClick();
                  }
                }}
                disabled={currentIndex >= filteredOpportunities.length - 1}
                title="Dismiss / Next Card"
                aria-label="Dismiss card and move to next"
                className={`hidden lg:flex h-12 w-12 shrink-0 items-center justify-center rounded-full pm-glass border border-white/90 dark:border-white/10 shadow-md transition-all cursor-pointer ${
                  currentIndex >= filteredOpportunities.length - 1
                    ? 'opacity-35 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/90 dark:hover:bg-rose-950/50 hover:scale-105 active:scale-95'
                }`}
              >
                <ChevronLeft size={22} />
              </button>

              {/* Central Swipeable Card Stack */}
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
                        className="group relative w-full h-full rounded-[28px] overflow-hidden bg-slate-900 border border-white/20 shadow-xl flex flex-col justify-between text-white select-none"
                        style={{
                          background: opp.imageUrl ? '#0e1b33' : grad(opp.category),
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                        }}
                        onDragStart={(e) => e.preventDefault()}
                      >
                        {opp.imageUrl ? (
                          <img
                            src={opp.imageUrl}
                            alt={opp.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none no-drag-img"
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 opacity-40 pointer-events-none select-none">
                            <meta.Icon size={120} className="text-white/30" />
                            <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1b33] via-[#0e1b33]/40 to-[#0e1b33]/70 pointer-events-none select-none" />

                        {/* Card Top Bar */}
                        <div className="relative z-10 p-4 sm:p-5 flex items-start justify-between gap-2 pointer-events-none select-none">
                          <div className="flex flex-wrap items-center gap-2 pointer-events-none">
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

                            {isClosingSoon && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/90 text-white text-[10px] font-black tracking-wide shadow-sm pointer-events-none select-none">
                                <Clock size={10} />
                                <span>{daysLeft}d left!</span>
                              </span>
                            )}
                          </div>

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
                                  ? 'bg-amber-500 text-white border-amber-400'
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

                        {/* Card Bottom Content */}
                        <div className="relative z-10 p-5 sm:p-6 space-y-3.5 pointer-events-none select-none">
                          <div className="flex items-center gap-2 pointer-events-none">
                            <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-black text-white pointer-events-none">
                              {opp.organizer.charAt(0)}
                            </div>
                            <span className="text-xs font-semibold text-slate-300 truncate max-w-[240px] pointer-events-none">
                              {opp.organizer}
                            </span>
                            <ShieldCheck size={14} className="text-sky-400 shrink-0 pointer-events-none" />
                          </div>

                          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight line-clamp-2 pointer-events-none select-none">
                            {opp.title}
                          </h2>

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
                                <span className="lg:hidden">Swipe right to learn more</span>
                                <span className="hidden lg:inline">Click card or swipe right for details</span>
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
                  onIndexChange={(newIdx) => {
                    setCurrentIndex(newIdx);
                    if (showGestureGuide && newIdx > currentIndex) {
                      if (guideStep === 'swipe-both') setGuideStep('swipe-right-only');
                      else if (guideStep === 'swipe-left-only') handleStep1ButtonClick();
                    }
                  }}
                  onSwipeRight={(index) => {
                    const opp = filteredOpportunities[index];
                    if (opp) setActiveDetailOpp(opp);
                    if (showGestureGuide) {
                      if (guideStep === 'swipe-both') setGuideStep('swipe-left-only');
                      else if (guideStep === 'swipe-right-only') handleStep1ButtonClick();
                    }
                  }}
                  onDesktopCardClick={(index) => {
                    const opp = filteredOpportunities[index];
                    if (opp) setActiveDetailOpp(opp);
                  }}
                />

                {/* ============================================================ */}
                {/* STEP 1 OVERLAY: Tilted Pointer Hand SVG + Directional Arrows */}
                {/* ============================================================ */}
                {showGestureGuide &&
                  (guideStep === 'swipe-both' ||
                    guideStep === 'swipe-right-only' ||
                    guideStep === 'swipe-left-only') && (
                    <div
                      onPointerDown={handleStep1PointerDown}
                      onPointerUp={handleStep1PointerUp}
                      style={{ touchAction: 'none' }}
                      className="absolute inset-0 z-30 rounded-[28px] bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-between py-12 px-6 select-none"
                    >
                      <div className="h-4" />

                      {/* Center Dynamic Arrow + Tilted Pointer Hand */}
                      <div className="relative w-72 h-32 flex flex-col items-center justify-center pointer-events-none">
                        {/* Dynamic Labels (Reveal only while hand moves) */}
                        <div className="relative h-10 w-full flex items-center justify-center mb-3">
                          {(guideStep === 'swipe-both' || guideStep === 'swipe-left-only') && (
                            <span
                              className="absolute text-xl sm:text-2xl font-black tracking-wide uppercase text-rose-400"
                              style={{
                                animation:
                                  guideStep === 'swipe-both'
                                    ? 'pmLeftCueReveal 4s ease-in-out infinite'
                                    : 'pmSoloCueReveal 2.2s ease-in-out infinite',
                              }}
                            >
                              &larr; Skip
                            </span>
                          )}

                          {(guideStep === 'swipe-both' || guideStep === 'swipe-right-only') && (
                            <span
                              className="absolute text-xl sm:text-2xl font-black tracking-wide uppercase text-sky-400"
                              style={{
                                animation:
                                  guideStep === 'swipe-both'
                                    ? 'pmRightCueReveal 4s ease-in-out infinite'
                                    : 'pmSoloCueReveal 2.2s ease-in-out infinite',
                              }}
                            >
                              Details &rarr;
                            </span>
                          )}
                        </div>

                        {/* Arrow Shafts + Pointer Hand SVG */}
                        <div className="relative w-full h-14 flex items-center justify-center">
                          {/* Left-Growing Arrow */}
                          {(guideStep === 'swipe-both' || guideStep === 'swipe-left-only') && (
                            <div
                              className="absolute right-1/2 top-1/2 -translate-y-1/2 flex items-center justify-start overflow-hidden"
                              style={{
                                animation:
                                  guideStep === 'swipe-both'
                                    ? 'pmLeftArrowGrow 4s ease-in-out infinite'
                                    : 'pmSoloArrowGrow 2.2s ease-in-out infinite',
                              }}
                            >
                              <div className="w-full h-[3px] rounded-full bg-gradient-to-l from-white/25 to-rose-400 relative">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 border-l-[3px] border-b-[3px] border-rose-400 rotate-45" />
                              </div>
                            </div>
                          )}

                          {/* Right-Growing Arrow */}
                          {(guideStep === 'swipe-both' || guideStep === 'swipe-right-only') && (
                            <div
                              className="absolute left-1/2 top-1/2 -translate-y-1/2 flex items-center justify-end overflow-hidden"
                              style={{
                                animation:
                                  guideStep === 'swipe-both'
                                    ? 'pmRightArrowGrow 4s ease-in-out infinite'
                                    : 'pmSoloArrowGrow 2.2s ease-in-out infinite',
                              }}
                            >
                              <div className="w-full h-[3px] rounded-full bg-gradient-to-r from-white/25 to-sky-400 relative">
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 border-r-[3px] border-t-[3px] border-sky-400 rotate-45" />
                              </div>
                            </div>
                          )}

                          {/* Tilted Pointer Hand SVG (Thumb + Index Extended) */}
                          <div
                            className="absolute left-1/2 top-3 pointer-events-none select-none"
                            style={{
                              animation:
                                guideStep === 'swipe-both'
                                  ? 'pmHandBoth 4s ease-in-out infinite'
                                  : guideStep === 'swipe-right-only'
                                  ? 'pmHandRightOnly 2.2s ease-in-out infinite'
                                  : 'pmHandLeftOnly 2.2s ease-in-out infinite',
                            }}
                          >
                            <PointerHandIcon />
                          </div>
                        </div>
                      </div>

                      {/* Dark-Mode-Safe Action Button (Skips 1a & 1b when clicked) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStep1ButtonClick();
                        }}
                        className="relative z-40 px-8 py-2.5 rounded-full !bg-sky-500 hover:!bg-sky-400 !text-white border border-white/60 text-sm font-extrabold tracking-wide shadow-md active:scale-95 transition cursor-pointer"
                      >
                        {isMobileView ? 'Next' : 'Got it'}
                      </button>
                    </div>
                  )}
              </div>

              {/* DESKTOP RIGHT BUTTON: Open Full Details */}
              <button
                type="button"
                onClick={() => {
                  if (activeOpp) setActiveDetailOpp(activeOpp);
                  if (showGestureGuide) {
                    if (guideStep === 'swipe-both') setGuideStep('swipe-left-only');
                    else if (guideStep === 'swipe-right-only') handleStep1ButtonClick();
                  }
                }}
                disabled={!activeOpp}
                title="View Full Event Details"
                aria-label="View full event details"
                className="hidden lg:flex h-12 w-12 shrink-0 items-center justify-center rounded-full pm-glass border border-white/90 dark:border-white/10 shadow-md text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50/90 dark:hover:bg-blue-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 2 OVERLAY (MOBILE ONLY): Subtle Explore Highlight + Double-Tap Hand */}
      {/* ============================================================ */}
      {showGestureGuide && guideStep === 'mobile-explore' && isMobileView && (
        <div
          onClick={handleStep2Tap}
          className="fixed inset-0 z-50 lg:hidden bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center pb-24 px-6 text-center select-none"
        >
          <div className="flex flex-col items-center gap-2.5">
            <span className="text-lg font-extrabold tracking-wide text-sky-300">
              Double-tap Explore
            </span>
            <span className="text-sm font-medium text-slate-300">
              Press and hold for quick options
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                dismissGestureGuide();
              }}
              className="mt-4 relative z-50 px-8 py-2.5 rounded-full !bg-sky-500 hover:!bg-sky-400 !text-white border border-white/60 text-sm font-extrabold tracking-wide shadow-md active:scale-95 transition cursor-pointer"
            >
              Got it
            </button>
          </div>

          {/* Subtle Highlight + Double-Tap Pointer Hand over Bottom Explore Tab */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              dismissGestureGuide();
            }}
            className="fixed bottom-[calc(6px+env(safe-area-inset-bottom,0px))] cursor-pointer"
            style={{ left: '30%', transform: 'translateX(-50%)' }}
          >
            <div className="relative w-14 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/80 shadow-[0_0_14px_rgba(56,189,248,0.45)] flex flex-col items-center justify-center text-white">
              <Compass size={19} className="text-sky-300" />
              <span className="text-[10px] font-bold text-white mt-0.5 leading-none">Explore</span>

              {/* Subtle Dual Tap Ripple Rings */}
              <span
                className="absolute left-1/2 top-1/2 w-11 h-11 rounded-full border border-sky-300/80 pointer-events-none"
                style={{ animation: 'pmTapRipple1 2s ease-out infinite' }}
              />
              <span
                className="absolute left-1/2 top-1/2 w-11 h-11 rounded-full border border-white/70 pointer-events-none"
                style={{ animation: 'pmTapRipple2 2s ease-out infinite' }}
              />

              {/* Double-Tap Pointer Hand SVG */}
              <div
                className="absolute left-1/2 top-1 pointer-events-none select-none"
                style={{ animation: 'pmHandDoubleTap 2s ease-in-out infinite' }}
              >
                <PointerHandIcon className="w-15 h-13" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. FULL EVENT DETAILS OVERLAY MODAL */}
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
            <button
              onClick={() => setActiveDetailOpp(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer z-10"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>

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

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                  {activeDetailOpp.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 dark:bg-slate-900/90 text-[#0e1b33] dark:text-white capitalize shadow-sm">
                  {activeDetailOpp.mode} Mode
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-sky-400">
                <span>Organized by {activeDetailOpp.organizer}</span>
                <ShieldCheck size={14} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0e1b33] dark:text-white tracking-tight">
                {activeDetailOpp.title}
              </h2>
            </div>

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

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-[#0e1b33] dark:text-white uppercase tracking-wider">
                About this Opportunity
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {activeDetailOpp.description}
              </p>
            </div>

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

            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(String(activeDetailOpp.id))}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition cursor-pointer border ${
                    saved.includes(String(activeDetailOpp.id))
                      ? 'bg-amber-500 text-white border-amber-400'
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

              <button
                type="button"
                onClick={() => handleApplyClick(activeDetailOpp)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md active:scale-98 transition cursor-pointer ml-auto"
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