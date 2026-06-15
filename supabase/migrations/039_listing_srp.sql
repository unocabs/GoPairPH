-- Optional SRP / retail price reference for sale listings.
-- Existing listings stay unchanged; null SRP simply does not render.

ALTER TABLE shoes
  ADD COLUMN IF NOT EXISTS srp_php NUMERIC(10,2) NULL;

ALTER TABLE shoes
  DROP CONSTRAINT IF EXISTS shoes_srp_php_valid;

ALTER TABLE shoes
  ADD CONSTRAINT shoes_srp_php_valid
  CHECK (
    srp_php IS NULL
    OR (
      srp_php >= 0
      AND (price_php IS NULL OR srp_php >= price_php)
    )
  );
