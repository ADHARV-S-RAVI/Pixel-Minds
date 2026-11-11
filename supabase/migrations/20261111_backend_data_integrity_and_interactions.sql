-- ==============================================================================
-- Migration: Backend Enhancements for Data Integrity, Interactions, Mentions & Bookmarks
-- Date: 2026-11-11
-- ==============================================================================

-- 1. COMMUNITY POSTS SCHEMA ENHANCEMENT: TITLE & DESCRIPTION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN title TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN description TEXT;
  END IF;
END $$;

-- Backfill title & description from existing text if title is null
UPDATE public.community_posts
SET 
  title = COALESCE(
    NULLIF(trim(substring(text from '^([^\n]+)')), ''),
    'Community Post'
  ),
  description = COALESCE(
    NULLIF(trim(substring(text from '\n+([\s\S]*)')), ''),
    text,
    'No description provided'
  )
WHERE title IS NULL OR description IS NULL;

-- Default fallback and validation
UPDATE public.community_posts SET title = 'Community Update' WHERE title IS NULL OR trim(title) = '';
UPDATE public.community_posts SET description = 'Community post details' WHERE description IS NULL OR trim(description) = '';

-- Ensure non-null constraints with safe defaults
ALTER TABLE public.community_posts ALTER COLUMN title SET DEFAULT 'Community Update';
ALTER TABLE public.community_posts ALTER COLUMN description SET DEFAULT '';

-- 2. SECURE ATOMIC PIXEL TRANSACTIONS & PROFILE BALANCE
CREATE OR REPLACE FUNCTION public.execute_pixel_transaction(
  p_user_id UUID,
  p_delta INTEGER,
  p_action TEXT,
  p_reason TEXT,
  p_type TEXT DEFAULT 'earn',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_caller_role TEXT;
  v_current_pixels INTEGER;
  v_new_pixels INTEGER;
  v_tx_id UUID;
BEGIN
  -- Validate caller permission: caller must be target user or admin
  IF v_caller IS NOT NULL AND v_caller != p_user_id THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller;
    IF v_caller_role != 'admin' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized pixel operation');
    END IF;
  END IF;

  -- Idempotency check if idempotency key / reason provided
  IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) != '' THEN
    IF EXISTS (
      SELECT 1 FROM public.pixel_transactions 
      WHERE user_id = p_user_id AND reason = p_idempotency_key
    ) THEN
      SELECT pixels INTO v_current_pixels FROM public.profiles WHERE id = p_user_id;
      RETURN jsonb_build_object(
        'success', true, 
        'pixels', COALESCE(v_current_pixels, 0),
        'message', 'Transaction already processed'
      );
    END IF;
  END IF;

  -- Atomic update with row lock
  SELECT pixels INTO v_current_pixels
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  v_new_pixels := GREATEST(0, COALESCE(v_current_pixels, 0) + p_delta);

  UPDATE public.profiles
  SET 
    pixels = v_new_pixels,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  INSERT INTO public.pixel_transactions (
    user_id,
    amount,
    action,
    reason,
    type
  ) VALUES (
    p_user_id,
    p_delta,
    COALESCE(p_action, CASE WHEN p_delta >= 0 THEN 'Earned Pixels' ELSE 'Spent Pixels' END),
    COALESCE(p_idempotency_key, p_reason, 'Community activity'),
    COALESCE(p_type, CASE WHEN p_delta >= 0 THEN 'earn' ELSE 'spend' END)
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'pixels', v_new_pixels,
    'delta', p_delta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 3. POST INTERACTIONS (LIKES, BOOKMARKS, REPOSTS, SHARES)
-- A. Bookmarks table
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'post', -- 'post' or 'opportunity'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_bookmark UNIQUE (user_id, target_id)
);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_bookmarks' AND policyname = 'Users can view own bookmarks'
  ) THEN
    CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_bookmarks' AND policyname = 'Users can insert own bookmarks'
  ) THEN
    CREATE POLICY "Users can insert own bookmarks" ON public.user_bookmarks
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_bookmarks' AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_target ON public.user_bookmarks(target_id, target_type);

-- B. Post Interactions Table (Reposts, Shares)
CREATE TABLE IF NOT EXISTS public.community_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'repost', 'share'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_post_user_interaction UNIQUE (post_id, user_id, interaction_type)
);

ALTER TABLE public.community_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_interactions' AND policyname = 'Anyone can view interactions'
  ) THEN
    CREATE POLICY "Anyone can view interactions" ON public.community_interactions
      FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_interactions' AND policyname = 'Users can insert own interactions'
  ) THEN
    CREATE POLICY "Users can insert own interactions" ON public.community_interactions
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_interactions' AND policyname = 'Users can delete own interactions'
  ) THEN
    CREATE POLICY "Users can delete own interactions" ON public.community_interactions
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Ensure community_posts has reposts and shares counter columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'reposts'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN reposts INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'shares'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'bookmarks_count'
  ) THEN
    ALTER TABLE public.community_posts ADD COLUMN bookmarks_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- RPC for Toggling Post Bookmark
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_bookmarked BOOLEAN;
  v_uuid UUID;
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_post_id) THEN
    DELETE FROM public.user_bookmarks WHERE user_id = v_user_id AND target_id = p_post_id;
    v_bookmarked := false;
  ELSE
    INSERT INTO public.user_bookmarks (user_id, target_id, target_type)
    VALUES (v_user_id, p_post_id, CASE WHEN p_post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'post' ELSE 'opportunity' END);
    v_bookmarked := true;
  END IF;

  -- If it's a valid post UUID, recalculate bookmarks_count
  IF p_post_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := p_post_id::uuid;
    SELECT count(*) INTO v_count FROM public.user_bookmarks WHERE target_id = p_post_id;
    UPDATE public.community_posts SET bookmarks_count = v_count WHERE id = v_uuid;
  ELSE
    SELECT count(*) INTO v_count FROM public.user_bookmarks WHERE target_id = p_post_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bookmarked', v_bookmarked,
    'bookmarks_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_bookmark(TEXT) TO authenticated, service_role;

