"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const AuthContext = createContext(null);

const REAL_USER = { id: "collin", email: "collin@fulkit.app", name: "Collin" };
const NEW_USER = { id: "new", email: "new@fulkit.app", name: "", isNew: true };

// Mock auth provider — swap with Supabase Auth later
export function AuthProvider({ children }) {
  const [user, setUser] = useState(REAL_USER);
  const [loading, setLoading] = useState(false);

  // Dev mode: ?auth=none (signed out) or ?auth=new (onboarding)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("auth");
    if (mode === "none") setUser(null);
    else if (mode === "new") setUser(NEW_USER);
  }, []);

  const signIn = useCallback(() => {
    // Will be: supabase.auth.signInWithOAuth({ provider: 'google' })
    setUser(REAL_USER);
  }, []);

  const signOut = useCallback(() => {
    // Will be: supabase.auth.signOut()
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
