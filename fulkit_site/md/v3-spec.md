# Spec: Fulkit v3 — The Cognizant Layer

*For Collin to take, mark up, and refine. Based on truths we know.*

---

## Constraint: NO VISUAL CHANGES

This spec is an EQ upgrade — organizing the library, not remodeling the building. Zero new pages, zero layout changes, zero UI overhauls. The only visible change: new flag types appearing in the existing Spend Moderator section (same cards, same format, new rule names).

---

## What v3 Means

Fulkit today is smart but amnesiac. It solves problems well but starts from zero every time. v3 is the version that **knows itself** — its own code, its own health, its own docs, its own history. It recognizes waste, suggests fixes, never regresses, and stays light as a feather doing it.

The principle: **a librarian, not a library.** Don't carry every book. Know where every book is. Ask 2-3 questions. Hand over the one right answer.

---

## Cost Principles (Hard Laws)

These came from Session 22. $4.69 for 6 messages taught us everything.

1. **Default is zero.** Tools, context, knowledge — nothing loads unless the message signals it needs it.
2. **Load on signal, never on assumption.** Keywords gate tools. Questions gate knowledge. Silence means zero cost.
3. **Every token must justify its presence.** If it's in the system prompt, it must earn its keep on every message. If it's situational, it lives on a shelf.
4. **Input tokens are 98.5% of spend.** Output is not the problem. Every optimization targets input.
5. **Rounds multiply cost, not conversation.** 3.2 avg rounds = 3.2x the system prompt, 3.2x the tool schemas. Follow-up from a bestie is fine — the optimization is making the plumbing cheaper per round, not reducing back-and-forth.
6. **Cache everything stable.** Cache read is 90% cheaper than normal input. The system prompt uses ephemeral caching. Every time it changes between messages, you pay full price. Keep it stable.
7. **Compress before you ask, convert before you choke.** Message 1 is cheap. Message 10 re-sends 1-9. Auto-compress first. Keep going. Then push toward action — move things into threads, notes, Kanban, plans. Chat isn't storage. Fulkit pushes users to get shit done using the tools it already has. Each feature feeding the next.
8. **Never undo progress.** Every optimization compounds. If we cut tool schemas by 96%, that saving applies to every future feature. Protect those gains.

---

## The Three Personas (Truth)

| Persona | Scope | Knows | Who Sees It |
|---------|-------|-------|-------------|
| **Chappie** | Everything | Code, life, preferences, grandma's birthday. Tip to tail. | Collin only (owner) |
| **Fulkit** | Product | Whatever the paid user brings. Notes, integrations, conversation. Creates the experience. | Any paid user |
| **B-Side** | Music island | Fabric only. Nothing outside the island. | Anyone in /fabric |

Chappie is not a product feature — it's the owner's private instance. What makes Chappie powerful is what Fulkit should eventually give every user at their tier. Dogfood → ship.

---

## The Four Pillars of v3

### 1. The Library (know the code)

**Today**: Chat Fulkit has tools (`kb_search`, `github_fetch_files`, `notes_search`) but empty shelves. It can look things up but doesn't know WHAT to look up.

**v3**: Curated KB articles (the "shelves") that get searched on demand. Zero tokens on casual messages. ~400 tokens when a code question triggers a search.

**Shelves:**
- **Architecture Map** (~400 tokens) — the nervous system. Not the file tree — the mental model. What calls what, where data flows, where things break.
- **Integration Registry** (~200 tokens) — what's wired, what's spec'd, what's planned. Auto-updates as integrations are added.
- **Recent Changes** (~200 tokens) — last Chappie session summary. The bridge between Claude Code and chat.
- **File-to-Problem Map** (~200 tokens) — which files solve which problems. Grows organically via memory.
- **Spec Index** (~100 tokens) — pointer to every spec doc. The card catalog.

