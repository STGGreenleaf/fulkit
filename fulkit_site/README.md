# Fülkit

**I'll be your bestie.**

An AI-powered second brain that knows everything you've saved, talks back, and never makes you start from zero.

---

## What is this

Fülkit replaces the 10 apps you juggle daily with one bestie that thinks with you. AI chat that knows your notes, the Hum for voice mode, proactive whispers that surface what matters, and an action list that writes itself — all in one place.

**This repo is the product, the docs, and the brain all in one.**

---

## Folder structure

```
fulkit/
├── README.md           ← you are here
├── assets/             ← brand, fonts, icons, OG images, styles
│   ├── brand/          ← logos, wordmarks (SVG)
│   ├── fonts/          ← DIN Pro .woff2 files
│   ├── icons/          ← custom icons (Lucide loaded via npm)
│   ├── og/             ← OG images, social templates
│   ├── easter-eggs/    ← decorative assets (Bauhaus, blackletter)
│   └── styles/
│       ├── tokens.css  ← CSS variables from design.md
│       └── tokens.json ← JSON export for JS
├── jsx/                ← prototypes and components
│   ├── fulkit-app.jsx  ← main app prototype (live Claude AI)
│   ├── fulkit-orb.jsx  ← the Hum — voice mode prototype (animated)
│   └── pyramid.jsx     ← owner portal pricing calculator
└── md/                 ← documentation (the brain)
    ├── buildnotes.md   ← product spec, architecture, pricing
    ├── design.md       ← visual system, tokens, components
    ├── features.md     ← marketing copy, comparisons, CTA bank
    └── prelaunch.md    ← launch checklist with status tracking
```

---

## Documentation

Read these in order if you're new to the project:

1. **[md/buildnotes.md](md/buildnotes.md)** — The product vision, architecture, pricing model, and roadmap. Start here to understand what Fülkit is and why.

2. **[md/design.md](md/design.md)** — The single source of truth for all visual decisions. Every color, font, spacing value, component spec, and guardrail. **Read this before writing any UI code.**

3. **[md/features.md](md/features.md)** — The marketing treasure trove. App replacement tables, cost comparisons, competitive grid, copy bank, CTA wordplay. Pull from this for any collateral.

4. **[md/prelaunch.md](md/prelaunch.md)** — Every task needed before launch, with status tracking (⬜/🟡/✅). The file structure and launch phases live here.

---

## Tech stack

| Layer | Technology |
|:---|:---|
| Web | React |
| Mobile | PWA first → React Native (Expo) later |
| AI | Claude API (claude-sonnet-4-5-20250514) |
| Backend | Supabase (Postgres + Auth + Storage) |
| Vector search | pgvector on Supabase |
| Fonts | DIN Pro (self-hosted .woff2) |
| Icons | Lucide React |
| Voice transcription | Whisper API (OpenAI) — ~$0.006/min |

---

## Design guardrails

Before touching any UI, read **[md/design.md](md/design.md)**. The rules:

1. No raw color values — everything uses `var(--token)`
2. Hover states are auto-derived — never manually set
3. Font sizes only from the type scale
4. Spacing only from the spacing scale
5. Border radius only from the radius scale
6. **If it's not a token, it doesn't exist**
7. All new visual values must be added as tokens first, then used

---

## Prototypes

The `jsx/` folder contains working prototypes built during the initial design session:

- **fulkit-app.jsx** — Full app with sidebar nav, notes list, sources, roadmap, and live AI chat powered by Claude. Three dev modes: General (no note awareness), Brain Only (notes only), Brain-First (default — connects everything back to your notes).

- **fulkit-orb.jsx** — The Hum — voice mode with four animated states (idle, listening, thinking, speaking). Canvas-rendered with noise displacement. Mic/stop/back controls. No transcript on screen.

- **pyramid.jsx** — Owner portal with pricing calculator. Needs rebuild to match current Fül system ($7 Standard / $12 Pro / buy credits).

---

## Current status

| Milestone | Status |
|:---|:---|
| Product spec | ✅ Complete (buildnotes.md) |
| Design system | ✅ Complete (design.md) |
| Marketing copy | ✅ Complete (features.md) |
| Launch checklist | ✅ Complete (prelaunch.md) |
| App prototype | 🟡 Working prototype |
| The Hum prototype | 🟡 Working prototype |
| Supabase setup | ⬜ Not started |
| RAG pipeline | ⬜ Not started |
| Landing page | ⬜ Not started |
| First 5 hot seats | ⬜ Not started |

---

## Pricing model (summary)

- **Founder:** Free forever
- **5 hot seats:** Free (must send 1 msg/week or 4/month — use it or lose it)
- **Standard:** $7/mo (450 messages — Fül system)
- **Pro:** $12/mo (800 messages)
- **Buy credits:** $2 per 100 messages
- **Referrals:** $1/mo credit per active referral. Refer 7 = free. Unlimited invites.
- **BYOK:** Heavy users nudged to connect own Anthropic API key

Breakeven at ~30 paying users. Full math in [md/buildnotes.md](md/buildnotes.md).

---

## Key concepts

| Concept | What it means |
|:---|:---|
| **Chappie** | Internal name for Fülkit's personality. Core behavior. Anticipates, not waits. Permission-based. Warm, not chatty. |
| **Whispers** | Proactive, ephemeral suggestions. Drift in, fade out. Not notifications. |
| **The Hum** | Voice mode. Talk to an animated orb. No transcript. AI processes silently. |
| **Hot seats** | Founder's free seats. Inactive users (30 days) auto-revoke. |
| **Fül** | Message credits. Caps per tier. Prevents cost overruns. Fül up or wait. |
| **"Get Fülkit"** | Referral CTA. Earn credits, not cash. |
| **Two rooms** | Desktop = your desk. Mobile = your pocket bestie. Same soul. |
| **Brain-first AI** | Can do anything, always connects back to your notes. |

---

## The vision

V1: A bestie that thinks with you.
V2: A bestie that does things for you (agents).
V3: A platform others build on.

Or just the best personal tool ever built. Either way — built because the founder needs it. That's the foundation.

---

*Fülkit your brains out.*
