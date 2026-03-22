-- Add share columns to conversations table
-- Run in Supabase SQL Editor

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Index for fast lookup by share token
CREATE INDEX IF NOT EXISTS idx_conversations_share_token ON conversations (share_token) WHERE share_token IS NOT NULL;

-- RLS: allow public read of shared conversations (share page is unauthenticated)
-- The share/[token] page uses the service role key (server component), so no RLS policy needed.
-- Share token acts as a capability token — knowing it = access.
