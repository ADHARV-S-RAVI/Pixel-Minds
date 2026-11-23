-- ==============================================================================
-- PHASE 5: FEED, POST CREATION AND COMMENTS SECURITY HARDENING
-- Migration: 20261122240000_phase5_feed_security_hardening.sql
-- Description:
--   1. Seed additional server-controlled rate limit policies (report_create, post_update, comment_update).
--   2. Enforce suspension checks and strict server-verified identity across all feed write paths.
--   3. Implement AFTER INSERT/DELETE counter synchronization triggers for comments, likes, and interactions.
--   4. Hardened RLS policies for community_posts, community_comments, community_interactions, and reports.
--   5. Hardened dispatch_mention_notification RPC with search_path safety and server-derived actor identity.
--   6. Report abuse prevention trigger and rate-limiting.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SERVER-CONTROLLED RATE LIMIT POLICIES
-- ------------------------------------------------------------------------------
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds) VALUES
  ('post_create',          5,   60),
  ('post_update',         10,   60),
  ('comment_create',      15,   60),
  ('comment_update',      20,   60),
  ('like_toggle',         40,   60),
  ('comment_like_toggle', 40,   60),
  ('bookmark_toggle',     30,   60),
  ('post_interaction',    30,   60),
  ('mention_notification',20,   60),
  ('report_create',       10, 3600)
ON CONFLICT (action_type) DO UPDATE SET
  max_requests = EXCLUDED.max_requests,
  window_seconds = EXCLUDED.window_seconds;

-- ------------------------------------------------------------------------------
-- 2. HARDEN COMMUNITY_POSTS INSERT TRIGGER & RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_and_protect_community_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_author_name TEXT;
  v_author_role TEXT;
BEGIN
  -- Service role bypasses trigger
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create community posts.' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_admin();

  -- Suspension check: suspended accounts cannot post
  IF NOT v_is_admin AND public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot create posts.' USING ERRCODE = '42501';
  END IF;

  -- 1. Strictly bind ownership to server-verified authenticated user
  NEW.user_id := v_caller;

  -- 2. Non-admin impersonation & privilege escalation prevention
  IF NOT v_is_admin THEN
    SELECT COALESCE(full_name, username, 'Pixel Member'), COALESCE(role, 'Pixel Member')
    INTO v_author_name, v_author_role
    FROM public.profiles
    WHERE id = v_caller;

    NEW.author_name := COALESCE(v_author_name, 'Pixel Member');
    NEW.author_role := COALESCE(v_author_role, 'Pixel Member');
    NEW.source := 'user';
    NEW.featured := FALSE;
    NEW.status := 'published';
    NEW.likes := 0;
    NEW.comments := 0;
    NEW.reposts := 0;
    NEW.shares := 0;
    NEW.bookmarks_count := 0;
  ELSE
    -- Admin defaults
    NEW.author_name := COALESCE(NULLIF(trim(NEW.author_name), ''), 'Pixel Minds Official');
    NEW.author_role := COALESCE(NULLIF(trim(NEW.author_role), ''), 'Admin');
    NEW.source := COALESCE(NEW.source, 'admin');
    NEW.status := COALESCE(NEW.status, 'published');
    NEW.likes := 0;
    NEW.comments := 0;
    NEW.reposts := 0;
    NEW.shares := 0;
    NEW.bookmarks_count := 0;
  END IF;

  -- 3. Content and Length Validation
  NEW.title := trim(COALESCE(NEW.title, ''));
  NEW.text := trim(COALESCE(NEW.text, ''));

  IF NEW.title = '' AND NEW.text != '' THEN
    NEW.title := substring(NEW.text from '^([^\n]+)');
    IF length(NEW.title) > 100 THEN
      NEW.title := substring(NEW.title from 1 for 97) || '...';
    END IF;
  END IF;

  IF NEW.title = '' THEN
    RAISE EXCEPTION 'Post title is required and cannot be empty.' USING ERRCODE = 'P0001';
  END IF;

  IF length(NEW.title) > 150 THEN
    RAISE EXCEPTION 'Post title exceeds maximum length of 150 characters.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.text = '' THEN
    NEW.text := NEW.title;
  END IF;

  IF length(NEW.text) > 5000 THEN
    RAISE EXCEPTION 'Post content exceeds maximum length of 5000 characters.' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Category Allowlist
  IF NEW.category IS NULL OR NEW.category NOT IN (
    'Experience', 'Achievement', 'Idea', 'Learning', 'General', 'Upcoming Hackathon', 'Hackathon'
  ) THEN
    NEW.category := 'General';
  END IF;

  -- 5. Safe URL Handling
  IF NEW.link IS NOT NULL AND trim(NEW.link) != '' THEN
    NEW.link := trim(NEW.link);
    IF length(NEW.link) > 2048 OR NEW.link !~* '^https?://[a-zA-Z0-9.-]+' THEN
      RAISE EXCEPTION 'Invalid link URL: Must be a valid HTTP or HTTPS address.' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    NEW.link := NULL;
  END IF;

  IF NEW.image_url IS NOT NULL AND trim(NEW.image_url) != '' THEN
    NEW.image_url := trim(NEW.image_url);
    IF length(NEW.image_url) > 2048 OR NEW.image_url !~* '^https?://[a-zA-Z0-9.-]+' THEN
      NEW.image_url := NULL;
    END IF;
  ELSE
    NEW.image_url := NULL;
  END IF;

  -- 6. Server-side Rate Limit
  IF NOT public.check_and_increment_rate_limit(v_caller, 'post_create', 5, 60) THEN
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      'warning',
      jsonb_build_object('action', 'post_create', 'limit', 5, 'window_seconds', 60)
    );
    RAISE EXCEPTION 'Rate limit exceeded: You are creating posts too quickly. Please wait a moment before trying again.' USING ERRCODE = 'P0001';
  END IF;

  NEW.created_at := timezone('utc'::text, now());
  NEW.updated_at := NEW.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_and_protect_community_post_insert ON public.community_posts;
