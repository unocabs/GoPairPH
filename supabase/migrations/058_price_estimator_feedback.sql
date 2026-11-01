-- Apply manually in the Supabase SQL Editor. Migrations do not auto-apply.
BEGIN;
ALTER TABLE public.feedback_messages
  DROP CONSTRAINT feedback_messages_category_check,
  ADD CONSTRAINT feedback_messages_category_check CHECK (category IN ('confusing','missing_feature','bug','suggestion','price_estimate')),
  ADD COLUMN price_reason TEXT CHECK (price_reason IN ('too_low','too_high')),
  ADD COLUMN suggested_price_php NUMERIC(12,2),
  ADD COLUMN estimator_snapshot JSONB,
  ADD COLUMN submission_id UUID UNIQUE,
  ADD COLUMN request_hash TEXT,
  ADD COLUMN rate_key TEXT,
  ADD COLUMN email_status TEXT NOT NULL DEFAULT 'legacy' CHECK (email_status IN ('pending','sent','suppressed','legacy')),
  ADD COLUMN email_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN email_next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN email_lease_until TIMESTAMPTZ,
  ADD COLUMN email_lease_token UUID,
  ADD COLUMN email_delivery JSONB,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- Do not resend historical feedback emails; only new submissions enter the outbox.
ALTER TABLE public.feedback_messages ALTER COLUMN email_status SET DEFAULT 'pending';
ALTER TABLE public.feedback_messages ADD CONSTRAINT feedback_messages_estimator_check CHECK (
  CASE WHEN category = 'price_estimate' THEN
    price_reason IS NOT NULL AND suggested_price_php IS NOT NULL AND suggested_price_php BETWEEN 1 AND 1000000
    AND estimator_snapshot IS NOT NULL AND jsonb_typeof(estimator_snapshot) = 'object'
    AND estimator_snapshot ?& ARRAY['input','estimate','engine_version','reference_price_php','evidence_type']
    AND jsonb_typeof(estimator_snapshot->'input') = 'object'
    AND jsonb_typeof(estimator_snapshot->'estimate') = 'object'
    AND jsonb_typeof(estimator_snapshot->'reference_price_php') = 'number'
    AND (estimator_snapshot->>'reference_price_php')::NUMERIC > 0
    AND CASE WHEN price_reason = 'too_low' THEN suggested_price_php > (estimator_snapshot->>'reference_price_php')::NUMERIC
      ELSE suggested_price_php < (estimator_snapshot->>'reference_price_php')::NUMERIC END
  ELSE price_reason IS NULL AND suggested_price_php IS NULL AND estimator_snapshot IS NULL END
);
CREATE INDEX feedback_messages_email_pending_idx ON public.feedback_messages(email_next_attempt_at, created_at) WHERE email_status = 'pending';
CREATE INDEX feedback_messages_rate_idx ON public.feedback_messages(rate_key, created_at DESC) WHERE rate_key IS NOT NULL;
CREATE INDEX feedback_messages_category_idx ON public.feedback_messages(category, created_at DESC);

-- Writes go through bounded server validation and the atomic submit function.
DROP POLICY IF EXISTS "Feedback: owner insert" ON public.feedback_messages;
REVOKE ALL ON public.feedback_messages FROM anon, authenticated;
GRANT ALL ON public.feedback_messages TO service_role;

CREATE FUNCTION public.submit_product_feedback(p_payload JSONB, p_rate_key TEXT, p_request_hash TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE existing public.feedback_messages; result UUID; attempt UUID := (p_payload->>'submission_id')::UUID;
BEGIN
  IF attempt IS NULL OR length(p_rate_key) <> 64 OR length(p_request_hash) <> 64 THEN RAISE EXCEPTION 'Invalid feedback'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_rate_key, 581));
  SELECT * INTO existing FROM public.feedback_messages WHERE submission_id = attempt;
  IF FOUND THEN
    IF existing.rate_key <> p_rate_key OR existing.request_hash <> p_request_hash THEN RAISE EXCEPTION 'Feedback request changed'; END IF;
    RETURN existing.id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.feedback_messages WHERE rate_key = p_rate_key AND created_at > NOW() - INTERVAL '10 seconds')
    OR (SELECT COUNT(*) FROM public.feedback_messages WHERE rate_key = p_rate_key AND created_at > NOW() - INTERVAL '24 hours') >= 20
    THEN RAISE EXCEPTION 'Please try again later'; END IF;
  INSERT INTO public.feedback_messages(user_id, profile_id, listing_id, category, message, contact_email, page_path,
    price_reason, suggested_price_php, estimator_snapshot, submission_id, request_hash, rate_key)
  VALUES ((p_payload->>'user_id')::UUID, (p_payload->>'profile_id')::UUID, (p_payload->>'listing_id')::UUID,
    p_payload->>'category', p_payload->>'message', p_payload->>'contact_email', p_payload->>'page_path',
    p_payload->>'price_reason', (p_payload->>'suggested_price_php')::NUMERIC,
    NULLIF(p_payload->'estimator_snapshot', 'null'::JSONB), attempt, p_request_hash, p_rate_key)
  RETURNING id INTO result;
  RETURN result;
