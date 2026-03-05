"use client";

import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

// Mock auth provider — swap with Supabase Auth later
export function AuthProvider({ children }) {
  // Default signed in for dev — set to null to test landing/login flow
  const [user, setUser] = useState({ id: "dev", email: "collin@fulkit.app", name: "Collin" });
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(() => {
    // Will be: supabase.auth.signInWithOAuth({ provider: 'google' })
    setUser({ id: "mock", email: "you@fulkit.app", name: "You" });
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
