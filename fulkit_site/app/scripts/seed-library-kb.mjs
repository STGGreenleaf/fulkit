#!/usr/bin/env node
// v3 Phase 1: Stock the Library shelves — owner-context KB articles
// Run: node scripts/seed-library-kb.mjs
// Safe to re-run: upserts by title

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const docs = [
  {
    title: "Architecture Map",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `FULKIT ARCHITECTURE (owner reference, updated 2026-03-27)

Nervous system: app/api/chat/route.js (~5200 lines)
  Auth → tier resolution → system prompt assembly → tool registration → streaming loop → post-response signals

System prompt: 40K token budget. Static BASE_PROMPT (~385 tokens) in cached block. Dynamic content (date, context, memories, hints) in uncached block. Cache target: 60-70% hit rate.

Tier cascade: BYOK/Owner → Opus 128K. Pro → Sonnet 4K. Standard → Sonnet 2K.

Tool loading: two keyword-gated systems (module-scope, default zero):
- ECOSYSTEM_KEYWORDS (21 entries) → ECOSYSTEM_TOOLS (19 integration tool sets). Only matching ecosystems load.
- WORLD_KEYWORDS (7 categories) → WORLD_TOOL_MAP (13 invisible tools). Only matching categories load.
- Core tools always load: actions (3), memory (3), notes (4), threads (1), KB (1) = 12 tools.
- Habit Engine boosts at 0.6 confidence + frequency 3.

Integration pattern: connect → callback → status → disconnect. Tokens in integrations table. Server-side refresh on expiry. safeGet() wraps token fetches. 19 OAuth chat integrations + Spotify (Fabric-only).

Location intelligence: user memory → IP fallback → Nominatim geocoding with server-side cache. Feeds weather, sun, air quality tools automatically.

Post-response (fire-and-forget): DB saves, Spend Moderator (spend_log + 12 spend_flags), Audit Loop (doc_stale + freshness check), Habit Engine pattern logging, ecosystem prefetch.

Key libs: auth.js (AuthProvider, PKCE), vault.js (3 storage modes), use-chat.js (streaming hook), cost-guard.js (pricing, budget, circuit breaker), signal-server.js (fire-and-forget signals), fabric-server.js (Spotify tokens), google-server.js (Calendar + Gmail + Drive unified OAuth).

Key APIs: /api/owner/spend (cost aggregation + period comparison), /api/owner/heartbeat (composite health pulse), /api/owner/signals (Radio feed).

Known failure modes: follow-up hangs (must fire-and-forget), stream disconnects (try/catch finalMessage), context timeout (10s cap), double-send (use ref not state), tool execution (15s/tool, 50s total).`,
  },
  {
    title: "Integration Registry",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `INTEGRATION STATUS (owner reference, updated 2026-03-27)

Chat integrations (19 OAuth, keyword-gated):
Business — Square (16 tools), Stripe (8), Shopify (6), Toast (6), QuickBooks (5), Numbrly (10), TrueGauge (15).
Productivity — Trello (7), Notion (3), Slack (3), Todoist (2), OneNote (3), Readwise (2), Dropbox (2).
Google Suite — Calendar (4), Gmail (2), Google Drive (3). Unified OAuth, one Settings card.
Dev & Health — GitHub (1), Fitbit (4).

Music (Fabric-only) — Spotify. Extended quota approved (5-seat). No chat tools — Fabric page only.

Invisible intelligence (12 APIs, 13 tools, keyword-gated via WORLD_KEYWORDS):
weather, sun times, air quality, food nutrition (USDA + Open Food Facts), books (Open Library), currency, dictionary, geocoding (Nominatim + cache), Wikipedia, NASA APOD, Wolfram Alpha, news (Currents), breach check (HIBP).

Core tools (always loaded): actions (3), memory (3), notes (4), threads (1), KB search (1) = 12 tools.

Total: 19 chat + Spotify + 12 invisible + 12 core = 44 tool definitions. Typical message loads ~10.

Pending: SoundCloud (API access), Apple Music (MusicKit), Sonos, Linear, Vagaro, Whoop, Oura, Strava, Garmin.
Pending reviews: Google verification (4-6 weeks), Dropbox production (auto after 50 users).

Pattern: Each = OAuth flow + integrations table + server refresh + ECOSYSTEM_TOOLS entry + ECOSYSTEM_KEYWORDS entry.`,
  },
  {
    title: "File-to-Problem Map",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `FILE MAP (owner reference, updated 2026-03-27)

Chat bugs → app/api/chat/route.js (streaming loop, tool executor, post-response)
Auth issues → lib/auth.js + app/api/auth/callback/route.js
Vault problems → lib/vault.js + vault-local.js + vault-crypto.js + vault-fulkit.js
Cost/spend → lib/cost-guard.js + app/api/owner/spend/route.js
Signal Radio → lib/signal.js + lib/signal-server.js + app/owner/page.js (RadioTab + SpendModeratorSection)
Sidebar/nav → components/Sidebar.js (compact mode, tooltip, mini player)
Onboarding → app/onboarding/page.js + md/bestie-test.md
Owner portal → app/owner/page.js (dashboard, design, users, socials, pitches, fabric, radio, developer)
Settings → app/settings/page.js (profile, vault, integrations, AI, appearance, about)
Chat context → lib/use-chat.js (streaming) + lib/use-chat-context.js (vault assembly)
Conversation compression → route.js compressConversation() + lib/conversation-summary.js
KB system → executeKbSearch() in route.js + vault_broadcasts table
Spend Moderator → route.js spend_log/spend_flag + /api/owner/spend + SpendModeratorSection

Integrations (all follow connect/callback/status/disconnect):
Square → lib/square-server.js + api/square/*
Stripe → lib/stripe-server.js + api/stripe/*
Shopify → lib/shopify-server.js + api/shopify/*
Toast → lib/toast-server.js + api/toast/*
Trello → lib/trello-server.js + api/trello/*
GitHub → lib/github.js + api/github/*
Numbrly → lib/numbrly.js + api/numbrly/*
TrueGauge → lib/truegauge.js + api/truegauge/*
Google (Cal/Gmail/Drive) → lib/google-server.js + api/google/*
Fitbit → lib/fitbit-server.js + api/fitbit/*
QuickBooks → lib/quickbooks-server.js + api/quickbooks/*
Notion → lib/notion-server.js + api/notion/*
Dropbox → lib/dropbox-server.js + api/dropbox/*
Slack → lib/slack-server.js + api/slack/*
OneNote → lib/onenote-server.js + api/onenote/*
Todoist → lib/todoist-server.js + api/todoist/*
Readwise → lib/readwise-server.js + api/readwise/*
Spotify/Fabric → lib/fabric-server.js + api/fabric/*

World/invisible tools → route.js (WORLD_TOOLS, WORLD_KEYWORDS, WORLD_TOOL_MAP)
Location intelligence → route.js (memory → IP → Nominatim geocode, server cache)`,
  },
  {
    title: "Spec Index",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `SPEC INDEX (owner reference, updated 2026-03-27)

CLAUDE.md — architecture map for Claude Code (rules, structure, stack, patterns)
md/buildnotes.md — product spec, features, architecture, pricing
md/design.md — visual system, tokens, brand identity, about-page copy
md/trust-model.md — vault architecture, storage models A/B/C, security spec
md/signal-radio.md — Signal Radio spec, signal inventory, tuning guide
md/numbrly-spec.md — Numbrly API + display/formatting rules
md/truegauge-spec.md — TrueGauge API + integration guide
md/bestie-test.md — onboarding test script
md/Audio_Crate/audio-spec.md — Signal Terrain + fullscreen viz
md/Audio_Crate/crate-spec.md — Crate & Mix system (DJ metaphor)
md/Audio_Crate/audio-todo.md — audio system roadmap
md/pitches.md — all slugged pitches, taglines, CTAs (audited + new)
md/v3-spec.md — v3 Cognizant Layer spec (Library, Heartbeat, Audit Loop, Bridge, cost laws)
TODO.md — master action list
last-session.md — session bridge (5-line TL;DR, read by chat via github_fetch_files)`,
  },
  {
    title: "Recent Changes",
    channel: "owner-context",
    subtype: "doc",
    tag: "session",
    content: `LAST SESSION: Session 23 (2026-03-26 to 2026-03-27)
Scope: Integrations blitz, invisible intelligence, Sources UX, signal fixes, pitches

Shipped:
- 12 new OAuth integrations wired: Fitbit, QuickBooks, Notion, Dropbox, Slack, OneNote, Todoist, Readwise + Google Calendar, Gmail, Google Drive (unified OAuth). Total: 19 chat + Spotify.
- 12 invisible intelligence APIs: weather, sun, air quality, food (USDA+OFF), books, currency, dictionary, geocoding (Nominatim+cache), Wikipedia, NASA, Wolfram, news, breach check. Keyword-gated via WORLD_KEYWORDS (default zero, same pattern as ECOSYSTEM_KEYWORDS).
- Inbox Triage: drop any file → AI reads → triage card → file/discuss/extract/connect.
- Unified ThreadCalendar: Google Calendar + Trello events on grid, drag-to-folder with "all like it" mapping.
- Location intelligence: user memory → IP fallback → Nominatim geocoding with server cache.
- Sources UX redesign: search bar, waitlist tickets, suggestion input, 2-column examples, verification warnings.
- Manual redesign: "the manual is the chat" + Try Asking (32 prompts) + Quick Reference with hotkeys.
- Global hotkeys: Cmd+N (new chat), Cmd+H (home), Cmd+J (threads), Cmd+Shift+C (side chat window).
- 25 new pitches across Invisible Intelligence, Integrations, Health, Calendar categories.
- Landing page: unsourced stats removed, shipped features updated.

Integration count: 19 user-facing + Spotify + 12 invisible = 32 capabilities.
Open: Google verification (4-6 weeks), Dropbox review, compression testing (8.1-8.5).
Next: KB freshness loop, Signal Terrain 7-wave rewrite, /recover cleanup, compression testing.`,
  },
];

async function seed() {
  console.log("Stocking Library shelves (owner-context)...\n");

  for (const doc of docs) {
    // Upsert: delete existing by title + channel, then insert
    await supabase
      .from("vault_broadcasts")
      .delete()
      .eq("title", doc.title)
      .eq("channel", "owner-context");

    const { data, error } = await supabase
      .from("vault_broadcasts")
      .insert(doc)
      .select()
      .single();

    if (error) {
      console.error(`FAILED: ${doc.title} — ${error.message}`);
    } else {
      console.log(`OK: ${doc.title} (id: ${data.id})`);
    }
  }

  console.log("\nLibrary stocked. Owner can now search these via kb_search.");
}

seed();
