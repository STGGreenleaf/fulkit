"use client";

import { useState } from "react";
import { HardDrive, Lock, FolderOpen } from "lucide-react";
import { useVaultContext } from "../lib/vault";
import PassphraseModal from "./PassphraseModal";

export default function VaultGate() {
  const { storageMode, isReady, isSupported, connectVault, setPassphrase } = useVaultContext();
  const [showPassphrase, setShowPassphrase] = useState(false);

  // Model C is always ready — no gate needed
  // If vault is ready, render nothing
  if (isReady || storageMode === "fulkit") return null;

  // Model A: vault not connected
  if (storageMode === "local") {
    if (!isSupported) {
      return (
        <GateContainer>
          <HardDrive size={20} strokeWidth={1.5} style={{ color: "var(--color-text-dim)" }} />
          <p style={textStyle}>
            Local vault requires Chrome, Edge, Arc, or Brave.
          </p>
          <p style={subtextStyle}>
            Switch to Fulkit storage in Settings to chat with context.
          </p>
        </GateContainer>
      );
    }

    return (
      <GateContainer>
        <FolderOpen size={20} strokeWidth={1.5} style={{ color: "var(--color-text-dim)" }} />
        <p style={textStyle}>Connect your vault to give Fulkit context.</p>
        <button onClick={connectVault} style={buttonStyle}>
          Open vault folder
        </button>
      </GateContainer>
    );
  }

  // Model B: vault locked
  if (storageMode === "encrypted") {
    return (
      <>
        <GateContainer>
          <Lock size={20} strokeWidth={1.5} style={{ color: "var(--color-text-dim)" }} />
          <p style={textStyle}>Your vault is locked.</p>
          <button onClick={() => setShowPassphrase(true)} style={buttonStyle}>
            Enter passphrase
          </button>
        </GateContainer>

        {showPassphrase && (
          <PassphraseModal
            onSubmit={async (pp) => {
              await setPassphrase(pp);
              setShowPassphrase(false);
            }}
            onCancel={() => setShowPassphrase(false)}
          />
        )}
      </>
    );
  }

  return null;
}

function GateContainer({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-6)",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

const textStyle = {
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-muted)",
  lineHeight: "var(--line-height-relaxed)",
};

const subtextStyle = {
  fontSize: "var(--font-size-xs)",
  color: "var(--color-text-dim)",
};

const buttonStyle = {
  padding: "var(--space-2) var(--space-4)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "var(--font-primary)",
  fontWeight: "var(--font-weight-semibold)",
  cursor: "pointer",
};
