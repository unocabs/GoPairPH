-- Apply manually in the Supabase SQL Editor; this project does not auto-apply migrations.
BEGIN;

-- Independent of quality flags: no effect on coins, listing status, or ownership.
ALTER TABLE public.shoes ADD COLUMN running_relevance_flagged BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX shoes_running_relevance_feed_idx ON public.shoes (running_relevance_flagged, freshness_at DESC, id)
  WHERE status = 'active' AND has_stock AND listed_in_main_feed;

CREATE TABLE public.listing_running_reviews (
  listing_id UUID PRIMARY KEY REFERENCES public.shoes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('flagged', 'appealed', 'approved')),
  listing_identity TEXT NOT NULL,
  reason TEXT NOT NULL,
  appeal_note TEXT CHECK (char_length(appeal_note) <= 1000),
  appealed_at TIMESTAMPTZ,
  review_note TEXT CHECK (char_length(review_note) <= 1000),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX listing_running_reviews_queue_idx ON public.listing_running_reviews (status, updated_at DESC);
ALTER TABLE public.listing_running_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_running_reviews FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.listing_running_reviews TO authenticated;
GRANT ALL ON public.listing_running_reviews TO service_role;
CREATE POLICY running_review_private_read ON public.listing_running_reviews FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.is_admin)
  OR EXISTS (SELECT 1 FROM public.shoes s JOIN public.profiles p ON p.id = s.seller_id
    WHERE s.id = listing_id AND p.user_id = (SELECT auth.uid()))
);

