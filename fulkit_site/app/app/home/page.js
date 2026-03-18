"use client";

import { useState, useEffect } from "react";
import { Bell, CheckSquare, LineSquiggle, Zap, MessageCircle, MessageCircleX, ListPlus, Sparkles, X, Upload, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import OnboardingStatusLine from "../../components/OnboardingStatusLine";
import { supabase } from "../../lib/supabase";
import { SEAT_LIMITS, TIERS } from "../../lib/ful-config";


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
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);

  // Trial state — only for non-owner users with onboarding state
  const trialDaysRemaining = onboardingState?.trialDaysRemaining ?? null;
  const trialExpired = trialDaysRemaining !== null && trialDaysRemaining <= 0 && profile?.seat_type === "free";
  const trialEndingSoon = trialDaysRemaining !== null && trialDaysRemaining > 0 && trialDaysRemaining <= 5 && profile?.seat_type === "free";

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
  }, [user]);

  // Fetch whispers (proactive suggestions from Claude)
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/whispers", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.whispers) setWhispers(data.whispers); })
      .catch(() => {});
  }, [accessToken]);

  const messagesUsed = profile?.messages_this_month || 0;
  const seatLimit = SEAT_LIMITS[profile?.seat_type || "free"] || 100;
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

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{
            padding: "var(--space-2-5) var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}>
            <span style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
            }}>
              Fülkit
            </span>
            {!compactMode && (
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/</span>
            )}
            {!compactMode && (
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                Home
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-6) var(--space-6)" }}>
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
                    width: `${Math.max(0, ((seatLimit - messagesUsed) / seatLimit) * 100)}%`,
                    textAlign: "right",
                    marginBottom: 2,
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

              {/* Two-column dashboard grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-6)",
                alignItems: "start",
              }}>
                {/* Left column — incoming signals */}
                <div>
                  {/* Quick actions */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
                    <Link
                      href="/chat"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-accent)",
                        color: "var(--color-text-inverse)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle size={16} strokeWidth={1.8} />
                      Start chatting
                    </Link>
                    <Link
                      href="/hum"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        color: "var(--color-text)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-semibold)",
                        textDecoration: "none",
                      }}
                    >
                      <Zap size={16} strokeWidth={1.8} />
                      Open The Hum
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
                  {/* Action Items */}
                  <SectionLabel icon={CheckSquare}>Action items</SectionLabel>
                  {displayActions.length > 0 ? (
                    <ActionList actions={displayActions} onComplete={completeAction} />
                  ) : (
                    <EmptyState message="No action items yet. Tell me what's on your plate." link="/chat" linkLabel="Start chatting" marginBottom="var(--space-8)" />
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
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
