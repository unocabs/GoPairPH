-- Apply manually in Supabase SQL Editor after 058. No migrations auto-apply.
BEGIN;
CREATE TABLE public.estimator_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(id), premium_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quality_approved BOOLEAN NOT NULL DEFAULT FALSE, independent_outcomes INTEGER NOT NULL DEFAULT 0 CHECK(independent_outcomes>=0),
  benchmark_report TEXT, livemode BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK(NOT premium_enabled OR (quality_approved AND independent_outcomes>=50 AND benchmark_report IS NOT NULL AND length(btrim(benchmark_report))>10))
);
INSERT INTO public.estimator_settings(id) VALUES(TRUE);
CREATE TABLE public.estimator_models(id TEXT PRIMARY KEY,brand TEXT NOT NULL,name TEXT NOT NULL,aliases TEXT[] NOT NULL DEFAULT '{}',category TEXT NOT NULL DEFAULT 'road');
CREATE TABLE public.estimator_sources(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),model_id TEXT NOT NULL REFERENCES public.estimator_models(id),
  source_name TEXT NOT NULL,url TEXT NOT NULL UNIQUE,sku TEXT NOT NULL,variant TEXT NOT NULL,
  fetch_enabled BOOLEAN NOT NULL DEFAULT FALSE,permission_confirmed BOOLEAN NOT NULL DEFAULT FALSE,permission_note TEXT,
  next_due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),lease_until TIMESTAMPTZ,last_attempt_at TIMESTAMPTZ,last_success_at TIMESTAMPTZ,last_error TEXT,
  CHECK(NOT fetch_enabled OR (permission_confirmed AND permission_note IS NOT NULL AND length(btrim(permission_note))>10))
);
CREATE TABLE public.estimator_retail_references(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),source_id UUID REFERENCES public.estimator_sources(id),model_id TEXT NOT NULL REFERENCES public.estimator_models(id),
  source_url TEXT NOT NULL,source_name TEXT NOT NULL,variant TEXT NOT NULL,
  regular_price_php NUMERIC(12,2) NOT NULL CHECK(regular_price_php>0),price_php NUMERIC(12,2) NOT NULL CHECK(price_php>0 AND price_php<=regular_price_php),
  observed_at TIMESTAMPTZ NOT NULL,valid_until TIMESTAMPTZ,availability TEXT NOT NULL CHECK(availability IN('available','unknown','out_of_stock')),
  published BOOLEAN NOT NULL DEFAULT FALSE,method TEXT NOT NULL CHECK(method IN('manual','json_ld')),reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(source_id,observed_at)
);
CREATE INDEX estimator_reference_lookup ON public.estimator_retail_references(model_id,observed_at DESC) WHERE published;
CREATE TABLE public.estimator_sale_observations(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),model_id TEXT NOT NULL REFERENCES public.estimator_models(id),
  condition TEXT NOT NULL CHECK(condition IN('new','like_new','good','fair')),price_php NUMERIC(12,2) NOT NULL CHECK(price_php>0),sold_at TIMESTAMPTZ NOT NULL,
  seller_group TEXT NOT NULL,provenance TEXT NOT NULL CHECK(provenance IN('seller_reported','buyer_seller_confirmed')),
  evidence_note TEXT NOT NULL CHECK(length(btrim(evidence_note)) BETWEEN 10 AND 1000),approved BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES public.profiles(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX estimator_sale_lookup ON public.estimator_sale_observations(model_id,condition,sold_at DESC) WHERE approved;
CREATE TABLE public.estimator_estimates(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,identity_key TEXT NOT NULL,input JSONB NOT NULL,result JSONB NOT NULL,engine_version TEXT NOT NULL,
  parent_id UUID REFERENCES public.estimator_estimates(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,request_id)
);
CREATE INDEX estimator_history ON public.estimator_estimates(user_id,created_at DESC,id DESC);
CREATE TABLE public.estimator_trials(user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,estimate_id UUID NOT NULL REFERENCES public.estimator_estimates(id));
CREATE TABLE public.estimator_payments(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES auth.users(id),
  plan TEXT NOT NULL CHECK(plan IN('monthly','permanent')),amount_minor INTEGER NOT NULL,terms_version TEXT NOT NULL DEFAULT 'estimator_2026_11_01',
  livemode BOOLEAN NOT NULL,status TEXT NOT NULL DEFAULT 'creating' CHECK(status IN('creating','pending','paid','expired','review','refunded')),
  provider_checkout_id TEXT UNIQUE,provider_payment_id TEXT UNIQUE,checkout_url TEXT,paid_at TIMESTAMPTZ,
  refunded_amount_minor INTEGER NOT NULL DEFAULT 0 CHECK(refunded_amount_minor>=0),review_note TEXT,
  last_checked_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK((plan='monthly' AND amount_minor=5000) OR(plan='permanent' AND amount_minor=60000)),
  CHECK(refunded_amount_minor<=amount_minor)
);
CREATE INDEX estimator_payment_reconcile ON public.estimator_payments(livemode,last_checked_at NULLS FIRST) WHERE status IN('creating','pending','paid','review');
CREATE UNIQUE INDEX estimator_pending_payment ON public.estimator_payments(user_id,livemode) WHERE paid_at IS NULL AND status IN('creating','pending','review');
CREATE TABLE public.estimator_access_grants(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES auth.users(id),payment_id UUID NOT NULL UNIQUE REFERENCES public.estimator_payments(id),
  plan TEXT NOT NULL CHECK(plan IN('monthly','permanent')),starts_at TIMESTAMPTZ NOT NULL,ends_at TIMESTAMPTZ,revoked BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK((plan='permanent' AND ends_at IS NULL) OR(plan='monthly' AND ends_at>starts_at))
);
CREATE INDEX estimator_grant_lookup ON public.estimator_access_grants(user_id,ends_at) WHERE NOT revoked;
CREATE TABLE public.estimator_refunds(id TEXT PRIMARY KEY,payment_id UUID NOT NULL REFERENCES public.estimator_payments(id),amount_minor INTEGER NOT NULL CHECK(amount_minor>0));

CREATE FUNCTION public.estimator_access(p_user UUID) RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('premiumEnabled',s.premium_enabled,'freeAvailable',NOT EXISTS(SELECT 1 FROM public.estimator_trials WHERE user_id=p_user),
   'trialEstimateId',(SELECT estimate_id FROM public.estimator_trials WHERE user_id=p_user),
   'correctionUntil',(SELECT e.created_at+INTERVAL '24 hours' FROM public.estimator_trials t JOIN public.estimator_estimates e ON e.id=t.estimate_id WHERE t.user_id=p_user),
   'permanent',EXISTS(SELECT 1 FROM public.estimator_access_grants g JOIN public.estimator_payments p ON p.id=g.payment_id WHERE g.user_id=p_user AND p.livemode=s.livemode AND g.plan='permanent' AND NOT revoked AND starts_at<=NOW()),
   'active',EXISTS(SELECT 1 FROM public.estimator_access_grants g JOIN public.estimator_payments p ON p.id=g.payment_id WHERE g.user_id=p_user AND p.livemode=s.livemode AND NOT revoked AND starts_at<=NOW() AND(ends_at IS NULL OR ends_at>NOW())),
   'expiresAt',(SELECT MAX(ends_at) FROM public.estimator_access_grants g JOIN public.estimator_payments p ON p.id=g.payment_id WHERE g.user_id=p_user AND p.livemode=s.livemode AND NOT revoked AND ends_at>NOW()))
 FROM public.estimator_settings s WHERE id=TRUE;
$$;
CREATE FUNCTION public.save_estimator_estimate(p_user UUID,p_request UUID,p_identity TEXT,p_input JSONB,p_result JSONB,p_version TEXT,p_parent UUID DEFAULT NULL)
RETURNS public.estimator_estimates LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE previous public.estimator_estimates; result_row public.estimator_estimates; trial UUID; can_correct BOOLEAN:=FALSE; access JSONB;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::TEXT,591));
 SELECT * INTO previous FROM public.estimator_estimates WHERE user_id=p_user AND request_id=p_request;
 IF FOUND THEN IF previous.input<>p_input THEN RAISE EXCEPTION 'Estimate request changed'; END IF; RETURN previous; END IF;
 IF(SELECT COUNT(*) FROM public.estimator_estimates WHERE user_id=p_user AND created_at>NOW()-INTERVAL '1 hour')>=200 THEN RAISE EXCEPTION 'Please try again later'; END IF;
 SELECT estimate_id INTO trial FROM public.estimator_trials WHERE user_id=p_user;
 IF p_parent IS NOT NULL THEN
   SELECT EXISTS(SELECT 1 FROM public.estimator_estimates WHERE id=p_parent AND user_id=p_user AND identity_key=p_identity AND created_at>NOW()-INTERVAL '24 hours' AND(id=trial OR parent_id=trial) AND EXISTS(SELECT 1 FROM public.estimator_estimates root WHERE root.id=trial AND root.created_at>NOW()-INTERVAL '24 hours')) INTO can_correct;
 END IF;
 access:=public.estimator_access(p_user);
 IF(access->>'premiumEnabled')::BOOLEAN AND NOT(access->>'active')::BOOLEAN AND trial IS NOT NULL AND NOT can_correct THEN RAISE EXCEPTION 'Premium access required'; END IF;
 INSERT INTO public.estimator_estimates(user_id,request_id,identity_key,input,result,engine_version,parent_id)
 VALUES(p_user,p_request,p_identity,p_input,p_result,p_version,CASE WHEN can_correct THEN trial ELSE NULL END) RETURNING * INTO result_row;
 IF(access->>'premiumEnabled')::BOOLEAN AND NOT(access->>'active')::BOOLEAN AND trial IS NULL THEN INSERT INTO public.estimator_trials(user_id,estimate_id) VALUES(p_user,result_row.id); END IF;
 RETURN result_row;
