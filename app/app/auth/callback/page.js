"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Signing in...");

  useEffect(() => {
    async function handleAuth() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        // PKCE flow — exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        console.log("[auth/callback] PKCE result:", { error: error?.message });
        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }
        window.location.href = "/home";
        return;
      }

      setStatus("No auth tokens found. Check console.");
      console.error("[auth/callback] No code or access_token in URL");
    }

    handleAuth();
  }, []);

  if (status.startsWith("Error:")) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          {status}
        </div>
      </div>
    );
  }

  return null;
}
