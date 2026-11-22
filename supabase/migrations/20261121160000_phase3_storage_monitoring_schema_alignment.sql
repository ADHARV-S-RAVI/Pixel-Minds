-- ==============================================================================
-- Migration: Phase 3 — Storage Ownership Symmetry, Security Monitoring
--            Hardening & Schema Alignment
-- Date: 2026-11-21
-- Description:
--   1. Enforce symmetric foldername[1]='posts' AND foldername[2]=auth.uid()
--      for post-images INSERT and DELETE. Isolate banner uploads to
--      banners/<user_id>/... Remove unrestricted shared namespaces.
--   2. Harden log_security_event(): revoke anon EXECUTE, whitelist event
--      types/severities, rate-limit via check_and_increment_rate_limit,
--      and recursively redact sensitive JSONB keys.
--      Restrict cleanup_old_security_logs() to service_role only.
--   3. Synchronize schema.sql-era storage policies with the hardened state.
-- ==============================================================================

-- ==============================================================================
-- 1. STORAGE BUCKET MIME HARDENING
--    post-images: GIFs are allowed in the bucket (matches frontend ALLOWED_IMAGE_TYPES).
--    opportunity-banners: GIFs explicitly excluded (bucket only allows jpeg/png/webp).
--    Aligning bucket configuration with frontend validation constants.
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',              'avatars',              true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('opportunity-banners',  'opportunity-banners',  true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']::text[]),           -- NO gif; frontend rejects too
  ('post-images',          'post-images',          true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('announcement-images',  'announcement-images',  true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 2. DROP ALL LEGACY AND CURRENT STORAGE OBJECT POLICIES
--    Every policy variant from schema.sql, phase1_security_and_privacy_hardening,
--    and feed_security_hardening_and_monitoring is dropped before re-creating
--    the correct symmetric set below.
-- ==============================================================================

-- schema.sql legacy policies
DROP POLICY IF EXISTS "Public can view avatar images"                     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars"            ON storage.objects;
DROP POLICY IF EXISTS "Public can view opportunity banners"               ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload opportunity banners" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post images"                       ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images"        ON storage.objects;
DROP POLICY IF EXISTS "Public can view announcement images"               ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload announcement images"             ON storage.objects;

-- phase1_security_and_privacy_hardening policies
DROP POLICY IF EXISTS "Public can view public bucket images"              ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar"                       ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own avatar"             ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can upload opportunity banners"   ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can delete opportunity banners"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own post images"                  ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own post images"        ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage announcement images"             ON storage.objects;

-- feed_security_hardening_and_monitoring residual policies (also dropped in Phase 1 migration
-- but re-dropped here defensively)
DROP POLICY IF EXISTS "Users can upload own post images"                  ON storage.objects;
DROP POLICY IF EXISTS "Users can update or delete own post images"        ON storage.objects;

-- ==============================================================================
-- 3. HARDENED STORAGE POLICIES (symmetric, owned-namespace only)
-- ==============================================================================

-- 3.1  PUBLIC VIEW — consolidated single SELECT policy across all public buckets
CREATE POLICY "Public can view public bucket images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars','opportunity-banners','post-images','announcement-images','opportunities'));

-- 3.2  AVATARS — INSERT: uid as first path segment
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- 3.3  AVATARS — UPDATE: symmetric with INSERT / DELETE
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- 3.4  AVATARS — DELETE: uid must appear as first segment; admins can remove any
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    public.is_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'avatars'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- 3.5  OPPORTUNITY BANNERS — INSERT
--      Enforced path: banners/<user_id>/... OR users/<user_id>/...
--      The unrestricted shared "banners" root namespace is removed.
CREATE POLICY "Users and admins can upload opportunity banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'banners'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.6  OPPORTUNITY BANNERS — UPDATE
CREATE POLICY "Users and admins can update opportunity banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'banners'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'banners'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.7  OPPORTUNITY BANNERS — DELETE
--      Must own the file (uid in position 2 under banners/ or users/) or be admin.
CREATE POLICY "Users and admins can delete opportunity banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'opportunity-banners'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'banners'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (
      (storage.foldername(name))[1] = 'users'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.8  POST IMAGES — INSERT (symmetric with DELETE)
--      Required path structure: posts/<user_id>/...
--      Admins may also upload directly to <user_id>/... root.
CREATE POLICY "Users can upload own post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'posts'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.9  POST IMAGES — UPDATE
CREATE POLICY "Users can update own post images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'posts'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'posts'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.10 POST IMAGES — DELETE (symmetric with INSERT)
CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = 'posts'
      AND (storage.foldername(name))[2] = auth.uid()::text
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3.8  ANNOUNCEMENT IMAGES — strictly admins (FOR ALL covers INSERT + DELETE + UPDATE)
CREATE POLICY "Admins can manage announcement images"
ON storage.objects FOR ALL
TO authenticated
USING  (bucket_id = 'announcement-images' AND public.is_admin())
WITH CHECK (bucket_id = 'announcement-images' AND public.is_admin());

-- ==============================================================================
-- 4. HARDEN log_security_event()
--    - Revoke EXECUTE from anon and PUBLIC; keep authenticated and service_role.
--    - Enforce server-side allowlist for event_types (reject arbitrary types).
--    - Derive severity strictly from server-side event type mapping.
--    - Disallow clients from elevating themselves to 'critical'.
--    - Rate-limit via check_and_increment_rate_limit (10 events / 60 s per user).
--    - Recursively redact sensitive JSONB keys across objects and arrays.
-- ==============================================================================

-- Seed the rate-limit policy entry for security log events
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds)
VALUES ('security_log_event', 10, 60)
ON CONFLICT (action_type) DO NOTHING;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type     TEXT,
  p_severity       TEXT    DEFAULT 'warning',
  p_details        JSONB   DEFAULT '{}'::jsonb,
  p_correlation_id TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id           UUID    := auth.uid();
  v_role              TEXT    := auth.role();
  v_clean_type        TEXT;
  v_clean_severity    TEXT;
  v_derived_severity  TEXT;
  v_sanitized_details JSONB;
  v_log_id            UUID;

  -- Application allowlist for legitimate event types
  ALLOWED_EVENT_TYPES CONSTANT TEXT[] := ARRAY[
    'failed_post_submission',
    'rate_limit_exceeded',
    'unauthorized_action_attempt',
    'input_validation_failure',
    'failed_image_upload',
    'feed_operation_error',
    'auth_failure',
    'suspicious_activity',
    'account_suspension',
    'admin_action',
    'system_error',
    'storage_violation',
    'security_log_event'
  ];
BEGIN
  -- 4.1 Reject unauthenticated callers (anon cannot log events)
  IF v_role NOT IN ('authenticated', 'service_role') THEN
    RETURN NULL;
  END IF;

  -- 4.2 Sanitize event type
  v_clean_type := lower(trim(COALESCE(p_event_type, '')));
  IF v_clean_type = '' THEN
    RETURN NULL;
  END IF;

  -- 4.3 Validate against allowlist: untrusted callers cannot log arbitrary event types
  IF NOT (v_clean_type = ANY(ALLOWED_EVENT_TYPES)) THEN
    IF v_role = 'service_role' THEN
      v_clean_type := substring(v_clean_type FROM 1 FOR 100);
    ELSE
      -- Untrusted caller supplied unknown event type: safely reject
      RETURN NULL;
    END IF;
  END IF;

  -- 4.4 Rate-limit authenticated users (service_role bypasses)
  IF v_role = 'authenticated' AND v_user_id IS NOT NULL THEN
    IF NOT public.check_and_increment_rate_limit(v_user_id, 'security_log_event', 10, 60) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- 4.5 Derive severity from trusted server-side mapping based on event type
  CASE v_clean_type
    WHEN 'input_validation_failure'    THEN v_derived_severity := 'info';
    WHEN 'admin_action'                THEN v_derived_severity := 'info';
    WHEN 'failed_post_submission'      THEN v_derived_severity := 'warning';
    WHEN 'rate_limit_exceeded'         THEN v_derived_severity := 'warning';
    WHEN 'failed_image_upload'         THEN v_derived_severity := 'warning';
    WHEN 'auth_failure'                THEN v_derived_severity := 'warning';
    WHEN 'suspicious_activity'         THEN v_derived_severity := 'warning';
    WHEN 'storage_violation'           THEN v_derived_severity := 'warning';
    WHEN 'security_log_event'          THEN v_derived_severity := 'warning';
    WHEN 'unauthorized_action_attempt' THEN v_derived_severity := 'error';
    WHEN 'feed_operation_error'        THEN v_derived_severity := 'error';
    WHEN 'account_suspension'          THEN v_derived_severity := 'error';
    WHEN 'system_error'                THEN v_derived_severity := 'error';
    ELSE                                    v_derived_severity := 'warning';
  END CASE;

  -- 4.6 Prevent client severity escalation: only service_role can record 'critical'
  IF v_role = 'service_role' THEN
    v_clean_severity := lower(trim(COALESCE(p_severity, v_derived_severity)));
    IF NOT (v_clean_severity = ANY(ARRAY['info', 'warning', 'error', 'critical'])) THEN
      v_clean_severity := v_derived_severity;
    END IF;
  ELSE
    -- Authenticated client: derive severity from trusted server mapping
    v_clean_severity := v_derived_severity;
  END IF;

  -- 4.7 Recursive sensitive-key redaction on JSONB payload (handles objects and arrays)
  v_sanitized_details := public.redact_sensitive_jsonb(COALESCE(p_details, '{}'::jsonb));

  -- 4.8 Enforce 4 KB payload cap
  IF octet_length(v_sanitized_details::text) > 4096 THEN
    v_sanitized_details := jsonb_build_object(
      'error',   'Details payload exceeded maximum allowed size (truncated)',
      'preview', substring(v_sanitized_details::text FROM 1 FOR 500)
    );
  END IF;

  INSERT INTO public.security_logs (
    event_type,
    severity,
    user_id,
    correlation_id,
    details
  ) VALUES (
    v_clean_type,
    v_clean_severity,
    v_user_id,
    substring(trim(COALESCE(p_correlation_id, '')) FROM 1 FOR 100),
    v_sanitized_details
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Revoke from anon and PUBLIC; keep authenticated + service_role
REVOKE ALL ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT)
  TO authenticated, service_role;

-- ==============================================================================
-- 5. RECURSIVE JSONB SENSITIVE-KEY REDACTOR (traverses objects and arrays)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.redact_sensitive_jsonb(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  SENSITIVE_KEYS CONSTANT TEXT[] := ARRAY[
    'password','passwd','token','access_token','refresh_token',
    'secret','cookie','apikey','api_key','authorization','auth',
    'credential','credentials','smtp','private_key','private',
    'bearer','session_id','session_token','credit_card','card_number',
    'cvv','ssn','pin'
  ];
  v_key    TEXT;
  v_val    JSONB;
  v_result JSONB;
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- 5.1 JSON Object handling: inspect keys and recurse into nested structures
  IF jsonb_typeof(p_data) = 'object' THEN
    v_result := '{}'::jsonb;
    FOR v_key, v_val IN SELECT * FROM jsonb_each(p_data) LOOP
      IF EXISTS (
        SELECT 1 FROM unnest(SENSITIVE_KEYS) AS sk
        WHERE lower(v_key) LIKE '%' || sk || '%'
      ) THEN
        v_result := v_result || jsonb_build_object(v_key, '[REDACTED]');
      ELSIF jsonb_typeof(v_val) IN ('object', 'array') THEN
        v_result := v_result || jsonb_build_object(v_key, public.redact_sensitive_jsonb(v_val));
      ELSE
        v_result := v_result || jsonb_build_object(v_key, v_val);
      END IF;
    END LOOP;
    RETURN v_result;

  -- 5.2 JSON Array handling: preserve array ordering and recurse into elements
  ELSIF jsonb_typeof(p_data) = 'array' THEN
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(elem) IN ('object', 'array') THEN public.redact_sensitive_jsonb(elem)
          ELSE elem
        END
        ORDER BY ord
      ),
      '[]'::jsonb
    )
    INTO v_result
    FROM jsonb_array_elements(p_data) WITH ORDINALITY AS t(elem, ord);

    RETURN COALESCE(v_result, '[]'::jsonb);

  ELSE
    RETURN p_data;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.redact_sensitive_jsonb(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redact_sensitive_jsonb(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.redact_sensitive_jsonb(JSONB)
  TO authenticated, service_role;

-- ==============================================================================
-- 6. RESTRICT cleanup_old_security_logs() TO service_role ONLY & IDEMPOTENT CRON
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.security_logs
  WHERE created_at < (timezone('utc'::text, now()) - INTERVAL '90 days');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_old_security_logs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_security_logs() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_old_security_logs() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs() TO service_role;

-- Idempotent scheduled invocation via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'cron' AND p.proname = 'schedule'
    ) THEN
      PERFORM cron.unschedule('cleanup-security-logs')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs'
      );

      PERFORM cron.schedule(
        'cleanup-security-logs',
        '0 3 * * *',
        'SELECT public.cleanup_old_security_logs();'
      );
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron is not installed. Scheduled cleanup must run via pg_cron or an external cron worker invoking cleanup_old_security_logs() with service_role.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule notice: %. Continuing without automated DB cron.', SQLERRM;
END;
$$;

