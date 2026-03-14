"use client";

import { HardDrive, Lock, Cloud } from "lucide-react";
import { useVaultContext } from "../lib/vault";
import { isFileSystemAccessSupported } from "../lib/vault-local";

const MODES = [
  {
    id: "local",
    icon: HardDrive,
    title: "Burn After Reading",
    subtitle: "Zero trust required",
    description: "Your stuff stays on your machine. We read it, help out, and forget we were ever there.",
    requiresFSA: true,
  },
  {
    id: "encrypted",
    icon: Lock,
    title: "The Locked Safe",
    subtitle: "Trust, but verify",
    description: "We hold an encrypted box we can\u2019t open. You keep the only key. Sleep well.",
  },
  {
    id: "fulkit",
    icon: Cloud,
    title: "Your Shelf",
    subtitle: "Full trust",
    description: "Your shelf at our place. Encrypted, organized, yours. Walk in and grab anything, anytime.",
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
          How much do you trust us?
        </h3>
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          Honest question. Pick what feels right — you can always change it.
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
