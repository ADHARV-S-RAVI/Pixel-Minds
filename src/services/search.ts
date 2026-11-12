import { supabase } from '../lib/supabase';

export interface SearchResults {
  people: Array<{
    id: string;
    displayName: string;
    avatarUrl?: string;
    role: string;
    bio?: string;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    organizer: string;
    category: string;
    deadline?: number;
    mode?: string;
    officialUrl?: string;
  }>;
  posts: Array<{
    id: string;
    title: string;
    description: string;
    authorName: string;
    category?: string;
    createdAt: number;
  }>;
}

/**
 * Perform server-side search across People, Opportunities, and Community Posts
 * Uses PostgreSQL indexing, ilike query restrictions, and does not expose private fields.
 */
export const searchGlobal = async (
  query: string,
  limitPerCategory = 5
): Promise<SearchResults> => {
  const clean = query.trim().replace(/[%_]/g, '');
  if (!clean || clean.length < 2) {
    return { people: [], opportunities: [], posts: [] };
  }

  try {
    const [peopleRes, oppsRes, postsRes] = await Promise.all([
      // 1. Search People (Only active, non-suspended, public profile fields)
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, bio')
        .eq('is_suspended', false)
        .ilike('full_name', `%${clean}%`)
        .limit(limitPerCategory),

      // 2. Search Published Opportunities
      supabase
        .from('opportunities')
        .select('id, title, organizer, category, deadline, mode, official_url')
        .eq('status', 'published')
        .or(`title.ilike.%${clean}%,organizer.ilike.%${clean}%`)
        .limit(limitPerCategory),

      // 3. Search Published Community Posts
      supabase
        .from('community_posts')
        .select('id, title, text, author_name, category, created_at')
        .eq('status', 'published')
        .or(`text.ilike.%${clean}%,author_name.ilike.%${clean}%`)
        .limit(limitPerCategory)
    ]);

    const people = (peopleRes.data || []).map((p: any) => ({
      id: p.id,
      displayName: p.full_name || 'Pixel Builder',
      avatarUrl: p.avatar_url || undefined,
      role: p.role || 'user',
      bio: p.bio || undefined
    }));

    const opportunities = (oppsRes.data || []).map((o: any) => ({
      id: o.id,
      title: o.title,
      organizer: o.organizer,
      category: o.category,
      deadline: typeof o.deadline === 'number' ? o.deadline : (o.deadline ? new Date(o.deadline).getTime() : undefined),
      mode: o.mode,
      officialUrl: o.official_url
    }));

    const posts = (postsRes.data || []).map((p: any) => ({
      id: p.id,
      title: p.title || (p.text ? p.text.split('\n')[0].substring(0, 80) : 'Community Post'),
      description: p.description || p.text || '',
      authorName: p.author_name || 'Pixel Member',
      category: p.category || 'General',
      createdAt: new Date(p.created_at).getTime()
    }));

    return { people, opportunities, posts };
  } catch (err) {
    console.warn('[searchGlobal] Search query failure:', err);
    return { people: [], opportunities: [], posts: [] };
  }
};

export const globalSearch = searchGlobal;

