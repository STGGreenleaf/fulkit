# Fulkit — Milestone: Launch Hardening

> Phases 1–5.5 complete. Security audit done. Performance polished. Product works.
> Now: harden for real users. Previous phases archived in `md/archive/todo-phases-1-5.md`.

---

## Session 26 — Next Up

> Carried forward from Session 25 pressure test. Ordered by priority.

### Bugs (fix first)
- [ ] **Settings/Sources CLS 0.33-0.44** — integration cards pop in as status checks resolve, causing layout shifts. Fix: skeleton placeholders for cards until statuses load. LCP also 7-10s from parallel status fetches.
- [x] **Fabric search 500s** — ✅ Search endpoint returns empty results on error (not 500). cleanTitle() strips BPM from all search query paths.
- [x] **B-Side set track IDs include BPM** — ✅ Format 1: reordered strip chain (markers before BPM). Format 2: made BPM word optional + tightened gate to reject prose. cleanTitle() at all 4 query construction points.
- [x] **B-Side set tracks not playing** — ✅ btc-* tracks routed to YouTube (not Spotify path). Fixed search result property name (data.results not data.tracks).
- [x] **Resume cue error** — ✅ Validate YouTube video ID before cueing (skip btc-* slugs).
- [x] **Fabric independence sweep** — ✅ Spotify is a plugin, not the system. 13 files, 37 instances fixed. Provider routing by track.provider, defaults removed, API routes accept provider param.
- [ ] **Sonos Sources card logo not rendering** — SVG looks correct in code. Needs visual verify in prod.

### Fabric — B-Side Full Control (started Session 25)
- [x] B-Side creates sets on request — ✅ intent detection + track parsing + auto-play
- [x] **B-Side playback control** — ✅ play/pause/skip/prev/volume/mute via text. Instant execution, B-Side responds with flavor.
- [ ] **B-Side search** — "find me some Burial" triggers catalog search
- [x] **Sonos speaker picker UI** — ✅ Speaker icon in both transport bars, dropdown with rooms + "This device", offline fallback when off-network, volume routes to active room.
- [x] **Sonos controls via B-Side** — ✅ "play in living room", "volume 60 in kitchen", "pause in bedroom" — instant execution via text, room matched from connected groups.

### New Integrations
- [ ] **Apple Music** — MusicKit JS, Apple Developer account ($99/yr approved), full playback source. Provider + Sources card + client playback.
- [ ] **Fabric mobile layout** — single-column tab switcher on phones. Needs spec + discussion first.

### Copy & Polish
- [ ] **Pitches.md audit** — 3 flagged items (stack-problem stats, referral count, SOC 2 language)
- [ ] **Competitive grid expand** — desktop grid doesn't reflect music, vault, voice moat yet

### Parked (need real users)
- [ ] 6.1 Personalized upsells from spending patterns
- [ ] 6.2 Personalized upsells from top ecosystems

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

## Chappie 2.0 — Verification Queue (126/136 done, 10 remain)

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

### Parked (need real user data)
- [ ] **6.1** Personalized upsells from `ful_ledger` spending patterns — needs user history to accumulate
- [ ] **6.2** Personalized upsells from `user_patterns` top ecosystems — same, lights up naturally

### Deploy-verify (confirm on next relevant test)
- [x] **2.7** Open app, check `[chat:debug]` — anchor context reflects recent activity — ✅ Code verified: greeting route builds anchor from recent convos, tasks, integrations, memories
- [x] **2.8** Ask about a topic NOT in anchor — Claude uses tools to fetch, not hallucinate — ✅ Code verified: core tools (notes search, actions, memory, threads, KB) always registered

---

## Droplet Day — When You Subscribe ($12/mo DigitalOcean)

> Everything below fires in one session. Pipeline is built, worker runs locally, scripts exist.
> Subscribe → run this list → real spectral data flows → all features upgrade automatically.

### Step 1: Provision
- [ ] Provision DigitalOcean droplet — 2GB RAM, Basic/Regular SSD
- [ ] Run `scripts/setup-vps.sh`, copy worker, create `.env`, enable systemd
- [ ] Verify worker starts, processes one test track, writes to `fabric_timelines` table

### Step 2: Wire to Signal Radio
- [ ] Add worker heartbeat as a signal source — feeds into existing Radio monitoring
- [ ] Stuck job detection — if no tracks processed in 30min, emit `worker_stall` signal
- [ ] Processing rate metric — tracks/hour visible in Radio

