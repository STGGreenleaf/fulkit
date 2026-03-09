# Fülkit Fabric — Audio Spec (v4)

> "The line should feel like it's breathing the same air as you."

---

## North Star

Fabric is a system that **understands songs**. Not reacts to them — understands them. It analyzes a recording once, completely, and stores that understanding forever. The data powers a living waveform inside Fülkit that responds to every beat, every breakdown, every breath in the music — without a microphone, without permissions, without any user action beyond pressing play.

But the waveform is just the first expression. The same data can render a song as a printable 11×17 poster — a genuine visual fingerprint of that specific recording. A static piece of art that IS the song. Not generative randomness. Not a screenshot of a visualizer. A deterministic, repeatable, honest representation of the music's structure, energy, rhythm, and texture.

**The vision:** A library of understood music. Every song a Fülkit user has ever played, analyzed and stored. Searchable. Browsable. Exportable. A music machine where the art is the data and the data is the art.

**What nobody else is doing:** Persistent, shared, analyze-once, source-agnostic deep music analysis keyed by song identity. Everyone else re-analyzes every time, or depends on APIs that no longer exist. Fabric analyzes once and benefits every user forever.

---

## Philosophy

**Measure twice, cut once.** If we're analyzing a song, extract everything Essentia can give us. Storage is cheap ($0.015/GB/month on R2). Re-analyzing a million songs because we skipped a field is not. Record the physics of the sound. Let the renderer decide what to show.

**Data is the product. Visualization is one expression.** Fabric stores raw signal data (frequencies, loudness, beats, timbre, pitch). It does NOT store visual instructions (line width, opacity, color). The waveform renderer interprets the data. A poster renderer interprets the same data differently. A future 3D terrain renderer interprets it again. One analysis, infinite expressions.

**Source-agnostic.** Fabric doesn't care if the song came from Spotify, Apple Music, SoundCloud, or a vinyl record. Songs are keyed by ISRC (International Standard Recording Code) when available, falling back to `artist + title + duration`. The same recording of "Satisfaction" has the same Fabric entry regardless of platform.

**Analyze once, completely.** A recording is a recording. There is no "first pass" and "deeper pass." The pipeline runs once and extracts the full snapshot schema. If we later add new extraction capabilities (chord detection, vocal isolation), the `analysis_version` field lets us re-queue tracks for enhancement — but the original data is never thrown away.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FÜLKIT FABRIC                         │
│                                                          │
│  Shared database of analyzed music                       │
│  Keyed by ISRC / composite (artist+title+duration)       │
│  One entry per unique recording, shared across all users │
│                                                          │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Per-track summary                               │     │
│  │  BPM, key, energy, valence, danceability, etc.  │     │
│  └─────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────┐     │
│  │  Timeline (per-second snapshots)                 │     │
│  │  ~45 fields × ~480 snapshots per 4-min song     │     │
│  │  Loudness, 7 bands, beats, onsets, chroma,      │     │
│  │  MFCC, spectral shape, pitch, dynamics           │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────┘
                           │
              reads from   │   writes to
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │  Live Wave  │  │  Poster    │  │  Future    │
   │  Renderer   │  │  Export    │  │  Renderers │
   │  (canvas)   │  │  (SVG/PNG) │  │  (3D, etc) │
   └────────────┘  └────────────┘  └────────────┘
