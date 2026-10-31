-- IMPORTANT: Apply manually in the Supabase SQL Editor before deploying the app.
-- Renewal bumps discovery order without changing the original posting date or
-- resending new-listing alerts. Existing renewals are included automatically.
BEGIN;

ALTER TABLE public.shoes
  ADD COLUMN IF NOT EXISTS freshness_at TIMESTAMPTZ
  GENERATED ALWAYS AS (COALESCE(renewed_at, created_at)) STORED;

CREATE INDEX IF NOT EXISTS shoes_active_freshness_idx
  ON public.shoes (freshness_at DESC, id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS shoes_shop_freshness_idx
  ON public.shoes (shop_id, freshness_at DESC, id)
  WHERE status = 'active';

-- Generated columns are computed after BEFORE triggers. Exclude them from the
-- change comparison so reminder-only writes do not look like seller edits.
CREATE OR REPLACE FUNCTION public.set_shoes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'updated_at' - 'renewal_reminder_sent_at' - 'freshness_at' - 'search_text')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'updated_at' - 'renewal_reminder_sent_at' - 'freshness_at' - 'search_text') THEN
    NEW.updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
