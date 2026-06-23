-- GoPair Coins wallet, ledger, reward rules, and Featured redemption.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

DO $$
BEGIN
  CREATE TYPE gp_coin_transaction_type AS ENUM (
    'award',
    'hold',
    'spend',
    'release',
    'refund',
    'expiration',
    'reversal',
    'admin_adjustment'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE gp_coin_pending_award_status AS ENUM (
    'pending',
    'awarded',
    'skipped',
    'reversed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS gp_coin_wallets (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance INTEGER NOT NULL DEFAULT 0,
  reserved_balance INTEGER NOT NULL DEFAULT 0 CHECK (reserved_balance >= 0),
  locked_at TIMESTAMPTZ,
  lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS gp_coin_wallets_updated_at ON gp_coin_wallets;
CREATE TRIGGER gp_coin_wallets_updated_at
  BEFORE UPDATE ON gp_coin_wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS gp_coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type gp_coin_transaction_type NOT NULL,
  amount_coins INTEGER NOT NULL CHECK (amount_coins >= 0),
  available_delta INTEGER NOT NULL DEFAULT 0,
  reserved_delta INTEGER NOT NULL DEFAULT 0,
  available_balance_after INTEGER NOT NULL,
  reserved_balance_after INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  listing_id UUID REFERENCES shoes(id) ON DELETE SET NULL,
  featured_order_id UUID REFERENCES featured_promotion_orders(id) ON DELETE SET NULL,
  related_transaction_id UUID REFERENCES gp_coin_transactions(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gp_coin_transactions_profile_created_idx
  ON gp_coin_transactions (profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS gp_coin_transactions_listing_idx
  ON gp_coin_transactions (listing_id)
  WHERE listing_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gp_coin_award_buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_transaction_id UUID NOT NULL UNIQUE REFERENCES gp_coin_transactions(id) ON DELETE CASCADE,
  original_amount INTEGER NOT NULL CHECK (original_amount > 0),
  remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
  reserved_amount INTEGER NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (remaining_amount + reserved_amount <= original_amount)
);

CREATE INDEX IF NOT EXISTS gp_coin_award_buckets_expiry_idx
  ON gp_coin_award_buckets (profile_id, expires_at)
  WHERE remaining_amount > 0 OR reserved_amount > 0;

CREATE TABLE IF NOT EXISTS gp_coin_hold_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  featured_order_id UUID NOT NULL REFERENCES featured_promotion_orders(id) ON DELETE CASCADE,
  bucket_id UUID NOT NULL REFERENCES gp_coin_award_buckets(id) ON DELETE CASCADE,
  amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
  spent_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (featured_order_id, bucket_id)
);

CREATE TABLE IF NOT EXISTS gp_coin_pending_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES shoes(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  amount_coins INTEGER NOT NULL CHECK (amount_coins > 0),
  eligible_at TIMESTAMPTZ NOT NULL,
  status gp_coin_pending_award_status NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMPTZ,
  skip_reason TEXT,
  transaction_id UUID REFERENCES gp_coin_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gp_coin_pending_awards_due_idx
  ON gp_coin_pending_awards (eligible_at)
  WHERE status = 'pending';

ALTER TABLE featured_promotion_orders
  ADD COLUMN IF NOT EXISTS coins_used INTEGER NOT NULL DEFAULT 0 CHECK (coins_used >= 0),
  ADD COLUMN IF NOT EXISTS coin_discount_php INTEGER NOT NULL DEFAULT 0 CHECK (coin_discount_php >= 0),
  ADD COLUMN IF NOT EXISTS cash_amount_php INTEGER NOT NULL DEFAULT 0 CHECK (cash_amount_php >= 0),
  ADD COLUMN IF NOT EXISTS coin_payment_mode TEXT NOT NULL DEFAULT 'cash_only'
    CHECK (coin_payment_mode IN ('cash_only', 'mixed', 'coins_only')),
  ADD COLUMN IF NOT EXISTS coins_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coins_spent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coins_released_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION gp_coin_current_profile_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION gp_coin_is_admin_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = p_profile_id), FALSE);
$$;

CREATE OR REPLACE FUNCTION gp_coin_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION gp_coin_manila_day(p_value TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (p_value AT TIME ZONE 'Asia/Manila')::DATE;
$$;

CREATE OR REPLACE FUNCTION gp_coin_month_key(p_value TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT to_char(p_value AT TIME ZONE 'Asia/Manila', 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION gp_coin_ensure_wallet(p_profile_id UUID)
RETURNS gp_coin_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet gp_coin_wallets%ROWTYPE;
BEGIN
  INSERT INTO gp_coin_wallets (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  SELECT * INTO v_wallet
  FROM gp_coin_wallets
  WHERE profile_id = p_profile_id
  FOR UPDATE;

  RETURN v_wallet;
END;
$$;

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

CREATE OR REPLACE FUNCTION gp_coin_award(
  p_profile_id UUID,
  p_amount INTEGER,
  p_idempotency_key TEXT,
  p_listing_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS gp_coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx gp_coin_transactions%ROWTYPE;
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '6 months';
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'GP Coin award must be positive';
  END IF;
  IF gp_coin_is_admin_profile(p_profile_id) THEN
    RAISE EXCEPTION 'Admin accounts do not earn GP Coins';
  END IF;

  v_tx := gp_coin_apply_transaction(
    p_profile_id,
    'award',
    p_amount,
    0,
    p_idempotency_key,
    p_listing_id,
    NULL,
    NULL,
    v_expires_at,
    p_metadata
  );

  INSERT INTO gp_coin_award_buckets (
    profile_id,
    source_transaction_id,
    original_amount,
    remaining_amount,
    expires_at
  )
  VALUES (
    p_profile_id,
    v_tx.id,
    p_amount,
    p_amount,
    v_expires_at
  )
  ON CONFLICT (source_transaction_id) DO NOTHING;

  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_schedule_listing_publish_award(p_listing_id UUID)
RETURNS gp_coin_pending_awards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_pending gp_coin_pending_awards%ROWTYPE;
BEGIN
  SELECT s.id, s.seller_id, s.created_at, p.is_admin
    INTO v_listing
    FROM shoes s
    JOIN profiles p ON p.id = s.seller_id
   WHERE s.id = p_listing_id;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF COALESCE(v_listing.is_admin, FALSE) THEN
    RAISE EXCEPTION 'Admin accounts do not earn GP Coins';
  END IF;

  INSERT INTO gp_coin_pending_awards (
    profile_id,
    listing_id,
    action,
    amount_coins,
    eligible_at,
    idempotency_key
  )
  VALUES (
    v_listing.seller_id,
    v_listing.id,
    'listing_publish',
    10,
    NOW() + INTERVAL '1 hour',
    'listing_publish_pending:' || v_listing.id
  )
  ON CONFLICT (idempotency_key) DO UPDATE
    SET listing_id = EXCLUDED.listing_id
  RETURNING * INTO v_pending;

  RETURN v_pending;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_process_pending_awards()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending gp_coin_pending_awards%ROWTYPE;
  v_listing RECORD;
  v_day DATE;
  v_tx gp_coin_transactions%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  FOR v_pending IN
    SELECT *
      FROM gp_coin_pending_awards
     WHERE status = 'pending'
       AND eligible_at <= NOW()
     ORDER BY eligible_at ASC
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT s.id, s.seller_id, s.status, s.quality_flagged_at, p.is_admin
      INTO v_listing
      FROM shoes s
      JOIN profiles p ON p.id = s.seller_id
     WHERE s.id = v_pending.listing_id;

    IF v_listing.id IS NULL THEN
      UPDATE gp_coin_pending_awards
         SET status = 'skipped', processed_at = NOW(), skip_reason = 'listing_missing'
       WHERE id = v_pending.id;
      CONTINUE;
    END IF;

    v_day := gp_coin_manila_day(v_pending.created_at);

    IF v_listing.status <> 'active' THEN
      UPDATE gp_coin_pending_awards SET status = 'skipped', processed_at = NOW(), skip_reason = 'listing_not_active' WHERE id = v_pending.id;
      CONTINUE;
    ELSIF v_listing.quality_flagged_at IS NOT NULL THEN
      UPDATE gp_coin_pending_awards SET status = 'skipped', processed_at = NOW(), skip_reason = 'quality_flagged' WHERE id = v_pending.id;
      CONTINUE;
    ELSIF COALESCE(v_listing.is_admin, FALSE) THEN
      UPDATE gp_coin_pending_awards SET status = 'skipped', processed_at = NOW(), skip_reason = 'admin_account' WHERE id = v_pending.id;
      CONTINUE;
    ELSIF EXISTS (
      SELECT 1
        FROM gp_coin_transactions
       WHERE profile_id = v_pending.profile_id
         AND transaction_type = 'award'
         AND metadata->>'action' = 'listing_publish'
         AND gp_coin_manila_day(created_at) = v_day
    ) THEN
      UPDATE gp_coin_pending_awards SET status = 'skipped', processed_at = NOW(), skip_reason = 'daily_publish_cap' WHERE id = v_pending.id;
      CONTINUE;
    END IF;

    v_tx := gp_coin_award(
      v_pending.profile_id,
      v_pending.amount_coins,
      'listing_publish_award:' || v_pending.listing_id,
      v_pending.listing_id,
      jsonb_build_object('action', 'listing_publish', 'manila_day', v_day)
    );

    UPDATE gp_coin_pending_awards
       SET status = 'awarded', processed_at = NOW(), transaction_id = v_tx.id
     WHERE id = v_pending.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_award_listing_renewal(
  p_listing_id UUID,
  p_idempotency_key TEXT
)
RETURNS gp_coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
BEGIN
  SELECT s.id, s.seller_id, s.status, p.is_admin
    INTO v_listing
    FROM shoes s
    JOIN profiles p ON p.id = s.seller_id
   WHERE s.id = p_listing_id;

  IF v_listing.id IS NULL OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible for renewal coins';
  END IF;
  IF COALESCE(v_listing.is_admin, FALSE) THEN
    RAISE EXCEPTION 'Admin accounts do not earn GP Coins';
  END IF;

  RETURN gp_coin_award(
    v_listing.seller_id,
    6,
    p_idempotency_key,
    p_listing_id,
    jsonb_build_object('action', 'listing_renewal')
  );
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_award_share_action(
  p_listing_id UUID,
  p_action TEXT
)
RETURNS gp_coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID := gp_coin_current_profile_id();
  v_listing RECORD;
  v_day DATE := gp_coin_manila_day(NOW());
  v_amount INTEGER;
  v_daily_total INTEGER;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_action = 'caption_copy' THEN
    v_amount := 1;
  ELSIF p_action = 'image_download' THEN
    v_amount := 1;
  ELSIF p_action = 'fb_group_open' THEN
    v_amount := 3;
  ELSE
    RAISE EXCEPTION 'Unsupported share action';
  END IF;

  SELECT id, seller_id, status
    INTO v_listing
    FROM shoes
   WHERE id = p_listing_id;

  IF v_listing.id IS NULL OR v_listing.seller_id <> v_profile_id OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Only active owned listings can earn share coins';
  END IF;
  IF gp_coin_is_admin_profile(v_profile_id) THEN
    RAISE EXCEPTION 'Admin accounts do not earn GP Coins';
  END IF;

  SELECT COALESCE(SUM(amount_coins), 0) INTO v_daily_total
    FROM gp_coin_transactions
   WHERE profile_id = v_profile_id
     AND transaction_type = 'award'
     AND metadata->>'action' IN ('caption_copy', 'image_download', 'fb_group_open')
     AND metadata->>'manila_day' = v_day::TEXT;

  IF v_daily_total >= 5 THEN
    RAISE EXCEPTION 'Daily GP Coin share limit reached';
  END IF;

  v_amount := LEAST(v_amount, 5 - v_daily_total);

  RETURN gp_coin_award(
    v_profile_id,
    v_amount,
    'share_action:' || p_action || ':' || v_profile_id || ':' || p_listing_id || ':' || v_day,
    p_listing_id,
    jsonb_build_object('action', p_action, 'manila_day', v_day, 'daily_cap', 5)
  );
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_reverse_listing_rewards(
  p_listing_id UUID,
  p_reason TEXT DEFAULT 'Listing reward reversed'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN := gp_coin_is_admin();
  v_tx gp_coin_transactions%ROWTYPE;
  v_reversed INTEGER := 0;
BEGIN
  IF NOT v_admin THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  FOR v_tx IN
    SELECT *
      FROM gp_coin_transactions
     WHERE listing_id = p_listing_id
       AND transaction_type = 'award'
       AND metadata->>'action' IN ('listing_publish', 'listing_renewal')
       AND NOT EXISTS (
         SELECT 1
           FROM gp_coin_transactions reversal
          WHERE reversal.related_transaction_id = gp_coin_transactions.id
            AND reversal.transaction_type = 'reversal'
       )
     ORDER BY created_at ASC
  LOOP
    PERFORM gp_coin_apply_transaction(
      v_tx.profile_id,
      'reversal',
      -v_tx.amount_coins,
      0,
      'reverse_reward:' || v_tx.id,
      p_listing_id,
      NULL,
      v_tx.id,
      NULL,
      jsonb_build_object('reason', p_reason)
    );

    UPDATE gp_coin_award_buckets
       SET remaining_amount = 0,
           reserved_amount = 0
     WHERE source_transaction_id = v_tx.id;

    v_reversed := v_reversed + 1;
  END LOOP;

  UPDATE gp_coin_pending_awards
     SET status = 'reversed', processed_at = COALESCE(processed_at, NOW()), skip_reason = p_reason
   WHERE listing_id = p_listing_id
     AND status IN ('pending', 'awarded');

  RETURN v_reversed;
END;
$$;

CREATE OR REPLACE FUNCTION admin_flag_listing_quality(
  p_listing_id UUID,
  p_reasons TEXT[],
  p_note TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_profile_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  SELECT id, is_admin
  INTO v_admin_profile_id, v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE shoes
  SET
    quality_flagged_at = NOW(),
    quality_flagged_by = v_admin_profile_id,
    quality_flag_reasons = COALESCE(p_reasons, ARRAY[]::TEXT[]),
    quality_flag_note = NULLIF(BTRIM(COALESCE(p_note, '')), ''),
    updated_at = NOW()
  WHERE id = p_listing_id;

  PERFORM gp_coin_reverse_listing_rewards(
    p_listing_id,
    'Listing quality flag: ' || COALESCE(array_to_string(p_reasons, ', '), 'quality review')
  );
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_expire_available(p_profile_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket gp_coin_award_buckets%ROWTYPE;
  v_expired INTEGER := 0;
BEGIN
  FOR v_bucket IN
    SELECT *
      FROM gp_coin_award_buckets
     WHERE remaining_amount > 0
       AND expires_at <= NOW()
       AND (p_profile_id IS NULL OR profile_id = p_profile_id)
     ORDER BY expires_at ASC
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM gp_coin_apply_transaction(
      v_bucket.profile_id,
      'expiration',
      -v_bucket.remaining_amount,
      0,
      'expire_bucket:' || v_bucket.id,
      NULL,
      NULL,
      v_bucket.source_transaction_id,
      NULL,
      jsonb_build_object('bucket_id', v_bucket.id)
    );

    v_expired := v_expired + v_bucket.remaining_amount;

    UPDATE gp_coin_award_buckets
       SET remaining_amount = 0
     WHERE id = v_bucket.id;
  END LOOP;

  RETURN v_expired;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_reserve_for_featured_order(
  p_order_id UUID,
  p_coins INTEGER
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order featured_promotion_orders%ROWTYPE;
  v_wallet gp_coin_wallets%ROWTYPE;
  v_bucket gp_coin_award_buckets%ROWTYPE;
  v_remaining INTEGER;
  v_take INTEGER;
BEGIN
  SELECT *
    INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Featured order not found';
  END IF;
  IF p_coins <= 0 THEN
    RETURN v_order;
  END IF;
  IF p_coins % 2 <> 0 THEN
    RAISE EXCEPTION 'Use an even GP Coin amount';
  END IF;
  IF v_order.coins_used > 0 THEN
    RAISE EXCEPTION 'GP Coins are already reserved for this order';
  END IF;
  IF p_coins > v_order.price_php * 2 THEN
    RAISE EXCEPTION 'GP Coins cannot exceed the Featured price';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM featured_promotion_orders
     WHERE seller_id = v_order.seller_id
       AND coin_payment_mode = 'coins_only'
       AND status IN ('queued', 'active', 'completed')
       AND created_at >= NOW() - INTERVAL '30 days'
  ) AND p_coins = v_order.price_php * 2 THEN
    RAISE EXCEPTION 'Full GP Coin Featured payment is limited to once every 30 days';
  END IF;

  PERFORM gp_coin_expire_available(v_order.seller_id);
  v_wallet := gp_coin_ensure_wallet(v_order.seller_id);
  IF v_wallet.available_balance < p_coins THEN
    RAISE EXCEPTION 'Insufficient GP Coin balance';
  END IF;
  IF v_wallet.available_balance < 0 THEN
    RAISE EXCEPTION 'GP Coin balance must be zero or above to redeem';
  END IF;

  PERFORM gp_coin_apply_transaction(
    v_order.seller_id,
    'hold',
    -p_coins,
    p_coins,
    'featured_hold:' || p_order_id,
    v_order.listing_id,
    p_order_id,
    NULL,
    NULL,
    jsonb_build_object('price_php', v_order.price_php)
  );

  v_remaining := p_coins;
  FOR v_bucket IN
    SELECT *
      FROM gp_coin_award_buckets
     WHERE profile_id = v_order.seller_id
       AND remaining_amount > 0
       AND expires_at > NOW()
     ORDER BY expires_at ASC, created_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(v_bucket.remaining_amount, v_remaining);

    UPDATE gp_coin_award_buckets
       SET remaining_amount = remaining_amount - v_take,
           reserved_amount = reserved_amount + v_take
     WHERE id = v_bucket.id;

    INSERT INTO gp_coin_hold_allocations (featured_order_id, bucket_id, amount_coins)
    VALUES (p_order_id, v_bucket.id, v_take)
    ON CONFLICT (featured_order_id, bucket_id) DO UPDATE
      SET amount_coins = gp_coin_hold_allocations.amount_coins + EXCLUDED.amount_coins;

    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Could not reserve GP Coins';
  END IF;

  UPDATE featured_promotion_orders
     SET coins_used = p_coins,
         coin_discount_php = p_coins / 2,
         cash_amount_php = price_php - (p_coins / 2),
         coin_payment_mode = CASE
           WHEN p_coins = price_php * 2 THEN 'coins_only'
           ELSE 'mixed'
         END,
         coins_reserved_at = NOW()
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_release_featured_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Featured coin hold released'
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order featured_promotion_orders%ROWTYPE;
  v_alloc RECORD;
  v_total INTEGER := 0;
  v_returned INTEGER := 0;
BEGIN
  SELECT *
    INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL OR v_order.coins_used <= 0 OR v_order.coins_spent_at IS NOT NULL OR v_order.coins_released_at IS NOT NULL THEN
    RETURN v_order;
  END IF;

  FOR v_alloc IN
    SELECT *
      FROM gp_coin_hold_allocations
     WHERE featured_order_id = p_order_id
       AND spent_at IS NULL
       AND released_at IS NULL
     FOR UPDATE
  LOOP
    UPDATE gp_coin_award_buckets
       SET reserved_amount = GREATEST(0, reserved_amount - v_alloc.amount_coins),
           remaining_amount = CASE
             WHEN expires_at > NOW() THEN remaining_amount + v_alloc.amount_coins
             ELSE remaining_amount
           END
     WHERE id = v_alloc.bucket_id;

    UPDATE gp_coin_hold_allocations
       SET released_at = NOW()
     WHERE id = v_alloc.id;

    v_total := v_total + v_alloc.amount_coins;
    IF EXISTS (
      SELECT 1 FROM gp_coin_award_buckets
      WHERE id = v_alloc.bucket_id
        AND expires_at > NOW()
    ) THEN
      v_returned := v_returned + v_alloc.amount_coins;
    END IF;
  END LOOP;

  IF v_total > 0 THEN
    PERFORM gp_coin_apply_transaction(
      v_order.seller_id,
      'release',
      v_returned,
      -v_total,
      'featured_release:' || p_order_id,
      v_order.listing_id,
      p_order_id,
      NULL,
      NULL,
      jsonb_build_object('reason', p_reason, 'expired_while_reserved', v_total - v_returned)
    );
  END IF;

  UPDATE featured_promotion_orders
     SET coins_released_at = NOW()
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_spend_featured_order(p_order_id UUID)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order featured_promotion_orders%ROWTYPE;
BEGIN
  SELECT *
    INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL OR v_order.coins_used <= 0 OR v_order.coins_spent_at IS NOT NULL THEN
    RETURN v_order;
  END IF;

  PERFORM gp_coin_apply_transaction(
    v_order.seller_id,
    'spend',
    0,
    -v_order.coins_used,
    'featured_spend:' || p_order_id,
    v_order.listing_id,
    p_order_id,
    NULL,
    NULL,
    jsonb_build_object('price_php', v_order.price_php, 'discount_php', v_order.coin_discount_php)
  );

  UPDATE gp_coin_award_buckets bucket
     SET reserved_amount = GREATEST(0, bucket.reserved_amount - alloc.amount_coins)
    FROM gp_coin_hold_allocations alloc
   WHERE alloc.featured_order_id = p_order_id
     AND alloc.bucket_id = bucket.id
     AND alloc.spent_at IS NULL
     AND alloc.released_at IS NULL;

  UPDATE gp_coin_hold_allocations
     SET spent_at = NOW()
   WHERE featured_order_id = p_order_id
     AND spent_at IS NULL
     AND released_at IS NULL;

  UPDATE featured_promotion_orders
     SET coins_spent_at = NOW()
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_admin_adjust(
  p_profile_id UUID,
  p_amount_delta INTEGER,
  p_reason TEXT
)
RETURNS gp_coin_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx gp_coin_transactions%ROWTYPE;
BEGIN
  IF NOT gp_coin_is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;
  IF p_amount_delta = 0 THEN
    RAISE EXCEPTION 'Adjustment amount cannot be zero';
  END IF;

  v_tx := gp_coin_apply_transaction(
    p_profile_id,
    'admin_adjustment',
    p_amount_delta,
    0,
    'admin_adjustment:' || p_profile_id || ':' || replace(gen_random_uuid()::TEXT, '-', ''),
    NULL,
    NULL,
    NULL,
    CASE WHEN p_amount_delta > 0 THEN NOW() + INTERVAL '6 months' ELSE NULL END,
    jsonb_build_object('reason', p_reason)
  );

  IF p_amount_delta > 0 THEN
    INSERT INTO gp_coin_award_buckets (
      profile_id,
      source_transaction_id,
      original_amount,
      remaining_amount,
      expires_at
    )
    VALUES (p_profile_id, v_tx.id, p_amount_delta, p_amount_delta, v_tx.expires_at);
  END IF;

  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION create_featured_paid_reservation(
  p_listing_id UUID,
  p_duration_days INTEGER,
  p_price_php INTEGER,
  p_coins_to_use INTEGER DEFAULT 0
)
RETURNS featured_promotion_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_listing RECORD;
  v_start TIMESTAMPTZ;
  v_order featured_promotion_orders%ROWTYPE;
  v_existing_count INTEGER;
BEGIN
  IF p_duration_days NOT IN (7, 30) THEN
    RAISE EXCEPTION 'Invalid Featured duration';
  END IF;
  IF p_price_php <= 0 THEN
    RAISE EXCEPTION 'Invalid Featured price';
  END IF;
  IF COALESCE(p_coins_to_use, 0) < 0 OR COALESCE(p_coins_to_use, 0) % 2 <> 0 THEN
    RAISE EXCEPTION 'Use an even GP Coin amount';
  END IF;

  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT id, seller_id, status
    INTO v_listing
    FROM shoes
   WHERE id = p_listing_id
   FOR UPDATE;

  IF v_listing.id IS NULL OR v_listing.seller_id <> v_profile_id OR v_listing.status <> 'active' THEN
    RAISE EXCEPTION 'Listing is not eligible for Featured promotion';
  END IF;

  SELECT COUNT(*) INTO v_existing_count
    FROM featured_promotion_orders
   WHERE listing_id = p_listing_id
     AND source = 'paid'
     AND status IN ('reserved', 'queued', 'active');

  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'This listing already has a Featured request';
  END IF;

  SELECT COALESCE(MAX(scheduled_end_at), NOW())
    INTO v_start
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND status IN ('active', 'queued')
     AND scheduled_end_at IS NOT NULL;

  INSERT INTO featured_promotion_orders (
    source,
    listing_id,
    seller_id,
    duration_days,
    price_php,
    cash_amount_php,
    scheduled_start_at,
    scheduled_end_at,
    status,
    review_status,
    reserved_until,
    created_by
  )
  VALUES (
    'paid',
    p_listing_id,
    v_profile_id,
    p_duration_days,
    p_price_php,
    p_price_php,
    v_start,
    v_start + (p_duration_days || ' days')::INTERVAL,
    'reserved',
    'pending',
    NOW() + INTERVAL '20 minutes',
    v_profile_id
  )
  RETURNING * INTO v_order;

  IF COALESCE(p_coins_to_use, 0) > 0 THEN
    v_order := gp_coin_reserve_for_featured_order(v_order.id, p_coins_to_use);
  END IF;

  PERFORM reconcile_featured_promotions();

  SELECT * INTO v_order FROM featured_promotion_orders WHERE id = v_order.id;
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
  v_status featured_promotion_status;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT *
    INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL OR v_order.seller_id <> v_profile_id THEN
    RAISE EXCEPTION 'Featured order not found';
  END IF;
  IF v_order.status <> 'reserved' THEN
    RAISE EXCEPTION 'Featured order is not awaiting proof';
  END IF;
  IF v_order.reserved_until IS NOT NULL AND v_order.reserved_until < NOW() THEN
    PERFORM gp_coin_release_featured_order(v_order.id, 'Featured reservation expired');
    UPDATE featured_promotion_orders
       SET status = 'cancelled',
           ended_at = NOW(),
           admin_notes = COALESCE(admin_notes || E'\n', '') || 'Reservation expired before proof upload.'
     WHERE id = v_order.id;
    RAISE EXCEPTION 'Featured reservation expired';
  END IF;
  IF v_order.cash_amount_php <= 0 THEN
    RAISE EXCEPTION 'This GP Coin-only order does not need payment proof';
  END IF;

  SELECT COALESCE(MAX(scheduled_end_at), NOW())
    INTO v_start
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND status IN ('active', 'queued')
     AND id <> v_order.id
     AND scheduled_end_at IS NOT NULL;

  v_status := CASE WHEN v_start <= NOW() + INTERVAL '1 second' THEN 'active'::featured_promotion_status ELSE 'queued'::featured_promotion_status END;

  UPDATE featured_promotion_orders
     SET payment_method = p_payment_method,
         transaction_reference = NULLIF(BTRIM(COALESCE(p_transaction_reference, '')), ''),
         proof_storage_path = p_proof_storage_path,
         scheduled_start_at = v_start,
         scheduled_end_at = v_start + (duration_days || ' days')::INTERVAL,
         status = v_status,
         review_status = 'pending',
         reserved_until = NULL,
         activated_at = CASE WHEN v_status = 'active' THEN NOW() ELSE activated_at END
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  IF v_order.coins_used > 0 THEN
    v_order := gp_coin_spend_featured_order(v_order.id);
  END IF;

  PERFORM reconcile_featured_promotions();

  SELECT * INTO v_order FROM featured_promotion_orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION submit_featured_coin_payment(
  p_order_id UUID
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
  v_status featured_promotion_status;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('featured_promotion_queue'));
  PERFORM reconcile_featured_promotions();

  SELECT * INTO v_order
    FROM featured_promotion_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF v_order.id IS NULL OR v_order.seller_id <> v_profile_id THEN
    RAISE EXCEPTION 'Featured order not found';
  END IF;
  IF v_order.status <> 'reserved' OR v_order.coin_payment_mode <> 'coins_only' OR v_order.cash_amount_php <> 0 THEN
    RAISE EXCEPTION 'Featured order is not eligible for GP Coin-only payment';
  END IF;

  SELECT COALESCE(MAX(scheduled_end_at), NOW())
    INTO v_start
    FROM featured_promotion_orders
   WHERE source = 'paid'
     AND status IN ('active', 'queued')
     AND id <> v_order.id
     AND scheduled_end_at IS NOT NULL;

  v_status := CASE WHEN v_start <= NOW() + INTERVAL '1 second' THEN 'active'::featured_promotion_status ELSE 'queued'::featured_promotion_status END;

  UPDATE featured_promotion_orders
     SET scheduled_start_at = v_start,
         scheduled_end_at = v_start + (duration_days || ' days')::INTERVAL,
         status = v_status,
         review_status = 'approved',
         reserved_until = NULL,
         activated_at = CASE WHEN v_status = 'active' THEN NOW() ELSE activated_at END,
         admin_notes = COALESCE(admin_notes || E'\n', '') || 'Auto-approved GP Coin-only Featured payment.'
   WHERE id = p_order_id
   RETURNING * INTO v_order;

  v_order := gp_coin_spend_featured_order(v_order.id);

  PERFORM reconcile_featured_promotions();

  SELECT * INTO v_order FROM featured_promotion_orders WHERE id = p_order_id;
  RETURN v_order;
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

  SELECT id INTO v_admin_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF p_action NOT IN ('approve', 'reject', 'refund_required') THEN
    RAISE EXCEPTION 'Unsupported review action';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE featured_promotion_orders
       SET review_status = 'approved',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSIF p_action = 'reject' THEN
    SELECT * INTO v_order FROM gp_coin_release_featured_order(p_order_id, 'Featured payment rejected');

    UPDATE featured_promotion_orders
       SET status = 'rejected',
           review_status = 'rejected',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = NOW(),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  ELSE
    UPDATE featured_promotion_orders
       SET status = 'refund_required',
           reviewed_by = v_admin_id,
           reviewed_at = NOW(),
           ended_at = COALESCE(ended_at, NOW()),
           admin_notes = NULLIF(BTRIM(COALESCE(p_notes, '')), '')
     WHERE id = p_order_id
     RETURNING * INTO v_order;
  END IF;

  PERFORM reconcile_featured_promotions();
  SELECT * INTO v_order FROM featured_promotion_orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION gp_coin_release_expired_featured_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order featured_promotion_orders%ROWTYPE;
  v_count INTEGER := 0;
BEGIN
  FOR v_order IN
    SELECT *
      FROM featured_promotion_orders
     WHERE status = 'reserved'
       AND reserved_until IS NOT NULL
       AND reserved_until < NOW()
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM gp_coin_release_featured_order(v_order.id, 'Featured reservation expired');
    UPDATE featured_promotion_orders
       SET status = 'cancelled',
           ended_at = NOW(),
           admin_notes = COALESCE(admin_notes || E'\n', '') || 'Reservation expired before checkout completion.'
     WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

ALTER TABLE gp_coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_coin_award_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_coin_hold_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_coin_pending_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GP coin wallets: owner read" ON gp_coin_wallets;
CREATE POLICY "GP coin wallets: owner read" ON gp_coin_wallets
  FOR SELECT USING (profile_id = gp_coin_current_profile_id());

DROP POLICY IF EXISTS "GP coin wallets: admin read" ON gp_coin_wallets;
CREATE POLICY "GP coin wallets: admin read" ON gp_coin_wallets
  FOR SELECT USING (gp_coin_is_admin());

DROP POLICY IF EXISTS "GP coin transactions: owner read" ON gp_coin_transactions;
CREATE POLICY "GP coin transactions: owner read" ON gp_coin_transactions
  FOR SELECT USING (profile_id = gp_coin_current_profile_id());

DROP POLICY IF EXISTS "GP coin transactions: admin read" ON gp_coin_transactions;
CREATE POLICY "GP coin transactions: admin read" ON gp_coin_transactions
  FOR SELECT USING (gp_coin_is_admin());

DROP POLICY IF EXISTS "GP coin pending awards: owner read" ON gp_coin_pending_awards;
CREATE POLICY "GP coin pending awards: owner read" ON gp_coin_pending_awards
  FOR SELECT USING (profile_id = gp_coin_current_profile_id());

DROP POLICY IF EXISTS "GP coin pending awards: admin read" ON gp_coin_pending_awards;
CREATE POLICY "GP coin pending awards: admin read" ON gp_coin_pending_awards
  FOR SELECT USING (gp_coin_is_admin());

DROP POLICY IF EXISTS "GP coin award buckets: owner read" ON gp_coin_award_buckets;
CREATE POLICY "GP coin award buckets: owner read" ON gp_coin_award_buckets
  FOR SELECT USING (profile_id = gp_coin_current_profile_id());

DROP POLICY IF EXISTS "GP coin award buckets: admin read" ON gp_coin_award_buckets;
CREATE POLICY "GP coin award buckets: admin read" ON gp_coin_award_buckets
  FOR SELECT USING (gp_coin_is_admin());

REVOKE ALL ON FUNCTION gp_coin_ensure_wallet(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION gp_coin_apply_transaction(UUID, gp_coin_transaction_type, INTEGER, INTEGER, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION gp_coin_award(UUID, INTEGER, TEXT, UUID, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION gp_coin_schedule_listing_publish_award(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_process_pending_awards() TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_award_listing_renewal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_award_share_action(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_reverse_listing_rewards(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_expire_available(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_reserve_for_featured_order(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_release_featured_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_spend_featured_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_admin_adjust(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_featured_coin_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION gp_coin_release_expired_featured_reservations() TO authenticated;

GRANT EXECUTE ON FUNCTION create_featured_paid_reservation(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_featured_payment_proof(UUID, featured_payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_review_featured_promotion(UUID, TEXT, TEXT) TO authenticated;
