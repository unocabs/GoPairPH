-- Admin shop management RPCs for /admin.
-- Keeps create/update/delete behind the existing profiles.is_admin flag.

DROP POLICY IF EXISTS "Shops: admin read all" ON shops;
CREATE POLICY "Shops: admin read all" ON shops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE OR REPLACE FUNCTION admin_create_shop(
  p_slug text,
  p_name text,
  p_owner_profile_id uuid,
  p_logo_storage_path text DEFAULT null,
  p_about text DEFAULT null,
  p_location text DEFAULT null,
  p_fb_page_url text DEFAULT null,
  p_status shop_status DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin boolean;
  v_shop_id uuid;
BEGIN
  SELECT is_admin INTO v_caller_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_caller_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO shops (
    slug,
    name,
    owner_profile_id,
    logo_storage_path,
    about,
    location,
    fb_page_url,
    status
  )
  VALUES (
    lower(trim(p_slug)),
    trim(p_name),
    p_owner_profile_id,
    nullif(trim(p_logo_storage_path), ''),
    nullif(trim(p_about), ''),
    nullif(trim(p_location), ''),
    nullif(trim(p_fb_page_url), ''),
    p_status
  )
  RETURNING id INTO v_shop_id;

  RETURN v_shop_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_shop(
  p_shop_id uuid,
  p_slug text,
  p_name text,
  p_owner_profile_id uuid,
  p_logo_storage_path text DEFAULT null,
  p_about text DEFAULT null,
  p_location text DEFAULT null,
  p_fb_page_url text DEFAULT null,
  p_status shop_status DEFAULT 'active'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin boolean;
BEGIN
  SELECT is_admin INTO v_caller_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_caller_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE shops
  SET
    slug = lower(trim(p_slug)),
    name = trim(p_name),
    owner_profile_id = p_owner_profile_id,
    logo_storage_path = nullif(trim(p_logo_storage_path), ''),
    about = nullif(trim(p_about), ''),
    location = nullif(trim(p_location), ''),
    fb_page_url = nullif(trim(p_fb_page_url), ''),
    status = p_status
  WHERE id = p_shop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_shop(p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_admin boolean;
BEGIN
  SELECT is_admin INTO v_caller_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_caller_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  DELETE FROM shops
  WHERE id = p_shop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found';
  END IF;
END;
$$;
