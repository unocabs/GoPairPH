-- One-time seller note attached to an offer/request status.
-- This is intentionally not a threaded chat.

ALTER TABLE purchase_requests
ADD COLUMN IF NOT EXISTS seller_message TEXT,
ADD COLUMN IF NOT EXISTS seller_message_at TIMESTAMPTZ;
