import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Fülkit",
  description: "Terms of Service for Fülkit.",
};

export default function Terms() {
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
        Terms of Service
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
            What Fülkit is
          </h2>
          <p>
            Fülkit is an AI-powered personal knowledge assistant. You store notes,
            connect sources, and talk to an AI that has context on everything
            you've saved. It's your second brain.
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
            Your account
          </h2>
          <p>
            You sign in with Google. You're responsible for your account activity.
            One account per person. Don't share your access.
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
            Subscriptions and billing
          </h2>
          <p>
            Standard ($7/mo) and Pro ($12/mo) plans are billed monthly. Credits
            ($2/100 messages) are one-time purchases. Referral credits reduce your
            monthly bill but cannot be cashed out. Cancel anytime from Settings.
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
            Your data
          </h2>
          <p>
            You own your data. We store it to provide the service. You can export
            everything as markdown and delete your account at any time. See our{" "}
            <Link
              href="/privacy"
              style={{
                color: "var(--color-text)",
                textDecoration: "underline",
              }}
            >
              Privacy Policy
            </Link>{" "}
            for details.
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
            AI limitations
          </h2>
          <p>
            Fülkit uses AI that can make mistakes. Don't rely on it for medical,
            legal, or financial advice. It's a thinking partner, not an authority.
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
            Acceptable use
          </h2>
          <p>
            Don't use Fülkit for anything illegal, harmful, or that violates
            others' rights. We reserve the right to suspend accounts that abuse
            the service.
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
            Questions? Reach us at hello@fulkit.app.
          </p>
        </section>
      </div>
    </div>
  );
}
