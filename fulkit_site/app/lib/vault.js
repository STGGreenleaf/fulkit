"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { selectContext, selectContextWithMetadata, estimateTokens } from "./vault-tokens";
import { isFileSystemAccessSupported, pickVaultDirectory, restoreDirectoryHandle, disconnectVault as disconnectLocal, readLocalVault } from "./vault-local";
import { deriveKey, generateSalt, encryptNote, decryptNote, cacheKey, getCachedKey, clearCachedKey } from "./vault-crypto";
import { readFulkitNotes, readEncryptedNotes, updateContextMode, listNotes } from "./vault-fulkit";

const VaultContext = createContext(null);

const DEV_NOTES = [
  { title: "About Me", content: "I'm a demo user exploring Fulkit. I love building things and thinking out loud.", pinned: true },
  { title: "Current Project", content: "Working on a new product that helps people organize their thoughts with AI.", pinned: false },
];

export function VaultProvider({ children }) {
  const { user } = useAuth();
  const isDev = user?.isDev;

  const [storageMode, setStorageModeState] = useState("fulkit");
  const [loading, setLoading] = useState(true);

  // Model A state
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // Model B state
  const [cryptoKey, setCryptoKey] = useState(null);

  // Load storage_mode preference on mount
  useEffect(() => {
    if (!user || isDev) {
      setLoading(false);
      return;
    }

    async function init() {
      // Read storage_mode from preferences
      const { data } = await supabase
        .from("preferences")
        .select("value")
        .eq("key", "storage_mode")
        .single();

      const mode = data?.value || "fulkit";
      setStorageModeState(mode);

      // Model A: try to restore directory handle
      if (mode === "local" && isFileSystemAccessSupported()) {
        try {
          const handle = await restoreDirectoryHandle();
          if (handle) setDirectoryHandle(handle);
        } catch {
          // Handle expired or permission denied — user will need to reconnect
        }
      }

      // Model B: try to restore cached key from sessionStorage
      if (mode === "encrypted") {
        try {
          const key = await getCachedKey();
          if (key) setCryptoKey(key);
        } catch {
          // Key not cached — user will need to enter passphrase
        }
      }

      setLoading(false);
    }

    init();
  }, [user, isDev]);

  // Derived state
  const isSupported = storageMode === "local" ? isFileSystemAccessSupported() : true;
  const vaultConnected = storageMode === "local" && directoryHandle !== null;
  const isUnlocked = storageMode === "encrypted" && cryptoKey !== null;
  const isReady =
    storageMode === "fulkit" ||
    (storageMode === "local" && vaultConnected) ||
    (storageMode === "encrypted" && isUnlocked);

  // Shared note-fetching logic
  const getRawNotes = useCallback(async () => {
    if (storageMode === "local" && directoryHandle) {
      return await readLocalVault(directoryHandle);
    } else if (storageMode === "encrypted" && cryptoKey) {
      const encrypted = await readEncryptedNotes(supabase);
      const decrypted = await Promise.all(
        encrypted.map(async (n) => {
          try {
            const content = await decryptNote(n.content, n.iv, cryptoKey);
            return { ...n, content };
          } catch {
            return null;
          }
        })
      );
      return decrypted.filter(Boolean);
    } else if (storageMode === "fulkit") {
      return await readFulkitNotes(supabase);
    }
    return [];
  }, [storageMode, directoryHandle, cryptoKey]);

  // Read context from active source, apply token budget with relevance scoring
  const getContext = useCallback(async (message) => {
    if (isDev) return DEV_NOTES.map((n) => ({ title: n.title, content: n.content }));

    try {
      const notes = await getRawNotes();
      return selectContext(notes, message);
    } catch (err) {
      console.error("[vault] getContext error:", err.message);
      return [];
    }
  }, [getRawNotes, isDev]);

  // Same as getContext but returns metadata for the UI indicator
  const getContextWithMeta = useCallback(async (message) => {
    if (isDev) {
      const selected = DEV_NOTES.map((n) => ({ title: n.title, content: n.content }));
      return { selected, metadata: { includedCount: selected.length, alwaysCount: 1, totalTokens: selected.reduce((t, n) => t + estimateTokens(n.content), 0) } };
    }

    try {
      const notes = await getRawNotes();
      return selectContextWithMetadata(notes, message);
    } catch (err) {
      console.error("[vault] getContextWithMeta error:", err.message);
      return { selected: [], metadata: { includedCount: 0, alwaysCount: 0, totalTokens: 0 } };
    }
  }, [getRawNotes, isDev]);

  // Get note list for settings browser (metadata only, no content)
  const getNoteList = useCallback(async () => {
    if (isDev) {
      return DEV_NOTES.map((n, i) => ({
        id: `dev-${i}`,
        title: n.title,
        context_mode: n.pinned ? "always" : "available",
        source: "demo",
        tokenEstimate: estimateTokens(n.content),
      }));
    }

    if (storageMode === "local" && directoryHandle) {
      const files = await readLocalVault(directoryHandle);
      return files.map((f, i) => ({
        id: `local-${i}`,
        title: f.title,
        context_mode: f.path && f.path.includes("_CHAPPIE/") ? "always" : "available",
        source: "local",
        folder: f.path,
        tokenEstimate: estimateTokens(f.content),
      }));
    }

    if (storageMode === "encrypted" || storageMode === "fulkit") {
      return await listNotes(supabase);
    }

    return [];
  }, [storageMode, directoryHandle, isDev]);

  // Toggle context_mode for a note (Models B & C only)
  const updateNoteMode = useCallback(async (noteId, mode) => {
    if (isDev || storageMode === "local") return;
    await updateContextMode(noteId, mode, supabase);
  }, [isDev, storageMode]);

  // Model A: connect vault directory
  const connectVault = useCallback(async () => {
    if (!isFileSystemAccessSupported()) return;
    const handle = await pickVaultDirectory();
    setDirectoryHandle(handle);
  }, []);

  // Model A: disconnect vault
  const disconnectVault = useCallback(async () => {
    await disconnectLocal();
    setDirectoryHandle(null);
  }, []);

  // Model B: set passphrase and derive key
  const setPassphrase = useCallback(async (passphrase) => {
    if (!user) return;

    // Get or create salt
    let { data: saltPref } = await supabase
      .from("preferences")
      .select("value")
      .eq("key", "encryption_salt")
      .single();

    let salt;
    if (saltPref?.value) {
      salt = saltPref.value;
    } else {
      salt = generateSalt();
      await supabase.from("preferences").upsert({
        user_id: user.id,
        key: "encryption_salt",
        value: salt,
        updated_at: new Date().toISOString(),
      });
    }

    const key = await deriveKey(passphrase, salt);
    await cacheKey(key);
    setCryptoKey(key);
  }, [user]);

  // Model B: lock vault
  const lockVault = useCallback(() => {
    clearCachedKey();
    setCryptoKey(null);
  }, []);

  // Switch storage mode
  const setStorageMode = useCallback(async (mode) => {
    if (!user || isDev) return;
    await supabase.from("preferences").upsert({
      user_id: user.id,
      key: "storage_mode",
      value: mode,
      updated_at: new Date().toISOString(),
    });
    setStorageModeState(mode);
  }, [user, isDev]);

  return (
    <VaultContext.Provider
      value={{
        storageMode,
        isReady,
        isSupported,
        loading,

        getContext,
        getContextWithMeta,
        getNoteList,
        updateNoteMode,

        // Model A
        connectVault,
        disconnectVault,
        vaultConnected,
        directoryHandle,

        // Model B
        setPassphrase,
        isUnlocked,
        lockVault,
        cryptoKey,

        // Mode switching
        setStorageMode,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVaultContext() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVaultContext must be used within VaultProvider");
  return ctx;
}
