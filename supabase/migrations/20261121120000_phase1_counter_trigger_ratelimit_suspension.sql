-- ==============================================================================
-- Migration: Phase 1 — Counter-Trigger GUC Bypass, Rate-Limit Hardening,
--            Suspension Enforcement, and Frontend Route Alignment
-- Date: 2026-11-21
-- Description:
--   1. Introduce app.trusted_counter_update GUC flag so SECURITY DEFINER RPCs
--      can bypass counter-protection triggers without opening the flag to clients.
--   2. Harden check_and_increment_rate_limit: revoke PUBLIC/anon/authenticated
--      EXECUTE, enforce server-controlled per-action limits, fix first-row race
--      condition with INSERT ... ON CONFLICT DO UPDATE (already present but
--      re-validated here with correct logic order).
--   3. Add is_current_user_suspended() helper and wire it into every write path:
--      community_posts INSERT trigger, community_comments INSERT trigger,
--      toggle_community_post_like, toggle_comment_like, add_community_post_comment,
--      delete_community_comment, record_post_interaction, toggle_post_bookmark,
--      and the opportunity submission trigger + RLS.
--   4. Update protect_community_posts_fields() and
--      validate_and_protect_community_comment() to allow counter updates when
--      current_setting('app.trusted_counter_update', true) = 'true'.
-- ==============================================================================

-- ==============================================================================
-- 1. SUSPENSION HELPER
-- ==============================================================================

-- Returns TRUE if the current auth.uid() user has is_suspended = true OR
-- status = 'suspended' in public.profiles. Returns FALSE for service_role
-- (never suspended) and NULL uid (unauthenticated — let other guards handle).
CREATE OR REPLACE FUNCTION public.is_current_user_suspended()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_suspended BOOLEAN;
BEGIN
  -- Service role is never suspended
  IF auth.role() = 'service_role' THEN
    RETURN FALSE;
  END IF;

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (COALESCE(is_suspended, false) OR COALESCE(status, '') = 'suspended')
  INTO v_suspended
  FROM public.profiles
  WHERE id = v_uid;

  RETURN COALESCE(v_suspended, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_user_suspended() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_current_user_suspended() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_suspended() TO authenticated, service_role;

-- ==============================================================================
-- 2. HARDEN check_and_increment_rate_limit
--    - Revoke EXECUTE from PUBLIC, anon, authenticated (internal-only)
--    - Fix first-row creation: use INSERT ... ON CONFLICT before SELECT FOR UPDATE
--    - Enforce server-controlled per-action limits table
-- ==============================================================================

-- Server-controlled action limits — not client-configurable
CREATE TABLE IF NOT EXISTS public.rate_limit_policy (
  action_type    TEXT PRIMARY KEY,
  max_requests   INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL
);

-- Seed default policies (idempotent)
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds) VALUES
  ('post_create',          5,  60),
  ('comment_create',      15,  60),
  ('like_toggle',         40,  60),
  ('comment_like_toggle', 40,  60),
  ('bookmark_toggle',     30,  60),
  ('post_interaction',    20,  60),
  ('send_email',           5, 600)
ON CONFLICT (action_type) DO UPDATE SET
  max_requests = EXCLUDED.max_requests,
  window_seconds = EXCLUDED.window_seconds;

ALTER TABLE public.rate_limit_policy ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write the policy table
REVOKE ALL ON TABLE public.rate_limit_policy FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_policy FROM anon;
REVOKE ALL ON TABLE public.rate_limit_policy FROM authenticated;
GRANT ALL ON TABLE public.rate_limit_policy TO service_role;

