# CLAUDE.md — Fulkit Dev Context

## First thing every session
1. Read `md/devlog.md` — session history, decisions, what's next
2. Read `md/design.md` — visual system, tokens, guardrails
3. Read `md/buildnotes.md` — product spec, architecture, pricing

## Rules
- Every color, font, spacing value uses design tokens from `app/app/tokens.css`. No hardcoded values.
- **Warm monochrome only.** The palette is one warm-grey family (#2A2826 → #EFEDE8). The only color allowed is functional: semantic states (success/warning/error) and source indicators. No decorative color. No accent hues. No brand colors on UI elements. If it's not a status signal, it's grey.
- Brand name is **Fulkit** (with umlaut). Code identifiers and URLs use fulkit (no umlaut).
- Never write "FulKit", "FULKIT", "FullKit", or "Ful-kit".
- Sub-features use their proper names: **The Hum**, **Whispers**, **Ful Gauge**.
- Inline styles only — no CSS modules, no Tailwind, no styled-components.
- CTAs are always full-width block `<Link>` buttons — `display: "block"`, `width: "100%"`, `textAlign: "center"`. No email inputs, no forms. One solid bar.
- The Fulkit logo/wordmark in any nav always links to `/`.
- **Auto-checkpoint before context compression**: Update `md/devlog.md` with session work, `TODO.md` with completed items, and commit. Never cold start. This is non-negotiable.
- Before context clears, always write a session summary to `md/devlog.md`.

## Project Structure
```
fulkit/                   # Monorepo root (git root)
  fulkit_site/            # This project
    app/                  # Next.js project root (Vercel root directory)
      app/                # Next.js App Router pages
        tokens.css        # Design tokens (CSS custom properties)
        globals.css       # Global resets, imports tokens.css
        actions/          # Actions page
        chat/             # Chat page (persistent conversations)
        home/             # Dashboard
        settings/         # Settings (6 tabs)
        owner/            # Owner portal
      components/         # Shared React components
      lib/                # Utilities (auth.js, supabase.js)
      public/             # Static assets
    md/                   # Docs (design.md, devlog.md, buildnotes.md, etc.)
    assets/               # Source logos, brand assets, fonts, styles
    jsx/archive/          # Archived JSX prototypes
  ChappieBrain/           # Obsidian vault (gitignored, not deployed)
```

## Stack
- Next.js 16 (App Router, Turbopack)
- Supabase (Auth + Postgres + RLS)
- Claude API (chat, whispers)
- Vercel (hosting)
- D-DIN font (swap to DIN Pro when licensed)
- No component library — everything custom

## Sensitive
- Never log API keys, secrets, or credentials in any file
- Reference their existence ("ANTHROPIC_API_KEY is set in .env.local and Vercel") but never the values
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
