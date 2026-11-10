-- ==============================================================================
-- Migration: Feed Authentication, Secure Interactions & 30-Day Retention Cleanup
-- Date: 2026-11-10 (Targeted Audit & Hardened Fixes)
-- ==============================================================================

-- 1. Ensure Table Creation with Initial Schema
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Pixel Member',
  author_avatar TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Validate Data Integrity, Handle Orphans & Safely Align Column Types
DO $$
DECLARE
  v_invalid_likes_post INTEGER := 0;
  v_invalid_likes_user INTEGER := 0;
  v_invalid_comments_post INTEGER := 0;
  v_invalid_comments_user INTEGER := 0;
  v_orphaned_likes_post INTEGER := 0;
  v_orphaned_likes_user INTEGER := 0;
  v_orphaned_comments_post INTEGER := 0;
  v_orphaned_comments_user INTEGER := 0;
  v_regex TEXT := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  -- ==========================================================================
  -- A. community_likes Validation & Safe Type Alignment
  -- ==========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_likes') THEN
    -- Check if post_id is text and validate syntax before casting
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'community_likes' AND column_name = 'post_id' AND data_type != 'uuid'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.community_likes WHERE post_id::text !~* %L', v_regex) INTO v_invalid_likes_post;
      IF v_invalid_likes_post > 0 THEN
        RAISE EXCEPTION 'Cannot convert community_likes.post_id to UUID: % rows contain non-UUID values.', v_invalid_likes_post;
      END IF;

      ALTER TABLE public.community_likes ALTER COLUMN post_id TYPE UUID USING post_id::uuid;
    END IF;

    -- Check if user_id is text and validate syntax before casting
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'community_likes' AND column_name = 'user_id' AND data_type != 'uuid'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.community_likes WHERE user_id::text !~* %L', v_regex) INTO v_invalid_likes_user;
      IF v_invalid_likes_user > 0 THEN
        RAISE EXCEPTION 'Cannot convert community_likes.user_id to UUID: % rows contain non-UUID values.', v_invalid_likes_user;
      END IF;

      ALTER TABLE public.community_likes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;

    -- Clean orphaned post references (posts that no longer exist)
    SELECT count(*) INTO v_orphaned_likes_post
    FROM public.community_likes l
    WHERE NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = l.post_id);

    IF v_orphaned_likes_post > 0 THEN
      RAISE NOTICE 'Removing % orphaned community_likes records referencing non-existent posts.', v_orphaned_likes_post;
      DELETE FROM public.community_likes l
      WHERE NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = l.post_id);
    END IF;

    -- Clean orphaned user references (users that no longer exist)
    SELECT count(*) INTO v_orphaned_likes_user
    FROM public.community_likes l
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = l.user_id);

    IF v_orphaned_likes_user > 0 THEN
      RAISE NOTICE 'Removing % orphaned community_likes records referencing non-existent users.', v_orphaned_likes_user;
      DELETE FROM public.community_likes l
      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = l.user_id);
    END IF;
  END IF;

  -- ==========================================================================
  -- B. community_comments Validation & Safe Type Alignment
  -- ==========================================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_comments') THEN
    -- Check if post_id is text and validate syntax before casting
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'community_comments' AND column_name = 'post_id' AND data_type != 'uuid'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.community_comments WHERE post_id::text !~* %L', v_regex) INTO v_invalid_comments_post;
      IF v_invalid_comments_post > 0 THEN
        RAISE EXCEPTION 'Cannot convert community_comments.post_id to UUID: % rows contain non-UUID values.', v_invalid_comments_post;
      END IF;

      ALTER TABLE public.community_comments ALTER COLUMN post_id TYPE UUID USING post_id::uuid;
    END IF;

    -- Check if user_id is text and validate syntax before casting
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'community_comments' AND column_name = 'user_id' AND data_type != 'uuid'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.community_comments WHERE user_id::text !~* %L', v_regex) INTO v_invalid_comments_user;
      IF v_invalid_comments_user > 0 THEN
        RAISE EXCEPTION 'Cannot convert community_comments.user_id to UUID: % rows contain non-UUID values.', v_invalid_comments_user;
      END IF;

      ALTER TABLE public.community_comments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    END IF;

    -- Clean orphaned post references (posts that no longer exist)
    SELECT count(*) INTO v_orphaned_comments_post
    FROM public.community_comments c
    WHERE NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = c.post_id);

    IF v_orphaned_comments_post > 0 THEN
      RAISE NOTICE 'Removing % orphaned community_comments records referencing non-existent posts.', v_orphaned_comments_post;
      DELETE FROM public.community_comments c
      WHERE NOT EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = c.post_id);
    END IF;

    -- Clean orphaned user references (users that no longer exist)
    SELECT count(*) INTO v_orphaned_comments_user
    FROM public.community_comments c
    WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);

    IF v_orphaned_comments_user > 0 THEN
      RAISE NOTICE 'Removing % orphaned community_comments records referencing non-existent users.', v_orphaned_comments_user;
      DELETE FROM public.community_comments c
      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = c.user_id);
    END IF;
  END IF;