CREATE TRIGGER tr_validate_and_protect_community_post_insert
BEFORE INSERT ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_protect_community_post_insert();

-- ------------------------------------------------------------------------------
-- 3. HARDEN COMMUNITY_POSTS UPDATE TRIGGER & RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_community_posts_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Service role and verified admins retain full moderation access
  IF (auth.role() = 'service_role') OR public.is_admin() THEN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- Trusted internal RPCs signal via transaction-local GUC flag
  IF current_setting('app.trusted_counter_update', true) = 'true' THEN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot modify post ID.' USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id::text IS DISTINCT FROM OLD.user_id::text THEN
      RAISE EXCEPTION 'Cannot modify post ownership (user_id).' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- Anonymous cannot update
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to edit posts.' USING ERRCODE = '42501';
  END IF;

  -- Suspension check
  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot edit posts.' USING ERRCODE = '42501';
  END IF;

  -- Ownership verification: caller must be author
  IF OLD.user_id IS DISTINCT FROM v_caller THEN
    PERFORM public.log_security_event(
      'unauthorized_post_edit_attempt',
      'warning',
      jsonb_build_object('post_id', OLD.id, 'owner_id', OLD.user_id, 'caller_id', v_caller)
    );
    RAISE EXCEPTION 'You are not authorized to edit this post.' USING ERRCODE = '42501';
  END IF;

  -- 1. Ownership & Identity Protection
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify post ID.' USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id::text IS DISTINCT FROM OLD.user_id::text THEN
    RAISE EXCEPTION 'Cannot modify post ownership (user_id).' USING ERRCODE = '42501';
  END IF;

  -- 2. Admin & Moderation Controls Protection
  IF NEW.source IS DISTINCT FROM OLD.source THEN
    RAISE EXCEPTION 'Cannot modify post source. Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF NEW.featured IS DISTINCT FROM OLD.featured THEN
    RAISE EXCEPTION 'Cannot modify featured status. Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify post status. Admin moderation required.' USING ERRCODE = '42501';
  END IF;

  IF NEW.author_role IS DISTINCT FROM OLD.author_role THEN
    RAISE EXCEPTION 'Cannot modify author role. Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF NEW.author_name IS DISTINCT FROM OLD.author_name THEN
    RAISE EXCEPTION 'Cannot modify author name on existing posts.' USING ERRCODE = '42501';
  END IF;

  -- 3. Interaction Counters Protection
  IF NEW.likes IS DISTINCT FROM OLD.likes THEN
    RAISE EXCEPTION 'Cannot directly modify like count. Use like RPC.' USING ERRCODE = '42501';
  END IF;

  IF NEW.comments IS DISTINCT FROM OLD.comments THEN
    RAISE EXCEPTION 'Cannot directly modify comment count. Use comment RPC.' USING ERRCODE = '42501';
  END IF;

  IF NEW.reposts IS DISTINCT FROM OLD.reposts THEN
    RAISE EXCEPTION 'Cannot directly modify repost count.' USING ERRCODE = '42501';
  END IF;

  IF NEW.shares IS DISTINCT FROM OLD.shares THEN
    RAISE EXCEPTION 'Cannot directly modify share count.' USING ERRCODE = '42501';
  END IF;

  IF NEW.bookmarks_count IS DISTINCT FROM OLD.bookmarks_count THEN
    RAISE EXCEPTION 'Cannot directly modify bookmark count.' USING ERRCODE = '42501';
  END IF;

  -- 4. Audit Timestamp Protection
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify post created_at timestamp.' USING ERRCODE = '42501';
  END IF;

  -- 5. Content Validation on Update
  IF NEW.title IS NOT NULL THEN
    NEW.title := trim(NEW.title);
    IF NEW.title = '' THEN
      RAISE EXCEPTION 'Post title cannot be empty.' USING ERRCODE = 'P0001';
    END IF;
    IF length(NEW.title) > 150 THEN
      RAISE EXCEPTION 'Post title exceeds maximum length of 150 characters.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NEW.text IS NOT NULL THEN
    NEW.text := trim(NEW.text);
    IF NEW.text = '' THEN
      RAISE EXCEPTION 'Post text cannot be empty.' USING ERRCODE = 'P0001';
    END IF;
    IF length(NEW.text) > 5000 THEN
      RAISE EXCEPTION 'Post text exceeds maximum length of 5000 characters.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF NEW.link IS NOT NULL AND trim(NEW.link) != '' THEN
    NEW.link := trim(NEW.link);
    IF length(NEW.link) > 2048 OR NEW.link !~* '^https?://[a-zA-Z0-9.-]+' THEN
      RAISE EXCEPTION 'Invalid link URL: Must be a valid HTTP or HTTPS address.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 6. Rate Limit on Updates (10/min)
  IF NOT public.check_and_increment_rate_limit(v_caller, 'post_update', 10, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded: You are editing posts too quickly. Please wait a moment.' USING ERRCODE = 'P0001';
  END IF;

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_community_posts_fields ON public.community_posts;
CREATE TRIGGER tr_protect_community_posts_fields
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_posts_fields();

-- Update community_posts RLS policies
DROP POLICY IF EXISTS "community_posts_insert_policy" ON public.community_posts;
CREATE POLICY "community_posts_insert_policy"
ON public.community_posts FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id AND (source IS NULL OR source = 'user') AND (featured IS NOT TRUE) AND NOT public.is_current_user_suspended())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "community_posts_update_policy" ON public.community_posts;
CREATE POLICY "community_posts_update_policy"
ON public.community_posts FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended())
  OR public.is_admin()
)
WITH CHECK (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "community_posts_delete_policy" ON public.community_posts;
CREATE POLICY "community_posts_delete_policy"
ON public.community_posts FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended())
  OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- 4. HARDEN COMMENTS TRIGGER, ATOMIC COUNTERS & RLS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_and_protect_community_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_author_name TEXT;
  v_author_role TEXT;
  v_author_avatar TEXT;
