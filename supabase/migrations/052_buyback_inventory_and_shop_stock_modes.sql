-- Go Pair PH buyback inventory ownership, internal-shop relisting, and shop stock modes.
-- IMPORTANT: this project does not auto-apply migrations. Run 051 first, then this file in the Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shoes' AND column_name = 'inventory_mode'
  ) THEN
    ALTER TABLE shoes ADD COLUMN inventory_mode TEXT NOT NULL DEFAULT 'single';
    -- Preserve all current shop behavior. Personal listings start as single-stock.
    UPDATE shoes SET inventory_mode = CASE WHEN shop_id IS NULL THEN 'single' ELSE 'multi' END;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shoes' AND column_name = 'inspected_by_go_pair_at'
  ) THEN
    ALTER TABLE shoes ADD COLUMN inspected_by_go_pair_at TIMESTAMPTZ;
  END IF;
END $$;

ALTER TABLE shoes DROP CONSTRAINT IF EXISTS shoes_inventory_mode_check;
ALTER TABLE shoes ADD CONSTRAINT shoes_inventory_mode_check
  CHECK (inventory_mode IN ('single', 'multi'));

CREATE TABLE IF NOT EXISTS buyback_receiving_shops (
  shop_id UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyback_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL UNIQUE REFERENCES buyback_offers(id) ON DELETE RESTRICT,
  source_listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ready_to_assign' CHECK (status IN (
    'ready_to_assign', 'preparing', 'listed', 'sold', 'held'
  )),
  acquisition_cost_php NUMERIC(10,2) NOT NULL CHECK (acquisition_cost_php > 0),
  minimum_resale_price_php NUMERIC(10,2) NOT NULL CHECK (minimum_resale_price_php > 0),
  assigned_shop_id UUID REFERENCES shops(id) ON DELETE RESTRICT,
  resale_listing_id UUID UNIQUE REFERENCES shoes(id) ON DELETE SET NULL,
  relist_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  photo_copy_status TEXT NOT NULL DEFAULT 'pending' CHECK (photo_copy_status IN ('pending', 'copying', 'ready', 'failed')),
  photo_copy_error TEXT,
  acquired_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyback_inventory_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES buyback_inventory_items(id) ON DELETE CASCADE,
  source_storage_path TEXT NOT NULL,
  copied_storage_path TEXT,
  view_type TEXT NOT NULL CHECK (view_type IN ('top', 'sole', 'front', 'left', 'right', 'back')),
  display_order SMALLINT NOT NULL DEFAULT 0,
  copy_status TEXT NOT NULL DEFAULT 'pending' CHECK (copy_status IN ('pending', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (inventory_id, source_storage_path)
);

CREATE TABLE IF NOT EXISTS buyback_inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES buyback_inventory_items(id) ON DELETE CASCADE,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyback_inventory_status_idx ON buyback_inventory_items(status, created_at DESC);
CREATE INDEX IF NOT EXISTS buyback_inventory_shop_idx ON buyback_inventory_items(assigned_shop_id, status);
CREATE INDEX IF NOT EXISTS buyback_inventory_events_item_idx ON buyback_inventory_events(inventory_id, created_at DESC);

DROP TRIGGER IF EXISTS buyback_receiving_shops_updated_at ON buyback_receiving_shops;
CREATE TRIGGER buyback_receiving_shops_updated_at BEFORE UPDATE ON buyback_receiving_shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS buyback_inventory_items_updated_at ON buyback_inventory_items;
CREATE TRIGGER buyback_inventory_items_updated_at BEFORE UPDATE ON buyback_inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS buyback_inventory_photos_updated_at ON buyback_inventory_photos;
CREATE TRIGGER buyback_inventory_photos_updated_at BEFORE UPDATE ON buyback_inventory_photos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE buyback_receiving_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_inventory_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_inventory_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyback receiving shops: admin read" ON buyback_receiving_shops;
CREATE POLICY "Buyback receiving shops: admin read" ON buyback_receiving_shops FOR SELECT USING (buyback_is_admin());
DROP POLICY IF EXISTS "Buyback inventory: admin read" ON buyback_inventory_items;
CREATE POLICY "Buyback inventory: admin read" ON buyback_inventory_items FOR SELECT USING (buyback_is_admin());
DROP POLICY IF EXISTS "Buyback inventory photos: admin read" ON buyback_inventory_photos;
CREATE POLICY "Buyback inventory photos: admin read" ON buyback_inventory_photos FOR SELECT USING (buyback_is_admin());
DROP POLICY IF EXISTS "Buyback inventory events: admin read" ON buyback_inventory_events;
CREATE POLICY "Buyback inventory events: admin read" ON buyback_inventory_events FOR SELECT USING (buyback_is_admin());

REVOKE ALL ON buyback_receiving_shops FROM anon, authenticated;
REVOKE ALL ON buyback_inventory_items FROM anon, authenticated;
REVOKE ALL ON buyback_inventory_photos FROM anon, authenticated;
REVOKE ALL ON buyback_inventory_events FROM anon, authenticated;

-- Completed financial records must survive normal account/listing cleanup.
ALTER TABLE buyback_offers DROP CONSTRAINT IF EXISTS buyback_offers_listing_id_fkey;
ALTER TABLE buyback_offers ADD CONSTRAINT buyback_offers_listing_id_fkey
  FOREIGN KEY (listing_id) REFERENCES shoes(id) ON DELETE RESTRICT;
ALTER TABLE buyback_offers DROP CONSTRAINT IF EXISTS buyback_offers_seller_id_fkey;
ALTER TABLE buyback_offers ADD CONSTRAINT buyback_offers_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION protect_acquired_source_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM buyback_inventory_items WHERE source_listing_id = OLD.id)
     AND NOT buyback_is_admin()
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'This listing was sold to Go Pair PH and is locked.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS protect_acquired_source_listing_trigger ON shoes;
CREATE TRIGGER protect_acquired_source_listing_trigger
  BEFORE UPDATE OR DELETE ON shoes
  FOR EACH ROW EXECUTE FUNCTION protect_acquired_source_listing();

