# Fulkit — Dev Log

> Claude Code reads this at the start of every session.
> Newest entries at top. Completed items get archived monthly.

## Session 22 — 2026-03-21: Spend Moderator + Lean Tool Loading + v3 Cognizant Layer

### What shipped
- **Spend Moderator v1 → v2** — per-message cost logging (30+ fields), 12 detection rules (expensive_round, tool_waste, cache_miss, slow_response, unused_context, compression_heavy, system_prompt_bloat, opus_on_simple, multi_round_cost, integration_ghost, cache_efficiency_low, context_token_heavy), token breakdown table, cache efficiency gauge, cost attribution tiles, integration usage row, period-over-period comparison with green/red delta arrows
- **Lean tool loading** — keyword-gated via ECOSYSTEM_KEYWORDS (module scope). Default = zero integration tools. 68 → ~10 tools per message. ~96% schema token reduction. Habit Engine threshold lowered (0.9/freq10 → 0.6/freq3).
- **Radio improvements** — amber/red two-tier alert dots, clipboard-only export (no download prompt), drawer state persistence in localStorage
- **KB security fix** — executeKbSearch() now gates owner-context articles by profile.role === "owner"
- **v3 Library (Phase 1)** — 5 KB shelf articles stocked as owner-context: Architecture Map, Integration Registry, File-to-Problem Map, Spec Index, Recent Changes. Owner coverage hint updated.
- **Session bridge (Phase 2)** — last-session.md written every checkpoint. CLAUDE.md rule updated. Chat Fulkit reads via github_fetch_files.
- **Cache optimization (Phase 3)** — system prompt split into static BASE_PROMPT (cached, ephemeral) + dynamic content (uncached). Target 60-70% cache hit rate.
- **Heartbeat endpoint (Phase 4)** — /api/owner/heartbeat returns composite health pulse: cost trend, error count, cache efficiency, ghost integrations, stale docs, overall status.
- **Audit Loop (Phase 5)** — doc_stale flags fire when owner-context KB articles are 30+ days old. Surface in Spend Moderator alongside spend_flags.
- **Doc audit** — signal-radio.md, TODO.md, CLAUDE.md, buildnotes.md all verified and updated against current code.
- **v3 spec** — md/v3-spec.md: 8 cost laws, librarian principle, 6 pillars, 7 implementation phases, known issues, "does NOT" guardrails.

### Key decisions
- "Default is zero" — nothing loads unless the message signals it. Applies to tools AND knowledge.
- "A librarian, not a library" — don't carry every book, know where every book is.
- Never suggest disconnecting integrations — connect everything, lean loading handles cost.
- Compress before you ask, convert before you choke — push toward action (tasks, notes, plans), never nag about new threads.
- Rounds multiply cost, not conversation — make plumbing cheaper, don't reduce back-and-forth.

### Key files modified
- `app/api/chat/route.js` — spend_log enrichment (30+ fields), 12 detection rules, ECOSYSTEM_KEYWORDS (module scope), keyword-gated tool loading, cache split (static/dynamic), audit loop, KB role gate
- `app/api/owner/spend/route.js` — aggregation with cache efficiency, cost by model/seat, compression summary, integration usage, period comparison
- `app/api/owner/heartbeat/route.js` — new composite health endpoint
- `app/owner/page.js` — SpendModeratorSection (token breakdown, cache gauge, cost attribution, integration usage, deltas), amber dot, drawer persistence, SPEND_RULE_LABELS
- `scripts/seed-library-kb.mjs` — new, stocks 5 owner-context KB articles

### Open
- v3 Phase 6 (Meta-Tool for 100+ integrations) — build when keyword collisions become a problem
- Cache efficiency needs real-world measurement post-deploy

---

## Session — 2026-03-21: Interactive Forms + Bug Fixes + Continued Polish

### What shipped
- **Interactive forms in chat** — tables with blank columns become input fields. Fill numbers, one Submit. Works for inventory, price updates, any batch data.
- **FormStoreProvider** — multiple tables in one message share a single Submit button
- **sendMessage overrideText** — 4th arg for programmatic message sends (form submit)
- **Circuit breaker fix** — `admin is not defined` crash on every 2nd message. Root cause: `admin` never declared in main route handler scope. Fixed.
- **Auth network reconnect** — `online` event listener refreshes auth after WiFi drops
- **Chat LCP** — splash 2800ms (one wink), greeting preloads during splash, 800ms delay + 1.5s dots
- **Stripe proration** — plan switches now swap price instead of stacking subscriptions
- **History auto-select** — delete a conversation, next one auto-selects
- **Pinned messages survive deletion** — pins persist when conversation is deleted
- **Inventory prompt** — Chappie renders fillable tables for Juices + Shots only, excludes Harvest Moon, 10-Seasonal, Pressed Ginger 16oz

### Additional fixes (continued session)
- **Circuit breaker crash** — `admin is not defined` in main route handler. Was crashing every 2nd message. Fixed with single `const admin = getSupabaseAdmin()` at handler scope.
- **Vault read timeout** — added 5s AbortSignal to readFulkitNotes/readEncryptedNotes. Prevents context assembly hanging indefinitely.
- **Inventory preview eliminated** — form submit → push directly (preview=false). No more 3-step confirm flow that hit Vercel timeout.
- **GitHub context gated** — repo tree only included when conversation mentions code/github. Was eating a context slot on every message including inventory.
- **BASE_PROMPT compressed 68%** — 1,193 → 385 tokens. Same behavior, lean language.
- **User data removed from prompt** — inventory exclusions moved to Chappie memory. Prompt is fully user-agnostic.
- **Square negative counts** — confirmed API returns negatives correctly, display works.
- **Auth network reconnect** — `online` event listener refreshes auth after WiFi drops.

### Known issues (carry forward)
- Context assembly timeout on 2nd+ message — vault timeout fix deployed but still timing out occasionally. May be related to Supabase connection pool on longer sessions.
- Service worker caching old JS bundles — user hits stale deployments until SW unregistered

