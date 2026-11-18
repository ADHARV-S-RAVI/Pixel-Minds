-- Publish immutable Pixel ledger inserts so a user's open transaction history
-- can refresh immediately after a committed transaction.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pixel_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pixel_transactions;
  END IF;
END;
$$;
