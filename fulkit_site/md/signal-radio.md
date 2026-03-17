# Signal Radio — IT Signal Spec

> Fulkit's client/server error and frustration capture system. Captures signals from all authenticated users, groups them by type, and surfaces them in `/owner/radio` for cold diagnosis without reproduction.

---

## Architecture

### Three emission layers

| Layer | File | Function | Context |
|-------|------|----------|---------|
| **React hook** | `lib/signal.js` | `useSignal()` | Chat, UI components — has access to React state |
| **Standalone** | `lib/signal.js` | `emitSignal()` | Global handlers (SignalCollector) — no React context |
| **Server** | `lib/signal-server.js` | `emitServerSignal()` | API routes — server-side, uses admin Supabase client |

All signals write to the existing `user_events` table with `event: "signal:{name}"` prefix. Fire-and-forget — never blocks UI or API responses.

### Auto-enrichment

Every client signal auto-appends `_client` context via `getClientContext()`:

```
url, userAgent, viewport, connection (effectiveType), downlink (Mbps),
visibility (visible/hidden), memory (JS heap in MB)
```

Server signals include model, seat type, BYOK status, stack traces, conversation IDs.

### Dev mode skip

All three emitters check for `?auth` query param. If present (dev mode), signals are suppressed. This prevents test browsing from polluting Radio.

---

## Signal Inventory

### Client signals — `lib/signal.js` (SignalCollector)

| Signal | Severity | Trigger | Meta |
|--------|----------|---------|------|
| `js_error` | error | `window.onerror` | message, source (file:line:col), stack (3 lines) |
| `promise_rejection` | error | `unhandledrejection` | message, stack (3 lines) |
| `offline` | info | `navigator.onoffline` | — |
| `reconnect` | info | `navigator.ononline` | — |
| `quick_reload` | info | Page reload within 10s of last load | elapsed (ms) |
| `rage_click` | info | 3+ clicks on same element within 2s | clicks, target (tag+id+class), disabled (bool), page |
| `long_task` | warning | UI thread blocked >500ms | duration (ms), page |
| `tab_bounce` | info | User hides tab within 10s of arriving | timeOnPage (ms), page |
| `slow_page_load` | warning | DOM interactive >3s | domInteractive (ms), loadComplete (ms), page |

### Chat signals — `lib/use-chat.js`

| Signal | Severity | Trigger | Meta |
|--------|----------|---------|------|
| `double_send` | info | Send while already streaming | textLength |
| `rapid_retry` | info | Send within 3s of last send | elapsed, conversationId, messageCount |
| `context_timeout` | warning | Vault context assembly exceeds 10s | error, conversationId, messageCount |
| `chat_api_error` | error | Non-200 from `/api/chat` | status, error, conversationId, messageCount, hasContext, contextItems, isRetry |
| `rate_limit` | warning | 429 from chat API | conversationId |
| `slow_stream` | warning | First chunk takes >8s | latency, conversationId, messageCount, contextItems |
| `chat_timeout` | error | Stream times out (30s no chunk / 120s total) | phase, elapsed, conversationId, messageCount, firstChunkReceived |
| `chat_abort` | info | User stops streaming | conversationId, streamPhase |
| `message_save_failed` | error | User or assistant message DB insert fails | role, conversationId, error |
| `conversation_save_failed` | error | Conversation creation fails | conversationId, error |
| `writeback_failed` | warning | Artifact writeback (actions/decisions/plans) fails | storageMode, error |
| `topic_extract_failed` | info | Conversation topic update fails | conversationId, error |
| `profile_refresh_failed` | info | `onMessageSent` callback fails | error |

### Server signals — `app/api/chat/route.js`

| Signal | Severity | Trigger | Meta |
|--------|----------|---------|------|
| `rate_limit` | warning | User exceeds message cap | limit, used, seat, model, hasByok |
| `tool_error` | error | Tool execution throws | tool, error, toolRound, model, conversationId |
| `chat_stream_fatal` | error | Unhandled error in stream loop | error, stack, model, messageCount, contextLength, hasByok, seatType, conversationId |
| `message_count_failed` | error | Ful cap increment fails | error, seat, used |
| `token_refresh_failed` | warning | Integration OAuth refresh fails | provider (numbrly/truegauge/square/etc), error |
| `note_embed_failed` | warning | Note embedding or update fails | phase (embedding/update), noteId, error |

---

