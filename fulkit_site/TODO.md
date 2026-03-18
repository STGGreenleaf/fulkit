# Fulkit — Master Action List

> Get live. Dogfood. Iterate.

---

## Phase 1: Deploy -- DONE

- [x] Vercel project + fulkit.app DNS
- [x] fullkit.app 308 redirect
- [x] Environment variables on Vercel
- [x] Clean build

## Phase 2: Auth + Database -- DONE

- [x] Supabase project (Postgres + Auth + RLS)
- [x] Google OAuth + email magic link
- [x] DB migrations (profiles, preferences, actions, notes, referrals)
- [x] Real auth in lib/auth.js with dev mode overrides
- [x] Supabase env vars on Vercel
- [x] PKCE auth callback — code exchange, error display
- [x] Google OAuth confirmed working (sign in → dashboard → sign out loop)
- [x] Collin's account created, role=owner, onboarded=true
- [x] Magic link sign-in (code + UI complete — signInWithOtp + login page email flow)
- [ ] Test magic link delivery (send a real one, confirm it arrives)

## Phase 2.1: Core Features -- DONE

- [x] Streaming chat (Claude Sonnet 4.6, SSE)
- [x] Smart root route (`/` → dashboard or landing)
- [x] Google Search Console verification
- [x] Brand mark locked (umlaut2.png)
- [x] D-DIN + JetBrains Mono fonts (WOFF2, no 404s)
- [x] Sign out → landing redirect
- [x] Privacy + Terms pages

## Phase 2.2: Onboarding System -- DONE

- [x] question_phases + questions tables
- [x] 20 seed questions across 6 phases
- [x] RLS disabled on config tables
- [x] Onboarding reads from DB (not hardcoded)
- [x] Questions tab in Owner portal (full CRUD)
- [x] Import/Export JSON (LLM round-trip for questionnaire authoring)

## Phase 2.5: Onboarding Context Gate

- [x] Make onboarding dismissible — "I'll do this later" skip link
- [x] Context check before first chat — soft nudge in chat empty state
- [x] Dashboard nudge if no context ("Take the quiz or drop in some files")
- [x] File/note uploads as alternative context source (Settings → Vault tab already built)
- [x] Track context status — `hasContext` derived from onboarded + notes count in auth

## Phase 2.55: Privacy Transparency Dashboard

- [x] Real counts from DB (notes, conversations, actions, preferences)
- [x] Expandable rows — click to see every item Fulkit knows
  - Notes: title, source, date
  - Conversations: title, date
  - Learned preferences: key/value with "Forget" button
  - Onboarding answers: view what you told Fulkit
- [x] Real storage used (Supabase query — notes + messages content size)
- [x] Export wires to real data (JSON vault export via /api/export — now includes conversations, messages, preferences)
- [x] Delete wires to real data (cascade with confirmation — type DELETE modal, /api/account/data + /api/account)

## Phase 2.6: Chat Persistence + Recall Rail

- [x] Conversations table (id, user_id, title, created_at, updated_at)
- [x] Messages table (id, conversation_id, role, content, created_at)
- [x] Auto-save every message to DB as it streams
- [x] Auto-title conversations (first message truncated to 60 chars)
- [x] Click to resume any past conversation (History panel)
- [x] Right rail — contextual recall strip with topic filter chips
  - Topics auto-extracted from user messages (keyword frequency, no API cost)
  - Saved to conversations.topics column (text[] with GIN index)
  - Top ~10 topics shown as filter chips above conversation list
  - Click a chip to filter history to conversations containing that topic
  - Feeds into Phase 5 context engine (semantic tags, not folders)

## Phase 3: Action List (The dogfood tool)

- [x] Actions table in Supabase (id, user_id, title, status, priority, source, timestamps)
- [x] Actions page — list view with complete, defer, dismiss, reactivate
- [x] Add action manually (inline input)
- [x] Filter tabs (active, done, deferred, dismissed) with counts
- [x] Actions in sidebar nav
- [x] Claude chat → create actions (actions_create tool)
- [x] Claude chat → query actions (actions_list tool)
- [x] Claude chat → update actions (actions_update tool)
## Phase 4: Dogfood

