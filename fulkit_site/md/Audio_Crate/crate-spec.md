# Crate System — Spec (v3)

> "Give me what you have. Let me show you how to make it better for you."

---

## What This Is

A playlist refinement tool. Import a playlist from Spotify, Fülkit helps you make it better — reorder, reduce, discover, refine — push it back. IN / OUT / BETTER.

Crates hold individual songs. You dig into a crate with Fülkit over your shoulder. The whole point is to make playlists better. Just like every feature on Fülkit.

---

## The Flow

```
Spotify playlist
  → Import to Fülkit as a crate (copy, staged)
  → Refine: reorder, remove, discover, fill gaps
  → Fülkit helps: "are you sure about this song?" / "try this instead"
  → Push to Spotify as NEW playlist (never overwrites original)
  → User compares both, keeps the one they want
  → Crate mirrors the new playlist going forward
```

### Import
User browses their Spotify playlists inside Fülkit. Picks which to bring in. No auto-import. No Christmas playlist unless you drag it in. Creates an independent copy.

### Edit
Reorder. Remove. Add from discovery. Let the AI suggest. The workspace.

### Push
Creates a NEW Spotify playlist. Original untouched. Naming: "[Name] (Fülkit)" or custom. After push, crate mirrors the new playlist.

### Stage / Hide
Work on 3 crates, hide the other 20. Hidden crates accept quick-adds (hear a Christmas song in July → add to hidden Christmas crate). Pull back when ready. Year over year, crates get better.

### Fülkit never
- Auto-imports all playlists
- Deletes Spotify playlists
- Modifies original imported playlists

---

## Crate Capacity

**No limit.** 330-song mega-mix works. 10-hour all-day works. Virtual scrolling keeps the UI fast.

For massive crates: "You have 330 songs. Want me to flag outliers?" Yes/no per song. The crate tightens without re-listening to everything.

---

## Design Language

All UI follows the Fülkit design spec. Warm monochrome. No decorative color. Every element uses `var(--token)`.

### Palette (crate-specific applications)

```
Crate cards:       var(--color-bg-elevated) background
                   var(--color-border-light) border
                   var(--color-text) title
                   var(--color-text-muted) metadata (BPM, song count)

Song rows:         var(--color-text) title + artist
                   var(--color-text-secondary) BPM, Key
                   var(--color-border-light) row separator

Active crate:      var(--color-bg-alt) background (subtle lift)
                   var(--color-border-focus) left edge accent (2px)

Hover states:      Auto-derived (darken 10% per guardrails)
                   var(--color-accent-soft) row highlight

Thumbs down:       var(--color-text-dim) icon default
                   var(--color-error) icon on confirm only
                   (functional color — status signal, not decoration)

Thumbs up:         var(--color-text-dim) icon default
                   var(--color-text) icon on active

Discovery panel:   var(--color-bg-elevated) background
                   Separated from crate by var(--color-border) divider

DJ Mode meters:    var(--color-text-muted) inactive segments
                   var(--color-text) active segments
                   No colored bars. The fill IS the data.

Tooltips:          var(--color-bg-inverse) background
                   var(--color-text-inverse) text
                   var(--radius-sm) corners
```

### Typography

```
Crate title:       var(--font-size-lg) / var(--font-weight-semibold)
Crate metadata:    var(--font-size-xs) / var(--font-weight-normal)
                   var(--letter-spacing-wider) / uppercase

Song title:        var(--font-size-base) / var(--font-weight-medium)
Song artist:       var(--font-size-sm) / var(--color-text-secondary)
BPM display:       var(--font-size-base) / var(--font-weight-bold)
                   JetBrains Mono (tabular data)
Key display:       var(--font-size-sm) / var(--font-weight-medium)

Section headers:   var(--font-size-xs) / var(--font-weight-semibold)
(CRATES, FEATURED) var(--letter-spacing-widest) / uppercase
                   var(--color-text-muted)
```

### Icons (Lucide React, 18px, 1.8px stroke)

