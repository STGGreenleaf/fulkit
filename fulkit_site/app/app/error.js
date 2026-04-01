"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("[error-boundary]", error?.message, error?.stack);
    try {
      const { emitSignal } = require("../../lib/signal");
      emitSignal("client_error", "error", { message: error?.message, page: window.location.pathname });
    } catch {}
  }, [error]);
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
        Oops
      </div>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)", maxWidth: 320 }}>
        Something went wrong. It{"\u2019"}s not you. Give it another shot or head back.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%", maxWidth: 280 }}>
        <button
          onClick={() => reset()}
          style={{
            display: "block",
            width: "100%",
            padding: "var(--space-3)",
            background: "var(--color-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            padding: "var(--space-3)",
            background: "transparent",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            fontFamily: "var(--font-primary)",
            textDecoration: "none",
          }}
        >
          Back to F{"\u00FC"}lkit
        </Link>
      </div>
    </div>
  );
}