CREATE OR REPLACE FUNCTION refresh_shoe_has_stock(p_shoe_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_mode TEXT;
  v_status TEXT;
  v_total INTEGER;
BEGIN
  SELECT inventory_mode, status::TEXT INTO v_mode, v_status FROM shoes WHERE id = p_shoe_id;
  IF v_mode = 'multi' THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_total FROM shoe_variants WHERE shoe_id = p_shoe_id;
    UPDATE shoes SET has_stock = (v_total > 0) WHERE id = p_shoe_id;
  ELSE
    UPDATE shoes SET has_stock = (v_status = 'active') WHERE id = p_shoe_id;
  END IF;
END;
$$;

UPDATE shoes s SET has_stock = CASE
  WHEN s.inventory_mode = 'multi' THEN COALESCE((SELECT SUM(v.quantity) FROM shoe_variants v WHERE v.shoe_id = s.id), 0) > 0
  ELSE s.status::TEXT = 'active'
END;

CREATE OR REPLACE FUNCTION sync_single_listing_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inventory_mode = 'single' THEN
    NEW.has_stock := NEW.status::TEXT = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_single_listing_stock_trigger ON shoes;
CREATE TRIGGER sync_single_listing_stock_trigger
  BEFORE INSERT OR UPDATE OF status, inventory_mode ON shoes
  FOR EACH ROW EXECUTE FUNCTION sync_single_listing_stock();

CREATE OR REPLACE FUNCTION sync_buyback_inventory_from_resale_listing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inventory_id UUID;
BEGIN
  IF NEW.status::TEXT = 'sold' AND OLD.status::TEXT IS DISTINCT FROM 'sold' THEN
    UPDATE buyback_inventory_items
    SET status = 'sold', sold_at = COALESCE(sold_at, NOW())
    WHERE resale_listing_id = NEW.id AND status = 'listed'
    RETURNING id INTO v_inventory_id;
    IF v_inventory_id IS NOT NULL THEN
      INSERT INTO buyback_inventory_events(inventory_id, event_type, metadata)
      VALUES (v_inventory_id, 'resale_sold', jsonb_build_object('listing_id', NEW.id, 'closed_sale_channel', NEW.closed_sale_channel));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_buyback_inventory_from_resale_listing_trigger ON shoes;
CREATE TRIGGER sync_buyback_inventory_from_resale_listing_trigger
  AFTER UPDATE OF status ON shoes
  FOR EACH ROW EXECUTE FUNCTION sync_buyback_inventory_from_resale_listing();

CREATE OR REPLACE FUNCTION admin_set_buyback_receiving_shop(p_shop_id UUID, p_enabled BOOLEAN)
RETURNS buyback_receiving_shops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin profiles%ROWTYPE;
  v_shop shops%ROWTYPE;
  v_row buyback_receiving_shops%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM profiles WHERE user_id = auth.uid();
  IF v_admin.id IS NULL OR NOT COALESCE(v_admin.is_admin, FALSE) THEN RAISE EXCEPTION 'Unauthorized: admin only'; END IF;
  SELECT * INTO v_shop FROM shops WHERE id = p_shop_id;
  IF v_shop.id IS NULL THEN RAISE EXCEPTION 'Shop not found'; END IF;
  IF p_enabled AND v_shop.status::TEXT <> 'active' THEN RAISE EXCEPTION 'Only active shops can receive inventory'; END IF;

  INSERT INTO buyback_receiving_shops(shop_id, enabled, approved_by, approved_at)
  VALUES (p_shop_id, p_enabled, v_admin.id, NOW())
  ON CONFLICT (shop_id) DO UPDATE SET enabled = EXCLUDED.enabled, approved_by = v_admin.id, approved_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION admin_assign_buyback_inventory(
  p_inventory_id UUID,
  p_shop_id UUID,
  p_relist_snapshot JSONB
)
RETURNS buyback_inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin profiles%ROWTYPE;
  v_item buyback_inventory_items%ROWTYPE;
  v_price NUMERIC;
BEGIN
  SELECT * INTO v_admin FROM profiles WHERE user_id = auth.uid();
  IF v_admin.id IS NULL OR NOT COALESCE(v_admin.is_admin, FALSE) THEN RAISE EXCEPTION 'Unauthorized: admin only'; END IF;
  SELECT * INTO v_item FROM buyback_inventory_items WHERE id = p_inventory_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF v_item.status NOT IN ('ready_to_assign', 'preparing') THEN RAISE EXCEPTION 'Published inventory cannot be reassigned'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM buyback_receiving_shops brs JOIN shops s ON s.id = brs.shop_id
    WHERE brs.shop_id = p_shop_id AND brs.enabled AND s.status::TEXT = 'active'
  ) THEN RAISE EXCEPTION 'Choose an approved active receiving shop'; END IF;

  v_price := NULLIF(p_relist_snapshot ->> 'price_php', '')::NUMERIC;
  IF v_price IS NULL OR v_price < v_item.minimum_resale_price_php THEN
    RAISE EXCEPTION 'Resale price cannot be below the saved fast-sale estimate';
  END IF;

  UPDATE buyback_inventory_items
  SET assigned_shop_id = p_shop_id,
      assigned_by = v_admin.id,
      assigned_at = NOW(),
      relist_snapshot = p_relist_snapshot,
      status = 'preparing'
  WHERE id = p_inventory_id RETURNING * INTO v_item;

  INSERT INTO buyback_inventory_events(inventory_id, actor_profile_id, event_type, metadata)
  VALUES (v_item.id, v_admin.id, 'assigned', jsonb_build_object('shop_id', p_shop_id, 'price_php', v_price));
  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION admin_publish_buyback_inventory(p_inventory_id UUID)
