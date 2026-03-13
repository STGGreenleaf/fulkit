# Numbrly API — Integration Spec for Fülkit

**Version:** 1.0
**Date:** March 7, 2026
**Status:** Draft
**Contact:** Collin Greenleaf (collingreenleaf@gmail.com)

---

## What is Numbrly?

Numbrly is a **cost management platform** for businesses that turn raw materials into finished products. It tracks what you buy, what it costs, and what your margins are on everything you sell.

### Data Model

```
Vendors → Components → Composites → Builds
```

| Entity | What It Is | Example |
|--------|------------|---------|
| **Vendor** | A supplier | Sysco, US Foods, a local farm |
| **Component** | A raw ingredient with a tracked cost | Bananas ($0.35/lb), Almond Milk ($4.99/gal) |
| **Composite** | A sub-recipe made from components | House Almond Butter (batch of 40oz, $12.80) |
| **Build** | A finished sellable product | Green Machine Smoothie (sells $8.99, costs $2.84, 68% margin) |

**Key metric:** `Margin = (Price - Cost) / Price × 100`

Numbrly is not limited to food — it works for any business where raw inputs become finished goods (cosmetics, candles, manufacturing, etc).

---

## Base URL

```
https://oajhduknuwxfakttpdum.supabase.co/functions/v1/numbrly-api
```

---

## Authentication

Every request requires an API key in the `Authorization` header.

```
Authorization: Bearer nbl_sk_a1b2c3d4e5f6...
```

Users generate API keys inside Numbrly at **Settings → Developer → API Access**. Keys are organization-scoped — they can only access that organization's data.

**Key format:** `nbl_sk_` prefix + 32 hex characters

---

## Request Format

### Read Operations (GET)

```
GET /numbrly-api?action=get_build&name=Green%20Machine
Authorization: Bearer nbl_sk_...
```

### Write Operations (POST)

```
POST /numbrly-api
Authorization: Bearer nbl_sk_...
Content-Type: application/json

{
  "action": "update_component",
  "name": "banana",
  "updates": { "cost_per_unit": 0.40 }
}
```

---

## Endpoints

### Read Endpoints

| Action | Method | Description |
|--------|--------|-------------|
| `summary` | GET | High-level store context (counts, margins, highlights) |
| `get_build` | GET | Single build with cost/margin breakdown |
| `get_component` | GET | Single component with cost and usage |
| `get_composite` | GET | Single composite with recipe and batch cost |
| `get_vendor` | GET | Vendor with all their components |
| `search` | GET | Fuzzy search across all entities |
| `list_builds` | GET | All builds with metadata |
| `list_vendors` | GET | All vendors with component counts |
| `list_components` | GET | All components with costs |
| `list_composites` | GET | All composites with batch costs |
| `list_alerts` | GET | Active alerts (low stock, price changes, margin risks) |
| `list_activity` | GET | Recent activity feed |
| `get_price_history` | GET | Historical prices for a component |
| `compare_vendors` | GET | Side-by-side vendor price comparison |
| `audit_log` | GET | History of API-made changes |
| `fulkit_context` | GET | **Bundled chat-start payload:** summary + alerts + recent activity in one call |
| `ping` | GET | **Health check** — no auth required. Returns `{ ok, ts, version }` |

### Write Endpoints

| Action | Method | Description |
|--------|--------|-------------|
| `update_component` | POST | Update a component's price or details |
| `update_build` | POST | Update a build's price or details |
| `update_build_line` | POST | Change qty/unit of a component in a build recipe |
| `add_build_line` | POST | Add a component to a build recipe |
| `remove_build_line` | POST | Remove a component from a build recipe |
| `create_build` | POST | Create a new build |
| `duplicate_build` | POST | Copy an existing build |
| `archive_build` | POST | Soft-archive a build |
| `batch_update` | POST | Update multiple component prices at once |
| `create_receipt` | POST | Create a receipt from parsed voice/text |
| `undo` | POST | Undo last API change |

### Simulation Endpoints (Read-Only Calculations)

