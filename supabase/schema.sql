-- ==============================================================================
-- PIXEL MINDS - COMPLETE SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (Linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  pixels INTEGER NOT NULL DEFAULT 0 CHECK (pixels >= 0),
  rank TEXT DEFAULT 'Pixel Novice',
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  opportunities_shared INTEGER NOT NULL DEFAULT 0,
  approved_submissions INTEGER NOT NULL DEFAULT 0,
  referrals INTEGER NOT NULL DEFAULT 0,
  contributions INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] NOT NULL DEFAULT '{}',
  referral_id TEXT UNIQUE NOT NULL,
  college TEXT,
  course TEXT,
  year_of_study TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_id ON public.profiles(referral_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pixels ON public.profiles(pixels DESC);

-- Secure public profiles view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT 
  id,
  username,
  full_name,
  avatar_url,
  bio,
  rank,
  pixels,
  contributions,
  opportunities_shared,
  approved_submissions,
  badges,
  created_at
FROM public.profiles
WHERE is_suspended = FALSE;

ALTER VIEW public.public_profiles OWNER TO postgres;

GRANT SELECT ON public.public_profiles TO anon, authenticated, service_role;

-- Dedicated secure function to retrieve post likers (public identity only)
CREATE OR REPLACE FUNCTION public.get_post_likers(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE community_posts.id = p_post_id
    AND (
      community_posts.status = 'published'
      OR community_posts.user_id = auth.uid()
      OR public.is_admin()
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.avatar_url
  FROM public.community_likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.post_id = p_post_id
    AND p.is_suspended = FALSE
  ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_post_likers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_likers(UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. OPPORTUNITIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  organizer TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'offline', 'hybrid')),
  location TEXT,
  prize TEXT,
  stipend TEXT,
  eligibility TEXT,
  team_size TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  apply_url TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'expired', 'archived')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'user')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  additional_info TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  apply_clicks INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_opportunities_end_date_after_start_date CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_opportunities_deadline_year CHECK (EXTRACT(YEAR FROM deadline) BETWEEN 1000 AND 9999),
  CONSTRAINT chk_opportunities_start_date_year CHECK (start_date IS NULL OR EXTRACT(YEAR FROM start_date) BETWEEN 1000 AND 9999),
  CONSTRAINT chk_opportunities_end_date_year CHECK (end_date IS NULL OR EXTRACT(YEAR FROM end_date) BETWEEN 1000 AND 9999)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_category ON public.opportunities(category);
CREATE INDEX IF NOT EXISTS idx_opportunities_featured ON public.opportunities(featured);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON public.opportunities(deadline);

-- ==============================================================================
-- 4. SUBMISSIONS TABLE (User Opportunity Submissions Queue)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  organizer TEXT NOT NULL,
  deadline TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  mode TEXT DEFAULT 'online',
  location TEXT,
  prize TEXT,
  stipend TEXT,
  eligibility TEXT,
  team_size TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  official_url TEXT NOT NULL,
  image_url TEXT,
  additional_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_submissions_end_date_after_start_date CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT chk_submissions_deadline_year CHECK (deadline IS NULL OR EXTRACT(YEAR FROM deadline) BETWEEN 1000 AND 9999),
  CONSTRAINT chk_submissions_start_date_year CHECK (start_date IS NULL OR EXTRACT(YEAR FROM start_date) BETWEEN 1000 AND 9999),
  CONSTRAINT chk_submissions_end_date_year CHECK (end_date IS NULL OR EXTRACT(YEAR FROM end_date) BETWEEN 1000 AND 9999)
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);

-- ==============================================================================
-- 5. COMMUNITY POSTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'user',
  text TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  link TEXT,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_community_posts_status ON public.community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);

-- ==============================================================================
-- 6. PIXEL TRANSACTIONS TABLE (Immutable Ledger for Pixels)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pixel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend', 'adjustment')),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pixel_transactions_user_id ON public.pixel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_transactions_created_at ON public.pixel_transactions(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pixel_transactions_idempotency ON public.pixel_transactions (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ==============================================================================
-- 7. REFERRALS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  pixels_rewarded INTEGER NOT NULL DEFAULT 0,
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);

