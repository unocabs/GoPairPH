-- IMPORTANT: apply manually after 055 in the Supabase SQL Editor.
BEGIN;

ALTER TABLE public.purchase_requests
  ADD COLUMN conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN status_reason TEXT,
  ADD COLUMN listed_price_php NUMERIC(10,2);

-- Keep existing accepted orders intact. Collapse duplicate *pending* requests
-- before adding uniqueness; no stock was held for those pending requests.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY listing_id, buyer_id, variant_id ORDER BY created_at DESC, id) AS n
  FROM public.purchase_requests WHERE status = 'pending'
) UPDATE public.purchase_requests p SET status = 'declined', status_reason = 'duplicate' FROM ranked r WHERE p.id = r.id AND r.n > 1;
CREATE UNIQUE INDEX purchase_request_pending_unique_idx ON public.purchase_requests
  (listing_id, buyer_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID)) WHERE status = 'pending';
CREATE INDEX purchase_request_buyer_active_idx ON public.purchase_requests (buyer_id, created_at DESC) WHERE status IN ('pending', 'accepted');
CREATE INDEX purchase_request_conversation_idx ON public.purchase_requests (conversation_id, created_at DESC);

CREATE TABLE public.purchase_request_attempts (
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  PRIMARY KEY (actor_id, client_id)
);
ALTER TABLE public.purchase_request_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.purchase_request_attempts FROM anon, authenticated;
GRANT ALL ON public.purchase_request_attempts TO service_role;

CREATE FUNCTION public.chat_purchase_event() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE thread UUID; actor UUID; seller UUID; text_body TEXT; size_label TEXT; amount NUMERIC; kind_label TEXT;
BEGIN
  SELECT seller_id, CASE WHEN listing_type::TEXT = 'donate' THEN 'Request' WHEN shop_id IS NOT NULL THEN 'Order' ELSE 'Offer' END
    INTO seller, kind_label FROM public.shoes WHERE id = NEW.listing_id;
  thread := public.chat_ensure_conversation(NEW.listing_id, NEW.buyer_id);
  actor := COALESCE(public.chat_profile_id(), seller);
  IF actor NOT IN (NEW.buyer_id, seller) THEN actor := seller; END IF;
  IF NEW.conversation_id IS DISTINCT FROM thread THEN
    UPDATE public.purchase_requests SET conversation_id = thread WHERE id = NEW.id;
  END IF;
  IF TG_OP = 'INSERT' THEN
    actor := NEW.buyer_id;
    amount := COALESCE(NEW.offer_price_php, NEW.listed_price_php);
    text_body := kind_label || ' sent' || CASE WHEN amount IS NOT NULL THEN ': ₱' || to_char(amount, 'FM999,999,990.00') ELSE '' END;
    IF NEW.variant_id IS NOT NULL THEN
      SELECT 'EU ' || size_eu::TEXT INTO size_label FROM public.shoe_variants WHERE id = NEW.variant_id;
      text_body := text_body || COALESCE(' · ' || size_label, '');
    END IF;
    PERFORM public.chat_append(thread, actor, text_body, 'offer', NEW.id, NEW.version);
    IF NULLIF(btrim(NEW.message), '') IS NOT NULL THEN PERFORM public.chat_append(thread, actor, NEW.message); END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    text_body := CASE
      WHEN NEW.status_reason = 'buyer_withdrew' THEN 'Buyer withdrew the request.'
      WHEN NEW.status_reason = 'cancelled' THEN 'Reservation cancelled.'
      WHEN NEW.status_reason = 'unavailable' THEN 'These shoes are no longer available.'
      WHEN NEW.status = 'accepted' THEN kind_label || ' accepted. Confirm meetup, payment, or delivery here. No payment has been processed on Go Pair PH.'
      WHEN NEW.status = 'completed' THEN 'Transaction marked completed by the seller.'
      WHEN NEW.status = 'declined' THEN kind_label || ' declined.' ELSE 'Request updated.' END;
    PERFORM public.chat_append(thread, actor, text_body, 'offer', NEW.id, NEW.version);
  ELSIF NEW.offer_price_php IS DISTINCT FROM OLD.offer_price_php OR NEW.version IS DISTINCT FROM OLD.version THEN
    IF NEW.offer_price_php IS DISTINCT FROM OLD.offer_price_php THEN
      PERFORM public.chat_append(thread, NEW.buyer_id, 'Offer updated: ₱' || to_char(NEW.offer_price_php, 'FM999,999,990.00'), 'offer', NEW.id, NEW.version);
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NULLIF(btrim(NEW.seller_message), '') IS NOT NULL AND NEW.seller_message IS DISTINCT FROM OLD.seller_message THEN
    PERFORM public.chat_append(thread, seller, NEW.seller_message);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER purchase_chat_timeline AFTER INSERT OR UPDATE OF status, offer_price_php, seller_message, version ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.chat_purchase_event();

