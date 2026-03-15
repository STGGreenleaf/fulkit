-- Add topics column to conversations for recall rail
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS topics text[] DEFAULT '{}';

-- Index for topic search (GIN index on array)
CREATE INDEX IF NOT EXISTS idx_conversations_topics ON conversations USING GIN (topics);
