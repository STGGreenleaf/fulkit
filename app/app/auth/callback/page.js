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

      console.log("[auth/callback] URL:", window.location.href);
      console.log("[auth/callback] code:", code);
      console.log("[auth/callback] access_token:", accessToken ? "present" : "none");

      if (code) {
        // PKCE flow
        setStatus("Exchanging code...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        console.log("[auth/callback] PKCE exchange result:", { data: !!data?.session, error: error?.message });
        if (error) {
          setStatus(`Error: ${error.message}`);
          return;
        }
        router.replace("/home");
        return;
      }

      if (accessToken) {
        // Implicit flow — tokens in hash, client should auto-detect
        setStatus("Processing tokens...");
        const { data, error } = await supabase.auth.getSession();
        console.log("[auth/callback] Implicit session:", { data: !!data?.session, error: error?.message });
        if (data?.session) {
          router.replace("/home");
          return;
        }
        setStatus(`Error: session not established from hash tokens`);
        return;
      }

      // No code or tokens — check if session already exists
      setStatus("Checking session...");
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        router.replace("/home");
        return;
      }

      setStatus("No auth code or tokens found in URL. Check console.");
      console.error("[auth/callback] No code or access_token found. Full URL:", window.location.href);
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
