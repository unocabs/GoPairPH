-- Listing renewal reminders and buyer-facing checked timestamps.
-- `renewed_at` is seller-controlled freshness. It must not replace `created_at`
-- for "Just Posted" or new-listing alert logic.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS shoes_renewal_reminder_candidates_idx
  ON shoes (status, has_stock, created_at, updated_at, renewal_reminder_sent_at)
  WHERE status = 'active';

-- The generic shoes_updated_at trigger would otherwise make a cron reminder
-- email look like a seller edit. Keep updated_at tied to real listing changes,
-- while still allowing renewed_at to count as a seller freshness action.
CREATE OR REPLACE FUNCTION set_shoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'updated_at' - 'renewal_reminder_sent_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'updated_at' - 'renewal_reminder_sent_at') THEN
    NEW.updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shoes_updated_at ON shoes;
CREATE TRIGGER shoes_updated_at
  BEFORE UPDATE ON shoes
  FOR EACH ROW EXECUTE FUNCTION set_shoes_updated_at();
