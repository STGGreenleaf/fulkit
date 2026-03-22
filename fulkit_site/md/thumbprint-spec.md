# Spec: Thumbprint — Accessibility Visualization for Music

*For Collin to take, mark up, and refine.*

---

## Scope: Fabric + B-Side Only
This work lives entirely inside Fabric and B-Side. Nothing else in Fulkit is touched. Fabric is its own island. Thumbprint is Fabric infrastructure.

## What Thumbprint Is

Thumbprint is a per-song map of how music **feels** over time. Not a recording. Not audio. A mathematical shape — the pulse, the drops, the builds, the energy, the rhythm. Timed to the actual song structure so Signal Terrain can move WITH the music, not randomly.

**The ethical frame:** We are not recording music. We are analyzing it for visualization — showing what the music feels like. A hearing-impaired person could watch Signal Terrain and feel the song's structure: when the bass hits, when the hi-hats tap, when the drop comes, when the build peaks. This is accessibility, not piracy.

**What we store:** The feel. Frequency bands, beat positions, onset spikes, loudness contour, flux. Numbers. Math. No audio.

**What we discard:** The audio itself. It plays through the user's browser, we read the shape, we throw away the sound. The thumbprint is the skeleton of the song — you can't reconstruct the music from it.

---

## How It Works Today

The existing pipeline (`analyze-track.mjs`) downloads audio via yt-dlp, runs FFT, stores the thumbprint, deletes the audio. This works but has problems:
- Downloads the full audio file (even temporarily) — grey area legally
- Runs on Collin's Mac only — doesn't scale
- Requires yt-dlp which YouTube tries to block

---

## The Better Model: Client-Side Analysis

**Principle:** The audio never leaves the user's device. Their browser plays the song. Their browser's Web Audio API reads the frequencies. The thumbprint builds in real-time as they listen. Only the math gets stored.

### For Spotify (works now)
Spotify Web Playback SDK creates an audio element in the browser. We can attach Web Audio API's `AnalyserNode` to that audio stream:
```
Spotify SDK → Audio Element → AnalyserNode → FFT data → Thumbprint
```
- Real-time frequency data at every animation frame
- 7 frequency bands extracted (sub/bass/low_mid/mid/high_mid/high/air)
- Beat detection via onset/flux tracking
- No download. Audio plays normally. We just read the shape.
- At end of song: thumbprint is complete. Upload to `fabric_timelines`. Next play uses stored data.

### For YouTube (the gap)
YouTube iframe API does NOT expose the audio stream to Web Audio API. The iframe is cross-origin — browser security blocks `createMediaElementSource()` on cross-origin audio.

**Options:**
1. **Proxy the audio through your own server** — Download the audio server-side (like now), but stream it through your own audio element instead of YouTube's iframe. Then Web Audio API works. But this is basically what yt-dlp does, just in real-time. Same grey area.

2. **Use the system audio** — `getDisplayMedia()` or `getUserMedia()` with system audio capture. The browser captures whatever audio is playing (including YouTube). But requires user permission and isn't reliable cross-browser.

3. **Pre-analyze server-side for curated content** — For YOUR default sets (Work Tech, etc.), you analyze the tracks ahead of time using the existing pipeline. Users who play your curated sets get full thumbprint visualization. New/unknown tracks get the procedural fallback until someone with Spotify plays the same song and the thumbprint generates client-side.

4. **Hybrid: ISRC cross-reference** — When a YouTube track plays, look up the same song on Spotify by ISRC or title+artist. If a Spotify user has already generated the thumbprint for that song, reuse it. The thumbprint is song-specific, not source-specific. "Midnight City" has the same feel whether it plays from YouTube or Spotify.

### Recommended: Option 3 + 4 (Hybrid)

- **Your curated sets:** Pre-analyzed via existing pipeline. Full thumbprint from day one.
- **Spotify users:** Client-side analysis via Web Audio API. Thumbprint generates as they listen.
- **YouTube users (no Spotify):** Check if thumbprint exists from another user/source. If yes, use it. If no, procedural fallback until the song gets analyzed.
- **Over time:** The thumbprint library grows organically. Popular songs get thumbprinted quickly. Niche songs take longer but eventually get covered.

---

## The Thumbprint Schema (already built)

Per-song, 500ms resolution, stored in `fabric_timelines`:

```javascript
{
  t: 12.5,                    // timestamp in seconds
  loudness: 0.72,             // RMS normalized 0-1
  bands: {
    sub: 0.45,                // sub-bass (kicks, deep rumble)
    bass: 0.68,               // bass (bass guitar, low synths)
    low_mid: 0.52,            // low mids (body, warmth)
    mid: 0.41,                // mids (vocals, guitars)
    high_mid: 0.33,           // high mids (presence, bite)
    high: 0.18,               // highs (hi-hats, cymbals)
    air: 0.09                 // air (shimmer, breath)
  },
  flux: 0.34,                 // spectral change (transients)
  beat: true,                 // beat position
  beat_strength: 0.85,        // confidence
  onset: true,                // transient/attack
  onset_strength: 0.92,       // sharpness
  downbeat: true,             // bar boundary
  spectral_centroid: 0.45,    // brightness
  dynamic_range: 0.6          // loud vs quiet contrast
}
```

~360-720 snapshots per song (3-6 minute track at 500ms). A 4-minute song is ~2KB of JSON. Tiny. Stored once, used forever.

---

## What Signal Terrain Does With It

The Deep Amoeba visualization maps the thumbprint to a living shape:
- Each frequency band controls a different zone of the form
- Kicks (sub) push one area outward
- Hi-hats (high) ripple another area
- Bass lines swell the body
- Beats pulse the whole form
- Onsets create spikes
- Drops create dramatic expansion
- Quiet sections let the form rest

Without a thumbprint: procedural noise (still beautiful, just not choreographed to the music).

With a thumbprint: the visualization IS the music. A deaf person could watch it and feel the song's structure.

---

## The Accessibility Pitch

"Signal Terrain doesn't play music — it shows you what music feels like. Every beat, every drop, every build, visualized in real time. The same song always looks the same way. We don't store audio. We store the feel."

This is:
- Ethically clean (no audio stored, no reproduction)
- Legally defensible (transformative use — mathematical analysis for visualization)
- Genuinely useful (accessibility for hearing impaired)
- Source-independent (same thumbprint regardless of where the song plays from)
- A real differentiator (nobody else does this)

---

## Implementation Path

### Phase 1: Client-side Spotify analysis (replace yt-dlp for Spotify users)
- Attach AnalyserNode to Spotify Web Playback SDK audio
- Extract 7 bands + loudness + flux + beat/onset per 500ms
- Build thumbprint in real-time as user listens
- Upload complete thumbprint to fabric_timelines when song ends
- No server-side download needed for Spotify tracks

### Phase 2: Pre-analyze curated sets
- Use existing pipeline (analyze-track.mjs) to thumbprint your default sets
- "Work Tech", "Late Night", etc. — all pre-thumbprinted
- Every new user gets choreographed visualizations from minute one

### Phase 3: Cross-reference library
- When YouTube track plays, look up thumbprint by ISRC or title+artist
- If another user already thumbprinted the same song via Spotify → reuse it
- Thumbprint library grows organically across all users

### Phase 4: Analyzed indicator
- Small dot or pulse icon on tracks that have a thumbprint
- Users know which songs have full choreographed visualization
- Incentive to listen to un-analyzed tracks ("help build the library")

---

## What This Does NOT Do

- Does NOT store audio in any form
- Does NOT download songs (client-side analysis only, except for pre-curated sets)
- Does NOT change the player UI
- Does NOT change Signal Terrain's visual design
- Does NOT require any music service's permission (we're analyzing what the user is already playing in their browser)
- Does NOT depend on any single music API
- Does NOT show ads. Ever. Fabric is a music space, not an ad platform. This is non-negotiable. If a source injects ads (YouTube free tier), we must address it — either use ad-free tiers only, or find sources that don't pollute the experience. The moment an ad plays during a visualization, the magic is dead.

---

## Files

**Existing (keep):**
- `scripts/analyze-track.mjs` — server-side pipeline for pre-curating sets
- `scripts/batch-analyze.mjs` — batch processor for curated content
- `fabric_timelines` table — thumbprint storage
- `fabric/page.js` — Signal Terrain visualization (Deep Amoeba)
- `api/fabric/timeline/route.js` — thumbprint fetch endpoint

**New:**
- Client-side AnalyserNode integration in SpotifyEngine.js
- Thumbprint builder (client-side module that accumulates snapshots)
- Upload endpoint or client-side Supabase insert for completed thumbprints
- Cross-reference lookup by ISRC/title+artist in timeline API
