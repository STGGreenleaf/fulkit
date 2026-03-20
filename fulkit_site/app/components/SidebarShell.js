"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import { useIsMobile } from "../lib/use-mobile";
import Sidebar from "./Sidebar";

// Header actions context — pages call setHeaderActions(<buttons>) on mount
const HeaderContext = createContext({ setHeaderActions: () => {} });
export function useHeaderActions() { return useContext(HeaderContext); }

const PAGE_NAMES = {
  "/": "Home",
  "/home": "Home",
  "/chat": "Chat",
  "/actions": "Actions",
  "/threads": "Threads",
  "/settings": "Settings",
  "/fabric": "Fabric",
  "/owner": "Owner",
  "/import": "Import",
  "/hum": "The Hum",
};

function getPageName(pathname) {
  if (PAGE_NAMES[pathname]) return PAGE_NAMES[pathname];
  // Match /settings/billing → Settings, /owner/dashboard → Owner
  for (const [path, name] of Object.entries(PAGE_NAMES)) {
    if (path !== "/" && pathname.startsWith(path + "/")) return name;
  }
  return null;
}

export default function SidebarShell({ children }) {
  const { user, compactMode } = useAuth();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [headerActions, setHeaderActionsRaw] = useState(null);
  const setHeaderActions = useCallback((actions) => setHeaderActionsRaw(actions), []);

  // No shell for unauthenticated users — just render children (public pages)
  if (!user) return children;

  const pageName = getPageName(pathname);

  return (
    <HeaderContext.Provider value={{ setHeaderActions }}>
      <div style={{ display: "flex", width: "100%", height: "100dvh", overflow: "hidden", paddingBottom: isMobile ? "var(--tab-bar-height, 56px)" : 0 }}>
        {!isMobile && <Sidebar />}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {/* Persistent app header — sticky + glassy, content scrolls behind it */}
          <div style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: isMobile ? "var(--space-2-5) var(--space-3)" : "var(--space-2-5) var(--space-6)",
            minHeight: 44,
            background: "rgba(239, 237, 232, 0.6)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(42, 40, 38, 0.08)",
          }}>
            <span style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
            }}>
              F&uuml;lkit
            </span>
            {!compactMode && !isMobile && pageName && pageName !== "Home" && (
              <>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-medium)" }}>/</span>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", fontWeight: "var(--font-weight-semibold)" }}>{pageName}</span>
              </>
            )}
            {/* Page-specific actions (right side) */}
            {headerActions && (
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                {headerActions}
              </div>
            )}
          </div>
          {/* Page content */}
          {children}
        </div>
      </div>
    </HeaderContext.Provider>
  );
}