```
Crate closed:      Package
Crate open:        PackageOpen
Add to crate:      Plus (in circle)
Remove:            X
Thumbs up:         Heart (or ThumbsUp)
Thumbs down:       X (or ThumbsDown)
Reorder:           GripVertical
Search:            Search
DJ Mode:           Music (or Disc)
Discover:          Compass
Play:              Play
Pause:             Pause
Skip:              ChevronRight / ChevronLeft
Push to Spotify:   Upload
Import:            Download
Featured:          Crown (already in nav)
Side chat:         MessageCircle
More like this:    Sparkles
```

All icons inherit color from parent via text tokens. Never colored independently.

### Layout tokens

```
Crate shelf:       height: auto (content-driven)
                   gap: var(--space-3) between cards
                   padding: var(--space-4) horizontal
                   overflow-x: auto (horizontal scroll)

Crate card:        padding: var(--space-3)
                   border-radius: var(--radius-lg)
                   min-width: 160px
                   border: 1px solid var(--color-border-light)

Song row:          padding: var(--space-2) var(--space-3)
                   border-bottom: 1px solid var(--color-border-light)
                   height: 44px (touch target)

Split view:        Left panel: 50-60% width
                   Right panel: 40-50% width
                   Divider: 1px var(--color-border)
```

### Motion

```
Crate expand:      var(--duration-slow) / var(--ease-default)
                   Height unfold animation

Song add:          var(--duration-normal) / var(--ease-out)
                   Fade in + slide from right

Song remove:       var(--duration-normal) / var(--ease-in)
                   Fade out + slide left + height collapse

Drag reorder:      var(--duration-fast) for snap
                   var(--shadow-md) on dragged item

Tab switch:        var(--duration-normal) / var(--ease-default)
                   Crossfade content
```

---

## UI Layout

### Lists, not grids

The current numbered grid gets smashed small and wastes space on empties. Lists scale.

```
CRATES (horizontal scrollable shelf — one row)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ ♫ Deep   │ │ ♫ Focus  │ │ ♫ Sunday │ │  + New   │
│ House    │ │ Mode     │ │ Morning  │ │  Crate   │
│ 24 songs │ │ 18 songs │ │ 12 songs │ │          │
│ 118 BPM  │ │ 90 BPM   │ │ 82 BPM   │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Tap a crate → unfolds into list:

```
DEEP HOUSE ESSENTIALS                    118-124 BPM · D/Am · 24 songs
─────────────────────────────────────────────────────────────────────
01  Come Together - Extended Mix     Nox Vahn, Marsh        120  D
02  Two Thousand and Seventeen       Four Tet                75  D
03  Brief City                       Alex R                 100  Am
```

Crate icon: `PackageOpen` from Lucide. Subtle expand animation on tap. Retro, tactile.

### Crate metadata

```
Sunday Morning
80-95 BPM · F/C · 12 songs · 48m
```

Custom title + data beneath. BPM range, keys, count, duration. Educational and aesthetic.

---

## Tabs / Modes

### Default: Crate Editor
Open crate + optional discovery panel. The workspace.

### DJ Mode
Flow view: BPM graph, key compatibility, energy arc, reorder suggestions. About sequencing — making a group of songs a *set*. The order is what makes a CD great.

BPM/key/energy visible in DJ Mode only. Behind the curtain otherwise.

### Discover Mode
Full-screen discovery. Search, browse, dig. Everything has [+ add to crate].

---

## Discovery

### Search
Spotify search API built in. Never leave Fülkit to find a song. Results show BPM/Key when available.

### "More Like This"
Tap any song → discovery fills with matches on BPM (±10), compatible key, similar energy/valence, related artists, genre overlap.

### Discovery Sources (layered, grows over time)

```
PHASE 1 (launch):
  Spotify Search API — title, artist, album search
  Spotify Related Artists — 20 related per artist
  Fabric feature matching — sonic similarity from analyzed data
  ReccoBeats — audio features for matching

