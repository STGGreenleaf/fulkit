"use client";

import { Component } from "react";
import { emitSignal } from "../lib/signal";

/**
 * SignalBoundary — React ErrorBoundary that emits component_crash to Signal Radio.
 * Catches render errors that window.onerror misses. Mount once in layout.js.
 */
export default class SignalBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    emitSignal("component_crash", "error", {
      message: error?.message || "Unknown render error",
      stack: error?.stack?.split("\n").slice(0, 5).join(" | ") || null,
      component: errorInfo?.componentStack?.split("\n").slice(0, 5).join(" | ") || null,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100vh", background: "var(--color-bg, #1a1917)",
          color: "var(--color-text, #e8e6e1)", fontFamily: "var(--font-primary, system-ui)",
        }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong.
            </div>
            <div style={{ fontSize: 14, color: "var(--color-text-muted, #999)", marginBottom: 24 }}>
              This has been logged. Refresh to continue.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px", background: "var(--color-accent, #555)",
                color: "var(--color-text-inverse, #1a1917)", border: "none",
                borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
