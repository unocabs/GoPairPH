-- Apply manually in the Supabase SQL Editor AFTER migrations 061 and earlier.
-- This project DOES NOT auto-apply migrations. No remote payment is created here.
BEGIN;

CREATE TABLE public.gp_coin_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  coins INTEGER NOT NULL CHECK (coins IN (40,100,200)),
  amount_minor INTEGER NOT NULL CHECK (amount_minor = coins * 50),
  currency TEXT NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  livemode BOOLEAN NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating' CHECK (status IN ('creating','pending','paid','expired','review','refunded')),
  provider_checkout_id TEXT UNIQUE,
  provider_payment_id TEXT UNIQUE,
  checkout_url TEXT,
  payment_method TEXT,
  return_path TEXT NOT NULL DEFAULT '/profile' CHECK (return_path = '/profile' OR return_path ~ '^/flash-deals/new([?].*)?$'),
  credit_transaction_id UUID UNIQUE REFERENCES public.gp_coin_transactions(id),
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount_minor >= 0 AND refunded_amount_minor <= amount_minor),
  reversed_coins INTEGER NOT NULL DEFAULT 0 CHECK (reversed_coins >= 0 AND reversed_coins <= coins),
  review_note TEXT,
  last_checked_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX gp_coin_purchases_profile_idx ON public.gp_coin_purchases(profile_id,created_at DESC);
CREATE UNIQUE INDEX gp_coin_purchases_one_pending_idx ON public.gp_coin_purchases(profile_id)
  WHERE status IN ('creating','pending','review') AND paid_at IS NULL;
CREATE TABLE public.gp_coin_purchase_refunds (
  provider_refund_id TEXT PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.gp_coin_purchases(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.flash_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES public.shoes(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL,
  original_price_php NUMERIC(10,2) NOT NULL CHECK (original_price_php > 0),
  sale_price_php NUMERIC(10,2) NOT NULL CHECK (sale_price_php > 0 AND sale_price_php <= original_price_php * 0.9),
  coins_spent INTEGER NOT NULL DEFAULT 20 CHECK (coins_spent = 20),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id,client_id),
  CHECK (ends_at = starts_at + INTERVAL '24 hours')
);
CREATE INDEX flash_deals_seller_idx ON public.flash_deals(seller_id,ends_at DESC);
CREATE INDEX flash_deals_listing_idx ON public.flash_deals(listing_id,created_at DESC);
ALTER TABLE public.shoes
  ADD COLUMN flash_deal_id UUID REFERENCES public.flash_deals(id),
  ADD COLUMN flash_deal_original_price_php NUMERIC(10,2),
  ADD COLUMN flash_deal_price_php NUMERIC(10,2),
  ADD COLUMN flash_deal_starts_at TIMESTAMPTZ,
  ADD COLUMN flash_deal_ends_at TIMESTAMPTZ;
CREATE INDEX shoes_live_flash_deals_idx ON public.shoes(flash_deal_ends_at,id)
  WHERE flash_deal_id IS NOT NULL AND status = 'active' AND has_stock AND listed_in_main_feed;

-- Reference discounts against actual asking prices, never SRP or an invented price.
CREATE TABLE public.listing_price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.shoes(id) ON DELETE CASCADE,
  price_php NUMERIC(10,2) NOT NULL CHECK (price_php > 0),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX listing_price_history_idx ON public.listing_price_history(listing_id,recorded_at DESC);
INSERT INTO public.listing_price_history(listing_id,price_php)
  SELECT id,price_php FROM public.shoes WHERE listing_type = 'for_sale' AND price_php > 0;

CREATE FUNCTION public.guard_flash_deal_listing()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.flash_deal_id IS NOT NULL) OR
    (TG_OP = 'UPDATE' AND ROW(NEW.flash_deal_id,NEW.flash_deal_original_price_php,NEW.flash_deal_price_php,NEW.flash_deal_starts_at,NEW.flash_deal_ends_at)
      IS DISTINCT FROM ROW(OLD.flash_deal_id,OLD.flash_deal_original_price_php,OLD.flash_deal_price_php,OLD.flash_deal_starts_at,OLD.flash_deal_ends_at)) THEN
    IF current_user IN ('anon','authenticated') THEN RAISE EXCEPTION 'Use Start a flash deal to change a promotion'; END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.flash_deal_id IS NOT NULL THEN
    IF OLD.flash_deal_ends_at > NOW() AND
      ((NEW.sponsored_until IS DISTINCT FROM OLD.sponsored_until AND NEW.sponsored_until > NOW()) OR
       (NEW.featured_until IS DISTINCT FROM OLD.featured_until AND NEW.featured_until > NOW())) THEN
      RAISE EXCEPTION 'End your flash deal before starting another promotion on these shoes';
    END IF;
    IF NEW.price_php IS DISTINCT FROM OLD.price_php OR NEW.listing_type IS DISTINCT FROM OLD.listing_type
      OR NEW.status <> 'active' OR NOT NEW.has_stock OR NOT NEW.listed_in_main_feed
      OR NEW.quality_flagged_at IS NOT NULL OR NEW.running_relevance_flagged THEN
      NEW.flash_deal_id := NULL; NEW.flash_deal_price_php := NULL; NEW.flash_deal_original_price_php := NULL;
      NEW.flash_deal_starts_at := NULL; NEW.flash_deal_ends_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_flash_deal_listing BEFORE INSERT OR UPDATE ON public.shoes
  FOR EACH ROW EXECUTE FUNCTION public.guard_flash_deal_listing();

