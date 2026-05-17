CREATE TABLE IF NOT EXISTS saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_listings_user_listing_unique UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS saved_listings_user_created_at
  ON saved_listings (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_listings_listing_id
  ON saved_listings (listing_id);

ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saved listings: owner select" ON saved_listings;
CREATE POLICY "Saved listings: owner select" ON saved_listings
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Saved listings: owner insert" ON saved_listings;
CREATE POLICY "Saved listings: owner insert" ON saved_listings
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1
      FROM shoes
      WHERE shoes.id = saved_listings.listing_id
        AND shoes.seller_id = saved_listings.user_id
    )
  );

DROP POLICY IF EXISTS "Saved listings: owner delete" ON saved_listings;
CREATE POLICY "Saved listings: owner delete" ON saved_listings
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