BEGIN
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to interact with comments.' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_admin();

  IF TG_OP = 'INSERT' THEN
    -- Reject suspended users
    IF NOT v_is_admin AND public.is_current_user_suspended() THEN
      RAISE EXCEPTION 'Your account has been suspended. You cannot post comments.' USING ERRCODE = '42501';
    END IF;

    -- Bind identity strictly to server caller
    NEW.user_id := v_caller;

    IF NOT v_is_admin THEN
      SELECT
        COALESCE(full_name, username, 'Pixel Member'),
        COALESCE(role, 'Pixel Member'),
        avatar_url
      INTO v_author_name, v_author_role, v_author_avatar
      FROM public.profiles
      WHERE id = v_caller;

      NEW.author_name   := COALESCE(v_author_name, 'Pixel Member');
      NEW.author_role   := COALESCE(v_author_role, 'Pixel Member');
      NEW.author_avatar := v_author_avatar;
      NEW.likes := 0;
    ELSE
      NEW.author_name := COALESCE(NULLIF(trim(NEW.author_name), ''), 'Pixel Minds Admin');
      NEW.author_role := COALESCE(NULLIF(trim(NEW.author_role), ''), 'Admin');
      NEW.likes := 0;
    END IF;

    -- Validate comment text
    NEW.text := trim(COALESCE(NEW.text, ''));
    IF NEW.text = '' THEN
      RAISE EXCEPTION 'Comment cannot be empty.' USING ERRCODE = 'P0001';
    END IF;
    IF length(NEW.text) > 2000 THEN
      RAISE EXCEPTION 'Comment exceeds maximum allowed length of 2000 characters.' USING ERRCODE = 'P0001';
    END IF;

    -- Rate Limit (15 comments per 60 seconds)
    IF NOT public.check_and_increment_rate_limit(v_caller, 'comment_create', 15, 60) THEN
      PERFORM public.log_security_event(
        'rate_limit_exceeded',
        'warning',
        jsonb_build_object('action', 'comment_create', 'limit', 15, 'window_seconds', 60)
      );
      RAISE EXCEPTION 'Rate limit exceeded: You are commenting too quickly. Please wait a moment.' USING ERRCODE = 'P0001';
    END IF;

    NEW.created_at := timezone('utc'::text, now());
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Allow trusted counter updates
    IF current_setting('app.trusted_counter_update', true) = 'true' THEN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Cannot modify comment ID.' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    IF NOT v_is_admin THEN
      -- Suspension check
      IF public.is_current_user_suspended() THEN
        RAISE EXCEPTION 'Your account has been suspended. You cannot edit comments.' USING ERRCODE = '42501';
      END IF;

      -- Ownership verification
      IF OLD.user_id IS DISTINCT FROM v_caller THEN
        RAISE EXCEPTION 'Unauthorized to edit this comment.' USING ERRCODE = '42501';
      END IF;

      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Cannot modify comment ID.' USING ERRCODE = '42501';
      END IF;
      IF NEW.user_id::text IS DISTINCT FROM OLD.user_id::text THEN
        RAISE EXCEPTION 'Cannot transfer comment ownership.' USING ERRCODE = '42501';
      END IF;
      IF NEW.post_id::text IS DISTINCT FROM OLD.post_id::text THEN
        RAISE EXCEPTION 'Cannot move comment to another post.' USING ERRCODE = '42501';
      END IF;
      IF NEW.likes IS DISTINCT FROM OLD.likes THEN
        RAISE EXCEPTION 'Cannot modify comment likes count directly.' USING ERRCODE = '42501';
      END IF;
      IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'Cannot modify comment timestamp.' USING ERRCODE = '42501';
      END IF;
      IF NEW.author_name IS DISTINCT FROM OLD.author_name OR NEW.author_role IS DISTINCT FROM OLD.author_role THEN
        RAISE EXCEPTION 'Cannot modify author profile on existing comment.' USING ERRCODE = '42501';
      END IF;

      -- Rate Limit on Updates
      IF NOT public.check_and_increment_rate_limit(v_caller, 'comment_update', 20, 60) THEN
        RAISE EXCEPTION 'Rate limit exceeded: You are editing comments too quickly. Please wait a moment.' USING ERRCODE = 'P0001';
      END IF;
    END IF;

    NEW.text := trim(COALESCE(NEW.text, ''));
    IF NEW.text = '' THEN
      RAISE EXCEPTION 'Comment cannot be empty.' USING ERRCODE = 'P0001';
    END IF;
    IF length(NEW.text) > 2000 THEN
      RAISE EXCEPTION 'Comment exceeds maximum allowed length of 2000 characters.' USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_and_protect_community_comment ON public.community_comments;
