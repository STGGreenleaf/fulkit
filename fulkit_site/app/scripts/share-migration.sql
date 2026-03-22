-- Share system migration
-- Run in Supabase SQL Editor

-- Table for shared message snippets (single message pairs)
CREATE TABLE IF NOT EXISTS shared_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT,
  assistant_message TEXT NOT NULL,
  conversation_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_snippets_token ON shared_snippets (token);
CREATE INDEX IF NOT EXISTS idx_shared_snippets_user ON shared_snippets (user_id);

-- Enable RLS (service role bypasses, no public access needed since share page uses server component)
ALTER TABLE shared_snippets ENABLE ROW LEVEL SECURITY;

-- Users can see/delete their own shared snippets
CREATE POLICY "Users can view own snippets" ON shared_snippets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snippets" ON shared_snippets FOR DELETE USING (auth.uid() = user_id);

-- Optional: columns on conversations table for full conversation sharing (future)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_conversations_share_token ON conversations (share_token) WHERE share_token IS NOT NULL;
