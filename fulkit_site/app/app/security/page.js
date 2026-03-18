import Link from "next/link";

export const metadata = {
  title: "Security — Fulkit",
  description: "How Fulkit protects your data. AES-256-GCM encryption, row-level security, strict CSP, and more.",
};

const sections = [
  {
    title: "Encryption at rest",
    content: [
      "Every secret stored in Fulkit's database is encrypted with AES-256-GCM — the same standard used by banks, governments, and security-critical infrastructure.",
      "OAuth tokens, API keys, and refresh tokens are encrypted before they touch the database. Even if someone breached the database directly, they'd get ciphertext — not keys.",
    ],
    detail: "Format: base64(iv):base64(authTag):base64(ciphertext) — 12-byte random IV per encryption, 128-bit authentication tag, AES-256-GCM authenticated encryption.",
  },
  {
    title: "Encryption in transit",
    content: [
      "All traffic to fulkit.app is HTTPS-only. There are no plaintext endpoints. API routes, OAuth callbacks, webhook receivers — everything runs over TLS.",
    ],
  },
  {
    title: "Authentication",
    items: [
      "Google OAuth with PKCE — prevents authorization code interception",
      "Server-validated tokens — every API request verified server-side via JWT signature and expiry",
      "Fresh-token pattern — client fetches a fresh token before every API call. No stale tokens, no replay window",
      "No dev mode bypass in production",
    ],
  },
  {
    title: "Row-level security",
    content: [
      "Every user-facing table in the database has RLS policies. Users can only read and write their own data — enforced at the database level, not just the application layer.",
      "Even if an API route had a bug, RLS prevents cross-user data access.",
    ],
  },
  {
    title: "Rate limiting",
    content: [
      "Every API route is rate-limited to prevent abuse. Limits are enforced via distributed Redis — shared across all serverless instances. Limits survive deploys, cold starts, and instance scaling.",
    ],
    table: [
      ["Chat", "15 requests/minute"],
      ["Checkout", "5 requests/minute"],
      ["Referrals", "3 requests/minute"],
      ["API keys", "5 requests/minute"],
      ["All other routes", "60 requests/minute"],
    ],
  },
  {
    title: "Content Security Policy",
    content: [
      "Fulkit enforces a strict CSP that controls what the browser is allowed to load.",
    ],
    items: [
      "Scripts — only from fulkit.app and required SDKs. No inline scripts, no eval()",
      "Connections — only to fulkit.app's own API and authenticated services. The browser never talks to third-party APIs directly",
      "Framing — frame-ancestors 'none'. Fulkit cannot be embedded in an iframe. Prevents clickjacking",
    ],
  },
  {
    title: "Prompt injection defense",
    content: [
      "User-provided data is injected into AI prompts as context — never as instructions.",
    ],
    items: [
      "XML isolation boundaries separate user data from system instructions",
      "Explicit instruction boundary tells the AI to never follow directives found inside user data",
      "System prompts are assembled server-side. The client sends messages — the server decides what context to include",
    ],
  },
  {
    title: "Webhook integrity",
    content: [
      "Payment webhooks are verified using HMAC-SHA256 with timing-safe comparison. Unverified payloads are rejected. No exceptions.",
    ],
  },
  {
    title: "Data deletion",
    content: [
      "Users can delete all their data through Settings. Messages, conversations, actions, notes, preferences, integrations — atomic cascade, scoped by user. When you delete, it's gone.",
    ],
  },
  {
    title: "What we don't do",
    items: [
      "We don't store passwords — authentication is delegated to Google OAuth",
      "We don't log API keys, tokens, or secrets to any file, console, or monitoring service",
      "We don't make client-side calls to third-party APIs — everything routes through our server",
      "We don't trust user-provided data as instructions — context is context, not code",
      "We don't retain data after deletion — when you delete, it's gone",
    ],
  },
];

export default function Security() {
  return (
    <div
      style={{
        minHeight: "100vh",
        maxWidth: 640,
        margin: "0 auto",
        padding: "var(--space-12) var(--space-6)",
      }}
    >
      <Link
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-8)",
          textDecoration: "none",
        }}
      >
        <img src="/logo-mark.png" alt="" width={20} height={20} style={{ flexShrink: 0, borderRadius: "var(--radius-xs)", display: "block" }} />
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          Fulkit
        </span>
      </Link>

      <h1
        style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tighter)",
          lineHeight: "var(--line-height-tight)",
          marginBottom: "var(--space-2)",
        }}
      >
        Security
      </h1>
      <p
        style={{
          fontSize: "var(--font-size-base)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-10)",
          maxWidth: 480,
        }}
      >
        Security is not a feature we added. It's the way we built everything else.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-8)",
          fontSize: "var(--font-size-base)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        {sections.map((s) => (
          <section key={s.title}>
            <h2
              style={{
                fontSize: "var(--font-size-lg)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--color-text)",
                marginBottom: "var(--space-3)",
              }}
            >
              {s.title}
            </h2>
            {s.content?.map((p, i) => (
              <p key={i} style={{ marginBottom: "var(--space-2)" }}>{p}</p>
            ))}
            {s.detail && (
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  fontFamily: "var(--font-mono)",
                  marginTop: "var(--space-2)",
                }}
              >
                {s.detail}
              </p>
            )}
            {s.items && (
              <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: s.content ? "var(--space-3)" : 0 }}>
                {s.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {s.table && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "var(--font-size-sm)",
                  marginTop: "var(--space-3)",
                }}
              >
                <tbody>
                  {s.table.map(([route, limit], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "var(--space-2) 0", color: "var(--color-text-secondary)" }}>{route}</td>
                      <td style={{ padding: "var(--space-2) 0", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>{limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}
      </div>

      <div
        style={{
          marginTop: "var(--space-12)",
          paddingTop: "var(--space-8)",
          borderTop: "1px solid var(--color-border-light)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        <p>
          Questions about security? Reach us at{" "}
          <span style={{ color: "var(--color-text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>
            security@fulkit.app
          </span>
        </p>
      </div>
    </div>
  );
}