- [x] Bulk import API (POST /api/notes/import) — owner-only
- [x] Import project docs — KB card system (replaced GitHub doc import, removed Session 16)
- [x] Flood personal todos into Actions (use chat → actions_create)
- [x] Use Fulkit daily for 1 week (active — CSV reconciliation, file uploads, integrations)
- [x] Build Fulkit features by chatting with Fulkit (active — using chat to drive dev)
- [x] Iterate based on friction (ongoing — file attach fix, blank data fix, message rendering)
- [x] Security hardening — dev mode bypass, BYOK encryption, prompt injection defense, memory caps, input validation
- [x] Threads elevation — kanban board (5 status columns, drag-and-drop), ThreadCard/ThreadBoard/ThreadDetail components, due dates with urgency dots, monochrome labels, checklist items (actions linked via thread_id)
- [x] Chat ↔ Threads ↔ Actions unification — threads_create tool, conversation_id plumbing through all tool executors, vault-writeback passes conversationId
- [x] Threads polish — monochrome urgency meter (stacked dots), /slash labels, overdue items dim + sink, quick-pick label chips, calendar timezone fix, proper URL slugs (/threads/work/calendar, /settings/owner/design)
- [x] Integration resilience audit — confirmed zero FK dependencies, graceful degradation via safeGet(), data persists through connect/disconnect cycles
- [x] Silent lifecycle features — overdue dimming, vault inventory in settings, vault export (GET /api/export + download button)

## Phase 5: Context Engine

- [x] Persistent memory — memory_save/list/forget tools, injected into system prompt
- [x] Note search — notes_search tool (keyword match on title + content)
- [x] Claude reads uploaded files as conversation context (vault context injection)
- [x] Cross-session context — recent conversation titles injected into system prompt
- [x] Smart memory behavior — Claude auto-saves facts, uses memories naturally
- [x] File/note uploads with embedding (vector search via pgvector) — embed route, auto-embed on create/update, batch embed endpoint
- [x] RAG pipeline — semantic similarity search (match_notes RPC, notes_search uses vector first with keyword fallback)
- [ ] Codebase ingestion — feed repo files so Claude knows the project (infrastructure ready — import + embed)
- [x] Run pgvector-setup.sql in Supabase + add OPENAI_API_KEY to Vercel

## Phase 5.5: Pricing & Payments -- DONE

- [x] Stripe integration — checkout, portal, billing, webhook (HMAC verified, 4 event types)
- [x] Subscriptions (Standard $9/mo, Pro $15/mo) + one-time credits ($2/100 msgs)
- [x] Fül counting — message tracking + dashboard gauge (Standard 450/mo, Pro 800/mo)
- [x] Fül cap enforcement — monthly reset, client gate, low-fuel warning, gauge colors, Bestie voice
- [x] Referral system — 6 tiers, code generation, claim flow, invoice offsets, cash payouts (Builder+)
- [x] Billing UI — plans, invoices, payment method, referral stats, owner P&L dashboard
- [x] Free trial tracking (30 days)
- [x] BYOK nudge whisper for heavy burners (system prompt injection at 80%+ usage)
- [x] Polish: "Fül up" inline prompt when empty (upgrade CTA + credits + BYOK in capped state)
- [x] Polish: Hot seat enforcement — last_message_date tracked in chat route, cron job at /api/cron/hot-seat (1st of month 7am UTC), warns then revokes inactive founder seats
- [x] Polish: Trial end UX (dashboard banner at ≤5 days + expired state, links to billing)
- [x] Polish: Cost ceiling check in chat route (already enforced — checkUserBudget + trackApiSpend in chat route, TODO was stale)

## Phase 6: MCP Integrations (plug in everything)

- [ ] Git — commit, push, diff, branch from chat
- [ ] Spotify — play/pause, playlists, focus mode
- [ ] Google Calendar — create events, check schedule
- [ ] Gmail — read, draft, send
- [ ] Obsidian / markdown vaults — sync notes bidirectionally
- [ ] Stripe — check revenue, manage subscriptions
- [ ] Vercel — deploy status, logs, rollback
- [ ] Custom MCP server scaffold — template for adding any new service

## Phase 7: Fulkit Builds Fulkit

- [ ] Claude can read/write project files through chat
- [ ] Claude can run commands (build, test, deploy)
- [ ] Code review and PR creation from chat
- [ ] Full dev loop inside Fulkit — no terminal, no IDE, no tab switching
- [ ] Prove the thesis: one surface for your entire life

---

## Fabric Isolation (Multi-API Music Player)

