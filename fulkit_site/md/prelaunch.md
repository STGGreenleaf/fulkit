# Fülkit — Pre-Launch Checklist

> Everything that needs to happen before users touch the product.
> See also: [buildnotes.md](buildnotes.md) for product spec, [design.md](design.md) for visual system, [features.md](features.md) for marketing copy.

---

## Status Key
- ⬜ Not started
- 🟡 In progress
- ✅ Done

---

## Brand & Identity

| Status | Task | Notes |
|:---:|:---|:---|
| ✅ | Domain purchased: FullKit.app | Primary domain |
| ✅ | Domain purchased: Fulkit.app | Redirect target |
| ⬜ | Configure FullKit.app → Fulkit.app redirect | DNS redirect |
| ⬜ | Purchase DIN Pro font license (~$100) | [myfonts.com/fonts/paratype/din-pro](https://www.myfonts.com/fonts/paratype/din-pro) or use D-DIN free for now |
| ⬜ | Convert font files to .woff2 | cloudconvert.com or fontsquirrel generator |
| ⬜ | Place fonts in `/assets/fonts/` | Regular (400), Medium (500), Bold (700), Black (900) |
| ⬜ | Design F-mark logo (icon with ü diaeresis) | SVG, multiple sizes |
| ⬜ | Design full wordmark ("Fülkit") | SVG, using DIN Pro |
| ⬜ | Generate favicon (32×32, 16×16, SVG) | From icon mark |
| ⬜ | Generate PWA icons (192×192, 512×512) | Maskable + standard |
| ⬜ | Create OG image (1200×630) | Use brand tokens from design.md |
| ⬜ | Create social post templates | Twitter, Instagram, LinkedIn, Story |

---

## Design System

| Status | Task | Notes |
|:---:|:---|:---|
| ✅ | design.md written | Single source of truth |
| ⬜ | Convert design.md tokens to CSS variables file | `/assets/styles/tokens.css` |
| ⬜ | Convert design.md tokens to JSON config | `/assets/config/tokens.json` |
| ⬜ | Build owner portal: Design tab | Color editor, type preview, component preview |
| ⬜ | Verify two-way sync: design.md ↔ owner portal | Manual edits update UI, UI edits update file |
| ⬜ | Build component preview / style guide | Auto-generated from tokens |
| ⬜ | Set up icon pool (Lucide subset) | See design.md for curated list |

---

## Infrastructure

| Status | Task | Notes |
|:---:|:---|:---|
| ⬜ | Set up Supabase project | Postgres + Auth + Storage |
| ⬜ | Enable pgvector extension | For RAG embeddings |
| ⬜ | Design database schema: users table | id, email, seat_type, generation, inviter_id, referral_credits, messages_this_month, last_message_date, created_at |
| ⬜ | Design database schema: notes table | id, user_id, title, content, source, embedding, tags, created_at, updated_at |
| ⬜ | Design database schema: referrals table | id, referrer_id, referred_id, status, credit_amount, created_at |
| ⬜ | Design database schema: preferences table | id, user_id, key, value (for AI-learned preferences) |
| ⬜ | Set up Supabase Auth (email + magic link) | No passwords for MVP |
| ⬜ | Configure Supabase Storage buckets | documents, voice_recordings, exports |
| ⬜ | Set up API spend alerts | Never get surprised by a bill |
| ⬜ | Get Claude API key (Anthropic) | For AI chat |

---

## Core Product (MVP)

| Status | Task | Notes |
|:---:|:---|:---|
| 🟡 | AI chat (Claude API integration) | Prototype exists (fulkit-app.jsx) |
| 🟡 | The Hum | Prototype exists (fulkit-orb.jsx) |
| ⬜ | RAG pipeline: embed notes → pgvector | On note create/update, generate embedding |
| ⬜ | RAG pipeline: query → retrieve relevant notes → inject into prompt | The magic. The sizzle. |
| ⬜ | Note creation (text input) | Create, edit, delete |
| ⬜ | Note import from markdown files | Drag/drop or folder connect |
| ⬜ | Obsidian vault import | Read .md files, preserve folder structure |
| ⬜ | ChappieBrain import | Your personal Obsidian vault — first test case |
| ⬜ | Onboarding: "text from bestie" flow | First screen = message, not tutorial |
| ⬜ | Whisper system (proactive suggestions) | Default 2/day, conversational control |
| ⬜ | Action list (AI-generated to-dos) | With feedback controls (✓, →, ✕) |
| ⬜ | Fül system: message counting + caps | Standard 450/mo, Pro 800/mo |
| ⬜ | Fül system: "Fül up" prompt prompt when empty | $2/100 messages |
| ⬜ | BYOK nudge for heavy burners | Whisper when consistently hitting cap |

---

## Owner Portal

| Status | Task | Notes |
|:---:|:---|:---|
| 🟡 | Pyramid calculator | Prototype exists (owner-portal/pyramid.jsx) — needs rebuild |
| ⬜ | Design tab (color/type/component editor) | Reads/writes design.md tokens |
| ⬜ | Users tab (invite tree, usage, revenue per user) | See who invited who |
| ⬜ | Settings tab (API keys, billing alerts, feature flags) | |
| ⬜ | OG image designer | Template + brand tokens → download PNG |
| ⬜ | Social post mockup generator | IG, Twitter, LinkedIn, Story |
| ⬜ | SEO meta editor | Titles, descriptions, OG tags with preview |

---

## Pricing & Payments

| Status | Task | Notes |
|:---:|:---|:---|
| ⬜ | Set up Stripe (or Supabase billing) | For $7 Standard / $12 Pro subscriptions |
| ⬜ | Implement hot seat mechanic | 4 msgs/month threshold, 30-day auto-revoke |
| ⬜ | Implement referral credit system | $1/mo per active referral, credits not cash |
| ⬜ | "Get Fülkit" referral page in account settings | Link, active referrals, credit balance, progress |
| ⬜ | Dashboard pull-tab for referrals | Small, always visible, links to subscription area |
| ⬜ | Whisper nudge for non-referrers | "You know you could get a free account, right?" |
| ⬜ | Buy credits flow | $2/100 messages on-demand |
| ⬜ | BYOK API key connection | For heavy users — they burn their own tokens |

---

## Landing Page & Feature Page (Fulkit.app)

| Status | Task | Notes |
|:---:|:---|:---|
| ⬜ | Design landing page | Minimal. Eggshell. DIN. The name does the talking. |
| ⬜ | Design feature page / infographic | Single scrolling page. German poster energy. See features.md for layout. |
| ⬜ | Email capture / waitlist form | "Get Fülkit" — email + "what would you use it for?" |
| ⬜ | Generate OG image for social sharing | 1200×630, brand tokens, pull headline from features.md |
| ⬜ | Deploy to Fulkit.app | Vercel, Netlify, or Supabase hosting |
| ⬜ | Set up email list (Loops, Resend, or Mailchimp) | For waitlist comms |
| ⬜ | Write waitlist confirmation email | On-brand. Bestie voice. Pull copy from features.md |

---

## Launch

| Status | Task | Notes |
|:---:|:---|:---|
| ⬜ | Seed 5 hot seats (your closers) | People who will actually use it |
| ⬜ | Import ChappieBrain as first vault | Your Obsidian vault = test case #1 |
| ⬜ | Ingest Fülkit's own repo into itself | buildnotes.md, design.md, prelaunch.md — Fülkit manages its own build |
| ⬜ | Dog-food for 1 week minimum | Use it daily yourself before anyone else touches it |
| ⬜ | Wire Claude Code to read design.md + buildnotes.md | Autonomous dev with guardrails |
| ⬜ | Invite hot seat users | Give them the bestie experience |
| ⬜ | Monitor: messages/user, retention, referral rate | The numbers that matter |
| ⬜ | First referral signups | Paying users. Revenue. Breakeven countdown begins. |
| ⬜ | Set up user feedback capture | "Something feel off? Tell me" — via conversation, not a form |

---

## File Structure (your repo)

```
fulkit/
├── README.md               ← developer setup, project overview
├── assets/
│   ├── brand/              ← logos, wordmarks (SVG)
│   ├── fonts/              ← DIN Pro .woff2 files
│   ├── icons/              ← curated Lucide exports if needed
│   ├── og/                 ← OG images, social templates
│   ├── easter-eggs/        ← blackletter textures, Bauhaus patterns
│   └── styles/
│       ├── tokens.css      ← generated from design.md
│       └── tokens.json     ← JSON export for JS consumption
├── jsx/
│   ├── fulkit-app.jsx      ← main app — AI chat, notes, sources, roadmap
│   ├── fulkit-orb.jsx      ← the Hum — animated, stateful, with controls
│   └── pyramid.jsx         ← owner portal pricing calculator (needs rebuild)
└── md/
    ├── buildnotes.md       ← product spec (links to all other docs)
    ├── design.md           ← visual system (single source of truth)
    ├── features.md         ← marketing copy, app comparisons, infographic content
    └── prelaunch.md        ← this file (launch checklist)
```

### Archive note
Old prototype iterations (fullkit-prototype.jsx, fullkit-v2.jsx, fullkit-desktop.jsx, fullkit-minimal.jsx, old fulkit-pyramid.jsx) can be stored in an `archive/` folder if you want to keep the design evolution for reference.

---

## Changelog
- v1.0 — Initial prelaunch checklist. Brand, infra, MVP, payments, landing page, launch tasks.
