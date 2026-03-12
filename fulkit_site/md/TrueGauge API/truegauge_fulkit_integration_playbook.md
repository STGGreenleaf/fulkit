# TrueGauge ↔ Fülkit — Integration Playbook

**Version:** 1.0
**Date:** March 11, 2026
**Author:** Numbrly Integration Team (proven pattern from Numbrly ↔ Fülkit handshake)
**Status:** Playbook — ready for TrueGauge & Fülkit teams to execute

---

## Purpose

This playbook documents everything needed to connect **TrueGauge** (Precision Business Health) to **Fülkit** (AI assistant platform). It's modeled on the successful Numbrly ↔ Fülkit integration, which is live and verified.

**Two parts:**

| Part | Who | What |
|:--|:--|:--|
| **Part 1** | TrueGauge team | "Pack your bags" — self-assessment, infrastructure, API, settings UI |
| **Part 2** | Fülkit team | "Get the guest room ready" — register source, store keys, context injection |

Both teams can work from their half independently. When both halves are done, you shake hands and test.

---

## Reference: The Numbrly Pattern

Numbrly's integration with Fülkit is the proven template. Here's what was built:

| Layer | What Numbrly Built |
|:--|:--|
| **Supabase tables** | `api_keys` (hashed keys, org-scoped), `api_audit_log` (all writes logged) |
| **Edge function** | `numbrly-api` — single entry point, action-based routing, auth + rate limiting |
| **Endpoints** | Read (summary, get_build, search), Write (update with preview/confirm), Simulate (price, cost, recipe) |
| **`fulkit_context`** | One bundled endpoint returning summary + alerts + recent activity for LLM injection |
| **Settings UI** | Settings → Developer → API Access (generate, copy, revoke keys) |
| **Security** | SHA-256 key hashing, org-scoped queries, 100 req/min rate limit, audit trail on all writes |
| **Key format** | `nbl_sk_` + 32 hex characters |
| **Spec docs** | Full API contract + display formatting guide, dropped into Fülkit's docs |

TrueGauge builds the same layers, adapted to its own domain.

---

---

# PART 1 — TrueGauge: Pack Your Bags

> Everything TrueGauge needs to investigate, decide, build, and verify before the handshake.

---

## Step 1: Know Your Data

Before writing a single line of code, answer these questions. They shape every endpoint.

### 1.1 — What are your core entities?

Numbrly's chain: `Vendors → Components → Composites → Builds`

**TrueGauge: Fill in yours.**

| Entity | What It Is | Example |
|:--|:--|:--|
| `___________` | | |
| `___________` | | |
| `___________` | | |
| `___________` | | |

Questions to ask yourself:
- What are the 3-5 nouns a user would ask about? ("Show me my ____")
- Do they have parent-child relationships? What's the chain?
- Which ones can a user create, update, or delete?

### 1.2 — What's the key metric?

Numbrly's key metric: **Margin %** = `(Price - Cost) / Price × 100`

**TrueGauge:** What's the number your users care about most?

- Pace? (ahead/behind target)
- Cash flow health? (runway, burn rate)
- A composite health score?
- Something else?

Write it down as a formula if possible. This becomes the centerpiece of your `summary` endpoint and the first thing Fülkit tells users.

### 1.3 — What are the alerts?

Numbrly alerts on: low margin builds, builds below target, builds with no price set.

**TrueGauge:** What conditions should trigger an alert?

- [ ] Behind pace by X%?
- [ ] Cash flow below threshold?
- [ ] Missed milestone?
- [ ] Health score declining?
- [ ] Other: ___________

These become the `alerts` array in your `fulkit_context` response.

### 1.4 — What would a user ask Fülkit?

Write 5-10 natural language questions a TrueGauge user might ask. These directly map to endpoints.

