# Fülkit — Build Notes

> Living spec for the Fülkit product. See also: [design.md](design.md) for visual system, [features.md](features.md) for marketing & feature copy.

## Domains
- FullKit.app redirects → Fulkit.app (primary)

## Branding
- Name: **Fülkit** (the ü is the brand mark)
- Logo: The F with two dots (ü diaeresis) IS the logo. Type as design.
- Full brand specs in [design.md](design.md)

### The ü — origin & rationale
- The two dots are a **diaeresis/umlaut** — standard in German, Turkish, Hungarian
- In German, ü sounds like "üh" (close to English "ew") — "Fülkit" sounds like "feel-kit"
- "Fül" → "fühl" (German: to feel) — so Fülkit subtly means "feel-kit." Perfect for a product with a soul.
- NOT an acute accent (ú — single mark, Spanish/French) — the two dots are the distinctive design element
- The two dots work as a standalone visual mark — could float above the F in the logo
- Intentional, European, designed — defuses any profanity read

### Tagline ideas
- "Your second brain, fully loaded"
- "Everything you think, all in one place"
- "Capture everything. Forget nothing."
- "The full kit for your mind"
- "Your brain's backup plan"
- "The app that thinks with you"
- **"I'll be your bestie"**
- **"Let's chat and get shit done"**
- Action CTA: **"Get Fülkit"**

### Color palette
- **Background:** Soft gray eggshell — off-white, noticeably NOT white. Warm. Think old paper.
- **Text primary:** Very dark slate — noticeably NOT pure black. Deep, warm, feels like ink.
- **Text on dark:** White still readable on dark elements
- **Accents:** Minimal. Source indicators only (Obsidian purple, Drive green, Dropbox blue)
- **The vibe:** Analog. Warm. Like a well-worn notebook on a wooden desk.

### Typography — DIN as foundation
- **Default font: DIN Pro** — German Institute for Standardization, 1931
- Designed for German road signs, technical docs, industrial applications
- Full weight range: Thin through Black (9 weights)
- Hierarchy through weight alone: Black for heroes, Bold for titles, Medium for headers, Regular for body
- One family, many voices. No mixing fonts.
- Self-hosted .woff2, no CDN dependency

**German fonts to explore (all in owner portal dropdown):**
- DIN Pro — industrial, engineered (DEFAULT)
- Futura — Bauhaus era, Paul Renner, 1927
- Neue Haas Grotesk — the original Helvetica before it was renamed
- FF Meta — Erik Spiekermann, designed for German Post Office
- GT Walsheim — Swiss, modern geometric
- FF DIN — Albert-Jan Pool's definitive digital DIN revival
- Free alternatives: D-DIN, Barlow, IBM Plex Sans, Outfit

**Design heritage easter eggs:**
- Bauhaus (form follows function), Swiss/International Style (grid systems)
- Dieter Rams / Braun industrial design ("less but better")
- The ü itself — says "this has German DNA" without being literal
- Blackletter as subtle decorative nod (loading screens, about page)
- Full details in design.md

---

## Core Value Proposition

Fülkit is NOT a note-taking app. It's a thinking partner.

Most second brain tools are write-only graveyards. People dump stuff in and never look at it again. Fülkit solves the retrieval problem — your notes actually do something.

**The pitch:** You save a book highlight about loss aversion on Monday. On Thursday you're drafting a pricing strategy. Fülkit's AI says "hey, your notes on Thinking Fast & Slow mention loss aversion — want to frame the pricing around what customers lose by not upgrading?" Nobody else does that.

**Framing to avoid:**
- "Obsidian but prettier" — too weak, everyone claims better UI
- "Second brain app" — crowded, commoditized
- "Note-taking with AI" — undersells it

**Framing to lean into:**
- "Your notes talk back to you"
- "A thinking partner that knows everything you've saved"
- "The app that connects your ideas before you do"
- "ChatGPT forgets you between threads. Fülkit never does."

**What Fülkit does that nobody else does:**
- Obsidian = powerful but ugly, no AI, developer-feeling
- Notion = broad but shallow, AI is bolted on
- Roam = dying
- Reflect = nice but limited AI
- ChatGPT/Claude = smart but forgets you between threads
- Fülkit = beautiful UI + AI that has full scope of your knowledge

---

## The Big Vision: One Place to Work

The problem: every knowledge worker juggles ChatGPT, Claude, Gemini — and none of them know you. Every conversation starts from zero. You spend the first 3 messages bringing the AI up to speed, then do it again tomorrow on a different tool. Always grabbing at straws. Always re-explaining.

Fülkit kills that. You open it, you talk. It already knows.

**Not one infinite thread. Endless markdown that knows wtf we're talking about.**

Fülkit isn't another chat app. It's a dashboard backed by everything you've ever saved, thought, and worked on. The AI doesn't "remember" — it looks you up before you finish typing. No more context-setting. No more starting over. Just real questions, real answers, from day one every time.

**The bestie test:** A chatbot waits for you to ask. A work bestie anticipates. You open Fülkit on Monday morning and it says "based on your Friday notes, you have 3 action items from the Q2 meeting, your pricing draft is unfinished, and you wanted to follow up with Sarah." You didn't ask. It just knows.

**What this replaces:**
- ChatGPT threads you lose and can't find
- Claude conversations that start from zero
- Gemini sessions with no memory
- Switching between 3 AI tools none of which know you
- The exhausting ritual of "let me catch you up" every single time

**What this feels like:**
- A partner you work with who knows you
- Knows what you like, how you think, what you're working on
- Gives it to you before you have to ask
- A work bestie in a box — desktop or mobile

**How it works under the hood:**
- Fülkit stores everything: notes, documents, conversation summaries
- Every piece of content gets embedded (vector search)
- When you open the app or ask a question, RAG pulls the relevant context
- To you it feels like the AI has known you for years
- Proactive layer: on app open, AI runs a query against recent notes, deadlines, unfinished items and surfaces a brief — no prompt needed
- This is genuinely different from any standalone AI chat app

---

## Design Philosophy

**Principle: Analog, not app.**
- Dashboard/widget vibes, not web/nav vibes
- Less like a website with pages, more like a desk with objects on it
- Notes are cards. Actions are sticky notes. AI whispers are small cards that drift in and fade out.
- Icons over text. Lucide icon set. Hover tooltips where labels aren't needed.
- Minimal — if it doesn't need to be there, it's not there
- No dashboards full of stats nobody checks
- No nav bars with text labels — a few quiet icons along the edge
- Everything discoverable through interaction, not through reading

