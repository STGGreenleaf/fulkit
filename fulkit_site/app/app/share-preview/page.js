"use client";

import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";

function SharePagePreview() {
  const date = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const userMsg = "I've been thinking about the Q2 launch. What's the most important thing I should focus on this week?";
  const assistantMsg = `Based on your notes, you've got three things competing for attention: the pricing page rewrite, the onboarding flow fixes, and the partner outreach list.

The pricing page is blocking signups — you flagged it twice in your notes last week. That's your highest-leverage move. One afternoon, done right, and every visitor after that converts better.

The onboarding fixes matter but they only affect people who already signed up. Partner outreach is a slow burn — it won't move this week's numbers.

My call: pricing page Monday, onboarding Tuesday-Wednesday, partner list Thursday if you have gas left.`;

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
          Shared moment
        </div>
      </div>

      {/* Message pair */}
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "32px 20px 160px",
      }}>
        <div style={{
          fontSize: 13,
          color: "#9B9590",
          marginBottom: 4,
          fontFamily: "monospace",
        }}>
          Q2 Launch Planning
        </div>
        <div style={{
          fontSize: 12,
          color: "#B8B3AE",
          marginBottom: 32,
          fontFamily: "monospace",
        }}>
          {date}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User message */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#9B9590",
              marginBottom: 4,
            }}>
              You
            </div>
            <div style={{
              maxWidth: "85%",
              padding: "12px 16px",
              borderRadius: "16px 16px 4px 16px",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 15,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              {userMsg}
            </div>
          </div>

          {/* Assistant message */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "#9B9590",
              marginBottom: 4,
            }}>
              Fülkit
            </div>
            <div style={{
              maxWidth: "85%",
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              backgroundColor: "#FAF9F6",
              color: "#2A2826",
              fontSize: 15,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              border: "1px solid #E0DDD8",
            }}>
              {assistantMsg}
            </div>
          </div>
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
  return <SharePagePreview />;
}