- [x] Abstract Spotify-specific calls behind a provider interface (Session 16 — SpotifyProvider class, fabric-server.js dispatcher, DB migration spotify_id → source_id + provider column)
- [x] Unified player architecture — PlaybackEngine.js polymorphic wrapper, engines/SpotifyEngine.js, makeTrackUri/makePlaylistUri helpers, connectedProviders state
- [ ] Isolate Fabric as standalone feature (like Threads) — own routes, own lib, own components
- [ ] SoundCloud API integration (pending — Artist Pro account + API approval needed)
- [ ] Apple Music API integration

---

## Security Audit -- DONE

- [x] JWT signature bypass — removed unsigned JWT fallback in fabric/connect + stripe/connect
- [x] Rate limiting — middleware.js with sliding window (chat 15/min, checkout 5/min, referral 3/min, default 60/min)
- [x] Security headers — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- [x] Chat input limits — max 100 messages, max 200KB payload
- [x] Error info leakage — generic messages in numbrly/connect, truegauge/connect, account/data, og-upload
- [x] RLS hardening — vault_broadcasts policy scoped (was permissive `true`), core tables verified
- [x] OG upload hardening — 5MB file size limit, extension whitelist (png, jpg, gif, webp)
- [x] Broadcasts/active documented as intentionally public (announcement channel only)
- [x] Fabric/token documented (Spotify SDK requires client-side token, auth-gated)
- [x] OAuth token encryption at rest — AES-256-GCM for all 9 providers (lib/token-crypt.js shared utility)
- [x] Content Security Policy — strict CSP enforced in middleware (tested Report-Only, flipped to enforcing)
- [x] Upstash Redis rate limiting — distributed sliding window, survives deploys + scaling (AWS, free tier)
- [x] Error leakage sweep — sealed err.message in 6 remaining routes (embed, feedback, events, rsg, numbrly, webhook)
- [x] Security documentation — md/security.md (Goldman Sachs brag doc)
- [x] Security page — /security public page with full architecture
- [x] Landing page trust section — 6-item security grid + competitive grid row + footer link
- [x] Final two-agent audit — every claim verified against code, zero aspirational statements

## Next 10 — Performance & Polish

- [x] Actions button feedback — loadingIds Set, disabled+opacity on all async buttons (checkbox, menu, priority, bucket), addingInProgress guard
- [x] Chat latency — vault token budget 100K → 25K, client-side context cap at 15 items (was unlimited, server was silently dropping past 20)
- [x] Chat latency — GitHub enrichment moved from blocking system prompt (10s) to on-demand github_fetch_files tool call
- [x] Chat latency — parallelized 7 server-side queries via Promise.all (prefs, convos, broadcasts, owner docs, referral, integration tokens, Stripe prices). Deduped getStripePrices() (was called twice)
- [x] CSP production test — verified zero console violations in production (Session 18)
- [x] Upload security.md to Fulkit KB — inserted into vault_broadcasts (owner-context, id: d258acc3)
- [x] "Fül up" inline prompt — capped state now shows upgrade CTA (plan or credits) + BYOK fallback instead of just BYOK link
- [x] Trial end UX — dashboard banner when trial ends or has ≤5 days remaining, links to billing, dismissible
- [ ] Spotify Extended Quota Mode — request from Spotify developer dashboard (currently only Collin's account works)
- [ ] Seamless page transitions — verify cold start splash + warm nav fade-in working correctly in production (check after next deploy)

## Prelaunch

- [x] Fül cap enforcement — monthly reset, client gate, gauge colors, Bestie voice copy
- [x] Stripe integration — subscriptions (Standard $9/mo, Pro $15/mo), webhook → flip seat_type, checkout/portal flow
- [x] Free trial flow — 30 days free (100 msgs/mo, all features)
- [x] handle_new_user trigger — set seat_type='free' explicitly on signup (scripts/handle-new-user-trigger.sql)
- [x] Fabric auto-analyze (dev) — launchd plist every 5 min, runs batch-analyze.mjs --limit 10
- [ ] Fabric auto-analyze (production) — $5/mo VPS with yt-dlp + ffmpeg, daemon watches for pending tracks. Shared DB = analyze once, serve all users.
- [x] Public mixes — gate: all tracks must have status='complete' before publish
- [ ] Spotify App — request Extended Quota Mode (currently Development Mode, only Collin's account)
- [ ] Domain verification for Spotify OAuth redirect URI

---

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core features~~ → ~~Onboarding~~ → ~~Owner role~~ → ~~Context gate~~ → ~~Actions~~ → ~~Dogfood~~ → ~~Context engine~~ → ~~Pricing~~ → ~~Security audit~~ → **Prelaunch** → MCP integrations → Self-building.
