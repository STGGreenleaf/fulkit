"use client";

import { useState } from "react";
import LoadingMark from "../../components/LoadingMark";

const SIZES = [40, 50, 60, 72, 80, 96];

export default function LoadingPreview() {
  const [size, setSize] = useState(72);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-bg)", fontFamily: "var(--font-primary)" }}>
      {/* Size picker */}
      <div style={{ display: "flex", gap: 8, padding: 16, justifyContent: "center", alignItems: "center", borderBottom: "1px solid var(--color-border-light)" }}>
        {SIZES.map(s => (
          <button
            key={s}
            onClick={() => setSize(s)}
            style={{
              padding: "4px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
              background: s === size ? "var(--color-text)" : "transparent",
              color: s === size ? "var(--color-bg)" : "var(--color-text-secondary)",
              fontSize: 13, fontFamily: "var(--font-mono)", cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Side-by-side: desktop + mobile */}
      <div style={{ flex: 1, display: "flex", gap: 24, padding: 24, alignItems: "stretch" }}>
        {/* Desktop */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>DESKTOP</span>
          <div style={{
            flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--color-bg)", border: "1px solid var(--color-border-light)", borderRadius: 8,
          }}>
            <LoadingMark size={size} />
          </div>
        </div>

        {/* Mobile */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>MOBILE</span>
          <div style={{
            width: 390, height: 844, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--color-bg)", border: "1px solid var(--color-border-light)", borderRadius: 16,
          }}>
            <LoadingMark size={size} />
          </div>
        </div>
      </div>
    </div>
  );
}
