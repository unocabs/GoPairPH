-- Shops (multi-tenant resellers) v1
-- Each shop is a curated storefront under /shop/<slug>. Listings can be
-- linked to a shop (shoes.shop_id) and optionally hidden from the main
-- /browse feed (shoes.listed_in_main_feed). Shop owners can list with a
-- per-listing quantity for multi-stock inventory.

CREATE TYPE shop_status AS ENUM ('active', 'suspended');

CREATE TABLE shops (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$'),
  name              TEXT NOT NULL,
  owner_profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logo_storage_path TEXT,
  about             TEXT,
  location          TEXT,
  fb_page_url       TEXT,
  status            shop_status NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shops_slug   ON shops (slug);
CREATE INDEX shops_owner  ON shops (owner_profile_id);
CREATE INDEX shops_status ON shops (status);

CREATE TRIGGER shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Extend shoes for shop attribution + multi-stock + per-listing main-feed toggle.
ALTER TABLE shoes
  ADD COLUMN shop_id              UUID REFERENCES shops(id) ON DELETE SET NULL,
  ADD COLUMN quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  ADD COLUMN listed_in_main_feed  BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX shoes_shop_id ON shoes (shop_id);

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shops: public read active" ON shops FOR SELECT USING (status = 'active');

CREATE POLICY "Shops: owner read" ON shops FOR SELECT
  USING (owner_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Shops: owner update" ON shops FOR UPDATE
  USING (owner_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- INSERT/DELETE intentionally restricted to admins (service role) in v1.
-- Shop applications go through email; admin manually inserts rows.

-- Storage: a public 'shop-logos' bucket needs to be created via the Supabase
-- dashboard SQL editor (or dashboard UI):
--   INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true);
--   CREATE POLICY "ShopLogos: public read"  ON storage.objects FOR SELECT
--     USING (bucket_id = 'shop-logos');
--   CREATE POLICY "ShopLogos: auth upload"  ON storage.objects FOR INSERT
--     WITH CHECK (bucket_id = 'shop-logos' AND auth.role() = 'authenticated');
--   CREATE POLICY "ShopLogos: owner delete" ON storage.objects FOR DELETE
--     USING (bucket_id = 'shop-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
