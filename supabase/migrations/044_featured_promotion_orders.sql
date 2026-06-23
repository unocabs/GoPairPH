-- Paid/admin Featured promotion queue for Go Pair PH.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

DO $$
BEGIN
  CREATE TYPE featured_promotion_source AS ENUM ('paid', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE featured_promotion_status AS ENUM (
    'reserved',
    'queued',
    'active',
    'completed',
    'rejected',
    'cancelled',
    'refund_required',
    'superseded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE featured_promotion_review_status AS ENUM ('not_required', 'pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE featured_payment_method AS ENUM ('gcash', 'bpi');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS featured_promotion_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source featured_promotion_source NOT NULL,
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 30, 90)),
  price_php INTEGER NOT NULL DEFAULT 0 CHECK (price_php >= 0),
  payment_method featured_payment_method,
  transaction_reference TEXT,
  proof_storage_path TEXT,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  queue_position INTEGER,
  status featured_promotion_status NOT NULL DEFAULT 'reserved',
  review_status featured_promotion_review_status NOT NULL DEFAULT 'not_required',
  reserved_until TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  replacement_reason TEXT,
  superseded_by_order_id UUID REFERENCES featured_promotion_orders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS featured_promotion_orders_updated_at ON featured_promotion_orders;
CREATE TRIGGER featured_promotion_orders_updated_at
  BEFORE UPDATE ON featured_promotion_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS featured_promotions_active_idx
  ON featured_promotion_orders (status, scheduled_start_at, scheduled_end_at)
  WHERE status IN ('reserved', 'queued', 'active');

CREATE INDEX IF NOT EXISTS featured_promotions_listing_idx
  ON featured_promotion_orders (listing_id, created_at DESC);

