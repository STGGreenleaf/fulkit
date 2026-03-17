# Fülkit — Trust Model Spec

> The architecture of trust. How Fülkit handles your data, why it's different, and why that difference IS the product.
> This document serves: product team (architecture), sales team (pitches), legal (data policy), and anyone detail-oriented who needs to understand how data moves through Fülkit.
> See also: [buildnotes.md](buildnotes.md) for product spec, [design.md](design.md) for visual system, [features.md](features.md) for marketing copy.

---

## Table of Contents

1. The Thesis
2. The Problem
3. The Three Models
4. The Data Flow
5. Persistence — How Conversations Survive
6. The Write-Back Loop — Fülkit as a Context Machine
7. The Inbox — Where Conversations Land
8. The Upload Option — For Users Who Want Storage
9. Developer Workflows — Coding with Fülkit
10. Context Control — Your Seeds, Your Rules
11. The Five Promises
12. For the Cynic — Objections Answered
13. Enterprise & Government — Why This Architecture Matters
14. The Competitive Weapon
15. The Pitches
16. Technical Implementation
17. Phase Roadmap
18. Legal & Compliance Legend

---

## 1. The Thesis

Every AI product in 2026 plays the same game: give us your data, we'll give you intelligence. Google reads your email to sell ads. Notion stores your second brain on their servers. ChatGPT uses your conversations to train models unless you opt out. The entire internet runs on a handshake where you trade privacy for utility.

Fülkit breaks that handshake.

Your data doesn't fuel our business. We don't need it. We don't train on it. We don't sell it. We make money on subscriptions — $7 a month. That's it.

**This is not a feature. This is the product.**

---

## 2. The Problem

Every AI on the planet is equally smart and equally stupid about YOU.

Claude is brilliant. GPT is brilliant. Gemini is brilliant. But open any of them and say "what should I work on today?" and they all say the same thing: "I don't know, what are you working on?" Every single time. Blank slate. Amnesia. Groundhog Day.

The gap isn't intelligence. It's **familiarity.**

Fülkit closes that gap — but it does it without taking your data hostage.

---

## 3. The Three Models (and why we use a hybrid)

### Model A: Ephemeral Injection — "The Phone Call"

Your notes live on YOUR machine. When you chat, your browser reads your local files, sends them to Claude alongside your message, gets a response, and the data evaporates from the server. Nothing is stored on Fülkit's servers beyond what you explicitly choose to keep.

**The analogy:** You read your journal to a doctor over the phone. He listens, gives advice, and hangs up. He never had a copy. The words existed for a moment and they're gone.

**Best for:** Desktop power users, privacy maximalists, developers who want full local control.

**Browser note:** The File System Access API is currently supported in Chromium browsers (Chrome, Edge, Arc, Brave). Safari and Firefox do not support it. Users on unsupported browsers default to Model C (Fülkit storage). The native app (React Native, Phase 2) sidesteps this entirely with real filesystem access on all platforms. This is a temporary limitation of the web — not the architecture.

### Model B: Client-Encrypted Storage — "The Locked Safe"

Notes are encrypted in the browser with a key only the user holds, then stored in Supabase. The server is blind — it holds ciphertext it cannot read. At chat-time, the browser decrypts locally, injects into the request.

**Best for:** Cross-device users, mobile users, users who want cloud backup on their terms.

### Model C: Fülkit-Managed Storage — "Your Shelf at Our Place"

User uploads files to Fülkit's Supabase storage. Content is encrypted at rest. User can view, edit, delete, and export everything at any time. Fülkit reads from this storage to build context for AI conversations. This is opt-in, transparent, and fully under the user's control.

**Best for:** Users who want an upload button, users migrating from other tools, users who don't run a local vault, mobile-first users.

### The Fülkit Approach: User Chooses

**We don't force a model. The user picks their comfort level:**

| Mode | Where data lives | Server access | Who it's for |
|:---|:---|:---|:---|
| **Local-first** (Model A) | User's machine only | Ephemeral — read and forget | Privacy maximalists, developers |
| **Encrypted sync** (Model B) | User's machine + encrypted cloud | Zero-knowledge — server holds ciphertext | Cross-device users |
| **Fülkit storage** (Model C) | Fülkit's Supabase (encrypted at rest) | Readable by Fülkit for context injection | Convenience users, mobile-first |

**All three modes share the same promises:** full transparency, full export, full delete, no training on user data, no selling user data. The difference is WHERE the data sits at rest — not whether the user controls it.

**Default for new users:** Model C (Fülkit storage) with clear, upfront disclosure. It's the lowest-friction path. Users who want more control can switch to local-first or encrypted sync at any time. No penalty. No data loss. Just point Fülkit to a different source.

---

## 4. The Data Flow — What Actually Happens

### During a chat session:

```
YOU (your machine)                    FÜLKIT SERVER                 CLAUDE (Anthropic)
                                                                    
Your vault / Fülkit                                                 
storage has your                                                    
notes and context.                                                  
       │                                                            
       ▼                                                            
Client assembles ──── sends message ────►  Server receives ──────► Claude reads
context from your       + context           message + context       your context,
chosen source           in request body     Builds system prompt.   responds.
(local or cloud)                            Calls Claude API.            │
       │                                           │                     │
       │                ◄── response ──────── forwards ◄──────── response│
       │                                           │                     
       ▼                                           ▼                     
You see the            Server does NOT       Anthropic does NOT     
response.              store vault context   store API inputs       
                       from the request.     (per their data        
Client writes          Only stores what      policy for API         
back to your           user opts into:       usage).                
vault/storage          preferences,                                 
(see Write-Back).      conversation                                 
                       summaries, Fül                               
                       count.                                       
```

### What is stored (the full list):

| Data | Where | Why | User control |
|:---|:---|:---|:---|
| Email address | Supabase (encrypted at rest) | Authentication | Can delete account |
| Subscription tier | Supabase | Billing | Visible in settings |
| Message count this month | Supabase | Fül cap enforcement | Resets monthly |
| Referral relationships | Supabase | Credit tracking | Visible in settings |
| User preferences | Supabase | Tone, whisper frequency, topics | Editable, deletable |
| Conversation summaries | Supabase (opt-in) | Session continuity | View, edit, delete anytime |
| Uploaded files (Model C) | Supabase Storage (encrypted at rest) | User's chosen storage | Full CRUD, export, delete |
| Vault-generated notes | Supabase Storage OR local vault | Write-back from conversations | User controls destination |

