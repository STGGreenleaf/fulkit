"use client";

import Link from "next/link";
import LogoMark from "./LogoMark";
import { useIsMobile } from "../lib/use-mobile";

/**
 * DocLayout — shared layout for public document pages (Privacy, Terms, Security).
 * Matches the About page aesthetic: fixed nav, hero title, clean typography, footer.
 *
 * Usage: <DocLayout title="Privacy Policy" subtitle="Last updated March 2026">...content...</DocLayout>
 */
export default function DocLayout({ title, subtitle, children }) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        width: "100%",
        overflowX: "hidden",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-primary)",
      }}
    >
      {/* ─── NAV ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: "var(--z-sticky)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "var(--space-4)" : "var(--space-4) var(--space-8)",
          background: "rgba(239, 237, 232, 0.3)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tight)",
            textDecoration: "none",
            color: "var(--color-text)",
          }}
        >
          <LogoMark size={24} />
          Fülkit
        </Link>
        <div style={{ display: "flex", gap: isMobile ? "var(--space-5)" : "var(--space-6)", alignItems: "center" }}>
          <Link
            href="/about"
            style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
              padding: isMobile ? "var(--space-2)" : 0,
            }}
          >
            WTF
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              padding: isMobile ? "var(--space-2)" : 0,
            }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section
        style={{
          padding: isMobile ? "var(--space-24) var(--space-4) var(--space-12)" : "var(--space-24) var(--space-8) var(--space-12)",
          maxWidth: isMobile ? "none" : 900,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "-1.5px",
            lineHeight: "var(--line-height-none)",
            marginBottom: subtitle ? "var(--space-3)" : 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            fontWeight: "var(--font-weight-medium)",
          }}>
            {subtitle}
          </p>
        )}
      </section>

      {/* ─── CONTENT ─── */}
      <div
        style={{
          padding: isMobile ? "0 var(--space-4) var(--space-12)" : "0 var(--space-8) var(--space-16)",
          maxWidth: isMobile ? "none" : 900,
        }}
      >
        {children}
      </div>

      {/* ─── FOOTER ─── */}
      <footer
        style={{
          padding: isMobile ? "var(--space-8) var(--space-4)" : "var(--space-12) var(--space-8)",
          borderTop: "1px solid var(--color-border-light)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "var(--space-4)" : 0,
          maxWidth: isMobile ? "none" : 900,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          <LogoMark size={18} />
          Fülkit
        </div>
        <div style={{ display: "flex", gap: "var(--space-6)" }}>
          <Link href="/security" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Security</Link>
          <Link href="/privacy" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}

/**
 * DocSection — a titled section within a document page.
 * Dieter Rams typography: large bold title, relaxed body text.
 */
export function DocSection({ title, children }) {
  return (
    <section style={{ marginBottom: "var(--space-12)" }}>
      <h2
        style={{
          fontSize: "var(--font-size-xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tight)",
          lineHeight: "var(--line-height-tight)",
          marginBottom: "var(--space-4)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: "var(--font-size-base)",
          lineHeight: "var(--line-height-relaxed)",
          color: "var(--color-text-secondary)",
          maxWidth: 600,
        }}
      >
        {children}
      </div>
    </section>
  );
}
