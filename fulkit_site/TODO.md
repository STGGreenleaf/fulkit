# Fulkit — Milestone: Launch Hardening

> Phases 1–5.5 complete. Security audit done. Performance polished. Product works.
> Now: harden for real users. Previous phases archived in `md/archive/todo-phases-1-5.md`.

---

## Part 1: What's Next

> The 10 things to build, ordered by impact. Top 3 are non-negotiable before inviting users.

- [ ] **Error monitoring (Sentry)** — Add `@sentry/nextjs`. Wrap chat route + React error boundaries. Free tier. Without this, production bugs are invisible. Non-negotiable.
- [ ] **CI/CD pipeline** — GitHub Actions: `npm run build && npm test` on every push to main. Prevent broken deploys. One YAML file.
- [ ] **Database indexes** — Composite indexes on `(user_id, created_at)` for notes, conversations, messages, actions. One SQL migration. Prevents query slowdown at 10K+ users.
- [ ] **Mobile responsive layout** — Sidebar → hamburger on mobile. Landing page responsive. Chat input usable on phone. 0 @media queries exist today — 50%+ of traffic will be mobile.
- [ ] **Shareable conversation links** — `/share/[id]` read-only public view of a conversation. Users can't share their "aha moment" today. Every competitor has this. Unlocks word-of-mouth.
- [ ] **Feedback button in UI** — The `/api/feedback` endpoint exists, tickets table exists, owner can view/manage them. But there's no UI to reach it. Add "Send feedback" in Settings footer + on error states.
- [ ] **Welcome email** — Add Resend (free tier, 100/day). Send welcome email on signup. Quick-start guide. Re-engagement hook.
- [ ] **Keyboard shortcuts** — Cmd+Enter to send message. Escape to close modals. Cmd+K for search. Power user basics.
- [ ] **Loading skeletons** — Dashboard, Actions, Settings show skeleton placeholders during data fetch instead of blank screen.
- [ ] **Spotify Extended Quota** — Request from Spotify developer dashboard. Currently Development Mode (only Collin's account works).

---

## Part 2: Watch List

> Not broken today, but will break at scale. Monitor, don't build yet.

| What | Trigger | Where to Check |
|------|---------|---------------|
| **Supabase connection limits** | 100+ concurrent users | Supabase dashboard → Database → Connections |
| **Vercel function timeout** | Chat route with tool calls > 10s | Vercel dashboard → Functions → Duration. May need Pro ($20/mo) for 60s. |
| **Anthropic API costs** | Non-BYOK users cost ~$0.015/msg | Owner dashboard → MRR vs API spend. Cost ceiling exists but watch actuals. |
| **Redis rate limit capacity** | Upstash free tier exhausted | Upstash console → Usage. Upgrade to paid ($10/mo) when needed. |
| **Voyage embedding costs** | 10K+ users × 50 notes each | Voyage dashboard → Usage. ~$0.02/M tokens. |
| **OAuth token refresh storms** | Many integrations refreshing simultaneously | Radio tab → `token_refresh_failed` signals. `safeGet()` handles gracefully. |
| **Bundle size** | Slow first load on mobile 3G | DevTools → Lighthouse → Performance. Chat route is 2768 lines, owner page 6166. |
| **Supabase RLS performance** | 1M+ rows, complex policies | Supabase dashboard → Query performance. RLS adds 50-100ms per query at scale. |
| **pgvector index rebuild** | 100K+ notes, search quality drops | Run `REINDEX INDEX idx_notes_embedding;` quarterly. IVFFlat degrades without it. |
| **Stripe webhook reliability** | Missed `payment_failed` event | Stripe dashboard → Webhooks → Failed deliveries. No retry monitoring built yet. |

---

## Part 3: Manager's Choice

> Strategic bets. Not urgent, not obvious, but high-leverage. Pick when the moment is right.

1. **Mobile app via PWA push** — Service worker + manifest already exist. Add Web Push notifications (free via Firebase). Users get "new whisper" alerts on phone. Makes Fulkit sticky without an app store.
2. **Conversation templates** — Pre-built starters: "Plan my week", "Review my metrics", "Brainstorm ideas". Reduces blank-screen anxiety for new users. Low effort, high retention.
3. **Weekly digest email** — Every Monday: open actions, recent Whispers, Fül usage. Drives re-engagement without being pushy. Resend makes this cheap once welcome email is built.
4. **Team/workspace tier** — Multi-user workspace with shared notes + context. Requires workspace table, role-based access, shared vault. Big build but unlocks B2B revenue.
5. **Voice-first chat** — The Hum infrastructure exists. Wire it to chat: speak → transcribe → send → TTS response. Hands-free Fulkit.
6. **Shareable mixes** — Public URLs for Fabric crates/mixes. Social sharing for the music side.
7. **Conversation branching** — Fork a conversation: "What if I took this approach instead?" Power feature for thinking partners.
8. **API for developers** — Public REST API for notes, conversations, actions. Opens ecosystem.
9. **Embeddable widget** — Drop Fulkit chat into any website via `<script>` tag. Lead gen for SaaS customers.
10. **Plugin marketplace** — Let users build custom MCP tools that plug into chat. Community-driven integrations.

---

## Still Open (carried forward)

> Items from earlier phases that are external or infrastructure tasks.

- [ ] Fabric auto-analyze (production) — $5/mo VPS with yt-dlp + ffmpeg
- [ ] Spotify App — Extended Quota Mode (Spotify dashboard)
- [ ] Domain verification for Spotify OAuth redirect URI
- [ ] Fabric isolation — own routes, own lib, own components
- [ ] SoundCloud API integration (pending Artist Pro + API approval)

## Future Phases (unchanged)

### Phase 6: MCP Integrations
- [ ] Git, Spotify, Google Calendar, Gmail, Obsidian, Stripe, Vercel
- [ ] Custom MCP server scaffold

### Phase 7: Fulkit Builds Fulkit
- [ ] Claude reads/writes project files, runs commands, creates PRs
- [ ] Full dev loop inside Fulkit — one surface for everything

---

**Critical path:** ~~Deploy~~ → ~~Auth~~ → ~~Core~~ → ~~Onboarding~~ → ~~Actions~~ → ~~Dogfood~~ → ~~Context~~ → ~~Pricing~~ → ~~Security~~ → ~~Polish~~ → **Launch Hardening** → Growth → MCP → Self-building
