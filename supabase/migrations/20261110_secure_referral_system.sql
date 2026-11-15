-- ============================================================================
-- Migration: Secure Referral Tracking & Pixels Reward System
-- Date: 2026-11-10
-- Purpose:
--   1. Ensure case-insensitive unique referral_id values on public.profiles.
--   2. Restrict public.referrals INSERT access to admins only (disallowing direct
--      client inserts by regular authenticated users).
--   3. Implement trusted public.validate_referral_code RPC for pre-signup checks.
--   4. Implement secure public.claim_referral_code SECURITY DEFINER RPC to:
--      - Derive user identity securely from auth.uid().
--      - Validate referral code and prevent self-referrals.
--      - Enforce fail-closed 7-day signup eligibility.
--      - Atomically insert referral records via ON CONFLICT (referred_user_id) DO NOTHING.
--      - Atomically increment referrer's pixels and referral count.
--      - Log immutable audit ledger entry in public.pixel_transactions.
--      - Safely use reward_config (defaulting to 25 Pixels).
-- ============================================================================

-- ============================================================================
-- 1. ENSURE CASE-INSENSITIVE UNIQUE REFERRAL IDS ON public.profiles
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_new_code TEXT;
  v_exists BOOLEAN;
BEGIN
  -- 1.1 Normalize existing referral_ids to uppercase
  UPDATE public.profiles
  SET referral_id = UPPER(TRIM(referral_id))
  WHERE referral_id IS NOT NULL AND TRIM(referral_id) <> '';

  -- 1.2 Resolve any pre-existing case-insensitive duplicate referral IDs
  -- Keep the oldest profile's code; null out the newer duplicate(s) to regenerate unique codes below
  UPDATE public.profiles p1
  SET referral_id = NULL
  WHERE referral_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE UPPER(p2.referral_id) = UPPER(p1.referral_id)
        AND (p2.created_at < p1.created_at OR (p2.created_at = p1.created_at AND p2.id < p1.id))
    );

  -- 1.3 Safely generate unique, collision-free referral codes for missing or cleared profiles
  FOR r IN 
    SELECT id 
    FROM public.profiles 
    WHERE referral_id IS NULL OR TRIM(referral_id) = ''
  LOOP
    LOOP
      v_new_code := 'PM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || r.id::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
      SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE UPPER(referral_id) = v_new_code
      ) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;

    UPDATE public.profiles
    SET referral_id = v_new_code
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 1.4 Guarantee case-insensitive uniqueness with a UNIQUE index
DROP INDEX IF EXISTS public.idx_profiles_referral_id_upper;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_id_upper 
  ON public.profiles (UPPER(referral_id));


-- ============================================================================
-- 2. ENSURE UNIQUE INDEX ON public.referrals(referred_user_id)
-- ============================================================================

-- Ensure a reliable unique index exists on public.referrals(referred_user_id)
-- so ON CONFLICT (referred_user_id) works deterministically without swallowed exceptions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_user_id_unique
  ON public.referrals (referred_user_id);


-- ============================================================================
-- 3. HARDENED ROW LEVEL SECURITY (RLS) ON public.referrals
-- ============================================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: Referrers, referred users, and admins can view referrals
DROP POLICY IF EXISTS "Users can view own referrals or admin view all" ON public.referrals;
DROP POLICY IF EXISTS "Referrers and referred users can view referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals or admin view all"
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_user_id
    OR public.is_admin()
  );

-- 3.2 INSERT: ONLY admins can directly insert referral records.
-- Normal authenticated users MUST use the trusted claim_referral_code RPC (SECURITY DEFINER).
DROP POLICY IF EXISTS "Authenticated users or system can create referral records" ON public.referrals;
DROP POLICY IF EXISTS "Only admins can insert referrals directly" ON public.referrals;
CREATE POLICY "Only admins can insert referrals directly"
  ON public.referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3.3 UPDATE: Admins only (referral records are immutable for regular users)
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;
CREATE POLICY "Admins can update referrals"
  ON public.referrals
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3.4 DELETE: Admins only
DROP POLICY IF EXISTS "Admins can delete referrals" ON public.referrals;
CREATE POLICY "Admins can delete referrals"
  ON public.referrals
  FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================================
-- 4. VALIDATE REFERRAL CODE RPC (Callable by anon and authenticated)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_referral_code(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_code TEXT;
  v_referrer_id UUID;
  v_referrer_name TEXT;
BEGIN
  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Please enter a referral code.'
    );
  END IF;

  v_clean_code := upper(trim(p_code));

  -- Filter out promotional coupon attempts
  IF v_clean_code LIKE 'CP-%' OR v_clean_code LIKE 'COUPON%' OR v_clean_code LIKE '%DISCOUNT%' OR v_clean_code LIKE '%PROMO%' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Coupons are currently unavailable. Please enter a valid Pixel Minds referral code.'
    );
  END IF;

  -- Look up referrer in public.profiles (case-insensitive)
  SELECT id, COALESCE(full_name, 'Pixel Builder')
  INTO v_referrer_id, v_referrer_name
  FROM public.profiles
  WHERE UPPER(referral_id) = v_clean_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid referral code. Please check the code and try again.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'referrer_id', v_referrer_id,
    'referrer_name', v_referrer_name,
    'message', 'Valid referral from ' || v_referrer_name || '!'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO PUBLIC, anon, authenticated;


