CREATE TABLE IF NOT EXISTS listing_share_metrics (
  listing_id UUID PRIMARY KEY REFERENCES shoes(id) ON DELETE CASCADE,
  caption_copy_count BIGINT NOT NULL DEFAULT 0 CHECK (caption_copy_count >= 0),
  image_download_count BIGINT NOT NULL DEFAULT 0 CHECK (image_download_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE listing_share_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Listing share metrics: owner select" ON listing_share_metrics;
CREATE POLICY "Listing share metrics: owner select" ON listing_share_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM shoes
      JOIN profiles ON profiles.id = shoes.seller_id
      WHERE shoes.id = listing_share_metrics.listing_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION increment_listing_share_metric(
  p_listing_id UUID,
  p_action TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM shoes
    WHERE id = p_listing_id
      AND seller_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: listing owner only';
  END IF;

  IF p_action NOT IN ('caption_copy', 'image_download') THEN
    RAISE EXCEPTION 'Unsupported share metric';
  END IF;

  INSERT INTO listing_share_metrics (
    listing_id,
    caption_copy_count,
    image_download_count,
    updated_at
  )
  VALUES (
    p_listing_id,
    CASE WHEN p_action = 'caption_copy' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'image_download' THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (listing_id) DO UPDATE
  SET
    caption_copy_count = listing_share_metrics.caption_copy_count
      + CASE WHEN p_action = 'caption_copy' THEN 1 ELSE 0 END,
    image_download_count = listing_share_metrics.image_download_count
      + CASE WHEN p_action = 'image_download' THEN 1 ELSE 0 END,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION increment_listing_share_metric(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_listing_share_metric(UUID, TEXT) TO authenticated;

