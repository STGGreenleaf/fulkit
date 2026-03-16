"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, PenLine, ArrowUp, X } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

export default function QuickCapture() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("text"); // "text" | "voice"
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Don't render for unauthenticated, new, or dev users
  if (!user || user.isNew || !user.id) return null;

  const submit = async () => {
    const text = value.trim();
    if (!text || !user?.id) return;

    stopListening();
    supabase.from("notes").insert({
      user_id: user.id,
      title: text,
      content: "",
      status: "inbox",
      folder: "all",
    }).then(() => {}).catch(() => {});

    setValue("");
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setOpen(false);
    }, 1200);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join("");
      setValue(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const toggleOpen = () => {
    if (open) {
      stopListening();
      setValue("");
      setOpen(false);
    } else {
      setOpen(true);
    }
  };

  // Focus input when opening in text mode
  useEffect(() => {
    if (open && mode === "text" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, mode]);

  const fabSize = 44;

  // Collapsed FAB
  if (!open) {
    return (
      <button
        onClick={toggleOpen}
        style={{
          position: "fixed",
          bottom: "var(--space-6)",
          right: "var(--space-6)",
          width: fabSize,
          height: fabSize,
          borderRadius: "var(--radius-full)",
          background: "var(--color-accent)",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
          transition: "transform var(--duration-fast) var(--ease-default)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <PenLine size={18} strokeWidth={2} color="var(--color-text-inverse)" />
      </button>
    );
  }

  // Expanded capture panel
  return (
    <div
      style={{
        position: "fixed",
        bottom: "var(--space-6)",
        right: "var(--space-6)",
        width: 320,
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg, var(--radius-md))",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-2) var(--space-3)",
        borderBottom: "1px solid var(--color-border-light)",
      }}>
        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)" }}>
          {submitted ? "Saved" : "Quick Capture"}
        </span>
        <button
          onClick={toggleOpen}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)", display: "flex" }}
        >
          <X size={14} color="var(--color-text-dim)" />
        </button>
      </div>

      {submitted ? (
        <div style={{ padding: "var(--space-4)", textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Filed to your inbox.
          </p>
        </div>
      ) : (
        <div style={{ padding: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Capture a thought..."
              style={{
                flex: 1,
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-primary)",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            {typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) && (
              <button
                onClick={listening ? stopListening : startListening}
                style={{
                  width: 36, height: 36, borderRadius: "var(--radius-sm)",
                  background: listening ? "var(--color-error, #e53e3e)" : "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                {listening ? <MicOff size={14} color="white" /> : <Mic size={14} color="var(--color-text-muted)" />}
              </button>
            )}
            <button
              onClick={submit}
              disabled={!value.trim()}
              style={{
                width: 36, height: 36, borderRadius: "var(--radius-sm)",
                background: value.trim() ? "var(--color-accent)" : "var(--color-border-light)",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: value.trim() ? "pointer" : "default",
                flexShrink: 0,
              }}
            >
              <ArrowUp size={14} strokeWidth={2.5} color="var(--color-text-inverse)" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
