# TrueGauge — Fülkit Integration Spec

**Version:** 1.0
**Date:** March 11, 2026
**Base URL:** `https://truegauge.app/api/external/truegauge`
**Auth:** `Authorization: Bearer tg_sk_...`
**Status:** Playbook + API contract — ready for both teams to execute

---

## Overview

TrueGauge (Precision Business Health) connects to Fülkit (AI assistant platform) using the same integration pattern proven by the Numbrly handshake. TrueGauge exposes a single endpoint with action-based routing. All requests use query parameter `?action=` to specify the operation.

**Two-team split:**

| Part | Who | What |
|:--|:--|:--|
| **Part 1** | TrueGauge team | API infrastructure, endpoints, settings UI, key management |
| **Part 2** | Fülkit team | Register source, store keys, context injection, NLP mapping |

Both teams can work from their half independently. When both halves are done, shake hands and test.

### Reference: The Numbrly Pattern

Numbrly's integration with Fülkit is the proven template:

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

## Authentication

- **Header:** `Authorization: Bearer tg_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Key Format:** `tg_sk_` + 32 hex characters
- Keys are SHA-256 hashed, org-scoped, and revocable
- Rate limit: **100 requests/minute** per organization

### Response Format

All responses return JSON:
```json
// Success
{ "success": true, ...data }

