"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Play, ChevronLeft, ChevronRight, Plus, Check, X, Disc, Ear, ExternalLink, Maximize2, Package, PackageOpen, Download, ListX, ChevronDown, Crown, MessageCircle, Send } from "lucide-react";
import { createNoise2D } from "simplex-noise";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import LogoMark from "../../components/LogoMark";
import { useFabric } from "../../lib/fabric";
import { useAuth } from "../../lib/auth";

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
        const envelope = Math.sin(t * Math.PI);

        let amp;
        if (hasFabric && !live.active) {
          // ── FABRIC MODE: real audio drives everything ──
          const bandPos = t * bandNames.length;
          const bandIdx = Math.floor(bandPos) % bandNames.length;
          const bandNext = (bandIdx + 1) % bandNames.length;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = snap.bands[bandNames[bandIdx]] * (1 - bandFrac) +
                          snap.bands[bandNames[bandNext]] * bandFrac;

          const realLoud = snap.loudness;
          const texture = noise2D(t * 5 + keyOffset, phase * 0.3) * 0.1;
          const onsetSpike = snap.onset ? snap.onset_strength * 0.4 : 0;

          // Real loudness IS the envelope — no procedural ceiling
          amp = (bandVal * 0.5 + realLoud * 0.35 + onsetSpike + texture) * realLoud;
          amp *= (1 + snap.flux * 0.6);
          if (snap.beat) amp *= (1 + snap.beat_strength * 0.5);
          amp *= envelope; // taper at edges
          amp *= k.amplitude / 0.55; // kinetic gate
          amp *= exhaleMultiplier;
          amp = Math.max(amp, isPlaying ? 0.005 : 0);
          amp *= 1 + (Math.random() - 0.5) * 0.06;
        } else {
          // ── PROCEDURAL / MIC MODE ──
          const n1 = noise2D(t * 4 + keyOffset, phase * 0.3) * 0.5;
          const n2 = noise2D(t * 8 + 100, phase * 0.5) * 0.25;
          const n3 = noise2D(t * 16 + 200, phase * 0.8) * 0.125;
          let raw = n1 + n2 + n3;
          raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);
          raw = Math.abs(raw) * envelope;

          const beatBoost = 1 + beatPulse * danceability * 0.4;

          if (live.active && (liveBass + liveMids) > 0.01) {
            const liveBlend = Math.min(1, (liveBass + liveMids * 0.5) * 3);
            const puppeted = raw * k.amplitude * exhaleMultiplier * beatBoost;
            const liveRaw = raw * (1 + livePresence * 0.5);
            const liveDisp = Math.abs(liveRaw) * Math.min(1.0, liveBass * 2.5 + liveMids * 0.8) * (1 + liveFlux * 2.5);
            const jitter = (Math.random() - 0.5) * liveAir * 0.15;
            amp = puppeted * (1 - liveBlend * 0.7) + (liveDisp + jitter) * liveBlend * 0.7;
          } else {
            amp = raw * k.amplitude * exhaleMultiplier * beatBoost;
          }
          amp = Math.min(amp, amplitudeCeiling);
          amp = Math.max(amp, isPlaying ? amplitudeFloor * envelope * 0.3 : 0);
          amp *= 1 + (Math.random() - 0.5) * 0.1;
        }

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

        const maxUp = centerY - 4; // max upward reach (leave 4px margin at top)
        const maxDown = (h - centerY) - 4; // max downward reach (leave 4px margin at bottom)
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = Math.min(data[i] * centerY * 1.6, maxUp - yShift);
          const y = centerY - a - yShift;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = ((i - 1) / (data.length - 1)) * w;
            const prevA = Math.min(data[i - 1] * centerY * 1.4, maxUp - yShift);
            const prevY = centerY - prevA - yShift;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        const lastA = Math.min(data[data.length - 1] * centerY * 1.4, maxUp - yShift);
        ctx.lineTo(w, centerY - lastA - yShift);
        ctx.stroke();

        // Reflection
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha * 0.35})`;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = Math.min(data[i] * centerY * 0.38, maxDown - (layers.length - 1 - l) * 0.4 - 1);
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
    <div ref={containerRef} style={{ width: "100%", position: "relative", overflow: "hidden" }}>
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

function OrbVisualizer({ isPlaying, trackId, trackTitle, trackArtist, progress, duration, features, getSnapshot, hasFabricData, onClose, toggle, skip, prev }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const historyRef = useRef([]);
  const phaseRef = useRef(0);
  const noiseRef = useRef(createNoise2D());
  const envelopeRef = useRef({ trackId: null, envelope: null });
  const style2Ref = useRef({ noise2: createNoise2D(), tracers: [], hits: [], frame: 0, time: 0, amp: 0, ampVel: 0 });
  const [vizStyle, setVizStyle] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlViz = params.get("viz");
      if (urlViz) { localStorage.setItem("fulkit-viz-style", urlViz); return parseInt(urlViz) || 1; }
      return parseInt(localStorage.getItem("fulkit-viz-style")) || 1;
    } catch { return 1; }
  });
  // Keep latest props in refs so the render loop always reads current values
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const vizStyleRef = useRef(vizStyle);
  vizStyleRef.current = vizStyle;
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
    // Reset style 2 state on track change
    const s2 = style2Ref.current;
    s2.noise2 = createNoise2D();
    s2.tracers = [];
    s2.hits = [];
    s2.frame = 0;
    s2.amp = 0;
    s2.ampVel = 0;
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
        k.state = "wind-down"; k.stateStart = now; k.target = 0.08;
      }
      k.prevPlaying = isPlaying;

      if (k.state === "spool-up" && elapsed > 600) k.state = "active";
      else if (k.state === "wind-down" && elapsed > 1200) { k.state = "idle"; k.target = 0.08; }
      else if (k.state === "skip-cut" && elapsed > 200) { k.state = "skip-silence"; k.stateStart = now; k.target = 0.02; }
      else if (k.state === "skip-silence" && elapsed > 200) { k.state = "skip-spool"; k.stateStart = now; k.target = 0.55; }
      else if (k.state === "skip-spool" && elapsed > 400) { k.state = isPlaying ? "active" : "idle"; k.target = isPlaying ? 0.55 : 0.08; }

      const smoothRate = k.state === "skip-cut" ? 0.2 : 0.06;
      k.amplitude += (k.target - k.amplitude) * smoothRate;

      // Exhale — fade out over last 10 seconds of track
      let exhale = 1;
      if (isPlaying && duration > 0 && progress > 0) {
        const remaining = duration * (1 - progress);
        if (remaining < 10 && remaining > 0) exhale = Math.pow(remaining / 10, 1.5);
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

      // Phase advance — BPM-synced (60fps), slow during wind-down, stop at idle
      const tempoScale = bpm / 120;
      const beatsPerSec = bpm / 60;
      if (k.state !== "idle") {
        const phaseStep = isPlaying ? (beatsPerSec / 60) * 0.15 * tempoScale : 0.001;
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
      const curVizStyle = vizStyleRef.current;

      // ══════════════════════════════════════════
      // STYLE 2: Deep Amoeba — tendrils, tracers, clip contours
      // Uses SHARED kinetic state machine (k.amplitude, beatPulse, exhale)
      // ══════════════════════════════════════════
      if (curVizStyle === 2) {
        const s2 = style2Ref.current;
        const noise2B = s2.noise2;
        const S2_N = 72;
        const MAX_TRACE = 24;
        const MAX_HITS = 6;
        const CAP_INTERVAL = 3;

        // Own time counter for noise evolution (~1.0/sec)
        if (k.state !== "idle") s2.time += dt;

        const cx = w / 2;
        const cy = h / 2;
        const rot = s2.time * 0.04;
        const col = [62, 60, 56];
        const lw = 1.0 + acousticness * 1.3;

        // Normalized amplitude for style 2 scaling (active = ~1.0)
        const s2amp = k.amplitude / 0.55;

        // Build displacement arrays
        const disp = new Float32Array(S2_N);
        const radii = new Float32Array(S2_N);
        const bandNames2 = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

        for (let i = 0; i < S2_N; i++) {
          const a = (i / S2_N) * Math.PI * 2 + rot;
          const nx = Math.cos(a), ny = Math.sin(a);

          // Amoeba base warp — 3 octaves of noise, amplitude-gated
          const d1 = noise2D(nx * 0.3, ny * 0.3 + s2.time * 0.002);
          const d2 = noise2B(nx * 0.6 + 10, ny * 0.6 + s2.time * 0.005);
          const d3 = noise2D(nx * 1.2 + 30, ny * 1.2 + s2.time * 0.008);
          const warp = s2amp * 0.55;
          const irregularity = 0.5 + energy * 0.5;
          radii[i] = baseR * (1 + (d1 * 0.5 + d2 * 0.25 + d3 * 0.25 * irregularity) * warp);

          // Displacement
          let nv;
          if (hasFabric) {
            const bandPos = (i / S2_N) * bandNames2.length;
            const bandIdx = Math.floor(bandPos) % bandNames2.length;
            const bandNext = (bandIdx + 1) % bandNames2.length;
            const bandFrac = bandPos - Math.floor(bandPos);
            const bandVal = snap.bands[bandNames2[bandIdx]] * (1 - bandFrac) +
                            snap.bands[bandNames2[bandNext]] * bandFrac;
            const texture = noise2D(nx * 1.2 + s2.time * 0.25, ny * 1.2 + s2.time * 0.18) * 0.15;
            const onsetSpike = snap.onset ? snap.onset_strength * 0.5 : 0;
            nv = (bandVal * 0.5 + snap.loudness * 0.35 + onsetSpike + texture) * snap.loudness;
            nv *= (1 + snap.flux * 0.8);
            if (snap.beat) nv *= (1 + snap.beat_strength * 0.6);
          } else {
            const n1 = noise2D(nx * 1.2 + s2.time * 0.25, ny * 1.2 + s2.time * 0.18);
            const n2 = noise2D(nx * 3.5 + s2.time * 0.45, ny * 3.5 + s2.time * 0.35);
            nv = n1 * 0.9 + n2 * 0.2;
            nv = Math.sign(nv) * Math.pow(Math.abs(nv), 1 + sharpness * 0.6);
          }

          const beatBoost = 1 + beatPulse * 0.7;
          disp[i] = nv * s2amp * energy * beatBoost * exhale * baseR * 0.85;
          disp[i] *= (1 + (Math.random() - 0.5) * 0.05);
        }

        // Neighbor-smooth (2 passes)
        for (let pass = 0; pass < 2; pass++) {
          const tmpD = new Float32Array(S2_N);
          const tmpR = new Float32Array(S2_N);
          for (let i = 0; i < S2_N; i++) {
            const p = (i - 1 + S2_N) % S2_N;
            const n = (i + 1) % S2_N;
            tmpD[i] = disp[i] * 0.5 + disp[p] * 0.25 + disp[n] * 0.25;
            tmpR[i] = radii[i] * 0.5 + radii[p] * 0.25 + radii[n] * 0.25;
          }
          disp.set(tmpD);
          radii.set(tmpR);
        }

        // Capture tracers — only when active/spooling
        const isS2Active = k.state === "active" || k.state === "spool-up" || k.state === "skip-spool";
        const isS2Winding = k.state === "wind-down" || k.state === "skip-cut" || k.state === "skip-silence";
        s2.frame++;
        if (s2.frame % CAP_INTERVAL === 0 && isS2Active) {
          s2.tracers.push({ d: new Float32Array(disp), r: new Float32Array(radii), op: 0.6, age: 0, hit: false });
          if (s2.tracers.length > MAX_TRACE) s2.tracers.shift();
        }

        // Hit layers on strong beats (only when active)
        if (beatPulse > 0.65 && isS2Active && s2.frame % CAP_INTERVAL === 0) {
          const hd = new Float32Array(S2_N);
          for (let i = 0; i < S2_N; i++) hd[i] = disp[i] * 2.0;
          for (let pass = 0; pass < 2; pass++) {
            const tmp = new Float32Array(S2_N);
            for (let i = 0; i < S2_N; i++) {
              tmp[i] = hd[i] * 0.5 + hd[(i - 1 + S2_N) % S2_N] * 0.25 + hd[(i + 1) % S2_N] * 0.25;
            }
            hd.set(tmp);
          }
          s2.hits.push({ d: hd, r: new Float32Array(radii), op: 0.8, age: 0, hit: true });
          if (s2.hits.length > MAX_HITS) s2.hits.shift();
        }

        // Age and drain — faster when winding down, drain in idle
        const ageRate = isS2Winding ? 0.92 : 0.96;
        const hitAgeRate = isS2Winding ? 0.95 : 0.984;
        for (const l of s2.tracers) { l.age++; l.op *= ageRate; }
        for (const l of s2.hits) { l.age++; l.op *= hitAgeRate; }
        s2.tracers = s2.tracers.filter(l => l.op > 0.015);
        s2.hits = s2.hits.filter(l => l.op > 0.015);
        // Drain in idle
        if (k.state === "idle") {
          if (s2.tracers.length > 0) s2.tracers.shift();
          if (s2.hits.length > 0) s2.hits.shift();
        }

        // ── RENDER ──
        ctx.clearRect(0, 0, w, h);

        // Silent/idle state — thin resting circle
        if (s2amp < 0.05 && s2.tracers.length === 0 && s2.hits.length === 0) {
          const silentAlpha = 0.12;
          ctx.beginPath();
          ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${silentAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          animRef.current = requestAnimationFrame(draw);
          return;
        }

        // Interior tendrils
        if (s2amp > 0.05) {
          const interiorAlpha = s2amp * 0.12;
          for (let i = 0; i < S2_N; i += 7) {
            const opp = (i + Math.floor(S2_N / 2)) % S2_N;
            const a1 = (i / S2_N) * Math.PI * 2 + rot;
            const a2 = (opp / S2_N) * Math.PI * 2 + rot;
            const r1 = radii[i] * 0.6 + disp[i] * 0.3;
            const r2 = radii[opp] * 0.6 + disp[opp] * 0.3;
            const x1 = cx + Math.cos(a1) * r1, y1 = cy + Math.sin(a1) * r1;
            const x2 = cx + Math.cos(a2) * r2, y2 = cy + Math.sin(a2) * r2;
            const cpOff = noise2D(i * 0.5, s2.time * 0.3) * baseR * 0.3 * s2amp;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx + cpOff, cy + cpOff * 0.7, x2, y2);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${interiorAlpha * (0.3 + Math.abs(disp[i]) / baseR)})`;
            ctx.lineWidth = 0.5 + acousticness * 0.5;
            ctx.stroke();
          }
        }

        // All layers sorted oldest-first
        const allLayers = [
          ...s2.tracers, ...s2.hits,
          ...(s2amp > 0.02 ? [{ d: disp, r: radii, op: 1.0, age: 0, hit: false }] : []),
        ].sort((a, b) => b.age - a.age);

        for (const layer of allLayers) {
          const alpha = Math.max(0, Math.min(1, layer.op));
          if (alpha < 0.01) continue;

          const rShift = layer.age * 0.35;
          const ageFade = Math.max(0, 1 - layer.age * 0.01);
          const thisLw = lw * (layer.hit ? 1.6 : 1) * ageFade;

          const pts = [];
          for (let i = 0; i < S2_N; i++) {
            const a = (i / S2_N) * Math.PI * 2 + rot;
            const r = layer.r[i] + layer.d[i] - rShift;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }

          // Clip-based inner bleed
          const edgeAlpha = alpha * 0.8 * (0.4 + s2amp * 0.6);
          drawOrbSmooth(ctx, pts);
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * 0.12})`;
          ctx.lineWidth = thisLw * 4;
          ctx.stroke();
          ctx.restore();

          // Sharp contour
          drawOrbSmooth(ctx, pts);
          const contourPeak = 0.5 + s2amp * 0.45;
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${edgeAlpha * (layer.age === 0 ? contourPeak : 0.45)})`;
          ctx.lineWidth = Math.max(0.3, thisLw * (layer.age === 0 ? 1.0 + s2amp * 0.5 : 0.7));
          ctx.stroke();

          // Inward reflection
          if (alpha > 0.06) {
            const iPts = [];
            for (let i = 0; i < S2_N; i++) {
              const a = (i / S2_N) * Math.PI * 2 + rot;
              const r = Math.max(0, layer.r[i] - layer.d[i] * 0.35 + rShift * 0.3);
              iPts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
            }
            drawOrbSmooth(ctx, iPts);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.04})`;
            ctx.lineWidth = thisLw * 2.5;
            ctx.stroke();
          }
        }

        animRef.current = requestAnimationFrame(draw);
        return;
      }

      // ══════════════════════════════════════════
      // STYLE 1: Radial Terrain — stacked mountain rings
      // ══════════════════════════════════════════
      const points = [];

      // Band names mapped to angular zones (7 bands distributed around circle)
      const bandNames = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const cnx = Math.cos(th), sny = Math.sin(th);

        let raw;
        let amp;
        if (hasFabric) {
          // ── FABRIC MODE: real audio drives everything ──
          const bandPos = (i / N) * bandNames.length;
          const bandIdx = Math.floor(bandPos) % bandNames.length;
          const bandNext = (bandIdx + 1) % bandNames.length;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = snap.bands[bandNames[bandIdx]] * (1 - bandFrac) +
                          snap.bands[bandNames[bandNext]] * bandFrac;

          // Real loudness IS the amplitude — no procedural ceiling
          const realLoud = snap.loudness;

          // Band shape: different frequencies push different parts of the form
          // Noise adds organic texture so it doesn't look robotic
          const texture = noise2D(cnx * 3 + keyOffset, sny * 3 + phase * 0.3) * 0.12;

          // Onset spikes — piano hits, kicks, transients
          const onsetSpike = snap.onset ? snap.onset_strength * 0.5 : 0;

          // Base shape from frequency content + loudness envelope
          amp = (bandVal * 0.5 + realLoud * 0.35 + onsetSpike + texture) * realLoud;

          // Flux excitement — spectral change makes the form wilder
          amp *= (1 + snap.flux * 0.8);

          // Beat pulse from actual beat positions
          if (snap.beat) amp *= (1 + snap.beat_strength * 0.6);

          // Kinetic gate — spool up / wind down still applies
          amp *= k.amplitude / 0.55; // normalize so active state = 1.0
          amp *= exhale;

          // Hard floor so it doesn't vanish in quiet passages
          amp = Math.max(amp, isPlaying ? 0.01 : 0.005);
          amp *= 1 + (Math.random() - 0.5) * 0.06;
        } else {
          // ── PROCEDURAL MODE: noise-based (fallback) ──
          const n1 = noise2D(cnx * 2 + keyOffset, sny * 2 + phase * 0.3) * 0.5;
          const n2 = noise2D(cnx * 4 + 100, sny * 4 + phase * 0.5) * 0.25;
          const n3 = noise2D(cnx * 8 + 200, sny * 8 + phase * 0.8) * 0.125;
          let raw = n1 + n2 + n3;
          raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);

          const beatBoost = 1 + beatPulse * 0.8;
          amp = Math.abs(raw) * k.amplitude * exhale * beatBoost;
          amp = Math.min(amp, amplitudeCeiling);
          amp = Math.max(amp, isPlaying ? amplitudeFloor * 0.3 : 0.02);
          amp *= 1 + (Math.random() - 0.5) * 0.08;
        }

        points.push(Math.max(0, Math.min(1, amp)));
      }

      // Wind-down: keep pushing frames (shrinking amplitude) + drain old layers
      // Idle: drain remaining layers until only a thin resting ring remains
      const isWindingDown = k.state === "wind-down" || k.state === "skip-cut" || k.state === "skip-silence";
      if (k.state === "active" || k.state === "spool-up" || k.state === "skip-spool") {
        // Active: normal layer management
        historyRef.current.push(points);
        if (historyRef.current.length > ORB_R_LAYERS) historyRef.current.shift();
      } else if (isWindingDown) {
        // Wind-down: push quieting frames + drain 2 old layers per frame for fade
        historyRef.current.push(points);
        if (historyRef.current.length > 3) historyRef.current.shift();
        if (historyRef.current.length > 3) historyRef.current.shift();
      } else if (k.state === "idle") {
        // Idle: drain down to 3 layers — keep a gentle resting ring visible
        if (historyRef.current.length > 3) {
          historyRef.current.shift();
        }
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
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
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
        {hasFabricData && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--color-text-dim)",
            opacity: 0.5,
            textTransform: "uppercase",
            marginLeft: 4,
          }}>
            Fabric
          </span>
        )}
      </div>

      {/* Viz style selector — top center */}
      <div style={{
        position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 2, zIndex: 1,
      }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => { if (n <= 2) { setVizStyle(n); try { localStorage.setItem("fulkit-viz-style", String(n)); } catch {} } }}
            style={{
              width: 28, height: 28,
              background: "transparent",
              border: "none",
              color: vizStyle === n ? "var(--color-text-muted)" : "var(--color-text-dim)",
              fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
              cursor: n <= 2 ? "pointer" : "default",
              padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity 200ms",
              opacity: n <= 2 ? (vizStyle === n ? 1 : 0.5) : 0.25,
            }}
          >
            {n}
          </button>
        ))}
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
    allSets,
    activeSetId,
    createSet,
    deleteSet,
    renameSet,
    switchSet,
    playTrack,
    playPlaylist,
    fetchPlaylistTracks,
    formatTime,
    setProgress,
    timeline,
    getSnapshot,
    publishedSets,
    publishSet,
    unpublishSet,
    musicMessages,
    musicChatOpen,
    musicStreaming,
    tickerFact,
    sendMusicMessage,
    toggleMusicChat,
  } = useFabric();

  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragNode = useRef(null);
  const [expandedMix, setExpandedMix] = useState(null);
  const [mixTracks, setMixTracks] = useState([]);
  const [mixLoading, setMixLoading] = useState(false);
  const [visualizing, setVisualizing] = useState(false);
  const [showSpotifyBrowser, setShowSpotifyBrowser] = useState(false);
  const [importing, setImporting] = useState(null); // playlist id being imported
  const [showSetMenu, setShowSetMenu] = useState(false);
  const [renamingSet, setRenamingSet] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [crates, setCrates] = useState([]); // imported crates from DB
  const [cratesLoading, setCratesLoading] = useState(true);
  const [expandedCrate, setExpandedCrateRaw] = useState(() => {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem("fulkit-expanded-crate") || null; } catch { return null; }
  });
  const setExpandedCrate = useCallback((id) => {
    setExpandedCrateRaw(id);
    try { if (id) localStorage.setItem("fulkit-expanded-crate", id); else localStorage.removeItem("fulkit-expanded-crate"); } catch {}
  }, []);
  const [crateTracks, setCrateTracks] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState(null);
  const [musicInput, setMusicInput] = useState("");
  const [expandedFeatured, setExpandedFeatured] = useState(null);
  const [featuredTracks, setFeaturedTracks] = useState([]);
  const musicChatEndRef = useRef(null);
  const [setCollapsed, setSetCollapsed] = useState(false);

  const features = currentTrack ? audioFeatures[currentTrack.id] : null;

  // Auto-scroll music chat
  useEffect(() => {
    musicChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [musicMessages]);

  // Load imported crates
  const { accessToken } = useAuth();
  const loadCrates = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/fabric/featured", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      let fetched = data.crates || [];
      // Apply saved order
      try {
        const savedOrder = JSON.parse(localStorage.getItem("fulkit-crate-order") || "[]");
        if (savedOrder.length > 0) {
          const orderMap = Object.fromEntries(savedOrder.map((id, i) => [id, i]));
          fetched.sort((a, b) => (orderMap[a.id] ?? 999) - (orderMap[b.id] ?? 999));
        }
      } catch {}
      setCrates(fetched);
      // Restore expanded crate from localStorage
      try {
        const saved = localStorage.getItem("fulkit-expanded-crate");
        if (saved) {
          const match = fetched.find(c => c.id === saved);
          if (match) setCrateTracks(match.tracks || []);
        }
      } catch {}
    } catch {}
    setCratesLoading(false);
  }, [accessToken]);

  useEffect(() => { loadCrates(); }, [loadCrates]);

  // Import a Spotify playlist as a crate
  const importPlaylist = useCallback(async (pl) => {
    if (!accessToken || importing) return;
    setImporting(pl.id);
    try {
      const res = await fetch("/api/fabric/featured/manage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistId: pl.id, name: pl.name }),
      });
      const data = await res.json();
      if (!data.error) {
        await loadCrates();
        setShowSpotifyBrowser(false);
      }
    } catch {}
    setImporting(null);
  }, [accessToken, importing, loadCrates]);

  // Delete a crate
  const deleteCrate = useCallback(async (crateId) => {
    if (!accessToken) return;
    try {
      await fetch(`/api/fabric/featured/manage?id=${crateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (expandedCrate === crateId) {
        setExpandedCrate(null);
        setCrateTracks([]);
      }
      await loadCrates();
    } catch {}
  }, [accessToken, expandedCrate, loadCrates]);

  // Drag handlers for crate shelf
  const [crateDragIdx, setCrateDragIdx] = useState(null);
  const [crateDragOverIdx, setCrateDragOverIdx] = useState(null);
  const crateDragNode = useRef(null);

  const handleCrateDragStart = useCallback((e, idx) => {
    setCrateDragIdx(idx);
    crateDragNode.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => { if (crateDragNode.current) crateDragNode.current.style.opacity = "0.4"; }, 0);
  }, []);

  const handleCrateDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== crateDragOverIdx) setCrateDragOverIdx(idx);
  }, [crateDragOverIdx]);

  const handleCrateDrop = useCallback((e, toIdx) => {
    e.preventDefault();
    if (crateDragIdx != null && crateDragIdx !== toIdx) {
      setCrates(prev => {
        const next = [...prev];
        const [moved] = next.splice(crateDragIdx, 1);
        next.splice(toIdx, 0, moved);
        try { localStorage.setItem("fulkit-crate-order", JSON.stringify(next.map(c => c.id))); } catch {}
        return next;
      });
    }
    setCrateDragIdx(null);
    setCrateDragOverIdx(null);
    if (crateDragNode.current) crateDragNode.current.style.opacity = "1";
  }, [crateDragIdx]);

  const handleCrateDragEnd = useCallback(() => {
    setCrateDragIdx(null);
    setCrateDragOverIdx(null);
    if (crateDragNode.current) crateDragNode.current.style.opacity = "1";
  }, []);

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
          hasFabricData={!!timeline}
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
              padding: "var(--space-4) var(--space-5)",
              display: "flex",
              gap: "var(--space-5)",
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

          {/* ═══ CRATES + SET ═══ */}
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

            {/* CRATES — imported playlists + Spotify browser */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                minWidth: 0,
              }}
            >
              {/* ── YOUR CRATES ── */}
              <div style={{ flexShrink: 0, padding: "var(--space-3) var(--space-4) 0", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label>Crates</Label>
                {playlists.length > 0 && (
                  <button
                    onClick={() => setShowSpotifyBrowser(!showSpotifyBrowser)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1) var(--space-2)",
                      background: showSpotifyBrowser ? "var(--color-bg-alt)" : "transparent",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                    }}
                  >
                    <Plus size={10} strokeWidth={2} />
                    Import
                  </button>
                )}
              </div>

              {/* Imported crate shelf (exclude published sets) */}
              {crates.filter(c => c.source !== "set").length > 0 && (
                <div className="thin-scroll-x" style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  overflowX: "auto",
                  paddingBottom: "var(--space-1)",
                }}>
                  {crates.filter(c => c.source !== "set").map((crate, crateIdx) => {
                    const isOpen = expandedCrate === crate.id;
                    const trackCount = crate.tracks?.length || 0;
                    const analyzed = crate.tracks?.filter(t => t.fabric_status === "complete").length || 0;
                    const isCrateDragTarget = crateDragOverIdx === crateIdx && crateDragIdx !== crateIdx;
                    return (
                      <div
                        key={crate.id}
                        draggable
                        onDragStart={(e) => handleCrateDragStart(e, crateIdx)}
                        onDragOver={(e) => handleCrateDragOver(e, crateIdx)}
                        onDrop={(e) => handleCrateDrop(e, crateIdx)}
                        onDragEnd={handleCrateDragEnd}
                        style={{
                          position: "relative",
                          flexShrink: 0,
                          borderLeft: isCrateDragTarget ? "2px solid var(--color-text)" : "2px solid transparent",
                          cursor: "grab",
                        }}
                      >
                        <button
                          onClick={() => {
                            if (isOpen) {
                              setExpandedCrate(null);
                              setCrateTracks([]);
                            } else {
                              setExpandedCrate(crate.id);
                              setCrateTracks(crate.tracks || []);
                              // Close featured mix if open
                              setExpandedFeatured(null);
                              setFeaturedTracks([]);
                            }
                          }}
                          style={{
                            padding: "var(--space-2) var(--space-3)",
                            paddingRight: "var(--space-6)",
                            minWidth: 110,
                            background: isOpen ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                            border: isOpen ? "1px solid var(--color-border-focus)" : "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-lg)",
                            cursor: "pointer",
                            fontFamily: "var(--font-primary)",
                            textAlign: "left",
                            transition: "all 120ms",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", marginBottom: "var(--space-1)" }}>
                            {isOpen
                              ? <PackageOpen size={12} strokeWidth={1.8} style={{ color: "var(--color-text)" }} />
                              : <Package size={12} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
                            }
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-semibold)",
                              color: "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 120,
                            }}>
                              {crate.name}
                            </div>
                          </div>
                          <div style={{
                            fontSize: "var(--font-size-xs)",
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-muted)",
                          }}>
                            {trackCount} songs · {analyzed} ready
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCrate(crate.id);
                          }}
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            width: 18,
                            height: 18,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            color: "var(--color-text-dim)",
                            padding: 0,
                            opacity: 0.5,
                            transition: "opacity 120ms",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                          title="Remove crate"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state — no crates yet */}
              {crates.filter(c => c.source !== "set").length === 0 && !cratesLoading && !showSpotifyBrowser && (
                <div style={{
                  padding: "var(--space-4) var(--space-3)",
                  textAlign: "center",
                  border: "1px dashed var(--color-border-light)",
                  borderRadius: "var(--radius-lg)",
                }}>
                  <Package size={20} strokeWidth={1.2} style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }} />
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                    {playlists.length > 0
                      ? "Import a playlist to get started"
                      : "Connect Spotify in Settings → Sources"
                    }
                  </div>
                  {playlists.length > 0 && (
                    <button
                      onClick={() => setShowSpotifyBrowser(true)}
                      style={{
                        marginTop: "var(--space-3)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        padding: "var(--space-1-5) var(--space-3)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Download size={10} strokeWidth={2} />
                      Browse Spotify Playlists
                    </button>
                  )}
                </div>
              )}

              {/* ── FEATURED MIXES ── */}
              {crates.filter(c => c.source === "set").length > 0 && (
                <div style={{ padding: "var(--space-3) var(--space-4) 0", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <Label>Featured Mixes</Label>
                  <div className="thin-scroll-x" style={{
                    display: "flex",
                    gap: "var(--space-2)",
                    overflowX: "auto",
                    paddingBottom: "var(--space-1)",
                  }}>
                    {crates.filter(c => c.source === "set").map((mix) => {
                      const isOpen = expandedFeatured === mix.id;
                      const trackCount = mix.tracks?.length || 0;
                      return (
                        <div key={mix.id} style={{ position: "relative", flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              if (isOpen) {
                                setExpandedFeatured(null);
                                setFeaturedTracks([]);
                              } else {
                                setExpandedFeatured(mix.id);
                                setFeaturedTracks(mix.tracks || []);
                                // Close crate if open
                                setExpandedCrate(null);
                                setCrateTracks([]);
                              }
                            }}
                            style={{
                              padding: "var(--space-2) var(--space-3)",
                              paddingRight: "var(--space-6)",
                              minWidth: 110,
                              background: isOpen ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                              border: isOpen ? "1px solid var(--color-border-focus)" : "1px solid var(--color-border-light)",
                              borderRadius: "var(--radius-lg)",
                              cursor: "pointer",
                              fontFamily: "var(--font-primary)",
                              textAlign: "left",
                              transition: "all 120ms",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", marginBottom: "var(--space-1)" }}>
                              <Crown size={12} strokeWidth={1.8} style={{ color: "var(--color-text)" }} />
                              <div style={{
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-semibold)",
                                color: "var(--color-text)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 120,
                              }}>
                                {mix.name}
                              </div>
                            </div>
                            <div style={{
                              fontSize: 8,
                              fontFamily: "var(--font-mono)",
                              color: "var(--color-text-dim)",
                              marginBottom: 2,
                            }}>
                              by Collin
                            </div>
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontFamily: "var(--font-mono)",
                              color: "var(--color-text-muted)",
                            }}>
                              {trackCount} songs
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unpublishSet(mix.id).then(() => loadCrates());
                            }}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "transparent",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              cursor: "pointer",
                              color: "var(--color-text-dim)",
                              padding: 0,
                              opacity: 0.5,
                              transition: "opacity 120ms",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                            title="Unpublish mix"
                          >
                            <X size={10} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              </div>{/* end crate shelf wrapper */}

              {/* ── Scrollable content below shelf ── */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 var(--space-4) var(--space-4)" }}>

              {/* ── SPOTIFY BROWSER — pick playlists to import ── */}
              {showSpotifyBrowser && (
                <div style={{
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <Label>Spotify Playlists</Label>
                    <button
                      onClick={() => setShowSpotifyBrowser(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-muted)" }}
                    >
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div style={{ maxHeight: 280, overflowY: "auto" }}>
                    {playlists.map(pl => {
                      const alreadyImported = crates.some(c => c.source_spotify_id === pl.id);
                      const isImporting = importing === pl.id;
                      return (
                        <div key={pl.id} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "var(--space-2-5) var(--space-4)",
                          borderBottom: "1px solid var(--color-border-light)",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {pl.name}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
                              {pl.trackCount} songs
                            </div>
                          </div>
                          {alreadyImported ? (
                            <div style={{
                              fontSize: 9,
                              fontFamily: "var(--font-mono)",
                              color: "var(--color-text-dim)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}>
                              imported
                            </div>
                          ) : (
                            <button
                              onClick={() => importPlaylist(pl)}
                              disabled={isImporting}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-1)",
                                padding: "var(--space-1) var(--space-2)",
                                background: "transparent",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                cursor: isImporting ? "wait" : "pointer",
                                fontSize: 9,
                                fontFamily: "var(--font-mono)",
                                color: "var(--color-text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                opacity: isImporting ? 0.5 : 1,
                              }}
                            >
                              <Plus size={10} strokeWidth={2} />
                              {isImporting ? "..." : "Import"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── EXPANDED CRATE — track list ── */}
              {expandedCrate && crateTracks.length > 0 && (
                <div style={{
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <div>
                      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                        {crates.find(c => c.id === expandedCrate)?.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {crateTracks.length} tracks
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const crate = crates.find(c => c.id === expandedCrate);
                        if (crate?.source_spotify_id) playPlaylist(crate.source_spotify_id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        padding: "var(--space-1-5) var(--space-3)",
                        background: "var(--color-bg-elevated)",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Play size={10} strokeWidth={2.5} fill="var(--color-text)" />
                      Play
                    </button>
                  </div>

                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {crateTracks.map((track, i) => {
                      const isActive = currentTrack?.id === track.spotify_id;
                      const hasFabric = track.fabric_status === "complete";
                      const trackFlagged = isFlagged(track.spotify_id);
                      return (
                        <div
                          key={track.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-4)",
                            borderBottom: "1px solid var(--color-border-light)",
                            background: isActive ? "var(--color-bg-inverse)" : "transparent",
                            transition: "background 120ms",
                          }}
                        >
                          <div style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                            width: 18,
                            flexShrink: 0,
                            textAlign: "right",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: hasFabric ? "var(--color-text-muted)" : "transparent",
                            border: hasFabric ? "none" : "1px solid var(--color-text-dim)",
                            flexShrink: 0,
                          }} title={hasFabric ? "Fabric analyzed" : "Pending"} />
                          <button
                            onClick={() => playTrack({
                              id: track.spotify_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                            })}
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
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.title}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.artist}
                            </div>
                          </button>
                          <button
                            onClick={() => flag({
                              id: track.spotify_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                            })}
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
                            title={trackFlagged ? "Remove from set" : "Add to set"}
                          >
                            {trackFlagged ? <ListX size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={1.5} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ── EXPANDED FEATURED MIX — track list ── */}
              {expandedFeatured && featuredTracks.length > 0 && (
                <div style={{
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  marginTop: "var(--space-3)",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <Crown size={14} strokeWidth={1.8} style={{ color: "var(--color-text)" }} />
                      <div>
                        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                          {crates.find(c => c.id === expandedFeatured)?.name}
                        </div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                          {featuredTracks.length} tracks · by Collin
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    {featuredTracks.map((track, i) => {
                      const isActive = currentTrack?.id === track.spotify_id;
                      const trackFlagged = isFlagged(track.spotify_id);
                      return (
                        <div
                          key={track.id || i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-4)",
                            borderBottom: "1px solid var(--color-border-light)",
                            background: isActive ? "var(--color-bg-inverse)" : "transparent",
                            transition: "background 120ms",
                          }}
                        >
                          <div style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                            width: 18,
                            flexShrink: 0,
                            textAlign: "right",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <button
                            onClick={() => playTrack({
                              id: track.spotify_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                            })}
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
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.title}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: isActive ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.artist}
                            </div>
                          </button>
                          <button
                            onClick={() => flag({
                              id: track.spotify_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                            })}
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
                            title={trackFlagged ? "Remove from set" : "Add to set"}
                          >
                            {trackFlagged ? <ListX size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={1.5} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>{/* end scrollable content */}
            </div>

            {/* RIGHT COLUMN — Record Store Guy + Set */}
            <div
              style={{
                width: 200,
                minWidth: 160,
                flexShrink: 1,
                borderLeft: "1px solid var(--color-border-light)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* ═══ RECORD STORE GUY — always at top ═══ */}
              <div style={{ flexShrink: 0 }}>
                {/* Title bar — always visible */}
                <div
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderBottom: "1px solid var(--color-border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}>
                    {!musicChatOpen && tickerFact ? (
                      <span style={{ fontWeight: "var(--font-weight-normal)", fontStyle: "italic", textTransform: "none", letterSpacing: "normal", color: "var(--color-text-secondary)" }}>
                        {tickerFact}
                      </span>
                    ) : (
                      "Record Store Guy"
                    )}
                  </div>
                  <button
                    onClick={toggleMusicChat}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      color: musicChatOpen ? "var(--color-text)" : "var(--color-text-muted)",
                      flexShrink: 0,
                      marginLeft: "var(--space-2)",
                    }}
                    title={musicChatOpen ? "Close chat" : "Open chat"}
                  >
                    {musicChatOpen
                      ? <ChevronDown size={12} strokeWidth={2} style={{ transform: "rotate(180deg)" }} />
                      : <MessageCircle size={10} strokeWidth={1.8} />
                    }
                  </button>
                </div>

                {/* Expandable chat drawer */}
                {musicChatOpen && (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: 280,
                    borderBottom: "1px solid var(--color-border-light)",
                  }}>
                    {/* Messages */}
                    <div style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: "var(--space-2) var(--space-3)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}>
                      {musicMessages.length === 0 && (
                        <div style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-muted)",
                          fontStyle: "italic",
                          padding: "var(--space-3) 0",
                          textAlign: "center",
                        }}>
                          {tickerFact || "What do you want to hear?"}
                        </div>
                      )}
                      {musicMessages.map((msg, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: "var(--font-size-xs)",
                            lineHeight: 1.4,
                            color: msg.role === "user" ? "var(--color-text-muted)" : "var(--color-text)",
                            fontFamily: "var(--font-primary)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            ...(msg.role === "user" ? {
                              textAlign: "right",
                              fontStyle: "italic",
                            } : {}),
                          }}
                        >
                          {msg.role === "assistant" ? msg.content.split("\n").map((line, li) => {
                            const plusMatch = line.match(/^(.+?)\s*-\s*(.+?)(?:\s+(\d+)\s*BPM)?\s*\[\+\]\s*$/);
                            if (plusMatch) {
                              const artist = plusMatch[1].trim();
                              const title = plusMatch[2].replace(/\s+\d+\s*$/, "").trim();
                              const bpmText = plusMatch[3] ? `  ${plusMatch[3]} BPM` : "";
                              return (
                                <div key={li}>
                                  {artist} - {title}{bpmText}{"  "}
                                  <button
                                    onClick={() => flag({ id: `rsg-${Date.now()}-${li}`, title, artist })}
                                    style={{
                                      display: "inline",
                                      background: "none",
                                      border: "1px solid var(--color-border)",
                                      borderRadius: "var(--radius-sm)",
                                      cursor: "pointer",
                                      padding: "0 3px",
                                      fontSize: 8,
                                      fontFamily: "var(--font-mono)",
                                      color: "var(--color-text-muted)",
                                      verticalAlign: "middle",
                                      marginLeft: 2,
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              );
                            }
                            return <div key={li}>{line}</div>;
                          }) : msg.content}
                        </div>
                      ))}
                      <div ref={musicChatEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                      padding: "var(--space-2) var(--space-3)",
                      borderTop: "1px solid var(--color-border-light)",
                      display: "flex",
                      gap: "var(--space-2)",
                    }}>
                      <input
                        value={musicInput}
                        onChange={(e) => setMusicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (musicInput.trim() && !musicStreaming) {
                              sendMusicMessage(musicInput);
                              setMusicInput("");
                            }
                          }
                        }}
                        placeholder="Ask about music..."
                        disabled={musicStreaming}
                        style={{
                          flex: 1,
                          padding: "var(--space-1) var(--space-2)",
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-primary)",
                          background: "var(--color-bg-elevated)",
                          border: "1px solid var(--color-border-light)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--color-text)",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => {
                          if (musicInput.trim() && !musicStreaming) {
                            sendMusicMessage(musicInput);
                            setMusicInput("");
                          }
                        }}
                        disabled={musicStreaming || !musicInput.trim()}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: musicStreaming || !musicInput.trim() ? "default" : "pointer",
                          padding: 2,
                          color: musicInput.trim() ? "var(--color-text)" : "var(--color-text-dim)",
                          opacity: musicInput.trim() ? 1 : 0.3,
                        }}
                      >
                        <Send size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ SET HEADER ═══ */}
              <div
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  borderBottom: "1px solid var(--color-border-light)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  position: "relative",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  // Don't collapse if clicking buttons/inputs inside
                  if (e.target.closest("button") || e.target.closest("input")) return;
                  setSetCollapsed(v => !v);
                }}
              >
                <ChevronDown
                  size={10}
                  strokeWidth={2}
                  style={{
                    color: "var(--color-text-dim)",
                    flexShrink: 0,
                    transform: setCollapsed ? "rotate(-90deg)" : "none",
                    transition: "transform 120ms",
                  }}
                />
                {/* Set selector — click to open dropdown, double-click to rename */}
                {renamingSet === activeSetId ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => { if (renameValue.trim()) renameSet(activeSetId, renameValue.trim()); setRenamingSet(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { if (renameValue.trim()) renameSet(activeSetId, renameValue.trim()); setRenamingSet(null); }
                      if (e.key === "Escape") setRenamingSet(null);
                    }}
                    style={{
                      width: 80,
                      padding: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--color-text)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                      border: "none",
                      borderBottom: "1px solid var(--color-text-muted)",
                      background: "transparent",
                      outline: "none",
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setShowSetMenu(v => !v)}
                    onDoubleClick={(e) => { e.stopPropagation(); setShowSetMenu(false); setRenamingSet(activeSetId); setRenameValue(allSets.find(s => s.id === activeSetId)?.name || ""); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      fontWeight: "var(--font-weight-bold)",
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                    }}
                  >
                    {allSets.find(s => s.id === activeSetId)?.name || "Set"}
                    <ChevronDown size={10} strokeWidth={2} style={{ transform: showSetMenu ? "rotate(180deg)" : "none", transition: "transform 120ms" }} />
                  </button>
                )}
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                  {flagged.length}
                </span>
                <div style={{ flex: 1 }} />
                {/* New set */}
                <button
                  onClick={() => createSet()}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", opacity: 0.5 }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                  title="New set"
                >
                  <Plus size={12} strokeWidth={1.8} />
                </button>
                {/* Delete set */}
                {allSets.length > 1 && (
                  <button
                    onClick={() => deleteSet(activeSetId)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", opacity: 0.5 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                    title="Delete set"
                  >
                    <ListX size={12} strokeWidth={1.8} />
                  </button>
                )}
                {/* Record Store Guy toggle removed — RSG is now at top of column */}

                {/* Publish status message */}
                {publishMsg && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    right: "var(--space-4)",
                    zIndex: 20,
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-2) var(--space-3)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}>
                    {publishMsg}
                  </div>
                )}

                {/* Dropdown menu */}
                {showSetMenu && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: "var(--space-4)",
                    zIndex: 20,
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-md)",
                    minWidth: 160,
                    padding: "var(--space-1) 0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}>
                    {allSets.map(s => {
                      const isPublished = publishedSets[s.name];
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
                          <button
                            onClick={() => { switchSet(s.id); setShowSetMenu(false); }}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              padding: "var(--space-1-5) var(--space-3)",
                              background: s.id === activeSetId ? "var(--color-bg-alt)" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "var(--font-size-xs)",
                              fontFamily: "var(--font-primary)",
                              color: "var(--color-text)",
                              textAlign: "left",
                            }}
                          >
                            {s.name}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (publishing) return;
                              if (isPublished) {
                                setPublishing(true);
                                await unpublishSet(isPublished);
                                await loadCrates();
                                setPublishing(false);
                              } else {
                                if (s.trackCount === 0) { setPublishMsg("Set is empty"); setTimeout(() => setPublishMsg(null), 2000); return; }
                                setPublishing(true);
                                const res = await publishSet(s.id);
                                if (res?.ok) {
                                  await loadCrates();
                                } else if (res?.error === "not_ready") {
                                  setPublishMsg(`${res.pending} of ${res.total} still processing`);
                                  setTimeout(() => setPublishMsg(null), 3000);
                                } else {
                                  setPublishMsg("Failed to publish");
                                  setTimeout(() => setPublishMsg(null), 2000);
                                }
                                setPublishing(false);
                              }
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: publishing ? "wait" : "pointer",
                              padding: "var(--space-1-5) var(--space-2)",
                              color: isPublished ? "var(--color-text)" : "var(--color-text-dim)",
                              opacity: isPublished ? 1 : 0.3,
                              transition: "opacity 120ms",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = isPublished ? "1" : "0.3"}
                            title={isPublished ? "Unpublish" : "Feature this set"}
                          >
                            <Crown size={10} strokeWidth={1.8} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!setCollapsed && <div style={{ flex: 1, overflowY: "auto" }}>
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
                        <ListX size={10} strokeWidth={1.8} />
                      </button>
                    </div>
                  );
                })}
              </div>

              }
              {/* Record Store Guy was here — moved to top of right column */}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