END $$;
CREATE FUNCTION public.start_estimator_payment(p_user UUID,p_plan TEXT,p_live BOOLEAN) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row public.estimator_payments; access JSONB; mode BOOLEAN;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::TEXT,591));
 SELECT livemode INTO mode FROM public.estimator_settings WHERE id=TRUE;
 IF p_plan NOT IN('monthly','permanent') OR mode<>p_live THEN RAISE EXCEPTION 'Payment configuration mismatch'; END IF;
 access:=public.estimator_access(p_user);
 IF NOT(access->>'premiumEnabled')::BOOLEAN THEN RAISE EXCEPTION 'Paid access is not enabled during beta'; END IF;
 IF(access->>'permanent')::BOOLEAN THEN RAISE EXCEPTION 'Your account already has permanent access'; END IF;
 SELECT * INTO row FROM public.estimator_payments WHERE user_id=p_user AND livemode=p_live AND paid_at IS NULL AND status IN('creating','pending','review') FOR UPDATE;
 IF FOUND THEN
   IF row.plan<>p_plan THEN RAISE EXCEPTION 'Resolve your existing checkout before changing plans'; END IF;
   RETURN to_jsonb(row)||jsonb_build_object('create_checkout',FALSE);
 END IF;
 INSERT INTO public.estimator_payments(user_id,plan,amount_minor,livemode) VALUES(p_user,p_plan,CASE WHEN p_plan='monthly' THEN 5000 ELSE 60000 END,p_live) RETURNING * INTO row;
 RETURN to_jsonb(row)||jsonb_build_object('create_checkout',TRUE);
