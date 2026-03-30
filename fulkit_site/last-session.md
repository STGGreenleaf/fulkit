# Last Session

**Date**: 2026-03-29 (Session 26)
**Scope**: Fabric search bugs, Spotify independence sweep, B-Side playback control

**Shipped**:
- Search 500s fixed (empty results on error, cleanTitle at all query points)
- BPM-dirty track IDs fixed (strip order, prose gate, Format 2 cleanup)
- Resume cue fix (validate YouTube ID before cueing)
- Fabric independence: 13 files, Spotify demoted to plugin (routing by track.provider, defaults removed, API routes accept provider param, ecosystem renamed to "fabric")
- B-Side playback control: play/pause/skip/prev/volume/mute via text commands, instant execution
- B-Side persona updated: Fabric is the system, store always open, control docs

**Carry forward — NEXT**:
1. **B-Side search** — "find me some Burial" triggers catalog search
2. **Sonos speaker picker UI** — speaker icon in Fabric player
3. **Sonos controls via B-Side** — "play in living room"
4. **Apple Music** — MusicKit JS provider
5. **Sonos logo verify** — SVG looks correct, needs visual check
6. **Pitches.md audit** — 3 flagged items

**Known issues**:
- Sonos logo may not render (needs visual verify)
- Google verification pending (4-6 weeks)
