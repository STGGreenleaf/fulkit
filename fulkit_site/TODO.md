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
- [ ] Test magic link delivery

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
- [ ] Export wires to real data (markdown dump)
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
- [ ] Import prelaunch.md tasks as action items (can now do via chat)

## Phase 4: Dogfood

- [ ] Import buildnotes.md, design.md, features.md as notes
- [ ] Flood personal todos into Actions
- [ ] Use Fulkit daily for 1 week
- [ ] Build Fulkit features by chatting with Fulkit (dogfood the dev loop)
- [ ] Iterate based on friction

## Phase 5: Context Engine

- [ ] File/note uploads with embedding (vector search)
- [ ] Claude reads uploaded files as conversation context
- [ ] Codebase ingestion — feed repo files so Claude knows the project
- [ ] Persistent memory — Claude remembers across conversations
- [ ] RAG pipeline — retrieve relevant notes/files per query

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

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core features~~ → ~~Onboarding~~ → ~~Owner role~~ → ~~Context gate~~ → ~~Actions~~ → **Dogfood** → Context engine → MCP integrations → Self-building.
