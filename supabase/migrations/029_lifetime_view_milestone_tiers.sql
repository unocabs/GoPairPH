-- Add one-time lifetime unique-view milestone emails at 20, 40, 60, 80, and 100.
--
-- Migration 025 tracked lifetime milestone email state with a boolean because
-- the only lifetime threshold was 20. Multiple thresholds need an integer so
-- each tier can be sent once without creating fake repeat emails.

ALTER TABLE listing_view_totals
  ADD COLUMN IF NOT EXISTS last_lifetime_milestone_emailed INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_view_totals_lifetime_milestone_nonneg'
  ) THEN
    ALTER TABLE listing_view_totals
      ADD CONSTRAINT listing_view_totals_lifetime_milestone_nonneg
      CHECK (last_lifetime_milestone_emailed >= 0);
  END IF;
END $$;

-- Anti-retroactive guard: existing listings should not suddenly receive old
-- 40/60/80/100 milestone emails after this migration is applied. Set their
-- last emailed tier to the highest lifetime threshold they have already crossed.
UPDATE listing_view_totals
SET last_lifetime_milestone_emailed = CASE
      WHEN total_views >= 100 THEN 100
      WHEN total_views >= 80 THEN 80
      WHEN total_views >= 60 THEN 60
      WHEN total_views >= 40 THEN 40
      WHEN total_views >= 20 THEN 20
      ELSE 0
    END,
    lifetime_milestone_emailed = CASE
      WHEN total_views >= 20 THEN TRUE
      ELSE lifetime_milestone_emailed
    END,
    updated_at = NOW()
WHERE last_lifetime_milestone_emailed = 0;

CREATE OR REPLACE FUNCTION record_listing_view(
  p_listing_id UUID,
  p_view_date DATE,
  p_visitor_hash TEXT
)
RETURNS TABLE(
  counted BOOLEAN,
  total_views INTEGER,
  new_milestone INTEGER,        -- daily tier crossed today (0 if none)
  lifetime_milestone INTEGER    -- one-time lifetime tier crossed (0 if none)
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
  v_last_lifetime_milestone INTEGER := 0;
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
            listing_view_totals.last_lifetime_milestone_emailed
  INTO v_total, v_last_email_date, v_last_milestone, v_last_lifetime_milestone;

  -- Lifetime check: fire each threshold once at 20, 40, 60, 80, and 100.
  v_lifetime_to_email := CASE
    WHEN v_total >= 100 THEN 100
    WHEN v_total >= 80 THEN 80
    WHEN v_total >= 60 THEN 60
    WHEN v_total >= 40 THEN 40
    WHEN v_total >= 20 THEN 20
    ELSE 0
  END;

  IF v_lifetime_to_email > v_last_lifetime_milestone THEN
    UPDATE listing_view_totals
    SET last_lifetime_milestone_emailed = v_lifetime_to_email,
        lifetime_milestone_emailed = TRUE,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
  ELSE
    v_lifetime_to_email := 0;
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

  -- New day -> fire daily milestone, record date + tier.
  IF v_last_email_date IS DISTINCT FROM p_view_date THEN
    UPDATE listing_view_totals
    SET last_daily_email_for = p_view_date,
        last_daily_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    RETURN QUERY SELECT true, v_total, v_candidate_milestone, v_lifetime_to_email;
    RETURN;
  END IF;

  -- Same day, higher daily tier crossed.
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
