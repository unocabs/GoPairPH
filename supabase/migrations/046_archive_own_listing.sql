-- Seller-safe listing archive flow with GP Coin reward reversal.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

DROP POLICY IF EXISTS "Shoes: owner delete" ON shoes;

CREATE OR REPLACE FUNCTION archive_own_listing(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID := gp_coin_current_profile_id();
  v_listing shoes%ROWTYPE;
  v_completed_sale_exists BOOLEAN := FALSE;
  v_blocked_reward_id UUID;
  v_reward RECORD;
  v_reversed_count INTEGER := 0;
  v_reversed_coins INTEGER := 0;
  v_pending_reversed INTEGER := 0;
  v_requests_closed INTEGER := 0;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
    INTO v_listing
    FROM shoes
   WHERE id = p_listing_id
   FOR UPDATE;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_listing.seller_id <> v_profile_id THEN
    RAISE EXCEPTION 'You can only remove your own listings';
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM purchase_requests
     WHERE listing_id = p_listing_id
       AND status = 'completed'
  ) INTO v_completed_sale_exists;

  IF v_completed_sale_exists THEN
    RAISE EXCEPTION 'This shoe is part of a completed sale and cannot be removed.';
  END IF;

  -- Seller archives should not make wallet/bucket accounting ambiguous. If any
  -- listing reward has already been spent, reserved, or otherwise consumed,
  -- keep the listing active and ask for manual support/admin handling.
  SELECT tx.id
    INTO v_blocked_reward_id
    FROM gp_coin_transactions tx
    LEFT JOIN gp_coin_award_buckets bucket ON bucket.source_transaction_id = tx.id
   WHERE tx.listing_id = p_listing_id
     AND tx.transaction_type = 'award'
     AND tx.metadata->>'action' IN ('listing_publish', 'listing_renewal')
     AND NOT EXISTS (
       SELECT 1
         FROM gp_coin_transactions reversal
        WHERE reversal.related_transaction_id = tx.id
          AND reversal.transaction_type = 'reversal'
     )
     AND NOT EXISTS (
       SELECT 1
         FROM gp_coin_transactions expiration
        WHERE expiration.related_transaction_id = tx.id
          AND expiration.transaction_type = 'expiration'
     )
     AND (
       bucket.id IS NULL
       OR bucket.remaining_amount < tx.amount_coins
       OR bucket.reserved_amount > 0
     )
   LIMIT 1;

  IF v_blocked_reward_id IS NOT NULL THEN
    RAISE EXCEPTION 'GP Coins from this listing were already used or reserved. Please contact support before removing this listing.';
  END IF;

  FOR v_reward IN
    SELECT tx.*, bucket.id AS bucket_id
      FROM gp_coin_transactions tx
      JOIN gp_coin_award_buckets bucket ON bucket.source_transaction_id = tx.id
     WHERE tx.listing_id = p_listing_id
       AND tx.transaction_type = 'award'
       AND tx.metadata->>'action' IN ('listing_publish', 'listing_renewal')
       AND bucket.remaining_amount >= tx.amount_coins
       AND bucket.reserved_amount = 0
       AND NOT EXISTS (
         SELECT 1
           FROM gp_coin_transactions reversal
          WHERE reversal.related_transaction_id = tx.id
            AND reversal.transaction_type = 'reversal'
       )
       AND NOT EXISTS (
         SELECT 1
           FROM gp_coin_transactions expiration
          WHERE expiration.related_transaction_id = tx.id
            AND expiration.transaction_type = 'expiration'
       )
     ORDER BY tx.created_at ASC
  LOOP
    PERFORM gp_coin_apply_transaction(
      v_reward.profile_id,
      'reversal',
      -v_reward.amount_coins,
      0,
      'archive_listing_reward_reversal:' || v_reward.id,
      p_listing_id,
      NULL,
      v_reward.id,
      NULL,
      jsonb_build_object('reason', 'Listing archived by seller')
    );

    UPDATE gp_coin_award_buckets
       SET remaining_amount = GREATEST(0, remaining_amount - v_reward.amount_coins)
     WHERE id = v_reward.bucket_id;

    UPDATE gp_coin_pending_awards
       SET status = 'reversed',
           processed_at = COALESCE(processed_at, NOW()),
           skip_reason = 'Listing archived by seller'
     WHERE transaction_id = v_reward.id
       AND status = 'awarded';

    v_reversed_count := v_reversed_count + 1;
    v_reversed_coins := v_reversed_coins + v_reward.amount_coins;
  END LOOP;

  UPDATE gp_coin_pending_awards
     SET status = 'reversed',
         processed_at = COALESCE(processed_at, NOW()),
         skip_reason = 'Listing archived by seller'
   WHERE listing_id = p_listing_id
     AND status = 'pending';
  GET DIAGNOSTICS v_pending_reversed = ROW_COUNT;

  UPDATE purchase_requests
     SET status = 'declined'
   WHERE listing_id = p_listing_id
     AND status IN ('pending', 'accepted');
  GET DIAGNOSTICS v_requests_closed = ROW_COUNT;

  UPDATE shoes
     SET status = 'archived'
   WHERE id = p_listing_id
     AND status <> 'archived';

  RETURN jsonb_build_object(
    'archived', TRUE,
    'listingId', p_listing_id,
    'reversedRewardTransactions', v_reversed_count,
    'reversedCoins', v_reversed_coins,
    'pendingAwardsReversed', v_pending_reversed,
    'buyerRequestsClosed', v_requests_closed
  );
END;
$$;

GRANT EXECUTE ON FUNCTION archive_own_listing(UUID) TO authenticated;
