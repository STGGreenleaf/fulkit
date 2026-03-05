# Fulkit — Dev Log

> Claude Code reads this at the start of every session.
> Newest entries at top. Completed items get archived monthly.

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
