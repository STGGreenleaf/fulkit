# Last Session

**Date**: 2026-03-26 → 2026-03-27 (Session 23, marathon)
**Scope**: Integrations blitz, invisible intelligence, Sources UX, signal fixes, pitches

**Shipped**:
- Inbox Triage: drop any file → AI reads → triage card → file/discuss/extract/connect
- Google Suite: Calendar (4 tools) + Gmail (2 tools) + Drive (3 tools), unified under one card
- Unified ThreadCalendar: Google Calendar + Trello events on grid, drag-to-folder with "all like it" mapping
- 10 new OAuth integrations: Fitbit, QuickBooks, Obsidian (folder picker), Notion, Dropbox, Slack, OneNote, Todoist, Readwise (API key)
- 12 invisible intelligence APIs: weather, sun, food (USDA+OFF), books, currency, dictionary, geocoding (Nominatim+cache), Wikipedia, NASA, air quality, Wolfram, news
- Location intelligence: memory → IP fallback → Nominatim geocoding with cache
- Sources UX: search bar, waitlist tickets, suggestion input, 2-column examples on all cards, verification warnings
- Manual redesign: "The manual is the chat" + Try Asking (32 prompts) + Quick Reference with all hotkeys
- Global hotkeys: Cmd+N (chat), Cmd+H (home), Cmd+J (threads), Cmd+Shift+C (side chat window)
- Landing page: unsourced stats removed, shipped features updated
- Signal fixes: world tools keyword-gated (default zero), Sources CLS fixed, whispers retry, tool waste eliminated
- Owner Notes: full integration status, invisible intelligence inventory, session features, pending list
- Pitches: 25 new across Invisible Intelligence, Integrations, Health, Calendar + delete button
- All dev portals registered + keyed: Google, QuickBooks, Notion, Dropbox, Slack, OneNote, Todoist, Fitbit, USDA, WAQI, Wolfram, Currents

**Integration count**: 19 user-facing + 12 invisible = 31 total

**Carry forward — NEXT SESSION**:
1. **Chappie knowledge freshness** — KB Library articles are stale. Update the 5 shelf articles with current integrations, tools, and capabilities. Add a "what's new" section to system prompt so Chappie knows what it can do. Consider a knowledge loop that auto-checks staleness.
2. **Signal Terrain 7-wave rewrite** — rendering only, data pipeline ready. Reference image on desktop.
3. **Clean up /recover and /api/recover-sets** — temporary tools, remove when stable
4. **Compression testing** (8.1-8.5) — run 10 conversations, verify thread maintenance
5. **Card-worthy integrations**: Pocket, Zotero, Wakatime (from invisible spec)
6. **Sonos, Linear, Vagaro** — pending API access/accounts
7. **OrbVisualizer performance**, worker throttling, LoadingMark animation

**Known issues**:
- Google verification pending (4-6 weeks) — users see "unverified app" warning
- Dropbox production review pending (auto after 50 users)
- Chappie doesn't know about its own new capabilities until keyword-matched tools load
