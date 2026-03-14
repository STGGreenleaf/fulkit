"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

const DEV_NEW_USER = { id: "new", email: "new@fulkit.app", name: "", isNew: true };
const DEV_TEMPLATE_USER = { id: "dev", email: "dev@fulkit.app", name: "Demo User", isDev: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [compactMode, setCompactModeState] = useState(true);

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

  // Fetch profile from DB + check for context (onboarded OR has notes)
  const fetchProfile = useCallback(async (userId) => {
    const [{ data }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("notes").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    if (data) {
      setProfile(data);
      setHasContext(data.onboarded === true || (count || 0) > 0);
    }
    return data;
  }, []);

  useEffect(() => {
    // Dev mode overrides — only on localhost (never in production)
    const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("auth");
    if (mode === "none" && isLocalDev) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (mode === "new" && isLocalDev) {
      setUser(DEV_NEW_USER);
      setLoading(false);
      return;
    }
    if (mode === "dev" && isLocalDev) {
      setUser(DEV_TEMPLATE_USER);
      setProfile({ role: "owner", onboarded: true, seat_type: "standard", messages_this_month: 138 });
      setHasContext(true);
      setLoading(false);
      return;
    }

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

    return () => subscription.unsubscribe();
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
    } catch {}
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