**Scaling to 100 integrations**: Each integration is just a line in the registry + keywords in `ECOSYSTEM_KEYWORDS`. The keyword map is a flat object — adding 100 entries costs zero tokens at runtime (only the matching ecosystem's tools load). The registry KB article grows linearly but stays under 500 tokens even at 100 integrations (one line each).

**The librarian behavior**: When the owner asks a code question, Fulkit:
1. Searches KB for relevant shelf → gets the map
2. If the map points to a file → reads it via `github_fetch_files`
3. If unclear → asks 1-2 clarifying questions ("are you talking about the API route or the client hook?")
4. Returns the specific answer, not a dump

This is prompt engineering in the coverage hint, not new code.

### 2. The Heartbeat (know the health)

**Today**: Spend Moderator tracks token cost and waste patterns. Signal Radio catches errors and warnings.

**v3**: A single "system health" pulse that Fulkit can report on demand. Not a dashboard — a question you can ask. "How healthy is Fulkit right now?"

**The heartbeat answers:**
- **Cost health**: Are we trending up or down? Any waste patterns active?
- **Error health**: Any mayday signals in the last 24h?
- **Cache health**: Hit rate trending up or down?
- **Integration health**: Any integrations loading but never used? Any failing?
- **Doc health**: When was the last session bridge update? Are the shelves stale?

**Implementation**: Not a new system. The heartbeat is a **composite query** across existing signals — Spend Moderator + Signal Radio + KB article timestamps. One API endpoint: `/api/owner/heartbeat` that returns a single JSON object. The owner asks "how's Fulkit doing?" and gets a pulse check.

**Token cost**: Zero unless asked. One API call when triggered.

### 3. The Audit Loop (know the drift)

**Today**: Docs are manually maintained. If the code evolves past what the docs describe, nobody notices.

**v3**: Fulkit recognizes when its mental model might be stale and flags it.

**How:**
- The architecture map KB article has a `last_verified` date
- The session bridge updates after every Chappie session
- If the session bridge mentions files that aren't in the file map → flag: "new file pattern detected, file map may need update"
- If a KB article hasn't been verified in 30 days → flag: "architecture map may be stale"
- If a spec doc is referenced but the file has been modified since the spec was written → flag: "spec may not match implementation"

**This is the "auditor voice"**: "Can we do this better?" applied to documentation, not just token spend.

**Implementation**: A few checks added to the existing Spend Moderator signal emission. After each chat message (fire-and-forget), check doc freshness. Emit `signal:audit_flag` if something looks stale.

### 4. The Bridge (left hand knows right hand)

**Today**: Chappie (Claude Code) writes devlog.md after each session. Chat Fulkit doesn't read it unless specifically asked.

**v3**: After every Chappie session, a 5-line `last-session.md` is written to the repo. Chat Fulkit reads it via `github_fetch_files` when the owner asks about recent work.

**The bridge flow:**
1. Chappie finishes a session → writes devlog entry (already happens)
2. Chappie also writes `last-session.md`: date, scope, what shipped, open issues, next up (5 lines)
3. No API needed — file lives in the repo, chat reads it on demand
4. Next time owner opens chat and says "what did we do yesterday?" → fetches file → accurate answer

**Future**: Chappie could also update the file map and architecture map when it modifies key files. This is just adding a checkpoint step to the existing routine.

---

## The Round Problem (Pillar 5: cheaper plumbing per round)

3.2 avg rounds means every token in the request gets sent 3.2 times. With system prompt + tools, that's massive repetition. The fix isn't fewer rounds — follow-up and tool use are part of the bestie experience. The fix is making each round cheaper.

**What we can do:**
- **Tool schema compression**: Each tool definition is ~100-300 tokens. Compress descriptions, strip unnecessary fields. Every token saved is multiplied by every round.
- **Tool result caching**: If the same tool was called with the same args recently, return the cached result without an API round trip.
- **Batch tool calls**: Prompt tuning so Claude calls multiple tools in one round when possible instead of chaining them sequentially.
- **Lean loading already helps**: With keyword gating, most messages load 10 tools instead of 68. That's ~5K fewer tokens per round.

**The Spend Moderator tracks this**: `multi_round_cost` flag fires when rounds compound cost. The period comparison shows whether the per-round cost is trending down.

---

## Caching Strategy (Pillar 6: pay once, read cheap)

Cache read = 10% of input cost. Cache write = 125% of input cost. The ROI is massive IF the cache hits.

**What breaks the cache:**
- System prompt changes between messages (dynamic content like "today is..." or conversation summaries)
- Different tool sets loaded (tools are part of the request hash)

**What we should do:**
- Keep the static portion of the system prompt identical across messages (BASE_PROMPT + preferences + memories = stable)
- Put dynamic content (vault context, conversation summary) AFTER the cached block
- With lean tool loading, tool sets are now smaller and more likely to repeat across messages in the same conversation → better cache hits
- The Spend Moderator already tracks cache efficiency. Target: >70% hit rate.

---

## Owner-First Is Already in the DNA

This isn't a new concept — Fulkit was always built for Collin first. This spec just makes that explicit so we don't accidentally build owner features on different plumbing than user features.

**Same infrastructure, different shelves:**
- Owner gets architecture KB articles (owner-context channel). Users get their own KB via notes + integrations.
- Owner gets Spend Moderator. Users get their billing/usage via settings/billing (groundwork at 65-75% commission structure already exists).
- Owner gets the session bridge. Users get conversation memory.
- Lean tool loading, pattern memory, compression — already applies to everyone.

**What stays owner-only:** Code drift detection, session bridge (Chappie), Spend Moderator, Signal Radio.

**The billing angle:** Settings/referrals and settings/billing already have groundwork for the commission structure. Token expenditure tracking (the Spend Moderator) could eventually reverse-engineer into billing — we know exactly what each user costs. That's a future lever, not a v3 deliverable, but the data is being collected now.

---

## The 100-Integration Future

Current keyword gating scales linearly:
```javascript
// Adding a new integration = 1 line in ECOSYSTEM_KEYWORDS + tool definitions
stripe: ["stripe", "subscription", "billing", "payment", "invoice"],
```

At 100 integrations, `ECOSYSTEM_KEYWORDS` is ~100 lines (~2K tokens at module scope, but never sent to Claude — it's server-side routing logic). The keyword scan runs in microseconds.

**What changes at scale:**
- Keyword collisions become more likely ("order" could mean Square, Shopify, or Toast)
- Solution: when multiple ecosystems match, load the lightest one first. If Claude needs more, it can request specific tools via a `load_integration` meta-tool.
- The `load_integration` tool (future): Claude says "I need Shopify tools" → server loads them mid-conversation. This is the HOV lane — Claude decides what it needs after reading the message, not before.

**Integration health at scale:**
- The integration registry KB article lists all 100 with status
- The heartbeat checks: which integrations have failing OAuth tokens?
- **Never suggest disconnecting.** The whole point of Fulkit is replacing 20 apps with one. Promote connecting everything. Lean loading already handles the cost — 100 integrations connected, zero tools loaded unless the message needs them. The cost of a connected integration with lean loading is effectively zero.

---

## Conversation Cost Growth

Message 1 sends: system prompt + user message. Cheap.
Message 10 sends: system prompt + messages 1-9 + user message. Expensive.

**The compression system** already summarizes old messages when token count exceeds `config.compressAt` (80K tokens standard / 180K owner). At typical message sizes, conversations can go 200+ messages before compression fires. This is fine.

**v3 flow — compress, then convert, never choke:**
1. **Auto-compress** kicks in at the token threshold. User never notices. Conversation continues.
2. **After compression**, if the topic has shifted, Fulkit should push toward action: "Sounds like we figured out X — want me to save this as a task? Move it to a plan? Drop it in notes?" Each feature feeding the next.
3. **Never nag about new threads.** Never say "this conversation is getting long." Compress silently, then convert insights to artifacts (tasks, notes, plans). Chat is the thinking space. Actions, Kanban, notes are where work lands.
4. **Fulkit helps users use its own system.** "Hey, this is getting meaty — want me to create a plan for this?" or "I can break this into tasks in your Actions." The tools already exist. Fulkit just needs to connect the dots.

**What v3 does NOT add:** No forced resets. No thread limits. No "start fresh" nags. Just smart compression and proactive conversion to action.

---

## The Doc Audit

**Question**: Are today's docs architect's plans or random books?

**What we should verify before building v3:**

| Doc | Purpose | Might Be Stale? | Action |
|-----|---------|-----------------|--------|
| `CLAUDE.md` | Architecture map for Chappie | Yes — written early, product has evolved significantly | Read + verify + compress into KB shelf |
| `md/buildnotes.md` | Product spec | Partially — features shipped since it was written | Audit shipped vs. spec'd, update status |
| `md/design.md` | Visual tokens, brand | Likely current — design hasn't changed | Verify |
| `md/trust-model.md` | Vault architecture | Current — built in Session 7, verified | Verify |
| `md/devlog.md` | Session history | Current — updated every session | No action needed |
| `md/signal-radio.md` | Signal system | May be stale — Spend Moderator added | Update with new signals |
| `md/numbrly-spec.md` | Numbrly API | Current — not yet wired | No action |
| `md/truegauge-spec.md` | TrueGauge API | Current — not yet wired | No action |
| `TODO.md` | Master action list | Likely stale — many items shipped | Audit + clean |

**Recommendation**: Before stocking the Library shelves, do a doc audit pass. Read each doc, verify against current code, tighten what's drifted. Then compress the verified truth into KB articles. The shelves should hold architect's plans, not old blueprints.

---

## Known Issues (must fix before or during v3)

### KB Security: owner-context leaks to all users
`executeKbSearch()` in route.js queries both `context` and `owner-context` channels with no role check. Any user's `kb_search` call returns owner-context articles. **Must gate by role before stocking any shelves.** One-line fix: filter channels array based on `profile?.role === "owner"`.

### Cache efficiency: discount we're not getting
The system prompt is one cache block but ~90% changes between messages (date, context, memories, hints). Cache hit rate is ~10-20%. Not "broken" — just not optimized. Fix: split static BASE_PROMPT into its own cache block, put dynamic content after it. Recovers the 90% discount on the stable portion.

### Compression threshold: token-based, not message-based
`compressAt` is 80K tokens (standard) / 180K tokens (owner/BYOK). At typical message sizes, conversations can go 200+ messages before compression fires. This is fine — the real issue with long chats (momentum loss, freezing) is conversation quality, not token length. The "compress then convert to action" flow addresses this.

---

## Implementation Phases

### Phase 0: KB Security Fix + Doc Audit ✅ Session 22
### Phase 1: Stock the Shelves ✅ Session 22
### Phase 2: The Bridge ✅ Session 22
### Phase 3: Cache Optimization ✅ Session 22
### Phase 4: The Heartbeat ✅ Session 22
### Phase 5: The Audit Loop ✅ Session 22

### Phase 6: Integration Scaling (best practice path)

**Current (23 integrations):** ECOSYSTEM_KEYWORDS scans all keyword groups per message. `ECOSYSTEM_TOOLS[eco]()` returns empty array if user isn't connected — tools only load when both keywords match AND token exists. 96% token reduction. System is healthy.

**Scaling tiers:**
| Scale | Action | Trigger |
|-------|--------|---------|
| 22–40 | No change needed | Current architecture holds |
| 40–60 | **Registry pattern** — extract integration definitions (keywords, tools, server lib, category) to `integrations-registry.js`. Chat route reads dynamically. Adding integrations becomes config, not code. | When adding integrations becomes tedious |
| 60–100+ | **`load_integration` meta-tool** — Claude requests specific integration tools mid-conversation. Zero tools loaded by default, Claude self-serves. | When keyword collisions become frequent |

**Already effective:** Connected-only filtering happens naturally — `ECOSYSTEM_TOOLS` closures check for tokens and return empty arrays when not connected. No code change needed.

---

## What This Does NOT Do

- Does NOT change any UI (no new pages, no layout changes, no visual overhauls)
- Does NOT inject anything new into every message (library = on-demand search)
- Does NOT build new embedding tables (existing KB + GitHub tools are sufficient)
- Does NOT require MCP (existing tool infrastructure handles it)
- Does NOT create user-facing features (owner/dev only, via owner-context KB channel)
- Does NOT undo the lean tool loading work (same keyword-gating principle, extended to knowledge)
- Does NOT increase token spend on non-code conversations (zero-cost default)
- Does NOT build parallel systems for owner vs user (same infrastructure, different shelves)
- Does NOT suggest disconnecting integrations (connect everything, lean loading handles cost)

---

## The Promise

v3 Fulkit is a system that:
- **Knows its own code** without carrying it in every message
- **Knows its own health** without a dedicated dashboard
- **Knows what changed** without you telling it
- **Knows when it's wrong** and flags the drift
- **Scales to 100 integrations** without 100x the cost
- **Gets smarter over time** as file-to-problem memories accumulate
- **Stays light** by searching, never loading

The librarian analogy: it has the whole library at its back. It asks a few questions to narrow down what you need. Then it hands you the one right book. Light to carry. Never compromising facts.
