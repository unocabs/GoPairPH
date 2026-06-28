-- Transactional/marketing email consent, event tracking, and suppression.
-- IMPORTANT: This migration must be applied manually in the Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_email_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS marketing_email_unsubscribed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_marketing_email_enabled_idx
  ON public.profiles (marketing_email_enabled)
  WHERE marketing_email_enabled = TRUE;

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email TEXT PRIMARY KEY CHECK (email = lower(btrim(email))),
  reason TEXT NOT NULL CHECK (reason IN ('complaint', 'permanent_bounce', 'provider_suppression')),
  resend_email_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_event_id TEXT NOT NULL,
  resend_email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL CHECK (recipient = lower(btrim(recipient))),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (webhook_event_id, recipient)
);

CREATE INDEX IF NOT EXISTS email_delivery_events_email_idx
  ON public.email_delivery_events (resend_email_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS email_delivery_events_recipient_idx
  ON public.email_delivery_events (recipient, occurred_at DESC);

DROP TRIGGER IF EXISTS email_suppressions_updated_at ON public.email_suppressions;
CREATE TRIGGER email_suppressions_updated_at
  BEFORE UPDATE ON public.email_suppressions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

-- No client policies: these tables are service-role only because they contain
-- recipient addresses and provider delivery details.