| Action | Method | Description |
|--------|--------|-------------|
| `simulate_price` | GET | "What's the margin if I charged $X?" |
| `simulate_cost` | GET | "What if this component cost $X?" |
| `simulate_recipe` | GET | "What if I used X oz instead of Y oz?" |
| `target_margin` | GET | "What price do I need for X% margin?" |
| `simulate_batch` | GET | "What's per-unit cost at X batch size?" |

### Confirmation Endpoints

| Action | Method | Description |
|--------|--------|-------------|
| `confirm` | POST | Execute a previewed write |
| `cancel` | POST | Cancel a previewed write |

---

## Detailed Examples

### Get Store Summary

```
GET /numbrly-api?action=summary
```

```json
{
  "organization": {
    "name": "HBBEVCO",
    "store_code": "N00101"
  },
  "counts": {
    "vendors": 12,
    "components": 87,
    "composites": 8,
    "builds": 24
  },
  "margins": {
    "average": 62,
    "lowest": { "name": "Acai Bowl", "margin": 38 },
    "highest": { "name": "Green Machine", "margin": 71 }
  },
  "recent_spend": {
    "mtd": 4200,
    "top_vendors": [
      { "name": "Sysco", "spend": 1800 },
      { "name": "US Foods", "spend": 1400 }
    ]
  },
  "alerts_count": 3,
  "highlights": [
    "Average margin is 62% across 24 builds",
    "Acai Bowl margin at 38% — lowest in store",
    "Sysco is top vendor by spend ($1,800 MTD)",
    "3 active alerts"
  ]
}
```

**`highlights`** is the most useful field for chat context. Plain English sentences that a conversational AI can use directly.

---

### Fülkit Context (Bundled Chat-Start Payload)

**Recommended as Fülkit's first call when a chat session starts.** Returns summary + alerts + recent API activity in one round-trip.

```
GET /numbrly-api?action=fulkit_context
```

```json
{
  "success": true,
  "organization": {
    "name": "HBBEVCO",
    "store_code": "N00101"
  },
  "counts": {
    "vendors": 12,
    "components": 87,
    "composites": 8,
    "builds": 24
  },
  "margins": {
    "average": 62,
    "lowest": { "name": "Acai Bowl", "margin": 38 },
    "highest": { "name": "Green Machine", "margin": 71 }
  },
  "alerts": [
    {
      "type": "low_margin",
      "severity": "warning",
      "message": "2 build(s) below 20% margin: PB&J Smoothie (18%), Kids Lemonade (15%)"
    },
    {
      "type": "below_target",
      "severity": "warning",
      "message": "1 build(s) below their margin goal: Acai Bowl"
    }
  ],
  "recent_activity": [
    {
      "action": "update_component",
      "target": "Banana",
      "target_type": "component",
      "timestamp": "2026-03-07T14:30:00Z"
    },
    {
      "action": "batch_update",
      "target": "—",
      "target_type": "component",
      "timestamp": "2026-03-06T09:15:00Z"
    }
  ],
  "highlights": [
    "HBBEVCO has 24 builds, 8 composites, 87 components from 12 vendors.",
    "Average margin: 62% across 20 priced builds.",
    "Lowest margin: Acai Bowl at 38%.",
    "Highest margin: Green Machine at 71%.",
    "2 alert(s) need attention.",
    "Last API action: update_component on Banana."
  ],
  "message": "HBBEVCO has 24 builds, 8 composites, 87 components from 12 vendors. Average margin: 62% across 20 priced builds. Lowest margin: Acai Bowl at 38%. Highest margin: Green Machine at 71%. 2 alert(s) need attention. Last API action: update_component on Banana."
}
```

**Usage:** Inject `message` (or individual `highlights`) into Claude's system prompt at chat start. The `alerts` array can drive Whisper-style proactive cards. `recent_activity` shows what's changed recently via the API.

---

### Get Build (with Cost Breakdown)

```
GET /numbrly-api?action=get_build&name=Green%20Machine
```

