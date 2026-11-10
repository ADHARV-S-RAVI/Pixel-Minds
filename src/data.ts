import { VERIFIED_OPPORTUNITIES, type VerifiedOpportunity } from './data/verifiedOpportunities';
import { getOpportunityDeadlineInfo } from './utils/dateUtils';

export interface Opp {
  id: string | number;
  title: string;
  org: string;
  cat: string;
  mode: string;
  deadline: string;
  days: number;
  rawDeadline?: string | number;
  isExpired?: boolean;
  prize: string;
  skills: string[];
  tint?: string;
  description?: string;
  officialUrl?: string;
  imageUrl?: string;
  views?: number;
  applyClicks?: number;
  featured?: boolean;
  stipend?: string;
  eligibility?: string;
  teamSize?: string;
  additionalInfo?: string;
  source?: 'admin' | 'user';
  startDate?: string;
  endDate?: string;
  location?: string;
}

export const cats = [
  'Hackathons',
  'Internships',
  'Events',
  'Workshops',
  'Competitions',
  'Scholarships',
  'Courses',
  'Startup Programs',
  'Conferences',
  'Fellowships'
];

const tints = ['#e0f2fe', '#e0e7ff', '#dcfce7', '#fef3c7', '#fce7f3', '#ccfbf1'];

export const initialOpps: Opp[] = VERIFIED_OPPORTUNITIES.map((v: VerifiedOpportunity, i: number) => {
  const deadlineInfo = getOpportunityDeadlineInfo(v.deadline);

  return {
    id: v.id,
    title: v.title,
    org: v.organizer,
    cat: v.category,
    mode: v.mode.charAt(0).toUpperCase() + v.mode.slice(1),
    deadline: deadlineInfo.formattedDeadline,
    days: deadlineInfo.daysRemaining,
    rawDeadline: v.deadline,
    isExpired: deadlineInfo.isExpired,
    prize: v.prize !== 'Not specified' ? v.prize : (v.stipend !== 'Not specified' ? v.stipend : 'Certificate'),
    skills: v.skills,
    description: v.description,
    officialUrl: v.applyUrl,
    imageUrl: v.imageUrl,
    featured: v.featured || false,
    stipend: v.stipend,
    eligibility: v.eligibility,
    teamSize: v.whoCanParticipate,
    additionalInfo: `Benefits: ${v.benefits}\nRegistration Fee: ${v.registrationFee}\nSource: ${v.sourceUrl}\nVerified on: ${v.verifiedAt}`,
    location: v.location,
    startDate: v.startDate,
    endDate: v.endDate,
    source: 'admin' as const,
    views: 350 + (i * 45),
    applyClicks: 90 + (i * 12),
    tint: tints[i % tints.length]
  };
});

export const opps = initialOpps;

export interface LeaderboardUser {
  rank: number;
  name: string;
  pixels: number;
  contribs: number;
  avatarUrl?: string;
  role?: string;
}

export const users: LeaderboardUser[] = [];

export const tiers: [number, string][] = [
  [0, 'Pixel Starter'],
  [500, 'Pixel Scout'],
  [1200, 'Pixel Contributor'],
  [2500, 'Pixel Builder'],
  [4000, 'Pixel Master'],
  [7500, 'Pixel Legend']
];

export interface TierInfoResult {
  name: string;
  level: number;
  maxLevel: number;
  minPixels: number;
  nextPixels: number | null;
  next: string | null;
  toGo: number;
  pct: number;
  isMaxLevel: boolean;
}

export const tierInfo = (p: number): TierInfoResult => {
  const safeP = typeof p === 'number' && !isNaN(p) ? Math.max(0, p) : 0;
  let i = 0;
  tiers.forEach(([m], j) => {
    if (safeP >= m) i = j;
  });

  const currentTier = tiers[i];
  const nextTier = tiers[i + 1];

  const minPixels = currentTier[0];
  const isFinalTier = !nextTier;
  // For final tier (Level 6: Pixel Legend), 7500 to 10000 Pixels defines mastery progression
  const nextPixels = nextTier ? nextTier[0] : 10000;

  const span = Math.max(1, nextPixels - minPixels);
  const earnedInLevel = safeP - minPixels;
  const pct = Math.min(100, Math.max(0, Math.round((earnedInLevel / span) * 100)));
  const toGo = Math.max(0, nextPixels - safeP);

  return {
    name: currentTier[1],
    level: i + 1,
    maxLevel: tiers.length,
    minPixels,
    nextPixels: isFinalTier ? 10000 : nextPixels,
    next: nextTier ? nextTier[1] : null,
    toGo,
    pct,
    isMaxLevel: isFinalTier && pct >= 100
  };
};

export const rankOf = (p: number) => tierInfo(p).name;

export const moves = [0, 0, 0, 0, 0, 0, 0, 0];

export interface FeedPost {
  id: number | string;
  user: string;
  userId?: string;
  role: string;
  time: string;
  text: string;
  category?: string;
  likes: number;
  comments: number;
  opp?: number | string;
  link?: string;
  hackathonDetails?: {
    name: string;
    date: string;
    location: string;
    link: string;
  };
}

export const initialPosts: FeedPost[] = [];