END $$;

-- 3. Foreign Key & Unique Constraint Audit & Hardening (Ensuring ON DELETE CASCADE)
DO $$
DECLARE
  v_con RECORD;
  v_has_cascade_fk BOOLEAN;
BEGIN
  -- --------------------------------------------------------------------------
  -- A. community_likes -> community_posts (ON DELETE CASCADE)
  -- --------------------------------------------------------------------------
  v_has_cascade_fk := FALSE;
  FOR v_con IN (
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'public.community_likes'::regclass
      AND confrelid = 'public.community_posts'::regclass
      AND contype = 'f'
  ) LOOP
    IF v_con.confdeltype = 'c' THEN
      v_has_cascade_fk := TRUE;
    ELSE
      EXECUTE format('ALTER TABLE public.community_likes DROP CONSTRAINT %I', v_con.conname);
    END IF;
  END LOOP;

  IF NOT v_has_cascade_fk THEN
    ALTER TABLE public.community_likes
      ADD CONSTRAINT fk_community_likes_post
      FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- B. community_likes -> auth.users (ON DELETE CASCADE)
  -- --------------------------------------------------------------------------
  v_has_cascade_fk := FALSE;
  FOR v_con IN (
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'public.community_likes'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
  ) LOOP
    IF v_con.confdeltype = 'c' THEN
      v_has_cascade_fk := TRUE;
    ELSE
      EXECUTE format('ALTER TABLE public.community_likes DROP CONSTRAINT %I', v_con.conname);
    END IF;
  END LOOP;

  IF NOT v_has_cascade_fk THEN
    ALTER TABLE public.community_likes
      ADD CONSTRAINT fk_community_likes_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- C. community_likes Unique Constraint (post_id, user_id)
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_likes'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.community_likes'::regclass AND attname = 'post_id'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.community_likes'::regclass AND attname = 'user_id')
      ]
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'public.community_likes'::regclass AND conname = 'unique_post_user_like'
    ) THEN
      ALTER TABLE public.community_likes ADD CONSTRAINT unique_post_user_like UNIQUE (post_id, user_id);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- D. community_comments -> community_posts (ON DELETE CASCADE)
  -- --------------------------------------------------------------------------
  v_has_cascade_fk := FALSE;
  FOR v_con IN (
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'public.community_comments'::regclass
      AND confrelid = 'public.community_posts'::regclass
      AND contype = 'f'
  ) LOOP
    IF v_con.confdeltype = 'c' THEN
      v_has_cascade_fk := TRUE;
    ELSE
      EXECUTE format('ALTER TABLE public.community_comments DROP CONSTRAINT %I', v_con.conname);
    END IF;
  END LOOP;

  IF NOT v_has_cascade_fk THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT fk_community_comments_post
      FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
  END IF;

  -- --------------------------------------------------------------------------
  -- E. community_comments -> auth.users (ON DELETE CASCADE)
  -- --------------------------------------------------------------------------
  v_has_cascade_fk := FALSE;
  FOR v_con IN (
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'public.community_comments'::regclass
      AND confrelid = 'auth.users'::regclass
      AND contype = 'f'
  ) LOOP
    IF v_con.confdeltype = 'c' THEN
      v_has_cascade_fk := TRUE;
    ELSE
      EXECUTE format('ALTER TABLE public.community_comments DROP CONSTRAINT %I', v_con.conname);
    END IF;
  END LOOP;

  IF NOT v_has_cascade_fk THEN
    ALTER TABLE public.community_comments
      ADD CONSTRAINT fk_community_comments_user
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Dynamic RLS Policy Cleanup & Re-creation
-- Drops 100% of existing policies on all 3 tables dynamically so no legacy permissive policy remains
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('community_posts', 'community_likes', 'community_comments')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Policies for public.community_posts
-- ----------------------------------------------------------------------------
-- SELECT: Public can view published posts; authenticated users can view own posts; admins view all
CREATE POLICY "community_posts_select_policy"
ON public.community_posts FOR SELECT
USING (
  status = 'published'
  OR (auth.role() = 'authenticated' AND (auth.uid()::text = user_id::text OR public.is_admin()))
);