// Error
{ "error": "error_code", "message": "Human readable message" }
```

---

## API Reference

### Health Check

#### `ping`
**Method:** GET
**Auth:** None
**Description:** Verify API is live

```
GET ?action=ping
```

**Response:**
```json
{
  "success": true,
  "ok": true,
  "timestamp": "2026-03-11T23:27:00.000Z"
}
```

---

### Context & Summary

#### `fulkit_context` (Primary — call this first)
**Method:** GET
**Auth:** Required
**Description:** Bundled context for chat session start. This is the most important endpoint — Fülkit calls it first when a chat session begins. It bundles everything the LLM needs in one round-trip.

```
GET ?action=fulkit_context
```

**Response:**
```json
{
  "success": true,
  "organization": {
    "name": "HB Beverage Co"
  },
  "asOfDate": "2026-03-11",
  "counts": {
    "dayEntries": 11,
    "expenses": 23
  },
  "key_metric": {
    "label": "Health Score",
    "value": 78,
    "unit": "/100",
    "trend": "improving"
  },
  "metrics": {
    "mtdNetSales": 24500,
    "survivalGoal": 25000,
    "survivalPercent": 98,
    "paceDelta": 1200,
    "monthlyNut": 15500
  },
  "alerts": [
    { "type": "behind_pace", "severity": "warning", "message": "Sales are $800 behind pace for the month." }
  ],
  "recent_activity": [
    { "action": "add_expense", "target": "Sysco", "timestamp": "2026-03-10T..." }
  ],
  "highlights": [
    "HB Beverage Co health score: **78/100** (healthy).",
    "MTD sales: **$24,500** vs survival goal of $25,000 (**98%**).",
    "Pace: **+$1,200** ahead of target."
  ],
  "message": "HB Beverage Co health score: **78/100** (healthy). MTD sales: **$24,500** vs survival goal of $25,000 (**98%**). Pace: **+$1,200** ahead of target."
}
```

**Usage:** Inject `highlights` or `message` into system prompt at session start.

**Design rules:**
- `highlights` = array of plain English sentences, ready for system prompt injection
- `message` = single concatenated string (quick injection)
- `alerts` = structured for both LLM and potential UI rendering
- Keep it under 2KB — this goes into every chat session's context window

---

#### `summary`
**Method:** GET
**Auth:** Required
**Description:** High-level dashboard snapshot

```
GET ?action=summary
```

**Response:**
```json
{
  "success": true,
  "organization": { "name": "HB Beverage Co" },
  "asOfDate": "2026-03-11",
  "counts": { "dayEntries": 11, "expenses": 23 },
  "key_metric": {
    "label": "Health Score",
    "value": 78,
    "unit": "/100",
    "trend": "healthy"
  },
  "metrics": {
    "mtdNetSales": 24500,
    "survivalGoal": 25000,
    "survivalPercent": 98,
    "paceDelta": 1200,
    "actualCogsRate": 0.32,
    "targetCogsRate": 0.35
  }
}
```

---

### Read Endpoints

#### `get_pace`
**Method:** GET
**Auth:** Required
**Description:** Current month pace and survival metrics

```
GET ?action=get_pace
```

**Response:**
```json
{
  "success": true,
  "asOfDate": "2026-03-11",
  "mtdNetSales": 24500,
  "survivalGoal": 25000,
  "survivalPercent": 98,
  "mtdTarget": 23300,
  "paceDelta": 1200,
  "status": "ahead",
  "dailyNeeded": 1250,
  "remainingOpenDays": 16,
  "remainingToGoal": 500
}
```

---

#### `get_settings`
**Method:** GET
**Auth:** Required
**Description:** Business configuration and NUT breakdown

```
GET ?action=get_settings
```

**Response:**
```json
{
  "success": true,
  "businessName": "HB Beverage Co",
  "timezone": "America/Denver",
  "monthlyFixedNut": 15500,
  "nutBreakdown": {
    "rent": 4500,
    "utilities": 800,
    "payroll": 6000,
    "insurance": 500,
    ...
  },
  "targetCogsPct": 0.35,
  "targetFeesPct": 0.03,
  "monthlyRoofFund": 500,
  "monthlyOwnerDrawGoal": 3000,
  "operatingFloorCash": 10000,
  "targetReserveCash": 50000,
  "openHours": { "mon": 0, "tue": 8, "wed": 8, "thu": 8, "fri": 8, "sat": 8, "sun": 5 }
}
```

---

#### `get_cash`
**Method:** GET
**Auth:** Required
**Description:** Current cash position and runway

```
GET ?action=get_cash
```

**Response:**
```json
{
  "success": true,
  "cashNow": 45000,
  "asOf": "2026-03-10",
  "operatingFloor": 10000,
  "targetReserve": 50000,
  "aboveFloor": 35000,
  "toTarget": 5000,
  "runwayDays": 87,
  "monthlyNut": 15500
}
```

---

#### `list_expenses`
**Method:** GET
**Auth:** Required
**Params:**
- `month` (optional): Filter by month, e.g., `2026-03`
- `category` (optional): Filter by category: `COGS`, `OPEX`, `CAPEX`, `OWNER_DRAW`, `OTHER`
- `limit` (optional): Max results (default 50, max 100)

```
GET ?action=list_expenses&month=2026-03&category=COGS
```

**Response:**
```json
{
  "success": true,
  "count": 12,
  "totalAmount": 8500,
  "expenses": [
    {
      "id": "clxyz...",
      "date": "2026-03-10",
      "vendorName": "Sysco",
      "category": "COGS",
      "amount": 850,
      "memo": "Weekly produce order",
      "spreadMonths": null
    }
  ]
}
```

---

#### `list_day_entries`
**Method:** GET
**Auth:** Required
**Params:**
- `month` (optional): Filter by month
- `limit` (optional): Max results (default 31)

```
GET ?action=list_day_entries&month=2026-03
```

**Response:**
```json
{
  "success": true,
  "count": 11,
  "daysWithData": 11,
  "totalSales": 24500,
  "entries": [
    { "id": "clxyz...", "date": "2026-03-11", "netSalesExTax": 2450, "notes": "Busy lunch" }
  ]
}
```

---

#### `list_alerts`
**Method:** GET
**Auth:** Required
**Description:** Active alerts/warnings

```
GET ?action=list_alerts
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "alerts": [
    { "type": "behind_pace", "severity": "warning", "message": "Sales are $800 behind pace." },
    { "type": "cogs_high", "severity": "warning", "message": "COGS is 3% above target." }
  ]
}
```

---

#### `list_activity`
**Method:** GET
**Auth:** Required
**Description:** Recent API activity (audit log)

```
GET ?action=list_activity
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "activity": [
    { "action": "add_expense", "target": "Sysco", "timestamp": "2026-03-10T...", "via": "api" }
  ]
}
```

---

#### `search`
**Method:** GET
**Auth:** Required
**Params:**
- `q`: Search query (min 2 characters)

```
GET ?action=search&q=sysco
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "type": "vendor", "id": "clxyz...", "name": "Sysco", "category": "COGS", "amount": 850 },
    { "type": "expense", "id": "clxyz...", "name": "Sysco", "category": "COGS", "amount": 850, "date": "2026-03-10" }
  ],
  "counts": { "vendors": 1, "expenses": 3 }
}
```

---

### Simulation Endpoints

#### `simulate_pace`
**Method:** GET
**Auth:** Required
**Params:**
- `target_pct`: Target percentage of survival goal (default 100)

```
GET ?action=simulate_pace&target_pct=90
```

**Response:**
```json
{
  "success": true,
  "scenario": {
    "targetPercent": 90,
    "targetGoal": 22500
  },
  "current": {
    "mtdNetSales": 24500,
    "survivalGoal": 25000,
    "currentPercent": 98
  },
  "projection": {
    "remaining": 0,
    "remainingDays": 20,
    "dailyNeeded": 0,
    "achievable": true
  }
}
```

---

### Write Endpoints

All write endpoints support the **preview/confirm** pattern for safety:

1. Client sends write with `preview: true`
2. TrueGauge returns a `preview_id` + what would change + impact
3. Client calls `confirm` with the `preview_id` to apply
4. Or `cancel` to discard
5. Previews expire after 5 minutes

#### `add_expense`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "date": "2026-03-11",
  "vendorName": "Sysco",
  "category": "COGS",
  "amount": 850.00,
  "memo": "Weekly produce order",
  "spreadMonths": null,
  "preview": true
}
```

