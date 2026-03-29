# The Bestie Test v2 — Fülkit Onboarding Engine

> The questionnaire IS the tutorial. Every question teaches a feature. Every answer activates something the user can go see. No separate walkthrough. No tooltip tour. Just a conversation that sets up the entire product.
>
> Owner-editable at `/settings/owner/questions`
> See also: [buildnotes.md](buildnotes.md), [trust-model.md](trust-model.md), [crate-spec.md](crate-spec.md)

---

## v1 → v2 Changes

- Questionnaire is now the product tutorial — not just data collection
- Every tier ends with a **feature assignment** ("go check your ___")
- Header status line shows tier progress during 14-day trial
- Privacy/trust language woven INTO questions, not a separate disclosure
- Multiple choice wherever possible — lower friction, lower guard
- Filing system is Fülkit's system — Dieter Rams, set it and forget it, not configurable
- Fülkit voice is THE voice — bestie that pushes, never coddles, not user-tunable
- Removed "what topics should I avoid" — besties read the room
- Integration unlock (Spotify/Square) in Tier 1 to demo B-Sides early
- Users MUST visit features on the site between tiers — not just answer questions

---

## Header Status Line

The existing credit status line transforms during the 14-day trial into a living progress tracker.

### States

```
Day 1:   "Day 1 of 14 · Let's get started — Tier 1 of 5"
Day 4:   "Day 4 of 14 · Getting to Know You — Tier 2 of 5"
Day 8:   "Day 8 of 14 · Your brain's taking shape — Tier 3 of 5"
Day 12:  "Day 12 of 14 · Almost dialed in — Tier 4 of 5"
Day 15:  "Day 15 of 14 · The deep stuff — Tier 5 of 5"
Done:    "Day 18 of 14 · Fülkit's dialed in. 12 days to fall in love."
Post-14: Reverts to credit status line (Fül balance, plan tier)
```

### Progress bar
Subtle, beneath the status text. Fills per tier completion (20% per tier). Animates on tier complete. Warm monochrome — uses `var(--color-text-dim)` fill against `var(--color-border-light)` track.

### Incomplete tiers after 14 days
Bar stays as a gentle invitation. Nothing locks. Nothing nags. The open loop does the work.

---

## Pacing Rules

1. **Users can blitz all 5 tiers in one sitting.** No time gates.
2. **But they MUST visit the feature they just activated.** Answering questions alone doesn't complete a tier — the feature assignment does. This is the tutorial.
3. **If they pause mid-tier,** Fülkit nudges at natural moments inside the app — not push notifications. Contextual: "You've got two more in Tier 2 whenever you're ready."
4. **Periodic reminders** during the 14 days if tiers are incomplete. Friendly, never nagging. Woven into whispers.
5. **"Do it all now" option** always available — a single "Let's do this" button that runs the full questionnaire. But feature assignments still require visiting each area.

---

## Trust & Privacy Language

Privacy is not a separate disclosure. It's woven into the questions themselves. Every tier opener includes a trust line. The language is casual, direct, and designed for skeptics.

### Core principles for trust copy:
- **"Your data, your device"** — repeated naturally, not as a slogan
- **"Burn after reading"** — everything is local-first
- **"I don't build a profile on you — you're building one for yourself"**
- **"Fülkit never saves your profile. You do."**
- **Explain the mechanic, not just the promise** — "This lives in YOUR files. Delete it and it's gone. I don't keep a copy."
- **Never say "we respect your privacy"** — that's corporate. Say what actually happens.

---

## The Questions

### TIER 1: "Let's get you set up" (5 questions + 1 feature assignment)
*Teaches: voice/text capture, inbox, how Fülkit files things, first integration*

**Tier opener (trust line):**
> *"Everything you tell me stays in your files unless you decide otherwise. I don't build a profile on you — you're building one for yourself. I just read what you let me read. That's the deal."*

---

**Q1: "What should I call you?"**
- Type: `text_input`
- Why it matters: Creates identity file. Everything starts with a name.
- What Fülkit does: Creates `01-PERSONAL/About-[Name].md`
- Follow-up: None

---

**Q2: "Where are you based?"**
- Type: `text_input`
- Why it matters: Time zones, local context, recommendations.
- What Fülkit does: Stores timezone, seeds location-aware features (weather, local recs)
- Follow-up: None

---

