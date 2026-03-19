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
- [ ] **1.14** Set trial duration: 14 days (requires Stripe dashboard — `trial_period_days`)
- [x] **1.15** Set trial message limit: 150 total (in legend PLANS.trial.fulTotal)
- [x] **1.16** Set trial spend cap: $2.50 (in legend PLANS.trial.spendCap)
- [ ] **1.17** Set trial integrations: 1 (value in legend, enforcement not yet built)
- [ ] **1.18** Set trial vault notes: 10 max (value in legend, enforcement not yet built)
- [ ] **1.19** Confirm trial expiry shows clear CTA (requires trial_started_at tracking)

### Annual Plans
- [ ] **1.20** Create Stripe Price: `standard_annual` at $90/yr (Stripe dashboard)
- [ ] **1.21** Create Stripe Price: `pro_annual` at $150/yr (Stripe dashboard)
- [ ] **1.22** Add monthly/annual toggle to pricing page
- [ ] **1.23** Wire checkout links to correct Stripe price based on toggle
- [ ] **1.24** Handle mid-cycle proration (monthly ↔ annual) — test with Stripe test mode
- [ ] **1.25** Update Stripe billing portal to show annual option

### Page Copy
- [ ] **1.26** Rewrite pricing page: 14-day trial framing, annual toggle, value-per-dollar copy
- [ ] **1.27** Rewrite landing page trial references: "14 days. 150 messages. See exactly how Fülkit changes the way you work."
- [ ] **1.28** All pricing copy imports values from legend (not hardcoded in JSX)

### Dashboard Polish
- [ ] **1.29** Add BYOK count to Subscribers card (needs preferences query in admin route)
- [ ] **1.30** Add credit revenue line to Financials (Stripe charges with `fulkit_credits_*` lookup)
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

- [ ] **2.1** In `app/api/chat/greeting/route.js`: after generating greeting, compute anchor context block (~500 tokens)
- [ ] **2.2** Anchor includes: recent conversation topics (from conversations.topics), active tasks (top 5 from actions), connected integrations, hot notes (5 most recent titles)
- [ ] **2.3** Cache anchor in preferences table (key: `anchor_context`, same pattern as `cached_greeting`, 1hr TTL)
- [ ] **2.4** In `app/api/chat/route.js`: fetch `anchor_context` in the Promise.all data block
- [ ] **2.5** Inject anchor into system prompt as `## Daily Context` section (after base prompt)
- [ ] **2.6** Add coverage hint to end of system prompt (~100 tokens): "Notes: N of total loaded (use notes_search for others). KB: Brand Voice loaded. Use kb_search for others. Integrations: [list] connected — use their tools for live data."
- [ ] **2.7** Test: open app, check `[chat:debug]` — anchor context should reflect recent activity
- [ ] **2.8** Test: ask about a topic NOT in anchor — Claude should use tools to fetch, not hallucinate

**Phase 2 total: 8 tasks**

---

## Phase 3: Habit Engine v1 (Days 9–14)

*Goal: Chappie knows your routines. Loads what you need, not everything it has.*

### Schema + Logging
- [ ] **3.1** Create `user_patterns` table in Supabase (user_id, trigger_phrase, action_taken, ecosystem, context_loaded[], frequency, last_seen, time_of_day)
- [ ] **3.2** Add UNIQUE constraint on (user_id, trigger_phrase, action_taken)
- [ ] **3.3** Add RLS policy: users can only read/write their own patterns
- [ ] **3.4** Post-conversation: log which tools Claude actually called (from tool_use blocks in response)
- [ ] **3.5** Post-conversation: extract trigger words from user messages (reuse History Chat stopword filter)
- [ ] **3.6** Post-conversation: log time_of_day bucket (morning/afternoon/evening)
- [ ] **3.7** Post-conversation: log active ecosystem
- [ ] **3.8** INSERT new patterns or UPDATE frequency + last_seen on existing (UPSERT)

### Pattern Matching (Pre-Message)
- [ ] **3.9** On each message: extract keywords from user message
- [ ] **3.10** Query `user_patterns` for matching trigger_phrase with this user_id
- [ ] **3.11** If highest match frequency ≥ 10 AND single ecosystem (≥90% confidence): load only that ecosystem's context
- [ ] **3.12** If split confidence (50-90%): inject clarifying question instruction into system prompt ("Ask which ecosystem — short, specific, friend tone")
- [ ] **3.13** If low confidence (<50%): fall through to Tier 1 (anchor) + Tier 2 (semantic)
- [ ] **3.14** Verify: context loaded by Habit Engine is dramatically smaller than current full load

