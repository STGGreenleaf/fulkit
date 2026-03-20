# Fülkit Chat Feature — Full Scope Audit

> Generated 2026-03-19 from live codebase. Every value pulled from source code, not estimated.

---

## 1. THE API CALL

**File:** `app/app/api/chat/route.js` (~2,885 lines)

### Model Selection (`getModelConfig()`, line 55)

| Tier | Model | max_tokens | compressAt |
|------|-------|-----------|------------|
| Free | `claude-sonnet-4-6` | 2,048 | 80,000 |
| Standard | `claude-sonnet-4-6` | 2,048 | 80,000 |
| Pro | `claude-sonnet-4-6` | 4,096 | 80,000 |
| Owner | `claude-opus-4-6` | 128,000 | 180,000 |
| BYOK | `claude-opus-4-6` | 128,000 | 180,000 |

Source: `lib/ful-config.js` lines 11-83.

### Streaming Call (line 2519)

```js
const stream = anthropic.messages.stream({
  ...baseOpts,    // { model, max_tokens, system, tools? }
  messages: loopMessages,
});
```

**No other generation parameters.** No `temperature`, no `top_p`, no `top_k`. All use Claude defaults.

**No prompt caching.** No `cache_control`, no `anthropic-beta` headers. Every request pays full input token cost.

**Anthropic SDK:** `@anthropic-ai/sdk` ^0.78.0 (`package.json`)

### Vercel Config

- `export const maxDuration = 120;` (line 1) — 2 minute serverless function limit
- Tool loop: `MAX_LOOP_MS = 50000` (50s, line 2460) — stays under Vercel's limit
- `MAX_TOOL_ROUNDS = 5` (line 2413)
- `TOOL_TIMEOUT_MS = 15000` (15s per tool, line 2414)
- `MAX_TOOL_RESULT_CHARS = 50000` (~12.5K tokens, line 2415)

---

## 2. CONTEXT ASSEMBLY

### System Prompt Sections (lines 2171-2378)

Built in order, subject to `SYSTEM_TOKEN_BUDGET = 40,000` tokens:

| Section | Source | Est. Tokens |
|---------|--------|------------|
| BASE_PROMPT (guidelines, biography layer, folder conventions) | Hardcoded, lines 72-90 | ~800 |
| Date + timezone | Computed | ~20 |
| Low fuel notice (≥80% usage) | Conditional | ~150 |
| User preferences (tone, frequency, chronotype) | `preferences` table | ~50-200 |
| Memories (`memory:*` keys) | `preferences` table | ~100-2,000 |
| Recent conversations (25 titles) | `conversations` table | ~100-500 |
| Vault context (user notes) | Client-assembled, 15 items max | ~500-15,000 |
| KB docs (broadcasts + owner docs) | `vault_broadcasts` table, scored by keyword relevance | ~0-10,000 |
| Referral whisper | Conditional | ~200 |
| Square inventory instructions | If Square connected | ~150 |
| GitHub repo hint | If GitHub connected | ~50-100 |

### Vault Note Selection (client-side)

**File:** `lib/vault-tokens.js`

```
TOKEN_BUDGET = 25,000 tokens (line 4)
```

Selection logic (`selectContext()`, lines 31-79):
1. Filter out `context_mode === "off"`
2. Priority tier first: `context_mode === "always"` OR `pinned` OR path contains `_FULKIT/` or `_CHAPPIE/`
3. Score remaining by keyword overlap: title match = +3, content match = +1 per word
4. Fill until token budget hit

**Client cap:** 15 items (`use-chat-context.js` line 311)
**Server cap:** 20 items (route.js line 2071)
**Token estimation:** `Math.ceil(text.length / 4)` (route.js line 94)

### KB Doc Selection (server-side)

Keyword scoring (`scoreDoc()`, route.js): matches last 3 user messages against doc title (+3/word) and first 500 chars of content (+1/word). Docs with score 0 are excluded entirely. Remaining docs included highest-score-first until 40K budget is hit.

### Parallel Data Fetch (route.js lines 2102-2162)

