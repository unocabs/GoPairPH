-- Combined, indexed search surface for marketplace brand/model keyword queries.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.shoes
  ADD COLUMN IF NOT EXISTS search_text TEXT
  GENERATED ALWAYS AS (
    COALESCE(brand, '') || ' ' || COALESCE(model, '')
  ) STORED;

CREATE INDEX IF NOT EXISTS shoes_search_text_trgm_idx
  ON public.shoes
  USING GIN (search_text gin_trgm_ops);