**The "how tf is this possible" test:**
- Every feature must pass this test
- AI connecting two notes you forgot about? ✅ Magic
- Voice capture that auto-files into the right topic? ✅ Magic
- Pretty graph view? ❌ Cool but not magic
- Manual tagging? ❌ Utility, not magic
- Inbox that triages your documents automatically? ✅ Magic
- AI suggesting dinner plans mid-afternoon? ✅ Magic (bestie moment)
- Talking to an orb that silently organizes your thoughts? ✅ Magic

**Reorder roadmap around magic, not utility.**

---

## Fülkit's Personality — Chappie

### The soul
Fülkit isn't a tool you open. It's a presence that's already thinking about your day.

Not a servant waiting for orders. Not a notification machine begging for attention. A calm, competent partner who notices things, offers help, and moves on if you're not interested.

**The bestie test:** A butler who notices the pantry is low, knows you have dinner guests Friday, and quietly puts a shopping list on your desk before you think to ask. If you don't pick it up, he doesn't nag. He just moves on to the next thing he can do for you.

### Voice & tone
- Bestie energy, not servant energy
- Never: "What can I do for you?" (that's waiting for instructions)
- Instead: "Hey, saw this and thought of you" or "Don't forget you wanted to do X today"
- Has its own initiative — feels like it's thinking even when you're not using it
- Warm but not chatty. Useful but not desperate.

### Ephemeral suggestions (AI whispers)
The AI proactively surfaces things — but they're not permanent. They drift in and fade out, like a text from a friend.

**Frequency & control:**
- Default: 2 whispers/day — just enough for users to get the concept
- Can increase or decrease — but THROUGH CONVERSATION, not settings/toggles
- "Hey Fülkit, check in with me more throughout the day" → frequency goes up
- "Dial it back, just mornings" → frequency goes down
- Users can scope whispers by topic through text: "Only bug me about food and fitness during the day, save work stuff for mornings"
- No settings page. No sliders. Just tell Fülkit what you want.

**Permission-based tone (consent is key):**
- Fülkit ASKS before it assumes. Always.
- "I noticed you've been tracking recipes a lot. Want me to start suggesting meal ideas? Just say the word."
- "May I make a suggestion about your Q2 action items?"
- "Let me know if you want more or less from me — here to help."
- If user says yes → Fülkit leans in
- If user says no → Fülkit backs off, no hard feelings, no guilt
- This is what makes it trusted. The AI earns its way into your day.

**How it works:**
- AI generates suggestions based on your notes, calendar, patterns
- They appear as quiet cards OR as messages in the conversation
- Each has simple controls: ✓ (act on it) → (push/snooze) ✕ (dismiss)
- If you don't interact, they fade after a set time
- No guilt. No notification badge. No "you missed this!"
- As if Fülkit always wants to stay busy — if one suggestion dies, another may appear later

**Example whispers:**
- "You mentioned wanting to rework the pricing page. Your notes on loss aversion might help. Want to dig in?"
- "It's 4pm — want me to put together a dinner list?"
- "You have 3 unfinished action items from Monday. Want a quick recap?"
- "Found a connection between your marketing notes and the competitor analysis. Interesting?"
- "Sarah's follow-up was due yesterday. Want to draft something?"
- "Hey have you done your sit ups today?"

**What makes this different from notifications:**
- Notifications demand attention. Whispers offer it.
- Notifications stack up and create anxiety. Whispers expire and create calm.
- Notifications are about the app's needs. Whispers are about yours.

### The dead conversation principle
If a whisper or suggestion isn't acted on, it disappears. Just like a real conversation — if someone texts you "want to grab lunch?" and you don't reply by 2pm, the moment passes. That's natural. That's human. Fülkit behaves the same way.

This keeps the dashboard clean and the AI feeling alive rather than robotic.

---

## Conversation as Primary Interface

**Core insight: the primary interface might not be a dashboard. It might just be a conversation.**

Some users will love widgets and cards. But the core use case — especially at launch — is someone who opens Fülkit and just talks. Like texting a friend at work all day to get shit done.

**The iMessage model:**
- Open app → see conversation → talk
- No clicking around. No navigating. No learning a UI.
- Notes, actions, whispers, file drops, settings — it all happens inside the conversation
- "Save this as a note" → saved
- "What was that thing I saved about pricing?" → retrieved
- "Only suggest food stuff during the day" → preference updated
- "Remind me about Sarah on Friday" → action created
- "Summarize my week" → synthesis delivered

**This is a use case, not the only mode:**
- Power users who want to browse notes, organize, see connections → they get the dashboard/widgets
- Users who just want a confidant to text all day → they get the conversation
- Both are first-class experiences. Neither is a compromise.

**Why this matters for launch:**
- Conversation is the lowest friction interface possible
- No learning curve — everyone knows how to text
- The AI does the UI work behind the scenes (filing, organizing, connecting)
- Perfect for mobile (the pocket bestie room)
- The dashboard is something users graduate to, not something they're forced into

**Adjusting Fülkit through conversation (no clicking):**
- Whisper frequency: "check in more" / "dial it back"
- Topic scope: "only food and fitness during the day"
- Tone: "be more direct" / "keep it casual"
- Proactivity: "surprise me more" / "only talk when I talk to you"
- All preferences stored and learned from — but set through natural language, not UI

### Feedback signals (how Fülkit learns you)
Every interaction with a whisper teaches the AI:
- ✓ on dinner suggestions → Fülkit learns to suggest meal planning
- ✕ on exercise reminders → Fülkit stops nudging about fitness
- Consistent ✓ on morning recaps → Fülkit always prepares one
- Pushing tasks to Friday → Fülkit learns your weekly rhythm

No settings page. No preferences form. The product teaches itself through use.

---

## Transparency Layer — For the Button-Pushers

The conversation is the primary interface. But some users need to see the gears. They need to know their data isn't behind a curtain. They want to click, edit, delete, and feel in control.

**Solution: bury it, don't remove it.**

Behind the hamburger / settings, a full control panel exists:
- **Data manager** — see everything Fülkit knows about you, edit or delete any of it
- **File browser** — clean hierarchy of everything stored, easy to search/browse
- **Preference editor** — all learned preferences visible, toggle or remove any
- **AI memory** — view what context the AI has, clear specific memories
- **Export everything** — full data export at any time, markdown out, no lock-in
- **Connected sources** — manage imports, disconnect services
- **Usage stats** — messages used, storage consumed

**Why this matters:**
- Trust. Users from more formal tools expect a backend they can see.
- Privacy. "I can see and delete everything" = trust = retention.
- Fülkit buries this not because it's hiding anything — because most users don't need it.
- For those who do: it's all there. Clean, organized, tactile.

**File hierarchy:**
- Notes in a clean, searchable structure
- Auto-categorized by AI, user can reorganize
- Files Fülkit creates live in their own space
- **"Ideas worth exploring"** — a dedicated bucket for homeless thoughts with no category yet
- Easy to mine, easy to search, easy for the AI to reference
- The hierarchy IS the brain — well-organized so Bestie can find anything fast

---

## Design System — One Source of Truth

### The problem this solves
Colors hardcoded in 47 places. Hover states that don't match. A logo that's slightly different on every page. Rogue colors sliding in. Builds going sideways. Never again.

### The rule
Every color, font size, border radius, hover state, shadow, and spacing value is defined ONCE in a design tokens file. Every component in the entire app reads from that file. Change "slate" to "blue" in the owner portal → everything updates instantly. No hunting through files.

### Design Tokens
The foundation. A single JSON/CSS config that drives the entire visual layer.

**Color tokens:**
- `--color-bg` — background (eggshell off-white)
- `--color-bg-alt` — alternate surface
- `--color-text` — primary text (deep warm slate)
- `--color-text-muted` — secondary text
- `--color-text-dim` — tertiary/placeholder text
- `--color-border` — default borders
- `--color-border-light` — subtle dividers
- `--color-accent` — primary action color
- `--color-accent-hover` — hover state (auto-derived: darken 10%)
- `--color-accent-soft` — light tint for backgrounds (auto-derived: 8% opacity)
- `--color-success` — positive states (green)
- `--color-warning` — caution states (amber)
- `--color-error` — negative states (red)
- `--color-source-obsidian` — Obsidian indicator
- `--color-source-gdrive` — Google Drive indicator
- `--color-source-dropbox` — Dropbox indicator

**Derived states (auto-calculated from base tokens):**
- Hover: base + darken 10%
- Active/pressed: base + darken 15%
- Disabled: base at 40% opacity
- Focus ring: accent at 30% opacity, 2px offset
- Soft background: base at 8% opacity
- These are NEVER set manually. Always derived. Guarantees consistency.

**Typography tokens:**
- `--font-family` — primary font stack
- `--font-family-mono` — monospace (for numbers, code)
- `--font-size-xs` through `--font-size-2xl` — type scale
- `--font-weight-normal`, `--font-weight-medium`, `--font-weight-bold`, `--font-weight-black`
- `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`
- `--letter-spacing-tight`, `--letter-spacing-normal`, `--letter-spacing-wide`

**Spacing tokens:**
- `--space-1` through `--space-12` — consistent spacing scale
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` — border radii

**Shadow tokens:**
- `--shadow-sm`, `--shadow-md`, `--shadow-lg` — elevation levels

### Owner Portal — Design Manager
Inside the owner portal, a "Design" tab with:

**1. Color Editor**
- All color tokens displayed as swatches with color pickers
- Change a color → live preview of the entire app palette
- Derived states update automatically (hover, active, soft)
- "Reset to defaults" button
- Export: CSS variables file, JSON config, or Tailwind config

**2. Typography Editor**
- Font family selector (from Google Fonts or upload custom)
- Type scale preview — every size rendered with sample text
- Weight and spacing adjustments

**3. Component Preview**
- Live preview panel showing: buttons (all states), inputs, cards, whisper cards, tags, the orb, navigation
- Every component updates in real-time as you adjust tokens
- This IS the style guide — auto-generated, always current

**4. Brand Assets**
- Logo uploader — primary, icon, monochrome variants
- Favicon generator (auto-crops from logo)
- App icon generator (for PWA manifest)

**5. OG Image Designer**
- Template selector (2-3 layouts)
- Editable headline and subtext
- Uses brand colors and fonts automatically
- Renders 1200×630 preview
- Download as PNG for social sharing
- Preview how it looks on Twitter, Facebook, LinkedIn, iMessage

**6. Social Post Mockups**
- Instagram square (1080×1080)
- Twitter/X card
- LinkedIn post
- Story format (1080×1920)
- All using brand tokens — colors, fonts, logo
- Editable text, download-ready

**7. SEO & Meta Manager**
- Page title and description editor
- OG title, description, image assignment
- Google search result preview
- Social share preview (Twitter card, Facebook)
- Structured data / schema markup fields
- All in one place, not scattered across files

### Design Guardrails
Rules enforced by the system, not by discipline:

- **No raw color values in components.** Everything references a token. If someone writes `color: #333` instead of `var(--color-text)`, it's wrong.
- **Hover states are derived, not defined.** You never manually set a hover color. The system calculates it from the base.
- **Font sizes only from the scale.** No `font-size: 13.5px`. Use the token or don't use it.
- **Spacing only from the scale.** No random padding values.
- **If it's not a token, it doesn't exist.** This is the guardrail. It prevents rogue values from ever entering the codebase.

### Implementation
- **design.md** — the independent repo file. The manual source of truth. Lives at project root.
- Tokens stored as a JSON file that generates CSS custom properties
- All components use `var(--token-name)` exclusively
- Owner portal reads/writes design.md → regenerates tokens → app updates
- Manual edits to design.md sync to owner portal settings
- Owner portal edits write back to design.md
- Version history so you can roll back any change
- Tokens also feed into OG generator, social mockups, style guide
- **Claude references design.md before touching any UI code — not the website**

---

Three modes with a dev toggle. Mode 3 is default.

1. **General** — Full assistant, no note awareness
2. **Brain only** — Only discusses notes, redirects everything else
3. **Brain-first** (default) — Can do anything, always connects back to notes. Feels like a smart friend who's read everything you've saved.

---

## Inbox & Document Handling

**Concept:** Users can attach/drop documents into chat or an inbox. AI triages automatically.

**Supported formats:** Text, PDF, images, code, CSV, markdown — Claude handles almost anything.

**Triage flow:**
- User drops a document
- AI reads it and suggests: "This looks like meeting notes. Want me to:"
  - a) File it (auto-categorize and store)
  - b) Discuss it (summarize, extract insights, answer questions)
  - c) Extract action items (pull tasks, deadlines, follow-ups)
  - d) Connect it (find related notes in your brain)

