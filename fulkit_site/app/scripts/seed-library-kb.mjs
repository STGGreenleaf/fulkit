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
    content: `FULKIT ARCHITECTURE (owner reference, updated 2026-03-30)

Nervous system: app/api/chat/route.js (~6000 lines)
  Auth → tier resolution → system prompt assembly → tool registration → streaming loop → post-response signals

System prompt: 40K token budget. Static BASE_PROMPT (~400 tokens) in cached block. Dynamic content (date, context, memories, hints) in uncached block. Cache target: 60-70% hit rate.

Tier cascade: BYOK/Owner → Opus 128K. Pro → Sonnet 4K. Standard → Sonnet 2K. Voice mode (Hum) → Opus (tools need full capacity).

Tool loading: keyword-gated (module-scope, default zero):
- ECOSYSTEM_KEYWORDS (21+ entries) → ECOSYSTEM_TOOLS. Only matching ecosystems load.
- WORLD_KEYWORDS (7 categories) → WORLD_TOOL_MAP (13 invisible tools).
- Core tools always load: actions (3), standup (1), automations (3), memory (3), notes (4), threads (1), KB (1) = 16 tools.
- Owner-only: DEV_TOOLS (9) — 6 GitHub write + 3 Vercel. Gated on role=owner + GitHub connected.
- Habit Engine boosts at 0.6 confidence + frequency 3.

The Hum (voice mode): app/hum/page.js
  MediaRecorder (silent capture, 60s cap) → Whisper API (server-side transcription) → /api/chat (Opus) → OpenAI TTS (onyx voice, base64 JSON).
  28 varied acknowledgments with name personalization. Parallel ack + transcribe. No text on screen.
  Routes: /api/hum/transcribe (Whisper), /api/hum/speak (TTS).

User automations: user_automations table. Chat tools: automation_create/list/delete. Hourly cron checks all active automations, creates dashboard whispers when due. Schedule format: daily:HH:MM, weekly:DAY:HH:MM, monthly:DD:HH:MM. User timezone respected.

Daily closeout: Square → TrueGauge pipeline. Keywords "close out" load both ecosystems. System prompt teaches the workflow. 4pm cron (owner) + 8am reminder if missed. Whisper on dashboard.

Daily standup: daily_standup tool (always loaded). Pulls completed actions (yesterday), open items + calendar (today), overdue (blockers). Morning cron generates whisper for all active users.

Spend Moderator: spend_log + 12 spend_flags per message. spend_rollups table (daily aggregates, survive signal purges). 30-day trend chart in Radio tab. Persistent — purging signals doesn't lose history.

Integration pattern: connect → callback → status → disconnect. Tokens in integrations table. Server-side refresh on expiry. safeGet() wraps token fetches. Disconnect shows purge prompt (keep data / purge data modal).

Post-response (fire-and-forget): DB saves, spend_log + spend_rollup upsert, spend_flags (12 rules), Audit Loop (doc_stale), Habit Engine patterns.

Key libs: auth.js, vault.js (3 modes), use-chat.js, cost-guard.js, signal-server.js, fabric-server.js, github.js (read + write), providers/ (spotify.js, youtube.js, sonos.js).

Key APIs: /api/owner/spend, /api/owner/heartbeat, /api/owner/signals, /api/cron/closeout, /api/cron/standup, /api/cron/automations, /api/integrations/purge.

Known failure modes: follow-up hangs (fire-and-forget), stream disconnects (try/catch finalMessage), context timeout (10s), double-send (ref not state), tool execution (15s/tool, 50s total).`,
  },
  {
    title: "Integration Registry",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `INTEGRATION STATUS (owner reference, updated 2026-03-30)

Chat integrations (20+ OAuth, keyword-gated):
Business — Square (18 tools: daily summary, orders, payments, catalog, inventory, customers, invoices, team, shifts, locations, refunds, catalog_full, inventory_update, confirm, 86, price_change, create_invoice), Stripe (8), Shopify (6), Toast (6), QuickBooks (5), Numbrly (10), TrueGauge (15).
Productivity — Trello (7), Notion (3), Slack (3), Todoist (2), OneNote (3), Readwise (2), Dropbox (2).
Google Suite — Calendar (4), Gmail (2), Google Drive (3). Unified OAuth, one Settings card.
Health — Fitbit (4), Strava (3). Phase 1 live. Phase 2: Vital Day (Whoop, Oura, Garmin, blood work).
Dev & Code — GitHub (1 read tool for all users). Owner-only: 6 GitHub write tools + 3 Vercel tools.

Music (Fabric — provider-agnostic):
  YouTube (always on, no OAuth needed), Spotify (OAuth, 5-seat cap), Sonos (OAuth, speaker routing + room control via B-Side).
  Search is provider-agnostic: artist, album, playlist, track across all sources. Albums from YouTube via playlist-as-album.

Invisible intelligence (12 APIs, 13 tools, keyword-gated via WORLD_KEYWORDS):
weather, sun times, air quality, food nutrition (USDA + Open Food Facts), books (Open Library), currency, dictionary, geocoding (Nominatim + cache), Wikipedia, NASA APOD, Wolfram Alpha, news (Currents), breach check (HIBP).

Core tools (always loaded): actions (3), standup (1), automations (3), memory (3), notes (4), threads (1), KB search (1) = 16 tools.

Owner-only DEV_TOOLS (9): dev_write_file, dev_create_branch, dev_create_issue, dev_create_pr, dev_list_commits, dev_search_code, dev_deploy_status, dev_deploy_logs, dev_redeploy. Double-gated (role=owner + token check). Invisible to users.

Pending reviews: Google verification (4-6 weeks), Strava 1000-athlete access (7-10 days), Apple Music key processing.
Pending builds: SoundCloud (API access), Apple Music (MusicKit), Linear, Vagaro.

Pattern: Each = OAuth flow + integrations table + server refresh + ECOSYSTEM_TOOLS entry + ECOSYSTEM_KEYWORDS entry + SOURCE_DESCRIPTIONS entry (auto-populates manual).`,
  },
  {
    title: "File-to-Problem Map",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `FILE MAP (owner reference, updated 2026-03-30)

Chat bugs → app/api/chat/route.js (streaming loop, tool executor, post-response, ECOSYSTEM_KEYWORDS)
Auth issues → lib/auth.js + app/api/auth/callback/route.js
Vault problems → lib/vault.js + vault-local.js + vault-crypto.js + vault-fulkit.js
Cost/spend → lib/cost-guard.js + app/api/owner/spend/route.js + spend_rollups table
Signal Radio → lib/signal.js + lib/signal-server.js + app/owner/page.js (RadioTab + SpendModeratorSection)
Sidebar/nav → components/Sidebar.js (compact mode, tooltip, mini player)
Onboarding → app/onboarding/page.js + md/bestie-test.md
Owner portal → app/owner/page.js (dashboard, design, users, socials, pitches, fabric, radio, developer)
Settings → app/settings/page.js (profile, vault, integrations, AI, appearance, about)
Chat context → lib/use-chat.js (streaming) + lib/use-chat-context.js (vault assembly)
Conversation compression → route.js compressConversation() + lib/conversation-summary.js
KB system → executeKbSearch() in route.js + vault_broadcasts table
Spend Moderator → route.js spend_log/spend_flag + /api/owner/spend + spend_rollups + SpendModeratorSection

The Hum (voice) → app/hum/page.js (UI, MediaRecorder, AudioContext playback)
  Transcription → app/api/hum/transcribe/route.js (Whisper API)
  TTS → app/api/hum/speak/route.js (OpenAI TTS onyx, base64 JSON)

Automations → user_automations table + route.js (automation_create/list/delete tools + executor)
  Cron → app/api/cron/automations/route.js (hourly, checks all users)

Daily closeout → route.js (system prompt instruction) + app/api/cron/closeout/route.js (4pm + 8am)
Daily standup → route.js (daily_standup tool + executor) + app/api/cron/standup/route.js (morning)

Disconnect purge → app/settings/page.js (modal prompt) + app/api/integrations/purge/route.js

Dev tools (owner-only) → route.js (DEV_TOOLS array + executeDevTool) + lib/github.js (githubWrite, githubPost)

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
Fitbit → lib/fitbit-server.js + api/health/fitbit/*
Strava → lib/strava-server.js + api/health/strava/*
QuickBooks → lib/quickbooks-server.js + api/quickbooks/*
Notion → lib/notion-server.js + api/notion/*
Dropbox → lib/dropbox-server.js + api/dropbox/*
Slack → lib/slack-server.js + api/slack/*
OneNote → lib/onenote-server.js + api/onenote/*
Todoist → lib/todoist-server.js + api/todoist/*
Readwise → lib/readwise-server.js + api/readwise/*
Sonos → lib/providers/sonos.js + api/fabric/sonos/*
Spotify/Fabric → lib/providers/spotify.js + lib/providers/youtube.js + api/fabric/*

Crons (vercel.json):
/api/cron/payout (1st of month), /api/cron/tax-check (Jan 15), /api/cron/hot-seat (1st of month),
/api/cron/weekly-digest (Monday 9am UTC), /api/cron/closeout (4pm + 8am MST),
/api/cron/automations (hourly), /api/cron/standup (8am MST).

World/invisible tools → route.js (WORLD_TOOLS, WORLD_KEYWORDS, WORLD_TOOL_MAP)
Location intelligence → route.js (memory → IP → Nominatim geocode, server cache)`,
  },
  {
    title: "Spec Index",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `SPEC INDEX (owner reference, updated 2026-03-30)

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
TODO.md — master action list (Health phases, Vital Day, Droplet Day, integration roadmap)
last-session.md — session bridge (5-line TL;DR, read by chat via github_fetch_files)

DB migrations (scripts/):
spend-rollups-migration.sql — daily spend aggregates (survive signal purges)
user-automations-migration.sql — user-scheduled recurring tasks`,
  },
  {
    title: "Recent Changes",
    channel: "owner-context",
    subtype: "doc",
    tag: "session",
    content: `LAST SESSION: Session 27 (2026-03-30, marathon)
Scope: V1 launch checklist sweep, Hum voice pipeline, Fabric independence, automations, closeout, standup, dev co-pilot, Square expansion, documentation overhaul.

Shipped:
- Settings/Sources CLS fix: skeleton cards while status checks load.
- Spend Moderator history: spend_rollups table + 30-day trend chart in Radio. Persists through signal purges.
- Fabric search rewrite: provider-agnostic multi-entity merge. YouTube albums, playlists, tracks all work standalone. No Spotify required.
- Fabric independence: stripped Spotify bias from all labels and API defaults. YouTube is default.
- The Hum wired for real: MediaRecorder → Whisper → Opus → OpenAI TTS (onyx). No browser sounds, 60s cap, 28 acknowledgment phrases with name. Parallel ack + transcribe.
- User automations: any user schedules recurring tasks via chat. user_automations table, 3 chat tools, hourly cron, dashboard whispers.
- Daily closeout: Square → TrueGauge pipeline. Chat command + 4pm/8am crons.
- Daily standup: yesterday + today + blockers. Chat tool + morning whisper for all users.
- Dev co-pilot: 6 GitHub tools (write file, branch, issue, PR, commits, code search) + 3 Vercel tools (deploy status, logs, redeploy). Owner-only, double-gated.
- Square expansion: 86 item (sold out), price change, invoice creation. All with preview/confirm.
- Disconnect purge prompt: modal overlay on all 20+ integrations. Keep data / purge data choice.
- Threads mobile: two-row toolbar, view icons match bucket size, calendar month centered, day detail on tap.
- Home page: matched Chat + Hum buttons, Ful meter single line.
- Manual auto-generates from SOURCE_DESCRIPTIONS. One source of truth — never drifts.
- Integration ticker: Strava added, Google consolidated to "Google Suite".
- Buildnotes + owner KB articles updated to current state.

Integration count: 20+ chat + Fabric (Spotify/YouTube/Sonos) + 12 invisible + 16 core + 9 dev = 57+ tool definitions.
Crons: 7 total (payout, tax-check, hot-seat, weekly-digest, closeout x2, automations, standup).

External pending: Google OAuth verification (4-6 weeks), Strava 1000-athlete (7-10 days), Apple Music key.
V2 backlog: SoundCloud, Apple Music, Linear, Vagaro, Vital Day, Fabric mobile, Droplet Day, prompt playbook.`,
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
