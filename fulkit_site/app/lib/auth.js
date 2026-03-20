"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

// Module-level flag: true once auth has resolved at least once this session.
// AuthGuard uses this to skip the splash on warm navigations.
let _authResolved = false;
export function hasAuthResolved() { return _authResolved; }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [compactMode, setCompactModeState] = useState(true);
  const [onboardingState, setOnboardingState] = useState(null);
  const [newlyConnectedIntegration, setNewlyConnectedIntegration] = useState(null);

  // Initialize compact mode from localStorage (default: compact/minimal)
  useEffect(() => {
    const stored = localStorage.getItem("fulkit-compact-mode");
    setCompactModeState(stored === null ? true : stored === "true");
  }, []);

  const setCompactMode = useCallback((val) => {
    setCompactModeState(val);
    localStorage.setItem("fulkit-compact-mode", String(val));
  }, []);

  const [hasContext, setHasContext] = useState(false);
  const fetchingRef = useRef(null); // dedup guard — prevents double-fetch on mount

  // Fetch profile from DB + check for context (onboarded OR has notes)
  const fetchProfile = useCallback(async (userId) => {
    // Dedup: if already fetching for the same user, return existing promise
    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    const results = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("onboarding_progress").select("*").eq("user_id", userId).order("tier_num").then(r => r).catch(() => ({ data: null })),
      supabase.from("onboarding_tiers").select("tier_num,completion_trigger").order("tier_num").then(r => r).catch(() => ({ data: null })),
    ]);
    let { data } = results[0];
    const { count } = results[1];
    const progressRows = results[2]?.data;
    const tierRows = results[3]?.data;

    // Safety net: create profile if it doesn't exist (new user, trigger may not have fired)
    if (!data) {
      const { data: created } = await supabase
        .from("profiles")
        .upsert({ id: userId, seat_type: "free", onboarded: false, messages_this_month: 0, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("*")
        .single();
      if (created) data = created;
    }

    if (data) {
      setProfile(data);
      setHasContext(data.onboarded === true || (count || 0) > 0);

      // Build onboarding state (skip for owner in dev mode)
      const tiers = tierRows || [];
      const progress = progressRows || [];
      if (data.role !== "owner" && tiers.length > 0) {
        const tiersCompleted = progress.filter((p) => p.completed_at).length;
        const currentTier = tiersCompleted + 1;
        const isOnboardingDone = tiersCompleted >= 5;

        const trialStarted = data.trial_started_at ? new Date(data.trial_started_at) : null;
        const trialDay = trialStarted
          ? Math.floor((Date.now() - trialStarted.getTime()) / 86400000) + 1
          : 1;

        // Find pending trigger: current tier where questions answered but assignment not done
        let pendingTrigger = null;
        if (!isOnboardingDone) {
          const currentProgress = progress.find((p) => p.tier_num === currentTier);
          if (currentProgress && !currentProgress.assignment_done) {
            const tierDef = tiers.find((t) => t.tier_num === currentTier);
            pendingTrigger = tierDef?.completion_trigger || null;
          }
        }

        setOnboardingState({
          currentTier: Math.min(currentTier, 6),
          tiersCompleted,
          trialDay,
          trialDaysRemaining: Math.max(0, 30 - trialDay),
          isInTrial: trialDay <= 30,
          isOnboardingDone,
          tierProgress: progress,
          pendingTrigger,
        });
      }

      // Check for recently connected integrations (within last 24hr)
      try {
        const { data: recentInteg } = await supabase
          .from("integrations")
          .select("provider, created_at")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 86400000).toISOString())
          .order("created_at", { ascending: false })
          .limit(1);
        if (recentInteg?.length > 0) {
          const dismissed = localStorage.getItem(`fulkit-integ-tip-${recentInteg[0].provider}`);
          if (!dismissed) {
            setNewlyConnectedIntegration(recentInteg[0]);
          }
        }
      } catch {
        // integrations table may not have expected columns — skip silently
      }
    }
    fetchingRef.current = null; // allow future refreshes (e.g. after message sent)
    return data;
  }, []);

  useEffect(() => {
    // Skip auth init on the callback page — it handles its own exchange
    if (window.location.pathname === "/auth/callback") {
      setLoading(false);
      return;
    }

    // Real auth — listen to Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.full_name || "",
        });
        setAccessToken(session.access_token);
        await fetchProfile(u.id);
        _authResolved = true;
        // Seed profiles.name from Google if not already set
        const googleName = u.user_metadata?.full_name;
        if (googleName) {
          supabase.from("profiles").update({ name: googleName }).eq("id", u.id).is("name", null).then(() => {});
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const u = session.user;
          setUser({
            id: u.id,
            email: u.email,
            name: u.user_metadata?.full_name || "",
          });
          setAccessToken(session.access_token);
          await fetchProfile(u.id);
        } else {
          setUser(null);
          setProfile(null);
          setAccessToken(null);
        }
        setLoading(false);
      }
    );

    // Refresh auth when tab wakes from sleep (token may have expired)
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.refreshSession().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (provider = "google") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) console.error("Sign in error:", error.message);
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) console.error("Magic link error:", error.message);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = "/";
  }, []);

  // Check GitHub connection when we have a token
  const checkGitHub = useCallback(async (token) => {
    try {
      const res = await fetch("/api/github/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGithubConnected(data.connected);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (accessToken) checkGitHub(accessToken);
  }, [accessToken, checkGitHub]);

  const isOwner = profile?.role === "owner";
  const isOnboarded = profile?.onboarded ?? false;

  // ─── authFetch: always-fresh-token fetch wrapper ────────
  // Use instead of raw fetch + accessToken for any authenticated API call.
  // Gets a fresh session token every call — no stale JWT issues.
  const authFetch = useCallback(async (url, opts = {}) => {
    let token = accessToken;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch (e) {
      console.warn("[authFetch] getSession failed:", e.message);
    }
    if (!token) console.warn("[authFetch] no token for", url);
    return fetch(url, {
      ...opts,
      headers: {
        ...opts.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        accessToken,
        authFetch,
        signIn,
        signInWithEmail,
        signOut,
        isOwner,
        isOnboarded,
        hasContext,
        fetchProfile,
        githubConnected,
        setGithubConnected,
        checkGitHub,
        compactMode,
        setCompactMode,
        onboardingState,
        newlyConnectedIntegration,
        dismissIntegrationTip: (provider) => {
          localStorage.setItem(`fulkit-integ-tip-${provider}`, "1");
          setNewlyConnectedIntegration(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
