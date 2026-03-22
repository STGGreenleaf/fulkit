# Fulkit — Milestone: Launch Hardening

> Phases 1–5.5 complete. Security audit done. Performance polished. Product works.
> Now: harden for real users. Previous phases archived in `md/archive/todo-phases-1-5.md`.

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
- [ ] **Spotify Extended Quota** — Request from Spotify developer dashboard. Currently Development Mode (only Collin's account works).

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
- [ ] **4.9** Semantic search accuracy — ask about juice → only juice notes in context. Ask about taxes → context titles change.
- [x] **4.10** Voyage fallback — ✅ tested, keyword matching works without Voyage key
- [ ] **6.8** Standard user at 98% usage sees credits + Pro upsell + annual savings
- [x] **7.6** Retry on 429 — ✅ code confirmed: 3-attempt exponential backoff (1.5s, 3s), streams retry status to client

### Stripe (one and done)
- [x] **1.24** Proration test — ✅ tested in Stripe, invoices prorate correctly

### Compression (schedule a focused session)
- [ ] **8.1** Run 10 real conversations × 20+ messages across different topics
- [ ] **8.2** Verify thread maintenance after compression triggers (80K threshold for Sonnet)
- [ ] **8.3** Verify early conversation context still referenced post-compression
- [ ] **8.4** Grade: ≥8/10 pass = done. <8/10 = tune the 60% recent window
- [ ] **8.5** If tuning needed: adjust and re-test

### Parked (need real user data)
- [ ] **6.1** Personalized upsells from `ful_ledger` spending patterns — needs user history to accumulate
- [ ] **6.2** Personalized upsells from `user_patterns` top ecosystems — same, lights up naturally

### Deploy-verify (confirm on next relevant test)
- [ ] **2.7** Open app, check `[chat:debug]` — anchor context reflects recent activity
- [ ] **2.8** Ask about a topic NOT in anchor — Claude uses tools to fetch, not hallucinate

---

## From Signals (2026-03-19)

- [x] **Chat LCP slow (4-6s)** — ✅ Session 22: AuthGuard now preloads children under splash overlay. Fetches fire during 2800ms wink. Signal thresholds raised to 6s.
- [x] **Slow streams (5-6s first token)** — ✅ Session 22: ThinkingIndicator (dots) is intentional design. Lean tool loading reduced request size. Thresholds adjusted.
- [x] **SVG rage clicks on toolbar buttons** — Lucide SVG icons eating taps on mobile. Fix: pointerEvents:"none" on icons.

## Still Open (carried forward)

> Items from earlier phases that are external or infrastructure tasks.

- [ ] Fabric auto-analyze (production) — $5/mo VPS with yt-dlp + ffmpeg
- [ ] Spotify App — Extended Quota Mode (Spotify dashboard)
- [ ] Domain verification for Spotify OAuth redirect URI
- [x] Fabric isolation — provider abstraction complete, DB migration run. Multi-provider ready. Session 22.
- [ ] SoundCloud API integration (pending Artist Pro + API approval)

## Future Phases (unchanged)

### Phase 6: MCP Integrations
- [ ] Git, Spotify, Google Calendar, Gmail, Obsidian, Stripe, Vercel
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
