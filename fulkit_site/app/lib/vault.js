"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { selectContext, selectContextWithMetadata, estimateTokens } from "./vault-tokens";
import { isFileSystemAccessSupported, pickVaultDirectory, restoreDirectoryHandle, disconnectVault as disconnectLocal, readLocalVault, writeLocalNote, deleteLocalNote } from "./vault-local";
import { deriveKey, generateSalt, encryptNote, decryptNote, cacheKey, getCachedKey, clearCachedKey } from "./vault-crypto";
import { readFulkitNotes, readEncryptedNotes, updateContextMode, listNotes, searchNotes } from "./vault-fulkit";

const VaultContext = createContext(null);

export function VaultProvider({ children }) {
  const { user, profile } = useAuth();
  const vaultBudget = profile?.role === "owner" ? 100000 : 50000;

  const [storageMode, setStorageModeState] = useState("fulkit");
  const [loading, setLoading] = useState(true);

  // Model A state
  const [directoryHandle, setDirectoryHandle] = useState(null);

  // Model B state
  const [cryptoKey, setCryptoKey] = useState(null);

  // Load storage_mode preference on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function init() {
      // Read storage_mode from preferences
      const { data, error } = await supabase
        .from("preferences")
        .select("value")
        .eq("key", "storage_mode")
        .maybeSingle();

      const mode = error ? "fulkit" : (data?.value || "fulkit");
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
  }, [user]);

  // Derived state
  const isSupported = storageMode === "local" ? isFileSystemAccessSupported() : true;
  const vaultConnected = storageMode === "local" && directoryHandle !== null;
  const isUnlocked = storageMode === "encrypted" && cryptoKey !== null;
  const isReady =
    storageMode === "fulkit" ||
    (storageMode === "local" && vaultConnected) ||
    (storageMode === "encrypted" && isUnlocked);

  // ── Vault folder watcher (Model A) ──
  // Polls for new/changed files every 30s + on window focus
  const [localNoteCount, setLocalNoteCount] = useState(0);
  const [lastScanHash, setLastScanHash] = useState("");
  const watcherRef = useRef(null);

  const scanVaultFolder = useCallback(async () => {
    if (storageMode !== "local" || !directoryHandle) return;
    try {
      const notes = await readLocalVault(directoryHandle);
      const hash = notes.map(n => `${n.path}:${n.content.length}`).sort().join("|");
      if (hash !== lastScanHash) {
        setLastScanHash(hash);
        setLocalNoteCount(notes.length);
        // Emit custom event so other components can react
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("fulkit-vault-change", { detail: { count: notes.length, notes } }));
        }
      }
    } catch {}
  }, [storageMode, directoryHandle, lastScanHash]);

  useEffect(() => {
    if (storageMode !== "local" || !directoryHandle) return;

    // Initial scan
    scanVaultFolder();

    // Poll every 30 seconds
    watcherRef.current = setInterval(scanVaultFolder, 30000);

    // Scan on window focus (user may have dropped files in)
    const onFocus = () => scanVaultFolder();
    window.addEventListener("focus", onFocus);

    return () => {
      if (watcherRef.current) clearInterval(watcherRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [storageMode, directoryHandle, scanVaultFolder]);

  // Shared note-fetching logic
  const getRawNotes = useCallback(async () => {
    if (storageMode === "local" && directoryHandle) {
      return await readLocalVault(directoryHandle);
    } else if (storageMode === "encrypted" && cryptoKey) {
      const encrypted = await readEncryptedNotes(supabase, user?.id);
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
      return await readFulkitNotes(supabase, user?.id);
    }
    return [];
  }, [storageMode, directoryHandle, cryptoKey]);

  // Read context from active source, apply token budget with relevance scoring
  const getContext = useCallback(async (message) => {
    try {
      const notes = await getRawNotes();
      return selectContext(notes, message, vaultBudget);
    } catch (err) {
      console.error("[vault] getContext error:", err.message);
      return [];
    }
  }, [getRawNotes, vaultBudget]);

  // Same as getContext but returns metadata for the UI indicator
  const getContextWithMeta = useCallback(async (message) => {
    try {
      const notes = await getRawNotes();
      return selectContextWithMetadata(notes, message, vaultBudget);
    } catch (err) {
      console.error("[vault] getContextWithMeta error:", err.message);
      return { selected: [], metadata: { includedCount: 0, alwaysCount: 0, totalTokens: 0 } };
    }
  }, [getRawNotes, vaultBudget]);

  // Get note list for settings browser (metadata only, no content)
  const getNoteList = useCallback(async () => {
    if (storageMode === "local" && directoryHandle) {
      const files = await readLocalVault(directoryHandle);
      return files.map((f, i) => ({
        id: `local-${i}`,
        title: f.title,
        context_mode: f.path && (f.path.includes("_FULKIT/") || f.path.includes("_CHAPPIE/")) ? "always" : "available",
        source: "local",
        folder: f.path,
        tokenEstimate: estimateTokens(f.content),
      }));
    }

    if (storageMode === "encrypted" || storageMode === "fulkit") {
      return await listNotes(supabase, user?.id);
    }

    return [];
  }, [storageMode, directoryHandle, user]);

  // Toggle context_mode for a note (Models B & C only)
  const updateNoteMode = useCallback(async (noteId, mode) => {
    if (storageMode === "local") return;
    await updateContextMode(noteId, mode, supabase, user?.id);
  }, [storageMode, user]);

  // Search all notes (including off) by title/folder — for /recall
  const recallNotes = useCallback(async (query) => {
    if (storageMode === "local") return [];
    return await searchNotes(query, supabase, user?.id);
  }, [storageMode, user]);

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

  // Write a note to the local vault folder (Model A only)
  const saveToLocalVault = useCallback(async (folder, title, content) => {
    if (storageMode !== "local" || !directoryHandle) return null;
    try {
      const path = await writeLocalNote(directoryHandle, folder, title, content);
      return path;
    } catch (err) {
      console.error("[vault] Local write failed:", err.message);
      return null;
    }
  }, [storageMode, directoryHandle]);

  // Delete a note from the local vault folder (Model A only)
  const deleteFromLocalVault = useCallback(async (folder, title) => {
    if (storageMode !== "local" || !directoryHandle) return;
    try {
      await deleteLocalNote(directoryHandle, folder, title);
    } catch (err) {
      console.error("[vault] Local delete failed:", err.message);
    }
  }, [storageMode, directoryHandle]);

  // Switch storage mode
  const setStorageMode = useCallback(async (mode) => {
    if (!user) return;
    await supabase.from("preferences").upsert({
      user_id: user.id,
      key: "storage_mode",
      value: mode,
      updated_at: new Date().toISOString(),
    });
    setStorageModeState(mode);
    // Auto-resolve "vault" onboarding fallback action
    supabase.from("actions").update({ status: "done", completed_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("source", "onboarding").eq("feature_tag", "vault").eq("status", "active")
      .then(() => {}).catch(() => {});
  }, [user]);

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
        recallNotes,

        // Model A
        connectVault,
        disconnectVault,
        vaultConnected,
        directoryHandle,
        saveToLocalVault,
        deleteFromLocalVault,
        scanVaultFolder,
        localNoteCount,

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