---

## Session — 2026-03-20 (full day): Nav polish + Smart Features + Social Publishing

**Scope:** Fixed nav system, built Smart Features suite, wired multi-platform social publishing.

### Nav & UX (morning)
- Fixed infinite render loop in ChatContent toolbar useEffect
- Established uniform layout: AppShell overflow:hidden, AuthGuard flex column, pages manage own scroll
- Fixed Tooltip width:100% spreading icons in compact mode
- Chat toolbar restored: Sandbox, Pins, History, New (4 buttons, 18px, useLayoutEffect)
- Standalone pages: /landing and /wtf bypass AppShell grid
- Icon hierarchy: sidebar 18px, toolbar 18px, tab icons 16px (bumped from 14), logo 22px
- Fülkit header text: 14px + 4px margin-top nudge for logo alignment
- Sidebar nav gap: 1px → 8px
- Actions: removed 640px maxWidth, full width like home
- Threads: toolbar reordered (Plus left, Search + View toggle right)
- Tooltips: always visible on all buttons, position="bottom" for pages (overflow:hidden fix)
- Chat greeting: 2s delay → 3s dots animation → message. ThinkingIndicator stripped to dots only.
- QuickCapture FAB bumped 50px up from bottom
- Auth: visibilitychange listener refreshes Supabase session on tab wake

### Smart Features (midday)
- **Smart Threads** (toggle) — auto-extract action items from 3+ turn conversations with guardrails
- **Auto-summarize** (baked in) — saves conversation summaries after 5+ messages
- **Auto-archive** (toggle) — done threads archive after 7 days
- **Conversation Continuity** — system prompt injects previous session summary when reopening old conversations
- **Auto-label** — write-back notes tagged with detected ecosystem (square, trello, etc.)
- **Smart Cleanup** — greeting mentions stale threads (30+ days unmoved)
- **Smart Reminders** — action items with dates get due_date set (tomorrow, next week, by Friday)
- **Smart Context** — vault note selection uses last 3 messages + minimum relevance threshold
- **Pattern Insights** — home dashboard shows top ecosystems by frequency
- **Weekly Digest** — cron route (Mondays 9am UTC), greeting references it Monday/Tuesday
- Settings > Account: Smart Features drawer with two toggles
- Deleted 424 garbage notes from threads (dev testing artifacts)

### Social Publishing (afternoon/evening)
- **Bluesky** — fully working. AT Protocol posting with image support.
- **Threads** — fully working. OAuth flow → long-lived token → stored in preferences.
- **Instagram** — code built, blocked by Meta App Review (needs pages_read_engagement approval)
- **Facebook** — code built, blocked by same App Review
- Owner > Socials tab reordered: Publish → Social Kit → Local App → Socials & Identity
- Copy URL button on social templates (solid style with "Copied!" feedback)
- Multi-platform Publish drawer: select platforms, single Publish button, per-platform results
- Footer: Bluesky butterfly icon (stroke) + Instagram icon
- Meta developer app: "Fülkit Social" created, Threads API + Manage Pages use cases

### Social publishing status (end of day)
- **Bluesky**: live, permanent credentials
- **Threads**: live, auto-refreshing token (perpetual)
- **Facebook**: live, permanent page token via OAuth
- **Instagram**: blocked — needs `instagram_basic` + `instagram_content_publish` which require Meta Business Verification → App Review. Code + Instagram Business Account ID (17841443522792602) stored and ready. Not a priority until launch.
- Meta app "Fülkit Social" published (live mode)
- Fülkit App Business Portfolio set up, Instagram + Facebook Page connected

### Other fixes
- Square inventory update: added missing `state: "IN_STOCK"`
- Chappie 2.0 verification: 0.3 + 0.4 confirmed (prompt caching works, $2.27 → $0.03/msg)

### Key files created
- `app/api/bluesky/post/route.js` — Bluesky AT Protocol posting
- `app/api/threads/post/route.js` — Threads API posting
- `app/api/instagram/post/route.js` — Instagram Graph API posting (pending review)
- `app/api/facebook/post/route.js` — Facebook Page posting (pending review)
- `app/api/facebook/connect/route.js` — Facebook OAuth start
- `app/api/facebook/callback/route.js` — Facebook OAuth callback
- `app/api/meta/token/route.js` — Threads OAuth start
- `app/api/meta/callback/route.js` — Threads OAuth callback
- `app/api/cron/weekly-digest/route.js` — Weekly digest cron

---

## Session — 2026-03-20 (late night): Nav & UX polish

**Scope:** Fix broken nav, establish uniform layout, polish chat greeting, add tooltips everywhere.

### What shipped:
- **Infinite render loop fix**: ChatContent toolbar useEffect had no deps → infinite re-render. Fixed with dep array + split cleanup.
- **AppShell layout**: Content wrapper set to `overflow: hidden` — pages manage own scroll. AuthGuard made flex column so children fill viewport.
- **Tooltip fix**: Removed `width: 100%` from Tooltip wrapper (was spreading tab icons across full width in compact mode).
- **Chat toolbar**: Restored 4 buttons (Sandbox, Pins, History, New) via `setToolbar` pattern with `useLayoutEffect` for instant render.
- **Standalone pages**: `/landing` and `/wtf` bypass AppShell grid even when authenticated.
- **Icon size hierarchy**: Sidebar nav = 18px, header toolbar = 18px, page tab icons = 16px (bumped from 14), LogoMark = 22px.
- **Fülkit header text**: Bumped to 14px + nudged down 4px to align with sidebar logo.
- **Sidebar spacing**: Nav button gap increased from 1px to 8px (`var(--space-2)`).
- **Actions page**: Removed 640px maxWidth cap, Add (+) icon bumped to 18px.
- **Threads page**: Toolbar reordered — Plus (add folder) left, Search + View toggle far right. Board `+` icons bumped to 16px + darkened.
- **Chat greeting**: 2s delay → 3s minimum dots animation → message appears. ThinkingIndicator stripped to dots-only (no "Connecting"/"Thinking" labels).
- **Tooltips everywhere**: All icon buttons now show dark pill tooltip on hover (not just compact mode). Page tooltips render below buttons to avoid `overflow: hidden` clipping.
- **QuickCapture FAB**: Bumped up 50px to clear chat input bar.

