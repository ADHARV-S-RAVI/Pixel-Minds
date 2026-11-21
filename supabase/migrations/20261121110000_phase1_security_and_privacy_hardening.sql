-- ==============================================================================
-- PHASE 1: SUPABASE SECURITY AND PRIVACY HARDENING
-- Migration: 20261121110000_phase1_security_and_privacy_hardening.sql
-- Description:
--   1. Separates public profile data from private profile data via public_profiles view.
--   2. Restricts public.profiles SELECT to row owner and admins (eliminates USING (true)).
--   3. Provides a secure validate_referral_code RPC to prevent exposing private referral IDs.
--   4. Hardens Supabase Storage RLS policies with ownership enforcement and admin gates.
--   5. Hardens search_path and execution privileges on SECURITY DEFINER functions.
-- ==============================================================================

-- 1. Create secure public profile view exposing ONLY approved non-sensitive columns
CREATE OR REPLACE VIEW public.public_profiles AS
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

-- Grant SELECT access on view to anon, authenticated, and service_role
GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- 2. Secure RLS policies on public.profiles table
-- Drop any overly permissive SELECT policies that expose private columns
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

-- Ensure users can only update their own profile safe fields (admins can update any)
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
CREATE POLICY "Users can update own safe profile fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (
  (auth.uid() = id AND 
   role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
   is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid()) AND
   pixels = (SELECT pixels FROM public.profiles WHERE id = auth.uid()))
  OR public.is_admin()
);

-- 3. Secure RPC to validate referral codes without exposing profiles table
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  referrer_id UUID,
  referrer_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_code IS NULL OR TRIM(p_code) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    TRUE,
    p.id,
    COALESCE(p.full_name, 'Pixel Member')
  FROM public.profiles p
  WHERE LOWER(p.referral_id) = LOWER(TRIM(p_code))
    AND p.is_suspended = FALSE
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated, service_role;

-- 4. Storage Security Hardening
-- Ensure storage buckets exist and have correct access limits
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

-- Drop older broad/permissive policies on storage.objects to prevent OR combination leaks
DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view announcement images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload announcement images" ON storage.objects;

DROP POLICY IF EXISTS "Public can view public bucket images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can upload opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can delete opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own post images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage announcement images" ON storage.objects;

-- 4.1 Public View: anyone can view images in public buckets
CREATE POLICY "Public can view public bucket images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'opportunity-banners', 'post-images', 'announcement-images'));

-- 4.2 Avatars: users can only upload into their own folder (auth.uid()::text/...)
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
  )
);

CREATE POLICY "Users can update or delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR public.is_admin()
  )
);

-- 4.3 Opportunity Banners: authenticated users submitting opps or admins
CREATE POLICY "Users and admins can upload opportunity banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = 'users' AND (storage.foldername(name))[2] = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = 'banners'
  )
);

CREATE POLICY "Users and admins can delete opportunity banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[2] = auth.uid()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 4.4 Post Images: authenticated users can upload for community posts
CREATE POLICY "Users can upload own post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = 'posts'
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
  )
);

-- 4.5 Announcement Images: strictly admins
CREATE POLICY "Admins can manage announcement images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'announcement-images' AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'announcement-images' AND public.is_admin()
);

-- 5. Harden search_path on critical security definer functions
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_pixel_transaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.send_notification_rpc(TEXT, TEXT, TEXT, TEXT, UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_notification_rpc(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_opportunity_views(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_opportunity_apply_clicks(UUID) SET search_path = public, pg_temp;
