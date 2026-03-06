"use client";

import { useState } from "react";
import { Home, MessageCircle, Mic, Settings, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import MiniPlayer from "./MiniPlayer";
import LogoMark from "./LogoMark";

const NAV = [
  { id: "home", icon: Home, href: "/home", label: "Home" },
  { id: "chat", icon: MessageCircle, href: "/chat", label: "Chat" },
  { id: "hum", icon: Mic, href: "/hum", label: "The Hum" },
  { id: "settings", icon: Settings, href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isOwner } = useAuth();

  return (
    <nav
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        borderRight: "1px solid var(--color-border-light)",
        display: "flex",
        flexDirection: "column",
        padding: "var(--space-4) var(--space-2-5)",
      }}
    >
      {/* Logo — triple-click to bypass to landing page (dev shortcut) */}
      <Link
        href="/home"
        onClick={(e) => {
          if (e.detail === 3) {
            e.preventDefault();
            window.location.href = "/landing";
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "0 var(--space-2-5)",
          marginBottom: "var(--space-6)",
          textDecoration: "none",
        }}
      >
        <LogoMark size={26} />
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
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-2-5)",
                borderRadius: "var(--radius-sm)",
                color: active ? "var(--color-text)" : "var(--color-text-muted)",
                fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                fontSize: "var(--font-size-base)",
                background: active ? "var(--color-bg-alt)" : "transparent",
                textDecoration: "none",
                transition: `all var(--duration-fast) var(--ease-default)`,
              }}
            >
              <item.icon size={18} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
        {/* Owner & Dev — separated from nav */}
        {isOwner && (
          <>
            <div style={{ margin: "var(--space-2) var(--space-2-5)", borderTop: "1px solid var(--color-border-light)" }} />
            <Link
              href="/owner"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-2-5)",
                borderRadius: "var(--radius-sm)",
                color: pathname === "/owner" ? "var(--color-text)" : "var(--color-text-muted)",
                fontWeight: pathname === "/owner" ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                fontSize: "var(--font-size-base)",
                background: pathname === "/owner" ? "var(--color-bg-alt)" : "transparent",
                textDecoration: "none",
              }}
            >
              <Crown size={18} strokeWidth={1.8} />
              Owner
            </Link>
            <DevToggle />
          </>
        )}
      </div>

      {/* Mini Player — bottom of sidebar */}
      <MiniPlayer />
    </nav>
  );
}

function DevToggle() {
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
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-2-5) var(--space-1) var(--space-8)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "var(--font-size-2xs)",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-primary)",
      }}
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
      Dev
    </button>
  );
}
