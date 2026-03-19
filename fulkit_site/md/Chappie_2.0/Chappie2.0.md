# Chappie 2.0 — Context Architecture Redesign

> **Status:** All audits complete. Spec finalized. Ready for Claude Code.
> **Goal:** Lean, accurate chat that sends a piece of mail, not a moving truck.
> **Paid-only.** 14-day trial for new users. Referral-earned free plans for evangelists.
> **Break-even: 20 paying users (post-optimization only).**

---

## 0. North Star

**Fülkit is a convenience layer.** The one thing your 10 other apps can't do well.

It's not a replacement for Square, Obsidian, Spotify, Trello, or Numbrly. It doesn't store their data long-term. It doesn't compete with their features. It connects them — through one intelligent conversational interface that lets you talk to all of them at once.

- Chat with your Square to do inventory.
- Check on your Trello without opening Trello.
- DJ your Spotify library without Spotify building a single smart feature.
- Query your Obsidian vault in natural language.
- Ask Numbrly about your margins without reading a dashboard.

Fülkit is the UI. The services are the services. We temporarily hold context to be useful, then let it go. We build intelligence layers on top of things users already own. The data lives where the user chose to put it.

**Not "what more can we add" — but "how do you use what you have."**

Integrations are always on-demand (Tier 3), never eagerly loaded. Fülkit doesn't own that data — it reaches into it when you ask. The Habit Engine makes the reaching faster and smarter.

---

## 1. The Config Legend — Single Source of Truth

### The Problem

Pricing lives in `ful-config.js`, billing copy lives in page components, the referral calculator has its own numbers, spend caps live in `cost-guard.js`, revenue projections use a stale cost basis, and the Fül exchange rate is assumed in multiple places. **They're already out of sync.** The spend cap / Fül limit mismatch and the revenue projections table using 1.5¢/msg (actual cost: 9¢/msg) are proof.

### The Fix: `lib/ful-legend.js`

One file. Every number that matters. Everything else imports from here.