-- Hardened rate limiter — no client-controllable parameters for limits/windows.
-- p_max_requests and p_window_seconds are IGNORED; values come from rate_limit_policy.
-- p_user_id MUST equal auth.uid() (unless called from service_role).
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id      UUID,
  p_action       TEXT,
  p_max_requests INTEGER,   -- kept for signature compat; value overridden by policy table
  p_window_seconds INTEGER  -- kept for signature compat; value overridden by policy table
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now            TIMESTAMPTZ := clock_timestamp();
  v_rec            RECORD;
  v_policy         RECORD;
  v_effective_max  INTEGER;
  v_effective_win  INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Callers that are not service_role must only rate-limit themselves
  IF auth.role() != 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
    PERFORM public.log_security_event(
      'rate_limit_uid_mismatch',
      'warning',
      jsonb_build_object('claimed_uid', p_user_id, 'actual_uid', auth.uid(), 'action', p_action)
    );
    RETURN FALSE;
  END IF;

  -- Admins bypass rate limits
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Fetch server-controlled limits (falls back to caller-supplied values only if
  -- no policy row exists, so old callers still work but cannot escalate limits)
  SELECT max_requests, window_seconds
  INTO v_policy
  FROM public.rate_limit_policy
  WHERE action_type = p_action;

  v_effective_max := COALESCE(v_policy.max_requests,  p_max_requests);
  v_effective_win := COALESCE(v_policy.window_seconds, p_window_seconds);

  -- Atomic upsert: guarantee a row exists (fixes first-row race condition)
  INSERT INTO public.user_rate_limits (user_id, action_type, window_start, request_count)
  VALUES (p_user_id, p_action, v_now, 0)
  ON CONFLICT (user_id, action_type) DO NOTHING;

  -- Now lock the row for update
  SELECT id, window_start, request_count
  INTO v_rec
  FROM public.user_rate_limits
  WHERE user_id = p_user_id AND action_type = p_action
  FOR UPDATE;

  -- Reset window if elapsed
  IF v_now >= (v_rec.window_start + (v_effective_win || ' seconds')::INTERVAL) THEN
    UPDATE public.user_rate_limits
    SET window_start = v_now, request_count = 1
    WHERE user_id = p_user_id AND action_type = p_action;
    RETURN TRUE;
  END IF;

  -- Reject if limit reached
  IF v_rec.request_count >= v_effective_max THEN
    RETURN FALSE;
  END IF;

  -- Increment
  UPDATE public.user_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND action_type = p_action;

  RETURN TRUE;
END;
$$;

-- Make rate limiter strictly internal — no client can call it directly
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- ==============================================================================
-- 3. UPDATE protect_community_posts_fields()
--    Allow counter updates when trusted GUC flag is set by SECURITY DEFINER RPCs
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_community_posts_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role and verified admins retain full unrestricted moderation access
  IF (auth.role() = 'service_role') OR public.is_admin() THEN
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
  END IF;

  -- Trusted internal RPCs (toggle_community_post_like, add_community_post_comment,
  -- delete_community_comment, record_post_interaction, toggle_post_bookmark) signal
  -- themselves via a transaction-local GUC flag set with set_config(..., true).
  -- This flag is never accessible to external clients.
  IF current_setting('app.trusted_counter_update', true) = 'true' THEN
    -- Allow only counter column updates; still block ownership/meta tampering
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Cannot modify post ID.' USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id::text IS DISTINCT FROM OLD.user_id::text THEN
      RAISE EXCEPTION 'Cannot modify post ownership (user_id).' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
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

  -- 3. Interaction Counters Protection (blocked for direct client calls)
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

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_community_posts_fields ON public.community_posts;
CREATE TRIGGER tr_protect_community_posts_fields
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_posts_fields();

-- ==============================================================================
-- 4. UPDATE validate_and_protect_community_comment()
--    Allow likes counter updates via trusted GUC flag; add suspension check on INSERT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_and_protect_community_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_is_admin   BOOLEAN := FALSE;
  v_author_name  TEXT;
  v_author_role  TEXT;
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

    NEW.user_id := v_caller;

    IF NOT v_is_admin THEN
      SELECT
        COALESCE(full_name, 'Pixel Member'),
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

    NEW.text := trim(COALESCE(NEW.text, ''));
    IF NEW.text = '' THEN
      RAISE EXCEPTION 'Comment cannot be empty.' USING ERRCODE = 'P0001';
    END IF;
    IF length(NEW.text) > 2000 THEN
      RAISE EXCEPTION 'Comment exceeds maximum allowed length of 2000 characters.' USING ERRCODE = 'P0001';
    END IF;

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
    -- Allow trusted counter updates (e.g. toggle_comment_like)
    IF current_setting('app.trusted_counter_update', true) = 'true' THEN
      IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Cannot modify comment ID.' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;

    IF NOT v_is_admin THEN
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

-- ==============================================================================
-- 5. UPDATE validate_and_protect_community_post_insert()
--    Add suspension check on INSERT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.validate_and_protect_community_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_is_admin   BOOLEAN := FALSE;
  v_author_name TEXT;
  v_author_role TEXT;