CREATE INDEX IF NOT EXISTS featured_promotions_seller_idx
  ON featured_promotion_orders (seller_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS featured_promotions_unique_transaction_ref
  ON featured_promotion_orders (payment_method, lower(transaction_reference))
  WHERE source = 'paid'
    AND transaction_reference IS NOT NULL
    AND status NOT IN ('rejected', 'cancelled');

-- Preserve any existing manually Featured listing as an Admin Pick.
INSERT INTO featured_promotion_orders (
  source,
  listing_id,
  seller_id,
  duration_days,
  price_php,
  scheduled_start_at,
  scheduled_end_at,
  status,
  review_status,
  activated_at
)
SELECT
  'admin',
  shoes.id,
  shoes.seller_id,
  90,
  0,
  NOW(),
  shoes.featured_until,
  'active',
  'not_required',
  NOW()
FROM shoes
WHERE shoes.featured_until IS NOT NULL
  AND shoes.featured_until > NOW()
  AND NOT EXISTS (
    SELECT 1 FROM featured_promotion_orders existing
    WHERE existing.listing_id = shoes.id
      AND existing.status = 'active'
  );

CREATE OR REPLACE FUNCTION featured_promotion_is_admin()
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

CREATE OR REPLACE FUNCTION featured_promotion_current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION reconcile_featured_promotions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_next featured_promotion_orders%ROWTYPE;
  v_active featured_promotion_orders%ROWTYPE;
BEGIN
  -- Expire active paid/admin windows that have naturally ended.
  UPDATE featured_promotion_orders
     SET status = 'completed',
         ended_at = COALESCE(ended_at, v_now)
   WHERE status = 'active'
     AND scheduled_end_at IS NOT NULL
     AND scheduled_end_at <= v_now;

  -- Scheduled paid listings that are sold before their placement starts need review/refund.
  UPDATE featured_promotion_orders fpo
     SET status = 'refund_required',
         ended_at = COALESCE(ended_at, v_now),
         admin_notes = COALESCE(admin_notes || E'\n', '') || 'Listing closed before scheduled Featured placement started.'
    FROM shoes s
   WHERE fpo.listing_id = s.id
     AND fpo.source = 'paid'
     AND fpo.status = 'queued'
     AND s.status <> 'active';

  -- Active paid listings that sell after activation simply end; no refund by policy.
  UPDATE featured_promotion_orders fpo
     SET status = 'completed',
         ended_at = COALESCE(ended_at, v_now),
         admin_notes = COALESCE(admin_notes || E'\n', '') || 'Listing closed after Featured placement started.'
    FROM shoes s
   WHERE fpo.listing_id = s.id
     AND fpo.source = 'paid'
     AND fpo.status = 'active'
     AND s.status <> 'active';

  SELECT fpo.*
    INTO v_active
    FROM featured_promotion_orders fpo
    JOIN shoes s ON s.id = fpo.listing_id
   WHERE fpo.source = 'paid'
     AND fpo.status = 'active'
     AND fpo.scheduled_end_at > v_now
     AND s.status = 'active'
   ORDER BY fpo.scheduled_end_at ASC
   LIMIT 1;

  IF v_active.id IS NULL THEN
    SELECT fpo.*
      INTO v_next
      FROM featured_promotion_orders fpo
      JOIN shoes s ON s.id = fpo.listing_id
     WHERE fpo.source = 'paid'
       AND fpo.status = 'queued'
       AND s.status = 'active'
     ORDER BY fpo.scheduled_start_at ASC NULLS LAST, fpo.created_at ASC
     LIMIT 1;

    IF v_next.id IS NOT NULL THEN
      UPDATE featured_promotion_orders
         SET status = 'active',
             scheduled_start_at = v_now,
             scheduled_end_at = v_now + (v_next.duration_days || ' days')::INTERVAL,
             activated_at = COALESCE(activated_at, v_now)
       WHERE id = v_next.id;
    END IF;
  END IF;

  -- Mirror the chosen active order into shoes.featured_until for existing UI compatibility.
  UPDATE shoes
     SET featured_until = NULL
   WHERE featured_until IS NOT NULL
     AND featured_until > v_now;

  SELECT fpo.*
    INTO v_active
    FROM featured_promotion_orders fpo
    JOIN shoes s ON s.id = fpo.listing_id
   WHERE fpo.source = 'paid'
     AND fpo.status = 'active'
     AND fpo.scheduled_end_at > v_now
     AND s.status = 'active'
   ORDER BY fpo.scheduled_end_at ASC
   LIMIT 1;

  IF v_active.id IS NULL THEN
    SELECT fpo.*
      INTO v_active
      FROM featured_promotion_orders fpo
      JOIN shoes s ON s.id = fpo.listing_id
     WHERE fpo.source = 'admin'
       AND fpo.status = 'active'
       AND fpo.scheduled_end_at > v_now
       AND s.status = 'active'
     ORDER BY fpo.scheduled_end_at DESC
     LIMIT 1;
  END IF;

  IF v_active.id IS NOT NULL THEN
    UPDATE shoes
       SET featured_until = v_active.scheduled_end_at
     WHERE id = v_active.listing_id;
  END IF;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY scheduled_start_at ASC NULLS LAST, created_at ASC) AS position
      FROM featured_promotion_orders
     WHERE source = 'paid'
       AND status IN ('active', 'queued')
  )
  UPDATE featured_promotion_orders fpo
     SET queue_position = ranked.position
    FROM ranked
   WHERE fpo.id = ranked.id;
END;
$$;

