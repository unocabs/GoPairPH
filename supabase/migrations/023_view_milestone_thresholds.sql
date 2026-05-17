-- Tighten the seller-email milestone schedule so sellers get earlier feedback
-- on new listings.
--
-- New schedule: 10, 25, 50, 100, then every 100 (200, 300, …).
-- Previous (from 021): 25, 50, 100, then every 100.
--
-- We also bump existing `last_seller_milestone_emailed` values so listings
-- already past 10 views don't fire a retroactive "you hit 10 views!" email
-- on the next view recorded after this migration. (Per product call: no
-- retroactive emails on threshold changes.)

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
    WHEN v_total >= 50  THEN 50
    WHEN v_total >= 25  THEN 25
    WHEN v_total >= 10  THEN 10
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

-- Anti-retroactive guard. Mark each existing listing as already having
-- received notifications up to the highest milestone it's currently passed
-- under the new schedule. Future emails resume at the *next* milestone.
UPDATE listing_view_totals
SET last_seller_milestone_emailed = GREATEST(
  last_seller_milestone_emailed,
  CASE
    WHEN total_views >= 100 THEN (total_views / 100) * 100
    WHEN total_views >= 50  THEN 50
    WHEN total_views >= 25  THEN 25
    WHEN total_views >= 10  THEN 10
    ELSE 0
  END
);
