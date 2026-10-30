-- Apply manually in the Supabase SQL Editor. Migrations do not auto-apply.
-- Requires migrations 044, 045 and 050. Preserve legacy orders and receipts.
BEGIN;

CREATE TABLE promotion_payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  livemode BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO promotion_payment_settings (id) VALUES (TRUE);

CREATE TABLE promotion_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  listing_id UUID NOT NULL REFERENCES shoes(id),
  featured_order_id UUID UNIQUE REFERENCES featured_promotion_orders(id),
  sponsored_order_id UUID UNIQUE REFERENCES sponsored_promotion_orders(id),
  placement TEXT NOT NULL CHECK (placement IN ('featured', 'top_pick')),
  duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 30)),
  price_php INTEGER NOT NULL CHECK (price_php > 0),
  coins_used INTEGER NOT NULL DEFAULT 0 CHECK (coins_used >= 0 AND coins_used % 2 = 0),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  provider TEXT NOT NULL CHECK (provider IN ('paymongo', 'gp_coins')),
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'pending', 'paid', 'expired', 'review', 'refunded')),
  provider_checkout_id TEXT UNIQUE CHECK (provider_checkout_id ~ '^cs_[A-Za-z0-9]+$'),
  provider_payment_id TEXT UNIQUE CHECK (provider_payment_id ~ '^pay_[A-Za-z0-9]+$'),
  checkout_url TEXT,
  payment_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '20 minutes',
  paid_at TIMESTAMPTZ,
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0 AND refunded_amount_minor <= amount_minor),
  review_note TEXT,
  last_checked_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((placement = 'featured' AND featured_order_id IS NOT NULL AND sponsored_order_id IS NULL)
    OR (placement = 'top_pick' AND sponsored_order_id IS NOT NULL AND featured_order_id IS NULL AND coins_used = 0)),
  CHECK (amount_minor = (price_php - coins_used / 2) * 100),
  CHECK ((provider = 'gp_coins' AND amount_minor = 0) OR (provider = 'paymongo' AND amount_minor >= 100))
);
CREATE INDEX promotion_payments_seller_idx ON promotion_payments(seller_id, created_at DESC);
CREATE INDEX promotion_payments_pending_idx ON promotion_payments(livemode, last_checked_at NULLS FIRST, created_at)
  WHERE paid_at IS NULL AND status IN ('creating', 'pending', 'review');
CREATE INDEX promotion_payments_refund_check_idx ON promotion_payments(livemode, last_checked_at NULLS FIRST)
  WHERE provider = 'paymongo' AND paid_at IS NOT NULL AND status IN ('paid','review');
CREATE INDEX promotion_payments_email_retry_idx ON promotion_payments(created_at)
  WHERE paid_at IS NOT NULL AND notified_at IS NULL AND status IN ('paid','review');
CREATE UNIQUE INDEX promotion_payments_one_pending_idx ON promotion_payments(listing_id, placement)
  WHERE paid_at IS NULL AND status IN ('creating', 'pending', 'review');
CREATE TRIGGER promotion_payments_updated_at BEFORE UPDATE ON promotion_payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX sponsored_reserved_slots_idx ON sponsored_promotion_orders(reserved_until) WHERE status = 'reserved';

