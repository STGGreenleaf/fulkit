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
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      console.log("[auth/callback] code:", code);
      console.log("[auth/callback] access_token:", accessToken ? "present" : "none");
      console.log("[auth/callback] refresh_token:", refreshToken ? "present" : "none");

      if (accessToken && refreshToken) {
        // Implicit flow — manually set session from hash tokens
        setStatus("Setting session...");
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        console.log("[auth/callback] setSession result:", { error: error?.message });
        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }
        router.replace("/home");
        return;
      }

      if (code) {
        // PKCE flow
        setStatus("Exchanging code...");
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-4)",
      }}
    >
      <div
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-black)",
          color: "var(--color-text-dim)",
        }}
      >
        F
      </div>
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
