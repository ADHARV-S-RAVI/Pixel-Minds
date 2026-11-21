-- ==============================================================================
-- Migration: Seed send_email Rate Limit Policy
-- Date: 2026-11-21
-- Description:
--   Seeds the rate_limit_policy entry for transactional emails:
--   5 requests per 600 seconds (10 minutes) per authenticated user.
-- ==============================================================================

INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds)
VALUES ('send_email', 5, 600)
ON CONFLICT (action_type) DO UPDATE SET
  max_requests = EXCLUDED.max_requests,
  window_seconds = EXCLUDED.window_seconds;