CREATE TRIGGER tr_validate_and_protect_community_comment
BEFORE INSERT OR UPDATE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_protect_community_comment();

-- Atomic post comments counter synchronization trigger
CREATE OR REPLACE FUNCTION public.sync_community_post_comments_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_post_id UUID;
  v_fresh_count INTEGER;
BEGIN
  v_target_post_id := COALESCE(NEW.post_id, OLD.post_id);

  IF v_target_post_id IS NOT NULL THEN
    SELECT count(*)::integer INTO v_fresh_count
    FROM public.community_comments
    WHERE post_id = v_target_post_id;

    PERFORM set_config('app.trusted_counter_update', 'true', true);
    UPDATE public.community_posts
    SET comments = v_fresh_count
    WHERE id = v_target_post_id;
    PERFORM set_config('app.trusted_counter_update', 'false', true);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_community_post_comments_counter ON public.community_comments;
CREATE TRIGGER tr_sync_community_post_comments_counter
AFTER INSERT OR DELETE ON public.community_comments
FOR EACH ROW
EXECUTE FUNCTION public.sync_community_post_comments_counter();

-- Comments RLS policies
DROP POLICY IF EXISTS "community_comments_insert_policy" ON public.community_comments;
CREATE POLICY "community_comments_insert_policy"
ON public.community_comments FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND NOT public.is_current_user_suspended()
);

