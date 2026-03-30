"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import LogoMark from "../../components/LogoMark";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";

const CONFIGS = {
  idle: {
    intensity: 0.15,
    speed: 0.005,
    baseRadius: 0.22,
    color: [180, 180, 175],
    pulseSpeed: 0.008,
    noiseScale: 1.2,
  },
  listening: {
    intensity: 0.7,
    speed: 0.02,
    baseRadius: 0.28,
    color: [240, 240, 235],
    pulseSpeed: 0.03,
    noiseScale: 3.5,
  },
  thinking: {
    intensity: 0.4,
    speed: 0.008,
    baseRadius: 0.25,
    color: [200, 200, 195],
    pulseSpeed: 0.015,
    noiseScale: 2.0,
  },
  speaking: {
    intensity: 0.55,
    speed: 0.015,
    baseRadius: 0.27,
    color: [250, 250, 245],
    pulseSpeed: 0.025,
    noiseScale: 3.0,
  },
};

const MODE_LABELS = {
  idle: "Tap to talk",
  listening: "Listening...",
  thinking: "Thinking...",
  speaking: "Speaking...",
};

function noise(x, y, z) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

function smoothNoise(x, y, z) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const fx = x - ix,
    fy = y - iy,
    fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);

  const n000 = noise(ix, iy, iz);
  const n100 = noise(ix + 1, iy, iz);
  const n010 = noise(ix, iy + 1, iz);
  const n110 = noise(ix + 1, iy + 1, iz);
  const n001 = noise(ix, iy, iz + 1);
  const n101 = noise(ix + 1, iy, iz + 1);
  const n011 = noise(ix, iy + 1, iz + 1);
  const n111 = noise(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + sx * (n100 - n000);
  const nx10 = n010 + sx * (n110 - n010);
  const nx01 = n001 + sx * (n101 - n001);
  const nx11 = n011 + sx * (n111 - n011);
  const nxy0 = nx00 + sy * (nx10 - nx00);
  const nxy1 = nx01 + sy * (nx11 - nx01);
  return nxy0 + sz * (nxy1 - nxy0);
}

