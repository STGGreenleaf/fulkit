-- Playlist Persistence — Fulkit owns the data
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  source_provider TEXT NOT NULL DEFAULT 'spotify',
  source_id TEXT,
  track_count INTEGER DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES user_playlists(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER,
  art TEXT,
  isrc TEXT,
  position INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'spotify'
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_source ON user_playlists(user_id, source_provider, source_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_tracks_playlist ON user_playlist_tracks(playlist_id);

ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists" ON user_playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own playlists" ON user_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own playlists" ON user_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own playlists" ON user_playlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own playlist tracks" ON user_playlist_tracks FOR SELECT USING (
  playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
);
CREATE POLICY "Users can manage own playlist tracks" ON user_playlist_tracks FOR ALL USING (
  playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
);