CREATE FUNCTION public.marketplace_submit_offer(p_listing UUID, p_client UUID, p_message TEXT DEFAULT NULL, p_price NUMERIC DEFAULT NULL,
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

CREATE FUNCTION public.marketplace_request_action(p_request UUID, p_action TEXT, p_expected_version INTEGER DEFAULT NULL, p_note TEXT DEFAULT NULL)
RETURNS public.purchase_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); r public.purchase_requests; s public.shoes; listing UUID;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT listing_id INTO listing FROM public.purchase_requests WHERE id = p_request;
  SELECT * INTO s FROM public.shoes WHERE id = listing FOR UPDATE;
  SELECT * INTO r FROM public.purchase_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL OR s.id IS NULL OR actor NOT IN (r.buyer_id, s.seller_id) THEN RAISE EXCEPTION 'Request unavailable'; END IF;
  IF p_action = 'withdraw' THEN
    IF actor <> r.buyer_id THEN RAISE EXCEPTION 'Only the buyer can withdraw'; END IF;
  ELSIF actor <> s.seller_id THEN RAISE EXCEPTION 'Only the seller can do this'; END IF;
  IF p_action NOT IN ('accept', 'decline', 'complete', 'cancel', 'withdraw', 'note') THEN RAISE EXCEPTION 'Unknown request action'; END IF;
  IF char_length(COALESCE(p_note, '')) > 500 THEN RAISE EXCEPTION 'Keep the note under 500 characters'; END IF;
  -- Repeated transitions never decrement/restore stock twice.
  IF (p_action = 'accept' AND r.status = 'accepted') OR (p_action = 'complete' AND r.status = 'completed')
    OR (p_action IN ('cancel', 'withdraw', 'decline') AND r.status = 'declined') THEN RETURN r; END IF;
  IF p_expected_version IS NOT NULL AND r.version <> p_expected_version THEN RAISE EXCEPTION 'This request changed. Refresh before continuing'; END IF;
  PERFORM public.chat_pair_lock(r.buyer_id, s.seller_id);
  IF p_action = 'accept' THEN
    IF public.chat_is_blocked(r.buyer_id, s.seller_id) THEN RAISE EXCEPTION 'Requests are unavailable between these accounts'; END IF;
    IF r.status <> 'pending' OR s.status::TEXT <> 'active' OR NOT s.has_stock THEN RAISE EXCEPTION 'These shoes are no longer available'; END IF;
    IF EXISTS (SELECT 1 FROM public.purchase_requests WHERE id <> r.id AND buyer_id = r.buyer_id AND listing_id = r.listing_id AND variant_id IS NOT DISTINCT FROM r.variant_id AND status = 'accepted') THEN RAISE EXCEPTION 'This buyer already has a reservation for this size'; END IF;
    IF s.inventory_mode = 'multi' THEN
      UPDATE public.shoe_variants SET quantity = quantity - 1 WHERE id = r.variant_id AND shoe_id = s.id AND quantity > 0;
      IF NOT FOUND THEN RAISE EXCEPTION 'This size is out of stock'; END IF;
    ELSE
      UPDATE public.shoes SET status = 'reserved', has_stock = FALSE WHERE id = s.id;
    END IF;
    UPDATE public.purchase_requests SET status = 'accepted', version = version + 1, status_reason = NULL,
      seller_message = COALESCE(NULLIF(btrim(p_note), ''), seller_message), seller_message_at = CASE WHEN NULLIF(btrim(p_note), '') IS NOT NULL THEN NOW() ELSE seller_message_at END
      WHERE id = r.id RETURNING * INTO r;
    IF s.inventory_mode <> 'multi' THEN
      UPDATE public.purchase_requests SET status = 'declined', status_reason = 'unavailable', version = version + 1 WHERE listing_id = s.id AND id <> r.id AND status = 'pending';
    END IF;
  ELSIF p_action = 'complete' THEN
    IF r.status <> 'accepted' THEN RAISE EXCEPTION 'Only an accepted request can be completed'; END IF;
    UPDATE public.purchase_requests SET status = 'completed', version = version + 1 WHERE id = r.id RETURNING * INTO r;
    IF s.inventory_mode <> 'multi' THEN
      IF s.listing_type::TEXT = 'donate' THEN UPDATE public.shoes SET status = 'donated', closed_sale_channel = 'go_pair', has_stock = FALSE WHERE id = s.id;
      ELSE UPDATE public.shoes SET status = 'sold', closed_sale_channel = 'go_pair', has_stock = FALSE WHERE id = s.id; END IF;
      UPDATE public.buyback_inventory_items SET status = 'sold', sold_at = NOW() WHERE resale_listing_id = s.id AND status = 'listed';
    END IF;
  ELSIF p_action = 'note' THEN
    IF NULLIF(btrim(p_note), '') IS NULL THEN RAISE EXCEPTION 'Write a note first'; END IF;
    UPDATE public.purchase_requests SET seller_message = btrim(p_note), seller_message_at = NOW() WHERE id = r.id RETURNING * INTO r;
  ELSE
    IF r.status NOT IN ('pending', 'accepted') THEN RAISE EXCEPTION 'This request is already closed'; END IF;
    IF p_action = 'decline' AND r.status <> 'pending' THEN RAISE EXCEPTION 'Cancel the reservation instead'; END IF;
    IF p_action = 'cancel' AND r.status <> 'accepted' THEN RAISE EXCEPTION 'There is no reservation to cancel'; END IF;
    IF r.status = 'accepted' THEN
      IF s.inventory_mode = 'multi' THEN UPDATE public.shoe_variants SET quantity = quantity + 1 WHERE id = r.variant_id AND shoe_id = s.id;
      ELSE UPDATE public.shoes SET status = 'active', has_stock = TRUE, closed_sale_channel = NULL WHERE id = s.id AND status::TEXT = 'reserved'; END IF;
    END IF;
    UPDATE public.purchase_requests SET status = 'declined', version = version + 1,
      status_reason = CASE WHEN p_action = 'withdraw' THEN 'buyer_withdrew' WHEN p_action = 'cancel' THEN 'cancelled' ELSE 'seller_declined' END,
      seller_message = CASE WHEN p_action = 'decline' THEN COALESCE(NULLIF(btrim(p_note), ''), seller_message) ELSE seller_message END,
      seller_message_at = CASE WHEN p_action = 'decline' AND NULLIF(btrim(p_note), '') IS NOT NULL THEN NOW() ELSE seller_message_at END
      WHERE id = r.id RETURNING * INTO r;
  END IF;
  RETURN r;
