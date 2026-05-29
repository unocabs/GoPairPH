-- Buyer saved search alerts.
-- Users can save keyword/filter searches and receive one calm daily digest
-- when newly posted active listings match.

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL CHECK (char_length(btrim(keyword)) BETWEEN 2 AND 80),
  brand TEXT NULL,
  size_eu NUMERIC(4,1) NULL,
  size_us NUMERIC(4,1) NULL,
  size_cm NUMERIC(5,1) NULL,
  condition condition_enum NULL,
  max_price_php NUMERIC(10,2) NULL CHECK (max_price_php IS NULL OR max_price_php >= 0),
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx
  ON saved_searches (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_searches_enabled_idx
  ON saved_searches (email_enabled, created_at DESC)
  WHERE email_enabled = TRUE;

CREATE TABLE IF NOT EXISTS saved_search_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  sent_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (saved_search_id, listing_id)
);

CREATE INDEX IF NOT EXISTS saved_search_notifications_user_date_idx
  ON saved_search_notifications (user_id, sent_date DESC);

CREATE INDEX IF NOT EXISTS saved_search_notifications_search_idx
  ON saved_search_notifications (saved_search_id);

DROP TRIGGER IF EXISTS saved_searches_updated_at ON saved_searches;
CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_search_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Saved searches: owner select" ON saved_searches;
CREATE POLICY "Saved searches: owner select"
  ON saved_searches FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Saved searches: owner insert" ON saved_searches;
CREATE POLICY "Saved searches: owner insert"
  ON saved_searches FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Saved searches: owner update" ON saved_searches;
CREATE POLICY "Saved searches: owner update"
  ON saved_searches FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Saved searches: owner delete" ON saved_searches;
CREATE POLICY "Saved searches: owner delete"
  ON saved_searches FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Saved search notifications: owner select" ON saved_search_notifications;
CREATE POLICY "Saved search notifications: owner select"
  ON saved_search_notifications FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
