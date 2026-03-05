"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthConfirm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/home";

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error("Auth exchange error:", error.message);
            router.replace("/login");
          } else {
            router.replace(next);
          }
        });
    } else {
      router.replace("/login");
    }
  }, [router, searchParams]);

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
