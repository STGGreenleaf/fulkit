"use client";

import { useAuth } from "../lib/auth";
import { useIsMobile } from "../lib/use-mobile";
import Sidebar from "./Sidebar";

export default function SidebarShell({ children }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // No sidebar for unauthenticated users — just render children (public pages)
  if (!user) return children;

  return (
    <div style={{ display: "flex", width: "100%", height: "100dvh", overflow: "hidden", paddingBottom: isMobile ? "var(--tab-bar-height, 56px)" : 0 }}>
      {!isMobile && <Sidebar />}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