```json
{
  "id": "bld_abc123",
  "name": "Green Machine",
  "category": "Smoothies",
  "price": 8.99,
  "cost": 2.84,
  "margin": 68.4,
  "target_margin": 65,
  "margin_status": "above_goal",
  "lines": [
    { "name": "Banana", "qty": 1, "unit": "ea", "cost": 0.35 },
    { "name": "Spinach", "qty": 2, "unit": "oz", "cost": 0.44 },
    { "name": "Almond Milk", "qty": 8, "unit": "oz", "cost": 0.62 },
    { "name": "Whey Protein", "qty": 1, "unit": "scoop", "cost": 0.43 },
    { "name": "Ice", "qty": 8, "unit": "oz", "cost": 0.04 }
  ],
  "labor": { "included": true, "prep_minutes": 3, "labor_cost": 1.50 },
  "variations": [
    { "name": "16 oz", "price": 7.49, "cost": 2.20, "margin": 70.6 },
    { "name": "24 oz", "price": 8.99, "cost": 2.84, "margin": 68.4 }
  ],
  "last_updated": "2026-03-05T14:30:00Z"
}
```

---

### Get Component

```
GET /numbrly-api?action=get_component&name=banana
```

```json
{
  "id": "comp_abc123",
  "name": "Banana",
  "vendor_id": "vnd_xyz",
  "vendor_name": "Sysco",
  "vendor_sku": "384729",
  "case_price": 14.00,
  "total_units": 40,
  "cost_per_unit": 0.35,
  "track_unit": "lb",
  "category": "Produce",
  "yield_percent": 85,
  "set_par": 10,
  "inventory_count": 7,
  "inventory_status": "ok",
  "used_in_builds": ["Green Machine", "Tropical Sunrise", "Banana Split Bowl"],
  "used_in_composites": ["Smoothie Base"],
  "last_updated": "2026-03-01T10:00:00Z"
}
```

---

### Search

```
GET /numbrly-api?action=search&q=banana
```

```json
{
  "results": [
    { "type": "component", "id": "comp_abc", "name": "Banana", "detail": "Sysco · $0.35/lb" },
    { "type": "component", "id": "comp_def", "name": "Banana Puree", "detail": "US Foods · $4.99/gal" },
    { "type": "build", "id": "bld_ghi", "name": "Banana Split Bowl", "detail": "$9.99 · 64% margin" }
  ]
}
```

---

### Update Component Price

```
POST /numbrly-api
{
  "action": "update_component",
  "name": "banana",
  "updates": { "cost_per_unit": 0.40 }
}
```

**Response:**
```json
{
  "success": true,
  "component": {
    "name": "Banana",
    "cost_per_unit": 0.40,
    "previous_cost": 0.35,
    "change_pct": 14.3,
    "unit": "lb"
  },
  "affected_builds": [
    { "name": "Green Machine", "old_cost": 2.84, "new_cost": 2.89, "old_margin": 68.4, "new_margin": 67.9 },
    { "name": "Tropical Sunrise", "old_cost": 3.12, "new_cost": 3.17, "old_margin": 61.0, "new_margin": 60.4 }
  ],
  "message": "Updated Banana from $0.35 to $0.40/lb. 2 builds affected. Average margin impact: -0.5%.",
  "audit_id": "aud_abc123"
}
```

---

### Update Build Recipe Line

```
POST /numbrly-api
{
  "action": "update_build_line",
  "build_name": "Green Machine",
  "component_name": "banana",
  "updates": { "qty": 0.70, "unit": "oz" }
}
```

**Response:**
```json
{
  "success": true,
  "build": "Green Machine",
  "line_updated": { "name": "Banana", "old_qty": 1, "old_unit": "ea", "new_qty": 0.70, "new_unit": "oz" },
  "old_cost": 2.84,
  "new_cost": 2.59,
  "old_margin": 68.4,
  "new_margin": 71.2,
  "message": "Changed Banana in Green Machine from 1 ea to 0.70 oz. Margin improved from 68.4% to 71.2%.",
  "audit_id": "aud_def456"
}
```

