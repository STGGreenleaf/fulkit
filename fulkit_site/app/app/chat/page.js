"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, ArrowRight, MessageCircle, Plus, Clock, FileText } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import VaultGate from "../../components/VaultGate";
import { useAuth } from "../../lib/auth";
import { useVaultContext } from "../../lib/vault";
import { supabase } from "../../lib/supabase";
import { extractArtifacts, writeBackLocal, writeBackSupabase } from "../../lib/vault-writeback";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function Chat() {
  const { user } = useAuth();
  const isDev = user?.isDev;
  const { getContext, getContextWithMeta, isReady, storageMode, vaultConnected, directoryHandle } = useVaultContext();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(260);
  const [contextMeta, setContextMeta] = useState(null);
  const draggingRef = useRef(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Load conversation list
  useEffect(() => {
    if (!user || isDev) return;
    loadConversations();
  }, [user, isDev]);

  async function loadConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }

  // Load messages when switching conversations
  useEffect(() => {
    if (!conversationId || isDev) return;
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data.map((m) => ({ role: m.role, content: m.content })));
    }
    loadMessages();
  }, [conversationId, isDev]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  // Create conversation on first message
  async function ensureConversation(firstMessage) {
    if (conversationId) return conversationId;
    if (isDev) return null;

    const title = firstMessage.length > 60
      ? firstMessage.slice(0, 57) + "..."
      : firstMessage;

    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();

    if (data) {
      setConversationId(data.id);
      loadConversations();
      return data.id;
    }
    return null;
  }

  // Save a single message to DB
  async function saveMessage(convId, role, content) {
    if (!convId || isDev) return;
    await supabase.from("messages").insert({
      conversation_id: convId,
      role,
      content,
    });
    // Touch updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);

    // Ensure conversation exists + save user message
    const convId = await ensureConversation(text);
    await saveMessage(convId, "user", text);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Assemble vault context from user's chosen source
    let context = [];
    if (isReady) {
      const result = await getContextWithMeta(text);
      context = result.selected;
      setContextMeta(result.metadata);
    }

    // Get auth token for API authentication
    let authToken = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
      if (!authToken) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        authToken = refreshed?.access_token;
      }
    } catch {
      // Auth token unavailable
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let fullResponse = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages: updated, context }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        const errMsg = err.error || "Something went wrong.";
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: errMsg };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const { text: chunk, error } = JSON.parse(payload);
            if (error) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: error };
                return copy;
              });
              fullResponse = error;
              break;
            }
            if (chunk) {
              fullResponse += chunk;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = {
                  ...last,
                  content: last.content + chunk,
                };
                return copy;
              });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        fullResponse = "Connection error. Try again.";
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: fullResponse };
          return copy;
        });
      }
    }

    // Save assistant response
    if (fullResponse && convId) {
      await saveMessage(convId, "assistant", fullResponse);
      loadConversations();

      // Write-back loop — extract artifacts and file them
      if (!isDev) {
        const artifacts = extractArtifacts(fullResponse);
        if (artifacts.actionItems.length > 0) {
          const title = messages[0]?.content?.slice(0, 60) || "Chat";
          if (storageMode === "local" && directoryHandle) {
            writeBackLocal(directoryHandle, artifacts, title).catch(() => {});
          } else {
            writeBackSupabase(user.id, artifacts, title).catch(() => {});
          }
        }
      }
    }

    setStreaming(false);
    abortRef.current = null;
  }, [input, streaming, messages, conversationId, user, isDev, getContextWithMeta, isReady]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setStreaming(false);
    setContextMeta(null);
  };

  const openConversation = (conv) => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
    setConversationId(conv.id);
  };

  // Drag-to-resize history panel
  const startResize = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = historyWidth;

    const onMouseMove = (e) => {
      if (!draggingRef.current) return;
      // Dragging left edge — moving left = wider, moving right = narrower
      const delta = startX - e.clientX;
      const newWidth = Math.max(160, Math.min(400, startWidth + delta));
      setHistoryWidth(newWidth);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [historyWidth]);

  return (
    <AuthGuard>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
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
            <Sparkles
              size={16}
              strokeWidth={1.8}
              style={{ color: "var(--color-text-muted)" }}
            />
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
              }}
            >
              Chat
            </span>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              {/* Context indicator */}
              {contextMeta && contextMeta.includedCount > 0 && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-dim)",
                    padding: "var(--space-1) var(--space-2)",
                  }}
                >
                  <FileText size={11} strokeWidth={1.8} />
                  {contextMeta.includedCount} note{contextMeta.includedCount !== 1 ? "s" : ""} &middot; {contextMeta.totalTokens >= 1000 ? `${(contextMeta.totalTokens / 1000).toFixed(1)}K` : contextMeta.totalTokens} tokens
                </span>
              )}

              {/* History toggle */}
              {!isDev && conversations.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    fontSize: "var(--font-size-xs)",
                    color: showHistory ? "var(--color-text)" : "var(--color-text-muted)",
                    background: showHistory ? "var(--color-bg-alt)" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <Clock size={12} strokeWidth={2} />
                  History
                </button>
              )}

              {/* New chat */}
              {(messages.length > 0 || conversationId) && (
                <button
                  onClick={startNewChat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                    padding: "var(--space-1) var(--space-2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <Plus size={12} strokeWidth={2} />
                  New
                </button>
              )}
            </div>
          </div>

          {/* Main area — messages + history on right */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Messages area */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "var(--space-5) var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {messages.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-3)",
                    }}
                  >
                    <VaultGate />
                    <MessageCircle
                      size={28}
                      strokeWidth={1.5}
                      style={{ color: "var(--color-text-dim)" }}
                    />
                    <p
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-muted)",
                        textAlign: "center",
                        lineHeight: "var(--line-height-relaxed)",
                      }}
                    >
                      Talk to your bestie.
                      <br />
                      Ask anything. Think out loud. Get stuff done.
                    </p>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: 640,
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "100%",
                        padding: "var(--space-2-5) var(--space-3-5)",
                        fontSize: "var(--font-size-base)",
                        lineHeight: "var(--line-height-relaxed)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        ...(msg.role === "user"
                          ? {
                              background: "var(--color-accent)",
                              color: "var(--color-text-inverse)",
                              borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)",
                            }
                          : {
                              background: "var(--color-bg-alt)",
                              color: "var(--color-text)",
                              border: "1px solid var(--color-border-light)",
                              borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
                            }),
                      }}
                    >
                      {msg.content}
                      {streaming && i === messages.length - 1 && msg.role === "assistant" && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: "1em",
                            background: "var(--color-text-muted)",
                            marginLeft: 2,
                            animation: "blink 0.8s infinite",
                            verticalAlign: "text-bottom",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  padding: "var(--space-3) var(--space-6) var(--space-5)",
                  maxWidth: 640,
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "var(--space-1-5)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "var(--space-1) var(--space-1) var(--space-1) var(--space-3-5)",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Talk to your bestie..."
                    rows={1}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "var(--color-text)",
                      fontSize: "var(--font-size-base)",
                      fontFamily: "var(--font-primary)",
                      padding: "var(--space-1-5) 0",
                      lineHeight: "var(--line-height-normal)",
                      maxHeight: 120,
                      overflowY: "auto",
                      resize: "none",
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || streaming}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-md)",
                      flexShrink: 0,
                      background: input.trim()
                        ? "var(--color-accent)"
                        : "var(--color-border-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: input.trim() ? "pointer" : "default",
                      border: "none",
                      transition: "background var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    <ArrowRight size={14} strokeWidth={2.5} color="var(--color-text-inverse)" />
                  </button>
                </div>
              </div>
            </div>

            {/* History panel — right side, resizable */}
            {showHistory && (
              <>
                {/* Drag handle */}
                <div
                  onMouseDown={startResize}
                  style={{
                    width: 4,
                    cursor: "col-resize",
                    background: "transparent",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 1,
                      background: "var(--color-border-light)",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: historyWidth,
                    minWidth: 160,
                    maxWidth: 400,
                    overflowY: "auto",
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                    userSelect: draggingRef.current ? "none" : "auto",
                  }}
                >
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-2-5)",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: conv.id === conversationId ? "var(--color-bg-alt)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        fontFamily: "var(--font-primary)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: conv.id === conversationId ? "var(--color-text)" : "var(--color-text-secondary)",
                          fontWeight: conv.id === conversationId ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {conv.title}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--font-size-2xs)",
                          color: "var(--color-text-dim)",
                          flexShrink: 0,
                        }}
                      >
                        {timeAgo(conv.updated_at)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}
