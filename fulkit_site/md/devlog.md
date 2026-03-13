# Fulkit — Dev Log

> Claude Code reads this at the start of every session.
> Newest entries at top. Completed items get archived monthly.

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
