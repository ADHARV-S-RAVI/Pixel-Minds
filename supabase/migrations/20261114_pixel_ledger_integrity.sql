-- ==============================================================================
-- Migration: Pixel Ledger Integrity & Community Feed Reward Tracking
-- Date: 2026-11-14
-- Purpose:
--   1. Ensure idempotency_key column and partial unique index on public.pixel_transactions.
--   2. Drop double-counting trigger tr_on_pixel_transaction in favor of atomic RPC.
--   3. Create internal-only record_pixel_transaction_internal with:
--      - SET search_path = '' and fully qualified references for SECURITY DEFINER safety.
--      - Idempotency key normalization via NULLIF(btrim(p_idempotency_key), '').
--      - Row-level locking on profiles before calculation.
--      - Post-lock idempotency recheck.
--      - BIGINT arithmetic for balance calculations and 32-bit signed integer overflow checks.
--      - LEDGER INSERTION FIRST: profiles.pixels updated ONLY after successful transaction insertion.
--   4. Revoke direct execution of internal transaction functions from authenticated/anon/PUBLIC.
--   5. Provide secure admin-only admin_adjust_user_pixels RPC using gen_random_uuid() for idempotency.
--   6. Provide reward_community_post_creation RPC with strict post ownership (IS DISTINCT FROM),
--      publishing/moderation status check (status = 'published'), and hackathon reward classification.
--   7. Update toggle_community_post_like and add_community_post_comment to atomically reward users,
--      raising exceptions on reward failures to prevent partial state updates, and preserving all
--      20261110 feed protections (authentication, locking, 2000-char comment limit, counter sync).
--   8. Complete RLS policy audit on pixel_transactions:
--      - Drop all older permissive policies.
--      - Restrict SELECT to user's own transactions or verified admin.
--      - Explicitly disable client INSERT, UPDATE, and DELETE.
--   9. Retain NOTIFY pgrst, 'reload schema'.
-- ==============================================================================

-- 1. Ensure idempotency_key column on pixel_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pixel_transactions' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.pixel_transactions ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

-- Create partial unique index to guarantee no duplicate transactions per user per idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_pixel_transactions_idempotency
  ON public.pixel_transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Drop redundant trigger that could cause double-counting
DROP TRIGGER IF EXISTS tr_on_pixel_transaction ON public.pixel_transactions;