-- INSERT: Authenticated users can insert own standard posts; admins can post with admin source or featured
CREATE POLICY "community_posts_insert_policy"
ON public.community_posts FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (
    (auth.uid()::text = user_id::text AND (source IS NULL OR source = 'user') AND (featured IS NOT TRUE))
    OR public.is_admin()
  )
);

-- UPDATE: Authors can select/update their own posts; admins can moderate all posts
DROP POLICY IF EXISTS "community_posts_update_policy" ON public.community_posts;
CREATE POLICY "community_posts_update_policy"
ON public.community_posts FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND (auth.uid()::text = user_id::text OR public.is_admin())
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND (auth.uid()::text = user_id::text OR public.is_admin())
);

-- Trigger Function: Strictly prevent non-admin users from changing admin/protected fields on UPDATE
CREATE OR REPLACE FUNCTION public.protect_community_posts_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role and verified admins retain full unrestricted moderation access
  IF (auth.role() = 'service_role') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 1. Ownership & Identity Protection
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify post ID.';
  END IF;

  IF NEW.user_id::text IS DISTINCT FROM OLD.user_id::text THEN
    RAISE EXCEPTION 'Cannot modify post ownership (user_id).';
  END IF;

  -- 2. Admin & Moderation Controls Protection
  IF NEW.source IS DISTINCT FROM OLD.source THEN
    RAISE EXCEPTION 'Cannot modify post source. Admin access required.';
  END IF;

  IF NEW.featured IS DISTINCT FROM OLD.featured THEN
    RAISE EXCEPTION 'Cannot modify featured status. Admin access required.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify post status. Admin moderation required.';
  END IF;

  IF NEW.author_role IS DISTINCT FROM OLD.author_role THEN
    RAISE EXCEPTION 'Cannot modify author role. Admin access required.';
  END IF;

  IF NEW.author_name IS DISTINCT FROM OLD.author_name THEN
    RAISE EXCEPTION 'Cannot modify author name on existing posts.';
  END IF;

  -- 3. Interaction Counters Protection (counters are managed exclusively via secure RPCs)
  IF NEW.likes IS DISTINCT FROM OLD.likes THEN
    RAISE EXCEPTION 'Cannot directly modify like count. Use like RPC.';
  END IF;

  IF NEW.comments IS DISTINCT FROM OLD.comments THEN
    RAISE EXCEPTION 'Cannot directly modify comment count. Use comment RPC.';
  END IF;

  -- 4. Audit Timestamp Protection
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify post created_at timestamp.';
  END IF;

  -- Automatically update timestamp for permitted content edits
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

-- Safely attach or replace the trigger on public.community_posts
DROP TRIGGER IF EXISTS tr_protect_community_posts_fields ON public.community_posts;
CREATE TRIGGER tr_protect_community_posts_fields
BEFORE UPDATE ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.protect_community_posts_fields();

-- DELETE: Post author can delete their own post; admins can delete any post
CREATE POLICY "community_posts_delete_policy"
ON public.community_posts FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND (auth.uid()::text = user_id::text OR public.is_admin())
);

-- ----------------------------------------------------------------------------
-- Policies for public.community_likes
-- ----------------------------------------------------------------------------
-- SELECT: Public can read like records
CREATE POLICY "community_likes_select_policy"
ON public.community_likes FOR SELECT
USING (true);

-- INSERT: Only authenticated users can insert likes for themselves
CREATE POLICY "community_likes_insert_policy"
ON public.community_likes FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND auth.uid()::text = user_id::text
);

-- DELETE: Authenticated users can remove their own like; admins can moderate
CREATE POLICY "community_likes_delete_policy"
ON public.community_likes FOR DELETE
USING (
  auth.role() = 'authenticated' AND (auth.uid()::text = user_id::text OR public.is_admin())
);

-- ----------------------------------------------------------------------------
-- Policies for public.community_comments
-- ----------------------------------------------------------------------------
-- SELECT: Public can read comment records
CREATE POLICY "community_comments_select_policy"
ON public.community_comments FOR SELECT
USING (true);

-- INSERT: Only authenticated users can insert comments for themselves
CREATE POLICY "community_comments_insert_policy"
ON public.community_comments FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND auth.uid()::text = user_id::text
);

