-- Listing trust signals and private listing reports.
-- "Checked" means Go Pair PH reviewed basic listing quality, not authenticity.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS admin_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS admin_checked_by UUID NULL;

CREATE INDEX IF NOT EXISTS shoes_admin_checked_at_idx
  ON shoes (admin_checked_at)
  WHERE admin_checked_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS listing_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'misleading_photos',
      'suspicious_or_scam',
      'already_sold',
      'wrong_price_or_details',
      'seller_unreachable',
      'duplicate_or_spam',
      'other'
    )
  ),
  note TEXT,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_reports_status_created_idx
  ON listing_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS listing_reports_listing_idx
  ON listing_reports(listing_id, created_at DESC);

ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_view_listing_reports" ON listing_reports;
CREATE POLICY "admins_view_listing_reports"
  ON listing_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "admins_update_listing_reports" ON listing_reports;
CREATE POLICY "admins_update_listing_reports"
  ON listing_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = TRUE
    )
  );
