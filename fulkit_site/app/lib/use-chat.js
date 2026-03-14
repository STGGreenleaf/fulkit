"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { extractArtifacts, writeBackLocal, writeBackSupabase } from "./vault-writeback";

/**
 * useChat — core messaging hook for Fulkit chat.
 *
 * Owns: messages, streaming, conversations, send flow, DB persistence.
 * Does NOT own: context assembly, file attachments, UI state.
 */
export function useChat({ user, isDev, accessToken, authFetch, storageMode, directoryHandle, sandbox, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null); // "preparing" | "connecting" | "streaming"
  const [streamStartedAt, setStreamStartedAt] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);

  const abortRef = useRef(null);
  const streamingRef = useRef(false);
  const mountedRef = useRef(true);
  // Chunk buffer — accumulate SSE chunks, flush to state on rAF
  const chunkBufferRef = useRef("");
  const flushRafRef = useRef(null);

  // ─── Conversations ────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user || isDev) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .or("type.eq.chat,type.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [user, isDev]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Load messages on conversation switch ─────────────────
  // Only fires when conversationId changes (switching conversations).
  // Does NOT fire when streaming ends — avoids race condition where
  // the DB load overwrites in-memory messages before the assistant
  // response save completes.

  useEffect(() => {
    if (!conversationId || isDev || streamingRef.current) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, created_at, is_pinned")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data && !cancelled && !streamingRef.current) {
        setMessages(data.map((m) => ({
          id: m.id, role: m.role, content: m.content, is_pinned: m.is_pinned,
        })));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [conversationId, isDev]);

  // ─── DB helpers ───────────────────────────────────────────

  async function ensureConversation(firstMessage) {
    if (conversationId) return conversationId;
    if (isDev) return null;

    const title = firstMessage.length > 60
      ? firstMessage.slice(0, 57) + "..."
      : firstMessage;

    try {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title })
        .select("id")
        .single()
        .abortSignal(AbortSignal.timeout(5000));

      if (data) {
        setConversationId(data.id);
        loadConversations();
        return data.id;
      }
    } catch (err) {
      console.error("[ensureConversation] failed:", err.message);
    }
    return null;
  }

  async function saveMessage(convId, role, content) {
    if (!convId || isDev) return null;
    try {
      const { data } = await supabase
        .from("messages")
        .insert({ conversation_id: convId, role, content })
        .select("id")
        .single()
        .abortSignal(AbortSignal.timeout(8000));
      // Touch updated_at (fire and forget)
      supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId)
        .then(() => {})
        .catch(() => {});
      return data?.id || null;
    } catch (err) {
      console.error("[saveMessage] failed:", err.message);
      return null;
    }
  }

  // ─── Flush buffered chunks to state ───────────────────────

  function scheduleFlush() {
    if (flushRafRef.current) return;
    flushRafRef.current = requestAnimationFrame(() => {
      flushRafRef.current = null;
      const buffered = chunkBufferRef.current;
      if (!buffered) return;
      chunkBufferRef.current = "";
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: last.content + buffered };
        }
        return copy;
      });
    });
  }

  // ─── Send message ─────────────────────────────────────────

  const sendMessage = useCallback(async (assembleContext, retryText) => {
    const isRetry = typeof retryText === "string";
    const text = isRetry ? retryText.trim() : input.trim();
    console.log("[sendMessage] entry", { text: text?.slice(0, 30), isRetry, streamingRef: streamingRef.current, hasAuthFetch: !!authFetch });
    if (!text || streamingRef.current) {
      console.warn("[sendMessage] blocked —", !text ? "empty text" : "already streaming");
      return;
    }

    // On retry, remove the failed assistant message before re-sending
    if (isRetry) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last._failed ? prev.slice(0, -1) : prev;
      });
    }

    const msgTimestamp = Date.now();
    const userMsg = isRetry ? null : { role: "user", content: text, _ts: msgTimestamp };
    // For retry, reuse existing messages (user msg is already there); for new, append user msg
    let apiMessages = isRetry ? [...messages.filter((m) => !m._failed)] : [...messages, userMsg];
    // In sandbox mode, only send current chapter messages (bounded window)
    const sandboxMode = sandbox?.sandboxActive && sandbox?.currentChapter;
    if (sandboxMode) {
      const chapterMsgs = sandbox.currentChapter.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      apiMessages = isRetry ? [...chapterMsgs] : [...chapterMsgs, userMsg];
    }
    if (!isRetry) {
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }
    setStreaming(true);
    setStreamPhase("preparing");
    setStreamStartedAt(Date.now());
    streamingRef.current = true;

    let convId = null;
    let fullResponse = "";
    let firstChunkReceived = false;
    let safetyTimeout = null;
    const assistantTs = Date.now();

    try {
      // Create conversation — timeout after 5s, don't block if it fails
      convId = await ensureConversation(text);

      // Save user message in background (skip on retry — already saved)
      if (!isRetry) {
        saveMessage(convId, "user", text)
          .then((id) => {
            if (id) {
              setMessages((prev) =>
                prev.map((m) =>
                  m._ts === msgTimestamp && !m.id ? { ...m, id } : m
                )
              );
            }
          })
          .catch(() => {});
      }

      // Add empty assistant placeholder with timestamp for safe ID assignment
      setMessages((prev) => [...prev, { role: "assistant", content: "", _ts: assistantTs }]);

      // Assemble context (provided by useChatContext) — 10s timeout
      let context = [];
      let annotatedMessages = null;
      try {
        const ctxResult = await Promise.race([
          assembleContext(text, apiMessages),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Context assembly timed out")), 10000)
          ),
        ]);
        context = ctxResult.context;
        annotatedMessages = ctxResult.annotatedMessages;
      } catch (err) {
        console.warn("[sendMessage] context assembly failed/timed out:", err.message);
      }
      if (annotatedMessages) apiMessages = annotatedMessages;

      setStreamPhase("connecting");

      const controller = new AbortController();
      abortRef.current = controller;

      // Safety timeout — abort if no chunks arrive within 45 seconds
      safetyTimeout = setTimeout(() => {
        controller.abort();
      }, 45000);

      // Rolling inactivity watchdog — resets on each chunk
      function resetWatchdog() {
        clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(() => {
          controller.abort();
        }, 30000);
      }

      console.log("[sendMessage] firing authFetch →", "/api/chat");
      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          context,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ...(conversationId ? { conversationId } : {}),
          ...(sandboxMode && sandbox.chapters?.length > 0
            ? { chapterSummaries: sandbox.chapters }
            : {}),
        }),
        signal: controller.signal,
      });

      console.log("[sendMessage] response status:", res.status);
      if (!res.ok) {
        clearTimeout(safetyTimeout); // kill watchdog
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || "Something went wrong.";
        console.error("[sendMessage] API error:", res.status, errMsg);
        // Don't mark rate-limit messages as retryable
        const isRetryable = res.status !== 429 && !errMsg.includes("used all");
        const isCappedError = res.status === 429 && errMsg.includes("used all");
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: errMsg,
            ...(isRetryable ? { _failed: true, _failedUserText: text } : {}),
            ...(isCappedError ? { _capped: true } : {}),
          };
          return copy;
        });
        return;
      }

      // Stream response — buffer chunks, flush on rAF
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        if (!firstChunkReceived) {
          firstChunkReceived = true;
          setStreamPhase("streaming");
        }
        resetWatchdog();

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const { text: chunk, error } = JSON.parse(payload);
            if (error) {
              // Flush any buffered content first, then show error
              if (chunkBufferRef.current) {
                fullResponse += chunkBufferRef.current;
                chunkBufferRef.current = "";
              }
              fullResponse += "\n\n" + error;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: fullResponse,
                  _failed: true,
                  _failedUserText: text,
                };
                return copy;
              });
              streamDone = true;
              break;
            }
            if (chunk) {
              fullResponse += chunk;
              chunkBufferRef.current += chunk;
              scheduleFlush();
            }
          } catch {
            // skip malformed JSON
          }
        }
      }

      // Final flush — ensure all buffered content is rendered
      if (chunkBufferRef.current) {
        const remaining = chunkBufferRef.current;
        chunkBufferRef.current = "";
        if (flushRafRef.current) {
          cancelAnimationFrame(flushRafRef.current);
          flushRafRef.current = null;
        }
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: last.content + remaining };
          }
          return copy;
        });
      }
    } catch (err) {
      clearTimeout(safetyTimeout);
      let isFailed = false;
      if (err.name === "AbortError" && !firstChunkReceived) {
        fullResponse = "Took too long to respond.";
        isFailed = true;
      } else if (err.name === "AbortError" && firstChunkReceived) {
        // Mid-stream inactivity timeout — show what we have + error
        fullResponse = (fullResponse || "") + "\n\n*(Response interrupted — connection went silent.)*";
        isFailed = true;
      } else if (err.name !== "AbortError") {
        fullResponse = "Connection error.";
        isFailed = true;
      }

      if (fullResponse) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          const failedMsg = {
            role: "assistant",
            content: fullResponse,
            ...(isFailed ? { _failed: true, _failedUserText: text } : {}),
          };
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, ...failedMsg };
          } else {
            copy.push(failedMsg);
          }
          return copy;
        });
      }
    } finally {
      setStreaming(false);
      setStreamPhase(null);
      setStreamStartedAt(null);
      streamingRef.current = false;
      abortRef.current = null;
      // Clean up any pending rAF
      if (flushRafRef.current) {
        cancelAnimationFrame(flushRafRef.current);
        flushRafRef.current = null;
      }
    }

    // Save assistant response in background
    if (fullResponse && convId) {
      saveMessage(convId, "assistant", fullResponse)
        .then((id) => {
          if (id && mountedRef.current) {
            setMessages((prev) =>
              prev.map((m) =>
                m._ts === assistantTs && !m.id ? { ...m, id } : m
              )
            );
          }
          if (mountedRef.current) loadConversations();
        })
        .catch(() => {});

      // Write-back artifacts
      if (!isDev) {
        try {
          const artifacts = extractArtifacts(fullResponse);
          if (artifacts.actionItems.length > 0) {
            const title = text.slice(0, 60) || "Chat";
            if (storageMode === "local" && directoryHandle) {
              writeBackLocal(directoryHandle, artifacts, title).catch(() => {});
            } else if (user) {
              writeBackSupabase(user.id, artifacts, title, null, convId).catch(() => {});
            }
          }
        } catch {}
      }

      // Sandbox: track turn in current chapter
      if (sandboxMode && sandbox.addTurnToChapter) {
        try {
          sandbox.addTurnToChapter(
            { role: "user", content: text, _ts: msgTimestamp },
            { role: "assistant", content: fullResponse, _ts: assistantTs }
          );
        } catch {}
      }

      // Refresh profile so client-side Fül count stays current
      if (onMessageSent) {
        try { onMessageSent(); } catch {}
      }
    }
  }, [input, streaming, messages, conversationId, user, isDev, accessToken, authFetch,
    loadConversations, storageMode, directoryHandle, sandbox, onMessageSent]);

  // ─── Actions ──────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const startNewChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setStreaming(false);
    setStreamPhase(null);
    setStreamStartedAt(null);
    streamingRef.current = false;
  }, []);

  const openConversation = useCallback((conv) => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
    setStreamPhase(null);
    setStreamStartedAt(null);
    streamingRef.current = false;
    setConversationId(conv.id);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortRef.current) abortRef.current.abort();
      if (flushRafRef.current) cancelAnimationFrame(flushRafRef.current);
    };
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    streaming,
    streamPhase,
    streamStartedAt,
    conversationId,
    conversations,
    sendMessage,
    stopStreaming,
    startNewChat,
    openConversation,
    loadConversations,
  };
}