```

---

## The Wave (Live Renderer)

### Layer stack (what the user sees)

```
┌──────────────────────────────────────────────┐
│  Fabric Timeline (when available)             │  Per-second dynamics
│  Beats, bands, onsets, loudness curve          │  from server-side analysis
├──────────────────────────────────────────────┤
│  Procedural Architecture + ReccoBeats         │  Per-track personality
│  BPM grid, energy ceiling, seeded structure   │  + generated energy curve
├──────────────────────────────────────────────┤
│  Playback State + Ambient                     │  Kinetic signatures
│  Play/pause/skip, breathing noise             │  + idle pulse
└──────────────────────────────────────────────┘
```

**Round 1 (what we have now):** Ambient + kinetics + ReccoBeats per-track features. Works. Looks good. Ships today.

**Round 2 (procedural + multi-line):** Seeded energy curves give time-based shape. Multi-line renderer gives depth. The wave transforms from a single line into a landscape. Ships in days/weeks.

**Round 3 (Fabric integration):** Real per-second data replaces procedural guesses. The wave responds to actual musical moments. Breakdowns go flat. Drops hit hard. Ships when pipeline is built.

**The "points unlocked" moment:** When Fabric data arrives for a track the user has heard before on procedural, the wave visibly transforms. The single-line wave blooms into something richer. You don't tell them. They notice.

### Procedural Song Architecture (Round 2 — BUILT)

Deterministic per-bar energy envelope generated from track metadata. Same song always produces the same shape. No API calls, no infrastructure — pure client-side math.

**How it works:**

1. **Seeded PRNG** — `mulberry32(hash(trackId))`. Deterministic random per track.
2. **Bar estimation** — `totalBars = Math.round((duration_ms / 60000) * bpm / 4)`
3. **Section pattern** — varies by duration:
   - Short (<2:30): intro → verse → chorus → verse → chorus → outro
   - Standard (2:30–5:00): intro → verse → prechorus → chorus → verse → prechorus → chorus → bridge → chorus → outro
   - Extended (>5:00): intro → verse → prechorus → chorus → verse → prechorus → chorus → breakdown → bridge → chorus → chorus → outro
4. **Per-bar generation** — each section has a base energy + PRNG variance + intra-section ramp
5. **Gaussian blur** — 2-bar kernel smooths section boundaries
6. **Normalization** — output range 0.25–1.0 (breakdowns dip, nothing goes silent)

**Section energy values:**

```
chorus:     1.00  (full power — matches pre-envelope amplitude)
drop:       1.00  (match chorus)
prechorus:  0.90
verse:      0.80  (most of the song lives here — should feel strong)
bridge:     0.60  (noticeable dip, not a crater)
intro:      0.55  (building)
outro:      0.45  (gradual fade)
breakdown:  0.25  (the one dramatic valley)
```

**Critical design rule:** The envelope creates shape by sculpting valleys, not lowering mountains. A chorus hits at the same power as the old un-enveloped wave. The verse is slightly less. The breakdown is the contrast moment.

**Anti-pattern (double-attenuation):** The envelope drives the amplitude ceiling directly — it does NOT multiply on top of the ReccoBeats energy ceiling. Before: `energy × envelope` compounded to ~40%. Now: envelope replaces the static energy ceiling when active. Without envelope (no features), falls back to static energy.

**Caching:** Envelope generated once per track change, stored in a ref. Regenerated when trackId, features, or duration change.

**Render integration:** Current playback progress maps to a bar index. The envelope value at that bar sets the amplitude ceiling for that frame. Layers 0 (ambient noise) and 1 (kinetic state) are untouched.

```
progress → barIndex = floor(progress × totalBars)
         → envelopeValue = envelope[barIndex]
         → amplitudeCeiling = 0.2 + envelopeValue × 0.6
