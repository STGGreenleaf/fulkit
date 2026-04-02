"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth";
import { supabase } from "./supabase";
import { selectContext, selectContextWithMetadata, estimateTokens } from "./vault-tokens";
import { isFileSystemAccessSupported, pickVaultDirectory, restoreDirectoryHandle, disconnectVault as disconnectLocal, readLocalVault, writeLocalNote, deleteLocalNote, validateVaultStructure } from "./vault-local";
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
      // Read storage_mode from preferences (3s timeout — default to fulkit if slow)
      const { data, error } = await supabase
        .from("preferences")
        .select("value")
        .eq("key", "storage_mode")
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(3000));

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

  const [vaultError, setVaultError] = useState(null); // "permission" | "structure" | null

  const scanVaultFolder = useCallback(async () => {
    if (storageMode !== "local" || !directoryHandle) return;
    try {
      // Re-verify permission (Chrome can revoke silently)
      const perm = await directoryHandle.queryPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        setVaultError("permission");
        return;
      }
      setVaultError(null);

      // Re-validate structure every scan (user may have renamed/deleted folders)
      await validateVaultStructure(directoryHandle);

      // Pull new/updated notes + actions from Supabase → write to local vault (cross-device sync)
      if (user?.id) {
        try {
          const syncKey = `fulkit-vault-sync-${user.id}`;
          const lastSync = localStorage.getItem(syncKey) || new Date(0).toISOString();

          // Notes → vault folders as .md files
          const { data: newNotes } = await supabase
            .from("notes")
            .select("title, content, folder, updated_at")
            .eq("user_id", user.id)
            .gt("updated_at", lastSync)
            .order("updated_at", { ascending: true })
            .limit(20);
          if (newNotes?.length > 0) {
            for (const note of newNotes) {
              await writeLocalNote(directoryHandle, note.folder || "00-INBOX", note.title, note.content || "").catch(() => {});
            }
          }

          // Actions → 00-INBOX/actions.md (append new items)
          const { data: newActions } = await supabase
            .from("actions")
            .select("title, status, priority, due_date, updated_at")
            .eq("user_id", user.id)
            .gt("updated_at", lastSync)
            .order("updated_at", { ascending: true })
            .limit(20);
          if (newActions?.length > 0) {
            const date = new Date().toISOString().slice(0, 10);
            const lines = newActions.map(a => {
              const check = a.status === "done" ? "x" : " ";
              const due = a.due_date ? ` (due ${a.due_date})` : "";
              return `- [${check}] ${a.title}${due}`;
            }).join("\n");
            const content = `## Synced ${date}\n${lines}\n`;
            try {
              const inbox = await directoryHandle.getDirectoryHandle("00-INBOX", { create: true });
              let existing = "";
              try {
                const fh = await inbox.getFileHandle("actions.md");
                const file = await fh.getFile();
                existing = await file.text();
              } catch { /* file doesn't exist yet */ }
              const fh = await inbox.getFileHandle("actions.md", { create: true });
              const w = await fh.createWritable();
              await w.write(existing ? existing + "\n" + content : `# Actions\n\n${content}`);
              await w.close();
            } catch {}
          }

          // Update sync timestamp only after both succeed
          localStorage.setItem(syncKey, new Date().toISOString());
        } catch (err) {
          console.warn("[vault] Supabase sync failed:", err.message);
        }
      }

      const notes = await readLocalVault(directoryHandle);
      const hash = notes.map(n => `${n.path}:${n.content.length}`).sort().join("|");
      if (hash !== lastScanHash) {
        setLastScanHash(hash);
        setLocalNoteCount(notes.length);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("fulkit-vault-change", { detail: { count: notes.length, notes } }));
        }
      }
    } catch (err) {
      console.error("[vault] Scan failed:", err.message);
      setVaultError("permission");
    }
  }, [storageMode, directoryHandle, lastScanHash, user]);

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
        vaultError,

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