### Key files modified:
- `components/AppShell.js` — overflow:hidden, toolbar div always rendered, Fülkit text size/position
- `components/AuthGuard.js` — flex:1 + display:flex to fix layout chain
- `components/ChatContent.js` — toolbar via setToolbar, greeting delay, ThinkingIndicator simplified
- `components/Tooltip.js` — removed width:100%, added position prop (top/bottom)
- `components/Sidebar.js` — gap spacing, always-on tooltips
- `components/QuickCapture.js` — bottom position bump
- `components/ThreadBoard.js` — Plus icon size + color
- `components/DevInspector.js` — bottom position bump
- `app/actions/page.js` — maxWidth removed, icon sizes, tooltips, useLayoutEffect
- `app/threads/page.js` — toolbar reorder, tooltips, icon sizes
- `app/settings/page.js` — tooltips, useLayoutEffect
- `app/owner/page.js` — tooltips

---

## Session — 2026-03-19: Chappie 2.0 (ALL 9 PHASES CODE-COMPLETE)

**Scope:** Full context architecture redesign. 136 tasks across 9 phases, ~120 shipped in one session.

### What shipped:
- **Phase 0:** Prompt caching (`cache_control: ephemeral`), circuit breaker wired, billing state machine (5 states), killed eager integration loads, COST_BASIS updated, cost ceilings fixed, dashboard labels
- **Phase 1:** `ful-legend.js` (single source of truth), `ful-config.js` re-exports from legend, trial enforcement (1 integration, 10 notes, 14-day expiry CTA), Stripe annual prices created ($90/yr Standard, $150/yr Pro), monthly/annual toggle on landing, checkout route + webhook wired, dashboard polish (BYOK count, credit revenue, Conv %, projections dynamic)
- **Phase 2:** Anchor context computed in greeting route, cached as `anchor_context`, injected as `## Daily Context` in system prompt. Coverage hint lists loaded notes + connected integrations.
- **Phase 3:** Habit Engine v1 — `user_patterns` table, post-conversation logging (trigger words, ecosystem, frequency, time_of_day), pre-message pattern matching (ecosystem scoring), ecosystem stickiness (last 3 msgs), speculative prefetch (top 2 ecosystems cached), cold-start seed (first message → keyword → ecosystem at freq 3). High-confidence ecosystem → only that ecosystem's tools loaded.
- **Phase 4:** Server-side semantic context — Voyage embedding in Promise.all, match_notes RPC, merge + dedupe with client notes, reactive budget cap (8K Sonnet / 15K Opus), fallback chain (embedding → 5min cache → keyword)
- **Phase 5:** KB docs as tool — `kb_search` tool + executor, KB injection removed from system prompt (saves ~0-10K tokens/msg)
- **Phase 6:** Value-framed upsells — HEADS_UP shows credits + Pro + annual savings
- **Phase 7:** Retry logic — 3 attempts with exponential backoff on 429/529, "AI busy, retrying" client indicator
- **Phase 8:** Cost/msg + net ARPU fields in both dashboards

### Remaining (deploy-verify only):
- Cache hit verification (0.3-0.4)
- Circuit breaker live test (0.6)
- Integration/notes limit test (0.17-0.18)
- Proration test in Stripe (1.24)
- Anchor/semantic/KB/retry live tests
- Compression protocol: 10 conversations × 20+ messages (8.1-8.5)

### Key files created/modified:
- **NEW:** `lib/ful-legend.js`, `scripts/habit-engine-setup.sql`
- **MAJOR:** `app/api/chat/route.js` (Habit Engine + semantic + retry + caching + circuit breaker + KB tool)
- **Updated:** `ful-config.js`, `cost-guard.js`, `referral-engine.js`, `vault-tokens.js`, `use-chat.js`, `use-chat-context.js`, `ChatContent.js`, `landing/page.js`, `settings/page.js`, `owner/page.js`, `stripe/checkout/route.js`, `stripe/webhook/route.js`, `chat/greeting/route.js`, `referrals/admin/route.js`

---

## Session 18 — 2026-03-18: Next 10 + Launch Readiness Audit

### Milestone: TODO Restructured
- Full production readiness audit: infrastructure, UX, scale risks, viral readiness
- Archived completed phases (1–5.5, Security, Next 10) to `md/archive/todo-phases-1-5.md`
- New TODO.md with 3-part structure: What's Next (10 items) / Watch List (10 monitors) / Manager's Choice (10 strategic bets)
- Critical path updated: now at **Launch Hardening** phase
- Top 3 non-negotiables before users: Sentry, CI/CD, database indexes

