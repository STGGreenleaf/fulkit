"use client";

/**
 * Fülkit logo mark — the ü icon.
 * Uses the actual brand asset: public/logo-mark.png
 *
 * Usage:
 *   <LogoMark size={26} />
 */
export default function LogoMark({ size = 26, style }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      style={{
        flexShrink: 0,
        borderRadius: size > 20 ? "var(--radius-sm)" : 2,
        display: "block",
        ...style,
      }}
    />
  );
}
