-- 1. Enforce length, no angle brackets (XSS prevention), and safe HTTP/HTTPS URL constraints at DB level
ALTER TABLE public.opportunities
  DROP CONSTRAINT IF EXISTS opp_title_length_chk,
  DROP CONSTRAINT IF EXISTS opp_title_xss_chk,
  DROP CONSTRAINT IF EXISTS opp_desc_length_chk,
  DROP CONSTRAINT IF EXISTS opp_organizer_xss_chk,
  DROP CONSTRAINT IF EXISTS opp_category_chk,
  DROP CONSTRAINT IF EXISTS opp_safe_url_chk;

ALTER TABLE public.opportunities
  ADD CONSTRAINT opp_title_length_chk CHECK (char_length(trim(title)) BETWEEN 4 AND 150),
  ADD CONSTRAINT opp_title_xss_chk CHECK (title !~ '[<>]'),
  ADD CONSTRAINT opp_desc_length_chk CHECK (char_length(trim(description)) BETWEEN 20 AND 4000),
  ADD CONSTRAINT opp_organizer_xss_chk CHECK (organizer !~ '[<>]'),
  ADD CONSTRAINT opp_category_chk CHECK (char_length(trim(category)) BETWEEN 2 AND 50 AND category !~ '[<>]'),
  ADD CONSTRAINT opp_safe_url_chk CHECK (official_url ~* '^https?://[^[:space:]<>"]+\.[^[:space:]<>"]+');

-- 2. Lock down INSERT RLS so non-admin users cannot spoof created_by, self-publish, or self-feature
DROP POLICY IF EXISTS "Users can submit pending opportunities" ON public.opportunities;

CREATE POLICY "Users can submit pending opportunities"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND status = 'pending'
  AND COALESCE(featured, false) = false
);

-- 3. DB-level Rate Limiting Trigger (1 per 60s, 5 per 24h for non-admins)
CREATE OR REPLACE FUNCTION public.enforce_opportunity_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_minute_count INT;
  recent_day_count INT;
  is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO is_admin FROM public.profiles WHERE id = NEW.created_by;
  IF COALESCE(is_admin, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO recent_minute_count
  FROM public.opportunities
  WHERE created_by = NEW.created_by AND created_at > NOW() - INTERVAL '60 seconds';

  IF recent_minute_count >= 1 THEN
    RAISE EXCEPTION 'Please wait 60 seconds before submitting another opportunity.' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO recent_day_count
  FROM public.opportunities
  WHERE created_by = NEW.created_by AND created_at > NOW() - INTERVAL '24 hours';

  IF recent_day_count >= 5 THEN
    RAISE EXCEPTION 'Daily submission limit reached (5 per 24 hours). Please try again tomorrow.' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_rate_limit ON public.opportunities;

CREATE TRIGGER trg_opportunity_rate_limit
BEFORE INSERT ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.enforce_opportunity_submission_rate_limit();

-- 4. Lock down Storage bucket MIME types & size (Blocks SVG Stored XSS)
UPDATE storage.buckets
SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'opportunity-banners';
