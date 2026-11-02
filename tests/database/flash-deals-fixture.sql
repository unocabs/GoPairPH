-- Local test extension to payment-fixture.sql; never run on hosted Supabase.
CREATE TABLE shops(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),status TEXT DEFAULT 'active');
ALTER TABLE shoes ADD COLUMN shop_id UUID REFERENCES shops(id), ADD COLUMN listing_type TEXT DEFAULT 'for_sale',
 ADD COLUMN price_php NUMERIC(10,2) DEFAULT 5000, ADD COLUMN has_stock BOOLEAN DEFAULT TRUE,
 ADD COLUMN listed_in_main_feed BOOLEAN DEFAULT TRUE, ADD COLUMN running_relevance_flagged BOOLEAN DEFAULT FALSE,
 ADD COLUMN inventory_mode TEXT DEFAULT 'single', ADD COLUMN is_negotiable BOOLEAN DEFAULT FALSE;
CREATE TABLE shoe_images(id UUID DEFAULT uuid_generate_v4(),shoe_id UUID REFERENCES shoes(id));
CREATE TABLE shoe_variants(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),shoe_id UUID REFERENCES shoes(id),quantity INTEGER DEFAULT 1);
CREATE TABLE purchase_requests(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),listing_id UUID REFERENCES shoes(id),buyer_id UUID REFERENCES profiles(id),
 message TEXT,offer_price_php NUMERIC,variant_id UUID,listed_price_php NUMERIC,conversation_id UUID,status TEXT DEFAULT 'pending',version INTEGER DEFAULT 1,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE purchase_request_attempts(actor_id UUID,client_id UUID,request_id UUID,PRIMARY KEY(actor_id,client_id));
CREATE TABLE chat_messages(id UUID DEFAULT uuid_generate_v4(),sender_id UUID,kind TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE FUNCTION chat_profile_id() RETURNS UUID LANGUAGE SQL AS $$ SELECT id FROM public.profiles WHERE user_id=auth.uid() $$;
CREATE FUNCTION chat_pair_lock(UUID,UUID) RETURNS VOID LANGUAGE SQL AS $$ SELECT $$;
CREATE FUNCTION chat_is_blocked(UUID,UUID) RETURNS BOOLEAN LANGUAGE SQL AS $$ SELECT FALSE $$;
CREATE FUNCTION chat_ensure_conversation(UUID,UUID) RETURNS UUID LANGUAGE SQL AS $$ SELECT public.uuid_generate_v4() $$;
CREATE FUNCTION chat_append(UUID,UUID,TEXT) RETURNS UUID LANGUAGE SQL AS $$ SELECT public.uuid_generate_v4() $$;
