-- Migration: User Applications Table & Registration Reward RPC
-- Date: 2026-11-09

-- 1. Ensure user_applications table exists with proper schema and unique constraint
CREATE TABLE IF NOT EXISTS public.user_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  opportunity_category TEXT,
  opportunity_organizer TEXT,
  mode TEXT,
  deadline TEXT,
  official_url TEXT,
  applied_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected')),
  confirmed_at BIGINT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  pixels_rewarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_applications_user_opp UNIQUE (user_id, opportunity_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_applications_user ON public.user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_opp ON public.user_applications(opportunity_id);

-- Enable Row Level Security
ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can read own applications" ON public.user_applications;
CREATE POLICY "Users can read own applications"
  ON public.user_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users can insert own applications" ON public.user_applications;
CREATE POLICY "Users can insert own applications"
  ON public.user_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own applications" ON public.user_applications;
CREATE POLICY "Users can update own applications"
  ON public.user_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admins can delete applications" ON public.user_applications;
CREATE POLICY "Admins can delete applications"
  ON public.user_applications
  FOR DELETE
  TO authenticated
  USING (SELECT public.is_admin());


-- 2. Secure RPC to claim registration Pixels (+10 Pixels)
-- Uses SECURITY DEFINER to safely credit pixels without exposing arbitrary profile updates
CREATE OR REPLACE FUNCTION public.claim_registration_pixels(
  p_opportunity_id TEXT,
  p_opportunity_title TEXT,
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
  v_safe_amount INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Enforce safe reward amount range
  v_safe_amount := COALESCE(p_amount, 10);
  IF v_safe_amount <= 0 OR v_safe_amount > 50 THEN
    v_safe_amount := 10;
  END IF;

  -- Update profiles table directly
  UPDATE public.profiles
  SET 
    pixels = COALESCE(pixels, 0) + v_safe_amount,
    updated_at = now()
  WHERE id = v_user_id
  RETURNING pixels INTO v_new_pixels;

  -- Insert pixel transaction record for user history
  BEGIN
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
      'Registration Reward (+' || v_safe_amount || ' Pixels)',
      COALESCE('Registered for ' || p_opportunity_title, 'Opportunity Registration'),
      'adjustment',
      v_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pixel_transactions insert fails for any reason, don't abort the reward
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'pixels', v_new_pixels,
    'awarded', v_safe_amount
  );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_registration_pixels(TEXT, TEXT, INTEGER) TO authenticated;

