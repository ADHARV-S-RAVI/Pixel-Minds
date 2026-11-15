-- ==============================================================================
-- Migration: Correct Pixel Rewards, Restore Bookmarks & Like Notifications
-- Date: 2026-11-14
-- Purpose:
--   1. PIXEL REWARDS POLICY:
--      - Keep post creation rewards only:
--        * Standard post: +10 Pixels
--        * Hackathon post: +15 Pixels
--      - Remove ALL Pixel rewards for:
--        * Liking posts
--        * Receiving likes
--        * Posting comments
--        * Receiving comments
--        * Reposting or receiving reposts
--      - Preserve existing opportunity registration rewards (+10), referral rewards (+25),
--        and administrative adjustments.
--   2. RESTORE BOOKMARKS (Cross-device persistence):
--      - Create public.user_bookmarks table with unique (user_id, target_id) constraint.
--      - Support bookmarking both opportunities and community posts.
--      - Secure RLS policies enabling authenticated users to view, insert, and delete their own bookmarks.
--      - Provide atomic toggle_user_bookmark RPC.
--   3. RESTORE LIKE NOTIFICATIONS:
--      - When a user likes another user's post, dispatch a notification to the post author.
--      - Prevent self-notifications and duplicate notifications within a 5-minute window.
--      - Ensure unliking does not dispatch notifications.
--   4. SCHEMA COMPATIBILITY:
--      - Use actual column names (e.g. community_posts.text, not title).
-- ==============================================================================

-- 1. Create user_bookmarks table for cross-device bookmark persistence
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'post' CHECK (target_type IN ('post', 'opportunity')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, target_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Reset and recreate strict RLS policies on user_bookmarks
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.user_bookmarks;
  DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.user_bookmarks;
  DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.user_bookmarks;
  DROP POLICY IF EXISTS "Admins can view all bookmarks" ON public.user_bookmarks;
END $$;

CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON public.user_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookmarks" ON public.user_bookmarks
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_target ON public.user_bookmarks(target_id, target_type);

-- 2. Atomic Bookmark Toggle RPC
CREATE OR REPLACE FUNCTION public.toggle_user_bookmark(
  p_target_id TEXT,
  p_target_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_bookmarked BOOLEAN;
  v_type TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_target_id IS NULL OR length(btrim(p_target_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target ID required');
  END IF;

  -- Determine target type if not explicitly supplied
  IF p_target_type IS NOT NULL AND p_target_type IN ('post', 'opportunity') THEN
    v_type := p_target_type;
  ELSE
    IF p_target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_type := 'post';
    ELSE
      v_type := 'opportunity';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_target_id) THEN
    DELETE FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_target_id;
    v_bookmarked := false;
  ELSE
    INSERT INTO public.user_bookmarks (user_id, target_id, target_type)
    VALUES (v_user_id, p_target_id, v_type)
    ON CONFLICT (user_id, target_id) DO NOTHING;
    v_bookmarked := true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bookmarked', v_bookmarked,
    'target_id', p_target_id,
    'target_type', v_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_user_bookmark(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_user_bookmark(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_user_bookmark(TEXT, TEXT) TO authenticated, service_role;

-- Backward compatibility wrapper for toggle_post_bookmark
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.toggle_user_bookmark(p_post_id, 'post');
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_bookmark(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_post_bookmark(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_bookmark(TEXT) TO authenticated, service_role;

-- 3. Updated reward_community_post_creation: Retains post creation rewards (+10 standard, +15 hackathon)
-- Uses community_posts.text (not title) and row locking FOR UPDATE.
CREATE OR REPLACE FUNCTION public.reward_community_post_creation(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_post RECORD;
  v_is_hackathon BOOLEAN := FALSE;
  v_amount INTEGER;
  v_action TEXT;
  v_reason TEXT;
  v_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_post_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post ID required');
  END IF;

  -- Lock post row to avoid race conditions
  SELECT id, user_id, category, text, status INTO v_post
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

  -- Only published posts are eligible
  IF v_post.status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only published posts are eligible for creation rewards');
  END IF;

  -- Classification: Only posts explicitly categorized or titled as hackathon receive 15 Pixels
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

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to record post creation reward: %', COALESCE(v_res->>'error', 'Unknown ledger error');
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reward_community_post_creation(UUID) TO authenticated, service_role;

-- 4. Updated toggle_community_post_like:
--    - Dispatches like notifications to post author
--    - Awards NO Pixels to anyone
--    - Synchronizes like counter directly from community_likes
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
  v_liker_name TEXT;
  v_notif_id UUID;
  v_link TEXT;
  v_notif_title TEXT;
  v_notif_message TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.';
  END IF;

  -- Row-level lock on the post row to prevent race conditions
  SELECT user_id, text, status INTO v_post_author_id, v_post_text, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Moderation/visibility check
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

    -- Dispatch notification to post author (NO PIXELS AWARDED)
    -- Only notify if liking another user's post
    IF v_post_author_id IS NOT NULL AND v_post_author_id IS DISTINCT FROM v_user_id THEN
      SELECT COALESCE(full_name, 'Someone') INTO v_liker_name
      FROM public.profiles
      WHERE id = v_user_id;

      IF v_liker_name IS NULL OR length(btrim(v_liker_name)) = 0 THEN
        v_liker_name := 'Someone';
      END IF;

      v_link := '/feed#' || p_post_id::text;
      v_notif_title := format('%s liked your post', v_liker_name);
      v_notif_message := format('"%s"', substring(COALESCE(v_post_text, 'Community post') from 1 for 100));

      -- Avoid duplicate notification for same post and user within last 5 minutes
      IF NOT EXISTS (
        SELECT 1 FROM public.user_notifications un
        JOIN public.notifications n ON n.id = un.notification_id
        WHERE un.user_id = v_post_author_id
          AND n.link = v_link
          AND n.type = 'community'
          AND un.created_at >= now() - INTERVAL '5 minutes'
      ) THEN
        INSERT INTO public.notifications (
          title,
          message,
          type,
          link,
          created_by
        ) VALUES (
          v_notif_title,
          v_notif_message,
          'community',
          v_link,
          v_user_id
        ) RETURNING id INTO v_notif_id;

        INSERT INTO public.user_notifications (
          user_id,
          notification_id
        ) VALUES (
          v_post_author_id,
          v_notif_id
        );
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

-- 5. Updated add_community_post_comment:
--    - Adds comment with 2000-char limit
--    - Awards NO Pixels to commenter or post author
--    - Synchronizes comment counter directly from community_comments
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

  -- Row-level lock on the post row
  SELECT user_id, text, status INTO v_post_author_id, v_post_text, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Moderation/visibility check
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

  -- NO Pixel rewards awarded for commenting or receiving comments

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
    'comment', row_to_json(v_comment_row),
    'comments_count', COALESCE(v_new_comments, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- 6. Inform PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