CREATE FUNCTION public.track_listing_price()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.price_php IS DISTINCT FROM OLD.price_php AND OLD.price_php > 0 THEN
    INSERT INTO listing_price_history(listing_id,price_php) VALUES(NEW.id,OLD.price_php);
  END IF;
  IF NEW.price_php > 0 AND (TG_OP = 'INSERT' OR NEW.price_php IS DISTINCT FROM OLD.price_php) THEN
    INSERT INTO listing_price_history(listing_id,price_php) VALUES(NEW.id,NEW.price_php);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.flash_deal_id IS NOT NULL AND NEW.flash_deal_id IS DISTINCT FROM OLD.flash_deal_id THEN
    UPDATE flash_deals SET ended_at = LEAST(NOW(),ends_at) WHERE id = OLD.flash_deal_id AND ended_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER track_listing_price AFTER INSERT OR UPDATE ON public.shoes
  FOR EACH ROW EXECUTE FUNCTION public.track_listing_price();

CREATE FUNCTION public.flash_deal_reference_price(p_listing UUID)
RETURNS NUMERIC LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT LEAST(s.price_php,COALESCE((SELECT MIN(h.price_php) FROM listing_price_history h
    WHERE h.listing_id=s.id AND h.recorded_at >= NOW() - INTERVAL '7 days'),s.price_php))
  FROM shoes s WHERE s.id=p_listing;
$$;