```

### Multi-line renderer

Multiple overlapping wave strokes at different depths. Front lines = bass (thick, slow, opaque). Back lines = highs (thin, fast, transparent). Creates a topographic landscape that collapses during breakdowns and erupts during drops.

```
Front (bass):    ████ 2.0px, 80% opacity, slow movement
Mid-front:       ███  1.5px, 65% opacity
Center (mids):   ██   1.2px, 50% opacity
Mid-back:        █    0.8px, 35% opacity
Back (air):      ░    0.5px, 20% opacity, fast shimmer
```

Achromatic. Warm eggshell background, warm slate lines. No gradients, no glow, no color. Depth comes from opacity and line weight only.

### Kinetic signatures (always active)

```
Play:       600ms ease-out spool up
Pause:      800ms ease-in wind down
Skip:       200ms cut → 200ms silence → 400ms spool
Track end:  6s exhale → 500-1000ms breath → 800ms inhale
```

---

## The Poster (Static Export)

### Vision

A song rendered as a printable piece of art. 11×17 inches. Deterministic — same song, same poster, every time. A genuine visual representation of the recording's structure.

Not a screenshot of the waveform. A purpose-built static composition that uses the full timeline data to create something you'd frame.

### Aesthetic direction

From the reference images: the data-driven bar compositions (Accept & Proceed rainfall poster), the wireframe topographic landscape (Deep Web iceberg), the layered wave terrain. Black and white. Structural. The kind of thing that rewards close inspection — you see the whole shape from across the room, and the individual beats up close.

**Above and below.** The iceberg framing: what's visible (melody, rhythm, the parts you hum) and what's underneath (sub-bass, harmonic structure, micro-dynamics). The song has a surface and a depth. The poster shows both.

**Relational.** Show how parts of the song connect — where the chorus returns, where the bass pattern repeats, where the bridge breaks from the pattern. Like an Obsidian graph view but for musical structure. Sections that share harmonic content cluster together.

### Export spec

```
Format:     SVG (vector, infinite scale) + PNG (raster, print-ready)
Dimensions: 11×17 inches at 300 DPI (3300×5100 pixels for PNG)
Palette:    Achromatic — matches Fülkit brand tokens
Metadata:   Track title, artist, duration, BPM, key embedded in file
Watermark:  Small "Fülkit Fabric" mark, bottom edge
```

### What drives the poster

The same Fabric timeline that drives the live wave. But instead of scrubbing through it in real time, the poster renders the ENTIRE timeline at once — all ~480 snapshots laid out spatially. Time becomes the x-axis. Frequency becomes the y-axis. Loudness becomes density/weight. Beats become structural markers. Onsets become accent points.

The poster is the song seen from above. The waveform is the song seen from inside.

---

## The Full Snapshot Schema (Measure Twice)

Every field Essentia can meaningfully extract, stored as normalized floats. This is the raw material for any visualization — current or future.

```javascript
{
  t: 12.5,                          // timestamp in seconds

  // === LOUDNESS ===
  loudness: 0.72,                   // RMS energy, normalized 0-1
  
  // === FREQUENCY BANDS (7 bands) ===
  bands: {
    sub:      0.45,                 // 20-60 Hz     — sub bass, 808s
    bass:     0.68,                 // 60-250 Hz    — kicks, bass guitar
    low_mid:  0.52,                 // 250-500 Hz   — vocal body, warmth
    mid:      0.41,                 // 500-2000 Hz  — vocals, synths
    high_mid: 0.33,                 // 2000-4000 Hz — presence, attack
    high:     0.18,                 // 4000-8000 Hz — brilliance, detail
    air:      0.09,                 // 8000-20000 Hz — cymbals, sibilance
  },
  
  // === RHYTHM ===
  beat: true,                       // beat position?
  beat_strength: 0.85,              // beat intensity/confidence
  downbeat: true,                   // bar boundary (beat 1)?
  
  // === TRANSIENTS ===
  onset: true,                      // attack/transient here?
  onset_strength: 0.92,             // how sharp
  flux: 0.34,                       // spectral flux — rate of timbral change
  
  // === TONALITY ===
  spectral_centroid: 0.45,          // brightness (dark↔bright)
  spectral_spread: 0.38,           // frequency distribution width
  spectral_rolloff: 0.52,          // where energy drops off
  
  // === CHROMA (12 pitch classes) ===
  chroma: [0.9, 0.1, 0.3, 0.1, 0.7, 0.2, 0.1, 0.8, 0.1, 0.2, 0.1, 0.3],
  // C, C#, D, D#, E, F, F#, G, G#, A, A#, B
  // Shows which notes are active — reveals chord changes, key centers
  
  // === TIMBRE (13 MFCCs) ===
  mfcc: [12.3, -2.1, 5.4, ...],    // mel-frequency cepstral coefficients
  // Describes WHAT the sound is — piano vs guitar vs voice vs synth
  // Enables: timbral similarity, instrument detection, texture mapping
  
  // === PITCH ===
  pitch_hz: 440.0,                  // dominant pitch (null if unpitched)
  pitch_confidence: 0.7,            // how clearly pitched

  // === DYNAMICS ===
  dynamic_range: 0.6,               // loud-quiet contrast within window
  zero_crossing_rate: 0.34,         // percussive (high) vs tonal (low)
  harmonic_noise_ratio: 0.8,        // clean (high) vs gritty (low)
}
```

### Storage math

~45 fields per snapshot. ~800 bytes raw JSON per snapshot.

| Song length | Snapshots (500ms) | Raw JSON | Gzipped | 
|:---|:---|:---|:---|
| 3 minutes | 360 | 288KB | ~70KB |
| 4 minutes | 480 | 384KB | ~90KB |
| 6 minutes | 720 | 576KB | ~140KB |

| Scale | Tracks | Gzipped total | Monthly cost (R2) |
|:---|:---|:---|:---|
| Your library | 500 | ~45MB | Free |
| Early users | 10,000 | ~900MB | ~$0.01 |
| Growth | 100,000 | ~9GB | ~$0.14 |
| Scale | 1,000,000 | ~90GB | ~$1.35 |

**Cost is irrelevant.** Even at a million tracks, storage is a rounding error. There is no reason to be stingy with the data.

---

## Database Schema

### fabric_tracks (the index)

```sql
fabric_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity (source-agnostic)
  isrc text UNIQUE,                     -- primary key when available
  composite_key text UNIQUE,            -- fallback: hash(artist+title+duration_bucket)
  title text NOT NULL,
  artist text NOT NULL,
  duration_ms integer NOT NULL,
  
  -- Platform cross-references (added as discovered)
  spotify_id text,
  apple_music_id text,
  
  -- Per-track summary (replaces ReccoBeats over time)
  bpm integer,
  key text,                             -- "C# minor"
  energy float,
  valence float,
  danceability float,
  loudness float,
  acousticness float,
  
  -- Analysis state
  status text DEFAULT 'pending',        -- pending | processing | complete | failed | expired
  analysis_version integer DEFAULT 1,
  analyzed_at timestamp,
  error text,                           -- failure reason if failed
  
  -- Lifecycle
  play_count integer DEFAULT 1,
  last_played_at timestamp DEFAULT now(),
  first_played_by uuid,                 -- user who triggered analysis
  created_at timestamp DEFAULT now(),
  expires_at timestamp                  -- NULL = permanent, set for low-value tracks
)