This is a magic moment. Drop a PDF, get instant value.

---

## The Hum — Voice Mode

### The problem with voice AI today
When you see your words being typed out in real time (like GPT speech mode), it activates your inner editor. You get self-conscious. You start overthinking mid-sentence. You lose your free thought. The transcript kills the flow.

### The solution: just an orb
Inspired by GPT's speech bubble but fundamentally different. When you enter voice mode, you see a floating orb — animated, alive, pulsing, reacting to your voice. No transcript. No words appearing on screen. Just you talking to a presence.

**The orb:**
- Animated sphere/blob that responds to voice input
- Pulses and morphs when you speak — feels like it's listening
- Shifts and glows when Fülkit is "thinking"
- Smooth, calming animation when Fülkit speaks back
- No text on screen during conversation (transcript saved silently to notes)
- Feels like talking to a magic genie, not dictating to a machine
- Eggshell/warm palette — orb lives on the off-white background, feels ambient

### Two-way conversation — not just listening
The orb is NOT just a dictation tool. It's a full voice conversation.
- You talk → orb listens (reactive animation)
- Orb thinks → animation shifts (processing state)
- Orb speaks back → smooth animation, Fülkit's voice responds
- Full back-and-forth dialogue, hands-free, eyes-free
- Like having your bestie on speakerphone while you cook, drive, walk

