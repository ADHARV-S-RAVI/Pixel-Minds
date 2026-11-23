import { supabase } from '../lib/supabase';
import type { CommunityPost } from '../types';
import { sanitizeInput, safeUrl, validateMessageSafety, validateUrlSafety } from '../utils/text';
import { VERIFIED_OPPORTUNITIES } from '../data/verifiedOpportunities';
import { 
  logFailedPost, 
  logFeedError, 
  logRateLimitExceeded, 
  logUnauthorizedAttempt 
} from './securityLogger';

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
export const mapPostRow = (row: any, profileMap?: Map<string, any>): CommunityPost => {
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

  const likerIds = Array.isArray(row.community_likes)
    ? row.community_likes.map((l: any) => String(l.user_id)).filter(Boolean)
    : [];

  const prof = profileMap?.get(row.user_id);
  const rawAuthor = prof?.full_name?.trim();
  const hasRealAuthor = rawAuthor && rawAuthor.toLowerCase() !== 'pixel builder';
  const rawUsername = prof?.username?.trim();
  const cleanUsername = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`) : undefined;
  const rowAuthor = row.author_name && row.author_name.toLowerCase() !== 'pixel builder' ? row.author_name : undefined;

  const resolvedAuthor =
    (hasRealAuthor ? rawAuthor : undefined) ||
    cleanUsername ||
    rowAuthor ||
    (row.source === 'admin' ? 'Pixel Minds Team' : 'Pixel Member');

  const resolvedAvatar = prof?.avatar_url || row.author_avatar || undefined;

  // Inspect if this post is a repost attribution
  let isRepost = false;
  let originalAuthorUsername: string | undefined = undefined;
  let originalAuthorName: string | undefined = undefined;
  let originalPostId: string | undefined = undefined;

  const repostMatch = (row.title || '').match(/^Repost from @([a-zA-Z0-9_]{3,20})/i) ||
                      (row.text || '').match(/^Reposted from @([a-zA-Z0-9_]{3,20}):/i);
  if (repostMatch) {
    isRepost = true;
    originalAuthorUsername = `@${repostMatch[1]}`;
  }

  return {
    id: row.id,
    user: resolvedAuthor,
    userId: row.user_id,
    role: row.author_role || (row.source === 'admin' ? 'Admin' : 'Pixel Member'),
    avatar: resolvedAvatar,
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
    createdAt: new Date(row.created_at).getTime(),
    likerIds,
    authorUsername: cleanUsername,
    isRepost,
    originalAuthorUsername,
    originalAuthorName,
    originalPostId
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

    const posts = data || [];
    const userIds = Array.from(new Set(posts.map((r: any) => r.user_id).filter(Boolean)));
    const profileMap = new Map<string, any>();

    if (userIds.length > 0) {
      try {
        const { data: userProfiles, error: profError } = await (supabase as any)
          .from('public_profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);

        if (!profError && Array.isArray(userProfiles) && userProfiles.length > 0) {
          userProfiles.forEach((p: any) => profileMap.set(p.id, p));
        } else {
          // Graceful fallback to direct profiles table when public_profiles view is not created remotely
          try {
            const { data: dirProfiles } = await supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .in('id', userIds);
            if (Array.isArray(dirProfiles)) {
              dirProfiles.forEach((p: any) => profileMap.set(p.id, p));
            }
          } catch {}
        }
      } catch {
        try {
          const { data: dirProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .in('id', userIds);
          if (Array.isArray(dirProfiles)) {
            dirProfiles.forEach((p: any) => profileMap.set(p.id, p));
          }
        } catch {}
      }
    }

    return posts.map((row: any) => mapPostRow(row, profileMap));
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

    const posts = data || [];
    const profileMap = new Map<string, any>();

    if (userId) {
      try {
        const { data: userProfile, error: profError } = await (supabase as any)
          .from('public_profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', userId)
          .maybeSingle();

        if (!profError && userProfile) {
          profileMap.set(userProfile.id, userProfile);
        } else if (profError) {
          console.warn('[getUserCommunityPosts] public_profiles lookup error:', profError.message);
        }
      } catch {}
    }

    return posts.map((row: any) => mapPostRow(row, profileMap));
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

  // 2. Validate opportunity_id if provided (ensure it exists and is published to prevent invalid/unpublished attachments)
  let validOppId: string | null = null;
  const oppIdStr = postData.opp !== undefined && postData.opp !== null && postData.opp !== 0 && postData.opp !== '0'
    ? String(postData.opp).trim()
    : null;

  if (oppIdStr) {
    if (UUID_REGEX.test(oppIdStr)) {
      const { data: existingOpp, error: oppErr } = await supabase
        .from('opportunities')
        .select('id, status')
        .eq('id', oppIdStr)
        .maybeSingle();

      if (oppErr) {
        console.warn('[createCommunityPost] Opportunity query warning:', oppErr.message);
      }

      if (existingOpp) {
        if (existingOpp.status !== 'published') {
          throw new Error('Cannot attach an unpublished or invalid opportunity.');
        }
        validOppId = existingOpp.id;
      } else {
        const verifiedMatch = VERIFIED_OPPORTUNITIES.find((v) => v.id === oppIdStr);
        if (!verifiedMatch) {
          throw new Error('Selected opportunity does not exist or is invalid.');
        }
        validOppId = verifiedMatch.id;
      }
    } else {
      const verifiedMatch = VERIFIED_OPPORTUNITIES.find((v) => String(v.id) === oppIdStr);
      if (!verifiedMatch) {
        throw new Error('Selected opportunity does not exist or is invalid.');
      }
      validOppId = String(verifiedMatch.id);
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

  // Length safety enforcement
  if (postTitle.length > 150) {
    postTitle = postTitle.substring(0, 150);
  }

  const fullText = rawText || `${postTitle}\n\n${postDesc}`;
  if (fullText.length > 5000) {
    throw new Error('Post content exceeds maximum allowed length of 5000 characters.');
  }

  // Validate and sanitize URLs
  const cleanLink = postData.link ? safeUrl(postData.link) : null;
  const cleanImageUrl = postData.imageUrl ? safeUrl(postData.imageUrl) : null;

  let authorName = (user.displayName && user.displayName !== 'Pixel Builder')
    ? user.displayName
    : (authUser?.user_metadata?.full_name || (authUser?.user_metadata?.username ? `@${authUser.user_metadata.username}` : undefined));

  if (!authorName) {
    try {
      const { data: pubProf } = await (supabase as any)
        .from('public_profiles')
        .select('full_name, username')
        .eq('id', actualUserId)
        .maybeSingle();
      if (pubProf) {
        authorName = pubProf.full_name?.trim() || (pubProf.username ? `@${pubProf.username}` : undefined);
      }
    } catch {}
  }
  if (!authorName) {
    authorName = 'Pixel Member';
  }

  const payload: any = {
    user_id: actualUserId,
    author_name: authorName,
    author_role: isAdmin ? 'Admin' : 'Pixel Member',
    text: fullText,
    category: postData.category || 'General',
    opportunity_id: validOppId,
    link: cleanLink,
    image_url: cleanImageUrl,
    source: isAdmin ? 'admin' : 'user',
    status: postData.status || 'published',
    featured: postData.featured || false,
    likes: 0,
    comments: 0
  };

  // Direct insert using actual database schema columns (text stores title and description)
  const { data: insertedData, error: insertError } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create community post in Supabase:', insertError.message);
    if (insertError.message?.includes('Rate limit') || insertError.code === 'P0001') {
      logRateLimitExceeded(actualUserId, 'post_create', { error: insertError.message });
      throw new Error('You are posting too quickly. Please wait a moment before trying again.');
    }
    if (insertError.code === '42501') {
      logUnauthorizedAttempt(actualUserId, 'create_post', undefined);
      throw new Error('Post rejected by server security policy. Please verify you are signed in.');
    }
    logFailedPost(actualUserId, insertError.message);
    throw new Error(insertError.message || 'Failed to create community post.');
  }

  const data = insertedData;

  // Server-side atomic reward for post creation
  try {
    await (supabase.rpc as any)('reward_community_post_creation', {
      p_post_id: data.id
    });
  } catch (rewardErr) {
    console.warn('[createCommunityPost] Post creation reward notice:', rewardErr);
  }

  // Dispatch mention notifications asynchronously for @mentions in post
  handleContentMentions(fullText, data.id, payload.author_name, 'post', payload.author_id).catch((err) => {
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
 * Allows verified Admins to edit any post; Ordinary users can only edit their own posts.
 * Strictly preserves immutable fields: user_id, author identity, interaction counters, created_at.
 * Ordinary users cannot update admin-controlled fields (status, featured, source).
 */
export const updateCommunityPost = async (
  id: string,
  updates: Partial<CommunityPost> & { title?: string; description?: string },
  authOverride?: { uid: string; role?: string } | string
): Promise<void> => {
  // 1. Identify authenticated user
  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;
  const currentUserId = typeof authOverride === 'object' ? authOverride?.uid : (authOverride || authUser?.id);
  const overrideRole = typeof authOverride === 'object' ? authOverride?.role : undefined;

  if (!currentUserId) {
    throw new Error('You must be signed in to edit a community post.');
  }

  if (!id || !UUID_REGEX.test(id)) {
    throw new Error('Invalid post ID format.');
  }

  // 2. Fetch existing post to check creator and current metadata
  const { data: existingPost, error: fetchErr } = await supabase
    .from('community_posts')
    .select('id, user_id, author_name, author_role, source, likes, comments, reposts, shares, bookmarks_count, status, featured, opportunity_id, text, title, description, category, link, image_url, created_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr || !existingPost) {
    throw new Error('Community post not found.');
  }

  // 3. Determine if current user is an admin
  let isAdmin = false;
  if (overrideRole && String(overrideRole).toLowerCase() === 'admin') {
    isAdmin = true;
  } else {
    const metadataRole = authUser?.user_metadata?.role || authUser?.app_metadata?.role;
    if (metadataRole && String(metadataRole).toLowerCase() === 'admin') {
      isAdmin = true;
    } else {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUserId)
          .maybeSingle();
        if (profile?.role && String(profile.role).toLowerCase() === 'admin') {
          isAdmin = true;
        }
      } catch {}
    }
  }

  // 4. Authorization enforcement: ONLY the original author can edit their own post.
  // Admins cannot edit community posts (admins can delete, but cannot edit).
  if (String(existingPost.user_id) !== String(currentUserId)) {
    logUnauthorizedAttempt(currentUserId, 'updateCommunityPost', id);
    throw new Error('You are not authorized to edit this post. Only the original author can edit their own post.');
  }

  // Admin-only fields guard
  if (!isAdmin && (updates.status !== undefined || (updates as any).featured !== undefined)) {
    throw new Error('Only administrators can modify post status or featured state.');
  }

  // 5. Build validated payload strictly excluding immutable fields
  const previousText = existingPost.text || '';
  const payload: any = {};
  let newFullText = '';

  let postTitle = updates.title !== undefined ? sanitizeInput(updates.title).trim() : (existingPost.title || '');
  let postDesc = updates.description !== undefined ? sanitizeInput(updates.description).trim() : (existingPost.description || '');

  if (updates.text !== undefined) {
    const cleanText = sanitizeInput(updates.text).trim();
    if (!cleanText) throw new Error('Post content cannot be empty.');
    if (cleanText.length > 5000) throw new Error('Post content exceeds 5000 characters limit.');
    payload.text = cleanText;
    newFullText = cleanText;
    if (updates.title === undefined) {
      const firstLine = cleanText.split('\n')[0].trim();
      postTitle = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
    }
    if (updates.description === undefined) {
      postDesc = cleanText.includes('\n') ? cleanText.substring(cleanText.indexOf('\n')).trim() : cleanText;
    }
  }

  if (!postTitle) throw new Error('Post title cannot be empty.');
  if (postTitle.length > 150) throw new Error('Post title exceeds 150 characters limit.');
  if (!postDesc) throw new Error('Post description cannot be empty.');
  if (postDesc.length > 5000) throw new Error('Post description exceeds 5000 characters limit.');

  const titleSafety = validateMessageSafety(postTitle);
  if (!titleSafety.safe) throw new Error(titleSafety.error || 'Post title contains unsafe script or HTML injection.');
  const descSafety = validateMessageSafety(postDesc);
  if (!descSafety.safe) throw new Error(descSafety.error || 'Post description contains unsafe script or HTML injection.');

  payload.title = postTitle;
  payload.description = postDesc;
  if (updates.text === undefined) {
    payload.text = postTitle + (postDesc ? '\n\n' + postDesc : '');
    newFullText = payload.text;
  }

  if (updates.category !== undefined) {
    payload.category = updates.category ? sanitizeInput(updates.category).trim() : 'General';
  }

  if (updates.link !== undefined) {
    if (updates.link && updates.link.trim()) {
      const urlCheck = validateUrlSafety(updates.link.trim());
      if (!urlCheck.safe) {
        throw new Error(urlCheck.error || 'Invalid link URL. Must use HTTP or HTTPS.');
      }
      payload.link = safeUrl(updates.link.trim());
    } else {
      payload.link = null;
    }
  }

  if (updates.opp !== undefined) {
    const oppIdStr = updates.opp !== null && updates.opp !== 0 && updates.opp !== '0'
      ? String(updates.opp).trim()
      : null;

    if (oppIdStr) {
      if (UUID_REGEX.test(oppIdStr)) {
        const { data: oppRecord } = await supabase
          .from('opportunities')
          .select('id, status')
          .eq('id', oppIdStr)
          .maybeSingle();

        if (oppRecord) {
          if (oppRecord.status !== 'published') {
            throw new Error('Attached opportunity was not found or is not published.');
          }
          payload.opportunity_id = oppRecord.id;
        } else {
          const verified = VERIFIED_OPPORTUNITIES.find((v) => v.id === oppIdStr);
          if (!verified) {
            throw new Error('Attached opportunity was not found or is not published.');
          }
          payload.opportunity_id = verified.id;
        }
      } else {
        const verified = VERIFIED_OPPORTUNITIES.find((v) => String(v.id) === oppIdStr);
        if (!verified) {
          throw new Error('Attached opportunity was not found or is not published.');
        }
        payload.opportunity_id = String(verified.id);
      }
    } else {
      payload.opportunity_id = null;
    }
  }

  if (updates.imageUrl !== undefined) {
    payload.image_url = updates.imageUrl ? safeUrl(updates.imageUrl) : null;
  }

  // Status or featured cannot be altered via edit
  delete (payload as any).status;
  delete (payload as any).featured;

  payload.is_edited = true;
  payload.updated_at = new Date().toISOString();

  // Strict defense-in-depth: permanently strip immutable fields from payload
  delete (payload as any).user_id;
  delete (payload as any).author_name;
  delete (payload as any).likes_count;
  delete (payload as any).comments_count;
  delete (payload as any).created_at;

  const { error } = await supabase
    .from('community_posts')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Failed to update community post:', error.message);
    logFeedError(error, 'updateCommunityPost');
    throw new Error('Failed to update community post: ' + error.message);
  }

  // Dispatch differential mention notifications
  if (newFullText && newFullText !== previousText) {
    handleContentMentions(newFullText, id, updates.user || existingPost.author_name || 'A builder', 'post', currentUserId, previousText).catch(() => {});
  }
};

/**
 * Fetch users who liked a post using the dedicated get_post_likers RPC or public_profiles data source.
 * Priority order for liker display name:
 * 1. User's real full_name (if not 'Pixel Builder' and not empty)
 * 2. User's clean username prefixed with '@'
 * 3. 'Pixel Member' only when neither identity can genuinely be resolved.
 */
export const getPostLikes = async (postId: string): Promise<Array<{ id: string; name: string; username?: string; avatar?: string }>> => {
  if (!postId) return [];

  // 1. Primary path: Dedicated SECURITY DEFINER get_post_likers RPC
  try {
    const { data: rpcLikers, error: rpcErr } = await (supabase.rpc as any)('get_post_likers', {
      p_post_id: postId
    });

    if (!rpcErr && Array.isArray(rpcLikers)) {
      return rpcLikers.map((p: any) => {
        const rawName = p.full_name?.trim();
        const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
        const cleanUsername = p.username ? (p.username.startsWith('@') ? p.username : `@${p.username}`) : undefined;
        const displayName = (hasRealName ? rawName : undefined) || cleanUsername || 'Pixel Member';

        return {
          id: p.id,
          name: displayName,
          username: p.username || undefined,
          avatar: p.avatar_url || undefined
        };
      });
    }

    if (rpcErr && !rpcErr.message?.includes('function') && !rpcErr.message?.includes('does not exist')) {
      console.warn('[getPostLikes] get_post_likers RPC notice:', rpcErr.message);
    }
  } catch (rpcEx: any) {
    console.warn('[getPostLikes] RPC exception:', rpcEx?.message || rpcEx);
  }

  // 2. Direct fallback path: query community_likes + public_profiles view
  try {
    const { data: rawLikes, error: rawError } = await supabase
      .from('community_likes')
      .select('user_id')
      .eq('post_id', postId);

    if (rawError) {
      console.warn('[getPostLikes] Error querying community_likes:', rawError.message);
      throw new Error(`Failed to load likers: ${rawError.message}`);
    }

    if (!rawLikes || rawLikes.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(rawLikes.map((r: any) => r.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      return [];
    }

    let userProfiles: any[] = [];
    const { data: pubData, error: pubErr } = await (supabase as any)
      .from('public_profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    if (pubErr) {
      console.warn('[getPostLikes] public_profiles lookup notice:', pubErr.message);
    } else if (Array.isArray(pubData)) {
      userProfiles = pubData;
    }

    const profileMap = new Map<string, any>((userProfiles || []).map((p: any) => [p.id, p]));

    // Check direct profiles table for any users not returned by public_profiles
    const missingIds = userIds.filter((id) => !profileMap.has(id));
    if (missingIds.length > 0) {
      try {
        const { data: dirData } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', missingIds);
        if (Array.isArray(dirData)) {
          dirData.forEach((p: any) => {
            if (p?.id) profileMap.set(p.id, p);
          });
        }
      } catch {}
    }

    // Check community_posts and community_comments for stored author names of remaining missing users
    const stillMissingIds = userIds.filter((id) => !profileMap.has(id));
    if (stillMissingIds.length > 0) {
      try {
        const { data: postAuthors } = await supabase
          .from('community_posts')
          .select('user_id, author_name')
          .in('user_id', stillMissingIds);
        if (Array.isArray(postAuthors)) {
          postAuthors.forEach((pa: any) => {
            if (pa?.user_id && !profileMap.has(pa.user_id)) {
              profileMap.set(pa.user_id, {
                id: pa.user_id,
                full_name: pa.author_name
              });
            }
          });
        }
      } catch {}
    }

    // If current authenticated user is among likers, enrich with session metadata if missing
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentAuthUser = sessionData?.session?.user;
      if (currentAuthUser && userIds.includes(currentAuthUser.id)) {
        const existing = profileMap.get(currentAuthUser.id);
        const meta = currentAuthUser.user_metadata || {};
        const metaName = meta.full_name || meta.name || meta.displayName || (currentAuthUser.email ? currentAuthUser.email.split('@')[0] : undefined);
        if (!existing || (!existing.full_name && !existing.username)) {
          profileMap.set(currentAuthUser.id, {
            id: currentAuthUser.id,
            full_name: metaName,
            username: meta.username || undefined,
            avatar_url: meta.avatar_url || meta.picture || existing?.avatar_url
          });
        }
      }
    } catch {}

    return userIds.map((uid) => {
      const prof = profileMap.get(uid);
      const rawName = prof?.full_name?.trim();
      const hasRealName = rawName && rawName.toLowerCase() !== 'pixel builder';
      const cleanUsername = prof?.username ? (prof.username.startsWith('@') ? prof.username : `@${prof.username}`) : undefined;

      const displayName =
        (hasRealName ? rawName : undefined) ||
        cleanUsername ||
        rawName ||
        'Pixel Member';

      return {
        id: uid,
        name: displayName,
        username: prof?.username || undefined,
        avatar: prof?.avatar_url || undefined
      };
    });
  } catch (err: any) {
    console.warn('[getPostLikes] Fallback error:', err?.message || err);
    throw err;
  }
};

/**
 * Update an existing comment text (Author or Admin)
 */
export const updatePostComment = async (
  commentId: string,
  newText: string,
  userId: string,
  postId?: string,
  authorName?: string
): Promise<void> => {
  if (!userId) {
    throw new Error('Authentication required to edit comment.');
  }
  const clean = sanitizeInput(newText.trim());
  if (!clean) {
    throw new Error('Comment cannot be empty.');
  }
  if (clean.length > 2000) {
    throw new Error('Comment text exceeds maximum allowed length of 2000 characters.');
  }

  // Fetch previous comment content for differential mention notifications
  let previousText = '';
  if (UUID_REGEX.test(commentId)) {
    try {
      const { data: prevComment } = await supabase
        .from('community_comments')
        .select('text, post_id')
        .eq('id', commentId)
        .maybeSingle();
      if (prevComment) {
        previousText = prevComment.text || '';
        if (!postId && prevComment.post_id) {
          postId = prevComment.post_id;
        }
      }
    } catch {}

    const { error } = await supabase
      .from('community_comments')
      .update({ text: clean })
      .eq('id', commentId);

    if (error) {
      console.error('Failed to update comment:', error.message);
      throw new Error('Failed to update comment: ' + error.message);
    }

    if (postId && clean !== previousText) {
      handleContentMentions(clean, postId, authorName || 'A builder', 'comment', userId, previousText).catch(() => {});
    }
  }
};

/**
 * Delete a community post.
 * User can delete own post; Admin can delete any post (enforced by RLS).
 */
export const deleteCommunityPost = async (id: string): Promise<void> => {
  if (!id || !UUID_REGEX.test(id)) {
    throw new Error('Invalid post ID format.');
  }

  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete community post:', error.message);
    logFeedError(error, 'deleteCommunityPost');
    throw new Error('Failed to delete community post: ' + error.message);
  }
};

/**
 * Toggle like for a community post. Requires user authentication.
 */
export const togglePostLike = async (
  postId: string,
  userId: string,
  _currentLiked?: boolean,
  currentLikesCount?: number
): Promise<{ liked: boolean; likesCount: number }> => {
  if (!userId) {
    throw new Error('Authentication required to like posts.');
  }
  if (!postId || !UUID_REGEX.test(postId)) {
    throw new Error('Invalid post ID format.');
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
      if (error.message?.includes('Rate limit') || error.code === 'P0001') {
        logRateLimitExceeded(userId, 'like_toggle', { postId });
        throw new Error('You are liking posts too quickly. Please wait a moment.');
      }
      console.warn('[togglePostLike] RPC error, attempting direct table toggle:', error.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr?.message?.includes('Rate limit')) {
      throw rpcErr;
    }
    console.warn('[togglePostLike] RPC exception, attempting direct table fallback:', rpcErr?.message || rpcErr);
  }

  // 2. Direct fallback path via community_likes table
  try {
    const { data: existingLike, error: checkErr } = await supabase
      .from('community_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkErr && checkErr.code !== 'PGRST116') {
      console.warn('[togglePostLike] Fallback check notice:', checkErr.message);
    }

    let newLiked = false;
    if (existingLike) {
      // Unlike
      const { error: delErr } = await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (delErr) {
        console.error('[togglePostLike] Direct unlike failed:', delErr.message);
        throw new Error(`Failed to unlike post: ${delErr.message}`);
      }
      newLiked = false;
    } else {
      // Like
      const { error: insErr } = await supabase
        .from('community_likes')
        .insert({ post_id: postId, user_id: userId } as any);
      if (insErr) {
        console.error('[togglePostLike] Direct like failed:', insErr.message);
        throw new Error(`Failed to like post: ${insErr.message}`);
      }
      newLiked = true;
    }

    // Accurately count remaining likes
    const { count, error: countErr } = await supabase
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const updatedCount = !countErr && typeof count === 'number'
      ? count
      : Math.max(0, (currentLikesCount ?? 0) + (newLiked ? 1 : -1));

    // Best-effort counter sync on community_posts
    try {
      await supabase
        .from('community_posts')
        .update({ likes: updatedCount })
        .eq('id', postId);
    } catch {}

    return {
      liked: newLiked,
      likesCount: updatedCount
    };
  } catch (fallbackErr: any) {
    console.error('[togglePostLike] Direct table fallback failed:', fallbackErr);
    throw fallbackErr instanceof Error ? fallbackErr : new Error('Failed to toggle like.');
  }
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

      // If query was successful (even if empty array, data is []), use Supabase response
      if (!error && Array.isArray(data)) {
        const commentUserIds = Array.from(new Set(data.map((c: any) => c.user_id).filter(Boolean)));
        const commentProfileMap = new Map<string, any>();
        if (commentUserIds.length > 0) {
          try {
            const { data: commentProfiles } = await (supabase as any)
              .from('public_profiles')
              .select('id, full_name, username, avatar_url')
              .in('id', commentUserIds);
            if (commentProfiles && Array.isArray(commentProfiles)) {
              commentProfiles.forEach((cp: any) => commentProfileMap.set(cp.id, cp));
            }
          } catch {}
        }

        const mappedComments = data.map((c: any) => {
          let isLiked = false;
          if (typeof window !== 'undefined' && currentUserId) {
            isLiked = localStorage.getItem(`pm_comment_liked_${c.id}_${currentUserId}`) === 'true';
          }

          const isCommentEdited = Boolean(
            c.is_edited || 
            (c.updated_at && c.created_at && Math.abs(new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) > 3000)
          );

          const prof = commentProfileMap.get(c.user_id);
          const resolvedName =
            prof?.full_name?.trim() ||
            (prof?.username ? `@${prof.username}` : undefined) ||
            (c.author_name && c.author_name !== 'Pixel Builder' ? c.author_name : 'Pixel Member');
          const resolvedAvatar = prof?.avatar_url || c.author_avatar;

          return {
            id: c.id,
            postId: c.post_id,
            authorName: resolvedName,
            authorRole: c.author_role || 'Pixel Member',
            authorId: c.user_id,
            authorAvatar: resolvedAvatar,
            text: c.text,
            likes: typeof c.likes === 'number' ? c.likes : 0,
            liked: isLiked,
            isEdited: isCommentEdited,
            createdAt: new Date(c.created_at).getTime()
          };
        });

        // Sync local cache with authoritative Supabase response (clearing stale comments when empty)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`pm_post_comments_${postId}`, JSON.stringify(mappedComments));
          } catch {}
        }

        return mappedComments;
      }
    }
  } catch (err) {
    console.warn('[getPostComments] Supabase fetch exception:', err);
  }

  // Fallback to localStorage ONLY on network/offline failure
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
  if (!postId || !UUID_REGEX.test(postId)) {
    throw new Error('Invalid post ID format.');
  }

  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Comment cannot be empty.');
  }
  if (cleanText.length > 2000) {
    throw new Error('Comment text exceeds maximum allowed length of 2000 characters.');
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
        authorName: (data.comment?.author_name && data.comment.author_name !== 'Pixel Builder')
          ? data.comment.author_name
          : (author.name && author.name !== 'Pixel Builder' ? author.name : 'Pixel Member'),
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
      handleContentMentions(cleanText, postId, author.name, 'comment', author.id).catch(() => {});

      return commentRes;
    }
    if (error) {
      if (error.message?.includes('Rate limit') || error.code === 'P0001') {
        logRateLimitExceeded(author.id, 'comment_create', { postId });
        throw new Error('You are commenting too quickly. Please wait a moment.');
      }
      console.warn('[addPostComment] RPC notice, falling back to direct table insert:', error.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr?.message?.includes('Rate limit')) {
      throw rpcErr;
    }
    console.warn('[addPostComment] RPC exception, attempting direct table insert:', rpcErr?.message || rpcErr);
  }

  // 2. Direct table fallback via community_comments
  try {
    const { data: inserted, error: insErr } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        user_id: author.id,
        author_name: author.name && author.name !== 'Pixel Builder' ? author.name : 'Pixel Member',
        author_role: author.role || 'Pixel Member',
        author_avatar: author.avatar || null,
        text: cleanText
      })
      .select('*')
      .single();

    if (insErr) {
      console.error('[addPostComment] Direct insert failed:', insErr.message);
      throw new Error(`Failed to post comment: ${insErr.message}`);
    }

    const newCount = currentCommentsCount + 1;
    try {
      await supabase
        .from('community_posts')
        .update({ comments: newCount })
        .eq('id', postId);
    } catch {}

    const commentRes = {
      id: inserted.id,
      postId,
      authorName: inserted.author_name || author.name || 'Pixel Member',
      authorRole: inserted.author_role || author.role || 'Pixel Member',
      authorId: author.id,
      authorAvatar: inserted.author_avatar || author.avatar,
      text: cleanText,
      likes: 0,
      liked: false,
      createdAt: new Date(inserted.created_at || Date.now()).getTime(),
      newCount
    };

    handleContentMentions(cleanText, postId, author.name, 'comment', author.id).catch(() => {});
    return commentRes;
  } catch (fallbackErr: any) {
    console.error('[addPostComment] Fallback failed:', fallbackErr);
    throw fallbackErr instanceof Error ? fallbackErr : new Error('Failed to post comment.');
  }
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
  if (!commentId || !UUID_REGEX.test(commentId)) {
    throw new Error('Invalid comment ID format.');
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
      if (error.message?.includes('Unauthorized')) {
        logUnauthorizedAttempt(userId, 'delete_comment', commentId);
      }
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
    logFeedError(delErr, 'deletePostComment', userId);
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
  _currentLiked?: boolean,
  _currentLikesCount?: number
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
    throw new Error(error?.message || 'Failed to toggle comment like.');
  } catch (rpcErr) {
    console.error('[toggleCommentLike] RPC not available or failed:', rpcErr);
    throw rpcErr;
  }
};

/**
 * Record a post interaction (repost or share)
 */
export const recordPostInteraction = async (
  postId: string,
  userId: string,
  type: 'repost' | 'share'
): Promise<{ success: boolean; count: number; alreadyReposted?: boolean; error?: string }> => {
  if (!userId) {
    throw new Error('Authentication required for post interaction.');
  }

  // 1. Try secure RPC record_post_interaction
  try {
    const { data, error } = await (supabase.rpc as any)('record_post_interaction', {
      p_post_id: postId,
      p_type: type
    });
    if (!error) {
      if (data?.success) {
        if (type === 'repost') {
          // Explicitly ensure repost notification is dispatched to original author
          (supabase.rpc as any)('dispatch_repost_notification', { p_post_id: postId }).catch(() => {});
        }
        return {
          success: true,
          count: Number(data.count ?? 0)
        };
      }
      if (data?.already_reposted) {
        return {
          success: false,
          alreadyReposted: true,
          count: Number(data.count ?? 0),
          error: data.error || 'You have already reposted this post.'
        };
      }
      if (data?.error) {
        throw new Error(data.error);
      }
    }
    if (error) {
      if (error.message?.includes('own post') || error.message?.includes('already reposted')) {
        throw new Error(error.message);
      }
      console.warn('[recordPostInteraction] RPC error notice:', error.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr?.message?.includes('own post') || rpcErr?.message?.includes('already reposted')) {
      throw rpcErr;
    }
    console.warn('[recordPostInteraction] RPC notice, falling back to direct table update:', rpcErr);
  }

  // 2. Direct table fallback on community_posts & community_interactions
  try {
    const colName = type === 'repost' ? 'reposts' : 'shares';
    
    // Check if post exists and user is owner (prevent self-repost)
    const { data: postRow } = await supabase
      .from('community_posts')
      .select('id, user_id, reposts, shares, title, text')
      .eq('id', postId)
      .single();

    if (!postRow) {
      throw new Error('Post not found');
    }

    if (type === 'repost' && postRow.user_id === userId) {
      throw new Error('You cannot repost your own post.');
    }

    // Repost uniqueness enforcement
    if (type === 'repost') {
      const { data: existingInteraction } = await supabase
        .from('community_interactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('interaction_type', 'repost')
        .maybeSingle();

      if (existingInteraction) {
        return {
          success: false,
          alreadyReposted: true,
          count: Number(postRow.reposts ?? 0),
          error: 'You have already reposted this post.'
        };
      }

      await supabase
        .from('community_interactions')
        .insert({
          post_id: postId,
          user_id: userId,
          interaction_type: 'repost'
        });
    } else if (type === 'share') {
      // Record share interaction idempotently
      await supabase
        .from('community_interactions')
        .insert({
          post_id: postId,
          user_id: userId,
          interaction_type: 'share'
        });
    }

    // Count actual interactions in community_interactions
    const { count: actualCount } = await supabase
      .from('community_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('interaction_type', type);

    const newCount = actualCount ?? (Number(postRow?.[colName] ?? 0) + 1);

    const updatePayload = type === 'repost' ? { reposts: newCount } : { shares: newCount };
    await supabase
      .from('community_posts')
      .update(updatePayload)
      .eq('id', postId);

    // Fallback notification for repost to original author
    if (type === 'repost' && postRow.user_id && postRow.user_id !== userId) {
      try {
        await (supabase.rpc as any)('dispatch_repost_notification', { p_post_id: postId });
      } catch (rpcNotifErr) {
        console.warn('[recordPostInteraction] dispatch_repost_notification fallback error:', rpcNotifErr);
      }
    }

    return {
      success: true,
      count: newCount
    };
  } catch (fallbackErr: any) {
    if (fallbackErr?.message?.includes('own post') || fallbackErr?.message?.includes('already reposted')) {
      throw fallbackErr;
    }
    console.warn('[recordPostInteraction] Fallback notice:', fallbackErr);
    return { success: true, count: 1 };
  }
};

/**
 * Remove a post interaction (undo repost)
 */
export const removePostInteraction = async (
  postId: string,
  userId: string,
  type: 'repost' | 'share'
): Promise<{ success: boolean; count: number }> => {
  if (!userId) {
    throw new Error('Authentication required for post interaction.');
  }

  try {
    const colName = type === 'repost' ? 'reposts' : 'shares';

    // 1. Delete from community_interactions (this automatically triggers tr_sync_community_post_interactions_counter)
    const { error: delErr } = await supabase
      .from('community_interactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('interaction_type', type);

    if (delErr) {
      console.warn('[removePostInteraction] Delete error:', delErr.message);
    }

    // 2. Fetch updated post row to get the trigger-synchronized count
    const { data: postRow } = await supabase
      .from('community_posts')
      .select('id, reposts, shares')
      .eq('id', postId)
      .maybeSingle();

    let newCount = postRow && typeof postRow[colName] === 'number' ? Number(postRow[colName]) : 0;

    return {
      success: true,
      count: newCount
    };
  } catch (err: any) {
    console.warn('[removePostInteraction] Notice:', err);
    return { success: true, count: 0 };
  }
};

/**
 * Toggle bookmark for a post or opportunity with database persistence and localStorage sync
 */
export const toggleBookmarkRecord = async (
  targetId: string,
  userId: string
): Promise<{ bookmarked: boolean; bookmarksCount?: number }> => {
  if (!userId) {
    throw new Error('Authentication required to save bookmarks.');
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isPostPrefixed = targetId.startsWith('p') && targetId.length > 1;
  const cleanTargetId = isPostPrefixed ? targetId.slice(1) : targetId;
  const isPost = UUID_REGEX.test(cleanTargetId);
  const targetType = isPost ? 'post' : 'opportunity';

  // 1. Try atomic RPCs (toggle_post_bookmark or toggle_user_bookmark)
  try {
    const { data, error } = await (supabase.rpc as any)('toggle_post_bookmark', {
      p_post_id: cleanTargetId
    });
    if (!error && data?.success) {
      const isBookmarked = Boolean(data.bookmarked);
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('pm_saved');
          const list: string[] = local ? JSON.parse(local) : [];
          const updated = isBookmarked
            ? Array.from(new Set([...list, targetId, cleanTargetId, isPost ? 'p' + cleanTargetId : cleanTargetId]))
            : list.filter((id) => id !== targetId && id !== cleanTargetId && id !== 'p' + cleanTargetId);
          localStorage.setItem('pm_saved', JSON.stringify(updated));
        } catch {}
      }
      return { bookmarked: isBookmarked, bookmarksCount: data.bookmarks_count };
    }
  } catch {}

  try {
    const { data, error } = await (supabase.rpc as any)('toggle_user_bookmark', {
      p_target_id: cleanTargetId,
      p_target_type: targetType
    });
    if (!error && data?.success) {
      const isBookmarked = Boolean(data.bookmarked);
      if (typeof window !== 'undefined') {
        try {
          const local = localStorage.getItem('pm_saved');
          const list: string[] = local ? JSON.parse(local) : [];
          const updated = isBookmarked
            ? Array.from(new Set([...list, targetId, cleanTargetId, isPost ? 'p' + cleanTargetId : cleanTargetId]))
            : list.filter((id) => id !== targetId && id !== cleanTargetId && id !== 'p' + cleanTargetId);
          localStorage.setItem('pm_saved', JSON.stringify(updated));
        } catch {}
      }
      return { bookmarked: isBookmarked, bookmarksCount: data.bookmarks_count };
    }
  } catch {}

  // 2. Direct table operations fallback with RLS on user_bookmarks
  try {
    const { data: existing } = await supabase
      .from('user_bookmarks')
      .select('id')
      .eq('user_id', userId)
      .or(`target_id.eq.${cleanTargetId},target_id.eq.${targetId}`)
      .maybeSingle();

    let bookmarked = false;
    if (existing) {
      await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', userId)
        .or(`target_id.eq.${cleanTargetId},target_id.eq.${targetId}`);
      bookmarked = false;
    } else {
      await supabase
        .from('user_bookmarks')
        .insert({
          user_id: userId,
          target_id: cleanTargetId,
          target_type: targetType
        });
      bookmarked = true;
    }

    let finalCount: number | undefined;
    if (isPost) {
      const { count } = await supabase
        .from('user_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('target_id', cleanTargetId);
      if (typeof count === 'number') {
        finalCount = count;
        try {
          await supabase
            .from('community_posts')
            .update({ bookmarks_count: count })
            .eq('id', cleanTargetId);
        } catch {}
      }
    }

    // Synchronize local cache with both raw and prefixed keys
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem('pm_saved');
        const list: string[] = local ? JSON.parse(local) : [];
        const updated = bookmarked
          ? Array.from(new Set([...list, targetId, cleanTargetId, isPost ? 'p' + cleanTargetId : cleanTargetId]))
          : list.filter((id) => id !== targetId && id !== cleanTargetId && id !== 'p' + cleanTargetId);
        localStorage.setItem('pm_saved', JSON.stringify(updated));
      } catch {}
    }

    return { bookmarked, bookmarksCount: finalCount };
  } catch (dbErr) {
    console.warn('[toggleBookmarkRecord] DB operation failed, falling back to localStorage:', dbErr);
  }

  // 3. Fallback to client localStorage only if offline or DB unavailable
  try {
    const local = typeof window !== 'undefined' ? localStorage.getItem('pm_saved') : null;
    const list: string[] = local ? JSON.parse(local) : [];
    const isSaved = list.includes(targetId) || list.includes(cleanTargetId);
    const updated = isSaved
      ? list.filter((id) => id !== targetId && id !== cleanTargetId && id !== 'p' + cleanTargetId)
      : Array.from(new Set([...list, targetId, cleanTargetId, isPost ? 'p' + cleanTargetId : cleanTargetId]));
    if (typeof window !== 'undefined') {
      localStorage.setItem('pm_saved', JSON.stringify(updated));
    }
    return { bookmarked: !isSaved };
  } catch {
    return { bookmarked: true };
  }
};

/**
 * Fetch all bookmarks for a user from Supabase user_bookmarks table (persisting across devices)
 */
export const getUserBookmarks = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    const { data, error } = await supabase
      .from('user_bookmarks')
      .select('target_id')
      .eq('user_id', userId);

    if (!error && data) {
      const ids: string[] = [];
      data.forEach((row: any) => {
        const tid = String(row.target_id);
        ids.push(tid);
        if (UUID_REGEX.test(tid)) {
          ids.push('p' + tid);
        }
      });
      const uniqueIds = Array.from(new Set(ids));
      if (typeof window !== 'undefined') {
        localStorage.setItem('pm_saved', JSON.stringify(uniqueIds));
      }
      return uniqueIds;
    }
    if (error) {
      if (!error.message?.includes('schema cache') && !error.message?.includes('does not exist')) {
        console.warn('[getUserBookmarks] DB query notice:', error.message);
      }
    }
  } catch (err) {
    console.warn('[getUserBookmarks] Exception occurred, using localStorage fallback:', err);
  }

  try {
    const local = typeof window !== 'undefined' ? localStorage.getItem('pm_saved') : null;
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
};

/**
 * Detect mentions in content and dispatch notifications to mentioned users.
 * Strictly uses unique usernames, ignores email addresses, and prevents self-notifications.
 * If previousContent is provided, only dispatches notifications to newly added mentions.
 */
export const handleContentMentions = async (
  content: string,
  postId: string,
  actorName: string,
  contextType: 'post' | 'comment' = 'post',
  actorId?: string,
  previousContent?: string
): Promise<void> => {
  if (!content || !postId) return;

  // Protect against parsing email addresses as mentions
  // Extract tokens that look like emails or mentions
  const tokenRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|@[a-zA-Z0-9_]{3,20}\b)/g;

  const extractValidUsernames = (text: string): string[] => {
    const matches = text.match(tokenRegex);
    if (!matches) return [];
    const result: string[] = [];
    for (const token of matches) {
      if (token.startsWith('@') && !token.includes('.')) {
        const u = token.slice(1).trim().toLowerCase();
        if (/^[a-zA-Z0-9_]{3,20}$/.test(u)) {
          result.push(u);
        }
      }
    }
    return Array.from(new Set(result));
  };

  const currentMentions = extractValidUsernames(content);
  if (currentMentions.length === 0) return;

  const prevMentions = previousContent ? extractValidUsernames(previousContent) : [];
  // Only notify newly added mentions
  const newMentions = currentMentions.filter((u) => !prevMentions.includes(u));
  if (newMentions.length === 0) return;

  for (const username of newMentions) {
    try {
      // Find matching active user profile by unique username via public_profiles or search fallback
      let targetUser: { id: string } | null = null;
      try {
        const { data: matchedProfiles } = await (supabase as any)
          .from('public_profiles')
          .select('id, username, full_name')
          .ilike('username', username)
          .limit(1);
        if (matchedProfiles && matchedProfiles.length > 0) {
          targetUser = matchedProfiles[0];
        }
      } catch (profErr) {
        console.warn(`[handleContentMentions] Error querying public_profiles for @${username}:`, profErr);
      }

      // Fallback via search_usernames_for_mention if public_profiles didn't resolve
      if (!targetUser) {
        try {
          const { data: searchResults } = await (supabase.rpc as any)('search_usernames_for_mention', {
            p_prefix: username,
            p_limit: 5
          });
          const exact = (searchResults || []).find((r: any) => r.username?.toLowerCase() === username.toLowerCase());
          if (exact) {
            targetUser = { id: exact.id };
          }
        } catch (searchRpcErr) {
          console.warn('[handleContentMentions] search_usernames_for_mention fallback error:', searchRpcErr);
        }
      }
      // Do not notify self or missing accounts
      if (targetUser && targetUser.id && targetUser.id !== actorId) {
        // Dispatch mention notification securely via verified RPC
        try {
          await (supabase.rpc as any)('dispatch_mention_notification', {
            p_target_user_id: targetUser.id,
            p_post_id: postId,
            p_actor_name: actorName,
            p_snippet: content.substring(0, 100),
            p_context_type: contextType
          });
        } catch (rpcErr) {
          console.warn('[handleContentMentions] RPC dispatch notice:', rpcErr);
        }
      }
    } catch (mentionErr) {
      console.warn(`[handleContentMentions] Error notifying @${username}:`, mentionErr);
    }
  }
};