-- Indexes
CREATE INDEX idx_fabric_spotify ON fabric_tracks(spotify_id);
CREATE INDEX idx_fabric_isrc ON fabric_tracks(isrc);
CREATE INDEX idx_fabric_composite ON fabric_tracks(composite_key);
CREATE INDEX idx_fabric_status ON fabric_tracks(status);
CREATE INDEX idx_fabric_expires ON fabric_tracks(expires_at) WHERE expires_at IS NOT NULL;
```

### fabric_timelines (the data)

```sql
fabric_timelines (
  track_id uuid REFERENCES fabric_tracks(id) ON DELETE CASCADE,
  resolution_ms integer DEFAULT 500,
  timeline jsonb NOT NULL,              -- the snapshot array
  size_bytes integer,                   -- for monitoring
  
  PRIMARY KEY (track_id, resolution_ms)
)
```

### Lookup flow

```
Client has: spotify_id (or apple_music_id, etc.)

1. Check fabric_tracks WHERE spotify_id = ?
   → Found + status = 'complete': fetch timeline, return
   → Found + status = 'processing': return null (use procedural)
   → Found + status = 'pending': already queued
   → Not found: insert new row, queue job

The client always gets an answer immediately.
The pipeline works in the background.
```

### How users find their songs

Fabric isn't a user-facing library (yet). It's infrastructure. The user interacts with their Spotify/Apple Music library as normal. Fabric is invisible — it just makes the wave better.

**Future (the library view):** When the collection is large enough, expose a browsable interface:

```
Browse by:
  - Artist (alphabetical)
  - Album
  - Genre/mood (derived from features)
  - Energy level (calm → intense)
  - Recently played
  - Most played across all users

Search: artist, title, or ISRC

Each entry shows:
  - Track info
  - Mini waveform preview (rendered from timeline)
  - Export button (poster)
  - Play count across Fülkit
