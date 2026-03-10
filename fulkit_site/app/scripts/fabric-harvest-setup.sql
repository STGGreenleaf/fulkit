-- Fabric Harvest + Crate Tables
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)

-- ═══════════════════════════════════════════
-- 1. Add retry_count to fabric_tracks
-- ═══════════════════════════════════════════
ALTER TABLE fabric_tracks ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- ═══════════════════════════════════════════
-- 2. Crates — playlist containers
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS crates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  description text,
  source text DEFAULT 'manual',
  source_spotify_id text,
  pushed_spotify_id text,
  status text DEFAULT 'active',
  visibility text DEFAULT 'private',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crate_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crate_id uuid REFERENCES crates(id) ON DELETE CASCADE,
  spotify_id text NOT NULL,
  position integer NOT NULL,
  title text,
  artist text,
  duration_ms integer,
  isrc text,
  bpm integer,
  key text,
  energy float,
  valence float,
  added_at timestamptz DEFAULT now(),
  added_via text DEFAULT 'manual'
);

-- ═══════════════════════════════════════════
-- 3. User song preferences (likes / blacklist)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_song_preferences (
  user_id uuid REFERENCES auth.users(id),
  spotify_id text NOT NULL,
  preference text NOT NULL,  -- 'like' | 'blacklist'
  context_crate_id uuid,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, spotify_id)
);

-- ═══════════════════════════════════════════
-- 4. RLS policies
-- ═══════════════════════════════════════════

-- Crates
ALTER TABLE crates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on crates"
  ON crates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users manage own crates"
  ON crates FOR ALL
  USING (auth.uid() = user_id);

-- Crate tracks
ALTER TABLE crate_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on crate_tracks"
  ON crate_tracks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users read crate_tracks via crate ownership"
  ON crate_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM crates WHERE crates.id = crate_tracks.crate_id AND crates.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can read featured crate_tracks"
  ON crate_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM crates WHERE crates.id = crate_tracks.crate_id AND crates.visibility = 'featured'
  ));

-- User song preferences
ALTER TABLE user_song_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_song_preferences"
  ON user_song_preferences FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users manage own preferences"
  ON user_song_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Anyone can read featured crates (for the storefront)
CREATE POLICY "Anyone can read featured crates"
  ON crates FOR SELECT
  USING (visibility = 'featured');
