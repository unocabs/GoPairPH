-- Add stable, SEO-friendly slugs for public listing URLs.
-- Slugs are generated once on insert and are not tied to later brand/model edits.

CREATE OR REPLACE FUNCTION make_shoe_slug_base(p_brand text, p_model text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw text;
  base text;
BEGIN
  raw := CASE
    WHEN lower(trim(coalesce(p_brand, ''))) = 'other' THEN coalesce(p_model, '')
    ELSE concat_ws(' ', nullif(trim(coalesce(p_brand, '')), ''), nullif(trim(coalesce(p_model, '')), ''))
  END;

  base := lower(raw);
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-|-$)', '', 'g');
  base := substring(base from 1 for 120);
  base := regexp_replace(base, '-$', '');

  RETURN coalesce(nullif(base, ''), 'running-shoes');
END;
$$;

ALTER TABLE shoes ADD COLUMN slug text;

CREATE OR REPLACE FUNCTION generate_unique_shoe_slug(
  p_brand text,
  p_model text,
  p_requested_slug text DEFAULT NULL,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  suffix integer := 1;
BEGIN
  PERFORM pg_advisory_xact_lock(753204911);

  IF nullif(trim(coalesce(p_requested_slug, '')), '') IS NULL THEN
    base := make_shoe_slug_base(p_brand, p_model);
  ELSE
    base := lower(trim(p_requested_slug));
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := regexp_replace(base, '(^-|-$)', '', 'g');
    base := substring(base from 1 for 120);
    base := regexp_replace(base, '-$', '');
    base := coalesce(nullif(base, ''), make_shoe_slug_base(p_brand, p_model));
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1
    FROM shoes
    WHERE slug = candidate
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
  ) LOOP
    suffix := suffix + 1;
    candidate := substring(base from 1 for greatest(1, 139 - length(suffix::text) - 1)) || '-' || suffix::text;
  END LOOP;

  RETURN candidate;
END;
$$;

DO $$
DECLARE
  shoe_row record;
BEGIN
  FOR shoe_row IN
    SELECT id, brand, model
    FROM shoes
    ORDER BY created_at ASC, id ASC
  LOOP
    UPDATE shoes
    SET slug = generate_unique_shoe_slug(shoe_row.brand, shoe_row.model, NULL, shoe_row.id)
    WHERE id = shoe_row.id;
  END LOOP;
END;
$$;

ALTER TABLE shoes
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT shoes_slug_format CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,138}[a-z0-9])?$');

CREATE UNIQUE INDEX shoes_slug_unique ON shoes (slug);

CREATE OR REPLACE FUNCTION set_shoe_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := generate_unique_shoe_slug(NEW.brand, NEW.model, NEW.slug, NEW.id);
  ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
    NEW.slug := generate_unique_shoe_slug(NEW.brand, NEW.model, NEW.slug, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER shoes_set_slug
  BEFORE INSERT OR UPDATE OF slug ON shoes
  FOR EACH ROW EXECUTE FUNCTION set_shoe_slug();
