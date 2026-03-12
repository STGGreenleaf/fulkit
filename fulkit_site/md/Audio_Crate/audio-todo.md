# Fabric Dev Sandbox — Todo

> Prove it works on your own music first. Everything else waits.

---

## The Goal

Get Fabric running on Collin's Spotify account. Analyze your personal library. Play your music. See if the wave transforms into something worth building further. If yes, keep going. If no, you saved months.

---

## Correction: Pricing

Fülkit is $7/mo. No free tier. Every user is paid. Fabric isn't a premium upsell — it's a standard feature that every paying user gets. The wave quality IS the product quality. Featured playmixes showcase Fabric from day one. Personal library analysis happens in the background as users listen.

---

## Step 0 — Verify ReccoBeats (today, 10 minutes)

| | Task |
|:---:|:---|
| ⬜ | Open DevTools Network tab in Fülkit |
| ⬜ | Play a chill track. Check `/api/spotify/audio-features` response. Note BPM/energy/valence. |
| ⬜ | Play an aggressive track. Check response. Are the numbers different? |
| ⬜ | Play an obscure track. Does ReccoBeats return empty `features: {}`? |
| ⬜ | Document: what % of your recent plays return real data vs defaults? |

**If ReccoBeats is broken or mostly empty, fix this first. Layer 1 has to work before Layer 2 matters.**

---

## Step 1 — Worker Setup (1-2 days)

Stand up a small VPS that can run the Fabric pipeline.

| | Task |
|:---:|:---|
| ⬜ | Provision VPS (DigitalOcean $12/mo droplet, 2GB RAM, Ubuntu) |
| ⬜ | Install Python 3.10+ |
| ⬜ | Install yt-dlp (`pip install yt-dlp`) |
| ⬜ | Install ffmpeg (`apt install ffmpeg`) |
| ⬜ | Install Essentia (`pip install essentia`) |
| ⬜ | Test manually: download one song via yt-dlp, analyze with Essentia, confirm output |
| ⬜ | Confirm audio file deletes after analysis |

**Milestone: you can SSH in, run a command, and get a JSON blob of analysis data for a song.**

---

## Step 2 — Database (half day)

| | Task |
|:---:|:---|
| ⬜ | Create `fabric_tracks` table in Supabase (schema from audio-spec.md) |
| ⬜ | Create `fabric_timelines` table |
| ⬜ | Create `fabric_jobs` table (id, track_id, status, attempts, error, timestamps) |
| ⬜ | Set up indexes (spotify_id, isrc, composite_key, status) |
| ⬜ | Test: insert a mock row, read it back, delete it |

---

## Step 3 — Harvest Your Library (half day)

One script that pulls every unique track from your Spotify account.

| | Task |
|:---:|:---|
| ⬜ | Script: pull saved tracks (liked songs) |
| ⬜ | Script: pull all playlists you own/follow → all tracks |
| ⬜ | Script: pull top tracks (short/medium/long term) |
| ⬜ | Script: pull top artists → their top tracks |
| ⬜ | Script: pull recently played |
| ⬜ | Deduplicate by Spotify track ID |
| ⬜ | Extract per track: spotify_id, isrc, title, artist, duration_ms |
| ⬜ | Insert into `fabric_tracks` with status = 'pending' |
| ⬜ | Log: how many unique tracks? (expect 500-2000) |

---

## Step 4 — Pipeline End-to-End (2-3 days)

Connect harvest → YouTube match → Essentia → Supabase.

| | Task |
|:---:|:---|
| ⬜ | YouTube match function: `ytsearch5:{artist} {title} official audio` |
| ⬜ | Match scoring: duration ±3s, title match, channel match, reject covers/live |
| ⬜ | Download: audio only, WAV format, to /tmp |
| ⬜ | Essentia analysis: full 45-field snapshot schema at 500ms resolution |
| ⬜ | Store: insert timeline JSON into `fabric_timelines` |
| ⬜ | Update: mark `fabric_tracks` status = 'complete' |
| ⬜ | Cleanup: delete audio file (always, even on error) |
| ⬜ | Error handling: mark failed, log reason, move to next |
| ⬜ | Job queue consumer: poll `fabric_jobs` for pending, process sequentially |
| ⬜ | Run it: queue your full library, let it process overnight |
| ⬜ | Morning check: how many completed? How many failed? Why? |

