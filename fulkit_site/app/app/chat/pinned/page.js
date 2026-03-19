"use client";

import { useEffect } from "react";
import Sidebar from "../../../components/Sidebar";
import AuthGuard from "../../../components/AuthGuard";
import ChatContent from "../../../components/ChatContent";
import { useTrack } from "../../../lib/track";
import { useIsMobile } from "../../../lib/use-mobile";

export default function ChatPinned() {
  const track = useTrack();
  const isMobile = useIsMobile();
  useEffect(() => { track("page_view", { feature: "chat_pinned" }); }, []);

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100dvh", overflow: "hidden", paddingBottom: isMobile ? "var(--tab-bar-height, 56px)" : 0 }}>
        {!isMobile && <Sidebar />}
        <ChatContent initialPanel="pinned" />
      </div>
    </AuthGuard>
  );
}
