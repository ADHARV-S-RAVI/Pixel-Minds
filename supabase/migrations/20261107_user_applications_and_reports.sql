-- Migration: User Applications Tracking, 3-Minute Registration Cooldown & Moderation Reports
-- Date: 2026-11-07

-- 1. Ensure is_admin() function is accessible by authenticated and anon roles without permission error
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
    GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
  END IF;
END $$;

-- 2. User Applications Table
CREATE TABLE IF NOT EXISTS public.user_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  opportunity_category TEXT,
  opportunity_organizer TEXT,
  official_url TEXT,
  applied_at BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'rejected')),
  confirmed_at BIGINT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  pixels_rewarded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user application lookups
CREATE INDEX IF NOT EXISTS idx_user_applications_user ON public.user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_opp ON public.user_applications(opportunity_id);

-- Enable RLS
ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;

-- Policies for user_applications
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


-- 3. Reports & Moderation Table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('opportunity', 'post')),
  target_id TEXT NOT NULL,
  target_title TEXT,
  target_snippet TEXT,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at BIGINT NOT NULL,
  resolved_at BIGINT,
  resolved_by TEXT,
  notes TEXT,
  created_at_tz TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports:
-- Any authenticated user can submit a report
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
CREATE POLICY "Authenticated users can submit reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id OR reporter_id IS NULL);

-- Users can view their own submitted reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR (SELECT public.is_admin()));

-- Admins can update/resolve reports
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (SELECT public.is_admin());

-- Admins can delete reports
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
  ON public.reports
  FOR DELETE
  TO authenticated
  USING (SELECT public.is_admin());