-- Ensure is_admin helper exists and is accessible with safe search path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 3. Core Internal-Only Atomic Pixel Transaction Engine
-- CRITICAL SECURITY: This function is strictly internal. Execution is revoked from
-- authenticated, anon, and PUBLIC so arbitrary clients cannot award or deduct Pixels.
CREATE OR REPLACE FUNCTION public.record_pixel_transaction_internal(
  p_user_id UUID,
  p_delta INTEGER,
  p_action TEXT,
  p_reason TEXT,
  p_type TEXT DEFAULT 'earn',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_normalized_key TEXT;
  v_current_pixels INTEGER;
  v_calc_balance BIGINT;
  v_new_pixels INTEGER;
  v_actual_delta INTEGER;
  v_tx_id UUID;
  v_existing_tx RECORD;
BEGIN
  -- 3.1 Strict Input Validation
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID required');
  END IF;

  IF p_delta IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction amount cannot be null');
  END IF;

  IF p_delta = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction amount cannot be zero');
  END IF;

  IF p_type IS NULL OR p_type NOT IN ('earn', 'spend') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction type: must be earn or spend');
  END IF;

  IF p_type = 'earn' AND p_delta <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Earn transaction must have a positive delta');
  END IF;

  IF p_type = 'spend' AND p_delta >= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spend transaction must have a negative delta');
  END IF;

  -- Normalize blank idempotency keys to NULL using NULLIF(btrim(...), '')
  v_normalized_key := NULLIF(btrim(p_idempotency_key), '');

  -- 3.2 Acquire profile row lock
  SELECT pixels INTO v_current_pixels
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  v_current_pixels := COALESCE(v_current_pixels, 0);

  -- 3.3 Recheck idempotency AFTER acquiring the lock
  IF v_normalized_key IS NOT NULL THEN
    SELECT id, amount INTO v_existing_tx
    FROM public.pixel_transactions
    WHERE user_id = p_user_id
      AND idempotency_key = v_normalized_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'tx_id', v_existing_tx.id,
        'pixels', v_current_pixels,
        'delta', v_existing_tx.amount,
        'already_processed', true,
        'message', 'Transaction already recorded'
      );
    END IF;
  END IF;

  -- 3.4 Calculate and validate balance using BIGINT arithmetic
  v_calc_balance := v_current_pixels::bigint + p_delta::bigint;

  -- Reject spend if insufficient balance
  IF p_delta < 0 AND v_calc_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient pixel balance',
      'pixels', v_current_pixels
    );
  END IF;

  -- Prevent negative balance or 32-bit signed integer overflow (max 2147483647)
  IF v_calc_balance < 0 OR v_calc_balance > 2147483647 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Resulting pixel balance exceeds valid integer range',
      'pixels', v_current_pixels
    );
  END IF;

  v_new_pixels := v_calc_balance::integer;
  v_actual_delta := v_new_pixels - v_current_pixels;

  -- 3.5 INSERT LEDGER RECORD FIRST (Must succeed before updating balance)
  INSERT INTO public.pixel_transactions (
    user_id,
    amount,
    action,
    reason,
    type,
    idempotency_key,
    created_at
  ) VALUES (
    p_user_id,
    v_actual_delta,
    COALESCE(p_action, CASE WHEN v_actual_delta >= 0 THEN 'Earned Pixels' ELSE 'Spent Pixels' END),
    COALESCE(p_reason, 'Community activity reward'),
    p_type,
    v_normalized_key,
    timezone('utc'::text, now())
  )
  ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_tx_id;

  -- If the insert returns no transaction ID, do NOT update the profile balance
  IF v_tx_id IS NULL THEN
    IF v_normalized_key IS NOT NULL THEN
      SELECT id, amount INTO v_existing_tx
      FROM public.pixel_transactions
      WHERE user_id = p_user_id AND idempotency_key = v_normalized_key
      LIMIT 1;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'success', true,
          'tx_id', v_existing_tx.id,
          'pixels', v_current_pixels,
          'delta', v_existing_tx.amount,
          'already_processed', true,
          'message', 'Transaction already recorded'
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ledger insertion failed; balance update aborted',
      'pixels', v_current_pixels
    );
  END IF;

  -- 3.6 Update profiles.pixels ONLY AFTER successful ledger insertion
  UPDATE public.profiles
  SET 
    pixels = v_new_pixels,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'pixels', v_new_pixels,
    'delta', v_actual_delta
  );
END;
$$;

