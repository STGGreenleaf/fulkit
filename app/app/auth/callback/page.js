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

      // Debug: test if anon key has invalid header characters
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      try {
        new Headers({ apikey: key, Authorization: `Bearer ${key}` });
        console.log("[auth/callback] Headers OK");
      } catch (e) {
        console.error("[auth/callback] INVALID HEADER from anon key!", e.message);
        // Find the bad character
        for (let i = 0; i < key.length; i++) {
          const code = key.charCodeAt(i);
          if (code < 0x20 || code > 0x7e) {
            console.error(`[auth/callback] Bad char at index ${i}: charCode=${code} char=${JSON.stringify(key[i])}`);
          }
        }
        console.log("[auth/callback] Full key JSON:", JSON.stringify(key));
      }
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