```

---

## Bloat Safeguards

### The problem

Not every song deserves permanent storage. One user plays an obscure polka track once and never again. Storing 90KB of analysis data for a song nobody will ever play again is waste at scale.

### Tiered lifecycle

```
┌─────────────────────────────────────────────────────────┐
│  PERMANENT                                                │
│  Criteria: play_count >= 3 (across any users)            │
│  Storage: full timeline, no expiry                        │
│  This is the core collection. Songs people actually       │
│  listen to. Grows organically with real usage.            │
├─────────────────────────────────────────────────────────┤
│  PROVISIONAL                                              │
│  Criteria: play_count < 3                                 │
│  Storage: full timeline, expires_at = created_at + 180d  │
│  One-off plays get 180 days. If anyone plays the song     │
│  again within that window, play_count increments.         │
│  Hit 3 plays → promoted to permanent.                     │
│  No plays in 180 days → expired, timeline deleted.        │
│  Track row stays (lightweight) for future re-analysis.    │
├─────────────────────────────────────────────────────────┤
│  DEFERRED                                                 │
│  Criteria: duration > 15 min OR unmatched on YouTube      │
│  Storage: track row only, no timeline                     │
│  Long-form content (DJ mixes, ambient albums, podcasts)   │
│  and unmatchable tracks don't get analyzed automatically.  │
│  Can be manually requested by user in the future.         │
└─────────────────────────────────────────────────────────┘
```

### Cleanup job (runs nightly)

```sql
-- Delete expired timelines (keep track rows for potential re-analysis)
DELETE FROM fabric_timelines
WHERE track_id IN (
  SELECT id FROM fabric_tracks
  WHERE expires_at IS NOT NULL
  AND expires_at < now()
  AND play_count < 3
);

-- Update expired tracks
UPDATE fabric_tracks
SET status = 'expired', timeline = NULL
WHERE expires_at IS NOT NULL
AND expires_at < now()
AND play_count < 3;
```

### What this means at scale

Assume 80% of plays are repeat listens of songs already in the permanent tier. Of the 20% new songs, maybe half get played again within 180 days. The other half expire.

| Month | New songs analyzed | Promoted to permanent | Expired | Permanent collection |
|:---|:---|:---|:---|:---|
| 1 | 2,000 | 1,200 | 0 (too early) | 1,200 |
| 3 | 2,000 | 1,000 | 0 (too early) | 4,000 |
| 6 | 2,000 | 1,000 | 0 (first window closing) | 7,000 |
| 9 | 2,000 | 800 | 1,000 | 9,500 |
| 12 | 2,000 | 800 | 1,200 | 12,000 |

The permanent collection is self-curating. It contains exactly the songs people actually listen to. The polka track expires. "Satisfaction" lives forever.

---

## The Pipeline: YouTube → Essentia → Fabric

### Step 1: Match on YouTube

```python
def find_and_download(artist: str, title: str, duration_ms: int) -> str | None:
    query = f"{artist} {title} official audio"
    target_duration = duration_ms / 1000

    with yt_dlp.YoutubeDL(search_opts) as ydl:
        results = ydl.extract_info(f"ytsearch5:{query}", download=False)
        
        # Score each result
        best = None
        best_score = 0
        for entry in results.get('entries', []):
            score = match_score(entry, artist, title, target_duration)
            if score > best_score:
                best_score = score
                best = entry
        
        # Reject low-confidence matches
        if best_score < 0.6:
            return None
        
        # Download audio only
        download(best['webpage_url'], output_path)
        return output_path
```

**Match scoring:**
- Duration within ±3s: +0.4
- Title contains track name: +0.2
- Channel name contains artist: +0.2
- Title contains "official" or "audio": +0.1
- Title does NOT contain "live", "cover", "remix" (unless original is): +0.1
- Reject: duration off by >10s, clearly wrong artist

### Step 2: Analyze with Essentia

Full extraction per the snapshot schema above. ~45 fields per 500ms window. Processing time: 10-20 seconds per track.

**Audio is ALWAYS deleted after analysis. Fabric stores numbers, never audio.**

### Step 3: Store in Supabase

Insert track row + timeline. Set `expires_at` for provisional (play_count < 3). Mark status = 'complete'.

### Worker infrastructure

Dedicated VPS ($10-20/mo). Python + yt-dlp + ffmpeg + Essentia. Simple job queue polling `fabric_tracks WHERE status = 'pending'`. Processes sequentially. At early scale (< 1000 users), a single worker handles the load easily.

---

## Poster Export (Future — Art Output)

### What it is

A static visual representation of an entire song, rendered from the Fabric timeline. Exportable as SVG or high-res PNG. Printable at 11×17. Deterministic — same song, same poster.

### Design direction

Informed by the reference images:

**Accept & Proceed (rainfall bars):** Data as structured composition. Each data point is a mark. The aggregate creates a shape that tells a story. For music: each 500ms snapshot becomes a visual element. The song's structure emerges from the accumulation.

**Iceberg topology:** Surface and depth. What you hear (melody, rhythm) vs what's underneath (sub-bass, harmonic tension, micro-dynamics). The poster could split above/below a center line — the audible vs the felt.

**Layered wave terrain:** Time flows left to right. Frequency bands stack vertically. Density/weight = loudness. The song becomes a landscape viewed from the side.

**Relational structure:** Sections that share harmonic content (same chroma profile) connect visually. Repeating patterns (verse/chorus) create visual rhythm. The bridge is visibly different — isolated, sparse.

### Rendering approach

The poster renderer reads the same Fabric timeline as the live wave. But instead of animating through it, it renders ALL snapshots simultaneously into a spatial composition.

```
X-axis:  Time (0:00 → end)
Y-axis:  Frequency (sub bass at bottom → air at top)
Weight:  Loudness (faint → bold)
Texture: Timbre (MFCC similarity → visual grouping)
Accents: Onsets (sharp marks), beats (structural grid)
Chroma:  Structural density or line weight variation
         (major key = open/spread, minor key = dense/tight)