BEGIN
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create community posts.' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.is_admin();

  -- Reject suspended users
  IF NOT v_is_admin AND public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot create posts.' USING ERRCODE = '42501';
  END IF;

  NEW.user_id := v_caller;

  IF NOT v_is_admin THEN
    SELECT COALESCE(full_name, 'Pixel Member'), COALESCE(role, 'Pixel Member')
    INTO v_author_name, v_author_role
    FROM public.profiles
    WHERE id = v_caller;

    NEW.author_name    := COALESCE(v_author_name, 'Pixel Member');
    NEW.author_role    := COALESCE(v_author_role, 'Pixel Member');
    NEW.source         := 'user';
    NEW.featured       := FALSE;
    NEW.status         := 'published';
    NEW.likes          := 0;
    NEW.comments       := 0;
    NEW.reposts        := 0;
    NEW.shares         := 0;
    NEW.bookmarks_count := 0;
  ELSE
    NEW.author_name    := COALESCE(NULLIF(trim(NEW.author_name), ''), 'Pixel Minds Official');
    NEW.author_role    := COALESCE(NULLIF(trim(NEW.author_role), ''), 'Admin');
    NEW.source         := COALESCE(NEW.source, 'admin');
    NEW.status         := COALESCE(NEW.status, 'published');
    NEW.likes          := 0;
    NEW.comments       := 0;
    NEW.reposts        := 0;
    NEW.shares         := 0;
    NEW.bookmarks_count := 0;
  END IF;

  NEW.title := trim(COALESCE(NEW.title, ''));
  NEW.text  := trim(COALESCE(NEW.text, ''));

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

  IF NEW.category IS NULL OR NEW.category NOT IN (
    'Experience', 'Achievement', 'Idea', 'Learning', 'General', 'Upcoming Hackathon', 'Hackathon'
  ) THEN
    NEW.category := 'General';
  END IF;

  IF NEW.link IS NOT NULL AND trim(NEW.link) != '' THEN
    NEW.link := trim(NEW.link);
    IF length(NEW.link) > 2048 THEN
      RAISE EXCEPTION 'Post link exceeds maximum length of 2048 characters.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.link !~* '^https?://[a-zA-Z0-9.-]+' THEN
      RAISE EXCEPTION 'Invalid link URL: Must be a valid HTTP or HTTPS address.' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    NEW.link := NULL;
  END IF;

  IF NEW.image_url IS NOT NULL AND trim(NEW.image_url) != '' THEN
    NEW.image_url := trim(NEW.image_url);
    IF length(NEW.image_url) > 2048 THEN
      RAISE EXCEPTION 'Image URL exceeds maximum length of 2048 characters.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.image_url !~* '^https?://[a-zA-Z0-9.-]+' THEN
      NEW.image_url := NULL;
    END IF;
  ELSE
    NEW.image_url := NULL;
  END IF;

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

-- ==============================================================================
-- 6. HARDEN RPCs — set trusted GUC flag + suspension check
-- ==============================================================================

