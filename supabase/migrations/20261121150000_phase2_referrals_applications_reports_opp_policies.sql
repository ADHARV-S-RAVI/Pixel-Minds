-- ==============================================================================
-- Migration: Phase 2 — Referral RLS Lock-down, Atomic Reward Check,
--            Safe Application Deduplication, Reports BIGINT→TIMESTAMPTZ,
--            and Opportunity Policy Hardening
-- Date: 2026-11-21
-- ==============================================================================

-- ==============================================================================
-- 1. REFERRALS — DROP ALL DIRECT CLIENT INSERT POLICIES
--    Claims must only flow through claim_referral_code() (SECURITY DEFINER).
--    Both the schema.sql legacy policy and the phase-2 migration policy are dropped.
-- ==============================================================================

-- Drop legacy schema.sql policy
DROP POLICY IF EXISTS "Authenticated users or system can create referral records" ON public.referrals;

-- Drop any other residual INSERT policies on referrals
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Referral insert" ON public.referrals;

-- Ensure no INSERT policy remains for authenticated/anon (service_role bypasses RLS)
-- SELECT policy is preserved from schema.sql; re-create it defensively.
DROP POLICY IF EXISTS "Users can view own referrals or admin view all" ON public.referrals;
CREATE POLICY "Users can view own referrals or admin view all"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.is_admin());

-- ==============================================================================
-- 2. claim_referral_code — VERIFY record_pixel_transaction_internal RETURN STATUS
--    Roll back the entire transaction on ledger failure via RAISE EXCEPTION.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.claim_referral_code(
  p_referral_code TEXT,
  p_opportunity_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referred_user_id UUID;
  v_referrer_id      UUID;
  v_referrer_name    TEXT;
  v_clean_code       TEXT;
  v_reward_amount    INTEGER := 25;
  v_referral_id      UUID;
  v_existing_ref     RECORD;
  v_opp_uuid         UUID := NULL;
  v_tx_result        JSONB;
BEGIN
  -- 1. Derive referred user from auth.uid()
  v_referred_user_id := auth.uid();
  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Authentication required',
      'code',    'UNAUTHORIZED'
    );
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Referral code is required',
      'code',    'INVALID_ARGUMENT'
    );
  END IF;

  -- 2. Prevent duplicate referral claims (idempotent response)
  SELECT id, referrer_id, referral_code, created_at
  INTO v_existing_ref
  FROM public.referrals
  WHERE referred_user_id = v_referred_user_id
  LIMIT 1;

  IF v_existing_ref.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success',          true,
      'already_referred', true,
      'message',          'You have already joined via a referral link.',
      'referral_code',    v_existing_ref.referral_code
    );
  END IF;

  -- 3. Validate referral code against active referrer's profile
  SELECT id, full_name
  INTO v_referrer_id, v_referrer_name
  FROM public.profiles
  WHERE UPPER(TRIM(referral_id)) = v_clean_code
    AND is_suspended = FALSE
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Invalid referral code. Please verify the code and try again.',
      'code',    'REFERRAL_NOT_FOUND'
    );
  END IF;

  -- 4. Prevent self-referrals
  IF v_referrer_id = v_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Self-referrals are not permitted.',
      'code',    'SELF_REFERRAL'
    );
  END IF;

  -- 5. Validate optional opportunity reference
  IF p_opportunity_id IS NOT NULL AND TRIM(p_opportunity_id) <> '' THEN
    BEGIN
      v_opp_uuid := p_opportunity_id::UUID;
      IF NOT EXISTS (SELECT 1 FROM public.opportunities WHERE id = v_opp_uuid) THEN
        v_opp_uuid := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_opp_uuid := NULL;
    END;
  END IF;

  -- 6. Read trusted reward amount from reward_config table
  SELECT COALESCE(referral_signup, 25)
  INTO v_reward_amount
  FROM public.reward_config
  WHERE id = 'rewards'
  LIMIT 1;

  IF v_reward_amount IS NULL OR v_reward_amount <= 0 THEN
    v_reward_amount := 25;
  END IF;

  -- 7. Insert referral record atomically
  INSERT INTO public.referrals (
    referrer_id,
    referred_user_id,
    referral_code,
    pixels_rewarded,
    opportunity_id,
    status
  )
  VALUES (
    v_referrer_id,
    v_referred_user_id,
    v_clean_code,
    v_reward_amount,
    v_opp_uuid,
    'completed'
  )
  RETURNING id INTO v_referral_id;

  -- Update referrer's referral count on profiles
  UPDATE public.profiles
  SET
    referrals  = referrals + 1,
    updated_at = now()
  WHERE id = v_referrer_id;

  -- 8. Issue pixel transaction atomically via trusted internal ledger function.
  --    CRITICAL: Check the returned success field and RAISE EXCEPTION on failure
  --    so the entire transaction (referral insert + profile update) is rolled back.
  v_tx_result := public.record_pixel_transaction_internal(
    v_referrer_id,
    v_reward_amount,
    'referral_bonus',
    'Referral bonus for inviting a new member (' || v_clean_code || ')',
    'earn',
    'ref_' || v_referral_id::TEXT
  );

  IF (v_tx_result->>'success')::boolean IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Pixel ledger write failed for referral reward: %',
      COALESCE(v_tx_result->>'error', 'unknown error')
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'success',         true,
    'message',         'Referral applied successfully! Welcome bonus credited.',
    'referrer_name',   COALESCE(v_referrer_name, 'Pixel Member'),
    'pixels_rewarded', v_reward_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(TEXT, TEXT) TO authenticated, service_role;