CREATE OR REPLACE FUNCTION create_featured_paid_reservation(
  p_listing_id UUID,
  p_duration_days INTEGER,
  p_price_php INTEGER
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_listing shoes%ROWTYPE;
  v_chain_count INTEGER;
  v_head_days INTEGER;
  v_capacity INTEGER;
  v_order featured_promotion_orders%ROWTYPE;
BEGIN
  IF p_duration_days NOT IN (7, 30) THEN
    RAISE EXCEPTION 'Invalid Featured duration';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_listing FROM shoes WHERE id = p_listing_id FOR UPDATE;
  IF v_listing.id IS NULL OR v_listing.seller_id <> v_profile_id OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible for Featured promotion';
  END IF;

  SELECT duration_days
    INTO v_head_days
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND (
      status IN ('active', 'queued')
      OR (status = 'reserved' AND reserved_until > NOW())
     )
   ORDER BY scheduled_start_at ASC NULLS LAST, created_at ASC
   LIMIT 1;

  v_head_days := COALESCE(v_head_days, p_duration_days);
  v_capacity := CASE WHEN v_head_days = 30 THEN 2 ELSE 3 END;

  SELECT COUNT(*)
    INTO v_chain_count
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND (
      status IN ('active', 'queued')
      OR (status = 'reserved' AND reserved_until > NOW())
     );

  IF v_chain_count >= v_capacity THEN
    RAISE EXCEPTION 'Featured queue is full right now';
  END IF;

  INSERT INTO featured_promotion_orders (
    source, listing_id, seller_id, duration_days, price_php, status, review_status,
    reserved_until, created_by
  )
  VALUES (
    'paid', p_listing_id, v_profile_id, p_duration_days, p_price_php, 'reserved', 'pending',
    NOW() + INTERVAL '20 minutes', v_profile_id
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION submit_featured_payment_proof(
  p_order_id UUID,
  p_payment_method featured_payment_method,
  p_transaction_reference TEXT,
  p_proof_storage_path TEXT
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_order featured_promotion_orders%ROWTYPE;
  v_start TIMESTAMPTZ;
  v_latest_end TIMESTAMPTZ;
  v_status featured_promotion_status;
BEGIN
  IF length(trim(COALESCE(p_proof_storage_path, ''))) < 3 THEN
    RAISE EXCEPTION 'Payment proof is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
     AND source = 'paid'
     AND seller_id = v_profile_id
     AND status = 'reserved'
     AND reserved_until > NOW()
   FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Reservation expired or not found';
  END IF;

  SELECT MAX(scheduled_end_at)
    INTO v_latest_end
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND status IN ('active', 'queued');

  v_start := GREATEST(NOW(), COALESCE(v_latest_end, NOW()));
  v_status := CASE WHEN v_start <= NOW() + INTERVAL '1 second' THEN 'active'::featured_promotion_status ELSE 'queued'::featured_promotion_status END;

  IF v_status = 'active' THEN
    UPDATE featured_promotion_orders
       SET status = 'superseded',
           ended_at = NOW(),
           superseded_by_order_id = p_order_id
     WHERE source = 'admin'
       AND status = 'active';
  END IF;

  UPDATE featured_promotion_orders
     SET payment_method = p_payment_method,
         transaction_reference = NULLIF(trim(COALESCE(p_transaction_reference, '')), ''),
         proof_storage_path = p_proof_storage_path,
         scheduled_start_at = v_start,
         scheduled_end_at = v_start + (duration_days || ' days')::INTERVAL,
         status = v_status,
         review_status = 'pending',
         activated_at = CASE WHEN v_status = 'active' THEN NOW() ELSE activated_at END
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  PERFORM reconcile_featured_promotions();
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_featured_pick(
  p_listing_id UUID,
  p_duration_days INTEGER,
  p_force_replace_paid BOOLEAN DEFAULT FALSE,
  p_reason TEXT DEFAULT NULL
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_listing shoes%ROWTYPE;
  v_paid_count INTEGER;
  v_order featured_promotion_orders%ROWTYPE;
BEGIN
  IF NOT featured_promotion_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_duration_days NOT IN (7, 30, 90) THEN
    RAISE EXCEPTION 'Invalid Featured duration';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT id INTO v_admin_id FROM profiles WHERE user_id = auth.uid();
  SELECT * INTO v_listing FROM shoes WHERE id = p_listing_id FOR UPDATE;
  IF v_listing.id IS NULL OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible';
  END IF;

  SELECT COUNT(*) INTO v_paid_count
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND status IN ('active', 'queued');

  IF v_paid_count > 0 AND NOT p_force_replace_paid THEN
    RAISE EXCEPTION 'Paid Featured promotion exists';
  END IF;

  IF p_force_replace_paid THEN
    UPDATE featured_promotion_orders
       SET status = 'refund_required',
           ended_at = NOW(),
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           replacement_reason = COALESCE(p_reason, 'Admin replaced paid Featured promotion')
     WHERE source = 'paid'
       AND status = 'active';
  END IF;

  UPDATE featured_promotion_orders
     SET status = 'superseded',
         ended_at = NOW(),
         replacement_reason = COALESCE(p_reason, 'Admin replaced Featured pick')
   WHERE source = 'admin'
     AND status = 'active';

  INSERT INTO featured_promotion_orders (
    source, listing_id, seller_id, duration_days, price_php, status, review_status,
    scheduled_start_at, scheduled_end_at, activated_at, created_by
  )
  VALUES (
    'admin', p_listing_id, v_listing.seller_id, p_duration_days, 0, 'active', 'not_required',
    NOW(), NOW() + (p_duration_days || ' days')::INTERVAL, NOW(), v_admin_id
  )
  RETURNING * INTO v_order;

  PERFORM reconcile_featured_promotions();
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION admin_unfeature_listing(p_listing_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF NOT featured_promotion_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  SELECT id INTO v_admin_id FROM profiles WHERE user_id = auth.uid();

  UPDATE featured_promotion_orders
     SET status = CASE WHEN source = 'paid' THEN 'refund_required'::featured_promotion_status ELSE 'cancelled'::featured_promotion_status END,
         ended_at = NOW(),
         reviewed_by = v_admin_id,
         reviewed_at = NOW(),
         replacement_reason = COALESCE(p_reason, 'Admin removed Featured placement')
   WHERE listing_id = p_listing_id
     AND status = 'active';

  UPDATE shoes SET featured_until = NULL WHERE id = p_listing_id;
  PERFORM reconcile_featured_promotions();
END;
$$;

CREATE OR REPLACE FUNCTION admin_review_featured_promotion(
  p_order_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_order featured_promotion_orders%ROWTYPE;
BEGIN
  IF NOT featured_promotion_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  SELECT id INTO v_admin_id FROM profiles WHERE user_id = auth.uid();

  IF p_action = 'approve' THEN
    UPDATE featured_promotion_orders
       SET review_status = 'approved',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           admin_notes = p_notes
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSIF p_action = 'reject' THEN
    UPDATE featured_promotion_orders
       SET status = 'rejected',
           review_status = 'rejected',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = NOW(),
           admin_notes = p_notes
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSIF p_action = 'refund_required' THEN
    UPDATE featured_promotion_orders
       SET status = 'refund_required',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = NOW(),
           admin_notes = p_notes
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSE
    RAISE EXCEPTION 'Unsupported review action';
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Promotion order not found';
  END IF;

  PERFORM reconcile_featured_promotions();
  RETURN v_order;
END;
$$;

ALTER TABLE featured_promotion_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "featured_promotions_owner_read" ON featured_promotion_orders;
CREATE POLICY "featured_promotions_owner_read"
  ON featured_promotion_orders FOR SELECT
  USING (seller_id = featured_promotion_current_profile_id());

DROP POLICY IF EXISTS "featured_promotions_admin_read" ON featured_promotion_orders;
CREATE POLICY "featured_promotions_admin_read"
  ON featured_promotion_orders FOR SELECT
  USING (featured_promotion_is_admin());

DROP POLICY IF EXISTS "featured_promotions_admin_update" ON featured_promotion_orders;
CREATE POLICY "featured_promotions_admin_update"
  ON featured_promotion_orders FOR UPDATE
  USING (featured_promotion_is_admin())
  WITH CHECK (featured_promotion_is_admin());

GRANT EXECUTE ON FUNCTION reconcile_featured_promotions() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_featured_paid_reservation(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_featured_payment_proof(UUID, featured_payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_featured_pick(UUID, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_unfeature_listing(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_review_featured_promotion(UUID, TEXT, TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('featured-payment-proofs', 'featured-payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Featured proofs: owner upload" ON storage.objects;
CREATE POLICY "Featured proofs: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'featured-payment-proofs'
    AND auth.role() = 'authenticated'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Featured proofs: owner read" ON storage.objects;
CREATE POLICY "Featured proofs: owner read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'featured-payment-proofs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Featured proofs: admin read" ON storage.objects;
CREATE POLICY "Featured proofs: admin read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'featured-payment-proofs'
    AND featured_promotion_is_admin()
  );

DROP POLICY IF EXISTS "Featured proofs: owner delete reserved" ON storage.objects;
CREATE POLICY "Featured proofs: owner delete reserved"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'featured-payment-proofs'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
