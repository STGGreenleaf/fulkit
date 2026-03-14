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
- [ ] Expandable rows — click to see every item Fulkit knows
  - Notes: title, source, date
  - Conversations: title, date (after Phase 2.6)
  - Learned preferences: key/value with toggle to forget
  - Onboarding answers: view/edit what you told Fulkit
- [ ] Real storage used (Supabase query)
- [x] Export wires to real data (JSON vault export via /api/export)
- [ ] Delete wires to real data (cascade with confirmation)

## Phase 2.6: Chat Persistence + Recall Rail

- [x] Conversations table (id, user_id, title, created_at, updated_at)
- [x] Messages table (id, conversation_id, role, content, created_at)
- [x] Auto-save every message to DB as it streams
- [x] Auto-title conversations (first message truncated to 60 chars)
- [x] Click to resume any past conversation (History panel)
- [ ] Right rail — contextual recall strip, not a conversation list
  - Last ~10 topics as filter chips (auto-tagged from conversation content)
  - Click a chip to surface every conversation where that topic came up
  - Quick-reference for part numbers, addresses, names mentioned recently
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
- [x] Import project docs — owner portal button fetches from GitHub + imports as notes
- [ ] Flood personal todos into Actions (use chat → actions_create)
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
- [ ] File/note uploads with embedding (vector search via pgvector)
- [ ] Codebase ingestion — feed repo files so Claude knows the project
- [ ] RAG pipeline — semantic similarity search (requires embeddings)

## Phase 5.5: Pricing & Payments

- [ ] Set up Stripe integration (subscriptions + one-time purchases)
- [x] Fül counting — message tracking + dashboard gauge (Standard 450/mo, Pro 800/mo)
- [x] Fül cap enforcement — monthly reset, client gate, low-fuel warning, gauge colors, Bestie voice
- [ ] "Fül up" prompt when empty — buy credits ($2/100 messages)
- [ ] Hot seat mechanic — 4 msgs/month threshold, 30-day auto-revoke
- [ ] Referral credit system — $1/mo per active referral (credits not cash)
- [ ] Referral page in settings — link, active referrals, credit balance
- [ ] BYOK nudge whisper for heavy burners

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

- [ ] Abstract Spotify-specific calls behind a provider interface
- [ ] Isolate Fabric as standalone feature (like Threads) — own routes, own lib, own components
- [ ] SoundCloud API integration
- [ ] Apple Music API integration
- [ ] Unified player that works across all music APIs

---

## Prelaunch

- [x] Fül cap enforcement — monthly reset, client gate, gauge colors, Bestie voice copy
- [ ] Stripe integration — subscriptions (Standard $7/mo, Pro $15/mo), webhook → flip seat_type, checkout/portal flow
- [ ] Free trial flow — 30 days free (100 msgs/mo, all features), auto-prompt to subscribe at expiry
- [ ] handle_new_user trigger — set seat_type='free' explicitly on signup (currently NULL → defaults to free via code)
- [ ] Fabric auto-analyze (dev) — Mac launchd cron, every 5 min, processes pending tracks
- [ ] Fabric auto-analyze (production) — $5/mo VPS with yt-dlp + ffmpeg, daemon watches for pending tracks. Shared DB = analyze once, serve all users.
- [ ] Public mixes — ensure all tracks in a crate are analyzed before it can be published
- [ ] Spotify App — request Extended Quota Mode (currently Development Mode, only Collin's account)
- [ ] Domain verification for Spotify OAuth redirect URI

---

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core features~~ → ~~Onboarding~~ → ~~Owner role~~ → ~~Context gate~~ → ~~Actions~~ → **Dogfood** → Context engine → **Pricing** → MCP integrations → Self-building.
