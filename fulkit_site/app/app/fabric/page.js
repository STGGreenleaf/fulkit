"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Play, ChevronLeft, ChevronRight, Plus, Check, X, Disc, Ear, ExternalLink, Maximize2 } from "lucide-react";
import { createNoise2D } from "simplex-noise";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import LogoMark from "../../components/LogoMark";
import { useFabric } from "../../lib/fabric";

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

// ═══════════════════════════════════════════════════════
// PROCEDURAL SONG ARCHITECTURE — deterministic per-bar
// energy envelope from track ID + audio features.
// Same song always produces the same shape.
// ═══════════════════════════════════════════════════════

// Seeded PRNG (mulberry32) — deterministic from track ID hash
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gaussian blur (1D) for smooth transitions
function gaussianBlur(arr, radius) {
  const out = new Float32Array(arr.length);
  const kernel = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-0.5 * (i / (radius * 0.4)) ** 2);
    kernel.push(v);
    sum += v;
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= sum;

  for (let i = 0; i < arr.length; i++) {
    let val = 0;
    for (let k = 0; k < kernel.length; k++) {
      const j = Math.min(arr.length - 1, Math.max(0, i + k - radius));
      val += arr[j] * kernel[k];
    }
    out[i] = val;
  }
  return out;
}

// Section templates — energy multipliers for each section type
// Values are HIGH — chorus is full power, verse is ~80%.
// The envelope creates shape via valleys, not by lowering peaks.
const SECTION_DEFS = {
  intro:     { base: 0.55, variance: 0.06 },
  verse:     { base: 0.80, variance: 0.06 },
  prechorus: { base: 0.90, variance: 0.05 },
  chorus:    { base: 1.00, variance: 0.04 },
  drop:      { base: 1.00, variance: 0.04 },
  bridge:    { base: 0.60, variance: 0.08 },
  breakdown: { base: 0.25, variance: 0.05 },
  outro:     { base: 0.45, variance: 0.06 },
};

// Section patterns by song length
const PATTERNS = {
  short: ["intro", "verse", "chorus", "verse", "chorus", "outro"],
  standard: ["intro", "verse", "prechorus", "chorus", "verse", "prechorus", "chorus", "bridge", "chorus", "outro"],
  extended: ["intro", "verse", "prechorus", "chorus", "verse", "prechorus", "chorus", "breakdown", "bridge", "chorus", "chorus", "outro"],
};

function generateSongEnvelope(trackId, durationMs, bpm, energy, danceability) {
  const rng = mulberry32(hashStr(trackId || "default"));
  const totalBars = Math.max(4, Math.round((durationMs / 60000) * bpm / 4));

  // Pick pattern based on duration
  const durationSec = durationMs / 1000;
  const patternKey = durationSec < 150 ? "short" : durationSec > 300 ? "extended" : "standard";
  const pattern = PATTERNS[patternKey];

  // Distribute bars across sections
  const sectionCount = pattern.length;
  const baseBarsPerSection = Math.floor(totalBars / sectionCount);
  const remainder = totalBars - baseBarsPerSection * sectionCount;

  const sections = pattern.map((type, i) => ({
    type,
    bars: baseBarsPerSection + (i < remainder ? 1 : 0),
  }));

  // Energy and danceability shape the curve
  const energyScale = 0.6 + (energy / 100) * 0.4;       // 0.6–1.0
  const bounceScale = 0.8 + (danceability / 100) * 0.2;  // 0.8–1.0

  // Generate per-bar values
  const raw = new Float32Array(totalBars);
  let barIndex = 0;

  for (const section of sections) {
    const def = SECTION_DEFS[section.type];
    for (let b = 0; b < section.bars; b++) {
      // Position within section (0–1)
      const t = section.bars > 1 ? b / (section.bars - 1) : 0.5;
      // Gradual build within section (slight ramp up then ease)
      const intraShape = 0.85 + 0.15 * Math.sin(t * Math.PI);
      // Per-bar variation from PRNG
      const variation = (rng() - 0.5) * 2 * def.variance;

      raw[barIndex] = (def.base + variation) * intraShape * energyScale * bounceScale;
      barIndex++;
    }
  }

  // Gaussian blur with 2-bar kernel for smooth transitions
  const smoothed = gaussianBlur(raw, 2);

  // Normalize to 0.25–1.0 range (breakdowns dip, nothing goes silent)
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] < min) min = smoothed[i];
    if (smoothed[i] > max) max = smoothed[i];
  }
  const range = max - min || 1;
  const envelope = new Float32Array(smoothed.length);
  for (let i = 0; i < smoothed.length; i++) {
    envelope[i] = 0.25 + ((smoothed[i] - min) / range) * 0.75;
  }

  return envelope;
}

