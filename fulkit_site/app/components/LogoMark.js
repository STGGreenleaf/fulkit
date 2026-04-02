"use client";

import LoadingMark from "./LoadingMark";

/**
 * Fülkit logo mark — the animated winking ü.
 *
 * Usage:
 *   <LogoMark size={26} />
 */
export default function LogoMark({ size = 26, style }) {
  return (
    <span style={{ display: "inline-flex", flexShrink: 0, ...style }}>
      <LoadingMark size={size} />
    </span>
  );
}
