-- Apply manually in the Supabase SQL Editor. Migrations do not auto-apply.
-- Requires migrations through 054. Deploy the notification dispatcher and apply
-- supabase/setup/notification-dispatch.sql before enabling messaging.
BEGIN;

CREATE TABLE public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('chat', 'renewal', 'buyback_expired', 'buyback_shipping', 'saved_search')),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'skipped', 'dead')),
  ready_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_token UUID,
  lease_until TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX notification_jobs_due_idx ON public.notification_jobs ((kind = 'chat') DESC, ready_at, id) WHERE status IN ('pending', 'processing');
CREATE UNIQUE INDEX notification_jobs_one_chat_batch_idx ON public.notification_jobs (recipient_id)
  WHERE kind = 'chat' AND status IN ('pending', 'processing');
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_jobs FROM anon, authenticated;
GRANT ALL ON public.notification_jobs TO service_role;

CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.shoes(id) ON DELETE SET NULL,
  -- Stable key survives listing removal; do not cascade-delete correspondence.
  listing_key UUID NOT NULL,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_sequence BIGINT NOT NULL DEFAULT 0,
  last_message TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  buyer_read_sequence BIGINT NOT NULL DEFAULT 0,
  seller_read_sequence BIGINT NOT NULL DEFAULT 0,
  buyer_unread INTEGER NOT NULL DEFAULT 0,
  seller_unread INTEGER NOT NULL DEFAULT 0,
  buyer_first_unread_at TIMESTAMPTZ,
  seller_first_unread_at TIMESTAMPTZ,
  buyer_notified BOOLEAN NOT NULL DEFAULT FALSE,
  seller_notified BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_muted BOOLEAN NOT NULL DEFAULT FALSE,
  seller_muted BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_archived BOOLEAN NOT NULL DEFAULT FALSE,
  seller_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (buyer_id <> seller_id),
  UNIQUE (listing_key, buyer_id, seller_id)
);
CREATE INDEX chat_buyer_inbox_idx ON public.chat_conversations (buyer_id, last_message_at DESC, id DESC);
CREATE INDEX chat_seller_inbox_idx ON public.chat_conversations (seller_id, last_message_at DESC, id DESC);
CREATE INDEX chat_buyer_unread_idx ON public.chat_conversations (buyer_id, buyer_first_unread_at) WHERE buyer_unread > 0 AND NOT buyer_muted;
CREATE INDEX chat_seller_unread_idx ON public.chat_conversations (seller_id, seller_first_unread_at) WHERE seller_unread > 0 AND NOT seller_muted;

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sequence BIGINT NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'offer')),
  request_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  request_version INTEGER,
  client_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, sequence),
  UNIQUE (sender_id, client_id)
);
CREATE INDEX chat_messages_sender_recent_idx ON public.chat_messages (sender_id, created_at DESC);

CREATE TABLE public.chat_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX chat_blocks_reverse_idx ON public.chat_blocks (blocked_id, blocker_id);
CREATE TABLE public.chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, reporter_id)
);
CREATE TABLE public.chat_email_preferences (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_sent_at TIMESTAMPTZ
);

