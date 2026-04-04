"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { extractArtifacts, writeBackLocal, writeBackSupabase, detectEcosystem } from "./vault-writeback";
import { saveConversationSummary } from "./conversation-summary";
import { useSignal } from "./signal";

// Lightweight topic extraction from message text — no API call
const STOPWORDS = new Set([
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they", "them",
  "a", "an", "the", "this", "that", "these", "those", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must", "to", "of",
  "in", "for", "on", "with", "at", "by", "from", "as", "into", "about", "like",
  "through", "after", "before", "between", "out", "up", "down", "if", "or", "and",
  "but", "not", "no", "so", "than", "too", "very", "just", "also", "now", "then",
  "here", "there", "when", "where", "how", "what", "which", "who", "whom", "why",
  "all", "each", "every", "both", "few", "more", "most", "some", "any", "other",
  "new", "old", "get", "got", "make", "made", "go", "going", "know", "think",
  "take", "come", "see", "look", "want", "give", "use", "find", "tell", "ask",
  "work", "seem", "feel", "try", "leave", "call", "keep", "let", "put", "show",
  "set", "say", "said", "thing", "things", "way", "lot", "really", "much", "many",
  "well", "back", "still", "even", "right", "only", "good", "great", "first",
  "last", "long", "own", "same", "big", "sure", "able", "hey", "yeah", "yes",
  "ok", "okay", "thanks", "thank", "please", "hi", "hello", "one", "two", "don",
  "doesn", "didn", "won", "wouldn", "couldn", "shouldn", "isn", "aren", "wasn",
  "weren", "hasn", "haven", "ll", "ve", "re", "im", "its",
]);

function extractTopics(messages) {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content || "")
    .join(" ");

  const words = userText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

  // Count frequency
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Sort by frequency * word length (favor specific terms over short common ones)
  return Object.entries(freq)
    .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
    .slice(0, 8)
    .map(([word]) => word);
}

/**
 * useChat — core messaging hook for Fulkit chat.
 *
 * Owns: messages, streaming, conversations, send flow, DB persistence.
 * Does NOT own: context assembly, file attachments, UI state.
 */
