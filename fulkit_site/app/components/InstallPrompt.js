"use client";

import { useState, useEffect, useRef } from "react";
import { X, Download, Smartphone, Monitor } from "lucide-react";
import LogoMark from "./LogoMark";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    // Already installed — never show
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check dismiss / force-show
    const params = new URLSearchParams(window.location.search);
    const force = params.get("showInstall") === "1";
    if (!force) {
      const dismissed = localStorage.getItem("fulkit.pwa.dismissed");
      if (dismissed) {
        const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
        if (days < 7) return;
      }
    }

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // iOS: show after delay (no beforeinstallprompt on Safari)
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }

    // Android/Chrome/Edge: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem("fulkit.pwa.dismissed", String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      deferredPromptRef.current = null;
    }
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      top: "var(--space-4)",
      right: "var(--space-4)",
      width: 340,
      background: "var(--color-bg-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      zIndex: 999,
      padding: "var(--space-4)",
      fontFamily: "var(--font-primary)",
    }}>
      {/* Close */}
      <button
        onClick={dismiss}
        style={{
          position: "absolute", top: "var(--space-2)", right: "var(--space-2)",
          background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)",
          display: "flex", color: "var(--color-text-dim)",
        }}
      >
        <X size={14} />
      </button>

      {/* Logo + heading */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}>
            <LogoMark size={28} />
          </div>
          <div style={{ fontSize: 9, color: "var(--color-text-dim)", textAlign: "center", marginTop: 2 }}>
            F{"\u00FC"}lkit
          </div>
        </div>
        <div>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: 2 }}>
            Add F{"\u00FC"}lkit to Home Screen
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
            Install for quick access and an app-like experience
          </div>
        </div>
      </div>

      {isIOS ? (
        <>
          {/* iOS instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
              <Smartphone size={13} strokeWidth={1.5} color="var(--color-text-dim)" />
              <span><strong>iPhone/iPad:</strong> Tap Share in Safari, then "Add to Home Screen"</span>
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: "100%", padding: "var(--space-2)",
              background: "var(--color-text)", color: "var(--color-bg)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
            }}
          >
            Got it
          </button>
        </>
      ) : (
        <>
          {/* Install button for Android/Chrome/Edge */}
          <button
            onClick={install}
            style={{
              width: "100%", padding: "var(--space-2)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
              background: "var(--color-text)", color: "var(--color-bg)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              cursor: "pointer",
            }}
          >
            <Download size={14} strokeWidth={2} />
            Install App
          </button>
          <button
            onClick={dismiss}
            style={{
              width: "100%", padding: "var(--space-1-5)",
              background: "none", border: "none",
              fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)",
              cursor: "pointer", marginTop: "var(--space-1)",
            }}
          >
            Not now
          </button>
        </>
      )}
    </div>
  );
}
