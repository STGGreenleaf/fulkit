# CLAUDE.md — Fulkit Dev Context

## First thing every session
1. Read `md/devlog.md` — session history, decisions, what's next
2. Read `md/design.md` — visual system, tokens, guardrails
3. Read `md/buildnotes.md` — product spec, architecture, pricing

## Rules
- Every color, font, spacing value uses design tokens from `app/app/tokens.css`. No hardcoded values.
- **Warm monochrome only.** The palette is one warm-grey family (#2A2826 → #EFEDE8). The only color allowed is functional: semantic states (success/warning/error) and source indicators. No decorative color. No accent hues. No brand colors on UI elements. If it's not a status signal, it's grey.
- Brand name is **Fulkit** (with umlaut). Code identifiers and URLs use fulkit (no umlaut).
- Never write "FulKit", "FULKIT", "FullKit", or "Ful-kit".
- Sub-features use their proper names: **The Hum**, **Whispers**, **Ful Gauge**.
- **B-Side is the music persona on /fabric ONLY.** It is NOT the main chat persona. B-Side = record store guy = BTC (Behind the Counter). It lives exclusively on `/fabric` and `/api/fabric/`. The main Fülkit chat has no persona name — it's just "Fülkit". Never reference B-Side when discussing the main chat, business tools, or general features.
- Inline styles only — no CSS modules, no Tailwind, no styled-components.
- CTAs are always full-width block `<Link>` buttons — `display: "block"`, `width: "100%"`, `textAlign: "center"`. No email inputs, no forms. One solid bar.
- The Fulkit logo/wordmark in any nav always links to `/`.
- Never remove the LogoMark circle logo from the Sidebar.
- **Auto-checkpoint before context compression**: Update `md/devlog.md` with session work, `TODO.md` with completed items, `last-session.md` with 5-line TL;DR (date, scope, shipped, open, next), and commit. Never cold start. This is non-negotiable.
- Before context clears, always write a session summary to `md/devlog.md`.

## Project Structure
```
fulkit/                        # Monorepo root (git root)
  fulkit_site/                 # This project
    app/                       # Next.js project root (Vercel root directory)
      app/                     # Next.js App Router pages
        tokens.css             # Design tokens (CSS custom properties)
        globals.css            # Global resets, imports tokens.css
        actions/               # Actions page (tasks + status tracking)
        chat/                  # Chat page (B-Side conversations)
        home/                  # Dashboard
        settings/              # Settings (6 tabs: profile, vault, integrations, AI, appearance, about)
        owner/                 # Owner portal (dashboard, design, users, socials, OG, fabric)
        fabric/                # Signal Terrain — audio visualization
        hum/                   # The Hum — voice capture
        landing/               # Public landing page
        login/                 # Auth entry point
        onboarding/            # New user flow
        about/, privacy/, terms/, wtf/  # Static pages
        api/                   # API routes (see Architecture below)
      components/              # 12 shared components
      lib/                     # 25 modules (see Architecture below)
      public/                  # Static assets
    md/                        # Project docs (see Doc Index below)
      Audio_Crate/             # Music/audio specs
      archive/                 # Consolidated originals (reference only)
    assets/                    # Source logos, brand assets, fonts
  ChappieBrain/                # Obsidian vault (gitignored, not deployed)
```

## Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (Auth + Postgres + RLS)
- Claude API (chat, whispers)
- Vercel (hosting)
- D-DIN font (swap to DIN Pro when licensed)
- No component library — everything custom

## Architecture

### Chat Route (`app/api/chat/route.js` — the nervous system)
This is the most complex file (~3500 lines). The flow:
1. **Auth + tier resolution**: `getUser()` → role/seatType → `getModelConfig()` picks model + limits
2. **System prompt assembly**: BASE_PROMPT + user prefs + memories + vault context + conversation history + GitHub enrichment + integration tools
3. **Tool registration**: keyword-gated via `ECOSYSTEM_KEYWORDS`. Default = zero integration tools. Only ecosystems matching user message keywords get loaded. Core tools (actions, memory, notes, threads, KB) always load.
4. **Streaming loop**: Claude API streaming → tool calls → tool execution → continue (max 5 rounds, 15s/tool, 50s total)
5. **Post-response**: fire-and-forget DB saves (conversation, message count), Spend Moderator signals (spend_log + spend_flag), Habit Engine patterns, keep-alive pings during tool execution
6. **System prompt caching**: Static BASE_PROMPT in its own ephemeral cache block; dynamic content (date, context, memories, hints) in a separate uncached block. Maximizes cache hit rate.

**Tier cascade (BYOK + role → model):**
- BYOK+Owner or BYOK → Opus 128K
- Owner → Opus 128K
- Pro → Sonnet 4K
- Standard → Sonnet 2K

### Lib Modules
| Module | Purpose |
|--------|---------|
| `auth.js` | AuthProvider, useAuth(), Google OAuth PKCE, session management |
| `supabase.js` | Client-side Supabase instance |
| `supabase-server.js` | Server-side admin client (service role key) |
| `vault.js` | VaultProvider — storage mode selector (local/encrypted/fulkit) |
| `vault-local.js` | Model A: browser-only IndexedDB storage |
| `vault-crypto.js` | Model B: encrypted sync with passphrase |
| `vault-fulkit.js` | Model C: Fulkit-managed Supabase storage |
| `vault-idb.js` | IndexedDB operations (notes + sandbox chapters) |
| `vault-tokens.js` | Message budget tracking |
| `vault-writeback.js` | Extract artifacts (actions, decisions, plans, facts) from conversations |
| `conversation-summary.js` | Conversation compression with structured summaries |
| `sandbox.js` | SandboxProvider — chapter-based planning workspace (20-turn auto-close) |
| `use-chat.js` | useChat() hook — message sending, streaming, sandbox integration |
| `use-chat-context.js` | useChatContext() — vault context assembly for chat |
| `fabric.js` | FabricProvider — Signal Terrain audio visualization system |
| `fabric-server.js` | Server-side Fabric/Spotify token management |
| `github.js` | GitHub OAuth helpers, token fetch, API wrapper |
| `numbrly.js` | Numbrly API client (cost management) |
| `truegauge.js` | TrueGauge API client |
| `shopify-server.js` | Shopify OAuth + token management |
| `square-server.js` | Square OAuth + token management |
| `stripe-server.js` | Stripe OAuth + token management |
| `toast-server.js` | Toast POS integration |
| `sanitize-emoji.js` | Emoji sanitization for consistent rendering |
| `btc/` | B-Side response engine (persona + formatting rules) |

### API Routes
| Route | Purpose |
|-------|---------|
| `api/chat` | Main chat endpoint (streaming) |
| `api/byok` | BYOK key management (POST/GET/DELETE) |
| `api/notes` | Notes CRUD + import |
| `api/whispers` | Daily whisper generation |
| `api/github/*` | GitHub OAuth + file/tree/search |
| `api/numbrly/*` | Numbrly proxy (connect/callback/status/context/query) |
| `api/truegauge/*` | TrueGauge proxy (connect/callback/status/disconnect) |
| `api/square/*` | Square OAuth + proxy |
| `api/shopify/*` | Shopify OAuth + proxy |
| `api/stripe/*` | Stripe OAuth + proxy |
| `api/toast/*` | Toast POS integration |
| `api/fabric/*` | Spotify OAuth for Signal Terrain |
| `api/owner/spend` | Spend Moderator aggregation (summary + flags + period comparison) |
| `api/owner/heartbeat` | System health pulse (cost, errors, cache, integrations, doc freshness) |
| `api/rsg` | Random string generator |

### Integration Pattern
Every integration follows: `connect` → `callback` → `status` → `disconnect` + optional `context`.
- OAuth tokens stored in `integrations` table (Supabase)
- Server-side token refresh on expiry
- `safeGet(fn)` wraps token fetches: `.catch(() => null)` (never blocks chat)
- Chat route checks for connected integrations → registers matching tools

### Components
| Component | Purpose |
|-----------|---------|
| `AuthGuard.js` | Redirects unauthenticated users to /login |
| `Sidebar.js` | App navigation — compact (icon-only) / helper (labels) mode |
| `LogoMark.js` | Circle logo — always present in sidebar |
| `MessageRenderer.js` | Chat message rendering (markdown, code blocks, tables) |
| `MiniPlayer.js` | Compact Spotify controller (vertical micro buttons) |
| `SpotifyPlayer.js` | Full Spotify player widget |
| `VolumeSlider.js` | Audio volume control |
| `PassphraseModal.js` | Model B encryption passphrase entry |
| `StorageModeSelector.js` | Three-card vault mode picker (A/B/C) |
| `VaultGate.js` | Blocks access until vault is ready |
| `Tooltip.js` | Hover tooltip (200ms delay) for compact mode labels |
| `DevInspector.js` | Dev-mode debug overlay |

## Known Failure Modes
These have caused production bugs. Always follow these patterns:
- **Follow-up hangs**: All DB saves after streaming MUST be fire-and-forget (`.then(() => {}).catch(() => {})`)
- **Stream disconnects**: `stream.finalMessage()` needs try/catch — client may disconnect mid-stream
- **Context assembly timeout**: 10s cap on context assembly, non-fatal fallback to empty context
- **Supabase read timeouts**: Use `AbortSignal.timeout(5000)` on all Supabase reads in chat route
- **Double-send**: Check `streamingRef.current` (sync ref), NOT `streaming` state (async) — React state is stale in event handlers
- **Tool execution**: 15s timeout per tool, 50s total — long-running tools must not block the stream

## Common Patterns
- **Auth**: `getUser(request)` via Bearer token → `getSupabaseAdmin().auth.getUser(token)`
- **DB saves**: fire-and-forget `.then(() => {}).catch(() => {})`
- **Integration tokens**: `safeGet(fn)` wraps `.catch(() => null)`
- **New integration**: copy connect/callback/status/disconnect template from any existing integration, add tools to chat route `allTools` array
- **New page**: wrap in `<AuthGuard>` (app pages) or leave unwrapped (public pages)

## Doc Index (post-consolidation)
| File | Contents |
|------|----------|
| `md/buildnotes.md` | Product spec, features, architecture, pricing, file map |
| `md/design.md` | Visual system, tokens, brand identity, about-page copy |
| `md/trust-model.md` | Vault architecture, storage models A/B/C, security spec |
| `md/b-side.md` | B-Side persona (**fabric/music only** — not the main chat) |
| `md/numbrly-spec.md` | Numbrly API reference + display/formatting rules |
| `md/truegauge-spec.md` | TrueGauge API reference + integration guide |
| `md/bestie-test.md` | Onboarding test script |
| `md/devlog.md` | Session history (newest at top) — read first every session |
| `md/Audio_Crate/audio-spec.md` | Signal Terrain + Fabric audio system spec |
| `md/Audio_Crate/crate-spec.md` | Crate & Mix system (DJ metaphor, drag-to-crate, sets) |
| `md/Audio_Crate/audio-todo.md` | Audio system roadmap |
| `TODO.md` | Master action list with checkboxes |
| `md/signal-radio.md` | Signal Radio spec — signal inventory, knobs, Spend Moderator, heartbeat, audit loop |
| `md/v3-spec.md` | v3 Cognizant Layer — Library, Heartbeat, Audit Loop, Bridge, cost laws, 100-integration scaling |
| `last-session.md` | Session bridge — 5-line TL;DR for chat Fulkit (updated every checkpoint) |

## Sensitive
- Never log API keys, secrets, or credentials in any file
- Reference their existence ("ANTHROPIC_API_KEY is set in .env.local and Vercel") but never the values
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXT_PUBLIC_SITE_URL`