-- ==============================================================================
-- 3. APPLICATION DEDUPLICATION — SAFE ROW_NUMBER() APPROACH
--    Delete only the non-canonical duplicates, strictly preserving the single
--    canonical row per (user_id, opportunity_id) using the priority:
--      1. reward_claimed = true  (already rewarded — must keep)
--      2. status = 'confirmed'   (confirmed > pending)
--      3. Earliest applied_at    (original application)
--      4. Smallest id UUID       (tiebreaker)
-- ==============================================================================

-- Create backup table for safety and recovery before modifying user_applications
CREATE TABLE IF NOT EXISTS public.user_applications_backup (
  backup_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backed_up_at TIMESTAMPTZ DEFAULT now(),
  id UUID,
  user_id UUID,
  opportunity_id TEXT,
  opportunity_title TEXT,
  status TEXT,
  applied_at BIGINT,
  confirmed_at BIGINT,
  reward_claimed BOOLEAN,
  pixels_rewarded INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_canonical BOOLEAN,
  duplicate_rank INTEGER
);

-- Deduplicate existing user_applications safely using deterministic ROW_NUMBER()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_applications'
  ) THEN
    -- Step 1: Identify and back up all records in duplicate groups before deletion
    INSERT INTO public.user_applications_backup (
      id, user_id, opportunity_id, opportunity_title, status,
      applied_at, confirmed_at, reward_claimed, pixels_rewarded,
      created_at, updated_at, is_canonical, duplicate_rank
    )
    SELECT
      a.id, a.user_id, a.opportunity_id, a.opportunity_title, a.status,
      a.applied_at, a.confirmed_at, a.reward_claimed, a.pixels_rewarded,
      a.created_at, a.updated_at,
      (ranked.rn = 1) AS is_canonical,
      ranked.rn AS duplicate_rank
    FROM public.user_applications a
    JOIN (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, opportunity_id
          ORDER BY
            -- Priority 1: Keep records where reward_claimed = true
            (COALESCE(reward_claimed, false))::int DESC,
            -- Priority 2: Prefer confirmed applications over pending
            CASE status
              WHEN 'confirmed' THEN 1
              WHEN 'pending_confirmation' THEN 2
              ELSE 3
            END ASC,
            -- Priority 3: Prefer original / earliest valid application
            applied_at ASC,
            -- Priority 4: Deterministic ID tie-breaker
            id ASC
        ) AS rn,
        COUNT(*) OVER (PARTITION BY user_id, opportunity_id) AS group_size
      FROM public.user_applications
    ) ranked ON a.id = ranked.id
    WHERE ranked.group_size > 1;

    -- Step 2: Merge reward_claimed and confirmed status onto canonical record
    -- Ensure legitimate rewards and confirmations are not lost if present on any duplicate
    UPDATE public.user_applications canon
    SET
      reward_claimed = TRUE,
      pixels_rewarded = GREATEST(canon.pixels_rewarded, dup_stats.max_pixels),
      confirmed_at = COALESCE(canon.confirmed_at, dup_stats.min_confirmed_at),
      status = CASE
        WHEN canon.status = 'confirmed' THEN 'confirmed'
        WHEN dup_stats.has_confirmed THEN 'confirmed'
        ELSE canon.status
      END
    FROM (
      SELECT
        user_id,
        opportunity_id,
        bool_or(COALESCE(reward_claimed, false)) AS has_claimed,
        bool_or(status = 'confirmed') AS has_confirmed,
        COALESCE(MAX(pixels_rewarded), 0) AS max_pixels,
        MIN(confirmed_at) AS min_confirmed_at
      FROM public.user_applications
      GROUP BY user_id, opportunity_id
      HAVING COUNT(*) > 1
    ) dup_stats
    WHERE canon.user_id = dup_stats.user_id
      AND canon.opportunity_id = dup_stats.opportunity_id
      AND (dup_stats.has_claimed OR dup_stats.has_confirmed);

    -- Step 3: Delete only non-canonical duplicates (rn > 1)
    DELETE FROM public.user_applications
    WHERE id IN (
      SELECT id FROM (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY user_id, opportunity_id
            ORDER BY
              (COALESCE(reward_claimed, false))::int DESC,
              CASE status
                WHEN 'confirmed' THEN 1
                WHEN 'pending_confirmation' THEN 2
                ELSE 3
              END ASC,
              applied_at ASC,
              id ASC
          ) AS rn
        FROM public.user_applications
      ) sub
      WHERE sub.rn > 1
    );

    -- Step 4: Enforce unique constraint at database level
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_user_applications_user_opp'
        AND conrelid = 'public.user_applications'::regclass
    ) THEN
      ALTER TABLE public.user_applications
      ADD CONSTRAINT uq_user_applications_user_opp UNIQUE (user_id, opportunity_id);
    END IF;
  END IF;
