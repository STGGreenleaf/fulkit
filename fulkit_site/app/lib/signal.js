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

    // ── Rage click detection (beta: any same-element rapid clicks) ──
    let lastClickTarget = null;
    const onClick = (e) => {
      const target = e.target;
      if (!target) return;
      const identifier = target.tagName + (target.id ? `#${target.id}` : "") + (target.className?.toString?.().slice(0, 40) || "");
      const now = Date.now();
      if (identifier !== lastClickTarget) {
        rageRef.current = [];
        lastClickTarget = identifier;
      }
      rageRef.current.push(now);
      rageRef.current = rageRef.current.filter((t) => now - t < 2000);
      if (rageRef.current.length >= 3) {
        const isDisabled = target.disabled || target.getAttribute("aria-disabled") === "true" || target.closest("[disabled]");
        emitSignal("rage_click", "info", {
          clicks: rageRef.current.length,
          target: identifier.slice(0, 80),
          disabled: isDisabled || false,
          page: window.location.pathname,
        });
        rageRef.current = [];
      }
    };

    // ── Long tasks (UI jank > 500ms) ──
    let longTaskObserver = null;
    if (typeof PerformanceObserver !== "undefined") {
      try {
        longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 500) {
              emitSignal("long_task", "warning", {
                duration: Math.round(entry.duration),
                page: window.location.pathname,
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ["longtask"] });
      } catch {}
    }

    // ── Tab bounce (left within 10s of arriving) ──
    const arrivalTime = Date.now();
    let bounceReported = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !bounceReported) {
        const timeOnPage = Date.now() - arrivalTime;
        if (timeOnPage < 10000) {
          emitSignal("tab_bounce", "info", {
            timeOnPage,
            page: window.location.pathname,
          });
          bounceReported = true;
        }
      }
    };

    // ── Slow page load (> 3s to interactive) ──
    try {
      const navEntry = performance.getEntriesByType?.("navigation")?.[0];
      if (navEntry?.domInteractive && navEntry.domInteractive > 3000) {
        emitSignal("slow_page_load", "warning", {
          domInteractive: Math.round(navEntry.domInteractive),
          loadComplete: Math.round(navEntry.loadEventEnd || 0),
          page: window.location.pathname,
        });
      }
    } catch {}

    // ── Fetch interceptor (catch all 5xx responses) ──
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args);
        if (res.status >= 500) {
          const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
          emitSignal("fetch_error", "error", {
            url: url.split("?")[0], // strip query params
            status: res.status,
            page: window.location.pathname,
          });
        }
        return res;
      } catch (err) {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        emitSignal("fetch_error", "error", {
          url: url.split("?")[0],
          message: err.message,
          page: window.location.pathname,
        });
        throw err;
      }
    };

    // ── Core Web Vitals (emit only when bad) ──
    let lcpObserver = null;
    let clsObserver = null;
    if (typeof PerformanceObserver !== "undefined") {
      // LCP > 4s = slow
      try {
        lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries[entries.length - 1];
          if (lcp && lcp.startTime > 4000) {
            emitSignal("slow_lcp", "warning", {
              lcp: Math.round(lcp.startTime),
              page: window.location.pathname,
            });
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {}

      // CLS > 0.25 = layout shift problem
      try {
        let clsValue = 0;
        clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) clsValue += entry.value;
          }
          if (clsValue > 0.25) {
            emitSignal("high_cls", "warning", {
              cls: clsValue.toFixed(3),
              page: window.location.pathname,
            });
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });
      } catch {}
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (longTaskObserver) longTaskObserver.disconnect();
      if (lcpObserver) lcpObserver.disconnect();
      if (clsObserver) clsObserver.disconnect();
      window.fetch = origFetch;
    };
  }, [user?.id]);

  return null;
}
