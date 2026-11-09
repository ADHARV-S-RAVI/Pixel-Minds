-- Migration: Secure Opportunity Registration & 10 Pixels Reward Flow
-- Date: 2026-11-09
-- Purpose:
--   1. Enforce server-side immutable timestamps for user_applications (applied_at).
--   2. Restrict direct UPDATE on user_applications to administrators.
--   3. Implement secure confirm_opportunity_registration RPC with 3-minute cooldown enforcement.
--   4. Harden claim_registration_pixels RPC to strictly award 10 Pixels atomically with full rollback safety.

-- ============================================================================
-- 1. SERVER-GENERATED TIMESTAMPS & FIELD PROTECTION ON public.user_applications
-- ============================================================================

-- Ensure applied_at defaults to server time in milliseconds
ALTER TABLE public.user_applications 
  ALTER COLUMN applied_at SET DEFAULT round(extract(epoch from now()) * 1000)::BIGINT;

-- Trigger function to enforce server timestamps and field immutability for user_applications
CREATE OR REPLACE FUNCTION public.handle_user_application_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Always force server-generated applied_at timestamp for non-admins
    IF NOT public.is_admin() OR NEW.applied_at IS NULL THEN
      NEW.applied_at := round(extract(epoch from now()) * 1000)::BIGINT;
    END IF;
    -- Non-admins cannot insert pre-confirmed or pre-rewarded applications
    IF NOT public.is_admin() THEN
      NEW.status := 'pending_confirmation';
      NEW.confirmed_at := NULL;
      NEW.reward_claimed := false;
      NEW.pixels_rewarded := 0;
    END IF;
    NEW.created_at := now();
    NEW.updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    -- applied_at is strictly immutable for non-admins
    IF NOT public.is_admin() AND NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
      RAISE EXCEPTION 'applied_at is immutable and cannot be modified';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_user_applications_timestamps ON public.user_applications;
CREATE TRIGGER tr_user_applications_timestamps
BEFORE INSERT OR UPDATE ON public.user_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_user_application_timestamps();


-- ============================================================================
-- 2. HARDENED ROW LEVEL SECURITY (RLS) POLICIES ON public.user_applications
-- ============================================================================

ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;

-- 2.1 SELECT: Users can read their own applications; admins can read all
DROP POLICY IF EXISTS "Users can read own applications" ON public.user_applications;
CREATE POLICY "Users can read own applications"
  ON public.user_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 2.2 INSERT: Non-admins can only insert their own applications in pending_confirmation status
DROP POLICY IF EXISTS "Users can insert own applications" ON public.user_applications;
CREATE POLICY "Users can insert own applications"
  ON public.user_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_admin()
      OR (
        status = 'pending_confirmation'
        AND reward_claimed = false
        AND pixels_rewarded = 0
      )
    )
  );

-- 2.3 UPDATE: Direct updates are restricted to Admins.
-- Regular users must confirm through confirm_opportunity_registration RPC
-- and claim rewards through claim_registration_pixels RPC.
DROP POLICY IF EXISTS "Users can update own applications" ON public.user_applications;
CREATE POLICY "Users can update own applications"
  ON public.user_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2.4 DELETE: Admins only