-- UPDATE: Comment author can update their own comment; admins can moderate
CREATE POLICY "community_comments_update_policy"
ON public.community_comments FOR UPDATE
USING (
  auth.role() = 'authenticated' AND (auth.uid()::text = user_id::text OR public.is_admin())
)
WITH CHECK (
  auth.role() = 'authenticated' AND (auth.uid()::text = user_id::text OR public.is_admin())
);

-- DELETE: Comment author can delete their own comment; admins can moderate
CREATE POLICY "community_comments_delete_policy"
ON public.community_comments FOR DELETE
USING (
  auth.role() = 'authenticated' AND (auth.uid()::text = user_id::text OR public.is_admin())
);

-- 5. Concurrency-Safe RPC: Toggle Community Post Like
CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_new_likes INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.';
  END IF;

  -- Row-level lock on the post row to prevent concurrent race conditions
  PERFORM 1 FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Atomic delete check
  DELETE FROM public.community_likes
  WHERE post_id = p_post_id AND user_id::text = v_user_id::text;

  IF FOUND THEN
    v_liked := false;
  ELSE
    INSERT INTO public.community_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := true;
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

-- 6. Concurrency-Safe RPC: Add Community Post Comment
CREATE OR REPLACE FUNCTION public.add_community_post_comment(
  p_post_id UUID,
  p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    RAISE EXCEPTION 'Authentication required to comment on posts.';
  END IF;

  v_trimmed_text := btrim(p_text);
  IF v_trimmed_text IS NULL OR length(v_trimmed_text) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty.';
  END IF;

  -- Row-level lock on the post row
  PERFORM 1 FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Resolve author profile details with type-safe text matching
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
    'comments_count', COALESCE(v_new_comments, 1)
  );
END;
$$;

-- Secure Permissions for Interaction RPCs: Revoke from PUBLIC and anon
REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_community_post_like(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- 7. Indexing & Automated 30-Day Cleanup (Preserving Announcements & Featured)
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at_retention
ON public.community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id
ON public.community_likes (post_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id
ON public.community_comments (post_id);

CREATE OR REPLACE FUNCTION public.cleanup_expired_community_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete standard user posts older than 30 days.
  -- Strictly preserves admin announcements (source = 'admin') and featured posts (featured = true).
  DELETE FROM public.community_posts
  WHERE created_at < (timezone('utc'::text, now()) - INTERVAL '30 days')
    AND (source IS NULL OR source != 'admin')
    AND (featured IS NOT TRUE);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_community_posts() IS
'Deletes standard user community posts older than 30 days while strictly preserving admin announcements and featured posts.';

CREATE OR REPLACE FUNCTION public.run_community_feed_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  v_count := public.cleanup_expired_community_posts();
  RETURN jsonb_build_object(
    'success', true,
    'deleted_posts', v_count,
    'cleaned_at', timezone('utc'::text, now())
  );
END;
$$;

-- Restrict cleanup execution ONLY to service_role (and superuser).
-- Normal authenticated users and anon CANNOT trigger feed deletions.
REVOKE ALL ON FUNCTION public.cleanup_expired_community_posts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_expired_community_posts() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_community_posts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_community_posts() TO service_role;

REVOKE ALL ON FUNCTION public.run_community_feed_cleanup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_community_feed_cleanup() FROM anon;
REVOKE ALL ON FUNCTION public.run_community_feed_cleanup() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.run_community_feed_cleanup() TO service_role;

-- 8. Schedule pg_cron Job (With Duplicate Prevention and Warning Reporting)
DO $$
DECLARE
  v_job_exists BOOLEAN := FALSE;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Check if a job with this name already exists in cron.job
    SELECT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'daily-community-posts-cleanup'
    ) INTO v_job_exists;

    IF v_job_exists THEN
      PERFORM cron.unschedule('daily-community-posts-cleanup');
    END IF;

    -- Schedule daily run at 03:00 UTC
    PERFORM cron.schedule(
      'daily-community-posts-cleanup',
      '0 3 * * *',
      'SELECT public.run_community_feed_cleanup();'
    );
    RAISE NOTICE 'pg_cron job "daily-community-posts-cleanup" scheduled successfully.';
  ELSE
    RAISE WARNING 'pg_cron extension is not enabled in this database. Automatic cleanup was not registered in pg_cron. Enable pg_cron in Supabase Dashboard (Database -> Extensions) or run cleanup via external service_role cron.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to schedule pg_cron job "daily-community-posts-cleanup": %', SQLERRM;
END;
$$;
