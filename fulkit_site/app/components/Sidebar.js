"use client";

import { Home, MessageCircle, CheckSquare, LineSquiggle, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import MiniPlayer from "./MiniPlayer";
import LogoMark from "./LogoMark";
import Tooltip from "./Tooltip";

const ICON_SIZE = 18;

const NAV = [
  { id: "home", icon: Home, href: "/", label: "Home" },
  { id: "chat", icon: MessageCircle, href: "/chat", label: "Chat" },
  { id: "actions", icon: CheckSquare, href: "/actions", label: "Actions" },
  { id: "threads", icon: LineSquiggle, href: "/threads", label: "Threads" },
  { id: "settings", icon: Settings, href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { compactMode } = useAuth();

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
        <LogoMark size={22} />
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Tooltip key={item.id} label={compactMode ? item.label : null}>
              <Link
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
                  width: "100%",
                }}
              >
                <item.icon size={ICON_SIZE} strokeWidth={1.8} style={{ pointerEvents: "none" }} />
                {!compactMode && item.label}
              </Link>
            </Tooltip>
          );
        })}
      </div>

      {/* Mini Player — bottom of sidebar */}
      <MiniPlayer compact={compactMode} />
    </nav>
  );
}
