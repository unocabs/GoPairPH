-- Allow admins to UPDATE any shoe row (needed for the home-page feature
-- toggle, which sets `is_featured` on listings the admin doesn't own).
--
-- Without this policy, only the seller (per the "Shoes: owner update"
-- policy from migration 001) can update a row. The client receives no
-- error — RLS silently filters the row out and returns 0 rows changed.

DROP POLICY IF EXISTS "Shoes: admin update" ON shoes;
CREATE POLICY "Shoes: admin update" ON shoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    )
  );
