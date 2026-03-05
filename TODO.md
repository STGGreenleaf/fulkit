# Fulkit — Master Action List

> Get live. Dogfood. Iterate.

---

## Phase 1: Deploy (Get it live) -- DONE

- [x] Set up Vercel project — connect repo, deploy Next.js app to fulkit.app
- [x] Configure domains — fulkit.app DNS to Vercel, fullkit.app 308 redirect
- [x] Add environment variables — ANTHROPIC_API_KEY, Supabase keys to Vercel
- [x] Verify build passes clean — next build with zero errors

## Phase 2: Real Auth + Database (Make it real) -- IN PROGRESS

- [x] Create Supabase project — Postgres + Auth + RLS
- [x] Set up Supabase Auth — Google OAuth + email magic link
- [x] Design + run migrations — profiles, preferences, actions, notes, referrals tables with RLS
- [x] Replace mock auth — lib/auth.js now uses Supabase Auth with dev mode overrides
- [x] Add Supabase env vars to Vercel — URL + anon key + service role key
- [x] Configure Supabase URL settings — Site URL = https://fulkit.app, redirect URLs added
- [x] Switch to @supabase/ssr — createBrowserClient for proper Next.js session handling
- [ ] **FIX: Google OAuth sign-in not establishing session** — redirects to /landing after callback
- [ ] Create real account — first Google sign-in (blocked by auth bug)
- [ ] Set Collin as owner — `UPDATE public.profiles SET role = 'owner' WHERE email = '<gmail>';`
- [ ] Test magic link delivery

## Phase 3: Action List Feature (The dogfood tool)

- [ ] Build actions table in Supabase — id, user_id, title, status, priority, source, created_at, completed_at
- [ ] Build Actions page/component — list view with complete, defer, dismiss controls
- [ ] Import prelaunch.md tasks — parse the checklist into real action items
- [ ] Wire Claude chat -> action creation
- [ ] Wire Claude chat -> action queries

## Phase 4: Dogfood (Fulkit manages Fulkit)

- [ ] Import buildnotes.md, design.md, features.md as notes
- [ ] Flood personal todos into Actions
- [ ] Use Fulkit daily for 1 week
- [ ] Iterate based on friction

---

**Critical path:** ~~Deploy~~ → ~~Supabase~~ → **Fix Auth** → Owner role → Actions table → Actions UI → Import tasks → Go.