-- ==============================================================================
-- 8. REPORTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('opportunity', 'post', 'user')),
  target_id TEXT NOT NULL,
  target_title TEXT,
  target_snippet TEXT,
  reporter_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

-- ==============================================================================
-- 8b. USER APPLICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed')),
  applied_at BIGINT NOT NULL DEFAULT round(extract(epoch from now()) * 1000)::BIGINT,
  confirmed_at BIGINT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  pixels_rewarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_applications_user_opp UNIQUE (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_applications_user_id ON public.user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_opp_id ON public.user_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_status ON public.user_applications(status);

-- ==============================================================================
-- 8c. RATE LIMITING & SECURITY MONITORING TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  request_count INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uq_user_action_rate_limit UNIQUE (user_id, action_type)
);

CREATE INDEX IF NOT EXISTS idx_user_rate_limits_lookup ON public.user_rate_limits (user_id, action_type);

CREATE TABLE IF NOT EXISTS public.rate_limit_policy (
  action_type    TEXT PRIMARY KEY,
  max_requests   INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL
);

INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds) VALUES
  ('post_create',               5,    60),
  ('comment_create',           15,    60),
  ('like_toggle',              40,    60),
  ('comment_like_toggle',      40,    60),
  ('bookmark_toggle',          30,    60),
  ('post_interaction',         20,    60),
  ('send_email',                5,   600),
  ('opportunity_submit_minute', 1,    60),
  ('opportunity_submit_day',    5, 86400)
ON CONFLICT (action_type) DO UPDATE SET
  max_requests = EXCLUDED.max_requests,
  window_seconds = EXCLUDED.window_seconds;

CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  correlation_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs (user_id);

-- ==============================================================================
-- 9. REWARD CONFIG TABLE (Singleton / Config Record)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reward_config (
  id TEXT PRIMARY KEY DEFAULT 'rewards',
  share_opportunity INTEGER NOT NULL DEFAULT 10,
  submit_opportunity INTEGER NOT NULL DEFAULT 20,
  approved_opportunity INTEGER NOT NULL DEFAULT 50,
  referral_signup INTEGER NOT NULL DEFAULT 25,
  valid_report INTEGER NOT NULL DEFAULT 15,
  daily_activity INTEGER NOT NULL DEFAULT 5,
  profile_completion INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default rewards if not existing
INSERT INTO public.reward_config (id, share_opportunity, submit_opportunity, approved_opportunity, referral_signup, valid_report, daily_activity, profile_completion)
VALUES ('rewards', 10, 20, 50, 25, 15, 5, 10)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. ANNOUNCEMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_text TEXT,
  cta_link TEXT,
  image_url TEXT,
  target_audience TEXT DEFAULT 'all',
  start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  end_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now() + interval '30 days'),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);

-- ==============================================================================
-- 11. NOTIFICATIONS & USER NOTIFICATIONS TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('offer', 'opportunity', 'announcement', 'reminder', 'community', 'referral', 'pixel', 'system')),
  link TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(is_read);

-- ==============================================================================
-- 12. AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 13. ANALYTICS EVENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- ==============================================================================
-- SAFE INCREMENT RPC FUNCTIONS (bypass RLS, SECURITY DEFINER)
-- ==============================================================================