```

### Metadata embedded in export

```
Title: "Satisfaction"
Artist: "The Rolling Stones"  
Duration: 3:44
BPM: 136
Key: E major
Analyzed by: Fülkit Fabric
Analysis ID: fabric_xxxx
```

### Watermark

Small "Fülkit Fabric" in the bottom margin. Tasteful. The poster IS the marketing.

---

## Implementation Order

### Phase 0 — Verify (now, no code)
- [ ] DevTools: confirm ReccoBeats returns real data for 10 tracks
- [ ] Document hit rate and fallback behavior

### Phase 1 — Procedural Architecture (COMPLETE)
- [x] Deterministic seed from track ID (mulberry32 PRNG)
- [x] Section estimator (duration + BPM + energy → structure)
- [x] Per-bar energy envelope with smooth transitions (2-bar gaussian blur)
- [x] Wire envelope to renderer as amplitude ceiling (not multiplier — avoids double-attenuation)
- [x] Test consistency: same song = same shape

### Phase 2 — Multi-Line Renderer (days)
- [ ] Refactor to N overlapping wave strokes
- [ ] Per-line: depth, band bias, noise offset, speed, opacity, line weight
- [ ] Performance test on mobile (target: 3-5 lines at 30fps)
- [ ] Visual test: idle vs playing vs breakdown vs drop

### Phase 3 — Fabric Pipeline (weeks)
- [ ] Database: `fabric_tracks` + `fabric_timelines` in Supabase
- [ ] Worker VPS: Python + yt-dlp + ffmpeg + Essentia
- [ ] YouTube match function with confidence scoring
- [ ] Full Essentia extraction (45-field snapshot schema)
- [ ] Job queue: pending → processing → complete/failed
- [ ] Audio cleanup: always delete after analysis
- [ ] API routes: GET timeline, POST request analysis
- [ ] Client: check Fabric → ReccoBeats → procedural fallback
- [ ] Bloat safeguards: provisional/permanent tiering, nightly cleanup

### Phase 3b — Dev Sandbox (immediately after pipeline works)

**Collin's account is the proving ground. Every song you own, analyzed first.**

#### Harvest script (one-time + monthly refresh)

Pull every unique track from your Spotify account:

```python
def harvest_user_library(spotify_client) -> list[dict]:
    tracks = set()
    
    # 1. All saved tracks (your "liked songs")
    for track in paginate(spotify_client.current_user_saved_tracks):
        tracks.add(extract_track_info(track))
    
    # 2. Every playlist you own or follow
    for playlist in paginate(spotify_client.current_user_playlists):
        for track in paginate(spotify_client.playlist_tracks, playlist['id']):
            tracks.add(extract_track_info(track))
    
    # 3. Your top tracks (short, medium, long term)
    for term in ['short_term', 'medium_term', 'long_term']:
        for track in spotify_client.current_user_top_tracks(time_range=term, limit=50):
            tracks.add(extract_track_info(track))
    
    # 4. Recently played (last 50)
    for item in spotify_client.current_user_recently_played(limit=50):
        tracks.add(extract_track_info(item['track']))
    
    # 5. Top 50 artists → their top tracks
    for term in ['medium_term', 'long_term']:
        for artist in spotify_client.current_user_top_artists(time_range=term, limit=50):
            for track in spotify_client.artist_top_tracks(artist['id']):
                tracks.add(extract_track_info(track))
    
    return list(tracks)
