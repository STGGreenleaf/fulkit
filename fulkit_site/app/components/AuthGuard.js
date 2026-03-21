"use client";

import { useAuth, hasAuthResolved } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingMark from "./LoadingMark";

const MIN_SPLASH_MS = 1200; // short splash — fast cold start

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  // Only run the splash timer on cold start (auth never resolved before)
  const warm = hasAuthResolved();

  useEffect(() => {
    if (warm) {
      setSplashDone(true);
      return;
    }
    const t = setTimeout(() => setSplashDone(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, [warm]);

  useEffect(() => {
    if (loading || !splashDone) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading, splashDone, router]);

  // Cold start — show full splash animation
  if (loading && !warm) {
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

  // Waiting for splash to finish (cold start, auth resolved but animation still playing)
  if (!splashDone) {
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

  // Page content — fade in
  return (
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
        animation: "authFadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <style>{`@keyframes authFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
      {children}
    </div>
  );
}
