"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import LogoMark from "../../components/LogoMark";

export default function Login() {
  const { user, loading, signIn, signInWithEmail } = useAuth();
  const router = useRouter();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    const { error: err } = await signInWithEmail(email.trim());
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  if (loading || user) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
      <LogoMark size={32} style={{ opacity: 0.3 }} />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <LogoMark size={48} />
      </div>

      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tight)",
          marginBottom: "var(--space-2)",
        }}
      >
        Sign in to Fülkit
      </h1>
      <p
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-8)",
        }}
      >
        Your second brain is waiting.
      </p>

      {/* Google sign in */}
      <button
        onClick={() => signIn("google")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-6)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-primary)",
          color: "var(--color-text)",
          cursor: "pointer",
          width: 280,
          justifyContent: "center",
          transition: `all var(--duration-fast) var(--ease-default)`,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          margin: "var(--space-4) 0",
          width: 280,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--color-border-light)" }} />
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--color-border-light)" }} />
      </div>

      {/* Email magic link */}
      {!showEmail ? (
        <button
          onClick={() => setShowEmail(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-6)",
            background: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            width: 280,
            justifyContent: "center",
            transition: `all var(--duration-fast) var(--ease-default)`,
          }}
        >
          <Mail size={18} strokeWidth={1.8} />
          Sign in with email
        </button>
      ) : sent ? (
        <div
          style={{
            width: 280,
            textAlign: "center",
            padding: "var(--space-4)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-1)" }}>
            Check your inbox
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            Magic link sent to {email}
          </div>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} style={{ width: 280 }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoFocus
              style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-3)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-primary)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: email.trim() ? "var(--color-accent)" : "var(--color-border-light)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: email.trim() ? "pointer" : "default",
                flexShrink: 0,
              }}
            >
              <ArrowRight size={16} strokeWidth={2.5} color="var(--color-text-inverse)" />
            </button>
          </div>
          {error && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-error)", marginTop: "var(--space-2)" }}>
              {error}
            </div>
          )}
        </form>
      )}

      <div
        style={{
          marginTop: "var(--space-8)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-dim)",
          textAlign: "center",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        By signing in, you agree to our{" "}
        <Link
          href="/terms"
          style={{ color: "var(--color-text-muted)", textDecoration: "underline" }}
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          style={{ color: "var(--color-text-muted)", textDecoration: "underline" }}
        >
          Privacy Policy
        </Link>
        .
      </div>
    </div>
  );
}
