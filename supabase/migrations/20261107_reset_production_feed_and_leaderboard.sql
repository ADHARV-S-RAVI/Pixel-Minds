-- Migration: Reset production feed, purge "Wow India", and allow anonymous read checks
-- Date: 2026-11-07

-- 1. Purge "Wow India" demo opportunity and its submissions
DELETE FROM public.submissions 
WHERE opportunity_id = '38bee408-e867-497e-a94d-ac423b317297' 
   OR title ILIKE '%wow india%';

DELETE FROM public.opportunities 
WHERE id = '38bee408-e867-497e-a94d-ac423b317297' 
   OR title ILIKE '%wow india%';

-- 2. Grant EXECUTE permissions on public.is_admin() to anon and authenticated roles
-- This prevents 42501 permission denied errors when anonymous visitors load opportunities or public feed
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 3. (Optional) Verification query to ensure no orphaned demo opportunities remain
SELECT id, title, category, status, deadline 
FROM public.opportunities 
WHERE title ILIKE '%wow india%';

