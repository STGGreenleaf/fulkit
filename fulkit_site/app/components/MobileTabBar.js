"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, CheckSquare, LineSquiggle, Settings } from "lucide-react";
import { useIsMobile } from "../lib/use-mobile";
import { useAuth } from "../lib/auth";

const TABS = [
  { id: "home", icon: Home, href: "/home", label: "Home" },
  { id: "chat", icon: MessageCircle, href: "/chat", label: "Chat" },
  { id: "actions", icon: CheckSquare, href: "/actions", label: "Actions" },
  { id: "threads", icon: LineSquiggle, href: "/threads", label: "Threads" },
  { id: "settings", icon: Settings, href: "/settings", label: "Settings" },
];

function getActiveTab(pathname) {
  if (pathname === "/" || pathname.startsWith("/home")) return "home";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/actions")) return "actions";
  if (pathname.startsWith("/threads")) return "threads";
  if (pathname.startsWith("/settings") || pathname.startsWith("/owner")) return "settings";
  return null;
}

export default function MobileTabBar() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { user } = useAuth();

  if (!isMobile) return null;

  // Only show for authenticated users on app pages
  if (!user) return null;

  const active = getActiveTab(pathname);

  // Don't show on public pages
  const publicPaths = ["/landing", "/login", "/about", "/privacy", "/terms", "/security", "/wtf", "/onboarding"];
  if (publicPaths.some(p => pathname.startsWith(p))) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--tab-bar-height, 56px)",
        background: "var(--color-bg)",
        borderTop: "1px solid var(--color-border-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 0",
              textDecoration: "none",
              color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
              flex: 1,
              transition: "color var(--duration-fast, 150ms) var(--ease-default, ease)",
            }}
          >
            <tab.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-primary)",
                fontWeight: isActive ? "var(--font-weight-semibold, 600)" : "var(--font-weight-normal, 400)",
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