**Q3: "What do you do?"**
- Type: `single_select` + `text_input` fallback
- Options: `[Employee]` `[Self-employed]` `[Student]` `[Between things]` `[Retired]` `[Something else →]`
- Why it matters: Shapes whether Fülkit thinks in terms of bosses, clients, customers, or professors.
- What Fülkit does: Seeds work context for AI responses
- Follow-up if self-employed: "What's the business?" (text input)
- Follow-up if employee: "What field?" (text input)

---

**Q4: "What are you working on right now? Give me two or three things — messy is fine."**
- Type: `text_input` (voice enabled)
- Why it matters: This is the first real capture. Teaches them the product works.
- What Fülkit does: Takes the answer, creates notes, files them into the inbox automatically.
- Trust line: *"Whatever you say here becomes a note in YOUR files. Not mine. Yours. Delete it anytime and it's gone — I don't keep a copy."*

---

**Q5: "Connect something so I can show you what I do."**
- Type: `integration_picker`
- Options: `[Spotify]` `[Google Calendar]` `[Apple Calendar]` `[I'll do this later]`
- Why it matters: Unlocks a live feature demo. If Spotify → B-Sides becomes available immediately. If Calendar → Fülkit shows it can read their schedule.
- What Fülkit does: Runs OAuth flow for chosen integration.
- If Spotify: *"Nice. You just unlocked B-Sides — your own music brain. It lives right here on the site. Think of it as your personal DJ and record store guy in one. Go check it out when you're ready."*
- If Calendar: *"Connected. I can see what's on your plate now. I'll never add anything without asking — but I can remind you about what's coming."*
- If skip: *"No worries. You can connect stuff anytime in settings."*

---

**FEATURE ASSIGNMENT — Tier 1:**
> *"I just filed what you told me into your inbox. Go take a look — you'll see how I organize things so you don't have to."*
> → Directs user to `00-INBOX` view
> → If Spotify was connected: *"Also — go check out B-Sides. Be your own DJ. Make a set. Or let B-Sides do it for you."*
> → Tier 1 completes when user visits inbox (and optionally B-Sides)

---

### TIER 2: "How your brain works" (4 questions + 1 feature assignment)
*Teaches: search, the filing system, threads, Context Control settings*

**Tier opener (trust line):**
> *"Quick reminder — this is burn-after-reading technology. Everything lives locally in your files. I process what you share with me to be helpful, then the conversation is done. I'm not building a dossier. You are building a brain — and you hold every key to it."*

---

**Q6: "When you save something, how do you usually try to find it later?"**
- Type: `single_select`
- Options: `[I search for what it was about]` `[I try to remember when I saved it]` `[I scroll until I see it]` `[I usually can't find it]`
- Why it matters: Shapes how Fülkit prioritizes search results — content match vs. timeline vs. surfacing things proactively.
- What Fülkit does: Configures search ranking weights internally

---

**Q7: "What keeps falling through the cracks?"**
- Type: `multi_select`
- Options: `[Follow-ups]` `[Ideas I had but forgot]` `[Tasks I said I'd do]` `[Links and articles]` `[Personal errands]` `[Projects I started]`
- Why it matters: Tells Fülkit where to focus whispers and what to watch for.
- What Fülkit does: Creates a whisper focus profile. Sets up a sample reminder or follow-up based on their answer.

---

**Q8: "Here's where your stuff lives."**
- Type: `feature_walkthrough` (not a question — a reveal)
- What Fülkit does: Opens `/threads` view and walks through the buckets:
  - `Personal` — your life, your people, your goals
  - `Work` — career, business, professional context
  - `Ideas` — raw sparks with no home yet
  - `Reference` — stuff you want to keep but not act on
  - `+ Custom` — make your own buckets anytime
- Copy: *"This is your file system. I built it, I maintain it, and I file things here for you automatically. You don't need to organize anything — that's my job. But you can peek in anytime and see exactly what I know. Move things around if you want, but honestly? Just let it work."*
- Trust line: *"Every file here is yours. It's all markdown — plain text you can open anywhere. Export it, delete it, take it somewhere else. No lock-in. I organized it so I can find things for you fast. That's the only reason it's structured this way."*

---

**Q9: "Go check your Context Control."**
- Type: `feature_walkthrough` (directs to settings)
- What Fülkit does: Opens Context Control in settings. Shows the three-state toggle:
  - `Always` — Fülkit always sees this context
  - `Available` — Fülkit can access if relevant
  - `Off` — Fülkit can't see this