END $$;

-- Step 3: RLS policies for user_applications (re-apply with correct semantics)
DROP POLICY IF EXISTS "Users can insert own applications" ON public.user_applications;
CREATE POLICY "Users can insert own applications"
ON public.user_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending_confirmation'
  AND reward_claimed = false
  AND pixels_rewarded = 0
);

DROP POLICY IF EXISTS "Users can view own applications" ON public.user_applications;
DROP POLICY IF EXISTS "Users can read own applications" ON public.user_applications;
CREATE POLICY "Users can view own applications"
ON public.user_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Block direct user UPDATE; status transitions must use secure RPCs
DROP POLICY IF EXISTS "Users can update own applications" ON public.user_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.user_applications;
CREATE POLICY "Admins can update applications"
ON public.user_applications FOR UPDATE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 4. REPORTS TABLE — SAFE FORWARD MIGRATION
--    Convert BIGINT timestamps → TIMESTAMPTZ, convert resolved_by TEXT → UUID,
--    add DEFAULT now() on created_at, drop legacy reporter_id IS NULL INSERT policy.
-- ==============================================================================

-- 4a. Convert legacy BIGINT created_at → TIMESTAMPTZ (preserve legacy data)
DO $$
BEGIN
  -- Only migrate if reports table exists and created_at column is currently BIGINT/INTEGER
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'created_at'
      AND data_type    IN ('bigint', 'integer')
  ) THEN
    -- Back up legacy BIGINT value
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS created_at_bigint_legacy BIGINT;
    UPDATE public.reports
    SET created_at_bigint_legacy = created_at::bigint
    WHERE created_at_bigint_legacy IS NULL AND created_at IS NOT NULL;

    -- Drop default if any before changing type
    ALTER TABLE public.reports ALTER COLUMN created_at DROP DEFAULT;

    -- Retype column directly to TIMESTAMPTZ using epoch conversion
    -- Accurately handles epoch milliseconds (> 1e12 / 1000.0) and epoch seconds (::float8)
    ALTER TABLE public.reports
      ALTER COLUMN created_at TYPE TIMESTAMPTZ
      USING CASE
        WHEN created_at IS NULL THEN now()
        WHEN created_at::bigint > 1000000000000 THEN to_timestamp(created_at::bigint / 1000.0)
        ELSE to_timestamp(created_at::bigint::float8)
      END;

    -- Restore NOT NULL and set default now()
    UPDATE public.reports SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE public.reports
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN created_at SET NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    -- Table exists: ensure created_at column exists, has DEFAULT now(), and is NOT NULL
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.reports ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ELSE
      ALTER TABLE public.reports ALTER COLUMN created_at SET DEFAULT now();
      UPDATE public.reports SET created_at = now() WHERE created_at IS NULL;
      ALTER TABLE public.reports ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END IF;
