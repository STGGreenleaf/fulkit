# Landing Page — v2 Refinements

> Ideas for after launch. Not urgent. Pick when the moment is right.

---

## The 3% (from Session 24 review)

### Product screenshot
- One cropped, warm monochrome screenshot of the chat interface
- Shows what the app actually looks like — the entire v1 page is text-only
- Could sit between Features and the ticker, or as a subtle background element
- Respect the Rams principle: show it, don't decorate it

### Real user quote
- Replace the hero usage quote ("I have one app open...") with a real user's words
- Even one genuine testimonial beats any crafted line
- Could also add 2-3 user quotes in the Problem section alongside the sourced stats
- Wait for 10+ real users before doing this — forced testimonials are worse than none

### Trial terms prominence
- "14 days free. No credit card. 150 messages." is inside PricingGrid in small text
- This is the strongest friction-killer on the page and it's whispering
- Consider: a standalone line above the pricing cards at base/lg size
- Or repeat it in the hero section near the first CTA button

---

## Design ideas

### Ticker: static vs animated
- Current: 60s horizontal scroll, 21 icons, seamless loop
- Rams argument: movement is decoration, a static grid says the same thing faster
- Counter-argument: ambient motion signals ecosystem depth without demanding attention
- Decision deferred — test with real users. If bounce rate is fine, keep it. If people scroll past without noticing, go static.

### Ticker: hover pause
- Pause animation on hover so users can read specific names
- Small touch but respects user agency

### Feature cards: micro-interactions
- Subtle hover lift on feature cards (shadow-sm → shadow-md)
- Not essential — current flat treatment is clean
- Only add if other pages get hover states too (consistency)

### Comparison grid: mobile experience
- Currently horizontal scroll on mobile — works but not ideal
- Alternative: stack as cards on mobile, each card = one competitor with their check/X list
- Or: simplified mobile grid showing only 4 competitors + Fülkit

### Dark mode landing page
- The warm monochrome palette has a natural dark inversion (#EFEDE8 ↔ #2A2826)
- Could respect system preference via prefers-color-scheme
- Big lift — every section needs testing. Park for v3.

---

## Copy ideas (from pitches, unused)

### Hero alternatives (if current usage quote ever feels stale)
- "Open it. Talk. It already knows."
- "Remember everything. Explain nothing."
- "It's not magic. It's memory."

### Problem section alternatives
- "You're not failing. Your stack is." (more aggressive)
- "The average app gets 5.8 days to prove its value before deletion." (Adjust, 2025)

### Pricing alternatives
- "Most referral programs give you a coupon. Ful-Up gives you a paycheck." (for users who know referral programs)
- "Stop paying for Fülkit. Start getting paid for it." (for power users / social posts)

### Trust alternatives
- "You wouldn't hand your journal to a stranger. So why do you hand your thoughts to an app that sells them?"
- "Big tech reads your email to sell you ads. We encrypt your notes so even we can't read them."

### Final CTA alternatives
- "Can't remember? Fülkit."
- "Too much to do? Fülkit."
- "Are you Fülking kidding me? $9/mo?"

---

## Data to collect for v2

- [ ] First 10 user quotes (ask during onboarding or after 7 days)
- [ ] Screenshot of chat interface (styled, cropped, warm monochrome)
- [ ] Bounce rate on landing page (Vercel Analytics)
- [ ] Scroll depth — do people reach the comparison grid?
- [ ] Click-through rate on [Get Fülkit] buttons (hero vs final CTA)
- [ ] Trial → paid conversion rate (validates pricing section)
- [ ] Which competitors users actually switched from (validates grid columns)

---

*Created: Session 24, 2026-03-27*