Single `Promise.all` block fetches 7 things simultaneously:
1. Preferences + memories (`preferences` table)
2. Recent conversations (`conversations` table, 25 most recent)
3. Broadcast context (`vault_broadcasts` where channel='context', active=true)
4. Owner docs (`vault_broadcasts` where channel='owner-context', active=true)
5. Referral profile (`profiles` table)
6. Integration tokens (8 parallel: Numbrly, TrueGauge, Square, Shopify, Stripe, Toast, Trello, GitHub)
7. Stripe prices (cached 1hr)

All queries have `AbortSignal.timeout(5000)` and `.catch(() => [])`.

### Conversation Compression (lines 105-188)

Triggers when total message tokens exceed `compressAt` (80K for Sonnet, 180K for Opus). Algorithm:
1. Keep most recent messages (up to 60% of budget)
2. Summarize older messages into structured block: extracted topics + key points
3. Prepend as `[Earlier in this conversation (N messages): ...]`

### Integration Context

Numbrly and TrueGauge context summaries fetched eagerly on chat page mount (`use-chat-context.js` lines 52-82) and included in every message's context array. GitHub repo trees also loaded on mount. These add 2-5K tokens per message regardless of topic.

### Embeddings

Voyage 3.5-lite (1024d) embeddings exist in `notes.embedding` column. Used **ONLY** for the `notes_search` tool (semantic recall). **NOT** used for main context selection — that's pure keyword matching.

---

## 3. TOKEN MATH

### Pricing Per Token (`lib/cost-guard.js` lines 11-22)

| Model | Input | Output |
|-------|-------|--------|
| `claude-opus-4-6` | $15.00 / 1M tokens | $75.00 / 1M tokens |
| `claude-sonnet-4-6` | $3.00 / 1M tokens | $15.00 / 1M tokens |

### Real Debug Output (Owner, Opus, all integrations connected)

```
systemPromptEstTokens: 120,651
inputTokens: 151,013
outputTokens: 55
totalCost: $2.27
```

**Back-calculation:** (151,013 × $0.000015) + (55 × $0.000075) = $2.265 + $0.004 = **$2.269** ✓ Opus pricing confirmed.

### Cost Per Message by Tier

| Tier | Model | Typical Input | Typical Output | Est. Cost/Message |
|------|-------|--------------|----------------|-------------------|
| Owner (pre-budget fix) | Opus | 151K | 500 | **$2.30** |
| Owner (post-budget fix) | Opus | ~50K | 500 | **$0.79** |
| Pro | Sonnet | ~30K | 500 | **$0.10** |
| Standard/Free | Sonnet | ~30K | 300 | **$0.09** |

### Token Budget & Safety

- `SYSTEM_TOKEN_BUDGET = 40,000` — system prompt hard cap (route.js line 2214)
- No hard ceiling on total input before sending to Claude API
- If Claude API rejects (payload too large), falls through to generic error: "Something went wrong. Try again."
- Compression prevents runaway conversation growth (80K/180K thresholds)

### Cost Tracking

`trackApiSpend()` (`cost-guard.js` line 66): reads `profiles.api_spend_this_month`, adds `estimateCost()` result, writes back. Fire-and-forget after stream completes. Skipped for BYOK and owner.

### Debug Telemetry

Two SSE events per message:
- **`{debug: {...}}`** — model, tokens, context items, tools, KB included/excluded
- **`{debugPost: {...}}`** — rounds, inputTokens, outputTokens, totalCost, toolsUsed, elapsedMs

Client logs both as `[chat:debug] ─── REQUEST/RESPONSE ───`.

---

## 4. PAYMENT & BILLING

### Plan Tiers (`ful-config.js`)

| Plan | Price | Messages/Month | Model | Max Tokens |
|------|-------|---------------|-------|-----------|
| Free | $0 | 100 | Sonnet | 2,048 |
| Standard | $9/mo | 450 | Sonnet | 2,048 |
| Pro | $15/mo | 800 | Sonnet | 4,096 |
| Credits | $2 one-time | +100 messages | — | — |

### Fül Credit Mechanics

**One Fül = one chat request.** Decremented via `increment_message_count` RPC (fire-and-forget, line 2382). Tool rounds within a request do NOT cost additional Fül. BYOK and owner exempt.

