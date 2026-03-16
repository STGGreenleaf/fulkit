"use client";

import { useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import ChatContent from "../../components/ChatContent";
import { useTrack } from "../../lib/track";

export default function Chat() {
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "chat" }); }, []);

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <ChatContent />
      </div>
    </AuthGuard>
  );
}
