-- ==============================================================================
-- Migration: Unique Username System & Mentions Infrastructure
-- Date: 2026-11-13
-- Purpose:
--   1. Add unique, case-insensitive username column to public.profiles.
--   2. Enforce length (3-20 chars) and characters (letters, numbers, underscores).
--   3. Backfill existing user profiles with deterministic fallback usernames.
--   4. Provide check_username_available RPC for live availability checks.
--   5. Provide search_usernames_for_mention RPC for @ tagging in posts/comments.
--   6. Update handle_new_user trigger to preserve username from metadata.
-- ==============================================================================

-- 1. Add username column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;
END $$;

-- 2. Add validation check constraint on username format (3-20 chars, letters, numbers, underscores)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_username_format;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_username_format
  CHECK (username IS NULL OR (username ~ '^[a-zA-Z0-9_]{3,20}$'));

-- 3. Backfill any existing profiles that currently have NULL usernames
DO $$
DECLARE
  r RECORD;
  v_base TEXT;
  v_candidate TEXT;
  v_suffix INT;
BEGIN
  FOR r IN SELECT id, email, full_name, referral_id FROM public.profiles WHERE username IS NULL LOOP
    -- Derive base from email prefix or referral ID
    v_base := LOWER(REGEXP_REPLACE(SPLIT_PART(r.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'));
    IF length(v_base) < 3 THEN
      v_base := 'user_' || LOWER(REGEXP_REPLACE(COALESCE(r.referral_id, 'pm'), '[^a-zA-Z0-9_]', '', 'g'));
    END IF;
    IF length(v_base) > 16 THEN
      v_base := substring(v_base from 1 for 16);
    END IF;

    v_candidate := v_base;
    v_suffix := 1;

    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(v_candidate) AND id != r.id) LOOP
      v_candidate := substring(v_base from 1 for 15) || '_' || v_suffix;
      v_suffix := v_suffix + 1;
    END LOOP;

    UPDATE public.profiles
    SET username = v_candidate
    WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Create case-insensitive unique index on LOWER(username)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 5. RPC: check_username_available
-- Checks whether a normalized username is available and valid
CREATE OR REPLACE FUNCTION public.check_username_available(
  p_username TEXT,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  IF p_username IS NULL THEN
    RETURN jsonb_build_object('available', false, 'error', 'Username cannot be empty.');
  END IF;

  v_normalized := LOWER(TRIM(p_username));

  IF length(v_normalized) < 3 THEN
    RETURN jsonb_build_object('available', false, 'error', 'Username must be at least 3 characters.');
  END IF;

  IF length(v_normalized) > 20 THEN
    RETURN jsonb_build_object('available', false, 'error', 'Username cannot exceed 20 characters.');
  END IF;

  IF NOT (v_normalized ~ '^[a-zA-Z0-9_]{3,20}$') THEN
    RETURN jsonb_build_object('available', false, 'error', 'Only letters, numbers, and underscores are allowed.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = v_normalized
      AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
  ) THEN
    RETURN jsonb_build_object('available', false, 'error', 'This username is already taken.');
  END IF;

  RETURN jsonb_build_object('available', true, 'username', v_normalized);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT, UUID) TO authenticated, anon;

-- 6. RPC: search_usernames_for_mention
-- Used for real-time autocomplete when typing @ in posts and comments
CREATE OR REPLACE FUNCTION public.search_usernames_for_mention(
  p_query TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := LOWER(TRIM(p_query));
BEGIN
  IF v_clean IS NULL OR v_clean = '' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.full_name, p.avatar_url
    FROM public.profiles p
    WHERE p.is_suspended = FALSE AND p.username IS NOT NULL
    ORDER BY p.pixels DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT p.id, p.username, p.full_name, p.avatar_url
    FROM public.profiles p
    WHERE p.is_suspended = FALSE
      AND p.username IS NOT NULL
      AND (
        LOWER(p.username) LIKE (v_clean || '%')
        OR LOWER(p.username) LIKE ('%' || v_clean || '%')
        OR LOWER(p.full_name) LIKE ('%' || v_clean || '%')
      )
    ORDER BY
      CASE WHEN LOWER(p.username) = v_clean THEN 0
           WHEN LOWER(p.username) LIKE (v_clean || '%') THEN 1
           ELSE 2 END,
      p.pixels DESC
    LIMIT p_limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_usernames_for_mention(TEXT, INT) TO authenticated, anon;

-- 7. Update handle_new_user trigger to preserve username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id TEXT;
  v_username TEXT;
  v_candidate TEXT;
  v_suffix INT := 1;
BEGIN
  v_referral_id := 'PM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  
  -- Extract raw username from metadata if provided
  v_username := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')));
  
  -- Validate format
  IF v_username = '' OR NOT (v_username ~ '^[a-zA-Z0-9_]{3,20}$') THEN
    v_username := NULL;
  END IF;

  -- If username is provided, ensure uniqueness; if not (e.g. Google OAuth signups), auto-generate fallback
  IF v_username IS NOT NULL THEN
    v_candidate := v_username;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(v_candidate)) LOOP
      v_candidate := substring(v_username from 1 for 15) || '_' || v_suffix;
      v_suffix := v_suffix + 1;
    END LOOP;
    v_username := v_candidate;
  ELSE
    -- Auto-generate clean, unique handle for Google signups and external OAuth accounts
    v_candidate := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'));
    IF v_candidate IS NULL OR length(v_candidate) < 3 THEN
      v_candidate := LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'builder'), '[^a-zA-Z0-9_]', '_', 'g'));
    END IF;
    IF v_candidate IS NULL OR length(v_candidate) < 3 THEN
      v_candidate := 'user_' || LOWER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    END IF;
    IF length(v_candidate) > 15 THEN
      v_candidate := SUBSTRING(v_candidate FROM 1 FOR 15);
    END IF;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(v_candidate)) LOOP
      v_candidate := SUBSTRING(v_candidate FROM 1 FOR 14) || '_' || v_suffix;
      v_suffix := v_suffix + 1;
    END LOOP;
    v_username := v_candidate;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    username,
    role,
    pixels,
    rank,
    referral_id,
    college,
    course,
    year_of_study,
    branch
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Pixel Builder'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    v_username,
    'user',
    0,
    'Pixel Novice',
    v_referral_id,
    NEW.raw_user_meta_data->>'college',
    NEW.raw_user_meta_data->>'course',
    NEW.raw_user_meta_data->>'year_of_study',
    NEW.raw_user_meta_data->>'branch'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;

-- 8. Notify PostgREST to immediately refresh its OpenAPI schema cache
NOTIFY pgrst, 'reload schema';