DROP POLICY IF EXISTS "Admins can delete applications" ON public.user_applications;
CREATE POLICY "Admins can delete applications"
  ON public.user_applications
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================================
-- 3. SECURE REGISTRATION CONFIRMATION RPC
-- Enforces 3-minute cooldown using server clock and updates status atomically.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_opportunity_registration(
  p_opportunity_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_app_id UUID;
  v_applied_at BIGINT;
  v_status TEXT;
  v_now_ms BIGINT;
  v_elapsed_ms BIGINT;
  v_remaining_ms BIGINT;
  v_cooldown_ms CONSTANT BIGINT := 180000; -- 3 minutes (180,000 ms)
BEGIN
  -- 1. Derive user identity from auth.uid()
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  IF p_opportunity_id IS NULL OR trim(p_opportunity_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Opportunity ID is required',
      'code', 'INVALID_ARGUMENT'
    );
  END IF;

  -- Server-side millisecond timestamp
  v_now_ms := round(extract(epoch from now()) * 1000)::BIGINT;

  -- 2. Verify application ownership and current status
  SELECT id, applied_at, status
  INTO v_app_id, v_applied_at, v_status
  FROM public.user_applications
  WHERE user_id = v_user_id AND opportunity_id = p_opportunity_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application record not found. Please click Apply first.',
      'code', 'NOT_FOUND'
    );
  END IF;

  -- 3. Prevent duplicate confirmation (idempotent response)
  IF v_status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'message', 'Application is already confirmed.',
      'confirmed_at', v_now_ms
    );
  END IF;

  IF v_status != 'pending_confirmation' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Application cannot be confirmed in its current status: ' || v_status,
      'code', 'INVALID_STATUS'
    );
  END IF;

  -- 4. Verify that at least 180,000 ms have elapsed since original server applied_at
  v_elapsed_ms := v_now_ms - v_applied_at;
  IF v_elapsed_ms < v_cooldown_ms THEN
    v_remaining_ms := v_cooldown_ms - v_elapsed_ms;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Registration verification cooldown has not elapsed yet. Please wait before confirming.',
      'code', 'COOLDOWN_ACTIVE',
      'remaining_seconds', ceil(v_remaining_ms / 1000.0)::INTEGER,
      'elapsed_ms', v_elapsed_ms
    );
  END IF;

  -- 5. Atomically transition status to 'confirmed'
  UPDATE public.user_applications
  SET 
    status = 'confirmed',
    confirmed_at = v_now_ms,
    updated_at = now()
  WHERE user_id = v_user_id
    AND opportunity_id = p_opportunity_id
    AND status = 'pending_confirmation'
  RETURNING id INTO v_app_id;

  IF v_app_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_confirmed', true,
      'message', 'Application was already confirmed concurrently.',
      'confirmed_at', v_now_ms
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Application registration successfully confirmed.',
    'confirmed_at', v_now_ms
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_opportunity_registration(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_opportunity_registration(TEXT) TO authenticated;


-- ============================================================================
-- 4. HARDENED PIXELS REWARD RPC (STRICTLY 10 PIXELS, FULL ROLLBACK SAFETY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_registration_pixels(
  p_opportunity_id TEXT,
  p_opportunity_title TEXT DEFAULT NULL,
  p_amount INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_pixels INTEGER;
  v_safe_amount CONSTANT INTEGER := 10; -- ALWAYS exactly 10 Pixels, client p_amount is completely ignored
  v_app_id UUID;
  v_current_status TEXT;
  v_current_claimed BOOLEAN;
  v_title TEXT;
  v_reason TEXT;
BEGIN
  -- 1. Derive user identity from auth.uid()
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  IF p_opportunity_id IS NULL OR trim(p_opportunity_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Opportunity ID is required',
      'code', 'INVALID_ARGUMENT'
    );
  END IF;

  -- 2. Atomically verify ownership, confirmed status, and unclaimed state, then mark claimed.
  -- Row-level locking on UPDATE prevents race conditions / concurrent double-claims.
  UPDATE public.user_applications
  SET 
    reward_claimed = true,
    pixels_rewarded = v_safe_amount,
    updated_at = now()
  WHERE user_id = v_user_id
    AND opportunity_id = p_opportunity_id
    AND status = 'confirmed'
    AND reward_claimed = false
  RETURNING id, opportunity_title INTO v_app_id, v_title;

  -- 3. If no row updated, diagnose reason and exit without crediting pixels
  IF v_app_id IS NULL THEN
    SELECT status, reward_claimed INTO v_current_status, v_current_claimed
    FROM public.user_applications
    WHERE user_id = v_user_id AND opportunity_id = p_opportunity_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No application found for this opportunity. You must apply first.',
        'code', 'APPLICATION_NOT_FOUND'
      );
    ELSIF v_current_claimed IS TRUE THEN
      SELECT pixels INTO v_new_pixels FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'success', true,
        'already_claimed', true,
        'pixels', COALESCE(v_new_pixels, 0),
        'awarded', 0,
        'message', 'Reward has already been claimed for this application.'
      );
    ELSIF v_current_status != 'confirmed' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Application is not confirmed yet. You must complete the cooldown and confirm registration before claiming.',
        'code', 'NOT_CONFIRMED'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unable to claim reward for this application.',
        'code', 'CLAIM_FAILED'
      );
    END IF;
  END IF;

  -- 4. Credit user balance in public.profiles (ALWAYS exactly 10 Pixels)
  UPDATE public.profiles
  SET 
    pixels = COALESCE(pixels, 0) + v_safe_amount,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING pixels INTO v_new_pixels;

  IF v_new_pixels IS NULL THEN
    RAISE EXCEPTION 'Failed to update profile balance for user %', v_user_id;
  END IF;

  -- 5. Record immutable pixel transaction ledger entry
  -- NOTE: Executed within the same transaction without catching exceptions.
  -- If this insert fails, both the user_applications update and profiles update roll back automatically!
  v_reason := 'Registered for ' || COALESCE(v_title, p_opportunity_title, 'Opportunity');
  INSERT INTO public.pixel_transactions (
    user_id,
    amount,
    action,
    reason,
    type,
    admin_id
  ) VALUES (
    v_user_id,
    v_safe_amount,
    'Registration Reward (+10 Pixels)',
    v_reason,
    'adjustment',
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'pixels', v_new_pixels,
    'awarded', v_safe_amount,
    'message', 'Registration reward of 10 Pixels successfully claimed!'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_registration_pixels(TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_registration_pixels(TEXT, TEXT, INTEGER) TO authenticated;

