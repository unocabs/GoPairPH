-- Direct seller-to-Go Pair PH buyback workflow.
-- IMPORTANT: this project does not auto-apply migrations. Run this file in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS buyback_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'declined', 'cancelled', 'expired',
    'shipped', 'delivered', 'completed', 'disputed'
  )),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  original_price_php NUMERIC(10,2) NOT NULL CHECK (original_price_php > 0),
  purchase_date DATE NOT NULL,
  has_box BOOLEAN NOT NULL DEFAULT FALSE,
  has_visible_flaws BOOLEAN NOT NULL DEFAULT FALSE,
  flaw_notes TEXT,
  seller_note TEXT,
  proposed_ship_date DATE NOT NULL,
  retail_basis_php NUMERIC(10,2) NOT NULL CHECK (retail_basis_php > 0),
  fast_sale_estimate_php NUMERIC(10,2) NOT NULL CHECK (fast_sale_estimate_php > 0),
  quoted_price_php NUMERIC(10,2) NOT NULL CHECK (quoted_price_php >= 500 AND quoted_price_php <= 10000),
  pricing_version TEXT NOT NULL,
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  proof_code TEXT NOT NULL,
  acknowledgements JSONB NOT NULL DEFAULT '{}'::JSONB,
  admin_note TEXT,
  decline_reason TEXT,
  review_checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
  checklist_version TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  shipping_reminder_sent_at TIMESTAMPTZ,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cod_paid_php NUMERIC(10,2),
  delivery_checklist JSONB NOT NULL DEFAULT '{}'::JSONB,
  completed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, attempt_number)
);

-- Compatibility for an environment where an earlier draft of this migration was already applied.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'buyback_offers' AND column_name = 'receipt_amount_php'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'buyback_offers' AND column_name = 'original_price_php'
    ) THEN
      ALTER TABLE buyback_offers ADD COLUMN original_price_php NUMERIC(10,2);
    END IF;

    UPDATE buyback_offers
    SET original_price_php = COALESCE(
      original_price_php,
      NULLIF(pricing_snapshot ->> 'srp_php', '')::NUMERIC,
      retail_basis_php
    )
    WHERE original_price_php IS NULL;

    ALTER TABLE buyback_offers ALTER COLUMN original_price_php SET NOT NULL;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'buyback_offers_original_price_php_check'
        AND conrelid = 'buyback_offers'::REGCLASS
    ) THEN
      ALTER TABLE buyback_offers
        ADD CONSTRAINT buyback_offers_original_price_php_check CHECK (original_price_php > 0);
    END IF;
    ALTER TABLE buyback_offers DROP COLUMN receipt_amount_php;
  END IF;
END $$;

UPDATE buyback_offers
SET pricing_snapshot = (pricing_snapshot - 'srp_php' - 'receipt_amount_php')
  || jsonb_build_object('original_price_php', original_price_php)
WHERE NOT pricing_snapshot ? 'original_price_php'
  OR pricing_snapshot ? 'srp_php'
  OR pricing_snapshot ? 'receipt_amount_php';

CREATE TABLE IF NOT EXISTS buyback_offer_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES buyback_offers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'receipt', 'label', 'sides', 'heel', 'ownership', 'box_label', 'booking_confirmation', 'unboxing_evidence'
  )),
  storage_path TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (offer_id, kind)
);

CREATE TABLE IF NOT EXISTS buyback_offer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES buyback_offers(id) ON DELETE CASCADE,
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS buyback_offers_admin_queue_idx
  ON buyback_offers(status, created_at DESC);
