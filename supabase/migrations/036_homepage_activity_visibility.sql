-- Admin-controlled visibility for homepage marketplace activity stats.
-- Default is admin-only until the marketplace has enough activity to show publicly.

ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS show_homepage_activity_publicly BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO site_settings (id, show_homepage_activity_publicly)
VALUES (TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;
