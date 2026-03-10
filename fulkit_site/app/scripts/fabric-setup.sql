-- Fabric Pipeline Tables
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)

-- fabric_tracks: index of analyzed songs
CREATE TABLE IF NOT EXISTS fabric_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (source-agnostic)
  isrc text UNIQUE,
  composite_key text UNIQUE,
  title text NOT NULL,
  artist text NOT NULL,
  duration_ms integer NOT NULL,

  -- Platform cross-references
  spotify_id text,

  -- Per-track summary
  bpm integer,
  key text,
  energy float,
  valence float,
  danceability float,
  loudness float,
  acousticness float,

  -- Analysis state
  status text DEFAULT 'pending',
  analysis_version integer DEFAULT 1,
  analyzed_at timestamptz,
  error text,

  -- Lifecycle
  play_count integer DEFAULT 1,
  last_played_at timestamptz DEFAULT now(),
  first_played_by uuid,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_fabric_spotify ON fabric_tracks(spotify_id);
CREATE INDEX IF NOT EXISTS idx_fabric_isrc ON fabric_tracks(isrc);
CREATE INDEX IF NOT EXISTS idx_fabric_composite ON fabric_tracks(composite_key);
CREATE INDEX IF NOT EXISTS idx_fabric_status ON fabric_tracks(status);

-- fabric_timelines: per-second snapshot data
CREATE TABLE IF NOT EXISTS fabric_timelines (
  track_id uuid REFERENCES fabric_tracks(id) ON DELETE CASCADE,
  resolution_ms integer DEFAULT 500,
  timeline jsonb NOT NULL,
  size_bytes integer,
  created_at timestamptz DEFAULT now(),

  PRIMARY KEY (track_id, resolution_ms)
);

-- RLS: allow service role full access (API routes use service role key)
ALTER TABLE fabric_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on fabric_tracks"
  ON fabric_tracks FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on fabric_timelines"
  ON fabric_timelines FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can read completed tracks
CREATE POLICY "Authenticated users can read fabric_tracks"
  ON fabric_tracks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read fabric_timelines"
  ON fabric_timelines FOR SELECT
  USING (auth.role() = 'authenticated');