**Preview Response:**
```json
{
  "success": true,
  "preview": true,
  "preview_id": "preview_1710...",
  "expires_in": "5 minutes",
  "will_create": {
    "type": "expense",
    "date": "2026-03-11",
    "vendorName": "Sysco",
    "category": "COGS",
    "amount": 850
  },
  "impact": {
    "description": "Will add $850 COGS expense from Sysco"
  }
}
```

**Confirm:** Send `POST ?action=confirm` with `{ "preview_id": "preview_1710..." }`

---

#### `update_day_entry`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "date": "2026-03-11",
  "netSalesExTax": 2450.00,
  "notes": "Busy lunch crowd",
  "preview": true
}
```

**Preview Response:**
```json
{
  "success": true,
  "preview": true,
  "preview_id": "preview_1710...",
  "expires_in": "5 minutes",
  "will_update": {
    "date": "2026-03-11",
    "from": { "netSalesExTax": 2200, "notes": null },
    "to": { "netSalesExTax": 2450, "notes": "Busy lunch crowd" }
  }
}
```

---

#### `update_cash_snapshot`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "amount": 45000,
  "date": "2026-03-11",
  "preview": true
}
```

---

#### `confirm`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "preview_id": "preview_1710..."
}
```

**Response:**
```json
{
  "success": true,
  "created": true,
  "expense": { "id": "clxyz...", ... }
}
```

---

#### `cancel`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "preview_id": "preview_1710..."
}
```

---

#### `undo`
**Method:** POST
**Auth:** Required
**Description:** Undo the last confirmed write (within 1 hour)

```
POST ?action=undo
```

**Response:**
```json
{
  "success": true,
  "undone": true,
  "action": "deleted expense",
  "targetId": "clxyz..."
}
```

---

### Concierge Endpoints (Full Settings Access)

#### `get_reference_year`
**Method:** GET
**Auth:** Required
**Params:** `year` (optional, defaults to last year)

```
GET ?action=get_reference_year&year=2025
```

**Response:**
```json
{
  "success": true,
  "year": 2025,
  "monthlyData": { "1": 28000, "2": 25000, ... },
  "total": 312000,
  "hasData": true
}
```

---

#### `update_reference_year`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "year": 2025,
  "monthlyData": { "1": 28000, "2": 25000, "3": 30000, ... },
  "preview": true
}
```

---

#### `get_year_anchors`
**Method:** GET
**Auth:** Required
**Description:** Get all year starting cash anchors

```
GET ?action=get_year_anchors
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "anchors": [
    { "id": "...", "year": 2026, "cashAmount": 45000, "asOfDate": "2026-01-01" },
    { "id": "...", "year": 2025, "cashAmount": 32000, "asOfDate": "2025-01-01" }
  ]
}
```

---

#### `update_year_anchor`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "year": 2026,
  "cashAmount": 45000,
  "asOfDate": "2026-01-01",
  "preview": true
}
```

---

#### `list_capital_flow`
**Method:** GET
**Auth:** Required
**Params:** `year` (optional, defaults to current year)

```
GET ?action=list_capital_flow&year=2026
```

**Response:**
```json
{
  "success": true,
  "year": 2026,
  "count": 5,
  "totalIn": 25000,
  "totalOut": 8000,
  "entries": [
    { "id": "...", "type": "injection", "amount": 10000, "date": "2026-02-15", "note": "Loan" },
    { "id": "...", "type": "owner_draw", "amount": 3000, "date": "2026-02-01", "note": "Monthly draw" }
  ]
}
```

