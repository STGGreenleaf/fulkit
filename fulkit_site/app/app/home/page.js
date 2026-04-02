"use client";

import { useState, useEffect } from "react";
import { Bell, CheckSquare, LineSquiggle, Zap, MessageCircle, MessageCircleX, ListPlus, Sparkles, X, Upload, Home, Activity, Flame, Blend, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import OnboardingStatusLine from "../../components/OnboardingStatusLine";
import { supabase } from "../../lib/supabase";
import { SEAT_LIMITS, TIERS } from "../../lib/ful-config";
import { useIsMobile } from "../../lib/use-mobile";
import { DashboardSkeleton } from "../../components/Skeleton";


const TIPS = [
  "Cmd+Shift+C opens Tiny Fülkit — a floating side window while you work anywhere else.",
  "Drop any file into chat — PDF, CSV, image — Fülkit reads it, triages it, extracts what matters.",
  "Say \"save this\" in chat and Fülkit distills the conversation into a permanent note.",
  "\"86 the green smoothie\" — marks it sold out across Square instantly. No dashboard needed.",
  "Cmd+K snaps your cursor to the chat input — no scrolling, no clicking. Instant typing.",
  "/recall [topic] searches your notes by meaning, not keywords. Semantic, not literal.",
  "\"Watch nytimes.com/tech daily\" — Fülkit whispers you when the page changes.",
  "Say \"standup\" — yesterday's wins, today's calendar, open blockers. One word.",
  "Tap the orb on /hum. Talk. No typing, no transcript on screen. Just voice.",
  "\"What time's golden hour tomorrow?\" — instant sunset data for photography.",
  "Your music becomes a live landscape on /fabric. Signal Terrain renders audio in real time.",
  "\"Is my email in a breach?\" — checks Have I Been Pwned right from chat.",
  "\"What if we priced this at $15?\" — Numbrly simulates margins across all your recipes.",
  "Your vault has 3 modes — local-only, encrypted sync, or Fülkit-managed. Your data, your rules.",
  "\"How many calories in a banana?\" — USDA nutrition data, no app switching.",
  "9 friends = free forever. Referrals cover your subscription automatically.",
  "Whispers are proactive — Fülkit notices things and suggests before you ask.",
  "\"Every Monday at 9am, pull my P&L\" — automated recurring tasks, no reminders needed.",
  "Cmd+N starts a new chat from anywhere. Cmd+H jumps home. Cmd+J opens threads.",
  "Tell Fülkit your name once — it remembers across every conversation, forever.",
  "\"What's my profit margin?\" — pulls your QuickBooks P&L in seconds.",
  "Drop a CSV into chat — Fülkit previews every change before executing anything.",
  "B-Side is the guy behind the counter on /fabric. He knows music. Have a real conversation.",
  "\"Am I free Thursday at 2?\" — checks your Google Calendar without leaving chat.",
  "Threads are kanban cards. Create them from chat, drag them on the board, track everything.",
  "\"Import that doc\" — pulls Google Drive files straight into your vault as searchable notes.",
  "\"Revenue yesterday?\" — Stripe charges, refunds, net. One sentence, one answer.",
  "Compact mode — sidebar shrinks to icons only. Hover for labels. More room to think.",
  "Crates on /fabric — drag songs into collections, DJ-style. Build your sets.",
  "\"Track this\" in chat starts a thread. It lives on your board until you close it out.",
  "\"What's my margin on the Green Machine?\" — Numbrly breaks down cost, price, and margin instantly.",
  "\"If bananas go to $0.50/lb, what happens?\" — Numbrly simulates the cost change across every recipe that uses them.",
  "\"Show me my most expensive build\" — Numbrly ranks your products by cost so you know where the money goes.",
  "\"Add a new component: oat milk, $3.49/gal\" — Numbrly creates it right from chat. No dashboard needed.",
  "\"What's my health score?\" — TrueGauge gives you a single number for your business health, 0-100.",
  "\"Am I on pace this month?\" — TrueGauge shows MTD sales vs your survival goal and daily pace.",
  "\"Log a $420 expense to Sysco\" — TrueGauge records it from chat. Expenses, sales, all conversational.",
  "\"Close out the day\" — Fülkit pulls your Square revenue, confirms, then logs it to TrueGauge. One sentence, two systems.",
  "Every song on /fabric generates a unique topographic poster. Same track, same landscape — every time. Shift one second and it's a different world.",
  "Paste a table with blank cells into chat — Fülkit turns it into a fillable form with a submit button. Instant data entry.",
  "The Hum doesn't ask \"are you sure?\" — say \"add a meeting Tuesday at 2\" and it's done. Voice mode trusts you.",
  "\"How did I sleep?\" — Fitbit gives you stages (deep, light, REM), duration, efficiency, and time asleep. One question.",
  "\"How was my run?\" — Strava shows splits, elevation, pace, heart rate, and suffer score. Full breakdown.",
  "Any response in chat has a share button — generates a public link anyone can see. No signup required.",
  "Threads have 4 views — board, list, calendar, table. Same data, different lens. Toggle anytime.",
  "\"Find the invoice from Sysco\" — searches your Gmail without leaving chat. Full thread, not just subject lines.",
  "\"Define schadenfreude\" — full definition, pronunciation, etymology, synonyms. No tab switching.",
  "\"100 EUR to USD\" — real-time currency conversion, right in chat.",
  "\"Show me today's space picture\" — NASA's Astronomy Picture of the Day, pulled into your conversation.",
  "\"How's the Shopify store?\" — daily summary with orders, revenue, top products. One question.",
  "\"What did labor cost this week?\" — Toast pulls shifts, hours, and total labor spend.",
  "\"I whiten my teeth the first Sunday of every month\" — Fülkit tracks it. Whisper reminds you. Streak builds.",
  "\"Track my water — 8 glasses a day\" — daily check-in, no app to open. Just reply to the whisper.",
  "\"I want to read every day\" — connect Readwise and it auto-checks when you highlight something.",
  "\"Change the air filter every 90 days\" — household habits, not just fitness. Fülkit reminds you.",
  "\"How are my habits?\" — streaks, what's due, what you've been crushing. One question.",
  "Been away? Say \"catch me up\" — Fülkit shows what came due while you were gone. Check off, move on.",
  "Have a feature idea? Just say it — Fülkit sends it to the developer and you'll hear back on your dashboard.",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Dashboard() {
  const { user, profile, hasContext, accessToken, compactMode, onboardingState } = useAuth();
  const isMobile = useIsMobile();
  const router = useRouter();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "home" }); }, []);
  useOnboardingTrigger("home");

  // Auto-redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (profile && profile.onboarded !== true && profile.role !== "owner") {
      router.replace("/onboarding");
    }
  }, [profile, router]);

  const [actions, setActions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [whispers, setWhispers] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [habits, setHabits] = useState([]);
  const [householdPair, setHouseholdPair] = useState(null);
  const [householdItems, setHouseholdItems] = useState([]);
  const [householdExpanded, setHouseholdExpanded] = useState({});
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  const [activeTips] = useState(() => {
    if (typeof window === "undefined") return TIPS;
    try {
      const hidden = JSON.parse(localStorage.getItem("fulkit-hidden-tips")) || [];
      const filtered = TIPS.filter(t => !hidden.includes(t));
      return filtered.length > 0 ? filtered : TIPS;
    } catch { return TIPS; }
  });
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * activeTips.length));
  const [tipFade, setTipFade] = useState(1);

  useEffect(() => {
    if (activeTips.length <= 1) return;
    const id = setInterval(() => {
      setTipFade(0);
      setTimeout(() => {
        setTipIndex(i => (i + 1) % activeTips.length);
        setTipFade(1);
      }, 300);
    }, 12000);
    return () => clearInterval(id);
  }, [activeTips.length]);

  // Trial state — only for non-owner users with onboarding state
  const trialDaysRemaining = onboardingState?.trialDaysRemaining ?? null;
  const trialExpired = trialDaysRemaining !== null && trialDaysRemaining <= 0 && ["free", "trial"].includes(profile?.seat_type);
  const trialEndingSoon = trialDaysRemaining !== null && trialDaysRemaining > 0 && trialDaysRemaining <= 5 && ["free", "trial"].includes(profile?.seat_type);

  useEffect(() => {
    if (!user) return;

    // Fetch real actions (parents + children)
    supabase
      .from("actions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .or("scheduled_for.is.null,scheduled_for.lte." + new Date().toISOString())
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .abortSignal(AbortSignal.timeout(5000))
      .then(({ data, error }) => {
        if (error) console.error("[home] actions query failed:", error.message);
        if (data) setActions(data);
      });

    // Fetch real notes
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .abortSignal(AbortSignal.timeout(5000))
      .then(({ data, error }) => {
        if (error) console.error("[home] notes query failed:", error.message);
        if (data) setNotes(data);
      });

    // Fetch pattern insights (top ecosystems by frequency)
    supabase
      .from("user_patterns")
      .select("ecosystem, frequency")
      .eq("user_id", user.id)
      .order("frequency", { ascending: false })
      .limit(50)
      .abortSignal(AbortSignal.timeout(5000))
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        // Aggregate by ecosystem
        const eco = {};
        for (const row of data) {
          if (!row.ecosystem) continue;
          eco[row.ecosystem] = (eco[row.ecosystem] || 0) + row.frequency;
        }
        const sorted = Object.entries(eco).sort((a, b) => b[1] - a[1]).slice(0, 5);
        setPatterns(sorted.map(([name, count]) => ({ name, count })));
      });

    // Fetch active habits
    supabase
      .from("habits")
      .select("title, streak, next_due, track_type, category, last_completed")
      .eq("user_id", user.id)
      .eq("paused", false)
      .order("next_due", { ascending: true })
      .limit(10)
      .abortSignal(AbortSignal.timeout(5000))
      .then(({ data }) => { if (data) setHabits(data); })
      .catch(() => {});

    // Fetch household pair status + items
    if (accessToken) {
      fetch("/api/household/status", { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.paired) {
            setHouseholdPair(data);
            fetch("/api/household/items", { headers: { Authorization: `Bearer ${accessToken}` } })
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d?.items) setHouseholdItems(d.items); })
              .catch(() => {});
          }
        }).catch(() => {});
    }

    // Fetch unread notifications (feedback replies, announcements)
    supabase
      .from("user_notifications")
      .select("id, type, title, message, created_at")
      .eq("user_id", user.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .abortSignal(AbortSignal.timeout(5000))
      .then(({ data }) => { if (data) setNotifications(data); })
      .catch(() => {});
  }, [user]);

  // Fetch whispers (proactive suggestions from Claude) + closeout whisper
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/whispers", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.whispers) setWhispers(data.whispers); })
      .catch(() => {});
    // Closeout + automation whispers (from crons)
    supabase.from("preferences").select("key, value").eq("user_id", user?.id)
      .or("key.eq.closeout_whisper,key.eq.standup_whisper,key.eq.spotify_watch_whisper,key.like.automation_whisper:%,key.like.watch_whisper:%")
      .then(({ data }) => {
        if (!data?.length) return;
        const extras = [];
        for (const row of data) {
          try {
            const parsed = JSON.parse(row.value);
            if (parsed.text) extras.push(parsed.text);
          } catch {}
        }
        if (extras.length > 0) setWhispers(prev => [...extras, ...(prev || [])]);
      });
  }, [accessToken, user?.id]);

  const messagesUsed = profile?.messages_this_month || 0;
  const seatLimit = SEAT_LIMITS[profile?.seat_type || "trial"] || 100;
  const gaugeRemaining = seatLimit - messagesUsed;
  const gaugeLow = gaugeRemaining <= Math.ceil(seatLimit * 0.1);
  const gaugeCapped = gaugeRemaining <= 0;
  const gaugeColor = gaugeCapped ? "var(--color-error)" : gaugeLow ? "var(--color-warning)" : "var(--color-accent)";
  const completeAction = async (id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
    await supabase
      .from("actions")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", id);
  };

  const displayActions = actions;
  const displayNotes = notes;
  const displayWhispers = whispers;

  if (!profile) {
    return <AuthGuard><DashboardSkeleton /></AuthGuard>;
  }

  return (
    <AuthGuard>
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "var(--space-3) var(--space-3) var(--space-4)" : "var(--space-4) var(--space-6) var(--space-6)" }}>
            <div>
              {/* Greeting + Fül Gauge on same line */}
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "var(--space-4)",
                marginBottom: 0,
              }}>
                <h1
                  style={{
                    fontSize: "var(--font-size-2xl)",
                    fontWeight: "var(--font-weight-black)",
                    letterSpacing: "var(--letter-spacing-tight)",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    margin: 0,
                  }}
                >
                  {getGreeting()}, {profile?.name || user?.name || "friend"}.
                </h1>
                <div style={{ flex: 1, minWidth: 0, marginBottom: 10 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "baseline",
                    gap: 4,
                    marginBottom: 2,
                    whiteSpace: "nowrap",
                  }}>
                    <span style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-bold)",
                      color: gaugeCapped ? "var(--color-error)" : "var(--color-text-dim)",
                    }}>
                      {seatLimit - messagesUsed} | {seatLimit}
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-border-light)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.max(0, ((seatLimit - messagesUsed) / seatLimit) * 100)}%`,
                      borderRadius: "var(--radius-full)",
                      background: gaugeColor,
                      transition: "width var(--duration-slow) var(--ease-default)",
                    }} />
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  margin: "var(--space-1) 0 var(--space-6)",
                }}
              >
                Here's what's on your desk.
              </p>

              {/* Trial banner — show when trial expired or ending soon */}
              {!trialBannerDismissed && (trialExpired || trialEndingSoon) && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: `1px solid ${trialExpired ? "var(--color-warning)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "var(--space-4)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    position: "relative",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-1)" }}>
                      {trialExpired ? "Your free trial has ended." : `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""}.`}
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                      {trialExpired
                        ? "Subscribe to keep your Fül flowing, or bring your own API key."
                        : "Lock in a plan to keep going after your trial — or bring your own key."}
                    </div>
                  </div>
                  <Link
                    href="/settings?tab=billing"
                    style={{
                      flexShrink: 0,
                      padding: "var(--space-2) var(--space-3)",
                      background: "var(--color-accent)",
                      color: "var(--color-text-inverse)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      fontFamily: "var(--font-primary)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {trialExpired ? `Upgrade — from ${TIERS.standard.priceLabel}` : "See plans"}
                  </Link>
                  <button
                    onClick={() => setTrialBannerDismissed(true)}
                    style={{
                      position: "absolute",
                      top: "var(--space-2)",
                      right: "var(--space-2)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-dim)",
                      padding: 2,
                    }}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Notifications — feedback replies from the developer */}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "var(--space-3)",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-1)" }}>
                    {n.title || "From the team"}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
                    {n.message}
                  </div>
                  <button
                    onClick={() => {
                      setNotifications(prev => prev.filter(x => x.id !== n.id));
                      supabase.from("user_notifications").update({ read: true }).eq("id", n.id).then(() => {}).catch(() => {});
                    }}
                    style={{
                      position: "absolute", top: "var(--space-2)", right: "var(--space-2)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-text-dim)", padding: 2,
                    }}
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}

              {/* Context nudge — show when user has no context and hasn't dismissed */}
              {!hasContext && !nudgeDismissed && (
                <div
                  style={{
                    padding: "var(--space-4) var(--space-5)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "var(--space-6)",
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() => setNudgeDismissed(true)}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: "transparent", border: "none",
                      cursor: "pointer", padding: 4,
                      color: "var(--color-text-dim)",
                    }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                    <Sparkles size={14} strokeWidth={2} color="var(--color-text-muted)" />
                    <span style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                      color: "var(--color-text-muted)",
                    }}>
                      Get started
                    </span>
                  </div>
                  <p style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-secondary)",
                    lineHeight: "var(--line-height-relaxed)",
                    marginBottom: "var(--space-4)",
                  }}>
                    I work better when I know you. Take the quiz or drop in some files so I have something to work with.
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-3)" }}>
                    <Link
                      href="/onboarding"
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        background: "var(--color-accent)",
                        color: "var(--color-text-inverse)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle size={14} strokeWidth={2} />
                      Take the quiz
                    </Link>
                    <Link
                      href="/settings"
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        textDecoration: "none",
                      }}
                    >
                      <Upload size={14} strokeWidth={2} />
                      Upload files
                    </Link>
                  </div>
                </div>
              )}

              {/* Did you know — cycling tips */}
              <button
                onClick={() => { setTipFade(0); setTimeout(() => { setTipIndex(i => (i + 1) % activeTips.length); setTipFade(1); }, 200); }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-6)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Zap size={14} strokeWidth={2} color="var(--color-text-dim)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minHeight: 36 }}>
                  <div style={{
                    fontSize: "var(--font-size-2xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    color: "var(--color-text-dim)",
                    marginBottom: "var(--space-1)",
                  }}>
                    Did you know
                  </div>
                  <div style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                    fontFamily: "var(--font-primary)",
                    lineHeight: "var(--line-height-relaxed)",
                    opacity: tipFade,
                    transition: "opacity 300ms ease",
                  }}>
                    {activeTips[tipIndex]}
                  </div>
                </div>
              </button>

              {/* Two-column dashboard grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? "var(--space-3)" : "var(--space-6)",
                alignItems: "start",
              }}>
                {/* Left column — incoming signals */}
                <div>
                  {/* Quick actions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: isMobile ? "var(--space-4)" : "var(--space-8)" }}>
                    <Link
                      href="/chat"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isMobile ? "center" : "flex-start",
                        gap: "var(--space-2)",
                        padding: isMobile ? "var(--space-3)" : "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle size={isMobile ? 20 : 16} strokeWidth={1.8} />
                      {!isMobile && "Start chatting"}
                    </Link>
                    <Link
                      href="/hum"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isMobile ? "center" : "flex-start",
                        gap: "var(--space-2)",
                        padding: isMobile ? "var(--space-3)" : "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        textDecoration: "none",
                      }}
                    >
                      <Zap size={isMobile ? 20 : 16} strokeWidth={1.8} />
                      {!isMobile && "Open The Hum"}
                    </Link>
                  </div>

                  {/* Whispers */}
                  <SectionLabel icon={Bell}>Whispers</SectionLabel>
                  {displayWhispers.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
                      {displayWhispers.map((whisper, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "var(--space-3)",
                            padding: "var(--space-3) var(--space-4)",
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "var(--font-size-sm)",
                            color: "var(--color-text-secondary)",
                            lineHeight: "var(--line-height-relaxed)",
                          }}
                        >
                          <span style={{ flex: 1 }}>{whisper}</span>
                          <div style={{ display: "flex", gap: "var(--space-1)", flexShrink: 0 }}>
                            <button
                              onClick={() => {
                                const title = typeof whisper === "string" ? whisper.slice(0, 120) : "Whisper action";
                                setActions((prev) => [...prev, { id: `whisper-${i}-${Date.now()}`, title, source: "Whisper" }]);
                                setWhispers((prev) => prev.filter((_, idx) => idx !== i));
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "var(--color-text-dim)",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Add to actions"
                            >
                              <ListPlus size={14} strokeWidth={1.8} />
                            </button>
                            <button
                              onClick={() => setWhispers((prev) => prev.filter((_, idx) => idx !== i))}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                color: "var(--color-text-dim)",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Dismiss"
                            >
                              <MessageCircleX size={14} strokeWidth={1.8} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No whispers yet. I'm still getting to know you." marginBottom="var(--space-8)" />
                  )}

                  {/* Recent Notes */}
                  <SectionLabel icon={LineSquiggle}>Recent threads</SectionLabel>
                  {displayNotes.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {displayNotes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => router.push(`/threads?id=${note.id}`)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "var(--space-3) var(--space-4)",
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-md)",
                            cursor: "pointer",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
                              {note.title}
                            </div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                              {note.source}
                            </div>
                          </div>
                          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                            {timeAgo(note.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No threads yet. Start a conversation or import some files." link="/threads" linkLabel="View threads" />
                  )}
                </div>

                {/* Right column — outgoing work */}
                <div>
                  {/* Household (+Plus One) — only when paired + items exist */}
                  {householdPair && householdItems.length > 0 && (
                    <>
                      <SectionLabel icon={Blend}>+Plus One</SectionLabel>
                      <HouseholdCard
                        items={householdItems}
                        setItems={setHouseholdItems}
                        partnerName={householdPair.partnerName}
                        expanded={householdExpanded}
                        setExpanded={setHouseholdExpanded}
                        accessToken={accessToken}
                      />
                    </>
                  )}

                  {/* Action Items */}
                  <SectionLabel icon={CheckSquare}>Action items</SectionLabel>
                  {displayActions.length > 0 ? (
                    <ActionList actions={displayActions} onComplete={completeAction} />
                  ) : (
                    <EmptyState message="No action items yet. Tell me what's on your plate." link="/chat" linkLabel="Start chatting" marginBottom="var(--space-8)" />
                  )}

                  {/* Habits — only visible if user tracks any */}
                  {habits.length > 0 && (
                    <>
                      <SectionLabel icon={Flame}>Habits</SectionLabel>
                      <div style={{
                        display: "flex", flexDirection: "column", gap: "var(--space-2)",
                        padding: "var(--space-3)", background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
                        marginBottom: "var(--space-8)",
                      }}>
                        {habits.map((h) => {
                          const today = new Date().toISOString().split("T")[0];
                          const isDue = h.next_due && h.next_due <= today;
                          const isOverdue = h.next_due && h.next_due < today;
                          return (
                            <div key={h.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                {isDue && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOverdue ? "var(--color-warning, #C4A35A)" : "var(--color-text)", flexShrink: 0 }} />}
                                <span style={{ fontSize: "var(--font-size-sm)", color: isDue ? "var(--color-text)" : "var(--color-text-muted)" }}>
                                  {h.title}
                                </span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                {h.streak > 0 && (
                                  <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                                    {h.streak} streak
                                  </span>
                                )}
                                <span style={{
                                  fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)",
                                  padding: "1px 6px", borderRadius: "var(--radius-sm)",
                                  background: "var(--color-bg-alt)",
                                }}>
                                  {h.category}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Pattern Insights */}
                  {patterns.length > 0 && (
                    <>
                      <SectionLabel icon={Activity}>Your patterns</SectionLabel>
                      <div style={{
                        display: "flex", flexDirection: "column", gap: "var(--space-2)",
                        padding: "var(--space-3)", background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
                      }}>
                        {patterns.map((p) => (
                          <div key={p.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                              {p.name}
                            </span>
                            <span style={{
                              fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)",
                              color: "var(--color-text-dim)", minWidth: 32, textAlign: "right",
                            }}>
                              {p.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                </div>
              </div>
            </div>
          </div>
    </AuthGuard>
  );
}

function HouseholdCard({ items, setItems, partnerName, expanded, setExpanded, accessToken }) {
  // Group by list_name
  const grouped = {};
  const notes = [];
  for (const item of items) {
    if (item.type === "note" || item.type === "kid_context") {
      notes.push(item);
    } else {
      const key = item.list_name || "_tasks";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    }
  }
  const listNames = Object.keys(grouped).sort();

  async function checkOff(itemId) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, _fading: true } : i));
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== itemId)), 400);
    fetch("/api/household/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ item_id: itemId }),
    }).catch(() => {});
  }

  const listLabel = (name) => name === "_tasks" ? "Tasks" : name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
      marginBottom: "var(--space-8)", overflow: "hidden",
    }}>
      {/* Collapsible lists */}
      {listNames.map(name => {
        const listItems = grouped[name];
        const isOpen = expanded[name];
        return (
          <div key={name}>
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [name]: !prev[name] }))}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                padding: "var(--space-2-5) var(--space-3)",
                background: "none", border: "none", borderBottom: "1px solid var(--color-border-light)",
                cursor: "pointer", fontFamily: "var(--font-primary)",
              }}
            >
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
                {listLabel(name)} <span style={{ color: "var(--color-text-dim)", fontWeight: "var(--font-weight-normal)" }}>({listItems.length})</span>
              </span>
              {isOpen
                ? <ChevronDown size={13} strokeWidth={2} style={{ color: "var(--color-text-dim)" }} />
                : <ChevronRight size={13} strokeWidth={2} style={{ color: "var(--color-text-dim)" }} />
              }
            </button>
            {isOpen && (
              <div style={{ padding: "var(--space-2) var(--space-3)" }}>
                {listItems.map(item => (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                    padding: "var(--space-1-5) 0",
                    opacity: item._fading ? 0.3 : 1,
                    transition: "opacity 400ms ease",
                  }}>
                    <button
                      onClick={() => checkOff(item.id)}
                      style={{
                        width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                        border: "1.5px solid var(--color-border)", background: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{item.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Notes & partner whispers */}
      {notes.length > 0 && (
        <div style={{ padding: "var(--space-2-5) var(--space-3)", borderTop: listNames.length > 0 ? "1px solid var(--color-border-light)" : "none" }}>
          {notes.map(note => (
            <div key={note.id} style={{
              display: "flex", alignItems: "flex-start", gap: "var(--space-2)",
              padding: "var(--space-1-5) 0",
              opacity: note._fading ? 0.3 : 1,
              transition: "opacity 400ms ease",
            }}>
              <Blend size={12} strokeWidth={2} style={{ color: "var(--color-text-dim)", flexShrink: 0, marginTop: 3 }} />
              <div>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{note.body || note.title}</span>
                {note.type === "kid_context" && (
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginLeft: "var(--space-1)" }}>
                    {note.metadata?.kid_name}
                  </span>
                )}
              </div>
              <button
                onClick={() => checkOff(note.id)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)", padding: "var(--space-0.5)" }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon: Icon, children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        textTransform: "uppercase",
        letterSpacing: "var(--letter-spacing-wider)",
        color: "var(--color-text-muted)",
        marginBottom: "var(--space-3)",
      }}
    >
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </div>
  );
}

function EmptyState({ message, link, linkLabel, marginBottom }) {
  return (
    <div
      style={{
        padding: "var(--space-4)",
        background: "var(--color-bg-elevated)",
        border: "1px dashed var(--color-border)",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text-dim)",
        textAlign: "center",
        marginBottom,
      }}
    >
      {message}
      {link && (
        <Link
          href={link}
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            textDecoration: "underline",
          }}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function ActionList({ actions, onComplete }) {
  // Separate parents (no parent_id) and children
  const parents = actions.filter((a) => !a.parent_id);
  const children = actions.filter((a) => a.parent_id);
  // Ungrouped tasks (no parent, no children pointing to them)
  const parentIds = new Set(parents.map((p) => p.id));
  const hasChildren = new Set(children.map((c) => c.parent_id));
  const standalone = parents.filter((p) => !hasChildren.has(p.id));
  const groups = parents.filter((p) => hasChildren.has(p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
      {/* Grouped tasks */}
      {groups.map((parent) => {
        const kids = children.filter((c) => c.parent_id === parent.id);
        return (
          <div key={parent.id}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wider)",
                color: "var(--color-text-muted)",
                padding: "0 var(--space-4)",
                marginBottom: "var(--space-2)",
              }}
            >
              {parent.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
              {kids.map((item) => (
                <ActionRow key={item.id} item={item} onComplete={onComplete} />
              ))}
            </div>
          </div>
        );
      })}
      {/* Standalone tasks */}
      {standalone.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          {standalone.map((item) => (
            <ActionRow key={item.id} item={item} onComplete={onComplete} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({ item, onComplete }) {
  const [checked, setChecked] = useState(false);

  const handleCheck = () => {
    setChecked(true);
    setTimeout(() => onComplete(item.id), 400);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2-5) var(--space-4)",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        opacity: checked ? 0.4 : 1,
        transition: "opacity var(--duration-slow) var(--ease-default)",
      }}
    >
      <div
        onClick={handleCheck}
        style={{
          width: 18,
          height: 18,
          borderRadius: "var(--radius-xs)",
          border: checked ? "none" : "1.5px solid var(--color-border)",
          background: checked ? "var(--color-accent)" : "transparent",
          flexShrink: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--duration-fast) var(--ease-default)",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text)",
          textDecoration: checked ? "line-through" : "none",
        }}
      >
        {item.title}
      </span>
      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-medium)" }}>
        {item.source}
      </span>
    </div>
  );
}
