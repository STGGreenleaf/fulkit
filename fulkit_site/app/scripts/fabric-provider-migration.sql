-- Fabric Provider Abstraction — DB Migration
-- Run in Supabase SQL Editor (Dashboard → SQL → New Query)
-- Non-breaking: all existing data gets provider = 'spotify' via DEFAULT

-- ═══ fabric_tracks ═══
ALTER TABLE fabric_tracks RENAME COLUMN spotify_id TO source_id;
ALTER TABLE fabric_tracks ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'spotify';
ALTER TABLE fabric_tracks DROP CONSTRAINT IF EXISTS fabric_tracks_spotify_id_key;
ALTER TABLE fabric_tracks ADD CONSTRAINT fabric_tracks_source_provider_key UNIQUE (source_id, provider);
DROP INDEX IF EXISTS idx_fabric_spotify;
CREATE INDEX IF NOT EXISTS idx_fabric_tracks_source ON fabric_tracks(source_id);
CREATE INDEX IF NOT EXISTS idx_fabric_tracks_provider ON fabric_tracks(provider);

-- ═══ crate_tracks ═══
ALTER TABLE crate_tracks RENAME COLUMN spotify_id TO source_id;
ALTER TABLE crate_tracks ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'spotify';

-- ═══ crates ═══
ALTER TABLE crates RENAME COLUMN source_spotify_id TO source_playlist_id;

-- ═══ user_song_preferences ═══
ALTER TABLE user_song_preferences RENAME COLUMN spotify_id TO source_id;
ALTER TABLE user_song_preferences ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'spotify';
