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
    content: `FULKIT ARCHITECTURE (owner reference)

Nervous system: app/api/chat/route.js (~4000 lines)
  Auth → tier resolution → system prompt assembly → tool registration → streaming loop → post-response signals

System prompt budget: 40,000 tokens. Base ~385 tokens (compressed Session 21). Context reactive: 8K Sonnet, 15K Opus.

Tier cascade: BYOK/Owner → Opus 128K. Pro → Sonnet 4K. Standard → Sonnet 2K.

Tool loading: keyword-gated via ECOSYSTEM_KEYWORDS. Default = zero integration tools. Core tools (actions, memory, notes, threads, KB) always load.

Integration pattern: connect → callback → status → disconnect. Tokens in integrations table. Server-side refresh on expiry. safeGet() wraps token fetches.

Post-response: fire-and-forget DB saves, Spend Moderator signals (spend_log + spend_flag), Habit Engine pattern logging, prefetch.

Key libs: auth.js (AuthProvider, PKCE), vault.js (3 storage modes), use-chat.js (streaming hook), cost-guard.js (pricing, budget, circuit breaker), signal-server.js (fire-and-forget signals), fabric-server.js (Spotify tokens).

Known failure modes: follow-up hangs (must fire-and-forget), stream disconnects (try/catch finalMessage), context timeout (10s cap), double-send (use ref not state), tool execution (15s/tool, 50s total).`,
  },
  {
    title: "Integration Registry",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `INTEGRATION STATUS (owner reference)

Wired + live:
- GitHub — OAuth, file read, tree fetch. 1 tool (github_fetch_files).
- Spotify — OAuth, now-playing, controls, playlists. Dev mode only (Collin's account). Redirect URI: fulkit.app only.
- Square — OAuth, 16 tools. Inventory, orders, catalog, customers.
- Stripe — OAuth, 8 tools. Subscriptions, billing, payments.
- Shopify — OAuth, 6 tools. Storefront, products, fulfillment.
- Toast — OAuth, 6 tools. Restaurant, menu, orders.
- Trello — OAuth, 7 tools. Boards, cards, tasks.

Spec'd, not wired:
- Numbrly — cost management. API spec at md/numbrly-spec.md. 10 tools defined.
- TrueGauge — financial analytics. API spec at md/truegauge-spec.md. 15 tools defined.

Pending:
- SoundCloud — awaiting API access (Artist Pro signup needed).
- Apple Music — planned, no spec yet.

Pattern: Each integration = OAuth flow + tokens in integrations table + server-side refresh + tools in ECOSYSTEM_TOOLS + keywords in ECOSYSTEM_KEYWORDS.`,
  },
  {
    title: "File-to-Problem Map",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `FILE MAP (owner reference)

Chat bugs → app/api/chat/route.js (streaming loop, tool executor, post-response)
Auth issues → lib/auth.js + app/api/auth/callback/route.js
Vault problems → lib/vault.js + vault-local.js + vault-crypto.js + vault-fulkit.js
Spotify/Fabric → lib/fabric-server.js + app/api/fabric/*
Cost/spend → lib/cost-guard.js + app/api/owner/spend/route.js
Signal Radio → lib/signal.js + lib/signal-server.js + app/owner/page.js (RadioTab + SpendModeratorSection)
Sidebar/nav → components/Sidebar.js (compact mode, tooltip, mini player)
Onboarding → app/onboarding/page.js + md/bestie-test.md
Owner portal → app/owner/page.js (dashboard, design, users, socials, pitches, fabric, radio, developer)
Settings → app/settings/page.js (profile, vault, integrations, AI, appearance, about)
Square integration → lib/square-server.js + app/api/square/*
GitHub integration → lib/github.js + app/api/github/*
Chat context → lib/use-chat.js (streaming) + lib/use-chat-context.js (vault assembly)
Conversation compression → app/api/chat/route.js compressConversation() + lib/conversation-summary.js
KB system → executeKbSearch() in route.js + vault_broadcasts table
Spend Moderator → route.js spend_log/spend_flag signals + app/api/owner/spend/route.js + SpendModeratorSection in owner/page.js`,
  },
  {
    title: "Spec Index",
    channel: "owner-context",
    subtype: "doc",
    tag: "architecture",
    content: `SPEC INDEX (owner reference)

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
md/pitches.md — all slugged pitches, taglines, CTAs
md/v3-spec.md — v3 Cognizant Layer spec (The Library, Heartbeat, Audit Loop, Bridge)
TODO.md — master action list`,
  },
  {
    title: "Recent Changes",
    channel: "owner-context",
    subtype: "doc",
    tag: "session",
    content: `LAST SESSION: Session 22 (2026-03-21)
Scope: Spend Moderator + Lean Tool Loading + v3 Spec

Shipped:
- Spend Moderator v2: 12 detection rules, token breakdown, cache gauge, cost attribution, integration usage, period-over-period comparison with delta arrows
- Lean tool loading: keyword-gated via ECOSYSTEM_KEYWORDS. Default = zero integration tools. 68 → ~10 tools per message. ~96% schema token reduction.
- KB security fix: owner-context articles gated by role
- Amber/red two-tier alert on Radio tab

Spec'd:
- v3 "The Cognizant Layer" — Library shelves, Heartbeat, Audit Loop, Bridge, cache optimization. Spec at md/v3-spec.md.

Open issues: Cache efficiency (~10-20% hit rate, needs prompt restructuring in Phase 3)
Next: Stock Library shelves, write session bridge, cache optimization`,
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
