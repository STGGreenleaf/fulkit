"use client";

import { useEffect } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

// Maps completion_trigger values → feature names from track() calls
const TRIGGER_MAP = {
  visited_inbox: "home",
  performed_search: "chat",
  visited_threads: "threads",
  visited_calendar: "threads",
  used_capture: "hum",
  visited_action_list: "actions",
  visited_settings: "settings",
  visited_bsides: "fabric",
};

/**
 * Call on each feature page to check if visiting this page
 * completes a pending onboarding tier assignment.
 * Fire-and-forget — never blocks UI.
 */
export function useOnboardingTrigger(feature) {
  const { user, onboardingState, fetchProfile } = useAuth();

  useEffect(() => {
    if (!user?.id || !onboardingState) return;
    if (onboardingState.isOnboardingDone) return;

    const pending = onboardingState.pendingTrigger;
    if (!pending) return;

    // Check if this feature matches the pending trigger
    const expectedFeature = TRIGGER_MAP[pending];
    if (expectedFeature !== feature) return;

    // Mark assignment as done
    supabase
      .from("onboarding_progress")
      .update({
        assignment_done: true,
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("tier_num", onboardingState.currentTier)
      .then(({ error }) => {
        if (!error) {
          // Update profile current_tier
          const newTier = onboardingState.currentTier;
          supabase
            .from("profiles")
            .update({ current_tier: newTier })
            .eq("id", user.id)
            .then(() => {})
            .catch(() => {});
          // Refresh auth state
          fetchProfile(user.id);
        }
      })
      .catch(() => {});
  }, [user?.id, onboardingState, feature, fetchProfile]);
}
