-- Disposable local test database only. Never apply this fixture to Supabase.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', TRUE), '')::UUID $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role, anon;
CREATE SCHEMA realtime;
CREATE TABLE realtime.messages (id UUID);
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION realtime.topic() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('realtime.topic', TRUE) $$;
CREATE FUNCTION realtime.send(JSONB, TEXT, TEXT, BOOLEAN) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT SELECT ON realtime.messages TO authenticated;
CREATE TABLE public.profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE,
  display_name TEXT DEFAULT 'Test runner', is_admin BOOLEAN DEFAULT FALSE, is_verified BOOLEAN DEFAULT FALSE);
CREATE TABLE public.shoes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES profiles(id),
  brand TEXT DEFAULT 'Test', model TEXT DEFAULT 'Shoes', price_php NUMERIC(10,2) DEFAULT 5000, slug TEXT,
  listing_type TEXT DEFAULT 'for_sale', status TEXT DEFAULT 'active', has_stock BOOLEAN DEFAULT TRUE,
  inventory_mode TEXT DEFAULT 'single', shop_id UUID, size_eu NUMERIC DEFAULT 42, size_us NUMERIC, size_cm NUMERIC, us_size_type TEXT DEFAULT 'mens',
  is_negotiable BOOLEAN DEFAULT TRUE, closed_sale_channel TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), renewal_reminder_sent_at TIMESTAMPTZ);
CREATE TABLE public.shoe_images (id UUID DEFAULT gen_random_uuid(), shoe_id UUID REFERENCES shoes(id) ON DELETE CASCADE, storage_path TEXT, "order" INTEGER DEFAULT 0);
CREATE TABLE public.shoe_variants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), shoe_id UUID REFERENCES shoes(id) ON DELETE CASCADE, size_eu NUMERIC, quantity INTEGER CHECK (quantity >= 0));
CREATE TABLE public.purchase_requests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, message TEXT, status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(), variant_id UUID REFERENCES shoe_variants(id), offer_price_php NUMERIC, seller_message TEXT, seller_message_at TIMESTAMPTZ);
CREATE TABLE public.buyback_offers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID REFERENCES shoes(id), seller_id UUID REFERENCES profiles(id), status TEXT DEFAULT 'accepted',
  proposed_ship_date DATE, expires_at TIMESTAMPTZ, shipping_reminder_sent_at TIMESTAMPTZ);
CREATE TABLE public.buyback_inventory_items (resale_listing_id UUID, status TEXT, sold_at TIMESTAMPTZ);
CREATE TABLE public.saved_search_notifications (saved_search_id UUID, user_id UUID, listing_id UUID, sent_date DATE, UNIQUE(saved_search_id,listing_id));
CREATE TABLE public.profile_match_notifications (user_id UUID, listing_id UUID, sent_date DATE, UNIQUE(user_id,listing_id));
GRANT SELECT ON public.profiles, public.shoes, public.shoe_variants TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
