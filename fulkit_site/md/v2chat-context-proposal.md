# v2chat — Context System Redesign (Proposed)

> Status: Shelved. Ready for implementation when prioritized.
> Created: 2026-03-19

## Problem

System prompt was 120K tokens — loading every KB doc, broadcast, vault note, and integration summary on every message. A juice inventory question loaded the Trust Model, Signal Radio spec, Security Architecture, and full Devlog. Caused:
- 55 output tokens on 151K input (Claude drowning)
- Flat/dead responses
- $2.27/msg API cost

Current fix: 40K budget + keyword scoring. Works but is still naive — keyword matching misses semantic relevance, and KB docs either match or don't.

## Architecture: Three-Tier Context

### Tier 1 — ANCHOR (Predictive, Session Start)
Computed at greeting time, cached 1hr. ~500 tokens.
```
Recent focus: juice ordering, inventory counts, birthday planning
Active tasks: Audit Q1 sourcing, Staff party logistics
Connected: Square, Numbrly, Stripe, Trello, GitHub
Hot notes: Green Machine Recipe, Supplier Contacts, Staff Schedule
```
Source: conversations.topics, actions, integrations, notes.updated_at. No AI call — pure data assembly.

### Tier 2 — REACTIVE (Semantic, Per-Message)
Server-side semantic search using existing Voyage embeddings + `match_notes` RPC. Per message: embed the user's message → cosine search → top matches within budget. Topic shifts automatically get different notes next message.

Replaces client-side keyword matching in `vault-tokens.js`.

### Tier 3 — DEEP (On-Demand, Tool-Fetched)
`notes_search` + `notes_read` already exist. Add `kb_fetch` tool for KB docs. Claude calls these when loaded context doesn't cover the question. Context coverage hint tells Claude what's loaded vs. available.

## Token Budget (50K hard ceiling)

| Component | Owner (Opus) | Pro/Standard (Sonnet) |
|-----------|-------------|----------------------|
| Base prompt + date | 850 | 850 |
| Anchor | 500-1K | 500-1K |
| Memories + prefs | 500-2K | 500-2K |
| Reactive notes | up to 15K | up to 8K |
| Reactive KB docs | up to 5K | up to 3K |
| Context coverage hint | 100 | 100 |
| Tool schemas (~74 tools) | ~15K | ~15K |
| **Total** | ~35-40K | ~28-32K |
| **Remaining for conversation** | 160-165K | 168-172K |

## Implementation Phases

### Phase 1: Server-Side Semantic Context
Move note selection from client to server using existing Voyage embeddings + `match_notes` RPC. Simplify client to only send pinned/always notes + files.

**Files:** `api/chat/route.js`, `lib/use-chat-context.js`, `lib/vault-tokens.js`

### Phase 2: Anchor Context
Compute + cache predictive context at greeting time. Fetch in chat route's Promise.all block.

**Files:** `api/chat/greeting/route.js`, `api/chat/route.js`

### Phase 3: KB Docs as Tool
Replace system prompt KB injection with `kb_fetch` tool. Keep only Brand Voice in prompt (defines HOW Claude talks). Saves 5-15K tokens.

**Files:** `api/chat/route.js`

### Phase 4: Context Coverage Hint
~100 token block telling Claude what's loaded and what's available via tools.

**Files:** `api/chat/route.js`

### Phase 5: Integration Context Gating
Remove eager Numbrly/TrueGauge context loading. Tools already exist — Claude calls them when needed.

**Files:** `lib/use-chat-context.js`

## Existing Infrastructure (no new tables)
- `getQueryEmbedding()` — `api/embed/route.js`
- `match_notes` RPC — `scripts/pgvector-setup.sql`
- `vault_broadcasts` table for kb_fetch
- `preferences` table for anchor cache
- `conversations.topics`, `actions`, `integrations` for prediction
