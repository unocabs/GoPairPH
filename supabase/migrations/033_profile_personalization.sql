-- Buyer personalization preferences for GP Marketplace ranking and size-match emails.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_size_eu NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS preferred_size_us NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS preferred_size_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS preferred_us_size_type TEXT NOT NULL DEFAULT 'mens'
    CHECK (preferred_us_size_type IN ('mens', 'womens', 'unisex', 'unknown')),
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_province TEXT,
  ADD COLUMN IF NOT EXISTS location_region TEXT,
  ADD COLUMN IF NOT EXISTS personalized_browse_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS profile_match_email_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS profiles_location_city_idx
  ON profiles (lower(location_city))
  WHERE location_city IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_location_province_idx
  ON profiles (lower(location_province))
  WHERE location_province IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_location_region_idx
  ON profiles (lower(location_region))
  WHERE location_region IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_preferred_size_eu_idx
  ON profiles (preferred_size_eu)
  WHERE preferred_size_eu IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_profile_match_email_enabled_idx
  ON profiles (profile_match_email_enabled)
  WHERE profile_match_email_enabled = TRUE;

CREATE TABLE IF NOT EXISTS profile_match_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  sent_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS profile_match_notifications_user_date_idx
  ON profile_match_notifications (user_id, sent_date DESC);

ALTER TABLE profile_match_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profile match notifications: owner select" ON profile_match_notifications;
CREATE POLICY "Profile match notifications: owner select"
  ON profile_match_notifications FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
