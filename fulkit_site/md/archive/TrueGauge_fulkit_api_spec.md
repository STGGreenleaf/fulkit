# TrueGauge API Specification for Fülkit

**Version:** 1.0  
**Date:** March 11, 2026  
**Base URL:** `https://truegauge.app/api/external/truegauge`  
**Auth:** `Authorization: Bearer tg_sk_...`

---

## Overview

TrueGauge exposes a single endpoint with action-based routing. All requests use query parameter `?action=` to specify the operation.

### Authentication

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

## Endpoints

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

#### `fulkit_context` ⭐ (Primary)
**Method:** GET  
**Auth:** Required  
**Description:** Bundled context for chat session start. Call this first.

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

All write endpoints support the **preview/confirm** pattern for safety.

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

## Display Formatting Guidelines

- **Health Score** → Bold the number: "Your health score is **78/100**"
- **Pace** → Prefix with +/- : "You're **+$1,200** ahead of pace"
- **Alerts** → Use emoji prefixes:
  - ⚠️ Warning
  - 🔴 Critical
  - ℹ️ Info
- **Tables** → Use for 2+ items with 2+ fields
- **Single values** → Plain sentence with bold number

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

## Security Notes

- Keys are SHA-256 hashed (never stored in plaintext)
- All queries scoped by `organization_id`
- No PII exposed (no emails, passwords)
- Audit log on all write operations
- Preview/confirm for destructive writes
- Key revocation takes effect immediately
- HTTPS enforced

---

*This spec enables Fülkit to integrate with TrueGauge using the same patterns as the Numbrly integration.*
