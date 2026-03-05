# Fulkit — Claude Code Rules

## Session Protocol
1. **Read first** — At the start of every session, read `md/devlog.md` and `md/design.md` before writing any code.
2. **Write last** — At the end of every session (or when asked to commit), append a summary to `md/devlog.md` covering what was built, decisions made, and what's next.
3. **No secrets** — Never log, commit, or output API keys, tokens, or credentials. If a key is needed, reference the env var name only (e.g. `NEXT_PUBLIC_SUPABASE_URL`).

## Brand Rules
- The product name is **Fulkit** (plain text) or **Fulkit** (with umlaut: u with diaeresis).
- Never write "FulKit", "FULKIT", "FullKit", or "Ful-kit".
- Sub-features use their proper names: **The Hum**, **Whispers**, **Ful Gauge**.

## Code Rules
- All visual values must use CSS custom properties from the design token system (`var(--color-*)`, `var(--space-*)`, `var(--font-size-*)`, etc.). Zero hardcoded colors, sizes, or spacing.
- Reference `md/design.md` as the source of truth for tokens.
- Inline styles only — no CSS modules, no Tailwind, no styled-components.
- Components live in `app/components/`. Pages live in `app/app/{route}/page.js`.

## Project Structure
```
fulkit/
  app/          # Next.js project root (Vercel root directory)
    app/        # Next.js App Router pages
    components/ # Shared React components
    lib/        # Utilities (auth.js, supabase.js)
    public/     # Static assets
  md/           # Docs (design.md, devlog.md, buildnotes.md, etc.)
  assets/       # Source logos, brand assets
  jsx/          # Standalone JSX snippets / experiments
```

## Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (Auth + Postgres + RLS)
- Vercel (hosting)
- No component library — everything custom
