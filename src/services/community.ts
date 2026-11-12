import { supabase } from '../lib/supabase';
import type { CommunityPost } from '../types';

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
export const mapPostRow = (row: any): CommunityPost => {
  const dynamicLikesCount = Array.isArray(row.community_likes)
    ? row.community_likes.length
    : (typeof row.likes === 'number' ? row.likes : 0);
  const dynamicCommentsCount = Array.isArray(row.community_comments)
    ? row.community_comments.length
    : (typeof row.comments === 'number' ? row.comments : 0);

  const title = row.title || (row.text ? row.text.split('\n')[0].substring(0, 100) : 'Community Post');
  const description = row.description || (row.text ? (row.text.includes('\n') ? row.text.substring(row.text.indexOf('\n')).trim() : row.text) : '');

  const isEdited = Boolean(
    row.is_edited || 
    (row.updated_at && row.created_at && Math.abs(new Date(row.updated_at).getTime() - new Date(row.created_at).getTime()) > 3000)
  );

  return {
    id: row.id,
    user: row.author_name,
    userId: row.user_id,
    role: row.author_role || (row.source === 'admin' ? 'Admin' : 'Pixel Member'),
    time: formatTimeAgo(row.created_at),
    title,
    description,
    text: row.text || (title + (description ? '\n\n' + description : '')),
    category: row.category || 'General',
    likes: dynamicLikesCount,
    comments: dynamicCommentsCount,
    reposts: row.reposts || 0,
    shares: row.shares || 0,
    bookmarksCount: row.bookmarks_count || 0,
    opp: row.opportunity_id || undefined,
    link: row.link || undefined,
    imageUrl: row.image_url || undefined,
    source: row.source || 'user',
    status: row.status || 'published',
    featured: row.featured || false,
    isEdited,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    createdAt: new Date(row.created_at).getTime()
  };
};

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
      .select('*, community_likes(user_id), community_comments(id)')
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
      .select('*, community_likes(user_id), community_comments(id)')
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
    title?: string;
    description?: string;
    text?: string;
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

  // Compute title and description with compulsory validation
  let postTitle = postData.title?.trim();
  let postDesc = postData.description?.trim();
  const rawText = postData.text?.trim() || '';

  if (!postTitle && rawText) {
    const firstLine = rawText.split('\n')[0].trim();
    postTitle = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
    postDesc = rawText.includes('\n') ? rawText.substring(rawText.indexOf('\n')).trim() : rawText;
  }

  if (!postTitle) {
    throw new Error('Post title is required.');
  }
  if (!postDesc && !rawText) {
    throw new Error('Post description is required.');
  }

  const fullText = rawText || `${postTitle}\n\n${postDesc}`;

  const payload: any = {
    user_id: actualUserId,
    author_name: user.displayName || authUser?.user_metadata?.full_name || 'Pixel Member',
    author_role: isAdmin ? 'Admin' : 'Pixel Member',
    text: fullText,
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

  // Try insert with title & description, fallback to text-only if schema cache lacks them
  let data: any = null;
  const insertWithTitle = await supabase
    .from('community_posts')
    .insert({
      ...payload,
      title: postTitle,
      description: postDesc || postTitle
    })
    .select()
    .single();

  if (!insertWithTitle.error) {
    data = insertWithTitle.data;
  } else {
    // If column title/description error or schema cache mismatch, fallback to base payload
    const insertFallback = await supabase
      .from('community_posts')
      .insert(payload)
      .select()
      .single();

    if (insertFallback.error) {
      console.error('Failed to create community post in Supabase:', insertFallback.error.message);
      if (insertFallback.error.code === '42501') {
        throw new Error('Post rejected by server security policy. Please verify you are signed in.');
      }
      throw new Error(insertFallback.error.message || 'Failed to create community post.');
    }
    data = insertFallback.data;
  }

  // Dispatch mention notifications asynchronously for @mentions in post
  handleContentMentions(fullText, data.id, payload.author_name, 'post').catch((err) => {
    console.warn('[createCommunityPost] Mention dispatch notice:', err);
  });

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
  updates: Partial<CommunityPost> & { title?: string; description?: string }
): Promise<void> => {
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.text !== undefined) payload.text = updates.text;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.link !== undefined) payload.link = updates.link || null;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.featured !== undefined) payload.featured = updates.featured;
  if (updates.likes !== undefined) payload.likes = updates.likes;
  if (updates.comments !== undefined) payload.comments = updates.comments;

  payload.updated_at = new Date().toISOString();

  if (UUID_REGEX.test(id)) {
    const { error } = await supabase
      .from('community_posts')
      .update(payload)
      .eq('id', id);

    if (error) {
      // Fallback: update text only if title/description column does not exist
      const fallbackPayload: any = { updated_at: payload.updated_at };
      if (payload.text) fallbackPayload.text = payload.text;
      if (payload.likes !== undefined) fallbackPayload.likes = payload.likes;
      if (payload.comments !== undefined) fallbackPayload.comments = payload.comments;

      const { error: fbErr } = await supabase
        .from('community_posts')
        .update(fallbackPayload)
        .eq('id', id);

      if (fbErr) {
        console.error('Failed to update community post:', fbErr.message);
        throw new Error('Failed to update community post: ' + fbErr.message);
      }
    }
  }
};