```

Expected yield: 500–2000 unique tracks depending on library size.

#### Run it

```
Night 1: Harvest → queue all tracks → worker processes overnight
         ~1000 tracks × ~20s each = ~5.5 hours
         Wake up to a fully analyzed personal library.

Night 2: Catch stragglers, retry failures.

Day 3:   Live with it. Play your music. Judge the wave.
         This is the moment of truth.
```

#### Dev-only gating

```javascript
// In the Fabric API route
const DEV_ACCOUNTS = ['collin_user_id'];

function canAccessFabric(userId) {
  // Phase 3b: dev only
  return DEV_ACCOUNTS.includes(userId);
  
  // Phase 4+: everyone
  // return true;
}
```

One constant to flip when you're ready to open the gates.

#### Monthly refresh (cron job — 1st of each month)

```python
def monthly_refresh():
    # 1. Re-harvest library (catches new saves, new playlists)
    current_tracks = harvest_user_library(spotify_client)
    
    # 2. Diff against Fabric — only queue tracks we don't have
    existing = get_fabric_track_ids()
    new_tracks = [t for t in current_tracks if t['spotify_id'] not in existing]
    
    # 3. Queue new tracks for analysis
    queue_for_analysis(new_tracks)
    
    # 4. Update play counts from Spotify recently played
    update_play_counts()
    
    print(f"Refresh complete: {len(new_tracks)} new tracks queued")
```

#### Success criteria (before opening to others)

- [ ] 90%+ of your library has Fabric timelines
- [ ] YouTube match accuracy > 85% (spot-check 50 tracks)
- [ ] The wave visibly responds to breakdowns, drops, and genre differences
- [ ] You leave the page open because it looks good, not because you're testing
- [ ] Storage is within expected range (~90KB/track gzipped)

### Phase 3c — Compound Engine (after sandbox proves out)

**Proactive crawling. Analyze songs before users play them.**

#### The spider

Seeds from your library, walks the related-artist graph, weighted by genre preference.

```python
# Genre tier weighting — controls how deep the spider follows each genre
GENRE_TIERS = {
    1: ['hip hop', 'rap', 'r&b', 'indie', 'electronic', 'alternative',
        'soul', 'lo-fi', 'trip hop', 'downtempo'],
    2: ['pop', 'rock', 'jazz', 'latin', 'funk', 'ambient'],
    3: ['country', 'classical', 'folk', 'metal', 'punk', 'world'],
}

# Max hops per tier — deeper crawl for preferred genres
MAX_DEPTH = { 1: 4, 2: 2, 3: 1 }

def get_artist_tier(artist) -> int:
    """Check artist's genres against tier map."""
    for tier, genres in GENRE_TIERS.items():
        if any(g in ' '.join(artist['genres']).lower() for g in genres):
            return tier
    return 3  # default: low priority

def spider(seed_artist_ids: list[str]):
    visited = set()
    queue = [(aid, 0) for aid in seed_artist_ids]  # (artist_id, depth)
    
    while queue:
        artist_id, depth = queue.pop(0)
        if artist_id in visited:
            continue
        visited.add(artist_id)
        
        artist = spotify.artist(artist_id)
        tier = get_artist_tier(artist)
        
        # Skip if we've gone too deep for this genre tier
        if depth > MAX_DEPTH.get(tier, 1):
            continue
        
        # Analyze top tracks
        top_tracks = spotify.artist_top_tracks(artist_id)
        for track in top_tracks:
            queue_if_not_exists(track)
        
        # Follow related artists (only for tier 1 and 2)
        if tier <= 2:
            related = spotify.artist_related_artists(artist_id)
            for rel in related:
                queue.append((rel['id'], depth + 1))
        
        # Rate limit: ~90 artists/min on Spotify API
        time.sleep(0.7)
```

#### Crawl sources (in priority order)

```
1. Your library (already done in sandbox)
2. Related artists from your top artists (depth-weighted by genre)
3. Spotify editorial playlists:
   - Today's Top Hits
   - RapCaviar
   - Pollen (indie)
   - Lorem (electronic)
   - New Music Friday
   - (genre-specific discovery playlists)
