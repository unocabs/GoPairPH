-- Paid Sponsored/Top Pick promotion orders for Go Pair PH.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

DO $$
BEGIN
  CREATE TYPE sponsored_promotion_status AS ENUM (
    'reserved',
    'active',
    'completed',
    'rejected',
    'cancelled',
    'refund_required'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE sponsored_promotion_review_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE sponsored_payment_method AS ENUM ('gcash', 'bpi');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sponsored_promotion_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 30)),
  price_php INTEGER NOT NULL CHECK (price_php > 0),
  payment_method sponsored_payment_method,
  transaction_reference TEXT,
  proof_storage_path TEXT,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  status sponsored_promotion_status NOT NULL DEFAULT 'reserved',
  review_status sponsored_promotion_review_status NOT NULL DEFAULT 'pending',
  reserved_until TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS sponsored_promotion_orders_updated_at ON sponsored_promotion_orders;
CREATE TRIGGER sponsored_promotion_orders_updated_at
  BEFORE UPDATE ON sponsored_promotion_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS sponsored_promotions_listing_idx
  ON sponsored_promotion_orders (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sponsored_promotions_seller_idx
  ON sponsored_promotion_orders (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS sponsored_promotions_review_idx
  ON sponsored_promotion_orders (review_status, created_at DESC)
  WHERE review_status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS sponsored_promotions_unique_transaction_ref
  ON sponsored_promotion_orders (payment_method, lower(transaction_reference))
  WHERE transaction_reference IS NOT NULL
    AND status NOT IN ('rejected', 'cancelled');

CREATE OR REPLACE FUNCTION sponsored_promotion_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND is_admin = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION sponsored_promotion_current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION reconcile_sponsored_promotions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  UPDATE sponsored_promotion_orders
     SET status = 'completed',
         ended_at = COALESCE(ended_at, v_now)
   WHERE status = 'active'
     AND scheduled_end_at IS NOT NULL
     AND scheduled_end_at <= v_now;

  UPDATE sponsored_promotion_orders spo
     SET status = 'completed',
         ended_at = COALESCE(ended_at, v_now),
         admin_notes = COALESCE(admin_notes || E'\n', '') || 'Listing closed after Top Pick placement started.'
    FROM shoes s
   WHERE spo.listing_id = s.id
     AND spo.status = 'active'
     AND s.status <> 'active';
END;
$$;

CREATE OR REPLACE FUNCTION sponsored_slot_cap()
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT GREATEST(1, FLOOR(COUNT(*) * 0.15)::INTEGER)
  FROM shoes
  WHERE status = 'active';
$$;

CREATE OR REPLACE FUNCTION create_sponsored_paid_reservation(
  p_listing_id UUID,
  p_duration_days INTEGER,
  p_price_php INTEGER
)
RETURNS sponsored_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_listing RECORD;
  v_existing_count INTEGER;
  v_order sponsored_promotion_orders%ROWTYPE;
BEGIN
  IF p_duration_days NOT IN (7, 30) THEN
    RAISE EXCEPTION 'Invalid Top Pick duration';
  END IF;
  IF p_price_php <= 0 THEN
    RAISE EXCEPTION 'Invalid Top Pick price';
  END IF;

  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sponsored_promotion_slots'));
  PERFORM reconcile_sponsored_promotions();

  SELECT id, seller_id, status, sponsored_until
    INTO v_listing
    FROM shoes
   WHERE id = p_listing_id
   FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.seller_id <> v_profile_id OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible for Top Pick';
  END IF;

  IF v_listing.sponsored_until IS NOT NULL AND v_listing.sponsored_until > NOW() THEN
    RAISE EXCEPTION 'This listing is already a Top Pick';
  END IF;

  SELECT COUNT(*) INTO v_existing_count
    FROM sponsored_promotion_orders
   WHERE listing_id = p_listing_id
     AND status IN ('reserved', 'active')
     AND (status <> 'reserved' OR reserved_until > NOW());

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'This listing already has a Top Pick request';
  END IF;

  INSERT INTO sponsored_promotion_orders (
    listing_id,
    seller_id,
    duration_days,
    price_php,
    status,
    review_status,
    reserved_until,
    created_by
  )
  VALUES (
    p_listing_id,
    v_profile_id,
    p_duration_days,
    p_price_php,
    'reserved',
    'pending',
    NOW() + INTERVAL '20 minutes',
    v_profile_id
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION submit_sponsored_payment_proof(
  p_order_id UUID,
  p_payment_method sponsored_payment_method,
  p_transaction_reference TEXT,
  p_proof_storage_path TEXT
)
RETURNS sponsored_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_order sponsored_promotion_orders%ROWTYPE;
  v_listing RECORD;
  v_cap INTEGER;
  v_active_count INTEGER;
  v_start TIMESTAMPTZ := NOW();
  v_end TIMESTAMPTZ;
BEGIN
  IF length(trim(COALESCE(p_proof_storage_path, ''))) < 3 THEN
    RAISE EXCEPTION 'Payment proof is required';
  END IF;

  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sponsored_promotion_slots'));
  PERFORM reconcile_sponsored_promotions();

  SELECT *
    INTO v_order
    FROM sponsored_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL OR v_order.seller_id <> v_profile_id THEN
    RAISE EXCEPTION 'Top Pick order not found';
  END IF;
  IF v_order.status <> 'reserved' THEN
    RAISE EXCEPTION 'Top Pick order is not awaiting proof';
  END IF;
  IF v_order.reserved_until IS NOT NULL AND v_order.reserved_until < NOW() THEN
    UPDATE sponsored_promotion_orders
       SET status = 'cancelled',
           ended_at = NOW(),
           admin_notes = COALESCE(admin_notes || E'\n', '') || 'Reservation expired before proof upload.'
     WHERE id = v_order.id;
    RAISE EXCEPTION 'Top Pick reservation expired';
  END IF;

  SELECT id, status, sponsored_until
    INTO v_listing
    FROM shoes
   WHERE id = v_order.listing_id
   FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible for Top Pick';
  END IF;
  IF v_listing.sponsored_until IS NOT NULL AND v_listing.sponsored_until > NOW() THEN
    RAISE EXCEPTION 'This listing is already a Top Pick';
  END IF;

  SELECT sponsored_slot_cap() INTO v_cap;
  SELECT COUNT(*)
    INTO v_active_count
    FROM shoes
   WHERE status = 'active'
     AND sponsored_until IS NOT NULL
     AND sponsored_until > NOW();

  IF v_active_count >= v_cap THEN
    RAISE EXCEPTION 'Top Pick slots are full right now';
  END IF;

  v_end := v_start + (v_order.duration_days || ' days')::INTERVAL;

  UPDATE sponsored_promotion_orders
     SET payment_method = p_payment_method,
         transaction_reference = NULLIF(BTRIM(COALESCE(p_transaction_reference, '')), ''),
         proof_storage_path = p_proof_storage_path,
         scheduled_start_at = v_start,
         scheduled_end_at = v_end,
         status = 'active',
         review_status = 'pending',
         reserved_until = NULL,
         activated_at = v_start
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  UPDATE shoes
     SET sponsored_until = v_end,
         sponsored_started_at = v_start
   WHERE id = v_order.listing_id;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION admin_review_sponsored_promotion(
  p_order_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS sponsored_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order sponsored_promotion_orders%ROWTYPE;
BEGIN
  IF NOT sponsored_promotion_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT id INTO v_admin_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF p_action NOT IN ('approve', 'reject', 'refund_required') THEN
    RAISE EXCEPTION 'Unsupported review action';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE sponsored_promotion_orders
       SET review_status = 'approved',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSIF p_action = 'reject' THEN
    UPDATE sponsored_promotion_orders
       SET status = 'rejected',
           review_status = 'rejected',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = NOW(),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;

    UPDATE shoes
       SET sponsored_until = NULL,
           sponsored_started_at = NULL
     WHERE id = v_order.listing_id
       AND sponsored_until = v_order.scheduled_end_at;
  ELSE
    UPDATE sponsored_promotion_orders
       SET status = 'refund_required',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = COALESCE(ended_at, NOW()),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Top Pick promotion order not found';
  END IF;

  RETURN v_order;
END;
$$;

ALTER TABLE sponsored_promotion_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsored_promotions_owner_read" ON sponsored_promotion_orders;
CREATE POLICY "sponsored_promotions_owner_read"
  ON sponsored_promotion_orders FOR SELECT
  USING (seller_id = sponsored_promotion_current_profile_id());

DROP POLICY IF EXISTS "sponsored_promotions_admin_read" ON sponsored_promotion_orders;
CREATE POLICY "sponsored_promotions_admin_read"
  ON sponsored_promotion_orders FOR SELECT
  USING (sponsored_promotion_is_admin());

DROP POLICY IF EXISTS "sponsored_promotions_admin_update" ON sponsored_promotion_orders;
CREATE POLICY "sponsored_promotions_admin_update"
  ON sponsored_promotion_orders FOR UPDATE
  USING (sponsored_promotion_is_admin())
  WITH CHECK (sponsored_promotion_is_admin());

GRANT EXECUTE ON FUNCTION reconcile_sponsored_promotions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sponsored_slot_cap() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_sponsored_paid_reservation(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_sponsored_payment_proof(UUID, sponsored_payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_review_sponsored_promotion(UUID, TEXT, TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sponsored-payment-proofs', 'sponsored-payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Sponsored proofs: owner upload" ON storage.objects;
CREATE POLICY "Sponsored proofs: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sponsored-payment-proofs'
    AND auth.role() = 'authenticated'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Sponsored proofs: owner read" ON storage.objects;
CREATE POLICY "Sponsored proofs: owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sponsored-payment-proofs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Sponsored proofs: admin read" ON storage.objects;
CREATE POLICY "Sponsored proofs: admin read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sponsored-payment-proofs'
    AND sponsored_promotion_is_admin()
  );

DROP POLICY IF EXISTS "Sponsored proofs: owner delete reserved" ON storage.objects;
CREATE POLICY "Sponsored proofs: owner delete reserved"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sponsored-payment-proofs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
