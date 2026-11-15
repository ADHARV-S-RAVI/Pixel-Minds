-- ==============================================================================
-- Corrective Migration: Align Feed Functions with Actual Database Schema
-- Date: 2026-11-14
-- Purpose:
--   1. Replaces community_posts.title references with the actual community_posts.text column
--      in reward_community_post_creation(), toggle_community_post_like(), and add_community_post_comment().
--   2. Preserves exact security definer settings (SET search_path = ''), row-level locks (FOR UPDATE),
--      permissions, reward amounts, and truncation/description formatting.
--   3. Reloads PostgREST OpenAPI schema cache.
-- ==============================================================================

-- 1. Correct reward_community_post_creation
CREATE OR REPLACE FUNCTION public.reward_community_post_creation(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post RECORD;
  v_is_hackathon BOOLEAN := FALSE;
  v_amount INTEGER;
  v_action TEXT;
  v_reason TEXT;
  v_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Lock post row using actual schema columns (no title column)
  SELECT id, user_id, text, category, status INTO v_post
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Null-safe ownership check using IS DISTINCT FROM
  IF v_post.user_id IS DISTINCT FROM v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only the post author can receive creation rewards');
  END IF;

  -- Prevent pending, hidden, draft, or archived posts from receiving creation rewards
  IF v_post.status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only published posts are eligible for creation rewards');
  END IF;

  -- Reward classification: Only posts explicitly shared as hackathons receive 15 Pixels
  IF v_post.category = 'Upcoming Hackathon' 
     OR v_post.category ILIKE '%hackathon%' 
     OR v_post.text ILIKE 'Upcoming Hackathon:%' THEN
    v_is_hackathon := TRUE;
  END IF;

  v_amount := CASE WHEN v_is_hackathon THEN 15 ELSE 10 END;
  v_action := CASE WHEN v_is_hackathon THEN 'Shared Hackathon (+15 Pixels)' ELSE 'Created Post (+10 Pixels)' END;
  v_reason := CASE 
    WHEN v_is_hackathon THEN 'Shared upcoming hackathon: "' || substring(COALESCE(v_post.text, 'Hackathon') from 1 for 50) || '"'
    ELSE 'Created community post: "' || substring(COALESCE(v_post.text, 'Community Post') from 1 for 50) || '"'
  END;

  v_res := public.record_pixel_transaction_internal(
    v_user_id,
    v_amount,
    v_action,
    v_reason,
    'earn',
    'feed_post_' || p_post_id::text
  );

  -- Required reward failures must raise an exception to maintain atomicity
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to record post creation reward: %', COALESCE(v_res->>'error', 'Unknown ledger error');
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reward_community_post_creation(UUID) TO authenticated, service_role;

-- 2. Correct toggle_community_post_like
CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_new_likes INTEGER;
  v_post_author_id UUID;
  v_post_text TEXT;
  v_post_status TEXT;
  v_reward_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.';
  END IF;

  -- Row-level lock on the post row using actual schema columns (no title column)
  SELECT user_id, text, status INTO v_post_author_id, v_post_text, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Preserve moderation/visibility check
  IF v_post_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Cannot like a post that is not published.';
  END IF;

  -- Atomic toggle
  DELETE FROM public.community_likes
  WHERE post_id = p_post_id AND user_id::text = v_user_id::text;

  IF FOUND THEN
    v_liked := false;
  ELSE
    INSERT INTO public.community_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := true;

    -- Secure cross-user reward: reward author (+1 Pixel) if not liking own post (safe IS DISTINCT FROM check)
    IF v_post_author_id IS NOT NULL AND v_post_author_id IS DISTINCT FROM v_user_id THEN
      v_reward_res := public.record_pixel_transaction_internal(
        v_post_author_id,
        1,
        'Like Received (+1 Pixel)',
        'Received a like on post: "' || substring(COALESCE(v_post_text, 'Community Post') from 1 for 50) || '"',
        'earn',
        'feed_like_' || p_post_id::text || '_' || v_user_id::text
      );

      -- Do not silently ignore failed reward: raise exception to roll back like toggle
      IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'Failed to record like reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
      END IF;
    END IF;
  END IF;

  -- Synchronize likes counter directly from actual records to prevent drift
  UPDATE public.community_posts
  SET likes = (
    SELECT count(*)::integer
    FROM public.community_likes
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id
  RETURNING likes INTO v_new_likes;

  RETURN jsonb_build_object(
    'success', true,
    'liked', v_liked,
    'likes_count', COALESCE(v_new_likes, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_community_post_like(UUID) TO authenticated, service_role;

-- 3. Correct add_community_post_comment
CREATE OR REPLACE FUNCTION public.add_community_post_comment(
  p_post_id UUID,
  p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_trimmed_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  v_author_avatar TEXT;
  v_comment_row public.community_comments%ROWTYPE;
  v_new_comments INTEGER;
  v_post_author_id UUID;
  v_post_text TEXT;
  v_post_status TEXT;
  v_reward_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment on posts.';
  END IF;

  v_trimmed_text := btrim(p_text);
  IF v_trimmed_text IS NULL OR length(v_trimmed_text) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty.';
  END IF;

  IF length(v_trimmed_text) > 2000 THEN
    RAISE EXCEPTION 'Comment text exceeds maximum allowed length of 2000 characters.';
  END IF;

  -- Row-level lock on the post row using actual schema columns (no title column)
  SELECT user_id, text, status INTO v_post_author_id, v_post_text, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Preserve moderation/visibility check
  IF v_post_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Cannot comment on a post that is not published.';
  END IF;

  -- Resolve author profile details
  SELECT
    COALESCE(full_name, 'Pixel Builder'),
    COALESCE(role, 'Pixel Member'),
    avatar_url
  INTO
    v_author_name,
    v_author_role,
    v_author_avatar
  FROM public.profiles
  WHERE id::text = v_user_id::text;

  IF v_author_name IS NULL THEN
    v_author_name := 'Pixel Builder';
  END IF;

  -- Insert comment
  INSERT INTO public.community_comments (
    post_id,
    user_id,
    author_name,
    author_role,
    author_avatar,
    text
  )
  VALUES (
    p_post_id,
    v_user_id,
    v_author_name,
    v_author_role,
    v_author_avatar,
    v_trimmed_text
  )
  RETURNING * INTO v_comment_row;

  -- 1. Reward commenter (+2 Pixels) via internal RPC with idempotency
  v_reward_res := public.record_pixel_transaction_internal(
    v_user_id,
    2,
    'Comment Posted (+2 Pixels)',
    'Commented on discussion: "' || substring(COALESCE(v_post_text, 'Community Post') from 1 for 50) || '"',
    'earn',
    'feed_comment_made_' || v_comment_row.id::text
  );

  IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to record commenter reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
  END IF;

  -- 2. Secure cross-user reward: reward post author (+2 Pixels) if not commenting on own post (safe IS DISTINCT FROM check)
  IF v_post_author_id IS NOT NULL AND v_post_author_id IS DISTINCT FROM v_user_id THEN
    v_reward_res := public.record_pixel_transaction_internal(
      v_post_author_id,
      2,
      'Comment Received (+2 Pixels)',
      'Received comment on post: "' || substring(COALESCE(v_post_text, 'Community Post') from 1 for 50) || '"',
      'earn',
      'feed_comment_received_' || v_comment_row.id::text
    );

    IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Failed to record post author comment reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
    END IF;
  END IF;

  -- Synchronize comments counter directly from actual records
  UPDATE public.community_posts
  SET comments = (
    SELECT count(*)::integer
    FROM public.community_comments
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id
  RETURNING comments INTO v_new_comments;

  RETURN jsonb_build_object(
    'success', true,
    'comment', jsonb_build_object(
      'id', v_comment_row.id,
      'author_name', v_comment_row.author_name,
      'author_role', v_comment_row.author_role,
      'author_avatar', v_comment_row.author_avatar,
      'text', v_comment_row.text,
      'created_at', v_comment_row.created_at
    ),
    'comments_count', COALESCE(v_new_comments, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- 4. Reload PostgREST OpenAPI schema cache
NOTIFY pgrst, 'reload schema';