## Radio UI — `/owner/radio`

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Signal Radio                    [Export]  [1h 24h 7d]│
├──────────────────────────────────────────────────────┤
│  [Mayday: 3]     [Static: 7]     [Interference: 12] │  <- KPI tiles (clickable filter)
├──────────────────────────────────────────────────────┤
│  [All (22)] [Mayday (3)] [Static (7)] [Interference] │  <- Filter pills
├──────────────────────────────────────────────────────┤
│  ┌ Copy  chat stream fatal  ×4   MAYDAY ──────────┐ │  <- Grouped card
│  │ 2h ago – 45m ago · 3 users                     │ │
│  │ error: AbortError...                            │ │
│  │ ▸ Show all 4 signals                           │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌ Copy  slow stream              STATIC ──────────┐ │  <- Single card
│  │ 1h ago · anon-83a2 · /chat                     │ │
│  │ latency: 9200 · conversationId: abc-123...     │ │
│  └─────────────────────────────────────────────────┘ │
│                  [Load more]                         │
└──────────────────────────────────────────────────────┘
```

### Features

- **Grouping**: Signals with same event name collapse into one card. Count badge (×N), time range, unique user count. Expandable sub-cards.
- **Single copy**: Copy icon per card — copies full forensic text (event, time, user, page, all meta keys).
- **Group copy**: On grouped cards, copies all instances with numbered headers.
- **Batch export**: Download button exports filtered signals as JSON file + copies to clipboard. Paste into any chat for batch analysis.
- **MAYDAY badge**: Red dot on Radio tab when unseen error signals exist. Checks every 60s. Clears on visit. Uses `localStorage:fulkit-radio-last-seen`.
- **Auto-refresh**: Signal feed refreshes every 30s. MAYDAY check every 60s.
- **Cursor pagination**: "Load more" button for large signal sets.

### Severity mapping

| Severity | Radio name | Color | Use |
|----------|-----------|-------|-----|
| `error` | Mayday | red (`--color-error`) | Data loss, broken state, crashes |
| `warning` | Static | amber (`--color-warning`) | Degraded but functional |
| `info` | Interference | muted grey | Frustration, behavior, low-priority |

---

## Knobs (Beta Tuning)

These are the levers to adjust signal sensitivity. All live in `lib/signal.js` inside `SignalCollector`.

| Knob | Current setting | Where | How to dial down |
|------|----------------|-------|-----------------|
| **Rage click threshold** | 3 clicks in 2s on same element | `rageRef.current.length >= 3` / `now - t < 2000` | Raise to 5 clicks, or restrict to `isDisabled` only (revert to pre-beta) |
| **Rage click scope** | Any element (enabled or disabled) | `onClick` handler — no `isDisabled` gate | Add back `if (!isDisabled) { reset; return; }` to only fire on disabled |
| **Long task threshold** | >500ms | `entry.duration > 500` | Raise to 1000ms or remove observer entirely |
| **Tab bounce window** | <10s | `timeOnPage < 10000` | Lower to 5s (stricter) or raise to 15s (looser) |
| **Slow page load** | >3s domInteractive | `navEntry.domInteractive > 3000` | Raise to 5000 for slower expected loads |
| **Quick reload window** | <10s between reloads | `elapsed < 10000` | Lower to 5s to only catch frustrated refreshes |
| **MAYDAY poll interval** | 60s | `setInterval(checkMayday, 60000)` in `owner/page.js` | Raise to 120s or 300s to reduce API calls |
| **Feed auto-refresh** | 30s | `setInterval(..., 30000)` in RadioTab | Raise to 60s for less frequent updates |

### Turning down the volume (post-beta)

When real traffic stabilizes and you know what's noise vs. signal:

1. **Rage clicks**: Revert to disabled-only (`isDisabled` gate). Most valuable long-term for catching broken buttons.
2. **Tab bounce**: Consider removing — high volume, low actionability once you know your page flow works.
3. **Long tasks**: Raise to 1000ms. Sub-second jank is common and usually harmless.
4. **Slow page load**: Remove once you've confirmed baseline performance is acceptable.
5. **Keep forever**: `js_error`, `promise_rejection`, `chat_stream_fatal`, `message_save_failed`, `token_refresh_failed` — these are always actionable.

---

## Files

| File | Role |
|------|------|
| `lib/signal.js` | Client emission: `useSignal()`, `emitSignal()`, `SignalCollector`, `getClientContext()` |
| `lib/signal-server.js` | Server emission: `emitServerSignal()` |
| `app/api/owner/signals/route.js` | Owner-only API: severity filtering, cursor pagination, user label enrichment |
| `app/owner/page.js` | RadioTab UI: KPI tiles, grouping, copy, export, MAYDAY badge |
| `app/layout.js` | Mounts `<SignalCollector />` inside providers |

---

## Copy-paste workflow

1. Open `/owner/radio`
2. See a signal (or group) worth investigating
3. Click the Copy icon — full forensic context is on your clipboard
4. Paste into Claude Code or in-app Owner chat
5. Diagnose and fix without reproducing

For batch analysis: click Export, paste the JSON, ask "what patterns do you see?"

---

## Status

- **Phase 1** (complete): 17 signal types, Radio UI, single copy, auto-refresh
- **Phase 2** (complete): Forensic enrichment (browser fingerprint, conversation context, stack traces, silent failure signals)
- **Phase 3** (complete): Batch export, signal grouping, MAYDAY badge, beta knobs (rage click expansion, long tasks, tab bounce, slow page load)
- **Current mode**: Beta — all knobs turned up. Dial down after real traffic patterns emerge.
