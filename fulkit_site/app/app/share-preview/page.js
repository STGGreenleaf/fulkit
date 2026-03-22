"use client";

import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";

// Mock messages for the preview
const MOCK_MESSAGES = [
  { role: "user", content: "I've been thinking about the Q2 launch. What's the most important thing I should focus on this week?" },
  { role: "assistant", content: "Based on your notes, you've got three things competing for attention: the pricing page rewrite, the onboarding flow fixes, and the partner outreach list.\n\nThe pricing page is blocking signups — you flagged it twice in your notes last week. That's your highest-leverage move. One afternoon, done right, and every visitor after that converts better.\n\nThe onboarding fixes matter but they only affect people who already signed up. Partner outreach is a slow burn — it won't move this week's numbers.\n\nMy call: pricing page Monday, onboarding Tuesday-Wednesday, partner list Thursday if you have gas left." },
  { role: "user", content: "That's exactly what I needed. Can you break the pricing page into tasks?" },
  { role: "assistant", content: "Here's your pricing page sprint:\n\n1. Audit current page — screenshot it, list what's confusing (you mentioned the tier comparison was unclear)\n2. Write the three plan descriptions — one sentence each, benefits not features\n3. Add the FAQ section — you saved 5 common objections in your notes from customer calls\n4. Social proof strip — pull the 3 best quotes from your feedback notes\n5. Test the CTA — make sure \"Get Started\" goes straight to signup, not a demo form\n\nI saved these as actions in your task list. Want me to add time estimates?" },
];

function SharePagePreview() {
  const date = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#EFEDE8",
      fontFamily: "'D-DIN', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "#EFEDE8",
        borderBottom: "1px solid #E0DDD8",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#2A2826",
          letterSpacing: "-0.01em",
        }}>
          Fülkit
        </span>
        <div style={{ fontSize: 12, color: "#9B9590", fontFamily: "monospace" }}>
          Shared conversation
        </div>
      </div>

      {/* Conversation */}
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 160px",
      }}>
        {/* Title */}
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#2A2826",
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          Q2 Launch Planning
        </div>
        <div style={{
          fontSize: 13,
          color: "#9B9590",
          marginBottom: 32,
          fontFamily: "monospace",
        }}>
          {date}
        </div>

        {/* Messages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {MOCK_MESSAGES.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#9B9590",
                marginBottom: 4,
              }}>
                {msg.role === "user" ? "You" : "Fülkit"}
              </div>
              <div style={{
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                backgroundColor: msg.role === "user" ? "#2A2826" : "#FAF9F6",
                color: msg.role === "user" ? "#EFEDE8" : "#2A2826",
                fontSize: 15,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                border: msg.role === "user" ? "none" : "1px solid #E0DDD8",
              }}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA footer */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "16px 20px",
        backgroundColor: "#2A2826",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}>
        <div style={{
          fontSize: 14,
          color: "#9B9590",
        }}>
          Your second brain that talks back.
        </div>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            padding: "8px 20px",
            backgroundColor: "#EFEDE8",
            color: "#2A2826",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            borderRadius: 6,
            flexShrink: 0,
          }}
        >
          Get Fülkit
        </Link>
      </div>
    </div>
  );
}

export default function SharePreview() {
  return (
    <AuthGuard>
      <SharePagePreview />
    </AuthGuard>
  );
}