### Ecosystem Stickiness
- [ ] **3.15** Track `activeEcosystem` in session state (server-side, per conversation)
- [ ] **3.16** On each message: score new message against active ecosystem keywords
- [ ] **3.17** If any association with active ecosystem: stay in ecosystem (don't re-evaluate)
- [ ] **3.18** If zero overlap AND no pattern match: break ecosystem, fall to Tier 1/2 or clarify
- [ ] **3.19** Ecosystem resets on new conversation

### Speculative Prefetch
- [ ] **3.20** After sending response: background process (non-blocking) identifies top 2 likely next needs
- [ ] **3.21** Pre-fetch context for top 2 predictions (DB reads only, no API cost)
- [ ] **3.22** Store in `prefetchCache` session state
- [ ] **3.23** If next message matches prediction: serve from cache (skip normal context loading)
- [ ] **3.24** If prediction wrong: cache evaporates, normal context loading proceeds

### Onboarding Seed
- [ ] **3.25** Add "What will you mainly use Fülkit for?" step to onboarding flow
- [ ] **3.26** Map selections to ecosystem seeds (Square, Trello, Notes, Numbrly, Spotify, or none)
- [ ] **3.27** INSERT seeds into `user_patterns` at frequency: 3
- [ ] **3.28** Verify: trial user's first message gets Habit Engine bias from seed (not generic response)

**Phase 3 total: 28 tasks**

---

## Phase 4: Server-Side Semantic Context (Days 15–18)

*Goal: New topics the Habit Engine hasn't seen get smart note selection.*

- [ ] **4.1** In `app/api/chat/route.js` Promise.all block: embed user's last message via `getQueryEmbedding()` (Voyage)
- [ ] **4.2** Run `match_notes` RPC with embedded query (match_threshold: 0.5, match_count: 8)
- [ ] **4.3** Merge semantic results with client-sent pinned/always notes
- [ ] **4.4** Cap merged notes at reactive budget (8K tokens Sonnet, 15K Opus)
- [ ] **4.5** Simplify `lib/vault-tokens.js` — client sends only always/pinned notes (stop scoring "available" notes client-side)
- [ ] **4.6** Simplify `lib/use-chat-context.js` — remove non-pinned note scoring, send only pinned + always + attached files
- [ ] **4.7** Implement fallback chain: if Voyage fails → serve cached last-successful results (5min TTL)
- [ ] **4.8** If cache miss → fall back to keyword matching (keep `relevanceScore()` in vault-tokens.js as fallback only)
- [ ] **4.9** Test: ask about juice → only juice notes in context. Ask about taxes → different notes
- [ ] **4.10** Test: disable Voyage API key → keyword matching kicks in, no crash

**Phase 4 total: 10 tasks**

---

## Phase 5: KB Docs as Tool (Days 19–20)

*Goal: KB docs out of system prompt, into on-demand tool.*

- [ ] **5.1** Create `kb_search` tool definition with query parameter (NOT listing all titles in description)
- [ ] **5.2** Tool executor: query `vault_broadcasts` by keyword/semantic match against query, return content
- [ ] **5.3** Remove KB doc injection from system prompt assembly in `route.js`
- [ ] **5.4** Keep Brand Voice doc in system prompt always (~200 tokens — defines HOW Claude talks)
- [ ] **5.5** Test: ask "what's Fülkit pricing" → Claude calls `kb_search`, gives complete answer
- [ ] **5.6** Verify system prompt token reduction: check `[chat:debug]` → `systemPromptEstTokens` ≤ 12K

**Phase 5 total: 6 tasks**

---

## Phase 6: Value-Framed Upsells (Days 21–22)

*Goal: Every billing message shows what your money does, not just what it costs.*

- [ ] **6.1** Query `ful_ledger` for user's spending pattern (what categories of tasks they do most)
- [ ] **6.2** Query `user_patterns` for top 3 ecosystems/actions by frequency
- [ ] **6.3** Generate personalized value examples for HEADS_UP message ("enough to [thing you actually do] X more times")
- [ ] **6.4** Generate personalized value examples for WRAP_UP message
- [ ] **6.5** Fallback: if no ful_ledger/pattern data, use generic high-value examples
- [ ] **6.6** Wire Pro upsell comparison into HEADS_UP: "For a few dollars more, Pro gives you 800 messages plus longer responses"
- [ ] **6.7** Wire annual upsell: "Going annual saves you $18/year"
- [ ] **6.8** Test: Standard user at 98% sees personalized credit + Pro + annual options

**Phase 6 total: 8 tasks**

---

## Phase 7: Retry Logic + Error Polish (Days 23–24)

*Goal: Temporary failures retry automatically. Permanent failures explain clearly.*

- [ ] **7.1** Wrap Claude API call in retry wrapper: exponential backoff, 3 attempts on 429/529
- [ ] **7.2** During retry: stream "still thinking..." indicator to client (not silence)
- [ ] **7.3** After 3 failed retries: clear error message to user ("AI service is temporarily busy. Try again in a moment.")
- [ ] **7.4** Client UI: distinguish retriable errors (show auto-retry status) from terminal errors (show explanation + manual retry)
- [ ] **7.5** Distinguish in UI: "credits low" vs "AI busy, retrying" vs "something broke" — three different visual states
- [ ] **7.6** Test: simulate Anthropic 429 → verify automatic retry + user sees "thinking" not error

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
- [ ] **8.6** Add cost per message (actual) field to Financials: SUM(api_spend_this_month) ÷ SUM(messages_this_month)
- [ ] **8.7** Add net ARPU to Sales Center: (MRR - total API cost) ÷ paying users

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
