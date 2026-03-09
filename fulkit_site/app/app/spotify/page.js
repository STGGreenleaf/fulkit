"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Play, ChevronLeft, ChevronRight, Plus, Check, X, Disc, Ear } from "lucide-react";
import { createNoise2D } from "simplex-noise";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useSpotify } from "../../lib/spotify";

// Minimal pause mark — two vertical lines
function PauseLines({ size = 16, color = "currentColor", strokeWidth = 2.5 }) {
  const w = size, h = size;
  const gap = w * 0.3;
  const x1 = w / 2 - gap, x2 = w / 2 + gap;
  const py = h * 0.22;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <line x1={x1} y1={py} x2={x1} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={x2} y1={py} x2={x2} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

// Energy/danceability bar — thin segmented readout
function MeterBar({ value = 0, width = 80 }) {
  const segments = 10;
  const filled = Math.round((value / 100) * segments);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            width: (width - (segments - 1) * 2) / segments,
            height: 4,
            background: i < filled ? "var(--color-text)" : "var(--color-border)",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SIGNAL TERRAIN — 4-layer audio visualization system
//
// Layer 0: Generative ambient (simplex noise, always on)
// Layer 1: Playback state (kinetic signatures)
// Layer 2: Audio features (BPM, energy, valence, danceability)
// Layer 3: Live audio (mic via getUserMedia)
// ═══════════════════════════════════════════════════════

const T_LAYERS = 40;
const T_POINTS = 80;

function SignalTerrain({
  height = 220,
  isPlaying = false,
  trackId = null,
  progress = 0,
  duration = 0,
  features = null,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);
  const historyRef = useRef([]);
  const phaseRef = useRef(0);
  const noiseRef = useRef(createNoise2D());
  const [canvasWidth, setCanvasWidth] = useState(600);

  // Layer 1: kinetic state machine
  const kineticRef = useRef({
    amplitude: 0.08, // current smoothed amplitude (0–1)
    target: 0.08,    // target amplitude
    state: "idle",   // idle | spool-up | active | wind-down | skip-cut | skip-silence | skip-spool
    stateStart: 0,
    prevPlaying: false,
    prevTrackId: null,
  });

  // Layer 3: live audio (multi-band)
  const liveRef = useRef({
    active: false,
    stream: null,
    audioCtx: null,
    analyser: null,
    bands: { bass: 0, mids: 0, presence: 0, air: 0 },
    smoothBands: { bass: 0, mids: 0, presence: 0, air: 0 },
    flux: 0,
    smoothFlux: 0,
    prevFrame: null, // allocated on mic activation (Uint8Array(1024))
  });
  const [liveActive, setLiveActive] = useState(false);

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCanvasWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // New noise seed on track change
  useEffect(() => {
    noiseRef.current = createNoise2D();
    historyRef.current = [];
    const k = kineticRef.current;
    // If track changed while playing → skip signature
    if (k.prevTrackId && k.prevTrackId !== trackId && k.prevPlaying) {
      k.state = "skip-cut";
      k.stateStart = performance.now();
      k.target = 0;
    }
    k.prevTrackId = trackId;
  }, [trackId]);

  // Layer 3: mic activation
  const activateMic = useCallback(async () => {
    const live = liveRef.current;
    if (live.active) {
      // Disconnect
      if (live.stream) live.stream.getTracks().forEach((t) => t.stop());
      if (live.audioCtx) live.audioCtx.close();
      live.active = false;
      live.stream = null;
      live.audioCtx = null;
      live.analyser = null;
      live.bands = { bass: 0, mids: 0, presence: 0, air: 0 };
      live.smoothBands = { bass: 0, mids: 0, presence: 0, air: 0 };
      live.flux = 0;
      live.smoothFlux = 0;
      live.prevFrame = null;
      setLiveActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      live.stream = stream;
      live.audioCtx = ctx;
      live.analyser = analyser;
      live.prevFrame = new Uint8Array(1024);
      live.active = true;
      setLiveActive(true);
      try { localStorage.setItem("fulkit-live-audio-opted-in", "true"); } catch {}
    } catch {
      // Permission denied or no mic
    }
  }, []);

  // Cleanup mic on unmount
  useEffect(() => {
    return () => {
      const live = liveRef.current;
      if (live.stream) live.stream.getTracks().forEach((t) => t.stop());
      if (live.audioCtx) live.audioCtx.close();
    };
  }, []);

  // Render loop
  useEffect(() => {
    let running = true;
    let lastFrame = 0;
    const frameInterval = 1000 / 30;
    const freqData = new Uint8Array(1024);

    const render = (timestamp) => {
      if (!running) return;
      animRef.current = requestAnimationFrame(render);
      if (timestamp - lastFrame < frameInterval) return;
      lastFrame = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const noise2D = noiseRef.current;
      const k = kineticRef.current;
      const live = liveRef.current;

      // ── Layer 1: Kinetic state machine ──
      const now = timestamp;
      const elapsed = now - k.stateStart;

      // Detect play/pause transitions
      if (isPlaying && !k.prevPlaying && k.state !== "skip-spool") {
        k.state = "spool-up";
        k.stateStart = now;
        k.target = 0.55;
      } else if (!isPlaying && k.prevPlaying) {
        k.state = "wind-down";
        k.stateStart = now;
        k.target = 0.08;
      }
      k.prevPlaying = isPlaying;

      // State transitions
      if (k.state === "spool-up" && elapsed > 600) {
        k.state = "active";
      } else if (k.state === "wind-down" && elapsed > 800) {
        k.state = "idle";
      } else if (k.state === "skip-cut" && elapsed > 200) {
        k.state = "skip-silence";
        k.stateStart = now;
        k.target = 0.02;
      } else if (k.state === "skip-silence" && elapsed > 200) {
        k.state = "skip-spool";
        k.stateStart = now;
        k.target = 0.55;
      } else if (k.state === "skip-spool" && elapsed > 400) {
        k.state = isPlaying ? "active" : "idle";
        k.target = isPlaying ? 0.55 : 0.08;
      }

      // Smooth amplitude toward target
      const smoothRate = k.state === "skip-cut" ? 0.2 : 0.06;
      k.amplitude += (k.target - k.amplitude) * smoothRate;

      // Track end exhale (Layer 1)
      let exhaleMultiplier = 1;
      if (isPlaying && duration > 0 && progress > 0) {
        const remaining = duration * (1 - progress);
        const EXHALE_WINDOW = 6;
        if (remaining < EXHALE_WINDOW && remaining > 0) {
          const exhaustion = 1 - (remaining / EXHALE_WINDOW);
          exhaleMultiplier = 1 - (exhaustion * 0.7);
        }
      }

      // ── Layer 2: Audio features ──
      const bpm = features?.bpm || 100;
      const energy = (features?.energy || 50) / 100;
      const valence = (features?.valence || 50) / 100;
      const danceability = (features?.danceability || 50) / 100;
      const loudness = features?.loudness || -15;
      const acousticness = (features?.acousticness || 30) / 100;
      const keyOffset = (features?.key?.charCodeAt(0) || 0) * 0.1;

      // BPM beat grid
      const progressMs = progress * duration * 1000;
      const msPerBeat = 60000 / bpm;
      const beatPhase = (progressMs % msPerBeat) / msPerBeat;
      const beatPulse = isPlaying ? Math.pow(1 - beatPhase, 3) : 0;

      // Energy → amplitude ceiling
      const amplitudeCeiling = 0.2 + energy * 0.6;
      const normalizedLoudness = Math.max(0, (loudness + 35) / 35);
      const amplitudeFloor = 0.05 + normalizedLoudness * 0.15;

      // Valence → shape sharpness
      const sharpness = 1 - valence;

      // Phase advance — BPM-synced when playing
      const beatsPerSec = bpm / 60;
      const phaseStep = isPlaying ? (beatsPerSec / 30) * 0.15 : 0.004;
      phaseRef.current += phaseStep;
      const phase = phaseRef.current;

      // ── Layer 3: Multi-band live audio analysis ──
      let liveBass = 0, liveMids = 0, livePresence = 0, liveAir = 0, liveFlux = 0;
      if (live.active && live.analyser) {
        live.analyser.getByteFrequencyData(freqData);
        const N = freqData.length; // 1024 bins

        // Band energy (sum bins, normalize to 0-1)
        const bandSum = (lo, hi) => {
          let s = 0;
          for (let i = lo; i <= hi; i++) s += freqData[i];
          return s / ((hi - lo + 1) * 255);
        };
        live.bands.bass = bandSum(0, 11);
        live.bands.mids = bandSum(12, 93);
        live.bands.presence = bandSum(94, 279);
        live.bands.air = bandSum(280, N - 1);

        // Silence gates — clamp room noise to zero
        if (live.bands.bass < 0.05) live.bands.bass = 0;
        if (live.bands.mids < 0.06) live.bands.mids = 0;
        if (live.bands.presence < 0.07) live.bands.presence = 0;
        if (live.bands.air < 0.08) live.bands.air = 0;

        // Asymmetric per-band smoothing
        const aSmooth = (raw, prev, attack, decay) =>
          raw > prev ? prev * attack + raw * (1 - attack) : prev * decay + raw * (1 - decay);
        live.smoothBands.bass = aSmooth(live.bands.bass, live.smoothBands.bass, 0.4, 0.85);
        live.smoothBands.mids = live.smoothBands.mids * 0.7 + live.bands.mids * 0.3;
        live.smoothBands.presence = aSmooth(live.bands.presence, live.smoothBands.presence, 0.3, 0.8);
        live.smoothBands.air = aSmooth(live.bands.air, live.smoothBands.air, 0.3, 0.8);

        // Spectral flux (half-wave rectified frame diff)
        let fluxSum = 0;
        if (live.prevFrame) {
          for (let i = 0; i < N; i++) {
            const diff = freqData[i] - live.prevFrame[i];
            if (diff > 0) fluxSum += diff;
          }
          live.flux = fluxSum / (N * 255);
          live.smoothFlux = aSmooth(live.flux, live.smoothFlux, 0.5, 0.92);
          live.prevFrame.set(freqData);
        }

        liveBass = live.smoothBands.bass;
        liveMids = live.smoothBands.mids;
        livePresence = live.smoothBands.presence;
        liveAir = live.smoothBands.air;
        liveFlux = live.smoothFlux;
      }

      // ── Generate terrain points ──
      const points = [];
      for (let i = 0; i < T_POINTS; i++) {
        const t = i / T_POINTS;

        // Layer 0: Multi-octave simplex noise
        const n1 = noise2D(t * 4 + keyOffset, phase * 0.3) * 0.5;
        const n2 = noise2D(t * 8 + 100, phase * 0.5) * 0.25;
        const n3 = noise2D(t * 16 + 200, phase * 0.8) * 0.125;
        let raw = n1 + n2 + n3;

        // Valence shaping (Layer 2)
        raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);

        // Envelope: taper at edges
        const envelope = Math.sin(t * Math.PI);

        // Layer 2: Beat pulse modulation
        const beatBoost = 1 + beatPulse * danceability * 0.4;

        // Combine layers
        let amp;
        if (live.active && (liveBass + liveMids) > 0.01) {
          // Layer 3: multi-band terrain modulation
          const liveBlend = Math.min(1, (liveBass + liveMids * 0.5) * 3);
          const puppeted = Math.abs(raw) * envelope * k.amplitude * exhaleMultiplier * beatBoost;
          const liveRaw = raw * (1 + livePresence * 0.5); // sharper peaks with presence
          const liveDisp = Math.abs(liveRaw) * envelope * Math.min(1.0, liveBass * 2.5 + liveMids * 0.8) * (1 + liveFlux * 2.5);
          const jitter = (Math.random() - 0.5) * liveAir * 0.15;
          amp = puppeted * (1 - liveBlend * 0.7) + (liveDisp + jitter) * liveBlend * 0.7;
        } else {
          // Layers 0-2
          amp = Math.abs(raw) * envelope * k.amplitude * exhaleMultiplier * beatBoost;
        }

        // Clamp to energy ceiling
        amp = Math.min(amp, amplitudeCeiling);
        amp = Math.max(amp, isPlaying ? amplitudeFloor * envelope * 0.3 : 0);

        // 5% jitter
        amp *= 1 + (Math.random() - 0.5) * 0.1;

        points.push(Math.max(0, Math.min(1, amp)));
      }

      historyRef.current.push(points);
      if (historyRef.current.length > T_LAYERS) historyRef.current.shift();

      // ── Render ──
      const style = getComputedStyle(canvas);
      const textColor = style.getPropertyValue("--color-text").trim() || "#e8e6e3";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [232, 230, 227];

      ctx.clearRect(0, 0, w, h);
      const layers = historyRef.current;
      const centerY = h * 0.78;

      for (let l = 0; l < layers.length; l++) {
        const age = l / Math.max(1, layers.length - 1);
        const data = layers[l];

        const alpha = 0.012 + age * age * 0.16;
        const baseLw = 0.3 + age * 1.0;
        const lw = baseLw * (0.7 + acousticness * 0.6); // acousticness → line thickness
        const yShift = (layers.length - 1 - l) * 1.1;

        // Mountains
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = data[i] * centerY * 1.3;
          const y = centerY - a - yShift;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = ((i - 1) / (data.length - 1)) * w;
            const prevA = data[i - 1] * centerY * 1.1;
            const prevY = centerY - prevA - yShift;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        ctx.lineTo(w, centerY - data[data.length - 1] * centerY * 1.1 - yShift);
        ctx.stroke();

        // Reflection
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha * 0.2})`;
        ctx.lineWidth = lw * 0.4;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = data[i] * centerY * 0.18;
          const y = centerY + a + (layers.length - 1 - l) * 0.25 + 1;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Horizon line removed — baseline sits near bottom edge
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [canvasWidth, isPlaying, progress, duration, features, liveActive]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        style={{ width: "100%", height, display: "block" }}
      />
      {/* Layer 3: "ears" affordance */}
      <button
        onClick={activateMic}
        style={{
          position: "absolute",
          bottom: 8,
          right: 10,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 4,
          opacity: liveActive ? 0.6 : 0.15,
          transition: "opacity 300ms",
          color: "var(--color-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        title={liveActive ? "Live audio active — click to disable" : "Enable live audio (microphone)"}
      >
        <Ear size={12} strokeWidth={1.5} />
        {liveActive && (
          <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)" }}>
            live
          </span>
        )}
      </button>
    </div>
  );
}

// Hardware section label — silk-screened look
function Label({ children, style }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        fontWeight: "var(--font-weight-medium)",
        textTransform: "uppercase",
        letterSpacing: "var(--letter-spacing-wider)",
        color: "var(--color-text-dim)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}


export default function SpotifyPage() {
  const {
    isPlaying,
    currentTrack,
    flagged,
    playlists,
    progress,
    audioFeatures,
    toggle,
    skip,
    prev,
    flag,
    isFlagged,
    reorderFlagged,
    playTrack,
    formatTime,
    setProgress,
  } = useSpotify();

  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragNode = useRef(null);

  const features = currentTrack ? audioFeatures[currentTrack.id] : null;

  // Pad grid — 16 slots, fill with flagged tracks
  const PADS = 16;
  const pads = Array.from({ length: PADS }, (_, i) => flagged[i] || null);

  // Drag handlers for the setlist
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    dragNode.current = e.target;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.4"; }, 0);
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  }, [dragOverIdx]);

  const handleDrop = useCallback((e, toIdx) => {
    e.preventDefault();
    if (dragIdx != null && dragIdx !== toIdx) {
      reorderFlagged(dragIdx, toIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
  }, [dragIdx, reorderFlagged]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
  }, []);

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            background: "var(--color-bg)",
            overflow: "hidden",
          }}
        >
          {/* ═══ THE DECK ═══ */}
          <div
            style={{
              borderBottom: "1px solid var(--color-border-light)",
              padding: "var(--space-6) var(--space-8)",
              display: "flex",
              gap: "var(--space-8)",
              alignItems: "center",
              minHeight: 0,
            }}
          >
            {/* Album art */}
            <div
              style={{
                width: 180,
                height: 180,
                flexShrink: 0,
                background: "var(--color-bg-inverse)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: "grayscale(1)",
              }}
            >
              {currentTrack?.art ? (
                <img
                  src={currentTrack.art}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              )}
            </div>

            {/* Readout panel */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {/* Track info + BPM/Key */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-6)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--font-size-lg)",
                      fontWeight: "var(--font-weight-bold)",
                      letterSpacing: "var(--letter-spacing-tight)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentTrack?.title || "No track"}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {currentTrack ? `${currentTrack.artist} — ${currentTrack.album}` : ""}
                  </div>
                </div>

                {/* BPM + Key readout */}
                {features && (
                  <div style={{ flexShrink: 0, textAlign: "right", opacity: 1, transition: "opacity 0.5s" }}>
                    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "baseline" }}>
                      <div>
                        <div
                          style={{
                            fontSize: 32,
                            fontFamily: "var(--font-mono)",
                            fontWeight: "var(--font-weight-bold)",
                            lineHeight: 1,
                            letterSpacing: "-1px",
                            color: "var(--color-text)",
                          }}
                        >
                          {features.bpm}
                        </div>
                        <Label>BPM</Label>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 22,
                            fontFamily: "var(--font-mono)",
                            fontWeight: "var(--font-weight-semibold)",
                            lineHeight: 1,
                            color: "var(--color-text)",
                          }}
                        >
                          {features.key}
                        </div>
                        <Label>Key</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Meters — only when features available */}
              {features && (
                <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
                  <div>
                    <Label style={{ marginBottom: 3 }}>Energy</Label>
                    <MeterBar value={features.energy} width={80} />
                  </div>
                  <div>
                    <Label style={{ marginBottom: 3 }}>Dance</Label>
                    <MeterBar value={features.danceability} width={80} />
                  </div>
                  <div>
                    <Label style={{ marginBottom: 3 }}>Mood</Label>
                    <MeterBar value={features.valence} width={80} />
                  </div>
                </div>
              )}

              {/* Progress */}
              <div style={{ maxWidth: 400 }}>
                <div
                  style={{
                    width: "100%",
                    height: 3,
                    background: "var(--color-border)",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={(e) => {
                    if (!currentTrack) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setProgress((e.clientX - rect.left) / rect.width);
                  }}
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: "100%",
                      background: "var(--color-text)",
                      transition: "width 0.1s linear",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 3,
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  <span>{currentTrack ? formatTime(progress * currentTrack.duration) : "0:00"}</span>
                  <span>{currentTrack ? formatTime(currentTrack.duration) : "0:00"}</span>
                </div>
              </div>

              {/* Transport — same pattern as MiniPlayer, scaled up */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 260 }}>
                {/* Flag — circled */}
                <button
                  onClick={() => currentTrack && flag(currentTrack)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-full)",
                    background: currentTrack && isFlagged(currentTrack?.id) ? "var(--color-text)" : "transparent",
                    border: currentTrack && isFlagged(currentTrack?.id) ? "1px solid var(--color-text)" : "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                    transition: "all 150ms",
                  }}
                >
                  {currentTrack && isFlagged(currentTrack?.id) ? (
                    <Check size={14} strokeWidth={2.8} color="var(--color-text-inverse)" />
                  ) : (
                    <Plus size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
                  )}
                </button>

                {/* Prev — bare */}
                <button
                  onClick={prev}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--radius-full)",
                    background: "transparent", border: "1px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, outline: "none",
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={2.2} color="var(--color-text-muted)" />
                </button>

                {/* Play/Pause — bare, thicker */}
                <button
                  onClick={toggle}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--radius-full)",
                    background: "transparent", border: "1px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, outline: "none",
                  }}
                >
                  {isPlaying ? (
                    <PauseLines size={16} strokeWidth={2.8} color="var(--color-text)" />
                  ) : (
                    <Play size={16} strokeWidth={2.8} color="var(--color-text)" fill="var(--color-text)" style={{ marginLeft: 1 }} />
                  )}
                </button>

                {/* Next — bare */}
                <button
                  onClick={skip}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--radius-full)",
                    background: "transparent", border: "1px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, outline: "none",
                  }}
                >
                  <ChevronRight size={16} strokeWidth={2.2} color="var(--color-text-muted)" />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ SIGNAL TERRAIN — full-width live visualizer ═══ */}
          <div>
            <SignalTerrain
              height={120}
              isPlaying={isPlaying}
              trackId={currentTrack?.id}
              progress={progress}
              duration={currentTrack?.duration || 0}
              features={features}
            />
          </div>

          {/* ═══ CRATE + SET ═══ */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* THE CRATE — 4x4 pad grid */}
            <div
              style={{
                flex: 1,
                padding: "var(--space-5) var(--space-8)",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              <Label>Crate</Label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                  maxWidth: 520,
                }}
              >
                {pads.map((track, i) => {
                  const isActive = track && currentTrack?.id === track.id;
                  const padFeat = track ? audioFeatures[track.id] : null;
                  return (
                    <button
                      key={i}
                      onClick={() => track && playTrack(track)}
                      style={{
                        aspectRatio: "1",
                        background: isActive
                          ? "var(--color-bg-inverse)"
                          : track
                            ? "var(--color-bg-elevated)"
                            : "transparent",
                        border: track
                          ? isActive
                            ? "none"
                            : "1px solid var(--color-border)"
                          : "1px dashed var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        cursor: track ? "pointer" : "default",
                        padding: "var(--space-2)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        fontFamily: "var(--font-primary)",
                        transition: "all 120ms",
                        position: "relative",
                        overflow: "hidden",
                        minHeight: 0,
                      }}
                    >
                      {track ? (
                        <>
                          <div
                            style={{
                              fontSize: 8,
                              fontFamily: "var(--font-mono)",
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                              opacity: 0.6,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: "var(--font-weight-semibold)",
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text)",
                              lineHeight: 1.2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            {track.title}
                          </div>
                          {padFeat && (
                            <div
                              style={{
                                fontSize: 8,
                                fontFamily: "var(--font-mono)",
                                color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                                opacity: 0.7,
                              }}
                            >
                              {padFeat.bpm}
                            </div>
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-dim)",
                            opacity: 0.4,
                            alignSelf: "center",
                            marginTop: "auto",
                            marginBottom: "auto",
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mixes section below crate */}
              {playlists.length > 0 && (
                <>
                  <Label style={{ marginTop: "var(--space-4)" }}>Mixes</Label>
                  <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    {playlists.map((pl) => (
                      <button
                        key={pl.id}
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          fontFamily: "var(--font-primary)",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                          {pl.name}
                        </div>
                        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 1 }}>
                          {pl.tracks} trk
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* THE SET — draggable setlist rail */}
            <div
              style={{
                width: 260,
                flexShrink: 0,
                borderLeft: "1px solid var(--color-border-light)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "var(--space-5) var(--space-4)",
                  borderBottom: "1px solid var(--color-border-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Label>Set · {flagged.length}</Label>
              </div>

              <div style={{ flex: 1, overflowY: "auto" }}>
                {flagged.length === 0 && (
                  <div
                    style={{
                      padding: "var(--space-10) var(--space-4)",
                      textAlign: "center",
                    }}
                  >
                    <Plus size={16} strokeWidth={1.2} color="var(--color-text-dim)" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                      Flag tracks to build your set
                    </div>
                  </div>
                )}

                {flagged.map((track, i) => {
                  const isActive = currentTrack?.id === track.id;
                  const isDragTarget = dragOverIdx === i && dragIdx !== i;
                  const setFeat = audioFeatures[track.id];
                  return (
                    <div
                      key={track.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      onClick={() => playTrack(track)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2) var(--space-4)",
                        borderBottom: "1px solid var(--color-border-light)",
                        borderTop: isDragTarget ? "2px solid var(--color-text)" : "2px solid transparent",
                        background: isActive ? "var(--color-bg-alt)" : "transparent",
                        cursor: "grab",
                        transition: "background 100ms",
                        userSelect: "none",
                      }}
                    >
                      {/* Index */}
                      <div
                        style={{
                          width: 16,
                          fontSize: 9,
                          fontFamily: "var(--font-mono)",
                          color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isActive ? (
                          <div style={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "flex-end", height: 10 }}>
                            {[0, 1, 2].map((j) => (
                              <div
                                key={j}
                                style={{
                                  width: 1.5,
                                  height: 3 + Math.random() * 7,
                                  background: "var(--color-text)",
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </div>

                      {/* Track info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "var(--font-size-xs)",
                            fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                            color: "var(--color-text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {track.title}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "var(--color-text-dim)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {track.artist}
                        </div>
                      </div>

                      {/* BPM + Key */}
                      {setFeat && (
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
                            {setFeat.bpm}
                          </div>
                          <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                            {setFeat.key}
                          </div>
                        </div>
                      )}

                      {/* Remove from set */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          flag(track);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          color: "var(--color-text-dim)",
                          display: "flex",
                          flexShrink: 0,
                          opacity: 0.5,
                        }}
                      >
                        <X size={10} strokeWidth={2} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