---

### Batch Update (Multiple Prices)

```
POST /numbrly-api
{
  "action": "batch_update",
  "updates": [
    { "name": "banana", "cost_per_unit": 0.40 },
    { "name": "spinach", "cost_per_unit": 2.50 },
    { "name": "almonds", "cost_per_unit": 8.00 }
  ],
  "preview": true
}
```

**Response (preview):**
```json
{
  "preview": true,
  "preview_id": "prev_abc123",
  "expires_in_seconds": 300,
  "updates": [
    { "name": "Banana", "old": 0.35, "new": 0.40, "matched": true },
    { "name": "Spinach", "old": 2.25, "new": 2.50, "matched": true },
    { "name": "Almonds", "old": 7.50, "new": 8.00, "matched": true }
  ],
  "affected_builds": [
    { "name": "Green Machine", "old_margin": 68, "new_margin": 64 },
    { "name": "Acai Bowl", "old_margin": 55, "new_margin": 51 }
  ],
  "summary": {
    "components_matched": 3,
    "components_not_found": 0,
    "builds_affected": 5,
    "avg_margin_change": -3.2
  },
  "message": "3 components will be updated. 5 builds affected. Average margin drops 3.2%. Send confirm to apply."
}
```

**To apply:**
```
POST /numbrly-api
{ "action": "confirm", "preview_id": "prev_abc123" }
```

---

### Simulate Price Change (No Write)

```
GET /numbrly-api?action=simulate_price&build=Acai%20Shake&price=7.50
```

```json
{
  "simulation": true,
  "build": "Acai Shake",
  "current": { "price": 8.99, "cost": 3.42, "margin": 62.0 },
  "simulated": { "price": 7.50, "cost": 3.42, "margin": 54.4 },
  "delta": { "price": -1.49, "margin": -7.6 },
  "message": "At $7.50, Acai Shake margin drops from 62.0% to 54.4%."
}
```

---

### Simulate Component Cost Change (No Write)

```
GET /numbrly-api?action=simulate_cost&component=banana&cost=0.60
```

```json
{
  "simulation": true,
  "component": "Banana",
  "current_cost": 0.35,
  "simulated_cost": 0.60,
  "affected_builds": [
    {
      "name": "Green Machine",
      "current": { "cost": 2.84, "margin": 68.4 },
      "simulated": { "cost": 3.09, "margin": 65.6 }
    },
    {
      "name": "Tropical Sunrise",
      "current": { "cost": 3.12, "margin": 61.0 },
      "simulated": { "cost": 3.37, "margin": 57.9 }
    }
  ],
  "message": "If Banana goes to $0.60/lb, 2 builds affected. Average margin drops 3.0%."
}
```

---

### Target Margin Calculator (No Write)

```
GET /numbrly-api?action=target_margin&build=Acai%20Shake&margin=70
```

```json
{
  "simulation": true,
  "build": "Acai Shake",
  "current": { "price": 8.99, "cost": 3.42, "margin": 62.0 },
  "target_margin": 70,
  "required_price": 11.40,
  "price_increase_needed": 2.41,
  "message": "To hit 70% margin on Acai Shake, price needs to be $11.40 (currently $8.99, +$2.41)."
}
```

---

### Voice Receipt Entry

```
POST /numbrly-api
{
  "action": "create_receipt",
  "vendor_name": "Sysco",
  "invoice_no": "INV-2026-0342",
  "lines": [
    { "description": "bananas", "qty": 3, "unit_price": 14.00 },
    { "description": "spinach", "qty": 2, "unit_price": 22.00 }
  ],
  "preview": true
}
```

