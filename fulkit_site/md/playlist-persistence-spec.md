# Spec: Playlist Persistence — Fulkit Owns the Data

*Playlists belong to the user, not the source. No mixes or playlists lost. Complete freedom.*

---

## Scope: Fabric + B-Side Only

---

## The Problem

Playlists are fetched live from Spotify's API. When Spotify disconnects, playlists vanish. The tracks can still play (YouTube fallback), but the user loses their library. This is backwards — Fulkit should own the playlist data.

## The Principle

Same as crates: **Fulkit stores the data, sources provide the playback.** When a user imports a playlist from Spotify, Apple Music, or YouTube — Fulkit saves the track list in Supabase. The playlist lives in Fulkit forever. It plays from whatever source is available.

## How It Works

### Import (one-time per playlist)
1. User connects Spotify → Fulkit fetches their playlists from Spotify API
2. Each playlist's track list gets saved to Supabase (`user_playlists` + `user_playlist_tracks` tables)
3. The import is a snapshot — playlist name, tracks, order, artwork
4. Future: same import flow for Apple Music, SoundCloud, YouTube playlists

### Display (always from Fulkit)
1. Playlists page reads from Supabase, NOT from Spotify API
2. Works whether Spotify is connected or not
3. Shows all playlists from all sources the user has ever imported

### Playback (source-independent)
1. User clicks play on a track in a playlist
2. Same playback routing as sets: Spotify if connected, YouTube fallback if not
3. Track data (title, artist, duration) is already stored — no API call needed to display

### Sync (optional, when source is connected)
1. If Spotify is connected, check for new playlists or changes
2. Add new playlists, update track lists for existing ones
3. Never delete a Fulkit playlist just because the user removed it from Spotify
4. User controls their Fulkit library — source is just the import mechanism

## Database

### `user_playlists` table
```sql
CREATE TABLE user_playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  source_provider TEXT NOT NULL, -- 'spotify', 'apple_music', 'youtube', 'manual'
  source_id TEXT, -- original playlist ID from the source (for sync)
  track_count INTEGER DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `user_playlist_tracks` table
```sql
CREATE TABLE user_playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES user_playlists(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL, -- track ID from original source
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER,
  art TEXT,
  isrc TEXT, -- for cross-source matching
  position INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'spotify' -- which source this track came from
);
```

## API Routes

### `GET /api/fabric/playlists` — list user's playlists
- Reads from `user_playlists` table (Supabase), NOT from Spotify
- Returns all playlists regardless of source connection status

### `POST /api/fabric/playlists/import` — import from connected source
- Fetches playlists from Spotify (or other source)
- Upserts into `user_playlists` + `user_playlist_tracks`
- Deduplicates by `source_id` to avoid double imports
- Called on first Spotify connect and optionally on refresh

### `GET /api/fabric/playlists/[id]/tracks` — get tracks for a playlist
- Reads from `user_playlist_tracks` table
- Returns track list with all metadata needed for playback

## Migration Path

1. When a user who already has Spotify connected visits Fabric, check if `user_playlists` is empty for them
2. If empty, auto-import their Spotify playlists in background
3. After import, playlists page reads from Supabase
4. If Spotify disconnects later, playlists persist

## What This Does NOT Do

- Does NOT change the playlist UI (same cards, same track list)
- Does NOT change crate behavior (crates already work this way)
- Does NOT delete user data when a source disconnects
- Does NOT require any source to be connected to view playlists
- Does NOT change Fabric page layout

## The Promise

Your music library is yours. Connect a source, import your playlists, disconnect if you want. The music stays. The playlists stay. Play from whatever source is available. No lock-in. Complete freedom.
