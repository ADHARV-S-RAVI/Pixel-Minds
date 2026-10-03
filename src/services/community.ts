import { supabase } from '../lib/supabase';
import type { CommunityPost } from '../types';
import type { Database } from '../types/database';

type PostRow = Database['public']['Tables']['community_posts']['Row'];
type PostInsert = Database['public']['Tables']['community_posts']['Insert'];
type PostUpdate = Database['public']['Tables']['community_posts']['Update'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Format a timestamp or ISO string into a human-readable relative time */
export const formatTimeAgo = (dateStrOrMs: string | number): string => {
  const timestamp = typeof dateStrOrMs === 'number' ? dateStrOrMs : new Date(dateStrOrMs).getTime();
  if (isNaN(timestamp)) return 'Recently';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Convert a Supabase community_posts row into the frontend CommunityPost interface */
export const mapPostRow = (row: PostRow): CommunityPost => ({
  id: row.id,
  user: row.author_name,
  userId: row.user_id,
  role: row.author_role || (row.source === 'admin' ? 'Admin' : 'Pixel Member'),
  time: formatTimeAgo(row.created_at),
  text: row.text,
  category: row.category || 'General',
  likes: row.likes || 0,
  comments: row.comments || 0,
  opp: row.opportunity_id || undefined,
  link: row.link || undefined,
  imageUrl: row.image_url || undefined,
  source: row.source || 'user',
  status: row.status || 'published',
  featured: row.featured || false,
  createdAt: new Date(row.created_at).getTime()
});

/**
 * Fetch published community posts (or all posts if includeDrafts is true, e.g. for Admin).
 * Real-time shared across all users via Supabase PostgreSQL.
 */
export const getCommunityPosts = async (
  includeDrafts = false,
  category?: string,
  limitCount = 50
): Promise<CommunityPost[]> => {
  try {
    let query = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitCount);

    if (!includeDrafts) {
      query = query.eq('status', 'published');
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch community posts from Supabase:', error.message);
      return [];
    }

    return (data || []).map(mapPostRow);
  } catch (err) {
    console.error('Error fetching community posts:', err);
    return [];
  }
};

/**
 * Fetch the current user's community posts.
 */
export const getUserCommunityPosts = async (userId: string): Promise<CommunityPost[]> => {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch user community posts:', error.message);
      return [];
    }

    return (data || []).map(mapPostRow);
  } catch (err) {
    console.error('Error fetching user community posts:', err);
    return [];
  }
};

/**
 * Create a new community post (User or Admin).
 * Enforces RLS: auth.uid() must match user_id.
 */
export const createCommunityPost = async (
  user: { id: string; displayName?: string; role?: string },
  postData: {
    text: string;
    category?: string;
    opp?: string | number;
    link?: string;
    imageUrl?: string;
    status?: 'published' | 'draft';
    featured?: boolean;
    source?: 'admin' | 'user';
  }
): Promise<CommunityPost> => {
  // 1. Get authenticated user from Supabase client to ensure session is valid and sync
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;

  const actualUserId = authUser?.id || user.id;

  if (!actualUserId) {
    throw new Error('You must be signed in to create a post. Please sign in and try again.');
  }

  // 2. Validate opportunity_id if provided (ensure it exists in opportunities table to avoid FK error)
  let validOppId: string | null = null;
  const oppIdStr = postData.opp ? String(postData.opp) : null;
  if (oppIdStr && UUID_REGEX.test(oppIdStr)) {
    const { data: existingOpp } = await supabase
      .from('opportunities')
      .select('id')
      .eq('id', oppIdStr)
      .maybeSingle();
    if (existingOpp) {
      validOppId = existingOpp.id;
    }
  }

  const isAdmin = user.role?.toLowerCase() === 'admin' || postData.source === 'admin';

  const payload: PostInsert = {
    user_id: actualUserId,
    author_name: user.displayName || authUser?.user_metadata?.full_name || 'Pixel Member',
    author_role: isAdmin ? 'Admin' : 'Pixel Member',
    text: postData.text.trim(),
    category: postData.category || 'General',
    opportunity_id: validOppId,
    link: postData.link?.trim() || null,
    image_url: postData.imageUrl?.trim() || null,
    source: isAdmin ? 'admin' : 'user',
    status: postData.status || 'published',
    featured: postData.featured || false,
    likes: 0,
    comments: 0
  };

  const { data, error } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Failed to create community post in Supabase:', error.message, error.details, error.hint);
    if (error.code === '42501') {
      throw new Error('Post rejected by server security policy. Please verify you are signed in.');
    }
    throw new Error(error.message || 'Failed to create community post.');
  }

  return mapPostRow(data);
};

/**
 * Admin: Create an official community post.
 */
export const createAdminCommunityPost = async (
  adminUser: { uid: string; email: string; displayName?: string },
  postData: {
    text: string;
    category?: string;
    opp?: string | number;
    link?: string;
    imageUrl?: string;
    status?: 'published' | 'draft';
    featured?: boolean;
  }
): Promise<CommunityPost> => {
  return createCommunityPost(
    {
      id: adminUser.uid,
      displayName: adminUser.displayName || 'Pixel Minds Official',
      role: 'admin'
    },
    {
      ...postData,
      source: 'admin'
    }
  );
};

/**
 * Update an existing community post.
 * User can update own post; Admin can moderate any post (enforced by RLS).
 */
export const updateCommunityPost = async (
  id: string,
  updates: Partial<CommunityPost>
): Promise<void> => {
  const payload: PostUpdate = {};
  if (updates.text !== undefined) payload.text = updates.text;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.link !== undefined) payload.link = updates.link || null;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.featured !== undefined) payload.featured = updates.featured;
  if (updates.likes !== undefined) payload.likes = updates.likes;
  if (updates.comments !== undefined) payload.comments = updates.comments;

  const { error } = await supabase
    .from('community_posts')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Failed to update community post:', error.message);
    throw new Error('Failed to update community post: ' + error.message);
  }
};

/**
 * Delete a community post.
 * User can delete own post; Admin can delete any post (enforced by RLS).
 */
export const deleteCommunityPost = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete community post:', error.message);
    throw new Error('Failed to delete community post: ' + error.message);
  }
};
