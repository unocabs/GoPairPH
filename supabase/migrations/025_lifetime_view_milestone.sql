-- One-time lifetime view milestone email at 20 total views.
--
-- Sits alongside the daily milestone (added in 024). Daily fires repeatedly
-- (one per tier per day, resets at Manila midnight). Lifetime fires exactly
-- once per listing, ever.
--
-- The RPC now returns a second milestone field (lifetime_milestone) so the
-- /api/listing-views route can send the right email — or both if a single
-- view crosses both triggers at the same time.

ALTER TABLE listing_view_totals
  ADD COLUMN IF NOT EXISTS lifetime_milestone_emailed BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop the old function signature so we can extend the return type.
DROP FUNCTION IF EXISTS record_listing_view(UUID, DATE, TEXT);

CREATE OR REPLACE FUNCTION record_listing_view(
  p_listing_id UUID,
  p_view_date DATE,
  p_visitor_hash TEXT
)
RETURNS TABLE(
  counted BOOLEAN,
  total_views INTEGER,
  new_milestone INTEGER,        -- daily tier crossed today (0 if none)
  lifetime_milestone INTEGER    -- one-time lifetime tier crossed (0 if none; currently only 20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
  v_total INTEGER := 0;
  v_today_views INTEGER := 0;
  v_last_email_date DATE;
  v_last_milestone INTEGER := 0;
  v_candidate_milestone INTEGER := 0;
  v_lifetime_already_emailed BOOLEAN := FALSE;
  v_lifetime_to_email INTEGER := 0;
BEGIN
  -- Dedupe: one row per (listing, day, visitor).
  INSERT INTO listing_daily_views (listing_id, view_date, visitor_hash)
  VALUES (p_listing_id, p_view_date, p_visitor_hash)
  ON CONFLICT (listing_id, view_date, visitor_hash) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT lvt.total_views INTO v_total
    FROM listing_view_totals lvt
    WHERE lvt.listing_id = p_listing_id;
    RETURN QUERY SELECT false, COALESCE(v_total, 0), 0, 0;
    RETURN;
  END IF;

  -- Increment lifetime total + load milestone state.
  INSERT INTO listing_view_totals (listing_id, total_views, updated_at)
  VALUES (p_listing_id, 1, NOW())
  ON CONFLICT (listing_id) DO UPDATE
    SET total_views = listing_view_totals.total_views + 1,
        updated_at = NOW()
  RETURNING listing_view_totals.total_views,
            listing_view_totals.last_daily_email_for,
            listing_view_totals.last_daily_milestone_emailed,
            listing_view_totals.lifetime_milestone_emailed
  INTO v_total, v_last_email_date, v_last_milestone, v_lifetime_already_emailed;

  -- Lifetime check: fire once at 20 lifetime views, never again.
  IF NOT v_lifetime_already_emailed AND v_total >= 20 THEN
    UPDATE listing_view_totals
    SET lifetime_milestone_emailed = TRUE,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    v_lifetime_to_email := 20;
  END IF;

  -- Count today's unique views for the daily-tier check.
  SELECT COUNT(*)::INTEGER INTO v_today_views
  FROM listing_daily_views
  WHERE listing_id = p_listing_id AND view_date = p_view_date;

  v_candidate_milestone := CASE
    WHEN v_today_views >= 100 THEN (v_today_views / 100) * 100
    WHEN v_today_views >= 50  THEN 50
    WHEN v_today_views >= 25  THEN 25
    WHEN v_today_views >= 10  THEN 10
    ELSE 0
  END;

  IF v_candidate_milestone = 0 THEN
    RETURN QUERY SELECT true, v_total, 0, v_lifetime_to_email;
    RETURN;
  END IF;

  -- New day → fire daily milestone, record date + tier.
  IF v_last_email_date IS DISTINCT FROM p_view_date THEN
    UPDATE listing_view_totals
    SET last_daily_email_for = p_view_date,
        last_daily_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    RETURN QUERY SELECT true, v_total, v_candidate_milestone, v_lifetime_to_email;
    RETURN;
  END IF;

  -- Same day, higher tier crossed.
  IF v_candidate_milestone > v_last_milestone THEN
    UPDATE listing_view_totals
    SET last_daily_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    RETURN QUERY SELECT true, v_total, v_candidate_milestone, v_lifetime_to_email;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_total, 0, v_lifetime_to_email;
END;
$$;

REVOKE ALL ON FUNCTION record_listing_view(UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_listing_view(UUID, DATE, TEXT) TO service_role;

-- Anti-retroactive guard: any listing already past 20 lifetime views gets
-- marked as already-emailed so the seller doesn't get a delayed celebration
-- email the moment this migration ships.
UPDATE listing_view_totals
SET lifetime_milestone_emailed = TRUE,
    updated_at = NOW()
WHERE total_views >= 20 AND lifetime_milestone_emailed = FALSE;
