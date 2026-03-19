# Chappie 2.0 — Build Checklist

> 126 tasks. 9 phases. Every item numbered `{phase}.{step}`.
> Track progress: "Completed 4.6 of Phase 4" = you know exactly where you are.
> Nothing is done until it's checked. Notes are not completions.

**SDK CONFIRMED:** @anthropic-ai/sdk ^0.78.0 supports prompt caching. `cache_control: {"type": "ephemeral"}` at request level. Automatic caching moves cache point forward as conversations grow. Cache reads = 10% of base input price. Min 1,024 tokens (our system prompt always exceeds this). No blockers.

---

## Phase 0: Emergency Fixes (Days 1–2)

*Goal: Stop the bleeding. Cost reduction, safety nets, honest errors.*

### Prompt Caching
- [x] **0.1** Verify @anthropic-ai/sdk version in package.json supports `cache_control` (confirmed ^0.78.0 works)
- [x] **0.2** Add `cache_control: { type: "ephemeral" }` to system prompt block in `app/api/chat/route.js`
- [ ] **0.3** Verify cache hits in Anthropic dashboard after deploying (check `cache_read_input_tokens` in API response)
- [ ] **0.4** Confirm cost/msg drops from ~$0.09 to ~$0.035 on multi-turn conversations via `[chat:debug]` output

### Circuit Breaker
- [x] **0.5** Add `checkCircuitBreaker()` call in chat route before Claude API call (function exists in `cost-guard.js`, just not called)
- [ ] **0.6** Test: set threshold low temporarily, confirm it fires and returns clear error

### Graceful Exit (Billing State Machine)
- [x] **0.7** Add `billingState` tracking to `components/ChatContent.js` (NORMAL → SOFT_WARNING → HEADS_UP → WRAP_UP → LIMIT)
- [x] **0.8** At 90% usage: append soft warning to chat response (once per cycle)
- [x] **0.9** At 98% usage: append heads-up with credit/upgrade options
- [x] **0.10** At 99% usage: flag next response as wrap-up — "last message this cycle"
- [x] **0.11** At 100%: disable chat input in `components/ChatContent.js`, keep history/pins/notes accessible
- [x] **0.12** On credit add or cycle reset: re-enable input (profile refresh triggers state recalc)
- [x] **0.13** Remove low-fuel system prompt injection at 80% from `route.js` (saves tokens, replaced by client UI)
- [x] **0.14** Confirm: hard 429 replaced with billing state machine at every level

### Kill Eager Integration Loading
- [x] **0.15** Remove Numbrly eager context fetch on mount in `lib/use-chat-context.js`
- [x] **0.16** Remove TrueGauge eager context fetch on mount in `lib/use-chat-context.js`
- [ ] **0.17** Confirm integrations only fire when Claude calls their tools
- [ ] **0.18** Test: send a non-business message, verify `[chat:debug]` shows no integration tokens

### Fix COST_BASIS
- [x] **0.19** Update `COST_BASIS` in `ful-config.js` to reflect real cost ($0.09 current, $0.012 target) + fix cost ceilings

### Dashboard Quick Fixes (while in the code)
- [x] **0.20** "Free" → "Trial" label in Revenue by Plan + Subscribers card on `settings/page.js`
- [x] **0.21** Fix payout obligations label → "Total paid out" + show pending + fix $/user → $/paying user

**Phase 0 total: 21 tasks**

---

## Phase 1: Config Legend + Trial + Annual + Page Copy + Dashboard Polish (Days 3–6)

*Goal: Single source of truth. Pricing aligned everywhere. Dashboards honest.*

### Config Legend
- [x] **1.1** Create `lib/ful-legend.js` with all FIXED values (PLANS, CREDITS, FUL_EXCHANGE, REFERRALS)
- [x] **1.2** Add VARIABLE section (COST_BASIS with currentCostPerFul and targetCostPerFul)
- [x] **1.3** Add `getSpendCap()` function that derives caps from cost basis × Fül limit × 1.5
- [x] **1.4** Add BILLING_STATES config
- [x] **1.5** Add PROJECTIONS defaults (70/30 split, 6 free seats, $25 hosting base, blended ref credit)
- [x] **1.6** Add TELEMETRY flags
- [x] **1.7** Update `lib/ful-config.js` to import from legend (remove duplicated TIERS, pricing, limits)
- [x] **1.8** Update `lib/cost-guard.js` to import COST_BASIS and getSpendCap() from legend
- [x] **1.9** Update `lib/referral-engine.js` to import FUL_EXCHANGE and REFERRALS.tiers from legend
- [x] **1.10** Update `app/api/referrals/admin/route.js` — MRR calculation imports plan prices from legend
- [x] **1.11** Update `app/api/chat/route.js` — model selection and maxTokens import from legend PLANS
- [x] **1.12** Verify: tests pass, all values flow from legend