### What was built
- **Actions button feedback** — `loadingIds` Set tracks in-flight operations. All async buttons (complete, defer, dismiss, reactivate, priority, bucket, add) now disable + dim during async. Prevents rage clicks (already tracked in signals).
- **Chat latency — vault token budget** — Reduced from 100K → 25K tokens. Added client-side context cap at 15 items (was unlimited, server was silently dropping past 20 via `.slice(0, 20)`).
- **Chat latency — GitHub → tool** — Deleted 70-line blocking enrichment block (up to 10s). GitHub file fetch is now an on-demand `github_fetch_files` tool. Claude calls it only when code is relevant. First token streams immediately.
- **Chat latency — query parallelization** — 7 server-side queries (prefs, conversations, broadcasts, owner docs, referral profile, integration tokens, Stripe prices) wrapped in single `Promise.all`. Deduped `getStripePrices()` (was called twice). GitHub token fetched alongside integration tokens.
- **"Fül up" inline prompt** — Capped chat state now shows upgrade CTA (plan or credits) + BYOK fallback. Previously only linked to BYOK settings.
- **Trial end UX** — Dashboard banner when trial ends or has ≤5 days remaining. Dismissible. Links to billing with upgrade CTA.
- **Security KB uploaded** — `security.md` inserted into vault_broadcasts (owner-context channel, id: d258acc3).
- **Combined dashboard endpoint** — New `/api/owner/dashboard` merges metrics + analytics + events into one request (was 3 separate calls). Single auth check, single round-trip.
- **User-keyed rate limiting** — Authenticated users get 200/min keyed by token hash (was 60/min keyed by IP, shared with anonymous traffic). Unauthenticated stays at 60/min by IP.
- **Missing DB column** — Added `scheduled_for` to actions table. Was referenced in 5 places but migration never ran. Fixed 400 errors on /home and /actions.

### Files created
- `api/owner/dashboard/route.js` — combined owner dashboard endpoint
- `scripts/upload-security-kb.mjs` — one-time KB upload script
- `scripts/add-scheduled-for.sql` — migration for missing column

### Files changed
- `app/actions/page.js` — loadingIds state, button disabled/opacity
- `app/api/chat/route.js` — Promise.all queries, GITHUB_TOOLS + handler, deleted blocking enrichment
- `app/home/page.js` — trial banner, onboardingState consumption
- `components/ChatContent.js` — inline upgrade CTA in capped state
- `lib/vault-tokens.js` — TOKEN_BUDGET 100K → 25K
- `lib/use-chat-context.js` — CLIENT_CONTEXT_CAP = 15
- `middleware.js` — authed rate limit tier (200/min), user-keyed limiting
- `app/owner/page.js` — DashboardTab uses combined endpoint
- `TODO.md` — 7 items checked off

### Production issues found & fixed
- `actions.scheduled_for` column missing → added via supabase db query
- Owner portal 429 avalanche → combined endpoint + user-keyed rate limits
- No CSP violations detected (clean)

---

## Session 17 — 2026-03-17: Operation Vault Door — Bank-Vault Security Hardening

### What was built
- **Token encryption at rest** — All 9 OAuth providers now encrypt tokens with AES-256-GCM before database storage. New shared utility `lib/token-crypt.js` (extracted from BYOK route). Format: `iv:tag:ciphertext`. Migration-safe: detects plaintext legacy tokens, returns as-is, encrypts on next write cycle.
- **Metadata encryption** — Refresh tokens in the `metadata` JSON column (Square, Toast, Spotify, Shopify, Trello) encrypted as complete blobs via `encryptMeta()`/`decryptMeta()`.
- **Content Security Policy** — Strict CSP enforced in middleware. Blocks XSS, clickjacking, third-party script injection. Tested in Report-Only first, then flipped to enforcing.
- **Distributed rate limiting** — Installed `@upstash/ratelimit` + `@upstash/redis`. Middleware rewritten to use Redis sliding window. Same limits (chat 15/min, checkout 5/min, etc.) now shared across all serverless instances. Graceful fallback to in-memory if Redis unavailable. Upstash Redis deployed (AWS, no eviction, free tier).
- **Error leakage sweep** — Sealed `err.message` returns in 6 routes (embed, feedback, owner/events, rsg, numbrly/context, stripe/webhook). All now return generic messages. No internal details exposed to clients.
- **Security page** — New public page at `/security` — renders the full security architecture for anyone to read.
- **Landing page trust section** — 6-item grid (AES-256-GCM, SOC 2 controls, RLS, zero plaintext, CSP, full deletion) between Pricing and Final CTA. Link to /security. "Bank-vault encryption at rest" row added to competitive grid. Security link in footer.
- **Security documentation** — `md/security.md` — comprehensive brag-worthy security architecture doc. Covers encryption, auth, RLS, rate limiting, CSP, prompt injection defense, webhook integrity, BYOK, data deletion, infrastructure.
- **Final audit** — Two-agent sweep verified every claim on landing page and /security page is backed by real code. Zero aspirational statements. Removed "audit logging" from SOC 2 claim (not implemented). All facts.
- **Owner notes** — Added Upstash Redis console link to owner portal Notes tab.
- **Phase 1 security audit** (done prior) — JWT bypass fix, security headers, input validation, RLS hardening, error leakage fixes.

### Files created
- `lib/token-crypt.js` — shared AES-256-GCM encrypt/decrypt for tokens + metadata
- `md/security.md` — security architecture documentation
- `app/security/page.js` — public security page

### Files changed
- `middleware.js` — CSP enforcing, Upstash Redis rate limiting with in-memory fallback
- `api/byok/route.js` — imports from shared token-crypt instead of inline
- 9 callback/connect routes — encrypt tokens before storage
- 9 server lib files — decrypt tokens after fetch
- 6 API routes — error leakage sealed (embed, feedback, owner/events, rsg, numbrly/context, stripe/webhook)
- `app/landing/page.js` — trust section, competitive grid row, security footer link
- `app/owner/page.js` — Upstash Redis in owner notes
- `TODO.md` — security items marked complete

### Env vars added
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (Upstash console → Vercel + .env.local)

### What's next
- Upload security.md to Fulkit KB (vault_broadcasts)
- Test CSP in production (check browser console for blocked resources after deploy)

---

## Session 16 — 2026-03-17: Operation Pancakes finale + KB audit + Doc Import removal

