"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

const DEV_NEW_USER = { id: "new", email: "new@fulkit.app", name: "", isNew: true };
const DEV_TEMPLATE_USER = { id: "dev", email: "dev@fulkit.app", name: "Demo User", isDev: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB
  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
    }
    return data;
  }, []);

  useEffect(() => {
    // Dev mode overrides
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("auth");
    if (mode === "none") {
      setUser(null);
      setLoading(false);
      return;
    }
    if (mode === "new") {
      setUser(DEV_NEW_USER);
      setLoading(false);
      return;
    }
    if (mode === "dev") {
      setUser(DEV_TEMPLATE_USER);
      setProfile({ role: "owner", onboarded: true, seat_type: "standard", messages_this_month: 138 });
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
          await fetchProfile(u.id);
        } else {
          setUser(null);
          setProfile(null);
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
  }, []);

  const isOwner = profile?.role === "owner";
  const isOnboarded = profile?.onboarded ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signInWithEmail,
        signOut,
        isOwner,
        isOnboarded,
        fetchProfile,
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
