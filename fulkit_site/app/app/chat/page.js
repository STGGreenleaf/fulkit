"use client";

import { useEffect } from "react";
// Sidebar moved to layout via SidebarShell
import AuthGuard from "../../components/AuthGuard";
import ChatContent from "../../components/ChatContent";
import { useTrack } from "../../lib/track";
import { useIsMobile } from "../../lib/use-mobile";

export default function Chat() {
  const track = useTrack();
  const isMobile = useIsMobile();
  useEffect(() => { track("page_view", { feature: "chat" }); }, []);

  return (
    <AuthGuard>
        <ChatContent />
    </AuthGuard>
  );
}
