-- SoleSwapPH Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ENUM TYPES
CREATE TYPE listing_type_enum AS ENUM ('for_sale', 'for_trade', 'donate');
CREATE TYPE condition_enum    AS ENUM ('new', 'like_new', 'good', 'fair');
CREATE TYPE listing_status    AS ENUM ('active', 'sold', 'traded', 'donated', 'archived');
CREATE TYPE view_type_enum    AS ENUM ('top', 'sole', 'front', 'left', 'right', 'back');

-- PROFILES
CREATE TABLE profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  location     TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- SHOES
CREATE TABLE shoes (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand              TEXT NOT NULL,
  model              TEXT NOT NULL,
  size_eu            NUMERIC(4,1),
  size_us            NUMERIC(4,1),
  size_cm            NUMERIC(5,1),
  color              TEXT NOT NULL,
  condition          condition_enum NOT NULL,
  mileage_km         INTEGER NOT NULL CHECK (mileage_km >= 0),
  listing_type       listing_type_enum NOT NULL,
  price_php          NUMERIC(10,2),
  trade_looking_for  TEXT,
  description        TEXT,
  status             listing_status NOT NULL DEFAULT 'active',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shoes_brand_trgm   ON shoes USING gin (brand   gin_trgm_ops);
CREATE INDEX shoes_model_trgm   ON shoes USING gin (model   gin_trgm_ops);
CREATE INDEX shoes_listing_type ON shoes (listing_type);
CREATE INDEX shoes_condition    ON shoes (condition);
CREATE INDEX shoes_status       ON shoes (status);
CREATE INDEX shoes_seller_id    ON shoes (seller_id);
CREATE INDEX shoes_size_eu      ON shoes (size_eu);
CREATE INDEX shoes_created_at   ON shoes (created_at DESC);

-- SHOE IMAGES
CREATE TABLE shoe_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shoe_id      UUID NOT NULL REFERENCES shoes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  view_type    view_type_enum NOT NULL,
  "order"      SMALLINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shoe_images_shoe_id ON shoe_images (shoe_id);

-- WISHLIST ITEMS
CREATE TABLE wishlist_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand       TEXT NOT NULL,
  model       TEXT NOT NULL,
  size        TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX wishlist_user_id ON wishlist_items (user_id);

-- updated_at TRIGGER
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER shoes_updated_at    BEFORE UPDATE ON shoes    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoe_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Profiles: public read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: owner update"  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- SHOES RLS
CREATE POLICY "Shoes: public read active" ON shoes FOR SELECT USING (status = 'active');
CREATE POLICY "Shoes: owner sees all own" ON shoes FOR SELECT USING (
  seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Shoes: authenticated insert" ON shoes FOR INSERT WITH CHECK (
  seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Shoes: owner update" ON shoes FOR UPDATE USING (
  seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Shoes: owner delete" ON shoes FOR DELETE USING (
  seller_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- SHOE IMAGES RLS
CREATE POLICY "ShoeImages: public read" ON shoe_images FOR SELECT USING (true);
CREATE POLICY "ShoeImages: owner insert" ON shoe_images FOR INSERT WITH CHECK (
  shoe_id IN (
    SELECT s.id FROM shoes s
    JOIN profiles p ON p.id = s.seller_id
    WHERE p.user_id = auth.uid()
  )
);
CREATE POLICY "ShoeImages: owner delete" ON shoe_images FOR DELETE USING (
  shoe_id IN (
    SELECT s.id FROM shoes s
    JOIN profiles p ON p.id = s.seller_id
    WHERE p.user_id = auth.uid()
  )
);

-- WISHLIST RLS
CREATE POLICY "Wishlist: public read"    ON wishlist_items FOR SELECT USING (true);
CREATE POLICY "Wishlist: owner insert"   ON wishlist_items FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Wishlist: owner delete"   ON wishlist_items FOR DELETE USING (
  user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- STORAGE BUCKET (run via Supabase dashboard SQL editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shoe-images', 'shoe-images', true);
-- CREATE POLICY "Storage: public read" ON storage.objects FOR SELECT USING (bucket_id = 'shoe-images');
-- CREATE POLICY "Storage: auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shoe-images' AND auth.role() = 'authenticated');
-- CREATE POLICY "Storage: owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'shoe-images' AND auth.uid()::text = (storage.foldername(name))[1]);
