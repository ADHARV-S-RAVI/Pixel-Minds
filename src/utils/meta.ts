import {
  Code2,
  Briefcase,
  CalendarDays,
  Wrench,
  Trophy,
  GraduationCap,
  BookOpen,
  Rocket,
  Mic,
  Award,
  Sparkles
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryMeta {
  Icon: LucideIcon;
  a: string;
  b: string;
}

export const meta: Record<string, CategoryMeta> = {
  Hackathons: { Icon: Code2, a: '#6366f1', b: '#8b5cf6' },
  Internships: { Icon: Briefcase, a: '#0ea5e9', b: '#38bdf8' },
  Events: { Icon: CalendarDays, a: '#f97316', b: '#fb923c' },
  Workshops: { Icon: Wrench, a: '#14b8a6', b: '#2dd4bf' },
  Competitions: { Icon: Trophy, a: '#eab308', b: '#f59e0b' },
  Scholarships: { Icon: GraduationCap, a: '#ec4899', b: '#f472b6' },
  Courses: { Icon: BookOpen, a: '#22c55e', b: '#4ade80' },
  'Startup Programs': { Icon: Rocket, a: '#ef4444', b: '#f87171' },
  Conferences: { Icon: Mic, a: '#0891b2', b: '#22d3ee' },
  Fellowships: { Icon: Award, a: '#7c3aed', b: '#a78bfa' },
  Other: { Icon: Sparkles, a: '#0ea5e9', b: '#6366f1' }
};

export const getCategoryMeta = (category: string): CategoryMeta => {
  return meta[category] || meta['Other'];
};

export const grad = (category: string) => {
  const m = getCategoryMeta(category);
  return `linear-gradient(135deg, ${m.a}, ${m.b})`;
};
