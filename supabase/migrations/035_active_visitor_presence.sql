-- Lightweight active visitor presence for the navbar counter.
-- Counts approximate browser sessions seen in the last few minutes.

CREATE TABLE IF NOT EXISTS visitor_presence (
  visitor_hash TEXT PRIMARY KEY,
  profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS visitor_presence_last_seen_idx
  ON visitor_presence (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS visitor_presence_public_active_idx
  ON visitor_presence (last_seen_at DESC)
  WHERE is_admin = FALSE;

CREATE TABLE IF NOT EXISTS site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  show_active_visitors_publicly BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO site_settings (id, show_active_visitors_publicly)
VALUES (TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE visitor_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON visitor_presence FROM anon, authenticated;
REVOKE ALL ON site_settings FROM anon, authenticated;

GRANT ALL ON visitor_presence TO service_role;
GRANT ALL ON site_settings TO service_role;
