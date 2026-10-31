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
  accent: string;
}

export const meta: Record<string, CategoryMeta> = {
  Hackathons: { Icon: Code2, a: '#1E1E24', b: '#141418', accent: '#DFB76C' },
  Internships: { Icon: Briefcase, a: '#181C24', b: '#12141C', accent: '#38BDF8' },
  Events: { Icon: CalendarDays, a: '#221D1A', b: '#161311', accent: '#FB923C' },
  Workshops: { Icon: Wrench, a: '#162220', b: '#101716', accent: '#2DD4BF' },
  Competitions: { Icon: Trophy, a: '#262016', b: '#18140C', accent: '#FBBF24' },
  Scholarships: { Icon: GraduationCap, a: '#241822', b: '#181016', accent: '#F472B6' },
  Courses: { Icon: BookOpen, a: '#162219', b: '#0E1711', accent: '#4ADE80' },
  'Startup Programs': { Icon: Rocket, a: '#241818', b: '#170E0E', accent: '#F87171' },
  Conferences: { Icon: Mic, a: '#162024', b: '#0E1417', accent: '#22D3EE' },
  Fellowships: { Icon: Award, a: '#201828', b: '#140E1B', accent: '#C084FC' },
  Other: { Icon: Sparkles, a: '#1E1E24', b: '#141418', accent: '#DFB76C' }
};

export const getCategoryMeta = (category: string): CategoryMeta => {
  return meta[category] || meta['Other'];
};

export const grad = (category: string) => {
  const m = getCategoryMeta(category);
  return `linear-gradient(135deg, ${m.a}, ${m.b})`;
};
