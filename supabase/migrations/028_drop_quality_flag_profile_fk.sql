-- Emergency compatibility fix:
-- quality_flagged_by should not create a second shoes -> profiles relationship,
-- because existing PostgREST embeds like profiles(*) can become ambiguous.

ALTER TABLE shoes
  DROP CONSTRAINT IF EXISTS shoes_quality_flagged_by_fkey;