CREATE FUNCTION public.chat_profile_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT id FROM public.profiles WHERE user_id = (SELECT auth.uid())
$$;
CREATE FUNCTION public.chat_is_participant(p_conversation UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = p_conversation AND public.chat_profile_id() IN (buyer_id, seller_id))
$$;
CREATE FUNCTION public.chat_is_blocked(p_a UUID, p_b UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_blocks WHERE (blocker_id = p_a AND blocked_id = p_b) OR (blocker_id = p_b AND blocked_id = p_a))
$$;
CREATE FUNCTION public.chat_pair_lock(p_a UUID, p_b UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(LEAST(p_a::TEXT, p_b::TEXT) || GREATEST(p_a::TEXT, p_b::TEXT), 0))
$$;
REVOKE ALL ON FUNCTION public.chat_pair_lock(UUID, UUID) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_email_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_conversations, public.chat_messages, public.chat_blocks, public.chat_reports, public.chat_email_preferences FROM anon, authenticated;
GRANT SELECT ON public.chat_conversations, public.chat_messages, public.chat_blocks TO authenticated;
GRANT ALL ON public.chat_conversations, public.chat_messages, public.chat_blocks, public.chat_reports, public.chat_email_preferences TO service_role;
CREATE POLICY chat_conversation_read ON public.chat_conversations FOR SELECT TO authenticated USING (public.chat_profile_id() IN (buyer_id, seller_id));
CREATE POLICY chat_message_read ON public.chat_messages FOR SELECT TO authenticated USING (public.chat_is_participant(conversation_id));
CREATE POLICY chat_block_read ON public.chat_blocks FOR SELECT TO authenticated USING (public.chat_profile_id() IN (blocker_id, blocked_id));
GRANT SELECT ON public.chat_reports TO authenticated;
CREATE POLICY chat_report_admin ON public.chat_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (SELECT auth.uid()) AND is_admin)
);