PHASE 2 (growth):
  Last.fm
    - Similar tracks API (track.getSimilar)
    - Similar artists API (artist.getSimilar)
    - User taste profiling (optional Last.fm connect)
    - Tag-based discovery (genre/mood/era tags)
    - Scrobble data for popularity signals
    - Free API, rate limited, established community data

  MusicBrainz
    - Recording relationships (covers, remixes, samples)
    - Artist relationships (collaborators, side projects, members-of)
    - Release group data (original vs remaster vs live vs deluxe)
    - ISRC cross-referencing (strengthen Fabric keying)
    - Open data, no rate limits on mirrors, community maintained
    - AcousticBrainz integration (low-level audio descriptors)

PHASE 3 (expansion):
  Bandcamp — indie/underground discovery
  SoundCloud — emerging artists, DJ mixes
  Discogs — physical release data, collector community
  Rate Your Music — curated lists, niche genre taxonomy
```

**Why seed these now:** Each source fills a different gap. Spotify search is broad but genre-biased. Last.fm has deep community taste data and track similarity that Spotify deprecated. MusicBrainz has the relational graph — who sampled whom, who played on what, which recordings are the same song. These layers make "more like this" actually good, not just "same BPM same genre."

**Fabric ties them together.** Fabric's ISRC keying means a song discovered via Last.fm, identified via MusicBrainz, and played via Spotify all resolve to the same Fabric entry. One analysis serves all sources.

### Filtered through blacklist
Thumbs-downed songs never appear in any discovery source. Ever.

### "Fill This Crate" (AI-assisted)
AI looks at crate vibe + taste history → suggests songs. Accept/reject each.

### Actionable Meters
Energy/Dance/Mood meters are navigation when tapped. Tap mood 2/10 → discovery fills with dark moody songs. Passive when not tapped. Active when tapped.

---

## Song Controls

### Thumbs Up (♥)
"More like this." Strengthens signal for crate vibe + overall taste. AI gets smarter.

### Thumbs Down (✕)
**Permanent kill.** Blacklisted from ALL suggestions, ALL crates, ALL discovery. Dead forever. Removed from current crate if present. The feature Spotify removed.

### The + Button
Add currently playing song to active crate (or pick which crate, including hidden ones).

---

## The Record Store Guy (Side Chat)

### Who
Not Chappie. Music-only persona. The weird old guy at the niche record store. Acidic knowledge. Deep cuts. Strong opinions. Can't ask about groceries. Only speaks music.

### Active mode
```
You: "What else sounds like this Nox Vahn track?"

Record Store Guy: "Anjunadeep melodic house.
                   Lane 8 - No Captain        118 BPM  [+]
                   Yotto - Hear Me Now         120 BPM  [+]
                   Tinlicker - About You       121 BPM  [+]
                   
                   Deeper or wider?"
```

One-tap [+] adds to crate.

### Passive mode (ticker tape)
When not chatting, a quiet rolling ticker:

```
"Playing Coachella this April..."
"In 14,000 Spotify playlists..."
"Same producer as that Rufus Du Sol track you liked..."
```

**Ticker tape styling:**
```
Font:       var(--font-size-xs) / var(--color-text-dim)
Background: transparent (lives in side panel)
Animation:  Gentle scroll or fade-rotate, var(--duration-slowest)
Tap:        Opens full side chat with context
Ignore:     Scrolls away. No badge. No notification.
```

### Memory (persistent, independent)
Remembers music taste across sessions. Separate from main Chappie.

```
Stores: genres, artists (liked/blacklisted), BPM ranges, mood profiles
Does NOT store: personal info, non-music data, main Fülkit chat history
```

### Chat history
Persists in music section. Scrollable. Searchable.

---

## Featured Crates

From dev/owner account. Pre-analyzed with Fabric. Storefront window.

```
FEATURED
┌──────────┐ ┌──────────┐ ┌──────────┐
│ ♫ Deep   │ │ ♫ Focus  │ │ ♫ Sunday │
│ Cuts     │ │ Flow     │ │ AM       │
│ by Collin│ │ by Collin│ │ by Collin│
│ 20 songs │ │ 15 songs │ │ 12 songs │
│ 120 BPM  │ │ 95 BPM   │ │ 82 BPM   │
└──────────┘ └──────────┘ └──────────┘
```

Users can: play, clone to own crates, cherry-pick songs. Toggle in owner portal.

---

## Data Model

```sql
crates (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  description text,
  source text DEFAULT 'manual',
  source_spotify_id text,
  pushed_spotify_id text,
  sync_active boolean DEFAULT false,
  status text DEFAULT 'active',       -- 'active' | 'hidden' | 'featured'
  visibility text DEFAULT 'private',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)

