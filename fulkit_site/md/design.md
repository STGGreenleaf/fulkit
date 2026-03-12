# Fülkit — Design System

> This file is the single source of truth for all visual decisions in Fülkit.
> Every component, page, and asset references this file. Nothing is hardcoded.
> Update here → everything updates. Manual edits sync to owner portal and vice versa.
> See also: [buildnotes.md](buildnotes.md) for product spec, [features.md](features.md) for marketing copy.

---

## Brand

### Name
- Primary: **Fülkit**
- Plain text fallback: Fulkit
- The **ü** (diaeresis/umlaut) is the brand mark
- Pronunciation: "Fühl-kit" (German: fühl = to feel → feel-kit)

### Logo
- Mark: The letter **F** with the ü diaeresis as a design element
- Style: Typographic — the logotype IS the logo
- Variants: Full wordmark ("Fülkit"), Icon mark ("F" with dots), Monochrome
- Files: `/assets/brand/logo-full.svg`, `/assets/brand/logo-icon.svg`

### Taglines
- Primary: "I'll be your bestie"
- Secondary: "Let's chat and get shit done"
- Formal: "Your second brain, fully loaded"
- Action: "Get Fülkit"

### Voice
- Bestie energy, not servant energy
- Warm but not chatty. Useful but not desperate.
- Has initiative — doesn't wait for instructions
- Permission-based — asks before assuming

---

## Color Tokens