```javascript
// ful-legend.js — Single source of truth for all Fülkit economics
// If it's not here, it's not official.

// === FIXED (user-facing contract — changes require announcement) ===

export const FUL_EXCHANGE = {
  fulPerDollar: 100,        // 100 Fül = $1. Always.
  dollarPerFul: 0.01,
};

export const PLANS = {
  trial: {
    label: "Trial",
    price: 0,
    durationDays: 14,
    fulTotal: 150,
    maxTokens: 2048,
    model: "claude-sonnet-4-6",
    integrations: 1,
    vaultNotes: 10,
    spendCap: 2.50,
  },
  standard: {
    label: "Standard",
    priceMonthly: 9,
    priceAnnual: 90,
    fulPerMonth: 450,
    maxTokens: 2048,
    model: "claude-sonnet-4-6",
    integrations: Infinity,
    vaultNotes: Infinity,
    spendCap: null,          // derived from getSpendCap()
  },
  pro: {
    label: "Pro",
    priceMonthly: 15,
    priceAnnual: 150,
    fulPerMonth: 800,
    maxTokens: 4096,
    model: "claude-sonnet-4-6",
    integrations: Infinity,
    vaultNotes: Infinity,
    spendCap: null,
  },
  byok: {
    label: "BYOK",
    price: 0,
    fulPerMonth: Infinity,
    maxTokens: 128000,
    model: "claude-opus-4-6",
    support: "self-service",
    platformFee: 0,
  },
  owner: {
    label: "Owner",
    price: 0,
    fulPerMonth: Infinity,
    maxTokens: 128000,
    model: "claude-opus-4-6",
  },
};

export const CREDITS = {
  price: 2,
  fulAmount: 100,
  stripeLookup: "fulkit_credits_100",
};

export const REFERRALS = {
  fulPerRefPerMonth: 100,
  dollarPerRefPerMonth: 1,
  tiers: [
    { min: 1,   max: 6,   fulPerRef: 100, label: "Piece" },
    { min: 7,   max: 14,  fulPerRef: 100, label: "Component" },
    { min: 15,  max: 24,  fulPerRef: 100, label: "Tool" },
    { min: 25,  max: 99,  fulPerRef: 110, label: "Builder" },
    { min: 100, max: 249, fulPerRef: 120, label: "Architect" },
    { min: 250, max: Infinity, fulPerRef: 130, label: "Ambassador" },
  ],
  freeStandardThreshold: 9,
  freeProThreshold: 15,
  payoutMinimum: 10,
  payoutTierMin: 4,
};

// === VARIABLE (internal ops — adjustable as costs change) ===

export const COST_BASIS = {
  targetCostPerFul: 0.012,   // target after optimization
  currentCostPerFul: 0.09,   // actual today (pre-optimization)
  lastUpdated: "2026-03-19",
};

export function getSpendCap(plan) {
  if (!PLANS[plan]) return null;
  if (PLANS[plan].spendCap !== undefined && PLANS[plan].spendCap !== null)
    return PLANS[plan].spendCap;
  const fulLimit = PLANS[plan].fulPerMonth;
  if (!isFinite(fulLimit)) return null;
  // 1.5x target cost × Fül limit = safety buffer
  return Math.ceil(fulLimit * COST_BASIS.targetCostPerFul * 1.5 * 100) / 100;
  // Standard: 450 × 0.012 × 1.5 = $8.10
  // Pro: 800 × 0.012 × 1.5 = $14.40
}

// === PROJECTION DEFAULTS (for owner/users revenue projections table) ===

export const PROJECTIONS = {
  standardProSplit: 0.70,       // 70% Standard, 30% Pro assumption
  freeSeatsDefault: 6,          // referral-earned free plans assumption
  avgMsgsPerUserPerMonth: 300,  // blended average for API cost projection
  hostingBase: 25,              // base monthly hosting (Vercel + Supabase + Redis)
  hostingPerHundredUsers: 10,   // incremental hosting per 100 users
  blendedRefCreditPerUser: 1,   // ~$1/mo blended referral credit per paying user
};

export const BILLING_STATES = {
  NORMAL: { maxPercent: 89 },
  SOFT_WARNING: { percent: 90, showOnce: true },
  HEADS_UP: { percent: 98, showOnce: true },
  WRAP_UP: { percent: 99, reserveLastFul: true },
  LIMIT: { percent: 100, disableInput: true, keepHistoryAccessible: true },
};

export const TELEMETRY = {
  trackCostPerMessage: true,
  trackOutputTokensPerTier: true,
  trackToolCallsPerMessage: true,
  trackHabitEngineAccuracy: true,
};
```

### Fixed vs. Variable

**Fixed (user contract):** 100 Fül = $1. Plan prices. Fül limits. Referral rates. Changes require announcement.

**Variable (internal ops):** `targetCostPerFul`, `currentCostPerFul`. Spend caps (derived). Token budgets. Projection defaults. Adjustable as we optimize. Update `targetCostPerFul` → spend caps, projections, milestones all recalculate.

### What Imports From the Legend

**If a number appears anywhere in the product and it's not from the legend, it's a bug.** This includes: pricing page, referral calculator, cost-guard, ful-config, chat route, billing UI, dashboards, revenue projections, milestones, CSV exports.

---

## 2. What We Know (Confirmed from Codebase)

### Current System Prompt Size

| Component | Tokens |
|:---|:---|
| Base prompt | ~800 |
| Date + timezone | ~20 |
| User preferences | 50–200 |
| Memories | 100–2,000 |
| Recent conversations (25 titles) | 100–500 |
| Vault notes (15 max) | 500–15,000 |
| KB docs (keyword-scored) | 0–10,000 |
| Integration instructions | 0–250 |
| Referral whisper | ~200 |
| Low fuel notice | ~150 |
| **Typical total** | **~5K–30K** |

Plus tool schemas (77 max, 12–16K) and eager integration context (2–5K wasted).

**Worst case (Owner, Opus):** 151K input → $2.27/message.

**Chat route file:** `app/api/chat/route.js` — **2,885 lines.** This is the single most complex file in the codebase. Every edit to this file carries risk. Claude Code should read the full file before making targeted edits, never bulk-rewrite.

### How Fül Work Today

One Fül = one request. Tool rounds free. Monthly reset on 1st. Credit purchase: $2 → 100 Fül via Stripe webhook.

