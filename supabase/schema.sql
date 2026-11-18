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
CREATE INDEX IF NOT EXISTS idx_profiles_referral_id ON public.profiles(referral_id);
CREATE INDEX IF NOT EXISTS idx_profiles_pixels ON public.profiles(pixels DESC);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_pixel_transactions_user_id ON public.pixel_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pixel_transactions_created_at ON public.pixel_transactions(created_at DESC);

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
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

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
ALTER TABLE public.reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
-- Anyone can view public profile fields (for community, leaderboard, authors)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (TRUE);

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

-- Authenticated users can insert pending opportunities or admins can insert anything
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

CREATE POLICY "Authenticated users or system can create referral records"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.is_admin());

-- 8. REPORTS POLICIES
CREATE POLICY "Users can view own reports or admins view all"
ON public.reports FOR SELECT
USING (auth.uid() = reporter_id OR public.is_admin());

CREATE POLICY "Authenticated users can create reports"
ON public.reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
ON public.reports FOR UPDATE
USING (public.is_admin());

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
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('opportunity-banners', 'opportunity-banners', true),
  ('post-images', 'post-images', true),
  ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Public can view avatar images"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view opportunity banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'opportunity-banners');

CREATE POLICY "Authenticated users can upload opportunity banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'opportunity-banners' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

CREATE POLICY "Admins can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcement-images' AND public.is_admin());