### Philosophy
**Warm monochrome.** One color family — warm grey (#2A2826 → #EFEDE8) — at varying lightness and opacity. Not achromatic (no tint), not colorful. Every surface, text, border, and accent lives on this single warm-grey axis. The only color permitted is **functional**: semantic states (success/warning/error) and source indicators. If it's not a status signal, it's grey. No decorative color. No accent hues. No brand colors on UI elements. The palette should feel like ink on warm paper — analog, considered, quiet.

### Base Palette

```
--color-bg:              #EFEDE8    /* Eggshell off-white. Noticeably not white. Warm. */
--color-bg-alt:          #E7E4DF    /* Slightly deeper surface for cards, panels */
--color-bg-elevated:     #F5F3F0    /* Lifted surface — modals, dropdowns, tooltips */
--color-bg-inverse:      #2A2826    /* Dark surface — dark cards, footer, P&L block */

--color-text:            #2A2826    /* Deep warm slate. Noticeably not black. Ink. */
--color-text-secondary:  #5C5955    /* Body text, descriptions */
--color-text-muted:      #8A8784    /* Labels, captions, timestamps */
--color-text-dim:        #B0ADA8    /* Placeholders, disabled text */
--color-text-inverse:    #F0EEEB    /* Text on dark backgrounds */

--color-border:          #D4D1CC    /* Default borders, dividers */
--color-border-light:    #E5E2DD    /* Subtle dividers, card edges */
--color-border-focus:    #2A2826    /* Focus rings */

--color-accent:          #2A2826    /* Primary action — buttons, links, active states */
--color-accent-hover:    #1A1816    /* Auto-derive: darken accent 10% */
--color-accent-active:   #111010    /* Auto-derive: darken accent 15% */
--color-accent-soft:     #2A282610  /* Auto-derive: accent at 6% opacity */
--color-accent-ring:     #2A282640  /* Auto-derive: accent at 25% opacity — focus rings */
```

### Semantic Colors

```
--color-success:         #2F8F4E    /* Positive — connected, synced, profitable */
--color-success-soft:    #2F8F4E12  /* Success tint background */
--color-warning:         #C4890A    /* Caution — syncing, nearing limit */
--color-warning-soft:    #C4890A12  /* Warning tint background */
--color-error:           #C43B2E    /* Negative — failed, over budget */
--color-error-soft:      #C43B2E12  /* Error tint background */
```

### Source Indicators (only functional color in the UI)

```
--color-source-obsidian: #7C3AED    /* Obsidian vault — purple */
--color-source-gdrive:   #16A34A    /* Google Drive — green */
--color-source-dropbox:  #2563EB    /* Dropbox — blue */
--color-source-icloud:   #3B82F6    /* iCloud — light blue */
--color-source-fulkit:   #2A2826    /* Native Fülkit notes — slate */
```

### Derived States (auto-calculated, NEVER manually set)

```
hover:     base color + darken 10%
active:    base color + darken 15%
disabled:  base color at 40% opacity
focus:     2px ring using --color-accent-ring, 2px offset
soft-bg:   base color at 6-8% opacity
```

**Rule: if you need a new color, add a token. Never use a raw hex value in a component.**

---

## Typography

### Philosophy
Type IS the design. Fülkit uses minimal text — so when words appear, they carry weight.
Every word earns its place on screen. Typography is structural, not decorative.

### Font Stack

```
--font-primary:          'DIN Pro', 'D-DIN', sans-serif   /* German industrial. See below. */
--font-mono:             'JetBrains Mono', monospace       /* Numbers, code, data */
```

### Default: DIN

**Why DIN:** Designed in 1931 by the Deutsches Institut für Normung (German Institute for Standardization). Literally engineered for clarity on German road signs, technical documents, and industrial applications. It's functional, authoritative, warm at small sizes, and commanding at large sizes. Full weight range from Thin to Black. This IS Fülkit's typographic DNA — German engineering meets modern utility.

**Licensing:** DIN Pro requires a license (~$50-200 depending on package). For prototyping, use D-DIN (free, close approximation) or system sans-serif fallback.

**Weight system — unified headers to body:**

```
Hero / display:     DIN Pro Black (900)   — 28-48px — commanding, bold statement
Page titles:        DIN Pro Bold (700)    — 22px — clear authority
Section headers:    DIN Pro Medium (500)  — 15-16px — subtle hierarchy shift
Body text:          DIN Pro Regular (400) — 14px — clean, readable
Captions/labels:    DIN Pro Regular (400) — 11-12px — quiet, supportive
KPI numbers:        DIN Pro Black (900)   — 18-28px — data punches through
Button labels:      DIN Pro Medium (500)  — 12-13px — confident, not shouting
```

This creates a unified visual rhythm — everything is DIN, the hierarchy comes purely from weight and size. No mixing fonts. One family, many voices.

### Font Exploration Dropdown (Owner Portal)
All options available for immediate preview. Each has multiple weights for the header/body system.

| Font | Origin | Vibe | Weights | License | Easter Egg |
|:---|:---|:---|:---|:---|:---|
| **DIN Pro** ★ default | Germany, 1931. Deutsches Institut für Normung | Industrial, engineered, functional | Thin→Black (9) | Commercial (~$100) | German road signs, railway timetables, government docs |
| **Futura** | Germany, 1927. Paul Renner, Bauer Type Foundry | Geometric, modernist, Bauhaus | Light→ExtraBold (7) | Commercial (~$80) | Used in 2001: A Space Odyssey, Supreme logo, Wes Anderson films |
| **Neue Haas Grotesk** | Switzerland, 1957. Max Miedinger | The original Helvetica before it was renamed | Thin→Black (9) | Commercial (~$120) | Renamed to "Helvetica" for international market — lost its Swiss-German identity |
| **FF Meta** | Germany, 1991. Erik Spiekermann | Humanist, warm, the anti-Helvetica | Thin→Black (9) | Commercial (~$100) | Spiekermann called it "the typeface I always wanted" — designed for German Post Office |
| **GT Walsheim** | Switzerland, 2010. Grilli Type | Geometric, slightly quirky, modern | Thin→Black (7) | Commercial (~$150) | Named after Swiss typographer Otto Walsheim |
| **FF DIN** | Germany, 2010. Albert-Jan Pool | The definitive digital DIN revival | Light→Black (8) | Commercial (~$100) | Pool spent years studying original DIN metal type specimens |
| **D-DIN** | Open source DIN approximation | Close to DIN, slightly less refined | Regular→Bold (3) | Free | Good enough for prototyping, swap for real DIN later |
| **Barlow** | Open source, grotesk-inspired | Industrial, wide, confident | Thin→Black (9) | Free (Google) | Inspired by California highway signs — cousin to DIN's road sign heritage |
| **IBM Plex Sans** | International, 2017. Mike Abbink | Industrial, neutral, engineered | Thin→Bold (7) | Free (open source) | Designed for IBM's industrial identity — shares DIN's engineering ethos |
| **Outfit** | Open source, geometric | Clean, modern, geometric | Thin→Black (9) | Free (Google) | Full weight range, good DIN alternative |

### Historical Easter Eggs (design heritage)
The Germanic typography tradition runs deep. Fülkit's design can subtly reference this:
- **Bauhaus influence** (1919-1933) — form follows function, no decoration, geometric purity
- **Swiss/International Style** (1950s) — grid systems, clean hierarchy, objective presentation
- **DIN standards** — the idea that DESIGN should be standardized, reliable, trustworthy
- **German industrial design** (Braun/Dieter Rams) — "less but better," 10 principles of good design
- **Blackletter heritage** — traditional German script. NOT for UI, but could appear as a subtle watermark, loading screen detail, or "about" page decoration. A nod to the roots.
- **The umlaut itself** — ü as a design mark is the most visible easter egg. It says "this has German DNA" without being literal about it.

These aren't features to build — they're a design sensibility that should inform decisions. When in doubt, ask: "What would Dieter Rams do?"

### Custom Font Loading
To use DIN Pro or any licensed font:
1. Purchase license (or use D-DIN free for prototyping)
2. Convert .otf/.ttf to .woff2 (use: https://cloudconvert.com or fontsquirrel generator)
3. Place files in `/assets/fonts/`
4. Reference in CSS:
```css
@font-face {
  font-family: 'DIN Pro';
  src: url('/assets/fonts/din-pro-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'DIN Pro';
  src: url('/assets/fonts/din-pro-medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'DIN Pro';
  src: url('/assets/fonts/din-pro-bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'DIN Pro';
  src: url('/assets/fonts/din-pro-black.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
```
5. Fallback chain: `'DIN Pro', 'D-DIN', -apple-system, sans-serif`
6. Self-hosted. No CDN dependency. Fast. Owned.

### Type Scale

```
--font-size-2xs:         10px    /* Fine print, badges */
--font-size-xs:          11px    /* Captions, labels, tags */
--font-size-sm:          12px    /* Secondary text, metadata */
--font-size-base:        14px    /* Body text — primary reading size */
--font-size-md:          15px    /* Slightly emphasized body */
--font-size-lg:          16px    /* Section headers, nav items */
--font-size-xl:          18px    /* Page sub-headers */
--font-size-2xl:         22px    /* Page titles */
--font-size-3xl:         28px    /* Hero text, dashboard titles */
--font-size-4xl:         36px    /* Marketing headlines */
--font-size-5xl:         48px    /* Landing page hero */
```

### Font Weights

```
--font-weight-normal:    400     /* Body text */
--font-weight-medium:    500     /* Emphasized body, labels */
--font-weight-semibold:  600     /* Sub-headers, active nav */
--font-weight-bold:      700     /* Headers, strong emphasis */
--font-weight-black:     900     /* Hero numbers, KPIs, logo */
```

### Line Heights

```
--line-height-none:      1       /* Single line text, badges */
--line-height-tight:     1.25    /* Headlines, compact text */
--line-height-snug:      1.35    /* Sub-headers */
--line-height-normal:    1.5     /* Body text — primary */
--line-height-relaxed:   1.65    /* Long-form reading, whispers */
--line-height-loose:     1.8     /* Max readability — AI responses */
```

### Letter Spacing

```
--letter-spacing-tighter: -0.5px  /* Large headlines */
--letter-spacing-tight:   -0.3px  /* Page titles, logo */
--letter-spacing-normal:   0      /* Body text */
--letter-spacing-wide:     0.5px  /* Small caps, labels */
--letter-spacing-wider:    0.8px  /* All-caps section labels */
--letter-spacing-widest:   1.2px  /* Tiny uppercase badges */
```

### Text Transform Rules

```
Section labels:     uppercase + --letter-spacing-wider + --font-size-xs + --font-weight-semibold
Body text:          normal case + --letter-spacing-normal + --font-size-base + --font-weight-normal
Page titles:        normal case + --letter-spacing-tight + --font-size-2xl + --font-weight-bold
KPI numbers:        --font-mono + --font-weight-black + --letter-spacing-tight
Timestamps:         --font-size-xs + --color-text-muted + --font-weight-medium
Buttons:            --font-size-sm + --font-weight-semibold + --letter-spacing-normal
Input text:         --font-size-base + --font-weight-normal
Placeholder:        --font-size-base + --color-text-dim + --font-weight-normal
```

---

## Spacing Scale

### Philosophy
Consistent rhythm. No random values. Every gap, padding, and margin pulls from this scale.

```
--space-0:    0px
--space-0.5:  2px     /* Hairline gaps */
--space-1:    4px     /* Tight internal padding */
--space-1.5:  6px     /* Icon-to-text gaps */
--space-2:    8px     /* Compact padding, small gaps */
--space-3:    12px    /* Standard internal padding */
--space-4:    16px    /* Card padding, section gaps */
--space-5:    20px    /* Comfortable padding */
--space-6:    24px    /* Page margins (mobile), section spacing */
--space-8:    32px    /* Large section gaps */
--space-10:   40px    /* Page header spacing */
--space-12:   48px    /* Major section breaks */
--space-16:   64px    /* Page-level vertical rhythm */
--space-20:   80px    /* Hero spacing */
--space-24:   96px    /* Landing page sections */
```

---

## Border Radius

```
--radius-xs:     4px     /* Tags, badges, small pills */
--radius-sm:     6px     /* Inputs, small buttons, nav items */
--radius-md:     8px     /* Buttons, dropdowns */
--radius-lg:     10px    /* Cards, panels */
--radius-xl:     14px    /* Large cards, modals */
--radius-2xl:    20px    /* Hero cards, orb containers */
--radius-full:   9999px  /* Circles, pills, avatars */
```

---

## Shadows & Elevation

```
--shadow-none:   none
--shadow-xs:     0 1px 2px rgba(42, 40, 38, 0.04)                          /* Subtle lift */
--shadow-sm:     0 1px 3px rgba(42, 40, 38, 0.06), 0 1px 2px rgba(42, 40, 38, 0.04)   /* Cards */
--shadow-md:     0 4px 6px rgba(42, 40, 38, 0.06), 0 2px 4px rgba(42, 40, 38, 0.04)   /* Dropdowns */
--shadow-lg:     0 10px 15px rgba(42, 40, 38, 0.08), 0 4px 6px rgba(42, 40, 38, 0.04) /* Modals */
--shadow-xl:     0 20px 25px rgba(42, 40, 38, 0.10), 0 10px 10px rgba(42, 40, 38, 0.04) /* Popovers */
```

---

## Transitions & Motion

```
--duration-fast:       100ms    /* Hover states, toggles */
--duration-normal:     200ms    /* Most transitions */
--duration-slow:       300ms    /* Panel slides, card enters */
--duration-slower:     500ms    /* Page transitions, orb state changes */
--duration-slowest:    800ms    /* Whisper fade-in/out */

--ease-default:        cubic-bezier(0.22, 1, 0.36, 1)    /* Smooth deceleration */
--ease-bounce:         cubic-bezier(0.34, 1.56, 0.64, 1) /* Playful overshoot */
--ease-in:             cubic-bezier(0.4, 0, 1, 1)        /* Accelerating exit */
--ease-out:            cubic-bezier(0, 0, 0.2, 1)        /* Decelerating entry */
--ease-linear:         linear                              /* Continuous animations */
```

---

## Component Specs

### Buttons

**Primary button:**
```
background:    var(--color-accent)
color:         var(--color-text-inverse)
padding:       var(--space-2) var(--space-4)
border-radius: var(--radius-md)
font-size:     var(--font-size-sm)
font-weight:   var(--font-weight-semibold)
transition:    all var(--duration-fast) var(--ease-default)

:hover         background: var(--color-accent-hover)
:active        background: var(--color-accent-active)
:disabled      opacity: 0.4, cursor: not-allowed
:focus         outline: 2px solid var(--color-accent-ring), offset 2px
```

**Secondary button:**
```
background:    transparent
color:         var(--color-text)
border:        1px solid var(--color-border)
padding:       var(--space-2) var(--space-4)
border-radius: var(--radius-md)

:hover         background: var(--color-bg-alt)
:active        background: var(--color-border-light)
```

**Ghost button (icon only):**
```
background:    transparent
color:         var(--color-text-muted)
padding:       var(--space-2)
border-radius: var(--radius-sm)

:hover         background: var(--color-accent-soft), color: var(--color-text)
```

### Inputs

```
background:    var(--color-bg-elevated)
border:        1px solid var(--color-border)
border-radius: var(--radius-sm)
padding:       var(--space-2) var(--space-3)
font-size:     var(--font-size-base)
color:         var(--color-text)

:focus         border-color: var(--color-border-focus), box-shadow: 0 0 0 2px var(--color-accent-ring)
::placeholder  color: var(--color-text-dim)
```

### Cards

```
background:    var(--color-bg-elevated)
border:        1px solid var(--color-border-light)
border-radius: var(--radius-lg)
padding:       var(--space-4)
transition:    all var(--duration-normal) var(--ease-default)

:hover         border-color: var(--color-border), transform: translateY(-1px)
```

### Tags / Badges

```
background:    var(--color-bg-alt)
color:         var(--color-text-secondary)
padding:       var(--space-0.5) var(--space-2)
border-radius: var(--radius-xs)
font-size:     var(--font-size-xs)
font-weight:   var(--font-weight-medium)
```

### Whisper Cards

```
background:    var(--color-bg-elevated)
border:        1px solid var(--color-border-light)
border-radius: var(--radius-xl)
padding:       var(--space-4) var(--space-5)
box-shadow:    var(--shadow-sm)
animation:     fadeIn var(--duration-slowest) var(--ease-default)

/* Fades out after expiry */
exit-animation: fadeOut var(--duration-slowest) var(--ease-in)
```

### Chat Bubbles

**User message:**
```
background:    var(--color-accent)
color:         var(--color-text-inverse)
border-radius: var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)
padding:       var(--space-2.5) var(--space-3.5)
font-size:     var(--font-size-base)
line-height:   var(--line-height-normal)
max-width:     80%
```

**AI message:**
```
background:    var(--color-bg-alt)
color:         var(--color-text)
border:        1px solid var(--color-border-light)
border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)
padding:       var(--space-2.5) var(--space-3.5)
font-size:     var(--font-size-base)
line-height:   var(--line-height-loose)
max-width:     80%
```

### Navigation (sidebar/icon rail)

**Nav item:**
```
padding:       var(--space-2) var(--space-2.5)
border-radius: var(--radius-sm)
color:         var(--color-text-muted)
font-size:     var(--font-size-base)
font-weight:   var(--font-weight-normal)

:hover         background: var(--color-accent-soft), color: var(--color-text-secondary)
.active        background: var(--color-bg-alt), color: var(--color-text), font-weight: var(--font-weight-semibold)
```

### Tooltips

```
background:    var(--color-bg-inverse)
color:         var(--color-text-inverse)
padding:       var(--space-1) var(--space-2)
border-radius: var(--radius-sm)
font-size:     var(--font-size-xs)
font-weight:   var(--font-weight-medium)
box-shadow:    var(--shadow-md)
animation:     fadeIn var(--duration-fast)
```

---

## Iconography

### System
- **Library:** Lucide React (lucide.dev)
- **Default size:** 18px
- **Stroke width:** 1.8px
- **Color:** inherits from parent (uses text color tokens)
- **Interactive icons:** use Ghost button wrapper for hover/focus states

### Curated Icon Pool — The Fülkit Vibe
These are the Lucide icons that match our analog, warm, industrial, Germanic design sensibility. Use these first before reaching for anything else.

**Navigation & Core UI:**
- `Home` — dashboard
- `MessageCircle` — AI chat / conversation
- `Mic` — the Hum / voice capture
- `Search` — search notes
- `Menu` — hamburger (mobile)
- `Settings` — settings / gear
- `ChevronRight`, `ChevronLeft` — navigation
- `X` — close, dismiss
- `ArrowLeft` — back

**Notes & Knowledge:**
- `FileText` — note / document
- `FolderOpen` — folder / category
- `BookOpen` — reading / knowledge base
- `PenTool` — writing / editing
- `Bookmark` — saved / pinned
- `Hash` — tags
- `Link` — backlinks / connections
- `Layers` — stacked notes / hierarchy

**Actions & Status:**
- `Check` — done / confirm
- `Plus` — create new
- `ArrowRight` — send message
- `RefreshCw` — sync / refresh
- `Upload` — import / upload document
- `Download` — export
- `Trash2` — delete (use sparingly)
- `Clock` — time / timestamp / pending
- `Bell` — whisper / notification (subtle use)

**AI & Intelligence:**
- `Sparkles` — AI suggestion / magic moment
- `Zap` — quick action / insight
- `Brain` — second brain / knowledge
- `Lightbulb` — idea / "ideas worth exploring"
- `Eye` — view / preview
- `Wand2` — AI synthesis / transform

**People & Social:**
- `User` — account / profile
- `Users` — referrals / community
- `UserPlus` — invite / "Get Fülkit"
- `Heart` — favorite / bestie energy
- `Gift` — referral reward / credits

**Data & Business (owner portal):**
- `BarChart3` — analytics / metrics
- `TrendingUp` — growth / positive
- `TrendingDown` — decline / watch
- `CreditCard` — billing / subscription
- `Shield` — security / privacy
- `Key` — API key / BYOK

**German / Industrial Easter Egg Icons:**
- `Compass` — direction, Bauhaus geometric purity
- `Hexagon` — engineering, structure, DIN standards
- `Target` — precision, German engineering
- `Ruler` — measurement, standardization
- `Grid3x3` — Swiss grid system

### Source indicators
- Small colored dots (6-8px) using source color tokens
- Used in note lists, file browsers, sync status

### Third-Party Brand Icons — Under Our Vibe
When showing Dropbox, Google Drive, Obsidian, iCloud, or Anthropic (BYOK), use THEIR logo marks but rendered in OUR design system. Their brand, our vibe.

**Treatment:**
- Monochrome: render in `--color-text` or `--color-text-muted`
- Stroke weight: match Lucide at 1.8px where possible
- Size: match Lucide at 18px default
- No brand colors on the icons themselves — color only on the small source dots
- On hover or in context where recognition matters: can use their brand color at reduced opacity (30-40%)

**Icons to create/source:**
- **Dropbox** — the open box mark → monochrome line version
- **Google Drive** — the triangle mark → monochrome line version
- **Obsidian** — the gem/diamond mark → monochrome line version
- **iCloud** — the cloud mark → monochrome line version
- **Anthropic** — the "A" mark → monochrome (for BYOK connect screen)

**Where they appear:**
- Source selector during onboarding
- Connected sources list
- Note source indicators (alongside the colored dots)
- BYOK connect screen (Anthropic mark)
- Import flow

**File location:** `/assets/icons/third-party/`

### BYOK & Third-Party Connect — Onboarding Flow
Every integration must be effortless. 3 steps maximum. No configuration after connect.

**BYOK (Bring Your Own Key):**
```
Step 1: "Paste your Anthropic API key"  → single input field
Step 2: Fülkit verifies it works         → spinner, then ✓ or ✕
Step 3: "Connected. You're burning your own Fül now." → done
```
- Show the Anthropic mark (monochrome) during this flow
- Link to "Get an API key" (https://console.anthropic.com) for users who don't have one
- Key stored encrypted in Supabase. Never displayed after entry.

**Dropbox / Google Drive / iCloud:**
```
Step 1: "Connect [Service]"             → tap the icon
Step 2: OAuth popup                      → authorize in their UI
Step 3: "Connected. Found X files."     → done, Fülkit starts scanning
```

**Obsidian Vault (local):**
```
Step 1: "Point to your vault"           → folder picker
Step 2: Fülkit scans .md files           → progress indicator
Step 3: "Found X notes. Want me to organize these?" → done
```

**Design rules for connect screens:**
- Third-party mark displayed large (48px) in monochrome
- Service name in `--font-size-lg` + `--font-weight-bold`
- Minimal UI — just the steps, no explanation walls
- Success state: green checkmark + one-line confirmation
- Error state: red ✕ + "Try again" + help link

---

## Asset Folder Structure

```
assets/
├── brand/
│   ├── logo-full.svg           ← Full "Fülkit" wordmark
│   ├── logo-full-dark.svg      ← Wordmark for dark backgrounds
│   ├── logo-icon.svg           ← F with diaeresis mark
│   ├── logo-icon-dark.svg      ← Icon for dark backgrounds
│   └── logo-favicon.svg        ← Optimized for small sizes
│
├── fonts/
│   ├── din-pro-regular.woff2   ← Weight 400
│   ├── din-pro-medium.woff2    ← Weight 500
│   ├── din-pro-bold.woff2      ← Weight 700
│   ├── din-pro-black.woff2     ← Weight 900
│   └── jetbrains-mono.woff2    ← Monospace for data
│
├── icons/
│   └── (Lucide loaded via npm — no static files needed)
│   └── custom/                 ← Any custom icons we create
│
├── og/
│   ├── default.png             ← Default OG image (1200×630)
│   ├── twitter.png             ← Twitter card
│   ├── instagram-square.png    ← 1080×1080
│   ├── instagram-story.png     ← 1080×1920
│   └── linkedin.png            ← 1200×627
│
├── styles/
│   ├── tokens.css              ← Generated from design.md color/spacing/type tokens
│   └── tokens.json             ← JSON export for JS consumption
│
└── easter-eggs/
    └── (blackletter textures, Bauhaus geometric patterns, DIN specimen references)
    └── (these are decorative assets for loading screens, about page, etc.)
```

---

## The Hum (voice mode)

### Visual spec
```
background:    Canvas-rendered, noise displacement
palette:       Eggshell/warm gray range — matches --color-bg through --color-text-muted
states:
  idle:        Gentle breathing, low intensity, muted tones
  listening:   Reactive to audio input, higher intensity, brighter
  thinking:    Subtle shift, medium intensity, processing feel
  speaking:    Smooth flowing, warm tones, calm authority
environment:   Lives on --color-bg, ambient glow matches palette
```

### Controls
- Center: mic button (start/stop)
- Left: X (end session)
- Right: back arrow (previous state)
- All buttons: circular, --color-bg-inverse background, --color-text-inverse icons

---

## Audio & Music Visual System

Full specs for the music experience — Signal Terrain waveform, Crate & Mix UI, Fabric audio engine — live in `md/Audio_Crate/`:
- **`audio-spec.md`** — Signal Terrain canvas rendering, waveform parameters, reflection system
- **`crate-spec.md`** — Crate & Mix visual spec: DJ metaphor, drag-and-drop, set builder

---

## Layout Tokens

### Desktop (the desk)
```
--sidebar-width:         200px    /* Collapsed: icon rail at 56px */
--content-max-width:     none     /* Fluid */
--content-padding:       var(--space-6)
--page-header-height:    auto
```

### Mobile (the pocket bestie)
```
--tab-bar-height:        56px     /* Bottom tab bar */
--input-bar-height:      52px     /* Persistent bottom input */
--content-padding:       var(--space-4)
--card-gap:              var(--space-2)
```

---

## Z-Index Scale

```
--z-base:         0       /* Default content */
--z-sticky:       10      /* Sticky headers */
--z-dropdown:     20      /* Dropdowns, select menus */
--z-overlay:      30      /* Overlay backgrounds */
--z-modal:        40      /* Modals, dialogs */
--z-toast:        50      /* Toast notifications, whispers */
--z-tooltip:      60      /* Tooltips */
--z-max:          100     /* Emergency override only */
```

---

## OG & Social Assets

### OG Image (1200 × 630)
```
background:    var(--color-bg)
text-color:    var(--color-text)
font:          var(--font-primary) at var(--font-size-4xl) + var(--font-weight-bold)
logo:          Top-left, icon mark
tagline:       Below headline, var(--font-size-lg) + var(--color-text-muted)
```

### Social Post Templates
- **Twitter/X card:** 1200 × 628
- **Instagram square:** 1080 × 1080
- **Instagram story:** 1080 × 1920
- **LinkedIn:** 1200 × 627
- All use brand tokens — colors, fonts, logo positioning

### Favicon
- 32×32 and 16×16 PNG
- SVG for modern browsers
- Based on icon mark (F with diaeresis)
- Dark version for light OS themes, light version for dark

### PWA Manifest Icons
- 192×192 and 512×512
- Maskable version with safe zone
- Background: var(--color-bg)

---

## SEO Defaults

```
title:              "Fülkit — I'll be your bestie"
description:        "Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you've saved."
og:title:           "Fülkit — I'll be your bestie"
og:description:     "The app that thinks with you."
og:image:           /assets/og/default.png
og:type:            website
twitter:card:       summary_large_image
theme-color:        #EFEDE8  /* matches --color-bg */
```

---

## Guardrails

### Rules (enforced by system, not discipline)
1. **No raw color values.** Everything references a token via `var(--token)`.
2. **Hover states are derived.** Never manually set. System darkens base by 10%.
3. **Font sizes from scale only.** No `font-size: 13.5px`. Use the nearest token.
4. **Spacing from scale only.** No `padding: 7px`. Use the nearest token.
5. **Border radius from scale only.** Consistent curves everywhere.
6. **If it's not a token, it doesn't exist.** This prevents rogue values.
7. **All new visual values must be added as tokens first,** then used.

### How Claude should use this file
When building or modifying any Fülkit component:
1. Read this file FIRST
2. Use only token references — never raw values
3. Follow component specs for states (hover, active, focus, disabled)
4. Match typography rules (scale, weight, spacing, transform)
5. If a needed value doesn't exist, propose a new token — don't invent a one-off

---

## Changelog
- v1.0 — Initial design system. Tokens, typography, spacing, components, orb, OG specs.
- v1.1 — DIN Pro as default font. German font exploration dropdown (10 options). Weight system for unified header/body hierarchy. Historical easter eggs. Custom font loading instructions.
- v1.2 — Curated Lucide icon pool (50+ icons organized by category). Asset folder structure. Cross-references to buildnotes.md.
- v1.3 — Renamed: Voice Orb → The Hum, Gas Tank → Fül, Jeeves → Chappie (internal personality codename). Third-party icon treatment (monochrome under our vibe). BYOK + service connect onboarding flows. Whisper API locked as transcription engine.