**Milestone: wake up to 80%+ of your library analyzed in Supabase.**

---

## Step 5 — Wire to Fülkit (1-2 days)

Connect Fabric data to the live wave renderer.

| | Task |
|:---:|:---|
| ⬜ | API route: `GET /api/fabric/[spotifyId]` — returns timeline if exists |
| ⬜ | Dev gate: only return data for your account |
| ⬜ | Client: on track change, check Fabric first → ReccoBeats fallback → procedural |
| ⬜ | Snapshot interpolator: progress_ms → current snapshot with lerp |
| ⬜ | Wire `loudness` to amplitude |
| ⬜ | Wire `bands.bass` to front line displacement |
| ⬜ | Wire `bands.mid` to middle line complexity |
| ⬜ | Wire `bands.air` to back line shimmer/jitter |
| ⬜ | Wire `onset` to transient spike |
| ⬜ | Wire `beat` to rhythmic pulse (replaces BPM estimate with real positions) |

---

## Step 6 — Live With It (1 week)

This is the test. No building. Just listening and watching.

| | Task |
|:---:|:---|
| ⬜ | Play 20+ different songs across genres you like |
| ⬜ | Check: does a breakdown actually go flat? |
| ⬜ | Check: does a drop actually hit hard? |
| ⬜ | Check: do hi-hats look different from kicks? |
| ⬜ | Check: can you recognize a song by its visual shape on second play? |
| ⬜ | Check: do you leave the page open just to watch? |
| ⬜ | Check: would you show this to someone? |
| ⬜ | Spot-check 10 tracks: did YouTube match the right song? |
| ⬜ | Note what feels wrong, what's missing, what surprises you |

**The honest question: is the juice worth the squeeze?**

---

## Step 7 — Featured Playmixes (after Step 6 passes)

Pre-analyze a curated set of tracks for the public-facing showcase.

| | Task |
|:---:|:---|
| ⬜ | Pick 20-30 tracks across genres that show off the wave well |
| ⬜ | Verify all have complete Fabric timelines |
| ⬜ | Spot-check each: correct YouTube match, good analysis quality |
| ⬜ | Feature these as Fülkit playmixes with the upgraded visualization |
| ⬜ | This is the storefront — every visitor sees Fabric quality on these tracks |

---

## Step 8 — Background Harvest for All Users (after playmixes ship)

| | Task |
|:---:|:---|
| ⬜ | Remove dev gate |
| ⬜ | On currently-playing poll: if track not in Fabric, queue silently |
| ⬜ | No extra Spotify API calls — track ID comes free from the poll |
| ⬜ | User listens today, wave is procedural. Comes back tomorrow, wave is Fabric. |
| ⬜ | Monthly cron: refresh editorial playlists, new releases from popular artists |
| ⬜ | Bloat safeguards: 180-day provisional, 3-play permanent promotion |

---

## What's NOT on this list (parked)

- Compound engine spider (wait until background harvest proves the pipeline at scale)
- Poster export (wait until the wave is good enough to care about static art)
- Studio Mode / mic (optional power-user feature, low priority)
- Fabric API for third parties (way future)
- Cross-platform sources (Apple Music etc — wait for demand)
- Owner portal engine controls (build when there's something to control)

---

## Budget

| Item | Monthly cost |
|:---|:---|
| Worker VPS (DigitalOcean 2GB) | $12 |
| Supabase (existing plan) | Already paying |
| Storage overage (if needed) | ~$0.125/GB after plan limit |
| **Total new spend** | **~$12/mo** |

---

## Timeline

| Week | What happens |
|:---|:---|
| Week 1 | Steps 0-2: verify ReccoBeats, stand up worker, create tables |
| Week 2 | Steps 3-4: harvest library, build pipeline, run overnight |
| Week 3 | Step 5: wire to Fülkit renderer |
| Week 3-4 | Step 6: live with it, judge it, decide |
| Week 4+ | Step 7-8: playmixes, open to users (if it passes the test) |
