"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, X, ArrowRight, MessageCircle } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Try again." },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
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

        {/* Main chat area */}
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
              AI Chat
            </span>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                padding: "var(--space-0-5) var(--space-2)",
                borderRadius: "var(--radius-xs)",
                background: "var(--color-bg-alt)",
              }}
            >
              Brain-first mode
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
            {messages.length === 0 && !loading && (
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
                  Ask anything about your notes.
                  <br />
                  Your bestie reads across all your sources.
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
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "var(--space-2-5) var(--space-3-5)",
                    fontSize: "var(--font-size-base)",
                    lineHeight:
                      msg.role === "user"
                        ? "var(--line-height-normal)"
                        : "var(--line-height-loose)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    ...(msg.role === "user"
                      ? {
                          background: "var(--color-accent)",
                          color: "var(--color-text-inverse)",
                          borderRadius: `var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)`,
                        }
                      : {
                          background: "var(--color-bg-alt)",
                          color: "var(--color-text)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: `var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)`,
                        }),
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-1)",
                  padding: "var(--space-2-5) var(--space-3-5)",
                  background: "var(--color-bg-alt)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: `var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)`,
                  alignSelf: "flex-start",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "var(--radius-full)",
                      background: "var(--color-text-muted)",
                      animation: `pulse 1s ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

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
                placeholder="Ask your brain..."
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
                disabled={!input.trim() || loading}
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
                  transition: `background var(--duration-fast) var(--ease-default)`,
                }}
              >
                <ArrowRight size={14} strokeWidth={2.5} color="var(--color-text-inverse)" />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </AuthGuard>
  );
}
