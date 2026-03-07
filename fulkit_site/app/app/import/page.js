"use client";

import { useState, useRef } from "react";
import { FolderOpen, Upload, Check, FileText, Lock, HardDrive } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import PassphraseModal from "../../components/PassphraseModal";
import { useAuth } from "../../lib/auth";
import { useVaultContext } from "../../lib/vault";
import { supabase } from "../../lib/supabase";
import { importNote, importEncryptedNote } from "../../lib/vault-fulkit";
import { encryptNote } from "../../lib/vault-crypto";

export default function Import() {
  const { user } = useAuth();
  const isDev = user?.isDev;
  const { storageMode, connectVault, vaultConnected, isUnlocked, setPassphrase, cryptoKey } = useVaultContext();

  const [imported, setImported] = useState([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const fileRef = useRef(null);

  // Handle file selection (Model B + C)
  const handleFiles = async (files) => {
    if (!user || isDev) return;
    setImporting(true);
    setError("");

    const results = [];
    for (const file of files) {
      if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) continue;

      try {
        const content = await file.text();
        const title = file.name.replace(/\.(md|txt)$/, "");

        if (storageMode === "encrypted" && cryptoKey) {
          const { ciphertext, iv } = await encryptNote(content, cryptoKey);
          const data = await importEncryptedNote(
            { title, ciphertext, iv, source: "upload" },
            supabase,
            user.id
          );
          results.push(data);
        } else {
          const data = await importNote(
            { title, content, source: "upload" },
            supabase,
            user.id
          );
          results.push(data);
        }
      } catch (err) {
        setError(`Failed to import ${file.name}: ${err.message}`);
      }
    }

    setImported((prev) => [...prev, ...results]);
    setImporting(false);
  };

  const onFileChange = (e) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files));
  };

  // Drag and drop
  const [dragOver, setDragOver] = useState(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              padding: "var(--space-2-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <FolderOpen size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Import
            </span>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-6)",
              maxWidth: 600,
            }}
          >
            {/* Mode indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-5)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-alt)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              {storageMode === "local" && <><HardDrive size={14} /> Local-first mode</>}
              {storageMode === "encrypted" && <><Lock size={14} /> Encrypted sync mode</>}
              {storageMode === "fulkit" && <><Upload size={14} /> Fulkit storage mode</>}
            </div>

            {/* Model A: Connect vault */}
            {storageMode === "local" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                  <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
                    Connect your vault
                  </h2>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
                    Point Fulkit to your Obsidian vault or any folder of markdown files.
                    Files are read at chat-time and never stored on our servers.
                  </p>
                </div>

                <button
                  onClick={connectVault}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    border: vaultConnected ? "2px solid var(--color-accent)" : "2px dashed var(--color-border)",
                    background: vaultConnected ? "var(--color-bg-alt)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text)",
                    textAlign: "center",
                  }}
                >
                  {vaultConnected ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                      <Check size={16} style={{ color: "var(--color-accent)" }} />
                      Vault connected
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
                      <FolderOpen size={16} />
                      Choose vault folder
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Model B: Need passphrase first */}
            {storageMode === "encrypted" && !isUnlocked && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                  Unlock your vault to import files.
                </p>
                <button
                  onClick={() => setShowPassphrase(true)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text)",
                    textAlign: "center",
                  }}
                >
                  Enter passphrase
                </button>
                {showPassphrase && (
                  <PassphraseModal
                    isSetup={false}
                    onSubmit={async (pp) => {
                      await setPassphrase(pp);
                      setShowPassphrase(false);
                    }}
                    onCancel={() => setShowPassphrase(false)}
                  />
                )}
              </div>
            )}

            {/* Model B (unlocked) + Model C: File upload */}
            {(storageMode === "fulkit" || (storageMode === "encrypted" && isUnlocked)) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                  <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
                    Import notes
                  </h2>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
                    Upload markdown or text files. {storageMode === "encrypted" ? "Files are encrypted in your browser before storage." : "Files are stored in your Fulkit account."}
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    padding: "var(--space-6)",
                    borderRadius: "var(--radius-md)",
                    border: dragOver ? "2px solid var(--color-accent)" : "2px dashed var(--color-border)",
                    background: dragOver ? "var(--color-bg-alt)" : "transparent",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all var(--duration-fast) var(--ease-default)",
                  }}
                >
                  <Upload
                    size={24}
                    strokeWidth={1.5}
                    style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }}
                  />
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                    {importing ? "Importing..." : "Drop .md files here, or click to browse"}
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".md,.txt"
                    multiple
                    onChange={onFileChange}
                    style={{ display: "none" }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-error, #c44)" }}>
                    {error}
                  </p>
                )}

                {/* Imported files list */}
                {imported.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    <p
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text-muted)",
                        fontWeight: "var(--font-weight-semibold)",
                      }}
                    >
                      Imported ({imported.length})
                    </p>
                    {imported.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-1-5) var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--color-bg-alt)",
                        }}
                      >
                        <FileText size={14} strokeWidth={1.5} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
                          {note.title}
                        </span>
                        <Check size={12} style={{ color: "var(--color-accent)", marginLeft: "auto", flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
