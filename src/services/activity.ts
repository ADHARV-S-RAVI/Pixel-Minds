import { supabase } from '../lib/supabase';

export interface RecentActivityItem {
  id: string;
  type: 'post' | 'opportunity' | 'member';
  title: string;
  subtitle?: string;
  badge: string;
  timeAgo: string;
  timestamp: number;
}

/**
 * Format a timestamp into a clean, relative time string (e.g., '12m ago', '3h ago', '2d ago')
 */
export const formatRelativeTime = (timestamp: number): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Sanitize user display name for public visibility (never expose email or private details)
 */
const sanitizeDisplayName = (rawName?: string | null): string => {
  if (!rawName) return 'A builder';
  const trimmed = rawName.trim();
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  return trimmed;
};

/**
 * Fetch genuine, actual platform activities from Supabase.
 * Respects RLS and public data privacy.
 * Returns empty array if database has no activity.
 */
export const getRecentPlatformActivities = async (limit = 4): Promise<RecentActivityItem[]> => {
  const activities: RecentActivityItem[] = [];

  try {
    // 1. Fetch recent published opportunities
    const { data: opps } = await supabase
      .from('opportunities')
      .select('id, title, category, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3);

    if (opps && opps.length > 0) {
      for (const o of opps) {
        const ts = new Date(o.created_at).getTime();
        activities.push({
          id: `opp_${o.id}`,
          type: 'opportunity',
          title: 'New opportunity added',
          subtitle: `${o.title} · ${o.category}`,
          badge: '🏆',
          timeAgo: formatRelativeTime(ts),
          timestamp: ts
        });
      }
    }
  } catch (err) {
    console.warn('[getRecentPlatformActivities] Opportunities query note:', err);
  }

  try {
    // 2. Fetch recent community posts
    const { data: posts } = await supabase
      .from('community_posts')
      .select('id, author_name, category, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3);

    if (posts && posts.length > 0) {
      for (const p of posts) {
        const ts = new Date(p.created_at).getTime();
        activities.push({
          id: `post_${p.id}`,
          type: 'post',
          title: `${sanitizeDisplayName(p.author_name)} posted`,
          subtitle: p.category ? `In ${p.category}` : 'In Community',
          badge: '💬',
          timeAgo: formatRelativeTime(ts),
          timestamp: ts
        });
      }
    }
  } catch (err) {
    console.warn('[getRecentPlatformActivities] Community posts query note:', err);
  }

  try {
    // 3. Fetch recent member signups (public profile created)
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('is_suspended', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (members && members.length > 0) {
      for (const m of members) {
        const ts = new Date(m.created_at).getTime();
        activities.push({
          id: `member_${m.id}`,
          type: 'member',
          title: `${sanitizeDisplayName(m.full_name)} joined`,
          subtitle: 'Joined Pixel Minds network',
          badge: '🚀',
          timeAgo: formatRelativeTime(ts),
          timestamp: ts
        });
      }
    }
  } catch (err) {
    console.warn('[getRecentPlatformActivities] Profiles query note:', err);
  }

  // Sort combined genuine activities descending by timestamp
  activities.sort((a, b) => b.timestamp - a.timestamp);

  // Return requested limit
  return activities.slice(0, limit);
};

