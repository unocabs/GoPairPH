-- Apply manually after 055–056. This project does not auto-apply migrations.
BEGIN;
CREATE FUNCTION public.queue_saved_search_notification(p_recipient UUID, p_date DATE, p_payload JSONB, p_search_rows JSONB, p_profile_rows JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_jobs (dedupe_key, kind, recipient_id, payload)
    VALUES ('saved-search:' || p_recipient::TEXT || ':' || p_date::TEXT, 'saved_search', p_recipient, p_payload) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  INSERT INTO public.saved_search_notifications (saved_search_id, user_id, listing_id, sent_date)
    SELECT (v->>'saved_search_id')::UUID, p_recipient, (v->>'listing_id')::UUID, p_date FROM jsonb_array_elements(p_search_rows) v
    ON CONFLICT (saved_search_id, listing_id) DO NOTHING;
  INSERT INTO public.profile_match_notifications (user_id, listing_id, sent_date)
    SELECT p_recipient, (v->>'listing_id')::UUID, p_date FROM jsonb_array_elements(p_profile_rows) v
    ON CONFLICT (user_id, listing_id) DO NOTHING;
  RETURN TRUE;
END;
$$;
CREATE FUNCTION public.queue_buyback_shipping_reminders() RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.buyback_offers; n INTEGER := 0;
BEGIN
  FOR r IN SELECT * FROM public.buyback_offers WHERE status = 'accepted' AND shipping_reminder_sent_at IS NULL
    AND proposed_ship_date <= (NOW() AT TIME ZONE 'Asia/Manila')::DATE + 1 AND expires_at >= NOW() FOR UPDATE SKIP LOCKED LOOP
    INSERT INTO public.notification_jobs (dedupe_key, kind, recipient_id, payload)
      VALUES ('buyback-shipping:' || r.id::TEXT, 'buyback_shipping', r.seller_id, jsonb_build_object('offer_id', r.id)) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      UPDATE public.buyback_offers SET shipping_reminder_sent_at = NOW() WHERE id = r.id;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_saved_search_notification(UUID, DATE, JSONB, JSONB, JSONB), public.queue_buyback_shipping_reminders(), public.queue_buyback_lifecycle() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_saved_search_notification(UUID, DATE, JSONB, JSONB, JSONB), public.queue_buyback_shipping_reminders() TO service_role;

CREATE FUNCTION public.notification_delivery_snapshot(p_job UUID, p_lease UUID, p_delivery JSONB) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.notification_jobs;
BEGIN
  SELECT * INTO j FROM public.notification_jobs WHERE id = p_job AND lease_token = p_lease AND status = 'processing' AND lease_until > NOW() FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'Notification lease expired'; END IF;
  IF j.payload ? 'delivery' THEN RETURN j.payload->'delivery'; END IF;
  p_delivery := p_delivery || jsonb_build_object('prepared_at', NOW());
  UPDATE public.notification_jobs SET payload = payload || jsonb_build_object('delivery', p_delivery) WHERE id = j.id;
  RETURN p_delivery;
END;
$$;
REVOKE ALL ON FUNCTION public.notification_delivery_snapshot(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_delivery_snapshot(UUID, UUID, JSONB) TO service_role;

CREATE TABLE public.chat_report_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.chat_reports(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.chat_report_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_report_reviews FROM anon, authenticated;
GRANT ALL ON public.chat_report_reviews TO service_role;
CREATE FUNCTION public.admin_chat_report(p_report UUID, p_close BOOLEAN DEFAULT FALSE) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); r public.chat_reports; history JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = actor AND is_admin) THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO r FROM public.chat_reports WHERE id = p_report;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Report unavailable'; END IF;
  INSERT INTO public.chat_report_reviews (report_id, admin_id, action) VALUES (r.id, actor, CASE WHEN p_close THEN 'reviewed' ELSE 'viewed' END);
  IF p_close THEN UPDATE public.chat_reports SET status = 'reviewed' WHERE id = r.id; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.sequence), '[]'::JSONB) INTO history FROM (
    SELECT id,sequence,sender_id,body,kind,created_at FROM public.chat_messages WHERE conversation_id = r.conversation_id ORDER BY sequence DESC LIMIT 50
  ) q;
  RETURN jsonb_build_object('report', to_jsonb(r), 'messages', history);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_chat_report(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_chat_report(UUID, BOOLEAN) TO authenticated;
COMMIT;