**At zero:** Hard 429. Dead screen. No explanation.
**Low fuel:** System prompt injection at 80%. Unreliable — Chappie decides whether to mention it.
**Spend caps:** Fire before Fül limit on every plan. This is the wall.

### Referral System

$1/month (100 Fül) per active paying referral. Tier ladder up to 130 Fül/ref at Ambassador. 9 active refs = free Standard. 15 = free Pro. Cash payouts at Builder+ (25+ refs, $10 min).

Referral-earned free plans are Standard/Pro with 100% credit offset — not a separate tier.

### Infrastructure & SDK

- **Hosting:** Vercel serverless (120s function timeout), Supabase Postgres + RLS, Upstash Redis
- **SDK:** @anthropic-ai/sdk ^0.78.0 — **verify prompt caching support for this version before implementing**
- **Greeting model:** claude-haiku-4-5-20251001 (cheap, cached 1hr)
- **Greeting cost at scale:** 1,000 users × 1/day × 30 days = 30K Haiku calls ≈ $30/mo (minor but not zero)

---

## 3. The Habit Engine

### The Problem

Chappie shows up like a new hire every message. Reads the entire handbook. Drowns. 151K in, 55 out.

### What Should Happen

Shows up like someone who's been here six months. Knows your routines. Reaches into your services when you ask — not before.

### Three Layers

**Layer 1 — Pattern Matching:**
`user_patterns` table tracks what actually happens. High confidence (10+)? Load just that. Cost: ~$0.01 instead of $0.09.

**Layer 2 — Ecosystem Stickiness:**
Once in Square world, stay there. "Top customer," "gift cards," "Saturday" — all still Square. Only break on clear mismatch ("what time is my haircut" — zero Square association).

**Layer 3 — Speculative Prefetch:**
After responding, pre-fetch 2 most likely next needs (DB reads, zero API cost). User pivots → instant. Wrong prediction → cache evaporates.

**When Confidence Is Low:** Ask, don't guess. "The shop or Numbrly?" — short, specific, already halfway to the answer. Never "Could you please clarify your intent?"

### Onboarding Seed (Solves Cold Start)

During onboarding: "What will you mainly use Fülkit for?"

| User selects | Seeds planted |
|:---|:---|
| "My shop / inventory" | Square ecosystem (frequency: 3) |
| "Project management" | Trello ecosystem (frequency: 3) |
| "Personal organization" | Notes/vault patterns (frequency: 3) |
| "Finances / margins" | Numbrly ecosystem (frequency: 3) |
| "Music" | Spotify/Fabric ecosystem (frequency: 3) |
| "A bit of everything" | Anchor-only, no seed |

Low confidence (3) biases Tier 0 on day one. Real usage overwrites by day 3–4.

### The Tiers

**Tier 0 — HABIT ENGINE** (~0 cost, instant) — patterns + ecosystem + prefetch
**Tier 1 — ANCHOR** (~500 tokens) — general orientation
**Tier 2 — REACTIVE** (up to 8K) — semantic search for new topics
**Tier 3 — DEEP** (tool calls) — reaching into services on demand

### Schema

```sql
user_patterns (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  trigger_phrase text,
  action_taken text,
  ecosystem text,
  context_loaded text[],
  frequency integer DEFAULT 1,
  last_seen timestamp,
  time_of_day text,
  UNIQUE(user_id, trigger_phrase, action_taken)
)
```

---

## 4. Pricing & Plans

### The Lineup (All from `ful-legend.js`)

| Plan | Price | Fül/Month | max_tokens | Integrations |
|:---|:---|:---|:---|:---|
| Trial (14 days) | Free | 150 total | 2,048 | 1 |
| Standard | $9/mo | 450 | 2,048 | Unlimited |
| Pro | $15/mo | 800 | 4,096 | Unlimited |
| Standard Annual | $90/yr ($7.50/mo) | 450/mo | 2,048 | Unlimited |
| Pro Annual | $150/yr ($12.50/mo) | 800/mo | 4,096 | Unlimited |
| Credits | $2 one-time | +100 | Same as plan | Same as plan |
| BYOK | Bring your key | Unlimited | 128,000 | Unlimited |

### Acquisition Economics

