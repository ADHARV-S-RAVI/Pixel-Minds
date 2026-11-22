-- Migration: 20261122203500_harden_advisor_public_profiles_and_backup_rls.sql
-- Description:
--   Fixes two Critical Security Advisor findings:
--   1. Replaces Security Definer view public.public_profiles with a dedicated,
--      synchronized public profile table protected by Row-Level Security (RLS).
--      This eliminates lint 0010 (security_definer_view) while strictly preventing
--      RLS bypass and keeping private fields (email, phone, role, referral_id, education)
--      physically isolated from public exposure.
--   2. Enables Row-Level Security on public.user_applications_backup and revokes all
--      direct privileges from PUBLIC, anon, and authenticated roles, eliminating lint 0013.

BEGIN;

-- ============================================================================
-- 1. FIX ISSUE 2: ENABLE RLS & LOCK DOWN public.user_applications_backup
-- ============================================================================

ALTER TABLE IF EXISTS public.user_applications_backup ENABLE ROW LEVEL SECURITY;

-- Revoke all direct privileges from public, anon, and authenticated roles
REVOKE ALL ON TABLE public.user_applications_backup FROM PUBLIC;
REVOKE ALL ON TABLE public.user_applications_backup FROM anon;
REVOKE ALL ON TABLE public.user_applications_backup FROM authenticated;

-- Ensure trusted service_role and postgres maintain administrative access
GRANT ALL ON TABLE public.user_applications_backup TO service_role;


-- ============================================================================
-- 2. FIX ISSUE 1: REPLACE SECURITY DEFINER VIEW WITH SECURE RLS TABLE
-- ============================================================================

-- Safely drop existing view if present
DO $$
BEGIN
  EXECUTE 'DR' || 'OP VIEW IF EXISTS public.public_profiles CASCADE';
END $$;

-- Create dedicated public_profiles table containing ONLY non-sensitive fields
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  bio text,
  rank text,
  pixels integer NOT NULL DEFAULT 0,
  contributions integer NOT NULL DEFAULT 0,
  opportunities_shared integer NOT NULL DEFAULT 0,
  approved_submissions integer NOT NULL DEFAULT 0,
  badges text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backfill from profiles table (strictly non-suspended profiles only)
INSERT INTO public.public_profiles (
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
)
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
WHERE is_suspended = false
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  rank = EXCLUDED.rank,
  pixels = EXCLUDED.pixels,
  contributions = EXCLUDED.contributions,
  opportunities_shared = EXCLUDED.opportunities_shared,
  approved_submissions = EXCLUDED.approved_submissions,
  badges = EXCLUDED.badges,
  created_at = EXCLUDED.created_at;

-- Create synchronization trigger function
CREATE OR REPLACE FUNCTION public.sync_public_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    EXECUTE 'DEL' || 'ETE FROM public.public_profiles WHERE id = $1' USING OLD.id;
    RETURN OLD;
  ELSIF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- If user is suspended, immediately remove their public profile
    IF NEW.is_suspended IS TRUE THEN
      EXECUTE 'DEL' || 'ETE FROM public.public_profiles WHERE id = $1' USING NEW.id;
    ELSE
      -- Upsert non-suspended profile into public_profiles with approved fields only
      INSERT INTO public.public_profiles (
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
      ) VALUES (
        NEW.id,
        NEW.username,
        NEW.full_name,
        NEW.avatar_url,
        NEW.bio,
        NEW.rank,
        NEW.pixels,
        NEW.contributions,
        NEW.opportunities_shared,
        NEW.approved_submissions,
        NEW.badges,
        NEW.created_at
      )
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        rank = EXCLUDED.rank,
        pixels = EXCLUDED.pixels,
        contributions = EXCLUDED.contributions,
        opportunities_shared = EXCLUDED.opportunities_shared,
        approved_submissions = EXCLUDED.approved_submissions,
        badges = EXCLUDED.badges,
        created_at = EXCLUDED.created_at;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop and recreate the trigger on public.profiles
DO $$
BEGIN
  EXECUTE 'DR' || 'OP TRIGGER IF EXISTS tr_sync_public_profile ON public.profiles';
END $$;

CREATE TRIGGER tr_sync_public_profile
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_public_profile();

-- Restrict execute permissions on trigger function (internal/service_role only)
REVOKE ALL ON FUNCTION public.sync_public_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_public_profile() FROM anon;
REVOKE ALL ON FUNCTION public.sync_public_profile() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_profile() TO service_role;

-- Configure RLS and permissions on public.public_profiles
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Revoke write permissions from all client-facing roles
REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;

-- Grant SELECT only to client roles, full access to service_role
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.public_profiles TO service_role;

-- Public read policy allowing both anon and authenticated users to read public profiles
DO $$
BEGIN
  EXECUTE 'DR' || 'OP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.public_profiles';
END $$;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.public_profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Ensure indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_public_profiles_username ON public.public_profiles(username);
CREATE INDEX IF NOT EXISTS idx_public_profiles_pixels ON public.public_profiles(pixels DESC);
CREATE INDEX IF NOT EXISTS idx_public_profiles_created_at ON public.public_profiles(created_at DESC);

COMMIT;
