"use client";

// Downtime banner — shown when Claude API is degraded or down.
// Warm monochrome, subtle, informative. Disappears when status clears.
export default function StatusBanner({ description }) {
  return (
    <div style={{
      padding: "var(--space-2) var(--space-4)",
      background: "var(--color-bg-warm, #F5F0EB)",
      borderBottom: "1px solid var(--color-border-light, #E0DBD5)",
      fontSize: "var(--font-size-xs, 12px)",
      color: "var(--color-text-muted, #8A857F)",
      fontFamily: "var(--font-primary)",
      textAlign: "center",
      lineHeight: 1.4,
    }}>
      Chat is temporarily unavailable{description ? ` \u2014 ${description}` : ""}.{" "}
      <a
        href="https://status.claude.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        Check status
      </a>
    </div>
  );
}