### What was built
- **Final KB audit** — Verified all 28 docs across 3 knowledge bases (4 DB channels). Confirmed complete isolation: main chat reads `context` + `owner-context`, fabric chat reads `fabric-context` only, greeting reads `owner-context` voice doc only. Zero bleed.
- **Removed Doc Import** — Stripped GitHub-sourced markdown discovery/import tool from owner portal Developer tab (state, logic, UI). The KB card system built during Pancakes replaced this workflow entirely. Build passes clean.
- **Content strategy confirmed** — Three buckets mapped to three audiences:
  - User KB (`context`) = "The Menu" — product education, user-facing
  - Fulkit KB (`owner-context`) = "The Kitchen" — dev specs, business ops, sensitive info
  - Fabric KB (`fabric-context`) = "The Record Store" — B-Side's music island

### Files changed
- `app/app/owner/page.js` — Removed Doc Import section (~210 lines: state, functions, UI)

### What's next
- Dogfooding — all KBs loaded, isolation verified, ready to test in production
- Future: Context engine (pgvector embeddings, RAG)

---

## Session 15 — 2026-03-14: Fabric search enrichment + Dig column scroll + Crate polish

### What was built
- **Enriched search results** — Artist search now returns top tracks (playable rows with track number, title, duration, play/add buttons), up to 20 albums (was 5) with "See all X albums" toggle, and playlists. Three parallel API calls + follow-up top-tracks fetch.
- **BTC song card font** — Switched song recommendation cards from mono to primary font. Kept bump-out design, grouped cards, play/add buttons.
- **Bold markdown fallback parser** — Song cards now render from `**Artist** - Title` format (bold markdown) in addition to `Artist - Title BPM [+]`. Catches LLM format drift.
- **Prompt strengthening** — RECOMMENDATION FORMAT in prompts.js now says "Every time you mention a specific track" (not just "When recommending") and requires BPM + [+] always.
- **Dig column scroll architecture** — Removed flex column from scroll container, removed all per-section maxHeight caps (chat 45vh, search 40vh, discovery 40vh). One long scrollable column where each section takes natural height.
- **Search results moved outside BTC panel** — Search results are now a sibling to the BTC panel in the scroll container, not nested inside it.
- **Crate card polish** — Flush cards (gap: 0), consistent 110px width, black left border on selected crate, mutual exclusivity between B-Sides and personal crates, title padding alignment.
- **Crate auto-sort** — Last accessed crate bumps to front of list. Persisted in localStorage crate-order.
- **Top tracks API** — New `type=top-tracks` handler in search route using `/artists/{id}/top-tracks?market=US`.
- **Playlist search API** — New `type=playlist` handler in search route.

### Design decisions
- One scroll container > per-section scroll — user wanted to see everything in one long column
- Crate mutual exclusivity — B-Sides and personal crates can't both be expanded simultaneously
- "Last accessed = first" for crates — no separate sort toggle, just automatic reordering on click

### Files changed
- `app/app/fabric/page.js` — scroll architecture, search UI enrichment, crate polish, auto-sort, font change, bold parser
- `app/app/api/fabric/search/route.js` — top-tracks, playlist type, album limit 5→20
- `app/lib/btc/prompts.js` — recommendation format strengthening

### What's next
- Future: Isolate Fabric music player as standalone feature for multi-API support (Spotify, SoundCloud, Apple Music)
- Phase 5: Context engine (pgvector embeddings, RAG)

---

## Session 14 — 2026-03-13: Threads polish + Integration resilience audit + Silent lifecycle features

### What was built
- **Frequently used labels (quick picks)** — When label picker opens and input is empty, top 5 most-used labels appear as clickable `/label` chips below the input. `allLabels` sorted by frequency descending in page.js, chips rendered in ThreadDetail.js. Clicking adds the label instantly.
- **Integration architecture audit** — Confirmed all core features (threads, labels, actions, chat, vault) work independently with zero foreign keys to integrations table. `source` field is a plain string, not a constraint. Disconnect deletes only the token row — no cascade, no data loss. `safeGet()` + conditional tool registration ensures graceful degradation.
- **Auto-archive overdue items** — Overdue threads dim to 55% opacity across all views (Board, List, Table, Calendar). Board view sorts overdue items to bottom within each column. No status change — user owns status, we just visually deprioritize.
- **Integration inventory** — Single line under Sources "Connected" header: "12 notes · 8 actions in your vault". Fetches counts via Supabase head queries. Shows nothing if counts are 0.
- **Vault export** — `GET /api/export` returns all notes + actions as JSON. "Download my data" button in Settings > Account tab. Downloads `fulkit-vault-YYYY-MM-DD.json`. No wizard, no dialog — one click.
- **Monochrome fixes** — List view status dot changed from `--color-success` to `--color-text` (was last colored element in threads).

### Design decisions
- Overdue items dim but don't auto-change status — some overdue items are still actively worked on
- Vault inventory is global (total counts), not per-integration — `source` field values ("Chat", "Obsidian") don't reliably map to integration names ("github", "trello")
- Export is silent — no confirmation dialog, just downloads

### Files changed
- `components/ThreadDetail.js` — quick-pick label chips
- `components/ThreadCard.js` — overdue opacity dimming
- `components/ThreadBoard.js` — overdue items sort to bottom
- `components/ThreadTable.js` — overdue row dimming
- `components/ThreadCalendar.js` — overdue entry dimming
- `app/threads/page.js` — list view overdue dimming, monochrome status dot, label frequency sort
- `app/settings/page.js` — vault inventory line, export download button
- `app/api/export/route.js` — NEW vault export endpoint

### What's next
- Push to production
- Backfill SQL (notes table extensions) before production push
- Phase 5: Context engine (pgvector embeddings, RAG)

---

## Session 13 — 2026-03-13: Threads elevation — Kanban board + Chat ↔ Threads ↔ Actions