-- ============================================================================
-- 5. ATOMIC CLAIM REFERRAL CODE RPC (Strictly authenticated, exact-once reward)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_referral_code(
  p_referral_code TEXT,
  p_opportunity_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_user_id UUID;
  v_referrer_id UUID;
  v_clean_code TEXT;
  v_referrer_name TEXT;
  v_reward_amount INTEGER := 25;
  v_existing_ref_id UUID;
  v_user_created_at TIMESTAMPTZ;
  v_new_ref_id UUID;
  v_new_pixels INTEGER;
  v_new_referrals INTEGER;
  v_opp_uuid UUID := NULL;
BEGIN
  -- 1. Derive referred user identity securely from auth.uid()
  v_referred_user_id := auth.uid();
  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated. Please sign in to apply a referral code.',
      'code', 'UNAUTHORIZED'
    );
  END IF;

  -- 2. Validate referral code input
  IF p_referral_code IS NULL OR trim(p_referral_code) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral code cannot be empty.',
      'code', 'INVALID_CODE'
    );
  END IF;

  v_clean_code := upper(trim(p_referral_code));

  -- 3. Check if this user was already referred (early exit check)
  SELECT id INTO v_existing_ref_id
  FROM public.referrals
  WHERE referred_user_id = v_referred_user_id
  LIMIT 1;

  IF v_existing_ref_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already joined with or claimed a referral code.',
      'code', 'ALREADY_REFERRED'
    );
  END IF;

  -- 3b. Verify account eligibility: Signup referrals are strictly for new accounts (within 7 days)
  -- Fail-closed: Reject if account creation timestamp is NULL or exceeds 7 days
  SELECT COALESCE(u.created_at, p.created_at)
  INTO v_user_created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_referred_user_id;

  IF v_user_created_at IS NULL THEN
    SELECT created_at INTO v_user_created_at
    FROM public.profiles
    WHERE id = v_referred_user_id;
  END IF;

  IF v_user_created_at IS NULL OR v_user_created_at < (now() - INTERVAL '7 days') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral codes can only be claimed by verified new accounts within 7 days of registration.',
      'code', 'INELIGIBLE_ACCOUNT'
    );
  END IF;

  -- 4. Look up referrer profile by referral_id (case-insensitive)
  SELECT id, COALESCE(full_name, 'Pixel Builder')
  INTO v_referrer_id, v_referrer_name
  FROM public.profiles
  WHERE UPPER(referral_id) = v_clean_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid referral code. Referrer not found.',
      'code', 'REFERRER_NOT_FOUND'
    );
  END IF;

  -- 5. Prevent self-referrals
  IF v_referrer_id = v_referred_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Self-referrals are not permitted.',
      'code', 'SELF_REFERRAL'
    );
  END IF;

  -- 6. Safely cast p_opportunity_id to UUID if valid
  IF p_opportunity_id IS NOT NULL AND p_opportunity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_opp_uuid := p_opportunity_id::UUID;
  END IF;

  -- 7. Retrieve configured reward amount from reward_config (safely defaulting to 25 Pixels)
  BEGIN
    SELECT COALESCE(referral_signup, 25)
    INTO v_reward_amount
    FROM public.reward_config
    WHERE id = 'rewards'
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_reward_amount := 25;
  END;

  IF v_reward_amount IS NULL OR v_reward_amount <= 0 THEN
    v_reward_amount := 25;
  END IF;

  -- 8. Atomically insert into public.referrals
  -- referred_user_id has a UNIQUE index (idx_referrals_referred_user_id_unique).
  -- ON CONFLICT (referred_user_id) DO NOTHING guarantees exact-once attribution under concurrency.
  INSERT INTO public.referrals (
    referrer_id,
    referred_user_id,
    referral_code,
    pixels_rewarded,
    opportunity_id,
    status
  ) VALUES (
    v_referrer_id,
    v_referred_user_id,
    v_clean_code,
    v_reward_amount,
    v_opp_uuid,
    'completed'
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO v_new_ref_id;

  -- If no row was inserted, a concurrent request already attributed this user
  IF v_new_ref_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A referral has already been recorded for this user.',
      'code', 'ALREADY_REFERRED'
    );
  END IF;

  -- 9. Atomically increment referrer's pixels balance and referrals counter in public.profiles
  UPDATE public.profiles
  SET 
    pixels = COALESCE(pixels, 0) + v_reward_amount,
    referrals = COALESCE(referrals, 0) + 1,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_referrer_id
  RETURNING pixels, referrals INTO v_new_pixels, v_new_referrals;

  -- 10. Record immutable audit ledger entry in public.pixel_transactions
  -- Executed in the same atomic transaction without exception suppression so failures roll back completely!
  INSERT INTO public.pixel_transactions (
    user_id,
    amount,
    action,
    reason,
    type,
    admin_id
  ) VALUES (
    v_referrer_id,
    v_reward_amount,
    'Referral Reward (+' || v_reward_amount || ' Pixels)',
    'A new member joined Pixel Minds with your referral link',
    'earn',
    NULL
  );

  -- 11. Return successful confirmation
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'referrer_name', v_referrer_name,
    'referral_code', v_clean_code,
    'pixels_awarded', v_reward_amount,
    'message', 'Referral successfully applied! +' || v_reward_amount || ' Pixels awarded to ' || v_referrer_name || '.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_code(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(TEXT, TEXT) TO authenticated;
