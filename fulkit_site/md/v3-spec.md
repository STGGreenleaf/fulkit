# Spec: Fulkit v3 — The Cognizant Layer

*For Collin to take, mark up, and refine. Based on truths we know.*

---

## What v3 Means

Fulkit today is smart but amnesiac. It solves problems well but starts from zero every time. v3 is the version that **knows itself** — its own code, its own health, its own docs, its own history. It recognizes waste, suggests fixes, never regresses, and stays light as a feather doing it.

The principle: **a librarian, not a library.** Don't carry every book. Know where every book is. Ask 2-3 questions. Hand over the one right answer.

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

**v3**: After every Chappie session, a 5-line `last-session.md` gets uploaded to KB. Chat Fulkit searches it naturally when the owner talks about recent work.

**The bridge flow:**
1. Chappie finishes a session → writes devlog entry (already happens)
2. Chappie also writes `last-session.md`: date, scope, what shipped, open issues, next up (5 lines)
3. `last-session.md` gets uploaded to KB as `owner-context` (script or manual)
4. Next time owner opens chat and says "what did we do yesterday?" → kb_search finds it → accurate answer

**Future**: Chappie could also update the file map and architecture map when it modifies key files. This is just adding a checkpoint step to the existing routine.

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
- The heartbeat checks: which integrations have failing OAuth tokens? Which haven't been used in 30 days?
- Auto-suggest: "You have 12 integrations connected but only use 4 regularly. Consider disconnecting the rest to keep things lean."

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

## Implementation Phases

### Phase 0: Doc Audit (do first)
Read each core doc against current code. Tighten what's drifted. Remove what's shipped. Update what's changed. This is the foundation — if the shelves hold stale content, the librarian gives wrong answers.

### Phase 1: Stock the Shelves (content, minimal code)
Upload 5 KB articles to `vault_broadcasts` as `owner-context`. One script to seed them. Add 1-2 lines to the owner coverage hint: "You have architecture reference in KB. Search it for code questions. Save file-to-problem patterns as memories."

### Phase 2: The Bridge
Add `last-session.md` to Chappie's checkpoint routine. Upload to KB after each session. Chat Fulkit now knows what happened last.

### Phase 3: The Heartbeat
One new endpoint: `/api/owner/heartbeat`. Composite query across Spend Moderator + Signal Radio + KB freshness. Returns a single health pulse. Owner asks "how's Fulkit?" → gets a real answer.

### Phase 4: The Audit Loop
Add doc-freshness checks to the post-response signal block. Flag stale docs, missing file map entries, spec-code drift. The auditor voice expands from spend to architecture.

### Phase 5: The Meta-Tool (100+ integrations)
`load_integration` tool — Claude requests specific integration tools mid-conversation instead of keyword pre-loading. The ultimate lazy-load: Claude decides what it needs, not the server.

---

## What This Does NOT Do

- Does NOT inject anything new into every message (library = on-demand search)
- Does NOT build new embedding tables (existing KB + GitHub tools are sufficient)
- Does NOT require MCP (existing tool infrastructure handles it)
- Does NOT create user-facing features (owner/dev only, via owner-context KB channel)
- Does NOT undo the lean tool loading work (same keyword-gating principle, extended to knowledge)
- Does NOT increase token spend on non-code conversations (zero-cost default)

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