### Voice personality (future / sizzle)
- Fülkit's voice should have character — warm, calm, slightly playful
- Dream feature: voice training. User could clone their own voice so Fülkit sounds like THEM talking back to themselves. The ultimate bestie — it's literally you.
- Voice cloning has ethical/legal considerations — explore carefully but the concept is fire
- Start with a good default voice, voice training as a premium feature later

**Why this matters:**
- Free thought. You can ramble, brainstorm, think out loud without editing yourself.
- Lower barrier. Some people think better out loud than typing.
- Dictate your day, plans, ideas — Fülkit analyzes and queues up accordingly.
- Ideas that have no place just end up in "Ideas worth exploring" automatically.
- Voice mode is a magic moment. It passes the "how tf" test.

**What happens after voice mode:**
- Fülkit silently transcribes everything
- AI processes: extracts action items, identifies topics, files notes
- User can review later in their note hierarchy (or not — Fülkit handled it)
- "You mentioned 3 things this morning. I filed the recipe idea, added 'call Sarah' to actions, and put your startup idea in 'Ideas worth exploring.'"

**Technical approach:**
- Transcription: Whisper API (OpenAI) or native device — TBD
- Orb animation: Canvas/WebGL, reactive to audio input levels
- Voice output: text-to-speech API with warm, natural voice
- Processing: same Claude pipeline as text, just with transcribed input
- Voice cloning (future): ElevenLabs or similar — premium feature

---

## Action List & AI Feedback Loop

### Action List
AI suggestions and to-dos live in a standalone action list — not buried in chat. This is where the proactive briefing, extracted tasks, and AI nudges land.

Each item in the action list has lightweight controls:
- **✕ Dismiss** — remove it, no questions asked
- **Push** — snooze to a new date ("remind me Friday")
- **Don't ask** — tell the AI to stop suggesting this type of thing
- **More like this / Less like this** — thumbs up/down style, teaches the AI your preferences

### AI Learning (the feedback loop)
The action list is how the AI gets smarter about YOU. Not through a settings page — through tiny signals at the moment of interaction.

**How it works:**
- Every dismiss, push, thumbs up/down gets logged as a preference signal
- AI uses these signals to weight future suggestions
- Over time: fewer misses, more hits
- The bestie learns what you care about without you ever filling out a form

**Examples:**
- AI suggests "follow up with Sarah" → you push to Friday → AI learns you handle follow-ups on Fridays
- AI surfaces a reading highlight → you hit "more like this" → AI starts connecting book notes more often
- AI reminds you about exercise goals → you hit "don't ask" → AI stops nudging about fitness
- AI suggests synthesizing marketing notes → you thumbs up → AI proactively synthesizes related clusters going forward

**Why this matters:**
- Solves the trust problem — users let AI be more proactive because there's always an escape hatch
- AI that overshoots isn't annoying, it's just learning
- No complicated preferences UI — the product teaches itself through use
- The more you use it, the more it feels like YOUR bestie, not a generic assistant

### UX for feedback
Keep it minimal. Small, quiet controls at the bottom of each AI suggestion. Not unlike notification actions on iOS — just enough to guide without interrupting flow.

---

## Architecture Layers

### Layer 1: UI
- Analog/dashboard feel, not traditional web nav
- Widget-based — cards, sticky notes, whisper cards
- Achromatic (black/white/gray), color only for source indicators
- Lucide icons, no text labels where symbols suffice
- AI is its own view, not a persistent panel
- Minimal — icons along the edge, not nav bars with labels

**Two Rooms — same bestie, different space:**

**Desktop = your desk.** Spatial. Ambient. Widgets.
- Dashboard with whisper cards, notes, actions as objects on a surface
- Slim icon rail or collapsible sidebar — no hamburger needed, you have the space
- Hover tooltips on icons
- Room to breathe — things can float, overlap, live side by side

**Mobile = your pocket bestie.** Stacked. Quick. Conversational.
- Single vertical stack — everything flows top to bottom
- Whisper cards at the top, swipeable/dismissable (feels like texts)
- Recent notes below
- Persistent input bar at the bottom for quick capture or AI chat
- 3-4 icon tab bar at the bottom (home, AI, capture, menu)
- Hamburger menu for sources, settings, feature expansion — expected on mobile
- Long-press replaces hover tooltips
- No hover states — everything designed for thumb, one-handed use

**Why two rooms, not one responsive layout:**
- People use desktop and mobile differently — different posture, different intent
- Desktop: deep work, reviewing, organizing, exploring connections
- Mobile: quick capture, checking whispers, on-the-go conversations
- Same AI, same notes, same soul — different interaction patterns
- Don't force desktop patterns onto a phone or vice versa

