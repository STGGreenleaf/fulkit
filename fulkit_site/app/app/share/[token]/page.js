import { getSupabaseAdmin } from "../../../lib/supabase-server";
import Link from "next/link";

// Public shared message page — no auth required
// Server component for SEO + fast load

export async function generateMetadata({ params }) {
  const { token } = await params;
  const admin = getSupabaseAdmin();
  const { data: snippet } = await admin
    .from("shared_snippets")
    .select("assistant_message, conversation_title")
    .eq("token", token)
    .single();

  const preview = snippet?.assistant_message?.slice(0, 120) || "";
  return {
    title: snippet?.conversation_title ? `${snippet.conversation_title} — Fülkit` : "Shared from Fülkit",
    description: preview || "A moment shared from Fülkit — your second brain that talks back.",
  };
}

export default async function SharedMessage({ params }) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data: snippet } = await admin
    .from("shared_snippets")
    .select("user_message, assistant_message, conversation_title, created_at")
    .eq("token", token)
    .single();

  if (!snippet) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EFEDE8",
        fontFamily: "'D-DIN', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16, color: "#9B9590" }}>?</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#2A2826", marginBottom: 8 }}>
            Not found
          </div>
          <div style={{ fontSize: 14, color: "#6B6560", marginBottom: 24 }}>
            This link may have been revoked or doesn&apos;t exist.
          </div>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              backgroundColor: "#2A2826",
              color: "#EFEDE8",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Go to Fülkit
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(snippet.created_at).toLocaleDateString("en-US", {
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
        <Link
          href="/"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#2A2826",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Fülkit
        </Link>
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
        {/* Title + date */}
        {snippet.conversation_title && (
          <div style={{
            fontSize: 13,
            color: "#9B9590",
            marginBottom: 4,
            fontFamily: "monospace",
          }}>
            {snippet.conversation_title}
          </div>
        )}
        <div style={{
          fontSize: 12,
          color: "#B8B3AE",
          marginBottom: 32,
          fontFamily: "monospace",
        }}>
          {date}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User message (if present) */}
          {snippet.user_message && (
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
                {snippet.user_message}
              </div>
            </div>
          )}

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
              {snippet.assistant_message}
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