CREATE FUNCTION public.start_flash_deal(p_seller UUID,p_listing UUID,p_price NUMERIC,p_client UUID)
RETURNS public.flash_deals LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s shoes%ROWTYPE; d flash_deals%ROWTYPE; w gp_coin_wallets%ROWTYPE;
  b gp_coin_award_buckets%ROWTYPE; reference NUMERIC; remaining INTEGER := 20; take INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('promotion_payments'));
  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM pg_advisory_xact_lock(hashtext('sponsored_promotion_slots'));
  -- One lock shared with every GP wallet operation prevents double spending.
  w := gp_coin_ensure_wallet(p_seller);
  SELECT * INTO d FROM flash_deals WHERE seller_id=p_seller AND client_id=p_client;
  IF d.id IS NOT NULL THEN
    IF d.listing_id <> p_listing OR d.sale_price_php IS DISTINCT FROM p_price THEN RAISE EXCEPTION 'This request was already used. Refresh before trying again'; END IF;
    RETURN d;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_seller AND (is_verified OR is_admin)) THEN RAISE EXCEPTION 'Verify your account before promoting shoes'; END IF;
  SELECT * INTO s FROM shoes WHERE id=p_listing FOR UPDATE;
  IF s.id IS NULL OR s.seller_id <> p_seller OR s.status <> 'active' OR s.listing_type <> 'for_sale'
    OR NOT s.has_stock OR NOT s.listed_in_main_feed OR s.quality_flagged_at IS NOT NULL OR s.running_relevance_flagged
    OR NOT EXISTS(SELECT 1 FROM shoe_images WHERE shoe_id=s.id)
    OR (s.shop_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM shops WHERE id=s.shop_id AND status='active')) THEN
    RAISE EXCEPTION 'Choose active, in-stock running shoes with a photo in the marketplace';
  END IF;
  IF s.featured_until > NOW() OR s.sponsored_until > NOW() OR EXISTS(SELECT 1 FROM featured_promotion_orders
    WHERE listing_id=s.id AND status IN ('reserved','queued','active')) OR EXISTS(SELECT 1 FROM sponsored_promotion_orders WHERE listing_id=s.id AND status IN ('reserved','active')) THEN
    RAISE EXCEPTION 'These shoes already have a promotion. Choose another listing or wait until it ends';
  END IF;
  IF EXISTS(SELECT 1 FROM shoes WHERE seller_id=p_seller AND flash_deal_ends_at>NOW() AND status='active') THEN
    RAISE EXCEPTION 'You already have a live flash deal. View or end it before starting another';
  END IF;
  IF EXISTS(SELECT 1 FROM flash_deals WHERE listing_id=p_listing AND created_at>NOW()-INTERVAL '7 days') THEN
    RAISE EXCEPTION 'These shoes can join Flash Deals once every 7 days. Choose another listing';
  END IF;
  reference := flash_deal_reference_price(p_listing);
  IF p_price IS NULL OR p_price<=0 OR p_price<>round(p_price,2) OR p_price>floor(reference*0.9*100)/100 THEN
    RAISE EXCEPTION 'Offer at least 10%% off the lowest asking price from the last 7 days';
  END IF;
  PERFORM gp_coin_expire_available(p_seller);
  w := gp_coin_ensure_wallet(p_seller);
  IF w.locked_at IS NOT NULL THEN RAISE EXCEPTION 'Your wallet needs a payment review. Please contact support'; END IF;
  IF w.available_balance<20 THEN RAISE EXCEPTION 'You need 20 GP Coins. Buy coins or earn more before launching'; END IF;
  -- Bounded pool keeps paid rotation meaningful and the homepage query small.
  PERFORM pg_advisory_xact_lock(hashtext('flash-deal-capacity'));
  IF (SELECT COUNT(*) FROM shoes WHERE flash_deal_ends_at>NOW() AND status='active') >= 12 THEN
    RAISE EXCEPTION 'Flash Deals is full right now. Your coins have not been spent. Please try again later';
  END IF;
  INSERT INTO flash_deals(listing_id,seller_id,client_id,original_price_php,sale_price_php)
    VALUES(p_listing,p_seller,p_client,reference,p_price) RETURNING * INTO d;
  FOR b IN SELECT * FROM gp_coin_award_buckets WHERE profile_id=p_seller AND remaining_amount>0 AND expires_at>NOW()
    ORDER BY expires_at,created_at,id FOR UPDATE LOOP
    EXIT WHEN remaining=0;
    take := LEAST(b.remaining_amount,remaining);
    UPDATE gp_coin_award_buckets SET remaining_amount=remaining_amount-take WHERE id=b.id;
    remaining := remaining-take;
  END LOOP;
  IF remaining<>0 THEN RAISE EXCEPTION 'Could not use your coins. Please refresh your wallet'; END IF;
  PERFORM gp_coin_apply_transaction(p_seller,'spend',-20,0,'flash_deal:'||d.id,p_listing,NULL,NULL,NULL,
    jsonb_build_object('action','flash_deal','flash_deal_id',d.id));
  UPDATE shoes SET flash_deal_id=d.id,flash_deal_original_price_php=reference,flash_deal_price_php=p_price,
    flash_deal_starts_at=d.starts_at,flash_deal_ends_at=d.ends_at WHERE id=p_listing;
  RETURN d;
END $$;

