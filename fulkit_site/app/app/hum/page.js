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
    color: [190, 188, 182],
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
    color: [200, 198, 190],
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
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const utteranceRef = useRef(null);
  const messagesRef = useRef([]);
  const abortRef = useRef(null);
  const speakTextRef = useRef(null);
  const maxTimerRef = useRef(null);

  const MAX_RECORDING_SECONDS = 60;

  // Check browser support (MediaRecorder is universal)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
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

  // ─── Voice: start recording (MediaRecorder — silent, no browser sounds) ───
  const startListening = useCallback(async () => {
    if (!supported) return;
    setShowHint(false);
    setTranscript("");
    setResponse("");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      recorderRef.current = recorder;
      setMode("listening");

      // Safety cap — auto-stop after MAX_RECORDING_SECONDS
      maxTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          stopListeningRef.current();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch (err) {
      console.warn("[hum] mic error:", err.message);
      setMode("idle");
    }
  }, [supported]);

  // Ref for stopListening so the timer can call it
  const stopListeningRef = useRef(null);

  // ─── Voice: stop recording → transcribe via Whisper → send to AI ───
  const stopListening = useCallback(async () => {
    // Clear safety timer
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }

    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setMode("idle");
      return;
    }

    // Stop recording and collect audio
    const audioBlob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        // Stop all mic tracks
        recorder.stream.getTracks().forEach(t => t.stop());
        resolve(blob);
      };
      recorder.stop();
    });
    recorderRef.current = null;

    if (audioBlob.size < 1000) { // Too small = no real audio
      setMode("idle");
      return;
    }

    setMode("thinking");

    try {
      // Transcribe via Whisper
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const txRes = await authFetch("/api/hum/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!txRes.ok) {
        console.warn("[hum] transcribe failed:", txRes.status);
        setMode("idle");
        return;
      }

      const { text } = await txRes.json();
      if (!text?.trim()) {
        setMode("idle");
        return;
      }

      setTranscript(text);
      messagesRef.current = [...messagesRef.current, { role: "user", content: text }];

      // Send to AI
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
          context: [{ title: "Voice Mode", content: "User is speaking via The Hum (voice mode). Execute commands immediately — never ask for confirmation. Respond in 1-2 short sentences max. Be warm but brief. Never repeat back full details. Good: \"Done, meeting added.\" Bad: \"I've scheduled a meeting for Tuesday, April 1st at 11:00 AM. Would you like me to add notes?\"" }],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        speakTextRef.current("Sorry, something went wrong.");
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
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: fullResponse }];

      if (fullResponse.trim()) {
        speakTextRef.current(fullResponse);
      } else {
        setMode("idle");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.warn("[hum] error:", err.message);
      speakTextRef.current("Couldn\u2019t reach the server.");
    }
  }, [authFetch]);

  // ─── Voice: TTS via OpenAI (alloy), falls back to browser speech ───
  const speakText = useCallback(async (text) => {
    setMode("speaking");

    // Try OpenAI TTS first
    try {
      const res = await authFetch("/api/hum/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        audio.onended = () => {
          URL.revokeObjectURL(url);
          utteranceRef.current = null;
          setMode("idle");
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          utteranceRef.current = null;
          setMode("idle");
        };

        utteranceRef.current = audio;
        await audio.play();
        return;
      }
      const errBody = await res.text().catch(() => "");
      console.warn("[hum] TTS API failed:", res.status, errBody);
    } catch (err) {
      console.warn("[hum] TTS error:", err.message);
    }

    // Fallback: browser SpeechSynthesis
    try {
      const clean = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1").replace(/#{1,6}\s/g, "").replace(/\n+/g, " ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.onend = () => { utteranceRef.current = null; setMode("idle"); };
      utterance.onerror = () => { utteranceRef.current = null; setMode("idle"); };
      utteranceRef.current = utterance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      utteranceRef.current = null;
      setMode("idle");
    }
  }, [authFetch]);

  // Keep refs in sync
  speakTextRef.current = speakText;
  stopListeningRef.current = stopListening;

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
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stream.getTracks().forEach(t => t.stop());
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    if (utteranceRef.current) {
      if (utteranceRef.current instanceof Audio) utteranceRef.current.pause();
      else window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setMode("idle");
    setTranscript("");
    setResponse("");
    messagesRef.current = [];
  }, []);

  const goBack = useCallback(() => {
    if (mode === "speaking") {
      if (utteranceRef.current) {
        if (utteranceRef.current instanceof Audio) utteranceRef.current.pause();
        else window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      setMode("idle");
    } else if (mode === "thinking") {
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
      setMode("idle");
    } else if (mode === "listening") {
      if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stream.getTracks().forEach(t => t.stop());
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      setTranscript("");
      setMode("idle");
    }
  }, [mode]);

  // No text on screen during conversation — the orb is the interface

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

      {/* No transcript or response text — just the orb */}

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
            Voice requires a browser with microphone access.
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
          {/* End session — outline style */}
          <button
            onClick={endSession}
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid var(--color-border)",
              transition: `all var(--duration-slow) var(--ease-default)`,
              opacity: mode === "idle" ? 0.4 : 0.7,
            }}
            title="End session"
          >
            <X size={18} strokeWidth={1.8} color="var(--color-text-muted)" />
          </button>

          {/* Main mic button — Fülkit Black, no red */}
          <button
            onClick={handleMicTap}
            disabled={!supported || mode === "thinking" || mode === "speaking"}
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: "var(--color-bg-inverse)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: mode === "thinking" || mode === "speaking" ? "wait" : "pointer",
              border: "none",
              transition: `all var(--duration-slow) var(--ease-default)`,
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

          {/* Go back / cancel — outline style */}
          <button
            onClick={goBack}
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-full)",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid var(--color-border)",
              transition: `all var(--duration-slow) var(--ease-default)`,
              opacity: mode === "idle" ? 0.4 : 0.7,
            }}
            title={mode === "speaking" ? "Stop speaking" : mode === "thinking" ? "Cancel" : "Back"}
          >
            <ArrowLeft size={18} strokeWidth={1.8} color="var(--color-text-muted)" />
          </button>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