-- Revoke direct execution from ordinary clients and anon visitors
REVOKE ALL ON FUNCTION public.record_pixel_transaction_internal(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_pixel_transaction_internal(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.record_pixel_transaction_internal(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_pixel_transaction_internal(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Backward-compatibility wrapper for execute_pixel_transaction: strictly internal-only
CREATE OR REPLACE FUNCTION public.execute_pixel_transaction(
  p_user_id UUID,
  p_delta INTEGER,
  p_action TEXT,
  p_reason TEXT,
  p_type TEXT DEFAULT 'earn',
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.record_pixel_transaction_internal(
    p_user_id,
    p_delta,
    p_action,
    p_reason,
    COALESCE(p_type, CASE WHEN p_delta >= 0 THEN 'earn' ELSE 'spend' END),
    p_idempotency_key
  );
END;
$$;

-- Revoke direct execution from ordinary clients and anon visitors
REVOKE ALL ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.execute_pixel_transaction(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- 4. Secure Admin-Only Pixel Adjustment RPC
CREATE OR REPLACE FUNCTION public.admin_adjust_user_pixels(
  p_target_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_role TEXT;
  v_trimmed_reason TEXT;
  v_action TEXT;
  v_type TEXT;
  v_res JSONB;
BEGIN
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT role INTO v_admin_role FROM public.profiles WHERE id = v_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user ID required');
  END IF;

  IF p_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment amount cannot be null');
  END IF;

  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment amount cannot be zero');
  END IF;

  v_trimmed_reason := btrim(COALESCE(p_reason, ''));
  IF length(v_trimmed_reason) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Meaningful adjustment reason required (minimum 3 characters)');
  END IF;

  IF length(v_trimmed_reason) > 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment reason too long (maximum 500 characters)');
  END IF;

  v_type := CASE WHEN p_amount >= 0 THEN 'earn' ELSE 'spend' END;
  v_action := CASE 
    WHEN p_amount >= 0 THEN 'Admin Award (+' || p_amount::text || ' Pixels)' 
    ELSE 'Admin Deduction (' || p_amount::text || ' Pixels)' 
  END;

  -- Use UUID-based unique key using gen_random_uuid() for guaranteed uniqueness
  v_res := public.record_pixel_transaction_internal(
    p_target_user_id,
    p_amount,
    v_action,
    v_trimmed_reason,
    v_type,
    'admin_adj_' || gen_random_uuid()::text
  );

  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Admin adjustment failed: %', COALESCE(v_res->>'error', 'Unknown ledger error');
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_user_pixels(UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_adjust_user_pixels(UUID, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_user_pixels(UUID, INTEGER, TEXT) TO authenticated, service_role;

-- 5. Server-Verified Post Creation Reward Function
-- Enforces publishing/moderation status check, post ownership, and hackathon classification
CREATE OR REPLACE FUNCTION public.reward_community_post_creation(
  p_post_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_post RECORD;
  v_is_hackathon BOOLEAN := FALSE;
  v_amount INTEGER;
  v_action TEXT;
  v_reason TEXT;
  v_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT id, user_id, title, category, status INTO v_post
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found');
  END IF;

  -- Null-safe ownership check using IS DISTINCT FROM
  IF v_post.user_id IS DISTINCT FROM v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only the post author can receive creation rewards');
  END IF;

  -- Prevent pending, hidden, draft, or archived posts from receiving creation rewards
  IF v_post.status IS DISTINCT FROM 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only published posts are eligible for creation rewards');
  END IF;

  -- Reward classification: Only posts explicitly shared as hackathons receive 15 Pixels
  IF v_post.category = 'Upcoming Hackathon' 
     OR v_post.category ILIKE '%hackathon%' 
     OR v_post.title ILIKE 'Upcoming Hackathon:%' THEN
    v_is_hackathon := TRUE;
  END IF;

  v_amount := CASE WHEN v_is_hackathon THEN 15 ELSE 10 END;
  v_action := CASE WHEN v_is_hackathon THEN 'Shared Hackathon (+15 Pixels)' ELSE 'Created Post (+10 Pixels)' END;
  v_reason := CASE 
    WHEN v_is_hackathon THEN 'Shared upcoming hackathon: "' || substring(COALESCE(v_post.title, 'Hackathon') from 1 for 50) || '"'
    ELSE 'Created community post: "' || substring(COALESCE(v_post.title, 'Community Post') from 1 for 50) || '"'
  END;

  v_res := public.record_pixel_transaction_internal(
    v_user_id,
    v_amount,
    v_action,
    v_reason,
    'earn',
    'feed_post_' || p_post_id::text
  );

  -- Required reward failures must raise an exception to maintain atomicity
  IF (v_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to record post creation reward: %', COALESCE(v_res->>'error', 'Unknown ledger error');
  END IF;

  RETURN v_res;
END;
$$;

REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_community_post_creation(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reward_community_post_creation(UUID) TO authenticated, service_role;

-- 6. Updated toggle_community_post_like: Rewards Post Author (+1 Pixel) Atomically via Internal RPC
-- Preserves all existing 20261110 feed protections: authentication, row-level locking, atomic toggle, counter sync
CREATE OR REPLACE FUNCTION public.toggle_community_post_like(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_liked BOOLEAN;
  v_new_likes INTEGER;
  v_post_author_id UUID;
  v_post_title TEXT;
  v_post_status TEXT;
  v_reward_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts.';
  END IF;

  -- Row-level lock on the post row to prevent concurrent race conditions
  SELECT user_id, title, status INTO v_post_author_id, v_post_title, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Preserve moderation/visibility check
  IF v_post_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Cannot like a post that is not published.';
  END IF;

  -- Atomic toggle
  DELETE FROM public.community_likes
  WHERE post_id = p_post_id AND user_id::text = v_user_id::text;

  IF FOUND THEN
    v_liked := false;
  ELSE
    INSERT INTO public.community_likes (post_id, user_id)
    VALUES (p_post_id, v_user_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
    v_liked := true;

    -- Secure cross-user reward: reward author (+1 Pixel) if not liking own post (safe IS DISTINCT FROM check)
    IF v_post_author_id IS NOT NULL AND v_post_author_id IS DISTINCT FROM v_user_id THEN
      v_reward_res := public.record_pixel_transaction_internal(
        v_post_author_id,
        1,
        'Like Received (+1 Pixel)',
        'Received a like on post: "' || substring(COALESCE(v_post_title, 'Community Post') from 1 for 50) || '"',
        'earn',
        'feed_like_' || p_post_id::text || '_' || v_user_id::text
      );

      -- Do not silently ignore failed reward: raise exception to roll back like toggle
      IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
        RAISE EXCEPTION 'Failed to record like reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
      END IF;
    END IF;
  END IF;

  -- Synchronize likes counter directly from actual records to prevent drift
  UPDATE public.community_posts
  SET likes = (
    SELECT count(*)::integer
    FROM public.community_likes
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id
  RETURNING likes INTO v_new_likes;

  RETURN jsonb_build_object(
    'success', true,
    'liked', v_liked,
    'likes_count', COALESCE(v_new_likes, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_community_post_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_community_post_like(UUID) TO authenticated, service_role;

-- 7. Updated add_community_post_comment: Rewards Commenter (+2 Pixels) and Post Author (+2 Pixels) Atomically
-- Preserves all existing 20261110 feed protections: authentication, comment trimming & 2000-char validation,
-- row-level locking, author resolution, counter sync
CREATE OR REPLACE FUNCTION public.add_community_post_comment(
  p_post_id UUID,
  p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_trimmed_text TEXT;
  v_author_name TEXT;
  v_author_role TEXT;
  v_author_avatar TEXT;
  v_comment_row public.community_comments%ROWTYPE;
  v_new_comments INTEGER;
  v_post_author_id UUID;
  v_post_title TEXT;
  v_post_status TEXT;
  v_reward_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to comment on posts.';
  END IF;

  v_trimmed_text := btrim(p_text);
  IF v_trimmed_text IS NULL OR length(v_trimmed_text) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty.';
  END IF;

  IF length(v_trimmed_text) > 2000 THEN
    RAISE EXCEPTION 'Comment text exceeds maximum allowed length of 2000 characters.';
  END IF;

  -- Row-level lock on the post row
  SELECT user_id, title, status INTO v_post_author_id, v_post_title, v_post_status
  FROM public.community_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  -- Preserve moderation/visibility check
  IF v_post_status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION 'Cannot comment on a post that is not published.';
  END IF;

  -- Resolve author profile details
  SELECT
    COALESCE(full_name, 'Pixel Builder'),
    COALESCE(role, 'Pixel Member'),
    avatar_url
  INTO
    v_author_name,
    v_author_role,
    v_author_avatar
  FROM public.profiles
  WHERE id::text = v_user_id::text;

  IF v_author_name IS NULL THEN
    v_author_name := 'Pixel Builder';
  END IF;

  -- Insert comment
  INSERT INTO public.community_comments (
    post_id,
    user_id,
    author_name,
    author_role,
    author_avatar,
    text
  )
  VALUES (
    p_post_id,
    v_user_id,
    v_author_name,
    v_author_role,
    v_author_avatar,
    v_trimmed_text
  )
  RETURNING * INTO v_comment_row;

  -- 1. Reward commenter (+2 Pixels) via internal RPC with idempotency
  v_reward_res := public.record_pixel_transaction_internal(
    v_user_id,
    2,
    'Comment Posted (+2 Pixels)',
    'Commented on discussion: "' || substring(COALESCE(v_post_title, 'Community Post') from 1 for 50) || '"',
    'earn',
    'feed_comment_made_' || v_comment_row.id::text
  );

  IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Failed to record commenter reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
  END IF;

  -- 2. Secure cross-user reward: reward post author (+2 Pixels) if not commenting on own post (safe IS DISTINCT FROM check)
  IF v_post_author_id IS NOT NULL AND v_post_author_id IS DISTINCT FROM v_user_id THEN
    v_reward_res := public.record_pixel_transaction_internal(
      v_post_author_id,
      2,
      'Comment Received (+2 Pixels)',
      'Received comment on post: "' || substring(COALESCE(v_post_title, 'Community Post') from 1 for 50) || '"',
      'earn',
      'feed_comment_received_' || v_comment_row.id::text
    );

    IF (v_reward_res->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Failed to record post author comment reward: %', COALESCE(v_reward_res->>'error', 'Unknown ledger error');
    END IF;
  END IF;

  -- Synchronize comments counter directly from actual records
  UPDATE public.community_posts
  SET comments = (
    SELECT count(*)::integer
    FROM public.community_comments
    WHERE post_id = p_post_id
  )
  WHERE id = p_post_id
  RETURNING comments INTO v_new_comments;

  RETURN jsonb_build_object(
    'success', true,
    'comment', jsonb_build_object(
      'id', v_comment_row.id,
      'author_name', v_comment_row.author_name,
      'author_role', v_comment_row.author_role,
      'author_avatar', v_comment_row.author_avatar,
      'text', v_comment_row.text,
      'created_at', v_comment_row.created_at
    ),
    'comments_count', COALESCE(v_new_comments, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_community_post_comment(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_community_post_comment(UUID, TEXT) TO authenticated, service_role;

-- 8. Complete RLS Policy Audit & Privileges on pixel_transactions
ALTER TABLE public.pixel_transactions ENABLE ROW LEVEL SECURITY;

-- 8.1 Dynamically drop ALL existing policies on public.pixel_transactions using pg_policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pixel_transactions'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.pixel_transactions;', r.policyname);
  END LOOP;
END $$;

-- 8.2 SELECT: Users can read their own transactions; admins can read all transactions
CREATE POLICY "pixel_transactions_select_policy"
ON public.pixel_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR (SELECT public.is_admin())
);

-- 8.3 INSERT: Client-side INSERT is blocked (all transactions must go through atomic SECURITY DEFINER functions)
CREATE POLICY "pixel_transactions_insert_disable"
ON public.pixel_transactions FOR INSERT
TO authenticated, anon, PUBLIC
WITH CHECK (FALSE);

-- 8.4 UPDATE: Client-side UPDATE is blocked (immutable ledger)
CREATE POLICY "pixel_transactions_update_disable"
ON public.pixel_transactions FOR UPDATE
TO authenticated, anon, PUBLIC
USING (FALSE)
WITH CHECK (FALSE);

-- 8.5 DELETE: Client-side DELETE is blocked (permanent audit trail)
CREATE POLICY "pixel_transactions_delete_disable"
ON public.pixel_transactions FOR DELETE
TO authenticated, anon, PUBLIC
USING (FALSE);

-- 8.6 Revoke direct table manipulation privileges from client roles
REVOKE ALL ON TABLE public.pixel_transactions FROM PUBLIC;
REVOKE ALL ON TABLE public.pixel_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.pixel_transactions FROM authenticated;

-- Ensure read access for authenticated users and full access for service_role
GRANT SELECT ON TABLE public.pixel_transactions TO authenticated;
GRANT ALL ON TABLE public.pixel_transactions TO service_role;

-- 9. Refresh PostgREST OpenAPI schema cache
NOTIFY pgrst, 'reload schema';