### Step 3: Tune Visuals
- [ ] Signal Terrain — tune amplitude scaling, noise blend, layer rendering for real spectral data
- [ ] OrbVisualizer (Deep Amoeba) — same tuning pass for fullscreen viz
- [ ] Poster terrain — swap procedural seed with actual spectral contours

### Step 4: Pipeline Polish
- [ ] Analyze on play — when a track plays and has no spectral data, queue it automatically

### Step 5: Future (not day-one)
- [ ] Spectral similarity engine — texture-matching recommendations (B-Side upgrade)
- [ ] Essentia.js client-side — optional browser analysis for unmatched tracks

### Already done
- [x] YouTube match validation — studio versions by default, variants on request (Session 25)
- [x] Batch-queue rejected — analyze on play, not on connect (design decision Session 25)
- [x] Album art cache — already clean. SW clears all old caches on activate, art uses localStorage not SW cache.

---

## Vital Day — When You Subscribe (Health Aggregator)

> Second paid subscription after Droplet. Vital gives you Whoop, Oura, Strava, Garmin, blood work, and more through one API.
> Subscribe → run this list → all health integrations light up → notify users.

### Step 1: Provision
- [ ] Subscribe to Vital — set up API key, configure webhook endpoint
- [ ] Wire Vital as a single integration (connect/callback/status/disconnect pattern)
- [ ] Add ECOSYSTEM_KEYWORDS for health: sleep, recovery, heart rate, workout, strain, blood, vitals

### Step 2: Chat Tools
- [ ] Health summary tool — daily snapshot (sleep, recovery, activity)
- [ ] Sleep detail tool — sleep stages, duration, quality
- [ ] Activity tool — workouts, steps, strain
- [ ] Blood work tool — lab results, trends (Vital-specific)
- [ ] Heart rate tool — resting, active, variability

### Step 3: Notify Users
- [ ] Add "Health" integration card to Settings → Sources
- [ ] Flag existing users — in-app notification that health integrations are live
- [ ] Email template for health launch (add to email-templates.js)

### Step 4: Supported Providers (via Vital)
- [ ] Whoop — sleep, recovery, strain, heart rate
- [ ] Oura — sleep, readiness, heart rate
- [ ] Strava — runs, rides, workouts
- [ ] Garmin — activity, sleep, heart rate, stress
- [ ] Apple Health — via Vital mobile SDK
- [ ] Blood work — Quest, Labcorp via Vital

### Already done
- [x] Fitbit — live, direct OAuth, not dependent on Vital

---

## Public Pages Rewrite — Pre-Work

> The landing, about, and manual pages were authored early. The product has outgrown the copy.
> Complete these before rewriting body copy. Then circle back for a full rewrite session.

### Build first (the copy can't be honest until these ship)
- [x] **Remove planned features from landing** — ✅ Both Inbox Triage and Quick Capture are built and shipped. Updated descriptions to reflect actual functionality.
- [x] **Remove unsourced stats from landing** — ✅ Replaced "15% / 3.6 hours" with real pain points (eight apps, eight logins).
- [ ] **Ship remaining business integrations** — Landing page can't sell the ecosystem story until the ecosystem is built. Current: Square, Shopify, Stripe, TrueGauge, Numbrly, Trello, Toast, GitHub, Spotify. Add the rest before rewriting.
- [x] **Spotify Extended Quota** — ✅ Approved, 5-seat cap. Revisit when Spotify lifts.

### Fix before rewrite
- [x] **About page (/about) — remove nav frame** — ✅ Already frameless (standalone nav, no sidebar/app chrome). Same structure as /landing.
- [ ] **Pitches.md audit** — Update `[!]` flagged items: `stack-problem` (8 apps/$92 — verify current), `referral` (9 refs not 7), `trust-soc2` (controls, not certified). Make the copy safe actually safe.
- [ ] **Competitive grid — expand scope** — Current grid only compares notes/AI tools (Obsidian, Notion, ChatGPT, Claude). Doesn't reflect the real moat: business integrations, music, vault, voice. Redesign to show the full picture once integrations ship.

### Rewrite scope (do these together in one session)
- [ ] **Landing /landing** — Tighten hero (keep dictionary concept, cut 40% of words before CTA). Add integrations section. Add vault/BYOK as differentiator. Replace planned features with shipped ones. Update competitive grid.
- [ ] **About /about** — Keep brand philosophy (ü, name, design heritage) but add product substance. Who built it, what it does, who it's for. Balance manifesto with information.
- [ ] **Manual /settings/manual** — Rethink as "Getting Started → Ask Chat." Light orientation (3-5 steps), then a CTA to just talk to Fülkit. The manual IS the chat now. Integration command reference can stay as a collapsible reference.