### Layer 2: Sync & Storage
- **Supabase is home** — Fülkit storage is primary, powered by Supabase Postgres + Storage
- New users create notes in Fülkit, they live in Fulkit
- Import/connect from Obsidian, Google Drive, Dropbox as migration paths
- Power users can link existing vaults
- New users get value in 5 minutes with zero setup
- Full control over sync, speed, offline behavior
- Goal: same experience for everyone regardless of where they're coming from

### Layer 3: AI
- Claude-powered (claude-sonnet-4-5-20250514)
- System prompt shaped by user's stored content
- Smart retrieval via pgvector — relevant notes pulled per conversation
- Document processing for inbox triage
- Proactive whisper system with feedback loop
- The differentiator. The sizzle. The thing nobody else does well.

**Revised build order:** Design system (tokens + guardrails) → AI magic → UI wrapped around it → Sync/storage

---

## Tech Stack

- **Web:** React
- **Mobile:** React Native (Expo)
- **AI:** Claude API (claude-sonnet-4-5-20250514)
- **Backend/DB:** Supabase (Postgres)
- **Vector search (RAG):** pgvector on Supabase — native support, no separate service needed. One DB for notes, users, and embeddings. Simpler stack, lower cost. Can migrate to dedicated vector DB later if scale demands.
- **Storage:** Supabase Storage for documents/files
- **Auth:** Supabase Auth
- **Voice transcription:** Whisper API (OpenAI) — ~$0.006/min
- **Hum animation:** Three.js or Lottie, reactive to audio levels
- **Fonts:** DIN Pro (self-hosted .woff2), D-DIN fallback, JetBrains Mono for data

### Delivery Strategy — PWA First, Then Native

**Phase 1: Progressive Web App (PWA)**
- Ship fast, no app store approval needed
- Installs on phones and desktops like a native app (home screen icon)
- Offline support, push notifications
- This IS the beta product for the first 100 users
- Bypass any app store name issues entirely during beta

**Phase 2: Native app (React Native / Expo)**
- Wrap into real native app once product is validated
- Submit to App Store and Google Play
- Better performance, deeper OS integration, push notifications
- The PWA beta proves the product; the native app is the real launch

**Why this order:**
- PWA = weeks to ship. Native = months.
- No app store gatekeeping during beta
- Fülkit is not second-class — PWA is the fast lane, native is the finish line
- Users won't know the difference during beta if the PWA is done well

---

## Pricing — The Chefs Kiss Model

**Simple. Net positive. Always.**

### The rule
Every user must cover their own cost and then some. Fülkit never loses money after breakeven.

### Real Claude API costs (baked in)
A typical Fülkit exchange (question + RAG context from notes + AI response) ≈ 2,000 input tokens + 500 output tokens.

- Claude Sonnet: $3/million input, $15/million output
- Input cost: $0.006/msg
- Output cost: $0.0075/msg
- **Total: ~$0.014 per message (1.5 cents)**

| Usage level | Msgs/day | Monthly cost per user |
|:---|:---:|:---:|
| Light | 5 | ~$2.25 |
| Moderate | 10 | ~$4.50 |
| Average | 15 | ~$6.75 |
| Heavy | 25 | ~$11.25 |

### Pricing structure
- **Founder = free.** Your usage is the cost of building the product.
- **5 hot seats = free.** Your inner circle. You float ~$22/mo max. The only cost center.
- **Standard = $7/mo.** Light-to-moderate users. Get a set amount of messages, refill when empty.
- **Pro = $12/mo.** Medium-to-heavy users. Bigger Fül tank. Still protected — house always wins.

No confusing matrix. You're in for free, your people are in for free, everyone else picks a tier.

### The Fül System (inspired by Windsurf)
Users get a SET amount of messages per billing cycle. When the tank is empty, they get a prompt: "You're out of credits. Top up or wait until [reset date]."

| Tier | Price | Monthly messages | Cost per msg | Max API cost | Margin |
|:---|:---:|:---:|:---:|:---:|:---:|
| Standard | $7/mo | ~450 msgs (~15/day) | 1.5¢ | ~$6.75 | **+$0.25 min** |
| Pro | $12/mo | ~800 msgs (~26/day) | 1.5¢ | ~$12.00 | **≈ $0 worst case** |
| Buy credits | $2 per 100 msgs | On demand | 1.5¢ | $1.50 | **+$0.50 per pack** |

**The house NEVER loses:**
- Standard users: capped at 450 msgs. Even if they use every one, you profit $0.25. Most won't hit the cap — profit is higher.
- Pro users: capped at 800 msgs. Worst case you break even. Most use ~500 → you profit ~$4.50.
- Buy credits: pure margin. $2 for 100 msgs that cost you $1.50.
- Nobody can run you under. The Fül system prevents it.

### BYOK Nudge — For the Heavy Burners
When a user consistently hits their Pro cap or buys credits frequently, Fülkit whispers:

> "Hey, you're burning rubber. You might save money with your own Anthropic account. Want me to help you set that up?"

- Easy link/tool to connect their own API key
- They burn their credits, not yours
- Fülkit still charges platform fee ($5/mo?) for storage, sync, features
- You remain an economical site worth the money — not the token game
- This is honest, transparent, and builds trust. Users respect it.

---

## Hot Seats — Use It or Lose It

Your 5 founder seats are a **loan, not a gift.**

**The mechanic:**
- You assign a seat to someone → they use Fülkit free
- Activity threshold: **1 message per week or 4 per month**
- If they go inactive (miss the threshold for 30 days) → seat auto-revokes
- They get a message: "Hey, your Fülkit seat went inactive. Want to keep going? $7/mo."
- They can re-engage as a paying user at any time
- Your seat opens back up for someone who'll actually use it

**Why hot seats matter:**
- Dead weight gets flushed. Active evangelists stay.
- Creates urgency — use it or lose it
- Filters for closers. Only people who care keep the free seat.
- Your 5 free slots are always occupied by your best users
- A founder seat holder who refers 7+ people has earned their freedom through effort, not just knowing you

**Infrastructure:**
- User table tracks: last_message_date, messages_this_month, seat_type (founder/paid)
- Cron job checks monthly: any founder seat user with <4 messages → flag for revocation
- Grace period notification: "You have 7 days to stay active or your seat converts to paid"
- Revoked users auto-convert to paid ($7/mo) or churn — their choice

