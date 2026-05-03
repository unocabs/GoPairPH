-- Drop the circular-dependency policy from the first attempt (if it exists).
DROP POLICY IF EXISTS "Shoes: buyer sees own requested" ON shoes;

-- Extend public read to cover all non-archived statuses.
-- active    — normal browse/search
-- reserved  — buyer whose offer was accepted needs to read it in purchase history joins
-- sold      — buyer needs to read it in completed purchase history joins
-- donated   — same as sold for donation listings
-- archived  — intentionally excluded; seller hid it
DROP POLICY IF EXISTS "Shoes: public read active or reserved" ON shoes;
DROP POLICY IF EXISTS "Shoes: public read active" ON shoes;
CREATE POLICY "Shoes: public read" ON shoes FOR SELECT USING (
  status IN ('active', 'reserved', 'sold', 'donated')
);