END $$;
CREATE FUNCTION public.attach_estimator_checkout(p_id UUID,p_checkout TEXT,p_url TEXT,p_live BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.estimator_payments SET provider_checkout_id=p_checkout,checkout_url=p_url,status=CASE WHEN paid_at IS NULL THEN 'pending' ELSE status END
 WHERE id=p_id AND livemode=p_live AND(provider_checkout_id IS NULL OR provider_checkout_id=p_checkout) AND status<>'expired';
 IF NOT FOUND THEN RAISE EXCEPTION 'Checkout cannot be attached'; END IF;
END $$;
CREATE FUNCTION public.fulfill_estimator_payment(p_id UUID,p_checkout TEXT,p_payment TEXT,p_amount INTEGER,p_live BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row public.estimator_payments; start_time TIMESTAMPTZ; end_time TIMESTAMPTZ;
BEGIN
 SELECT * INTO row FROM public.estimator_payments WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown payment'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(row.user_id::TEXT,591));
 SELECT * INTO row FROM public.estimator_payments WHERE id=p_id FOR UPDATE;
 IF row.livemode<>p_live OR row.amount_minor<>p_amount OR(row.provider_checkout_id IS NOT NULL AND row.provider_checkout_id<>p_checkout) OR(row.provider_payment_id IS NOT NULL AND row.provider_payment_id<>p_payment) THEN RAISE EXCEPTION 'Payment mismatch'; END IF;
 IF row.paid_at IS NOT NULL THEN RETURN; END IF;
 -- Provider-confirmed payment is authoritative even after local checkout expiry.
 -- Identity/mode/amount checks above still apply; retries remain idempotent.
 start_time:=NOW();
 IF row.plan='monthly' THEN
   SELECT GREATEST(NOW(),COALESCE(MAX(ends_at),NOW())) INTO start_time FROM public.estimator_access_grants g JOIN public.estimator_payments p ON p.id=g.payment_id WHERE g.user_id=row.user_id AND NOT g.revoked AND p.livemode=row.livemode;
   end_time:=((start_time AT TIME ZONE 'Asia/Manila')+INTERVAL '1 month') AT TIME ZONE 'Asia/Manila';
 END IF;
 UPDATE public.estimator_payments SET paid_at=NOW(),provider_checkout_id=p_checkout,provider_payment_id=p_payment,status='paid' WHERE id=p_id;
 INSERT INTO public.estimator_access_grants(user_id,payment_id,plan,starts_at,ends_at) VALUES(row.user_id,p_id,row.plan,start_time,end_time);
END $$;
CREATE FUNCTION public.expire_estimator_payment(p_id UUID,p_checkout TEXT,p_live BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.estimator_payments SET status='expired' WHERE id=p_id AND livemode=p_live AND paid_at IS NULL AND provider_checkout_id IS NOT DISTINCT FROM p_checkout;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment cannot be expired'; END IF;
END $$;
CREATE FUNCTION public.refund_estimator_payment(p_id UUID,p_payment TEXT,p_refund TEXT,p_amount INTEGER,p_live BOOLEAN) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE row public.estimator_payments; total INTEGER;
BEGIN
 SELECT * INTO row FROM public.estimator_payments WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR row.provider_payment_id<>p_payment OR row.livemode<>p_live OR row.paid_at IS NULL OR p_amount<=0 THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM public.estimator_refunds WHERE id=p_refund AND(payment_id<>p_id OR amount_minor<>p_amount)) THEN RAISE EXCEPTION 'Refund changed'; END IF;
 INSERT INTO public.estimator_refunds(id,payment_id,amount_minor) VALUES(p_refund,p_id,p_amount) ON CONFLICT DO NOTHING;
 SELECT SUM(amount_minor) INTO total FROM public.estimator_refunds WHERE payment_id=p_id;
 IF total>row.amount_minor THEN RAISE EXCEPTION 'Refund exceeds payment'; END IF;
 UPDATE public.estimator_payments SET refunded_amount_minor=total,status=CASE WHEN total=row.amount_minor THEN 'refunded' ELSE 'review' END,
 review_note=CASE WHEN total<row.amount_minor THEN 'Partial refund requires review; existing access retained.' ELSE 'Full provider-confirmed refund.' END WHERE id=p_id;
 IF total=row.amount_minor THEN UPDATE public.estimator_access_grants SET revoked=TRUE WHERE payment_id=p_id; END IF;
END $$;
CREATE FUNCTION public.claim_estimator_sources() RETURNS SETOF public.estimator_sources LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH work AS(SELECT id FROM public.estimator_sources WHERE fetch_enabled AND permission_confirmed AND next_due_at<=NOW() AND(lease_until IS NULL OR lease_until<NOW()) ORDER BY next_due_at LIMIT 3 FOR UPDATE SKIP LOCKED)
 UPDATE public.estimator_sources s SET lease_until=NOW()+INTERVAL '5 minutes',last_attempt_at=NOW() FROM work WHERE s.id=work.id RETURNING s.*;
$$;

INSERT INTO public.estimator_models(id,brand,name,aliases) VALUES
 ('adidas-evo-sl','Adidas','Adizero Evo SL',ARRAY['Evo SL','Adizero Evo SL original']),
 ('asics-novablast-5','Asics','Novablast 5',ARRAY['Novablast5']),
 ('nike-pegasus-41','Nike','Pegasus 41',ARRAY['Pegasus41','Air Zoom Pegasus 41']);
INSERT INTO public.estimator_sources(model_id,source_name,url,sku,variant) VALUES
 ('adidas-evo-sl','Adidas Philippines','https://www.adidas.com.ph/adizero-evo-sl-shoes/KJ1363.html','KJ1363','Core Black / Grey Four / Impact Orange'),
 ('asics-novablast-5','ASICS Philippines','https://www.asics.com/ph/en-ph/novablast-5/p/1011B974-750.html','1011B974-750','Citron / White'),
 ('nike-pegasus-41','Sports Central PH','https://sportscentral.ph/products/nike-men-pegasus-41-road-running-shoes-fd2722-501','FD2722-501','Sanded Purple / Volt / Seaweed / Cannon');
INSERT INTO public.estimator_retail_references(source_id,model_id,source_url,source_name,variant,regular_price_php,price_php,observed_at,availability,published,method)
 SELECT id,model_id,url,source_name,variant,
 CASE model_id WHEN 'adidas-evo-sl' THEN 8500 WHEN 'asics-novablast-5' THEN 9290 ELSE 7395 END,
 CASE model_id WHEN 'adidas-evo-sl' THEN 6800 WHEN 'asics-novablast-5' THEN 6503 ELSE 4437 END,
 '2026-11-01T00:00:00+08:00','unknown',TRUE,'manual' FROM public.estimator_sources;

DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['estimator_settings','estimator_models','estimator_sources','estimator_retail_references','estimator_sale_observations','estimator_estimates','estimator_trials','estimator_payments','estimator_access_grants','estimator_refunds'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
GRANT SELECT ON public.estimator_estimates,public.estimator_payments,public.estimator_access_grants TO authenticated;
CREATE POLICY "Estimator own history" ON public.estimator_estimates FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Estimator own payments" ON public.estimator_payments FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Estimator own grants" ON public.estimator_access_grants FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON FUNCTION public.estimator_access(UUID),public.save_estimator_estimate(UUID,UUID,TEXT,JSONB,JSONB,TEXT,UUID),
 public.start_estimator_payment(UUID,TEXT,BOOLEAN),public.attach_estimator_checkout(UUID,TEXT,TEXT,BOOLEAN),public.fulfill_estimator_payment(UUID,TEXT,TEXT,INTEGER,BOOLEAN),
 public.expire_estimator_payment(UUID,TEXT,BOOLEAN),public.refund_estimator_payment(UUID,TEXT,TEXT,INTEGER,BOOLEAN),public.claim_estimator_sources() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.estimator_access(UUID),public.save_estimator_estimate(UUID,UUID,TEXT,JSONB,JSONB,TEXT,UUID),
 public.start_estimator_payment(UUID,TEXT,BOOLEAN),public.attach_estimator_checkout(UUID,TEXT,TEXT,BOOLEAN),public.fulfill_estimator_payment(UUID,TEXT,TEXT,INTEGER,BOOLEAN),
 public.expire_estimator_payment(UUID,TEXT,BOOLEAN),public.refund_estimator_payment(UUID,TEXT,TEXT,INTEGER,BOOLEAN),public.claim_estimator_sources() TO service_role;
COMMIT;