| User Says | Maps To |
|:--|:--|
| "How's my business doing?" | `summary` or `fulkit_context` |
| "Am I on pace this month?" | `get_pace` or `summary` |
| "Show me my cash flow" | `get_cashflow` |
| "_______________________" | `___________` |
| "_______________________" | `___________` |
| "_______________________" | `___________` |
| "_______________________" | `___________` |
| "_______________________" | `___________` |

This table becomes Fülkit's NLP → API mapping guide.

---

## Step 2: Build the Supabase Infrastructure

These two tables are identical to the Numbrly pattern. Copy them directly.

### 2.1 — `api_keys` Table

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,        -- first 8 chars for display: "tg_sk_a1b2..."
  label TEXT DEFAULT 'Fülkit',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT false
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own org keys" ON api_keys
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));
```

**Key format:** `tg_sk_` + 32 hex characters (adapt the prefix to your brand).

### 2.2 — `api_audit_log` Table

```sql
CREATE TABLE api_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  api_key_prefix TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  changes JSONB,
  impact JSONB,
  snapshot JSONB,                   -- for undo capability
  undo_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_org ON api_audit_log(organization_id);
CREATE INDEX idx_audit_created ON api_audit_log(created_at DESC);
```

### 2.3 — Key Hashing (never store raw keys)

```typescript
async function hashKey(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

---

## Step 3: Build the Edge Function

Create a Supabase Edge Function named `truegauge-api`. Single entry point, action-based routing.

### 3.1 — Skeleton Pattern

```
supabase/functions/truegauge-api/index.ts
```

**Core flow:**
1. CORS preflight → respond with headers
2. Parse `?action=` from query string
3. `ping` → respond immediately (no auth)
4. All other actions → validate API key → check rate limit → route to handler
5. Write actions → log to `api_audit_log`
6. Catch errors → return `{ error, message }`

**Key design decisions (from Numbrly's lessons learned):**
- Use `?action=summary` query params, not REST paths (simpler in edge functions)
- POST body for write operations, GET for reads
- Always return `{ success: true, ... }` or `{ error: "reason" }`
- Rate limit: 100 requests/minute per org (in-memory counter, 60s window)
- Non-blocking `last_used_at` update on key validation (don't slow down the response)

### 3.2 — Auth Validation Pattern

```typescript
async function validateApiKey(raw: string) {
  const keyPrefix = raw.slice(0, 14);
  const keyHash = await hashKey(raw);

  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("organization_id")
    .eq("key_hash", keyHash)
    .eq("is_revoked", false)
    .single();

  if (data) {
    // Fire-and-forget: update last_used_at
    supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash)
      .then(() => {});
  }

  return { orgId: data?.organization_id || null, keyPrefix };
}
```

---

## Step 4: Design Your Endpoints

### 4.1 — Required (minimum viable handshake)

| Action | Method | Purpose | Auth |
|:--|:--|:--|:--|
| `ping` | GET | Health check, proves function is live | None |
| `fulkit_context` | GET | Bundled chat-start payload for LLM | Required |
| `summary` | GET | High-level dashboard snapshot | Required |

### 4.2 — Read Endpoints (fill in for your domain)

| Action | Purpose | Returns |
|:--|:--|:--|
| `get_[entity]` | Single entity lookup by ID or name | Entity details + key metric |
| `list_[entities]` | All entities of a type | Array + count |
| `search` | Fuzzy name match across entity types | Matched items with type labels |
| `list_alerts` | Active alerts/warnings | Array of `{ type, severity, message }` |
| `list_activity` | Recent audit log entries | Array of `{ action, target, timestamp }` |

### 4.3 — Write Endpoints (if Fülkit should be able to modify data)

Use the **preview/confirm** pattern for safety:

1. Client sends write with `preview: true`
2. TrueGauge returns a `preview_id` + what would change + impact
3. Client calls `confirm` with the `preview_id` to apply
4. Or `cancel` to discard
5. Previews expire after 5 minutes

| Action | Purpose |
|:--|:--|
| `update_[entity]` | Modify an entity (with preview/confirm) |
| `confirm` | Apply a previewed change |
| `cancel` | Discard a previewed change |
| `undo` | Revert the last confirmed write (within 1 hour) |

### 4.4 — Simulation Endpoints (optional, high value)

These let Fülkit answer "what if" questions without touching real data.

| Action | Purpose |
|:--|:--|
| `simulate_[scenario]` | Run a hypothetical and return projected impact |

Think: "What if revenue drops 10%?" or "What if I hit 80% of my goal?"

---

## Step 5: The `fulkit_context` Endpoint

This is the **most important endpoint**. It's what Fülkit calls first when a chat session starts. It bundles everything the LLM needs to be useful in one round-trip.

### What to return:

```json
{
  "success": true,
  "organization": {
    "name": "Acme Corp",
    "plan": "pro"
  },
  "counts": {
    "entity_a": 12,
    "entity_b": 45,
    "entity_c": 8
  },
  "key_metric": {
    "label": "Business Health Score",
    "value": 78,
    "unit": "%",
    "trend": "improving"
  },
  "alerts": [
    { "type": "behind_pace", "severity": "warning", "message": "Revenue is 12% behind monthly target" },
    { "type": "cash_low", "severity": "critical", "message": "Cash runway is 18 days" }
  ],
  "recent_activity": [
    { "action": "updated_goal", "target": "March Revenue", "timestamp": "2026-03-10T..." },
    { "action": "logged_expense", "target": "Office Supplies", "timestamp": "2026-03-09T..." }
  ],
  "highlights": [
    "Acme Corp has 12 active goals and 45 transactions this month.",
    "Business health score: 78% (improving).",
    "Revenue is 12% behind monthly pace.",
    "Cash runway: 18 days."
  ],
  "message": "Acme Corp has 12 active goals... (concatenated highlights)"
}
```

**Key design rules:**
- `highlights` = array of plain English sentences, ready for system prompt injection
- `message` = single concatenated string (quick injection)
- `alerts` = structured for both LLM and potential UI rendering
- Keep it under 2KB — this goes into every chat session's context window

---

## Step 6: Settings UI — API Key Management

Add a section to your user Settings/Dashboard:

**Settings → Developer → API Access**

Features needed:
- [ ] **Generate Key** button → creates `tg_sk_` + 32 hex chars
- [ ] Hash key with SHA-256, store hash in `api_keys` table
- [ ] Show raw key **once** in a green banner with copy button
- [ ] Display key prefix + created date + last used date in table
- [ ] **Revoke** button → sets `is_revoked = true`
- [ ] **Delete** button → removes row
- [ ] Only org admins can access this section

**UX tip from Numbrly:** Show a clear message: "This key will only be shown once. Copy it now." Users will forget.

---

## Step 7: Security Checklist

Before going live, verify all of these:

- [ ] API keys hashed with SHA-256 (never stored in plaintext)
- [ ] All queries scoped by `organization_id` (no cross-org data leaks)
- [ ] No PII exposed in API responses (no emails, passwords, personal info)
- [ ] HTTPS enforced (Supabase default)
- [ ] Rate limiting active (100 req/min per org)
- [ ] Audit log on all write operations
- [ ] Preview/confirm flow for destructive writes
- [ ] Key revocation invalidates immediately
- [ ] CORS headers set appropriately
- [ ] Edge function deployed with `--no-verify-jwt` (API key auth replaces JWT)

---

## Step 8: Build Order

### Phase 1 — Foundation (Day 1)
1. Create `api_keys` table in Supabase
2. Create `api_audit_log` table in Supabase
3. Build edge function skeleton with auth validation
4. Implement `ping` endpoint
5. Implement `summary` endpoint (read-only, proves the pipeline works)
6. Add API key generation UI in Settings

### Phase 2 — Context & Reads (Day 1-2)
7. Implement `fulkit_context` endpoint
8. Implement `get_[entity]` for each core entity
9. Implement `list_[entities]` endpoints
10. Implement `search` (fuzzy name matching)
11. Implement `list_alerts` and `list_activity`

### Phase 3 — Simulations (Day 2, optional)
12. Implement simulation endpoints for "what if" queries

### Phase 4 — Writes (Day 2-3, optional)
13. Implement `update_[entity]` with preview/confirm
14. Implement `confirm`, `cancel`, `undo`
15. Wire up audit logging on all writes

### Phase 5 — Deploy & Test (Day 3)
16. `supabase functions deploy truegauge-api --no-verify-jwt`
17. Store secrets: `supabase secrets set TG_API_SIGNING_KEY=...`
18. Test from curl: `ping`, `summary`, `fulkit_context`
19. Generate API key from Settings UI
20. Run the 10-finger handshake checklist (Step 9)

---

## Step 9: Handshake Verification (10 Fingers)

Run through this checklist before telling Fülkit you're ready:

| # | Finger | Test | Pass? |
|:--:|:--|:--|:--:|
| 1 | **API Live** | `curl ...?action=ping` → `{ ok: true }` | ☐ |
| 2 | **Auth Works** | Call with valid key → data. Call with bad key → `unauthorized` | ☐ |
| 3 | **Summary Returns** | `?action=summary` → org name, counts, key metric | ☐ |
| 4 | **Context Bundles** | `?action=fulkit_context` → summary + alerts + activity + highlights | ☐ |
| 5 | **Reads Work** | `get_[entity]` returns correct data for a known entity | ☐ |
| 6 | **Search Works** | `?action=search&q=...` returns fuzzy matches | ☐ |
| 7 | **Rate Limit** | 101st request in 60s → `rate_limited` | ☐ |
| 8 | **Audit Logged** | After a write, `list_activity` shows the action | ☐ |
| 9 | **Key UI Works** | Generate → copy → use in curl → works | ☐ |
| 10 | **Key Revoke Works** | Revoke key → same key returns `unauthorized` | ☐ |

All 10 pass? You're ready. Move to Part 2.

---

---

# PART 2 — Fülkit: Get the Guest Room Ready

> What Fülkit needs to implement to accept the TrueGauge handshake.

---

## Step 1: Register TrueGauge as a Source

Fülkit already knows Numbrly. TrueGauge is a second source. The pattern is identical.

**What Fülkit needs:**
- A source identifier: `"truegauge"`
- The API base URL: `https://[TG_SUPABASE_PROJECT].supabase.co/functions/v1/truegauge-api`
- The key prefix to validate: `tg_sk_`
- The full API contract spec (TrueGauge provides this — same format as Numbrly's `Fulkits_numblybuild_spec.md`)

### Source Registration Checklist
- [ ] Add `"truegauge"` as a recognized source type
- [ ] Store TrueGauge API base URL in configuration
- [ ] Accept `tg_sk_` prefixed keys
- [ ] Route TrueGauge requests to the TG API base URL

---

## Step 2: Store the API Key

Same pattern as Numbrly key storage:
- User provides their TrueGauge API key to Fülkit
- Fülkit stores it securely (encrypted at rest)
- Fülkit sends it as `Authorization: Bearer tg_sk_...` on every TG API call

---

## Step 3: Call `fulkit_context` on Session Start

When a user starts a chat and their active source is TrueGauge:

1. Call `?action=fulkit_context` with the stored API key
2. Receive `{ highlights, alerts, counts, key_metric, ... }`
3. Inject `highlights` (or `message`) into the system prompt
4. Fülkit now has full awareness of the user's TrueGauge state

This is the same flow as Numbrly — just a different base URL and different data shape.

---

## Step 4: NLP → API Mapping

Fülkit needs to know how to translate natural language into TrueGauge API calls.

**TrueGauge provides this table** (filled in from Step 1.4 of Part 1):

| User Intent | API Action | Key Params |
|:--|:--|:--|
| "How's my business?" | `fulkit_context` | — |
| "Am I on pace?" | `summary` or `get_pace` | `period=current_month` |
| "Show me [entity]" | `get_[entity]` | `name` or `id` |
| "List my [entities]" | `list_[entities]` | — |
| "What if [scenario]?" | `simulate_[type]` | scenario-specific params |
| "Update [entity]" | `update_[entity]` | `preview: true` first |
| "Undo that" | `undo` | — |

**This is exactly what Numbrly provided** — Fülkit should expect the same format from TrueGauge.

---

## Step 5: Display Formatting for TrueGauge Data

Fülkit already renders markdown (tables, bold, headers, lists) thanks to the Numbrly integration.

**TrueGauge-specific formatting guidelines:**

- **Key metric** → bold the number: "Your health score is **78%** (improving)"
- **Pace data** → use a table when comparing periods or goals
- **Alerts** → bold the severity, list format:
  - **⚠️ Warning:** Revenue is 12% behind monthly target
  - **🔴 Critical:** Cash runway is 18 days
- **Multi-entity comparisons** → tables with 3-5 columns max

Fülkit should apply the same "when to use tables vs. plain text" rules from the Numbrly display spec:
- **2+ items, 2+ fields** → table
- **Single item, 1-2 fields** → sentence
- **Bold the punchline number**

---

## Step 6: Update Fülkit's Memory

After integration, add to Fülkit's MEMORY.md (or equivalent):

```markdown
## TrueGauge Integration
- Source: truegauge
- API: Supabase Edge Function (truegauge-api)
- Auth: Bearer token with tg_sk_ prefix
- Key endpoint: fulkit_context (call on session start)
- Domain: Business health telemetry — pace, cash flow, health metrics
- Spec files: [path to TG API spec], [path to TG display spec]
- Key metric: [filled in by TG team]
- Entity chain: [filled in by TG team]
```

---

## Step 7: Sanity Test

Once both sides are built, run this quick test:

| # | Test | Expected |
|:--:|:--|:--|
| 1 | `ping` | `{ ok: true }` |
| 2 | `fulkit_context` with valid key | Full context payload with highlights |
| 3 | `summary` | Org name, counts, key metric |
| 4 | `get_[entity]` for a known entity | Correct entity data |
| 5 | Ask Fülkit "How's my business?" | Fülkit responds using TG context |

All 5 pass? **Handshake complete.** 🤝

---

---

# Appendix: What TrueGauge Delivers to Fülkit

When TrueGauge is ready, they hand Fülkit two documents (same as Numbrly did):

1. **API Contract Spec** — Every endpoint, every param, every example response. Title it `TrueGauge_fulkit_api_spec.md`.

2. **Display Formatting Guide** (optional) — If TrueGauge has specific preferences for how its data should look in chat. Title it `truegauge_display_spec.md`.

Plus:
3. **One API key** — Generated from TrueGauge Settings → Developer → API Access.

That's the handoff. Three items. Fülkit reads the specs, stores the key, and the integration is live.

---

## Timeline Estimate

| Phase | Effort | Owner |
|:--|:--|:--|
| Part 1: Steps 1-2 (data audit + tables) | 2-4 hours | TrueGauge |
| Part 1: Steps 3-5 (edge function + endpoints) | 1-2 days | TrueGauge |
| Part 1: Step 6 (settings UI) | 2-4 hours | TrueGauge |
| Part 1: Steps 7-9 (security + verify) | 1-2 hours | TrueGauge |
| Part 2: Steps 1-6 (register + configure) | 2-4 hours | Fülkit |
| Part 2: Step 7 (sanity test) | 30 min | Both |
| **Total** | **~3-4 days** | **Split** |

---

*This playbook was authored from the Numbrly integration team's direct experience building and verifying the Numbrly ↔ Fülkit handshake. The pattern is proven — TrueGauge just needs to fill in its own domain details and follow the same infrastructure blueprint.*
