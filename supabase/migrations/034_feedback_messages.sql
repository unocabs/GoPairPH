-- Product feedback from users after important marketplace actions.

CREATE TABLE IF NOT EXISTS feedback_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  listing_id UUID NULL REFERENCES shoes(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'suggestion'
    CHECK (category IN ('confusing', 'missing_feature', 'bug', 'suggestion')),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 800),
  contact_email TEXT NULL,
  page_path TEXT NOT NULL DEFAULT '/',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_messages_created_at_idx
  ON feedback_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_messages_status_idx
  ON feedback_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS feedback_messages_profile_idx
  ON feedback_messages (profile_id, created_at DESC)
  WHERE profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS feedback_messages_listing_idx
  ON feedback_messages (listing_id, created_at DESC)
  WHERE listing_id IS NOT NULL;

ALTER TABLE feedback_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feedback: owner insert" ON feedback_messages;
CREATE POLICY "Feedback: owner insert"
  ON feedback_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      profile_id IS NULL
      OR profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
