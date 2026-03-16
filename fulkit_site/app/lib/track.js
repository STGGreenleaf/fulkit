"use client";

import { useCallback } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

/**
 * useTrack() — fire-and-forget event tracking for feature usage.
 * Inserts into `user_events` via Supabase client (anon key + RLS).
 * Never blocks UI — swallows all errors silently.
 */
export function useTrack() {
  const { user } = useAuth();

  return useCallback(
    (event, meta = {}) => {
      if (!user?.id) return;
      // Skip tracking in dev mode
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("auth")) return;
      }
      supabase
        .from("user_events")
        .insert({
          user_id: user.id,
          event,
          page: typeof window !== "undefined" ? window.location.pathname : null,
          meta,
        })
        .then(() => {})
        .catch(() => {});
    },
    [user?.id]
  );
}
