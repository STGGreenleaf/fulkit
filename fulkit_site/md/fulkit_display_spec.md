# Fülkit Display Formatting Spec

> How to format Numbrly API responses for visual clarity in chat.
> Numbrly's chat UI renders full GitHub Flavored Markdown (GFM).

---

## Overview

Numbrly's Chappie chat components render assistant messages through `react-markdown` with `remark-gfm`.
This means **tables, bold, headers, lists, code blocks, and horizontal rules** all render as styled HTML —
not raw pipe characters.

Fülkit should use markdown formatting when data lends itself to structured display.
When Fülkit is just talking naturally, plain text is fine — no need to force formatting.

---

## Phase 1: Markdown Formatting (Active Now)

### Tables — Use for comparisons, multi-field lookups, validation results

```markdown
| Variation | Price | Cost | Margin |
|:--|:--|:--|:--|
| 16 oz. | $10.75 | $3.87 | 64.0% |
| 24 oz. | $13.50 | $5.22 | 61.3% |
```

**When to use:** Any time you're showing 2+ fields across 2+ items.
Examples: build comparisons, variation breakdowns, component cost lists, alert summaries.

**When NOT to use:** Single-item lookups with 1-2 fields. Just say "UGotKale costs $3.87."

### Bold — Use for key numbers, names, and status

```markdown
**UGotKale 16 oz.** costs **$3.87** with a **64.0% margin**.
```

**When to use:** Highlight the 1-2 most important values in a sentence.
**When NOT to use:** Don't bold entire paragraphs. If everything is bold, nothing is.

### Headers — Use to separate sections in multi-part responses

```markdown
## Summary
Average margin is 68.5% across 12 builds.

## Alerts
3 builds below 20% margin.

## Top Performers
Acai Bowl leads at 78.2%.
```

**When to use:** Responses with 3+ distinct sections.
**When NOT to use:** Short answers. A one-paragraph response doesn't need headers.

### Lists — Use for alerts, action items, enumerated findings

```markdown
- **Low margin:** Dragon SPLIT at 18.2%
- **No price set:** Smoothie Bowl, Test Build
- **Below target:** Matcha (target 65%, actual 57.7%)
```

**When to use:** 3+ items of the same type.
**When NOT to use:** 1-2 items. Just write a sentence.

### Horizontal Rules — Use to separate major sections

```markdown
Here's your build detail.

---

Want me to simulate a price change?
```

### Code Blocks — Use for raw data, IDs, or technical output

```markdown
Build ID: `a1b2c3d4-e5f6-7890`
```

---

## Phase 2: Display Hints in API Responses (Future)

When the Numbrly API returns structured data, it can include optional `display_hint` fields
to help Fülkit choose the best visual format. This is not yet implemented but planned.

### Proposed Schema

```json
{
  "display_hint": "table",
  "columns": ["Name", "Price", "Cost", "Margin"],
  "rows": [
    ["UGotKale 16 oz.", "$10.75", "$3.87", "64.0%"],
    ["Matcha 16 oz.", "$8.75", "$3.70", "57.7%"]
  ]
}
```

### Display Hint Types

| Hint | When | Rendering |
|:--|:--|:--|
| `table` | Multi-row structured data | Markdown table |
| `kpi` | Single metric with context | Bold number + label |
| `comparison` | Before/after or A vs B | Side-by-side table |
| `alert_list` | Multiple alerts/warnings | Bulleted list with severity icons |
| `plain` | Conversational response | No special formatting |

### KPI Example

```json
{
  "display_hint": "kpi",
  "metric": "Average Margin",
  "value": "68.5%",
  "context": "across 12 priced builds",
  "trend": "up",
  "delta": "+2.3%"
}
```

Fülkit would render: **Average Margin: 68.5%** (↑ +2.3%) across 12 priced builds.

---

## Phase 3: Response Format Guidelines for Fülkit

### General Rules

1. **Talk naturally by default.** Don't force tables when a sentence works.
2. **Use tables for structured comparisons.** 2+ items × 2+ fields = table.
3. **Bold the punchline.** The one number the user cares about most.
4. **Keep tables compact.** Max 5-6 columns. Round to 2 decimal places.
5. **Use headers for multi-section responses.** Summary → Detail → Action.
6. **End with a natural question.** "Want me to simulate a price change?" not "END OF REPORT."

### Response Templates

#### Single Build Lookup
```
**UGotKale 16 oz.** — $10.75 price, $3.87 cost, **64.0% margin** (target: 60% ✓)

| Line | Qty | Unit | Cost |
|:--|:--|:--|:--|
| UGotKale Mix | 16 | fl_oz | $1.94 |
| Banana | 0.5 | ea | $0.12 |
| Granola | 2 | oz | $0.38 |

Want me to check how a price change would affect the margin?
```

#### Multi-Build Comparison
```
## Margin Comparison

| Build | Price | Cost | Margin |
|:--|:--|:--|:--|
| UGotKale 16 oz. | $10.75 | $3.87 | 64.0% |
| Matcha 16 oz. | $8.75 | $3.70 | 57.7% |
| Dragon 20 oz. | $10.50 | $3.48 | 66.9% |

**Matcha** has the tightest margin at 57.7%. Want me to simulate bumping it to $9.25?
```

#### Alert Summary
```
## 3 Alerts

- **Low margin:** Dragon SPLIT at 18.2% (target: 55%)
- **No price:** Smoothie Bowl — can't calculate margin
- **Below target:** Matcha 16 oz. — 57.7% vs 65% goal

Most urgent: **Dragon SPLIT** is losing money at that margin. Want details?
```

#### Conversational (no formatting needed)
```
Your store average margin is 68.5% across 12 priced builds. That's solid —
most juice bars run 55-65%. Your highest performer is Acai Bowl at 78.2%.
```

---

## What Numbrly Supports (Rendering Capabilities)

| Markdown Feature | Supported | Notes |
|:--|:--:|:--|
| Tables (GFM) | ✅ | Zebra-striped, responsive overflow |
| Bold / Italic | ✅ | `**bold**` / `*italic*` |
| Headers (h1-h3) | ✅ | Compact sizing for chat bubbles |
| Bullet lists | ✅ | Disc markers, tight spacing |
| Numbered lists | ✅ | Decimal markers |
| Inline code | ✅ | Gray background pill |
| Code blocks | ✅ | Dark background, monospace |
| Horizontal rules | ✅ | Thin divider line |
| Links | ✅ | Blue, opens in new tab |
| Images | ❌ | Not rendered in chat |
| HTML tags | ❌ | Stripped for security |
| Emoji | ✅ | Native rendering |

---

## Changelog

| Date | Change |
|:--|:--|
| 2026-03-08 | Phase 1: Markdown rendering added to all Chappie chat components |
| 2026-03-08 | Spec created with Phase 1-3 roadmap |
