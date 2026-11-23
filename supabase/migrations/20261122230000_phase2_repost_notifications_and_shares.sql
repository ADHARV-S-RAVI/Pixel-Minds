-- Migration: 20261122230000_phase2_repost_notifications_and_shares.sql
-- Description: Enforce atomic repost uniqueness, disallow self-reposts, dispatch repost notifications, and support atomic shares

-- 1. Ensure community_interactions has unique index & disallow self-repost via constraint or function
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_repost_per_user ON public.community_interactions (post_id, user_id) WHERE interaction_type = 'repost';

-- 2. Enhanced record_post_interaction function
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
  v_user_id       UUID := auth.uid();
  v_post_owner_id UUID;
  v_count         INTEGER;
  v_inserted      BOOLEAN := FALSE;
  v_actor_name    TEXT;
  v_post_snippet  TEXT;
  v_notif_id      UUID;
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

  -- Verify post existence and get owner
  SELECT user_id, coalesce(title, substring(text from 1 for 60))
  INTO v_post_owner_id, v_post_snippet
  FROM public.community_posts
  WHERE id = p_post_id AND status = 'published';

  IF v_post_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found or not published');
  END IF;

  -- Reposts: Disallow self-repost
  IF p_type = 'repost' AND v_user_id = v_post_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot repost your own post.');
  END IF;

  -- Rate limit check
  IF NOT public.check_and_increment_rate_limit(v_user_id, 'post_interaction', 30, 60) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please wait a moment.');
  END IF;

  -- Repost is 1 per user per post. Share is also idempotently recorded per user (or within tracking window)
  IF p_type = 'repost' THEN
    -- Check if already reposted
    IF EXISTS (
      SELECT 1 FROM public.community_interactions
      WHERE post_id = p_post_id AND user_id = v_user_id AND interaction_type = 'repost'
    ) THEN
      SELECT count(*) INTO v_count
      FROM public.community_interactions
      WHERE post_id = p_post_id AND interaction_type = 'repost';

      RETURN jsonb_build_object(
        'success', false,
        'already_reposted', true,
        'error', 'You have already reposted this post.',
        'count', v_count
      );
    END IF;

    INSERT INTO public.community_interactions (post_id, user_id, interaction_type)
    VALUES (p_post_id, v_user_id, 'repost')
    ON CONFLICT DO NOTHING;

    v_inserted := TRUE;

    -- Calculate total repost count
    SELECT count(*) INTO v_count
    FROM public.community_interactions
    WHERE post_id = p_post_id AND interaction_type = 'repost';

    -- Update post table counter
    PERFORM set_config('app.trusted_counter_update', 'true', true);
    UPDATE public.community_posts SET reposts = v_count WHERE id = p_post_id;
    PERFORM set_config('app.trusted_counter_update', 'false', true);

    -- Dispatch notification to original post owner (never self)
    IF v_post_owner_id IS NOT NULL AND v_post_owner_id <> v_user_id THEN
      -- Get actor display name / username
      SELECT COALESCE(
        NULLIF(username, ''),
        NULLIF(full_name, ''),
        'A builder'
      ) INTO v_actor_name
      FROM public.profiles
      WHERE id = v_user_id;

      IF v_actor_name IS NULL OR v_actor_name = '' THEN
        v_actor_name := 'A builder';
      ELSIF NOT v_actor_name LIKE '@%' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND username IS NOT NULL AND username <> '') THEN
        SELECT '@' || username INTO v_actor_name FROM public.profiles WHERE id = v_user_id;
      END IF;

      -- Check duplicate notification within 1 hour
      IF NOT EXISTS (
        SELECT 1 FROM public.user_notifications un
        JOIN public.notifications n ON n.id = un.notification_id
        WHERE un.user_id = v_post_owner_id
          AND n.link = ('/feed#' || p_post_id::text)
          AND n.title LIKE '%reposted your post'
          AND un.created_at >= now() - INTERVAL '1 hour'
      ) THEN
        INSERT INTO public.notifications (
          title,
          message,
          type,
          link,
          created_by
        ) VALUES (
          format('%s reposted your post', v_actor_name),
          format('"%s"', substring(v_post_snippet from 1 for 100)),
          'community',
          format('/feed#%s', p_post_id),
          v_user_id
        ) RETURNING id INTO v_notif_id;

        INSERT INTO public.user_notifications (user_id, notification_id)
        VALUES (v_post_owner_id, v_notif_id);
      END IF;
    END IF;

  ELSIF p_type = 'share' THEN
    -- Check if user already tracked share for this post within tracking window (1 hour)
    IF EXISTS (
      SELECT 1 FROM public.community_interactions
      WHERE post_id = p_post_id AND user_id = v_user_id AND interaction_type = 'share'
        AND created_at >= now() - INTERVAL '1 hour'
    ) THEN
      SELECT count(*) INTO v_count
      FROM public.community_interactions
      WHERE post_id = p_post_id AND interaction_type = 'share';

      RETURN jsonb_build_object(
        'success', true,
        'rate_limited', true,
        'type', 'share',
        'count', v_count
      );
    END IF;

    INSERT INTO public.community_interactions (post_id, user_id, interaction_type)
    VALUES (p_post_id, v_user_id, 'share');

    SELECT count(*) INTO v_count
    FROM public.community_interactions
    WHERE post_id = p_post_id AND interaction_type = 'share';

    PERFORM set_config('app.trusted_counter_update', 'true', true);
    UPDATE public.community_posts SET shares = v_count WHERE id = p_post_id;
    PERFORM set_config('app.trusted_counter_update', 'false', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'type', p_type, 'count', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.record_post_interaction(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_post_interaction(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_post_interaction(UUID, TEXT) TO authenticated, service_role;
