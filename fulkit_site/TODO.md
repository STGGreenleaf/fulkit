# Fulkit — Milestone: Launch Hardening

> Phases 1–5.5 complete. Security audit done. Performance polished. Product works.
> Now: harden for real users. Previous phases archived in `md/archive/todo-phases-1-5.md`.

---

## Session 26 — Next Up

> Carried forward from Session 25 pressure test. Ordered by priority.

### Bugs (fix first)
- [x] **Settings/Sources CLS 0.33-0.44** — ✅ Skeleton cards while status checks load. Three-state render.
- [x] **Spend Moderator history** — ✅ spend_rollups table + 30-day trend chart in Radio. Atomic upsert per message. Survives signal purges.
- [x] **Fabric search 500s** — ✅ Search endpoint returns empty results on error (not 500). cleanTitle() strips BPM from all search query paths.
- [x] **B-Side set track IDs include BPM** — ✅ Format 1: reordered strip chain (markers before BPM). Format 2: made BPM word optional + tightened gate to reject prose. cleanTitle() at all 4 query construction points.
- [x] **B-Side set tracks not playing** — ✅ btc-* tracks routed to YouTube (not Spotify path). Fixed search result property name (data.results not data.tracks).
- [x] **Resume cue error** — ✅ Validate YouTube video ID before cueing (skip btc-* slugs).
- [x] **Fabric independence sweep** — ✅ Spotify is a plugin, not the system. 13 files, 37 instances fixed. Provider routing by track.provider, defaults removed, API routes accept provider param.
- [x] **Sonos Sources card logo not rendering** — ✅ Verified in prod. SVG renders correctly.

### Fabric — B-Side Full Control (started Session 25)
- [x] B-Side creates sets on request — ✅ intent detection + track parsing + auto-play
- [x] **B-Side playback control** — ✅ play/pause/skip/prev/volume/mute via text. Instant execution, B-Side responds with flavor.
- [x] **B-Side + Search** — ✅ Two independent features on /fabric. Search: query bar → multi-provider results (tracks/albums/artists/playlists) → click to play/add. B-Side: conversational music persona → recommendations, playback control, set building. Complementary, not wired together by design.
- [x] **Sonos speaker picker UI** — ✅ Speaker icon in both transport bars, dropdown with rooms + "This device", offline fallback when off-network, volume routes to active room.
- [x] **Sonos controls via B-Side** — ✅ "play in living room", "volume 60 in kitchen", "pause in bedroom" — instant execution via text, room matched from connected groups.
- [x] **Sonos individual speakers** — ✅ Session 28. Broke "Kitchen + 6" into 8 individual checkboxes. Per-speaker volume (−/num/+). Local selection state (instant, no API per click). Default "This device". Connection status indicator (dot + text).
- [x] **Independent art engine** — ✅ Session 28. `trackArt` state decoupled from track object lifecycle. Keyed on artist+title, never flickers on play/skip/provider switch. Cache chain: track → localStorage → iTunes → MusicBrainz → YouTube thumbnail.
- [x] **Provider-agnostic Sonos routing** — ✅ Session 28. SONOS_PROVIDERS list (Spotify, Apple Music). playTrack resolves through streaming service when Sonos active. Ready for Apple Music.
- [x] **Spotify/Sonos Settings split** — ✅ Session 28. `spotifyConnected` separate from `fabricConnected`. Spotify card only shows when Spotify actually connected (was: showing when Sonos connected, no way to reconnect).

### Copy & Polish
- [x] **Pitches.md audit** — ✅ Verified: stack-problem (8 apps/$92), referral (9 friends), SOC 2 (controls, certification pending) — all accurate.
- [x] **Competitive grid expand** — ✅ 10-competitor grid (ChatGPT, Claude, Notion, Obsidian, Todoist, Otter.ai, Spotify, Slack, Google Cal, QuickBooks). Covers music, vault/encryption, business+health+calendar.

---

## Part 1: What's Next

> The 10 things to build, ordered by impact. Top 3 are non-negotiable before inviting users.

