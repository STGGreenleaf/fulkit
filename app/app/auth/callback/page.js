"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing in...");

  useEffect(() => {
    async function handleAuth() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      // Debug: check env vars for invisible characters
      const url2 = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      console.log("[auth/callback] SUPABASE_URL length:", url2.length, "ends with:", JSON.stringify(url2.slice(-5)));
      console.log("[auth/callback] ANON_KEY length:", key.length, "ends with:", JSON.stringify(key.slice(-5)));
      console.log("[auth/callback] code:", code ? "present" : "none");

      if (code) {
        // PKCE flow — exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        console.log("[auth/callback] PKCE result:", { error: error?.message });
        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }
        router.replace("/home");
        return;
      }

      setStatus("No auth tokens found. Check console.");
      console.error("[auth/callback] No code or access_token in URL");
    }

    handleAuth();
  }, [router]);

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
