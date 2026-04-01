# Last Session

**Date**: 2026-03-31 (Session 30)
**Scope**: TODO audit, tooltips, dev loop, Linear, onboarding overhaul, vault filesystem sync, launch hardening

**Shipped**:
- TODO.md audit: 10+ items marked done, integration roadmap 8→23, blocked items → Waiting—V2
- CLAUDE.md: 15 missing lib modules + API routes added
- Referral Whispers + Tooltips (52) in Owner Playground with delete/restore
- Dev loop Phase A: dev_multi_write + dev_run_tests (owner-only)
- Linear integration (#23): OAuth + 3 chat tools + Settings card
- Meta-tool scaling path documented in v3-spec
- Seat type renamed free→trial across entire codebase (14 files, DB constraint updated)
- Launch polish: error.js, robots.txt, sitemap.xml, auth signals to Radio
- PKCE magic link fix + expired link handler
- Onboarding overhaul: no skip, mandatory vault, 3-column integration picker with logos, back button, text-wrap balance, consistent centering
- **Vault filesystem sync (the big one)**: write operations (notes/actions/decisions/summaries as .md files), folder watcher (30s poll + focus scan), permission re-check, structure re-validation, onboarding picker triggers showDirectoryPicker, Safari/Firefox auto Model C
- Brain card on Settings Account tab (connection status + folder path)
- Brain tree view on Vault tab (read-only folder structure)
- Landing page trust copy: "No AI product does this... Fülkit writes it to your desktop"
- 5 seat_type bugs caught + fixed by automated sweep
- Rage click fix, Slack logo fix, BroadcastItem touch targets

**Open**: Test vault write in production (Chrome incognito: save note → check folder for .md)

**Next (Session 31)**:
- Vault write end-to-end test
- Trial expiry lockout test (set trial_started_at 15 days back)
- Stripe checkout with new "trial" seat type
- Vault disconnected banner (vaultError state exposed but no UI yet)
- Note update sync to filesystem