| Channel | Cost | Time to Revenue | Month 1 Revenue |
|:---|:---|:---|:---|
| Trial | $1.80 | Month 2 | $0 |
| Referral | $0 | Month 1 | $9+ |

Referrals are the most profitable channel. Worth disproportionate investment in referral UX, shareability, and the earning dashboard.

### 14-Day Trial

150 messages. 1 integration. Onboarding seed. Conversion moment: ~day 7–8.

**Lever playbook if conversion < 15%:**
1. Integrations 1 → 2
2. Extend to 21 days
3. Increase to 200 messages
4. Never 30 days. If none work, the product needs to improve.

### Annual Plans

$90/yr Standard (save $18). $150/yr Pro (save $30). Upfront cash + reduced churn.

### Standard → Pro Upsell

Chappie says: "You could add 100 messages for $2, or for a few dollars more, Pro gives you 800 messages plus longer, more detailed responses. That's about 12 cents per conversation."

### Value-Per-Dollar Framing

Every price touchpoint shows mileage, not gallons. Generic examples for cold users, personalized examples (from `ful_ledger` + Habit Engine) for established users.

### BYOK Policy

Self-service. Docs only. No priority support. If >10% of base with high ticket volume → $5/mo platform fee.

### Tool Rounds: Free

One Fül = one request regardless of tool calls. Telemetry tracks cost distribution. Revisit only if top 10% avg > $0.025/msg.

---

## 5. The Graceful Exit

### Rules

1. **Always return a message.** Never silence. Never a dead screen.
2. **Progress is never lost.** History/pins/notes always accessible at any credit level.
3. **Last answer is always complete.** Reserve last Fül as wrap-up credit.
4. **Exit on a high note.** Friendly debrief, not a paywall.

### State Machine

```
NORMAL (0-89%)      → no billing messaging
SOFT_WARNING (90%)  → natural aside, once
HEADS_UP (98%)      → options + personalized value
WRAP_UP (99%)       → complete answer + warm debrief
LIMIT (100%)        → input disabled, everything accessible
RESUMED             → "Welcome back. Where were we?"
```

Low fuel moves from system prompt injection (unreliable, wastes tokens) to client UI via billing state machine (guaranteed, zero tokens). BYOK/Owner skip entirely.

---

## 6. Cost Model

### Per-Message Cost

| State | Cost/Msg (Sonnet) |
|:---|:---|
| **Current (no caching, ~30K input)** | $0.090 |
| **+ Prompt caching** | ~$0.035 |
| **+ Context redesign** | $0.036 |
| **+ Both** | ~$0.018 |
| **+ Habit Engine** | ~$0.008–0.012 |

Blended target: **~$0.012/msg**

### Full Cost Model (Including Non-API Costs)

| Cost | Monthly at 100 Users | Monthly at 500 Users | Monthly at 1,000 Users |
|:---|:---|:---|:---|
| API (Sonnet, $0.012/msg blended) | $540 | $2,340 | $4,680 |
| Hosting (Vercel + Supabase + Redis) | $35 | $60 | $85 |
| Haiku greetings (~$0.001/call) | $3 | $15 | $30 |
| Referral credits (~$1/user blended) | $100 | $500 | $1,000 |
| **Total costs** | **$678** | **$2,915** | **$5,795** |
| Revenue (70/30 Std/Pro split) | $900 | $5,400 | $10,800 |
| **Net** | **+$222** | **+$2,485** | **+$5,005** |

### Break-Even Per Plan

| Plan | Price | Fül | API Cost | Margin |
|:---|:---|:---|:---|:---|
| Trial | $0 | 150 | $1.80 | -$1.80 (acquisition) |
| Standard | $9/mo | 450 | $5.40 | +$3.60 |
| Pro | $15/mo | 800 | $9.60 | +$5.40 |
| Standard Annual | $7.50/mo eff | 450 | $5.40 | +$2.10 |
| Pro Annual | $12.50/mo eff | 800 | $9.60 | +$2.90 |
| Credits | $2/100 | 100 | $1.20 | +$0.80 |

### Break-Even Point: 20 Paying Users

**Post-optimization only.** At current costs ($0.09/msg), break-even is 100+ users.

