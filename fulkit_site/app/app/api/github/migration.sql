-- Run this in Supabase SQL editor to create the integrations table

CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Users can only check if their own integrations exist (no token exposure)
CREATE POLICY "Users read own integrations"
  ON integrations FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (server-side API routes)
-- No additional policies needed — service role bypasses RLS
