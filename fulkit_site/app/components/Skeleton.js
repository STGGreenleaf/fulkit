"use client";

/**
 * Skeleton — animated placeholder for loading states.
 * Warm monochrome pulse animation. Inline styles only.
 *
 * Usage:
 *   <Skeleton width={200} height={20} />              // rectangle
 *   <Skeleton width={40} height={40} circle />         // circle
 *   <Skeleton height={14} />                           // full-width line
 *   <Skeleton height={14} width="60%" />               // partial-width line
 */
export default function Skeleton({ width, height = 14, circle = false, style = {} }) {
  return (
    <div
      style={{
        width: circle ? height : (width || "100%"),
        height,
        borderRadius: circle ? "50%" : "var(--radius-sm, 4px)",
        background: "var(--color-bg-alt, #E8E5E0)",
        animation: "skeleton-pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/**
 * SkeletonGroup — common skeleton layouts for pages.
 */

export function DashboardSkeleton() {
  return (
    <div style={{ padding: "var(--space-4) var(--space-6)" }}>
      {/* Greeting */}
      <Skeleton width={280} height={28} style={{ marginBottom: "var(--space-6)" }} />

      {/* Stat cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ padding: "var(--space-4)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)" }}>
            <Skeleton width={80} height={10} style={{ marginBottom: "var(--space-2)" }} />
            <Skeleton width={120} height={22} />
          </div>
        ))}
      </div>

      {/* Section title */}
      <Skeleton width={140} height={14} style={{ marginBottom: "var(--space-3)" }} />

      {/* Cards */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ padding: "var(--space-4)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)" }}>
          <Skeleton width="70%" height={14} style={{ marginBottom: "var(--space-2)" }} />
          <Skeleton width="40%" height={11} />
        </div>
      ))}
    </div>
  );
}

export function ActionsSkeleton() {
  return (
    <div style={{ padding: "var(--space-4) var(--space-6)" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} width={36} height={36} style={{ borderRadius: "var(--radius-md)" }} />
        ))}
      </div>

      {/* Action items */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) 0", borderBottom: "1px solid var(--color-border-light)" }}>
          <Skeleton width={20} height={20} style={{ borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width={`${60 + Math.random() * 30}%`} height={14} style={{ marginBottom: 4 }} />
            <Skeleton width={80} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div style={{ padding: "var(--space-4) var(--space-6)" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} width={36} height={36} style={{ borderRadius: "var(--radius-md)" }} />
        ))}
      </div>

      {/* Section */}
      <Skeleton width={120} height={16} style={{ marginBottom: "var(--space-4)" }} />

      {/* Setting rows */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) 0", borderBottom: "1px solid var(--color-border-light)" }}>
          <div>
            <Skeleton width={160} height={14} style={{ marginBottom: 4 }} />
            <Skeleton width={220} height={10} />
          </div>
          <Skeleton width={44} height={24} style={{ borderRadius: 12 }} />
        </div>
      ))}
    </div>
  );
}