crate_tracks (
  id uuid PRIMARY KEY,
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
  added_at timestamp DEFAULT now(),
  added_via text DEFAULT 'manual'
)

user_song_preferences (
  user_id uuid REFERENCES users(id),
  spotify_id text NOT NULL,
  preference text NOT NULL,            -- 'like' | 'blacklist'
  context_crate_id uuid,
  created_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, spotify_id)
)

music_taste_profile (
  user_id uuid REFERENCES users(id) PRIMARY KEY,
  preferred_genres text[],
  preferred_bpm_range int4range,
  preferred_energy_range numrange,
  preferred_mood_range numrange,
  blacklisted_artists text[],
  favorite_artists text[],
  updated_at timestamp DEFAULT now()
)
```

---

## Tooltips

First interaction only. Dismissable. Never repeat.

```
Crate shelf:      "Your crates. Tap to open. Import playlists or start fresh."
+ New Crate:      "Create an empty crate or import a Spotify playlist."
♥ Thumbs up:      "More like this. Fülkit learns your taste."
✕ Thumbs down:    "Never again. This song won't be suggested anywhere."
+ Add to crate:   "Add to your open crate."
Push:             "Creates a new playlist on Spotify. Your original stays safe."
DJ Mode:          "See the flow. BPM, key, and energy across your set."
Side chat:        "Your music expert. Ask anything about music."
Meters:           "Tap to find more songs with this energy / mood / dance level."
```

---

## Mobile

Separate view. Not responsive desktop. New design.

```
Crate shelf:       Vertical stack
Discovery:         Separate screen (not side panel)
Side chat:         Full-screen overlay
Reorder:           Long-press + drag (or move up/down buttons)
Add to crate:      Long-press → action sheet with crate picker
Remove:            Swipe left
Thumbs up:         Swipe right
DJ Mode:           Simplified or deferred v1
```

---

## Offline

Crate data stored locally (song metadata, positions, preferences). Browse, reorder, plan without connection. Playback, discovery, push/sync require Spotify.

---

## Open Questions

- [ ] **Record Store Guy implementation** — Separate Claude API call with music-only system prompt + independent memory. Feels cleanest.
- [ ] **Ticker tape sources** — Phase 1: AI-generated from Spotify artist metadata + album descriptions. Phase 2: MusicBrainz relationships, Last.fm tags/bios. Must be factual, not hallucinated.
- [ ] **Spotify OAuth scopes** — Need `playlist-modify-public` or `playlist-modify-private` for push. Check current config.
- [ ] **AI refinement style** — "Are you sure about this song?" Matches whisper philosophy: quiet, occasional, dismissable. Not aggressive.
- [ ] **Playlist import UX** — Browse one-at-a-time (intentional) vs checkboxes (fast). Lean toward one-at-a-time. More Rams.
- [ ] **Clash meter in DJ Mode** — Camelot wheel for key. BPM: ±5 smooth, ±10 noticeable, >15 rough. Visual TBD — probably a simple line graph in `var(--color-text-muted)` with clash zones in `var(--color-text-dim)`.
- [ ] **Last.fm API key** — Free tier available. Rate limited. Apply when ready to build Phase 2 discovery.
- [ ] **MusicBrainz mirror** — Public API, no key needed. Consider local mirror at scale for performance.
