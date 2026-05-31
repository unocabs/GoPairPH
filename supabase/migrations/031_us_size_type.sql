-- Track whether a US shoe size is men's, women's, unisex, or legacy unknown.
-- Existing rows default to men's because most Go Pair PH listings use men's/unisex US sizing.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS us_size_type TEXT NOT NULL DEFAULT 'mens'
  CHECK (us_size_type IN ('mens', 'womens', 'unisex', 'unknown'));

ALTER TABLE shoe_variants
  ADD COLUMN IF NOT EXISTS us_size_type TEXT NOT NULL DEFAULT 'mens'
  CHECK (us_size_type IN ('mens', 'womens', 'unisex', 'unknown'));

ALTER TABLE wishlist_items
  ADD COLUMN IF NOT EXISTS us_size_type TEXT NOT NULL DEFAULT 'mens'
  CHECK (us_size_type IN ('mens', 'womens', 'unisex', 'unknown'));

ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS us_size_type TEXT NOT NULL DEFAULT 'mens'
  CHECK (us_size_type IN ('mens', 'womens', 'unisex', 'unknown'));

UPDATE shoes SET us_size_type = 'mens' WHERE us_size_type = 'unknown';
UPDATE shoe_variants SET us_size_type = 'mens' WHERE us_size_type = 'unknown';
UPDATE wishlist_items SET us_size_type = 'mens' WHERE us_size_type = 'unknown';
UPDATE saved_searches SET us_size_type = 'mens' WHERE us_size_type = 'unknown';

CREATE INDEX IF NOT EXISTS shoes_us_size_type_idx
  ON shoes (us_size_type)
  WHERE size_us IS NOT NULL;

CREATE INDEX IF NOT EXISTS shoe_variants_us_size_type_idx
  ON shoe_variants (us_size_type)
  WHERE size_us IS NOT NULL;

CREATE INDEX IF NOT EXISTS wishlist_items_us_size_type_idx
  ON wishlist_items (us_size_type)
  WHERE size_us IS NOT NULL;

CREATE INDEX IF NOT EXISTS saved_searches_us_size_type_idx
  ON saved_searches (us_size_type)
  WHERE size_us IS NOT NULL;
