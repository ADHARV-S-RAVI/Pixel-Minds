-- ==============================================================================
-- Migration: Automatic Opportunity Expiry, 30-Day Cleanup & Anon Policy Fix
-- Date: 2026-11-04
-- ==============================================================================

-- 1. Fix Anonymous RLS Access for Opportunities
-- Grant execute on is_admin() to anon so anonymous users can read published opportunities without throwing 42501.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Update the public select policy to ensure published opportunities are visible unconditionally to all visitors
DROP POLICY IF EXISTS "Public can read published opportunities" ON public.opportunities;
CREATE POLICY "Public can read published opportunities"
ON public.opportunities FOR SELECT
USING (
  status = 'published' 
  OR (auth.role() = 'authenticated' AND (public.is_admin() OR auth.uid() = created_by))
);

-- 2. Function to automatically expire past opportunities
CREATE OR REPLACE FUNCTION public.expire_past_opportunities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark published opportunities as 'expired' when the application deadline has passed
  UPDATE public.opportunities
  SET 
    status = 'expired',
    updated_at = timezone('utc'::text, now())
  WHERE 
    status = 'published' 
    AND deadline < timezone('utc'::text, now());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_past_opportunities() IS 
'Scans published opportunities and transitions them to expired when the deadline timestamp has passed.';

-- 3. Function for 30-Day Grace Period Cleanup
-- Opportunities that have been expired for more than 30 days are transitioned to 'archived'.
-- Preserves all linked user submissions, analytics, Pixel balances, and audit history.
CREATE OR REPLACE FUNCTION public.cleanup_expired_opportunities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Transition opportunities expired > 30 days ago to 'archived' status
  UPDATE public.opportunities
  SET 
    status = 'archived',
    updated_at = timezone('utc'::text, now())
  WHERE 
    status = 'expired' 
    AND deadline < (timezone('utc'::text, now()) - INTERVAL '30 days');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_opportunities() IS 
'Safely transitions opportunities expired for > 30 days to archived status while preserving user submissions, audit history, and Pixel awards.';

-- 4. Unified Expiry Maintenance RPC (Callable by cron or frontend maintenance hook)
CREATE OR REPLACE FUNCTION public.run_opportunity_lifecycle_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired INTEGER;
  v_archived INTEGER;
BEGIN
  v_expired := public.expire_past_opportunities();
  v_archived := public.cleanup_expired_opportunities();

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired,
    'archived_count', v_archived,
    'timestamp', timezone('utc'::text, now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_past_opportunities() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_opportunities() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_opportunity_lifecycle_maintenance() TO authenticated, anon, service_role;

-- 5. pg_cron Scheduled Daily Maintenance (if pg_cron extension is enabled in Supabase)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'daily-opportunity-expiry-check',
      '0 0 * * *', -- Daily at midnight UTC
      'SELECT public.run_opportunity_lifecycle_maintenance();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- In environments where pg_cron requires dashboard enablement, ignore and rely on RPC triggers
    RAISE NOTICE 'pg_cron schedule notice: %', SQLERRM;
END;
$$;

