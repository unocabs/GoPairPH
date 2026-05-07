-- Removes existing duplicate shoe_images (same shoe_id + view_type), keeping
-- the row with the highest "order", then the most recently created.
-- Adds a UNIQUE constraint so duplicates can't be inserted again.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY shoe_id, view_type
      ORDER BY "order" DESC, created_at DESC
    ) AS rn
  FROM shoe_images
)
DELETE FROM shoe_images
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE shoe_images
  ADD CONSTRAINT shoe_images_shoe_id_view_type_key UNIQUE (shoe_id, view_type);
