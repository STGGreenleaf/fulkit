"use client";

import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import ChatContent from "../../components/ChatContent";

export default function Chat() {
  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <ChatContent />
      </div>
    </AuthGuard>
  );
}