export default function Hum() {
  const { authFetch } = useAuth();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "hum" }); }, []);
  useOnboardingTrigger("hum");

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [mode, setMode] = useState("idle");
  const [showHint, setShowHint] = useState(true);
  const noiseOffsetRef = useRef(0);
  const transitionRef = useRef({ intensity: 0, target: 0 });

  // Voice state
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const messagesRef = useRef([]);
  const abortRef = useRef(null);
  const transcriptRef = useRef("");

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  const getConfig = useCallback(() => CONFIGS[mode], [mode]);

  // ─── Orb canvas animation (unchanged) ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    const size = 500;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    const draw = () => {
      const config = getConfig();
      const t = transitionRef.current;
      t.target = config.intensity;
      t.intensity += (t.target - t.intensity) * 0.03;

      noiseOffsetRef.current += config.speed;
      const time = noiseOffsetRef.current;
      const intensity = t.intensity;

      ctx.clearRect(0, 0, size, size);

      const glowSize = size * (config.baseRadius + 0.15 + intensity * 0.1);
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
      const alpha = 0.03 + intensity * 0.04;
      glowGrad.addColorStop(0, `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${alpha})`);
      glowGrad.addColorStop(0.5, `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${alpha * 0.3})`);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowSize, 0, Math.PI * 2);
      ctx.fill();

      const particleCount = 40 + Math.floor(intensity * 60);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + time * 0.3;
        const dist = size * (config.baseRadius + 0.05 + smoothNoise(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, time * 0.5) * 0.08 * intensity + Math.sin(time * 2 + i * 0.7) * 0.02 * intensity);
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;
        const pSize = 1 + intensity * 1.5 + Math.sin(time * 3 + i) * 0.5;
        const pAlpha = 0.1 + intensity * 0.2 + Math.sin(time * 2 + i * 0.5) * 0.05;
        ctx.fillStyle = `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      const layers = 3;
      for (let l = layers - 1; l >= 0; l--) {
        const layerOffset = l * 0.02;
        const layerAlpha = l === 0 ? 0.9 : l === 1 ? 0.3 : 0.15;
        const points = 180;
        const baseR = size * (config.baseRadius - layerOffset);

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const nx = Math.cos(angle) * config.noiseScale;
          const ny = Math.sin(angle) * config.noiseScale;
          const n1 = smoothNoise(nx, ny, time + l * 10) * intensity;
          const n2 = smoothNoise(nx * 2.5, ny * 2.5, time * 1.5 + l * 5) * intensity * 0.3;
          const pulse = Math.sin(time * config.pulseSpeed * 60 + angle * 2) * 0.015 * intensity;
          const r = baseR + (n1 + n2 + pulse) * size * 0.12;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (l === 0) {
          const orbGrad = ctx.createRadialGradient(cx - baseR * 0.2, cy - baseR * 0.2, 0, cx, cy, baseR * 1.3);
          const c = config.color;
          orbGrad.addColorStop(0, `rgba(${Math.min(c[0] + 30, 255)}, ${Math.min(c[1] + 30, 255)}, ${Math.min(c[2] + 25, 255)}, ${layerAlpha})`);
          orbGrad.addColorStop(0.5, `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${layerAlpha * 0.8})`);
          orbGrad.addColorStop(1, `rgba(${c[0] - 40}, ${c[1] - 40}, ${c[2] - 45}, ${layerAlpha * 0.6})`);
          ctx.fillStyle = orbGrad;
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(${config.color[0]}, ${config.color[1]}, ${config.color[2]}, ${layerAlpha * (0.3 + intensity * 0.4)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      const hlSize = size * config.baseRadius * 0.4;
      const hlGrad = ctx.createRadialGradient(cx - hlSize * 0.3, cy - hlSize * 0.4, 0, cx, cy, hlSize);
      hlGrad.addColorStop(0, `rgba(255, 255, 250, ${0.08 + intensity * 0.06})`);
      hlGrad.addColorStop(1, "rgba(255, 255, 250, 0)");
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.arc(cx - hlSize * 0.15, cy - hlSize * 0.2, hlSize, 0, Math.PI * 2);
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [getConfig]);

  // ─── Voice: start listening ───
  const startListening = useCallback(() => {
    if (!supported) return;
    setShowHint(false);
    setTranscript("");
    setResponse("");
    transcriptRef.current = "";

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join("");
      setTranscript(text);
      transcriptRef.current = text;
    };

    recognition.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.warn("[hum] recognition error:", e.error);
      setMode("idle");
    };

    recognition.onend = () => {
      // Only auto-process if we were still in listening mode (not manually stopped)
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setMode("listening");
  }, [supported]);

  // ─── Voice: stop listening → send to AI ───
  const stopListening = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const text = transcriptRef.current;
    if (!text.trim()) {
      setMode("idle");
      return;
    }

    setMode("thinking");

    // Add to conversation history
    messagesRef.current = [...messagesRef.current, { role: "user", content: text }];

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setResponse("Sorry, something went wrong.");
        speakText("Sorry, something went wrong.");
        return;
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              fullResponse += parsed.text;
              setResponse(fullResponse);
            }
            if (parsed.error) {
              fullResponse = parsed.error;
              setResponse(fullResponse);
            }
          } catch {}
        }
      }

      abortRef.current = null;

      // Add assistant response to history
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: fullResponse }];

      // Speak the response
      if (fullResponse.trim()) {
        speakText(fullResponse);
      } else {
        setMode("idle");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[hum] chat error:", err.message);
      setResponse("Couldn\u2019t reach the server.");
      speakText("Couldn\u2019t reach the server.");
    }
  }, [authFetch]);

  // ─── Voice: TTS ───
  const speakText = useCallback((text) => {
    setMode("speaking");
    // Strip markdown formatting for cleaner speech
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/#{1,6}\s/g, "")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      utteranceRef.current = null;
      setMode("idle");
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setMode("idle");
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel(); // Clear any queued speech
    window.speechSynthesis.speak(utterance);
  }, []);

  // ─── Controls ───
  const handleMicTap = useCallback(() => {
    if (mode === "idle") {
      startListening();
    } else if (mode === "listening") {
      stopListening();
    }
    // thinking/speaking: mic tap does nothing (wait for completion)
  }, [mode, startListening, stopListening]);

  const handleOrbTap = useCallback(() => {
    if (mode === "idle") startListening();
    else if (mode === "listening") stopListening();
  }, [mode, startListening, stopListening]);

  const router = useRouter();
  const endSession = useCallback(() => {
    // Stop everything
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setMode("idle");
    setTranscript("");
    setResponse("");
    messagesRef.current = [];
  }, []);

  const goBack = useCallback(() => {
    if (mode === "speaking") {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setMode("idle");
    } else if (mode === "thinking") {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setMode("idle");
    } else if (mode === "listening") {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setTranscript("");
      setMode("idle");
    }
  }, [mode]);

  // Subtitle text based on mode
  const subtitle = mode === "listening" && transcript
    ? transcript
    : mode === "thinking"
    ? transcript || "Processing..."
    : mode === "speaking" && response
    ? response.length > 200 ? response.slice(0, 200) + "..." : response
    : "tap the orb to talk";

  return (
    <AuthGuard>
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInSlow { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>

      {/* Top-left branding */}
      <Link
        href="/"
        style={{
          position: "absolute",
          top: "var(--space-6)",
          left: "var(--space-8)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          animation: "fadeInSlow 1s 0.5s both",
          textDecoration: "none",
        }}
      >
        <LogoMark size={22} />
        <span
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          F{"\u00FC"}lkit
        </span>
      </Link>

      {/* Top: Status */}
      <div
        style={{
          position: "absolute",
          top: "var(--space-6)",
          left: 0,
          right: 0,
          textAlign: "center",
          animation: "fadeIn 0.8s 0.3s both",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-secondary)",
            letterSpacing: "var(--letter-spacing-wide)",
            transition: `all var(--duration-slow) var(--ease-default)`,
          }}
        >
          {MODE_LABELS[mode]}
        </div>
      </div>

      {/* Center: The Orb */}
      <div
        onClick={handleOrbTap}
        style={{
          cursor: mode === "thinking" ? "wait" : "pointer",
          animation: "fadeIn 1.2s ease both",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: 500, height: 500, filter: "contrast(1.05)" }}
        />
      </div>

      {/* Subtitle / transcript / response */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: "var(--space-8)",
          right: "var(--space-8)",
          textAlign: "center",
          maxHeight: 80,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: mode === "idle" ? "var(--color-text-dim)" : "var(--color-text-muted)",
            fontWeight: "var(--font-weight-normal)",
            lineHeight: "var(--line-height-relaxed)",
            fontStyle: mode === "listening" ? "italic" : "normal",
            transition: "all var(--duration-normal) var(--ease-default)",
          }}
        >
          {subtitle}
        </div>
      </div>

      {/* Bottom: Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "var(--space-10)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-4)",
          animation: "fadeIn 0.6s 0.8s both",
        }}
      >
        {!supported && (
          <div style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-dim)",
            textAlign: "center",
            maxWidth: 260,
          }}>
            Voice requires Chrome, Safari, or Edge.
          </div>
        )}

        {showHint && supported && mode === "idle" && (
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-dim)",
              animation: "pulse 3s infinite",
            }}
          >
            tap the orb
          </div>
        )}

        {mode === "listening" && (
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              justifyContent: "center",
              animation: "fadeIn 0.4s ease both",
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 12 + Math.random() * 16,
                  borderRadius: 2,
                  background: "var(--color-text-secondary)",
                  opacity: 0.4,
                  animation: `pulse ${0.6 + i * 0.15}s ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "center" }}>
          {/* End session */}
          <button
            onClick={endSession}
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              background: mode === "idle" ? "var(--color-border)" : "var(--color-bg-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              transition: `all var(--duration-slow) var(--ease-default)`,
            }}
            title="End session"
          >
            <X size={18} strokeWidth={2} color={mode === "idle" ? "var(--color-text-muted)" : "var(--color-text-inverse)"} />
          </button>

          {/* Main mic button */}
          <button
            onClick={handleMicTap}
            disabled={!supported || mode === "thinking" || mode === "speaking"}
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: mode === "listening" ? "var(--color-error)" : "var(--color-bg-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: mode === "thinking" || mode === "speaking" ? "wait" : "pointer",
              border: "none",
              transition: `all var(--duration-slow) var(--ease-default)`,
              boxShadow: mode === "listening" ? "0 0 20px rgba(196, 59, 46, 0.3)" : "var(--shadow-none)",
              opacity: mode === "thinking" || mode === "speaking" ? 0.5 : 1,
            }}
            title={mode === "idle" ? "Start talking" : mode === "listening" ? "Stop and send" : "Processing..."}
          >
            {mode === "listening" ? (
              <div style={{ width: 20, height: 20, borderRadius: "var(--radius-xs)", background: "var(--color-text-inverse)" }} />
            ) : (
              <Mic size={22} strokeWidth={1.8} color="var(--color-text-inverse)" />
            )}
          </button>

          {/* Go back / cancel */}
          <button
            onClick={goBack}
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              background: mode === "idle" ? "var(--color-border)" : "var(--color-bg-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              transition: `all var(--duration-slow) var(--ease-default)`,
              opacity: mode === "idle" ? 0.4 : 1,
            }}
            title={mode === "speaking" ? "Stop speaking" : mode === "thinking" ? "Cancel" : "Back"}
          >
            <ArrowLeft size={18} strokeWidth={2} color={mode === "idle" ? "var(--color-text-muted)" : "var(--color-text-inverse)"} />
          </button>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
