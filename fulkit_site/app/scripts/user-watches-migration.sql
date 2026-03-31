-- User Watches — monitor URLs for changes, get whispers when content updates.
-- Run once in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS user_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  content_hash TEXT,
  last_checked_at TIMESTAMPTZ,
  last_changed_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watches"
  ON user_watches FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_watches_active ON user_watches(active, last_checked_at);