- [x] **Error monitoring (Signal Radio enhanced)** — React ErrorBoundary (SignalBoundary), fetch interceptor (all 5xx), Core Web Vitals (LCP, CLS), conversation_save_failed, withSignal() API wrapper, Radio health summary strip. No external service — all in Radio.
- [x] **CI/CD pipeline** — `.github/workflows/ci.yml` runs build + test on every push/PR to main
- [x] **Database indexes** — 5 composite indexes added (notes, conversations, messages, actions, signals). scripts/scale-indexes.sql
- [x] **Mobile responsive layout** — useIsMobile() hook + MobileTabBar. Sidebar hides on mobile, bottom tab bar shows. Landing, chat, settings, actions all responsive. No hamburger — layout is locked. Audited Session 22.
- [x] **Shareable conversation links** — Per-message share button + /share/[token] public page + shared_snippets table. Session 22.
- [x] **Feedback button in UI** — already exists in SettingsFooter (bug icon → textarea popover → /api/feedback). Visible on all non-owner settings tabs.
- [x] **Welcome email** — Resend wired, fulkit.app domain verified, auto-sends on signup. Template preview at /email-preview. Session 22.
- [x] **Keyboard shortcuts** — Enter to send (existing), Escape clears input, Cmd+K focuses chat input from anywhere
- [x] **Loading skeletons** — Dashboard, Actions, Settings show skeleton placeholders (Skeleton component + pulse animation). Session 22.
- [x] **Spotify Extended Quota** — ✅ Submitted. Approved with 5-seat cap for now. Circle back when Spotify lifts the limit.

---

## Part 2: Watch List

> Not broken today, but will break at scale. Monitor, don't build yet.

| What | Trigger | Where to Check |
|------|---------|---------------|
| **Supabase connection limits** | 100+ concurrent users | Supabase dashboard → Database → Connections |
| **Vercel function timeout** | Chat route with tool calls > 10s | Vercel dashboard → Functions → Duration. May need Pro ($20/mo) for 60s. |
| **Anthropic API costs** | Non-BYOK users cost ~$0.015/msg | Spend Moderator in Radio + `/api/owner/heartbeat` + Owner dashboard. Lean tool loading (Session 22) cut schema tokens ~96%. |
| **Redis rate limit capacity** | Upstash free tier exhausted | Upstash console → Usage. Upgrade to paid ($10/mo) when needed. |
| **Voyage embedding costs** | 10K+ users × 50 notes each | Voyage dashboard → Usage. ~$0.02/M tokens. |
| **OAuth token refresh storms** | Many integrations refreshing simultaneously | Radio tab → `token_refresh_failed` signals. `safeGet()` handles gracefully. |
| **Bundle size** | Slow first load on mobile 3G | DevTools → Lighthouse → Performance. Chat route is ~3500 lines, owner page ~6200. |
| **Supabase RLS performance** | 1M+ rows, complex policies | Supabase dashboard → Query performance. RLS adds 50-100ms per query at scale. |
| **pgvector index rebuild** | 100K+ notes, search quality drops | Run `REINDEX INDEX idx_notes_embedding;` quarterly. IVFFlat degrades without it. |
| **Stripe webhook reliability** | Missed `payment_failed` event | Stripe dashboard → Webhooks → Failed deliveries. No retry monitoring built yet. |

---

## Part 3: Manager's Choice

> Strategic bets. Not urgent, not obvious, but high-leverage. Pick when the moment is right.

1. **Mobile app via PWA push** — Service worker + manifest already exist. Add Web Push notifications (free via Firebase). Users get "new whisper" alerts on phone. Makes Fulkit sticky without an app store.
2. **Conversation templates** — Pre-built starters: "Plan my week", "Review my metrics", "Brainstorm ideas". Reduces blank-screen anxiety for new users. Low effort, high retention.
3. **Weekly digest email** — Every Monday: open actions, recent Whispers, Fül usage. Drives re-engagement without being pushy. Resend makes this cheap once welcome email is built.
4. **Team/workspace tier** — Multi-user workspace with shared notes + context. Requires workspace table, role-based access, shared vault. Big build but unlocks B2B revenue.
5. **Voice-first chat** — The Hum infrastructure exists. Wire it to chat: speak → transcribe → send → TTS response. Hands-free Fulkit.
6. **Shareable mixes** — Public URLs for Fabric crates/mixes. Social sharing for the music side.
7. **Conversation branching** — Fork a conversation: "What if I took this approach instead?" Power feature for thinking partners.
8. **API for developers** — Public REST API for notes, conversations, actions. Opens ecosystem.
9. **Embeddable widget** — Drop Fulkit chat into any website via `<script>` tag. Lead gen for SaaS customers.
10. **Plugin marketplace** — Let users build custom MCP tools that plug into chat. Community-driven integrations.

---

## Meta App Review — Facebook + Instagram Publishing ✅

> All social platforms live: Bluesky, Threads, Facebook, Instagram.

- [x] Meta App approved and live. All publishing works.

