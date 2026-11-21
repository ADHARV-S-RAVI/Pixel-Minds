-- ==============================================================================
-- Migration: Feed Security Hardening, Rate Limiting, Audit & Monitoring
-- Date: 2026-11-21
-- Description:
--   1. Server-side Rate Limiting engine for Serverless Vercel + Supabase architecture.
--   2. Structured Security Logging & Audit Trail with Admin-only access.
--   3. Strict Database Triggers on community_posts preventing impersonation,
--      unauthorized field modification, counter tampering, and malicious content.
--   4. Strict Database Triggers on community_comments preventing impersonation,
--      unauthorized comment edits, and comment spam.
--   5. Hardened RPCs with search_path safety, concurrency locking, and rate limiting.
--   6. Storage RLS policy hardening for post images with isolated user folder paths.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SERVER-SIDE RATE LIMITING INFRASTRUCTURE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  request_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_user_action_rate_limit UNIQUE (user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_lookup 
ON public.user_rate_limits (user_id, action_type);

ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if any
DROP POLICY IF EXISTS "Users can view own rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Block client insert on rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Block client update on rate limits" ON public.user_rate_limits;
DROP POLICY IF EXISTS "Block client delete on rate limits" ON public.user_rate_limits;

CREATE POLICY "Users can view own rate limits" 
ON public.user_rate_limits FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Block client insert on rate limits" 
ON public.user_rate_limits FOR INSERT 
TO authenticated, anon, PUBLIC 
WITH CHECK (false);

CREATE POLICY "Block client update on rate limits" 
ON public.user_rate_limits FOR UPDATE 
TO authenticated, anon, PUBLIC 
USING (false) WITH CHECK (false);

CREATE POLICY "Block client delete on rate limits" 
ON public.user_rate_limits FOR DELETE 
TO authenticated, anon, PUBLIC 
USING (false);

REVOKE ALL ON TABLE public.user_rate_limits FROM PUBLIC;
REVOKE ALL ON TABLE public.user_rate_limits FROM anon;
GRANT SELECT ON TABLE public.user_rate_limits TO authenticated;
GRANT ALL ON TABLE public.user_rate_limits TO service_role;

-- Rate limiter function: Returns TRUE if allowed, FALSE if rate limit exceeded
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_rec RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verified admins bypass rate limits
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Lock row for update
  SELECT id, window_start, request_count INTO v_rec
  FROM public.user_rate_limits
  WHERE user_id = p_user_id AND action_type = p_action
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.user_rate_limits (user_id, action_type, window_start, request_count)
    VALUES (p_user_id, p_action, v_now, 1)
    ON CONFLICT (user_id, action_type) DO UPDATE
      SET window_start = v_now, request_count = 1;
    RETURN TRUE;
  END IF;

  -- If window has elapsed, reset window
  IF v_now >= (v_rec.window_start + (p_window_seconds || ' seconds')::INTERVAL) THEN
    UPDATE public.user_rate_limits
    SET window_start = v_now, request_count = 1
    WHERE user_id = p_user_id AND action_type = p_action;
    RETURN TRUE;
  END IF;

  -- Check if max requests reached
  IF v_rec.request_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE public.user_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND action_type = p_action;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. STRUCTURED SECURITY LOGS & AUDIT TRAIL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at 
ON public.security_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_logs_event_type 
ON public.security_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id 
ON public.security_logs (user_id);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Drop previous policies if any
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Block client insert on security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Block client update on security logs" ON public.security_logs;
DROP POLICY IF EXISTS "Block client delete on security logs" ON public.security_logs;

-- Strictly authorized administrators can view security logs
CREATE POLICY "Admins can view security logs"
ON public.security_logs FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Block client insert on security logs"
ON public.security_logs FOR INSERT
TO authenticated, anon, PUBLIC
WITH CHECK (false);

CREATE POLICY "Block client update on security logs"
ON public.security_logs FOR UPDATE
TO authenticated, anon, PUBLIC
USING (false) WITH CHECK (false);

CREATE POLICY "Block client delete on security logs"
ON public.security_logs FOR DELETE
TO authenticated, anon, PUBLIC
USING (false);

REVOKE ALL ON TABLE public.security_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.security_logs FROM anon;
GRANT SELECT ON TABLE public.security_logs TO authenticated;
GRANT ALL ON TABLE public.security_logs TO service_role;

-- Secure RPC to record structured security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT DEFAULT 'warning',
  p_details JSONB DEFAULT '{}'::jsonb,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_type TEXT;
  v_clean_severity TEXT;
  v_sanitized_details JSONB;
  v_log_id UUID;
BEGIN
  v_clean_type := substring(trim(COALESCE(p_event_type, 'unknown_event')) from 1 for 100);
  v_clean_severity := LOWER(trim(COALESCE(p_severity, 'warning')));
  IF v_clean_severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    v_clean_severity := 'warning';
  END IF;

  -- Sanitize details payload: Strip sensitive keys and limit size to 4KB
  v_sanitized_details := COALESCE(p_details, '{}'::jsonb);
  v_sanitized_details := v_sanitized_details - 'password' - 'token' - 'access_token' - 'refresh_token' - 'secret' - 'cookie' - 'apiKey';

  IF octet_length(v_sanitized_details::text) > 4096 THEN
    v_sanitized_details := jsonb_build_object(
      'error', 'Details payload exceeded maximum allowed size (truncated)',
      'preview', substring(v_sanitized_details::text from 1 for 500)
    );
  END IF;

  INSERT INTO public.security_logs (
    event_type,
    severity,
    user_id,
    correlation_id,
    details
  ) VALUES (
    v_clean_type,
    v_clean_severity,
    v_user_id,
    substring(trim(COALESCE(p_correlation_id, '')) from 1 for 100),
    v_sanitized_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) TO authenticated, anon, service_role;

-- Retention Cleanup: Purge security logs older than 90 days
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.security_logs
  WHERE created_at < (timezone('utc'::text, now()) - INTERVAL '90 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. HARDEN COMMUNITY_POSTS DATA INTEGRITY & IMPERSONATION PROTECTION
-- ------------------------------------------------------------------------------
-- Trigger Function: Validate and protect community posts on INSERT
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

  -- 1. Strictly bind ownership to authenticated user
  NEW.user_id := v_caller;

  -- 2. Non-admin impersonation & privilege escalation prevention
  IF NOT v_is_admin THEN
    SELECT COALESCE(full_name, 'Pixel Member'), COALESCE(role, 'Pixel Member')
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

  -- 5. Safe URL Handling (Strictly http/https, reject javascript:, data:, etc.)
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

  -- 6. Rate Limit Protection (5 posts per 60 seconds per user)
  IF NOT public.check_and_increment_rate_limit(v_caller, 'post_create', 5, 60) THEN
    -- Log security event for rate limit violation
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

-- Trigger Function: Validate and protect community posts on UPDATE
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

  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_community_posts_fields ON public.community_posts;
CREATE TRIGGER tr_protect_community_posts_fields
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_posts_fields();

-- ------------------------------------------------------------------------------
-- 4. HARDEN COMMUNITY_COMMENTS DATA INTEGRITY & ANTI-SPAM
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
    -- Bind identity strictly to caller
    NEW.user_id := v_caller;

    IF NOT v_is_admin THEN
      SELECT 
        COALESCE(full_name, 'Pixel Member'),
        COALESCE(role, 'Pixel Member'),
        avatar_url
      INTO v_author_name, v_author_role, v_author_avatar
      FROM public.profiles
      WHERE id = v_caller;

      NEW.author_name := COALESCE(v_author_name, 'Pixel Member');
      NEW.author_role := COALESCE(v_author_role, 'Pixel Member');
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

    -- Anti-Spam Rate Limit (15 comments per 60 seconds per user)
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

-- ------------------------------------------------------------------------------
-- 5. HARDEN CONCURRENCY-SAFE RPCS
-- ------------------------------------------------------------------------------
-- A. Toggle Community Post Like
CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_new_likes INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.' USING ERRCODE = '42501';
  END IF;

  -- Rate limit like toggles (40 per 60 seconds)
  IF NOT public.check_and_increment_rate_limit(v_user_id, 'like_toggle', 40, 60) THEN
    RAISE EXCEPTION 'Rate limit exceeded: You are liking posts too quickly. Please wait a moment.' USING ERRCODE = 'P0001';
  END IF;

  -- Concurrency control: Lock post row
  PERFORM 1 FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.community_likes
  WHERE post_id = p_post_id AND user_id = v_user_id;

  IF FOUND THEN
    v_liked := FALSE;
  ELSE
    INSERT INTO public.community_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := TRUE;
  END IF;

  -- Recalculate atomically from records
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

-- B. Toggle Comment Like
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_liked BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Rate limit comment likes (40 per 60 seconds)
  IF NOT public.check_and_increment_rate_limit(v_user_id, 'comment_like_toggle', 40, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait a moment.');
  END IF;

  -- Lock comment row for update
  PERFORM 1 FROM public.community_comments
  WHERE id = p_comment_id
  FOR UPDATE;

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

  SELECT count(*) INTO v_likes_count
  FROM public.community_comment_likes
  WHERE comment_id = p_comment_id;

  UPDATE public.community_comments
  SET likes = v_likes_count
  WHERE id = p_comment_id;

  RETURN jsonb_build_object(
    'success', true,
    'liked', v_liked,
    'likes_count', v_likes_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated, service_role;

-- C. Add Community Post Comment
CREATE OR REPLACE FUNCTION public.add_community_post_comment(
  p_post_id UUID,
  p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_trimmed_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  v_author_avatar TEXT;
  v_comment_row public.community_comments%ROWTYPE;
  v_new_comments INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment on posts.' USING ERRCODE = '42501';
  END IF;

  v_trimmed_text := btrim(p_text);
  IF v_trimmed_text IS NULL OR length(v_trimmed_text) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty.' USING ERRCODE = 'P0001';
  END IF;

  IF length(v_trimmed_text) > 2000 THEN
    RAISE EXCEPTION 'Comment text exceeds maximum allowed length of 2000 characters.' USING ERRCODE = 'P0001';
  END IF;

  -- Lock post row
  PERFORM 1 FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Derive profile attributes
  SELECT
    COALESCE(full_name, 'Pixel Builder'),
    COALESCE(role, 'Pixel Member'),
    avatar_url
  INTO
    v_author_name,
    v_author_role,
    v_author_avatar
  FROM public.profiles
  WHERE id = v_user_id;

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
    COALESCE(v_author_name, 'Pixel Builder'),
    COALESCE(v_author_role, 'Pixel Member'),
    v_author_avatar,
    v_trimmed_text
  )
  RETURNING * INTO v_comment_row;

  -- Recalculate comments counter
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
    'comments_count', COALESCE(v_new_comments, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- D. Delete Community Comment
CREATE OR REPLACE FUNCTION public.delete_community_comment(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_comment_user_id UUID;
  v_post_id UUID;
  v_user_role TEXT;
  v_new_comments_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
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

  SELECT count(*) INTO v_new_comments_count
  FROM public.community_comments
  WHERE post_id = v_post_id;

  UPDATE public.community_posts
  SET comments = v_new_comments_count
  WHERE id = v_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'post_id', v_post_id,
    'comments_count', v_new_comments_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_community_comment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_community_comment(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_community_comment(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. STORAGE RLS HARDENING FOR POST IMAGES
-- ------------------------------------------------------------------------------
-- Ensure post-images bucket has isolated user directories
DROP POLICY IF EXISTS "Users can upload own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own post images" ON storage.objects;

CREATE POLICY "Users can upload own post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

CREATE POLICY "Users can update or delete own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
