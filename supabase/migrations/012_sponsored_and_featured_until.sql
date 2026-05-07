-- Adds time-bounded sponsorship + featured-until support.
--
-- `sponsored_until`        — seller-paid Sponsored slot. Multiple may be active
--                            at once; the app caps the count at 15% of active
--                            listings (enforced in app code, not the DB).
-- `sponsored_started_at`   — tiebreaker when ranking sponsored listings.
-- `featured_until`         — admin-curated Featured slot. Replaces the boolean
--                            `is_featured` with a time window.
--
-- For backward compatibility, `is_featured` stays as a real column and is kept
-- in sync with `featured_until` via a trigger. Existing app code that reads
-- `is_featured` keeps working; new code should compare `featured_until > NOW()`.
-- Writes to `featured_until` are the source of truth — `is_featured` is
-- recomputed automatically on insert/update.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS sponsored_until      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS sponsored_started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS featured_until       TIMESTAMPTZ NULL;

-- Backfill: any row currently is_featured = true gets a 90-day featured window
-- so legacy pins don't silently expire on the day this migration runs.
UPDATE shoes
   SET featured_until = NOW() + INTERVAL '90 days'
 WHERE is_featured = true
   AND featured_until IS NULL;

-- The old "only one featured at a time" partial unique index doesn't apply
-- under the new model — admin policy enforces single-row.
DROP INDEX IF EXISTS shoes_only_one_featured_idx;
DROP INDEX IF EXISTS shoes_featured_active_idx;

-- Trigger keeps is_featured in sync with featured_until on every write.
-- (A STORED generated column can't reference NOW() because the expression
-- must be IMMUTABLE, so we use a trigger instead.)
CREATE OR REPLACE FUNCTION sync_is_featured() RETURNS TRIGGER AS $$
BEGIN
  NEW.is_featured := (NEW.featured_until IS NOT NULL AND NEW.featured_until > NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_is_featured_trigger ON shoes;
CREATE TRIGGER sync_is_featured_trigger
  BEFORE INSERT OR UPDATE OF featured_until ON shoes
  FOR EACH ROW EXECUTE FUNCTION sync_is_featured();

-- Re-sync existing rows now that the trigger is installed.
UPDATE shoes
   SET is_featured = (featured_until IS NOT NULL AND featured_until > NOW());

-- Indexes for hot queries.
CREATE INDEX IF NOT EXISTS shoes_sponsored_until_idx
  ON shoes (sponsored_until)
  WHERE sponsored_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS shoes_featured_until_idx
  ON shoes (featured_until)
  WHERE featured_until IS NOT NULL;