**Response (preview):**
```json
{
  "preview": true,
  "preview_id": "prev_rcpt_123",
  "vendor": { "name": "Sysco", "matched": true },
  "lines": [
    { "description": "bananas", "matched_component": "Banana", "qty": 3, "unit_price": 14.00, "extension": 42.00, "confidence": 0.95 },
    { "description": "spinach", "matched_component": "Spinach", "qty": 2, "unit_price": 22.00, "extension": 44.00, "confidence": 0.92 }
  ],
  "total": 86.00,
  "price_changes": [
    { "component": "Banana", "old_case_price": 13.50, "new_case_price": 14.00, "change_pct": 3.7 }
  ],
  "message": "Receipt from Sysco: 2 lines, $86.00 total. Banana case price up 3.7%. Confirm to post."
}
```

---

### Undo Last Change

```
POST /numbrly-api
{ "action": "undo", "audit_id": "aud_abc123" }
```

```json
{
  "success": true,
  "undone_action": "update_component",
  "detail": "Reverted Banana from $0.40 back to $0.35/lb",
  "message": "Undone. Banana is back to $0.35/lb."
}
```

---

### View Audit Log

```
GET /numbrly-api?action=audit_log&limit=10
```

```json
{
  "entries": [
    {
      "id": "aud_abc123",
      "action": "update_component",
      "target": "Banana",
      "changes": { "cost_per_unit": { "old": 0.35, "new": 0.40 } },
      "source": "api",
      "timestamp": "2026-03-07T21:15:00Z",
      "can_undo": true
    },
    {
      "id": "aud_def456",
      "action": "update_build_line",
      "target": "Green Machine → Banana",
      "changes": { "qty": { "old": 1, "new": 0.70 }, "unit": { "old": "ea", "new": "oz" } },
      "source": "api",
      "timestamp": "2026-03-07T21:10:00Z",
      "can_undo": true
    }
  ]
}
```

---

## Confirmation Flow (Two-Step Writes)

For safety, any write can be previewed before execution. This is **recommended** for voice-driven integrations where misheard commands could cause incorrect changes.

### Step 1: Preview

Add `"preview": true` to any write request. Numbrly calculates the impact but **does not save anything**.

Returns a `preview_id` valid for **5 minutes**.

### Step 2: Confirm or Cancel

```json
{ "action": "confirm", "preview_id": "prev_abc123" }
```
or
```json
{ "action": "cancel", "preview_id": "prev_abc123" }
```

If neither is sent within 5 minutes, the preview expires automatically.

### When to Use Preview

| Scenario | Recommendation |
|----------|---------------|
| Voice command | **Always** preview first |
| Batch updates | **Always** preview first |
| Single price update | Optional (safe either way) |
| Read / Simulate | N/A (no writes) |

---

## Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable explanation"
}
```

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `unauthorized` | 401 | Missing or invalid API key |
| `not_found` | 404 | Entity doesn't exist |
| `ambiguous_match` | 400 | Name matched multiple entities — includes `matches[]` array |
| `validation_error` | 400 | Invalid request (missing required fields, wrong types) |
| `rate_limited` | 429 | Exceeded 100 requests/minute |
| `preview_expired` | 410 | Confirmation window expired (5 min TTL) |
| `internal_error` | 500 | Unexpected server error |

### Handling Ambiguous Matches

When a name search matches multiple entities:

```json
{
  "success": false,
  "error": "ambiguous_match",
  "message": "Found 2 components matching 'banana'. Please specify by ID.",
  "matches": [
    { "id": "comp_abc", "name": "Banana", "vendor": "Sysco", "cost": 0.35 },
    { "id": "comp_def", "name": "Banana Puree", "vendor": "US Foods", "cost": 4.99 }
  ]
}
```

**Fülkit should:** Present the options to the user, then re-call with the specific `id` instead of `name`.

---

## Rate Limits

- **100 requests per minute** per API key
- Exceeding returns HTTP `429` with `Retry-After` header
- Simulations and reads count equally

---

## Natural Language → API Mapping Guide

This table helps Fülkit's NLP layer map user intent to the correct API call.

| User Says | Action | Key Params |
|-----------|--------|------------|
| "What's the margin on Acai Shake?" | `get_build` | `name=Acai Shake` |
| "How much banana in Green Machine?" | `get_build` | `name=Green Machine` → find banana in lines |
| "Change banana to 0.70 oz in Green Machine" | `update_build_line` | `build_name, component_name, qty, unit` |
| "Bananas are up to $0.40" | `update_component` | `name=banana, cost_per_unit=0.40` |
| "What if I charged $7.50 for Acai Shake?" | `simulate_price` | `build=Acai Shake, price=7.50` |
| "What if bananas went to $0.60?" | `simulate_cost` | `component=banana, cost=0.60` |
| "What price for 70% margin on Acai Shake?" | `target_margin` | `build=Acai Shake, margin=70` |
| "What's my most expensive ingredient?" | `summary` | → read `highlights` or sort components |
| "Who do I spend the most with?" | `summary` | → read `recent_spend.top_vendors` |
| "What do I buy from Sysco?" | `get_vendor` | `name=Sysco` → component list |
| "Any alerts?" | `list_alerts` | |
| "What changed today?" | `list_activity` | |
| "New price list: bananas $0.40, spinach $2.50" | `batch_update` | `updates[]` with preview |
| "Got a delivery from Sysco: 3 cases bananas at $14" | `create_receipt` | `vendor_name, lines[]` with preview |
| "Undo that" | `undo` | `audit_id` from last write |
| "What did Fülkit change this week?" | `audit_log` | `since=date` |
| "Add 2 oz spinach to Green Machine" | `add_build_line` | `build_id, component_name, qty, unit` |
| "Remove banana from Tropical Sunrise" | `remove_build_line` | `build_id, component_name` |
| "Create a new build called Mango Madness at $8.99" | `create_build` | `name, price` |
| "Duplicate Green Machine as Green Machine Large" | `duplicate_build` | `source, new_name` |
| "Archive Winter Special" | `archive_build` | `name` |
| "Compare Sysco and US Foods" | `compare_vendors` | `vendor_names[]` |
| "Who has the cheapest banana?" | `compare_vendors` | → filter by component |
| "How has banana price changed?" | `get_price_history` | `component=banana` |

---

## Webhooks (Future — v2)

In a future version, Numbrly can push real-time events to Fülkit:

| Event | When |
|-------|------|
| `price_change` | Component price updated > threshold |
| `margin_alert` | Build margin drops below target |
| `receipt_posted` | New receipt posted |
| `low_stock` | Component below PAR level |

Fülkit would register a webhook URL and receive signed payloads. Not available in v1 — Fülkit should poll `summary` or `list_alerts` for now.

---

## Security

- **API keys are organization-scoped** — can only read/write that org's data
- **Keys are hashed** — Numbrly doesn't store plaintext keys
- **HTTPS only** — all traffic encrypted (Supabase enforces TLS)
- **All writes logged** — full audit trail with undo capability
- **Rate limited** — 100 req/min per key
- **No PII exposed** — no user emails, passwords, or auth tokens
- **Preview/confirm** — two-step safety for destructive writes

---

## Setup for Fülkit Users

1. Log into Numbrly at [numbrly.app](https://numbrly.app)
2. Go to **Settings → Developer → API Access**
3. Click **Generate API Key**
4. Copy the key (shown only once)
5. In Fülkit, go to **Sources → Add Numbrly**
6. Paste the API key
7. Fülkit can now read and write your Numbrly data

---

## Quick Test

```bash
curl -s "https://oajhduknuwxfakttpdum.supabase.co/functions/v1/numbrly-api?action=summary" \
  -H "Authorization: Bearer nbl_sk_YOUR_KEY_HERE" | jq .
```

---

## Response Size Guidelines

| Endpoint | Typical Size |
|----------|-------------|
| `summary` | ~500-1500 tokens |
| `get_build` | ~300-800 tokens |
| `get_component` | ~200-400 tokens |
| `search` | ~200-600 tokens |
| `list_*` | ~500-2000 tokens |
| `simulate_*` | ~200-500 tokens |

All responses are designed to fit within typical LLM context windows. No paginated data dumps — summaries and highlights only.

---

*Numbrly API Spec v1.0 — March 2026*