- Copy: *"This is how you control what I can see. Three settings. You can see exactly what I know about you — the full collection — and dial each thing up or down. Nothing hidden. Nothing I see that you can't."*
- Trust line: *"Most apps don't let you see what they know about you, let alone turn it off. This is yours to control. Always."*

---

**FEATURE ASSIGNMENT — Tier 2:**
> *"Try searching for one of the things you told me in Tier 1. Just a word or two. See what comes back."*
> → Directs user to search
> → Also: *"Check your task list. I set something up based on what keeps falling through your cracks."*
> → Tier 2 completes when user performs a search or visits threads

---

### TIER 3: "What matters to you" (4 questions + 1 feature assignment)
*Teaches: calendar integration, reminders, personal/work coexistence, whispers*

**Tier opener (trust line):**
> *"I'm about to ask some personal stuff. Not because I need it — because the more I understand what your actual life looks like, the better I don't let things slip. Skip anything. The skips tell me something too. And same deal: this all lives in your files. Not ours. Yours."*

---

**Q10: "Outside of work, what are you into right now?"**
- Type: `text_input` (voice enabled)
- Why it matters: Seeds personal context so Fülkit isn't a work-only tool.
- What Fülkit does: Creates a thread/tag in the personal bucket. Gives it its own corner.
- Copy after answer: *"I just gave that its own space in your brain. Drop stuff in there anytime — I'll keep it separate from work."*

---

**Q11: "Is there something you're working toward this year?"**
- Type: `text_input` with `[Skip]` option
- Why it matters: If they answer, Fülkit creates a milestone note with a gentle recurring check-in.
- What Fülkit does: Creates goal note, schedules a soft check-in.
- Copy after answer: *"Check your calendar. I left something there for you."*
- If skipped: No action, no guilt.

---

**Q12: "Who comes up a lot? Just first names — so I know who 'Mike' is when you mention him."**
- Type: `text_input` (lightweight — names only, optional relationship)
- Why it matters: Context seeding. Not a contacts list — just names Fülkit can recognize in future conversations.
- What Fülkit does: Stores name associations in personal context
- Trust line: *"I'm not storing contacts or phone numbers. Just names so I don't ask 'who's Mike?' every time you mention him. Delete any of these from your files anytime."*

---

**Q13: "How often do you want me checking in?"**
- Type: `single_select`
- Options: `[A couple times a day]` `[Once a day is plenty]` `[Only when I ask]` `[Surprise me — I'll tell you if it's too much]`
- Why it matters: Sets whisper frequency from day one.
- What Fülkit does: Configures whisper cadence

---

**FEATURE ASSIGNMENT — Tier 3:**
> *"If you told me a goal, check your calendar — I put a check-in there. If you told me what you're into, go look at your threads — it has its own space now."*
> → Directs user to calendar and/or threads
> → If Spotify was connected in Tier 1: *"Also — have you checked out B-Sides yet? Go make a crate. Import a playlist. Let the Record Store Guy show you some deep cuts."*
> → Tier 3 completes when user visits calendar or threads

---

### TIER 4: "Show me how you work" (4 questions + 1 feature assignment)
*Teaches: quick capture, whisper behavior, the action list, the write-back loop*

**Tier opener (trust line):**
> *"Almost dialed in. These last few shape how we actually work together day to day. Same rules — your files, your device, your call. Everything I learn here makes me faster at helping you. Nothing leaves unless you send it."*

---

**Q14: "How do you capture ideas right now?"**
- Type: `single_select`
- Options: `[Notes app on my phone]` `[Voice memos]` `[I don't — they disappear]` `[Paper / journal]` `[A specific app →]`
- Why it matters: Determines whether Fülkit pushes voice capture (The Hum), quick text capture, or meets them where they are.
- What Fülkit does: Adjusts UI emphasis — voice orb prominence, quick-capture widget visibility

---

**Q15: "Are you more of a morning person or night owl?"**
- Type: `single_select`
- Options: `[Early bird]` `[Night owl]` `[Depends on the day]`
- Why it matters: Determines when whispers arrive and when Fülkit checks in.
- What Fülkit does: Sets whisper timing window

---

