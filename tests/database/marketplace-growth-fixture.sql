-- Disposable local PostgreSQL database only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', TRUE), '')::UUID $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
CREATE TABLE public.profiles (id UUID PRIMARY KEY, user_id UUID UNIQUE, display_name TEXT, is_admin BOOLEAN DEFAULT FALSE);
CREATE TABLE public.shoes (id UUID PRIMARY KEY, seller_id UUID REFERENCES public.profiles(id), brand TEXT NOT NULL, model TEXT NOT NULL,
  status TEXT DEFAULT 'active', listing_type TEXT DEFAULT 'for_sale', has_stock BOOLEAN DEFAULT TRUE, listed_in_main_feed BOOLEAN DEFAULT TRUE,
  freshness_at TIMESTAMPTZ DEFAULT NOW(), quality_flagged_at TIMESTAMPTZ, updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;
CREATE TRIGGER shoes_updated_at BEFORE UPDATE ON public.shoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.shoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY shoes_public_read ON public.shoes FOR SELECT USING (TRUE);
CREATE POLICY shoes_owner_write ON public.shoes FOR UPDATE TO authenticated USING (seller_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
GRANT SELECT ON public.profiles, public.shoes TO anon, authenticated;
GRANT UPDATE ON public.shoes TO authenticated;
CREATE TABLE public.listing_daily_views (listing_id UUID REFERENCES public.shoes(id), view_date DATE DEFAULT (NOW() AT TIME ZONE 'Asia/Manila')::DATE, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.chat_conversations (id UUID PRIMARY KEY, listing_id UUID REFERENCES public.shoes(id), buyer_id UUID REFERENCES public.profiles(id), seller_id UUID REFERENCES public.profiles(id));
CREATE TABLE public.chat_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID REFERENCES public.chat_conversations(id), sender_id UUID REFERENCES public.profiles(id), kind TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.purchase_requests (listing_id UUID REFERENCES public.shoes(id), buyer_id UUID REFERENCES public.profiles(id), status TEXT, seller_message_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.promotion_payments (seller_id UUID REFERENCES public.profiles(id), listing_id UUID REFERENCES public.shoes(id), livemode BOOLEAN, provider TEXT, paid_at TIMESTAMPTZ, amount_minor INTEGER, refunded_amount_minor INTEGER DEFAULT 0, coins_used INTEGER DEFAULT 0);
CREATE TABLE public.estimator_payments (user_id UUID, livemode BOOLEAN, paid_at TIMESTAMPTZ, amount_minor INTEGER, refunded_amount_minor INTEGER DEFAULT 0);
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
INSERT INTO public.profiles (id,user_id,display_name,is_admin) VALUES
 ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Seller',FALSE),
 ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Buyer',FALSE),
 ('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Admin',TRUE),
 ('00000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','Test account',FALSE),
 ('00000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000005','Other buyer',FALSE);
INSERT INTO public.shoes (id,seller_id,brand,model,updated_at) VALUES
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','Nike','Lebron XXII','2001-01-01'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001','Nike','Pegasus 41','2001-01-01');