-- Safely increment the view count for a published opportunity by 1.
-- Uses SECURITY DEFINER so any visitor can call this without admin privileges.
CREATE OR REPLACE FUNCTION public.increment_opportunity_views(opp_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.opportunities
  SET views = views + 1
  WHERE id = opp_id AND status = 'published';
END;
$$;

-- Safely increment the apply click count for a published opportunity by 1.
CREATE OR REPLACE FUNCTION public.increment_opportunity_apply_clicks(opp_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.opportunities
  SET apply_clicks = apply_clicks + 1
  WHERE id = opp_id AND status = 'published';
END;
$$;

-- ==============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Helper to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Secure RPC to dispatch a notification to Everyone or a specific user.
-- Strictly validates administrator privileges and inserts records atomically.
CREATE OR REPLACE FUNCTION public.send_notification_rpc(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'system',
  p_link TEXT DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL, -- NULL means broadcast to Everyone
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_id UUID;
  v_inserted_count INTEGER := 0;
  v_caller_id UUID;
BEGIN
  -- 1. Strictly enforce Admin role on the caller
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can dispatch notifications.';
  END IF;

  v_caller_id := auth.uid();

  -- 2. Validate parameters
  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'Notification title is required.';
  END IF;
  IF p_message IS NULL OR TRIM(p_message) = '' THEN
    RAISE EXCEPTION 'Notification message is required.';
  END IF;

  -- 3. Insert master notification
  INSERT INTO public.notifications (
    title,
    message,
    type,
    link,
    created_by
  )
  VALUES (
    TRIM(p_title),
    TRIM(p_message),
    COALESCE(p_type, 'system'),
    p_link,
    COALESCE(p_admin_id, v_caller_id)
  )
  RETURNING id INTO v_notif_id;

  -- 4. Insert user_notifications recipient records
  IF p_target_user_id IS NOT NULL THEN
    -- Specific user delivery
    INSERT INTO public.user_notifications (user_id, notification_id, is_read)
    VALUES (p_target_user_id, v_notif_id, FALSE)
    ON CONFLICT (user_id, notification_id) DO NOTHING;
    v_inserted_count := 1;
  ELSE
    -- Broadcast to Everyone: insert for all registered profiles
    INSERT INTO public.user_notifications (user_id, notification_id, is_read)
    SELECT id, v_notif_id, FALSE
    FROM public.profiles
    ON CONFLICT (user_id, notification_id) DO NOTHING;
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'success', true,
    'notification_id', v_notif_id,
    'recipients_count', v_inserted_count
  );
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.send_notification_rpc(TEXT, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_notification_rpc(TEXT, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;

-- Secure RPC to delete a notification and all of its recipient records.
-- Strictly validates administrator privileges and cascades cleanly.
CREATE OR REPLACE FUNCTION public.delete_notification_rpc(
  p_notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Strictly enforce Admin role on caller
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can delete notifications.';
  END IF;

  IF p_notification_id IS NULL THEN
    RAISE EXCEPTION 'Notification ID is required.';
  END IF;

  -- 2. Explicitly remove recipient records from user_notifications
  DELETE FROM public.user_notifications
  WHERE notification_id = p_notification_id;

  -- 3. Delete master notification record
  DELETE FROM public.notifications
  WHERE id = p_notification_id;

  RETURN json_build_object(
    'success', true,
    'deleted_id', p_notification_id
  );
END;
$$;

-- Restrict execution permissions
REVOKE ALL ON FUNCTION public.delete_notification_rpc(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_notification_rpc(UUID) TO authenticated;


-- Trigger: Update updated_at column
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER tr_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_submissions_updated_at ON public.submissions;
CREATE TRIGGER tr_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER tr_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_reports_updated_at ON public.reports;
CREATE TRIGGER tr_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_announcements_updated_at ON public.announcements;
CREATE TRIGGER tr_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: Automatically create public.profiles entry on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id TEXT;
BEGIN
  v_referral_id := 'PM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    pixels,
    rank,
    referral_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Pixel Builder'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    'user',
    0,
    'Pixel Novice',
    v_referral_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Automatically and securely update user pixels when a pixel_transaction is recorded
CREATE OR REPLACE FUNCTION public.handle_pixel_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    pixels = GREATEST(0, pixels + NEW.amount),
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_on_pixel_transaction ON public.pixel_transactions;
CREATE TRIGGER tr_on_pixel_transaction
AFTER INSERT ON public.pixel_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_pixel_transaction();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pixel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
-- Private profile data: only row owner or verified admin can select directly from public.profiles.
-- Public profile data is accessed via the public_profiles view.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self view or admin view" ON public.profiles;
CREATE POLICY "Profiles self view or admin view"
ON public.profiles FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = id OR public.is_admin()
);

-- Users can update their own safe profile fields (never role, pixels, or is_suspended directly)
CREATE POLICY "Users can update own safe profile fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Users cannot change their own role or suspension status
  role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
  is_suspended = (SELECT is_suspended FROM public.profiles WHERE id = auth.uid()) AND
  pixels = (SELECT pixels FROM public.profiles WHERE id = auth.uid())
);

-- Admins can update any profile (roles, suspension, etc.)
CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
USING (public.is_admin());

-- 2. CATEGORIES POLICIES
CREATE POLICY "Categories are readable by everyone"
ON public.categories FOR SELECT
USING (TRUE);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (public.is_admin());

-- 3. OPPORTUNITIES POLICIES
-- Public can read published opportunities
CREATE POLICY "Public can read published opportunities"
ON public.opportunities FOR SELECT
USING (status = 'published' OR public.is_admin() OR auth.uid() = created_by);

-- Authenticated users can insert pending opportunities (hardened by Phase 1 & Phase 2 migrations)
-- NOTE: The final INSERT policy "Users can submit pending opportunities" (with suspension check)
-- is defined in 20261121120000_phase1_counter_trigger_ratelimit_suspension.sql and
-- 20261121150000_phase2_referrals_applications_reports_opp_policies.sql.
-- The legacy broad policy below is superseded and dropped by those migrations.
CREATE POLICY "Users can submit or admins can create opportunities"
ON public.opportunities FOR INSERT
WITH CHECK (
  public.is_admin() OR
  (auth.uid() IS NOT NULL AND status = 'pending' AND created_by = auth.uid())
);

-- Public can update view / click counts on published opportunities; admins can update all
CREATE POLICY "Admins can update opportunities"
ON public.opportunities FOR UPDATE
USING (public.is_admin());

-- Admins can delete opportunities
CREATE POLICY "Admins can delete opportunities"
ON public.opportunities FOR DELETE
USING (public.is_admin());

-- 4. SUBMISSIONS POLICIES
-- Users can read their own submissions, admins can read all
CREATE POLICY "Users can view own submissions or admins view all"
ON public.submissions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Authenticated users can submit opportunities
CREATE POLICY "Authenticated users can create submissions"
ON public.submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update submissions (approve / reject)
CREATE POLICY "Admins can update submissions"
ON public.submissions FOR UPDATE
USING (public.is_admin());

-- Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
ON public.submissions FOR DELETE
USING (public.is_admin());

-- 5. COMMUNITY POSTS POLICIES
-- Public can read published posts; admins can read all
CREATE POLICY "Public can read published posts"
ON public.community_posts FOR SELECT
USING (status = 'published' OR public.is_admin() OR auth.uid() = user_id);

-- Authenticated users can create posts (source='user' unless admin)
CREATE POLICY "Authenticated users can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (source = 'user' OR public.is_admin())
);

-- Users can update/delete their own posts; admins can moderate all
CREATE POLICY "Users can update own posts or admin moderate"
ON public.community_posts FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own posts or admin moderate"
ON public.community_posts FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- 6. PIXEL TRANSACTIONS POLICIES
-- Users can view their own transactions; admins can view all
CREATE POLICY "Users can view own transactions or admin view all"
ON public.pixel_transactions FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Only admins (or system functions) can create pixel adjustments
CREATE POLICY "Only admins can manually insert pixel transactions"
ON public.pixel_transactions FOR INSERT
WITH CHECK (public.is_admin());

-- No updating or deleting transactions (immutable audit ledger)
CREATE POLICY "Pixel transactions are immutable"
ON public.pixel_transactions FOR UPDATE
USING (FALSE);

CREATE POLICY "Pixel transactions cannot be deleted"
ON public.pixel_transactions FOR DELETE
USING (FALSE);

-- 7. REFERRALS POLICIES
CREATE POLICY "Users can view own referrals or admin view all"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.is_admin());

-- NOTE: Direct client INSERT on referrals is intentionally blocked.
-- All referral claims must flow through claim_referral_code() (SECURITY DEFINER).
-- The legacy INSERT policy below is dropped by 20261121150000_phase2_referrals_applications_reports_opp_policies.sql.
-- CREATE POLICY "Authenticated users or system can create referral records" ... (removed)

-- 8. REPORTS POLICIES
CREATE POLICY "Users can view own reports or admins view all"
ON public.reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id OR public.is_admin());

CREATE POLICY "Users can insert reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reports"
ON public.reports FOR DELETE
TO authenticated
USING (public.is_admin());

-- 8b. USER APPLICATIONS POLICIES
CREATE POLICY "Users can insert own applications"
ON public.user_applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending_confirmation'
  AND reward_claimed = false
  AND pixels_rewarded = 0
);

