-- Enable pgvector extension (run once in Supabase SQL editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to notes (1024 dimensions = voyage-3.5-lite)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_notes_embedding ON notes
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Semantic search function — returns notes ranked by cosine similarity
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