**At limit:** Returns 429 with "You burned through all {limit} messages this month. Drop in your own API key to keep going — unlimited, no cap."

**Credit purchase:** Stripe one-time payment. Webhook reduces `messages_this_month` by purchase amount (e.g., buy 100 credits → subtract 100 from counter). Lookup key: `fulkit_credits_100`.

### Cost Ceilings (Secondary Safeguard)

| Tier | Monthly API Spend Cap |
|------|--------------------|
| Free | $1.50 |
| Standard | $13.50 |
| Pro | $12.00 |

Enforced by `checkUserBudget()` in `cost-guard.js`. If `api_spend_this_month >= ceiling`, returns 429.

### Circuit Breaker (Global)

- Yellow: API spend ≥ 50% of MRR → alert owner
- Red: ≥ 60% of MRR → throttle to `max_tokens: 1024`
- Not currently called in the chat route (defined but not wired)

### Referrals

- $1/month credit per active referral
- 9 refs = free Standard ($9), 15 refs = free Pro ($15)
- Applied as negative Stripe invoice item on billing cycle
- Payout unlocks at Builder tier (25+ refs), minimum $10

### Owner/BYOK Special Access

Owner: Opus with 128K output, unlimited messages, no cost ceiling, Fülkit pays API cost.
BYOK: User's own Anthropic API key → Opus, unlimited, no Fül cap.

---

## 5. RATE LIMITING & THROTTLING

### Middleware Rate Limits (`middleware.js`)

| Endpoint | Limit | Window | Backend |
|----------|-------|--------|---------|
| `/api/chat` | 15 req | 60s sliding | Upstash Redis |
| `/api/stripe/checkout` | 5 req | 60s | Upstash Redis |
| `/api/referrals/claim` | 3 req | 60s | Upstash Redis |
| `/api/byok/*` | 5 req | 60s | Upstash Redis |
| Authenticated `/api/*` | 200 req | 60s | Upstash Redis |
| Unauthenticated `/api/*` | 60 req | 60s | Upstash Redis |

Fallback: in-memory map if Redis unavailable. Key: Bearer token hash (last 16 chars) for authed, IP for anon.

### Client-Side Debouncing

`streamingRef.current` (sync ref) blocks double-sends. If user clicks send while streaming, blocked with `[sendMessage] blocked — already streaming` log.

### Anthropic API Rate Limiting

**No retry logic.** If Anthropic returns 429/529, the SDK throws, caught in stream handler, user sees "Connection to AI was interrupted. Try again." One-shot only.

### Timeouts

| Timeout | Value | Location |
|---------|-------|----------|
| Client cold start (no chunks) | 45s | use-chat.js line 330 |
| Client mid-stream inactivity | 30s (rolling) | use-chat.js line 337 |
| Server tool execution | 15s per tool | route.js line 2414 |
| Server total loop | 50s | route.js line 2460 |
| Vercel function max | 120s | route.js line 1 |
| Supabase queries | 5s | AbortSignal.timeout throughout |

---

## 6. ERROR HANDLING & THE "WALL" PROBLEM

### Server-Side Error States

| Scenario | Handling | User Sees |
|----------|----------|-----------|
| Claude only returns tool_use (no text) | Loops up to 5 rounds, then final call without tools | Nothing until final response — could appear "stuck" |
| Tool execution hangs | 15s timeout, error result sent to Claude | Claude sees error, responds accordingly |
| Total loop > 50s | Breaks loop, final call without tools | Potentially incomplete response |
| Claude API 429/529 | SDK throws, caught, error sent via SSE | "Connection to AI was interrupted. Try again." |
| Context window exceeded | No pre-check; API rejects, caught in outer try/catch | "Something went wrong. Try again." |
| Stream fatal (uncaught) | Outer try/catch, logged + signaled, error SSE | "Something went wrong. Try again." |

### Client-Side Error States

| Scenario | Handling | User Sees |
|----------|----------|-----------|
| Non-200 response | Parse error, show in chat bubble | Error message with retry button (`_failed: true`) |
| Rate limit (429) | Show error, no retry | "You burned through all X messages..." (`_capped: true`) |
| Stream error mid-response | Flush buffer, append error, mark failed | Partial response + error + retry button |
| Cold start timeout (45s) | Abort, show timeout | "Took too long to respond." + retry |
| Mid-stream silence (30s) | Abort, show partial + error | Partial text + "Response interrupted — connection went silent." |
| authFetch empty body | `throw new Error("No response body")` → caught | Error in chat bubble |