At 20 users (70/30 split = 14 Standard + 6 Pro, with 6 referral-earned free seats):
- Revenue: (14 × $9) + (6 × $15) = $216/mo
- API cost: 20 users × ~300 msgs × $0.012 = $72
- Hosting: $25
- Referral credits: ~$14
- **Net: ~$105/mo — cash positive.**

The milestones on `/settings/owner/users` are valid targets — but they describe the post-optimization world. **Phase 0 (prompt caching) must ship before these milestones are achievable.**

### User Mix Averaging

| Type | % | Msgs/Mo | Cost | Revenue | Margin |
|:---|:---|:---|:---|:---|:---|
| Lite | 30% | 50 | $0.60 | $9.00 | +$8.40 |
| Medium | 50% | 200 | $2.40 | $9.00 | +$6.60 |
| Heavy | 20% | 450 | $5.40 | $9.00 | +$3.60 |
| **Weighted** | | | **$2.52** | **$9.00** | **+$6.48** |

---

## 7. Decisions Made

| # | Issue | Decision | Status |
|:---|:---|:---|:---|
| 1 | Tool rounds cost more but count as 1 Fül | **Tools stay free.** Add telemetry. Revisit if top 10% > $0.025/msg. | **DECIDED** |
| 2 | Pro output tokens could thin margins | **Ship as-is.** Track avg output per tier. | **MONITOR** |
| 3 | Trial conversion risk | **Lever playbook:** integrations → days → msgs. Never 30 days. | **DECIDED** |
| 4 | Habit Engine cold start | **Onboarding seed.** | **SOLVED** |
| 5 | Compression quality | **Test protocol in Phase 8.** | **SOLVED** |
| 6 | BYOK support load | **Self-service. $5 fee trigger at 10%.** | **DECIDED** |
| 7 | Credits delaying upgrades | **Solved by value-framed upsells.** | **SOLVED** |
| 8 | Spend cap / Fül alignment | **Solved by legend's getSpendCap().** | **SOLVED** |
| 9 | Referral loop (existing accounts) | **Emergency 7 — verify endpoint.** | **SOLVING** |

---

## 8. Emergencies (Do Now)

### Emergency 1: Prompt Caching (Day 1)
Add `cache_control: { type: "ephemeral" }` to system prompt in route.js. **First verify @anthropic-ai/sdk ^0.78.0 supports this.** If not, update SDK first. 60–80% cost reduction on multi-turn.

### Emergency 2: Soft Stop + Graceful Exit (Day 1–2)
Implement billing state machine. Replace hard 429. Move low fuel from system prompt to client UI. Reserve last Fül for wrap-up.

### Emergency 3: Wire Circuit Breaker (Day 1)
Call `checkCircuitBreaker()` in chat route. One line. Dead code → live.

### Emergency 4: Config Legend (Day 2)
Create `lib/ful-legend.js`. Migrate all values from `ful-config.js`, `cost-guard.js`, `referral-engine.js`, revenue projections, dashboard MRR calculations. Update all imports. **Nothing hardcoded outside the legend.**

### Emergency 5: Rework Free → Trial (Day 2)
`ful-config.js`: free → trial. 14-day expiry, 150 msgs, 1 integration, 10 notes, $2.50 cap. Referral-earned free plans stay as Standard/Pro with credit offset.

### Emergency 6: Kill Eager Integration Loading (Day 2)
Remove Numbrly/TrueGauge eager context loads from `use-chat-context.js`. Integrations fire only on demand.

### Emergency 7: Verify Referral Safeguards (Day 2)
Confirm `/api/referrals/claim` blocks: existing accounts (email already in profiles), self-referral, credit for non-paying referrals.

---

## 9. Implementation Phases

### Phase 0: Emergency Fixes (Days 1–2)
Prompt caching, circuit breaker, graceful exit, config legend, trial rework, kill eager loading, referral safeguards, "Free" → "Trial" label fixes in dashboards.

### Phase 1: Trial + Annual Plans + Page Copy + Dashboard Polish (Days 3–6)
Stripe: 14-day trial, annual prices, portal, proration. Pricing + landing page rewrite with value framing. Dashboard fixes: BYOK count, credit revenue, Conv % denominator, payout label, trend start date, legend imports for MRR. Revenue projections table: import cost basis from legend, make milestones dynamic.

