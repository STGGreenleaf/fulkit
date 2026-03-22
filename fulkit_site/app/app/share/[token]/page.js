import { getSupabaseAdmin } from "../../../lib/supabase-server";
import Link from "next/link";

// Public shared conversation page — no auth required
// Server component for SEO + fast load

export async function generateMetadata({ params }) {
  const { token } = await params;
  const admin = getSupabaseAdmin();
  const { data: conv } = await admin
    .from("conversations")
    .select("title")
    .eq("share_token", token)
    .single();

  return {
    title: conv?.title ? `${conv.title} — Fülkit` : "Shared Conversation — Fülkit",
    description: "A conversation shared from Fülkit — your second brain that talks back.",
  };
}

export default async function SharedConversation({ params }) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  // Fetch conversation by share token
  const { data: conv } = await admin
    .from("conversations")
    .select("id, title, created_at, share_token")
    .eq("share_token", token)
    .single();

  if (!conv) {
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
            Conversation not found
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

  // Fetch messages
  const { data: messages } = await admin
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const msgs = messages || [];
  const date = new Date(conv.created_at).toLocaleDateString("en-US", {
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
        {conv.title && (
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#2A2826",
            marginBottom: 4,
            lineHeight: 1.3,
          }}>
            {conv.title}
          </div>
        )}
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
          {msgs.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {/* Role label */}
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
              {/* Bubble */}
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