export function useChat({ user, accessToken, authFetch, storageMode, directoryHandle, sandbox, onMessageSent, onApiDown }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState(null); // "preparing" | "connecting" | "streaming"
  const [toolProgress, setToolProgress] = useState(null); // { current, total }
  const [streamStartedAt, setStreamStartedAt] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);

  const signal = useSignal();
  const abortRef = useRef(null);
  const streamingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSendTimeRef = useRef(0);
  // Chunk buffer — accumulate SSE chunks, flush to state on rAF
  const chunkBufferRef = useRef("");
  const flushRafRef = useRef(null);

  // Reset streaming state on mount — prevents stale ref from previous session/aborted stream
  useEffect(() => {
    streamingRef.current = false;
    return () => { streamingRef.current = false; };
  }, []);

  // ─── Conversations ────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at, topics")
      .or("type.eq.chat,type.is.null")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Load messages on conversation switch ─────────────────
  // Only fires when conversationId changes (switching conversations).
  // Does NOT fire when streaming ends — avoids race condition where
  // the DB load overwrites in-memory messages before the assistant
  // response save completes.

  useEffect(() => {
    if (!conversationId || streamingRef.current) return;
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
  }, [conversationId]);

  // ─── DB helpers ───────────────────────────────────────────

  async function ensureConversation(firstMessage) {
    if (conversationId) return conversationId;

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
      signal("conversation_save_failed", "error", { error: err?.message });
    }
    return null;
  }

  async function saveMessage(convId, role, content) {
    if (!convId) return null;
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

  const sendMessage = useCallback(async (assembleContext, retryText, greetingText, overrideText) => {
    const isRetry = typeof retryText === "string";
    const text = overrideText?.trim() || (isRetry ? retryText.trim() : input.trim());
    console.log("[sendMessage] entry", { text: text?.slice(0, 30), isRetry, streamingRef: streamingRef.current, hasAuthFetch: !!authFetch });
    if (!text || streamingRef.current) {
      console.warn("[sendMessage] blocked —", !text ? "empty text" : "already streaming");
      if (text && streamingRef.current) signal("double_send", "info", { textLength: text.length });
      return;
    }

    // Rapid retry detection
    if (isRetry && Date.now() - lastSendTimeRef.current < 5000) {
      signal("rapid_retry", "info", { elapsed: Date.now() - lastSendTimeRef.current, conversationId, messageCount: messages.length });
    }
    lastSendTimeRef.current = Date.now();

    // Lock immediately — prevents rapid-fire double-sends
    streamingRef.current = true;
    console.log("[sendMessage] lock acquired, streamingRef → true");

    let convId = null;
    let fullResponse = "";
    let firstChunkReceived = false;
    let safetyTimeout = null;
    let fetchStart = Date.now();
    let msgCount = 0;
    let sandboxMode = false;
    const msgTimestamp = Date.now();
    const assistantTs = Date.now();

    try {
    // ─── Message setup (inside try so lock always releases) ──
    console.log("[sendMessage] step:setup");

    // On retry, remove the failed assistant message before re-sending
    if (isRetry) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last._failed ? prev.slice(0, -1) : prev;
      });
    }

    const userMsg = isRetry ? null : { role: "user", content: text, _ts: msgTimestamp };
    // For retry, reuse existing messages (user msg is already there); for new, append user msg
    let apiMessages = isRetry ? [...messages.filter((m) => !m._failed)] : [...messages, userMsg];
    // Prepend greeting as prior assistant message for continuity
    if (greetingText && !isRetry) {
      apiMessages = [{ role: "assistant", content: greetingText }, ...apiMessages];
    }
    // In sandbox mode, only send current chapter messages (bounded window)
    sandboxMode = sandbox?.sandboxActive && sandbox?.currentChapter;
    if (sandboxMode) {
      const chapterMsgs = sandbox.currentChapter.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      // On retry, include chapter messages + the retried user message (already in messages state)
      apiMessages = isRetry
        ? [...chapterMsgs, { role: "user", content: text }]
        : [...chapterMsgs, userMsg];
    }
    if (!isRetry) {
      setMessages((prev) =>
        greetingText
          ? [{ role: "assistant", content: greetingText, _greeting: true }, ...prev, userMsg]
          : [...prev, userMsg]
      );
      setInput("");
    }
    setStreaming(true);
    setStreamPhase("preparing");
    setToolProgress(null);
    setStreamStartedAt(Date.now());
    streamingRef.current = true;

    console.log("[sendMessage] step:setup done, messages:", apiMessages.length, "sandbox:", !!sandboxMode);

      // Create conversation — timeout after 5s, don't block if it fails
      console.log("[sendMessage] step:conversation");
      convId = await ensureConversation(text);
      if (!convId && !isRetry) {
        console.warn("[sendMessage] no conversation — messages will not be saved");
      }
      console.log("[sendMessage] step:conversation done, convId:", convId ? "yes" : "null");

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
          .catch((err) => { signal("message_save_failed", "error", { role: "user", conversationId: convId, error: err?.message }); });
      }

      // Save greeting as first assistant message if provided (fire-and-forget)
      if (greetingText && convId && !isRetry) {
        saveMessage(convId, "assistant", greetingText)
          .then(() => {}).catch(() => {});
      }

      // Add empty assistant placeholder with timestamp for safe ID assignment
      setMessages((prev) => [...prev, { role: "assistant", content: "", _ts: assistantTs }]);

      // Assemble context (provided by useChatContext) — 10s timeout
      let context = [];
      let annotatedMessages = null;
      try {
        const ctxStart = Date.now();
        console.log("[sendMessage] context assembly starting...");
        const ctxResult = await Promise.race([
          assembleContext(text, apiMessages),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Context assembly timed out")), 10000)
          ),
        ]);
        context = ctxResult.context;
        annotatedMessages = ctxResult.annotatedMessages;
        console.log("[sendMessage] context assembled in", Date.now() - ctxStart, "ms —", context.length, "items");
      } catch (err) {
        console.warn("[sendMessage] context assembly failed/timed out:", err.message);
        signal("context_timeout", "warning", { error: err.message, conversationId, messageCount: apiMessages.length });
      }
      if (annotatedMessages) apiMessages = annotatedMessages;

      setStreamPhase("connecting");

      const controller = new AbortController();
      abortRef.current = controller;

      // Safety timeout — abort if no chunks arrive within 30 seconds
      safetyTimeout = setTimeout(() => {
        controller.abort();
      }, 30000);

      // Rolling inactivity watchdog — resets on each chunk (60s — 12 keep-alive pings at 5s each)
      function resetWatchdog() {
        clearTimeout(safetyTimeout);
        safetyTimeout = setTimeout(() => {
          controller.abort();
        }, 60000);
      }

      // Pause watchdog when tab backgrounds — resume when visible
      const handleVisibility = () => {
        if (document.hidden) {
          clearTimeout(safetyTimeout);
        } else {
          resetWatchdog();
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);

      msgCount = apiMessages.length;
      console.log("[sendMessage] firing authFetch → /api/chat", { msgCount, hasContext: context.length > 0, convId });
      fetchStart = Date.now();
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

      console.log("[sendMessage] response status:", res.status, "in", Date.now() - fetchStart, "ms");
      if (!res.ok) {
        clearTimeout(safetyTimeout); // kill watchdog
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || "Something went wrong.";
        console.error("[sendMessage] API error:", res.status, errMsg);
        if (res.status >= 500) onApiDown?.();
        if (res.status === 429) {
          signal("rate_limit", "warning", { conversationId });
        } else {
          signal("chat_api_error", "error", { status: res.status, error: errMsg.slice(0, 200), conversationId, messageCount: msgCount, hasContext: context.length > 0, contextItems: context.length, isRetry });
        }
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
          const chunkLatency = Date.now() - fetchStart;
          console.log("[sendMessage] first chunk received —", chunkLatency, "ms after fetch");
          if (chunkLatency > 5000) signal("slow_stream", "warning", { latency: chunkLatency, conversationId, messageCount: msgCount, contextItems: context.length });
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
            const parsed = JSON.parse(payload);
            if (parsed.debug) {
              console.log("[chat:debug] ─── REQUEST ───");
              console.log("[chat:debug]", JSON.stringify(parsed.debug, null, 2));
              continue;
            }
            if (parsed.debugPost) {
              console.log("[chat:debug] ─── RESPONSE ───");
              console.log("[chat:debug]", JSON.stringify(parsed.debugPost, null, 2));
              continue;
            }
            if (parsed.status === "retrying") {
              console.log(`[chat] API busy, retrying (attempt ${parsed.attempt}/3)...`);
              setStreamPhase("retrying");
              continue;
            }
            if (parsed.toolProgress) {
              setToolProgress(parsed.toolProgress);
              continue;
            }
            const { text: chunk, error } = parsed;
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
      console.error("[sendMessage] CAUGHT:", err.name, err.message, err.stack?.split("\n")[1]);
      clearTimeout(safetyTimeout);
      let isFailed = false;
      if (err.name === "AbortError" && !firstChunkReceived) {
        fullResponse = "Something went wrong — try refreshing your browser.";
        isFailed = true;
        signal("chat_timeout", "warning", { phase: "waiting", elapsed: Date.now() - fetchStart, conversationId, messageCount: msgCount, firstChunkReceived: false });
      } else if (err.name === "AbortError" && firstChunkReceived) {
        // Mid-stream inactivity timeout — show what we have + error
        fullResponse = (fullResponse || "") + "\n\n*(Something went wrong — try refreshing your browser.)*";
        isFailed = true;
        signal("chat_timeout", "warning", { phase: "streaming", elapsed: Date.now() - fetchStart, conversationId, messageCount: msgCount, firstChunkReceived: true, responseLength: fullResponse?.length });
      } else if (err.name !== "AbortError") {
        fullResponse = "Something went wrong — try refreshing your browser.";
        isFailed = true;
        signal("chat_api_error", "error", { error: err.message, errorType: err.name, conversationId, messageCount: msgCount });
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
      clearTimeout(safetyTimeout);
      document.removeEventListener("visibilitychange", handleVisibility);
      console.log("[sendMessage] finally — unlocking, response length:", fullResponse?.length || 0);
      setStreaming(false);
      setStreamPhase(null);
      setToolProgress(null);
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
        .catch((err) => { signal("message_save_failed", "error", { role: "assistant", conversationId: convId, responseLength: fullResponse?.length, error: err?.message }); });

      // Extract topics and save to conversation (fire-and-forget)
      try {
        const currentMessages = [...messages, { role: "user", content: text }, { role: "assistant", content: fullResponse }];
        const topics = extractTopics(currentMessages);
        if (topics.length > 0) {
          supabase
            .from("conversations")
            .update({ topics })
            .eq("id", convId)
            .then(() => {})
            .catch((err) => { signal("topic_extract_failed", "info", { conversationId: convId, error: err?.message }); });
        }
      } catch {}

      // Write-back artifacts (Smart Threads — gated on preference + conversation length)
      try {
          // Only extract from conversations with 3+ user messages (skip drive-bys)
          const userMsgCount = apiMessages.filter(m => m.role === "user").length;
          if (userMsgCount >= 3) {
            // Check Smart Threads preference (default: ON)
            let smartThreadsEnabled = true;
            try {
              const { data: pref } = await supabase.from("preferences").select("value").eq("user_id", user?.id).eq("key", "smart_threads_enabled").maybeSingle();
              if (pref?.value === "false") smartThreadsEnabled = false;
            } catch {}

            if (smartThreadsEnabled) {
              const artifacts = extractArtifacts(fullResponse);
              const hasArtifacts = artifacts.actionItems.length > 0 || artifacts.decisions.length > 0 || artifacts.plans.length > 0 || artifacts.keyFacts.length > 0;
              if (hasArtifacts) {
                const title = text.slice(0, 60) || "Chat";
                const eco = detectEcosystem(fullResponse + " " + text);
                if (storageMode === "local" && directoryHandle) {
                  writeBackLocal(directoryHandle, artifacts, title).catch((err) => { signal("writeback_failed", "warning", { storageMode: "local", error: err?.message, conversationId: convId }); });
                } else if (user) {
                  writeBackSupabase(user.id, artifacts, title, null, convId, eco).catch((err) => { signal("writeback_failed", "warning", { storageMode: "supabase", error: err?.message, conversationId: convId }); });
                }
              }
            }
          }
        } catch {}

      // Sync newly created notes to local vault (Model A)
      if (storageMode === "local" && directoryHandle && user) {
        try {
          const { writeLocalNote } = await import("./vault-local");
          // Fetch notes created in the last 30 seconds (covers this response's tool calls)
          const since = new Date(Date.now() - 30000).toISOString();
          const { data: recentNotes } = await supabase
            .from("notes").select("title, content, folder")
            .eq("user_id", user.id).gte("created_at", since)
            .order("created_at", { ascending: false }).limit(5);
          for (const note of (recentNotes || [])) {
            writeLocalNote(directoryHandle, note.folder || "00-INBOX", note.title, note.content).catch(() => {});
          }
        } catch {}
      }

      // Auto-summarize conversation (always on — baked in)
      try {
        if (user && convId && apiMessages.length >= 5) {
          saveConversationSummary(user.id, convId, apiMessages).catch(() => {});
        }
      } catch {}

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
        try { onMessageSent(); } catch (err) { signal("profile_refresh_failed", "info", { error: err?.message }); }
      }
    }
  }, [input, streaming, messages, conversationId, user, accessToken, authFetch,
    loadConversations, storageMode, directoryHandle, sandbox, onMessageSent, signal]);

  // ─── Actions ──────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      signal("chat_abort", "info", { conversationId, streamPhase });
      abortRef.current.abort();
    }
  }, [signal, conversationId, streamPhase]);

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

  const deleteConversation = useCallback(async (convId) => {
    // If deleting the active conversation, auto-select the next one
    if (convId === conversationId) {
      const idx = conversations.findIndex(c => c.id === convId);
      const remaining = conversations.filter(c => c.id !== convId);
      const next = remaining[idx] || remaining[idx - 1] || null;
      if (next) {
        setConversationId(next.id);
      } else {
        startNewChat();
      }
    }
    // Optimistic removal from list
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    // Delete non-pinned messages, preserve pinned ones, then delete conversation (fire-and-forget)
    supabase.from("messages").delete().eq("conversation_id", convId).neq("is_pinned", true)
      .then(() => supabase.from("conversations").delete().eq("id", convId))
      .catch(() => {});
  }, [conversationId, conversations, startNewChat]);

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
    toolProgress,
    streamStartedAt,
    conversationId,
    conversations,
    sendMessage,
    stopStreaming,
    startNewChat,
    openConversation,
    loadConversations,
    deleteConversation,
  };
}