### Phase 2: Anchor Context + Coverage Hint (Days 7–8)
Compute anchor at greeting time. Cache in preferences. Coverage hint in system prompt (~100 tokens).

### Phase 3: Habit Engine v1 (Days 9–14)
`user_patterns` table. Post-conversation logging. Pattern matching. Ecosystem stickiness. Speculative prefetch. Onboarding seed.

### Phase 4: Server-Side Semantic Context (Days 15–18)
Voyage embeddings → `match_notes` RPC. Tier 2 for new topics. Client simplifies to pinned/always.

### Phase 5: KB Docs as Tool (Days 19–20)
`kb_search` tool replaces system prompt KB injection. Brand Voice stays in prompt.

### Phase 6: Value-Framed Upsells (Days 21–22)
Wire `ful_ledger` + Habit Engine into billing state messaging. Personalized value examples. Pro upsell comparison.

### Phase 7: Retry Logic + Error Polish (Days 23–24)
Exponential backoff (3 retries) on Anthropic 429/529. UI distinguishes: "credits low" vs "retrying" vs "broke."

### Phase 8: Compression Validation (Days 25–26)
Test protocol: 10 real sessions × 20+ messages. Grade thread maintenance post-compression. If <80% pass, tune 60% recent window.

---

## 10. Stripe Scoping

| Change | Complexity |
|:---|:---|
| Trial 30 → 14 days | Low |
| Trial msgs 100 → 150, cap $2.50 | Low |
| Annual Standard ($90/yr) | Medium |
| Annual Pro ($150/yr) | Medium |
| Monthly/Annual toggle on pricing page | Medium |
| Proration (monthly ↔ annual) | Medium |
| Billing portal: annual option | Low |
| Page copy rewrite | Medium |
| Free → Trial in config | Low |
| Verify referral claim endpoint | Low |

---

## 11. Owner Dashboards

### Sales Center (`/settings/referrals`) — Audit: Mostly Wired

**Correct:** MRR, NET, MARGIN (uses real API spend), API cost, Referral payouts, ARR, Paying users, all referral network fields, all payout fields, monthly trend, CSV exports.

**Fix (small):**

| Issue | Fix |
|:---|:---|
| "Free" in Revenue by Plan | → "Trial". Referral-earned show under Standard/Pro with "(referral)" tag |
| Conv % includes owner/BYOK | Exclude from denominator |
| Payout obligations label | Shows all-time paid → should show pending or relabel |
| Total costs/mo | Add pending payout obligations |
| Trend start date hardcoded April 2026 | Make dynamic |
| $/user label | → "$/paying user" |

**Add (medium):** Net ARPU, BYOK count, trial conversion funnel, churn rate, acquisition cost by channel.

### Financials (`/settings/billing`) — Audit: Mostly Wired

Same endpoint as Sales Center (`/api/referrals/admin`). Rendering code duplicated but data is shared.

**Fix (small):** Same label fixes as Sales Center.

**Add (medium):** Cost per message (actual), credit revenue line, net margin per plan, annual revenue amortization.

### Revenue Projections (`/settings/owner/users`) — Uses Stale Cost Basis

The milestones and projections table currently assume **~1.5¢/msg API cost.** Actual cost is 9¢/msg. Post-optimization target is 1.2¢/msg.

**What this means:**
- At current costs: milestones are fiction. Break-even is 100+ users, not 20.
- Post-optimization: milestones are actually conservative. 1.2¢ < 1.5¢ means better margins than shown.

**Fix:** Import `COST_BASIS.targetCostPerFul` from legend for projections. Import `PROJECTIONS.standardProSplit`, `PROJECTIONS.hostingBase`, etc. When cost basis changes, the whole table recalculates. Make milestones dynamic (derived from the projections math, not hardcoded user counts).

**"Credits" column ambiguity:** In projections it means referral credits paid out. In Financials it could mean credit purchase revenue. Rename to "Ref Credits" in projections and "Credit Purchases" in Financials.

**"6 free seats" is hardcoded.** Should derive from `PROJECTIONS.freeSeatsDefault` in legend (adjustable assumption) or, better, from actual referral-earned free plan count when real data exists.

