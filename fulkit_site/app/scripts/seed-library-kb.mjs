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

Nervous system: app/api/chat/route.js (~3500 lines)
  Auth → tier resolution → system prompt assembly → tool registration → streaming loop → post-response signals

System prompt: 40K token budget. Static BASE_PROMPT (~385 tokens) in cached block. Dynamic content (date, context, memories, hints) in uncached block. Cache target: 60-70% hit rate.

Tier cascade: BYOK/Owner → Opus 128K. Pro → Sonnet 4K. Standard → Sonnet 2K.

Tool loading: keyword-gated via ECOSYSTEM_KEYWORDS (module-scope). Default = zero integration tools. Only ecosystems matching user message keywords load. Core tools (actions, memory, notes, threads, KB) always load. Habit Engine boosts at 0.6 confidence.

Integration pattern: connect → callback → status → disconnect. Tokens in integrations table. Server-side refresh on expiry. safeGet() wraps token fetches.

Post-response (fire-and-forget): DB saves, Spend Moderator (spend_log + 12 spend_flags), Audit Loop (doc_stale flags for owner), Habit Engine pattern logging, ecosystem prefetch.

Key libs: auth.js (AuthProvider, PKCE), vault.js (3 storage modes), use-chat.js (streaming hook), cost-guard.js (pricing, budget, circuit breaker), signal-server.js (fire-and-forget signals), fabric-server.js (Spotify tokens).

Key APIs: /api/owner/spend (cost aggregation + period comparison), /api/owner/heartbeat (composite health pulse), /api/owner/signals (Radio feed).

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
    content: `LAST SESSION: Session 22 (2026-03-21 to 2026-03-22)
Scope: Spend Moderator + Lean Tool Loading + v3 Cognizant Layer + Features + Perf + Housecleaning

Shipped:
- Spend Moderator v2 (12 rules, 30+ fields, period deltas, token breakdown, cache gauge)
- Lean tool loading (keyword-gated, 68→~10 tools, ~96% reduction) + tool description compression
- v3 Phases 0-5: KB security, Library shelves, session bridge, cache split, heartbeat, audit loop
- Shareable conversation links (per-message share + /share/[token] public page)
- Welcome email (Resend, domain verified, auto-send on signup)
- Loading skeletons (Dashboard, Actions, Settings)
- Chat preload during splash (children mount under overlay, fetch during 2800ms wink)
- Fabric DB migration (multi-provider architecture complete)
- Convert-to-action prompt tuning (Fulkit offers tasks/notes/plans when conversations get meaty)
- Full doc audit + housecleaning (all docs verified against code)
- Chappie 2.0: 123/136 verified. 13 remain (production scenarios).
- TODO Part 1: 9/10 complete

Open: Spotify Extended Quota, Meta App Review, compression quality testing
Next: Growth features, nav redesign (branch), compression testing`,
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
