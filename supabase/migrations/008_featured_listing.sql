-- Adds an `is_featured` flag to shoes so a single listing can be highlighted
-- in the home-page hero. The HeroFallback (Marketplace Pulse) renders when
-- no listing is featured; the FeaturedListing card renders when one is.
--
-- A partial unique index enforces "at most one featured listing at a time"
-- without blocking inserts of unfeatured rows (where is_featured = false).

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Only one row may have is_featured = true at any time.
CREATE UNIQUE INDEX IF NOT EXISTS shoes_only_one_featured_idx
  ON shoes ((is_featured))
  WHERE is_featured = true;

-- Helpful filter index for the hero query (active + featured).
CREATE INDEX IF NOT EXISTS shoes_featured_active_idx
  ON shoes (is_featured, status)
  WHERE is_featured = true;

-- Optional: only admins may flip is_featured. Adjust the role check to match
-- however your app identifies admins (profiles.is_admin, JWT claim, etc.).
-- Comment this block out if you'd rather manage features manually via the
-- Supabase dashboard / SQL editor.
--
-- DROP POLICY IF EXISTS "Shoes: admin can feature" ON shoes;
-- CREATE POLICY "Shoes: admin can feature" ON shoes
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.user_id = auth.uid() AND p.is_admin = true
--     )
--   );
