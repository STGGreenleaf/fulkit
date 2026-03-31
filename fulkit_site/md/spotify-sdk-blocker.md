# Spotify Web Playback SDK — Scope Blocker

**Status**: BLOCKED (as of 2026-03-31)
**Blocker**: `check_scope?scope=web-playback` returns 403 Forbidden
**Impact**: Cannot register Fulkit as a Spotify Connect device → cannot transfer playback to Sonos speakers from Fabric

## What we have

- Spotify OAuth connected with `streaming` scope (confirmed in DB)
- Spotify Premium account (confirmed)
- Spotify Developer Dashboard: Web Playback SDK + Web API + iOS + Android all enabled
- SpotifyEngine.js: loads SDK, creates player named "Fulkit", gets device ID briefly
- Token endpoint (`/api/fabric/token`) returns valid Spotify access token
- CSP allows `sdk.scdn.co` (frame-src) + `api.spotify.com` + `wss://dealer.spotify.com` (connect-src)

## What happens

1. SDK loads and connects via WebSocket
2. Device registers — `[Spotify SDK] Device ready: <id>`
3. SDK calls `GET /v1/melody/v1/check_scope?scope=web-playback` → **403 Forbidden**
4. Auth error fires → device lost
5. SDK retries internally (our code kills it after first failure)

## What we've tried

- Fresh OAuth (disconnect → revoke access at spotify.com/account/apps → reconnect)
- Token has `streaming` scope (confirmed: `scope: "playlist-read-private streaming user-modify-playback-state..."`)
- Dashboard has all APIs/SDKs checked
- App is in Development Mode with owner as sole user

## Root cause

The `web-playback` scope is an internal Spotify permission separate from the OAuth `streaming` scope. Development Mode apps appear to be blocked from this internal scope even with:
- Premium account
- `streaming` in the OAuth token
- Web Playback SDK enabled in Dashboard

This is a Spotify platform restriction on Development Mode apps. The fix is Extended Quota Mode approval, which explicitly grants Web Playback SDK access.

## What's built and waiting

The entire Sonos transfer chain is complete and will work once the SDK scope clears:

```
SpotifyEngine registers device → spotifyDeviceId stored in fabric state
  → User selects Sonos speakers → setSonosSpeakers calls transferToSonos
    → Server gets Spotify device list (now populated with SDK device)
      → Matches Sonos speaker by room name → transferPlayback()
        → Music plays on Sonos speakers
```

Files involved:
- `components/engines/SpotifyEngine.js` — SDK init, device lifecycle
- `lib/fabric.js` — spotifyDeviceId state, setSonosSpeakers with transfer
- `api/fabric/sonos/route.js` — transferToSonos action
- `lib/providers/sonos.js` — createGroup, getPlayerVolume, setPlayerVolume
- `middleware.js` — CSP for SDK iframe + WebSocket

## What works today without the SDK

- Individual Sonos speaker listing (all 8 speakers with names)
- Per-speaker volume control (−/number/+ stepper, Sonos playerVolume API)
- Speaker selection (checkboxes, local state, instant toggle)
- Connection status indicator (green/grey/red dot + text)
- Sonos play/pause/skip (via Sonos Control API, works when Sonos already has an active source)
- Provider-agnostic routing (SONOS_PROVIDERS list, ready for Apple Music)
- Independent art engine (never flickers on provider switch)

## Drafted Email: Extended Quota Request

**Subject**: Extended Quota Request — Fulkit (Web Playback SDK)

---

Hi Spotify Developer Support,

I'm writing to request Extended Quota Mode for our app **Fulkit** (Client ID: 246af...).

**What Fulkit does**: Fulkit is a personal productivity and music platform at fulkit.app. Its Fabric module is a multi-source music system that connects Spotify, YouTube, and Sonos speakers. Users build listening sets, get AI-powered music recommendations, and control playback across their home speakers — all from one interface.

**Why we need Extended Quota**: We've integrated the Web Playback SDK to register Fulkit as a Spotify Connect device. This enables users to transfer playback from the browser to their Sonos speakers seamlessly — select rooms, adjust per-speaker volume, and control everything from Fabric without switching apps.

Currently, our app is in Development Mode and the SDK's `web-playback` scope check returns 403, even though:
- The token includes the `streaming` scope
- The user has Spotify Premium
- Web Playback SDK is selected in the Dashboard
- The SDK connects and registers a device before the scope check fails

**Current usage**: We were previously approved for Extended Quota with a 5-seat API cap. We're requesting the same for Web Playback SDK access. Our user base is small (owner + beta testers) and we're not seeking high-volume access — just the ability to use the SDK as intended.

**How Spotify benefits**: Fulkit positions Spotify as the premium music source. When a user selects Sonos speakers, Fabric automatically resolves tracks through Spotify (even if the user's library is YouTube-based), driving Spotify engagement and streams.

Thank you,
Collin
Fulkit — fulkit.app

---

## Next steps

1. Submit the email above via Spotify Developer support (developer.spotify.com → Support)
2. If no form exists, try the Spotify Developer Forum or Community
3. Once approved: the SDK will stay registered, device list populates, Sonos transfer works
4. No code changes needed — everything is built and waiting
