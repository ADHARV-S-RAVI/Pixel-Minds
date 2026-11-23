-- Migration: 20261123193000_notifications_for_mentions_reposts_and_pixels.sql
-- Description: Unify and guarantee notifications for mentions, reposts, and pixel balance changes (increases & decreases).

-- 1. Ensure notify_pixel_transaction trigger function on public.pixel_transactions
-- Creates a notification whenever a user's pixels increase or decrease
CREATE OR REPLACE FUNCTION public.notify_pixel_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notif_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_link TEXT := '/pixels';
BEGIN
  IF NEW.user_id IS NULL OR NEW.amount = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.amount > 0 THEN
    v_title := format('+%s Pixels Earned!', NEW.amount);
    v_message := COALESCE(NULLIF(NEW.reason, ''), format('You earned %s Pixels for %s.', NEW.amount, COALESCE(NEW.action, 'activity')));
  ELSE
    v_title := format('%s Pixels Deducted', abs(NEW.amount));
    v_message := COALESCE(NULLIF(NEW.reason, ''), format('%s Pixels were deducted for %s.', abs(NEW.amount), COALESCE(NEW.action, 'activity')));
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
    'pixel',
    v_link,
    COALESCE(NEW.admin_id, NEW.user_id)
  ) RETURNING id INTO v_notif_id;

  INSERT INTO public.user_notifications (
    user_id,
    notification_id
  ) VALUES (
    NEW.user_id,
    v_notif_id
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Prevent failure of the transaction if notification fails
  RAISE WARNING 'notify_pixel_transaction failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_pixel_transaction ON public.pixel_transactions;
CREATE TRIGGER tr_notify_pixel_transaction
AFTER INSERT ON public.pixel_transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_pixel_transaction();

-- 2. Harden dispatch_repost_notification RPC
CREATE OR REPLACE FUNCTION public.dispatch_repost_notification(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_post_owner_id UUID;
  v_post_snippet TEXT;
  v_actor_name TEXT;
  v_notif_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_link TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  SELECT user_id, COALESCE(title, substring(text from 1 for 60))
  INTO v_post_owner_id, v_post_snippet
  FROM public.community_posts
  WHERE id = p_post_id;

  IF v_post_owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'post_not_found');
  END IF;

  -- Disallow notifying self
  IF v_post_owner_id = v_actor_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_repost');
  END IF;

  -- Get actor display name / username
  SELECT COALESCE(
    NULLIF(username, ''),
    NULLIF(full_name, ''),
    'A builder'
  ) INTO v_actor_name
  FROM public.profiles
  WHERE id = v_actor_id;

  IF v_actor_name IS NULL OR v_actor_name = '' THEN
    v_actor_name := 'A builder';
  ELSIF NOT v_actor_name LIKE '@%' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor_id AND username IS NOT NULL AND username <> '') THEN
    SELECT '@' || username INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
  END IF;

  v_title := format('%s reposted your post', v_actor_name);
  v_message := format('"%s"', substring(COALESCE(v_post_snippet, '') from 1 for 100));
  v_link := format('/feed#%s', p_post_id);

  -- Deduplicate within 5 minutes
  IF EXISTS (
    SELECT 1 FROM public.user_notifications un
    JOIN public.notifications n ON n.id = un.notification_id
    WHERE un.user_id = v_post_owner_id
      AND n.link = v_link
      AND n.title LIKE '%reposted your post'
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
    v_post_owner_id,
    v_notif_id
  );

  RETURN jsonb_build_object('success', true, 'notification_id', v_notif_id);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_repost_notification(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_repost_notification(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.dispatch_repost_notification(UUID) TO authenticated, service_role;

-- 3. Enhance dispatch_mention_notification to ensure robustness
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

  -- Derive verified public actor display name from profiles (fallback to passed name if profile not populated)
  SELECT COALESCE(
    NULLIF(username, ''),
    NULLIF(full_name, ''),
    p_actor_name,
    'A builder'
  ) INTO v_verified_actor_name
  FROM public.profiles
  WHERE id = v_actor_id;

  IF v_verified_actor_name IS NULL OR v_verified_actor_name = '' THEN
    v_verified_actor_name := COALESCE(p_actor_name, 'A builder');
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
