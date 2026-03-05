"use client";

import { useAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/landing");
    } else if (!loading && user?.isNew) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-inverse)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-black)",
          }}
        >
          F
        </div>
      </div>
    );
  }

  if (!user || user.isNew) return null;

  return children;
}
