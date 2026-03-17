# Fül System — Referral & Credit Engine

> Living spec. Last updated: March 17, 2026.
> Status: **Locked — production ready.** Pricing, tiers, payouts, and automation finalized.

---

## Core Principle

Fül is the universal currency of Fülkit. All rewards, subscriptions, and payouts are denominated in Fül — never in dollars. Fülkit controls the Fül-to-dollar exchange rate, adjustable quarterly with 30 days notice. This insulates the business from API cost fluctuations. You're the central bank of Fül.

**If the cost of gas goes up, you adjust the pump price. The user sees Fül. You manage the margin behind it.**

---

## Fül Economy Basics

| Concept | Value |
|:---|:---|
| Standard subscription | 450 Fül/mo → $9 |
| Pro subscription | 800 Fül/mo → $15 |
| Buy credits | 100 Fül → $2 |
| Referral reward (base) | 100 Fül/mo per active referred user |
| Fül-to-cash rate (payouts) | 100 Fül = $1 (adjustable quarterly, 30 days notice) |

**The exchange rate is yours.** If API costs rise, you have three levers:
1. Adjust subscription price
2. Adjust Fül-per-tier allocation
3. Adjust buy-credit rate

Users never see API math. They see Fül in, Fül out.

---

## Cost Safeguards — Never Holding the Ball

Four layers. Each one catches what the one above misses. You sleep fine.

### Layer 1 — Per-User Caps (the Fül tank)
The Fül system IS the primary safeguard. Every user has a finite message count per month. But message count alone isn't enough — a single message with a massive context window costs more than 10 short ones. So:

- [x] **Per-message token ceiling:** Cap outbound tokens per API call (2,048 Standard, 4,096 Pro). Bounds the cost of any single interaction.
- [x] **Per-user monthly dollar ceiling:** Track cumulative API spend per user. If a user hits a hard dollar cap ($13.50 Standard, $12 Pro) their Fül tank reads empty — regardless of message count remaining. Belt and suspenders.
- [x] **Implemented:** `COST_CEILINGS` in `lib/ful-config.js`. Chat route checks before each call.

### Layer 2 — Global Circuit Breaker
A system-wide safety net that watches total spend across all users.

- [x] **Soft alert (yellow):** If total monthly API spend exceeds **50% of total monthly revenue** → alert to founder. Investigate.
- [x] **Hard throttle (red):** If total monthly API spend exceeds **60% of total monthly revenue** → automatic throttling kicks in:
  - Shorter max response tokens (4,096 → 1,024)
  - Alert to founder: "Circuit breaker tripped. Costs at X% of revenue."
- [x] **Configured:** `CIRCUIT_BREAKER` in `lib/ful-config.js` — `yellowPct: 0.50`, `redPct: 0.60`, `throttledMaxTokens: 1024`.

### Layer 3 — The Exchange Rate Lever (quarterly adjustment)
This is the elegant long-term protection. If costs creep up over a quarter:

- Option A: Adjust subscription price ($9 → $10)
- Option B: Adjust Fül allocation (450 → 400 at same $9)
- Option C: Adjust buy-credit rate ($2/100 → $2.50/100)
- Option D: Any combination

The user sees Fül. You manage dollars. The pump price changes, the experience doesn't. Terms of service include: "Fül values and subscription pricing may be adjusted quarterly to reflect operational costs, with 30 days written notice."

### Layer 4 — BYOK Escape Valve
For power users who consistently drain their tank every month.

