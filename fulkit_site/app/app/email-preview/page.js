"use client";

import { useState } from "react";
import { Mail, Eye, Smartphone, Monitor } from "lucide-react";
import AuthGuard from "../../components/AuthGuard";

// ─── Welcome Email Template ───
// This is the actual HTML that would be sent via Resend.
// Preview it here, iterate, then extract for the API route.

function WelcomeEmail({ userName = "there" }) {
  return (
    <div style={{
      fontFamily: "'D-DIN', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      backgroundColor: "#EFEDE8",
      padding: "40px 20px",
      minHeight: "100%",
    }}>
      {/* Email container */}
      <div style={{
        maxWidth: 520,
        margin: "0 auto",
        backgroundColor: "#FAF9F6",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: "#2A2826",
          padding: "32px 40px",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#EFEDE8",
            letterSpacing: "-0.02em",
          }}>
            Fülkit
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "40px 40px 32px" }}>
          {/* Greeting */}
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#2A2826",
            marginBottom: 8,
            lineHeight: 1.3,
          }}>
            Hey {userName}.
          </div>
          <div style={{
            fontSize: 16,
            color: "#6B6560",
            lineHeight: 1.6,
            marginBottom: 28,
          }}>
            Welcome to Fülkit. You just got yourself a bestie that remembers everything and never makes you start from zero.
          </div>

          {/* Quick start */}
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#9B9590",
            marginBottom: 16,
          }}>
            Get started in 60 seconds
          </div>

          {/* Step 1 */}
          <div style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#2A2826", marginBottom: 2 }}>
                Say hey
              </div>
              <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
                Open chat and talk like you would to a friend. No prompts needed. Just say what&apos;s on your mind.
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{
            display: "flex",
            gap: 16,
            marginBottom: 20,
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#2A2826", marginBottom: 2 }}>
                Drop a note
              </div>
              <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
                Save something — an idea, a doc, a thought. Next time you chat, Fülkit already knows about it.
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{
            display: "flex",
            gap: 16,
            marginBottom: 32,
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              3
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#2A2826", marginBottom: 2 }}>
                Watch it click
              </div>
              <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.5 }}>
                Ask about something you saved. Fülkit connects the dots — your notes, your context, your history. That&apos;s the magic.
              </div>
            </div>
          </div>

          {/* CTA */}
          <a
            href="https://fulkit.app/chat"
            style={{
              display: "block",
              width: "100%",
              padding: "14px 0",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 15,
              fontWeight: 600,
              textAlign: "center",
              textDecoration: "none",
              borderRadius: 8,
              marginBottom: 28,
            }}
          >
            Open Fülkit
          </a>

          {/* Divider */}
          <div style={{
            height: 1,
            backgroundColor: "#E8E5E0",
            marginBottom: 24,
          }} />

          {/* What you get */}
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#9B9590",
            marginBottom: 12,
          }}>
            What&apos;s in your kit
          </div>

          <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.7, marginBottom: 24 }}>
            <div style={{ marginBottom: 6 }}><strong style={{ color: "#2A2826" }}>Chat</strong> — a thinking partner that knows your context</div>
            <div style={{ marginBottom: 6 }}><strong style={{ color: "#2A2826" }}>Notes</strong> — your vault, your rules, plain markdown</div>
            <div style={{ marginBottom: 6 }}><strong style={{ color: "#2A2826" }}>Actions</strong> — tasks that write themselves from your conversations</div>
            <div style={{ marginBottom: 6 }}><strong style={{ color: "#2A2826" }}>Threads</strong> — organized conversations you can pick back up</div>
            <div><strong style={{ color: "#2A2826" }}>Integrations</strong> — connect the tools you already use</div>
          </div>

          {/* Closing */}
          <div style={{ fontSize: 14, color: "#6B6560", lineHeight: 1.6 }}>
            No tutorials. No 30-page docs. Just open it and talk. Fülkit figures out the rest.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 40px 28px",
          textAlign: "center",
          borderTop: "1px solid #E8E5E0",
        }}>
          <div style={{ fontSize: 12, color: "#9B9590", lineHeight: 1.6 }}>
            You&apos;re getting this because you signed up at{" "}
            <a href="https://fulkit.app" style={{ color: "#6B6560", textDecoration: "underline" }}>fulkit.app</a>.
          </div>
          <div style={{ fontSize: 12, color: "#B8B3AE", marginTop: 6 }}>
            Fülkit — your second brain that talks back.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview wrapper ───
export default function EmailPreview() {
  const [viewport, setViewport] = useState("desktop");
  const [name, setName] = useState("Collin");

  const viewportWidth = viewport === "mobile" ? 375 : 600;

  return (
    <AuthGuard>
      <div style={{ padding: "var(--space-6)", maxWidth: 900, margin: "0 auto" }}>
        {/* Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Mail size={18} strokeWidth={1.5} color="var(--color-text-muted)" />
            <span style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text)",
            }}>
              Welcome Email Preview
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            {/* Name input */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>Name:</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: 100,
                  padding: "var(--space-1) var(--space-2)",
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  background: "var(--color-bg-alt)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
            </div>
            {/* Viewport toggle */}
            <div style={{ display: "flex", gap: 2, background: "var(--color-bg-alt)", borderRadius: "var(--radius-sm)", padding: 2 }}>
              <button
                onClick={() => setViewport("desktop")}
                style={{
                  padding: "var(--space-1) var(--space-2)",
                  background: viewport === "desktop" ? "var(--color-bg-elevated)" : "transparent",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  color: viewport === "desktop" ? "var(--color-text)" : "var(--color-text-muted)",
                }}
              >
                <Monitor size={12} strokeWidth={1.5} /> Desktop
              </button>
              <button
                onClick={() => setViewport("mobile")}
                style={{
                  padding: "var(--space-1) var(--space-2)",
                  background: viewport === "mobile" ? "var(--color-bg-elevated)" : "transparent",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  color: viewport === "mobile" ? "var(--color-text)" : "var(--color-text-muted)",
                }}
              >
                <Smartphone size={12} strokeWidth={1.5} /> Mobile
              </button>
            </div>
          </div>
        </div>

        {/* Subject line preview */}
        <div style={{
          padding: "var(--space-3) var(--space-4)",
          background: "var(--color-bg-alt)",
          borderRadius: "var(--radius-sm)",
          marginBottom: "var(--space-4)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-muted)",
        }}>
          <div><strong style={{ color: "var(--color-text)" }}>From:</strong> Fülkit &lt;hello@fulkit.app&gt;</div>
          <div><strong style={{ color: "var(--color-text)" }}>Subject:</strong> Welcome to Fülkit — let&apos;s get started</div>
          <div><strong style={{ color: "var(--color-text)" }}>Preview:</strong> You just got yourself a bestie that remembers everything.</div>
        </div>

        {/* Email frame */}
        <div style={{
          width: viewportWidth,
          margin: "0 auto",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          transition: "width 300ms ease",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <WelcomeEmail userName={name || "there"} />
        </div>

        {/* Meta */}
        <div style={{
          textAlign: "center",
          marginTop: "var(--space-4)",
          fontSize: "var(--font-size-2xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-dim)",
        }}>
          {viewportWidth}px &middot; This is a preview — no email is sent
        </div>
      </div>
    </AuthGuard>
  );
}
