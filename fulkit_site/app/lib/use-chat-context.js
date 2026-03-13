"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

/**
 * useChatContext — context assembly hook for Fulkit chat.
 *
 * Owns: GitHub context, Numbrly context, attached files, recalled notes.
 * Provides assembleContext() for useChat's sendMessage.
 */
export function useChatContext({ user, isDev, accessToken, githubConnected, getContextWithMeta, recallNotes, isReady }) {
  const [ghContext, setGhContext] = useState([]);
  const [nblContext, setNblContext] = useState(null);
  const [nblError, setNblError] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [recalledNotes, setRecalledNotes] = useState([]);
  const [recallResults, setRecallResults] = useState(null);
  const [contextMeta, setContextMeta] = useState(null);

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsDismissed, setAlertsDismissed] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return localStorage.getItem("fulkit-alerts-dismissed") || ""; } catch { return ""; }
  });

  // ─── Load GitHub repos ────────────────────────────────────

  useEffect(() => {
    if (!accessToken || !githubConnected || isDev) return;
    async function load() {
      try {
        const res = await fetch("/api/github/active", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setGhContext(data.filter((r) => r.tree.length > 0));
        }
      } catch {}
    }
    load();
  }, [accessToken, githubConnected, isDev]);

  // ─── Load Numbrly context ─────────────────────────────────

  useEffect(() => {
    if (!accessToken || isDev) return;
    fetch("/api/numbrly/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.connected) return;
        return fetch("/api/numbrly/context", { headers: { Authorization: `Bearer ${accessToken}` } });
      })
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (data?.message) setNblContext(data.message);
      })
      .catch(() => setNblError(true));
  }, [accessToken, isDev]);

  // ─── Fetch alerts ─────────────────────────────────────────

  useEffect(() => {
    if (!accessToken || isDev) return;
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/numbrly/alerts", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.alerts?.length) {
            const fingerprint = data.alerts.map((a) => a.message).join("|");
            const dismissed = localStorage.getItem("fulkit-alerts-dismissed") || "";
            if (fingerprint !== dismissed) setAlertsDismissed("");
            setAlerts(data.alerts);
          } else {
            setAlerts([]);
          }
        }
      } catch {}
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [accessToken, isDev]);

  // ─── File handling ────────────────────────────────────────

  const [fileError, setFileError] = useState(null);

  const handleChatFiles = useCallback(async (files) => {
    setFileError(null);
    const ALLOWED = /\.(md|txt|js|jsx|ts|tsx|css|json|html|py|rb|go|rs|sh|yaml|yml|toml|sql|env|csv|xml|rtf|log|ini|cfg|conf|tsv|tex)$/i;
    const results = [];
    const rejected = [];
    for (const file of files) {
      if (!file.name.match(ALLOWED)) {
        rejected.push(file.name);
        continue;
      }
      try {
        const content = await file.text();
        if (content.length > 500000) {
          rejected.push(`${file.name} (too large)`);
          continue;
        }
        results.push({ name: file.name, content });
      } catch {
        rejected.push(`${file.name} (unreadable)`);
      }
    }
    if (results.length > 0) setAttachedFiles((prev) => [...prev, ...results]);
    if (rejected.length > 0) {
      setFileError(`Can't attach: ${rejected.join(", ")}. Only text-based files supported.`);
      setTimeout(() => setFileError(null), 5000);
    }
  }, []);

  // ─── Recall command ───────────────────────────────────────

  const handleRecall = useCallback(async (query) => {
    setRecallResults(null);
    try {
      const results = await recallNotes(query);
      setRecallResults({ query, results });
    } catch (err) {
      console.error("[handleRecall] failed:", err.message);
      setRecallResults({ query, results: [], error: "Recall failed. Try again." });
    }
  }, [recallNotes]);

  // ─── Assemble context for a message ───────────────────────
  // Called by useChat.sendMessage() — builds context array and
  // optionally annotates the API messages with file info.

  const assembleContext = useCallback(async (text, apiMessages) => {
    let context = [];

    // Vault context
    if (isReady && getContextWithMeta) {
      try {
        const result = await getContextWithMeta(text);
        context = result.selected;
        setContextMeta(result.metadata);
      } catch (err) {
        console.error("[assembleContext] vault context failed:", err.message);
      }
    }

    // Recalled notes (deduplicated by title)
    for (const rn of recalledNotes) {
      if (!context.find((c) => c.title === rn.title)) {
        context.push({ title: rn.title, content: rn.content });
      }
    }

    // Attached files
    for (const af of attachedFiles) {
      context.push({ title: `[Uploaded] ${af.name}`, content: af.content });
    }

    // Annotate API message with file names
    let annotatedMessages = null;
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map((af) => af.name).join(", ");
      annotatedMessages = apiMessages.map((m, i) =>
        i === apiMessages.length - 1
          ? { ...m, content: `${m.content}\n\n[Attached files: ${fileNames}]` }
          : m
      );
    }

    // Save attached files as notes (background, non-blocking)
    if (attachedFiles.length > 0 && user) {
      for (const af of attachedFiles) {
        const noteTitle = af.name.replace(/\.[^.]+$/, "");
        supabase
          .from("notes")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", noteTitle)
          .eq("source", "chat-upload")
          .maybeSingle()
          .then(({ data: existing }) => {
            if (existing) {
              supabase.from("notes").update({
                content: af.content,
                updated_at: new Date().toISOString(),
              }).eq("id", existing.id).then(() => {}).catch(() => {});
            } else {
              supabase.from("notes").insert({
                user_id: user.id,
                title: noteTitle,
                content: af.content,
                source: "chat-upload",
                folder: "00-INBOX",
                encrypted: false,
                context_mode: "available",
              }).then(() => {}).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
    setAttachedFiles([]);

    // GitHub repos
    for (const repo of ghContext) {
      const treeStr = repo.tree
        .filter((f) => f.type === "file")
        .map((f) => f.path)
        .join("\n");
      context.push({ title: `GitHub: ${repo.repo}`, content: `Full repository file tree:\n${treeStr}` });
    }

    // Numbrly
    if (nblContext) {
      context.push({ title: "Numbrly (Business Data)", content: nblContext });
    }

    return { context, annotatedMessages };
  }, [isReady, getContextWithMeta, recalledNotes, attachedFiles, user, ghContext, nblContext]);

  // ─── Dismiss alerts ───────────────────────────────────────

  const dismissAlerts = useCallback(() => {
    const fp = alerts.map((a) => a.message).join("|");
    setAlertsDismissed(fp);
    try { localStorage.setItem("fulkit-alerts-dismissed", fp); } catch {}
  }, [alerts]);

  // ─── Reset on new chat ────────────────────────────────────

  const resetContext = useCallback(() => {
    setContextMeta(null);
    setRecalledNotes([]);
    setRecallResults(null);
    setAttachedFiles([]);
  }, []);

  return {
    // Context data
    ghContext,
    nblContext,
    nblError,
    contextMeta,
    // Files
    attachedFiles,
    setAttachedFiles,
    handleChatFiles,
    fileError,
    // Recall
    recalledNotes,
    setRecalledNotes,
    recallResults,
    setRecallResults,
    handleRecall,
    // Alerts
    alerts,
    alertsDismissed,
    dismissAlerts,
    // Actions
    assembleContext,
    resetContext,
  };
}
