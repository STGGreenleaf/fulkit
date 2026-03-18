# Fulkit — Completed Phases (Archive)

> Archived 2026-03-18 (Session 18). All phases below are DONE.
> This file preserves the build history. The active TODO is at `fulkit_site/TODO.md`.

---

## Phase 1: Deploy

- [x] Vercel project + fulkit.app DNS
- [x] fullkit.app 308 redirect
- [x] Environment variables on Vercel
- [x] Clean build

## Phase 2: Auth + Database

- [x] Supabase project (Postgres + Auth + RLS)
- [x] Google OAuth + email magic link
- [x] DB migrations (profiles, preferences, actions, notes, referrals)
- [x] Real auth in lib/auth.js with dev mode overrides
- [x] Supabase env vars on Vercel
- [x] PKCE auth callback — code exchange, error display
- [x] Google OAuth confirmed working (sign in → dashboard → sign out loop)
- [x] Collin's account created, role=owner, onboarded=true
- [x] Magic link sign-in (code + UI complete — signInWithOtp + login page email flow)
- [x] Test magic link delivery (confirmed — Supabase email received at collin@fulkit.app)

## Phase 2.1: Core Features

- [x] Streaming chat (Claude Sonnet 4.6, SSE)
- [x] Smart root route (`/` → dashboard or landing)
- [x] Google Search Console verification
- [x] Brand mark locked (umlaut2.png)
- [x] D-DIN + JetBrains Mono fonts (WOFF2, no 404s)
- [x] Sign out → landing redirect
- [x] Privacy + Terms pages

## Phase 2.2: Onboarding System

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
- [x] Real storage used (Supabase query — notes + messages content size)
- [x] Export wires to real data (JSON vault export via /api/export)
- [x] Delete wires to real data (cascade with confirmation — type DELETE modal)

## Phase 2.6: Chat Persistence + Recall Rail

- [x] Conversations table (id, user_id, title, created_at, updated_at)
- [x] Messages table (id, conversation_id, role, content, created_at)
- [x] Auto-save every message to DB as it streams
- [x] Auto-title conversations (first message truncated to 60 chars)
- [x] Click to resume any past conversation (History panel)
- [x] Right rail — contextual recall strip with topic filter chips

## Phase 3: Action List

- [x] Actions table in Supabase
- [x] Actions page — list view with complete, defer, dismiss, reactivate
- [x] Add action manually (inline input)
- [x] Filter tabs (active, done, deferred, dismissed) with counts
- [x] Claude chat → create/query/update actions

## Phase 4: Dogfood

- [x] Bulk import API, KB card system, personal todos
- [x] Daily use for 1 week, iterate on friction
- [x] Security hardening, Threads elevation, chat unification
- [x] Integration resilience audit, silent lifecycle features

## Phase 5: Context Engine

- [x] Persistent memory, note search, file uploads, cross-session context
- [x] RAG pipeline (pgvector + Voyage AI embeddings)
- [x] Codebase ingestion (214 files, 420 notes embedded)

## Phase 5.5: Pricing & Payments

- [x] Stripe integration, subscriptions, Fül counting + cap enforcement
- [x] Referral system (6 tiers, payouts), billing UI, free trial
- [x] Hot seat enforcement, trial end UX, cost ceiling, BYOK nudge

## Security Audit

- [x] JWT bypass fix, rate limiting (Upstash Redis), security headers
- [x] CSP enforced, AES-256-GCM token encryption, RLS hardening
- [x] Error leakage sealed, security page + docs, two-agent final audit

## Performance & Polish (Next 10)

- [x] Actions button feedback (loadingIds), chat latency x3
- [x] CSP production test, security KB upload
- [x] "Fül up" inline prompt, trial end UX, seamless page transitions
- [x] Combined owner dashboard endpoint, user-keyed rate limiting
- [x] Missing DB column fix (scheduled_for), batch embed fix

---

**Sessions 1–18 | 2025–2026**