RETURNS buyback_inventory_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin profiles%ROWTYPE;
  v_item buyback_inventory_items%ROWTYPE;
  v_shop shops%ROWTYPE;
  v_listing_id UUID;
  v_snapshot JSONB;
  v_price NUMERIC;
  v_photo_count INTEGER;
  v_has_top BOOLEAN;
  v_has_sole BOOLEAN;
BEGIN
  SELECT * INTO v_admin FROM profiles WHERE user_id = auth.uid();
  IF v_admin.id IS NULL OR NOT COALESCE(v_admin.is_admin, FALSE) THEN RAISE EXCEPTION 'Unauthorized: admin only'; END IF;
  SELECT * INTO v_item FROM buyback_inventory_items WHERE id = p_inventory_id FOR UPDATE;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF v_item.status = 'listed' THEN RETURN v_item; END IF;
  IF v_item.status <> 'preparing' OR v_item.assigned_shop_id IS NULL THEN RAISE EXCEPTION 'Assign and prepare this item first'; END IF;
  IF v_item.photo_copy_status <> 'ready' THEN RAISE EXCEPTION 'Finish copying and reviewing listing photos first'; END IF;

  SELECT * INTO v_shop FROM shops WHERE id = v_item.assigned_shop_id;
  IF v_shop.id IS NULL OR v_shop.status::TEXT <> 'active' OR NOT EXISTS (
    SELECT 1 FROM buyback_receiving_shops WHERE shop_id = v_shop.id AND enabled
  ) THEN RAISE EXCEPTION 'The assigned receiving shop is unavailable'; END IF;

  v_snapshot := v_item.relist_snapshot;
  v_price := NULLIF(v_snapshot ->> 'price_php', '')::NUMERIC;
  IF v_price IS NULL OR v_price < v_item.minimum_resale_price_php THEN RAISE EXCEPTION 'Resale price is below the minimum'; END IF;
  IF COALESCE((v_snapshot ->> 'photos_confirmed')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'Confirm that the listing photos show the received shoes, top, sole, and visible flaws';
  END IF;
  IF NULLIF(BTRIM(v_snapshot ->> 'brand'), '') IS NULL
     OR NULLIF(BTRIM(v_snapshot ->> 'model'), '') IS NULL
     OR NULLIF(BTRIM(v_snapshot ->> 'color'), '') IS NULL
     OR NULLIF(BTRIM(v_snapshot ->> 'condition'), '') IS NULL
     OR NULLIF(v_snapshot ->> 'size_eu', '') IS NULL THEN
    RAISE EXCEPTION 'Complete the required resale listing details';
  END IF;

  SELECT COUNT(*),
         COALESCE(BOOL_OR(view_type = 'top'), FALSE),
         COALESCE(BOOL_OR(view_type = 'sole'), FALSE)
    INTO v_photo_count, v_has_top, v_has_sole
  FROM buyback_inventory_photos
  WHERE inventory_id = v_item.id AND copy_status = 'ready' AND copied_storage_path IS NOT NULL;
  IF v_photo_count = 0 OR NOT v_has_top OR NOT v_has_sole THEN RAISE EXCEPTION 'Clear top and sole photos are required'; END IF;

  INSERT INTO shoes(
    seller_id, brand, model, color, condition, mileage_km, listing_type,
    price_php, srp_php, is_negotiable, description, status,
    size_eu, size_us, size_cm, us_size_type, shop_id, quantity,
    listed_in_main_feed, has_stock, inventory_mode, inspected_by_go_pair_at
  ) VALUES (
    v_shop.owner_profile_id,
    BTRIM(v_snapshot ->> 'brand'), BTRIM(v_snapshot ->> 'model'), BTRIM(v_snapshot ->> 'color'),
    (v_snapshot ->> 'condition')::condition_enum,
    COALESCE(NULLIF(v_snapshot ->> 'mileage_km', '')::INTEGER, 0),
    'for_sale', v_price, NULLIF(v_snapshot ->> 'srp_php', '')::NUMERIC,
    FALSE, NULLIF(BTRIM(v_snapshot ->> 'description'), ''), 'active',
    NULLIF(v_snapshot ->> 'size_eu', '')::NUMERIC,
    NULLIF(v_snapshot ->> 'size_us', '')::NUMERIC,
    NULLIF(v_snapshot ->> 'size_cm', '')::NUMERIC,
    COALESCE(NULLIF(v_snapshot ->> 'us_size_type', ''), 'unknown'),
    v_shop.id, 1, COALESCE((v_snapshot ->> 'listed_in_main_feed')::BOOLEAN, TRUE),
    TRUE, 'single', NOW()
  ) RETURNING id INTO v_listing_id;

  INSERT INTO shoe_images(shoe_id, storage_path, view_type, "order")
  SELECT v_listing_id, copied_storage_path, view_type::view_type_enum, display_order
  FROM buyback_inventory_photos
  WHERE inventory_id = v_item.id AND copy_status = 'ready' AND copied_storage_path IS NOT NULL;

  UPDATE buyback_inventory_items
  SET resale_listing_id = v_listing_id, status = 'listed', published_by = v_admin.id, published_at = NOW()
  WHERE id = v_item.id RETURNING * INTO v_item;

  INSERT INTO buyback_inventory_events(inventory_id, actor_profile_id, event_type, metadata)
  VALUES (v_item.id, v_admin.id, 'published', jsonb_build_object('listing_id', v_listing_id, 'shop_id', v_shop.id, 'price_php', v_price));
  RETURN v_item;
END;
$$;

-- Replace fulfillment so successful inspection creates exactly one private inventory item.
CREATE OR REPLACE FUNCTION admin_fulfill_buyback_offer(
  p_offer_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL,
  p_cod_paid_php NUMERIC DEFAULT NULL,
  p_delivery_checklist JSONB DEFAULT '{}'::JSONB
)
RETURNS buyback_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin profiles%ROWTYPE;
  v_offer buyback_offers%ROWTYPE;
  v_listing shoes%ROWTYPE;
  v_inventory buyback_inventory_items%ROWTYPE;
  v_required_key TEXT;
  v_required_keys TEXT[] := ARRAY[
    'waybill_matches', 'package_recorded', 'unboxing_saved', 'contents_match',
    'inspection_passed', 'payment_recorded', 'inventory_recorded'
  ];
BEGIN
  SELECT * INTO v_admin FROM profiles WHERE user_id = auth.uid();
  IF v_admin.id IS NULL OR NOT COALESCE(v_admin.is_admin, FALSE) THEN RAISE EXCEPTION 'Unauthorized: admin only'; END IF;
  SELECT * INTO v_offer FROM buyback_offers WHERE id = p_offer_id FOR UPDATE;
  IF v_offer.id IS NULL THEN RAISE EXCEPTION 'Offer not found'; END IF;

  IF p_action = 'delivered' THEN
    IF v_offer.status = 'delivered' THEN RETURN v_offer; END IF;
    IF v_offer.status <> 'shipped' THEN RAISE EXCEPTION 'Offer is not shipped'; END IF;
    IF p_cod_paid_php IS NULL OR p_cod_paid_php <> v_offer.quoted_price_php THEN RAISE EXCEPTION 'COD payment must match the accepted quote'; END IF;
    UPDATE buyback_offers SET status = 'delivered', delivered_at = NOW(), cod_paid_php = p_cod_paid_php
      WHERE id = p_offer_id RETURNING * INTO v_offer;
  ELSIF p_action = 'complete' THEN
    IF v_offer.status = 'completed' THEN RETURN v_offer; END IF;
    IF v_offer.status <> 'delivered' THEN RAISE EXCEPTION 'Mark the shipment delivered first'; END IF;
    FOREACH v_required_key IN ARRAY v_required_keys LOOP
      IF COALESCE((p_delivery_checklist ->> v_required_key)::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Complete every delivery check before finishing';
      END IF;
    END LOOP;
    SELECT * INTO v_listing FROM shoes WHERE id = v_offer.listing_id FOR UPDATE;
    IF v_listing.id IS NULL THEN RAISE EXCEPTION 'Source listing not found'; END IF;

    UPDATE shoes SET status = 'sold', closed_sale_channel = 'go_pair', has_stock = FALSE WHERE id = v_offer.listing_id;
    UPDATE buyback_offers SET status = 'completed', delivery_checklist = p_delivery_checklist, completed_at = NOW()
      WHERE id = p_offer_id RETURNING * INTO v_offer;

    INSERT INTO buyback_inventory_items(
      offer_id, source_listing_id, acquisition_cost_php, minimum_resale_price_php,
      relist_snapshot, acquired_by
    ) VALUES (
      v_offer.id, v_offer.listing_id, v_offer.quoted_price_php, v_offer.fast_sale_estimate_php,
      jsonb_build_object(
        'brand', v_listing.brand, 'model', v_listing.model, 'color', v_listing.color,
        'srp_php', v_offer.original_price_php, 'price_php', v_offer.fast_sale_estimate_php,
        'size_eu', v_listing.size_eu, 'size_us', v_listing.size_us, 'size_cm', v_listing.size_cm,
        'us_size_type', v_listing.us_size_type, 'condition', v_listing.condition,
        'mileage_km', v_listing.mileage_km, 'purchase_date', v_offer.purchase_date,
        'has_box', v_offer.has_box, 'has_receipt', TRUE,
        'description', NULL, 'listed_in_main_feed', TRUE
      ),
      v_admin.id
    )
    ON CONFLICT (offer_id) DO UPDATE SET offer_id = EXCLUDED.offer_id
    RETURNING * INTO v_inventory;

    INSERT INTO buyback_inventory_photos(inventory_id, source_storage_path, view_type, display_order)
    SELECT v_inventory.id, storage_path, view_type::TEXT, "order" FROM shoe_images WHERE shoe_id = v_offer.listing_id
    ON CONFLICT (inventory_id, source_storage_path) DO NOTHING;

    INSERT INTO buyback_inventory_events(inventory_id, actor_profile_id, event_type, metadata)
    VALUES (v_inventory.id, v_admin.id, 'ownership_transferred', jsonb_build_object('source_listing_id', v_offer.listing_id));
  ELSIF p_action = 'dispute' THEN
    IF v_offer.status NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'This offer cannot be disputed'; END IF;
    IF NULLIF(BTRIM(COALESCE(p_note, '')), '') IS NULL THEN RAISE EXCEPTION 'A dispute note is required'; END IF;
    UPDATE buyback_offers SET status = 'disputed', admin_note = BTRIM(p_note), disputed_at = NOW()
      WHERE id = p_offer_id RETURNING * INTO v_offer;
    UPDATE shoes SET quality_flagged_at = NOW(), quality_flag_reasons = ARRAY['Buyback delivery dispute'], quality_flag_note = BTRIM(p_note)
      WHERE id = v_offer.listing_id;
  ELSE
    RAISE EXCEPTION 'Unsupported fulfillment action';
  END IF;

  INSERT INTO buyback_offer_events(offer_id, actor_profile_id, event_type, note, metadata)
  VALUES (p_offer_id, v_admin.id, p_action, NULLIF(BTRIM(COALESCE(p_note, '')), ''), jsonb_build_object('cod_paid_php', p_cod_paid_php));
  RETURN v_offer;
END;
$$;

-- A shop can convert stock models only while the listing has no buyer history.
-- Keeping the delete/insert work in this RPC prevents flat sizes and variants
-- from representing two different stock models if one statement fails.
CREATE OR REPLACE FUNCTION change_shop_inventory_mode(
  p_listing_id UUID,
  p_inventory_mode TEXT,
  p_size_eu NUMERIC DEFAULT NULL,
  p_size_us NUMERIC DEFAULT NULL,
  p_size_cm NUMERIC DEFAULT NULL,
  p_us_size_type TEXT DEFAULT 'mens',
  p_variants JSONB DEFAULT '[]'::JSONB
)
RETURNS shoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_listing shoes%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE user_id = auth.uid();
  IF v_profile.id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_inventory_mode NOT IN ('single', 'multi') THEN RAISE EXCEPTION 'Invalid stock mode'; END IF;

  SELECT * INTO v_listing FROM shoes WHERE id = p_listing_id FOR UPDATE;
  IF v_listing.id IS NULL OR v_listing.shop_id IS NULL THEN RAISE EXCEPTION 'Shop listing not found'; END IF;
  IF v_listing.seller_id <> v_profile.id AND NOT COALESCE(v_profile.is_admin, FALSE) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF v_listing.status::TEXT <> 'active' THEN RAISE EXCEPTION 'Only active listings can change stock mode'; END IF;
  IF v_listing.inspected_by_go_pair_at IS NOT NULL AND p_inventory_mode <> 'single' THEN
    RAISE EXCEPTION 'Go Pair PH inspected inventory must remain single-stock';
  END IF;

  IF v_listing.inventory_mode IS DISTINCT FROM p_inventory_mode AND EXISTS (
    SELECT 1 FROM purchase_requests WHERE listing_id = p_listing_id
  ) THEN
    RAISE EXCEPTION 'Stock mode cannot change after the first buyer request';
  END IF;

  IF p_inventory_mode = 'single' THEN
    IF p_size_eu IS NULL AND p_size_us IS NULL AND p_size_cm IS NULL THEN RAISE EXCEPTION 'Add at least one shoe size'; END IF;
    DELETE FROM shoe_variants WHERE shoe_id = p_listing_id;
    UPDATE shoes
    SET inventory_mode = 'single', size_eu = p_size_eu, size_us = p_size_us,
        size_cm = p_size_cm, us_size_type = COALESCE(NULLIF(p_us_size_type, ''), 'mens'),
        quantity = 1, has_stock = TRUE
    WHERE id = p_listing_id RETURNING * INTO v_listing;
  ELSE
    IF jsonb_typeof(p_variants) <> 'array' OR jsonb_array_length(p_variants) = 0 THEN
      RAISE EXCEPTION 'Add at least one size and stock row';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_variants) row
      WHERE NULLIF(row ->> 'size_eu', '') IS NULL
         OR NULLIF(row ->> 'quantity', '') IS NULL
         OR (row ->> 'quantity')::INTEGER < 0
    ) THEN RAISE EXCEPTION 'Every stock row needs an EU size and a quantity of 0 or more'; END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_variants) row
      GROUP BY (row ->> 'size_eu')::NUMERIC HAVING COUNT(*) > 1
    ) THEN RAISE EXCEPTION 'Each EU size can appear only once'; END IF;

    DELETE FROM shoe_variants WHERE shoe_id = p_listing_id;
    INSERT INTO shoe_variants(shoe_id, size_eu, size_us, size_cm, us_size_type, quantity)
    SELECT p_listing_id,
           (row ->> 'size_eu')::NUMERIC,
           NULLIF(row ->> 'size_us', '')::NUMERIC,
           NULLIF(row ->> 'size_cm', '')::NUMERIC,
           COALESCE(NULLIF(row ->> 'us_size_type', ''), 'mens'),
           (row ->> 'quantity')::INTEGER
    FROM jsonb_array_elements(p_variants) row;
    UPDATE shoes
    SET inventory_mode = 'multi', size_eu = NULL, size_us = NULL, size_cm = NULL,
        us_size_type = 'mens', quantity = 0
    WHERE id = p_listing_id RETURNING * INTO v_listing;
    PERFORM refresh_shoe_has_stock(p_listing_id);
    SELECT * INTO v_listing FROM shoes WHERE id = p_listing_id;
  END IF;
  RETURN v_listing;
