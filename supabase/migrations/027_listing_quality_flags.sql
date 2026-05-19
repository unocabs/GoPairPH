-- Admin-only quality flags for listings that need clearer photos or details.
-- Flagged listings remain public, but the app ranks them lower in marketplace views.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS quality_flagged_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS quality_flagged_by UUID NULL,
  ADD COLUMN IF NOT EXISTS quality_flag_reasons TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS quality_flag_note TEXT NULL;

CREATE INDEX IF NOT EXISTS shoes_quality_flagged_at_idx
  ON shoes (quality_flagged_at)
  WHERE quality_flagged_at IS NOT NULL;

CREATE OR REPLACE FUNCTION admin_flag_listing_quality(
  p_listing_id UUID,
  p_reasons TEXT[],
  p_note TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_profile_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  SELECT id, is_admin
  INTO v_admin_profile_id, v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE shoes
  SET
    quality_flagged_at = NOW(),
    quality_flagged_by = v_admin_profile_id,
    quality_flag_reasons = COALESCE(p_reasons, ARRAY[]::TEXT[]),
    quality_flag_note = NULLIF(BTRIM(COALESCE(p_note, '')), ''),
    updated_at = NOW()
  WHERE id = p_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_clear_listing_quality_flag(
  p_listing_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  SELECT is_admin
  INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE shoes
  SET
    quality_flagged_at = NULL,
    quality_flagged_by = NULL,
    quality_flag_reasons = ARRAY[]::TEXT[],
    quality_flag_note = NULL,
    updated_at = NOW()
  WHERE id = p_listing_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_flag_listing_quality(UUID, TEXT[], TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_clear_listing_quality_flag(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION admin_flag_listing_quality(UUID, TEXT[], TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_clear_listing_quality_flag(UUID) TO authenticated;