DROP POLICY IF EXISTS "community_comments_update_policy" ON public.community_comments;
CREATE POLICY "community_comments_update_policy"
ON public.community_comments FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended()) OR public.is_admin()
)
WITH CHECK (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended()) OR public.is_admin()
);

DROP POLICY IF EXISTS "community_comments_delete_policy" ON public.community_comments;
DROP POLICY IF EXISTS "Authors or admins can delete comments" ON public.community_comments;
CREATE POLICY "community_comments_delete_policy"
ON public.community_comments FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended()) OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- 5. HARDEN INTERACTIONS (REPOSTS & SHARES) & ATOMIC COUNTERS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_community_interactions_type'
      AND conrelid = 'public.community_interactions'::regclass
  ) THEN
    ALTER TABLE public.community_interactions
      ADD CONSTRAINT check_community_interactions_type
      CHECK (interaction_type IN ('repost', 'share'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_community_interactions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_owner_id UUID;
  v_post_status TEXT;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Bind caller
  NEW.user_id := auth.uid();
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for post interactions.' USING ERRCODE = '42501';
  END IF;

  -- Suspension check
  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot interact with posts.' USING ERRCODE = '42501';
  END IF;

  -- Check post existence and published status
  SELECT user_id, status INTO v_post_owner_id, v_post_status
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF v_post_owner_id IS NULL OR v_post_status != 'published' THEN
    RAISE EXCEPTION 'Post not found or not published.' USING ERRCODE = 'P0002';
  END IF;

  -- Disallow self-reposts at database level
  IF NEW.interaction_type = 'repost' AND v_post_owner_id = NEW.user_id THEN
    RAISE EXCEPTION 'You cannot repost your own post.' USING ERRCODE = 'P0001';
  END IF;

  NEW.created_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_community_interactions ON public.community_interactions;
CREATE TRIGGER tr_protect_community_interactions
BEFORE INSERT OR UPDATE ON public.community_interactions
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_interactions();

-- Atomic post interactions counter synchronization trigger
CREATE OR REPLACE FUNCTION public.sync_community_post_interactions_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_id UUID;
  v_type TEXT;
  v_count INTEGER;
BEGIN
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  v_type := COALESCE(NEW.interaction_type, OLD.interaction_type);

  IF v_post_id IS NOT NULL AND v_type IN ('repost', 'share') THEN
    SELECT count(*)::integer INTO v_count
    FROM public.community_interactions
    WHERE post_id = v_post_id AND interaction_type = v_type;

    PERFORM set_config('app.trusted_counter_update', 'true', true);
    IF v_type = 'repost' THEN
      UPDATE public.community_posts SET reposts = v_count WHERE id = v_post_id;
    ELSIF v_type = 'share' THEN
      UPDATE public.community_posts SET shares = v_count WHERE id = v_post_id;
    END IF;
    PERFORM set_config('app.trusted_counter_update', 'false', true);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_community_post_interactions_counter ON public.community_interactions;
CREATE TRIGGER tr_sync_community_post_interactions_counter
AFTER INSERT OR DELETE ON public.community_interactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_community_post_interactions_counter();

-- Interaction RLS policies
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.community_interactions;
CREATE POLICY "Users can insert own interactions"
ON public.community_interactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND NOT public.is_current_user_suspended()
);

DROP POLICY IF EXISTS "Users can delete own interactions" ON public.community_interactions;
CREATE POLICY "Users can delete own interactions"
ON public.community_interactions FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id AND NOT public.is_current_user_suspended()) OR public.is_admin()
);