CREATE TABLE promotion_payment_events (
  event_id TEXT PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES promotion_payments(id),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE promotion_payment_refunds (
  provider_refund_id TEXT PRIMARY KEY CHECK (provider_refund_id ~ '^ref_[A-Za-z0-9]+$'),
  payment_id UUID NOT NULL REFERENCES promotion_payments(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE promotion_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY promotion_payments_owner_read ON promotion_payments FOR SELECT TO authenticated
  USING (seller_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) OR featured_promotion_is_admin());
REVOKE ALL ON promotion_payments, promotion_payment_events, promotion_payment_refunds, promotion_payment_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON promotion_payments TO authenticated;
GRANT ALL ON promotion_payments, promotion_payment_events, promotion_payment_refunds, promotion_payment_settings TO service_role;

-- Internal functions must not be callable through the public Supabase RPC API.
REVOKE ALL ON FUNCTION create_featured_paid_reservation(UUID, INTEGER, INTEGER),
  create_featured_paid_reservation(UUID, INTEGER, INTEGER, INTEGER),
  create_sponsored_paid_reservation(UUID, INTEGER, INTEGER),
  submit_featured_payment_proof(UUID, featured_payment_method, TEXT, TEXT),
  submit_sponsored_payment_proof(UUID, sponsored_payment_method, TEXT, TEXT),
  submit_featured_coin_payment(UUID), gp_coin_reserve_for_featured_order(UUID, INTEGER),
  gp_coin_release_featured_order(UUID, TEXT), gp_coin_spend_featured_order(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_reserve_for_featured_order(UUID, INTEGER),
  gp_coin_release_featured_order(UUID, TEXT), gp_coin_spend_featured_order(UUID) TO service_role;
DROP POLICY IF EXISTS "Featured proofs: owner upload" ON storage.objects;
DROP POLICY IF EXISTS "Sponsored proofs: owner upload" ON storage.objects;

-- The old daily worker may only expire legacy reservations. Provider checkouts
-- remain held until the backend confirms the session has actually expired.
CREATE OR REPLACE FUNCTION gp_coin_release_expired_featured_reservations()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o featured_promotion_orders%ROWTYPE; n INTEGER := 0;
BEGIN
  FOR o IN SELECT f.* FROM featured_promotion_orders f
    WHERE f.status = 'reserved' AND f.reserved_until < NOW()
      AND NOT EXISTS (SELECT 1 FROM promotion_payments p WHERE p.featured_order_id = f.id)
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM gp_coin_release_featured_order(o.id, 'Legacy reservation expired');
    UPDATE featured_promotion_orders SET status = 'cancelled', ended_at = NOW() WHERE id = o.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION gp_coin_release_expired_featured_reservations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_release_expired_featured_reservations() TO service_role;

CREATE FUNCTION get_sponsored_payment_slot_info()
RETURNS JSONB LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cap AS MATERIALIZED (SELECT sponsored_slot_cap() AS n), active AS (
    SELECT COUNT(*)::INTEGER AS n, MIN(sponsored_until) AS next FROM shoes WHERE status = 'active' AND sponsored_until > NOW()
  ), holds AS (
    SELECT COUNT(*)::INTEGER AS n, MIN(o.reserved_until) FILTER (WHERE o.reserved_until > NOW()) AS next
    FROM sponsored_promotion_orders o WHERE o.status = 'reserved' AND (o.reserved_until > NOW()
      OR EXISTS (SELECT 1 FROM promotion_payments p WHERE p.sponsored_order_id = o.id AND p.paid_at IS NULL AND p.status IN ('creating','pending','review')))
  ) SELECT jsonb_build_object('cap',cap.n,'activeCount',active.n,'slotsAvailable',active.n + holds.n < cap.n,
    'nextSlotOpensAt',CASE WHEN active.n + holds.n >= cap.n THEN LEAST(active.next,holds.next) ELSE NULL END)
  FROM active,holds,cap;
$$;
REVOKE ALL ON FUNCTION get_sponsored_payment_slot_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sponsored_payment_slot_info() TO anon,authenticated,service_role;

CREATE FUNCTION create_promotion_checkout(p_seller UUID, p_listing UUID, p_placement TEXT,
  p_days INTEGER, p_coins INTEGER, p_live BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p promotion_payments%ROWTYPE; f featured_promotion_orders%ROWTYPE;
  s sponsored_promotion_orders%ROWTYPE; l shoes%ROWTYPE; price INTEGER; used INTEGER;
BEGIN
  IF p_live IS NULL OR p_live IS DISTINCT FROM (SELECT livemode FROM promotion_payment_settings WHERE id) THEN
    RAISE EXCEPTION 'Payment environment mismatch';
  END IF;
  IF p_placement NOT IN ('featured', 'top_pick') OR p_placement IS NULL
    OR p_days IS NULL OR p_days NOT IN (7,30) OR p_coins IS NULL OR p_coins < 0 OR p_coins % 2 <> 0
    OR (p_placement = 'top_pick' AND p_coins <> 0) THEN RAISE EXCEPTION 'Invalid promotion selection'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM pg_advisory_xact_lock(hashtext('sponsored_promotion_slots'));
  PERFORM 1 FROM profiles WHERE id = p_seller AND is_verified = TRUE FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only verified sellers can promote listings'; END IF;
  SELECT * INTO l FROM shoes WHERE id = p_listing FOR UPDATE;
  IF l.id IS NULL OR l.seller_id <> p_seller OR l.status <> 'active' THEN RAISE EXCEPTION 'Listing is not eligible for promotion'; END IF;

  SELECT * INTO p FROM promotion_payments WHERE listing_id = p_listing AND placement = p_placement
    AND paid_at IS NULL AND status IN ('creating','pending','review') FOR UPDATE;
  IF p.id IS NOT NULL THEN
    IF p.livemode <> p_live OR p.duration_days <> p_days OR p.coins_used <> p_coins THEN
      RAISE EXCEPTION 'A checkout already exists. Open Payment history to resume or cancel it before changing your selection';
    END IF;
    RETURN to_jsonb(p) || jsonb_build_object('create_checkout', FALSE);
  END IF;
  IF (SELECT COUNT(*) FROM promotion_payments WHERE seller_id = p_seller AND created_at > NOW() - INTERVAL '10 minutes') >= 10
    OR (SELECT COUNT(*) FROM promotion_payments WHERE seller_id = p_seller AND paid_at IS NULL AND status IN ('creating','pending','review')) >= 3 THEN
    RAISE EXCEPTION 'Please finish your existing checkouts before starting another';
  END IF;
  price := CASE WHEN p_placement = 'featured' THEN CASE WHEN p_days = 7 THEN 50 ELSE 150 END
    ELSE CASE WHEN p_days = 7 THEN 30 ELSE 100 END END;
  IF p_coins > price * 2 THEN RAISE EXCEPTION 'GP Coins cannot exceed the promotion price'; END IF;
  IF p_placement = 'featured' AND p_coins = price * 2 AND EXISTS (
    SELECT 1 FROM featured_promotion_orders WHERE seller_id = p_seller AND coin_payment_mode = 'coins_only'
      AND status IN ('reserved','queued','active','completed') AND created_at >= NOW() - INTERVAL '30 days'
  ) THEN RAISE EXCEPTION 'Full GP Coin Featured payment is limited to once every 30 days'; END IF;
  PERFORM gp_coin_release_expired_featured_reservations();
  PERFORM reconcile_featured_promotions();
  PERFORM reconcile_sponsored_promotions();
  IF p_placement = 'featured' THEN
    IF EXISTS (SELECT 1 FROM featured_promotion_orders WHERE listing_id = p_listing AND status IN ('reserved','queued','active')) THEN
      RAISE EXCEPTION 'This listing already has a Featured request';
    END IF;
    INSERT INTO featured_promotion_orders (source, listing_id, seller_id, duration_days, price_php,
      cash_amount_php, status, review_status, reserved_until, created_by)
      VALUES ('paid', p_listing, p_seller, p_days, price, price, 'reserved', 'pending', NOW() + INTERVAL '20 minutes', p_seller) RETURNING * INTO f;
    IF p_coins > 0 THEN f := gp_coin_reserve_for_featured_order(f.id, p_coins); END IF;
  ELSE
    UPDATE sponsored_promotion_orders o SET status = 'cancelled', ended_at = NOW()
      WHERE o.status = 'reserved' AND o.reserved_until < NOW()
      AND NOT EXISTS (SELECT 1 FROM promotion_payments pp WHERE pp.sponsored_order_id = o.id);
    IF l.sponsored_until > NOW() OR EXISTS (SELECT 1 FROM sponsored_promotion_orders WHERE listing_id = p_listing AND status IN ('reserved','active')) THEN
      RAISE EXCEPTION 'This listing already has a Top Pick request';
    END IF;
    SELECT COUNT(*) INTO used FROM shoes WHERE status = 'active' AND sponsored_until > NOW();
    used := used + (SELECT COUNT(*) FROM sponsored_promotion_orders WHERE status = 'reserved');
    IF used >= sponsored_slot_cap() THEN RAISE EXCEPTION 'Top Pick slots are full right now'; END IF;
    INSERT INTO sponsored_promotion_orders (listing_id,seller_id,duration_days,price_php,status,review_status,reserved_until,created_by)
      VALUES (p_listing,p_seller,p_days,price,'reserved','pending',NOW() + INTERVAL '20 minutes',p_seller) RETURNING * INTO s;
  END IF;
  INSERT INTO promotion_payments (seller_id,listing_id,featured_order_id,sponsored_order_id,placement,duration_days,
    price_php,coins_used,amount_minor,provider,livemode)
    VALUES (p_seller,p_listing,f.id,s.id,p_placement,p_days,price,p_coins,(price-p_coins/2)*100,
      CASE WHEN p_coins = price*2 THEN 'gp_coins' ELSE 'paymongo' END,p_live) RETURNING * INTO p;
  RETURN to_jsonb(p) || jsonb_build_object('create_checkout', TRUE);
END $$;

CREATE FUNCTION attach_promotion_checkout(p_id UUID,p_checkout TEXT,p_url TEXT,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_checkout IS NULL OR p_checkout !~ '^cs_[A-Za-z0-9]+$' OR (p_url IS NOT NULL AND p_url !~ '^https://checkout[.]paymongo[.]com/') THEN RAISE EXCEPTION 'Invalid checkout'; END IF;
  UPDATE promotion_payments SET provider_checkout_id = p_checkout, checkout_url = p_url, status = 'pending', review_note = NULL
    WHERE id = p_id AND status IN ('creating','review') AND paid_at IS NULL AND provider = 'paymongo' AND provider_checkout_id IS NULL AND livemode = p_live;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout attachment conflict'; END IF;
END $$;

CREATE FUNCTION fulfill_promotion_payment(p_id UUID,p_checkout TEXT,p_payment TEXT,p_amount INTEGER,
  p_currency TEXT,p_live BOOLEAN,p_event TEXT,p_method TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p promotion_payments%ROWTYPE; l shoes%ROWTYPE; f featured_promotion_orders%ROWTYPE;
  s sponsored_promotion_orders%ROWTYPE; starts TIMESTAMPTZ; next_status featured_promotion_status;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM pg_advisory_xact_lock(hashtext('sponsored_promotion_slots'));
  SELECT * INTO p FROM promotion_payments WHERE id = p_id FOR UPDATE;
  IF p.id IS NULL OR p_amount IS DISTINCT FROM p.amount_minor OR p_currency IS DISTINCT FROM p.currency
    OR p_live IS DISTINCT FROM p.livemode OR p_live IS DISTINCT FROM (SELECT livemode FROM promotion_payment_settings WHERE id)
    OR (p.provider = 'paymongo' AND (p_checkout IS NULL OR p_payment IS NULL OR p_checkout !~ '^cs_[A-Za-z0-9]+$' OR p_payment !~ '^pay_[A-Za-z0-9]+$'))
    OR (p.provider = 'gp_coins' AND (p_checkout IS NOT NULL OR p_payment IS NOT NULL OR p_amount <> 0))
    OR (p.provider_checkout_id IS NOT NULL AND p.provider_checkout_id IS DISTINCT FROM p_checkout)
    OR (p.provider_payment_id IS NOT NULL AND p.provider_payment_id IS DISTINCT FROM p_payment)
    THEN RAISE EXCEPTION 'Payment mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM promotion_payment_events WHERE event_id = p_event AND payment_id <> p.id) THEN RAISE EXCEPTION 'Payment event mismatch'; END IF;
  INSERT INTO promotion_payment_events(event_id,payment_id,event_type) VALUES(p_event,p.id,'payment.confirmed') ON CONFLICT DO NOTHING;
  IF p.paid_at IS NOT NULL THEN RETURN; END IF;
  SELECT * INTO l FROM shoes WHERE id = p.listing_id FOR UPDATE;
  -- Late verified payments are always recorded, even if placement can no longer
  -- be delivered. They must never reactivate an expired or closed listing.
  IF p.status = 'expired' OR l.status <> 'active' OR l.seller_id <> p.seller_id THEN
    UPDATE promotion_payments SET status = 'review', paid_at = NOW(), provider_checkout_id = p_checkout,
      provider_payment_id = p_payment, payment_method = p_method, review_note = 'Payment received but placement unavailable. Refund review required.' WHERE id = p.id;
    IF p.featured_order_id IS NOT NULL THEN
      PERFORM gp_coin_release_featured_order(p.featured_order_id,'Paid placement unavailable');
      UPDATE featured_promotion_orders SET status = 'refund_required', reserved_until = NULL WHERE id = p.featured_order_id;
    ELSE
      UPDATE sponsored_promotion_orders SET status = 'refund_required', reserved_until = NULL WHERE id = p.sponsored_order_id;
    END IF;
    RETURN;
  END IF;
  IF p.placement = 'featured' THEN
    SELECT * INTO f FROM featured_promotion_orders WHERE id = p.featured_order_id FOR UPDATE;
    IF f.status <> 'reserved' OR f.coins_released_at IS NOT NULL OR f.cash_amount_php*100 <> p.amount_minor
      OR f.coins_used <> p.coins_used THEN RAISE EXCEPTION 'Featured payment state mismatch'; END IF;
    PERFORM reconcile_featured_promotions();
    SELECT GREATEST(NOW(),COALESCE(MAX(scheduled_end_at),NOW())) INTO starts
      FROM featured_promotion_orders WHERE source = 'paid' AND status IN ('active','queued');
    next_status := CASE WHEN starts <= NOW() + INTERVAL '1 second' THEN 'active'::featured_promotion_status ELSE 'queued'::featured_promotion_status END;
    UPDATE featured_promotion_orders SET status = next_status, review_status = 'approved', reserved_until = NULL,
      scheduled_start_at = starts, scheduled_end_at = starts + (duration_days || ' days')::INTERVAL,
      transaction_reference = p_payment, activated_at = CASE WHEN next_status = 'active' THEN NOW() ELSE NULL END
      WHERE id = f.id;
    IF p.coins_used > 0 THEN PERFORM gp_coin_spend_featured_order(f.id); END IF;
    PERFORM reconcile_featured_promotions();
  ELSE
    SELECT * INTO s FROM sponsored_promotion_orders WHERE id = p.sponsored_order_id FOR UPDATE;
    IF s.status <> 'reserved' OR s.price_php*100 <> p.amount_minor THEN RAISE EXCEPTION 'Top Pick payment state mismatch'; END IF;
    -- Honor the slot held before payment, even if the dynamic cap later falls.
    UPDATE sponsored_promotion_orders SET status = 'active', review_status = 'approved', reserved_until = NULL,
      scheduled_start_at = NOW(), scheduled_end_at = NOW() + (duration_days || ' days')::INTERVAL,
      transaction_reference = p_payment, activated_at = NOW() WHERE id = s.id RETURNING * INTO s;
    UPDATE shoes SET sponsored_until = s.scheduled_end_at, sponsored_started_at = NOW() WHERE id = p.listing_id;
  END IF;
  UPDATE promotion_payments SET status = 'paid', paid_at = NOW(), provider_checkout_id = p_checkout,
    provider_payment_id = p_payment, payment_method = p_method, review_note = NULL WHERE id = p.id;
END $$;

CREATE FUNCTION expire_promotion_payment(p_id UUID,p_checkout TEXT,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p promotion_payments%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  SELECT * INTO p FROM promotion_payments WHERE id = p_id FOR UPDATE;
  IF p.id IS NULL OR p.livemode IS DISTINCT FROM p_live OR p.provider_checkout_id IS DISTINCT FROM p_checkout
    THEN RAISE EXCEPTION 'Checkout mismatch'; END IF;
  IF p.paid_at IS NOT NULL OR p.status = 'expired' THEN RETURN; END IF;
  -- A NULL checkout can only be expired by an operator after resolving an
  -- ambiguous create request. The automated worker never calls this for NULL.
  UPDATE promotion_payments SET status = 'expired', review_note = NULL WHERE id = p.id;
  IF p.featured_order_id IS NOT NULL THEN
    PERFORM gp_coin_release_featured_order(p.featured_order_id,'Checkout expired');
    UPDATE featured_promotion_orders SET status = 'cancelled', ended_at = NOW(), reserved_until = NULL WHERE id = p.featured_order_id;
  ELSE
    UPDATE sponsored_promotion_orders SET status = 'cancelled', ended_at = NOW(), reserved_until = NULL WHERE id = p.sponsored_order_id;
  END IF;
END $$;

CREATE FUNCTION refund_featured_payment_coins(p_order UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f featured_promotion_orders%ROWTYPE; tx gp_coin_transactions%ROWTYPE;
BEGIN
  SELECT * INTO f FROM featured_promotion_orders WHERE id = p_order FOR UPDATE;
  IF f.coins_used <= 0 THEN RETURN; END IF;
  IF f.coins_spent_at IS NULL THEN PERFORM gp_coin_release_featured_order(f.id,'Placement refund'); RETURN; END IF;
  IF EXISTS (SELECT 1 FROM gp_coin_transactions WHERE idempotency_key = 'promotion_coin_refund:' || f.id) THEN RETURN; END IF;
  tx := gp_coin_apply_transaction(f.seller_id,'refund',f.coins_used,0,'promotion_coin_refund:' || f.id,
    f.listing_id,f.id,NULL,NOW() + INTERVAL '6 months',jsonb_build_object('reason','Promotion refunded'));
  INSERT INTO gp_coin_award_buckets(profile_id,source_transaction_id,original_amount,remaining_amount,expires_at)
    VALUES(f.seller_id,tx.id,f.coins_used,f.coins_used,tx.expires_at);
END $$;

CREATE FUNCTION record_promotion_refund(p_payment TEXT,p_refund TEXT,p_amount INTEGER,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p promotion_payments%ROWTYPE; total INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  SELECT * INTO p FROM promotion_payments WHERE provider_payment_id = p_payment FOR UPDATE;
  IF p.id IS NULL THEN RETURN; END IF;
  IF p_live IS DISTINCT FROM p.livemode OR p.paid_at IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM promotion_payment_refunds WHERE provider_refund_id = p_refund AND (payment_id <> p.id OR amount_minor <> p_amount)) THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
  INSERT INTO promotion_payment_refunds VALUES(p_refund,p.id,p_amount,NOW()) ON CONFLICT DO NOTHING;
  SELECT SUM(amount_minor) INTO total FROM promotion_payment_refunds WHERE payment_id = p.id;
  IF total > p.amount_minor THEN RAISE EXCEPTION 'Refund exceeds payment'; END IF;
  UPDATE promotion_payments SET refunded_amount_minor = total,
    status = CASE WHEN total = amount_minor THEN 'refunded' ELSE 'review' END,
    review_note = CASE WHEN total = amount_minor THEN 'Refund confirmed by PayMongo.' ELSE 'Partial refund confirmed. Review remaining placement.' END WHERE id = p.id;
  IF total = p.amount_minor THEN
    IF p.featured_order_id IS NOT NULL THEN
      UPDATE featured_promotion_orders SET status = 'refund_required', ended_at = NOW() WHERE id = p.featured_order_id;
      PERFORM refund_featured_payment_coins(p.featured_order_id);
      PERFORM reconcile_featured_promotions();
    ELSE
      UPDATE shoes SET sponsored_until = NULL,sponsored_started_at = NULL WHERE id = p.listing_id
        AND sponsored_until = (SELECT scheduled_end_at FROM sponsored_promotion_orders WHERE id = p.sponsored_order_id);
      UPDATE sponsored_promotion_orders SET status = 'refund_required', ended_at = NOW() WHERE id = p.sponsored_order_id;
    END IF;
  END IF;
END $$;

CREATE FUNCTION reconcile_promotion_payment_placements()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p promotion_payments%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();
  PERFORM reconcile_sponsored_promotions();
  FOR p IN SELECT pp.* FROM promotion_payments pp
    LEFT JOIN featured_promotion_orders f ON f.id = pp.featured_order_id
    LEFT JOIN sponsored_promotion_orders s ON s.id = pp.sponsored_order_id
    WHERE pp.status = 'paid' AND (f.status = 'refund_required' OR s.status = 'refund_required') FOR UPDATE OF pp
  LOOP
    IF p.featured_order_id IS NOT NULL THEN PERFORM refund_featured_payment_coins(p.featured_order_id); END IF;
    UPDATE promotion_payments SET status = CASE WHEN provider = 'gp_coins' THEN 'refunded' ELSE 'review' END,
      review_note = CASE WHEN provider = 'gp_coins' THEN 'Unused placement refunded to GP Coins.' ELSE 'Placement could not be delivered. Cash refund review required; eligible GP Coins restored.' END
      WHERE id = p.id;
  END LOOP;
END $$;

-- Existing admin proof reviews remain available only for legacy orders.
ALTER FUNCTION admin_review_featured_promotion(UUID,TEXT,TEXT) RENAME TO admin_review_featured_promotion_legacy;
ALTER FUNCTION admin_review_sponsored_promotion(UUID,TEXT,TEXT) RENAME TO admin_review_sponsored_promotion_legacy;
CREATE FUNCTION admin_review_featured_promotion(p_order_id UUID,p_action TEXT,p_notes TEXT DEFAULT NULL)
RETURNS featured_promotion_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT featured_promotion_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF EXISTS (SELECT 1 FROM promotion_payments WHERE featured_order_id = p_order_id) THEN RAISE EXCEPTION 'Use the verified payment record for this order'; END IF;
  RETURN admin_review_featured_promotion_legacy(p_order_id,p_action,p_notes);
END $$;
CREATE FUNCTION admin_review_sponsored_promotion(p_order_id UUID,p_action TEXT,p_notes TEXT DEFAULT NULL)
RETURNS sponsored_promotion_orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT sponsored_promotion_is_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF EXISTS (SELECT 1 FROM promotion_payments WHERE sponsored_order_id = p_order_id) THEN RAISE EXCEPTION 'Use the verified payment record for this order'; END IF;
  RETURN admin_review_sponsored_promotion_legacy(p_order_id,p_action,p_notes);
END $$;
REVOKE ALL ON FUNCTION admin_review_featured_promotion_legacy(UUID,TEXT,TEXT),admin_review_sponsored_promotion_legacy(UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION admin_review_featured_promotion(UUID,TEXT,TEXT),admin_review_sponsored_promotion(UUID,TEXT,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION admin_review_featured_promotion(UUID,TEXT,TEXT),admin_review_sponsored_promotion(UUID,TEXT,TEXT) TO authenticated;

REVOKE ALL ON FUNCTION create_promotion_checkout(UUID,UUID,TEXT,INTEGER,INTEGER,BOOLEAN),
  attach_promotion_checkout(UUID,TEXT,TEXT,BOOLEAN),fulfill_promotion_payment(UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT),
  expire_promotion_payment(UUID,TEXT,BOOLEAN),refund_featured_payment_coins(UUID),record_promotion_refund(TEXT,TEXT,INTEGER,BOOLEAN),reconcile_promotion_payment_placements()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION create_promotion_checkout(UUID,UUID,TEXT,INTEGER,INTEGER,BOOLEAN),
  attach_promotion_checkout(UUID,TEXT,TEXT,BOOLEAN),fulfill_promotion_payment(UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,TEXT),
  expire_promotion_payment(UUID,TEXT,BOOLEAN),refund_featured_payment_coins(UUID),record_promotion_refund(TEXT,TEXT,INTEGER,BOOLEAN),reconcile_promotion_payment_placements() TO service_role;

COMMIT;
