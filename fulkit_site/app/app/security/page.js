"use client";

import DocLayout, { DocSection } from "../../components/DocLayout";

const sections = [
  {
    title: "Encryption at rest",
    content: [
      "Every secret stored in Fülkit's database is encrypted with AES-256-GCM — the same standard used by banks, governments, and security-critical infrastructure.",
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
      ["Chat", "15 req/min"],
      ["Checkout", "5 req/min"],
      ["Referrals", "3 req/min"],
      ["API keys", "5 req/min"],
      ["All other routes", "60 req/min"],
    ],
  },
  {
    title: "Content Security Policy",
    content: [
      "Fülkit enforces a strict CSP that controls what the browser is allowed to load.",
    ],
    items: [
      "Scripts — only from fulkit.app and required SDKs. No eval()",
      "Connections — only to fulkit.app's own API. The browser never talks to third-party APIs directly",
      "Framing — frame-ancestors 'none'. Prevents clickjacking",
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
    <DocLayout title="Security" subtitle="Security is not a feature we added. It's the way we built everything else.">
      {sections.map((s) => (
        <DocSection key={s.title} title={s.title}>
          {s.content?.map((p, i) => (
            <p key={i} style={{ marginBottom: "var(--space-2)" }}>{p}</p>
          ))}
          {s.detail && (
            <p style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
              marginTop: "var(--space-2)",
            }}>
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
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)", marginTop: "var(--space-3)" }}>
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
        </DocSection>
      ))}

      <DocSection title="Contact">
        <p>
          Questions about security? Reach us at{" "}
          <span style={{ color: "var(--color-text)", fontWeight: "var(--font-weight-semibold)" }}>
            security@fulkit.app
          </span>
        </p>
      </DocSection>
    </DocLayout>
  );
}
