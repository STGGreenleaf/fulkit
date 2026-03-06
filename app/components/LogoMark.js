"use client";

/**
 * Fülkit logo mark — the ü icon.
 * Single source: update assets/brand/umlaut0.png and regenerate.
 *
 * Usage:
 *   <LogoMark size={26} />              — default (black bg, gray ü)
 *   <LogoMark size={16} bg="transparent" fill="#171717" />  — dark ü, no bg
 */
export default function LogoMark({
  size = 26,
  bg = "#171717",
  fill = "#c0c0c0",
  style,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ flexShrink: 0, borderRadius: size > 20 ? "var(--radius-sm)" : 2, ...style }}
    >
      <circle cx="50" cy="50" r="50" fill={bg} />
      {/* U shape — thick stems with semicircular bottom */}
      <path
        d="M20 26 V50 A30 30 0 0 1 80 50 V26 H60 V50 A10 10 0 0 0 40 50 V26 Z"
        fill={fill}
      />
      {/* Left dot */}
      <rect x="23" y="11" width="13" height="13" fill={fill} />
      {/* Right dot */}
      <rect x="63" y="11" width="13" height="13" fill={fill} />
    </svg>
  );
}