END $$;

-- 4b. Convert legacy BIGINT resolved_at → TIMESTAMPTZ (safe conversion)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'resolved_at'
      AND data_type    IN ('bigint', 'integer')
  ) THEN
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at_bigint_legacy BIGINT;
    UPDATE public.reports
    SET resolved_at_bigint_legacy = resolved_at::bigint
    WHERE resolved_at_bigint_legacy IS NULL AND resolved_at IS NOT NULL;

    ALTER TABLE public.reports
      ALTER COLUMN resolved_at TYPE TIMESTAMPTZ
      USING CASE
        WHEN resolved_at IS NULL THEN NULL
        WHEN resolved_at::bigint > 1000000000000 THEN to_timestamp(resolved_at::bigint / 1000.0)
        ELSE to_timestamp(resolved_at::bigint::float8)
      END;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'reports'
        AND column_name  = 'resolved_at'
    ) THEN
      ALTER TABLE public.reports ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- 4c. Convert resolved_by TEXT → UUID (safe: preserve legacy data, null-out invalid UUIDs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'resolved_by'
      AND data_type    IN ('text', 'character varying')
  ) THEN
    -- Preserve legacy text values before converting
    ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_by_text_legacy TEXT;
    UPDATE public.reports
    SET resolved_by_text_legacy = resolved_by
    WHERE resolved_by_text_legacy IS NULL AND resolved_by IS NOT NULL;

    -- Null out rows where resolved_by is not a valid UUID before casting
    UPDATE public.reports
    SET resolved_by = NULL
    WHERE resolved_by IS NOT NULL
      AND resolved_by !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE public.reports
      ALTER COLUMN resolved_by TYPE UUID
      USING resolved_by::UUID;

    -- Add FK to auth.users (now that the column is UUID)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname   = 'reports_resolved_by_fkey'
        AND conrelid  = 'public.reports'::regclass
    ) THEN
      ALTER TABLE public.reports
        ADD CONSTRAINT reports_resolved_by_fkey
        FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'reports'
        AND column_name  = 'resolved_by'
    ) THEN
      ALTER TABLE public.reports ADD COLUMN resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4d. Ensure updated_at column exists as TIMESTAMPTZ with DEFAULT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'updated_at'
  ) THEN
    ALTER TABLE public.reports
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  ELSE
    ALTER TABLE public.reports
      ALTER COLUMN updated_at SET DEFAULT now();
    UPDATE public.reports SET updated_at = now() WHERE updated_at IS NULL;
  END IF;
END $$;

