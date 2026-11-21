-- ==============================================================================
-- PIXEL MINDS: REMOTE SUPABASE REPAIR & SYNC SCRIPT
-- Project: gdvycwwonnfpvldgbatb.supabase.co
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/gdvycwwonnfpvldgbatb/sql/new
-- ==============================================================================

-- 1. Ensure likes column exists on community_comments
ALTER TABLE IF EXISTS public.community_comments 
ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- 2. Ensure public_profiles view exists with proper non-sensitive projection
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  rank,
  pixels,
  contributions,
  opportunities_shared,
  approved_submissions,
  badges,
  created_at
FROM public.profiles
WHERE is_suspended = FALSE;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- 3. Ensure user_bookmarks table exists with RLS
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
    CREATE POLICY "Users can view own bookmarks" ON public.user_bookmarks FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_bookmarks' AND policyname = 'Users can insert own bookmarks'
  ) THEN
    CREATE POLICY "Users can insert own bookmarks" ON public.user_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_bookmarks' AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks" ON public.user_bookmarks FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_target ON public.user_bookmarks(target_id, target_type);
GRANT ALL ON public.user_bookmarks TO authenticated, service_role;

-- 4. Repaired RPC: add_community_post_comment (prevents column "title" error)
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
  v_user_id UUID := auth.uid();
  v_author_name TEXT;
  v_author_avatar TEXT;
  v_author_role TEXT;
  v_new_comment_id UUID;
  v_comments_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to post comments.';
  END IF;

  IF p_text IS NULL OR TRIM(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text cannot be empty.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = p_post_id
  ) THEN
    RAISE EXCEPTION 'Target post does not exist.';
  END IF;

  -- Resolve author profile details
  SELECT 
    COALESCE(NULLIF(TRIM(p.full_name), ''), p.username, 'Pixel Member'),
    p.avatar_url,
    COALESCE(p.role, 'user')
  INTO v_author_name, v_author_avatar, v_author_role
  FROM public.profiles p
  WHERE p.id = v_user_id;

  v_author_name := COALESCE(v_author_name, 'Pixel Member');

  INSERT INTO public.community_comments (
    post_id,
    user_id,
    author_name,
    author_role,
    author_avatar,
    text,
    likes
  )
  VALUES (
    p_post_id,
    v_user_id,
    v_author_name,
    v_author_role,
    v_author_avatar,
    TRIM(p_text),
    0
  )
  RETURNING id INTO v_new_comment_id;

  -- Synchronize comment counter on post
  SELECT count(*)::integer INTO v_comments_count
  FROM public.community_comments
  WHERE post_id = p_post_id;

  UPDATE public.community_posts
  SET comments = v_comments_count
  WHERE id = p_post_id;

  RETURN jsonb_build_object(
    'success', true,
    'comment', jsonb_build_object(
      'id', v_new_comment_id,
      'author_name', v_author_name,
      'author_role', v_author_role,
      'author_avatar', v_author_avatar
    ),
    'comments_count', v_comments_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- 5. Repaired RPC: toggle_post_bookmark
CREATE OR REPLACE FUNCTION public.toggle_post_bookmark(p_post_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_clean_id TEXT;
  v_bookmarked BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  v_clean_id := CASE WHEN p_post_id LIKE 'p%' THEN substring(p_post_id from 2) ELSE p_post_id END;

  IF EXISTS (
    SELECT 1 FROM public.user_bookmarks 
    WHERE user_id = v_user_id AND (target_id = v_clean_id OR target_id = p_post_id)
  ) THEN
    DELETE FROM public.user_bookmarks 
    WHERE user_id = v_user_id AND (target_id = v_clean_id OR target_id = p_post_id);
    v_bookmarked := false;
  ELSE
    INSERT INTO public.user_bookmarks (user_id, target_id, target_type)
    VALUES (
      v_user_id, 
      v_clean_id, 
      CASE WHEN v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'post' ELSE 'opportunity' END
    );
    v_bookmarked := true;
  END IF;

  SELECT count(*)::integer INTO v_count 
  FROM public.user_bookmarks 
  WHERE target_id = v_clean_id OR target_id = p_post_id;

  IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    UPDATE public.community_posts SET bookmarks_count = v_count WHERE id = v_clean_id::uuid;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bookmarked', v_bookmarked,
    'bookmarks_count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_bookmark(TEXT) TO authenticated, service_role;

-- 6. RPC: record_post_interaction (Reposts / Shares)
CREATE OR REPLACE FUNCTION public.record_post_interaction(
  p_post_id UUID,
  p_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_type = 'repost' THEN
    UPDATE public.community_posts
    SET reposts = COALESCE(reposts, 0) + 1
    WHERE id = p_post_id
    RETURNING reposts INTO v_count;
  ELSIF p_type = 'share' THEN
    UPDATE public.community_posts
    SET shares = COALESCE(shares, 0) + 1
    WHERE id = p_post_id
    RETURNING shares INTO v_count;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid interaction type');
  END IF;

  RETURN jsonb_build_object('success', true, 'count', COALESCE(v_count, 1));
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_post_interaction(UUID, TEXT) TO authenticated, service_role;

-- 7. Dedicated RPC: get_post_likers(p_post_id UUID)
CREATE OR REPLACE FUNCTION public.get_post_likers(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.community_likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.post_id = p_post_id
    AND p.is_suspended = FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_post_likers(UUID) TO anon, authenticated, service_role;

-- 8. Refresh Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