function SignalTerrain({
  height = 220,
  isPlaying = false,
  trackId = null,
  progress = 0,
  onVisualize,
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

  // Procedural song envelope — cached per track
  const envelopeRef = useRef({ trackId: null, envelope: null });

  useEffect(() => {
    if (!trackId) return;
    if (envelopeRef.current.trackId === trackId) return;
    const bpm = features?.bpm || 100;
    const energy = features?.energy || 50;
    const dance = features?.danceability || 50;
    const dur = duration > 0 ? duration * 1000 : 210000;
    envelopeRef.current = {
      trackId,
      envelope: generateSongEnvelope(trackId, dur, bpm, energy, dance),
    };
  }, [trackId, features, duration]);

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

      // ── Procedural architecture: envelope lookup ──
      const env = envelopeRef.current.envelope;
      let envelopeValue = 1;
      if (env && env.length > 0 && isPlaying && progress > 0) {
        const barIndex = Math.min(env.length - 1, Math.floor(progress * env.length));
        envelopeValue = env[barIndex];
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
      // When envelope is active, it drives the ceiling directly (avoids double-attenuation)
      const hasEnvelope = env && env.length > 0 && isPlaying && progress > 0;
      const amplitudeCeiling = hasEnvelope
        ? 0.2 + envelopeValue * 0.6   // envelope replaces static energy ceiling
        : 0.2 + energy * 0.6;          // fallback: static energy from ReccoBeats
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
          // Layers 0-2 (envelope shapes via ceiling, not multiplier)
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
          const a = data[i] * centerY * 1.6;
          const y = centerY - a - yShift;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = ((i - 1) / (data.length - 1)) * w;
            const prevA = data[i - 1] * centerY * 1.4;
            const prevY = centerY - prevA - yShift;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        ctx.lineTo(w, centerY - data[data.length - 1] * centerY * 1.4 - yShift);
        ctx.stroke();

        // Reflection
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha * 0.35})`;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = data[i] * centerY * 0.38;
          const y = centerY + a + (layers.length - 1 - l) * 0.4 + 1;
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
      {/* Visualize — enter fullscreen orb */}
      {onVisualize && (
        <button
          onClick={onVisualize}
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            opacity: 0.15,
            transition: "opacity 300ms",
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
          }}
          title="Visualize"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.5)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.15)}
        >
          <ExternalLink size={12} strokeWidth={1.5} />
        </button>
      )}
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

// ═══════════════════════════════════════════════════════
// ORB VISUALIZER — fullscreen circular waveform
// Same data as Signal Terrain, wrapped radially.
// ═══════════════════════════════════════════════════════
// Deep Amoeba v3 — zoned perimeter, variable-weight contour

function createOrbNoise(seed) {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed || Math.random() * 65536;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return function(x, y) {
    const F2 = 0.5*(Math.sqrt(3)-1), G2 = (3-Math.sqrt(3))/6;
    const ss = (x+y)*F2;
    const i = Math.floor(x+ss), j = Math.floor(y+ss);
    const t = (i+j)*G2;
    const x0 = x-(i-t), y0 = y-(j-t);
    const i1 = x0>y0?1:0, j1 = x0>y0?0:1;
    const x1 = x0-i1+G2, y1 = y0-j1+G2;
    const x2 = x0-1+2*G2, y2 = y0-1+2*G2;
    const ii = i&255, jj = j&255;
    let n0=0,n1=0,n2=0;
    let t0=0.5-x0*x0-y0*y0;
    if(t0>0){t0*=t0;const gi=perm[ii+perm[jj]]%8;n0=t0*t0*(grad2[gi][0]*x0+grad2[gi][1]*y0);}
    let t1=0.5-x1*x1-y1*y1;
    if(t1>0){t1*=t1;const gi=perm[ii+i1+perm[jj+j1]]%8;n1=t1*t1*(grad2[gi][0]*x1+grad2[gi][1]*y1);}
    let t2=0.5-x2*x2-y2*y2;
    if(t2>0){t2*=t2;const gi=perm[ii+1+perm[jj+1]]%8;n2=t2*t2*(grad2[gi][0]*x2+grad2[gi][1]*y2);}
    return 70*(n0+n1+n2);
  };
}

function drawOrbSmooth(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo((pts[0].x+pts[pts.length-1].x)/2, (pts[0].y+pts[pts.length-1].y)/2);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i], next = pts[(i+1)%pts.length];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x+next.x)/2, (curr.y+next.y)/2);
  }
  ctx.closePath();
}

function smoothOrbArr(arr, passes) {
  const len = arr.length;
  for (let p = 0; p < passes; p++) {
    const tmp = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      tmp[i] = arr[i]*0.5 + arr[(i-1+len)%len]*0.25 + arr[(i+1)%len]*0.25;
    }
    arr.set(tmp);
  }
}

const KEY_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

const ORB_POINTS = 72;
const ORB_LAYERS = 22;
const ORB_MAX_HITS = 6;

function OrbVisualizer({ isPlaying, trackId, trackTitle, trackArtist, progress, duration, features, onClose, toggle, skip, prev }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const envelopeRef = useRef({ trackId: null, envelope: null });
  const stateRef = useRef({
    noise: createOrbNoise(1), noise2: createOrbNoise(2),
    noise3: createOrbNoise(3), noise4: createOrbNoise(4),
    noise5: createOrbNoise(5),
    time: 0, amp: 0, ampVel: 0,
    tracers: [], hits: [], frame: 0,
    beatAccumulator: 0, lastTs: 0,
  });

  // Generate envelope for this track
  useEffect(() => {
    if (!trackId) return;
    if (envelopeRef.current.trackId === trackId) return;
    const bpm = features?.bpm || 100;
    const energy = features?.energy || 50;
    const dance = features?.danceability || 50;
    const dur = duration > 0 ? duration * 1000 : 210000;
    envelopeRef.current = {
      trackId,
      envelope: generateSongEnvelope(trackId, dur, bpm, energy, dance),
    };
  }, [trackId, features, duration]);

  // Re-seed noise on track change
  useEffect(() => {
    const keyStr = features?.key || "C";
    const keyIdx = KEY_NAMES.indexOf(keyStr.replace("m","").replace("♯","#"));
    const k = (keyIdx >= 0 ? keyIdx : 0) * 100;
    const s = stateRef.current;
    s.noise = createOrbNoise(k+1); s.noise2 = createOrbNoise(k+2);
    s.noise3 = createOrbNoise(k+3); s.noise4 = createOrbNoise(k+4);
    s.noise5 = createOrbNoise(k+5);
    s.tracers = []; s.hits = []; s.time = 0; s.frame = 0;
  }, [trackId]);

  // Keyboard: ESC to close, Space play/pause, arrows skip
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight") skip();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, toggle, skip, prev]);

  // Resize canvas to viewport (DPR-aware)
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Render loop — Deep Amoeba v3
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;
    const N = ORB_POINTS;

    function draw(ts) {
      if (!running) return;
      const s = stateRef.current;
      const dt = s.lastTs > 0 ? Math.min((ts - s.lastTs) / 1000, 0.05) : 0.016;
      s.lastTs = ts;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const baseR = dim * 0.22;

      s.time += 0.016;

      // Audio features (ReccoBeats 0-100 → 0-1)
      const bpm = features?.bpm || 120;
      const energy = (features?.energy || 50) / 100;
      const dance = (features?.danceability || 50) / 100;
      const valence = (features?.valence || 50) / 100;
      const acoustic = (features?.acousticness || 30) / 100;
      const loud = features?.loudness != null ? Math.max(0, (features.loudness + 35) / 35) : 0.65;
      const speech = 0.04;
      const keyStr = features?.key || "C";
      const keyIdx = KEY_NAMES.indexOf(keyStr.replace("m","").replace("♯","#"));
      const keyVal = keyIdx >= 0 ? keyIdx : 0;

      // Envelope
      const env = envelopeRef.current.envelope;
      let envelopeValue = 1;
      if (env && env.length > 0 && isPlaying && progress > 0) {
        const barIndex = Math.min(env.length - 1, Math.floor(progress * env.length));
        envelopeValue = env[barIndex];
      }
      const hasEnvelope = env && env.length > 0 && isPlaying && progress > 0;
      const effectiveEnergy = hasEnvelope ? energy * envelopeValue : energy;

      // Spring amplitude — punchy, snappy response
      const tgt = isPlaying ? (0.5 + effectiveEnergy * 0.5) : 0.0;
      s.ampVel += (tgt - s.amp) * 0.08;
      s.ampVel *= 0.78;
      s.amp += s.ampVel;
      s.amp = Math.max(0, Math.min(1, s.amp));

      // Center drift — wider wander
      const cx = w/2 + s.noise(s.time*0.12, 50) * dim * 0.03;
      const cy = h/2 + s.noise(80, s.time*0.1) * dim * 0.03;
      const rot = s.time * 0.07;

      // Tempo-relative scaling — slow music moves slowly
      const tempoScale = bpm / 120;

      // Beat — local clock with soft Spotify sync (frame-accurate, no polling drift)
      const progressMs = progress * duration * 1000;
      const msPerBeat = 60000 / bpm;
      if (isPlaying) {
        s.beatAccumulator += dt * (bpm / 60);
        // Soft-correct toward Spotify's reported phase
        const spotifyPhase = (progressMs % msPerBeat) / msPerBeat;
        const localPhase = s.beatAccumulator % 1;
        const diff = spotifyPhase - localPhase;
        const wrappedDiff = diff - Math.round(diff);
        s.beatAccumulator += wrappedDiff * 0.03;
      }
      const bPhase = isPlaying ? (s.beatAccumulator % 1) : 1;
      const beatCurve = acoustic > 0.5 ? 2.0 : 2.5; // sharper attack for acoustic
      const beatStrength = Math.max(dance, 0.35 + acoustic * 0.2); // piano gets a floor
      const beat = Math.pow(1 - bPhase, beatCurve) * beatStrength;

      // Exhale
      const remainingMs = (duration * 1000) - progressMs;
      const exhale = remainingMs < 6000 && remainingMs > 0 ? 0.3 + 0.7*(remainingMs/6000) : 1;

      const sharp = 1 - valence;

      // Zone axis slowly rotates — features migrate around the form
      const zoneRot = s.time * 0.008 * tempoScale + (keyVal / 12) * Math.PI * 2;

      const disp = new Float32Array(N);
      const radii = new Float32Array(N);
      const pointWeight = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + rot;
        const nx = Math.cos(a), ny = Math.sin(a);

        // Zone weights — soft cosine blend, 4 zones at 90° intervals
        const za = a - zoneRot;
        const zBass    = Math.max(0, Math.cos(za)) ** 1.5;
        const zRhythm  = Math.max(0, Math.cos(za - Math.PI*0.5)) ** 1.5;
        const zVocal   = Math.max(0, Math.cos(za - Math.PI)) ** 1.5;
        const zTexture = Math.max(0, Math.cos(za - Math.PI*1.5)) ** 1.5;

        // Base warp (3 octaves) — speed tied to tempo
        const d1 = s.noise(nx*0.3, ny*0.3 + s.time*0.002*tempoScale);
        const d2 = s.noise2(nx*0.6+10, ny*0.6 + s.time*0.005*tempoScale);
        const d3 = s.noise3(nx*1.2+30, ny*1.2 + s.time*0.008*tempoScale);
        const irregularity = 0.4 + energy * 0.6;
        radii[i] = baseR * (1 + beat * 0.06) * (1 + (d1*0.5 + d2*0.25 + d3*0.25*irregularity) * s.amp * 0.75);

        // BASS: low freq, big slow, energy × loudness
        const bassN = s.noise(nx*0.8 + s.time*0.12*tempoScale, ny*0.8 + s.time*0.1*tempoScale);
        const bassD = bassN * energy * loud * 1.8;

        // RHYTHM: mid freq, beat-pulsed — tempo-synced movement
        const rhythmN = s.noise2(nx*2.5 + s.time*0.3*tempoScale, ny*2.5 + s.time*0.25*tempoScale);
        const rhythmD = rhythmN * (0.5 + beat * 2.5) * beatStrength * 1.3;

        // VOCAL: high freq when speech present, flatter when instrumental
        const vocalF = 4 + speech * 8;
        const vocalN = s.noise3(nx*vocalF + s.time*0.5*tempoScale, ny*vocalF + s.time*0.4*tempoScale);
        const vocalD = vocalN * (speech * 3 + 0.15) * 0.6;

        // TEXTURE: acoustic=smooth wide, digital=tight sharp
        const texF = 1.5 + (1-acoustic) * 4;
        const texN = s.noise4(nx*texF + s.time*0.2*tempoScale, ny*texF + s.time*0.18*tempoScale);
        const texD = texN * (0.4 + acoustic * 0.6) * 1.1;

        // Blend by zone weights
        let totalD = bassD*zBass + rhythmD*zRhythm + vocalD*zVocal + texD*zTexture;
        const zSum = zBass + zRhythm + zVocal + zTexture;
        if (zSum > 0) totalD /= (zSum * 0.7 + 0.3);

        totalD = Math.sign(totalD) * Math.pow(Math.abs(totalD), 1 + sharp * 0.5);

        disp[i] = totalD * s.amp * (1 + beat*1.2) * exhale * baseR * 1.3;
        disp[i] *= (1 + (Math.random()-0.5) * (0.01 + (1-acoustic)*0.03));

        // Per-point weight — bass/acoustic zones thicker
        pointWeight[i] = 0.7 + zBass*acoustic*0.8 + zTexture*acoustic*0.6 - zVocal*0.2;
      }

      smoothOrbArr(disp, 2);
      smoothOrbArr(radii, 2);

      // Tracers
      s.frame++;
      if (s.frame % 3 === 0 && s.amp > 0.01) {
        s.tracers.push({ d: new Float32Array(disp), r: new Float32Array(radii), w: new Float32Array(pointWeight), op: 0.75, age: 0, hit: false });
        if (s.tracers.length > ORB_LAYERS) s.tracers.shift();
      }

      // Hits
      if (beat > 0.4 && isPlaying && s.frame % 3 === 0) {
        const hd = new Float32Array(N);
        for (let i = 0; i < N; i++) hd[i] = disp[i] * 2.5;
        smoothOrbArr(hd, 1);
        s.hits.push({ d: hd, r: new Float32Array(radii), w: new Float32Array(pointWeight), op: 0.85, age: 0, hit: true });
        if (s.hits.length > ORB_MAX_HITS) s.hits.shift();
      }

      for (const l of s.tracers) { l.age++; l.op *= 0.975; }
      for (const l of s.hits) { l.age++; l.op *= 0.986; }
      s.tracers = s.tracers.filter(l => l.op > 0.01);
      s.hits = s.hits.filter(l => l.op > 0.01);

      // ===== RENDER =====
      ctx.clearRect(0, 0, w, h);

      const baseLw = 1.0 + acoustic * 1.2;
      const col = [78, 75, 68]; // warm grey

      // Silent: light circle
      if (s.amp < 0.03) {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.1 + s.amp*2})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const layers = [
        ...s.tracers, ...s.hits,
        { d: disp, r: radii, w: pointWeight, op: 1.0, age: 0, hit: false },
      ].sort((a, b) => b.age - a.age);

      // Rings (no interior tendrils — preserve hollow center)
      for (const layer of layers) {
        const alpha = Math.max(0, Math.min(1, layer.op));
        if (alpha < 0.01) continue;

        const rShift = layer.age * 0.35;
        const ageFade = Math.max(0, 1 - layer.age * 0.012);

        const pts = [];
        for (let i = 0; i < N; i++) {
          const a = (i/N)*Math.PI*2+rot;
          pts.push({ x: cx+Math.cos(a)*(layer.r[i]+layer.d[i]+rShift), y: cy+Math.sin(a)*(layer.r[i]+layer.d[i]+rShift) });
        }

        const edgeAlpha = alpha * 0.8 * (0.4 + s.amp*0.6);

        // Inward bleed
        drawOrbSmooth(ctx, pts);
        ctx.save(); ctx.clip();
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * 0.12})`;
        ctx.lineWidth = baseLw * (layer.hit ? 1.6 : 1) * ageFade * 4;
        ctx.stroke(); ctx.restore();

        // Smooth contour — continuous stroke (matches terrain's mountain stroke)
        drawOrbSmooth(ctx, pts);
        const avgW = layer.w.reduce((a,b) => a+b, 0) / N;
        const layerAlpha = edgeAlpha * (layer.age === 0 ? (0.5 + s.amp*0.45) * (1 + beat*0.4) : 0.50);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${layerAlpha})`;
        const layerLw = baseLw * (layer.hit?1.5:1) * ageFade * (layer.age===0 ? (0.8+avgW*0.7)*(1+beat*0.3) : (0.5+avgW*0.4));
        ctx.lineWidth = Math.max(0.3, layerLw);
        ctx.stroke();

        // Weight band — thicker stroke on heavy zones only
        if (layer.age === 0 && s.amp > 0.05) {
          for (let i = 0; i < N; i++) {
            if (layer.w[i] < 0.8) continue;
            const i2 = (i+1) % N;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i2].x, pts[i2].y);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${layerAlpha * 0.3})`;
            ctx.lineWidth = layerLw * 1.5;
            ctx.stroke();
          }
        }

        // (reflection removed — was causing center crossover)
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [isPlaying, progress, duration, features]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--color-bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Brand — top left */}
      <div style={{
        position: "absolute", top: 20, left: 28, zIndex: 1,
        display: "flex", alignItems: "center", gap: "var(--space-2)",
      }}>
        <LogoMark size={22} />
        <span style={{
          fontSize: "var(--font-size-base)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tight)",
          color: "var(--color-text-muted)",
        }}>
          Fülkit
        </span>
      </div>

      {/* Close button — top right */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20,
          background: "transparent", border: "none",
          cursor: "pointer", padding: 8, zIndex: 1,
          color: "var(--color-text-dim)",
          transition: "color 200ms",
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
      >
        <X size={20} strokeWidth={1.8} />
      </button>

      {/* Track info — bottom left */}
      <div style={{
        position: "absolute", bottom: 28, left: 28, zIndex: 1,
      }}>
        <div style={{
          fontSize: "var(--font-size-xl)", color: "var(--color-text-muted)",
          fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-bold)",
          letterSpacing: "var(--letter-spacing-tight)",
        }}>
          {trackTitle || ""}
        </div>
        <div style={{
          fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)",
          fontFamily: "var(--font-primary)", opacity: 0.7,
        }}>
          {trackArtist || ""}
        </div>
        {/* Transport — prev / play-pause / next */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12 }}>
          <button onClick={prev} style={{
            width: 36, height: 36, borderRadius: "var(--radius-full)",
            background: "transparent", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, outline: "none",
          }}>
            <ChevronLeft size={18} strokeWidth={2} color="var(--color-text-dim)" />
          </button>
          <button onClick={toggle} style={{
            width: 36, height: 36, borderRadius: "var(--radius-full)",
            background: "transparent", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, outline: "none",
          }}>
            {isPlaying
              ? <PauseLines size={18} strokeWidth={2.5} color="var(--color-text-muted)" />
              : <Play size={18} strokeWidth={2.5} color="var(--color-text-muted)" fill="var(--color-text-muted)" style={{ marginLeft: 1 }} />
            }
          </button>
          <button onClick={skip} style={{
            width: 36, height: 36, borderRadius: "var(--radius-full)",
            background: "transparent", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, outline: "none",
          }}>
            <ChevronRight size={18} strokeWidth={2} color="var(--color-text-dim)" />
          </button>
        </div>
      </div>
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