### Recent Fixes (This Session)

1. **`msgCount` scoping** — was `const` in try, used in catch. Now `let` above try.
2. **`sandboxMode` scoping** — same issue. Now `let` above try.
3. **Permanent stream lock** — setup code between lock and try could throw uncaught. Now all setup code is inside try/catch/finally. Lock always releases.

### Signals Tracked Server-Side

- `rate_limit` — Fül cap exceeded
- `cost_ceiling` — API spend cap exceeded
- `token_refresh_failed` — Integration OAuth refresh failed
- `message_count_failed` — Fül increment RPC failed
- `tool_error` — Tool execution returned error
- `chat_stream_fatal` — Uncaught error in stream handler

### No Retry Logic

Neither client nor server retry failed Claude API calls. One-shot only. User must manually retry (retry button shown for `_failed` messages).

---

## 7. INFRASTRUCTURE

### Hosting & Deployment

- **Vercel** serverless functions, Next.js 16.1.6, React 19.2.3
- **Supabase** for auth + Postgres + RLS
- **Upstash Redis** for distributed rate limiting
- **vercel.json** crons: payout (monthly 1st), tax-check (annual Jan 15), hot-seat cleanup (monthly 1st)

### Environment Variables (Chat Path)

1. `ANTHROPIC_API_KEY` — Claude API
2. `VOYAGE_API_KEY` — Voyage embeddings (optional)
3. `STRIPE_CLIENT_SECRET` — Price fetching
4. `NEXT_PUBLIC_SUPABASE_URL` — Supabase client
5. `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
6. `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin
7. `NODE_ENV` — Dev mode check
8. `TRELLO_API_KEY` — Trello tool integration
9. `UPSTASH_REDIS_REST_URL` — Rate limiting
10. `UPSTASH_REDIS_REST_TOKEN` — Rate limiting

### Supabase Tables Hit Per Chat Message

| Table | Operation | Purpose |
|-------|-----------|---------|
| `profiles` | READ | Seat type, message count, API spend, role |
| `preferences` | READ | BYOK key, prefs, memories |
| `conversations` | READ | Recent conversation titles |
| `vault_broadcasts` | READ | KB docs (broadcasts + owner context) |
| `integrations` | READ | OAuth tokens (8 providers) |
| `profiles` | WRITE | Increment message count (RPC), update last_message_date, track API spend |
| `user_events` | WRITE | `chat_sent` event |
| `actions` | WRITE | Auto-resolve onboarding action |
| `notes` | READ | (via tools only — notes_search, notes_read) |

### Third-Party Calls Per Message

1. **Anthropic Claude API** — 1-6 calls (1 base + up to 5 tool rounds)
2. **Voyage AI** — 0 calls in normal flow (only if `notes_search` tool is called)
3. **Integration APIs** — 0-N calls (only if Claude calls tools: Square, Numbrly, etc.)
4. **Stripe** — 0-1 calls (price cache, 1hr TTL)

---

## 8. TOOLS

### Complete Tool Inventory (77 tools max)

**Always included (authenticated user) — 11 tools:**

| Array | Count | Tools |
|-------|-------|-------|
| ACTIONS_TOOLS | 3 | actions_create, actions_list, actions_update |
| MEMORY_TOOLS | 3 | memory_save, memory_list, memory_forget |
| NOTES_TOOLS | 4 | notes_search, notes_create, notes_read, notes_update |
| THREADS_TOOLS | 1 | threads_create |

**Conditional (integration connected):**

