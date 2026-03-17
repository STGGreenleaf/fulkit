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

        // Claim referral if cookie exists
        const refMatch = document.cookie.match(/fulkit-ref=([^;]+)/);
        if (refMatch) {
          const refCode = decodeURIComponent(refMatch[1]);
          // Clear cookie immediately
          document.cookie = "fulkit-ref=;path=/;max-age=0";
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              await fetch("/api/referrals/claim", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ code: refCode }),
              });
            }
          } catch (e) {
            console.error("[auth/callback] referral claim failed:", e);
          }
        }

        window.location.href = "/";
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
