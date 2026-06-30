-- Track whether a closed listing was completed through Go Pair PH or outside it.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS closed_sale_channel TEXT NULL;

ALTER TABLE shoes
  DROP CONSTRAINT IF EXISTS shoes_closed_sale_channel_check;

ALTER TABLE shoes
  ADD CONSTRAINT shoes_closed_sale_channel_check
  CHECK (
    closed_sale_channel IS NULL
    OR closed_sale_channel IN ('go_pair', 'outside_go_pair')
  );

UPDATE shoes
   SET closed_sale_channel = CASE
     WHEN EXISTS (
       SELECT 1
         FROM purchase_requests
        WHERE purchase_requests.listing_id = shoes.id
          AND purchase_requests.status = 'completed'
     )
       THEN 'go_pair'
     ELSE 'outside_go_pair'
   END
 WHERE status IN ('sold', 'donated')
   AND closed_sale_channel IS NULL;

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
    UPDATE shoes
       SET status = 'sold',
           closed_sale_channel = 'go_pair'
     WHERE id = v_listing_id;
    UPDATE purchase_requests SET status = 'completed' WHERE id = p_request_id;
    UPDATE purchase_requests SET status = 'declined'
      WHERE listing_id = v_listing_id AND id != p_request_id AND status IN ('pending', 'accepted');
  END IF;
END;
$$;
