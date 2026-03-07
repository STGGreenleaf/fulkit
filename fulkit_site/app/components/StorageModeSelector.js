"use client";

import { HardDrive, Lock, Cloud } from "lucide-react";
import { useVaultContext } from "../lib/vault";
import { isFileSystemAccessSupported } from "../lib/vault-local";

const MODES = [
  {
    id: "local",
    icon: HardDrive,
    title: "The Phone Call",
    subtitle: "Local-first",
    description: "Your vault stays on your machine. Fulkit reads it, responds, and forgets. Nothing stored on our servers.",
    requiresFSA: true,
  },
  {
    id: "encrypted",
    icon: Lock,
    title: "The Locked Safe",
    subtitle: "Encrypted sync",
    description: "Notes encrypted in your browser with a passphrase only you know. We hold ciphertext we can't read.",
  },
  {
    id: "fulkit",
    icon: Cloud,
    title: "Your Shelf",
    subtitle: "Fulkit storage",
    description: "Notes stored in Fulkit, encrypted at rest. Simplest setup. Full control — view, edit, delete, export anytime.",
  },
];

export default function StorageModeSelector() {
  const { storageMode, setStorageMode } = useVaultContext();
  const fsaSupported = typeof window !== "undefined" && isFileSystemAccessSupported();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <h3
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            marginBottom: "var(--space-1)",
          }}
        >
          Where does your brain live?
        </h3>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Choose how Fulkit accesses your notes. You can switch anytime.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {MODES.map((mode) => {
          const isActive = storageMode === mode.id;
          const isDisabled = mode.requiresFSA && !fsaSupported;
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              onClick={() => !isDisabled && setStorageMode(mode.id)}
              disabled={isDisabled}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: isActive
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border-light)",
                background: isActive ? "var(--color-bg-alt)" : "transparent",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                textAlign: "left",
                fontFamily: "var(--font-primary)",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-sm)",
                  background: isActive ? "var(--color-accent)" : "var(--color-bg-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  size={16}
                  strokeWidth={1.8}
                  style={{
                    color: isActive ? "var(--color-text-inverse)" : "var(--color-text-muted)",
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: isActive ? "var(--color-text)" : "var(--color-text-secondary)",
                    }}
                  >
                    {mode.title}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    {mode.subtitle}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    lineHeight: "var(--line-height-relaxed)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  {mode.description}
                </p>
                {isDisabled && (
                  <p
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                      marginTop: "var(--space-1)",
                    }}
                  >
                    Requires Chrome, Edge, Arc, or Brave.
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