---

## Referral Engine — "Get Fülkit"

Not "Share Fülkit." **"Get Fülkit."** The language matters. You're not asking users to do you a favor. You're offering them a path to free.

"Refer a friend, get a buck." But the buck is platform credit, not money. (Fine print: commission toward subscription, not a payout.)

**How it works:**
- User refers a friend → friend signs up and pays $7+/mo
- Referrer earns **$1/mo credit** for as long as that referral stays active and paying
- Credits offset the referrer's subscription
- **Unlimited invites.** No cap. Every referral makes Fülkit money.

**Where it lives in the app:**
- **Account settings:** "Get Fülkit" section showing referral link, active referrals, credit balance, progress toward free
- **Dashboard pull-tab:** Small, always-visible tab on the dashboard that opens the referral/subscription area. Never hidden, never in the way.
- **In the heartbeat (whispers):** If a user has never sent an invite, Fülkit whispers: "You know you could get a free account, right? Every friend who joins earns you $1/mo off your subscription." Permission-based, earns its way in, fades if ignored.

**The math per referral:**
- Referred user pays: $7/mo (Standard) or $12/mo (Pro)
- API cost for that user: ~$4.50/mo (capped by Fül)
- **Fülkit nets: +$2.50/mo minimum** from the referred user
- Referral credit paid: -$1/mo (foregone revenue, not cash out of pocket)
- **Fülkit still nets: +$1.50/mo per referral.** Always positive.

**The referrer's path to free:**
- Refer 1 friend → pay $6/mo instead of $7
- Refer 3 friends → pay $4/mo
- Refer 7 friends → **$7 in credits = Standard subscription fully offset. Free.**
- Refer 12 friends → **Pro subscription fully offset. Free.**
- Refer 15+ friends → excess credits banked for buy-credit packs or premium perks

**Key: credits are tied to ACTIVE referred users.** If 2 of your 7 referrals cancel, your credits drop to $5/mo. You pay the $2 difference. Keeps referrers invested in quality users, not just bodies.

**Why unlimited invites:**
- Every referral is net positive for Fülkit (+$1.50/mo minimum)
- Capping invites = capping revenue. Don't do that.
- Evangelists become volunteer salespeople — incentives aligned with yours
- The more they share, the more they save. The more they save, the more Fülkit earns.

**The flywheel:**
Good product → users love it → they "Get Fülkit" for friends → friends pay $7-12 → referrer earns credits → referrer refers more → Fülkit grows AND profits on every step

---

## The Math at Scale

**Assumes 70% Standard ($7), 30% Pro ($12). Fül caps prevent losses.**

| Total Users | Free | Standard | Pro | Revenue | API Cost (capped) | Credits Out | Hosting | Net Profit |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 6 | 6 | 0 | 0 | $0 | $27 | $0 | $25 | **-$52** |
| 20 | 6 | 10 | 4 | $118 | $90 | $14 | $25 | **-$11** |
| 35 | 6 | 20 | 9 | $248 | $157 | $29 | $25 | **+$37** |
| 50 | 6 | 31 | 13 | $373 | $225 | $44 | $25 | **+$79** |
| 100 | 6 | 66 | 28 | $798 | $450 | $94 | $25 | **+$229** |
| 250 | 6 | 171 | 73 | $2,073 | $1,125 | $244 | $75 | **+$629** |
| 500 | 6 | 346 | 148 | $4,198 | $2,250 | $494 | $75 | **+$1,379** |
| 1,000 | 6 | 696 | 298 | $8,448 | $4,500 | $994 | $200 | **+$2,754** |

**Breakeven: ~30 paying users** (improved with Pro tier).

**Plus buy-credit revenue** not shown above — pure margin on top.

**Your incentive as founder:**
- You use Fülkit free forever
- Fül system means you NEVER get burned by a heavy user
- Every user = guaranteed positive margin due to caps
- 30 users = self-sustaining. 100 = comfortable. 500 = real money.
- Foundationally net positive. The house always wins.

---

## Launch Strategy — Evangelist Engine

**Not an exclusive club with a hard cap. An exclusive TOOL with unlimited referrals.**

The product is exclusive (quality, feel, brand). The invites are not capped. Anyone can refer. Everyone who refers earns. Fülkit profits on every referral.

**Phase 1: Soft launch**
- You + 5 hot seats (your closers)
- You're floating ~$52/mo while it's just you and your circle
- Your circle starts referring. Each referral = revenue.

**Phase 2: Organic growth**
- Referrals compound. 5 people refer 5 each = 25 paid users.
- You're near breakeven. Keep pushing.

**Phase 3: Self-sustaining**
- 40+ paid users. Fülkit covers its own costs.
- Every new user is pure margin.
- Landing page at Fulkit.app captures waitlist emails
- Word of mouth + referral credits = growth engine

**Phase 4: Scale**
- Hundreds of users. Real monthly income.
- Consider: higher tiers, enterprise, premium features
- Never forget: you built this because YOU needed it. That's the authenticity that sells.

**Metrics to track from day one:**
- Daily active users + messages per user
- Referral conversion rate (invites sent → signups)
- Hot seat utilization (are your 5 seats being used?)
- Revenue per user after credits
- Monthly burn vs revenue → the breakeven countdown

---

## Onboarding — First Text from Bestie

The first thing a new user sees is NOT a tutorial, NOT a feature tour, NOT a signup wizard. It's a message from Fülkit:

> "Hey — I'm your Fülkit. Want to bring your brain over from somewhere, or start fresh?"

**Two options:**
- **Import** → connect Obsidian vault, Google Drive, Dropbox, or drag/drop files
- **Start fresh** → blank slate, begin capturing right away

That's it. One message, two choices. The onboarding IS the product — it feels like Fülkit from moment one.

**After the choice:**
- If import: AI scans what's coming in, gives a quick summary. "Found 847 notes. Looks like you write a lot about marketing and engineering. Want me to organize these?"
- If start fresh: Fülkit sends another whisper. "What's on your mind right now? Drop a thought, a doc, or just say hi."

**The goal:** Value in under 60 seconds. The user should feel like Fülkit already gets them before the first minute is up.

### ChappieBrain — Test Case #1
The founder's personal Obsidian vault (ChappieBrain) is the first import target. This is the real test of the import pipeline and RAG system. If Fülkit can ingest ChappieBrain and immediately have useful conversations about its contents, the product works.

