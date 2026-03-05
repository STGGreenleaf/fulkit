import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Fülkit",
  description: "How Fülkit handles your data.",
};

export default function Privacy() {
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
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "var(--radius-xs)",
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-inverse)",
            fontSize: "var(--font-size-2xs)",
            fontWeight: "var(--font-weight-black)",
          }}
        >
          F
        </div>
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          Fülkit
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
        Privacy Policy
      </h1>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-10)",
        }}
      >
        Last updated: March 2026
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
        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            The short version
          </h2>
          <p>
            Your data is yours. We store what you give us so your second brain works.
            We don't sell your data. We don't train on your data. You can export
            everything as markdown and delete your account at any time.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            What we collect
          </h2>
          <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <li>Account info (name, email via Google sign-in)</li>
            <li>Notes and documents you upload or create</li>
            <li>AI conversation history</li>
            <li>Learned preferences from your interactions</li>
            <li>Usage data (message counts, feature usage)</li>
          </ul>
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            How we use it
          </h2>
          <p>
            To make your second brain work. Your notes are embedded and stored so
            the AI can retrieve them. Your preferences are learned so the AI can
            talk to you the way you want. That's it.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            Third parties
          </h2>
          <ul style={{ paddingLeft: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <li>Anthropic (Claude API) — processes your messages, does not retain them</li>
            <li>Supabase — database and authentication hosting</li>
            <li>Stripe — payment processing</li>
            <li>Google — OAuth sign-in only</li>
          </ul>
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            Your rights
          </h2>
          <p>
            Export all your data as markdown at any time from Settings. Delete
            specific memories, conversations, or your entire account. No lock-in,
            ever.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text)",
              marginBottom: "var(--space-3)",
            }}
          >
            Contact
          </h2>
          <p>
            Questions? Reach us at privacy@fulkit.app.
          </p>
        </section>
      </div>
    </div>
  );
}
