# Fabric Independence — Add Music Sources, Change Nothing

## Context
Spotify locked down API access (5 user cap). The Fabric player, B-Side persona, Signal Terrain, crates, and sets are done and locked. NO visual changes. The provider abstraction already exists. We just need to plug in more sources so every user has music regardless of what subscriptions they have.

## The Rule
The player does not change. B-Side does not change. The UI does not change. We are adding ingredients to the kitchen, not remodeling it. The existing provider interface (`lib/providers/spotify.js`) is the template. New sources implement the same interface. The PlaybackEngine renders the right engine per track. Everything else is identical.

## What B-Side Needs
B-Side is the DJ. It recommends songs, plays samples, builds playlists, creates sets by genre/mood/vibe. It doesn't care where the track comes from. It needs:
1. A way to search for music (across all connected sources)
2. A way to play a track (the engine handles this)
3. A way to build a set/crate (mixed sources allowed)

B-Side already does all of this with Spotify. Adding sources just gives it more shelves to pull from.

## Source Priority (what the user has determines what plays)

```
User connects Spotify?     → Spotify plays
User connects Apple Music? → Apple Music plays
User connects SoundCloud?  → SoundCloud plays
User connects multiple?    → B-Side picks best match, crates mix sources
User connects nothing?     → YouTube fallback (free, no account needed)
```

Every user gets music. Zero blank screens.

## What to Build (per source)

Each new source = 3 files, same pattern as Spotify:

1. `lib/providers/{source}.js` — implements provider interface:
   - `getConnectUrl()`, `exchangeCode()`, `getValidToken()`
   - `search(query)`, `getNowPlaying()`, `control(action)`
   - `getPlaylists()`, `getPlaylistTracks()`
   - Returns `FulkitTrack` shape: `{ id, title, artist, album, duration, art, uri, isrc, provider }`

2. `components/engines/{Source}Engine.js` — renders the playback element (SDK player, iframe, or audio element)

3. Register in `lib/fabric-server.js` PROVIDERS map

Plus: add keywords to `ECOSYSTEM_KEYWORDS` for tool gating.

## Source Roadmap

### YouTube (free, no approval, universal fallback)
- YouTube iframe API for playback
- YouTube Data API v3 for search (free: 10K units/day)
- No OAuth needed — plays for everyone
- **This is the "no subscription" source.** Everyone gets music.

### Apple Music (MusicKit JS, free developer program)
- MusicKit JS web SDK — plays in browser
- Apple Developer account needed ($0 for MusicKit)
- User signs in with Apple ID
- Full controls: play, pause, skip, seek, queue

### SoundCloud (pending API access)
- Waiting on Artist Pro signup + API approval
- Widget API for embeds, full API for search/playlists
- Large indie/electronic/DJ catalog

### Spotify (current, quota-limited)
- Full OAuth works for owner + up to 5 users
- Keep as premium source — best controls, best metadata
- When/if Extended Quota opens, everyone gets it

## Multi-Source Search
When user searches from B-Side or Fabric:
- Query all connected sources in parallel
- Deduplicate by ISRC (if available) or title+artist fuzzy match
- Show source badge per result
- User picks any result → adds to crate with source tagged

## Multi-Source Crates
A crate already stores `provider` per track (DB migration done). A set could be:
- Track 1: Spotify
- Track 2: YouTube
- Track 3: Apple Music

PlaybackEngine switches engine per track. Seamless. User sees one player.

## What This Does NOT Do
- Does NOT change the Fabric page layout
- Does NOT change the player UI or controls
- Does NOT change B-Side's persona or behavior
- Does NOT change Signal Terrain
- Does NOT change crate/set UI
- Does NOT change MiniPlayer
- Does NOT require any visual changes whatsoever
- Does NOT remove Spotify — it stays as a premium source

## Build Order
1. **YouTube provider** — the free fallback, ensures no blank screen for anyone
2. **Apple Music provider** — the premium alternative to Spotify
3. **SoundCloud provider** — when API access is granted
4. **Multi-source search** — search across all connected at once
5. Spotify Extended Quota — whenever Spotify reopens the process

## Files
- `lib/providers/youtube.js` — new
- `lib/providers/apple-music.js` — new
- `lib/providers/soundcloud.js` — new (when ready)
- `components/engines/YouTubeEngine.js` — new
- `components/engines/AppleMusicEngine.js` — new
- `components/engines/SoundCloudEngine.js` — new (when ready)
- `components/PlaybackEngine.js` — add new engine cases
- `lib/fabric-server.js` — register new providers
- `app/api/chat/route.js` — add keywords to ECOSYSTEM_KEYWORDS
- Settings integrations page — add connect buttons for new sources

Existing files unchanged: `app/fabric/page.js`, `components/SpotifyPlayer.js`, `components/MiniPlayer.js`, `lib/fabric.js`, `md/b-side.md`
