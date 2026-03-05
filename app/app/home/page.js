"use client";

import { useState, useEffect } from "react";
import { Bell, CheckSquare, FileText, Zap, MessageCircle } from "lucide-react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

// Placeholder data for ?auth=dev template mode
const DEV_WHISPERS = [
  "You mentioned wanting to follow up with Sarah this week — it's Thursday.",
  "Your Obsidian vault has 3 untagged notes from yesterday.",
];
const DEV_ACTIONS = [
  { id: "1", title: "Review Q1 budget draft", source: "Obsidian" },
  { id: "2", title: "Send Mike the revised proposal", source: "Chat" },
  { id: "3", title: "Book dentist appointment", source: "Whisper" },
];
const DEV_NOTES = [
  { id: "1", title: "Meeting notes — product roadmap", source: "Obsidian", created_at: "2h ago" },
  { id: "2", title: "Voice capture: meal planning ideas", source: "Hum", created_at: "Yesterday" },
  { id: "3", title: "Startup reading list", source: "Google Drive", created_at: "2 days ago" },
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

const SEAT_LIMITS = { standard: 450, pro: 800, free: 100 };

export default function Dashboard() {
  const { user, profile } = useAuth();
  const isDev = user?.isDev;

  const [actions, setActions] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!user || isDev) return;

    // Fetch real actions
    supabase
      .from("actions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setActions(data); });

    // Fetch real notes
    supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setNotes(data); });
  }, [user, isDev]);

  const messagesUsed = isDev ? 138 : (profile?.messages_this_month || 0);
  const seatLimit = SEAT_LIMITS[profile?.seat_type || "standard"] || 450;
  const displayActions = isDev ? DEV_ACTIONS : actions;
  const displayNotes = isDev ? DEV_NOTES : notes;
  const displayWhispers = isDev ? DEV_WHISPERS : [];

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
            <div style={{ maxWidth: 640 }}>
              {/* Greeting */}
              <h1
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-black)",
                  letterSpacing: "var(--letter-spacing-tight)",
                  marginBottom: "var(--space-1)",
                }}
              >
                {getGreeting()}, {user?.name || profile?.name || "friend"}.
              </h1>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-8)",
                }}
              >
                Here's what's on your desk.
              </p>

              {/* Fül Gauge */}
              <div
                style={{
                  padding: "var(--space-4)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "var(--space-6)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
                    Fül remaining
                  </span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>
                    {seatLimit - messagesUsed} / {seatLimit}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--radius-full)", background: "var(--color-border-light)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(0, ((seatLimit - messagesUsed) / seatLimit) * 100)}%`,
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-accent)",
                      transition: `width var(--duration-slow) var(--ease-default)`,
                    }}
                  />
                </div>
              </div>

              {/* Whispers */}
              <SectionLabel icon={Bell}>Whispers</SectionLabel>
              {displayWhispers.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
                  {displayWhispers.map((whisper, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-secondary)",
                        lineHeight: "var(--line-height-relaxed)",
                      }}
                    >
                      {whisper}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No whispers yet. I'm still getting to know you." marginBottom="var(--space-8)" />
              )}

              {/* Action Items */}
              <SectionLabel icon={CheckSquare}>Action items</SectionLabel>
              {displayActions.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginBottom: "var(--space-8)" }}>
                  {displayActions.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-2-5) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      <div style={{ width: 18, height: 18, borderRadius: "var(--radius-xs)", border: "1.5px solid var(--color-border)", flexShrink: 0, cursor: "pointer" }} />
                      <span style={{ flex: 1, fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-medium)" }}>
                        {item.source}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No action items yet. Tell me what's on your plate." link="/chat" linkLabel="Start chatting" marginBottom="var(--space-8)" />
              )}

              {/* Recent Notes */}
              <SectionLabel icon={FileText}>Recent notes</SectionLabel>
              {displayNotes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-8)" }}>
                  {displayNotes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
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
                        {isDev ? note.created_at : timeAgo(note.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No notes yet. Connect a source or start a conversation." link="/settings" linkLabel="Connect sources" marginBottom="var(--space-8)" />
              )}

              {/* Quick actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
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
