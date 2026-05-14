-- Private listing view tracking for seller milestone emails and admin reports.
-- Views are counted once per listing, visitor hash, and Pampanga calendar day.

CREATE TABLE listing_daily_views (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id   UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  view_date    DATE NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, view_date, visitor_hash)
);

CREATE INDEX listing_daily_views_listing_date
  ON listing_daily_views (listing_id, view_date DESC);

CREATE INDEX listing_daily_views_date
  ON listing_daily_views (view_date DESC);

CREATE TABLE listing_view_totals (
  listing_id                    UUID PRIMARY KEY REFERENCES shoes(id) ON DELETE CASCADE,
  total_views                   INTEGER NOT NULL DEFAULT 0 CHECK (total_views >= 0),
  last_seller_milestone_emailed INTEGER NOT NULL DEFAULT 0 CHECK (last_seller_milestone_emailed >= 0),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listing_view_admin_reports (
  report_key      TEXT PRIMARY KEY,
  window_start    DATE NOT NULL,
  window_end      DATE NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  total_views     INTEGER NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE listing_daily_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_view_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_view_admin_reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW listing_daily_view_counts AS
SELECT
  listing_id,
  view_date,
  COUNT(*)::INTEGER AS views
FROM listing_daily_views
GROUP BY listing_id, view_date;

REVOKE ALL ON listing_daily_views FROM anon, authenticated;
REVOKE ALL ON listing_view_totals FROM anon, authenticated;
REVOKE ALL ON listing_view_admin_reports FROM anon, authenticated;
REVOKE ALL ON listing_daily_view_counts FROM anon, authenticated;
GRANT ALL ON listing_daily_views TO service_role;
GRANT ALL ON listing_view_totals TO service_role;
GRANT ALL ON listing_view_admin_reports TO service_role;
GRANT SELECT ON listing_daily_view_counts TO service_role;

CREATE OR REPLACE FUNCTION record_listing_view(
  p_listing_id UUID,
  p_view_date DATE,
  p_visitor_hash TEXT
)
RETURNS TABLE(counted BOOLEAN, total_views INTEGER, new_milestone INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
  v_total INTEGER := 0;
  v_last_milestone INTEGER := 0;
  v_candidate_milestone INTEGER := 0;
BEGIN
  INSERT INTO listing_daily_views (listing_id, view_date, visitor_hash)
  VALUES (p_listing_id, p_view_date, p_visitor_hash)
  ON CONFLICT (listing_id, view_date, visitor_hash) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT lvt.total_views, lvt.last_seller_milestone_emailed
      INTO v_total, v_last_milestone
    FROM listing_view_totals lvt
    WHERE lvt.listing_id = p_listing_id;

    RETURN QUERY SELECT false, COALESCE(v_total, 0), 0;
    RETURN;
  END IF;

  INSERT INTO listing_view_totals (listing_id, total_views, updated_at)
  VALUES (p_listing_id, 1, NOW())
  ON CONFLICT (listing_id) DO UPDATE
    SET total_views = listing_view_totals.total_views + 1,
        updated_at = NOW()
  RETURNING listing_view_totals.total_views, listing_view_totals.last_seller_milestone_emailed
    INTO v_total, v_last_milestone;

  v_candidate_milestone := CASE
    WHEN v_total >= 100 THEN (v_total / 100) * 100
    WHEN v_total >= 50 THEN 50
    WHEN v_total >= 25 THEN 25
    ELSE 0
  END;

  IF v_candidate_milestone > v_last_milestone THEN
    UPDATE listing_view_totals
    SET last_seller_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
  ELSE
    v_candidate_milestone := 0;
  END IF;

  RETURN QUERY SELECT true, v_total, v_candidate_milestone;
END;
$$;

REVOKE ALL ON FUNCTION record_listing_view(UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_listing_view(UUID, DATE, TEXT) TO service_role;
