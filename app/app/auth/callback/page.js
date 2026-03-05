"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      // PKCE flow — exchange code for session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          router.replace(error ? "/login" : "/home");
        });
    } else {
      // Implicit flow — tokens in hash, browser client auto-detects
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.replace(session ? "/home" : "/login");
      });
    }
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "var(--font-size-2xl)",
        fontWeight: "var(--font-weight-black)",
        color: "var(--color-text-dim)",
      }}
    >
      F
    </div>
  );
}
