"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, ArrowRight, MessageCircle, Plus, Clock, FileText, Search, Paperclip, Mic, Pin, Download, Copy, Check, ThumbsUp, SquarePen, ChevronDown, ExternalLink, Maximize2, Square, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import VaultGate from "./VaultGate";
import { useAuth } from "../lib/auth";
import { useVaultContext } from "../lib/vault";
import { supabase } from "../lib/supabase";
import MessageRenderer from "./MessageRenderer";
import { useChat } from "../lib/use-chat";
import { useChatContext } from "../lib/use-chat-context";
import { useSandbox } from "../lib/sandbox";
import { SEAT_LIMITS, TIERS, CREDITS } from "../lib/ful-config";
import { useIsMobile } from "../lib/use-mobile";

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

function ThinkingIndicator({ phase, startedAt, onStop }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [startedAt]);

  const label = phase === "preparing" ? "Preparing" : phase === "connecting" ? "Connecting" : "Thinking";
  const showTime = elapsed >= 4;

  return (
    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-text-muted)",
              animation: `typingBounce 1.2s ${dot * 0.15}s infinite ease-in-out`,
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", userSelect: "none" }}>
        {label}{showTime ? ` · ${elapsed}s` : ""}
      </span>
      {onStop && (
        <button
          onClick={onStop}
          title="Stop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            padding: 0,
            background: "none",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Square size={8} fill="currentColor" strokeWidth={0} />
        </button>
      )}
    </span>
  );
}