### Legend Migrations (All Dashboards)

| Currently In | Migrates To |
|:---|:---|
| MRR inline: $9, $15 | `PLANS.standard.priceMonthly`, `PLANS.pro.priceMonthly` |
| `referral-engine.js` Fül-to-dollar | `FUL_EXCHANGE.dollarPerFul` |
| `referral-engine.js` tier defs | `REFERRALS.tiers` |
| `ful-config.js` TIERS | `PLANS` in legend |
| Projections: 1.5¢/msg | `COST_BASIS.targetCostPerFul` |
| Projections: 70/30 split | `PROJECTIONS.standardProSplit` |
| Projections: 6 free seats | `PROJECTIONS.freeSeatsDefault` |
| Projections: $25 hosting | `PROJECTIONS.hostingBase` |
| Trend start: April 2026 | Dynamic from first profile or legend |

### Dashboard Files

| File | Role |
|:---|:---|
| `app/app/settings/page.js` | All dashboard rendering |
| `app/app/api/referrals/admin/route.js` | Admin stats aggregation |
| `app/app/api/referrals/status/route.js` | Per-user referral stats |
| `app/app/api/referrals/payout/status/route.js` | Per-user payout history |
| `app/app/api/stripe/billing/route.js` | Stripe data |
| `app/lib/ful-config.js` | TIERS, COST_BASIS (migrating to legend) |
| `app/lib/cost-guard.js` | trackApiSpend(), budget checks |
| `app/lib/referral-engine.js` | calculateMonthlyFul(), fulToDollars() |

---

## 12. Files to Modify

| File | Changes |
|:---|:---|
| **`lib/ful-legend.js`** | **NEW — single source of truth for all economics** |
| `app/api/chat/route.js` (2,885 lines — edit surgically) | Prompt caching headers, anchor fetch, coverage hint, kb_search tool + executor, wire circuit breaker, retry wrapper, billing state injection, habit engine query, ecosystem tracking, speculative prefetch, remove low-fuel system prompt injection |
| `lib/ful-config.js` | Import from legend, Free → Trial, remove duplicated values |
| `lib/cost-guard.js` | Import from legend, wire circuit breaker, dynamic spend caps |
| `lib/vault-tokens.js` | Simplify to pinned/always pass-through (keep keyword as fallback) |
| `lib/use-chat-context.js` | Remove eager Numbrly/TrueGauge loads |
| `app/api/chat/greeting/route.js` | Compute + cache anchor context |
| `lib/use-chat.js` | Billing state machine, graceful exit, wrap-up credit, resume flow |
| `components/ChatContent.js` | Credit warning UI, disabled-but-accessible state, value-framed upsell cards |
| `app/pricing/page.js` | Monthly/annual toggle, value copy, 14-day trial framing — all from legend |
| `app/app/settings/page.js` | All dashboard fixes: labels, legend imports, new fields |
| `app/app/api/referrals/admin/route.js` | Legend imports, add cost/msg calc, add BYOK count, fix Conv % |
| `app/lib/referral-engine.js` | Import Fül exchange + tier defs from legend |
| Onboarding flow | "What will you use Fülkit for?" → seed `user_patterns` |
| `/api/referrals/claim` | Verify safeguards (existing account block, self-referral block) |
| Stripe Dashboard / API | Annual prices, trial period 14d, portal config |

**New:** `lib/ful-legend.js`, `user_patterns` table
**New session state:** `activeEcosystem`, `prefetchCache`, `billingState`

**⚠️ `route.js` warning:** This file is 2,885 lines. Never bulk-rewrite. Always read the full file first, then make targeted edits with clear before/after. Test after each change.

---

## 13. Verification Checklist

### Config Legend
- [ ] `ful-legend.js` exists and is sole source for all economics
- [ ] No hardcoded pricing/plan/cap/rate values exist outside legend
- [ ] `getSpendCap()` auto-derives from cost basis
- [ ] All pages, calculators, dashboards, projections import from legend
- [ ] Changing `targetCostPerFul` recalculates: spend caps, projections, milestones

