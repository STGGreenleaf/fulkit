# Spec: Fulkit Habits — The Invisible Tracker

## Philosophy
No habit app. No checkboxes. No guilt. You tell Chappie what you do, and Fulkit handles the rest. Whispers remind you. Integrations confirm you. The vault logs it. The dashboard shows it only if you use it.

**"I whiten my teeth the first Sunday of every month."** One sentence. Habit created, automation set, streak starts. That's the entire UX.

## Core Principles
1. **Conversational creation** — say it naturally, Chappie parses it
2. **Invisible until activated** — no dashboard clutter for users who don't track
3. **No shame** — missed days don't stack guilt. Chappie asks once, quietly
4. **Auto-detection** — integrations confirm habits without self-reporting (Strava → workout, Fitbit → sleep/steps, Readwise → reading)
5. **Catch-up mode** — after absence, one clean list of what came due. Check off what's done, dismiss the rest
6. **Vault-synced** — habit history writes to `_FULKIT/habits.md` on desktop

## Three Habit Patterns

### Pattern 1: Yes/No Streaks
"Did I do the thing?"
- Whiten teeth (monthly), take vitamins (daily), meditate (daily)
- Whisper asks → user taps done → streak increments
- Simple boolean per day

### Pattern 2: Quantified
"How much of the thing?"
- Glasses of water (daily count), books read (running total), miles walked
- Some auto-fill from integrations, some manual via whisper reply
- Whisper: "How many glasses today?" → "6" → logged

### Pattern 3: Cycle / Predictive
"When is the thing next?"
- Menstrual cycle, hair appointment, oil change, dental cleaning
- Logs when it happened → predicts when it's next
- "Your last dental cleaning was October — you're due"
- Sensitive data stays in vault (trust model differentiator)

## Schedule Language (Chappie parses)
- "every day", "daily", "weekdays", "school days only"
- "every other week", "twice a month"
- "first Sunday of every month"
- "every 3 weeks", "every 90 days"
- "only in summer" (seasonal — deactivate Oct-Mar)

## Behavior Rules

### On miss:
- Do NOT stack whispers for missed days
- After 2+ missed check-ins, one quiet whisper: "Been a few days — still want me to check in on [habit]?"
- Yes → streak resets quietly, tracking continues
- No → habit pauses (not deleted). Can reactivate anytime

### On snooze:
- "Not now" pushes to tomorrow, doesn't dismiss
- Floating — if it was due Tuesday and snoozed, shows Wednesday

### On return (catch-up mode):
- User returns after absence (detected by no activity for 3+ days)
- One consolidated whisper: "Welcome back. A few things came due while you were away:"
- Clean checklist of overdue habits
- User checks off what was done, dismisses what wasn't
- No broken-streak shame, just "let me get you current"

### Auto-detection:
- After any tool execution (Strava activity logged, Square closed out, note created, commit pushed), check if a matching habit exists
- If match → auto-complete that day's check-in
- Whisper: "Looks like you got your workout in — I checked it off for you"

### Passive creation:
- User says "ugh I forgot the air filter again"
- Chappie offers: "Want me to remind you? How often do you usually change it?"
- One exchange → habit created. No settings page.

## Data Model

### `habits` table
```sql
CREATE TABLE habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  frequency text NOT NULL,        -- "daily", "weekly:mon", "monthly:1:sun", "every:21", "seasonal:apr-sep:daily"
  category text DEFAULT 'general', -- health, household, beauty, fitness, learning, work
  track_type text DEFAULT 'boolean', -- boolean, count, cycle
  auto_source text,               -- "strava", "fitbit", "github", "square", null=manual
  streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_completed date,
  next_due date,
  paused boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own habits" ON habits FOR ALL USING (auth.uid() = user_id);
```

### `habit_logs` table
```sql
CREATE TABLE habit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id uuid REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at date NOT NULL,
  value text,                     -- null for boolean, "6" for count, notes
  auto boolean DEFAULT false,     -- true if auto-detected from integration
  created_at timestamptz DEFAULT now()
);

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own logs" ON habit_logs FOR ALL USING (auth.uid() = user_id);
```

## Chat Tools
- `habit_create` — title, frequency (natural language), category, track_type, auto_source
- `habit_check` — mark a habit complete (today or specific date), optional value for counts
- `habit_list` — show active habits with streaks
- `habit_pause` / `habit_resume` — pause without deleting
- `habit_catchup` — show overdue habits as a checklist

## Dashboard (only if user has habits)
- Single row below actions: streak dots (filled = done, empty = missed, grey = future)
- Or mini heatmap (GitHub contribution style) — warm grey tones
- Tap to expand, see full history in chat
- Not a card, not a section — just a quiet line

## Whisper Integration
- Automation creates daily/weekly/monthly whisper based on habit frequency
- Whisper text is warm, not robotic: "Teeth whitening day" not "HABIT DUE: Whiten teeth"
- Catch-up whisper after absence: consolidated list, not individual items

## Vault Sync
- `_FULKIT/habits.md` updated on each check-in
- Format: habit name, streak, last completed, history
- Syncs to desktop via existing cross-device sync

## Use Cases (from discussion)
- **Health**: hydration, vitamins, skincare routine, sunscreen, medication refill
- **Beauty**: teeth whitening, hair appointment, beauty treatments
- **Cycle**: menstrual tracking (sensitive — vault-first), dental cleanings
- **Household**: HVAC filter, Brita filter, flea treatment, deep cleaning, Costco runs
- **Kids**: school picture day, permission slips, haircuts, medication
- **Fitness**: workouts (Strava auto), steps (Fitbit auto), sleep consistency
- **Learning**: reading streak (Readwise auto), books read count
- **Work**: daily standup, close out register, ship code (GitHub auto)

## NOT in scope
- Calorie counting / nutrition tracking (Chappie can log a food journal conversationally, but no macro tracking)
- Shared household habits (V2 — needs multi-user workspace)
- Gamification (no points, no badges, no rewards — just streaks)

## Build Order
1. DB tables (habits + habit_logs)
2. Chat tools (habit_create, habit_check, habit_list, habit_pause, habit_catchup)
3. Whisper/automation integration (habit creates automation, automation creates whisper)
4. Auto-detection hooks (post-tool-execution check)
5. Dashboard row (conditional, only if habits exist)
6. Vault sync (_FULKIT/habits.md)
7. Catch-up mode (absence detection + consolidated whisper)