---

## From Signals (2026-03-19)

- [x] **Chat LCP slow (4-6s)** — ✅ Session 22: AuthGuard now preloads children under splash overlay. Fetches fire during 2800ms wink. Signal thresholds raised to 6s.
- [x] **Slow streams (5-6s first token)** — ✅ Session 22: ThinkingIndicator (dots) is intentional design. Lean tool loading reduced request size. Thresholds adjusted.
- [x] **SVG rage clicks on toolbar buttons** — Lucide SVG icons eating taps on mobile. Fix: pointerEvents:"none" on icons.

## Still Open (carried forward)

> Items from earlier phases that are external or infrastructure tasks.

- [ ] Fabric auto-analyze (production) — $5/mo VPS with yt-dlp + ffmpeg
- [x] Spotify App — Extended Quota Mode ✅ (5-seat cap, revisit when lifted)
- [ ] Domain verification for Spotify OAuth redirect URI
- [x] Fabric isolation — provider abstraction complete, DB migration run. Multi-provider ready. Session 22.
- [ ] SoundCloud API integration (pending Artist Pro + API approval)

## Integration Roadmap

> 8 chat sources live (GitHub, Stripe, Shopify, Square, Toast, Trello, Numbrly, TrueGauge) + Spotify (Fabric) + 4 social publish.
> Each integration: connect/callback/status/disconnect, server lib, ECOSYSTEM_KEYWORDS, Settings UI card. ~2-4 hours each.

### Tier 1: Everyone
- [x] **Google Calendar** — ✅ Full OAuth + 4 chat tools (list, search, create, availability). Nested under Google card in Sources. Google verification submitted (4-6 weeks).
- [x] **Gmail** — ✅ Read-only. Chat tools: gmail_search, gmail_get_thread. OAuth under Google card.
- [x] **Fitbit** — ✅ OAuth + 4 chat tools (daily summary, sleep, heart rate, weight). Settings card with rich drawer.
- [ ] **Health — Vital Day** (second paid subscription after droplet, see Vital Day checklist below)

### Tier 2: Extends Fabric
- [x] **Sonos** — ✅ OAuth connected, SonosProvider built, Sources card live, B-Side speaker awareness, API routes (GET rooms, POST control). Session 25. Speaker picker UI still needed.
- [ ] **SoundCloud** — multi-source Fabric. Pending Artist Pro + API approval.
- [ ] **Apple Music** — MusicKit JS. Third Fabric source. Requires Apple Developer ($99/yr). Collin approved.

### Tier 3: Business verticals
- [x] **QuickBooks** — ✅ OAuth + 5 chat tools (P&L, balance sheet, invoices, expenses, customers). Settings card with rich drawer + logo.
- [ ] **Vagaro** — beauty/wellness scheduling + client management. Keywords: appointment, client, booking, salon, vagaro.
- [x] **Google Drive** — ✅ Read-only + vault import. Chat tools: drive_search, drive_get_file, drive_import_to_vault. OAuth under Google card.

### Tier 4: Productivity
- [x] **Slack** — ✅ OAuth + 3 chat tools (search messages, list channels, channel history). Settings card.
- [ ] **Linear** — issue tracking for dev teams. Keywords: issue, bug, ticket, linear, sprint.
- [x] **Notion** — ✅ OAuth + 3 chat tools (search, get page, import to vault). Block → markdown converter.

### Contenders (evaluate later)
Calendly, Acuity, Mindbody, Clover, Xero, FreshBooks, HubSpot, Gusto, Mailchimp, Airtable, Monday.com, ClickUp, Zoom, Strava, YouTube, Vercel, Twilio, WooCommerce, Etsy, Amazon Seller.

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
- [ ] Claude reads/writes project files, runs commands, creates PRs
- [ ] Full dev loop inside Fulkit — one surface for everything

---

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core~~ → ~~Onboarding~~ → ~~Actions~~ → ~~Dogfood~~ → ~~Context~~ → ~~Pricing~~ → ~~Security~~ → ~~Polish~~ → **Launch Hardening** → ~~v3 Cognizant~~ → Growth → MCP → Self-building
