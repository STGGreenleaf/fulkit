# Last Session

**Date**: 2026-03-27 (Session 24)
**Scope**: KB self-awareness, Signal Terrain audit, compression fix, landing page rewrite

**Shipped**:
- KB self-awareness: all 5 shelf articles rewritten (31 integrations), WHATS_NEW in system prompt, staleness loop (7-day warning + 30-day audit)
- OrbVisualizer: 30fps frame cap + adaptive quality wired to Crystal/Pulse Ring rendering
- /recover + /api/recover-sets deleted (213 lines, zero references)
- Compression quality fix: prose retention + sentence-aware user topics + 25 tests
- site_metadata: added 6 missing columns (author, twitter_image_url, canonical_url, keywords, og_site_name, twitter_handle)
- OG cache-busting: ?v= timestamp from updated_at, opengraph.xyz + LinkedIn Inspector links in owner portal
- Landing page full rewrite (collaborative, section by section):
  - Hero: new definitions, "See also: the app that texts you first", usage quote "We are not the same"
  - Problem: sourced stats (87 apps, $219/mo, 42% forgot, 22% looking), "You're paying to be"
  - Math: $219 vs $9 abstract receipt (fragmentation vs one surface), no fake app list
  - Features: 6 cards (Memory Vault, Voice, Whispers & Actions, Search & Triage, Awareness, Fabric with B-Side), "The FULL Kit"
  - Integration ticker: 21 greyscale icons from shared lib/integration-ticker.js, 60s seamless loop
  - Comparison: 11-column angled header grid, 10 feature rows, kill shot "All of the above for $9/mo"
  - Pricing: "No credit card", "$9/mo or $0 with 9 friends. Your move."
  - Trust: "We don't read your notes. We encrypt them so we can't." + "We ask you to verify us."
  - Final CTA: "Fülkit all. One app."
- Type normalization: 14px floor across entire landing page, controlled 4-role hierarchy
- TODO: marked 4.9 semantic search as done

**Carry forward — NEXT SESSION**:
1. **/about page rewrite** — philosophy is strong, needs product substance. Same collaborative approach.
2. **Landing page 3%** — product screenshot, real user quote when available, trial terms more prominent
3. **Ticker debate** — static grid vs animated scroll (Rams question). Revisit after /about.
4. **Compression real-world testing** (8.1-8.5) — function fixed, needs 10 real conversations
5. **SOC 2 label** in trust section — "controls" not "certified", consider softer language
6. **Fabric pipeline** — DigitalOcean droplet, viz tuning with real data
7. **Pitches.md audit** — flagged items still open

**Known issues**:
- Google verification pending (4-6 weeks)
- Dropbox production review pending
- Grid header alignment needs pixel-perfect tuning on some screen sizes
