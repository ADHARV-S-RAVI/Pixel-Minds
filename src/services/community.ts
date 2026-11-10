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

    // 30-Day Retention Filter: Exclude normal community posts older than 30 days
    // Preserve admin announcements and featured posts even if older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    query = query.or(`created_at.gte.${thirtyDaysAgo},source.eq.admin,featured.eq.true`);

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

/**
 * Toggle like for a community post. Requires user authentication.
 */
export const togglePostLike = async (
  postId: string,
  userId: string,
  currentLiked: boolean,
  currentLikesCount: number
): Promise<{ liked: boolean; likesCount: number }> => {
  if (!userId) {
    throw new Error('Authentication required to like posts.');
  }

  // 1. Try secure RPC toggle_community_post_like
  try {
    const { data, error } = await (supabase.rpc as any)('toggle_community_post_like', {
      p_post_id: postId
    });
    if (!error && data?.success) {
      return {
        liked: Boolean(data.liked),
        likesCount: Number(data.likes_count)
      };
    }
  } catch (rpcErr) {
    console.warn('[togglePostLike] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table operations fallback
  try {
    if (currentLiked) {
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      await supabase
        .from('community_likes')
        .insert({ post_id: postId, user_id: userId });
    }
  } catch {}

  const nextLiked = !currentLiked;
  const nextCount = Math.max(0, currentLikesCount + (nextLiked ? 1 : -1));

  try {
    await updateCommunityPost(postId, { likes: nextCount });
  } catch {}

  return { liked: nextLiked, likesCount: nextCount };
};

/**
 * Fetch comments for a community post from Supabase (with fallback).
 */
export const getPostComments = async (postId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((c: any) => ({
        id: c.id,
        authorName: c.author_name,
        authorRole: c.author_role || 'Pixel Member',
        authorId: c.user_id,
        authorAvatar: c.author_avatar,
        text: c.text,
        createdAt: new Date(c.created_at).getTime()
      }));
    }
  } catch {}

  // Fallback to localStorage if table is pending or empty
  try {
    const stored = localStorage.getItem(`pm_post_comments_${postId}`);
    if (stored) return JSON.parse(stored);
  } catch {}

  return [];
};

/**
 * Add a comment to a community post. Requires user authentication.
 */
export const addPostComment = async (
  postId: string,
  text: string,
  author: { id: string; name: string; role?: string; avatar?: string },
  currentCommentsCount: number
): Promise<any> => {
  if (!author.id) {
    throw new Error('Authentication required to comment on posts.');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Comment cannot be empty.');
  }

  // 1. Try secure RPC add_community_post_comment
  try {
    const { data, error } = await (supabase.rpc as any)('add_community_post_comment', {
      p_post_id: postId,
      p_text: cleanText
    });
    if (!error && data?.success) {
      return {
        id: data.comment?.id || 'c_' + Date.now(),
        authorName: data.comment?.author_name || author.name,
        authorRole: data.comment?.author_role || author.role || 'Pixel Member',
        authorId: author.id,
        authorAvatar: data.comment?.author_avatar || author.avatar,
        text: cleanText,
        createdAt: Date.now(),
        newCount: Number(data.comments_count || currentCommentsCount + 1)
      };
    }
  } catch (rpcErr) {
    console.warn('[addPostComment] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table insert fallback
  try {
    const { data: inserted } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: author.id,
        author_name: author.name,
        author_role: author.role || 'Pixel Member',
        author_avatar: author.avatar || null,
        text: cleanText
      })
      .select()
      .maybeSingle();

    if (inserted) {
      return {
        id: inserted.id,
        authorName: inserted.author_name,
        authorRole: inserted.author_role,
        authorId: inserted.user_id,
        authorAvatar: inserted.author_avatar,
        text: inserted.text,
        createdAt: new Date(inserted.created_at).getTime(),
        newCount: currentCommentsCount + 1
      };
    }
  } catch {}

  // 3. Fallback count update on post
  const nextCount = currentCommentsCount + 1;
  try {
    await updateCommunityPost(postId, { comments: nextCount });
  } catch {}

  return {
    id: 'c_' + Date.now(),
    authorName: author.name,
    authorRole: author.role || 'Pixel Member',
    authorId: author.id,
    authorAvatar: author.avatar,
    text: cleanText,
    createdAt: Date.now(),
    newCount: nextCount
  };
};