---

## Roadmap — Reordered by Magic

### Magic tier (build first)
- **Design system + tokens** — one source of truth for all visual decisions, build BEFORE product code
- Proactive briefing — AI surfaces what matters when you open the app, no prompt needed
- AI whispers — ephemeral suggestion cards that drift in and fade out like texts from a friend
- Action list — standalone view for AI suggestions, to-dos, nudges with feedback controls
- AI feedback loop — thumbs up/down, dismiss, push, "don't ask" — AI learns from use, not settings
- AI synthesis — combine notes into summaries, briefs, action plans
- Inbox triage — drop a doc, AI files/discusses/extracts
- Quick capture — global shortcut to jot a thought from anywhere
- Backlinks — see every note that references the current one
- Import/export — markdown in, markdown out. No lock-in ever.
- The Hum — talk to an animated orb, no transcript on screen, two-way conversation
- Mobile app — your brain in your pocket (PWA first, native later)

### Useful tier (build second)
- Tags & filters
- Daily note
- Web clipper
- Templates
- Offline mode
- Spaced repetition — resurface notes before you forget them
- "Ideas worth exploring" bucket — auto-catch for homeless thoughts

### Nice-to-have tier (build later)
- Graph view — visual but not magic
- Publish to web
- Collaboration
- BYOK portal — heavy burners connect own API key, Fülkit nudges them when they're burning rubber

---

## Fülkit Builds Fülkit — Dogfooding as Development

### The concept
Fülkit's own development is its first real project. Every task, bug, feature request, design decision, and architecture choice lives inside Fülkit itself. The product manages its own creation.

This is the ultimate use case: a developer (you) using the AI-powered second brain to build the AI-powered second brain. If it works for this, it works for anything.

### What lives in Fülkit's own brain
- buildnotes.md — the living spec
- design.md — the visual contract
- TODO.md — the task list
- Every conversation about architecture decisions
- Bug reports and fixes
- User feature requests and feedback
- Codebase context (file structure, dependencies, patterns)
- Sprint priorities and what to work on next

### How it works day-to-day
You open Fülkit. Instead of wondering what to work on:

> "Hey — 3 things today: the whisper timing is off based on your testing notes, 2 users flagged the orb animation stuttering on mobile, and the Fül counter isn't decrementing correctly. Want to start with the bug or the UX issue?"

That's your bestie project-managing the build. No Jira. No Trello. No standup with yourself. Just open the app, get the brief, build.

### Claude Code integration
Claude Code (terminal agent) can read the repo, make changes, run tests, push code. The guardrails are already built:
- **design.md** — Claude reads this FIRST before touching any UI. Tokens prevent rogue values.
- **buildnotes.md** — Claude reads this for product context. Prevents scope drift.
- **TODO.md** — Claude reads this for task priorities. Knows what's next.

**The flow:**
1. You tell Claude: "fix the whisper fade timing"
2. Claude reads design.md → finds `--duration-slowest: 800ms` and `--ease-in`
3. Makes the change using the right tokens — no hardcoded values
4. You review, approve, push

**Future flow (more autonomous):**
1. Fülkit flags its own issue: "the Fül counter is off by 1"
2. Claude drafts a fix
3. You approve with one tap
4. Fülkit gets better while you sleep

### Self-improving product
Fülkit should perpetually want to make itself better. Not just help the user — help itself.

**User-facing:**
- If a user has a fix-it or feature idea → capture it in the system, flag it for the founder
- Lightweight feedback: "something feel off? tell me" — conversation, not a form
- Aggregate patterns: "5 users mentioned whisper timing this week"

**Founder-facing:**
- Fülkit's own brain tracks its own build errors, performance issues, UX friction
- When you jump in to dev, the path is clear — not wondering what to work on
- Context is always fresh: "last session you were debugging the RAG pipeline. Want to pick up where you left off?"
- Constantly editing and refining. Point of the spear.

### Managing expectations
This doesn't all happen day one. The progression:
1. **Now:** buildnotes/design/TODO .md files in the repo. Claude Code reads them. You drive.
2. **Soon:** Fülkit ingests its own repo. You can ask it questions about the codebase.
3. **V1.5:** Fülkit flags issues and suggests priorities. You approve and execute.
4. **V2:** Agents that execute changes with your approval. Fülkit iterates on itself.

---

## V2 Vision — Agents & App Replacement

### The single-app goal
The ambition: Fülkit replaces 80% of the apps on your phone. One bestie, one interface.

**What Fülkit replaces:**
- Obsidian / Notion → notes and knowledge
- ChatGPT / Claude → AI conversations
- Todoist / Things → task management
- Otter / voice memos → voice capture (the orb)
- Pocket / Instapaper → read later / web clipping
- Day One → journaling (daily notes)
- Reminders → action list + whispers
- Apple Notes → quick capture
- Email drafts → AI-assisted writing

That's 9+ apps consolidated into one bestie. Not because Fülkit does everything — because the AI layer makes everything connected. A note becomes a task becomes a draft becomes a reminder. Seamlessly.

### Agents (V2 — inspired by felixcraft.ai)
V1 = bestie that thinks with you. V2 = bestie that DOES things for you.

**Agent capabilities:**
- File changes: create, edit, move notes and documents
- Code commits: Claude Code integration for developer workflows
- Email drafts: compose and stage messages from your notes
- Calendar: suggest and create events based on action items
- Research: web search, summarize, save to brain
- Automations: "every Friday, summarize my week and file it"

**For the founder (you):**
- Agents help build and maintain Fülkit itself
- Design agents enforce the token system
- QA agents flag broken components
- Analytics agents surface user patterns

**For subscribers (future):**
- Users get their own agent capabilities (premium tier)
- "Draft a response to this email using my notes on the project"
- "Research competitors and add findings to my brain"
- "Prepare my meeting brief from last week's notes"

### The progression
1. **V1 (now):** Chat + notes + voice + whispers. The bestie.
2. **V1.5:** Fülkit manages its own development. Self-aware product.
3. **V2:** Agents that execute. Developer tools. User automations.
4. **V3:** Platform. Other developers build agents on Fülkit. Marketplace.

This is a real company if you want it to be. Or it's just the best personal tool ever built. Either way, you're building it because you need it. That's the foundation.

