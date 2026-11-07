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
  Hackathons: { Icon: Code2, a: '#162B45', b: '#0B1628', accent: '#38BDF8' },
  Internships: { Icon: Briefcase, a: '#162B45', b: '#11243D', accent: '#38BDF8' },
  Events: { Icon: CalendarDays, a: '#1E2C3D', b: '#11243D', accent: '#FB923C' },
  Workshops: { Icon: Wrench, a: '#162E35', b: '#0F2129', accent: '#2DD4BF' },
  Competitions: { Icon: Trophy, a: '#263347', b: '#131F33', accent: '#FBBF24' },
  Scholarships: { Icon: GraduationCap, a: '#26243D', b: '#14142B', accent: '#F472B6' },
  Courses: { Icon: BookOpen, a: '#142E28', b: '#0D211C', accent: '#4ADE80' },
  'Startup Programs': { Icon: Rocket, a: '#2E2228', b: '#1E1418', accent: '#F87171' },
  Conferences: { Icon: Mic, a: '#162E3B', b: '#0E1F29', accent: '#22D3EE' },
  Fellowships: { Icon: Award, a: '#222340', b: '#14152B', accent: '#C084FC' },
  Other: { Icon: Sparkles, a: '#162B45', b: '#0B1628', accent: '#38BDF8' }
};

export const getCategoryMeta = (category: string): CategoryMeta => {
  return meta[category] || meta['Other'];
};

export const grad = (category: string) => {
  const m = getCategoryMeta(category);
  return `linear-gradient(135deg, ${m.a}, ${m.b})`;
};