CREATE FUNCTION public.end_flash_deal(p_seller UUID,p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d flash_deals%ROWTYPE;
BEGIN
  SELECT * INTO d FROM flash_deals WHERE id=p_id AND seller_id=p_seller;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Flash deal not found'; END IF;
  UPDATE shoes SET flash_deal_id=NULL,flash_deal_original_price_php=NULL,flash_deal_price_php=NULL,
    flash_deal_starts_at=NULL,flash_deal_ends_at=NULL WHERE id=d.listing_id AND flash_deal_id=d.id;
  UPDATE flash_deals SET ended_at=COALESCE(ended_at,NOW()) WHERE id=d.id;
END $$;

CREATE FUNCTION public.create_gp_coin_purchase(p_profile UUID,p_coins INTEGER,p_live BOOLEAN,p_return TEXT DEFAULT '/profile')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p gp_coin_purchases%ROWTYPE; w gp_coin_wallets%ROWTYPE;
BEGIN
  w := gp_coin_ensure_wallet(p_profile);
  IF w.locked_at IS NOT NULL THEN RAISE EXCEPTION 'Your wallet needs a payment review. Please contact support'; END IF;
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id=p_profile AND (is_verified OR is_admin)) THEN RAISE EXCEPTION 'Verify your account before buying promotion coins'; END IF;
  IF p_coins IS NULL OR p_coins NOT IN (40,100,200) OR p_live IS DISTINCT FROM (SELECT livemode FROM promotion_payment_settings WHERE id) THEN RAISE EXCEPTION 'Invalid coin purchase'; END IF;
  SELECT * INTO p FROM gp_coin_purchases WHERE profile_id=p_profile AND status IN ('creating','pending','review') AND paid_at IS NULL FOR UPDATE;
  IF p.id IS NOT NULL THEN RETURN to_jsonb(p)||jsonb_build_object('create_checkout',FALSE); END IF;
  IF (SELECT COUNT(*) FROM gp_coin_purchases WHERE profile_id=p_profile AND created_at>NOW()-INTERVAL '1 hour')>=10 THEN
    RAISE EXCEPTION 'You have started several checkouts. Please try again later';
  END IF;
  INSERT INTO gp_coin_purchases(profile_id,coins,amount_minor,livemode,return_path)
    VALUES(p_profile,p_coins,p_coins*50,p_live,p_return) RETURNING * INTO p;
  RETURN to_jsonb(p)||jsonb_build_object('create_checkout',TRUE);
END $$;