-- ------------------------------------------------------------------------------
-- 6. ATOMIC POST LIKES COUNTER SYNCHRONIZATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_community_post_likes_counter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_post_id UUID;
  v_likes_count INTEGER;
BEGIN
  v_post_id := COALESCE(NEW.post_id, OLD.post_id);

  IF v_post_id IS NOT NULL THEN
    SELECT count(*)::integer INTO v_likes_count
    FROM public.community_likes
    WHERE post_id = v_post_id;

    PERFORM set_config('app.trusted_counter_update', 'true', true);
    UPDATE public.community_posts SET likes = v_likes_count WHERE id = v_post_id;
    PERFORM set_config('app.trusted_counter_update', 'false', true);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_community_post_likes_counter ON public.community_likes;
CREATE TRIGGER tr_sync_community_post_likes_counter
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_community_post_likes_counter();

-- ------------------------------------------------------------------------------
-- 7. HARDEN DISPATCH_MENTION_NOTIFICATION RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispatch_mention_notification(
  p_target_user_id UUID,
  p_post_id UUID,
  p_actor_name TEXT,
  p_snippet TEXT,
  p_context_type TEXT DEFAULT 'post'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_verified_actor_name TEXT;
  v_notif_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_link TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  -- Suspension check
  IF public.is_current_user_suspended() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'actor_suspended');
  END IF;

  -- Prevent self-notification
  IF v_actor_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_mention');
  END IF;

  -- Ensure target exists and is not suspended
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND is_suspended = false) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found_or_suspended');
  END IF;

  -- Verify post existence
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id AND (status = 'published' OR user_id = v_actor_id OR public.is_admin())) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'post_not_found');
  END IF;

  -- Rate limit mention notifications (20 per 60 seconds)
  IF NOT public.check_and_increment_rate_limit(v_actor_id, 'mention_notification', 20, 60) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'rate_limit_exceeded');
  END IF;

  -- Derive verified public actor display name from profiles (never trust unverified client input)
  SELECT COALESCE(
    NULLIF(username, ''),
    NULLIF(full_name, ''),
    'A builder'
  ) INTO v_verified_actor_name
  FROM public.profiles
  WHERE id = v_actor_id;

  IF v_verified_actor_name IS NULL OR v_verified_actor_name = '' THEN
    v_verified_actor_name := 'A builder';
  ELSIF NOT v_verified_actor_name LIKE '@%' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id AND username IS NOT NULL AND username <> '') THEN
    SELECT '@' || username INTO v_verified_actor_name FROM public.profiles WHERE id = v_actor_id;
  END IF;

  v_title := format('%s mentioned you', v_verified_actor_name);
  v_message := format('"%s"', substring(COALESCE(p_snippet, '') from 1 for 120));
  v_link := format('/feed#%s', p_post_id);

  -- Idempotency: avoid duplicate notification for same post and user within last 5 minutes
  IF EXISTS (
    SELECT 1 FROM public.user_notifications un
    JOIN public.notifications n ON n.id = un.notification_id
    WHERE un.user_id = p_target_user_id
      AND n.link = v_link
      AND un.created_at >= now() - INTERVAL '5 minutes'
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;

  INSERT INTO public.notifications (
    title,
    message,
    type,
    link,
    created_by
  ) VALUES (
    v_title,
    v_message,
    'community',
    v_link,
    v_actor_id
  ) RETURNING id INTO v_notif_id;

  INSERT INTO public.user_notifications (
    user_id,
    notification_id
  ) VALUES (
    p_target_user_id,
    v_notif_id
  );

  RETURN jsonb_build_object('success', true, 'notification_id', v_notif_id);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_mention_notification(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_mention_notification(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.dispatch_mention_notification(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 8. HARDEN REPORTS TABLE TRIGGER & ABUSE PREVENTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_and_protect_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_target_uuid UUID;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit reports.' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_admin();

  IF TG_OP = 'INSERT' THEN
    -- Suspension check
    IF NOT v_is_admin AND public.is_current_user_suspended() THEN
      RAISE EXCEPTION 'Your account has been suspended. You cannot submit reports.' USING ERRCODE = '42501';
    END IF;

    -- Bind reporter
    NEW.reporter_id := v_caller;
    NEW.status := 'pending';
    NEW.admin_notes := NULL;
    NEW.resolved_by := NULL;
    NEW.resolved_at := NULL;

    -- Validate target_type
    IF NEW.target_type NOT IN ('opportunity', 'post', 'comment', 'user') THEN
      RAISE EXCEPTION 'Invalid report target type.' USING ERRCODE = 'P0001';
    END IF;

    -- Validate target_id is valid UUID
    IF NEW.target_id IS NULL OR NEW.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Invalid report target ID format.' USING ERRCODE = 'P0001';
    END IF;

    -- Validate reason length
    NEW.reason := trim(COALESCE(NEW.reason, ''));
    IF length(NEW.reason) < 3 OR length(NEW.reason) > 1000 THEN
      RAISE EXCEPTION 'Report reason must be between 3 and 1000 characters.' USING ERRCODE = 'P0001';
    END IF;

    -- Server-side Rate Limit (10 reports per hour)
    IF NOT public.check_and_increment_rate_limit(v_caller, 'report_create', 10, 3600) THEN
      PERFORM public.log_security_event(
        'rate_limit_exceeded',
        'warning',
        jsonb_build_object('action', 'report_create', 'limit', 10, 'window_seconds', 3600)
      );
      RAISE EXCEPTION 'Rate limit exceeded: You have submitted too many reports recently. Please wait before submitting another report.' USING ERRCODE = 'P0001';
    END IF;

    NEW.created_at := timezone('utc'::text, now());
    NEW.updated_at := NEW.created_at;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only admins can update reports
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only administrators can update reports.' USING ERRCODE = '42501';
    END IF;

    -- Protect immutable fields
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot modify report ID.' USING ERRCODE = '42501';
    END IF;
    IF NEW.reporter_id IS DISTINCT FROM OLD.reporter_id THEN
      RAISE EXCEPTION 'Cannot modify report author.' USING ERRCODE = '42501';
    END IF;
    IF NEW.target_type IS DISTINCT FROM OLD.target_type OR NEW.target_id IS DISTINCT FROM OLD.target_id THEN
      RAISE EXCEPTION 'Cannot modify report target.' USING ERRCODE = '42501';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Cannot modify report created_at.' USING ERRCODE = '42501';
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_and_protect_report ON public.reports;
CREATE TRIGGER tr_validate_and_protect_report
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_and_protect_report();

-- Reports RLS policies
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id AND NOT public.is_current_user_suspended()
);

DROP POLICY IF EXISTS "Users and admins can view reports" ON public.reports;
CREATE POLICY "Users and admins can view reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_id OR public.is_admin()
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
