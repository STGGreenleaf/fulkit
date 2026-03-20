"use client";

import { useEffect } from "react";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import ChatContent from "../../components/ChatContent";
import { useTrack } from "../../lib/track";

export default function Chat() {
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "chat" }); }, []);

  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}