CREATE FUNCTION public.attach_gp_coin_checkout(p_id UUID,p_checkout TEXT,p_url TEXT,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_checkout IS NULL OR p_checkout !~ '^cs_[A-Za-z0-9]+$' OR p_url IS NULL OR p_url !~ '^https://checkout[.]paymongo[.]com/' THEN RAISE EXCEPTION 'Invalid checkout'; END IF;
  UPDATE gp_coin_purchases SET provider_checkout_id=p_checkout,checkout_url=p_url,status='pending',review_note=NULL
    WHERE id=p_id AND provider_checkout_id IS NULL AND paid_at IS NULL AND status IN ('creating','review') AND livemode=p_live;
  IF NOT FOUND THEN RAISE EXCEPTION 'Checkout attachment conflict'; END IF;
END $$;

CREATE FUNCTION public.fulfill_gp_coin_purchase(p_id UUID,p_checkout TEXT,p_payment TEXT,p_amount INTEGER,p_currency TEXT,p_live BOOLEAN,p_method TEXT DEFAULT NULL,p_review BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p gp_coin_purchases%ROWTYPE; tx gp_coin_transactions%ROWTYPE;
BEGIN
  -- Always lock wallet before the order; refund and checkout creation use this order.
  PERFORM gp_coin_ensure_wallet((SELECT profile_id FROM gp_coin_purchases WHERE id=p_id));
  SELECT * INTO p FROM gp_coin_purchases WHERE id=p_id FOR UPDATE;
  IF p.id IS NULL OR p_checkout IS NULL OR p_checkout !~ '^cs_[A-Za-z0-9]+$' OR p_payment IS NULL OR p_payment !~ '^pay_[A-Za-z0-9]+$'
    OR p_amount IS DISTINCT FROM p.amount_minor OR p_currency IS DISTINCT FROM p.currency OR p_live IS DISTINCT FROM p.livemode
    OR p_live IS DISTINCT FROM (SELECT livemode FROM promotion_payment_settings WHERE id)
    OR (p.provider_checkout_id IS NOT NULL AND p.provider_checkout_id IS DISTINCT FROM p_checkout)
    OR (p.provider_payment_id IS NOT NULL AND p.provider_payment_id IS DISTINCT FROM p_payment) THEN RAISE EXCEPTION 'Coin payment mismatch'; END IF;
  IF p.paid_at IS NOT NULL THEN RETURN; END IF;
  tx := gp_coin_apply_transaction(p.profile_id,'award',p.coins,0,'coin_purchase:'||p.id,NULL,NULL,NULL,NULL,
    jsonb_build_object('action','coin_purchase','purchase_id',p.id));
  -- infinity is intentional: bought coins never expire. Existing FIFO reward
  -- allocation spends earned coins before purchased ones without a second wallet.
  INSERT INTO gp_coin_award_buckets(profile_id,source_transaction_id,original_amount,remaining_amount,expires_at)
    VALUES(p.profile_id,tx.id,p.coins,p.coins,'infinity');
  UPDATE gp_coin_purchases SET status='paid',paid_at=NOW(),provider_checkout_id=p_checkout,provider_payment_id=p_payment,
    payment_method=p_method,credit_transaction_id=tx.id,review_note=NULL WHERE id=p.id;
  IF p_review THEN
    UPDATE gp_coin_purchases SET status='review',review_note='PayMongo reports a refund or dispute. Contact support for review.' WHERE id=p.id;
    UPDATE gp_coin_wallets SET locked_at=COALESCE(locked_at,NOW()),lock_reason='Coin payment review: '||p.id WHERE profile_id=p.profile_id;
  END IF;
END $$;

CREATE FUNCTION public.expire_gp_coin_purchase(p_id UUID,p_checkout TEXT,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE gp_coin_purchases SET status='expired',review_note=NULL WHERE id=p_id AND paid_at IS NULL
    AND provider_checkout_id IS NOT DISTINCT FROM p_checkout AND livemode=p_live;
END $$;

CREATE FUNCTION public.review_gp_coin_purchase(p_id UUID,p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p gp_coin_purchases%ROWTYPE;
BEGIN
  PERFORM gp_coin_ensure_wallet((SELECT profile_id FROM gp_coin_purchases WHERE id=p_id));
  UPDATE gp_coin_purchases SET status='review',review_note=left(p_note,1000) WHERE id=p_id AND status NOT IN ('refunded','expired') RETURNING * INTO p;
  IF p.paid_at IS NOT NULL THEN UPDATE gp_coin_wallets SET locked_at=COALESCE(locked_at,NOW()),lock_reason='Coin payment review: '||p.id WHERE profile_id=p.profile_id; END IF;
END $$;

CREATE FUNCTION public.record_gp_coin_purchase_refund(p_payment TEXT,p_refund TEXT,p_amount INTEGER,p_live BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p gp_coin_purchases%ROWTYPE; b gp_coin_award_buckets%ROWTYPE;
  total INTEGER; reverse INTEGER; available INTEGER; take INTEGER;
BEGIN
  SELECT * INTO p FROM gp_coin_purchases WHERE provider_payment_id=p_payment;
  IF p.id IS NULL THEN RETURN; END IF;
  PERFORM gp_coin_ensure_wallet(p.profile_id);
  SELECT * INTO p FROM gp_coin_purchases WHERE id=p.id FOR UPDATE;
  IF p_live IS DISTINCT FROM p.livemode OR p.paid_at IS NULL OR p_amount IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM gp_coin_purchase_refunds WHERE provider_refund_id=p_refund AND (purchase_id<>p.id OR amount_minor<>p_amount)) THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
  INSERT INTO gp_coin_purchase_refunds VALUES(p_refund,p.id,p_amount,NOW()) ON CONFLICT DO NOTHING;
  SELECT SUM(amount_minor) INTO total FROM gp_coin_purchase_refunds WHERE purchase_id=p.id;
  IF total>p.amount_minor THEN RAISE EXCEPTION 'Refund exceeds payment'; END IF;
  reverse := CEIL(total::NUMERIC/50)::INTEGER - p.reversed_coins;
  IF reverse>0 THEN
    SELECT * INTO b FROM gp_coin_award_buckets WHERE source_transaction_id=p.credit_transaction_id FOR UPDATE;
    take := LEAST(reverse,COALESCE(b.remaining_amount,0));
    UPDATE gp_coin_award_buckets SET remaining_amount=remaining_amount-take WHERE id=b.id;
    -- Negative balances explicitly represent spent/refunded credits. Future
    -- earnings repay the deficit; locked wallets cannot spend or buy more.
    PERFORM gp_coin_apply_transaction(p.profile_id,'reversal',-reverse,0,'coin_purchase_refund:'||p.id||':'||total,
      NULL,NULL,p.credit_transaction_id,NULL,jsonb_build_object('action','coin_purchase_refund','purchase_id',p.id));
    IF take<reverse OR b.reserved_amount>0 THEN
      UPDATE gp_coin_wallets SET locked_at=COALESCE(locked_at,NOW()),lock_reason='Refunded coins were already used or reserved: '||p.id WHERE profile_id=p.profile_id;
    END IF;
  END IF;
  UPDATE gp_coin_purchases SET refunded_amount_minor=total,reversed_coins=CEIL(total::NUMERIC/50)::INTEGER,
    status=CASE WHEN total=amount_minor THEN 'refunded' ELSE 'review' END,
    review_note='Refund confirmed by PayMongo. Refunded coin credits removed.' WHERE id=p.id;
END $$;

-- Financial mutations are service-only; the browser can read its own history.
ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_coin_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_coin_purchase_refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_flash_deals ON public.flash_deals FOR SELECT TO authenticated USING(seller_id=gp_coin_current_profile_id() OR gp_coin_is_admin());
CREATE POLICY own_coin_purchases ON public.gp_coin_purchases FOR SELECT TO authenticated USING(profile_id=gp_coin_current_profile_id() OR gp_coin_is_admin());
REVOKE ALL ON public.flash_deals,public.listing_price_history,public.gp_coin_purchases,public.gp_coin_purchase_refunds FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.flash_deals,public.gp_coin_purchases TO authenticated;
GRANT ALL ON public.flash_deals,public.listing_price_history,public.gp_coin_purchases,public.gp_coin_purchase_refunds TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.listing_price_history_id_seq TO service_role;

REVOKE ALL ON FUNCTION public.flash_deal_reference_price(UUID),public.start_flash_deal(UUID,UUID,NUMERIC,UUID),public.end_flash_deal(UUID,UUID),
  public.create_gp_coin_purchase(UUID,INTEGER,BOOLEAN,TEXT),public.attach_gp_coin_checkout(UUID,TEXT,TEXT,BOOLEAN),
  public.fulfill_gp_coin_purchase(UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,BOOLEAN),public.expire_gp_coin_purchase(UUID,TEXT,BOOLEAN),
  public.review_gp_coin_purchase(UUID,TEXT),public.record_gp_coin_purchase_refund(TEXT,TEXT,INTEGER,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flash_deal_reference_price(UUID),public.start_flash_deal(UUID,UUID,NUMERIC,UUID),public.end_flash_deal(UUID,UUID),
  public.create_gp_coin_purchase(UUID,INTEGER,BOOLEAN,TEXT),public.attach_gp_coin_checkout(UUID,TEXT,TEXT,BOOLEAN),
  public.fulfill_gp_coin_purchase(UUID,TEXT,TEXT,INTEGER,TEXT,BOOLEAN,TEXT,BOOLEAN),public.expire_gp_coin_purchase(UUID,TEXT,BOOLEAN),
  public.review_gp_coin_purchase(UUID,TEXT),public.record_gp_coin_purchase_refund(TEXT,TEXT,INTEGER,BOOLEAN) TO service_role;

-- Existing wallet and offer functions are updated below in this transaction.

CREATE OR REPLACE FUNCTION gp_coin_apply_transaction(
  p_profile_id UUID,
  p_transaction_type gp_coin_transaction_type,
  p_available_delta INTEGER,
  p_reserved_delta INTEGER,
  p_idempotency_key TEXT,
  p_listing_id UUID DEFAULT NULL,
  p_featured_order_id UUID DEFAULT NULL,
  p_related_transaction_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS gp_coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing gp_coin_transactions%ROWTYPE;
  v_wallet gp_coin_wallets%ROWTYPE;
  v_tx gp_coin_transactions%ROWTYPE;
  v_amount INTEGER;
BEGIN
  SELECT * INTO v_existing
  FROM gp_coin_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  v_wallet := gp_coin_ensure_wallet(p_profile_id);
  -- Recheck after acquiring the wallet lock, including concurrent retries.
  SELECT * INTO v_existing FROM gp_coin_transactions WHERE idempotency_key=p_idempotency_key;
  IF v_existing.id IS NOT NULL THEN RETURN v_existing; END IF;
  IF v_wallet.locked_at IS NOT NULL AND p_transaction_type IN ('hold','spend') THEN
    RAISE EXCEPTION 'Your wallet needs a payment review. Please contact support';
  END IF;

  IF v_wallet.reserved_balance + p_reserved_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient reserved GP Coins';
  END IF;

  UPDATE gp_coin_wallets
     SET available_balance = available_balance + p_available_delta,
         reserved_balance = reserved_balance + p_reserved_delta
   WHERE profile_id = p_profile_id
   RETURNING * INTO v_wallet;

  v_amount := GREATEST(ABS(p_available_delta), ABS(p_reserved_delta));

  INSERT INTO gp_coin_transactions (
    profile_id,
    transaction_type,
    amount_coins,
    available_delta,
    reserved_delta,
    available_balance_after,
    reserved_balance_after,
    idempotency_key,
    listing_id,
    featured_order_id,
    related_transaction_id,
    expires_at,
    metadata
  )
  VALUES (
    p_profile_id,
    p_transaction_type,
    v_amount,
    p_available_delta,
    p_reserved_delta,
    v_wallet.available_balance,
    v_wallet.reserved_balance,
    p_idempotency_key,
    p_listing_id,
    p_featured_order_id,
    p_related_transaction_id,
    p_expires_at,
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;


CREATE OR REPLACE FUNCTION public.marketplace_submit_offer(p_listing UUID, p_client UUID, p_message TEXT DEFAULT NULL, p_price NUMERIC DEFAULT NULL,
  p_variant UUID DEFAULT NULL, p_request UUID DEFAULT NULL, p_expected_version INTEGER DEFAULT NULL)
RETURNS public.purchase_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); s public.shoes; r public.purchase_requests; previous UUID; thread UUID; v public.shoe_variants;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_client IS NULL OR char_length(COALESCE(btrim(p_message), '')) > 2000 THEN RAISE EXCEPTION 'Invalid request'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('marketplace-offer:' || actor::TEXT, 0));
  SELECT request_id INTO previous FROM public.purchase_request_attempts WHERE actor_id = actor AND client_id = p_client;
  IF previous IS NOT NULL THEN
    SELECT * INTO r FROM public.purchase_requests WHERE id = previous;
    IF r.listing_id <> p_listing THEN RAISE EXCEPTION 'Retry key already used'; END IF;
    RETURN r;
  END IF;
  SELECT * INTO s FROM public.shoes WHERE id = p_listing FOR UPDATE;
  -- The regular asking price stays intact. Apply a flash price only while
  -- its real time window is live, under the same listing lock as the offer.
  IF s.flash_deal_id IS NOT NULL AND s.flash_deal_starts_at <= NOW() AND s.flash_deal_ends_at > NOW()
    AND s.flash_deal_price_php > 0 AND s.flash_deal_price_php < s.price_php THEN
    s.price_php := s.flash_deal_price_php;
  END IF;
  IF s.id IS NULL OR s.seller_id = actor THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
  PERFORM public.chat_pair_lock(actor, s.seller_id);
  IF public.chat_is_blocked(actor, s.seller_id) THEN RAISE EXCEPTION 'Requests are unavailable between these accounts'; END IF;
  -- Return an existing reservation even when the listing has become reserved.
  IF p_request IS NULL THEN
    SELECT * INTO r FROM public.purchase_requests WHERE listing_id = s.id AND buyer_id = actor
      AND variant_id IS NOT DISTINCT FROM p_variant AND status IN ('pending', 'accepted') ORDER BY (status = 'accepted') DESC, created_at DESC LIMIT 1;
    IF r.id IS NOT NULL THEN
      INSERT INTO public.purchase_request_attempts VALUES (actor, p_client, r.id);
      RETURN r;
    END IF;
  END IF;
  IF s.status::TEXT <> 'active' OR NOT s.has_stock THEN RAISE EXCEPTION 'These shoes are no longer available'; END IF;
  IF s.inventory_mode = 'multi' THEN
    SELECT * INTO v FROM public.shoe_variants WHERE id = p_variant AND shoe_id = s.id FOR UPDATE;
    IF v.id IS NULL OR v.quantity <= 0 THEN RAISE EXCEPTION 'Please choose an available size'; END IF;
  ELSIF p_variant IS NOT NULL THEN RAISE EXCEPTION 'This listing does not use size variants'; END IF;
  IF s.listing_type::TEXT = 'donate' THEN
    IF p_price IS NOT NULL THEN RAISE EXCEPTION 'Free shoes do not have an offer price'; END IF;
  ELSE
    IF s.price_php IS NULL OR s.price_php <= 0 THEN RAISE EXCEPTION 'Listing price unavailable'; END IF;
    IF p_price IS NOT NULL AND (p_price <= 0 OR p_price > 99999999.99 OR p_price <> round(p_price, 2)) THEN RAISE EXCEPTION 'Enter a valid offer amount'; END IF;
    IF NOT s.is_negotiable AND p_price IS NOT NULL AND p_price <> s.price_php THEN RAISE EXCEPTION 'This listing has a fixed price'; END IF;
  END IF;
  thread := public.chat_ensure_conversation(s.id, actor);
  IF p_request IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.chat_messages WHERE sender_id = actor AND kind = 'offer' AND created_at > NOW() - INTERVAL '1 minute') >= 30 THEN
      RAISE EXCEPTION 'You have updated several offers. Please try again in a minute';
    END IF;
    SELECT * INTO r FROM public.purchase_requests WHERE id = p_request FOR UPDATE;
    IF r.id IS NULL OR r.buyer_id <> actor OR r.listing_id <> s.id OR r.variant_id IS DISTINCT FROM p_variant OR r.status <> 'pending' THEN RAISE EXCEPTION 'This offer can no longer be changed'; END IF;
    IF p_expected_version IS NULL OR r.version <> p_expected_version THEN RAISE EXCEPTION 'This offer changed. Refresh before updating it'; END IF;
    UPDATE public.purchase_requests SET offer_price_php = CASE WHEN s.listing_type::TEXT = 'donate' THEN NULL ELSE COALESCE(p_price, s.price_php) END,
      version = version + 1 WHERE id = r.id RETURNING * INTO r;
    IF NULLIF(btrim(p_message), '') IS NOT NULL THEN PERFORM public.chat_append(thread, actor, p_message); END IF;
  ELSE
    IF (SELECT COUNT(*) FROM public.purchase_requests WHERE buyer_id = actor AND created_at > NOW() - INTERVAL '1 hour') >= 30 THEN RAISE EXCEPTION 'You have sent several requests. Please try again later'; END IF;
    INSERT INTO public.purchase_requests (listing_id, buyer_id, message, offer_price_php, variant_id, listed_price_php, conversation_id)
      VALUES (s.id, actor, NULLIF(btrim(p_message), ''), CASE WHEN s.listing_type::TEXT = 'donate' THEN NULL ELSE COALESCE(p_price, s.price_php) END, p_variant, s.price_php, thread)
      RETURNING * INTO r;
  END IF;
  INSERT INTO public.purchase_request_attempts VALUES (actor, p_client, r.id);
  RETURN r;
END;
$$;


-- Do not sell an overlapping promotion, or expire purchased credits after a refund.
CREATE OR REPLACE FUNCTION create_promotion_checkout(p_seller UUID, p_listing UUID, p_placement TEXT,
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
  IF l.flash_deal_id IS NOT NULL AND l.flash_deal_ends_at>NOW() THEN RAISE EXCEPTION 'End your flash deal before promoting these shoes again'; END IF;

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


CREATE OR REPLACE FUNCTION refund_featured_payment_coins(p_order UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE f featured_promotion_orders%ROWTYPE; tx gp_coin_transactions%ROWTYPE;
BEGIN
  SELECT * INTO f FROM featured_promotion_orders WHERE id = p_order FOR UPDATE;
  IF f.coins_used <= 0 THEN RETURN; END IF;
  IF f.coins_spent_at IS NULL THEN PERFORM gp_coin_release_featured_order(f.id,'Placement refund'); RETURN; END IF;
  IF EXISTS (SELECT 1 FROM gp_coin_transactions WHERE idempotency_key = 'promotion_coin_refund:' || f.id) THEN RETURN; END IF;
  tx := gp_coin_apply_transaction(f.seller_id,'refund',f.coins_used,0,'promotion_coin_refund:' || f.id,
    f.listing_id,f.id,NULL,CASE WHEN EXISTS(SELECT 1 FROM gp_coin_hold_allocations a JOIN gp_coin_award_buckets b ON b.id=a.bucket_id WHERE a.featured_order_id=f.id AND b.expires_at='infinity'::TIMESTAMPTZ) THEN 'infinity'::TIMESTAMPTZ ELSE NOW() + INTERVAL '6 months' END,jsonb_build_object('reason','Promotion refunded'));
  INSERT INTO gp_coin_award_buckets(profile_id,source_transaction_id,original_amount,remaining_amount,expires_at)
    VALUES(f.seller_id,tx.id,f.coins_used,f.coins_used,tx.expires_at);
END $$;


COMMIT;
