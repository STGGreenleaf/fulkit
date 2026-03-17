"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

// Module-level ref so emitSignal() works outside React
let _userId = null;

// Browser fingerprint — auto-appended to every client-side signal
function getClientContext() {
  if (typeof window === "undefined") return {};
  return {
    url: window.location.pathname + window.location.search,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    connection: navigator.connection?.effectiveType || null,
    downlink: navigator.connection?.downlink || null,
    visibility: document.visibilityState,
    memory: performance.memory?.usedJSHeapSize ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  };
}

/**
 * useSignal() — fire-and-forget signal emission for error/frustration tracking.
 * Inserts into `user_events` with `signal:` prefix. Never blocks UI.
 * Auto-appends browser context to every signal.
 */
export function useSignal() {
  const { user } = useAuth();

  return useCallback(
    (signal, severity = "info", detail = {}) => {
      const uid = user?.id;
      if (!uid) return;
      // Skip in dev mode
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("auth")) return;
      }
      supabase
        .from("user_events")
        .insert({
          user_id: uid,
          event: `signal:${signal}`,
          page: typeof window !== "undefined" ? window.location.pathname : null,
          meta: { severity, ...detail, _client: getClientContext() },
        })
        .then(() => {})
        .catch(() => {});
    },
    [user?.id]
  );
}

/**
 * emitSignal() — standalone signal emission for non-React contexts.
 * Uses module-level userId set by SignalCollector.
 */
export function emitSignal(signal, severity = "info", detail = {}) {
  if (!_userId) return;
  // Skip in dev mode
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth")) return;
  }
  supabase
    .from("user_events")
    .insert({
      user_id: _userId,
      event: `signal:${signal}`,
      page: typeof window !== "undefined" ? window.location.pathname : null,
      meta: { severity, ...detail, _client: getClientContext() },
    })
    .then(() => {})
    .catch(() => {});
}

/**
 * SignalCollector — mount once in layout.js.
 * Captures global JS errors, unhandled rejections, offline/online,
 * quick reloads, and rage clicks. Renders nothing.
 */
export function SignalCollector() {
  const { user } = useAuth();
  const rageRef = useRef([]);

  // Keep module-level userId in sync
  useEffect(() => {
    _userId = user?.id || null;
    return () => { _userId = null; };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Skip in dev mode
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth")) return;

    // ── Global JS errors ──
    const onError = (event) => {
      emitSignal("js_error", "error", {
        message: event.message || "Unknown error",
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
        stack: event.error?.stack?.split("\n").slice(0, 3).join(" | ") || null,
      });
    };

    // ── Unhandled promise rejections ──
    const onRejection = (event) => {
      const reason = event.reason;
      emitSignal("promise_rejection", "error", {
        message: reason?.message || String(reason || "Unknown rejection"),
        stack: reason?.stack?.split("\n").slice(0, 3).join(" | ") || null,
      });
    };

    // ── Offline / Online ──
    const onOffline = () => emitSignal("offline", "info");
    const onOnline = () => emitSignal("reconnect", "info");

    // ── Quick reload detection ──
    const nav = performance.getEntriesByType?.("navigation")?.[0];
    if (nav?.type === "reload") {
      const prevTimestamp = sessionStorage.getItem("fulkit-page-ts");
      if (prevTimestamp) {
        const elapsed = Date.now() - Number(prevTimestamp);
        if (elapsed < 10000) {
          emitSignal("quick_reload", "info", { elapsed });
        }
      }
    }
    sessionStorage.setItem("fulkit-page-ts", String(Date.now()));

    // ── Rage click detection ──
    const onClick = (e) => {
      const target = e.target;
      if (!target) return;
      // Only track clicks on disabled elements or elements with pointer-events issues
      const isDisabled = target.disabled || target.getAttribute("aria-disabled") === "true" || target.closest("[disabled]");
      if (!isDisabled) {
        rageRef.current = [];
        return;
      }
      const now = Date.now();
      rageRef.current.push(now);
      // Keep only clicks within last 2 seconds
      rageRef.current = rageRef.current.filter((t) => now - t < 2000);
      if (rageRef.current.length >= 3) {
        emitSignal("rage_click", "info", {
          clicks: rageRef.current.length,
          target: target.tagName?.toLowerCase(),
          page: window.location.pathname,
        });
        rageRef.current = [];
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("click", onClick, true);
    };
  }, [user?.id]);

  return null;
}