CREATE INDEX IF NOT EXISTS buyback_offers_seller_idx
  ON buyback_offers(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS buyback_offers_listing_idx
  ON buyback_offers(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS buyback_offer_events_offer_idx
  ON buyback_offer_events(offer_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS buyback_offers_one_open_per_listing_idx
  ON buyback_offers(listing_id)
  WHERE status IN ('pending', 'accepted', 'shipped', 'delivered', 'disputed');

DROP TRIGGER IF EXISTS buyback_offers_updated_at ON buyback_offers;
CREATE TRIGGER buyback_offers_updated_at
  BEFORE UPDATE ON buyback_offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE buyback_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_offer_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyback_offer_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION buyback_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = TRUE
  );
$$;

DROP POLICY IF EXISTS "Buyback: admin read offers" ON buyback_offers;
CREATE POLICY "Buyback: admin read offers" ON buyback_offers
  FOR SELECT USING (buyback_is_admin());
DROP POLICY IF EXISTS "Buyback: admin read proofs" ON buyback_offer_proofs;
CREATE POLICY "Buyback: admin read proofs" ON buyback_offer_proofs
  FOR SELECT USING (buyback_is_admin());
DROP POLICY IF EXISTS "Buyback: admin read events" ON buyback_offer_events;
CREATE POLICY "Buyback: admin read events" ON buyback_offer_events
  FOR SELECT USING (buyback_is_admin());

-- All seller mutations and reads go through authenticated server routes, which return a safe field subset.
REVOKE ALL ON buyback_offers FROM anon, authenticated;
REVOKE ALL ON buyback_offer_proofs FROM anon, authenticated;
REVOKE ALL ON buyback_offer_events FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buyback-proofs',
  'buyback-proofs',
  FALSE,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Buyback proofs: admin read" ON storage.objects;
CREATE POLICY "Buyback proofs: admin read" ON storage.objects
  FOR SELECT USING (bucket_id = 'buyback-proofs' AND buyback_is_admin());

CREATE OR REPLACE FUNCTION admin_review_buyback_offer(
  p_offer_id UUID,
  p_action TEXT,
  p_checklist JSONB DEFAULT '{}'::JSONB,
  p_admin_note TEXT DEFAULT NULL,
  p_decline_reason TEXT DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_recipient_phone TEXT DEFAULT NULL,
  p_recipient_address TEXT DEFAULT NULL
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
  v_required_key TEXT;
  v_required_keys TEXT[] := ARRAY[
    'seller_verified', 'receipt_credible', 'receipt_matches', 'retail_basis_matches',
    'ownership_proof', 'sku_matches', 'photos_clear', 'photos_original',
    'condition_consistent', 'no_open_flags', 'quote_verified', 'date_available',
    'cash_and_recipient_ready', 'no_accepted_buyer', 'terms_reviewed'
  ];
BEGIN
  SELECT * INTO v_admin FROM profiles WHERE user_id = auth.uid();
  IF v_admin.id IS NULL OR NOT COALESCE(v_admin.is_admin, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT * INTO v_offer FROM buyback_offers WHERE id = p_offer_id FOR UPDATE;
  IF v_offer.id IS NULL OR v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'Offer is not pending';
  END IF;

  IF p_action = 'accept' THEN
    FOREACH v_required_key IN ARRAY v_required_keys LOOP
      IF COALESCE((p_checklist ->> v_required_key)::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Complete every review check before accepting';
      END IF;
    END LOOP;
    IF NULLIF(BTRIM(COALESCE(p_recipient_name, '')), '') IS NULL
      OR NULLIF(BTRIM(COALESCE(p_recipient_phone, '')), '') IS NULL
      OR NULLIF(BTRIM(COALESCE(p_recipient_address, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Recipient details are required';
    END IF;

    SELECT * INTO v_listing FROM shoes WHERE id = v_offer.listing_id FOR UPDATE;
    IF v_listing.id IS NULL OR v_listing.status <> 'active' OR v_listing.seller_id <> v_offer.seller_id THEN
      RAISE EXCEPTION 'Listing is no longer eligible';
    END IF;
    IF v_listing.price_php::NUMERIC IS DISTINCT FROM (v_offer.pricing_snapshot ->> 'listing_price_php')::NUMERIC
      OR v_listing.srp_php::NUMERIC IS DISTINCT FROM (v_offer.pricing_snapshot ->> 'original_price_php')::NUMERIC
      OR v_listing.condition IS DISTINCT FROM (v_offer.pricing_snapshot ->> 'condition')
      OR v_listing.mileage_km::TEXT IS DISTINCT FROM (v_offer.pricing_snapshot ->> 'mileage_km') THEN
      RAISE EXCEPTION 'Listing price or quote details changed. Ask the seller to send a new buyback request.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM purchase_requests
      WHERE listing_id = v_offer.listing_id AND status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'This listing already has an accepted buyer transaction';
    END IF;

    UPDATE shoes SET status = 'reserved' WHERE id = v_offer.listing_id;
    UPDATE purchase_requests SET status = 'declined'
      WHERE listing_id = v_offer.listing_id AND status = 'pending';
    UPDATE buyback_offers SET
      status = 'accepted',
      review_checklist = p_checklist,
      checklist_version = 'pre_acceptance_v1',
      admin_note = NULLIF(BTRIM(COALESCE(p_admin_note, '')), ''),
      recipient_name = BTRIM(p_recipient_name),
      recipient_phone = BTRIM(p_recipient_phone),
      recipient_address = BTRIM(p_recipient_address),
      reviewed_by = v_admin.id,
      reviewed_at = NOW(),
      accepted_at = NOW(),
      expires_at = ((proposed_ship_date + 2)::TIMESTAMP AT TIME ZONE 'Asia/Manila')
    WHERE id = p_offer_id
    RETURNING * INTO v_offer;

    INSERT INTO buyback_offer_events(offer_id, actor_profile_id, event_type, note)
    VALUES (p_offer_id, v_admin.id, 'accepted', v_offer.admin_note);
  ELSIF p_action = 'decline' THEN
    IF NULLIF(BTRIM(COALESCE(p_decline_reason, '')), '') IS NULL
      OR NULLIF(BTRIM(COALESCE(p_admin_note, '')), '') IS NULL THEN
      RAISE EXCEPTION 'A decline reason and note are required';
    END IF;
    UPDATE buyback_offers SET
      status = 'declined',
      decline_reason = BTRIM(p_decline_reason),
      admin_note = BTRIM(p_admin_note),
      reviewed_by = v_admin.id,
      reviewed_at = NOW()
    WHERE id = p_offer_id
    RETURNING * INTO v_offer;
    INSERT INTO buyback_offer_events(offer_id, actor_profile_id, event_type, note, metadata)
    VALUES (p_offer_id, v_admin.id, 'declined', v_offer.admin_note, jsonb_build_object('reason', v_offer.decline_reason));
  ELSE
    RAISE EXCEPTION 'Unsupported review action';
  END IF;

  RETURN v_offer;
END;
$$;

CREATE OR REPLACE FUNCTION cancel_buyback_offer(p_offer_id UUID)
RETURNS buyback_offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_offer buyback_offers%ROWTYPE;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_offer FROM buyback_offers WHERE id = p_offer_id FOR UPDATE;
  IF v_offer.id IS NULL OR v_offer.seller_id <> v_profile_id THEN RAISE EXCEPTION 'Offer not found'; END IF;
  IF v_offer.status NOT IN ('pending', 'accepted') THEN RAISE EXCEPTION 'This offer can no longer be cancelled'; END IF;
  IF v_offer.status = 'accepted' THEN
    UPDATE shoes SET status = 'active' WHERE id = v_offer.listing_id AND status = 'reserved';
  END IF;
  UPDATE buyback_offers SET status = 'cancelled' WHERE id = p_offer_id RETURNING * INTO v_offer;
  INSERT INTO buyback_offer_events(offer_id, actor_profile_id, event_type)
  VALUES (p_offer_id, v_profile_id, 'cancelled');
  RETURN v_offer;
END;
$$;

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
    IF v_offer.status <> 'shipped' THEN RAISE EXCEPTION 'Offer is not shipped'; END IF;
    IF p_cod_paid_php IS NULL OR p_cod_paid_php <> v_offer.quoted_price_php THEN RAISE EXCEPTION 'COD payment must match the accepted quote'; END IF;
    UPDATE buyback_offers SET status = 'delivered', delivered_at = NOW(), cod_paid_php = p_cod_paid_php
      WHERE id = p_offer_id RETURNING * INTO v_offer;
  ELSIF p_action = 'complete' THEN
    IF v_offer.status <> 'delivered' THEN RAISE EXCEPTION 'Mark the shipment delivered first'; END IF;
    FOREACH v_required_key IN ARRAY v_required_keys LOOP
      IF COALESCE((p_delivery_checklist ->> v_required_key)::BOOLEAN, FALSE) IS NOT TRUE THEN
        RAISE EXCEPTION 'Complete every delivery check before finishing';
      END IF;
    END LOOP;
    UPDATE shoes SET status = 'sold', closed_sale_channel = 'go_pair' WHERE id = v_offer.listing_id;
    UPDATE buyback_offers SET status = 'completed', delivery_checklist = p_delivery_checklist, completed_at = NOW()
      WHERE id = p_offer_id RETURNING * INTO v_offer;
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

CREATE OR REPLACE FUNCTION reconcile_expired_buyback_offers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_offer RECORD;
BEGIN
  FOR v_offer IN
    SELECT id, listing_id FROM buyback_offers
    WHERE status = 'accepted' AND expires_at IS NOT NULL AND expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE buyback_offers SET status = 'expired' WHERE id = v_offer.id;
    UPDATE shoes SET status = 'active' WHERE id = v_offer.listing_id AND status = 'reserved';
    INSERT INTO buyback_offer_events(offer_id, event_type, note)
    VALUES (v_offer.id, 'expired', 'Tracking was not submitted before the shipping deadline.');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_review_buyback_offer(UUID, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_buyback_offer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_fulfill_buyback_offer(UUID, TEXT, TEXT, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_expired_buyback_offers() TO authenticated;
