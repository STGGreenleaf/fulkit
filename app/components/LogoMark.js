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
      {/* U shape */}
      <path
        d="M28 28h14v32c0 12 -1 18 8 18s8-6 8-18V28h14v32c0 20-8 30-22 30s-22-10-22-30V28z"
        fill={fill}
      />
      {/* Left dot */}
      <rect x="30" y="15" width="10" height="10" fill={fill} />
      {/* Right dot */}
      <rect x="60" y="15" width="10" height="10" fill={fill} />
    </svg>
  );
}