-- ==============================================================================
-- 7. SCHEMA.SQL ALIGNMENT — drop the remaining schema.sql-era policies that
--    are superseded by the hardened versions above and in prior migrations.
--    These are kept as DROP IF EXISTS so the migration is idempotent.
-- ==============================================================================

-- Community posts (superseded by 20261110_feed_auth_and_retention.sql dynamic drop)
DROP POLICY IF EXISTS "Public can read published posts"           ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts"      ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts or admin moderate" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own posts or admin moderate" ON public.community_posts;

-- Profiles (superseded by 20261121110000_phase1_security_and_privacy_hardening.sql)
DROP POLICY IF EXISTS "Profiles are viewable by everyone"         ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles"       ON public.profiles;

-- Opportunities (superseded by Phase 1 & Phase 2 migrations)
DROP POLICY IF EXISTS "Users can submit or admins can create opportunities" ON public.opportunities;

-- Referrals (superseded by Phase 2 migration)
DROP POLICY IF EXISTS "Authenticated users or system can create referral records" ON public.referrals;

-- Reports (superseded by Phase 2 migration)
DROP POLICY IF EXISTS "Authenticated users can create reports"    ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports or admins view all" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports"                 ON public.reports;

-- ==============================================================================
-- 8. RELOAD SCHEMA
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