-- A. toggle_community_post_like
CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  UUID;
  v_liked    BOOLEAN;
  v_new_likes INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.' USING ERRCODE = '42501';
  END IF;

  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot like posts.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_user_id, 'like_toggle', 40, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded: You are liking posts too quickly. Please wait a moment.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.community_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.community_likes WHERE post_id = p_post_id AND user_id = v_user_id;
  IF FOUND THEN
    v_liked := FALSE;
  ELSE
    INSERT INTO public.community_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := TRUE;
  END IF;

  -- Signal trusted counter update to bypass protect_community_posts_fields check
  PERFORM set_config('app.trusted_counter_update', 'true', true);

  UPDATE public.community_posts
  SET likes = (SELECT count(*)::integer FROM public.community_likes WHERE post_id = p_post_id)
  WHERE id = p_post_id
  RETURNING likes INTO v_new_likes;

  PERFORM set_config('app.trusted_counter_update', 'false', true);

  RETURN jsonb_build_object(
    'success',     true,
    'liked',       v_liked,
    'likes_count', COALESCE(v_new_likes, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_community_post_like(UUID) TO authenticated, service_role;

-- B. toggle_comment_like
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_liked      BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF public.is_current_user_suspended() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account has been suspended.');
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_user_id, 'comment_like_toggle', 40, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait a moment.');
  END IF;

  PERFORM 1 FROM public.community_comments WHERE id = p_comment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comment not found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.community_comment_likes WHERE comment_id = p_comment_id AND user_id = v_user_id) THEN
    DELETE FROM public.community_comment_likes WHERE comment_id = p_comment_id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO public.community_comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user_id)
    ON CONFLICT (comment_id, user_id) DO NOTHING;
    v_liked := true;
  END IF;

  SELECT count(*) INTO v_likes_count FROM public.community_comment_likes WHERE comment_id = p_comment_id;

  -- Signal trusted counter update
  PERFORM set_config('app.trusted_counter_update', 'true', true);

  UPDATE public.community_comments SET likes = v_likes_count WHERE id = p_comment_id;

  PERFORM set_config('app.trusted_counter_update', 'false', true);

  RETURN jsonb_build_object(
    'success',     true,
    'liked',       v_liked,
    'likes_count', v_likes_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated, service_role;

-- C. add_community_post_comment
CREATE OR REPLACE FUNCTION public.add_community_post_comment(
  p_post_id UUID,
  p_text    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id       UUID;
  v_trimmed_text  TEXT;
  v_author_name   TEXT;
  v_author_role   TEXT;
  v_author_avatar TEXT;
  v_comment_row   public.community_comments%ROWTYPE;
  v_new_comments  INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment on posts.' USING ERRCODE = '42501';
  END IF;

  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot post comments.' USING ERRCODE = '42501';
  END IF;

  v_trimmed_text := btrim(p_text);
  IF v_trimmed_text IS NULL OR length(v_trimmed_text) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty.' USING ERRCODE = 'P0001';
  END IF;
  IF length(v_trimmed_text) > 2000 THEN
    RAISE EXCEPTION 'Comment text exceeds maximum allowed length of 2000 characters.' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.community_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COALESCE(full_name, 'Pixel Builder'),
    COALESCE(role, 'Pixel Member'),
    avatar_url
  INTO v_author_name, v_author_role, v_author_avatar
  FROM public.profiles
  WHERE id = v_user_id;

  INSERT INTO public.community_comments (post_id, user_id, author_name, author_role, author_avatar, text)
  VALUES (p_post_id, v_user_id,
          COALESCE(v_author_name, 'Pixel Builder'),
          COALESCE(v_author_role, 'Pixel Member'),
          v_author_avatar,
          v_trimmed_text)
  RETURNING * INTO v_comment_row;

  -- Signal trusted counter update
  PERFORM set_config('app.trusted_counter_update', 'true', true);

  UPDATE public.community_posts
  SET comments = (SELECT count(*)::integer FROM public.community_comments WHERE post_id = p_post_id)
  WHERE id = p_post_id
  RETURNING comments INTO v_new_comments;

  PERFORM set_config('app.trusted_counter_update', 'false', true);

  RETURN jsonb_build_object(
    'success', true,
    'comment', jsonb_build_object(
      'id',          v_comment_row.id,
      'author_name', v_comment_row.author_name,
      'author_role', v_comment_row.author_role,
      'author_avatar', v_comment_row.author_avatar,
      'text',        v_comment_row.text,
      'created_at',  v_comment_row.created_at
    ),
    'comments_count', COALESCE(v_new_comments, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- D. delete_community_comment
CREATE OR REPLACE FUNCTION public.delete_community_comment(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id           UUID := auth.uid();
  v_comment_user_id   UUID;
  v_post_id           UUID;
  v_user_role         TEXT;
  v_new_comments_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF public.is_current_user_suspended() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account has been suspended.');
  END IF;

  SELECT user_id, post_id INTO v_comment_user_id, v_post_id
  FROM public.community_comments
  WHERE id = p_comment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comment not found');
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  IF v_comment_user_id != v_user_id AND v_user_role != 'admin' AND NOT public.is_admin() THEN
    PERFORM public.log_security_event(
      'unauthorized_comment_deletion_attempt',
      'warning',
      jsonb_build_object('comment_id', p_comment_id, 'target_user_id', v_comment_user_id)
    );
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to delete this comment');
  END IF;

  DELETE FROM public.community_comments WHERE id = p_comment_id;

  SELECT count(*) INTO v_new_comments_count FROM public.community_comments WHERE post_id = v_post_id;

  -- Signal trusted counter update
  PERFORM set_config('app.trusted_counter_update', 'true', true);

  UPDATE public.community_posts SET comments = v_new_comments_count WHERE id = v_post_id;

  PERFORM set_config('app.trusted_counter_update', 'false', true);

  RETURN jsonb_build_object(
    'success',        true,
    'post_id',        v_post_id,
    'comments_count', v_new_comments_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_community_comment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_community_comment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_community_comment(UUID) TO authenticated, service_role;

-- E. record_post_interaction (reposts/shares) — add suspension check + GUC flag
CREATE OR REPLACE FUNCTION public.record_post_interaction(
  p_post_id UUID,
  p_type    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count   INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF public.is_current_user_suspended() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account has been suspended.');
  END IF;

  IF p_type NOT IN ('repost', 'share') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid interaction type');
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_user_id, 'post_interaction', 20, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait a moment.');
  END IF;

  INSERT INTO public.community_interactions (post_id, user_id, interaction_type)
  VALUES (p_post_id, v_user_id, p_type)
  ON CONFLICT (post_id, user_id, interaction_type) DO NOTHING;

  SELECT count(*) INTO v_count
  FROM public.community_interactions
  WHERE post_id = p_post_id AND interaction_type = p_type;

  PERFORM set_config('app.trusted_counter_update', 'true', true);

  IF p_type = 'repost' THEN
    UPDATE public.community_posts SET reposts = v_count WHERE id = p_post_id;
  ELSIF p_type = 'share' THEN
    UPDATE public.community_posts SET shares = v_count WHERE id = p_post_id;
  END IF;

  PERFORM set_config('app.trusted_counter_update', 'false', true);

  RETURN jsonb_build_object('success', true, 'type', p_type, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.record_post_interaction(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_post_interaction(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_post_interaction(UUID, TEXT) TO authenticated, service_role;

-- F. toggle_post_bookmark — add suspension check + GUC flag for bookmarks_count
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_bookmarked BOOLEAN;
  v_uuid       UUID;
  v_count      INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF public.is_current_user_suspended() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account has been suspended.');
  END IF;

  IF NOT public.check_and_increment_rate_limit(v_user_id, 'bookmark_toggle', 30, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait a moment.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_post_id) THEN
    DELETE FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_post_id;
    v_bookmarked := false;
  ELSE
    INSERT INTO public.user_bookmarks (user_id, target_id, target_type)
    VALUES (
      v_user_id,
      p_post_id,
      CASE WHEN p_post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
           THEN 'post' ELSE 'opportunity' END
    );
    v_bookmarked := true;
  END IF;

  SELECT count(*) INTO v_count FROM public.user_bookmarks WHERE target_id = p_post_id;

  IF p_post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_post_id::uuid;

    PERFORM set_config('app.trusted_counter_update', 'true', true);
    UPDATE public.community_posts SET bookmarks_count = v_count WHERE id = v_uuid;
    PERFORM set_config('app.trusted_counter_update', 'false', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'bookmarked', v_bookmarked, 'bookmarks_count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_post_bookmark(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_post_bookmark(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_post_bookmark(TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 7. OPPORTUNITY SUBMISSION — ADD SUSPENSION ENFORCEMENT
-- ==============================================================================

-- Harden the INSERT RLS to also block suspended users
DROP POLICY IF EXISTS "Users can submit pending opportunities" ON public.opportunities;

CREATE POLICY "Users can submit pending opportunities"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND status = 'pending'
  AND COALESCE(featured, false) = false
  AND NOT public.is_current_user_suspended()
);

-- Harden the rate limit trigger to also block suspended users
CREATE OR REPLACE FUNCTION public.enforce_opportunity_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent_minute_count INT;
  recent_day_count    INT;
  v_is_admin          BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM public.profiles WHERE id = NEW.created_by;
  IF COALESCE(v_is_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Block suspended users
  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot submit opportunities.' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO recent_minute_count
  FROM public.opportunities
  WHERE created_by = NEW.created_by AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_minute_count >= 1 THEN
    RAISE EXCEPTION 'Please wait 60 seconds before submitting another opportunity.' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO recent_day_count
  FROM public.opportunities
  WHERE created_by = NEW.created_by AND created_at > NOW() - INTERVAL '24 hours';

  IF recent_day_count >= 5 THEN
    RAISE EXCEPTION 'Daily submission limit reached (5 per 24 hours). Please try again tomorrow.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_rate_limit ON public.opportunities;
CREATE TRIGGER trg_opportunity_rate_limit
BEFORE INSERT ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.enforce_opportunity_submission_rate_limit();

-- ==============================================================================
-- 8. RELOAD SCHEMA
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
