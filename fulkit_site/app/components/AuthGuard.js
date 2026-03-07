"use client";

import { useAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LogoMark from "./LogoMark";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
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
        <LogoMark size={24} />
      </div>
    );
  }

  if (!user) return null;

  return children;
}