---

## Open Questions
- ~~Storage backend~~ → Supabase ✅
- ~~RAG implementation~~ → pgvector on Supabase ✅
- ~~Pricing model~~ → Standard $7/mo, Pro $12/mo, Fül caps, buy credits $2/100 ✅
- ~~Heavy user protection~~ → Fül system, BYOK nudge for power burners ✅
- ~~Referral model~~ → "Get Fülkit" — $1 credit per active referral, unlimited, credits not cash ✅
- ~~Referral visibility~~ → Account settings + dashboard pull-tab + whisper nudge ✅
- ~~Hot seats~~ → 1 msg/week or 4/month, auto-revoke after 30 days inactive ✅
- ~~Mobile framework~~ → PWA first, React Native later ✅
- ~~Day one experience~~ → Text from Bestie: "bring your brain or start fresh" ✅
- ~~Name~~ → Fülkit (ü is the brand mark), FullKit.app → Fulkit.app redirect ✅
- ~~Whisper frequency~~ → Default 2/day, adjustable through conversation ✅
- ~~Voice capture~~ → Yes, the Hum, two-way conversation, no visible transcript ✅
- ~~Color palette~~ → Eggshell off-white bg, deep warm slate text, white on dark ✅
- ~~Typography~~ → Type as design, minimal text = every word is intentional ✅
- ~~Voice transcription~~ → Whisper API (OpenAI). ~$0.006/min. Cross-platform identical quality. ✅
- Voice output: which TTS for Fülkit's speaking voice? (warm, natural, not robotic)
- Voice cloning: ElevenLabs for user voice training? Legal/ethical review needed
- ~~Font selection~~ → DIN Pro (German industrial standard, 1931). D-DIN free for prototyping. Full weight range. ✅
- Font license: purchase DIN Pro (~$100) or prototype with free D-DIN first?
- Landing page: build now to start capturing waitlist emails?
- User acquisition: Twitter/X? Reddit? Friends? ProductHunt?
- App store: will "Fülkit" pass Apple review? PWA sidesteps this for beta.
- BYOK platform fee: $5/mo? What's the right number?
- Buy credits pricing: $2/100 right or should it be more?

---

## File Map

| File | Purpose | Status |
|:---|:---|:---|
| **README.md** | Developer setup, project overview (root) | ✅ Current |
| **md/buildnotes.md** | Product spec — vision, features, pricing, architecture | ✅ Current |
| **md/design.md** | Visual system — colors, type, spacing, components, assets | ✅ Current |
| **TODO.md** | Master action list — phases, tasks, critical path | ✅ Current |
| **md/features.md** | Marketing — app replacement, cost comparisons, copy bank | ✅ Current |
| **jsx/fulkit-app.jsx** | Main app — AI chat, notes, sources, roadmap (3 dev modes) | 🟡 Prototype |
| **jsx/fulkit-orb.jsx** | The Hum — animated states, mic/stop/back controls | 🟡 Prototype |
| **jsx/pyramid.jsx** | Owner portal pricing calculator — needs Fül system rebuild | 🟡 Needs update |
| **assets/** | Brand, fonts, icons, OG images, styles, easter eggs | ⬜ Pending |

---

## Agent Safety Model

> Claude inside Fulkit operates as a **contributor, not an admin.** PR-only workflow. Nothing destructive without confirmation. Nothing irreversible without a branch.

### Core principles

1. **Read-only by default** — every integration starts with read access only. Write access is added per-action behind gates.
2. **Branch protection** — all code changes happen on feature branches. Main is protected. Claude opens PRs, Collin merges.
3. **Confirmation gates** — destructive actions (delete, overwrite, drop, push) require explicit user approval before executing.
4. **No silent side effects** — Claude always tells you what it's about to do before doing it. No background mutations.
5. **Everything is recoverable** — git reflog for code, soft deletes for data, backups for DB.

### Permission matrix

| Action | Allowed | Gate |
|:---|:---|:---|
| Read any file in repo | Yes | None |
| Search / grep code | Yes | None |
| Read git log, diff, status | Yes | None |
| Create branch | Yes | None |
| Write files on branch | Yes | None |
| Open pull request | Yes | None |
| Merge PR | **No** | Owner only |
| Push to main | **No** | Blocked |
| Force push | **Never** | Blocked |
| Delete files | Confirm | User approval |
| Delete branch | Confirm | User approval |
| Run tests | Yes | None |
| Run build | Yes | None |
| Deploy | **No** | Auto via Vercel on merge |
| DB read (select) | Yes | Read-only connection |
| DB write (insert/update) | Confirm | User approval |
| DB destructive (delete/drop) | **No** | Blocked by default |

### MCP integration safety

Each MCP server exposes a specific tool surface. We control safety by:

- **Scoping tools narrowly** — expose `read_file`, `create_pr`, not raw `git` or `sh`
- **No shell access** — Claude cannot run arbitrary commands. Only predefined tools.
- **Per-service permissions** — Spotify gets play/pause, not account management. Gmail gets draft, not send-without-review.
- **Audit log** — every tool call is logged with timestamp, input, output. Reviewable in Owner portal.
- **Rate limits** — cap tool calls per minute to prevent runaway loops.

### Escalation path

1. Claude suggests an action → shows what it will do
2. User approves or denies
3. If approved, Claude executes via scoped MCP tool
4. Result is logged and shown to user
5. If anything fails, Claude reports the error — does not retry destructively

### Database safety

- Chat and read queries use the **anon key** (RLS-scoped)
- Admin operations use the **service role key** server-side only
- No `DROP`, `TRUNCATE`, or schema changes from chat — ever
- Data deletions are soft deletes (`status = 'archived'`) unless explicitly hard-deleted from Owner portal

### The mental model

> Think of Claude in Fulkit as a **junior developer on your team.** Smart, fast, helpful — but every PR gets reviewed. Every destructive action gets a "are you sure?" No deploy access. No admin credentials. A contributor with guardrails.

---

## Audio & Music System

All music/audio specs live in `md/Audio_Crate/`:
- **`audio-spec.md`** — Signal Terrain, Fabric audio engine, ReccoBeats integration, waveform rendering
- **`audio-todo.md`** — Audio system roadmap and TODO
- **`crate-spec.md`** — Crate & Mix system: DJ metaphor, drag-to-crate, set building, Spotify playback
