-- ==============================================================================
-- PHASE 5: LIKER IDENTITY & PUBLIC PROFILES REPAIR
-- Migration: 20261121180000_phase5_liker_identity_and_public_profiles.sql
--
-- Objective:
--   1. Repair public_profiles view:
--      - Ensure security_invoker = false so queries run as the view owner (postgres),
--        preventing underlying profiles table RLS from blanking out non-self rows.
--      - Preserve strict column whitelist (no email, phone, role, is_suspended, referral_id).
--      - Exclude suspended accounts (WHERE is_suspended = FALSE).
--   2. Provide dedicated, secure get_post_likers(p_post_id) RPC:
--      - Returns only approved public identity fields (id, full_name, username, avatar_url).
--      - Verifies the post is published or caller is author/admin.
--      - Joins community_likes and profiles safely in a SECURITY DEFINER context.
-- ==============================================================================

-- 1. REPAIR public_profiles VIEW
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

COMMENT ON VIEW public.public_profiles IS
'Publicly readable user profile information. Excludes sensitive private fields (email, phone, role, is_suspended, referral_id).';

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated, service_role;

-- 2. DEDICATED RPC: get_post_likers(p_post_id UUID)
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
  -- Validate that the target post exists and is visible to the caller
  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE community_posts.id = p_post_id
    AND (
      community_posts.status = 'published'
      OR community_posts.user_id = auth.uid()
      OR public.is_admin()
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.community_likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.post_id = p_post_id
    AND p.is_suspended = FALSE
  ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_post_likers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_likers(UUID) TO anon, authenticated, service_role;

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
