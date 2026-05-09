-- Shop variants: per-(size, stock) rows for shop listings.
-- Personal listings keep their flat shoes.size_eu/us/cm + status flow.
-- Shop listings use shoe_variants for sizes and an opaque has_stock boolean
-- (kept in sync by trigger) so /browse can filter with one .eq('has_stock', true).

CREATE TABLE shoe_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shoe_id     UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  size_eu     NUMERIC(4,1) NOT NULL,
  size_us     NUMERIC(4,1),
  size_cm     NUMERIC(5,1),
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shoe_id, size_eu)
);
CREATE INDEX shoe_variants_shoe ON shoe_variants(shoe_id);
CREATE TRIGGER shoe_variants_updated_at BEFORE UPDATE ON shoe_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE purchase_requests
  ADD COLUMN variant_id UUID REFERENCES shoe_variants(id) ON DELETE SET NULL;
CREATE INDEX purchase_requests_variant_id ON purchase_requests(variant_id);

ALTER TABLE shoes ADD COLUMN has_stock BOOLEAN NOT NULL DEFAULT TRUE;

-- Recompute shoes.has_stock from variants. Listings without variants stay TRUE
-- (they are personal listings whose stock is governed by shoes.status instead).
CREATE OR REPLACE FUNCTION refresh_shoe_has_stock(p_shoe_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_has_variants BOOLEAN;
  v_total INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM shoe_variants WHERE shoe_id = p_shoe_id) INTO v_has_variants;
  IF v_has_variants THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_total FROM shoe_variants WHERE shoe_id = p_shoe_id;
    UPDATE shoes SET has_stock = (v_total > 0) WHERE id = p_shoe_id;
  ELSE
    UPDATE shoes SET has_stock = TRUE WHERE id = p_shoe_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION shoe_variants_after_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM refresh_shoe_has_stock(COALESCE(NEW.shoe_id, OLD.shoe_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER shoe_variants_aiud
  AFTER INSERT OR UPDATE OR DELETE ON shoe_variants
  FOR EACH ROW EXECUTE FUNCTION shoe_variants_after_change();

ALTER TABLE shoe_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants: public read"
  ON shoe_variants FOR SELECT USING (true);

CREATE POLICY "Variants: owner write"
  ON shoe_variants FOR ALL USING (
    shoe_id IN (
      SELECT s.id FROM shoes s
      JOIN profiles p ON p.id = s.seller_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Replace the purchase-flow RPCs with variant-aware versions.
-- Personal listings (variant_id IS NULL) keep the original status-flipping flow.
-- Shop variant listings (variant_id IS NOT NULL) decrement/restore variant.quantity
-- and never touch shoes.status.

CREATE OR REPLACE FUNCTION accept_purchase_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_variant_id UUID;
  v_caller_profile_id UUID;
  v_listing_seller_id UUID;
  v_quantity INTEGER;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT listing_id, variant_id INTO v_listing_id, v_variant_id
  FROM purchase_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already processed'; END IF;

  SELECT seller_id INTO v_listing_seller_id FROM shoes WHERE id = v_listing_id;
  IF v_listing_seller_id != v_caller_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: you do not own this listing';
  END IF;

  IF v_variant_id IS NOT NULL THEN
    -- Shop variant flow: atomically decrement variant stock.
    SELECT quantity INTO v_quantity FROM shoe_variants WHERE id = v_variant_id FOR UPDATE;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Out of stock';
    END IF;
    UPDATE shoe_variants SET quantity = quantity - 1 WHERE id = v_variant_id;
    UPDATE purchase_requests SET status = 'accepted' WHERE id = p_request_id;
    -- Do NOT touch shoes.status, do NOT auto-decline siblings.
  ELSE
    -- Personal listing flow (legacy).
    UPDATE shoes SET status = 'reserved' WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'accepted' WHERE id = p_request_id;
    UPDATE purchase_requests SET status = 'declined'
      WHERE listing_id = v_listing_id AND id != p_request_id AND status = 'pending';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION complete_purchase(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_variant_id UUID;
  v_caller_profile_id UUID;
  v_listing_seller_id UUID;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT listing_id, variant_id INTO v_listing_id, v_variant_id
  FROM purchase_requests WHERE id = p_request_id AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not in accepted state'; END IF;

  SELECT seller_id INTO v_listing_seller_id FROM shoes WHERE id = v_listing_id;
  IF v_listing_seller_id != v_caller_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: you do not own this listing';
  END IF;

  IF v_variant_id IS NOT NULL THEN
    -- Shop variant flow: stock already decremented on accept. Just mark complete.
    UPDATE purchase_requests SET status = 'completed' WHERE id = p_request_id;
  ELSE
    -- Personal listing flow.
    UPDATE shoes SET status = 'sold' WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'completed' WHERE id = p_request_id;
    UPDATE purchase_requests SET status = 'declined'
      WHERE listing_id = v_listing_id AND id != p_request_id AND status IN ('pending', 'accepted');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_purchase_acceptance(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_variant_id UUID;
  v_caller_profile_id UUID;
  v_listing_seller_id UUID;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT listing_id, variant_id INTO v_listing_id, v_variant_id
  FROM purchase_requests WHERE id = p_request_id AND status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not in accepted state'; END IF;

  SELECT seller_id INTO v_listing_seller_id FROM shoes WHERE id = v_listing_id;
  IF v_listing_seller_id != v_caller_profile_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_variant_id IS NOT NULL THEN
    -- Restore stock; put request back to pending so seller can decline cleanly.
    UPDATE shoe_variants SET quantity = quantity + 1 WHERE id = v_variant_id;
    UPDATE purchase_requests SET status = 'pending' WHERE id = p_request_id;
  ELSE
    UPDATE shoes SET status = 'active' WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'declined' WHERE id = p_request_id;
  END IF;
END;
$$;
