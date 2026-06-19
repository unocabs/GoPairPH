-- Attribute unique listing views to seller-generated Share Post Kit captions.
-- A campaign is visible for seven days or until the seller copies a new caption.

CREATE TABLE listing_share_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id  UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE CHECK (char_length(token) BETWEEN 12 AND 64),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  replaced_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > started_at)
);

CREATE INDEX listing_share_campaigns_listing_started
  ON listing_share_campaigns (listing_id, started_at DESC);

CREATE INDEX listing_share_campaigns_token_active
  ON listing_share_campaigns (token, expires_at)
  WHERE replaced_at IS NULL;

CREATE TABLE listing_share_campaign_views (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES listing_share_campaigns(id) ON DELETE CASCADE,
  view_date    DATE NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, view_date, visitor_hash)
);

CREATE INDEX listing_share_campaign_views_campaign
  ON listing_share_campaign_views (campaign_id, view_date DESC);

ALTER TABLE listing_share_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_share_campaign_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Share campaigns: owner select" ON listing_share_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM shoes
      JOIN profiles ON profiles.id = shoes.seller_id
      WHERE shoes.id = listing_share_campaigns.listing_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Share campaign views: owner select" ON listing_share_campaign_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM listing_share_campaigns campaign
      JOIN shoes ON shoes.id = campaign.listing_id
      JOIN profiles ON profiles.id = shoes.seller_id
      WHERE campaign.id = listing_share_campaign_views.campaign_id
        AND profiles.user_id = auth.uid()
    )
  );

REVOKE ALL ON listing_share_campaigns FROM anon, authenticated;
REVOKE ALL ON listing_share_campaign_views FROM anon, authenticated;
GRANT SELECT ON listing_share_campaigns TO authenticated;
GRANT SELECT ON listing_share_campaign_views TO authenticated;
GRANT ALL ON listing_share_campaigns TO service_role;
GRANT ALL ON listing_share_campaign_views TO service_role;
