"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Signing in...");

  useEffect(() => {
    async function handleAuth() {
      const url = new URL(window.location.href);

      // Check for error in query params or hash (Supabase puts errors in both)
      const errorParam = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];
      if (errorParam) {
        const message = decodeURIComponent(errorParam.replace(/\+/g, " "));
        if (message.includes("expired")) {
          setStatus("expired");
        } else {
          setStatus(`Error: ${message}`);
        }
        return;
      }

      const code = url.searchParams.get("code");

      if (code) {
        // Try PKCE exchange first (works for OAuth + magic links opened in same browser)
        let { error } = await supabase.auth.exchangeCodeForSession(code);

        // If PKCE verifier missing (magic link opened in different browser/email app),
        // try verifyOtp as fallback with the token_hash if present
        if (error?.message?.includes("code verifier")) {
          const tokenHash = url.searchParams.get("token_hash");
          const type = url.searchParams.get("type") || "email";
          if (tokenHash) {
            const otpResult = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
            error = otpResult.error;
          }
        }

        console.log("[auth/callback] Auth result:", { error: error?.message });
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

  if (status === "expired" || status.startsWith("Error:")) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-primary)",
          background: "var(--color-bg)",
          padding: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "var(--font-size-4xl)", fontWeight: "var(--font-weight-black)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          {status === "expired" ? "Link expired" : "Oops"}
        </div>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)", maxWidth: 320 }}>
          {status === "expired"
            ? "That sign-in link is no longer valid. They only last a few minutes. Request a fresh one."
            : status.replace("Error: ", "")}
        </div>
        <a
          href="/login"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 280,
            textAlign: "center",
            padding: "var(--space-3)",
            background: "var(--color-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            textDecoration: "none",
          }}
        >
          {status === "expired" ? "Try again" : "Back to login"}
        </a>
      </div>
    );
  }

  return null;
}
