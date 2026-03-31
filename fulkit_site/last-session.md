# Last Session

**Date**: 2026-03-31 (Session 28)
**Scope**: Sonos individual speakers, independent art engine, Spotify SDK wiring, provider-agnostic routing, Settings Spotify/Sonos split

**Shipped**:
- Sonos: 8 individual speakers with checkboxes + per-speaker volume (−/num/+) + connection status dot
- Art engine: trackArt decoupled from currentTrack, never flickers on play/skip/provider switch
- Sonos routing: SONOS_PROVIDERS list, auto-resolves through Spotify when Sonos active, provider only changes on success
- Settings: spotifyConnected split from fabricConnected, disconnect query param fix, fresh re-auth with streaming scope
- SDK: SpotifyEngine wired to fabric state (spotifyDeviceId), transferToSonos action, auth failure kills SDK cleanly
- CSP: sdk.scdn.co iframe + api.spotify.com + wss://dealer.spotify.com

**Blocked**: Spotify Web Playback SDK `web-playback` scope → 403 (Development Mode limitation). Transfer chain is built, just needs SDK approval. Details + drafted email in `md/spotify-sdk-blocker.md`.

**Next (Session 29)**:
- Submit Spotify Extended Quota request for Web Playback SDK
- Test Sonos transfer once SDK scope clears
- B-Side search standalone feature
- Pitches.md audit (3 flagged items)
- Morning briefing (merge standup + weather + calendar + watches)