-- Only explicit, high-confidence model names. Unknown models are left alone.
-- Admin approval overrides these hints for the approved brand/model identity.
CREATE FUNCTION public.running_shoe_review_reason(p_brand TEXT, p_model TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN lower(coalesce(p_model, '')) ~ '\m(basketball|lebron|kyrie|harden|dame|way of wade)\M|\mjordan[[:space:]-]+[0-9]+\M'
      OR (lower(coalesce(p_brand, '')) = 'nike' AND lower(coalesce(p_model, '')) ~ '\mkd[[:space:]-]*[0-9]+\M')
      THEN 'The model name appears to describe basketball shoes.'
    WHEN lower(coalesce(p_brand, '')) = 'sperry'
      OR lower(coalesce(p_model, '')) ~ '\m(loafer|loafers|boat shoes|air force 1|air monarch)\M'
      THEN 'The model name appears to describe casual or training shoes.'
    ELSE NULL END
$$;

-- Derive the public ordering bit from private review state; owners cannot clear
-- it through direct table writes, renewals, sponsorship, or editing the model.
CREATE FUNCTION public.guard_running_shoe_priority() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.listing_running_reviews; identity TEXT;
BEGIN
  identity := lower(btrim(NEW.brand)) || ':' || lower(btrim(NEW.model));
  SELECT * INTO r FROM public.listing_running_reviews WHERE listing_id = NEW.id;
  NEW.running_relevance_flagged := CASE
    WHEN r.status IN ('flagged', 'appealed') THEN TRUE
    WHEN r.status = 'approved' AND r.listing_identity = identity THEN FALSE
    ELSE public.running_shoe_review_reason(NEW.brand, NEW.model) IS NOT NULL END;
  RETURN NEW;
END $$;
CREATE TRIGGER shoes_running_priority_guard BEFORE INSERT OR UPDATE OF brand, model, running_relevance_flagged
  ON public.shoes FOR EACH ROW EXECUTE FUNCTION public.guard_running_shoe_priority();

CREATE FUNCTION public.seed_running_shoe_review() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.running_relevance_flagged THEN
    INSERT INTO public.listing_running_reviews (listing_id, status, listing_identity, reason)
    VALUES (NEW.id, 'flagged', lower(btrim(NEW.brand)) || ':' || lower(btrim(NEW.model)),
      coalesce(public.running_shoe_review_reason(NEW.brand, NEW.model), 'An admin needs to review whether these are running shoes.'))
    ON CONFLICT (listing_id) DO UPDATE SET status = 'flagged', listing_identity = EXCLUDED.listing_identity,
      reason = EXCLUDED.reason, appeal_note = NULL, appealed_at = NULL, review_note = NULL,
      reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
    WHERE listing_running_reviews.status = 'approved';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER shoes_running_review_seed AFTER INSERT OR UPDATE OF brand, model
  ON public.shoes FOR EACH ROW EXECUTE FUNCTION public.seed_running_shoe_review();

CREATE FUNCTION public.review_running_shoe(p_listing UUID, p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.profiles; s public.shoes; r public.listing_running_reviews; note TEXT := btrim(coalesce(p_note, ''));
BEGIN
  SELECT * INTO actor FROM public.profiles WHERE user_id = (SELECT auth.uid());
  IF actor.id IS NULL THEN RAISE EXCEPTION 'Sign in to continue'; END IF;
  SELECT * INTO s FROM public.shoes WHERE id = p_listing FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  SELECT * INTO r FROM public.listing_running_reviews WHERE listing_id = p_listing;
  IF char_length(note) > 1000 THEN RAISE EXCEPTION 'Use 1000 characters or fewer'; END IF;
  IF p_action = 'appeal' THEN
    IF s.seller_id <> actor.id THEN RAISE EXCEPTION 'Only the owner can appeal'; END IF;
    IF r.status IS DISTINCT FROM 'flagged' THEN RAISE EXCEPTION 'This listing is not awaiting an appeal'; END IF;
    IF char_length(note) < 20 THEN RAISE EXCEPTION 'Explain why these are running shoes in at least 20 characters'; END IF;
    UPDATE public.listing_running_reviews SET status = 'appealed', appeal_note = note,
      appealed_at = NOW(), review_note = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
      WHERE listing_id = p_listing;
  ELSE
    IF NOT coalesce(actor.is_admin, FALSE) THEN RAISE EXCEPTION 'Admin only'; END IF;
    IF p_action NOT IN ('flag', 'approve', 'keep_flagged') OR p_action IS NULL THEN RAISE EXCEPTION 'Unsupported action'; END IF;
    IF p_action = 'keep_flagged' AND r.status IS DISTINCT FROM 'appealed' THEN RAISE EXCEPTION 'No pending appeal'; END IF;
    IF p_action IN ('flag', 'keep_flagged') AND char_length(note) < 5 THEN RAISE EXCEPTION 'Add a short reason'; END IF;
    INSERT INTO public.listing_running_reviews (listing_id, status, listing_identity, reason, review_note, reviewed_by, reviewed_at)
    VALUES (p_listing, CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'flagged' END,
      lower(btrim(s.brand)) || ':' || lower(btrim(s.model)),
      CASE WHEN p_action = 'flag' THEN note ELSE coalesce(r.reason, 'Running shoe review') END,
      nullif(note, ''), actor.id, NOW())
    ON CONFLICT (listing_id) DO UPDATE SET status = EXCLUDED.status, listing_identity = EXCLUDED.listing_identity,
      reason = EXCLUDED.reason, review_note = EXCLUDED.review_note, reviewed_by = actor.id,
      reviewed_at = NOW(), updated_at = NOW();
  END IF;
  UPDATE public.shoes SET running_relevance_flagged = (p_action <> 'approve') WHERE id = p_listing;
END $$;
REVOKE ALL ON FUNCTION public.review_running_shoe(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_running_shoe(UUID, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_running_shoe_priority(), public.seed_running_shoe_review() FROM PUBLIC, anon, authenticated;

-- A lower-priority listing must not buy a placement it cannot currently receive.
-- Existing payment history and active promotion windows are preserved.
CREATE FUNCTION public.guard_running_shoe_promotion() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.shoes WHERE id = NEW.listing_id AND running_relevance_flagged FOR UPDATE) THEN
    RAISE EXCEPTION 'Request a running shoe review before promoting this listing';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_running_shoe_promotion() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER promotion_running_shoe_guard BEFORE INSERT ON public.promotion_payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_running_shoe_promotion();

-- Backfill only explicit matches; no dates, prices, rewards or quality flags change.
-- Disable the generic timestamp trigger during this narrowly scoped backfill.
ALTER TABLE public.shoes DISABLE TRIGGER shoes_updated_at;
UPDATE public.shoes SET brand = brand
  WHERE public.running_shoe_review_reason(brand, model) IS NOT NULL;
ALTER TABLE public.shoes ENABLE TRIGGER shoes_updated_at;
COMMIT;