END;
$$;

-- Inventory-mode-aware order state transitions.
CREATE OR REPLACE FUNCTION accept_purchase_request(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_id UUID; v_variant_id UUID; v_caller_profile_id UUID;
  v_listing_seller_id UUID; v_mode TEXT; v_status TEXT; v_quantity INTEGER;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT listing_id, variant_id INTO v_listing_id, v_variant_id FROM purchase_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;
  SELECT seller_id, inventory_mode, status::TEXT INTO v_listing_seller_id, v_mode, v_status FROM shoes WHERE id = v_listing_id FOR UPDATE;
  IF v_listing_seller_id <> v_caller_profile_id THEN RAISE EXCEPTION 'Unauthorized: you do not own this listing'; END IF;
  IF v_status <> 'active' THEN RAISE EXCEPTION 'Listing is no longer active'; END IF;

  IF v_mode = 'multi' THEN
    IF v_variant_id IS NULL THEN RAISE EXCEPTION 'A size variant is required'; END IF;
    SELECT quantity INTO v_quantity FROM shoe_variants WHERE id = v_variant_id AND shoe_id = v_listing_id FOR UPDATE;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN RAISE EXCEPTION 'Out of stock'; END IF;
    UPDATE shoe_variants SET quantity = quantity - 1 WHERE id = v_variant_id;
    UPDATE purchase_requests SET status = 'accepted' WHERE id = p_request_id;
  ELSE
    IF v_variant_id IS NOT NULL THEN RAISE EXCEPTION 'Single-stock listings do not use variants'; END IF;
    UPDATE shoes SET status = 'reserved', has_stock = FALSE WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'accepted' WHERE id = p_request_id;
    UPDATE purchase_requests SET status = 'declined' WHERE listing_id = v_listing_id AND id <> p_request_id AND status = 'pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION complete_purchase(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_id UUID; v_mode TEXT; v_caller_profile_id UUID; v_listing_seller_id UUID;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT listing_id INTO v_listing_id FROM purchase_requests WHERE id = p_request_id AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not in accepted state'; END IF;
  SELECT seller_id, inventory_mode INTO v_listing_seller_id, v_mode FROM shoes WHERE id = v_listing_id FOR UPDATE;
  IF v_listing_seller_id <> v_caller_profile_id THEN RAISE EXCEPTION 'Unauthorized: you do not own this listing'; END IF;
  IF v_mode = 'multi' THEN
    UPDATE purchase_requests SET status = 'completed' WHERE id = p_request_id;
  ELSE
    UPDATE shoes SET status = 'sold', closed_sale_channel = 'go_pair', has_stock = FALSE WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'completed' WHERE id = p_request_id;
    UPDATE purchase_requests SET status = 'declined' WHERE listing_id = v_listing_id AND id <> p_request_id AND status IN ('pending', 'accepted');
    UPDATE buyback_inventory_items SET status = 'sold', sold_at = NOW() WHERE resale_listing_id = v_listing_id AND status = 'listed';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_purchase_acceptance(p_request_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_listing_id UUID; v_variant_id UUID; v_status TEXT; v_mode TEXT;
  v_caller_profile_id UUID; v_listing_seller_id UUID;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT listing_id, variant_id, status INTO v_listing_id, v_variant_id, v_status FROM purchase_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase request % not found', p_request_id; END IF;
  SELECT seller_id, inventory_mode INTO v_listing_seller_id, v_mode FROM shoes WHERE id = v_listing_id FOR UPDATE;
  IF v_listing_seller_id <> v_caller_profile_id THEN RAISE EXCEPTION 'Unauthorized: you do not own this listing'; END IF;
  IF v_status = 'completed' THEN RAISE EXCEPTION 'Cannot cancel a completed sale'; END IF;
  IF v_status IN ('pending', 'declined') THEN RETURN; END IF;
  IF v_mode = 'multi' THEN
    IF v_variant_id IS NULL THEN RAISE EXCEPTION 'Variant missing'; END IF;
    UPDATE shoe_variants SET quantity = quantity + 1 WHERE id = v_variant_id;
    UPDATE purchase_requests SET status = 'pending' WHERE id = p_request_id;
  ELSE
    UPDATE shoes SET status = 'active', closed_sale_channel = NULL, has_stock = TRUE WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'declined' WHERE id = p_request_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_buyback_receiving_shop(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_assign_buyback_inventory(UUID, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_publish_buyback_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION change_shop_inventory_mode(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) TO authenticated;
