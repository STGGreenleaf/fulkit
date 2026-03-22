"use client";

import { useAuth, hasAuthResolved } from "../lib/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LoadingMark from "./LoadingMark";

const MIN_SPLASH_MS = 2800; // one full wink cycle (wink at 72-76% of 3.6s animation)

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

  const ready = splashDone && !loading && user;

  return (
    <>
      {/* Splash overlay — plays on cold start while children preload underneath */}
      {!ready && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-bg, #EFEDE8)",
          }}
        >
          <LoadingMark size={50} />
        </div>
      )}

      {/* Children always mount — start fetching during splash.
          Hidden until splash completes, then fade in. */}
      {user && (
        <div
          style={{
            flex: 1, display: "flex", flexDirection: "column", minHeight: 0,
            opacity: ready ? 1 : 0,
            animation: ready ? "authFadeIn 200ms cubic-bezier(0.22, 1, 0.36, 1) both" : "none",
            pointerEvents: ready ? "auto" : "none",
          }}
        >
          <style>{`@keyframes authFadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
          {children}
        </div>
      )}
    </>
  );
}
