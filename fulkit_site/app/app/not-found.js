import Link from "next/link";

export const metadata = {
  title: "Not Found — Fülkit",
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-primary)",
        background: "var(--color-bg)",
        color: "var(--color-text-primary)",
        padding: "var(--space-6)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "var(--font-weight-black)", marginBottom: "var(--space-2)" }}>
        404
      </div>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)", maxWidth: 320 }}>
        This page doesn{"\u2019"}t exist. Maybe it did once. Maybe it never will. Either way, let{"\u2019"}s get you back.
      </div>
      <Link
        href="/"
        style={{
          display: "block",
          width: "100%",
          maxWidth: 280,
          textAlign: "center",
          padding: "var(--space-3)",
          background: "var(--color-accent)",
          color: "var(--color-text-inverse)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-primary)",
          textDecoration: "none",
        }}
      >
        Back to F{"\u00FC"}lkit
      </Link>
    </div>
  );
}
