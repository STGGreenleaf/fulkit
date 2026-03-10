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
  getSnapshot = null,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);
  const historyRef = useRef([]);
  const phaseRef = useRef(0);
  const noiseRef = useRef(createNoise2D());
  const [canvasWidth, setCanvasWidth] = useState(600);
  // Keep latest props in refs for the render loop
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const progressRef = useRef(progress);
  progressRef.current = progress;

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
      const gsFn = getSnapshotRef.current;
      const curProgress = progressRef.current;
      const snap = gsFn ? gsFn(curProgress) : null;
      const hasFabric = !!snap;
      const bandNames = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];
      const points = [];

      for (let i = 0; i < T_POINTS; i++) {
        const t = i / T_POINTS;

        // Envelope: taper at edges
        const envelope = Math.sin(t * Math.PI);

        let raw;
        if (hasFabric && !live.active) {
          // ── FABRIC MODE: real per-second audio data ──
          const bandPos = t * bandNames.length;
          const bandIdx = Math.floor(bandPos) % bandNames.length;
          const bandNext = (bandIdx + 1) % bandNames.length;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = snap.bands[bandNames[bandIdx]] * (1 - bandFrac) +
                          snap.bands[bandNames[bandNext]] * bandFrac;

          const realLoudness = snap.loudness;
          const transient = snap.onset ? snap.onset_strength * 0.3 : 0;
          const texture = noise2D(t * 6 + keyOffset, phase * 0.4) * 0.12;

          raw = (bandVal * 0.55 + realLoudness * 0.25 + transient + texture);
          raw *= (1 + snap.flux * 0.4);
          raw *= envelope;
        } else {
          // ── PROCEDURAL / MIC MODE ──
          const n1 = noise2D(t * 4 + keyOffset, phase * 0.3) * 0.5;
          const n2 = noise2D(t * 8 + 100, phase * 0.5) * 0.25;
          const n3 = noise2D(t * 16 + 200, phase * 0.8) * 0.125;
          raw = n1 + n2 + n3;
          raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);
          raw = Math.abs(raw) * envelope;
        }

        // Beat pulse modulation
        const beatBoost = hasFabric
          ? (1 + (snap.beat ? snap.beat_strength * 0.8 : beatPulse * 0.3))
          : (1 + beatPulse * danceability * 0.4);

        // Combine layers
        let amp;
        if (!hasFabric && live.active && (liveBass + liveMids) > 0.01) {
          // Layer 3: multi-band terrain modulation (mic input)
          const liveBlend = Math.min(1, (liveBass + liveMids * 0.5) * 3);
          const puppeted = Math.abs(raw) * k.amplitude * exhaleMultiplier * beatBoost;
          const liveRaw = raw * (1 + livePresence * 0.5);
          const liveDisp = Math.abs(liveRaw) * Math.min(1.0, liveBass * 2.5 + liveMids * 0.8) * (1 + liveFlux * 2.5);
          const jitter = (Math.random() - 0.5) * liveAir * 0.15;
          amp = puppeted * (1 - liveBlend * 0.7) + (liveDisp + jitter) * liveBlend * 0.7;
        } else {
          amp = Math.abs(raw) * k.amplitude * exhaleMultiplier * beatBoost;
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
// ORB VISUALIZER — Radial Terrain
// Signal Terrain's exact engine wrapped into a seamless
// 360° circle. Mountains push outward, reflections
// mirror inward. Same noise, same alpha/weight curves,
// same stacked-mountain aesthetic.
// ═══════════════════════════════════════════════════════

const ORB_R_POINTS = 100;
const ORB_R_LAYERS = 55;

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

function OrbVisualizer({ isPlaying, trackId, trackTitle, trackArtist, progress, duration, features, getSnapshot, onClose, toggle, skip, prev }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const historyRef = useRef([]);
  const phaseRef = useRef(0);
  const noiseRef = useRef(createNoise2D());
  const envelopeRef = useRef({ trackId: null, envelope: null });
  // Keep latest props in refs so the render loop always reads current values
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const kineticRef = useRef({
    amplitude: 0.08,
    target: 0.08,
    state: "idle",
    stateStart: 0,
    prevPlaying: false,
    prevTrackId: null,
    beatAccumulator: 0,
    lastTs: 0,
  });

  // Envelope — same as terrain
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

  // New noise on track change — history fades naturally via kinetic wind-down
  useEffect(() => {
    noiseRef.current = createNoise2D();
    const k = kineticRef.current;
    if (k.prevTrackId && k.prevTrackId !== trackId && k.prevPlaying) {
      k.state = "skip-cut";
      k.stateStart = performance.now();
      k.target = 0;
    }
    k.prevTrackId = trackId;
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

  // Canvas DPR setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Render loop — Radial Terrain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;
    const N = ORB_R_POINTS;

    function draw(ts) {
      if (!running) return;
      animRef.current = requestAnimationFrame(draw);

      const noise2D = noiseRef.current;
      const k = kineticRef.current;
      const dt = k.lastTs > 0 ? Math.min((ts - k.lastTs) / 1000, 0.05) : 0.016;
      k.lastTs = ts;
      const w = window.innerWidth, h = window.innerHeight;
      const dim = Math.min(w, h);
      const baseR = dim * 0.18;

      // ── Kinetic state machine (mirrors terrain exactly) ──
      const now = ts;
      const elapsed = now - k.stateStart;

      if (isPlaying && !k.prevPlaying && k.state !== "skip-spool") {
        k.state = "spool-up"; k.stateStart = now; k.target = 0.55;
      } else if (!isPlaying && k.prevPlaying) {
        k.state = "wind-down"; k.stateStart = now; k.target = 0.12;
      }
      k.prevPlaying = isPlaying;

      if (k.state === "spool-up" && elapsed > 600) k.state = "active";
      else if (k.state === "wind-down" && elapsed > 800) k.state = "idle";
      else if (k.state === "skip-cut" && elapsed > 200) { k.state = "skip-silence"; k.stateStart = now; k.target = 0.02; }
      else if (k.state === "skip-silence" && elapsed > 200) { k.state = "skip-spool"; k.stateStart = now; k.target = 0.55; }
      else if (k.state === "skip-spool" && elapsed > 400) { k.state = isPlaying ? "active" : "idle"; k.target = isPlaying ? 0.55 : 0.12; }

      const smoothRate = k.state === "skip-cut" ? 0.2 : 0.06;
      k.amplitude += (k.target - k.amplitude) * smoothRate;

      // Exhale
      let exhale = 1;
      if (isPlaying && duration > 0 && progress > 0) {
        const remaining = duration * (1 - progress);
        if (remaining < 6 && remaining > 0) exhale = 0.3 + 0.7 * (remaining / 6);
      }

      // Envelope
      const env = envelopeRef.current.envelope;
      let envelopeValue = 1;
      if (env && env.length > 0 && isPlaying && progress > 0) {
        envelopeValue = env[Math.min(env.length - 1, Math.floor(progress * env.length))];
      }

      // ── Audio features ──
      const bpm = features?.bpm || 100;
      const energy = (features?.energy || 50) / 100;
      const valence = (features?.valence || 50) / 100;
      const danceability = (features?.danceability || 50) / 100;
      const loudness = features?.loudness || -15;
      const acousticness = (features?.acousticness || 30) / 100;
      const keyOffset = (features?.key?.charCodeAt(0) || 0) * 0.1;

      // Beat — local clock with soft Spotify sync (frame-accurate)
      const progressMs = progress * duration * 1000;
      const msPerBeat = 60000 / bpm;
      if (isPlaying) {
        k.beatAccumulator += dt * (bpm / 60);
        const spotifyPhase = (progressMs % msPerBeat) / msPerBeat;
        const localPhase = k.beatAccumulator % 1;
        const diff = spotifyPhase - localPhase;
        k.beatAccumulator += (diff - Math.round(diff)) * 0.03;
      }
      const beatPhase = isPlaying ? (k.beatAccumulator % 1) : 1;
      const beatCurve = acousticness > 0.5 ? 2.0 : 2.5;
      const beatStrength = Math.max(danceability, 0.35 + acousticness * 0.2);
      const beatPulse = Math.pow(1 - beatPhase, beatCurve) * beatStrength;

      // Amplitude ceiling (envelope-driven when available)
      const hasEnvelope = env && env.length > 0 && isPlaying && progress > 0;
      const amplitudeCeiling = hasEnvelope ? 0.2 + envelopeValue * 0.6 : 0.2 + energy * 0.6;
      const normalizedLoudness = Math.max(0, (loudness + 35) / 35);
      const amplitudeFloor = 0.05 + normalizedLoudness * 0.15;
      const sharpness = 1 - valence;

      // Phase advance — BPM-synced (60fps), freeze when idle
      const tempoScale = bpm / 120;
      const beatsPerSec = bpm / 60;
      const shouldAnimate = k.state !== "idle";
      if (shouldAnimate) {
        const phaseStep = isPlaying ? (beatsPerSec / 60) * 0.15 * tempoScale : 0.002;
        phaseRef.current += phaseStep;
      }
      const phase = phaseRef.current;

      // ── Generate circular terrain points ──
      // When Fabric timeline data is available, use REAL per-second audio data.
      // Otherwise fall back to procedural noise.
      const gsFn = getSnapshotRef.current;
      const curProgress = progressRef.current;
      const snap = gsFn ? gsFn(curProgress) : null;
      const hasFabric = !!snap;
      const points = [];

      // Band names mapped to angular zones (7 bands distributed around circle)
      const bandNames = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const cnx = Math.cos(th), sny = Math.sin(th);

        let raw;
        if (hasFabric) {
          // ── FABRIC MODE: real audio data ──
          // Map angular position to frequency band blend
          const bandPos = (i / N) * bandNames.length;
          const bandIdx = Math.floor(bandPos) % bandNames.length;
          const bandNext = (bandIdx + 1) % bandNames.length;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = snap.bands[bandNames[bandIdx]] * (1 - bandFrac) +
                          snap.bands[bandNames[bandNext]] * bandFrac;

          // Real loudness drives amplitude, band distribution drives shape
          const realLoudness = snap.loudness;
          // Onset/flux adds transient spikes
          const transient = snap.onset ? snap.onset_strength * 0.4 : 0;
          // Noise adds organic texture on top of real data
          const texture = noise2D(cnx * 4 + keyOffset, sny * 4 + phase * 0.4) * 0.15;

          raw = (bandVal * 0.6 + realLoudness * 0.25 + transient + texture);
          // Flux adds spectral change excitement
          raw *= (1 + snap.flux * 0.5);
        } else {
          // ── PROCEDURAL MODE: noise-based (fallback) ──
          const n1 = noise2D(cnx * 2 + keyOffset, sny * 2 + phase * 0.3) * 0.5;
          const n2 = noise2D(cnx * 4 + 100, sny * 4 + phase * 0.5) * 0.25;
          const n3 = noise2D(cnx * 8 + 200, sny * 8 + phase * 0.8) * 0.125;
          raw = n1 + n2 + n3;
          raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);
        }

        // Beat boost
        const beatBoost = hasFabric
          ? (1 + (snap.beat ? snap.beat_strength * 1.2 : beatPulse * 0.5))
          : (1 + beatPulse * 0.8);

        // Combine
        let amp = Math.abs(raw) * k.amplitude * exhale * beatBoost;
        amp = Math.min(amp, amplitudeCeiling);
        amp = Math.max(amp, isPlaying ? amplitudeFloor * 0.3 : 0.02);
        amp *= 1 + (Math.random() - 0.5) * 0.08;

        points.push(Math.max(0, Math.min(1, amp)));
      }

      // Only push new layers when animating — freeze in place when idle
      if (shouldAnimate) {
        historyRef.current.push(points);
        if (historyRef.current.length > ORB_R_LAYERS) historyRef.current.shift();
      }

      // ── Render ──
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const rot = phase * 0.3; // slow rotation, BPM-linked

      // Amoeba base deformation — acousticness drives organic shape
      const amoebaMag = 0.03 + acousticness * 0.06;
      const col = [78, 75, 68]; // warm grey
      const layers = historyRef.current;
      const layerCount = layers.length;

      // Draw back to front (oldest first → newest on top, darkest)
      for (let l = 0; l < layerCount; l++) {
        const data = layers[l];
        const age = l / Math.max(1, layerCount - 1); // 0=oldest, 1=newest
        const outShift = (layerCount - 1 - l) * 4.5; // older → pushed way outward

        // Alpha/width — bold newest, visible oldest
        const alpha = 0.03 + age * age * 0.55;
        const baseLw = 0.4 + age * 1.4;
        const lw = baseLw * (0.7 + acousticness * 0.6);

        // ── Outward mountains ──
        // Older layers morph: noise distortion grows with age so shape evolves
        const ageMorph = (1 - age) * 0.3; // oldest get most distortion
        const outPts = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2 + rot;
          const aR = baseR * (1 + beatPulse * 0.06) * (1 + noise2D(Math.cos(th) * 1.5, Math.sin(th) * 1.5 + phase * 0.05) * amoebaMag);
          let displacement = data[i] * baseR * 1.8;
          // Shape evolution — older layers warp via noise offset by layer index
          if (ageMorph > 0.01) {
            displacement += noise2D(Math.cos(th) * 3 + l * 0.7, Math.sin(th) * 3 + l * 0.7) * baseR * ageMorph;
          }
          const r = aR + displacement + outShift;
          outPts.push({ x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r });
        }

        drawOrbSmooth(ctx, outPts);
        const isNewest = l === layerCount - 1;
        const drawAlpha = isNewest ? alpha * (1 + beatPulse * 0.5) : alpha;
        const drawLw = isNewest ? lw * (1 + beatPulse * 0.4) : lw;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${drawAlpha})`;
        ctx.lineWidth = drawLw;
        ctx.stroke();

        // ── Inward reflection — gentle flame toward center ──
        const inMorph = (1 - age) * 0.12;
        const inPts = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2 + rot;
          const cnTh = Math.cos(th), snTh = Math.sin(th);
          const aR = baseR * (1 + noise2D(cnTh * 1.5, snTh * 1.5 + phase * 0.05) * amoebaMag);

          let inDisp = data[i] * baseR * 0.85;
          inDisp *= (1 + beatPulse * 0.25);

          if (inMorph > 0.01) {
            inDisp += noise2D(cnTh * 3 + l * 0.7 + 500, snTh * 3 + l * 0.7 + 500) * baseR * inMorph;
          }

          const inShift = (layerCount - 1 - l) * 1.2;
          const r = Math.max(baseR * 0.06, aR - inDisp - inShift);
          inPts.push({ x: cx + cnTh * r, y: cy + snTh * r });
        }

        drawOrbSmooth(ctx, inPts);
        // Fade to invisible toward center
        const inAlpha = 0.01 + age * age * 0.32;
        const inLw = (0.2 + age * 0.9) * (0.7 + acousticness * 0.6);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${isNewest ? inAlpha * (1 + beatPulse * 0.3) : inAlpha})`;
        ctx.lineWidth = isNewest ? inLw * (1 + beatPulse * 0.2) : inLw;
        ctx.stroke();
      }
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
    timeline,
    getSnapshot,
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
          getSnapshot={getSnapshot}
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
              getSnapshot={getSnapshot}
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
