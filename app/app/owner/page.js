"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Palette,
  Users,
  Share2,
  Image,
  Crown,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "design", label: "Design", icon: Palette },
  { id: "users", label: "Users", icon: Users },
  { id: "socials", label: "Socials", icon: Share2 },
  { id: "og", label: "OG Creator", icon: Image },
];

export default function Owner() {
  const { isOwner } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");

  // Non-owners get bounced
  if (!isOwner) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              padding: "var(--space-2-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Crown size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Owner Portal
            </span>
          </div>

          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
                    borderBottom: active ? "1px solid var(--color-text)" : "1px solid transparent",
                    background: "transparent",
                    borderRadius: 0,
                    color: active ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: "var(--font-weight-medium)",
                    marginBottom: -1,
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                    transition: `all var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  <t.icon size={14} strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
            {tab === "dashboard" && <DashboardTab />}
            {tab === "design" && <PlaceholderTab title="Design System" description="Color editor, type preview, component preview. Coming soon." />}
            {tab === "users" && <PlaceholderTab title="Users" description="Invite tree, usage stats, revenue per user. Coming soon." />}
            {tab === "socials" && <PlaceholderTab title="Socials" description="Social post templates, scheduling, brand voice. Coming soon." />}
            {tab === "og" && <PlaceholderTab title="OG Image Creator" description="Template editor with brand tokens. Coming soon." />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function DashboardTab() {
  const metrics = [
    { label: "Total Users", value: "1", change: "You" },
    { label: "Active This Week", value: "1", change: "100%" },
    { label: "Messages Today", value: "0", change: "—" },
    { label: "MRR", value: "$0", change: "Pre-launch" },
  ];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-4)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>
              {m.change}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "var(--space-4)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        This is your command center. Metrics, user management, design tools, and content creation — all here. Tabs will fill in as we build them out.
      </div>
    </div>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        {title}
      </h2>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
        {description}
      </p>
    </div>
  );
}