-- 4e. Ensure admin_notes column exists (may already exist from phase-2 migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'admin_notes'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN admin_notes TEXT;
  END IF;
  -- Migrate notes → admin_notes if old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reports'
      AND column_name  = 'notes'
  ) THEN
    UPDATE public.reports
    SET admin_notes = COALESCE(admin_notes, notes)
    WHERE admin_notes IS NULL AND notes IS NOT NULL;
  END IF;
END $$;

-- 4f. Ensure target_title, target_snippet, reporter_email, details columns exist
DO $$
DECLARE col_name TEXT;
BEGIN
  FOREACH col_name IN ARRAY ARRAY['target_title','target_snippet','reporter_email','details'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = 'reports'
        AND column_name  = col_name
    ) THEN
      EXECUTE format('ALTER TABLE public.reports ADD COLUMN %I TEXT', col_name);
    END IF;
  END LOOP;
END $$;

-- 4g. Normalize target_type CHECK constraint to include 'user'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_target_type_check
      CHECK (target_type IN ('opportunity', 'post', 'user'));
  END IF;
END $$;

-- 4h. Ensure RLS enabled
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4i. Drop ALL legacy INSERT policies on reports (including the reporter_id IS NULL one)
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;

-- New strict INSERT policy: reporter_id MUST be auth.uid()
CREATE POLICY "Users can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
);

-- Drop & recreate SELECT / UPDATE policies for consistency
DROP POLICY IF EXISTS "Users can view own reports or admins view all" ON public.reports;
DROP POLICY IF EXISTS "Users and admins can view reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users and admins can view reports"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.is_admin());

-- ==============================================================================
-- 5. OPPORTUNITY SUBMISSION — DROP ALL LEGACY INSERT POLICIES,
--    USE ATOMIC RATE LIMITER FROM PHASE 1
-- ==============================================================================

-- Drop every known variant of the legacy opportunity INSERT policy
DROP POLICY IF EXISTS "Users can submit or admins can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can submit pending opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated users can submit opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can insert opportunities" ON public.opportunities;

-- New strict INSERT policy: auth.uid() must own the row, status must be pending,
-- featured must be false, and user must not be suspended.
CREATE POLICY "Users can submit pending opportunities"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND status = 'pending'
  AND COALESCE(featured, false) = false
  AND NOT public.is_current_user_suspended()
);

-- Replace the non-atomic count-based trigger with one that uses the
-- atomic check_and_increment_rate_limit function from Phase 1.
CREATE OR REPLACE FUNCTION public.enforce_opportunity_submission_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = NEW.created_by;

  IF COALESCE(v_is_admin, false) THEN
    RETURN NEW;
  END IF;

  -- Block suspended users (belt-and-suspenders; RLS also blocks them)
  IF public.is_current_user_suspended() THEN
    RAISE EXCEPTION 'Your account has been suspended. You cannot submit opportunities.'
      USING ERRCODE = '42501';
  END IF;

  -- Atomic rate limit: 1 submission per 60 s
  IF NOT public.check_and_increment_rate_limit(NEW.created_by, 'opportunity_submit_minute', 1, 60) THEN
    RAISE EXCEPTION 'Please wait 60 seconds before submitting another opportunity.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Atomic rate limit: 5 submissions per 24 h
  IF NOT public.check_and_increment_rate_limit(NEW.created_by, 'opportunity_submit_day', 5, 86400) THEN
    RAISE EXCEPTION 'Daily submission limit reached (5 per 24 hours). Please try again tomorrow.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Seed the two new rate-limit policies (idempotent)
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds) VALUES
  ('opportunity_submit_minute', 1,     60),
  ('opportunity_submit_day',    5, 86400)
ON CONFLICT (action_type) DO NOTHING;

DROP TRIGGER IF EXISTS trg_opportunity_rate_limit ON public.opportunities;
CREATE TRIGGER trg_opportunity_rate_limit
BEFORE INSERT ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.enforce_opportunity_submission_rate_limit();

-- ==============================================================================
-- 6. SCHEMA RELOAD
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