-- RPC for Recording Post Interaction (Repost / Share)
CREATE OR REPLACE FUNCTION public.record_post_interaction(
  p_post_id UUID,
  p_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_type NOT IN ('repost', 'share') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid interaction type');
  END IF;

  INSERT INTO public.community_interactions (post_id, user_id, interaction_type)
  VALUES (p_post_id, v_user_id, p_type)
  ON CONFLICT (post_id, user_id, interaction_type) DO NOTHING;

  SELECT count(*) INTO v_count
  FROM public.community_interactions
  WHERE post_id = p_post_id AND interaction_type = p_type;

  IF p_type = 'repost' THEN
    UPDATE public.community_posts SET reposts = v_count WHERE id = p_post_id;
  ELSIF p_type = 'share' THEN
    UPDATE public.community_posts SET shares = v_count WHERE id = p_post_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'type', p_type,
    'count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_post_interaction(UUID, TEXT) TO authenticated, service_role;

-- 4. COMMENT SYSTEM: LIKES, SECURE DELETION & COUNT INTEGRITY
-- A. Comment Likes Table
CREATE TABLE IF NOT EXISTS public.community_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_comment_user_like UNIQUE (comment_id, user_id)
);

ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_comment_likes' AND policyname = 'Anyone can view comment likes'
  ) THEN
    CREATE POLICY "Anyone can view comment likes" ON public.community_comment_likes
      FOR SELECT TO authenticated, anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_comment_likes' AND policyname = 'Users can insert own comment likes'
  ) THEN
    CREATE POLICY "Users can insert own comment likes" ON public.community_comment_likes
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_comment_likes' AND policyname = 'Users can delete own comment likes'
  ) THEN
    CREATE POLICY "Users can delete own comment likes" ON public.community_comment_likes
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.community_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON public.community_comment_likes(user_id);

-- Ensure community_comments has likes counter column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'community_comments' AND column_name = 'likes'
  ) THEN
    ALTER TABLE public.community_comments ADD COLUMN likes INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- RPC for Toggling Comment Like
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_liked BOOLEAN;
  v_likes_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF EXISTS (SELECT 1 FROM public.community_comment_likes WHERE comment_id = p_comment_id AND user_id = v_user_id) THEN
    DELETE FROM public.community_comment_likes WHERE comment_id = p_comment_id AND user_id = v_user_id;
    v_liked := false;
  ELSE
    INSERT INTO public.community_comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user_id);
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

GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated, service_role;

-- RPC for Secure Comment Deletion (Author or Admin)
CREATE OR REPLACE FUNCTION public.delete_community_comment(p_comment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Comment not found');
  END IF;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = v_user_id;

  -- Allow author or admin
  IF v_comment_user_id != v_user_id AND v_user_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to delete this comment');
  END IF;

  -- Delete comment (cascade deletes community_comment_likes)
  DELETE FROM public.community_comments WHERE id = p_comment_id;

  -- Recalculate parent post comments count
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

GRANT EXECUTE ON FUNCTION public.delete_community_comment(UUID) TO authenticated, service_role;

-- Enable RLS DELETE policy on community_comments for direct queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_comments' AND policyname = 'Authors or admins can delete comments'
  ) THEN
    CREATE POLICY "Authors or admins can delete comments" ON public.community_comments
      FOR DELETE TO authenticated
      USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 5. MENTIONS AND NOTIFICATIONS DISPATCH
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
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_notif_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_link TEXT;
BEGIN
  -- Prevent self-notification
  IF v_actor_id IS NOT NULL AND v_actor_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_mention');
  END IF;

  -- Ensure target user exists and is not suspended
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id AND is_suspended = false) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'user_not_found_or_suspended');
  END IF;

  v_title := format('%s mentioned you', COALESCE(p_actor_name, 'A builder'));
  v_message := format('"%s"', substring(p_snippet from 1 for 120));
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

GRANT EXECUTE ON FUNCTION public.dispatch_mention_notification(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 6. SEARCH BACKEND INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_search_name ON public.profiles USING btree (full_name);
CREATE INDEX IF NOT EXISTS idx_community_posts_search_title ON public.community_posts USING btree (title);
CREATE INDEX IF NOT EXISTS idx_opportunities_search_title ON public.opportunities USING btree (title);
CREATE INDEX IF NOT EXISTS idx_opportunities_search_organizer ON public.opportunities USING btree (organizer);

