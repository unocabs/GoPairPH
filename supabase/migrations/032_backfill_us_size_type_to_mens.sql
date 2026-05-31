-- If migration 031 was already applied with legacy unknown defaults, normalize
-- those values to men's sizing and make men's the default going forward.

ALTER TABLE shoes
  ALTER COLUMN us_size_type SET DEFAULT 'mens';

ALTER TABLE shoe_variants
  ALTER COLUMN us_size_type SET DEFAULT 'mens';

ALTER TABLE wishlist_items
  ALTER COLUMN us_size_type SET DEFAULT 'mens';

ALTER TABLE saved_searches
  ALTER COLUMN us_size_type SET DEFAULT 'mens';

UPDATE shoes
SET us_size_type = 'mens'
WHERE us_size_type = 'unknown';

UPDATE shoe_variants
SET us_size_type = 'mens'
WHERE us_size_type = 'unknown';

UPDATE wishlist_items
SET us_size_type = 'mens'
WHERE us_size_type = 'unknown';

UPDATE saved_searches
SET us_size_type = 'mens'
WHERE us_size_type = 'unknown';
