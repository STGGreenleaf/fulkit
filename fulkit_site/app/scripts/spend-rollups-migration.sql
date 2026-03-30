-- Spend Rollups — persistent daily aggregates that survive signal purges.
-- Run once in Supabase SQL editor.

-- Table: one row per day, atomic increments via upsert
CREATE TABLE IF NOT EXISTS spend_rollups (
  date DATE PRIMARY KEY,
  total_cost NUMERIC(10,4) DEFAULT 0,
  messages INTEGER DEFAULT 0,
  max_cost NUMERIC(10,4) DEFAULT 0,
  total_input BIGINT DEFAULT 0,
  total_output BIGINT DEFAULT 0,
  cache_creation BIGINT DEFAULT 0,
  cache_read BIGINT DEFAULT 0,
  compressions INTEGER DEFAULT 0,
  flag_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: server-side only (service role key). No user-facing policies.
ALTER TABLE spend_rollups ENABLE ROW LEVEL SECURITY;

-- Atomic upsert function — called fire-and-forget from chat route
CREATE OR REPLACE FUNCTION upsert_spend_rollup(
  p_cost NUMERIC,
  p_input BIGINT,
  p_output BIGINT,
  p_cache_creation BIGINT,
  p_cache_read BIGINT,
  p_compressed INTEGER DEFAULT 0,
  p_flags INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO spend_rollups (date, total_cost, messages, max_cost, total_input, total_output, cache_creation, cache_read, compressions, flag_count, updated_at)
  VALUES (CURRENT_DATE, p_cost, 1, p_cost, p_input, p_output, p_cache_creation, p_cache_read, p_compressed, p_flags, NOW())
  ON CONFLICT (date) DO UPDATE SET
    total_cost = spend_rollups.total_cost + p_cost,
    messages = spend_rollups.messages + 1,
    max_cost = GREATEST(spend_rollups.max_cost, p_cost),
    total_input = spend_rollups.total_input + p_input,
    total_output = spend_rollups.total_output + p_output,
    cache_creation = spend_rollups.cache_creation + p_cache_creation,
    cache_read = spend_rollups.cache_read + p_cache_read,
    compressions = spend_rollups.compressions + p_compressed,
    flag_count = spend_rollups.flag_count + p_flags,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
