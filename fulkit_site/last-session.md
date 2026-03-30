# Last Session

**Date**: 2026-03-29 (Session 26, marathon)
**Scope**: Fabric bugs, Spotify independence, B-Side controls, Sonos picker, Strava integration

**Shipped**:
- Search 500s + BPM-dirty track IDs + resume cue + Sonos crashing searches — all fixed
- Fabric independence: 13 files, Spotify demoted to plugin (routing by track.provider)
- B-Side playback control: play/pause/skip/prev/volume/mute via text, instant execution
- B-Side set creation: matches mix/playlist/sets, numbered lists, structured exclusion list
- Sonos speaker picker UI: both transport bars, room routing via B-Side text, offline fallback
- Provider sweep: full stubs on Sonos, seat limits per-provider
- Strava integration: full OAuth, 3 chat tools, Settings card, webhook endpoint, API review submitted

**Carry forward — NEXT**:
1. **Strava API review** — submitted, 7-10 business days (webhook ID 337803)
2. **Road test** — B-Side controls, set creation, Sonos picker (when on home network)
3. **Apple Music** — MusicKit JS provider (paused, needs Apple Developer key)
4. **Pitches.md audit** — 3 flagged items
5. **Sonos logo verify** — SVG in Sources card

**Known issues**:
- Google verification pending (4-6 weeks)
- Strava limited to 1 athlete until API review approved
