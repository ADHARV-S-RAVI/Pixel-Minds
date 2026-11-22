-- ==============================================================================
-- PHASE 1: SUPABASE SECURITY AND PRIVACY HARDENING
-- Migration: 20261121110000_phase1_security_and_privacy_hardening.sql
-- Target: gdvycwwonnfpvldgbatb.supabase.co
-- Description:
--   1. Separates public profile data from private profile data via public_profiles view.
--   2. Restricts public.profiles SELECT to row owner and admins (eliminates USING (true)).
--   3. Provides a secure BEFORE UPDATE trigger to protect system columns without subquery recursion.
--   4. Provides a secure validate_referral_code RPC returning JSONB.
--   5. Hardens Supabase Storage RLS policies with ownership enforcement and admin gates.
--   6. Hardens search_path and execution privileges on SECURITY DEFINER functions.
-- ==============================================================================

-- 1. Create secure public profile view exposing ONLY approved non-sensitive columns
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

COMMENT ON VIEW public.public_profiles IS
'Publicly readable user profile information. Excludes sensitive private fields (email, referral_id, education, role, is_suspended).';

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- 2. Secure RLS policies on public.profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self view or admin view" ON public.profiles;

-- Only the account owner or verified admin can select from public.profiles
CREATE POLICY "Profiles self view or admin view"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = id OR public.is_admin()
);

-- Trigger function is SECURITY INVOKER (NOT SECURITY DEFINER)
-- Runs under the caller's actual execution context.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Internal database operations:
  -- When SECURITY DEFINER functions execute an update, PostgreSQL sets current_user to 'postgres'.
  -- Also allow service_role callers.
  IF current_user = 'postgres' OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is verified admin
  BEGIN
    v_is_admin := public.is_admin();
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := FALSE;
  END;

  IF v_is_admin IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Strictly forbid regular users from modifying any protected fields
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify user ID.';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email address directly via profile update.';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify account role.';
  END IF;

  IF NEW.pixels IS DISTINCT FROM OLD.pixels THEN
    RAISE EXCEPTION 'Cannot modify pixel balance directly.';
  END IF;

  IF NEW.rank IS DISTINCT FROM OLD.rank THEN
    RAISE EXCEPTION 'Cannot modify rank directly.';
  END IF;

  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended THEN
    RAISE EXCEPTION 'Cannot modify account suspension status.';
  END IF;

  IF NEW.referral_id IS DISTINCT FROM OLD.referral_id THEN
    RAISE EXCEPTION 'Cannot modify referral code.';
  END IF;

  IF NEW.opportunities_shared IS DISTINCT FROM OLD.opportunities_shared THEN
    RAISE EXCEPTION 'Cannot modify opportunities_shared counter.';
  END IF;

  IF NEW.approved_submissions IS DISTINCT FROM OLD.approved_submissions THEN
    RAISE EXCEPTION 'Cannot modify approved_submissions counter.';
  END IF;

  IF NEW.referrals IS DISTINCT FROM OLD.referrals THEN
    RAISE EXCEPTION 'Cannot modify referrals counter.';
  END IF;

  IF NEW.contributions IS DISTINCT FROM OLD.contributions THEN
    RAISE EXCEPTION 'Cannot modify contributions counter.';
  END IF;

  IF NEW.badges IS DISTINCT FROM OLD.badges THEN
    RAISE EXCEPTION 'Cannot modify user badges directly.';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify account creation timestamp.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();

-- Clean RLS update policy without self-referencing subqueries
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- 3. Secure RPC to validate referral codes returning JSONB (no DROP needed)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_code TEXT;
  v_referrer_id UUID;
  v_referrer_name TEXT;
BEGIN
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Please enter a referral code.');
  END IF;

  v_clean_code := UPPER(TRIM(p_code));

  -- Filter out promotional coupon attempts
  IF v_clean_code LIKE 'CP-%'
     OR v_clean_code LIKE 'COUPON%'
     OR v_clean_code LIKE '%DISCOUNT%'
     OR v_clean_code LIKE '%PROMO%' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Coupons are currently unavailable. Please enter a valid Pixel Minds referral code.'
    );
  END IF;

  -- Lookup referrer by referral_id, explicitly rejecting suspended accounts
  SELECT id, COALESCE(full_name, 'Pixel Member')
  INTO v_referrer_id, v_referrer_name
  FROM public.profiles
  WHERE UPPER(referral_id) = v_clean_code
    AND is_suspended = FALSE
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Invalid referral code. Please check the code and try again.');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', v_referrer_id,
    'referrer_name', v_referrer_name,
    'message', 'Valid referral from ' || v_referrer_name || '!'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated, service_role;

-- 4. Storage Security Hardening
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('opportunity-banners', 'opportunity-banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('post-images', 'post-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]),
  ('announcement-images', 'announcement-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop all older broad policies on storage.objects to eliminate OR combination bypasses
DROP POLICY IF EXISTS "Admins can upload announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can view announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view public bucket images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can upload opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can update opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can delete opportunity banners" ON storage.objects;

-- 4.1 Public View: anyone can view images in public buckets
CREATE POLICY "Public can view public bucket images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'opportunity-banners', 'post-images', 'announcement-images', 'opportunities'));

-- 4.2 Avatars: users can only upload into their own folder (auth.uid()::text/...)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR public.is_admin()
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR public.is_admin()
  )
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR public.is_admin()
  )
);

-- 4.3 Post Images: authenticated users can upload for community posts
CREATE POLICY "Users can upload own post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can update own post images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'posts' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 4.4 Opportunity Banners: authenticated users submitting opps or admins
CREATE POLICY "Users and admins can upload opportunity banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'banners' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users and admins can update opportunity banners"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'banners' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'banners' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users and admins can delete opportunity banners"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR ((storage.foldername(name))[1] = 'banners' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR ((storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 4.5 Announcement Images: strictly admins
CREATE POLICY "Admins can manage announcement images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'announcement-images' AND public.is_admin())
WITH CHECK (bucket_id = 'announcement-images' AND public.is_admin());

-- 5. Harden search_path on critical functions & revoke public maintenance execution
REVOKE ALL ON FUNCTION public.cleanup_old_security_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs() TO service_role;

ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_pixel_transaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_user_application_timestamps() SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_notification_rpc(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.send_notification_rpc(text, text, text, text, uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.user_has_notification(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_username_available(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_usernames_for_mention(text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_referral_code(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_registration_pixels(text, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.confirm_opportunity_registration(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_community_posts() SET search_path = public, pg_temp;
ALTER FUNCTION public.run_community_feed_cleanup() SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
