-- Fix: cancel_purchase_acceptance was strict about status='accepted' and
-- gave a misleading "Request not found or not in accepted state" error
-- when the row was actually in any other state (pending, declined, completed)
-- or when the listing detail page was stale.
--
-- New behavior:
--   - 'accepted'  → restore stock (variant flow) or shoes.status='active'
--                   (legacy flow); request goes back to 'pending' (variant)
--                   or 'declined' (legacy, matches original semantics).
--   - 'pending'   → no-op (already in the "reopen" state).
--   - 'declined'  → no-op (already declined; idempotent for double-clicks).
--   - 'completed' → reject; can't cancel a completed sale.
--   - missing row → reject with a clear message.

CREATE OR REPLACE FUNCTION cancel_purchase_acceptance(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id UUID;
  v_variant_id UUID;
  v_status TEXT;
  v_caller_profile_id UUID;
  v_listing_seller_id UUID;
BEGIN
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_caller_profile_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT listing_id, variant_id, status
    INTO v_listing_id, v_variant_id, v_status
  FROM purchase_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase request % not found', p_request_id;
  END IF;

  SELECT seller_id INTO v_listing_seller_id FROM shoes WHERE id = v_listing_id;
  IF v_listing_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;
  IF v_listing_seller_id != v_caller_profile_id THEN
    RAISE EXCEPTION 'Unauthorized: you do not own this listing';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot cancel a completed sale';
  END IF;

  -- Idempotent for already-reopened or declined requests; refresh page
  -- staleness shouldn't surface as a "not in accepted state" error.
  IF v_status IN ('pending', 'declined') THEN
    RETURN;
  END IF;

  -- v_status = 'accepted' — actually do the cancel.
  IF v_variant_id IS NOT NULL THEN
    -- Shop variant flow: restore stock; reopen request as pending.
    UPDATE shoe_variants SET quantity = quantity + 1 WHERE id = v_variant_id;
    UPDATE purchase_requests SET status = 'pending' WHERE id = p_request_id;
  ELSE
    -- Personal listing legacy flow: unreserve listing, decline request.
    UPDATE shoes SET status = 'active' WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'declined' WHERE id = p_request_id;
  END IF;
END;
$$;