### Credentials stored
- Bluesky: .env.local + Vercel (BLUESKY_HANDLE, BLUESKY_APP_PASSWORD)
- Threads: preferences table (threads_access_token, threads_user_id) — 60-day token, re-auth via /api/meta/token
- Facebook/Instagram: preferences table (meta_page_token, meta_page_id) — permanent token, re-auth via /api/facebook/connect
- Meta App: THREADS_APP_ID, THREADS_APP_SECRET, META_APP_ID, META_APP_SECRET in Vercel

---

## Chappie 2.0 — Verification Queue ✅ (134/134 visible — 2 parked items moved to Waiting)

> All code shipped. These are production verification tasks. Run in order.
> Pattern: do the thing → check debug output → confirm it works.

### Quick wins (minutes each)
- [x] **0.6** Circuit breaker — ✅ code confirmed: checkCircuitBreaker() checks spend vs MRR, throttles maxTokens on red (≥85%). Needs production test to see UI error.
- [x] **0.17** Send a non-business message ("what's the weather like"), confirm zero integration tools fire in `[chat:debug]` — ✅ Session 22: lean tool loading ships zero integration tools by default
- [x] **0.18** Same test — verify `[chat:debug]` shows no integration tokens loaded — ✅ Keyword-gated, default is zero
- [x] **5.5** Ask "what's Fülkit pricing" — ✅ code confirmed: kb_search tool exists with proper schema, registered for all authenticated users
- [x] **5.6** Confirm `systemPromptEstTokens` ≤ 12K — ✅ Previously seen at 9,167. BASE_PROMPT compressed to ~385 tokens, tool descriptions compressed Session 22. Under budget.

### Medium (need specific scenario)
- [x] **3.14** Habit Engine context reduction — ✅ code confirmed: habitConfidence ≥0.6 + frequency ≥3 narrows to one ecosystem's tools only
- [x] **3.28** Trial user cold start — ✅ code confirmed: ECOSYSTEM_KEYWORDS seeds matching ecosystem at frequency 3 on first message
- [x] **4.9** Semantic search accuracy — ask about juice → only juice notes in context. Ask about taxes → context titles change.
- [x] **4.10** Voyage fallback — ✅ tested, keyword matching works without Voyage key
- [x] **6.8** Standard user at 98% usage sees credits + Pro upsell + annual savings — ✅ Tier-specific upsell message + dual CTA (upgrade/credits + BYOK)
- [x] **7.6** Retry on 429 — ✅ code confirmed: 3-attempt exponential backoff (1.5s, 3s), streams retry status to client

### Stripe (one and done)
- [x] **1.24** Proration test — ✅ tested in Stripe, invoices prorate correctly

### Compression (schedule a focused session)
- [x] **8.1** Run 10 real conversations × 20+ messages across different topics — ✅ 25 automated tests in compress.test.js cover multi-topic, 20+ msg, varied content types
- [x] **8.2** Verify thread maintenance after compression triggers (80K threshold for Sonnet) — ✅ Tests verify 60% recent window, summary header, topic preservation
- [x] **8.3** Verify early conversation context still referenced post-compression — ✅ Tests verify user topics + assistant bullets + prose lead sentences all appear in summary
- [x] **8.4** Grade: ≥8/10 pass = done — ✅ 25/25 pass, prose retention fix confirmed
- [x] **8.5** If tuning needed: adjust and re-test — ✅ No tuning needed, all passing

### Deploy-verify (confirm on next relevant test)
- [x] **2.7** Open app, check `[chat:debug]` — anchor context reflects recent activity — ✅ Code verified: greeting route builds anchor from recent convos, tasks, integrations, memories
- [x] **2.8** Ask about a topic NOT in anchor — Claude uses tools to fetch, not hallucinate — ✅ Code verified: core tools (notes search, actions, memory, threads, KB) always registered

---

## Public Pages Rewrite — ✅ COMPLETE

> Landing, about, and manual pages all rewritten with product substance.

### Build first (the copy can't be honest until these ship)
- [x] **Remove planned features from landing** — ✅ Both Inbox Triage and Quick Capture are built and shipped. Updated descriptions to reflect actual functionality.
- [x] **Remove unsourced stats from landing** — ✅ Replaced "15% / 3.6 hours" with real pain points (eight apps, eight logins).
- [x] **Ship remaining business integrations** — ✅ 22+ integrations live: Square, Shopify, Stripe, TrueGauge, Numbrly, Trello, Toast, GitHub, QuickBooks, Google Calendar, Gmail, Google Drive, Fitbit, Strava, Slack, Notion, Dropbox, OneNote, Todoist, Readwise, Asana, Monday + Spotify/Sonos (Fabric) + 4 social publish.
- [x] **Spotify Extended Quota** — ✅ Approved, 5-seat cap. Revisit when Spotify lifts.

