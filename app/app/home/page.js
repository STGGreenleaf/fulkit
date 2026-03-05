"use client";

import { Bell, CheckSquare, FileText, Zap, ArrowRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <AuthGuard>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-6)",
            }}
          >
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
                {getGreeting()}, user.
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    Fül remaining
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-bold)",
                    }}
                  >
                    312 / 450
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: "var(--radius-full)",
                    background: "var(--color-border-light)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(312 / 450) * 100}%`,
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-accent)",
                      transition: `width var(--duration-slow) var(--ease-default)`,
                    }}
                  />
                </div>
              </div>

              {/* Whispers */}
              <SectionLabel icon={Bell}>Whispers</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-8)",
                }}
              >
                {[
                  "You mentioned wanting to follow up with Sarah this week — it's Thursday.",
                  "Your Obsidian vault has 3 untagged notes from yesterday.",
                ].map((whisper, i) => (
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

              {/* Action Items */}
              <SectionLabel icon={CheckSquare}>Action items</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-1)",
                  marginBottom: "var(--space-8)",
                }}
              >
                {[
                  { text: "Review Q1 budget draft", source: "Obsidian" },
                  { text: "Send Mike the revised proposal", source: "Chat" },
                  { text: "Book dentist appointment", source: "Whisper" },
                ].map((item, i) => (
                  <div
                    key={i}
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
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "var(--radius-xs)",
                        border: "1.5px solid var(--color-border)",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text)",
                      }}
                    >
                      {item.text}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-dim)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {item.source}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recent Notes */}
              <SectionLabel icon={FileText}>Recent notes</SectionLabel>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-8)",
                }}
              >
                {[
                  { title: "Meeting notes — product roadmap", source: "Obsidian", time: "2h ago" },
                  { title: "Voice capture: meal planning ideas", source: "Hum", time: "Yesterday" },
                  { title: "Startup reading list", source: "Google Drive", time: "2 days ago" },
                ].map((note, i) => (
                  <div
                    key={i}
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
                      <div
                        style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                        }}
                      >
                        {note.title}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {note.source}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-dim)",
                      }}
                    >
                      {note.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3)",
                }}
              >
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