### Billing & Credits
- [ ] Trial: 14 days, 150 msgs, 1 integration, 10 notes, $2.50 cap
- [ ] "Free" is now "Trial" everywhere — config, dashboards, pricing page
- [ ] Referral-earned plans are credit offsets on Standard/Pro, not a separate tier
- [ ] Referral claim blocks existing accounts + self-referral
- [ ] Billing state machine: 90% → 98% → 99% → 100% → resumed
- [ ] Last message always complete before sign-off
- [ ] At limit: input disabled, everything else accessible
- [ ] ReFül → resumes with context ("Welcome back")
- [ ] Value-framed upsells use real usage data from ful_ledger + Habit Engine
- [ ] Annual plans live with monthly/annual toggle on pricing page
- [ ] BYOK/Owner skip billing state machine entirely
- [ ] Low fuel: client UI at 90%, not system prompt injection at 80%
- [ ] Pro upsell messaging appears when Standard user hits 80%+

### Cost & Performance
- [ ] Prompt caching active — verify SDK version supports it first
- [ ] Circuit breaker wired and tested
- [ ] System prompt ≤ 12K tokens — check `[chat:debug]` → `systemPromptEstTokens`
- [ ] Cost per message ≤ $0.02 — check `[chat:debug]` → `totalCost`
- [ ] Spend cap never fires before Fül limit (test Standard at 450 msgs)
- [ ] Telemetry: cost/msg distribution, output tokens/tier, tool calls/msg
- [ ] No eager integration loading

### Owner Dashboards
- [ ] "Free" → "Trial" in Revenue by Plan and Subscribers card
- [ ] Referral-earned plans show under actual tier with "(referral)" tag
- [ ] Conv % excludes owner/BYOK from denominator
- [ ] Payout obligations label fixed
- [ ] Total costs/mo includes pending payouts
- [ ] Monthly trend start date dynamic
- [ ] $/user labeled "$/paying user"
- [ ] BYOK count visible
- [ ] Credit revenue line added to Financials
- [ ] Net ARPU displayed alongside gross
- [ ] Cost per message (actual) field exists post-optimization
- [ ] MRR imports plan prices from legend
- [ ] `referral-engine.js` imports from legend
- [ ] Revenue projections table uses `COST_BASIS.targetCostPerFul` from legend
- [ ] Milestones recalculate dynamically from projection math
- [ ] "Credits" column renamed to "Ref Credits" in projections
- [ ] "6 free seats" comes from `PROJECTIONS.freeSeatsDefault` or real data
- [ ] Legend change → all dashboards and projections reflect immediately

### Habit Engine
- [ ] Onboarding seed: "What will you use Fülkit for?" → patterns planted at frequency 3
- [ ] Predictions at 80%+ accuracy after 10 repetitions
- [ ] Ecosystem stickiness across related topic shifts within a conversation
- [ ] Clean ecosystem break + clarifying question on mismatch
- [ ] Speculative prefetch makes topic pivots instant
- [ ] Semantic fallback (Tier 2) for new topics with no pattern history
- [ ] Post-conversation logging: tools called + trigger words + time + ecosystem

### Core Chat
- [ ] No walls — 15+ message conversation, every message gets substantive response
- [ ] Retry on Anthropic 429/529 with exponential backoff
- [ ] KB tool: "what's Fülkit pricing" → kb_search fires, complete answer
- [ ] Compression maintains thread post-80K (Phase 8 test protocol)
- [ ] Voyage fallback to keyword matching on failure

---

## 14. The Pitch

**To users:** "Fülkit is the one thing your 10 other apps can't do. Talk to your Square, check your Trello, DJ your Spotify, query your notes — one conversation. The more you use it, the faster it gets. Math organized your data, not AI."

**To investors:** "Convenience layer for fragmented SaaS. Habit Engine cuts per-message cost 87% while improving accuracy. Referral-driven growth with $0 acquisition cost per referred user and always-positive unit economics. Break-even at 20 paying users. $6.48 average margin per Standard user."

**The feel:** Your coworker who's been here six months. Reaches into your services when you ask. Checks out like a friend: "Here's where we're at, everything's safe, reFül or I'll see you April 1st."

---

*Last updated: March 19, 2026 — Final spec. All audits complete. All gaps closed. Claude Code ready.*
