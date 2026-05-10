-- Shop storefront customization.
-- Shop owners can edit public content/design through an RPC only; admins keep
-- create/delete/slug/owner/status control through admin RPCs.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS header_image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS background_color TEXT NOT NULL DEFAULT '#030712',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#14b8a6',
  ADD COLUMN IF NOT EXISTS carousel_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_background_color_format,
  ADD CONSTRAINT shops_background_color_format
    CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_accent_color_format,
  ADD CONSTRAINT shops_accent_color_format
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE shops
  DROP CONSTRAINT IF EXISTS shops_carousel_items_array,
  ADD CONSTRAINT shops_carousel_items_array
    CHECK (jsonb_typeof(carousel_items) = 'array' AND jsonb_array_length(carousel_items) <= 4);

DROP POLICY IF EXISTS "Shops: owner update" ON shops;

CREATE OR REPLACE FUNCTION owner_update_shop_profile(
  p_shop_id uuid,
  p_name text,
  p_logo_storage_path text DEFAULT null,
  p_header_image_storage_path text DEFAULT null,
  p_about text DEFAULT null,
  p_location text DEFAULT null,
  p_fb_page_url text DEFAULT null,
  p_background_color text DEFAULT '#030712',
  p_accent_color text DEFAULT '#14b8a6',
  p_carousel_items jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: profile required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM shops
    WHERE id = p_shop_id
      AND owner_profile_id = v_profile_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: shop owner only';
  END IF;

  IF p_carousel_items IS NULL OR jsonb_typeof(p_carousel_items) <> 'array' OR jsonb_array_length(p_carousel_items) > 4 THEN
    RAISE EXCEPTION 'Carousel must contain 0 to 4 images';
  END IF;

  UPDATE shops
  SET
    name = trim(p_name),
    logo_storage_path = nullif(trim(p_logo_storage_path), ''),
    header_image_storage_path = nullif(trim(p_header_image_storage_path), ''),
    about = nullif(trim(p_about), ''),
    location = nullif(trim(p_location), ''),
    fb_page_url = nullif(trim(p_fb_page_url), ''),
    background_color = p_background_color,
    accent_color = p_accent_color,
    carousel_items = p_carousel_items
  WHERE id = p_shop_id;
END;
$$;
