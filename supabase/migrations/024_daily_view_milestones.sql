-- Daily-reset seller milestone emails.
--
-- Previous behavior (021, 023): cumulative all-time view total triggered
-- emails at 25/50/100/+100 (later 10/25/50/100/+100).
--
-- New behavior: emails trigger on *today's* unique-viewer count (Manila
-- calendar day). Threshold tiers are 10, 25, 50, 100, then every 100. Once
-- a tier fires today, only a higher tier fires until midnight Manila; then
-- the counter resets and the next day starts fresh.
--
-- Per-visitor dedupe is unchanged: the existing UNIQUE(listing_id, view_date,
-- visitor_hash) constraint guarantees one count per visitor per listing per day.
--
-- The (listing_id, total_views, counted) RPC contract is preserved so the
-- /api/listing-views route handler keeps working without changes.

ALTER TABLE listing_view_totals
  ADD COLUMN IF NOT EXISTS last_daily_email_for DATE,
  ADD COLUMN IF NOT EXISTS last_daily_milestone_emailed INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_view_totals_daily_milestone_nonneg'
  ) THEN
    ALTER TABLE listing_view_totals
      ADD CONSTRAINT listing_view_totals_daily_milestone_nonneg
      CHECK (last_daily_milestone_emailed >= 0);
  END IF;
END $$;

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
  v_today_views INTEGER := 0;
  v_last_email_date DATE;
  v_last_milestone INTEGER := 0;
  v_candidate_milestone INTEGER := 0;
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
    RETURN QUERY SELECT false, COALESCE(v_total, 0), 0;
    RETURN;
  END IF;

  -- Still track lifetime total for analytics, but it no longer drives emails.
  INSERT INTO listing_view_totals (listing_id, total_views, updated_at)
  VALUES (p_listing_id, 1, NOW())
  ON CONFLICT (listing_id) DO UPDATE
    SET total_views = listing_view_totals.total_views + 1,
        updated_at = NOW()
  RETURNING listing_view_totals.total_views,
            listing_view_totals.last_daily_email_for,
            listing_view_totals.last_daily_milestone_emailed
  INTO v_total, v_last_email_date, v_last_milestone;

  -- Count today's unique views for this listing.
  SELECT COUNT(*)::INTEGER INTO v_today_views
  FROM listing_daily_views
  WHERE listing_id = p_listing_id AND view_date = p_view_date;

  -- Determine the highest daily tier crossed.
  v_candidate_milestone := CASE
    WHEN v_today_views >= 100 THEN (v_today_views / 100) * 100
    WHEN v_today_views >= 50  THEN 50
    WHEN v_today_views >= 25  THEN 25
    WHEN v_today_views >= 10  THEN 10
    ELSE 0
  END;

  IF v_candidate_milestone = 0 THEN
    RETURN QUERY SELECT true, v_total, 0;
    RETURN;
  END IF;

  -- New day or first daily email ever → fire and remember it.
  IF v_last_email_date IS DISTINCT FROM p_view_date THEN
    UPDATE listing_view_totals
    SET last_daily_email_for = p_view_date,
        last_daily_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    RETURN QUERY SELECT true, v_total, v_candidate_milestone;
    RETURN;
  END IF;

  -- Same day, but we crossed a higher tier (e.g. 10 → 25).
  IF v_candidate_milestone > v_last_milestone THEN
    UPDATE listing_view_totals
    SET last_daily_milestone_emailed = v_candidate_milestone,
        updated_at = NOW()
    WHERE listing_id = p_listing_id;
    RETURN QUERY SELECT true, v_total, v_candidate_milestone;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_total, 0;
END;
$$;

REVOKE ALL ON FUNCTION record_listing_view(UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_listing_view(UUID, DATE, TEXT) TO service_role;

-- Anti-retroactive guard: for any listing that already has ≥10 views *today*
-- (Manila), pre-record the current tier as already emailed so we don't dump
-- a flood of "you hit N views today" emails the moment this migration ships.
WITH today_counts AS (
  SELECT listing_id, COUNT(*)::INTEGER AS c, view_date
  FROM listing_daily_views
  WHERE view_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
  GROUP BY listing_id, view_date
)
UPDATE listing_view_totals lvt
SET last_daily_email_for = tc.view_date,
    last_daily_milestone_emailed = CASE
      WHEN tc.c >= 100 THEN (tc.c / 100) * 100
      WHEN tc.c >= 50  THEN 50
      WHEN tc.c >= 25  THEN 25
      WHEN tc.c >= 10  THEN 10
      ELSE 0
    END,
    updated_at = NOW()
FROM today_counts tc
WHERE lvt.listing_id = tc.listing_id
  AND tc.c >= 10;
