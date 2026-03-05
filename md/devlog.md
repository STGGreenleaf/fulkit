# Fulkit — Dev Log

---

## Session 1 — 2026-03-04/05: Scaffold Complete

### What was built
- **10 routes**: `/` (redirect), `/landing`, `/login`, `/home`, `/chat`, `/hum`, `/notebook`, `/settings`, `/onboarding`, `/owner`
- **Design token system**: Full CSS custom properties for colors, spacing, typography, radii, shadows, transitions — all in `app/globals.css`, documented in `md/design.md`
- **Component library**: Sidebar, AuthGuard, MiniPlayer — all inline styles using design tokens
- **Supabase Auth**: Google OAuth + email magic link, session management via `onAuthStateChange`
- **Database schema**: `profiles`, `preferences`, `actions`, `notes`, `referrals` tables with RLS policies
- **Auto-profile trigger**: `handle_new_user()` creates profile row on first sign-in
- **Owner portal**: `/owner` route with Dashboard, Design, Users, Socials, OG Creator tabs — role-gated
- **Dev mode overrides**: `?auth=dev` (template data), `?auth=new` (onboarding), `?auth=none` (signed out)
- **Real data flow**: `/home` fetches actions + notes from Supabase, shows empty states for new users
- **Source integrations UI**: Settings page with Obsidian, Google Drive, Notion, Apple Notes, Numbrly, TrueGauge (custom SVG logos)

### Decisions locked
- `app/app/` nested structure is intentional — Vercel root = `app/`, App Router = `app/app/`
- Inline styles only, no CSS framework
- All visual values via design tokens — no hardcoded values
- `profiles.role = 'owner'` gates the owner portal
- Seat limits: free=100, standard=450, pro=800 messages/month
- 308 permanent redirect: fullkit.app -> fulkit.app

### Config reference
- **Vercel**: Framework Preset = Next.js, Root Directory = `app`
- **Supabase project**: `zwezmthocrbavowrprzl`
- **Domains**: fulkit.app (primary), fullkit.app (308 redirect)
- **Env vars** (Vercel + .env.local): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
- **Google OAuth**: configured in Supabase Auth providers, redirect URI points to Supabase callback

### Known issues
- Magic link delivery needs testing — user reported past issues with receiving them
- Supabase Site URL and Redirect URLs need verification in Auth settings
- Google Cloud Console redirect URI needs verification
- Owner role must be set manually after first Google sign-in: `UPDATE public.profiles SET role = 'owner' WHERE email = '<gmail>';`

### What's next
- Set Collin as owner after first real sign-in
- Pressure test magic link delivery
- Build out chat interface with Claude API
- Connect real data sources (Obsidian, Google Drive)
- Owner portal: populate Design, Users, Socials, OG Creator tabs
