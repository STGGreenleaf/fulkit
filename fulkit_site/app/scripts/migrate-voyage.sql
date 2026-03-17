-- Migration: OpenAI text-embedding-3-small (1536d) → Voyage voyage-3.5-lite (1024d)
-- Run this in Supabase SQL Editor

-- Step 1: Drop the old index (built for 1536 dimensions)
DROP INDEX IF EXISTS idx_notes_embedding;

-- Step 2: Null out all existing embeddings (wrong dimension, need re-embed)
UPDATE notes SET embedding = NULL WHERE embedding IS NOT NULL;

-- Step 3: Drop the old column and recreate with new dimensions
ALTER TABLE notes DROP COLUMN IF EXISTS embedding;
ALTER TABLE notes ADD COLUMN embedding vector(1024);

-- Step 4: Recreate the index for 1024 dimensions
CREATE INDEX idx_notes_embedding ON notes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Step 5: Recreate the match function for 1024 dimensions
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(1024),
  match_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  source text,
  folder text,
  context_mode text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.content,
    n.source,
    n.folder,
    n.context_mode,
    1 - (n.embedding <=> query_embedding) AS similarity
  FROM notes n
  WHERE n.user_id = match_user_id
    AND n.embedding IS NOT NULL
    AND n.context_mode != 'off'
    AND 1 - (n.embedding <=> query_embedding) > match_threshold
  ORDER BY n.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Done! Notes will re-embed automatically on next save/edit.
-- To batch re-embed all existing notes, call PUT /api/embed with auth.