CREATE POLICY "Users can view own applications"
ON public.user_applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can update applications"
ON public.user_applications FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete applications"
ON public.user_applications FOR DELETE
TO authenticated
USING (public.is_admin());

-- 8c. RATE LIMIT & SECURITY MONITORING POLICIES
CREATE POLICY "Users can view own rate limits" 
ON public.user_rate_limits FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.is_admin());

-- rate_limit_policy is internal only: service_role only
REVOKE ALL ON TABLE public.rate_limit_policy FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_policy FROM anon;
REVOKE ALL ON TABLE public.rate_limit_policy FROM authenticated;
GRANT ALL ON TABLE public.rate_limit_policy TO service_role;

CREATE POLICY "Admins can view security logs"
ON public.security_logs FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete security logs"
ON public.security_logs FOR DELETE
TO authenticated
USING (public.is_admin());

-- Seed the rate-limit policy entry for security log events
INSERT INTO public.rate_limit_policy (action_type, max_requests, window_seconds)
VALUES ('security_log_event', 10, 60)
ON CONFLICT (action_type) DO NOTHING;

-- Recursive JSONB sensitive-key redactor (traverses objects and arrays)
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

-- Hardened log_security_event()
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
  IF v_role NOT IN ('authenticated', 'service_role') THEN
    RETURN NULL;
  END IF;

  v_clean_type := lower(trim(COALESCE(p_event_type, '')));
  IF v_clean_type = '' THEN
    RETURN NULL;
  END IF;

  IF NOT (v_clean_type = ANY(ALLOWED_EVENT_TYPES)) THEN
    IF v_role = 'service_role' THEN
      v_clean_type := substring(v_clean_type FROM 1 FOR 100);
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  IF v_role = 'authenticated' AND v_user_id IS NOT NULL THEN
    IF NOT public.check_and_increment_rate_limit(v_user_id, 'security_log_event', 10, 60) THEN
      RETURN NULL;
    END IF;
  END IF;

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

  IF v_role = 'service_role' THEN
    v_clean_severity := lower(trim(COALESCE(p_severity, v_derived_severity)));
    IF NOT (v_clean_severity = ANY(ARRAY['info', 'warning', 'error', 'critical'])) THEN
      v_clean_severity := v_derived_severity;
    END IF;
  ELSE
    v_clean_severity := v_derived_severity;
  END IF;

  v_sanitized_details := public.redact_sensitive_jsonb(COALESCE(p_details, '{}'::jsonb));

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