END;
$$;

-- Harden existing entry points too, including older listing/profile components.
CREATE OR REPLACE FUNCTION public.accept_purchase_request(p_request_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM public.marketplace_request_action(p_request_id, 'accept'); END; $$;
CREATE OR REPLACE FUNCTION public.complete_purchase(p_request_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM public.marketplace_request_action(p_request_id, 'complete'); END; $$;
CREATE OR REPLACE FUNCTION public.cancel_purchase_acceptance(p_request_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM public.marketplace_request_action(p_request_id, 'cancel'); END; $$;
CREATE OR REPLACE FUNCTION public.retract_purchase_request(p_request_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM public.marketplace_request_action(p_request_id, 'withdraw'); END; $$;

CREATE FUNCTION public.chat_close_listing_requests() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status::TEXT IN ('sold', 'donated', 'archived') AND NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.purchase_requests SET status = 'declined', status_reason = 'unavailable', version = version + 1
      WHERE listing_id = NEW.id AND status IN ('pending', 'accepted');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER chat_closed_listing AFTER UPDATE OF status ON public.shoes FOR EACH ROW EXECUTE FUNCTION public.chat_close_listing_requests();

-- Legacy notes remain intact; link existing records without generating a burst
-- of historical emails or pretending that earlier notes were a chat thread.
DO $$
DECLARE r RECORD; thread UUID;
BEGIN
  FOR r IN SELECT id, listing_id, buyer_id FROM public.purchase_requests LOOP
    thread := public.chat_ensure_conversation(r.listing_id, r.buyer_id);
    UPDATE public.purchase_requests SET conversation_id = thread WHERE id = r.id;
  END LOOP;
END;
$$;
UPDATE public.purchase_requests p SET listed_price_php = s.price_php FROM public.shoes s WHERE s.id = p.listing_id;

-- The post-deployment notification-dispatch setup revokes legacy direct writes.
-- Keeping current RLS permissions until then lets the existing release keep
-- taking offers while these additive migrations are applied.
GRANT SELECT ON public.purchase_requests TO authenticated;
REVOKE ALL ON FUNCTION public.chat_purchase_event(), public.chat_close_listing_requests() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.marketplace_submit_offer(UUID, UUID, TEXT, NUMERIC, UUID, UUID, INTEGER), public.marketplace_request_action(UUID, TEXT, INTEGER, TEXT), public.accept_purchase_request(UUID), public.complete_purchase(UUID), public.cancel_purchase_acceptance(UUID), public.retract_purchase_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_submit_offer(UUID, UUID, TEXT, NUMERIC, UUID, UUID, INTEGER), public.marketplace_request_action(UUID, TEXT, INTEGER, TEXT), public.accept_purchase_request(UUID), public.complete_purchase(UUID), public.cancel_purchase_acceptance(UUID), public.retract_purchase_request(UUID) TO authenticated;

COMMIT;
