"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function PassphraseModal({ onSubmit, onCancel, isSetup = false }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!passphrase) return;
    if (isSetup && passphrase !== confirm) {
      setError("Passphrases don't match.");
      return;
    }
    if (isSetup && passphrase.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit(passphrase);
    } catch (err) {
      setError(err.message || "Failed to unlock vault.");
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "var(--color-bg)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-light)",
          padding: "var(--space-6)",
          maxWidth: 400,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Lock size={18} strokeWidth={1.8} style={{ color: "var(--color-accent)" }} />
          <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)" }}>
            {isSetup ? "Set your vault passphrase" : "Unlock your vault"}
          </h2>
        </div>

        {isSetup && (
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              lineHeight: "var(--line-height-relaxed)",
            }}
          >
            This passphrase encrypts your notes. Fulkit can never read them.
            If you lose it, your notes cannot be recovered. This is by design.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSetup ? "Choose a passphrase" : "Enter your passphrase"}
              autoFocus
              style={{
                width: "100%",
                padding: "var(--space-2-5) var(--space-3)",
                paddingRight: "var(--space-8)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-alt)",
                color: "var(--color-text)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-primary)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => setShowPass(!showPass)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
                padding: 4,
              }}
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {isSetup && (
            <input
              type={showPass ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Confirm passphrase"
              style={{
                width: "100%",
                padding: "var(--space-2-5) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-alt)",
                color: "var(--color-text)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-primary)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}

          {error && (
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-error, #c44)" }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!passphrase || loading}
            style={{
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: passphrase ? "var(--color-accent)" : "var(--color-border-light)",
              color: "var(--color-text-inverse)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-primary)",
              fontWeight: "var(--font-weight-semibold)",
              cursor: passphrase ? "pointer" : "default",
            }}
          >
            {loading ? "Working..." : isSetup ? "Set passphrase" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