---

#### `add_injection`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "amount": 10000,
  "date": "2026-03-11",
  "note": "Capital infusion",
  "preview": true
}
```

---

#### `add_owner_draw`
**Method:** POST
**Auth:** Required
**Body:**
```json
{
  "amount": 3000,
  "date": "2026-03-11",
  "note": "Monthly owner draw",
  "preview": true
}
```

---

#### `update_settings`
**Method:** POST
**Auth:** Required
**Description:** Update any settings field (NUT, targets, hours, etc.)

**Body:**
```json
{
  "businessName": "HB Beverage Co",
  "storeCloseHour": 18,
  "monthlyFixedNut": 15500,
  "nutRent": 4500,
  "nutPayroll": 6000,
  "targetCogsPct": 0.35,
  "openHoursTemplate": { "sun": 5, "mon": 0, "tue": 8, ... },
  "preview": true
}
```

**Allowed fields:**
- `businessName`, `timezone`, `storeCloseHour`
- `monthlyFixedNut`, `targetCogsPct`, `targetFeesPct`
- `monthlyRoofFund`, `monthlyOwnerDrawGoal`
- `operatingFloorCash`, `targetReserveCash`
- `nutRent`, `nutUtilities`, `nutPhone`, `nutInternet`, `nutInsurance`, `nutLoanPayment`, `nutPayroll`, `nutSubscriptions`
- `nutOther1`, `nutOther1Label`, `nutOther2`, `nutOther2Label`, `nutOther3`, `nutOther3Label`
- `openHoursTemplate`

---

## Integration Guide

### Part 1 — TrueGauge: Infrastructure & Build

#### Supabase Tables

##### `api_keys` Table

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

##### `api_audit_log` Table

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

##### Key Hashing (never store raw keys)

```typescript
async function hashKey(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

#### Edge Function

Create a Supabase Edge Function named `truegauge-api`. Single entry point, action-based routing.

**File:** `supabase/functions/truegauge-api/index.ts`

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

##### Auth Validation Pattern

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

#### Settings UI — API Key Management

Add a section to user Settings/Dashboard:

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

#### Build Order

##### Phase 1 — Foundation (Day 1)
1. Create `api_keys` table in Supabase
2. Create `api_audit_log` table in Supabase
3. Build edge function skeleton with auth validation
4. Implement `ping` endpoint
5. Implement `summary` endpoint (read-only, proves the pipeline works)
6. Add API key generation UI in Settings

##### Phase 2 — Context & Reads (Day 1-2)
7. Implement `fulkit_context` endpoint
8. Implement `get_[entity]` for each core entity
9. Implement `list_[entities]` endpoints
10. Implement `search` (fuzzy name matching)
11. Implement `list_alerts` and `list_activity`

##### Phase 3 — Simulations (Day 2, optional)
12. Implement simulation endpoints for "what if" queries

##### Phase 4 — Writes (Day 2-3, optional)
13. Implement `update_[entity]` with preview/confirm
14. Implement `confirm`, `cancel`, `undo`
15. Wire up audit logging on all writes

##### Phase 5 — Deploy & Test (Day 3)
16. `supabase functions deploy truegauge-api --no-verify-jwt`
17. Store secrets: `supabase secrets set TG_API_SIGNING_KEY=...`
18. Test from curl: `ping`, `summary`, `fulkit_context`
19. Generate API key from Settings UI
20. Run the handshake verification checklist

---

### Part 2 — Fülkit: Accept the Handshake

#### Register TrueGauge as a Source

Fülkit already knows Numbrly. TrueGauge is a second source. The pattern is identical.

**What Fülkit needs:**
- A source identifier: `"truegauge"`
- The API base URL: `https://[TG_SUPABASE_PROJECT].supabase.co/functions/v1/truegauge-api`
- The key prefix to validate: `tg_sk_`
- The full API contract spec (this document)

**Source Registration Checklist:**
- [ ] Add `"truegauge"` as a recognized source type
- [ ] Store TrueGauge API base URL in configuration
- [ ] Accept `tg_sk_` prefixed keys
- [ ] Route TrueGauge requests to the TG API base URL

#### Store the API Key

Same pattern as Numbrly key storage:
- User provides their TrueGauge API key to Fülkit
- Fülkit stores it securely (encrypted at rest)
- Fülkit sends it as `Authorization: Bearer tg_sk_...` on every TG API call

#### Call `fulkit_context` on Session Start

When a user starts a chat and their active source is TrueGauge:

1. Call `?action=fulkit_context` with the stored API key
2. Receive `{ highlights, alerts, counts, key_metric, ... }`
3. Inject `highlights` (or `message`) into the system prompt
4. Fülkit now has full awareness of the user's TrueGauge state

#### Update Fülkit's Memory

After integration, add to Fülkit's MEMORY.md:

```markdown
## TrueGauge Integration
- Source: truegauge
- API: Supabase Edge Function (truegauge-api)
- Auth: Bearer token with tg_sk_ prefix
- Key endpoint: fulkit_context (call on session start)
- Domain: Business health telemetry — pace, cash flow, health metrics
- Spec file: fulkit_site/md/truegauge-spec.md
- Key metric: Health Score (/100)
- Entity chain: Day Entries → Expenses → Cash → Pace → Health Score
```

---

## NLP → API Mapping

| User Says | API Action |
|:--|:--|
| "How's my business doing?" | `fulkit_context` |
| "Am I on pace this month?" | `get_pace` |
| "What's my health score?" | `summary` |
| "Show me my expenses this month" | `list_expenses` |
| "What's my NUT?" | `get_settings` |
| "How much cash do I have?" | `get_cash` |
| "Log $500 COGS from Sysco" | `add_expense` (preview/confirm) |
| "Update today's sales to $2,400" | `update_day_entry` (preview/confirm) |
| "What if I hit 90% of my goal?" | `simulate_pace&target_pct=90` |
| "Undo that" | `undo` |
| "What were my sales last year?" | `get_reference_year` |
| "My rent is $4,500/month" | `update_settings` (preview/confirm) |
| "Log a $5,000 owner draw" | `add_owner_draw` (preview/confirm) |
| "I got a $10k loan today" | `add_injection` (preview/confirm) |
| "Show me capital flow this year" | `list_capital_flow` |
| "Set my closing hour to 6pm" | `update_settings` (preview/confirm) |

---

## Display / UX Rules

### Formatting Guidelines

- **Health Score** → Bold the number: "Your health score is **78/100**"
- **Pace** → Prefix with +/- : "You're **+$1,200** ahead of pace"
- **Alerts** → Use emoji prefixes:
  - ⚠️ Warning
  - 🔴 Critical
  - ℹ️ Info
- **Tables** → Use for 2+ items with 2+ fields
- **Single values** → Plain sentence with bold number
- **Multi-entity comparisons** → Tables with 3-5 columns max
- **Bold the punchline number** — same rule as Numbrly display spec

### When to Use Tables vs. Plain Text

- **2+ items, 2+ fields** → table
- **Single item, 1-2 fields** → sentence
- End structured responses with a natural follow-up question
- Don't force formatting when a sentence works

---

## Error Codes

| Code | HTTP Status | Description |
|:--|:--|:--|
| `unauthorized` | 401 | Missing or invalid API key |
| `rate_limited` | 429 | Exceeded 100 req/min |
| `invalid_action` | 400 | Unknown action parameter |
| `invalid_params` | 400 | Missing required fields |
| `preview_expired` | 410 | Preview timed out (5 min) |
| `no_undo` | 404 | No recent action to undo |
| `internal_error` | 500 | Server error |

---

## Security Checklist

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

## Handshake Verification (10 Fingers)

Run through this checklist before going live:

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

All 10 pass? Handshake complete.

---

## Timeline Estimate

| Phase | Effort | Owner |
|:--|:--|:--|
| Part 1: Data audit + tables | 2-4 hours | TrueGauge |
| Part 1: Edge function + endpoints | 1-2 days | TrueGauge |
| Part 1: Settings UI | 2-4 hours | TrueGauge |
| Part 1: Security + verify | 1-2 hours | TrueGauge |
| Part 2: Register + configure | 2-4 hours | Fülkit |
| Part 2: Sanity test | 30 min | Both |
| **Total** | **~3-4 days** | **Split** |

---

## What TrueGauge Delivers to Fülkit

When TrueGauge is ready, they hand Fülkit three items:

1. **API Contract Spec** — This document.
2. **Display Formatting Guide** (optional) — If TrueGauge has specific preferences for how its data should look in chat.
3. **One API key** — Generated from TrueGauge Settings → Developer → API Access.

That's the handoff. Three items. Fülkit reads the spec, stores the key, and the integration is live.

---

*This spec consolidates the TrueGauge API contract and integration playbook. It follows the same patterns proven by the Numbrly ↔ Fülkit handshake.*