-- Restrict cleanup_old_security_logs() to service_role only
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
    RAISE NOTICE 'pg_cron is not installed. Automated security log cleanup must be scheduled via pg_cron or an external cron worker invoking cleanup_old_security_logs() with service_role.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule notice: %. Continuing without automated DB cron.', SQLERRM;
END;
$$;

-- 9. REWARD CONFIG POLICIES
-- Anyone authenticated can read reward config
CREATE POLICY "Reward config is readable by authenticated users"
ON public.reward_config FOR SELECT
USING (TRUE);

-- Only admins can update reward config
CREATE POLICY "Admins can update reward config"
ON public.reward_config FOR ALL
USING (public.is_admin());

-- 10. ANNOUNCEMENTS POLICIES
-- Public can read published announcements
CREATE POLICY "Public can read published announcements"
ON public.announcements FOR SELECT
USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
USING (public.is_admin());

-- 11. NOTIFICATIONS POLICIES
-- Helper function to check if the current user has a recipient record for this notification.
-- Guarantees ordinary users can ONLY read notifications addressed to them,
-- without unrestricted table access or recursion issues.
CREATE OR REPLACE FUNCTION public.user_has_notification(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_notifications
    WHERE notification_id = p_notification_id
    AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_notification(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_notification(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can view their notifications" ON public.user_notifications;
CREATE POLICY "Users can view their notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.user_notifications;
CREATE POLICY "Users can mark their notifications as read"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can create user notifications" ON public.user_notifications;
CREATE POLICY "Admins can create user notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete user notifications" ON public.user_notifications;
CREATE POLICY "Admins can delete user notifications"
ON public.user_notifications FOR DELETE
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view notifications sent to them" ON public.notifications;
CREATE POLICY "Users can view notifications sent to them"
ON public.notifications FOR SELECT
USING (public.is_admin() OR public.user_has_notification(id));

-- Set full replica identity for row-level Realtime filters
ALTER TABLE public.user_notifications REPLICA IDENTITY FULL;

-- Enable Realtime publication on user_notifications if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- 12. AUDIT LOGS POLICIES
-- Strictly viewable and writable ONLY by Admins
CREATE POLICY "Admins have full access to audit logs"
ON public.audit_logs FOR ALL
USING (public.is_admin());

-- 13. ANALYTICS EVENTS POLICIES
CREATE POLICY "Admins can view analytics events"
ON public.analytics_events FOR SELECT
USING (public.is_admin());

CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events FOR INSERT
WITH CHECK (TRUE);

-- ==============================================================================
-- INITIAL SEED DATA (Categories)
-- ==============================================================================
INSERT INTO public.categories (id, name, description, icon, display_order)
VALUES 
  ('Internships', 'Internships', 'Paid and unpaid engineering and tech internships', 'Briefcase', 1),
  ('Hackathons', 'Hackathons', 'Global, regional, and collegiate hackathons', 'Terminal', 2),
  ('Jobs', 'Jobs', 'Full-time and part-time tech roles', 'Building', 3),
  ('Workshops', 'Workshops', 'Hands-on technical workshops and bootcamps', 'Laptop', 4),
  ('Scholarships', 'Scholarships', 'Financial grants and education scholarships', 'Award', 5),
  ('Competitions', 'Competitions', 'Coding, algorithm, and case competitions', 'Trophy', 6),
  ('Conferences', 'Conferences', 'Developer conferences and community summits', 'Users', 7),
  ('Courses', 'Courses', 'Certified online courses and specializations', 'BookOpen', 8),
  ('Tech Events', 'Tech Events', 'Meetups, AMAs, and open community events', 'Calendar', 9),
  ('Other', 'Other', 'Miscellaneous tech opportunities', 'Sparkles', 10)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- STORAGE BUCKETS SETUP
-- NOTE: Bucket MIME types, file size limits, and all storage RLS policies are
-- managed by the following migrations (applied in order). Do not redefine
-- storage policies here — this section only seeds the bucket records.
--   • 20261121110000_phase1_security_and_privacy_hardening.sql  (initial hardening)
--   • 20261121100000_feed_security_hardening_and_monitoring.sql (post-image policies)
--   • 20261121160000_phase3_storage_monitoring_schema_alignment.sql (final symmetric policies)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',             'avatars',             true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('opportunity-banners', 'opportunity-banners', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('post-images',         'post-images',         true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('announcement-images', 'announcement-images', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies are defined in the Phase 3 migration.
-- The legacy broad policies below are dropped by that migration; they are
-- intentionally omitted here to prevent OR-combined permissive policy leaks.
-- (Legacy entries removed: "Public can view avatar images",
--  "Authenticated users can upload avatars", "Public can view opportunity banners",
--  "Authenticated users can upload opportunity banners", "Public can view post images",
--  "Authenticated users can upload post images", "Public can view announcement images",
--  "Admins can upload announcement images")

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