**Q16: "Want a morning briefing? Scores, news, weather — or just your stuff?"**
- Type: `multi_select`
- Options: `[Weather]` `[Sports scores]` `[News headlines]` `[Just my stuff — no briefing]`
- Why it matters: Tells Fülkit whether to be a morning dashboard or stay focused on the brain.
- Follow-up if sports: "Which teams?" (text input)
- Follow-up if news: "What topics?" (text input)
- What Fülkit does: Configures morning whisper content

---

**Q17: "What's one thing you wish an app could do for you that none of them do?"**
- Type: `text_input`
- Why it matters: This is the gold. Tells Fülkit what magic moment to create for THIS user specifically.
- What Fülkit does: Stores as a high-priority context note. Fülkit will try to deliver on this.

---

**FEATURE ASSIGNMENT — Tier 4:**
> *"Try capturing something right now. Say it out loud or type it — whatever you picked. Watch where it goes."*
> → Directs user to voice orb (The Hum) or quick capture, depending on Q14 answer
> → Also: *"Check your action list. I built it from everything you've told me so far."*
> → Tier 4 completes when user uses capture and views the action list

---

### TIER 5: "The real stuff" (4 questions + 1 feature assignment)
*Teaches: the full power of a second brain that knows you. This is the "holy shit" tier.*

**Tier opener (trust line):**
> *"You've been here a minute now. I know how you think, what you're working on, and what you care about. This last round isn't about setup — it's about letting me actually help. Your files. Your brain. I'm just the one paying attention."*

---

**Q18: "What's the thing you keep meaning to get to but never do?"**
- Type: `text_input` with `[Skip]` option
- Why it matters: Fülkit breaks it into a first step and puts it on the action list.
- What Fülkit does: Creates a single, small first step — not a full plan.
- Copy after answer: *"Check your tasks. I didn't plan the whole thing — just the first move."*

---

**Q19: "What stresses you out most right now?"**
- Type: `single_select` with `[Skip]` option
- Options: `[Money]` `[Health]` `[Relationships]` `[Work]` `[Time — never enough]` `[Nothing major]` `[Rather not say]`
- Why it matters: Fülkit becomes aware without adding pressure. Won't pile on in these areas.
- What Fülkit does: Sets stress-aware whisper calibration. Doesn't nag about stressors — just knows.
- Trust line: *"I'm not a therapist and I won't pretend to be. But if money stresses you out, I'm not going to send you a whisper about your budget at 11pm. Context matters."*

---

**Q20: "What does a really good day look like for you?"**
- Type: `text_input` with `[Skip]` option
- Why it matters: This is Fülkit's north star. If a good day includes a workout and family dinner, Fülkit nudges toward that pattern.
- What Fülkit does: Creates "good day" reference note. Shapes long-term whisper direction.

---

**Q21: "If I could magically handle one recurring annoyance in your life, what would it be?"**
- Type: `text_input` with `[Skip]` option
- Why it matters: Fülkit proposes an automation or recurring workflow.
- What Fülkit does: Creates a suggestion based on context — a recurring task, a template, a reminder pattern.

---

**FEATURE ASSIGNMENT — Tier 5:**
> *"Go check your action list. Go check your threads. Look at your calendar. Everything you've told me across all five tiers is in there — organized, connected, and working for you. This is your brain now."*
> → Directs user to do a full walk-through of their own setup
> → Fülkit pulls from EVERYTHING it now knows and makes a real, contextualized observation — not generic advice. This is the "holy shit it actually knows me" moment.
> → Tier 5 completes. Progress bar fills. Status line shifts to the countdown message.

---

## Completion States

### All tiers complete
```
Header: "Day [X] of 14 · Fülkit's dialed in. [Y] days to fall in love."
```
Fülkit sends a final whisper:
> *"Your brain's built. I'll keep learning as we go — but the foundation is solid. You don't need to think about setup anymore. Just use me."*

### Partial completion at day 14
Progress bar stays. No lockout. No guilt. Just an open loop:
```
Header: "Tier 3 of 5 · Pick up where you left off?"
```

### User wants to redo answers
Available in settings anytime. Answers can be edited. Fülkit adjusts behavior in real time.

---

## Question Schema (for `/settings/owner/questions`)

Every question is stored as an editable object. Owner can modify copy, options, order, and feature assignments without touching code.