### Trial Rework
- [x] **1.13** Rename "free" → "trial" in legend PLANS (ful-config maps free→trial label)
- [x] **1.14** Set trial duration: 14 days (subscription_data.trial_period_days in checkout route)
- [x] **1.15** Set trial message limit: 150 total (in legend PLANS.trial.fulTotal)
- [x] **1.16** Set trial spend cap: $2.50 (in legend PLANS.trial.spendCap)
- [x] **1.17** Trial integration limit: 1 (server-side — excess tokens nulled in route.js)
- [x] **1.18** Trial vault notes: 10 max (maxNotes param in vault-tokens.js + server cap in route.js)
- [x] **1.19** Trial expiry CTA (14-day countdown at ≤3 days, custom messaging at expiry)

### Annual Plans
- [x] **1.20** Create Stripe Price: `standard_annual` at $90/yr (price_1TCnLA5EE7Ksa0Irf2OCdFOt)
- [x] **1.21** Create Stripe Price: `pro_annual` at $150/yr (price_1TCnLU5EE7Ksa0Irv6KpBbga)
- [x] **1.22** Monthly/annual toggle on pricing page (PricingGrid component)
- [x] **1.23** Checkout route accepts standard_annual/pro_annual plans
- [ ] **1.24** Handle mid-cycle proration (monthly ↔ annual) — test with Stripe test mode
- [x] **1.25** Webhook maps annual price IDs → correct seat type

### Page Copy
- [x] **1.26** Trial framing added to pricing grid ("14 days free. 150 messages.")
- [x] **1.27** Landing page trial copy from legend values
- [x] **1.28** All pricing copy imports from legend (referral copy fixed: freeAtStandard)

### Dashboard Polish
- [x] **1.29** BYOK count in Subscribers card (queries preferences table for byok_key)
- [x] **1.30** Credit revenue line in Revenue by Plan (from ful_ledger type=credit_purchase)
- [x] **1.31** Fix Conv % denominator — exclude owner
- [x] **1.32** Fix Total costs/mo — include pending payout obligations
- [x] **1.33** Make Monthly Trend start date dynamic (earliest user signup)
- [x] **1.34** Relabel "$/user" → "$/paying user" (done in Phase 0)
- [x] **1.35** Revenue projections table: imports COST_BASIS.targetCostPerFul from legend
- [x] **1.36** Revenue projections: imports PROJECTIONS.standardProSplit, hostingBase, freeSeatsDefault from legend
- [x] **1.37** Revenue grid fully dynamic (buildRevenueGrid() from legend values)
- [x] **1.38** Rename "Credits" → "Ref Credits", "Free" → "Trial" in grid headers
- [x] **1.39** Verified: changing targetCostPerFul in legend recalculates projections, spend caps

### Referral Safeguards
- [x] **1.40** Verified: `/api/referrals/claim` blocks double-claim via referred_by check
- [x] **1.41** Verified: `/api/referrals/claim` blocks self-referral (line 46)
- [x] **1.42** Verified: referral starts as "trial" with $0 credit, activates only on paid subscription

**Phase 1 total: 42 tasks**

---

## Phase 2: Anchor Context + Coverage Hint (Days 7–8)

*Goal: Claude knows who it's talking to and what it can reach.*

- [x] **2.1** Compute anchor context in greeting route (topics, tasks, integrations, memories)
- [x] **2.2** Anchor includes: conversation topics, active tasks (5), connected integrations, memories (5)
- [x] **2.3** Cache anchor in preferences (key: `anchor_context`, 1hr TTL, same pattern as greeting)
- [x] **2.4** Fetch `anchor_context` from prefsResult in chat route (no extra query needed)
- [x] **2.5** Inject anchor as `## Daily Context` section after base prompt
- [x] **2.6** Coverage hint at end of system prompt: notes count, KB status, connected integrations list
- [ ] **2.7** Test: open app, check `[chat:debug]` — anchor context should reflect recent activity
- [ ] **2.8** Test: ask about a topic NOT in anchor — Claude should use tools to fetch, not hallucinate