### What is NEVER stored:

| Data | Why not |
|:---|:---|
| Raw vault content from ephemeral sessions | Read-and-forget by design |
| Claude API request payloads | Not logged, not persisted |
| Voice audio after transcription | Transcribed → text only → audio discarded |
| Encryption keys (Model B) | User holds these. Never transmitted. |
| Browsing or usage patterns for advertising | No ad model. No tracking. |

---

## 5. Persistence — How Conversations Survive

**The question:** If the AI forgets after each response, how do you finish a task? How does a conversation that develops over hours — or days — persist?

**The answer: conversation windows.**

### How it works:

A conversation in Fülkit is a **session** — like a thread. Within a session, the full conversation history is maintained in the client (browser memory) and sent with each new message. Claude sees the entire thread every time you send a message. Nothing disappears mid-conversation.

```
Message 1: "Help me write a pricing strategy"
  → Claude sees: [your vault context] + [message 1]

Message 2: "Focus on the loss aversion angle"
  → Claude sees: [your vault context] + [message 1] + [response 1] + [message 2]

Message 3: "Now draft the email to the team"
  → Claude sees: [your vault context] + [full conversation so far] + [message 3]
```

**Within a session, nothing is lost.** The conversation builds on itself, message by message, exactly like what you're doing right now in Claude.

### Long sessions — the token ceiling:

Claude has a 200K token context window. In a deep working session, the math gets tight: 50K tokens of vault context + system prompt + growing conversation history. By message 20 of an intense session, the conversation alone could be 80K+ tokens.

**Solution: mid-session compression.** When conversation history approaches the token ceiling, Fülkit automatically summarizes older messages in the thread — compressing the early part of the conversation into a tight summary while keeping recent messages verbatim. The user doesn't notice. Claude still has full context. The session stays alive indefinitely.

```
Messages 1-15: [compressed into 2K token summary]
Messages 16-20: [full verbatim — most recent context preserved]
Vault context: [50K tokens — always fresh]
System prompt: [personality + preferences]
```

This means a session can run for hours — or days — without hitting a wall. The conversation compresses gracefully. Nothing is lost, it's just distilled.

### What happens when you close the session:

This is where the user's choice matters.

**Option 1: Ephemeral (default for local-first users)**
- Session ends. Conversation history is gone from memory.
- BUT: anything Fülkit wrote back to your vault persists (see Write-Back Loop below).
- Next session, Claude doesn't remember the conversation — but it can read the notes, summaries, and action items that were generated from it.
- This is deliberate. The conversation is gone. The INSIGHTS from the conversation live on in your vault.

**Option 2: Conversation history (opt-in)**
- When enabled, Fülkit saves a summary of each conversation session to Supabase.
- NOT the raw transcript. An AI-generated summary: key decisions, action items, context markers.
- Next session, Claude reads these summaries alongside your vault — giving it continuity without storing every word.
- User can view, edit, and delete any conversation summary at any time.

**Option 3: Full transcript (opt-in, explicit)**
- For users who want complete records — writers working on a biography over a year, developers building a codebase over months.
- Full conversation saved. Stored in Fülkit storage (encrypted at rest) or written to local vault as markdown.
- User controls retention. Delete anytime. Export anytime.

### The biography use case:

You conversate with Fülkit about your life for a year. Every session, Fülkit writes notes, summaries, and conversation records back to your vault. After a year, you have a rich, organized archive of your history — in your own files, in markdown, searchable and printable. You tell Fülkit "write my biography from everything we've discussed." It reads a year of context and produces it.

The conversations are the raw material. The vault is the archive. The biography is the output. And the user owned every piece of it the entire time.

---

## 6. The Write-Back Loop — Fülkit as a Context Machine

**This is the key concept that makes persistence work without server storage.**

Fülkit doesn't just READ your vault. It WRITES BACK to it. Every conversation produces artifacts — notes, action items, summaries, insights — and those artifacts are filed into your vault (local or cloud, wherever you chose).

### The loop:

```
     ┌──────── YOUR VAULT ────────┐
     │                            │
     │  Notes, docs, history,     │
     │  action items, summaries   │
     │                            │
     └─────┬──────────────┬───────┘
           │              ▲
      READ │              │ WRITE BACK
           │              │
           ▼              │
     ┌──────── FÜLKIT ────────────┐
     │                            │
     │  Reads vault at chat-time  │
     │  Processes with Claude     │
     │  Generates new artifacts   │
     │  Writes them back to vault │
     │                            │
     └────────────────────────────┘
```

### What Fülkit writes back:

| Artifact | Where it goes | Example |
|:---|:---|:---|
| **Conversation summary** | Chappie files to relevant vault folder | "Session: Discussed pricing strategy. Decided on loss aversion framing." → filed to `02-BUSINESS/` |
| **Action items** | Action list + vault note | "Follow up with Sarah by Friday. Draft menu swap for summer." |
| **Extracted insights** | Chappie files to relevant vault folder | "Loss aversion pricing — frame upgrades around what customers lose." → filed to `04-DEV/Fulkit/` |
| **Generated content** | `00-INBOX/` (if Chappie isn't sure where it goes) | Draft emails, documents, plans |
| **Updated preferences** | Preferences store | "User prefers direct tone. Whisper about food only during day." |

### How it works technically:

**For local-first users (Model A):**
- Fülkit uses the File System Access API to write `.md` files directly to the user's vault folder.
- New notes land in `00-INBOX/` by default.
- Chappie triages and files automatically — inbox is just a pass-through for items Chappie isn't sure about.

**For Fülkit storage users (Model C):**
- Write-back creates new notes in the user's Supabase storage.
- Organized by the same folder logic: inbox, personal, business, dev, etc.
- Chappie auto-files everything. User CAN browse, edit, and reorganize in-app if they want — but the default is hands-off.

### Why this matters:

The vault gets smarter over time. Not because Fülkit is storing your life on a server — because every conversation adds to YOUR knowledge base, in YOUR files, under YOUR control. The AI reads more context each session because the vault has grown. It's a flywheel:

```
Better vault → Better AI context → Better conversations → Better write-back → Better vault
```

**The context machine.** That's what Fülkit is. It reads. It processes. It writes back. The vault is the brain. Fülkit is the thinking.

---

## 7. The Inbox — Where Everything Lands (and Chappie Sorts It)

**Everything that comes out of a conversation lands in `00-INBOX/` first. Then Chappie files it. Not you.**

This is the magic moment. The user never sorts anything. They dump — conversations, uploads, voice transcripts, file drops — and Chappie reads the content, understands what it is, and files it into the right place in the vault. That's the entire point of having an AI brain. If the user is still organizing their own files, we failed.

### The flow:

```
Conversation happens / user drops a file / voice transcript arrives
       │
       ▼
Everything lands in 00-INBOX/
       │
       ▼
Chappie triages automatically:
  - Reads the content
  - Determines what it is
  - Files it:
      Business stuff → 02-BUSINESS/
      Dev notes → 04-DEV/
      Ideas → 05-IDEAS/
      Personal → 01-PERSONAL/
      Learning → 06-LEARNING/
      Doesn't fit anywhere → stays in 00-INBOX/ for user to see
       │
       ▼
Chappie confirms (permission-based):
  "I filed your pricing conversation under 02-BUSINESS/HBBEVCO-LLC/.
   The recipe idea went to 05-IDEAS/. The action item about Sarah
   is on your action list. Anything I got wrong?"
```

### The user's job: zero.

The user talks, thinks, drops files, rambles into the Hum. Chappie does the rest. The vault organizes itself because the AI understands what everything is and where it belongs.

If Chappie isn't sure, it asks — but the default is to act, not to wait. Permission-based doesn't mean passive. It means Chappie files first, tells you what it did, and lets you correct. Like a bestie who put your groceries away and says "I put the chips in the pantry — that cool?"

### How Chappie gets better at filing:

Every correction teaches Chappie the user's preferences. Move something Chappie filed in `05-IDEAS/` to `02-BUSINESS/`? Chappie learns that this type of content is business for you, not just an idea. Over time, the filing gets more accurate — not through a settings page, but through use.

### How filing works under the hood (one call, two outputs):

Triage is NOT a separate API call. It's built into every chat response. When Claude responds to a message, the response includes both the user-facing reply AND structured filing metadata (destination folder, artifact type, suggested filename). One call. Two outputs. The user sees the response. Chappie sees the filing instructions. No extra Fül credits burned. No added latency. The cost of auto-filing is zero — it's baked into the conversation the user already paid for.

### Inbox on mobile:

On mobile (pocket bestie), the inbox is the primary view. Whisper cards at top, recent items Chappie just filed below (with a quick "undo" if it got the placement wrong), chat input at bottom. The user sees what Chappie did and can course-correct with a swipe. But the default state is: Chappie already handled it.

---

## 8. The Upload Option — For Users Who Want Storage

**Telling the truth: some people want an upload button. That's fine. We built one.**

Not everyone runs an Obsidian vault. Not everyone wants to manage local files. Some people just want to drag a PDF into Fülkit and have it be smart about it. That's a valid use case and we support it fully.

### How Fülkit storage works:

- User uploads files through the app (drag-drop, file picker, paste).
- Files are stored in Supabase Storage, encrypted at rest, scoped to the user's account.
- Row-level security (RLS) ensures no user can access another user's files.
- Fülkit reads from this storage to build AI context — same as reading from a local vault.
- User has full CRUD: create, read, update, delete. Anytime. No hoops.
- Full export: download everything as a zip of markdown files. No lock-in.
- Full delete: purge everything. We confirm, execute, and it's gone.

### The storage hierarchy:

```
User's Fülkit Storage (Supabase)
├── 00-INBOX/           ← Conversation outputs, uploads, unsorted
├── 01-PERSONAL/        ← About you, your people, goals
├── 02-BUSINESS/        ← Business context, clients, strategy
├── 03-PROJECTS/        ← Active campaigns, initiatives
├── 04-DEV/             ← Code context, architecture, decisions
├── 05-IDEAS/           ← Raw sparks, brainstorms
├── 06-LEARNING/        ← Books, courses, research
└── 07-ARCHIVE/         ← Done, old, reference
```

This mirrors the ChappieBrain vault structure exactly. Users who start with Fülkit storage can later export to a local vault and switch to local-first mode. Users who start local-first can later upload to Fülkit storage for cross-device access. The structures are identical. Moving between modes is seamless.

### What makes this different from Notion/Google Docs:

| | Fülkit Storage | Notion | Google Docs |
|:---|:---|:---|:---|
| Encrypted at rest | ✅ | ⚠️ | ⚠️ |
| Full export (markdown) | ✅ | ❌ (proprietary blocks) | ❌ (.gdoc format) |
| Full delete (verified) | ✅ | ⚠️ | ⚠️ |
| No training on content | ✅ (contractual + architectural) | ❌ | ❌ |
| No ads based on content | ✅ | ✅ | ❌ |
| Revenue from subs only | ✅ | ⚠️ (enterprise upsell) | ❌ (ads) |
| Open format | ✅ (markdown) | ❌ | ❌ |
| User controls retention | ✅ | ⚠️ | ⚠️ |

**The upload button exists. The trust model still holds.** Because the promises aren't about WHERE the data lives — they're about WHO controls it. The user. Always.

---

## 9. Developer Workflows — Coding with Fülkit

**The question:** How does a developer use Fülkit the way you're using Claude right now — to build software, debug code, iterate on architecture?

### The code-aware bestie:

A developer points Fülkit at their project repo (local vault = their codebase + docs). Fülkit reads:
- `README.md` — what the project is
- `buildnotes.md` — architecture decisions, roadmap
- `design.md` — visual system, tokens, guardrails
- Key source files — whatever's relevant to the current conversation

The developer opens Fülkit and says: "The whisper timing is off. Fix it."

Fülkit already knows:
- The design system says `--duration-slowest: 800ms` and `--ease-in`
- The buildnotes say whispers should fade, not snap
- The codebase has a `WhisperCard` component with a `fadeIn` animation

It gives a precise, context-aware answer — not a generic "here's how CSS animations work."

### How it compares to what you're doing now:

| | Claude.ai (now) | Fülkit (future) |
|:---|:---|:---|
| Context | You paste docs into each conversation | Fülkit reads your vault automatically |
| Continuity | New conversation = start over | Write-back means context accumulates |
| Project awareness | You re-explain the project each time | Fülkit already knows buildnotes, design, roadmap |
| Code generation | Claude writes code, you copy-paste | Fülkit writes code + writes it back to your vault/repo |
| Decision history | Lost between sessions | Summarized and filed in your vault |

### The developer vault:

```
project-repo/
├── src/                    ← code (Fülkit can read for context)
├── docs/
│   ├── buildnotes.md       ← Fülkit reads this first
│   ├── design.md           ← Fülkit reads before touching UI
│   ├── decisions/          ← Write-back: architecture decisions logged here
│   └── sessions/           ← Write-back: conversation summaries land here
├── .fulkit/
│   ├── context.json        ← Which files to always include
│   └── preferences.json    ← Tone, behavior, scope
└── README.md
```

### Integration with Claude Code (V2):

Fülkit can orchestrate Claude Code (terminal agent) for execution:
1. You tell Fülkit: "fix the whisper fade timing"
2. Fülkit reads design.md, finds the right token
3. Fülkit generates the code change
4. Fülkit hands it to Claude Code for execution (with your approval)
5. Write-back: logs the decision in `docs/decisions/`

The developer never leaves one interface. The vault grows with every session. The codebase and documentation stay in sync because Fülkit manages both.

---

## 10. Context Control — Your Seeds, Your Rules

**The problem that exposed this:** Shandy (the user's wife) was showing up in every coding prompt. That's weird, wasteful, and wrong. If you're debugging a CSS animation, your wife's birthday and your relationship context have no business in that conversation. But if you're planning a surprise trip? Then she's the most important context in the vault.

**"Everything everywhere all the time" is a lie.** No human brain works that way. You don't think about your grocery list during a board meeting. You don't think about React components when you're talking to your wife. Your brain filters by relevance automatically. Fülkit should too.

### The Three States

Every note in your vault has one of three states:

| State | What it means | When to use |
|:---|:---|:---|
| **Always** | In every prompt, no matter what. Burns token budget permanently. | Identity files, operating rules, core context. The stuff that makes Fülkit YOU. |
| **Available** | Included only when relevant to the current message. Smart, budget-friendly. **This is the default.** | Most notes — business, people, projects, ideas, learning. |
| **Off** | Never included. Invisible to Claude. | Archived, irrelevant, sensitive, or content you want excluded for a session. |

### How it works in practice:

```
Your vault has 50 notes.
  3 are "Always" → identity, personality, operating rules (~5K tokens, always loaded)
  45 are "Available" → scored by relevance each message
  2 are "Off" → archived, not relevant right now

You ask: "Fix the whisper fade timing"
  → Always notes: loaded (Collin-Context, CLAUDE instructions, brain-blueprint)
  → Available notes scored: design.md (HIGH), buildnotes.md (HIGH),
    whisper-component.md (HIGH), Shandy-Context (LOW → excluded),
    recipe-ideas.md (LOW → excluded)
  → Off notes: invisible

You ask: "Plan something special for Shandy's birthday"
  → Always notes: loaded
  → Available notes scored: Shandy-Context (HIGH → included),
    budget-notes (MEDIUM → included), design.md (LOW → excluded),
    buildnotes.md (LOW → excluded)
```

**The magic:** The user doesn't have to toggle anything for normal use. Relevance scoring handles it. Shandy doesn't show up in coding prompts because her context has zero relevance to CSS animations. She shows up when you mention her — because then she's relevant.

**The control:** When the user WANTS to override — say they're working on something sensitive and want to guarantee certain notes are excluded — they flip a note to "Off." When they want something always present regardless of relevance, they flip it to "Always." Three states. No complexity.

### What the user sees:

In Settings → Vault, a simple notes browser:

```
YOUR CONTEXT SEEDS
┌──────────────────────────────────────────────────────┐
│  Collin-Context       obsidian    1.8K tok   [● ○ ✕] │
│  CLAUDE               obsidian    2.1K tok   [● ○ ✕] │
│  Shandy-Context       obsidian     890 tok   [○ ● ✕] │  ← available, not always
│  brain-blueprint      obsidian    3.2K tok   [● ○ ✕] │
│  buildnotes           obsidian    4.1K tok   [○ ● ✕] │
│  design               obsidian    3.8K tok   [○ ● ✕] │
└──────────────────────────────────────────────────────┘
  ● = Always   ○ = Available   ✕ = Off
```

And in the chat header, a passive indicator after the first message:

```
📄 5 notes · 12K tokens
```

Just awareness. Not interactive for V1. The user knows what Claude is seeing right now without digging into settings.

### For Model A (local vault):

Folder structure IS the control. `_FULKIT/` files = always. Everything else = available. No database column needed.

### For Models B & C (cloud storage):

```sql
ALTER TABLE notes
  ADD COLUMN context_mode text NOT NULL DEFAULT 'available'
  CHECK (context_mode IN ('always', 'available', 'off'));
```

### Why this matters for the trust model:

This isn't just a UX feature. It's a trust feature. The user can see exactly what notes are going into every prompt. They can exclude sensitive content. They can verify that "off" means OFF — Claude genuinely doesn't know what it can't see.

The Five Promises say "you control your data." Context Control is where that promise gets real. It's not just about where data lives — it's about what the AI sees and when. The user owns their seeds.

### Repo access — the developer answer:

When a developer connects a repo to Fülkit, the repo files default to "available" — scored by relevance to each message. The developer doesn't need their wife in the prompt. They need the files relevant to what they're building right now. Fülkit reads `buildnotes.md` when you're asking about architecture. It reads `design.md` when you're asking about UI. It reads neither when you're asking about dinner.

Connect two repos? Fülkit knows "this site is like that site" because it can read both and score relevance across them. But it only pulls what matters for the current question.

---

## 11. The Five Promises

These are non-negotiable. They're the brand. They apply regardless of which storage model the user chooses.

### 1. You control your data. Period.

Whether your files live on your machine, in encrypted cloud storage, or in Fülkit's storage — YOU decide. You can view, edit, delete, and export everything at any time. Switch modes anytime. No lock-in. No penalties. No data held hostage.

### 2. We don't train on your content.

Fülkit does not use your notes, conversations, or uploaded files to train AI models. Your content is processed by Claude's API under Anthropic's data policy, which states that API inputs are not used for model training. We contractually commit to this.

### 3. No breach means no breach.

For local-first users: there's nothing on our servers to steal. For storage users: data is encrypted at rest, scoped by row-level security, and deletable on demand. We hold the minimum data necessary to operate. The attack surface is small by design.

### 4. Transparency is structural, not promised.

You can see everything Fülkit knows about you. Not because we pinky-swear to show you — because the settings panel reads directly from the same data the AI reads. There's no hidden layer. What you see is what Fülkit sees. Edit it, delete it, export it.

### 5. You pay with money, not data.

Seven dollars a month. That's the business model. Not your attention. Not your habits. Not your content. We make money when you subscribe. Your data has zero value to us — literally. There's no business reason to exploit it, mine it, or sell it. The incentives are clean.

---

## 12. For the Cynic — Objections Answered

### "But the data still goes to Anthropic's servers."

Yes. Claude is not a local model. Your content transits the wire to Anthropic's API for processing. Here's what matters:

Anthropic's API data policy explicitly states that API inputs are **not used to train models** and are **not stored beyond the immediate processing window.** This is the same trust model used by:
- **Banks** processing financial data through Claude's API
- **Healthcare companies** running patient information through Claude's API
- **Government contractors** using Claude's API for classified-adjacent work
- **Law firms** processing privileged client information through Claude's API

These organizations did not take Anthropic's word for it. They audited. They contracted. They verified. Fülkit operates under the same API terms.

If ephemeral processing by Anthropic's API is good enough for Goldman Sachs and the Department of Defense, it's good enough for your grocery list.

> ### DESIGN ELEMENT — earmark for hero treatment
> **"If it's good enough for Goldman Sachs and the Department of Defense, it's good enough for your grocery list."**
> *DIN Pro Black. Full-width. Let it breathe. This line converts cynics. Use it wherever trust needs to hit hard.*

### "What about conversation history?"

Off by default. When enabled, Fülkit stores AI-generated conversation summaries — not raw transcripts. You can also opt into full transcript storage. In both cases: you can view, edit, delete, and export everything. Turn it off and we purge. Your choice, always.

### "What if Fülkit gets acquired?"

Your vault is yours. If you're local-first, nothing changes — your files are on your machine. If you use Fülkit storage, you can export everything (markdown zip) before any transition. We commit to 90-day data portability notice in any acquisition scenario. And because the format is open markdown — not proprietary blocks — your export works anywhere.

### "How do I know you're telling the truth?"

Three layers of verification:

**Architectural:** The database schema enforces the model. For local-first users, there is no content storage table. The system cannot store what it has no schema for.

**Contractual:** Our terms of service and privacy policy make legally binding commitments about data handling. Violation is actionable.

**Open verification:** Fülkit will open-source the data flow layer before public launch. The client-to-server-to-Claude pipeline, the write-back mechanism, and the storage abstraction will be publicly auditable on GitHub. Anyone can verify exactly what moves where. The trust model is verifiable, not just claimed.

### "What about GDPR / CCPA?"

Fülkit is compliant by architecture. Right to deletion? We built it as a core feature. Right to data portability? Markdown export is native. Right to know what data is held? The transparency panel shows everything. Data minimization? We don't store what we don't need. Most companies retrofit compliance. We started from it.

### "What about subpoenas?"

For local-first users: we literally don't have your content. We can comply with a subpoena by handing over your email, subscription status, and message count. That's it. We cannot produce notes, conversations, or files we never stored.

For storage users: we hold encrypted content and would be compelled to produce it. This is disclosed in the privacy policy. Users who are concerned about legal exposure should use local-first mode.

---

## 13. Enterprise & Government — Why This Architecture Matters

### The pitch to enterprise:

"Your employees' notes, strategies, and intellectual property never touch our servers. Local-first mode means zero data residency concerns. The AI gets full context without creating a new data liability. Your security team will love the audit."

### The pitch to government / regulated industries:

"Ephemeral processing. No data at rest on our infrastructure. API calls route through Anthropic's FedRAMP-eligible infrastructure. Row-level security for any stored data. Full audit trail. Compliant by design, not by afterthought."

### Why this matters competitively:

Every enterprise AI deal stalls at the same gate: "where does our data go?" Most vendors spend months on security reviews, SOC 2 audits, and custom data processing agreements. Fülkit's answer is structurally simpler: **we don't have your data.** For local-first deployments, there's nothing to audit on our side. The security review is: "check the API call to Anthropic." Done.

This collapses enterprise sales cycles from months to weeks.

---

## 14. The Competitive Weapon

Nobody else can say this:

| | Fülkit | ChatGPT | Claude.ai | Notion AI | Obsidian |
|:---|:---:|:---:|:---:|:---:|:---:|
| AI knows your notes | ✅ auto | ❌ | ⚠️ manual (Projects) | ⚠️ | ❌ |
| Local-first option | ✅ | ❌ | ❌ | ❌ | ✅ |
| No server content storage (local mode) | ✅ | ❌ | ❌ | ❌ | ✅ |
| AI + local-first | ✅ | ❌ | ❌ | ❌ | ❌ |
| Proactive suggestions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Write-back to vault | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auto-files and organizes for you | ✅ | ❌ | ❌ | ❌ | ❌ |
| Full data export (markdown) | ✅ | ⚠️ | ⚠️ | ❌ | ✅ |
| Open data format | ✅ | ❌ | ❌ | ❌ | ✅ |
| Revenue from subs, not data | ✅ | ❌ | ✅ | ❌ | ✅ |
| User chooses storage model | ✅ | ❌ | ❌ | ❌ | ❌ |
| Enterprise/gov ready (local mode) | ✅ | ❌ | ⚠️ | ❌ | ⚠️ |

**A note on Claude.ai Projects:** Claude now offers Projects with persistent context and memory across conversations. That's real and we respect it — Fülkit is built on Claude. The difference: Claude Projects require you to manually curate and upload context documents. Fülkit reads your vault automatically, writes back automatically, and Chappie files automatically. The differentiator isn't that Claude CAN'T know you — it's that Fülkit does it without you managing it. Zero setup. Zero maintenance. The vault grows itself.

---

## 15. The Pitches

### To your dad (the boomer):

"It's like having a really smart friend who read your entire journal, remembers everything, and texts you when something matters. But the journal never left your house."

### To the developer:

"It's Claude with full context of your codebase, your architecture decisions, your notes, and your roadmap — without uploading anything to a third party's database. Ephemeral injection. Your vault is the source of truth. Fülkit reads it, helps you, writes insights back, and forgets the rest."

### To the cynic:

"We don't have your data. We don't want it. We can't sell it, lose it, or leak it — because we never had it. You pay seven bucks a month and your brain stays yours. Name another AI company that can say that."

### To the investor:

"Every AI company stores user data as an asset. We treat it as a liability we refuse to hold. Our architecture makes data breaches impossible for local-first users because there's nothing to breach. In a regulatory environment moving toward GDPR, CCPA, and AI transparency laws — we're already compliant by design. The trust model IS the moat."

### To enterprise / government:

"Your data never touches our servers. The AI gets full context through ephemeral injection — read, process, forget. No data residency concerns. No new attack surface. Your security team audits one API call to Anthropic and they're done. We collapse your vendor review from months to weeks."

### To the writer building a biography over a year:

"Talk to Fülkit every day. It listens, organizes, and writes everything back to your vault. After a year, you have a rich archive of your entire history — organized, searchable, yours. Tell Fülkit to write the book. It reads a year of context and produces it. You owned every word the entire time."

### The one-liner:

**"Your brain stays yours. We just help you use it."**

---

## 16. Technical Implementation

### Phase 1 Architecture: Hybrid Model

```
Client (Browser / App)
├── File System Access API → reads user's local vault (Model A)
│   OR
├── Decrypts from encrypted cloud storage (Model B)
│   OR
├── Fetches from Fülkit Supabase storage (Model C)
│
├── Smart context selection (token budget management)
├── Packages: vault context + conversation history + new message
├── POST /api/chat { message, context, history }
├── Receives response
├── WRITE-BACK: generates artifacts → writes to vault/storage
└── Updates conversation window state

Server (Next.js API Route)
├── Receives { message, context, history }
├── Authenticates user (Supabase Auth)
├── Builds system prompt: base personality + user context + preferences
├── Calls Claude API (claude-sonnet-4-5-20250514)
├── Returns response to client
├── Increments message count (Fül cap)
├── Does NOT persist vault context from request
└── Does NOT log conversation content

Claude API (Anthropic)
├── Processes prompt + context (200K token window)
├── Returns response
├── Does NOT store API inputs (per Anthropic API data policy)
└── Does NOT use inputs for model training
```

### Supabase Schema — What exists:

```sql
-- Authentication & billing
users (
  id uuid PRIMARY KEY,
  email text,
  seat_type text,          -- 'founder', 'hot_seat', 'standard', 'pro'
  tier text,
  created_at timestamp
)

subscriptions (
  user_id uuid REFERENCES users,
  tier text,
  messages_this_month integer,
  messages_limit integer,
  reset_date date
)

-- Referrals
referrals (
  id uuid PRIMARY KEY,
  referrer_id uuid REFERENCES users,
  referred_id uuid REFERENCES users,
  status text,             -- 'active', 'churned'
  credit_amount numeric,
  created_at timestamp
)

-- Preferences (learned through conversation)
preferences (
  user_id uuid REFERENCES users,
  key text,
  value text,
  updated_at timestamp,
  PRIMARY KEY (user_id, key)
)
-- Examples: tone=direct, whisper_frequency=2, topics=food|fitness

-- Notes / vault content (Model B & C users)
notes (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  title text,
  content text,
  source text,              -- 'obsidian', 'upload', 'write-back', 'manual'
  folder text,              -- '00-INBOX', '02-BUSINESS', etc.
  context_mode text NOT NULL DEFAULT 'available'
    CHECK (context_mode IN ('always', 'available', 'off')),
  created_at timestamp,
  updated_at timestamp
)
-- RLS: users can only read/write their own notes
-- For Model A (local vault): this table is empty — vault is on device

-- Conversations (active, used by chat route for context injection)
conversations (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  title text,
  topics text[],           -- AI-extracted conversation topics
  created_at timestamp,
  updated_at timestamp
)

-- Conversation summaries (PLANNED — schema not yet created)
-- conversation_sessions (
--   id uuid PRIMARY KEY,
--   user_id uuid REFERENCES users,
--   summary text,            -- AI-generated summary, NOT raw transcript
--   key_decisions text[],    -- Array of key decisions made
--   action_items text[],     -- Extracted action items
--   created_at timestamp,
--   updated_at timestamp
-- )

-- Full transcripts (PLANNED — schema not yet created)
-- conversation_transcripts (
--   id uuid PRIMARY KEY,
--   session_id uuid REFERENCES conversation_sessions,
--   user_id uuid REFERENCES users,
--   messages jsonb,          -- Full message array
--   created_at timestamp
-- )

-- User file storage (Model C users)
-- Uses Supabase Storage buckets, not a table
-- Bucket: 'vaults' — scoped by user_id via RLS
-- Structure mirrors ChappieBrain: 00-INBOX/, 01-PERSONAL/, etc.
```

### What does NOT exist (for local-first users):

```
-- For Model A users, NONE of these are populated:
-- No rows in conversation_transcripts (unless opted in)
-- No files in Supabase Storage (vault is local)
-- The ABSENCE of data IS the privacy model
```

### Token Budget Management (with Context Control):

```javascript
const TOKEN_BUDGET = 50000; // Conservative — leaves room for conversation

function selectContext(vaultFiles, message, budget = TOKEN_BUDGET) {
  // Step 1: Filter out 'off' notes entirely — they don't exist to Claude
  const active = vaultFiles.filter(f => f.context_mode !== 'off');

  // Step 2: 'always' notes + _FULKIT/ path → priority tier (always included)
  const always = active.filter(f =>
    f.context_mode === 'always' || f.path.includes('_FULKIT/'));

  // Step 3: 'available' notes → scored by relevance to current message
  const available = active.filter(f =>
    f.context_mode === 'available' && !f.path.includes('_FULKIT/'));

  const scored = available.map(f => ({
    ...f,
    score: relevanceScore(f, message)
  })).sort((a, b) => b.score - a.score);

  // Step 4: Fill budget — always first, then top-scored available
  let tokens = 0;
  const selected = [];

  // Always notes go in no matter what
  for (const file of always) {
    const fileTokens = estimateTokens(file.content);
    selected.push(file);
    tokens += fileTokens;
  }

  // Fill remaining budget with highest-relevance available notes
  // Below 0.1 relevance score = not worth including
  for (const file of scored) {
    const fileTokens = estimateTokens(file.content);
    if (tokens + fileTokens > budget) continue;
    if (file.score < 0.1) continue;
    selected.push(file);
    tokens += fileTokens;
  }

  return { selected, metadata: {
    includedCount: selected.length,
    alwaysCount: always.length,
    availableIncluded: selected.length - always.length,
    totalTokens: tokens,
    excluded: vaultFiles.length - selected.length
  }};
}

function estimateTokens(text) {
  // Rough estimate: 1 token ≈ 4 characters for English
  return Math.ceil(text.length / 4);
}
```

### Write-Back Implementation:

```javascript
// After receiving Claude's response, extract artifacts and let Chappie file them

async function writeBack(response, vaultHandle, storageMode) {
  const artifacts = extractArtifacts(response);
  // artifacts = { summaries: [], actionItems: [], notes: [], drafts: [] }
  // Each artifact includes a suggested folder path from Claude's triage

  for (const artifact of artifacts.all()) {
    const filename = generateFilename(artifact);
    const content = formatAsMarkdown(artifact);
    // Chappie determines the folder: 01-PERSONAL, 02-BUSINESS, 04-DEV, etc.
    // Falls back to 00-INBOX only if uncertain
    const folder = artifact.suggestedFolder || '00-INBOX';

    if (storageMode === 'local') {
      // Write directly to user's vault via File System Access API
      const dir = await vaultHandle.getDirectoryHandle(folder, { create: true });
      const file = await dir.getFileHandle(filename, { create: true });
      const writable = await file.createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      // Write to Fülkit Supabase storage
      await supabase.storage
        .from('vaults')
        .upload(`${userId}/${folder}/${filename}`, content);
    }
  }

  // Confirm to user what was filed and where
  return generateFilingConfirmation(artifacts);
}
```

### Conversation Window Management:

```javascript
// Client-side conversation state
const [messages, setMessages] = useState([]);
const [sessionId, setSessionId] = useState(null);

async function sendMessage(userMessage) {
  // Read vault context (fresh each time for local-first)
  const context = await readVaultContext(vaultHandle, userMessage);

  // Include full conversation history in request
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: userMessage,
      context: context,
      history: messages,     // Full conversation window
      sessionId: sessionId,
      preferences: userPreferences
    })
  });

  const data = await response.json();

  // Update local conversation state
  setMessages(prev => [
    ...prev,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: data.response }
  ]);

  // Write-back artifacts to vault
  await writeBack(data.response, vaultHandle, storageMode);

  // Optionally save session summary (if opted in)
  if (conversationHistoryEnabled) {
    await saveSessionSummary(sessionId, data.summary);
  }
}
```

---

## 17. Phase Roadmap

| Phase | What | Trust Model | Persistence |
|:---|:---|:---|:---|
| **Phase 1 (V1)** | Hybrid model. User picks: local-first, encrypted sync, or Fülkit storage. Write-back loop. Conversation windows. Opt-in history. | User-controlled. Default is Fülkit storage for simplicity. | Vault grows via write-back. Opt-in conversation summaries/transcripts. |
| **Phase 2 (V1.5)** | Client-encrypted sync polished. Mobile app reads from encrypted cloud. Offline whispers from cached context. | Zero-knowledge for encrypted users. | Encrypted vault syncs across devices. |
| **Phase 3 (V2)** | Client-side RAG. Embeddings computed in browser. Smarter context selection. | Compute moves to client. Server knows even less. | Better context selection = better conversations = better write-back. |
| **Phase 4 (future)** | Local model option. When models run well on consumer hardware, offer fully offline mode. | Zero-network. True house call. | Everything on device. Full autonomy. |

Each phase makes the trust model STRONGER. The trajectory is toward less server involvement, not more.

---

## 18. Legal & Compliance Legend

> This section is for legal review, compliance officers, and detail-oriented stakeholders. It documents every data handling commitment Fülkit makes, organized for audit.

### Data Classification

| Classification | Examples | Storage | Retention | User Control |
|:---|:---|:---|:---|:---|
| **Account data** | Email, subscription tier, message count | Supabase, encrypted at rest | Until account deletion | View, edit, delete, export |
| **Preference data** | Tone, whisper frequency, topic scope | Supabase, encrypted at rest | Until user clears or account deletion | View, edit, delete per-preference |
| **Referral data** | Referrer/referred relationships, credit amounts | Supabase, encrypted at rest | Until account deletion | View in account settings |
| **Conversation summaries** | AI-generated session summaries (OPT-IN) | Supabase, encrypted at rest | Until user deletes or opts out | View, edit, delete per-session, bulk delete |
| **Conversation transcripts** | Full message history (OPT-IN, explicit) | Supabase, encrypted at rest OR local vault | Until user deletes or opts out | View, edit, delete per-session, bulk delete, export |
| **Uploaded files** | User-uploaded docs, notes (Model C) | Supabase Storage, encrypted at rest, RLS-scoped | Until user deletes | Full CRUD, export as markdown zip |
| **Vault content (ephemeral)** | Local vault files sent during chat (Model A) | Server memory only, garbage collected after response | Duration of one API call | Not stored — nothing to delete |
| **Voice audio** | Recordings from The Hum | User's device only | User-controlled | Fülkit never stores audio |
| **Transcribed text** | Whisper API output from voice | Transient (processed like any chat message) | Duration of one API call (ephemeral) or written back to vault | User-controlled via vault |

### Third-Party Data Processors

| Processor | What they receive | Their data policy | Our contractual terms |
|:---|:---|:---|:---|
| **Anthropic (Claude API)** | System prompt + user context + messages | API inputs not used for training. Not stored beyond processing. | Standard API terms. Enterprise DPA available. |
| **OpenAI (Whisper API)** | Audio for transcription | API inputs not used for training (API policy). | Standard API terms. Audio not stored after transcription. |
| **Supabase** | Account data, preferences, opt-in conversation data, uploaded files | Data encrypted at rest. SOC 2 Type II compliant. | Data processing agreement in place. |
| **Stripe** | Payment information | PCI DSS Level 1. | Standard merchant agreement. Fülkit never sees full card numbers. |

### Compliance Posture

| Regulation | Status | How |
|:---|:---|:---|
| **GDPR** | Compliant by design | Right to deletion (core feature). Right to portability (markdown export). Right to access (transparency panel). Data minimization (we store minimum necessary). Lawful basis: contract (subscription). |
| **CCPA** | Compliant by design | No sale of personal information. Full disclosure of data collected. Deletion on request. Opt-out rights respected. |
| **SOC 2** | In posture (Supabase is SOC 2 Type II) | Fülkit's own infrastructure inherits Supabase's compliance. Additional audit planned at scale. |
| **HIPAA** | Not currently compliant | Would require BAA with Anthropic and Supabase. Possible for enterprise tier. Not Phase 1. |
| **FedRAMP** | Not currently compliant | Anthropic's API has FedRAMP path. Possible for government tier. Not Phase 1. |

### Data Deletion Protocol

When a user requests account deletion:

1. **Immediate:** Account disabled. User cannot log in.
2. **Within 24 hours:** All preference data deleted. All conversation summaries deleted. All conversation transcripts deleted. All uploaded files purged from Supabase Storage.
3. **Within 72 hours:** Referral records anonymized (credit relationships preserved for accounting but user identity removed).
4. **Within 30 days:** All backup systems purged of user data.
5. **Confirmation:** User receives email confirming deletion is complete.

Local vault content: unaffected. It was never on our systems.

### Data Breach Protocol

In the event of unauthorized access to Fülkit's infrastructure:

1. **Local-first users (Model A):** No user content at risk. Account metadata only.
2. **Encrypted sync users (Model B):** Ciphertext exposed but unreadable without user-held keys.
3. **Fülkit storage users (Model C):** Encrypted-at-rest content potentially at risk if encryption keys are compromised. Users notified within 72 hours per GDPR. Recommended action: export and delete.

**Mitigation:** The architecture minimizes blast radius by design. Local-first is the most secure mode. Users handling sensitive information are guided toward local-first during onboarding.

### Data in Transit

All data moving between the client, Fülkit's server, and third-party APIs (Anthropic, OpenAI, Supabase, Stripe) is encrypted via TLS 1.3. No exceptions. No fallback to unencrypted connections. This covers: chat messages, vault context payloads, file uploads, authentication tokens, and payment data. Data in transit is never transmitted in plaintext under any circumstances.

### Audit Trail

Fülkit logs the following for security and billing (NOT for content surveillance):

| Event | What's logged | What's NOT logged |
|:---|:---|:---|
| Authentication | Timestamp, user ID, IP address | — |
| Chat request | Timestamp, user ID, token count, model used | Message content, vault content |
| File upload (Model C) | Timestamp, user ID, filename, file size | File content |
| File deletion | Timestamp, user ID, filename | — |
| Preference change | Timestamp, user ID, key changed | — |
| Account deletion | Timestamp, user ID | — |

### Terms of Service Commitments (to be formalized in legal TOS):

1. Fülkit will not use user content to train AI models.
2. Fülkit will not sell, share, or monetize user content.
3. Fülkit will not serve advertising based on user content.
4. Fülkit will provide full data export in open formats (markdown, JSON) at any time.
5. Fülkit will execute deletion requests within the timeframes specified above.
6. Fülkit will notify users of any data breach within 72 hours.
7. Fülkit will provide 90-day notice before any acquisition or material change to data handling practices.
8. Fülkit's revenue model is subscription-based. User data is not an asset in any financial reporting.

---

## Changelog
- v1.0 — Trust Model spec. Ephemeral injection architecture. Five promises. Competitive positioning.
- v2.0 — Complete rewrite. Added: hybrid storage model (user chooses), persistence via conversation windows and write-back loop, inbox concept, upload option (Fülkit storage), developer workflows, enterprise/government positioning, comprehensive legal/compliance legend, data classification, deletion protocol, breach protocol, audit trail, TOS commitments. Addressed: how conversations survive sessions, how Fülkit writes back to the vault (context machine), how developers use it for coding, the biography use case, the upload button request.
- v2.1 — Six holes patched: (1) File System Access API browser compatibility noted — Chromium-only, Model C fallback, native app sidesteps. (2) Mid-session conversation compression for long sessions approaching token ceiling. (3) Auto-filing triage clarified as zero-cost — built into response metadata, not a separate API call. (4) TLS 1.3 data-in-transit encryption documented in legal section. (5) Competitive grid updated to acknowledge Claude.ai Projects — differentiator is automation and write-back, not raw capability. (6) Open-source data flow commitment hardened from "we intend to" to "before public launch." Goldman Sachs line marked for hero treatment on landing page.
- v2.2 — Added Section 10: Context Control. Three-state system (Always/Available/Off) for vault notes. Solves the "Shandy in every coding prompt" problem. Relevance scoring handles it by default — user overrides when they want to. Notes browser in settings shows what Claude sees. Token budget code updated to respect context_mode. Database schema updated with context_mode column. Repo access pattern documented for developers.