export default function ChatContent({ isPopout = false }) {
  const { user, profile, accessToken, authFetch, githubConnected, compactMode, hasContext, fetchProfile, isOwner } = useAuth();

  // ─── Fül cap state ──────────────────────────────────────
  const seatLimit = SEAT_LIMITS[profile?.seat_type || "free"] || SEAT_LIMITS.free;
  const messagesUsed = profile?.messages_this_month || 0;
  const remaining = Math.max(0, seatLimit - messagesUsed);
  const isLow = !isOwner && remaining > 0 && remaining <= Math.ceil(seatLimit * 0.1);
  const isCapped = !isOwner && remaining <= 0;
  const { getContextWithMeta, recallNotes, isReady, storageMode, directoryHandle } = useVaultContext();
  const isMobile = useIsMobile();

  // Width-only narrow check — pointer:coarse not required (fixes DevTools + desktop-touch combos)
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsNarrow(mq.matches);
    const h = (e) => setIsNarrow(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // ─── Sandbox hook ────────────────────────────────────────
  const sandbox = useSandbox();

  // ─── Core chat hook ───────────────────────────────────────
  const chat = useChat({
    user, accessToken, authFetch, storageMode, directoryHandle, sandbox,
    onMessageSent: () => { if (user?.id) fetchProfile(user.id); },
  });

  // ─── Context hook ─────────────────────────────────────────
  const ctx = useChatContext({
    user, accessToken, authFetch, githubConnected,
    getContextWithMeta, recallNotes, isReady, sandbox,
  });

  // ─── UI-only state ────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [historyWidth, setHistoryWidth] = useState(260);
  const [topicFilter, setTopicFilter] = useState(null);
  const [chatDragOver, setChatDragOver] = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(null);
  const [showPins, setShowPins] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showChapters, setShowChapters] = useState(false);
  const [greeting, setGreeting] = useState(null);
  const [greetingLoading, setGreetingLoading] = useState(false);

  const chatFileRef = useRef(null);
  const copiedTimerRef = useRef(null);
  const draggingRef = useRef(false);
  const greetingFetchedRef = useRef(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // ─── Pinned messages ──────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    loadPinnedMessages();
  }, [user]);

  // ─── Proactive greeting ─────────────────────────────────

  useEffect(() => {
    if (!user || !accessToken || chat.messages.length > 0 || chat.conversationId || greetingFetchedRef.current) return;
    greetingFetchedRef.current = true;
    setGreetingLoading(true);

    authFetch("/api/chat/greeting")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.greeting) setGreeting(data.greeting); })
      .catch(() => {})
      .finally(() => setGreetingLoading(false));
  }, [user, accessToken, chat.messages.length, chat.conversationId]);

  async function loadPinnedMessages() {
    try {
      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, pinned_at, conversation_id, conversations(title)")
        .eq("is_pinned", true)
        .order("pinned_at", { ascending: false })
        .limit(50)
        .abortSignal(AbortSignal.timeout(5000));
      if (data) setPinnedMessages(data);
    } catch (err) {
      console.error("[loadPinnedMessages] failed:", err.message);
      setPinnedMessages([]);
    }
  }

  async function togglePin(msg) {
    const newPinned = !msg.is_pinned;
    // Optimistic update
    chat.setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, is_pinned: newPinned } : m))
    );
    try {
      await supabase
        .from("messages")
        .update({
          is_pinned: newPinned,
          pinned_at: newPinned ? new Date().toISOString() : null,
        })
        .eq("id", msg.id);
      loadPinnedMessages();
    } catch {
      // Rollback on failure
      chat.setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, is_pinned: !newPinned } : m))
      );
    }
  }

  function exportMessage(msg) {
    if (!chat.messages || chat.messages.length === 0) return;
    const idx = chat.messages.indexOf(msg);
    if (idx < 0) return;
    let prompt = null;
    for (let j = idx - 1; j >= 0; j--) {
      if (chat.messages[j].role === "user") {
        prompt = chat.messages[j].content;
        break;
      }
    }
    const convTitle = chat.conversations.find((c) => c.id === chat.conversationId)?.title || "Chat";
    const exported = {
      source: "fulkit",
      conversation: convTitle,
      exported_at: new Date().toISOString(),
      prompt: prompt || null,
      response: msg.content,
    };
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulkit-${convTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Auto-scroll ──────────────────────────────────────────

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat.messages]);

  // ─── Cleanup timers on unmount ──────────────────────────────

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // ─── Textarea auto-resize ─────────────────────────────────

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [chat.input]);

  // ─── Send wrapper ─────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = chat.input.trim();
    console.log("[handleSend] fired", { text: text?.slice(0, 30), streaming: chat.streaming, ts: Date.now() });
    if (!text || chat.streaming) {
      if (chat.streaming) console.warn("[handleSend] blocked — already streaming");
      return;
    }

    // Handle /recall command locally
    const recallMatch = text.match(/^\/recall\s+(.+)/i);
    if (recallMatch) {
      chat.setInput("");
      ctx.handleRecall(recallMatch[1].trim());
      return;
    }

    // Pass greeting to sendMessage if this is the first message
    const greetingToInject = (greeting && chat.messages.length === 0) ? greeting : undefined;
    if (greetingToInject) setGreeting(null);

    await chat.sendMessage(ctx.assembleContext, undefined, greetingToInject);
  }, [chat.input, chat.streaming, chat.sendMessage, ctx.assembleContext, ctx.handleRecall, greeting, chat.messages.length]);

  // Cmd+K to focus chat input
  useEffect(() => {
    const onGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  const handleRetry = useCallback((userText) => {
    chat.sendMessage(ctx.assembleContext, userText);
  }, [chat.sendMessage, ctx.assembleContext]);

  const handleKeyDown = (e) => {
    // Enter or Cmd+Enter to send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.repeat) return;
      handleSend();
    }
    // Escape to clear input or close panels
    if (e.key === "Escape") {
      if (chat.input) {
        chat.setInput("");
      }
    }
  };

  const handleStartNewChat = () => {
    chat.startNewChat();
    ctx.resetContext();
    setGreeting(null);
    greetingFetchedRef.current = false;
  };

  // ─── Drag-to-resize history panel ─────────────────────────

  const startResize = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = historyWidth;

    const onMouseMove = (e) => {
      if (!draggingRef.current) return;
      const delta = startX - e.clientX;
      const newWidth = Math.max(160, Math.min(maxHistoryWidth, startWidth + delta));
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

  const effectiveCompact = isPopout || compactMode || isMobile;
  const maxHistoryWidth = isPopout ? 200 : 400;

  // Shared toolbar button style — proper hit targets on all devices
  const touch = isMobile || isNarrow;
  const toolbarBtn = (active) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-1)",
    fontSize: "var(--font-size-xs)",
    color: active ? "var(--color-text)" : "var(--color-text-muted)",
    background: active ? "var(--color-bg-alt)" : "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-primary)",
    padding: touch ? "var(--space-2) var(--space-3)" : "var(--space-2) var(--space-2-5)",
    minHeight: touch ? 44 : 32,
    minWidth: touch ? 44 : 32,
    borderRadius: "var(--radius-sm)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  });

  // ─── Render ───────────────────────────────────────────────

  return (
    <>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              padding: isMobile ? "var(--space-2-5) var(--space-3)" : "var(--space-2-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <span style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
            }}>
              {isPopout ? "Chappie" : "Fülkit"}
            </span>
            {!isPopout && !effectiveCompact && (
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/</span>
            )}
            {!isPopout && !effectiveCompact && (
              <span style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-semibold)",
              }}>
                Chat
              </span>
            )}

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? "var(--space-3)" : "var(--space-2)" }}>
              {/* Sandbox toggle + chapter indicator */}
              {(
                <>
                  {sandbox.sandboxActive ? (
                    <>
                      <span style={{
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-dim)",
                        fontFamily: "var(--font-mono)",
                        padding: "var(--space-1) var(--space-2)",
                        background: "var(--color-bg-alt)",
                        borderRadius: "var(--radius-sm)",
                        letterSpacing: "0.02em",
                      }}>
                        Ch {sandbox.chapters.length + 1} &middot; {sandbox.currentChapter?.turnCount || 0}/20
                      </span>
                      {sandbox.chapters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChapters(prev => !prev)}
                          style={toolbarBtn(showChapters)}
                        >
                          <ChevronDown size={isMobile ? 18 : 12} strokeWidth={2} style={{ transform: showChapters ? "rotate(180deg)" : "none" }} />
                          {!effectiveCompact && "Chapters"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => sandbox.dumpSandbox()}
                        style={toolbarBtn(false)}
                      >
                        <X size={isMobile ? 18 : 12} strokeWidth={2} />
                        {!effectiveCompact && "End & Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={sandbox.startSandbox}
                      style={toolbarBtn(false)}
                    >
                      <SquarePen size={isMobile ? 18 : 12} strokeWidth={2} />
                      {!effectiveCompact && "Sandbox"}
                    </button>
                  )}
                </>
              )}

              {/* Context indicator */}
              {ctx.contextMeta && ctx.contextMeta.includedCount > 0 && !compactMode && (
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
                  {ctx.contextMeta.includedCount} note{ctx.contextMeta.includedCount !== 1 ? "s" : ""} &middot; {ctx.contextMeta.totalTokens >= 1000 ? `${(ctx.contextMeta.totalTokens / 1000).toFixed(1)}K` : ctx.contextMeta.totalTokens} tokens
                </span>
              )}
              {ctx.contextDropped && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-warning, #b7791f)",
                    padding: "var(--space-1) var(--space-2)",
                  }}
                >
                  <AlertTriangle size={11} strokeWidth={1.8} />
                  Context unavailable — response may lack vault knowledge
                </span>
              )}
              {ctx.recalledNotes.length > 0 && !compactMode && (
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
                  {`${ctx.recalledNotes.length} recalled`}
                </span>
              )}

              {/* Pins toggle */}
              {(
                <button
                  type="button"
                  onClick={() => setShowPins(prev => !prev)}
                  style={toolbarBtn(showPins)}
                >
                  <Pin size={isMobile ? 18 : 12} strokeWidth={2} />
                  {!effectiveCompact && "Pins"}
                </button>
              )}

              {/* History toggle */}
              {chat.conversations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(prev => !prev)}
                  style={toolbarBtn(showHistory)}
                >
                  <Clock size={isMobile ? 18 : 12} strokeWidth={2} />
                  {!effectiveCompact && "History"}
                </button>
              )}

              {/* New chat */}
              {(chat.messages.length > 0 || chat.conversationId) && (
                <button
                  type="button"
                  onClick={handleStartNewChat}
                  style={toolbarBtn(false)}
                >
                  <Plus size={isMobile ? 18 : 12} strokeWidth={2} />
                  {!effectiveCompact && "New"}
                </button>
              )}

              {/* Popout window controls */}
              {isPopout && (
                <>
                  <button
                    onClick={() => window.open("/chat", "_blank")}
                    title="Expand"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <Maximize2 size={12} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => window.close()}
                    title="Close window"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </>
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
              onDrop={(e) => { e.preventDefault(); setChatDragOver(false); if (e.dataTransfer.files?.length) ctx.handleChatFiles(Array.from(e.dataTransfer.files)); }}
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
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "var(--space-5) var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                }}
              >
                {chat.messages.length === 0 && (
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

                    {/* Proactive greeting or static fallback */}
                    {greetingLoading ? (
                      <div style={{
                        maxWidth: 640,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}>
                        <div style={{
                          padding: "var(--space-2-5) var(--space-3-5)",
                          background: "var(--color-bg-alt)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
                        }}>
                          <ThinkingIndicator phase="connecting" startedAt={Date.now()} />
                        </div>
                      </div>
                    ) : greeting ? (
                      <div style={{
                        maxWidth: 640,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}>
                        <div style={{
                          maxWidth: "100%",
                          padding: "var(--space-2-5) var(--space-3-5)",
                          fontSize: "var(--font-size-base)",
                          lineHeight: "var(--line-height-relaxed)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          background: "var(--color-bg-alt)",
                          color: "var(--color-text)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
                        }}>
                          <MessageRenderer content={greeting} />
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}

                    {/* Context nudge */}
                    {!hasContext && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
                        maxWidth: 420,
                      }}>
                        <Sparkles size={14} strokeWidth={2} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
                          I'll work better once I know you.{" "}
                          <Link href="/onboarding" style={{ color: "var(--color-text)", textDecoration: "underline" }}>Take the quiz</Link>
                          {" "}or{" "}
                          <Link href="/settings" style={{ color: "var(--color-text)", textDecoration: "underline" }}>upload files</Link>.
                        </span>
                      </div>
                    )}

                    {/* Proactive alerts */}
                    {ctx.alerts.length > 0 && ctx.alertsDismissed !== ctx.alerts.map((a) => a.message).join("|") && (
                      <div
                        style={{
                          maxWidth: 640,
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
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
                            background: "var(--color-bg-alt)",
                            color: "var(--color-text)",
                            border: "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
                          }}
                        >
                          {`Hey — ${ctx.alerts.length} thing${ctx.alerts.length > 1 ? "s" : ""} flagged:\n\n${ctx.alerts.map((a) => `• ${a.message}`).join("\n")}`}
                        </div>
                        <div style={{ display: "flex", gap: "var(--space-1)", alignSelf: "flex-end", marginTop: 2 }}>
                          <button
                            onClick={ctx.dismissAlerts}
                            title="Got it"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 4,
                              color: "var(--color-text-dim)",
                              display: "flex",
                            }}
                          >
                            <ThumbsUp size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {chat.messages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    onMouseEnter={() => setHoveredMsg(i)}
                    onMouseLeave={() => setHoveredMsg(null)}
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
                        whiteSpace: msg.role === "user" ? "pre-wrap" : "normal",
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
                      {msg._capped ? (
                        <div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                            {msg.content}
                          </div>
                          <Link href="/settings?tab=ai" style={{ display: "block", width: "100%", textAlign: "center", padding: "var(--space-2) 0", background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", textDecoration: "none" }}>
                            Add your key to keep going
                          </Link>
                        </div>
                      ) : chat.streaming && i === chat.messages.length - 1 && msg.role === "assistant" && !msg.content ? (
                        <ThinkingIndicator
                          phase={chat.streamPhase}
                          startedAt={chat.streamStartedAt}
                          onStop={chat.stopStreaming}
                        />
                      ) : (
                        msg.role === "assistant" && typeof msg.content === "string"
                          ? <MessageRenderer content={msg.content.trim()} isStreaming={chat.streaming && i === chat.messages.length - 1} />
                          : (typeof msg.content === "string" ? msg.content.trim() : Array.isArray(msg.content) ? msg.content.filter((b) => b.type === "text").map((b) => b.text).join("") : "")
                      )}
                    </div>
                    {/* Retry button for failed responses */}
                    {msg._failed && !chat.streaming && (
                      <button
                        onClick={() => handleRetry(msg._failedUserText)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-1)",
                          alignSelf: "flex-start",
                          marginTop: "var(--space-1)",
                          padding: "var(--space-1) var(--space-3)",
                          background: "none",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-xs)",
                          cursor: "pointer",
                          transition: "border-color var(--duration-fast) var(--ease-default)",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--color-text-secondary)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--color-border)"}
                      >
                        <RefreshCw size={12} strokeWidth={2} />
                        Try again
                      </button>
                    )}
                    {/* Pin + Copy + Export actions */}
                    {msg.role === "assistant" && (hoveredMsg === i || msg.is_pinned) && !chat.streaming && (
                      <div
                        style={{
                          display: "flex",
                          gap: "var(--space-1)",
                          alignSelf: "flex-end",
                          marginTop: 2,
                        }}
                      >
                        <button
                          onClick={() => togglePin(msg)}
                          title={msg.is_pinned ? "Unpin" : "Pin"}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 4,
                            color: msg.is_pinned ? "var(--color-text)" : "var(--color-text-dim)",
                            display: "flex",
                            opacity: hoveredMsg === i ? 1 : 0.5,
                          }}
                        >
                          <Pin size={13} strokeWidth={2} />
                        </button>
                        {hoveredMsg === i && (
                          <>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                setCopiedMsg(i);
                                clearTimeout(copiedTimerRef.current);
                                copiedTimerRef.current = setTimeout(() => setCopiedMsg(null), 1500);
                              }}
                              title="Copy"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 4,
                                color: copiedMsg === i ? "var(--color-text)" : "var(--color-text-dim)",
                                display: "flex",
                              }}
                            >
                              {copiedMsg === i ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={2} />}
                            </button>
                            <button
                              onClick={() => exportMessage(msg)}
                              title="Export"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 4,
                                color: "var(--color-text-dim)",
                                display: "flex",
                              }}
                            >
                              <Download size={13} strokeWidth={2} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Recall results */}
              {ctx.recallResults && (
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
                        Recall: &ldquo;{ctx.recallResults.query}&rdquo; — {ctx.recallResults.results.length} match{ctx.recallResults.results.length !== 1 ? "es" : ""}
                      </span>
                      <button
                        onClick={() => ctx.setRecallResults(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", display: "flex" }}
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                    {ctx.recallResults.results.length === 0 && (
                      <p style={{ padding: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", textAlign: "center" }}>
                        No notes found.
                      </p>
                    )}
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {ctx.recallResults.results.map((note) => {
                        const isAdded = ctx.recalledNotes.some((rn) => rn.id === note.id);
                        return (
                          <button
                            key={note.id}
                            onClick={() => {
                              if (isAdded) {
                                ctx.setRecalledNotes((prev) => prev.filter((rn) => rn.id !== note.id));
                              } else {
                                ctx.setRecalledNotes((prev) => [...prev, note]);
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
              {ctx.recalledNotes.length > 0 && !ctx.recallResults && (
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
                  {ctx.recalledNotes.map((rn) => (
                    <button
                      key={rn.id}
                      onClick={() => ctx.setRecalledNotes((prev) => prev.filter((n) => n.id !== rn.id))}
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
              {ctx.attachedFiles.length > 0 && (
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
                  {ctx.attachedFiles.map((af, i) => (
                    <button
                      key={i}
                      onClick={() => ctx.setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
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
                      <Paperclip size={9} strokeWidth={1.8} />
                      {af.name}
                      <X size={9} strokeWidth={2} />
                    </button>
                  ))}
                </div>
              )}

              {/* File error */}
              {ctx.fileError && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6) var(--space-1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-error, #c44)",
                      fontFamily: "var(--font-primary)",
                    }}
                  >
                    {ctx.fileError}
                  </span>
                </div>
              )}

              {/* Numbrly error */}
              {ctx.nblError && (
                <div
                  style={{
                    maxWidth: 640,
                    width: "100%",
                    margin: "0 auto",
                    padding: "0 var(--space-6)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    Numbrly context unavailable
                  </span>
                </div>
              )}

              {/* Low-fuel warning */}
              {isLow && !isCapped && (
                <div style={{ maxWidth: 640, width: "100%", margin: "0 auto", padding: "0 var(--space-6) var(--space-1)" }}>
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-warning)", fontFamily: "var(--font-primary)" }}>
                    heads up — {remaining} message{remaining !== 1 ? "s" : ""} left this month
                  </span>
                </div>
              )}

              {/* Input — or capped state */}
              {isCapped ? (
                <div style={{ padding: "var(--space-3) var(--space-6) var(--space-5)", maxWidth: 640, width: "100%", margin: "0 auto" }}>
                  <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", textAlign: "center" }}>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-1)" }}>
                      You burned through your Fül this month.
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                      Grab more messages or drop in your own API key.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      <Link href="/settings?tab=billing" style={{ display: "block", width: "100%", textAlign: "center", padding: "var(--space-2-5) 0", background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", textDecoration: "none" }}>
                        {profile?.seat_type === "free" ? `Upgrade — from ${TIERS.standard.priceLabel}` : `Grab ${CREDITS.amount} messages — ${CREDITS.priceLabel}`}
                      </Link>
                      <Link href="/settings?tab=ai" style={{ display: "block", width: "100%", textAlign: "center", padding: "var(--space-2-5) 0", background: "transparent", color: "var(--color-text-muted)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", textDecoration: "none", border: "1px solid var(--color-border-light)" }}>
                        Or bring your own key — unlimited
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
              <div
                style={{
                  padding: isMobile ? "var(--space-2) var(--space-2)" : "var(--space-3) var(--space-6) var(--space-5)",
                  maxWidth: isMobile ? "none" : 640,
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: isMobile ? "var(--space-2)" : "var(--space-1-5)",
                    border: "1px solid var(--color-border)",
                    borderRadius: isMobile ? "var(--radius-full)" : "var(--radius-lg)",
                    padding: isMobile ? "var(--space-1-5) var(--space-2)" : "var(--space-1)",
                  }}
                >
                  <button
                    onClick={() => chatFileRef.current?.click()}
                    style={{
                      width: isMobile ? 36 : 32,
                      height: isMobile ? 36 : 32,
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
                    <Paperclip size={isMobile ? 18 : 15} strokeWidth={2} />
                  </button>
                  <Link
                    href="/hum"
                    style={{
                      width: isMobile ? 36 : 32,
                      height: isMobile ? 36 : 32,
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
                    <Mic size={isMobile ? 18 : 15} strokeWidth={2} />
                  </Link>
                  <input
                    ref={chatFileRef}
                    type="file"
                    accept=".md,.txt,.js,.jsx,.ts,.tsx,.css,.json,.html,.py,.rb,.go,.rs,.sh,.yaml,.yml,.toml,.sql,.csv,.png,.jpg,.jpeg,.gif,.webp"
                    multiple
                    onChange={(e) => { if (e.target.files?.length) ctx.handleChatFiles(Array.from(e.target.files)); e.target.value = ""; }}
                    style={{ display: "none" }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={chat.input}
                    onChange={(e) => chat.setInput(e.target.value)}
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
                    onClick={handleSend}
                    disabled={!chat.input.trim() || chat.streaming}
                    style={{
                      width: isMobile ? 36 : 32,
                      height: isMobile ? 36 : 32,
                      borderRadius: isMobile ? "var(--radius-full)" : "var(--radius-md)",
                      flexShrink: 0,
                      background: chat.input.trim()
                        ? "var(--color-accent)"
                        : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: chat.input.trim() ? "pointer" : "default",
                      border: chat.input.trim()
                        ? "none"
                        : "1px solid var(--color-border)",
                      transition: "background var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    <ArrowRight size={isMobile ? 16 : 14} strokeWidth={2.5} color={chat.input.trim() ? "var(--color-text-inverse)" : "var(--color-text-secondary)"} />
                  </button>
                  {!isPopout && !isMobile && (
                    <button
                      onClick={() => {
                        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
                        const qs = params?.get("auth") ? `?auth=${params.get("auth")}` : "";
                        window.open(`/chat/popout${qs}`, "fulkit-popout", "width=400,height=600,resizable=yes,scrollbars=yes");
                      }}
                      title="Pop out chat"
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
                    >
                      <ExternalLink size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
              )}

              {/* Mobile pins takeover — inside messages column (position:relative parent) */}
              {showPins && isNarrow && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    background: "var(--color-bg)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-2-5) var(--space-3)",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
                      Pinned
                    </span>
                    <button type="button" onClick={() => setShowPins(false)} style={toolbarBtn(false)}>
                      <X size={18} strokeWidth={2} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {pinnedMessages.length === 0 ? (
                      <p style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-text-dim)",
                        textAlign: "center",
                        padding: "var(--space-8) var(--space-4)",
                      }}>
                        No pinned responses yet
                      </p>
                    ) : (
                      pinnedMessages.map((pin) => (
                        <button
                          key={pin.id}
                          onClick={() => {
                            chat.openConversation({ id: pin.conversation_id });
                            setShowPins(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2-5)",
                            padding: "var(--space-3)",
                            marginLeft: "var(--space-3)",
                            height: 80,
                            background: "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            width: "auto",
                            fontFamily: "var(--font-primary)",
                            border: "none",
                            borderBottom: "1px solid var(--color-border-light)",
                            overflow: "hidden",
                          }}
                        >
                          <div style={{
                            width: 3,
                            height: 48,
                            flexShrink: 0,
                            background: "var(--color-border)",
                            borderRadius: 1.5,
                          }} />
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, overflow: "hidden" }}>
                            <span style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--color-text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {(Array.isArray(pin.conversations) ? pin.conversations[0]?.title : pin.conversations?.title) || "Chat"}
                            </span>
                            <span
                              style={{
                                fontSize: "var(--font-size-sm)",
                                color: "var(--color-text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "var(--line-height-snug)",
                              }}
                            >
                              {pin.content}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Mobile history takeover — inside messages column (position:relative parent) */}
              {showHistory && isNarrow && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    background: "var(--color-bg)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-2-5) var(--space-3)",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
                      History
                    </span>
                    <button type="button" onClick={() => setShowHistory(false)} style={toolbarBtn(false)}>
                      <X size={18} strokeWidth={2} />
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-2) var(--space-3)" }}>
                    {/* Topic chips */}
                    {(() => {
                      const allTopics = {};
                      chat.conversations.forEach((c) => {
                        (c.topics || []).forEach((t) => { allTopics[t] = (allTopics[t] || 0) + 1; });
                      });
                      const sorted = Object.entries(allTopics).sort((a, b) => b[1] - a[1]).slice(0, 10);
                      if (sorted.length === 0) return null;
                      return (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: "var(--space-2)", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--color-border-light)" }}>
                          {topicFilter && (
                            <button
                              onClick={() => setTopicFilter(null)}
                              style={{
                                fontSize: "var(--font-size-2xs)", padding: "2px 6px", borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--color-border)", background: "transparent",
                                color: "var(--color-text-muted)", cursor: "pointer", fontFamily: "var(--font-primary)",
                              }}
                            >All</button>
                          )}
                          {sorted.map(([topic]) => (
                            <button
                              key={topic}
                              onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                              style={{
                                fontSize: "var(--font-size-2xs)", padding: "2px 6px", borderRadius: "var(--radius-sm)",
                                border: `1px solid ${topicFilter === topic ? "var(--color-text-muted)" : "var(--color-border-light)"}`,
                                background: topicFilter === topic ? "var(--color-bg-alt)" : "transparent",
                                color: topicFilter === topic ? "var(--color-text)" : "var(--color-text-dim)",
                                cursor: "pointer", fontFamily: "var(--font-primary)",
                                fontWeight: topicFilter === topic ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                              }}
                            >{topic}</button>
                          ))}
                        </div>
                      );
                    })()}
                    {/* Conversation list */}
                    {chat.conversations
                      .filter((conv) => !topicFilter || (conv.topics || []).includes(topicFilter))
                      .map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => { chat.openConversation(conv); setShowHistory(false); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "var(--space-2)",
                            padding: "var(--space-2-5) var(--space-2)",
                            borderRadius: "var(--radius-sm)",
                            border: "none",
                            borderBottom: "1px solid var(--color-border-light)",
                            background: conv.id === chat.conversationId ? "var(--color-bg-alt)" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            width: "100%",
                            fontFamily: "var(--font-primary)",
                          }}
                        >
                          <span style={{
                            fontSize: "var(--font-size-sm)",
                            color: conv.id === chat.conversationId ? "var(--color-text)" : "var(--color-text-secondary)",
                            fontWeight: conv.id === chat.conversationId ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                          }}>
                            {conv.title}
                          </span>
                          <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                            {timeAgo(conv.updated_at)}
                          </span>
                        </button>
                      ))}
                    {topicFilter && chat.conversations.filter((c) => (c.topics || []).includes(topicFilter)).length === 0 && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2)", textAlign: "center" }}>
                        No conversations with this topic.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pins panel — desktop sidebar */}
            {showPins && !isNarrow && (
                <>
                  <div style={{ width: 1, background: "var(--color-border-light)", flexShrink: 0 }} />
                  <div
                    style={{
                      width: 260,
                      overflowY: "auto",
                      padding: "var(--space-3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    {pinnedMessages.length === 0 && (
                      <p
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-dim)",
                          textAlign: "center",
                          padding: "var(--space-4) 0",
                        }}
                      >
                        No pinned responses yet
                      </p>
                    )}
                    {pinnedMessages.map((pin) => (
                      <button
                        key={pin.id}
                        onClick={() => {
                          chat.openConversation({ id: pin.conversation_id });
                          setShowPins(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-2) var(--space-2-5)",
                          height: 64,
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--color-border-light)",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          fontFamily: "var(--font-primary)",
                          overflow: "hidden",
                        }}
                      >
                        <div style={{
                          width: 3,
                          height: 36,
                          flexShrink: 0,
                          background: "var(--color-border)",
                          borderRadius: 1.5,
                        }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, overflow: "hidden" }}>
                          <span
                            style={{
                              fontSize: "var(--font-size-xs)",
                              color: "var(--color-text)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {pin.content}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--font-size-2xs)",
                              color: "var(--color-text-dim)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {(Array.isArray(pin.conversations) ? pin.conversations[0]?.title : pin.conversations?.title) || "Chat"} &middot; {timeAgo(pin.pinned_at)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
            )}

            {/* Chapter browser panel */}
            {showChapters && sandbox.sandboxActive && sandbox.chapters.length > 0 && (
              <>
                <div style={{ width: 1, background: "var(--color-border-light)", flexShrink: 0 }} />
                <div
                  style={{
                    width: 260,
                    overflowY: "auto",
                    padding: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <span style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "var(--space-1) 0",
                  }}>
                    Chapters ({sandbox.chapters.length})
                  </span>
                  {sandbox.chapters.map((ch, i) => (
                    <div
                      key={ch.id}
                      style={{
                        padding: "var(--space-2) var(--space-2-5)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border-light)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text)",
                      }}>
                        Chapter {i + 1}
                      </span>
                      <span style={{
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-dim)",
                      }}>
                        {ch.turnCount} turns &middot; {(ch.extractedNotes?.length || 0)} notes
                      </span>
                      {ch.userIntents?.length > 0 && (
                        <span style={{
                          fontSize: "var(--font-size-2xs)",
                          color: "var(--color-text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}>
                          {ch.userIntents[0]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* History + Recall Rail — desktop only */}
            {showHistory && !isNarrow && (
              <>
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
                  {/* Recall rail — topic chips */}
                  {(() => {
                    const allTopics = {};
                    chat.conversations.forEach((c) => {
                      (c.topics || []).forEach((t) => {
                        allTopics[t] = (allTopics[t] || 0) + 1;
                      });
                    });
                    const sorted = Object.entries(allTopics)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10);
                    if (sorted.length === 0) return null;
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: "var(--space-2)", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--color-border-light)" }}>
                        {topicFilter && (
                          <button
                            onClick={() => setTopicFilter(null)}
                            style={{
                              fontSize: "var(--font-size-2xs)",
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--color-border)",
                              background: "transparent",
                              color: "var(--color-text-muted)",
                              cursor: "pointer",
                              fontFamily: "var(--font-primary)",
                            }}
                          >
                            All
                          </button>
                        )}
                        {sorted.map(([topic, count]) => (
                          <button
                            key={topic}
                            onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                            style={{
                              fontSize: "var(--font-size-2xs)",
                              padding: "2px 6px",
                              borderRadius: "var(--radius-sm)",
                              border: `1px solid ${topicFilter === topic ? "var(--color-text-muted)" : "var(--color-border-light)"}`,
                              background: topicFilter === topic ? "var(--color-bg-alt)" : "transparent",
                              color: topicFilter === topic ? "var(--color-text)" : "var(--color-text-dim)",
                              cursor: "pointer",
                              fontFamily: "var(--font-primary)",
                              fontWeight: topicFilter === topic ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                            }}
                          >
                            {topic}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Conversation list (filtered by topic if selected) */}
                  {chat.conversations
                    .filter((conv) => !topicFilter || (conv.topics || []).includes(topicFilter))
                    .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => chat.openConversation(conv)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-2-5)",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background: conv.id === chat.conversationId ? "var(--color-bg-alt)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        fontFamily: "var(--font-primary)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: conv.id === chat.conversationId ? "var(--color-text)" : "var(--color-text-secondary)",
                          fontWeight: conv.id === chat.conversationId ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
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
                  {topicFilter && chat.conversations.filter((c) => (c.topics || []).includes(topicFilter)).length === 0 && (
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2)", textAlign: "center" }}>
                      No conversations with this topic.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sandbox chapter toast */}
        {sandbox.chapterToast && (
          <div style={{
            position: "fixed",
            bottom: "var(--space-5)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "var(--space-2) var(--space-4)",
            background: "var(--color-accent)",
            color: "var(--color-text-inverse)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-primary)",
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}>
            {sandbox.chapterToast}
          </div>
        )}

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-4px); }
          }
        `}</style>
    </>
  );
}