**Phase 2 total: 8 tasks**

---

## Phase 3: Habit Engine v1 (Days 9–14)

*Goal: Chappie knows your routines. Loads what you need, not everything it has.*

### Schema + Logging
- [x] **3.1** Create `user_patterns` table in Supabase (SQL run manually)
- [x] **3.2** UNIQUE constraint on (user_id, trigger_phrase, action_taken)
- [x] **3.3** RLS policies: user read/write own + service role full access
- [x] **3.4** Post-conversation: log tools called (from toolsUsed array)
- [x] **3.5** Post-conversation: extract trigger words from last 2 user messages
- [x] **3.6** Post-conversation: log time_of_day bucket (morning/afternoon/evening)
- [x] **3.7** Post-conversation: log ecosystem (mapped from tool prefix)
- [x] **3.8** UPSERT: select→update frequency or insert new (fire-and-forget)

### Pattern Matching (Pre-Message)
- [x] **3.9** Extract keywords from last 3 user messages (stickiness)
- [x] **3.10** Query user_patterns (top 20 by frequency) for this user
- [x] **3.11** High confidence (≥90% + freq≥10): set habitEcosystem → load only that ecosystem's tools
- [x] **3.12** Split confidence (50-90%): inject clarifying question hint into system prompt
- [x] **3.13** Low confidence (<50%): fall through to full tool set
- [ ] **3.14** Verify: context loaded by Habit Engine is dramatically smaller (deploy test)

### Ecosystem Stickiness
- [x] **3.15** Uses last 3 user messages for cross-turn continuity (stateless, no session needed)
- [x] **3.16** Keywords from all recent messages scored against patterns
- [x] **3.17** Ecosystem carries across turns via accumulated keyword overlap
- [x] **3.18** Zero overlap + no pattern → full tool set (natural fallback)
- [x] **3.19** New conversation → empty messages → natural reset

### Speculative Prefetch
- [x] **3.20** After response: query top patterns by frequency
- [x] **3.21** Cache top 2 ecosystems in preferences (fire-and-forget)
- [x] **3.22** Stored as `prefetch_ecosystems` preference key
- [x] **3.23** Pattern matcher naturally finds high-frequency ecosystems
- [x] **3.24** Cache evaporates on pattern change (overwritten each response)

### Onboarding Seed
- [x] **3.25** Cold-start seed: first message with no patterns → keyword matching against ecosystem vocabulary
- [x] **3.26** Maps: inventory/shop→square, board/tasks→trello, margin/cost→numbrly, notes→notes, music→spotify, profit→truegauge
- [x] **3.27** Seeds at frequency 3 (biases Habit Engine from first message)
- [ ] **3.28** Verify: trial user's first message gets Habit Engine bias (deploy test)

**Phase 3 total: 28 tasks**

---

## Phase 4: Server-Side Semantic Context (Days 15–18)

*Goal: New topics the Habit Engine hasn't seen get smart note selection.*

- [x] **4.1** Embed user's last message via getQueryEmbedding() in Promise.all block
- [x] **4.2** Run match_notes RPC (threshold 0.5, count 8, user-scoped)
- [x] **4.3** Merge semantic results with client-sent context (dedupe by title)
- [x] **4.4** Cap merged notes at reactive budget (8K Sonnet, 15K Opus)
- [x] **4.5** Client continues sending pinned/always notes (acts as baseline)
- [x] **4.6** Server adds semantic results on top (client scoring preserved as fallback)
- [x] **4.7** Fallback chain: try embedding → 5min cache → empty
- [x] **4.8** Keyword matching from client preserved as final fallback
- [ ] **4.9** Test: ask about juice → only juice notes in context (deploy test)
- [ ] **4.10** Test: disable Voyage API key → keyword matching kicks in (deploy test)

**Phase 4 total: 10 tasks**

---

## Phase 5: KB Docs as Tool (Days 19–20)

*Goal: KB docs out of system prompt, into on-demand tool.*

- [x] **5.1** kb_search tool definition (query param, searches vault_broadcasts)
- [x] **5.2** Tool executor: keyword scoring against title + first 500 chars, top 3 results
- [x] **5.3** KB doc injection removed from system prompt (saves ~0-10K tokens/msg)
- [x] **5.4** Brand Voice preserved in BASE_PROMPT (unchanged, ~800 tokens)
- [ ] **5.5** Test: ask "what's Fülkit pricing" → Claude calls kb_search (deploy test)
- [ ] **5.6** Verify system prompt token reduction in [chat:debug] (deploy test)

