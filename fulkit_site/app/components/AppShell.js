"use client";

/**
 * AppShell — The one grid that rules them all.
 *
 * Provides:
 * - Persistent sidebar (never remounts across navigation)
 * - Persistent glassy header with "Fülkit" + page name
 * - Toolbar slot for per-page buttons (via useToolbar hook)
 * - Consistent grid for both app and public pages
 *
 * Architecture:
 * - Authenticated: sidebar column + content column (header + scrollable content)
 * - Unauthenticated: content column only (header adapts, no sidebar)
 * - Mobile: no sidebar, bottom tab bar handled by MobileTabBar in layout
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useIsMobile } from "../lib/use-mobile";
import Sidebar from "./Sidebar";

// ─── Toolbar Context ──────────────────────────────────────
const ToolbarContext = createContext({ setToolbar: () => {} });

export function useToolbar() {
  return useContext(ToolbarContext);
}

// ─── Page Names ───────────────────────────────────────────
const PAGE_NAMES = {
  "/": null,
  "/home": null,
  "/chat": "Chat",
  "/actions": "Actions",
  "/threads": "Threads",
  "/settings": "Settings",
  "/fabric": "Fabric",
  "/owner": "Owner",
  "/import": "Import",
  "/hum": "The Hum",
  "/landing": null,
  "/login": null,
  "/about": null,
  "/privacy": "Privacy",
  "/terms": "Terms",
  "/wtf": null,
  "/onboarding": null,
};

function getPageName(pathname) {
  if (PAGE_NAMES[pathname] !== undefined) return PAGE_NAMES[pathname];
  for (const [path, name] of Object.entries(PAGE_NAMES)) {
    if (path !== "/" && pathname.startsWith(path + "/")) return name;
  }
  return null;
}

// ─── AppShell ─────────────────────────────────────────────
export default function AppShell({ children }) {
  const { user, compactMode } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const [toolbar, setToolbarRaw] = useState(null);
  const setToolbar = useCallback((content) => setToolbarRaw(content), []);

  // ─── Global hotkeys ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const onKey = (e) => {
      // Don't intercept when typing in inputs
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.contentEditable === "true") return;

      const cmd = e.metaKey || e.ctrlKey;
      if (!cmd) return;

      if (e.key === "n") { e.preventDefault(); router.push("/chat"); return; }
      if (e.key === "j") { e.preventDefault(); router.push("/threads"); return; }
      if (e.key === "h") { e.preventDefault(); router.push("/home"); return; }
      if (e.shiftKey && (e.key === "c" || e.key === "C")) { e.preventDefault(); window.open("/chat/popout", "fulkit-popout", "width=400,height=600,resizable=yes,scrollbars=yes"); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, router]);

  // Clear toolbar on navigation
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      setToolbarRaw(null);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  const pageName = getPageName(pathname);
  const isAuthenticated = !!user;
  const contextValue = useMemo(() => ({ setToolbar }), [setToolbar]);

  // Standalone pages — no shell, they handle their own layout
  const standalone = ["/landing", "/wtf"];
  const isStandalone = standalone.some(p => pathname === p || pathname.startsWith(p + "/"));
  if (!isAuthenticated || isStandalone) return <ToolbarContext.Provider value={contextValue}>{children}</ToolbarContext.Provider>;

  return (
    <ToolbarContext.Provider value={contextValue}>
      <div style={{
        display: "flex",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        paddingBottom: isMobile && isAuthenticated ? "var(--tab-bar-height, 56px)" : 0,
      }}>
        {/* Sidebar column — authenticated desktop only */}
        {isAuthenticated && !isMobile && <Sidebar />}

        {/* Content column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Glassy header — persistent, sticky feel */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: isMobile ? "var(--space-2-5) var(--space-3)" : "var(--space-2-5) var(--space-6)",
            minHeight: 44,
            background: "rgba(239, 237, 232, 0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(42, 40, 38, 0.08)",
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
              marginTop: 4,
            }}>
              F{"\u00FC"}lkit
            </span>
            {!compactMode && !isMobile && pageName && (
              <>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-medium)" }}>/</span>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>{pageName}</span>
              </>
            )}
            <div id="appshell-toolbar" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? "var(--space-3)" : "var(--space-2)" }}>
              {toolbar}
            </div>
            {/* Public pages bypass AppShell entirely — no unauthenticated header needed */}
          </div>

          {/* Page content — fills remaining space, pages manage own scroll */}
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        </div>
      </div>
    </ToolbarContext.Provider>
  );
}