/**
 * Fetch users who liked a post
 */
export const getPostLikes = async (postId: string): Promise<Array<{ id: string; name: string; avatar?: string }>> => {
  try {
    // 1. First attempt join with profiles
    const { data, error } = await supabase
      .from('community_likes')
      .select('user_id, profiles(id, full_name, avatar_url)')
      .eq('post_id', postId);

    if (!error && data && data.length > 0) {
      return data.map((item: any) => {
        const prof = item.profiles;
        return {
          id: prof?.id || item.user_id,
          name: prof?.full_name || 'Pixel Builder',
          avatar: prof?.avatar_url || undefined
        };
      });
    }

    // 2. Fallback: If join failed (e.g. Missing explicit FK constraint), query user_ids and fetch profiles directly
    const { data: rawLikes, error: rawError } = await supabase
      .from('community_likes')
      .select('user_id')
      .eq('post_id', postId);

    if (!rawError && rawLikes && rawLikes.length > 0) {
      const userIds = Array.from(new Set(rawLikes.map((r: any) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profileMap = new Map((userProfiles || []).map((p: any) => [p.id, p]));
        return userIds.map((uid) => {
          const prof = profileMap.get(uid);
          return {
            id: uid,
            name: prof?.full_name || 'Pixel Builder',
            avatar: prof?.avatar_url || undefined
          };
        });
      }
    }
  } catch (err) {
    console.warn('[getPostLikes] Note:', err);
  }
  return [];
};

/**
 * Update an existing comment text (Author or Admin)
 */
export const updatePostComment = async (
  commentId: string,
  newText: string,
  userId: string
): Promise<void> => {
  if (!userId) {
    throw new Error('Authentication required to edit comment.');
  }
  const clean = newText.trim();
  if (!clean) {
    throw new Error('Comment cannot be empty.');
  }

  // Update in Supabase only if commentId is a valid UUID
  if (UUID_REGEX.test(commentId)) {
    const { error } = await supabase
      .from('community_comments')
      .update({ text: clean })
      .eq('id', commentId);

    if (error) {
      console.warn('[updatePostComment] Supabase update notice:', error.message);
    }
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
    if (error) {
      console.warn('[togglePostLike] RPC error, falling back:', error.message);
    }
  } catch (rpcErr) {
    console.warn('[togglePostLike] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table operations fallback
  const nextLiked = !currentLiked;
  const nextCount = Math.max(0, currentLikesCount + (nextLiked ? 1 : -1));

  try {
    if (currentLiked) {
      const { error: delErr } = await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (delErr) console.warn('[togglePostLike] Direct delete error:', delErr.message);
    } else {
      const { error: insErr } = await supabase
        .from('community_likes')
        .insert({ post_id: postId, user_id: userId });
      if (insErr) console.warn('[togglePostLike] Direct insert error:', insErr.message);
    }

    const { error: updateErr } = await supabase
      .from('community_posts')
      .update({ likes: nextCount })
      .eq('id', postId);
    if (updateErr) console.warn('[togglePostLike] Counter update notice:', updateErr.message);
  } catch (err) {
    console.error('[togglePostLike] Failed direct sync:', err);
  }

  return { liked: nextLiked, likesCount: nextCount };
};

/**
 * Fetch comments for a community post from Supabase (with fallback).
 */
export const getPostComments = async (postId: string, currentUserId?: string): Promise<any[]> => {
  try {
    if (UUID_REGEX.test(postId)) {
      const { data, error } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((c: any) => {
          let isLiked = false;
          if (typeof window !== 'undefined' && currentUserId) {
            isLiked = localStorage.getItem(`pm_comment_liked_${c.id}_${currentUserId}`) === 'true' ||
              localStorage.getItem(`pm_comment_liked_${c.id}`) === 'true';
          }

          const isCommentEdited = Boolean(
            c.is_edited || 
            (c.updated_at && c.created_at && Math.abs(new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) > 3000)
          );

          return {
            id: c.id,
            postId: c.post_id,
            authorName: c.author_name,
            authorRole: c.author_role || 'Pixel Member',
            authorId: c.user_id,
            authorAvatar: c.author_avatar,
            text: c.text,
            likes: typeof c.likes === 'number' ? c.likes : 0,
            liked: isLiked,
            isEdited: isCommentEdited,
            createdAt: new Date(c.created_at).getTime()
          };
        });
      }
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
      const commentRes = {
        id: data.comment?.id || 'c_' + Date.now(),
        postId,
        authorName: data.comment?.author_name || author.name,
        authorRole: data.comment?.author_role || author.role || 'Pixel Member',
        authorId: author.id,
        authorAvatar: data.comment?.author_avatar || author.avatar,
        text: cleanText,
        likes: 0,
        liked: false,
        createdAt: Date.now(),
        newCount: Number(data.comments_count || currentCommentsCount + 1)
      };

      // Dispatch mention notifications asynchronously for @mentions in comment
      handleContentMentions(cleanText, postId, author.name, 'comment').catch(() => {});

      return commentRes;
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
        text: cleanText,
        likes: 0
      })
      .select()
      .maybeSingle();

    if (inserted) {
      // Recalculate comments count atomically from table
      const { count: freshCount } = await supabase
        .from('community_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);

      const targetCount = freshCount ?? (currentCommentsCount + 1);
      await supabase
        .from('community_posts')
        .update({ comments: targetCount })
        .eq('id', postId);

      // Dispatch mention notifications
      handleContentMentions(cleanText, postId, author.name, 'comment').catch(() => {});

      return {
        id: inserted.id,
        postId,
        authorName: inserted.author_name,
        authorRole: inserted.author_role,
        authorId: inserted.user_id,
        authorAvatar: inserted.author_avatar,
        text: inserted.text,
        likes: 0,
        liked: false,
        createdAt: new Date(inserted.created_at).getTime(),
        newCount: targetCount
      };
    }
  } catch (err) {
    console.warn('[addPostComment] Direct insert error:', err);
  }

  // 3. Fallback count update on post
  const nextCount = currentCommentsCount + 1;
  try {
    await updateCommunityPost(postId, { comments: nextCount });
  } catch {}

  return {
    id: 'c_' + Date.now(),
    postId,
    authorName: author.name,
    authorRole: author.role || 'Pixel Member',
    authorId: author.id,
    authorAvatar: author.avatar,
    text: cleanText,
    likes: 0,
    liked: false,
    createdAt: Date.now(),
    newCount: nextCount
  };
};

/**
 * Delete a comment securely (Author or Admin).
 */
export const deletePostComment = async (
  commentId: string,
  postId: string,
  userId: string
): Promise<{ success: boolean; newCount: number }> => {
  if (!userId) {
    throw new Error('Authentication required to delete comments.');
  }

  // 1. Try secure RPC delete_community_comment
  try {
    const { data, error } = await (supabase.rpc as any)('delete_community_comment', {
      p_comment_id: commentId
    });
    if (!error && data?.success) {
      return {
        success: true,
        newCount: Number(data.comments_count ?? 0)
      };
    }
    if (error) {
      console.warn('[deletePostComment] RPC error, falling back:', error.message);
    }
  } catch (rpcErr) {
    console.warn('[deletePostComment] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table deletion fallback with RLS enforcement
  const { error: delErr } = await supabase
    .from('community_comments')
    .delete()
    .eq('id', commentId);

  if (delErr) {
    console.error('[deletePostComment] Failed to delete comment:', delErr.message);
    throw new Error('Failed to delete comment: ' + delErr.message);
  }

  // Clean associated comment likes if cascade is delayed
  try {
    await supabase.from('community_comment_likes').delete().eq('comment_id', commentId);
  } catch {}

  // Recalculate parent post comments count
  const { count: freshCount } = await supabase
    .from('community_comments')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', postId);

  const updatedCount = Math.max(0, freshCount ?? 0);
  try {
    await supabase
      .from('community_posts')
      .update({ comments: updatedCount })
      .eq('id', postId);
  } catch {}

  return { success: true, newCount: updatedCount };
};

/**
 * Toggle like for a comment.
 */
export const toggleCommentLike = async (
  commentId: string,
  userId: string,
  currentLiked: boolean,
  currentLikesCount: number
): Promise<{ liked: boolean; likesCount: number }> => {
  if (!userId) {
    throw new Error('Authentication required to like comments.');
  }

  // 1. Try secure RPC toggle_comment_like
  try {
    const { data, error } = await (supabase.rpc as any)('toggle_comment_like', {
      p_comment_id: commentId
    });
    if (!error && data?.success) {
      return {
        liked: Boolean(data.liked),
        likesCount: Number(data.likes_count ?? 0)
      };
    }
  } catch (rpcErr) {
    console.warn('[toggleCommentLike] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table fallback
  const nextLiked = !currentLiked;
  const nextCount = Math.max(0, currentLikesCount + (nextLiked ? 1 : -1));

  try {
    if (UUID_REGEX.test(commentId)) {
      await supabase
        .from('community_comments')
        .update({ likes: nextCount })
        .eq('id', commentId);
    }
  } catch (err) {
    console.warn('[toggleCommentLike] Direct sync notice:', err);
  }

  return { liked: nextLiked, likesCount: nextCount };
};

/**
 * Record a post interaction (repost or share)
 */
export const recordPostInteraction = async (
  postId: string,
  userId: string,
  type: 'repost' | 'share'
): Promise<{ success: boolean; count: number }> => {
  if (!userId) {
    throw new Error('Authentication required for post interaction.');
  }

  // 1. Try secure RPC record_post_interaction
  try {
    const { data, error } = await (supabase.rpc as any)('record_post_interaction', {
      p_post_id: postId,
      p_type: type
    });
    if (!error && data?.success) {
      return {
        success: true,
        count: Number(data.count ?? 0)
      };
    }
  } catch (rpcErr) {
    console.warn('[recordPostInteraction] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table fallback
  try {
    await supabase
      .from('community_interactions')
      .insert({
        post_id: postId,
        user_id: userId,
        interaction_type: type
      });

    const { count } = await supabase
      .from('community_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('interaction_type', type);

    const safeCount = count ?? 1;
    if (UUID_REGEX.test(postId)) {
      if (type === 'repost') {
        await supabase.from('community_posts').update({ reposts: safeCount }).eq('id', postId);
      } else {
        await supabase.from('community_posts').update({ shares: safeCount }).eq('id', postId);
      }
    }

    return { success: true, count: safeCount };
  } catch (err) {
    console.warn('[recordPostInteraction] Direct sync notice:', err);
    return { success: false, count: 0 };
  }
};

/**
 * Toggle bookmark for a post or opportunity (integrated with user_bookmarks table)
 */
export const toggleBookmarkRecord = async (
  targetId: string,
  userId: string
): Promise<{ bookmarked: boolean; bookmarksCount?: number }> => {
  if (!userId) {
    throw new Error('Authentication required to save bookmarks.');
  }

  // 1. Try secure RPC toggle_post_bookmark
  try {
    const { data, error } = await (supabase.rpc as any)('toggle_post_bookmark', {
      p_post_id: targetId
    });
    if (!error && data?.success) {
      return {
        bookmarked: Boolean(data.bookmarked),
        bookmarksCount: typeof data.bookmarks_count === 'number' ? data.bookmarks_count : undefined
      };
    }
  } catch (rpcErr) {
    console.warn('[toggleBookmarkRecord] RPC not available or failed:', rpcErr);
  }

  // 2. Direct table fallback
  try {
    const { data: existing, error: checkErr } = await supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', targetId)
      .maybeSingle();

    if (checkErr) {
      // user_bookmarks table not configured in remote schema, gracefully return
      return { bookmarked: true };
    }

    if (existing) {
      await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('target_id', targetId);
      return { bookmarked: false };
    } else {
      const isPost = targetId.startsWith('p') || UUID_REGEX.test(targetId);
      await supabase
        .from('user_bookmarks')
        .insert({
          user_id: userId,
          target_id: targetId,
          target_type: isPost ? 'post' : 'opportunity'
        });
      return { bookmarked: true };
    }
  } catch (err) {
    console.warn('[toggleBookmarkRecord] Direct fallback notice:', err);
    return { bookmarked: false };
  }
};

/**
 * Fetch all bookmarks for a user from database
 */
export const getUserBookmarks = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('target_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map((b: any) => b.target_id);
  } catch {
    return [];
  }
};

/**
 * Detect mentions in content and dispatch notifications to mentioned users
 */
export const handleContentMentions = async (
  content: string,
  postId: string,
  actorName: string,
  contextType: 'post' | 'comment' = 'post'
): Promise<void> => {
  if (!content || !postId) return;

  // Extract unique @usernames (letters, numbers, underscores)
  const matches = content.match(/@([a-zA-Z0-9_-]{2,30})/g);
  if (!matches || matches.length === 0) return;

  const usernames = Array.from(new Set(matches.map((m) => m.slice(1).trim().toLowerCase())));

  for (const username of usernames) {
    try {
      // Find matching user profile by username / full_name / email prefix
      const { data: matchedProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`full_name.ilike.%${username}%,email.ilike.${username}@%`)
        .limit(1);

      const targetUser = matchedProfiles?.[0];
      if (targetUser && targetUser.id) {
        // Try RPC first
        try {
          await (supabase.rpc as any)('dispatch_mention_notification', {
            p_target_user_id: targetUser.id,
            p_post_id: postId,
            p_actor_name: actorName,
            p_snippet: content.substring(0, 100),
            p_context_type: contextType
          });
        } catch {
          // Fallback direct notification
          const { data: notif } = await supabase
            .from('notifications')
            .insert({
              title: `${actorName} mentioned you`,
              message: `"${content.substring(0, 100)}"`,
              type: 'community',
              link: `/feed#${postId}`
            })
            .select()
            .maybeSingle();

          if (notif?.id) {
            await supabase
              .from('user_notifications')
              .insert({
                user_id: targetUser.id,
                notification_id: notif.id
              });
          }
        }
      }
    } catch (mentionErr) {
      console.warn(`[handleContentMentions] Error notifying @${username}:`, mentionErr);
    }
  }
};