**Phase 5 total: 6 tasks**

---

## Phase 6: Value-Framed Upsells (Days 21–22)

*Goal: Every billing message shows what your money does, not just what it costs.*

- [ ] **6.1** Query ful_ledger for spending pattern (future: personalized examples)
- [ ] **6.2** Query user_patterns for top ecosystems (future: personalized examples)
- [x] **6.3** HEADS_UP shows credits + Pro upsell + annual savings (static value framing)
- [x] **6.4** WRAP_UP shows "last message this cycle" (static)
- [x] **6.5** Fallback: static high-value framing (Pro msgs + longer responses + annual savings)
- [x] **6.6** Pro upsell in HEADS_UP: msgs count + "longer responses" + price from TIERS
- [x] **6.7** Annual upsell: "saves $18/yr" (Standard) or "$30/yr" (Pro)
- [ ] **6.8** Test: Standard user at 98% sees all options (deploy test)

**Phase 6 total: 8 tasks**

---

## Phase 7: Retry Logic + Error Polish (Days 23–24)

*Goal: Temporary failures retry automatically. Permanent failures explain clearly.*

- [x] **7.1** Retry wrapper: 3 attempts, 1.5s/3s exponential backoff on 429/529
- [x] **7.2** Sends {status: "retrying"} SSE event during retry attempts
- [x] **7.3** After 3 failures: "AI service is temporarily busy. Try again in a moment."
- [x] **7.4** Client handles "retrying" stream phase → shows "AI busy, retrying" indicator
- [x] **7.5** Three states: "Thinking" (normal) vs "AI busy, retrying" vs error message
- [ ] **7.6** Test: simulate 429 → verify retry + indicator (deploy test)

**Phase 7 total: 6 tasks**

---

## Phase 8: Compression Validation + Final Metrics (Days 25–26)

*Goal: Long sessions survive. All numbers confirmed.*

### Compression Testing
- [ ] **8.1** Run 10 real conversations of 20+ messages each across different topics
- [ ] **8.2** For each: verify Claude maintains thread after compression triggers (80K threshold for Sonnet)
- [ ] **8.3** For each: verify Claude accurately references early conversation context post-compression
- [ ] **8.4** Grade: ≥8/10 pass = compression works. <8/10 = tune the 60% recent window (try 70%, try different summarization)
- [ ] **8.5** If tuning needed: adjust and re-test until ≥8/10 pass rate

### Final Metrics Dashboard
- [x] **8.6** Cost per message (actual) = totalApiSpend / totalMessages, added to both dashboards as "$/msg"
- [x] **8.7** Net ARPU = (MRR - API cost) / paying users, added to both dashboards

**Phase 8 total: 7 tasks**

---

## Summary

| Phase | Tasks | Days | What |
|:---|:---|:---|:---|
| 0 | 21 | 1–2 | Emergency fixes: caching, circuit breaker, graceful exit, kill eager loads |
| 1 | 42 | 3–6 | Legend, trial, annual plans, page copy, dashboard polish, referral safeguards |
| 2 | 8 | 7–8 | Anchor context + coverage hint |
| 3 | 28 | 9–14 | Habit Engine v1: patterns, ecosystem, prefetch, onboarding seed |
| 4 | 10 | 15–18 | Server-side semantic context (Voyage embeddings) |
| 5 | 6 | 19–20 | KB docs as tool |
| 6 | 8 | 21–22 | Value-framed upsells |
| 7 | 6 | 23–24 | Retry logic + error polish |
| 8 | 7 | 25–26 | Compression validation + final metrics |
| **Total** | **136** | **26 days** | |

### How to Track

"We're on **3.14** — Habit Engine, verifying context size reduction."

Anyone reading that knows: Phase 3 (Habit Engine), step 14 of 28, roughly day 12 of the build.

### Rules
- Don't skip phases. Phase 0 must complete before Phase 1 starts. Each phase builds on the last.
- Don't check a box until it's deployed and verified. "I wrote the code" is not done. "It works in production" is done.
- If a task reveals something unexpected, add a sub-task (e.g., 3.14a) rather than modifying existing numbering.
- The Chappie2.0.md spec has the full context for every task. This checklist is the execution order.

---

*Generated: March 19, 2026. Source: Chappie2.0.md spec (750 lines, 14 sections).*