| Array | Count | Gate | Tools |
|-------|-------|------|-------|
| NUMBRLY_TOOLS | 10 | `nblKey` | numbrly_summary, get_build, get_component, get_vendor, search, simulate_price, simulate_cost, target_margin, list_builds, list_alerts |
| TRUEGAUGE_TOOLS | 15 | `tgKey` | truegauge_context, summary, get_pace, get_cash, get_settings, list_expenses, list_day_entries, list_alerts, list_activity, search, simulate_pace, add_expense, update_day_entry, confirm, undo |
| SQUARE_TOOLS | 15 | `sqToken` | square_daily_summary, orders, payments, catalog, inventory, customers, customer_detail, invoices, refunds, catalog_full, inventory_update, locations, team, shifts, confirm |
| SHOPIFY_TOOLS | 6 | `shopifyToken` | shopify_daily_summary, orders, products, customers, inventory, shop_info |
| STRIPE_TOOLS | 8 | `stripeToken` | stripe_daily_summary, charges, customers, subscriptions, invoices, balance, payouts, refunds |
| TOAST_TOOLS | 6 | `toastToken` | toast_daily_summary, orders, menu, employees, labor, restaurant_info |
| TRELLO_TOOLS | 7 | `trelloToken` | trello_boards, lists, cards, card_detail, create_card, update_card, add_comment |
| GITHUB_TOOLS | 1 | `ghToken` | github_fetch_files |

**Token cost estimate:** ~200 tokens per simple tool, ~400 for complex (nested schemas). All 77 tools ≈ 12-16K tokens.

### Tool Execution Flow

1. Claude streams text + returns `stop_reason: "tool_use"`
2. Server executes each tool call with `withTimeout(fn, 15000)`
3. Results capped at 50K chars, fed back as `tool_result` messages
4. Loop continues (max 5 rounds, 50s total)
5. If loop exhausted → final call without tools so Claude produces text

### Tool Calls Do NOT Cost Extra Fül

`increment_message_count` fires once per request (line 2382), before streaming starts. Tool rounds don't increment.

---

## 9. GREETING / SESSION INIT

**File:** `app/app/api/chat/greeting/route.js`

- **Model:** `claude-haiku-4-5-20251001` (cheap, fast)
- **Max tokens:** 200
- **Cache:** 1-hour TTL in `preferences` table (key: `cached_greeting`)
- **Data fetched (parallel):** profile name, active tasks (10), memories, recent conversations (5), connected integrations, voice greeting doc
- **Prompt:** 1-3 sentence friend-tone greeting, references tasks/memories naturally

### Session Management

Conversations created client-side via `ensureConversation()` in `use-chat.js`:
- Inserts into `conversations` table with user_id + title (first message truncated to 60 chars)
- `conversationId` passed to server on subsequent messages
- Messages saved individually to `messages` table (fire-and-forget)
- Topics extracted post-response via frequency math (top 8 keywords)

---

## 10. CRITICAL FINDINGS

### Cost Sustainability at Scale

**Pre-budget fix (120K system prompt, Opus):**
- $2.27/message × 100 msgs/mo = **$227/user/month** (Free tier charges $0)
- This is catastrophically unsustainable

**Post-budget fix (40K system prompt, Opus for owner only):**
- Owner: ~$0.79/msg (Fulkit pays — acceptable for 1 owner)
- Sonnet users: ~$0.09/msg × 450 msgs = **$40.50/mo cost** on a $9/mo Standard plan
- **Standard plan loses $31.50/user/month at full usage**

**Sonnet cost math at stated $0.015 avg cost basis:**
- $0.015/msg × 450 = $6.75/mo → Standard plan ($9) has $2.25 margin ✓
- But $0.015 assumes ~5K input tokens — current system sends ~30K+, making real cost ~$0.09/msg

**The $0.015 blended cost assumption in `COST_BASIS` is stale.** With 30K+ input tokens per Sonnet message, real cost is 6x higher.

### Prompt Caching — Missing Money

Anthropic offers prompt caching (90% discount on cached input tokens). The system prompt is mostly static across messages in a conversation. Enabling `cache_control` on the system prompt would reduce input costs by ~60-80% for multi-turn conversations. **This is the single highest-impact cost optimization available.**

### No Retry Logic

If Anthropic API is overloaded (529) or rate-limited (429), the user gets a dead error. No exponential backoff, no queue. At scale with concurrent users, this will be the primary "wall" cause.

### Circuit Breaker Not Wired

`checkCircuitBreaker()` is defined in `cost-guard.js` but never called in the chat route. The global spend safeguard doesn't actually fire.
