# Session 25 Briefing — Final Sweep

> Read this at the start of Session 25. Everything needed to pick up cold.

---

## What shipped in Session 24

Two public pages fully rewritten (landing + about), KB self-awareness system, compression quality fix, OrbVisualizer perf fixes, privacy policy enumerated with all 31 integrations. See `last-session.md` for full list.

---

## Priority 1: Onboarding Flow Audit

Walk through every step a new user sees. No gaps.

### The journey:
1. **Landing page** → clicks [Get Fülkit]
2. **Login page** → Google OAuth (what do they see?)
3. **Onboarding / Bestie Test** → questionnaire (what questions? what does it set up?)
4. **Fülkit folder zip** → when does it appear? What's in it? What does the user do with it? Is this still a thing?
5. **First chat** → Chappie is the onboarding host. What does it say? Does it reference the questionnaire answers? Does it guide the user through features?
6. **Free trial** → 14 days, 150 messages, no credit card. What happens at day 14? What happens at 150 messages?
7. **Payment conversion** → when/how do they see pricing? Upgrade flow. What blocks if they don't pay?
8. **Owner page questionnaire flash** → something appears and disappears on owner portal related to the Bestie Test. Investigate.

### Files to read:
- `app/onboarding/page.js` — onboarding flow
- `app/login/page.js` — login page
- `md/bestie-test.md` — questionnaire spec
- `app/api/chat/route.js` — how Chappie greets new users
- `lib/ful-config.js` + `lib/ful-legend.js` — trial limits, tier config
- `app/owner/page.js` — find the flashing questionnaire element

---

## Priority 2: Fabric on Mobile

Status check. Does it render? Does the player work? Is Signal Terrain visible? Any layout issues with the mobile tab bar?

---

## Priority 3: Remaining Items

| Item | Status | Notes |
|------|--------|-------|
| Ticker static vs animated | Deferred | Rams debate — test with real users |
| Grid header alignment | Cosmetic | Angled names need pixel-tuning per screen size |
| Pitches.md audit | Open | 6 flagged items (stack-problem, referral count, SOC 2, etc.) |
| Compression testing | Open | Function fixed, needs 10 real conversations |
| SOC 2 label | Open | "controls" not "certified" — consider softer language |
| Fabric pipeline | Open | DigitalOcean droplet for production audio analysis |
| landing-v2.md | Reference | Product screenshot, real user quotes, trial prominence |

---

## Context files (read these first)
- `fulkit_site/CLAUDE.md` — rules, structure, stack
- `fulkit_site/last-session.md` — Session 24 recap
- `fulkit_site/md/landing-v2.md` — landing refinement ideas
- `fulkit_site/md/bestie-test.md` — onboarding spec
- `fulkit_site/TODO.md` — master action list

---

*Prepared: Session 24, 2026-03-28 00:10*
