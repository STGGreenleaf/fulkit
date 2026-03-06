"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, ArrowRight, MessageCircle } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setStreaming(true);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: err.error || "Something went wrong.",
          };
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
              break;
            }
            if (chunk) {
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
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Connection error. Try again.",
          };
          return copy;
        });
      }
    }

    setStreaming(false);
    abortRef.current = null;
  }, [input, streaming, messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setStreaming(false);
  };

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
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  marginLeft: "auto",
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
                <X size={12} strokeWidth={2} />
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
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
