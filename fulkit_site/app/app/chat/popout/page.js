"use client";

import AuthGuard from "../../../components/AuthGuard";
import ChatContent from "../../../components/ChatContent";

export default function PopoutChat() {
  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <ChatContent isPopout />
      </div>
    </AuthGuard>
  );
}