4. New releases from followed/related artists (monthly)
5. Billboard / charts data (if accessible)
```

#### Monthly refresh schedule

```
1st of month:
  - Re-harvest dev account library (new saves)
  - Pull latest editorial playlists (trending)
  - Spider 1 hop from any new artists in library
  - Queue all new tracks

15th of month:
  - Re-pull editorial playlists (mid-month refresh)
  - Check for new releases from top 100 artists in Fabric
  - Queue new tracks only
```

#### Scale projections (compound engine)

| Phase | Tracks analyzed | Time | Workers needed |
|:---|:---|:---|:---|
| Sandbox (your library) | ~1,000 | 1 night | 1 |
| Spider depth 1 (related artists) | ~5,000 | 2-3 nights | 1 |
| Spider depth 2 + playlists | ~30,000 | ~1 week | 2 |
| Full crawl (4 hops, all tiers) | ~100,000+ | ~1 month | 4 |

At 100K tracks analyzed, most mainstream music any user would play is already in Fabric. First-time visitors get instant full fidelity for anything popular.

#### Engine controls (owner portal)

```
Fabric Engine:
  Status:           Running / Paused / Idle
  Last run:         March 1, 2026
  Next scheduled:   April 1, 2026
  
  Tracks analyzed:  1,247
  Queue depth:      0
  Failed:           12 (view)
  Storage used:     112 MB
  
  Genre weights:    [edit tiers]
  Seed artists:     [manage list]
  Max depth:        [1-4 slider]
  
  [Run Now]  [Pause]  [View Logs]
```

### Phase 4 — Timeline Integration (days after Phase 3)
- [ ] Snapshot interpolator (progress_ms → current snapshot)
- [ ] Wire all fields to multi-line renderer
- [ ] "Points unlocked" transition: procedural → Fabric bloom
- [ ] Test: breakdowns, drops, genre differentiation

### Phase 5 — Open the Gates
- [ ] Remove dev-only gating
- [ ] User plays trigger analysis for tracks not in Fabric
- [ ] Compound engine running on schedule in background
- [ ] Monitor: hit rate, match accuracy, storage growth, queue depth

### Phase 6 — Poster Export (future)
- [ ] Static renderer: full timeline → spatial composition
- [ ] SVG + PNG export at print resolution
- [ ] Metadata embedding
- [ ] UI: export button on audio page
- [ ] Library view: browsable collection of analyzed songs

### Phase 7 — Studio Mode (optional, settings)
- [ ] Multi-band mic analysis (existing spec from Fülkit)
- [ ] Settings toggle: Auto / Studio / Off
- [ ] User-contributed data: mic analysis seeds Fabric for unanalyzed tracks

---

## Open Questions

### Must answer before Phase 3

- [ ] **YouTube ToS risk assessment.** Downloading for analysis (not redistribution), storing only derived numerical data, deleting audio immediately. What's the real risk for a commercial product?
- [ ] **Worker hosting decision.** DigitalOcean / Railway / Fly.io. Need Python + yt-dlp + ffmpeg + Essentia. ~2GB RAM. $10-20/mo.
- [ ] **Match accuracy testing.** Run the YouTube matcher against 50 known tracks. What's the false match rate?

### Should discuss before shipping

- [ ] **ISRC fallback reliability.** Not all tracks have ISRCs (indie, self-published). How robust is the composite key fallback? Duration buckets at ±2s tolerance?
- [ ] **Normalization strategy.** Per-track relative (quiet jazz and loud EDM both use full 0-1 range) or absolute (loud EDM is actually louder in the data)?
- [ ] **Poster design exploration.** Need to prototype 3-4 visual directions against the same Fabric data. Which aesthetic best serves the "song as art" vision?
- [ ] **Chroma/MFCC usefulness.** These fields double the snapshot size. Are they worth it for the waveform? (Yes for posters and future renderers. Probably.)

### Future (parked)

- [ ] **Fabric API for third-party developers.** The data layer as its own product. Table until pipeline proves itself.
- [ ] **Cross-platform sources.** Apple Music, SoundCloud connectors. ISRC keying makes this seamless.
- [ ] **Resolution auto-upgrade.** Re-analyze popular tracks at 250ms. Cost/benefit TBD.
- [ ] **Naming the product.** "Fülkit Fabric" is the working name. Does it graduate to its own brand?
