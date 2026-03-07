"use client";

import { useState } from "react";
import { Home, MessageCircle, CheckSquare, Settings, Crown, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import MiniPlayer from "./MiniPlayer";
import LogoMark from "./LogoMark";

const NAV = [
  { id: "home", icon: Home, href: "/", label: "Home" },
  { id: "chat", icon: MessageCircle, href: "/chat", label: "Chat" },
  { id: "actions", icon: CheckSquare, href: "/actions", label: "Actions" },
  { id: "settings", icon: Settings, href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOwner, compactMode, setCompactMode } = useAuth();

  return (
    <nav
      style={{
        width: compactMode ? 56 : "var(--sidebar-width)",
        minWidth: compactMode ? 56 : "var(--sidebar-width)",
        borderRight: "1px solid var(--color-border-light)",
        display: "flex",
        flexDirection: "column",
        padding: compactMode ? "var(--space-4) var(--space-1-5)" : "var(--space-4) var(--space-2-5)",
        transition: "width var(--duration-fast) var(--ease-default), min-width var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Logo — triple-click to bypass to landing page (dev shortcut) */}
      <Link
        href="/"
        onClick={(e) => {
          if (e.detail === 3) {
            e.preventDefault();
            window.location.href = "/";
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: compactMode ? "center" : "flex-start",
          gap: "var(--space-2)",
          padding: compactMode ? "0" : "0 var(--space-2-5)",
          marginBottom: "var(--space-6)",
          textDecoration: "none",
        }}
      >
        <LogoMark size={compactMode ? 22 : 26} />
        {!compactMode && (
          <span
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
            }}
          >
            Fülkit
          </span>
        )}
      </Link>

      {/* Nav items */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: compactMode ? "center" : "flex-start",
                gap: "var(--space-2)",
                padding: compactMode ? "var(--space-2)" : "var(--space-2) var(--space-2-5)",
                borderRadius: "var(--radius-sm)",
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                fontSize: "var(--font-size-base)",
                background: active ? "var(--color-bg-alt)" : "transparent",
                textDecoration: "none",
                transition: `all var(--duration-fast) var(--ease-default)`,
              }}
              title={compactMode ? item.label : undefined}
            >
              <item.icon size={18} strokeWidth={1.8} />
              {!compactMode && item.label}
            </Link>
          );
        })}
        {/* Compact toggle — below nav, available to all */}
        <div style={{ margin: compactMode ? "var(--space-2) 0" : "var(--space-2) var(--space-2-5)", borderTop: "1px solid var(--color-border-light)" }} />
        <CompactToggle compact={compactMode} onToggle={() => setCompactMode(!compactMode)} />

        {/* Owner & Dev — separated from nav */}
        {isOwner && (
          <>
            <div style={{ margin: compactMode ? "var(--space-2) 0" : "var(--space-2) var(--space-2-5)", borderTop: "1px solid var(--color-border-light)" }} />
            <Link
              href="/owner"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: compactMode ? "center" : "flex-start",
                gap: "var(--space-2)",
                padding: compactMode ? "var(--space-2)" : "var(--space-2) var(--space-2-5)",
                borderRadius: "var(--radius-sm)",
                color: pathname === "/owner" ? "var(--color-text)" : "var(--color-text-muted)",
                fontWeight: pathname === "/owner" ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                fontSize: "var(--font-size-base)",
                background: pathname === "/owner" ? "var(--color-bg-alt)" : "transparent",
                textDecoration: "none",
              }}
              title={compactMode ? "Owner" : undefined}
            >
              <Crown size={18} strokeWidth={1.8} />
              {!compactMode && "Owner"}
            </Link>
            <DevToggle compact={compactMode} />
          </>
        )}
      </div>

      {/* Mini Player — bottom of sidebar */}
      {!compactMode && <MiniPlayer />}
    </nav>
  );
}

function CompactToggle({ compact, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: "var(--space-2)",
        padding: compact ? "var(--space-1)" : "var(--space-1) var(--space-2-5) var(--space-1) var(--space-8)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "var(--font-size-2xs)",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-primary)",
        width: "100%",
      }}
      title={compact ? "Expand sidebar" : "Compact mode"}
    >
      {/* Pill switch */}
      <div
        style={{
          width: 22,
          height: 12,
          borderRadius: 6,
          border: "1px solid var(--color-text-muted)",
          background: compact ? "var(--color-text-muted)" : "transparent",
          position: "relative",
          transition: "all var(--duration-fast) var(--ease-default)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: compact ? "var(--color-bg)" : "var(--color-text-muted)",
            position: "absolute",
            top: 1,
            left: compact ? 11 : 1,
            transition: "left var(--duration-fast) var(--ease-default)",
          }}
        />
      </div>
      {!compact && <PanelLeftClose size={12} strokeWidth={1.8} />}
    </button>
  );
}

function DevToggle({ compact }) {
  const [on, setOn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fulkit-dev-mode") === "true";
    }
    return false;
  });

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem("fulkit-dev-mode", String(next));
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: "var(--space-2)",
        padding: compact ? "var(--space-1)" : "var(--space-1) var(--space-2-5) var(--space-1) var(--space-8)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "var(--font-size-2xs)",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-primary)",
        width: "100%",
      }}
      title={compact ? "Dev mode" : undefined}
    >
      {/* Pill switch */}
      <div
        style={{
          width: 22,
          height: 12,
          borderRadius: 6,
          border: "1px solid var(--color-text-muted)",
          background: on ? "var(--color-text-muted)" : "transparent",
          position: "relative",
          transition: "all var(--duration-fast) var(--ease-default)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: on ? "var(--color-bg)" : "var(--color-text-muted)",
            position: "absolute",
            top: 1,
            left: on ? 11 : 1,
            transition: "left var(--duration-fast) var(--ease-default)",
          }}
        />
      </div>
      {!compact && "Dev"}
    </button>
  );
}