export default function FabricPage() {
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
    playPlaylist,
    fetchPlaylistTracks,
    formatTime,
    setProgress,
  } = useFabric();

  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragNode = useRef(null);
  const [expandedMix, setExpandedMix] = useState(null);
  const [mixTracks, setMixTracks] = useState([]);
  const [mixLoading, setMixLoading] = useState(false);
  const [visualizing, setVisualizing] = useState(false);

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
      {visualizing && (
        <OrbVisualizer
          isPlaying={isPlaying}
          trackId={currentTrack?.id}
          trackTitle={currentTrack?.title}
          trackArtist={currentTrack?.artist}
          progress={progress}
          duration={currentTrack?.duration || 0}
          features={features}
          onClose={() => setVisualizing(false)}
          toggle={toggle}
          skip={skip}
          prev={prev}
        />
      )}
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

                {/* Visualize — circled */}
                <button
                  onClick={() => setVisualizing(true)}
                  title="Fullscreen visualizer"
                  style={{
                    width: 32, height: 32, borderRadius: "var(--radius-full)",
                    background: "transparent", border: "1px solid var(--color-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0, outline: "none",
                  }}
                >
                  <Maximize2 size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
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
              onVisualize={() => setVisualizing(true)}
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
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  try {
                    const trackData = JSON.parse(e.dataTransfer.getData("application/fulkit-track"));
                    if (trackData && !isFlagged(trackData.id)) flag(trackData);
                  } catch {}
                }}
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
                    {playlists.filter((pl) => pl.tracks > 0).map((pl) => (
                      <button
                        key={pl.id}
                        onClick={async () => {
                          if (expandedMix === pl.id) {
                            setExpandedMix(null);
                            setMixTracks([]);
                            return;
                          }
                          setExpandedMix(pl.id);
                          setMixLoading(true);
                          const tracks = await fetchPlaylistTracks(pl.id);
                          setMixTracks(tracks);
                          setMixLoading(false);
                        }}
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          background: expandedMix === pl.id ? "var(--color-bg-inverse)" : "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          fontFamily: "var(--font-primary)",
                          textAlign: "left",
                          transition: "all 120ms",
                        }}
                      >
                        <div style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: expandedMix === pl.id ? "var(--color-text-inverse)" : "var(--color-text)",
                        }}>
                          {pl.name}
                        </div>
                        <div style={{
                          fontSize: 9,
                          fontFamily: "var(--font-mono)",
                          color: expandedMix === pl.id ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                          marginTop: 1,
                          opacity: expandedMix === pl.id ? 0.7 : 1,
                        }}>
                          {pl.tracks} trk
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Expanded mix track list */}
                  {expandedMix && (
                    <div style={{
                      marginTop: "var(--space-3)",
                      borderTop: "1px solid var(--color-border-light)",
                      paddingTop: "var(--space-3)",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}>
                      {mixLoading ? (
                        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", padding: "var(--space-2) 0" }}>
                          loading...
                        </div>
                      ) : (
                        mixTracks.map((track, i) => {
                          const isActive = currentTrack?.id === track.id;
                          const trackFlagged = isFlagged(track.id);
                          return (
                            <div
                              key={track.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/fulkit-track", JSON.stringify(track));
                                e.currentTarget.style.opacity = "0.4";
                              }}
                              onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-3)",
                                padding: "var(--space-1) var(--space-2)",
                                borderRadius: "var(--radius-sm)",
                                cursor: "grab",
                                background: isActive ? "var(--color-bg-inverse)" : "transparent",
                                transition: "background 120ms",
                              }}
                            >
                              <div style={{
                                fontSize: 8,
                                fontFamily: "var(--font-mono)",
                                color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                                width: 16,
                                flexShrink: 0,
                                opacity: 0.5,
                              }}>
                                {String(i + 1).padStart(2, "0")}
                              </div>
                              <button
                                onClick={() => playTrack(track)}
                                style={{
                                  flex: 1,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  padding: 0,
                                  fontFamily: "var(--font-primary)",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{
                                  fontSize: 10,
                                  fontWeight: "var(--font-weight-semibold)",
                                  color: isActive ? "var(--color-text-inverse)" : "var(--color-text)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                  {track.title}
                                </div>
                                <div style={{
                                  fontSize: 9,
                                  color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  opacity: 0.7,
                                }}>
                                  {track.artist}
                                </div>
                              </button>
                              <button
                                onClick={() => flag(track)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 2,
                                  flexShrink: 0,
                                  color: trackFlagged ? "var(--color-text)" : "var(--color-text-dim)",
                                  opacity: trackFlagged ? 1 : 0.3,
                                  transition: "opacity 120ms",
                                }}
                                title={trackFlagged ? "Remove from crate" : "Add to crate"}
                              >
                                <Plus size={12} strokeWidth={trackFlagged ? 2.5 : 1.5} style={trackFlagged ? { transform: "rotate(45deg)" } : {}} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
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