-- All application-table writes go through authorized RPCs. Broadcasts contain
-- identifiers only; clients must fetch content through the participant RLS.
CREATE FUNCTION public.chat_broadcast(p_conversation UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.chat_conversations;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation;
  PERFORM realtime.send(jsonb_build_object('conversation_id', c.id), 'changed', 'chat:' || c.id::TEXT, TRUE);
  PERFORM realtime.send(jsonb_build_object('conversation_id', c.id), 'changed', 'inbox:' || c.buyer_id::TEXT, TRUE);
  PERFORM realtime.send(jsonb_build_object('conversation_id', c.id), 'changed', 'inbox:' || c.seller_id::TEXT, TRUE);
EXCEPTION WHEN OTHERS THEN
  -- The persisted record remains authoritative if realtime is unavailable.
  RAISE WARNING 'Chat realtime hint failed (%)', SQLSTATE;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_broadcast(UUID) FROM PUBLIC, anon, authenticated;
CREATE POLICY gopair_chat_private_broadcast ON realtime.messages FOR SELECT TO authenticated USING (
  (realtime.topic() = 'inbox:' || public.chat_profile_id()::TEXT)
  OR EXISTS (SELECT 1 FROM public.chat_conversations c WHERE realtime.topic() = 'chat:' || c.id::TEXT AND public.chat_profile_id() IN (c.buyer_id, c.seller_id))
);
-- Existing permissive policies must not accidentally admit outsiders to these
-- topics. This guard leaves unrelated realtime topics unchanged.
CREATE POLICY gopair_chat_topic_guard ON realtime.messages AS RESTRICTIVE FOR SELECT TO authenticated USING (
  (LEFT(realtime.topic(), 5) <> 'chat:' AND LEFT(realtime.topic(), 6) <> 'inbox:')
  OR realtime.topic() = 'inbox:' || public.chat_profile_id()::TEXT
  OR EXISTS (SELECT 1 FROM public.chat_conversations c WHERE realtime.topic() = 'chat:' || c.id::TEXT AND public.chat_profile_id() IN (c.buyer_id, c.seller_id))
);

CREATE FUNCTION public.queue_chat_notification(p_recipient UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE due TIMESTAMPTZ;
BEGIN
  SELECT MIN(first_unread) + INTERVAL '3 minutes' INTO due FROM (
    SELECT buyer_first_unread_at AS first_unread FROM public.chat_conversations c
    WHERE buyer_id = p_recipient AND buyer_unread > 0 AND NOT buyer_muted AND NOT buyer_notified AND NOT public.chat_is_blocked(buyer_id, seller_id)
    UNION ALL
    SELECT seller_first_unread_at FROM public.chat_conversations c
    WHERE seller_id = p_recipient AND seller_unread > 0 AND NOT seller_muted AND NOT seller_notified AND NOT public.chat_is_blocked(buyer_id, seller_id)
  ) q;
  IF due IS NULL THEN RETURN; END IF;
  SELECT GREATEST(due, COALESCE(last_sent_at + INTERVAL '15 minutes', due)) INTO due
    FROM (SELECT (SELECT last_sent_at FROM public.chat_email_preferences WHERE profile_id = p_recipient) AS last_sent_at) q;
  INSERT INTO public.notification_jobs (dedupe_key, kind, recipient_id, ready_at)
    VALUES ('chat:' || gen_random_uuid()::TEXT, 'chat', p_recipient, due)
    ON CONFLICT (recipient_id) WHERE kind = 'chat' AND status IN ('pending', 'processing') DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_chat_notification(UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.chat_ensure_conversation(p_listing UUID, p_buyer UUID) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shoes; result UUID; snapshot JSONB;
BEGIN
  SELECT * INTO s FROM public.shoes WHERE id = p_listing;
  IF s.id IS NULL OR p_buyer = s.seller_id THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
  SELECT id INTO result FROM public.chat_conversations WHERE listing_key = p_listing AND buyer_id = p_buyer AND seller_id = s.seller_id;
  IF result IS NOT NULL THEN RETURN result; END IF;
  snapshot := jsonb_build_object('name', s.brand || ' ' || s.model, 'price_php', s.price_php, 'slug', s.slug,
    'listing_type', s.listing_type, 'size_eu', s.size_eu, 'size_us', s.size_us, 'size_cm', s.size_cm, 'us_size_type', s.us_size_type,
    'thumbnail', (SELECT storage_path FROM public.shoe_images WHERE shoe_id = s.id ORDER BY "order", id LIMIT 1));
  INSERT INTO public.chat_conversations (listing_id, listing_key, buyer_id, seller_id, listing_snapshot)
    VALUES (s.id, s.id, p_buyer, s.seller_id, snapshot)
    ON CONFLICT (listing_key, buyer_id, seller_id) DO UPDATE SET listing_key = EXCLUDED.listing_key RETURNING id INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_ensure_conversation(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.chat_append(p_conversation UUID, p_sender UUID, p_body TEXT, p_kind TEXT DEFAULT 'text', p_request UUID DEFAULT NULL, p_version INTEGER DEFAULT NULL, p_client UUID DEFAULT NULL)
RETURNS public.chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.chat_conversations; m public.chat_messages; recipient UUID;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation FOR UPDATE;
  IF c.id IS NULL OR p_sender NOT IN (c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
  IF p_client IS NOT NULL THEN
    SELECT * INTO m FROM public.chat_messages WHERE sender_id = p_sender AND client_id = p_client;
    IF m.id IS NOT NULL THEN
      IF m.conversation_id <> p_conversation OR m.body <> btrim(p_body) THEN RAISE EXCEPTION 'Retry key already used'; END IF;
      RETURN m;
    END IF;
  END IF;
  INSERT INTO public.chat_messages (conversation_id, sequence, sender_id, body, kind, request_id, request_version, client_id)
    VALUES (c.id, c.last_sequence + 1, p_sender, btrim(p_body), p_kind, p_request, p_version, p_client) RETURNING * INTO m;
  UPDATE public.chat_conversations SET last_sequence = m.sequence, last_message = LEFT(m.body, 180), last_message_at = m.created_at,
    buyer_unread = buyer_unread + CASE WHEN p_sender <> buyer_id THEN 1 ELSE 0 END,
    seller_unread = seller_unread + CASE WHEN p_sender <> seller_id THEN 1 ELSE 0 END,
    buyer_first_unread_at = CASE WHEN p_sender <> buyer_id AND buyer_unread = 0 THEN NOW() ELSE buyer_first_unread_at END,
    seller_first_unread_at = CASE WHEN p_sender <> seller_id AND seller_unread = 0 THEN NOW() ELSE seller_first_unread_at END,
    buyer_archived = CASE WHEN p_sender <> buyer_id THEN FALSE ELSE buyer_archived END,
    seller_archived = CASE WHEN p_sender <> seller_id THEN FALSE ELSE seller_archived END
    WHERE id = c.id;
  recipient := CASE WHEN p_sender = c.buyer_id THEN c.seller_id ELSE c.buyer_id END;
  PERFORM public.queue_chat_notification(recipient);
  PERFORM public.chat_broadcast(c.id);
  RETURN m;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_append(UUID, UUID, TEXT, TEXT, UUID, INTEGER, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.chat_send(p_body TEXT, p_client_id UUID, p_conversation UUID DEFAULT NULL, p_listing UUID DEFAULT NULL)
RETURNS public.chat_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); c public.chat_conversations; s public.shoes; result public.chat_messages; thread UUID;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_client_id IS NULL OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Write a message of 1 to 2,000 characters'; END IF;
  -- Per-sender serialization makes retries and burst limits safe across threads.
  PERFORM pg_advisory_xact_lock(hashtextextended('chat-send:' || actor::TEXT, 0));
  SELECT * INTO result FROM public.chat_messages WHERE sender_id = actor AND client_id = p_client_id;
  IF result.id IS NOT NULL THEN
    IF result.body <> btrim(p_body) OR (p_conversation IS NOT NULL AND result.conversation_id <> p_conversation)
      OR (p_listing IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = result.conversation_id AND listing_key = p_listing)) THEN RAISE EXCEPTION 'Retry key already used'; END IF;
    RETURN result;
  END IF;
  IF (SELECT COUNT(*) FROM public.chat_messages WHERE sender_id = actor AND kind = 'text' AND created_at > NOW() - INTERVAL '1 minute') >= 30 THEN
    RAISE EXCEPTION 'You are sending quickly. Please try again in a minute';
  END IF;
  IF p_conversation IS NOT NULL THEN
    SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation;
    IF c.id IS NULL OR actor NOT IN (c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
    PERFORM public.chat_pair_lock(c.buyer_id, c.seller_id);
    IF public.chat_is_blocked(c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Messaging is unavailable between these accounts'; END IF;
    thread := c.id;
  ELSE
    SELECT * INTO s FROM public.shoes WHERE id = p_listing;
    IF s.id IS NULL OR s.seller_id = actor THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
    PERFORM public.chat_pair_lock(actor, s.seller_id);
    IF public.chat_is_blocked(actor, s.seller_id) THEN RAISE EXCEPTION 'Messaging is unavailable between these accounts'; END IF;
    SELECT id INTO thread FROM public.chat_conversations WHERE listing_key = s.id AND buyer_id = actor AND seller_id = s.seller_id;
    IF thread IS NULL THEN
      IF s.status::TEXT NOT IN ('active', 'reserved') OR (s.status::TEXT = 'active' AND NOT s.has_stock) THEN RAISE EXCEPTION 'These shoes are no longer available'; END IF;
      IF (SELECT COUNT(*) FROM public.chat_conversations WHERE buyer_id = actor AND created_at > NOW() - INTERVAL '1 hour') >= 20 THEN
        RAISE EXCEPTION 'You have started several chats. Please try again later';
      END IF;
      thread := public.chat_ensure_conversation(s.id, actor);
    END IF;
  END IF;
  RETURN public.chat_append(thread, actor, p_body, 'text', NULL, NULL, p_client_id);
END;
$$;

CREATE FUNCTION public.chat_mark_read(p_conversation UUID, p_sequence BIGINT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); c public.chat_conversations; seq BIGINT; unread INTEGER;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation FOR UPDATE;
  IF actor IS NULL OR c.id IS NULL OR actor NOT IN (c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
  seq := LEAST(GREATEST(p_sequence, CASE WHEN actor = c.buyer_id THEN c.buyer_read_sequence ELSE c.seller_read_sequence END), c.last_sequence);
  SELECT COUNT(*) INTO unread FROM public.chat_messages WHERE conversation_id = c.id AND sequence > seq AND sender_id IS DISTINCT FROM actor;
  IF actor = c.buyer_id THEN
    UPDATE public.chat_conversations SET buyer_read_sequence = seq, buyer_unread = unread,
      buyer_notified = CASE WHEN unread = 0 THEN FALSE ELSE buyer_notified END,
      buyer_first_unread_at = CASE WHEN unread = 0 THEN NULL ELSE buyer_first_unread_at END WHERE id = c.id;
  ELSE
    UPDATE public.chat_conversations SET seller_read_sequence = seq, seller_unread = unread,
      seller_notified = CASE WHEN unread = 0 THEN FALSE ELSE seller_notified END,
      seller_first_unread_at = CASE WHEN unread = 0 THEN NULL ELSE seller_first_unread_at END WHERE id = c.id;
  END IF;
  PERFORM public.chat_broadcast(c.id);
END;
$$;

CREATE FUNCTION public.chat_preferences(p_conversation UUID, p_muted BOOLEAN DEFAULT NULL, p_archived BOOLEAN DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); c public.chat_conversations;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation FOR UPDATE;
  IF actor IS NULL OR c.id IS NULL OR actor NOT IN (c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
  IF actor = c.buyer_id THEN UPDATE public.chat_conversations SET buyer_muted = COALESCE(p_muted, buyer_muted), buyer_archived = COALESCE(p_archived, buyer_archived) WHERE id = c.id;
  ELSE UPDATE public.chat_conversations SET seller_muted = COALESCE(p_muted, seller_muted), seller_archived = COALESCE(p_archived, seller_archived) WHERE id = c.id; END IF;
  PERFORM public.queue_chat_notification(actor);
  PERFORM public.chat_broadcast(c.id);
END;
$$;

CREATE FUNCTION public.chat_block(p_conversation UUID, p_block BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor UUID := public.chat_profile_id(); c public.chat_conversations; other UUID;
BEGIN
  SELECT * INTO c FROM public.chat_conversations WHERE id = p_conversation;
  IF actor IS NULL OR c.id IS NULL OR actor NOT IN (c.buyer_id, c.seller_id) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
  other := CASE WHEN actor = c.buyer_id THEN c.seller_id ELSE c.buyer_id END;
  PERFORM public.chat_pair_lock(actor, other);
  IF p_block THEN INSERT INTO public.chat_blocks (blocker_id, blocked_id) VALUES (actor, other) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.chat_blocks WHERE blocker_id = actor AND blocked_id = other; END IF;
  PERFORM public.chat_broadcast(c.id);
END;
$$;

CREATE FUNCTION public.chat_report(p_conversation UUID, p_reason TEXT) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.chat_is_participant(p_conversation) THEN RAISE EXCEPTION 'Conversation unavailable'; END IF;
  INSERT INTO public.chat_reports (conversation_id, reporter_id, reason) VALUES (p_conversation, public.chat_profile_id(), btrim(p_reason))
    ON CONFLICT (conversation_id, reporter_id) DO NOTHING;
END;
$$;

CREATE FUNCTION public.chat_inbox(p_before TIMESTAMPTZ DEFAULT NULL, p_before_id UUID DEFAULT NULL, p_archived BOOLEAN DEFAULT FALSE, p_limit INTEGER DEFAULT 20)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.last_message_at DESC, q.id DESC), '[]'::JSONB) FROM (
    SELECT c.id, c.listing_id, c.listing_key, c.listing_snapshot, c.last_message, c.last_message_at, c.last_sequence,
      c.buyer_id, c.seller_id,
      CASE WHEN c.buyer_id = public.chat_profile_id() THEN c.buyer_unread ELSE c.seller_unread END AS unread,
      CASE WHEN c.buyer_id = public.chat_profile_id() THEN c.buyer_muted ELSE c.seller_muted END AS muted,
      p.display_name AS partner_name, p.is_verified AS partner_verified
    FROM public.chat_conversations c JOIN public.profiles p ON p.id = CASE WHEN c.buyer_id = public.chat_profile_id() THEN c.seller_id ELSE c.buyer_id END
    WHERE public.chat_profile_id() IN (c.buyer_id, c.seller_id)
      AND (CASE WHEN c.buyer_id = public.chat_profile_id() THEN c.buyer_archived ELSE c.seller_archived END) = p_archived
      AND (p_before IS NULL OR (c.last_message_at, c.id) < (p_before, p_before_id))
    ORDER BY c.last_message_at DESC, c.id DESC LIMIT LEAST(GREATEST(p_limit, 1), 50)
  ) q
$$;
CREATE FUNCTION public.chat_unread_count() RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COUNT(*)::INTEGER FROM public.chat_conversations c WHERE
    ((buyer_id = public.chat_profile_id() AND buyer_unread > 0 AND NOT buyer_muted)
      OR (seller_id = public.chat_profile_id() AND seller_unread > 0 AND NOT seller_muted))
    AND NOT public.chat_is_blocked(buyer_id, seller_id)
$$;

-- Durable jobs: crash recovery, bounded retries and lease tokens prevent an old
-- worker from acknowledging a lease now owned by another invocation.
CREATE FUNCTION public.claim_notification_jobs(p_limit INTEGER DEFAULT 10) RETURNS SETOF public.notification_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.notification_jobs SET status = 'dead',
    last_error = CASE WHEN attempts >= 8 THEN 'Retry limit reached' ELSE 'Provider retry window elapsed; inspect delivery logs before retrying' END,
    lease_token = NULL, lease_until = NULL
    WHERE (attempts >= 8 OR (payload->'delivery'->>'prepared_at')::TIMESTAMPTZ < NOW() - INTERVAL '23 hours')
      AND (status = 'pending' OR (status = 'processing' AND lease_until < NOW()));
  RETURN QUERY WITH due AS (
    SELECT id FROM public.notification_jobs WHERE attempts < 8 AND ready_at <= NOW()
      AND (status = 'pending' OR (status = 'processing' AND lease_until < NOW()))
    ORDER BY (kind = 'chat') DESC, ready_at, id LIMIT LEAST(GREATEST(p_limit, 1), 20) FOR UPDATE SKIP LOCKED
  ) UPDATE public.notification_jobs j SET status = 'processing', attempts = attempts + 1,
    lease_token = gen_random_uuid(), lease_until = NOW() + INTERVAL '2 minutes'
    FROM due WHERE j.id = due.id RETURNING j.*;
END;
$$;

CREATE FUNCTION public.prepare_chat_notification(p_job UUID, p_lease UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.notification_jobs; batch JSONB; last_sent TIMESTAMPTZ;
BEGIN
  SELECT * INTO j FROM public.notification_jobs WHERE id = p_job AND lease_token = p_lease AND status = 'processing' AND lease_until > NOW() FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'Notification lease expired'; END IF;
  SELECT last_sent_at INTO last_sent FROM public.chat_email_preferences WHERE profile_id = j.recipient_id;
  IF last_sent > NOW() - INTERVAL '15 minutes' THEN
    UPDATE public.notification_jobs SET status = 'pending', ready_at = last_sent + INTERVAL '15 minutes', lease_token = NULL, lease_until = NULL WHERE id = j.id;
    RETURN NULL;
  END IF;
  -- Freeze a delivery batch for provider retries; exclude a thread if the
  -- recipient has since read its captured messages or muted/blocked it.
  IF NOT j.payload ? 'threads' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'sequence', last_sequence, 'name', listing_snapshot->>'name', 'preview', last_message) ORDER BY last_message_at DESC), '[]'::JSONB) INTO batch
    FROM public.chat_conversations c WHERE
      ((buyer_id = j.recipient_id AND buyer_unread > 0 AND NOT buyer_notified AND NOT buyer_muted AND buyer_first_unread_at <= NOW() - INTERVAL '3 minutes')
        OR (seller_id = j.recipient_id AND seller_unread > 0 AND NOT seller_notified AND NOT seller_muted AND seller_first_unread_at <= NOW() - INTERVAL '3 minutes'))
      AND NOT public.chat_is_blocked(buyer_id, seller_id);
    UPDATE public.notification_jobs SET payload = jsonb_build_object('threads', batch) WHERE id = j.id;
  ELSE batch := j.payload->'threads'; END IF;
  SELECT COALESCE(jsonb_agg(t), '[]'::JSONB) INTO batch FROM jsonb_array_elements(batch) t
    JOIN public.chat_conversations c ON c.id = (t->>'id')::UUID WHERE
      ((c.buyer_id = j.recipient_id AND c.buyer_read_sequence < (t->>'sequence')::BIGINT AND NOT c.buyer_muted AND NOT c.buyer_notified)
        OR (c.seller_id = j.recipient_id AND c.seller_read_sequence < (t->>'sequence')::BIGINT AND NOT c.seller_muted AND NOT c.seller_notified))
      AND NOT public.chat_is_blocked(c.buyer_id, c.seller_id);
  RETURN batch;
END;
$$;

CREATE FUNCTION public.finish_notification_job(p_job UUID, p_lease UUID, p_status TEXT, p_error TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.notification_jobs; t JSONB;
BEGIN
  SELECT * INTO j FROM public.notification_jobs WHERE id = p_job AND status = 'processing' AND lease_token = p_lease AND lease_until > NOW();
  IF j.id IS NULL THEN RAISE EXCEPTION 'Notification lease expired'; END IF;
  -- Senders lock conversation -> queue. Use the same order when acknowledging
  -- a batch, so a concurrent send cannot deadlock against a completion.
  IF j.kind = 'chat' THEN
    PERFORM c.id FROM public.chat_conversations c WHERE c.id IN (
      SELECT (value->>'id')::UUID FROM jsonb_array_elements(COALESCE(j.payload->'threads', '[]'::JSONB))
    ) ORDER BY c.id FOR UPDATE;
  END IF;
  SELECT * INTO j FROM public.notification_jobs WHERE id = p_job AND status = 'processing' AND lease_token = p_lease AND lease_until > NOW() FOR UPDATE;
  IF j.id IS NULL THEN RAISE EXCEPTION 'Notification lease expired'; END IF;
  IF p_status NOT IN ('sent', 'skipped', 'pending') THEN RAISE EXCEPTION 'Invalid notification outcome'; END IF;
  UPDATE public.notification_jobs SET status = CASE WHEN p_status = 'pending' AND attempts >= 8 THEN 'dead' ELSE p_status END,
    ready_at = CASE WHEN p_status = 'pending' THEN NOW() + make_interval(secs => LEAST(900, 30 * (2 ^ LEAST(attempts, 5))::INTEGER)) ELSE ready_at END,
    last_error = LEFT(p_error, 300), finished_at = CASE WHEN p_status <> 'pending' THEN NOW() ELSE NULL END,
    lease_token = NULL, lease_until = NULL WHERE id = j.id;
  IF j.kind = 'chat' AND p_status IN ('sent', 'skipped') THEN
    IF p_status = 'sent' THEN
      INSERT INTO public.chat_email_preferences (profile_id, last_sent_at) VALUES (j.recipient_id, NOW())
        ON CONFLICT (profile_id) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at;
    END IF;
    -- Mark only the frozen unread episodes; a read during delivery must not
    -- suppress the next, genuinely new episode.
    FOR t IN SELECT value FROM jsonb_array_elements(COALESCE(j.payload->'threads', '[]'::JSONB)) LOOP
      UPDATE public.chat_conversations SET
        buyer_notified = CASE WHEN buyer_id = j.recipient_id AND buyer_read_sequence < (t->>'sequence')::BIGINT THEN TRUE ELSE buyer_notified END,
        seller_notified = CASE WHEN seller_id = j.recipient_id AND seller_read_sequence < (t->>'sequence')::BIGINT THEN TRUE ELSE seller_notified END
        WHERE id = (t->>'id')::UUID;
    END LOOP;
    PERFORM public.queue_chat_notification(j.recipient_id);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_jobs(INTEGER), public.prepare_chat_notification(UUID, UUID), public.finish_notification_job(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INTEGER), public.prepare_chat_notification(UUID, UUID), public.finish_notification_job(UUID, UUID, TEXT, TEXT) TO service_role;

-- Notification state is recorded in the same transaction as the underlying
-- transition, even when expiry happens through another RPC or page.
CREATE FUNCTION public.queue_buyback_lifecycle() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'expired' AND OLD.status <> 'expired' THEN
    INSERT INTO public.notification_jobs (dedupe_key, kind, recipient_id, payload)
      VALUES ('buyback-expired:' || NEW.id::TEXT, 'buyback_expired', NEW.seller_id, jsonb_build_object('offer_id', NEW.id)) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER buyback_expiry_notification AFTER UPDATE OF status ON public.buyback_offers FOR EACH ROW EXECUTE FUNCTION public.queue_buyback_lifecycle();

CREATE FUNCTION public.queue_renewal_notification(p_listing UUID, p_previous TIMESTAMPTZ, p_payload JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.shoes; k TEXT;
BEGIN
  SELECT * INTO s FROM public.shoes WHERE id = p_listing FOR UPDATE;
  IF s.id IS NULL OR s.status::TEXT <> 'active' OR NOT s.has_stock OR s.renewal_reminder_sent_at IS DISTINCT FROM p_previous THEN RETURN FALSE; END IF;
  k := 'renewal:' || s.id::TEXT || ':' || COALESCE(p_previous::TEXT, 'first');
  INSERT INTO public.notification_jobs (dedupe_key, kind, recipient_id, payload) VALUES (k, 'renewal', s.seller_id, p_payload) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Timestamp means queued. The outbox owns delivery/retries independently.
  UPDATE public.shoes SET renewal_reminder_sent_at = NOW() WHERE id = s.id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_renewal_notification(UUID, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_renewal_notification(UUID, TIMESTAMPTZ, JSONB) TO service_role;

-- Future functions must not inherit Postgres's default PUBLIC execute grant.
REVOKE ALL ON FUNCTION public.chat_profile_id(), public.chat_is_participant(UUID), public.chat_is_blocked(UUID, UUID), public.chat_send(TEXT, UUID, UUID, UUID), public.chat_mark_read(UUID, BIGINT), public.chat_preferences(UUID, BOOLEAN, BOOLEAN), public.chat_block(UUID, BOOLEAN), public.chat_report(UUID, TEXT), public.chat_inbox(TIMESTAMPTZ, UUID, BOOLEAN, INTEGER), public.chat_unread_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_profile_id(), public.chat_is_participant(UUID), public.chat_is_blocked(UUID, UUID), public.chat_send(TEXT, UUID, UUID, UUID), public.chat_mark_read(UUID, BIGINT), public.chat_preferences(UUID, BOOLEAN, BOOLEAN), public.chat_block(UUID, BOOLEAN), public.chat_report(UUID, TEXT), public.chat_inbox(TIMESTAMPTZ, UUID, BOOLEAN, INTEGER), public.chat_unread_count() TO authenticated;
-- Blocking checks are internal; do not expose other people's relationships.
REVOKE EXECUTE ON FUNCTION public.chat_is_blocked(UUID, UUID) FROM authenticated;

COMMIT;
