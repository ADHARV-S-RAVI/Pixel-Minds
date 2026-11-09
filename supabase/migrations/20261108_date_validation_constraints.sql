-- Migration: Enforce date validation and year constraints on opportunities and submissions
-- End date must not be earlier than start date
-- Year must be restricted to 4 digits (1000 to 9999)

DO $$ 
BEGIN
  -- 1. Opportunities Constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_opportunities_end_date_after_start_date'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT chk_opportunities_end_date_after_start_date
      CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_opportunities_deadline_year'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT chk_opportunities_deadline_year
      CHECK (EXTRACT(YEAR FROM deadline) BETWEEN 1000 AND 9999);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_opportunities_start_date_year'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT chk_opportunities_start_date_year
      CHECK (start_date IS NULL OR EXTRACT(YEAR FROM start_date) BETWEEN 1000 AND 9999);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_opportunities_end_date_year'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT chk_opportunities_end_date_year
      CHECK (end_date IS NULL OR EXTRACT(YEAR FROM end_date) BETWEEN 1000 AND 9999);
  END IF;

  -- 2. Submissions Constraints
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_end_date_after_start_date'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT chk_submissions_end_date_after_start_date
      CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_deadline_year'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT chk_submissions_deadline_year
      CHECK (deadline IS NULL OR EXTRACT(YEAR FROM deadline) BETWEEN 1000 AND 9999);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_start_date_year'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT chk_submissions_start_date_year
      CHECK (start_date IS NULL OR EXTRACT(YEAR FROM start_date) BETWEEN 1000 AND 9999);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_submissions_end_date_year'
  ) THEN
    ALTER TABLE public.submissions
      ADD CONSTRAINT chk_submissions_end_date_year
      CHECK (end_date IS NULL OR EXTRACT(YEAR FROM end_date) BETWEEN 1000 AND 9999);
  END IF;
END $$;