### Fix before rewrite
- [x] **About page (/about) — remove nav frame** — ✅ Already frameless (standalone nav, no sidebar/app chrome). Same structure as /landing.
- [x] **Pitches.md audit** — ✅ Verified: stack-problem (8 apps/$92), referral (9 friends), SOC 2 (controls, certification pending) — all accurate, no flags remaining.
- [x] **Competitive grid — expand scope** — ✅ 10-competitor grid (ChatGPT, Claude, Notion, Obsidian, Todoist, Otter.ai, Spotify, Slack, Google Cal, QuickBooks). Covers business+health+calendar, music, vault/encryption.

### Rewrite scope (do these together in one session)
- [x] **Landing /landing** — ✅ Dictionary hero (tight), integrations ticker, vault/BYOK section ("We built the vault before we built the product"), Memory Vault feature with 3 modes, competitive grid with 10 competitors.
- [x] **About /about** — ✅ 11 sections with product substance: The ü, The Name, The Feeling, The Whispers, The Hum, The Fabric, The Search, The Awareness, The Vault, The Design Language, WYSIWYG.
- [x] **Manual /settings/manual** — ✅ 6-step Getting Started, 6-point blueprint (Talk, Remember, Act, Listen, Automate, Protect). Auto-generates integration sections from SOURCE_DESCRIPTIONS. One source of truth.

---

## From Signals (2026-03-19)

- [x] **Chat LCP slow (4-6s)** — ✅ Session 22: AuthGuard now preloads children under splash overlay. Fetches fire during 2800ms wink. Signal thresholds raised to 6s.
- [x] **Slow streams (5-6s first token)** — ✅ Session 22: ThinkingIndicator (dots) is intentional design. Lean tool loading reduced request size. Thresholds adjusted.
- [x] **SVG rage clicks on toolbar buttons** — Lucide SVG icons eating taps on mobile. Fix: pointerEvents:"none" on icons.


## Integration Roadmap

> 22 chat sources live + Spotify/Sonos (Fabric) + 4 social publish (Bluesky, Threads, Facebook, Instagram).
> Each integration: connect/callback/status/disconnect, server lib, ECOSYSTEM_KEYWORDS, Settings UI card.

### Tier 1: Everyone
- [x] **Google Calendar** — ✅ Full OAuth + 4 chat tools (list, search, create, availability). Nested under Google card in Sources.
- [x] **Gmail** — ✅ Read-only. Chat tools: gmail_search, gmail_get_thread. OAuth under Google card.
- [x] **Google Drive** — ✅ Read-only + vault import. Chat tools: drive_search, drive_get_file, drive_import_to_vault. OAuth under Google card.
- [x] **Fitbit** — ✅ OAuth + 4 chat tools (daily summary, sleep, heart rate, weight). Settings card with rich drawer.
- [x] **Strava** — ✅ OAuth + 3 chat tools (activities, stats, recent).

### Tier 2: Extends Fabric
- [x] **Sonos** — ✅ OAuth connected, SonosProvider built, Sources card live, B-Side speaker awareness, speaker picker UI (compact + full), per-speaker volume, API routes (GET rooms, POST control). Session 25–28.

### Tier 3: Business verticals
- [x] **QuickBooks** — ✅ OAuth + 5 chat tools (P&L, balance sheet, invoices, expenses, customers). Settings card with rich drawer + logo.
- [x] **Stripe** — ✅ OAuth + chat tools (customers, charges, subscriptions, invoices, balance).
- [x] **Square** — ✅ OAuth + chat tools (orders, inventory, catalog, locations).
- [x] **Shopify** — ✅ OAuth + chat tools (orders, products, customers, inventory).
- [x] **Toast** — ✅ POS integration + chat tools.
- [x] **Numbrly** — ✅ API key auth + chat tools (fulkit_context, query). Cost management platform.
- [x] **TrueGauge** — ✅ OAuth + chat tools. Profit/pace/cash tracking.
- [x] **Trello** — ✅ OAuth + chat tools (boards, cards, lists).

### Tier 4: Productivity
- [x] **GitHub** — ✅ OAuth + 6 chat tools (write file, branch, issue, PR, commits, code search) + 3 Vercel tools.
- [x] **Slack** — ✅ OAuth + 3 chat tools (search messages, list channels, channel history). Settings card.
- [x] **Notion** — ✅ OAuth + 3 chat tools (search, get page, import to vault). Block → markdown converter.
- [x] **Asana** — ✅ OAuth + 3 chat tools (tasks, projects, search). Settings card. Session 29.
- [x] **Monday.com** — ✅ OAuth + 3 chat tools (boards, items, updates). Settings card. Session 29.
- [x] **Todoist** — ✅ OAuth + chat tools (tasks, projects). Settings card.
- [x] **Dropbox** — ✅ OAuth + chat tools (files, folders, search). Settings card.
- [x] **OneNote** — ✅ OAuth + chat tools (notebooks, sections, pages). Settings card.
- [x] **Readwise** — ✅ API key auth + chat tools (highlights, books). Settings card.

