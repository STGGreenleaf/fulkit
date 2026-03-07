"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, ArrowRight, MessageCircle, Plus, Clock, FileText, Search, Paperclip, Mic, ChevronRight, FolderOpen, Code } from "lucide-react";
import Link from "next/link";
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

// GitHub icon (matches SOURCE_LOGOS in settings)
const GitHubIcon = ({ size = 15, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

export default function Chat() {
  const { user, accessToken, githubConnected } = useAuth();
  const isDev = user?.isDev;
  const { getContext, getContextWithMeta, recallNotes, isReady, storageMode, vaultConnected, directoryHandle } = useVaultContext();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(260);
  const [contextMeta, setContextMeta] = useState(null);
  const [recalledNotes, setRecalledNotes] = useState([]);
  const [recallResults, setRecallResults] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [chatDragOver, setChatDragOver] = useState(false);
  const [ghBrowserOpen, setGhBrowserOpen] = useState(false);
  const [ghRepos, setGhRepos] = useState([]);
  const [ghSelectedRepo, setGhSelectedRepo] = useState(null);
  const [ghTree, setGhTree] = useState([]);
  const [ghPath, setGhPath] = useState([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghRepoSearch, setGhRepoSearch] = useState("");
  const chatFileRef = useRef(null);
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

  async function handleChatFiles(files) {
    const results = [];
    for (const file of files) {
      if (!file.name.match(/\.(md|txt|js|jsx|ts|tsx|css|json|html|py|rb|go|rs|sh|yaml|yml|toml|sql|env|csv)$/i)) continue;
      try {
        const content = await file.text();
        results.push({ name: file.name, content });
      } catch {
        // skip unreadable files
      }
    }
    if (results.length > 0) setAttachedFiles((prev) => [...prev, ...results]);
  }

  // GitHub browser functions
  async function openGhBrowser() {
    setGhBrowserOpen(true);
    setGhSelectedRepo(null);
    setGhTree([]);
    setGhPath([]);
    setGhRepoSearch("");
    setGhLoading(true);
    try {
      const res = await fetch("/api/github/repos", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setGhRepos(await res.json());
    } catch {}
    setGhLoading(false);
  }

  async function selectGhRepo(repo) {
    setGhSelectedRepo(repo);
    setGhPath([]);
    setGhLoading(true);
    try {
      const res = await fetch(`/api/github/tree?repo=${encodeURIComponent(repo.full_name)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setGhTree(await res.json());
    } catch {}
    setGhLoading(false);
  }

  async function navigateGhDir(dirItem) {
    setGhPath((prev) => [...prev, dirItem.name]);
    setGhLoading(true);
    try {
      const res = await fetch(`/api/github/tree?repo=${encodeURIComponent(ghSelectedRepo.full_name)}&path=${encodeURIComponent(dirItem.path)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setGhTree(await res.json());
    } catch {}
    setGhLoading(false);
  }

  async function ghGoUp() {
    const newPath = ghPath.slice(0, -1);
    setGhPath(newPath);
    setGhLoading(true);
    try {
      const pathStr = newPath.join("/");
      const res = await fetch(`/api/github/tree?repo=${encodeURIComponent(ghSelectedRepo.full_name)}${pathStr ? `&path=${encodeURIComponent(pathStr)}` : ""}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setGhTree(await res.json());
    } catch {}
    setGhLoading(false);
  }

  async function selectGhFile(fileItem) {
    setGhLoading(true);
    try {
      const res = await fetch(`/api/github/file?repo=${encodeURIComponent(ghSelectedRepo.full_name)}&path=${encodeURIComponent(fileItem.path)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedFiles((prev) => [...prev, { name: `${ghSelectedRepo.name}/${data.path}`, content: data.content }]);
      }
    } catch {}
    setGhLoading(false);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Handle /recall command
    const recallMatch = text.match(/^\/recall\s+(.+)/i);
    if (recallMatch) {
      setInput("");
      setRecallResults(null);
      const query = recallMatch[1].trim();
      const results = await recallNotes(query);
      setRecallResults({ query, results });
      return;
    }

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);
    setRecallResults(null);

    // Ensure conversation exists + save user message
    const convId = await ensureConversation(text);
    await saveMessage(convId, "user", text);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    // Assemble vault context from user's chosen source + recalled notes
    let context = [];
    if (isReady) {
      const result = await getContextWithMeta(text);
      context = result.selected;
      setContextMeta(result.metadata);
    }
    // Append recalled notes (deduplicated by title)
    for (const rn of recalledNotes) {
      if (!context.find((c) => c.title === rn.title)) {
        context.push({ title: rn.title, content: rn.content });
      }
    }
    // Append attached files as ephemeral context
    for (const af of attachedFiles) {
      context.push({ title: af.name, content: af.content });
    }
    setAttachedFiles([]);

    // Use auth token from context (set during login)
    const authToken = accessToken;

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
  }, [input, streaming, messages, conversationId, user, isDev, accessToken, getContextWithMeta, recallNotes, recalledNotes, isReady, attachedFiles]);

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
    setRecalledNotes([]);
    setRecallResults(null);
    setAttachedFiles([]);
    setGhBrowserOpen(false);
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
              {recalledNotes.length > 0 && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-secondary)",
                    padding: "var(--space-1) var(--space-2)",
                    background: "var(--color-bg-alt)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <Search size={10} strokeWidth={2} />
                  {recalledNotes.length} recalled
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
            <div
              style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}
              onDragOver={(e) => { e.preventDefault(); setChatDragOver(true); }}
              onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setChatDragOver(false); }}
              onDrop={(e) => { e.preventDefault(); setChatDragOver(false); if (e.dataTransfer.files?.length) handleChatFiles(Array.from(e.dataTransfer.files)); }}
            >
              {chatDragOver && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--color-bg-alt)",
                    opacity: 0.9,
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                    Drop files to attach
                  </span>
                </div>
              )}
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
                      Add anything. Think out loud. Get stuff done.
                      <br />
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                        Drop files, paste code, or just start typing.
                      </span>
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

              {/* Recall results */}
              {recallResults && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6)",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-bg-alt)",
                        borderBottom: "1px solid var(--color-border-light)",
                      }}
                    >
                      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Recall: &ldquo;{recallResults.query}&rdquo; — {recallResults.results.length} match{recallResults.results.length !== 1 ? "es" : ""}
                      </span>
                      <button
                        onClick={() => setRecallResults(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", display: "flex" }}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                    {recallResults.results.length === 0 && (
                      <p style={{ padding: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", textAlign: "center" }}>
                        No notes found.
                      </p>
                    )}
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {recallResults.results.map((note) => {
                        const isAdded = recalledNotes.some((rn) => rn.id === note.id);
                        return (
                          <button
                            key={note.id}
                            onClick={() => {
                              if (isAdded) {
                                setRecalledNotes((prev) => prev.filter((rn) => rn.id !== note.id));
                              } else {
                                setRecalledNotes((prev) => [...prev, note]);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-2)",
                              width: "100%",
                              padding: "var(--space-2) var(--space-3)",
                              background: isAdded ? "var(--color-bg-alt)" : "transparent",
                              border: "none",
                              borderTop: "1px solid var(--color-border-light)",
                              cursor: "pointer",
                              fontFamily: "var(--font-primary)",
                              textAlign: "left",
                            }}
                          >
                            <FileText size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: "var(--font-size-xs)", color: isAdded ? "var(--color-text-primary)" : "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {note.folder ? <span style={{ color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)" }}>{note.folder}/</span> : null}{note.title}
                            </span>
                            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                              {note.tokenEstimate >= 1000 ? `${(note.tokenEstimate / 1000).toFixed(1)}K` : note.tokenEstimate}
                            </span>
                            <span style={{ fontSize: "var(--font-size-2xs)", color: isAdded ? "var(--color-text-primary)" : "var(--color-text-dim)", flexShrink: 0, width: 14, textAlign: "center" }}>
                              {isAdded ? "−" : "+"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recalled notes chips */}
              {recalledNotes.length > 0 && !recallResults && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6) var(--space-1)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                  }}
                >
                  {recalledNotes.map((rn) => (
                    <button
                      key={rn.id}
                      onClick={() => setRecalledNotes((prev) => prev.filter((n) => n.id !== rn.id))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-secondary)",
                        background: "var(--color-bg-alt)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        padding: "2px 6px",
                        cursor: "pointer",
                        fontFamily: "var(--font-primary)",
                      }}
                    >
                      <FileText size={9} strokeWidth={1.8} />
                      {rn.title}
                      <X size={9} strokeWidth={2} />
                    </button>
                  ))}
                </div>
              )}

              {/* Attached files chips */}
              {attachedFiles.length > 0 && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6) var(--space-1)",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                  }}
                >
                  {attachedFiles.map((af, i) => {
                    const isGh = af.name.includes("/");
                    return (
                      <button
                        key={i}
                        onClick={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          fontSize: "var(--font-size-2xs)",
                          color: "var(--color-text-secondary)",
                          background: "var(--color-bg-alt)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-sm)",
                          padding: "2px 6px",
                          cursor: "pointer",
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        {isGh ? <GitHubIcon size={9} /> : <Paperclip size={9} strokeWidth={1.8} />}
                        {af.name}
                        <X size={9} strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* GitHub file browser */}
              {ghBrowserOpen && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6) var(--space-2)",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-bg-alt)",
                        borderBottom: "1px solid var(--color-border-light)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <GitHubIcon size={12} style={{ color: "var(--color-text-muted)" }} />
                        <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {!ghSelectedRepo ? "Select a repo" : (
                            <>
                              <button
                                onClick={() => { setGhSelectedRepo(null); setGhTree([]); setGhPath([]); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-primary)", textTransform: "uppercase", letterSpacing: "0.05em", padding: 0 }}
                              >
                                Repos
                              </button>
                              <span style={{ margin: "0 4px" }}>/</span>
                              {ghPath.length > 0 ? (
                                <>
                                  <button
                                    onClick={() => { setGhPath([]); navigateGhDir({ path: "", name: "" }); selectGhRepo(ghSelectedRepo); }}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-primary)", textTransform: "uppercase", letterSpacing: "0.05em", padding: 0 }}
                                  >
                                    {ghSelectedRepo.name}
                                  </button>
                                  <span style={{ margin: "0 4px" }}>/</span>
                                  {ghPath.join("/")}
                                </>
                              ) : ghSelectedRepo.name}
                            </>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => setGhBrowserOpen(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", display: "flex" }}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Content */}
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                      {ghLoading && (
                        <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                          Loading...
                        </div>
                      )}

                      {/* Repo search */}
                      {!ghLoading && !ghSelectedRepo && ghRepos.length > 0 && (
                        <div style={{ padding: "var(--space-2) var(--space-3)", borderBottom: "1px solid var(--color-border-light)" }}>
                          <input
                            type="text"
                            placeholder="Filter repos..."
                            value={ghRepoSearch}
                            onChange={(e) => setGhRepoSearch(e.target.value)}
                            autoFocus
                            style={{
                              width: "100%",
                              padding: "var(--space-1) var(--space-2)",
                              background: "var(--color-bg)",
                              border: "1px solid var(--color-border-light)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: "var(--font-size-xs)",
                              fontFamily: "var(--font-primary)",
                              color: "var(--color-text)",
                              outline: "none",
                            }}
                          />
                        </div>
                      )}

                      {/* Repo list */}
                      {!ghLoading && !ghSelectedRepo && ghRepos
                        .filter((r) => !ghRepoSearch || r.full_name.toLowerCase().includes(ghRepoSearch.toLowerCase()))
                        .map((repo) => (
                        <button
                          key={repo.full_name}
                          onClick={() => selectGhRepo(repo)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            width: "100%",
                            padding: "var(--space-2) var(--space-3)",
                            background: "transparent",
                            border: "none",
                            borderTop: "1px solid var(--color-border-light)",
                            cursor: "pointer",
                            fontFamily: "var(--font-primary)",
                            textAlign: "left",
                          }}
                        >
                          <Code size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {repo.full_name}
                          </span>
                          {repo.private && (
                            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", flexShrink: 0 }}>private</span>
                          )}
                          <ChevronRight size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                        </button>
                      ))}

                      {/* File tree */}
                      {!ghLoading && ghSelectedRepo && (
                        <>
                          {ghPath.length > 0 && (
                            <button
                              onClick={ghGoUp}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-2)",
                                width: "100%",
                                padding: "var(--space-2) var(--space-3)",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid var(--color-border-light)",
                                cursor: "pointer",
                                fontFamily: "var(--font-primary)",
                                textAlign: "left",
                              }}
                            >
                              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>..</span>
                            </button>
                          )}
                          {ghTree
                            .sort((a, b) => {
                              if (a.type === b.type) return a.name.localeCompare(b.name);
                              return a.type === "dir" ? -1 : 1;
                            })
                            .map((item) => (
                            <button
                              key={item.path}
                              onClick={() => item.type === "dir" ? navigateGhDir(item) : selectGhFile(item)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-2)",
                                width: "100%",
                                padding: "var(--space-2) var(--space-3)",
                                background: "transparent",
                                border: "none",
                                borderTop: "1px solid var(--color-border-light)",
                                cursor: "pointer",
                                fontFamily: "var(--font-primary)",
                                textAlign: "left",
                              }}
                            >
                              {item.type === "dir" ? (
                                <FolderOpen size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                              ) : (
                                <FileText size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                              )}
                              <span style={{ flex: 1, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.name}
                              </span>
                              {item.type === "file" && item.size > 0 && (
                                <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                                  {item.size >= 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}
                                </span>
                              )}
                              {item.type === "dir" && (
                                <ChevronRight size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                              )}
                            </button>
                          ))}
                        </>
                      )}

                      {!ghLoading && !ghSelectedRepo && ghRepos.length === 0 && (
                        <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                          No repos found.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    padding: "var(--space-1) var(--space-1) var(--space-1) var(--space-1)",
                  }}
                >
                  <button
                    onClick={() => chatFileRef.current?.click()}
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-secondary)",
                      borderRadius: "var(--radius-md)",
                    }}
                    title="Attach files"
                  >
                    <Paperclip size={15} strokeWidth={2} />
                  </button>
                  <Link
                    href="/hum"
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-text-secondary)",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                    }}
                    title="The Hum"
                  >
                    <Mic size={15} strokeWidth={2} />
                  </Link>
                  {githubConnected && (
                    <button
                      onClick={openGhBrowser}
                      style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: ghBrowserOpen ? "var(--color-bg-alt)" : "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                        borderRadius: "var(--radius-md)",
                      }}
                      title="Browse GitHub repos"
                    >
                      <GitHubIcon size={15} />
                    </button>
                  )}
                  <input
                    ref={chatFileRef}
                    type="file"
                    accept=".md,.txt,.js,.jsx,.ts,.tsx,.css,.json,.html,.py,.rb,.go,.rs,.sh,.yaml,.yml,.toml,.sql,.csv"
                    multiple
                    onChange={(e) => { if (e.target.files?.length) handleChatFiles(Array.from(e.target.files)); e.target.value = ""; }}
                    style={{ display: "none" }}
                  />
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