- [x] **BYOK mode:** User provides their own Anthropic API key. All their API calls route through their key, not yours.
- [x] **Implemented:** BYOK key management at `/api/byok` (POST/GET/DELETE). BYOK users get Opus model, 128K context.
- [ ] **Platform fee:** TBD ($5/mo for BYOK users — access to Fülkit's brain, RAG, whispers, everything except API tokens).
- [ ] **Whisper trigger:** User has hit Fül cap 3+ months in a row → Fülkit whispers: "You're burning through Fül fast. Want to connect your own API key and go unlimited?"

### The math that lets you sleep

| Scenario | Revenue | API Cost | Margin | Status |
|:---|:---:|:---:|:---:|:---|
| Normal ops (costs at 40% of revenue) | $1,000 | $400 | 60% | Green. Business as usual. |
| Costs creeping (50%) | $1,000 | $500 | 50% | Yellow. Alert sent. Monitor. |
| Costs hot (60%) | $1,000 | $600 | 40% | Red. Throttle active. Plan rate adjustment. |
| Post-adjustment | $1,100 | $600 | 45% | Recovering. Lever pulled. |
| With BYOK adoption (10% of users) | $1,050 | $360 | 66% | Healthy. Heavy users off your books. |

**You are never surprised. The system watches itself.**

---

## Referral Structure — "Get Fülkit"

**Not "Share Fülkit."** The language matters. You're not asking users to do you a favor. You're offering them a path to free — and beyond.

### Model

- Single-level affiliate. No MLM. No second-level commissions. Ever.
- One referral = one person you personally brought in who is actively paying.
- Unlimited referrals. No cap. Every referral is net positive for Fülkit.
- Credits tied to **active** referred users. If they churn, the credit drops.
- Referral credit kicks in when referred user's **first payment clears** (after 30-day free trial). Trial period = no credit earned.

### Margin Math

- Blended revenue per referred user (70/30 Standard/Pro): ~$10.80/mo
- API cost (capped by Fül system): ~$4.50/mo
- **Gross margin per referred user: ~$6.30/mo**
- Standard margin: +$3.50/mo per referred user
- Pro margin: +$9.50/mo per referred user
- **Fülkit retains 79–84% of gross margin at every tier**

Volume does the heavy lifting. The per-referral rate stays modest. The pile gets bigger. Same economics as a juice shop — you don't need fat margins on one cup. You need volume through the door.

---

## Referral Tiers

> **Tier names: LOCKED — Piece → Component → Tool → Builder → Architect → Ambassador**
> Design filter: Dieter Rams — names describe what you ARE, not decorate.

| Tier | Name | Referrals | Fül/mo per Referral | Fülkit Retention | Unlocks |
|:---:|:---|:---:|:---:|:---:|:---|
| 1 | Piece | 1–6 | 100 Fül | ~84% | Subscription offset |
| 2 | Component | 7–14 | 100 Fül | ~84% | Approaching Standard-free |
| 3 | Tool | 15–24 | 100 Fül | ~84% | Pro covered, surplus Fül stacks |
| 4 | Builder | 25–99 | 110 Fül | ~83% | Cash payout unlocks (Fül → $) |
| 5 | Architect | 100–249 | 120 Fül | ~81% | Full payout scale |
| 6 | Ambassador | 250+ | 130 Fül | ~79% | Top tier, max earn rate |

> **Note:** Retention is higher than original 70% target because Standard at $9 and Pro at $15 improved the margin pool. More room to grow referral rewards later if needed — but start conservative, scale up. Easier to give more than to take away.

### What this looks like in practice

| Referrals | Tier | Fül Earned/mo | $ Value | Referrer Gets | Fülkit Nets |
|:---:|:---:|:---:|:---:|:---|:---|
| 3 | Piece | 300 | $3 | $3 off subscription ($6/mo) | $15.90/mo |
| 9 | Component | 900 | $9 | Standard = free | $47.70/mo |
| 15 | Tool | 1,500 | $15 | Pro = free | $79.50/mo |
| 25 | Builder | 2,750 | $27.50 | Free + $12.50 cash eligible | $130/mo |
| 50 | Builder | 5,500 | $55 | Free + $40 cash eligible | $260/mo |
| 100 | Architect | 12,000 | $120 | Free + $105 cash | $510/mo |
| 250 | Ambassador | 32,500 | $325 | Free + $310 cash | $1,250/mo |
| 500 | Ambassador | 65,000 | $650 | Free + $635 cash | $2,500/mo |
| 1,000 | Ambassador | 130,000 | $1,300 | Free + $1,285 cash | $5,000/mo |

**The ratio holds.** At every level, Fülkit earns more than the referrer. Volume is the referrer's reward, not a climbing rate.

---

## Cash Payouts

### Mechanism: Stripe Connect

- Already on Stripe for billing — one system for revenue AND payouts.
- Referrers onboard as "connected accounts" via Stripe Connect Express.
- Monthly automated batch: calculate Fül balance → convert cash-eligible portion → push payout.
- Handles 1099-NEC reporting for US payees over $600/year automatically.
- Fees: ~0.25% + $0.25 per payout (negligible).
- One cron job, never one-by-one.

### Payout rules

- Cash payout unlocks at Tier 4 / Builder (25+ referrals)
- Minimum payout threshold: **$10** — amounts under $10 roll over to the next month
- Payout frequency: Monthly (1st of each month, 6am UTC)
- Fül-to-cash rate published and adjustable quarterly with 30 days notice
- Below cash threshold or below Tier 4: all excess Fül stays as platform credit (bonus messages)

### Payout Automation — LIVE

- [x] **Monthly payout cron** (`/api/cron/payout`): Runs 1st of each month at 6am UTC via Vercel Cron
  1. Queries all Builder+ users with Stripe Connect accounts
  2. Calculates: Fül earned → subtract subscription offset → convert to dollars
  3. Checks $10 minimum — under $10 records as rollover, accumulates until threshold
  4. Executes Stripe Transfer to each connected account
  5. Logs in `payouts` table with status (paid/rollover/failed)
  6. Double-run protection: won't pay same user twice in a month
  7. Emits signals: `payout_batch_complete`, `payout_failed`
- [x] **Manual payout route** (`/api/referrals/payout`): Owner-triggered, same $10 minimum enforcement
- [x] **Annual tax check** (`/api/cron/tax-check`): Runs January 15 at 6am UTC
  - $600+ previous year → `tax_1099_required` signal (error level)
  - $400+ previous year → `tax_1099_warning` signal (warning level)
- [x] **Vercel Cron config**: `vercel.json` schedules set
- [x] **Payout status API** (`/api/referrals/payout/status`): Returns history, rollover balance, Connect status

---

## Anti-Gaming

The system is largely self-policing. Here's why:

**Fake paid accounts = terrible ROI.** Creating 9 fake accounts at $9/mo ($81 out of pocket) to earn 900 Fül ($9 value) in referral credits. Spending $81 to save $9. The math kills the incentive.

**Safeguards built in:**

| Threat | Mitigation |
|:---|:---|
| Free trial abuse | 30-day free trial already exists. Referral credit only kicks in when **payment begins** (trial end → first charge). No paid = no credit. |
| Friendly fraud (sign up, cancel after 1 month) | Credits tied to active users — cancel = credit drops. Self-correcting. |
| Stolen credit cards | Stripe Radar handles fraud detection. Not our job to build. |
| Self-referral | Email verification + simple duplicate detection. Low priority. |

**Bottom line:** Everything requires active paying users. The economics prevent gaming better than any rule system could.

---

## Where It Lives — Two Pages (both already built)

> **Non-destructive implementation.** Both pages exist. We are ADDING to them, not rebuilding. New components slot in alongside existing UI. Nothing breaks.

### settings/referrals (the earning side) — ADD:
- [ ] Referral link component (shareable, copy-to-clipboard)
- [ ] Tier status badge + progress bar to next tier
- [ ] Referral tree list (who you referred, active/inactive status, date joined)
- [ ] Fül earnings breakdown card (this month, all time, projected)
- [ ] Calculator component: "if you refer X more, here's what happens" (slider or input)
- [ ] CTA/cheatsheet card at top (for users who haven't started — see Ful_CTA.md)
- [ ] Export button (CSV of referral history + earnings)

### settings/billing (the paying side) — DONE + ADD:
- [x] Payout history table (if cash-eligible) with status per payout (paid/rollover/failed)
- [x] Payout method management (Stripe Connect onboarding link)
- [x] Rollover balance display (amber, accumulating toward $10)
- [x] Payout schedule text ("1st of each month. $10 minimum.")
- [ ] Fül balance display (earned + purchased, combined)
- [ ] Fül meter — visual gauge of usage this month vs. allocation

**Between these two screens, a user sees the complete picture:** what's coming in, what's going out, and how to tip the balance.

**Visual design principle:** A 5-year-old can understand it's money paid. No explanation needed — the numbers and visuals do the talking. If you have to read a paragraph to understand the page, the page failed. Rams: "Good design makes a product understandable."

---

## Stripe Implementation — Set and Forget

> **Goal:** Configure once, automate everything. No monthly manual work. No forgetting.

### Stripe Products & Prices

- [x] **Product: "Fülkit Standard"** — $9/mo recurring
- [x] **Product: "Fülkit Pro"** — $15/mo recurring
- [x] **Product: "Fül Credits"** — $2 per 100 Fül, one-time purchase (repeatable)
- [ ] **Set up 30-day free trial** on Standard and Pro subscription products
- [ ] **Enable Stripe Tax** for automatic sales tax collection (if applicable by state)
- [x] **Stripe Billing Portal** — users self-manage subscription changes, cancellation, payment method updates via `/api/stripe/portal`

### Stripe Connect (for referral payouts)

- [x] **Stripe Connect Express** — handles onboarding UI, identity verification, bank account, tax info
- [x] **Connected account onboarding flow** — when user hits Tier 4 (25+ referrals), "Connect Stripe" CTA in settings
- [x] **Connected account ID** (`acct_xxxx`) stored in `stripe_connect_account_id` on profiles table
- [x] **1099-NEC reporting** — Stripe Connect auto-generates and files for US payees earning $600+/year
- [x] **Additional tax monitoring** — `/api/cron/tax-check` flags $400+ (warning) and $600+ (required) annually

### Automated Payout Pipeline — LIVE

- [x] **Monthly payout cron** (`/api/cron/payout`): see Cash Payouts section above
- [x] **Vercel Cron**: `0 6 1 * *` (payout) and `0 6 15 1 *` (tax check)
- [x] **Signal emissions**: `payout_batch_complete`, `payout_failed`, `tax_1099_required`, `tax_1099_warning`
- [ ] **Payout failure retry** — if a transfer fails, retry once after 3 days, then flag for manual review

### Stripe Referral Tracking

- [x] **`referred_by` field** on profiles — populated at signup via referral link URL param
- [x] **Webhook: `customer.subscription.created`** — activates referral credit when first payment clears
- [x] **Webhook: `customer.subscription.deleted`** — deactivates referral credit, recalculates referrer stats
- [x] **Webhook: `invoice.payment_failed`** — flags referral as at-risk

### Supabase Tables

- [x] **`referrals` table:** id, referrer_id, referred_id, status (trial/active/churned), credit_ful_per_month, stripe_customer_id, activated_at, deactivated_at
- [x] **`payouts` table:** id, user_id, amount_ful, amount_usd, stripe_transfer_id, status (pending/paid/failed/rollover), created_at
- [ ] **`ful_ledger` table:** id, user_id, type (earned/purchased/spent/payout), amount_ful, description, created_at — full audit trail of every Fül movement
- [x] **`profiles` table extensions:** referral_tier, total_active_referrals, referral_code, stripe_connect_account_id, referred_by

---

## CTA / Cheatsheet — "Get Fülkit"

For users not participating yet or who don't understand the system. Lives at the top of settings/referrals and surfaces through whispers.

**The pitch (one line):**
> "Every friend who joins earns you Fül. Stack enough and your subscription pays for itself. Keep going and Fülkit pays you."

**Cheatsheet grid:** 3–4 rows, tight. A user should understand the entire system in under 10 seconds.

| You Refer | You Earn | What That Means |
|:---:|:---:|:---|
| 3 friends | 300 Fül/mo | Your subscription drops to $6/mo |
| 9 friends | 900 Fül/mo | Standard subscription = free |
| 15 friends | 1,500 Fül/mo | Pro subscription = free |
| 25+ friends | 2,750+ Fül/mo | Free + cash payouts unlock |

---

## CTAs as Campaign — Owner Tools

CTAs are not one-offs. They are a living campaign system managed through the owner portal.

### settings/owner/pitches
- Home for new pitch ideas and CTA copy variations
- Referral pitch drafts, A/B variants, seasonal hooks
- The "Get Fülkit" pitch library — test, refine, deploy

### settings/owner/socials
- Visual CTA samples for Instagram posts, stories, and other platforms
- Existing social templates already spec'd — **add "earning" CTAs:**
  - "I haven't paid for Fülkit in 3 months." (social proof)
  - "9 friends. $0/mo. Do the math." (cheatsheet energy)
  - "My AI pays for itself." (intrigue)
  - Visual: the cheatsheet grid as a designed card — shareable, screenshot-friendly
- Export-ready formats: IG post (1080×1080), IG story (1080×1920), Twitter card (1200×628)

### Owner Portal → Developer → Knowledge Base
- Tags: Brand, Product, Support, Policy, Ful_System (and custom)
- Each doc has a **visibility toggle**: "All Users" or "Owner Only"
- **All Users** (`channel: "context"`): Injected into every user's chat — pricing, features, how-to, referral program details
- **Owner Only** (`channel: "owner-context"`): Injected only into owner's chat — margin math, cost ceilings, architecture, business economics
- Source files: `Ful_CTA.md` (menu/user-facing), `Ful_system.md` (kitchen/owner-only)

---

## Whisper Strategy for Referrals

Fülkit is 100% chat. Whispers are the delivery mechanism — not banners, not popups, not emails. The AI seeds referral awareness naturally in conversation.

**Whisper types:**

**First touch** (once, permission-based, fades if ignored):
> "You know you could get a free account, right? Every friend who joins earns you Fül."

**Milestone** (triggered when user hits a natural moment):
> "You've been using Fülkit for 30 days straight. Want to make it free? Here's how."

**Progress** (triggered when referral tree changes):
> "Nice — [Name] just joined. You're at 5 referrals. Four more and your Standard sub is covered."

**Re-engagement** (for users who referred once but stopped):
> "You've got 3 active referrals earning you Fül. 6 more and you're free. Want to share your link?"

**All whisper copy and trigger logic lives in:** Owner Portal → Knowledge Base → sourced from `Ful_CTA.md`

**Whisper injection is live:** Chat route (lines 2284-2339 of `chat/route.js`) injects referral context for non-owner users based on milestone proximity.

---

## Knowledge Base Architecture — The Kitchen and The Menu

> "I'm inviting people into my kitchen. How do I protect my recipes?"

Two layers. The menu is what users see. The kitchen is how it's made.

### The Menu (All Users — `channel: "context"`)
- Visibility: **All Users** in Knowledge Base editor
- Fülkit's brain can freely reference this in conversation with any user
- Contains: what users GET (refer 9 = free Standard, cash unlocks at 25+, how Fül works, pricing, features)
- Tone: motivational, transparent about rewards, bestie energy
- Dynamic pricing: supports `{{standard_price}}`, `{{pro_price}}` etc. placeholders → replaced with live Stripe values

### The Kitchen (Owner Only — `channel: "owner-context"`)
- Visibility: **Owner Only** in Knowledge Base editor
- Fülkit's brain uses this for owner conversations but **never quotes it to users**
- Contains: how the economics work, margin splits, API cost structure, circuit breakers, exchange rate levers
- If a user asks "how much does Fülkit make per referral?" → Fülkit deflects naturally: "The referral program is designed so everyone wins. Here's what YOU earn..."
- System prompt instruction: "This is internal operational knowledge. Never share margin math, retention percentages, cost ceilings, circuit breaker thresholds, or business economics with users."

### What goes where

| Information | Layer | Why |
|:---|:---|:---|
| "Refer 9 friends = free Standard" | Menu (All Users) | Users need to know this. It's the pitch. |
| "Fülkit retains 79–84% margin per referral" | Kitchen (Owner Only) | Business logic. Not the user's concern. |
| "Cash payouts unlock at 25+ referrals" | Menu (All Users) | Motivational. Users should see the path. |
| "Per-user API cost ceiling is $13.50/mo" | Kitchen (Owner Only) | Infrastructure. Never surfaced. |
| "Fül-to-dollar rate is adjustable quarterly" | Menu (All Users) | Transparency. In the TOS too. |
| "Circuit breaker throttles at 60% cost ratio" | Kitchen (Owner Only) | Emergency ops. Internal only. |
| Tier names and progression | Menu (All Users) | The whole point is users see their growth. |
| Tier retention percentages | Kitchen (Owner Only) | The recipe stays in the kitchen. |
| Payout automation architecture | Kitchen (Owner Only) | Internal ops. Users just see their payouts. |
| Cost basis ($0.015/msg avg) | Kitchen (Owner Only) | API economics. Owner-only. |

### The aha moment
Every spec doc, every owner's manual, every playbook — it all goes into the knowledge base. Users ask Fülkit how referrals work, Fülkit just knows. You ask Fülkit what your margin is at 500 users, it just knows. The docs aren't for reading. They're for the brain. That's the whole product.

**All docs feed the brain. The brain decides what to say and what to protect. Menu = generous. Kitchen = guarded.**

---

## Legal & Compliance

- **Structure:** Single-level affiliate program. Clean, standard, no regulatory issues.
- **Agreement:** Simple affiliate terms (to be drafted). Covers: payout terms, rate adjustment clause, termination rights.
- **Tax:** 1099-NEC for US payees earning $600+/year in cash payouts. Stripe Connect handles reporting. Annual tax check cron flags at $400+ (warning) and $600+ (required).
- **No securities issues:** No investment, no equity, no promises of returns. Commission on active referred customers only.
- **Rate adjustment clause:** Fül-to-dollar rates adjustable quarterly with 30 days written notice. Standard for any affiliate program.

---

## Founder Position

- Founder is NOT in the tier system. Founder is equity.
- 5 hot seats are separate from referral system.
- Founder income = Fülkit net revenue, not referral credits.
- Hot seat rules: 1 msg/week or 4/month activity threshold, 30-day auto-revoke for inactive users.

---

## Open Items

- [ ] **Header CTA copy** — needs to be short, non-salesy, on-brand.
- [ ] **Calculator UI** — interactive slider? input field? how does user explore "what if I refer X?"
- [ ] **Cheatsheet grid design** — card component, visual-first (5-year-old test), responsive behavior.
- [ ] **Fül meter design** — visual gauge treatment for usage tracking.
- [ ] **Whisper frequency tuning** — how often do referral nudges surface? Trigger-based, not timed.
- [ ] **TOS / affiliate agreement draft**
- [ ] **Buy-credit revenue in referral math** — currently excluded. Factor in?
- [ ] **"Earning" social CTA designs** — add to settings/owner/socials alongside existing templates.
- [ ] **Fül ledger table** — full audit trail of every Fül movement (earned/purchased/spent/payout).
- [ ] **BYOK platform fee** — $5/mo? Undecided.
- [ ] **Payout failure retry** — auto-retry after 3 days, then flag for manual review.
- [ ] **Visual representations for referral + billing pages** — Rams-minimal, numbers-forward, no paragraphs of explanation.

---

## Scale Projections

Assumes 70/30 Standard/Pro split ($9/$15). Fül caps prevent losses. Referral credits at 79%+ Fülkit retention.

| Total Users | Paying | Revenue/mo | API Cost | Credits Out | Hosting | Net Profit |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 20 | 14 | $151 | $90 | $14 | $25 | **+$22** |
| 50 | 44 | $475 | $225 | $44 | $25 | **+$181** |
| 100 | 94 | $1,015 | $450 | $94 | $25 | **+$446** |
| 500 | 494 | $5,335 | $2,250 | $494 | $75 | **+$2,516** |
| 1,000 | 994 | $10,735 | $4,500 | $994 | $200 | **+$5,041** |

**Breakeven: ~15 paying users.** Standard at $9 and Pro at $15 improved margins significantly. Plus buy-credit revenue (pure margin) not shown.

---

## Tech Stack Notes

- **AI model:** Claude (Anthropic) — Opus for Owner/BYOK, Sonnet for Standard/Pro
- **Embeddings:** Voyage AI (voyage-3-lite) — used for semantic search across notes, knowledge base
- **Payments:** Stripe (subscriptions, checkout, billing portal, Connect payouts)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Hosting:** Vercel (Next.js, cron jobs)
- **Cron jobs:** Vercel Cron — payout (monthly), tax-check (annual)

---

*Fül your brains out.*