### What was built
- **Trello competitive analysis** — Compared Trello's kanban model against Fulkit's /threads. Identified what to adopt (status columns, due dates, labels, checklists) and what to skip (card covers, activity log, custom lists, power-ups, multiple boards).
- **DB migration** — Added `status`, `position`, `due_date`, `labels` (JSONB), `conversation_id` to notes table. Added `thread_id`, `conversation_id` to actions table. Indexes for kanban queries.
- **ThreadCard component** — Minimal card: 2-line title, monochrome label pills (max 3 + overflow), source badge, urgency dot (green/yellow/red semantic), checklist count (done/total).
- **ThreadBoard component** — 5-column kanban (Inbox, Active, In Progress, Review, Done). HTML5 drag-and-drop between columns. Compact mode (220px icon-only) and normal mode (280px with labels).
- **ThreadDetail component** — Right-pane editor: status segmented control, native date picker, labels with autocomplete, content textarea, checklist section (linked actions with progress bar). Adding checklist items creates real actions with `thread_id`.
- **Threads page rewrite** — Slim shell with board/list view toggle (localStorage), label filter pills, folder filter as orthogonal dimension. Board is default view.
- **Chat ↔ Threads ↔ Actions unification**:
  - `threads_create` tool added to chat route (tool definition + executor + dispatch handler)
  - `conversation_id` plumbed from client → server → all tool executors (notes, actions, threads)
  - `actions_create` accepts optional `thread_id` for cross-linking
  - `vault-writeback.js` passes `conversationId` to auto-extracted actions

### Design decisions
- Notes = Threads (extended table, not separate) — preserves all existing queries
- Actions with `thread_id` serve as checklist items — appear on both Actions page and thread detail
- Folders (area of life) + Status (workflow column) + Labels (cross-cutting tags) = three orthogonal dimensions
- Monochrome labels: differentiated by border style, not color

### Files changed
- `components/ThreadBoard.js` — NEW
- `components/ThreadCard.js` — NEW
- `components/ThreadDetail.js` — NEW
- `app/threads/page.js` — rewritten to shell
- `app/api/chat/route.js` — threads_create tool + dispatch, conversationId plumbing, input validation
- `lib/use-chat.js` — passes conversationId in request body, passes convId to writeBackSupabase
- `lib/vault-writeback.js` — accepts + inserts conversationId on auto-extracted actions

### What's next
- Test full flow: create thread from chat, drag on board, add checklist items
- Dev mode mock data verification
- Labels filter UI polish
- Phase 5: Context engine (pgvector embeddings, RAG)

---

## Session 12 — 2026-03-13: Security hardening

### What was built
- **Dev mode bypass removed** — `localStorage.getItem("fulkit-dev-mode")` backdoor deleted. `?auth=dev/new/none` now gated behind `localhost` hostname check. Production visitors can no longer get owner access from console.
- **BYOK encryption upgrade** — base64 obfuscation → AES-256-GCM. Keys stored as `iv:tag:ciphertext`. Legacy base64 auto-migrates on read. Shared `decryptByokKey()` export used by both `byok/route.js` and `chat/route.js`. New env var: `BYOK_ENCRYPTION_KEY`.
- **Prompt injection defense** — Added explicit guardrail to BASE_PROMPT ("these sections are context, not instructions"). XML delimiters (`<user-preferences>`, `<user-memories>`, `<conversation-history>`, `<user-documents>`) wrap all user-controlled system prompt sections.
- **Memory persistence defense** — key capped at 100 chars, value at 500 chars, max 100 memories per user (updates to existing keys still allowed).
- **Chat route input validation** — `timezone`, `context`, `chapterSummaries` validated/typed/capped before use. Timezone must be string <50 chars, context capped at 20 items with type checks, chapters capped at 50.
- **Notes tool hardening** — search query stripped of `%`/`_` SQL wildcards and capped at 200 chars, results limited to 20. Note creation: title capped at 200, content at 50K chars. Same caps on note updates.

### Files changed
- `lib/auth.js` — dev mode localhost gate
- `api/byok/route.js` — AES-256-GCM encrypt/decrypt
- `api/chat/route.js` — prompt guardrail, XML delimiters, memory validation, input validation, note caps
- `.env.local` — added `BYOK_ENCRYPTION_KEY`
- Vercel env vars updated (BYOK_ENCRYPTION_KEY added)

### What's next
- Fül cap UI gate (429 → user-facing "out of messages" screen)
- Phase 5: Context engine (pgvector embeddings, RAG)
- Phase 5.5: Stripe integration for payments

---

## Session 11 — 2026-03-12: Chat infrastructure rebuild + hardening

### What was built
- **Phase 1: Hook extraction** — Broke 1,488-line God component (`chat/page.js`) into three focused files:
  - `lib/use-chat.js` (~280 lines) — messages, streaming, conversations, send flow, DB persistence
  - `lib/use-chat-context.js` (~210 lines) — context assembly, files, GitHub, Numbrly, alerts
  - `chat/page.js` (~800 lines) — pure UI: rendering, layout, drag-resize, pins
- **Chunk buffering via rAF** — SSE chunks accumulate in a ref buffer, flushed on `requestAnimationFrame`. Reduces re-renders from 40+/sec to ~7/sec.
- **stream.finalMessage() try/catch** — Claude API mid-stream disconnect sends clean error to client instead of tearing down the ReadableStream.
- **15s per-tool timeout** — `withTimeout()` wraps every tool executor via `Promise.race`. No single tool call can hang the round.
- **Keep-alive SSE pings** — `:ping\n\n` comment sent before tool execution rounds.
- **Safe integration token fetches** — `safeGet()` wrapper catches per-integration failures.
- **Phase 2: Hardening audit** — 32 failure modes identified, top 5 fixed:
  1. **Double-send guard** — checks `streamingRef.current` (sync) not `streaming` state (async React batching race)
  2. **assembleContext 10s timeout** — vault hang falls back to no context, never blocks chat
  3. **Rolling 30s inactivity watchdog** — resets on each SSE chunk, catches mid-stream stalls
  4. **Server Supabase timeouts** — profile, prefs, conversations queries get 5s `AbortSignal.timeout`
  5. **50s tool loop cap** — total execution bounded under Vercel's 60s function limit
