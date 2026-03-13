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
export function useChat({ user, isDev, accessToken, storageMode, directoryHandle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
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

  useEffect(() => {
    if (!conversationId || isDev || streaming) return;
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
  }, [conversationId, isDev, streaming]);

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

  const sendMessage = useCallback(async (assembleContext) => {
    const text = input.trim();
    if (!text || streamingRef.current) return;

    const msgTimestamp = Date.now();
    const userMsg = { role: "user", content: text, _ts: msgTimestamp };
    let apiMessages = [...messages, userMsg];
    setMessages(apiMessages);
    setInput("");
    setStreaming(true);
    streamingRef.current = true;

    let convId = null;
    let fullResponse = "";
    let firstChunkReceived = false;
    let safetyTimeout = null;
    const assistantTs = Date.now();

    try {
      // Create conversation — timeout after 5s, don't block if it fails
      convId = await ensureConversation(text);

      // Save user message in background — match by timestamp to avoid duplicate text race
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

      const controller = new AbortController();
      abortRef.current = controller;

      // Safety timeout — abort if no chunks arrive within 90 seconds
      safetyTimeout = setTimeout(() => {
        controller.abort();
      }, 90000);

      // Rolling inactivity watchdog — resets on each chunk
      function resetWatchdog() {
        clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(() => {
          controller.abort();
        }, 30000);
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: apiMessages,
          context,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(safetyTimeout); // kill watchdog
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || "Something went wrong.";
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: errMsg };
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
                copy[copy.length - 1] = { role: "assistant", content: fullResponse };
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
      if (err.name === "AbortError" && !firstChunkReceived) {
        fullResponse = "Took too long to respond. Try again or rephrase.";
      } else if (err.name === "AbortError" && firstChunkReceived) {
        // Mid-stream inactivity timeout — show what we have + error
        fullResponse = (fullResponse || "") + "\n\n*(Response interrupted — connection went silent. Try again.)*";
      } else if (err.name !== "AbortError") {
        fullResponse = "Connection error. Try again.";
      }

      if (fullResponse) {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === "assistant") {
            copy[copy.length - 1] = { ...last, content: fullResponse };
          } else {
            copy.push({ role: "assistant", content: fullResponse });
          }
          return copy;
        });
      }
    } finally {
      setStreaming(false);
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
              writeBackSupabase(user.id, artifacts, title).catch(() => {});
            }
          }
        } catch {}
      }
    }
  }, [input, streaming, messages, conversationId, user, isDev, accessToken,
    loadConversations, storageMode, directoryHandle]);

  // ─── Actions ──────────────────────────────────────────────

  const startNewChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setStreaming(false);
    streamingRef.current = false;
  }, []);

  const openConversation = useCallback((conv) => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
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
    conversationId,
    conversations,
    sendMessage,
    startNewChat,
    openConversation,
    loadConversations,
  };
}
