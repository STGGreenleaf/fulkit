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

## Trophy System — Sets → Playlists Promotion

### The Flow
1. User creates a **set** (workspace, localStorage, editable)
2. User clicks **trophy** (Lucide `Trophy` icon) → set becomes a **playlist** (personal, permanent, Supabase)
3. Owner clicks **crown** (Lucide `Crown` icon) → set becomes a **Bin Pick** (public, permanent, Supabase)

### Who Gets What
- **Users** → see trophy icon on every set header
- **Owner** → sees both trophy AND crown on every set header

### What Trophy Does
- Saves the set to `user_playlists` + `user_playlist_tracks` in Supabase
- Moves the set from **Active Sets** (top) to **Completed Sets** fold (bottom) in the sets column
- Still editable — expand the fold, click into the set, make changes
- Edits auto-sync to Supabase (same pattern as crowned sets)
- If localStorage gets cleared, trophied sets auto-restore from Supabase

### Sets Column Layout (right side)
```
┌─────────────────────────┐
│  + New Set              │
├─────────────────────────┤
│  Set 1 (drag to reorder)│  ← Active sets (top, reorderable)
│  Set 2                  │
├─────────────────────────┤
│  ▸ Completed Sets (3)   │  ← Collapsed fold (bottom, not reorderable)
│    Electro Static ★     │
│    Work Tech ★          │
│    Late Night Vibes ★   │
└─────────────────────────┘
```

- **Active Sets**: top, reorderable via drag-and-drop, your workspace
- **Completed Sets**: bottom fold, collapsible, trophied sets. Still editable inside the fold. Not reorderable — they just stack. Defaults collapsed.

### Left Column — Library (browse)
- **Bin Picks** — owner-crowned sets. Curated by owner, visible to ALL users. Public storefront.
- **Playlists** — imported from Spotify/Apple Music/etc. Broad lists from external sources. Stored in Supabase, persist forever.

### Right Column — Workspace (build)
- **Active Sets** (top) — user's workspace. Editable, reorderable, in progress.
- **Completed Sets** fold (bottom) — trophied sets. Collapsible. Still editable inside the fold. Saved to Supabase. Private to user.

### The Three Things
| Thing | Icon | Who can do it | Who sees it | Where it lives | Editable |
|-------|------|--------------|-------------|---------------|----------|
| **Bin Pick** | Crown | Owner ONLY | Everyone | Supabase (public) | Owner only |
| **Playlist** | — | Auto-import | User only | Supabase (imported) | No (read-only) |
| **Completed Set** | Trophy | ANY user | User only (private) | Supabase (private) | Yes, always |

### Crown vs Trophy — clear distinction
- **Crown** (Lucide `Crown`) = **OWNER ONLY**. Makes a set public. Every user sees it in Bin Picks. Only the owner has this icon. This is the house curating for guests.
- **Trophy** (Lucide `Trophy`) = **ANY USER**. Marks a set as complete. Saves it permanently to Supabase. Private to that user — nobody else sees it. Moves it to the Completed Sets fold. This is the user saving their own work.
- **Owner gets BOTH icons** on every set. Trophy for personal save, Crown for public feature.
- **Users get ONLY trophy**. They never see Crown. They can't publish to Bin Picks.

### Key Distinctions
- **Playlists** = imported from external music apps (Spotify, Apple Music, etc). Broad collections. Not made here. Read-only.
- **Sets** = made in Fabric. User's private curation. Trophy = permanent save. Exclusive to that user.
- **Bin Picks** = owner-crowned sets. The record store's recommendations. Public.

### Three States Per Set
1. **Active** — top of sets column, editable, in progress, reorderable
2. **Completed** (trophy) — bottom fold, editable if needed, saved to Supabase, private to user
3. **Featured** (crown, owner only) — appears in Bin Picks for all users. A set can be both trophied AND crowned.

### No Source Required
- Users can create sets and trophy them without ANY music source connected
- Tracks play via YouTube fallback
- Importing from Spotify/Apple Music is optional — adds to Imported section

---

## The Promise

Your music library is yours. Connect a source, import your playlists, disconnect if you want. The music stays. The playlists stay. Play from whatever source is available. No lock-in. Complete freedom.