- **Mid-stream abort UX** — partial response preserved, appended with "*(Response interrupted)*" notice.
- **GitHub token fetch** — wrapped in `.catch(() => null)` so failure doesn't block chat.

### Decisions locked
- Chat page is pure UI — all logic lives in hooks
- Every `await` in the chat path has either a timeout or error catch — zero uncapped waits
- Tool loop capped at 50s total, 15s per tool, 5 rounds max
- Context assembly failure is non-fatal — chat sends without context
- Mid-stream stall detected by rolling watchdog, not just initial timeout

### Remaining edge cases (non-blocking)
- Token estimation is 1:4 char ratio — could undercount CJK text (would need tiktoken)
- Client disconnect not detected server-side (wastes API credits but doesn't hang)
- Large tool results unbounded (could exceed context window in tool rounds)
- Conversation compression with all-large messages could produce thin summary

### What's next
- Test multi-turn conversation in production (5+ back-and-forth)
- Test file upload, recall, tool execution end-to-end
- Virtual scrolling for very long conversations (future)

---

## Session 10 — 2026-03-12: Chat reliability, timezone, file upload fix

### What was built
- **Follow-up hang fix** — Root cause: Supabase client deadlocks on concurrent awaits. All `saveMessage` calls changed to fire-and-forget (`.then/.catch`), 8s AbortSignal timeout. DB saves never block conversation flow.
- **streamingRef guard** — `useRef` tracks streaming synchronously so `loadMessages` useEffect can't overwrite in-progress streams.
- **Timezone fix** — Client sends `Intl.DateTimeFormat().resolvedOptions().timeZone`, server computes local "today" using `toLocaleDateString("en-CA", { timeZone })`. Injected into system prompt + all tool executors.
- **File upload visibility** — Attached files now titled `[Uploaded] filename.csv` in context, and user message annotated with `[Attached files: ...]` so Claude knows to analyze them.
- **MessageRenderer ErrorBoundary** — Dev-mode red error box shows render errors for diagnosis.
- **Conversation length documented** — No per-convo cap. Compression at 180K (owner) / 80K (others) keeps context manageable. Monthly msg limits: free 100, std 450, pro 800, owner unlimited.

### Decisions locked
- React state IS the conversation context — API gets full history from state, DB is only for cross-session persistence
- Fire-and-forget saves — conversation flow never waits for DB
- Uploaded files get `[Uploaded]` prefix + message annotation for Claude visibility

### What's next
- Verify multi-turn conversation works end-to-end in production
- CSV/file upload testing
- Virtual scrolling for very long conversations (future)

---

## Session 6 — 2026-03-09: Orb polish, brand refresh, Context Engine, Whispers

### What was built
- **Orb Visualizer refinements** — smaller (0.24 viewport), quieter noise, 48 tracer layers, denser fill, smoother reflections with quadratic curves. Fülkit branding top-left, bigger track info bottom-left.
- **Visualize button** — restored to Deck transport row (Maximize2 icon, circled style)
- **Brand refresh** — umlaut2.png → all icon assets: favicon.ico (16+32), apple-touch-icon (180), icon-192, icon-512, web manifest, layout metadata. Logo size fixed at 22px (no expand/collapse jump).
- **Phase 2.5: Context Gate** — `hasContext` derived in auth (onboarded OR notes > 0). Dashboard nudge card ("Take the quiz or upload files"), chat soft nudge, onboarding "I'll do this later" skip link.
- **Phase 3: Claude Action Tools** — actions_create, actions_list, actions_update wired into chat API. Source="Chat" tagging. Claude suggests actions naturally.
- **Phase 5: Context Engine** — memory_save/list/forget tools (preferences table with memory: prefix). notes_search tool (keyword ilike). Cross-session context (recent 10 conversation titles in system prompt). Smart memory behavior (Claude auto-saves facts, uses memories naturally).
- **Whispers** — GET /api/whispers generates 2 proactive suggestions from user context (actions, memories, conversations). 12hr cache in preferences. Dashboard wired to show real whispers.
- **Owner portal** — "Import project docs" button: fetches 7 md files from GitHub, imports as notes via /api/notes/import.

### Decisions locked
- Memory stored as `memory:key` in preferences table (no new table needed)
- Whispers cached 12hrs in preferences as `cached_whispers` JSON
- Context Gate is soft (nudge, not block) — nothing prevents usage
- Logo always 22px in sidebar
- Orb base radius = 0.24 of viewport min dimension

### What's next
- Phase 4: Dogfood (import docs via owner button, use daily)
- Phase 5 advanced: pgvector embeddings, codebase ingestion, RAG pipeline
- Phase 6: More MCP integrations

---

## Session 5 — 2026-03-06: Settings cleanup, Chat persistence, Actions page

### What was built
- **BillingTab real data** — owner sees "Unlimited — using your own API key", no fake gauge. Dev mode keeps template. Standard users pull from profile.
- **PrivacyTab real counts** — queries notes, actions, preferences tables for live counts. Added Phase 2.55 (Privacy Transparency Dashboard) to TODO for expandable detail views.
- **Chat persistence** — conversations + messages tables in Supabase (RLS scoped to user). Auto-saves messages as they stream. Auto-titles from first message. History panel toggles open.
- **History panel on right** — layout is sidebar | chat | history. Drag-to-resize handle (160-400px range, default 260px).
- **Actions page** — `/actions` with filter tabs (active, done, deferred, dismissed + counts), inline add, per-action dropdown menu (complete/defer/dismiss/reactivate). Added to sidebar nav.
- **Monorepo restructure** — project moved from `app/` to `fulkit_site/`. ChappieBrain (Obsidian vault) added, gitignored. Root CLAUDE.md updated.
- **TODO roadmap expanded** — Phases 2.5-7 added (Context Gate, Privacy Dashboard, Chat Persistence, Actions, Dogfood, Context Engine, MCP, Self-Building). Agent safety model documented in buildnotes.
- **Recall rail concept** — Phase 2.6 updated: right rail as contextual filter chips (auto-tagged topics), not a conversation list. Feeds into Phase 5 context engine.

### Decisions locked
- History panel lives on the RIGHT (sidebar | chat | history)
- History panel is drag-resizable (min 160px, max 400px)
- Owner with BYOK = unlimited Fül, no gauge shown
- Privacy tab = transparency dashboard (expandable detail views planned)
- Recall rail > bookmarks/folders — semantic tags, not structure

### Vercel action needed
- Root directory may need updating from `app` to `fulkit_site/app` after monorepo restructure

### Next up (critical path)
- Verify Vercel builds with new monorepo structure
- Phase 2.5: Context Gate (make onboarding dismissible, context check before chat)
- Phase 3 remaining: chat → create actions, chat → query actions
- Phase 4: Dogfood — import docs as notes, use Fulkit daily

---

## Session 3 — 2026-03-05 afternoon: CTA, About Page, Auth Fixes

### What was built
- **CTA evolution**: Dead waitlist form → working Link → full-width solid bar (no email input, one click)
- **WTF/About page**: `/about` built from `md/wtf-about.md` — 12 sections, design exhibition, dictionary hero, DIN/Bauhaus/Rams/Swiss heritage, pull quotes, Rams principles stacked
- **`/wtf` redirect**: Server redirect to `/about`
- **Landing nav**: Added "WTF" link between logo and Sign in
- **Sign out button**: Settings → Account tab, full-width, error-colored
- **Supabase URL config**: Site URL set to `https://fulkit.app`, redirect URLs added for fulkit.app, fullkit.app, localhost
- **Auth race fix**: `await fetchProfile` before `setLoading(false)` in `getSession`
- **@supabase/ssr**: Switched from vanilla `createClient` to `createBrowserClient` for proper Next.js cookie-based session handling
- **CLAUDE.md + devlog.md merge**: Validated alternate versions against real codebase, merged best of both
- **New CLAUDE.md rules**: CTA always full-width block Link, logo always links /home

### Decisions locked
- CTAs are full-width solid bars — no email inputs, no forms
- Landing page sandwich layout: hero left, middle centered, final CTA left
- Logo/wordmark always links `/home`
- `/wtf` → `/about` redirect (nav says "WTF" because it's on-brand)

### Known issues (BLOCKING)
- **Google OAuth sign-in redirects to /landing instead of /home** — switched to @supabase/ssr but not yet verified working. This blocks real user sign-in.
- Owner role not yet set for Collin (blocked by auth)

### Known issues (non-blocking)
- Magic link delivery untested
- D-DIN font files not in assets/fonts/ (using system fallback)
- AI chat untested in production

### What's next
- **Fix auth** — debug why Google OAuth callback doesn't establish session
- Set Collin as owner after first successful sign-in
- Pressure test magic link delivery
- Build chat interface with Claude API

---

## Session 2 — 2026-03-05: Auth + Deploy + Owner Portal

### What was built
- **Vercel deployment**: fulkit.app live, fullkit.app 308 redirect, Framework Preset = Next.js
- **Supabase Auth**: Google OAuth + email magic link, `onAuthStateChange` session management
- **Database schema**: `profiles`, `preferences`, `actions`, `notes`, `referrals` tables with RLS
- **Auto-profile trigger**: `handle_new_user()` creates profile row on first sign-in
- **Owner portal**: `/owner` route with Dashboard, Design, Users, Socials, OG Creator tabs — role-gated
- **Dev mode overrides**: `?auth=dev` (template data), `?auth=new` (onboarding), `?auth=none` (signed out)
- **Real data flow**: `/home` fetches actions + notes from Supabase, shows empty states for new users
- **Source integrations UI**: Numbrly + TrueGauge added to Settings with custom SVG logos
- **Placeholder removal**: forced real sign-in, mock data only via `?auth=dev`

### Decisions locked
- `profiles.role = 'owner'` gates the owner portal
- Seat limits: free=100, standard=450, pro=800 messages/month
- 308 permanent redirect: fullkit.app -> fulkit.app
- Vercel root = `app/`, Framework Preset = Next.js

### Config reference
- **Vercel**: Framework Preset = Next.js, Root Directory = `app`
- **Supabase project**: `zwezmthocrbavowrprzl`
- **Domains**: fulkit.app (primary), fullkit.app (308 redirect)
- **Google OAuth**: configured in Supabase Auth providers

### Known issues
- Magic link delivery needs testing
- Supabase Site URL and Redirect URLs need verification
- Owner role must be set manually: `UPDATE public.profiles SET role = 'owner' WHERE email = '<gmail>';`
- AI chat untested in production
- D-DIN font files not in assets/fonts/ yet (using system fallback)

### What's next
- Set Collin as owner after first real sign-in
- Pressure test magic link delivery
- Build out chat interface with Claude API
- Add font files to assets/fonts/
- Connect real data sources (Obsidian, Google Drive)
- Owner portal: populate remaining tabs

---

## Session 1 — 2026-03-04/05: Scaffold Complete

### What was built
- Next.js app with 10 routes (landing, chat, hum, onboarding, home, settings, login, terms, privacy, api/chat)
- Design token system (tokens.css + tokens.json) from design.md
- Component library: Sidebar, AuthGuard, MiniPlayer — all inline styles using design tokens
- All JSX prototypes archived to jsx/archive/

### Decisions locked
- Next.js (not Vite) — SSG for marketing + dynamic for app
- D-DIN font for now — swap to DIN Pro when licensed
- Root directory for Vercel = `app/`
- `app/app/` nested structure is intentional
- Inline styles only, no CSS framework
- All visual values via design tokens

### What was broken at end of session
- Mock auth only — no real sign-in
- Font files not in assets/fonts/ yet (using system fallback)
- AI chat untested

### Config reference
- Vercel project: stggreenleaf/fulkit
- GitHub: STGreenleaf/fulkit
