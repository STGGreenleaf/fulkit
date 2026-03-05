# Fülkit — Master Action List

> Get live. Dogfood. Iterate.

---

## Phase 1: Deploy (Get it live)

- [ ] Set up Vercel project — connect repo, deploy Next.js app to Fulkit.app
- [ ] Configure domains — point Fulkit.app DNS to Vercel, set up FullKit.app → Fulkit.app redirect
- [ ] Add environment variables — `ANTHROPIC_API_KEY` (Claude) to Vercel env vars
- [ ] Verify build passes clean — `next build` with zero errors before first deploy

## Phase 2: Real Auth + Database (Make it real)

- [ ] Create Supabase project — Postgres + Auth + Storage
- [ ] Set up Supabase Auth — email magic link (no passwords for MVP)
- [ ] Design + run migrations — users, notes, preferences tables (see prelaunch.md schema)
- [ ] Replace mock auth — swap `lib/auth.js` from React state → Supabase Auth
- [ ] Create your account — collin@fulkit.app, first real user
- [ ] Add Supabase env vars to Vercel — URL + anon key

## Phase 3: Action List Feature (The dogfood tool)

- [ ] Build actions table in Supabase — id, user_id, title, status, priority, source, created_at, completed_at
- [ ] Build Actions page/component — list view with complete, defer, dismiss controls
- [ ] Import prelaunch.md tasks — parse the checklist into real action items in your account
- [ ] Wire Claude chat → action creation — "add to my list: deploy to Vercel" creates an action item
- [ ] Wire Claude chat → action queries — "what's on my list?" pulls your actions into context

## Phase 4: Dogfood (Fülkit manages Fülkit)

- [ ] Import buildnotes.md, design.md, features.md as notes — Fülkit's own docs become your knowledge base
- [ ] Flood your personal todos — everything you're tracking goes into Actions
- [ ] Use Fülkit daily for 1 week — chat with Chappie about the build, manage tasks, capture ideas
- [ ] Iterate based on friction — whatever feels off, fix it

---

**Critical path:** Deploy → Supabase → Real Auth → Actions table → Actions UI → Import tasks → Go.
