-- Apply manually after migration 060 in the Supabase SQL Editor.
BEGIN;
CREATE TABLE public.marketplace_analytics_exclusions (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.marketplace_analytics_exclusions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_analytics_exclusions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.marketplace_analytics_exclusions TO service_role;

-- Historical anonymous hashes cannot be attributed to an account retroactively.
ALTER TABLE public.listing_daily_views ADD COLUMN viewer_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX listing_funnel_buyer_messages_idx ON public.chat_messages (created_at, conversation_id, sender_id) WHERE kind = 'text';
CREATE INDEX listing_funnel_requests_idx ON public.purchase_requests (created_at, listing_id, buyer_id);
CREATE INDEX listing_funnel_live_payments_idx ON public.promotion_payments (paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX listing_funnel_estimator_payments_idx ON public.estimator_payments (paid_at) WHERE paid_at IS NOT NULL;

CREATE FUNCTION public.marketplace_funnel_overview(p_days INTEGER DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE window_start TIMESTAMPTZ; result JSONB;
BEGIN
  IF p_days IS NULL OR p_days NOT IN (7, 30, 90) THEN RAISE EXCEPTION 'Choose 7, 30 or 90 days'; END IF;
  window_start := ((NOW() AT TIME ZONE 'Asia/Manila')::DATE - (p_days - 1))::TIMESTAMP AT TIME ZONE 'Asia/Manila';
  WITH excluded AS MATERIALIZED (
    SELECT id FROM public.profiles WHERE is_admin
    UNION SELECT profile_id FROM public.marketplace_analytics_exclusions
  ), eligible_shoes AS MATERIALIZED (
    SELECT id, seller_id, listing_type FROM public.shoes WHERE seller_id NOT IN (SELECT id FROM excluded)
  ), views AS MATERIALIZED (
    SELECT v.listing_id, MIN(v.created_at) AS first_view_at, COUNT(*) AS view_count,
      COUNT(*) FILTER (WHERE v.viewer_profile_id IS NULL) AS unattributed_views
    FROM public.listing_daily_views v JOIN eligible_shoes s ON s.id = v.listing_id
    WHERE s.listing_type = 'for_sale' AND v.view_date >= (window_start AT TIME ZONE 'Asia/Manila')::DATE
      AND v.created_at <= NOW()
      AND (v.viewer_profile_id IS NULL OR v.viewer_profile_id NOT IN (SELECT id FROM excluded))
    GROUP BY v.listing_id
  ), conversations AS MATERIALIZED (
    SELECT c.id, c.listing_id, c.buyer_id, c.seller_id FROM public.chat_conversations c
    JOIN eligible_shoes s ON s.id = c.listing_id
    WHERE s.listing_type = 'for_sale' AND c.buyer_id NOT IN (SELECT id FROM excluded)
  ), inquiry_events AS (
    SELECT c.listing_id, c.buyer_id, m.created_at
    FROM conversations c JOIN public.chat_messages m ON m.conversation_id = c.id AND m.sender_id = c.buyer_id AND m.kind = 'text'
    WHERE m.created_at >= window_start AND m.created_at <= NOW()
    UNION ALL
    SELECT r.listing_id, r.buyer_id, r.created_at FROM public.purchase_requests r
    JOIN eligible_shoes s ON s.id = r.listing_id
    WHERE s.listing_type = 'for_sale' AND r.created_at >= window_start AND r.created_at <= NOW() AND r.buyer_id NOT IN (SELECT id FROM excluded)
  ), inquiries AS MATERIALIZED (
    -- A listing-level cohort, not a claim that a particular visitor converted.
    SELECT e.listing_id, e.buyer_id, MIN(e.created_at) AS first_inquiry_at
    FROM inquiry_events e JOIN views v ON v.listing_id = e.listing_id AND e.created_at >= v.first_view_at
    GROUP BY e.listing_id, e.buyer_id
  ), outcomes AS (
    SELECT i.listing_id,
      EXISTS (SELECT 1 FROM conversations c JOIN public.chat_messages m ON m.conversation_id = c.id
        WHERE c.listing_id = i.listing_id AND c.buyer_id = i.buyer_id AND m.sender_id = c.seller_id AND m.created_at >= i.first_inquiry_at) AS replied,
      EXISTS (SELECT 1 FROM public.purchase_requests r WHERE r.listing_id = i.listing_id AND r.buyer_id = i.buyer_id
        AND r.seller_message_at >= i.first_inquiry_at) AS seller_note,
      EXISTS (SELECT 1 FROM public.purchase_requests r WHERE r.listing_id = i.listing_id AND r.buyer_id = i.buyer_id
        AND r.created_at >= i.first_inquiry_at AND r.status = 'completed') AS completed
    FROM inquiries i
  ), listing_outcomes AS (
    SELECT listing_id, bool_or(replied OR seller_note OR completed) AS replied, bool_or(completed) AS completed
    FROM outcomes GROUP BY listing_id
  ), live_promotions AS MATERIALIZED (
    SELECT p.* FROM public.promotion_payments p JOIN eligible_shoes s ON s.id = p.listing_id
    WHERE p.seller_id NOT IN (SELECT id FROM excluded) AND p.livemode AND p.paid_at >= window_start AND p.paid_at <= NOW()
  ), live_estimator AS MATERIALIZED (
    SELECT p.* FROM public.estimator_payments p
    WHERE p.livemode AND p.paid_at >= window_start AND p.paid_at <= NOW()
      AND NOT EXISTS (SELECT 1 FROM public.profiles u JOIN excluded x ON x.id = u.id WHERE u.user_id = p.user_id)
  )
  SELECT jsonb_build_object(
    'start_at', window_start, 'end_at', NOW(), 'days', p_days,
    'view_events', (SELECT coalesce(SUM(view_count), 0) FROM views),
    'unattributed_view_events', (SELECT coalesce(SUM(unattributed_views), 0) FROM views),
    'viewed_listings', (SELECT COUNT(*) FROM views),
    'inquiry_listings', (SELECT COUNT(*) FROM listing_outcomes),
    'replied_listings', (SELECT COUNT(*) FROM listing_outcomes WHERE replied),
    'sold_listings', (SELECT COUNT(*) FROM listing_outcomes WHERE completed),
    'buyer_listing_inquiries', (SELECT COUNT(*) FROM inquiries),
    'other_inquiry_listings', (SELECT COUNT(DISTINCT listing_id) FROM inquiry_events WHERE listing_id NOT IN (SELECT listing_id FROM inquiries)),
    'promotion_cash_minor', (SELECT coalesce(SUM(amount_minor - refunded_amount_minor), 0) FROM live_promotions WHERE provider = 'paymongo'),
    'estimator_cash_minor', (SELECT coalesce(SUM(amount_minor - refunded_amount_minor), 0) FROM live_estimator),
    'cash_refunded_minor', (SELECT coalesce(SUM(refunded_amount_minor), 0) FROM live_promotions) + (SELECT coalesce(SUM(refunded_amount_minor), 0) FROM live_estimator),
    'coins_applied', (SELECT coalesce(SUM(coins_used), 0) FROM live_promotions),
    'cash_paying_accounts', (SELECT COUNT(*) FROM (
      SELECT u.user_id FROM live_promotions p JOIN public.profiles u ON u.id = p.seller_id WHERE p.amount_minor > p.refunded_amount_minor
      UNION SELECT user_id FROM live_estimator WHERE amount_minor > refunded_amount_minor
    ) paying),
    'test_paid_payments', (SELECT COUNT(*) FROM public.promotion_payments WHERE NOT livemode AND paid_at >= window_start)
      + (SELECT COUNT(*) FROM public.estimator_payments WHERE NOT livemode AND paid_at >= window_start),
    'excluded_profiles', (SELECT coalesce(jsonb_agg(profile_id), '[]'::JSONB) FROM public.marketplace_analytics_exclusions)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketplace_funnel_overview(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_funnel_overview(INTEGER) TO service_role;
COMMIT;
