"use client";

import { useAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingMark from "./LoadingMark";

const MIN_SPLASH_MS = 3600; // one full wink cycle

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !splashDone) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading, splashDone, router]);

  if (loading || !splashDone) {
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
        <LoadingMark size={50} />
      </div>
    );
  }

  if (!user) return null;

  return children;
}