```json
{
  "id": "q1",
  "tier": 1,
  "order": 1,
  "type": "text_input",
  "question": "What should I call you?",
  "options": null,
  "allow_skip": false,
  "allow_voice": false,
  "trust_line": null,
  "why_it_matters": "Creates identity file. Everything starts with a name.",
  "fulkit_action": "create_identity_file",
  "follow_up": null,
  "copy_after_answer": null
}
```

### Question types
- `text_input` — free text, optional voice
- `single_select` — pick one, optional "Something else →" text fallback
- `multi_select` — pick multiple
- `integration_picker` — OAuth integration cards
- `feature_walkthrough` — not a question, a guided reveal of a feature

### Editable fields (owner portal)
- `question` — the question text (Chappie voice)
- `options` — array of choice labels (for select types)
- `trust_line` — privacy copy shown with the question
- `copy_after_answer` — what Fülkit says after they answer
- `order` — position within the tier
- `allow_skip` — whether "Skip" is available
- `allow_voice` — whether voice input is enabled

### Non-editable fields (structural)
- `id` — unique identifier
- `tier` — which tier it belongs to
- `type` — question type
- `fulkit_action` — what the system does with the answer
- `follow_up` — conditional follow-up logic

---

## Feature Assignment Schema

```json
{
  "tier": 1,
  "assignment_copy": "I just filed what you told me into your inbox. Go take a look.",
  "primary_destination": "/inbox",
  "secondary_destination": "/b-sides",
  "secondary_condition": "spotify_connected",
  "completion_trigger": "visited_inbox"
}
```

### Completion triggers
- `visited_inbox` — user opened the inbox view
- `performed_search` — user used search
- `visited_threads` — user opened /threads
- `visited_calendar` — user checked calendar
- `used_capture` — user used voice or quick capture
- `visited_action_list` — user viewed action list
- `visited_settings` — user opened Context Control settings
- `visited_bsides` — user opened B-Sides (bonus, not required)

---

## How Answers Map to the Brain

| Tier | What it creates | Features taught |
|:---|:---|:---|
| 1: Setup | `01-PERSONAL/About-[Name].md`, first notes in inbox, integration connected | Capture, inbox, auto-filing, B-Sides |
| 2: How you think | Search config, whisper focus, thread awareness, Context Control | Search, /threads, file system, Context Control settings |
| 3: What matters | Personal threads, goal notes, calendar entries, people context, whisper frequency | Calendar, reminders, personal/work separation, whispers |
| 4: How you work | Capture mode, timing prefs, briefing config, magic wish | Voice/text capture (The Hum), action list, morning briefing |
| 5: The deep stuff | First-step tasks, stress calibration, good-day north star, automation suggestions | Full brain power — contextualized AI, write-back loop |

---

## Quick Onboard (minimum viable bestie)

If a user wants the fast path: **Tier 1 (Q1–Q5) + Q7 + Q13**. That's 7 questions, ~3 minutes.

Enough for: a name, a location, work context, first notes filed, an integration connected, cracks identified, and whisper frequency set. Everything else builds through use and Fülkit nudges them toward remaining tiers.

---

## Reminders & Nudges

Fülkit weaves tier completion nudges into natural moments — never as push notifications or modal interrupts.

**Examples:**
- User opens the app on day 5, Tier 2 incomplete: *"Got a sec? Two more questions and your search gets way smarter."*
- User is in /threads but hasn't done Tier 2 Q8: *"You found threads on your own — nice. Want me to walk you through how I organize things in here?"*
- User is in B-Sides but hasn't done Tier 3: *"You're already digging crates. Tier 3 helps me understand what you're into outside of music too."*
- Day 20, Tier 4 incomplete: *"10 days left on your trial. Tier 4 takes two minutes and unlocks your morning briefing."*

**Rules:**
- Maximum one nudge per session
- Never interrupt an active task
- Never repeat the same nudge copy twice
- Nudges stop once all tiers are complete
- Nudges are contextual — tied to where the user IS in the app

---

## Changelog
- v1.0 — Original bestie-test. 20 questions, 6 phases. Data collection focus.
- v2.0 — Complete rewrite. Questionnaire becomes the tutorial. Tier progress in header. Privacy woven into questions. Feature assignments between tiers. Owner-editable question bank. Integration unlock in Tier 1 for B-Sides. Filing system is Fülkit's way (Dieter Rams). Fülkit voice is THE voice. Multiple choice prioritized. 21 questions across 5 tiers.