END $$;

CREATE FUNCTION public.claim_feedback_emails(p_id UUID DEFAULT NULL)
RETURNS SETOF public.feedback_messages LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH candidates AS (
    SELECT id FROM public.feedback_messages WHERE email_status = 'pending' AND email_next_attempt_at <= NOW()
      AND (email_lease_until IS NULL OR email_lease_until < NOW()) AND (p_id IS NULL OR id = p_id)
    ORDER BY created_at LIMIT 3 FOR UPDATE SKIP LOCKED
  ) UPDATE public.feedback_messages f SET email_lease_until = NOW() + INTERVAL '5 minutes',
    email_lease_token = gen_random_uuid(), email_attempts = email_attempts + 1
  FROM candidates c WHERE f.id = c.id RETURNING f.*;
$$;
CREATE FUNCTION public.snapshot_feedback_email(p_id UUID, p_token UUID, p_delivery JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result JSONB;
BEGIN
  UPDATE public.feedback_messages SET email_delivery = COALESCE(email_delivery, p_delivery)
    WHERE id = p_id AND email_lease_token = p_token AND email_status = 'pending'
    RETURNING email_delivery INTO result;
  RETURN result;
END $$;
CREATE FUNCTION public.finish_feedback_email(p_id UUID, p_token UUID, p_status TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_status NOT IN ('pending','sent','suppressed') THEN RAISE EXCEPTION 'Invalid delivery status'; END IF;
  UPDATE public.feedback_messages SET email_status = p_status, email_lease_until = NULL, email_lease_token = NULL,
    email_next_attempt_at = NOW() + INTERVAL '1 minute' * LEAST(60, power(2, LEAST(email_attempts, 6)))
    WHERE id = p_id AND email_lease_token = p_token AND email_status = 'pending';
  RETURN FOUND;
END $$;

CREATE FUNCTION public.feedback_overview()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('total', COUNT(*), 'new', COUNT(*) FILTER (WHERE status = 'new'),
    'too_low', COUNT(*) FILTER (WHERE price_reason = 'too_low'), 'too_high', COUNT(*) FILTER (WHERE price_reason = 'too_high'),
    'models', COALESCE((SELECT jsonb_agg(to_jsonb(m)) FROM (
      SELECT estimator_snapshot->'input'->>'brand' AS brand, estimator_snapshot->'input'->>'model' AS model,
        estimator_snapshot->'input'->>'condition' AS condition, COUNT(*) AS total,
        COUNT(*) FILTER (WHERE price_reason = 'too_low') AS too_low, COUNT(*) FILTER (WHERE price_reason = 'too_high') AS too_high
      FROM public.feedback_messages WHERE category = 'price_estimate'
      GROUP BY 1, 2, 3 ORDER BY COUNT(*) DESC, 1, 2, 3 LIMIT 20
    ) m), '[]'::JSONB)) FROM public.feedback_messages;
$$;
REVOKE ALL ON FUNCTION public.submit_product_feedback(JSONB,TEXT,TEXT), public.claim_feedback_emails(UUID),
  public.snapshot_feedback_email(UUID,UUID,JSONB), public.finish_feedback_email(UUID,UUID,TEXT), public.feedback_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_product_feedback(JSONB,TEXT,TEXT), public.claim_feedback_emails(UUID),
  public.snapshot_feedback_email(UUID,UUID,JSONB), public.finish_feedback_email(UUID,UUID,TEXT), public.feedback_overview() TO service_role;
COMMIT;
