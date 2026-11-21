-- ==============================================================================
-- PHASE 3: BACKEND & STORAGE SECURITY HARDENING
-- Migration: 20261121170000_phase3_harden_security_logging_and_redaction.sql
--
-- Objective:
--   1. Harden security event logging:
--      - Prevent clients from submitting arbitrary event types (enforce allowlist).
--      - Derive severity server-side from event types; prevent clients from
--        elevating themselves to 'critical'.
--      - Revoke execution from anonymous/public callers; allow authenticated & service_role.
--      - Enforce per-user rate limiting to prevent log flooding.
--   2. Recursive sensitive-data redaction:
--      - Recursively traverse objects and arrays, including objects nested in arrays.
--      - Preserve array ordering (via WITH ORDINALITY) and non-sensitive values.
--      - Expand sensitive key detection (passwords, tokens, cookies, auth, secrets, api keys, bearer, private keys, ssn, card).
--   3. Automated security-log cleanup:
--      - Restrict cleanup_old_security_logs() strictly to service_role.
--      - Idempotently schedule daily execution via pg_cron (at 03:00 UTC) if available.
--      - Safely fallback with diagnostic notices if pg_cron extension is absent.
-- ==============================================================================

-- 1. SEED RATE LIMIT FOR SECURITY LOGGING
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds)
VALUES ('security_log_event', 10, 60)
ON CONFLICT (action_type) DO NOTHING;

-- 2. RECURSIVE SENSITIVE DATA REDACTOR (OBJECTS & ARRAYS)
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

  -- 2.1 JSON Object handling: inspect keys and recurse into nested structures
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

  -- 2.2 JSON Array handling: preserve array ordering and recurse into elements
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

-- 3. HARDENED log_security_event()
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
  -- 3.1 Reject unauthenticated callers (anon cannot log events)
  IF v_role NOT IN ('authenticated', 'service_role') THEN
    RETURN NULL;
  END IF;

  -- 3.2 Sanitize event type
  v_clean_type := lower(trim(COALESCE(p_event_type, '')));
  IF v_clean_type = '' THEN
    RETURN NULL;
  END IF;

  -- 3.3 Validate against allowlist: untrusted callers cannot log arbitrary event types
  IF NOT (v_clean_type = ANY(ALLOWED_EVENT_TYPES)) THEN
    IF v_role = 'service_role' THEN
      v_clean_type := substring(v_clean_type FROM 1 FOR 100);
    ELSE
      -- Untrusted caller supplied unknown event type: safely reject
      RETURN NULL;
    END IF;
  END IF;

  -- 3.4 Rate-limit authenticated users (service_role bypasses)
  IF v_role = 'authenticated' AND v_user_id IS NOT NULL THEN
    IF NOT public.check_and_increment_rate_limit(v_user_id, 'security_log_event', 10, 60) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- 3.5 Derive severity from trusted server-side mapping based on event type
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

  -- 3.6 Prevent client severity escalation: only service_role can record 'critical'
  IF v_role = 'service_role' THEN
    v_clean_severity := lower(trim(COALESCE(p_severity, v_derived_severity)));
    IF NOT (v_clean_severity = ANY(ARRAY['info', 'warning', 'error', 'critical'])) THEN
      v_clean_severity := v_derived_severity;
    END IF;
  ELSE
    -- Authenticated client: derive severity from trusted server mapping
    v_clean_severity := v_derived_severity;
  END IF;

  -- 3.7 Recursive sensitive-key redaction on JSONB payload (handles objects and arrays)
  v_sanitized_details := public.redact_sensitive_jsonb(COALESCE(p_details, '{}'::jsonb));

  -- 3.8 Enforce 4 KB payload cap
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

REVOKE ALL ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB, TEXT)
  TO authenticated, service_role;

-- 4. RESTRICT cleanup_old_security_logs() TO service_role ONLY & IDEMPOTENT CRON
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

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
