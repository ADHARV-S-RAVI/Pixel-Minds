-- ==============================================================================
-- PHASE 2: DATABASE INTEGRITY AND REWARD SYSTEM FIXES
-- Migration: 20261121140000_phase2_database_integrity_and_reward_fixes.sql
-- Description:
--   1. Secure server-side claim_referral_code RPC with atomic pixel rewards.
--   2. Unique constraint and deduplication on user_applications (user_id, opportunity_id).
--   3. Protection against direct client tampering of user_applications status/rewards.
--   4. Reconcile and normalize reports table schema, columns, and constraints.
--   5. Fix RLS policies on reports, referrals, and applications.
-- ==============================================================================

-- 1. SECURE SERVER-SIDE REFERRAL CLAIM RPC
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
  v_referrer_id UUID;
  v_referrer_name TEXT;
  v_clean_code TEXT;
  v_reward_amount INTEGER := 25;
  v_referral_id UUID;
  v_existing_ref RECORD;
  v_opp_uuid UUID := NULL;
  v_tx_result JSONB;
BEGIN
  -- 1. Derive referred user from auth.uid()
  v_referred_user_id := auth.uid();
  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Authentication required',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  v_clean_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_clean_code = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral code is required',
      'code', 'INVALID_ARGUMENT'
    );
  END IF;

  -- 2. Prevent duplicate referral claims (Idempotent response)
  SELECT id, referrer_id, referral_code, created_at
  INTO v_existing_ref
  FROM public.referrals
  WHERE referred_user_id = v_referred_user_id
  LIMIT 1;

  IF v_existing_ref.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_referred', true,
      'message', 'You have already joined via a referral link.',
      'referral_code', v_existing_ref.referral_code
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
      'error', 'Invalid referral code. Please verify the code and try again.',
      'code', 'REFERRAL_NOT_FOUND'
    );
  END IF;

  -- 4. Prevent self-referrals
  IF v_referrer_id = v_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Self-referrals are not permitted.',
      'code', 'SELF_REFERRAL'
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
    referrals = referrals + 1,
    updated_at = now()
  WHERE id = v_referrer_id;

  -- 8. Issue pixel transaction atomically to referrer via trusted internal ledger function
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
    'success', true,
    'message', 'Referral applied successfully! Welcome bonus credited.',
    'referrer_name', COALESCE(v_referrer_name, 'Pixel Member'),
    'pixels_rewarded', v_reward_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(TEXT, TEXT) TO authenticated;


-- ==============================================================================
-- 2. APPLICATION INTEGRITY & SAFE DEDUPLICATION
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

-- Protect application fields: Regular users can only insert initial pending application
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

-- Users can view their own applications, admins can view all
DROP POLICY IF EXISTS "Users can view own applications" ON public.user_applications;
CREATE POLICY "Users can view own applications"
ON public.user_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Disallow direct user UPDATE on user_applications; status transitions MUST occur via secure RPCs
DROP POLICY IF EXISTS "Users can update own applications" ON public.user_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.user_applications;
CREATE POLICY "Admins can update applications"
ON public.user_applications FOR UPDATE
TO authenticated
USING (public.is_admin());


-- ==============================================================================
-- 3. REPORTS SCHEMA RECONCILIATION & NORMALIZATION
-- ==============================================================================

DO $$
BEGIN
  -- Add target_title if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'target_title') THEN
    ALTER TABLE public.reports ADD COLUMN target_title TEXT;
  END IF;

  -- Add target_snippet if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'target_snippet') THEN
    ALTER TABLE public.reports ADD COLUMN target_snippet TEXT;
  END IF;

  -- Add reporter_email if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'reporter_email') THEN
    ALTER TABLE public.reports ADD COLUMN reporter_email TEXT;
  END IF;

  -- Add details if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'details') THEN
    ALTER TABLE public.reports ADD COLUMN details TEXT;
  END IF;

  -- Add admin_notes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.reports ADD COLUMN admin_notes TEXT;
  END IF;

  -- If old 'notes' column exists, copy to admin_notes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'notes') THEN
    UPDATE public.reports SET admin_notes = COALESCE(admin_notes, notes) WHERE admin_notes IS NULL;
  END IF;

  -- Add resolved_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resolved_at') THEN
    ALTER TABLE public.reports ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'updated_at') THEN
    ALTER TABLE public.reports ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;

-- Normalize target_type check to include opportunity, post, and user
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('opportunity', 'post', 'user'));

-- Ensure RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
);

DROP POLICY IF EXISTS "Users and admins can view reports" ON public.reports;
CREATE POLICY "Users and admins can view reports"
ON public.reports FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_id OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