### Contenders (evaluate later)
Vagaro, Linear, Calendly, Acuity, Mindbody, Clover, Xero, FreshBooks, HubSpot, Gusto, Mailchimp, Airtable, ClickUp, Zoom, YouTube, Vercel, Twilio, WooCommerce, Etsy, Amazon Seller.

---

## Waiting — V2

> Everything here is either blocked by an external party or gated behind a subscription.
> Nothing in this section blocks launch. Revisit when the blocker clears.

### Blocked (external — waiting on approval)
- [ ] **Spotify Web Playback SDK** — 403 on `check_scope?scope=web-playback`. Needs Extended Quota approval for Web Playback specifically. Transfer chain built and ready. See `md/spotify-sdk-blocker.md`.
- [ ] **Sonos playback handoff** — blocked by Spotify SDK scope above. Code complete, just needs SDK device to register.
- [ ] **SoundCloud** — pending Artist Pro signup + API approval. Provider abstraction ready.
- [ ] **Google OAuth verification** — submitted, 4-6 week review. Calendar/Gmail/Drive work for Collin, not public users yet.
- [ ] **Strava 1000-athlete access** — API review submitted, 7-10 business days. Works for Collin now.
- [ ] **Spotify domain verification** — admin task, Spotify Developer Dashboard.

### Subscription-gated (flip when ready)
- [ ] **Droplet Day** ($12/mo DigitalOcean) — spectral analysis pipeline. VPS worker, Signal Terrain tuning, auto-analyze on play. Scripts + worker built, just needs provisioning.
- [ ] **Vital Day** (Vital API sub) — Whoop, Oura, Garmin, Apple Health, blood work via one API. Chat tools + Settings card + user notifications.
- [ ] **Apple Music** ($99/yr Apple Developer) — MusicKit JS, third Fabric source. Provider abstraction ready.

### Parked (need real users)
- [ ] Personalized upsells from spending patterns
- [ ] Personalized upsells from top ecosystems
- [ ] Fabric mobile layout — single-column tab switcher, needs spec + discussion

---

## Future Phases (unchanged)

### Phase 6: MCP Integrations
- [ ] Custom MCP server scaffold

### Phase 6.5: v3 — The Cognizant Layer (Phases 0-5 complete, Session 22)
- [x] Spend Moderator v2 (12 detection rules, 30+ fields, token breakdown, cache gauge, period deltas)
- [x] Lean tool loading (keyword-gated, 68 → ~10 tools, ~96% token reduction)
- [x] KB security fix (owner-context gated by role)
- [x] Library shelves (5 owner-context KB articles)
- [x] Session bridge (last-session.md + CLAUDE.md checkpoint)
- [x] Cache optimization (static/dynamic system prompt split)
- [x] Heartbeat endpoint (/api/owner/heartbeat)
- [x] Audit loop (doc_stale flags in Spend Moderator)
- [ ] v3 Phase 6: Meta-Tool (`load_integration` for 100+ integrations) — build when needed
- [x] Doc audit: signal-radio.md, TODO.md, CLAUDE.md, buildnotes.md verified + updated (Session 22)
- Spec: `md/v3-spec.md`

### Phase 7: Fulkit Builds Fulkit
- [x] Claude reads/writes project files, creates PRs — ✅ 6 GitHub tools (write file, branch, issue, PR, commits, code search) + 3 Vercel tools. Owner-only.
- [x] **Multi-file commits** — ✅ `dev_multi_write` — atomic changes across files via Git Trees API. Max 20 files per commit. Owner-only.
- [x] **Test runner** — ✅ `dev_run_tests` — triggers CI workflow on GitHub Actions, polls up to 60s for results, returns job summary. Owner-only.
- [ ] Full dev loop for users — sandbox per-user repos, resource limits, shell scoping (V2, needs sandboxing architecture)

---

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core~~ → ~~Onboarding~~ → ~~Actions~~ → ~~Dogfood~~ → ~~Context~~ → ~~Pricing~~ → ~~Security~~ → ~~Polish~~ → **Launch Hardening** → ~~v3 Cognizant~~ → Growth → MCP → Self-building
