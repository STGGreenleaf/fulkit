"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Play, ChevronLeft, ChevronRight, Plus, Check, X, Disc, Disc3, Ear, ExternalLink, Maximize2, Package, PackageOpen, Download, ListMusic, ListX, ChevronDown, ChevronUp, Crown, Trophy, MessageCircleQuestion, MessageCircleX, Save, Send, Box, Turntable, Trash2, ArrowUpFromLine, ArrowDownFromLine, CornerDownRight, Search, ThumbsUp, ThumbsDown, Bold, Frame } from "lucide-react";
import { createNoise2D } from "simplex-noise";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
// LogoMark removed — using text wordmark to match other pages
import Tooltip from "../../components/Tooltip";
import MessageRenderer from "../../components/MessageRenderer";
import { useFabric } from "../../lib/fabric";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import { useIsMobile } from "../../lib/use-mobile";

const TAB_ICON_SIZE = 16;

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

// Energy/danceability bar — solid continuous line
function MeterBar({ value = 0, label }) {
  return (
    <div style={{ flex: 1 }}>
      {label && <Label style={{ marginBottom: 2 }}>{label}</Label>}
      <div style={{ width: "100%", height: 3, background: "var(--color-border)", borderRadius: 1.5, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: "var(--color-text-muted)", borderRadius: 1.5, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// ═══ Poster terrain generation ═══

function posterSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return function () { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 2147483647; };
}

function posterTerrain(seed, w, h, layers, yOff) {
  const rng = posterSeed(seed);
  const paths = [];
  for (let l = 0; l < layers; l++) {
    const baseY = yOff + (l / layers) * (h - yOff);
    const amp = 12 + rng() * 24;
    const freq = 2 + rng() * 4;
    const phase = rng() * Math.PI * 2;
    const pts = [];
    for (let x = 0; x <= w; x += 2) {
      const nx = x / w;
      const y = baseY
        + Math.sin(nx * freq * Math.PI + phase) * amp
        + Math.sin(nx * freq * 2.3 * Math.PI + phase * 1.7) * (amp * 0.4)
        + Math.sin(nx * freq * 5.1 * Math.PI + phase * 0.3) * (amp * 0.15);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    paths.push({ d: `M0,${h} L${pts.join(" L")} L${w},${h} Z`, opacity: 0.08 + (l / layers) * 0.12 });
  }
  return paths;
}

function PosterModal({ track, features, timestamp, onClose }) {
  const savedLayout = useMemo(() => {
    if (typeof window === "undefined") return { header: "top", align: "left", theme: "dark", margin: 40 };
    try { return JSON.parse(localStorage.getItem("fulkit-poster-layout")) || { header: "top", align: "left", theme: "dark", margin: 40 }; } catch { return { header: "top", align: "left", theme: "dark", margin: 40 }; }
  }, []);
  const [theme, setTheme] = useState(savedLayout.theme || "dark");
  const [showInfo, setShowInfo] = useState(false);
  const header = savedLayout.header || "top";
  const align = savedLayout.align || "left";
  const footerAlign = savedLayout.footerAlign || align;
  const W = 380, H = Math.round(W * (17 / 11)), m = savedLayout.margin || 40;
  const bg = theme === "dark" ? "#2A2826" : "#EFEDE8";
  const fg = theme === "dark" ? "#F0EEEB" : "#2A2826";
  const fgDim = theme === "dark" ? "#8A8784" : "#8A8784";
  const fgMuted = theme === "dark" ? "#5C5955" : "#B0ADA8";
  const divColor = theme === "dark" ? "#3D3A37" : "#D4D1CC";

  const tsLabel = `${Math.floor(timestamp / 60)}:${String(timestamp % 60).padStart(2, "0")}`;
  const seed = (track.title || "") + (track.artist || "") + String(timestamp);
  const terrain = useMemo(() => posterTerrain(seed, W, H, 18, H * 0.22), [seed, W, H]);

  const dur = track.duration ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}` : "";
  const meta = [tsLabel + " / " + dur, features?.bpm ? `${features.bpm} BPM` : null, features?.key || null].filter(Boolean).join("  \u00b7  ");

  // Export: render to canvas at print resolution then download
  const exportPoster = useCallback(() => {
    const DPI = 300, printW = 11 * DPI, printH = 17 * DPI;
    const canvas = document.createElement("canvas");
    canvas.width = printW; canvas.height = printH;
    const ctx = canvas.getContext("2d");
    const s = printW / W; // scale factor from design coords to print

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, printW, printH);

    // Terrain paths
    terrain.forEach(({ d, opacity }) => {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = fg;
      const p = new Path2D();
      const cmds = d.match(/[ML]\s*[\d.,]+/g) || [];
      cmds.forEach(cmd => {
        const [x, y] = cmd.slice(1).trim().split(",").map(Number);
        if (cmd[0] === "M") p.moveTo(x * s, y * s);
        else p.lineTo(x * s, y * s);
      });
      p.closePath();
      ctx.fill(p);
    });
    ctx.globalAlpha = 1;

    const pm = m * s;
    const tx = align === "center" ? printW / 2 : align === "right" ? printW - pm : pm;
    const ta = align === "center" ? "center" : align === "right" ? "right" : "left";
    const ftx = footerAlign === "center" ? printW / 2 : footerAlign === "right" ? printW - pm : pm;
    const fta = footerAlign === "center" ? "center" : footerAlign === "right" ? "right" : "left";

    // Title + artist
    const titleY = header === "bottom" ? printH - pm - 20 * s : pm + 24 * s;
    const artistY = titleY + 16 * s;
    ctx.fillStyle = fg;
    ctx.font = `700 ${24 * s}px D-DIN, sans-serif`;
    ctx.textAlign = ta;
    ctx.fillText(track.title || "Untitled", tx, titleY);
    ctx.fillStyle = fgDim;
    ctx.font = `400 ${11 * s}px D-DIN, sans-serif`;
    ctx.fillText((track.artist || "Unknown").toUpperCase(), tx, artistY);

    // Metadata
    const metaY = header === "bottom" ? pm + 12 * s : printH - pm - 18 * s;
    ctx.fillStyle = fgDim;
    ctx.font = `400 ${9 * s}px JetBrains Mono, monospace`;
    ctx.textAlign = fta;
    ctx.fillText(meta, ftx, metaY);

    // Watermark
    ctx.fillStyle = fgMuted;
    ctx.font = `400 ${7 * s}px D-DIN, sans-serif`;
    ctx.textAlign = fta;
    ctx.fillText("F\u00dcLKIT FABRIC", ftx, printH - pm);

    // Download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(track.title || "poster").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${tsLabel.replace(":", "m")}s-poster.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [terrain, bg, fg, fgDim, fgMuted, divColor, track, meta, W, m]);

  const pill = (active) => ({
    padding: "6px 16px", borderRadius: "var(--radius-full)",
    border: `1px solid ${active ? "var(--color-text)" : "var(--color-border)"}`,
    background: active ? "var(--color-text)" : "transparent",
    color: active ? "var(--color-bg)" : "var(--color-text-secondary)",
    fontSize: 11, fontFamily: "'D-DIN', sans-serif", cursor: "pointer", fontWeight: 600,
    letterSpacing: "0.3px",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(42,40,38,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex", gap: "var(--space-6)",
          padding: "var(--space-6)",
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          maxWidth: 700, width: "100%",
          position: "relative",
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={16} strokeWidth={2} color="var(--color-text-muted)" />
        </button>

        {/* Poster */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: W, height: H, background: bg, borderRadius: 4,
            position: "relative", overflow: "hidden",
            boxShadow: "0 8px 24px rgba(42,40,38,0.18), 0 2px 6px rgba(42,40,38,0.08)",
            transition: "background 300ms",
          }}>
            <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
              {terrain.map((p, i) => <path key={i} d={p.d} fill={fg} opacity={p.opacity} />)}
            </svg>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              display: "flex", flexDirection: "column",
              padding: m, justifyContent: "space-between",
            }}>
              {(() => {
                const titleBlock = (
                  <div style={{ textAlign: align }}>
                    <div style={{ fontFamily: "'D-DIN', sans-serif", fontSize: 24, fontWeight: 700, color: fg, lineHeight: 1.15, letterSpacing: "-0.3px", marginBottom: 4 }}>
                      {track.title || "Untitled"}
                    </div>
                    <div style={{ fontFamily: "'D-DIN', sans-serif", fontSize: 11, fontWeight: 400, color: fgDim, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      {track.artist || "Unknown"}
                    </div>
                  </div>
                );
                const metaBlock = (
                  <div style={{ textAlign: footerAlign }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: fgDim, letterSpacing: "0.8px" }}>{meta}</div>
                  </div>
                );
                const wm = (
                  <div style={{ textAlign: footerAlign, fontFamily: "'D-DIN', sans-serif", fontSize: 7, color: fgMuted, letterSpacing: "1.2px", textTransform: "uppercase", marginTop: 10 }}>
                    F{"\u00fc"}lkit Fabric
                  </div>
                );
                if (header === "bottom") return <>{metaBlock}<div style={{ flex: 1 }} />{titleBlock}{wm}</>;
                if (header === "overlay") return <><div style={{ flex: 1 }} />{titleBlock}<div style={{ marginTop: 6 }}>{metaBlock}</div>{wm}</>;
                return <>{titleBlock}<div style={{ flex: 1 }} />{metaBlock}{wm}</>;
              })()}
            </div>
          </div>
        </div>

        {/* Right panel — info + controls */}
        <div style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-text-muted)", marginBottom: 14 }}>
              Fabric Procedural Fingerprint
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
              Eighteen terrain layers, each driven by a seeded pseudorandom number generator. The hash input is three values: track title, artist name, and the playback position you captured ({tsLabel}). That seed determines the amplitude, frequency, and phase of three overlapping sine functions per layer — producing a unique topographic contour that belongs to this exact moment in this exact recording.
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: 14 }}>
              The result is deterministic. Same inputs, same landscape, every time. But shift the timestamp by even one second and the phase offsets cascade through all eighteen layers — a completely different print. The song has as many posters as it has seconds.
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 14 }}>
              Formatted for 11{"\u00d7"}17{"\u2033"} print {"\u00b7"} 3300{"\u00d7"}5100 px at 300 DPI.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 20 }}>
            <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={pill(false)}>
              {theme === "dark" ? "light" : "dark"}
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={exportPoster} style={pill(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Download size={11} strokeWidth={2.2} /> export
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// iPod-style marquee — pause, scroll, pause, repeat
function MarqueeText({ children, style }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const animRef = useRef(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!outerRef.current || !innerRef.current) return;
      const diff = innerRef.current.scrollWidth - outerRef.current.clientWidth;
      setOverflow(diff > 2 ? diff : 0);
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (outerRef.current) obs.observe(outerRef.current);
    return () => obs.disconnect();
  }, [children]);

  useEffect(() => {
    if (!overflow || !innerRef.current) return;
    let cancelled = false;
    const PAUSE = 3000;
    const SPEED = 30; // px per second

    const cycle = () => {
      if (cancelled) return;
      // Reset to start
      if (innerRef.current) innerRef.current.style.transform = "translateX(0)";
      // Pause at start
      setTimeout(() => {
        if (cancelled) return;
        const duration = (overflow / SPEED) * 1000;
        if (innerRef.current) {
          innerRef.current.style.transition = `transform ${duration}ms linear`;
          innerRef.current.style.transform = `translateX(-${overflow}px)`;
        }
        // Pause at end, then restart
        setTimeout(() => {
          if (cancelled || !innerRef.current) return;
          innerRef.current.style.transition = "none";
          cycle();
        }, duration + PAUSE);
      }, PAUSE);
    };
    cycle();
    return () => { cancelled = true; if (innerRef.current) { innerRef.current.style.transition = "none"; innerRef.current.style.transform = "translateX(0)"; } };
  }, [overflow]);

  return (
    <div ref={outerRef} style={{ ...style, overflow: "hidden", whiteSpace: "nowrap" }}>
      <div ref={innerRef} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {children}
      </div>
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

// ═════════════════════════════════════════════════════════
// SIGNAL TERRAIN V4 — OG mountains + real math
// Same look as OG: 40 stacked mountain lines pushing up from 78%
// center, reflection below. But each x-position maps to a frequency
// band and the amplitude comes from smoothed thumbprint data.
// No scrolling. Just pushes up like flame/smoke. Like #1 but real.
// ═════════════════════════════════════════════════════════

const V4_RENDER_PTS = 80;
const V4_HISTORY = 40;
const V4_BAND_NAMES = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

const V4_BANDS = [
  { name: "sub",      w: 1.8, amp: 1.0,  decay: 0.92 },
  { name: "bass",     w: 1.5, amp: 0.95, decay: 0.90 },
  { name: "low_mid",  w: 1.2, amp: 0.85, decay: 0.88 },
  { name: "mid",      w: 1.0, amp: 0.75, decay: 0.85 },
  { name: "high_mid", w: 0.7, amp: 0.55, decay: 0.82 },
  { name: "high",     w: 0.5, amp: 0.45, decay: 0.78 },
  { name: "air",      w: 0.35, amp: 0.35, decay: 0.75 },
];
// Per-band temporal lag: sub reacts fast but sustains, air is instant
const V4_BAND_LAG = [4, 3, 2, 2, 1, 1, 0];
// Weighted canvas mapping: sub/bass own more visual space via cumulative w
const V4_TOTAL_W = V4_BANDS.reduce((s, b) => s + b.w, 0);
const V4_CUMULATIVE_W = V4_BANDS.reduce((arr, b) => { arr.push((arr.length ? arr[arr.length - 1] : 0) + b.w / V4_TOTAL_W); return arr; }, []);

function SignalTerrainV4({
  height = 220,
  isPlaying = false,
  trackId = null,
  progress = 0,
  duration = 0,
  features = null,
  getSnapshot = null,
  onVisualize,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const noiseRef = useRef(createNoise2D());
  const historyRef = useRef([]);
  const phaseRef = useRef(0);

  // Per-band smoothed values + temporal history buffers (12 frames per band)
  const smoothRef = useRef(new Float32Array(7));
  const bandHistRef = useRef(null);
  const trackChangeTimeRef = useRef(0); // suppress procedural fallback during timeline load

  // Kinetic state machine
  const kRef = useRef({
    amplitude: 0.08, target: 0.08, state: "idle",
    stateStart: 0, prevPlaying: false, prevTrackId: null,
  });

  // Procedural envelope
  const envelopeRef = useRef({ trackId: null, envelope: null });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCanvasWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    noiseRef.current = createNoise2D();
    historyRef.current = [];
    smoothRef.current.fill(0);
    if (bandHistRef.current) { for (const buf of bandHistRef.current) buf.fill(0); }
    trackChangeTimeRef.current = performance.now();
    const k = kRef.current;
    if (k.prevTrackId && k.prevTrackId !== trackId && k.prevPlaying) {
      k.state = "skip-cut"; k.stateStart = performance.now(); k.target = 0;
    }
    k.prevTrackId = trackId;
  }, [trackId]);

  useEffect(() => {
    if (!trackId || envelopeRef.current.trackId === trackId) return;
    const bpm = features?.bpm || 100;
    const energy = features?.energy || 50;
    const dance = features?.danceability || 50;
    const dur = duration > 0 ? duration * 1000 : 210000;
    envelopeRef.current = { trackId, envelope: generateSongEnvelope(trackId, dur, bpm, energy, dance) };
  }, [trackId, features, duration]);

  useEffect(() => {
    let running = true;
    let lastFrame = 0;

    const render = (timestamp) => {
      if (!running) return;
      animRef.current = requestAnimationFrame(render);
      if (timestamp - lastFrame < 32) return;
      lastFrame = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const noise2D = noiseRef.current;
      const k = kRef.current;

      // ── Kinetic state machine ──
      const now = timestamp;
      const elapsed = now - k.stateStart;
      if (isPlaying && !k.prevPlaying && k.state !== "skip-spool") { k.state = "spool-up"; k.stateStart = now; k.amplitude = 0.02; k.target = 0.02; }
      else if (!isPlaying && k.prevPlaying) { k.state = "wind-down"; k.stateStart = now; k.target = 0.08; }
      k.prevPlaying = isPlaying;
      let lerpRate = 0.06;
      if (k.state === "spool-up") {
        // Slow ease in: ramp over 2.5s with gentle lerp — song data leads, kinetics follow
        const ramp = Math.min(1, elapsed / 2500);
        const eased = ramp * ramp; // quadratic ease-in: slow start, accelerates
        k.target = 0.02 + eased * 0.53;
        lerpRate = 0.02 + ramp * 0.04; // lerp 0.02 → 0.06 over the ramp
        if (elapsed > 2500) k.state = "active";
      }
      else if (k.state === "wind-down" && elapsed > 800) k.state = "idle";
      else if (k.state === "skip-cut") { lerpRate = 0.2; if (elapsed > 200) { k.state = "skip-silence"; k.stateStart = now; k.target = 0.02; } }
      else if (k.state === "skip-silence" && elapsed > 200) { k.state = "skip-spool"; k.stateStart = now; k.target = 0.02; }
      else if (k.state === "skip-spool") {
        const ramp = Math.min(1, elapsed / 2000);
        const eased = ramp * ramp;
        k.target = 0.02 + eased * 0.53;
        lerpRate = 0.02 + ramp * 0.04;
        if (elapsed > 2000) { k.state = isPlaying ? "active" : "idle"; k.target = isPlaying ? 0.55 : 0.08; }
      }
      k.amplitude += (k.target - k.amplitude) * lerpRate;

      // Phase + features
      const bpm = features?.bpm || 100;
      phaseRef.current += isPlaying ? (bpm / 60 / 30) * 0.15 : 0.004;
      const phase = phaseRef.current;
      const energy = (features?.energy || 50) / 100;
      const acousticness = (features?.acousticness || 30) / 100;
      const danceability = (features?.danceability || 50) / 100;
      const sharpness = 1 - (features?.valence || 50) / 100;
      const keyOffset = (features?.key?.charCodeAt(0) || 0) * 0.1;

      // Exhale
      let exhaleMultiplier = 1;
      if (isPlaying && duration > 0 && progress > 0) {
        const remaining = duration * (1 - progress);
        if (remaining < 6 && remaining > 0) exhaleMultiplier = 1 - ((1 - remaining / 6) * 0.7);
      }

      // Envelope
      const env = envelopeRef.current.envelope;
      let envelopeValue = 1;
      if (env && env.length > 0 && isPlaying && progress > 0) {
        envelopeValue = env[Math.min(env.length - 1, Math.floor(progress * env.length))];
      }

      // BPM beat grid
      const progressMs = progress * duration * 1000;
      const msPerBeat = 60000 / bpm;
      const beatPhase = (progressMs % msPerBeat) / msPerBeat;
      const beatPulse = isPlaying ? Math.pow(1 - beatPhase, 3) : 0;

      // ── Read snapshot ──
      const gsFn = getSnapshotRef.current;
      const snap = gsFn ? gsFn(progressRef.current) : null;
      const hasFabric = !!snap;

      // ── Smooth band values + push to per-band temporal buffers ──
      if (hasFabric) {
        if (!bandHistRef.current) bandHistRef.current = V4_BANDS.map(() => new Float32Array(12));
        for (let b = 0; b < V4_BANDS.length; b++) {
          const raw = snap.bands?.[V4_BANDS[b].name] || 0;
          const prev = smoothRef.current[b];
          smoothRef.current[b] = raw > prev
            ? prev + (raw - prev) * 0.55                                    // fast attack: 45% per frame
            : prev * V4_BANDS[b].decay + raw * (1 - V4_BANDS[b].decay);    // per-band decay
          const hist = bandHistRef.current[b];
          hist.copyWithin(0, 1);
          hist[hist.length - 1] = smoothRef.current[b];
        }
      }

      // ── Generate points: x = frequency zone, amplitude = band energy ──
      const points = [];
      for (let i = 0; i < V4_RENDER_PTS; i++) {
        const t = i / V4_RENDER_PTS;
        const edge = Math.min(1, t / 0.06, (1 - t) / 0.06);

        let amp;
        if (hasFabric && bandHistRef.current) {
          // Weighted band mapping — sub/bass own more canvas space
          let bandIdx = 0;
          while (bandIdx < V4_CUMULATIVE_W.length - 1 && t > V4_CUMULATIVE_W[bandIdx]) bandIdx++;
          const bandStart = bandIdx > 0 ? V4_CUMULATIVE_W[bandIdx - 1] : 0;
          const bandEnd = V4_CUMULATIVE_W[bandIdx];
          const bandFrac = bandEnd > bandStart ? Math.min(1, (t - bandStart) / (bandEnd - bandStart)) : 0;
          const bandNext = Math.min(bandIdx + 1, V4_BAND_NAMES.length - 1);

          // Read from temporal buffers with per-band lag
          const histL = bandHistRef.current[bandIdx];
          const histR = bandHistRef.current[bandNext];
          const valL = histL[Math.max(0, histL.length - 1 - V4_BAND_LAG[bandIdx])];
          const valR = histR[Math.max(0, histR.length - 1 - V4_BAND_LAG[bandNext])];
          const bandValRaw = valL * (1 - bandFrac) + valR * bandFrac;
          // Sharpen — suppresses mid-range, keeps peaks tall
          const bandVal = Math.pow(bandValRaw, 1.8);

          // Per-band amplitude emphasis (interpolated)
          const bandAmp = V4_BANDS[bandIdx].amp * (1 - bandFrac) + V4_BANDS[bandNext].amp * bandFrac;

          // Band-dominant formula — frequency-aware boosts
          const realLoud = snap.loudness || 0;
          const texture = noise2D(t * 5 + keyOffset, phase * 0.3) * 0.1;
          const bandRatio = bandIdx / V4_BAND_NAMES.length; // 0=sub, ~1=air
          // Onset: kick drums hit sub/bass, not air
          const onsetWeight = 1 - bandRatio * 0.85;
          const onsetSpike = snap.onset ? (snap.onset_strength || 0) * 0.7 * onsetWeight : 0;
          const expanded = Math.pow(bandVal, 0.78) * bandAmp;
          const loud_scale = 0.3 + realLoud * 0.7;

          amp = (expanded * 0.78 + onsetSpike + texture * 0.5) * loud_scale;
          // Flux: spectral change is more visible in mids/highs
          const fluxWeight = 0.4 + bandRatio * 0.6;
          amp *= (1 + (snap.flux || 0) * 0.6 * fluxWeight);
          // Beat: felt in the low end
          const beatWeight = 1 - bandRatio * 0.8;
          if (snap.beat) amp *= (1 + (snap.beat_strength || 0) * 0.9 * beatWeight);
          amp *= edge;
          amp *= k.amplitude / 0.55;
          amp *= exhaleMultiplier;
          // Per-band ceiling — sub can reach full, air gets lower ceiling
          const hasEnvelope = envelopeValue < 1;
          const baseCeiling = hasEnvelope ? 0.2 + envelopeValue * 0.6 : 0.2 + energy * 0.6;
          amp = Math.min(amp, baseCeiling * bandAmp);
          amp = Math.max(amp, isPlaying ? 0.005 : 0);
          amp *= 1 + (Math.random() - 0.5) * 0.06;
        } else {
          // Suppress fallback for 2s after track change — wait for timeline to load
          const sinceTrackChange = timestamp - trackChangeTimeRef.current;
          if (isPlaying && sinceTrackChange < 2000) {
            amp = 0;
          } else {
            // Procedural fallback (for tracks with no timeline data)
            const n1 = noise2D(t * 4 + keyOffset, phase * 0.3) * 0.5;
            const n2 = noise2D(t * 8 + 100, phase * 0.5) * 0.25;
            const n3 = noise2D(t * 16 + 200, phase * 0.8) * 0.125;
            let raw = n1 + n2 + n3;
            raw = Math.sign(raw) * Math.pow(Math.abs(raw), 1 + sharpness * 0.5);
            raw = Math.abs(raw) * edge;
            const beatBoost = 1 + beatPulse * danceability * 0.4;
            amp = raw * k.amplitude * exhaleMultiplier * beatBoost;
            amp = Math.min(amp, 0.2 + energy * 0.6);
            amp = Math.max(amp, isPlaying ? 0.005 : 0);
            amp *= 1 + (Math.random() - 0.5) * 0.1;
          }
        }

        points.push(Math.max(0, Math.min(0.82, amp)));
      }

      historyRef.current.push(points);
      if (historyRef.current.length > V4_HISTORY) historyRef.current.shift();

      // ── Render (exact OG mountain rendering) ──
      const style = getComputedStyle(canvas);
      const textColor = style.getPropertyValue("--color-text").trim() || "#e8e6e3";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [232, 230, 227];

      ctx.clearRect(0, 0, w, h);
      // Hard clip — bezier curves can overshoot, nothing renders outside canvas
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      const layers = historyRef.current;
      const centerY = h * 0.78;

      for (let l = 0; l < layers.length; l++) {
        const age = l / Math.max(1, layers.length - 1);
        const data = layers[l];
        const alpha = 0.012 + age * age * 0.16;
        const baseLw = 0.3 + age * 1.0;
        const lw = baseLw * (0.7 + acousticness * 0.6);
        const yShift = (layers.length - 1 - l) * 1.1;
        const maxUp = centerY - 4;
        const maxDown = (h - centerY) - 4;

        // Mountains
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const a = Math.min(data[i] * centerY * 1.2, maxUp - yShift);
          const y = centerY - a - yShift;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = ((i - 1) / (data.length - 1)) * w;
            const prevA = Math.min(data[i - 1] * centerY * 1.1, maxUp - yShift);
            const prevY = centerY - prevA - yShift;
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
        }
        const lastA = Math.min(data[data.length - 1] * centerY * 1.1, maxUp - yShift);
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
      ctx.restore(); // release clip
    };

    animRef.current = requestAnimationFrame(render);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [canvasWidth, isPlaying, progress, duration, features]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} width={canvasWidth} height={height} style={{ width: "100%", height, display: "block" }} />
      {onVisualize && (
        <button
          onClick={onVisualize}
          style={{ position: "absolute", top: 8, right: 10, background: "transparent", border: "none", cursor: "pointer", padding: 4, opacity: 0.15, transition: "opacity 300ms", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
          title="Visualize"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.5)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.15)}
        >
          <ExternalLink size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}


const T_LAYERS = 35;
const T_POINTS = 80;

// 7 frequency bands — each renders as an independent sinusoidal ribbon.
// Bass = slow wide waves, Air = fast tight oscillations. They interweave.
const BAND_CONFIGS = [
  { name: 'sub',      freq: 0.35, ampMax: 1.0,  phaseOff: 0,    phaseSpeed: 0.25, lw: 1.8, noiseScale: 2   },
  { name: 'bass',     freq: 0.6,  ampMax: 0.90, phaseOff: 0.7,  phaseSpeed: 0.35, lw: 1.5, noiseScale: 3   },
  { name: 'low_mid',  freq: 1.1,  ampMax: 0.78, phaseOff: 1.4,  phaseSpeed: 0.50, lw: 1.2, noiseScale: 5   },
  { name: 'mid',      freq: 1.9,  ampMax: 0.65, phaseOff: 2.1,  phaseSpeed: 0.70, lw: 1.0, noiseScale: 7   },
  { name: 'high_mid', freq: 3.2,  ampMax: 0.52, phaseOff: 2.8,  phaseSpeed: 0.95, lw: 0.8, noiseScale: 10  },
  { name: 'high',     freq: 5.5,  ampMax: 0.40, phaseOff: 3.5,  phaseSpeed: 1.20, lw: 0.6, noiseScale: 14  },
  { name: 'air',      freq: 9.0,  ampMax: 0.30, phaseOff: 4.2,  phaseSpeed: 1.50, lw: 0.45, noiseScale: 20 },
];

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

// ═════════════════════════════════════════════════════════
// SIGNAL TERRAIN OG — Original stacked mountain visualization
// The classic smoky layered rendering with mountain + reflection.
// ═════════════════════════════════════════════════════════

const OG_LAYERS = 40;

function SignalTerrainOG({
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
      if (historyRef.current.length > OG_LAYERS) historyRef.current.shift();

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

// ═════════════════════════════════════════════════════════
// SIGNAL TERRAIN V2 — Data-driven terrain visualization
// "A deaf person should feel the music."
// No synthetic carriers. The data IS the visual.
// ═════════════════════════════════════════════════════════

const V2_PTS = 120;
const V2_TOP = 27;
const V2_BOT = 38;
const V2_MAX_GHOSTS = 4;
const V2_MAX_RUNGS = 16;
const V2_MAX_PARTICLES = 30;

const V2_BANDS = [
  { name: "sub",      w: 1.8, amp: 1.0,  decay: 0.92 },
  { name: "bass",     w: 1.5, amp: 0.85, decay: 0.90 },
  { name: "low_mid",  w: 1.2, amp: 0.70, decay: 0.88 },
  { name: "mid",      w: 1.0, amp: 0.55, decay: 0.85 },
  { name: "high_mid", w: 0.7, amp: 0.40, decay: 0.82 },
  { name: "high",     w: 0.5, amp: 0.30, decay: 0.78 },
  { name: "air",      w: 0.35, amp: 0.20, decay: 0.75 },
];

const V2_TOTAL_W = V2_BANDS.reduce((s, b) => s + b.w, 0);

function SignalTerrainV2({
  height = 220,
  isPlaying = false,
  trackId = null,
  progress = 0,
  duration = 0,
  features = null,
  getSnapshot = null,
  onVisualize,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(600);
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const noiseRef = useRef(createNoise2D());

  // Per-band temporal buffers
  const bufsRef = useRef(null);
  const smoothRef = useRef(new Float32Array(7));
  const spineRef = useRef(new Float32Array(V2_PTS));
  const fluxRef = useRef(new Float32Array(V2_PTS));
  const prevSpineRef = useRef(0);

  // Beat + particle state
  const sRef = useRef({
    ghosts: [], rungs: [], particles: [],
    beatFlash: 0, time: 0, centerWander: 0,
    lineSeeds: Array.from({ length: V2_TOP + V2_BOT }, (_, i) => i * 7.31 + 3.14),
  });

  // Kinetic state machine
  const kRef = useRef({
    amplitude: 0.08, target: 0.08, state: "idle",
    stateStart: 0, prevPlaying: false, prevTrackId: null,
  });

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCanvasWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Track change
  useEffect(() => {
    noiseRef.current = createNoise2D();
    if (bufsRef.current) { for (const buf of bufsRef.current) buf.fill(0); smoothRef.current.fill(0); }
    spineRef.current.fill(0); fluxRef.current.fill(0); prevSpineRef.current = 0;
    const s = sRef.current;
    s.ghosts = []; s.rungs = []; s.particles = []; s.beatFlash = 0;
    s.lineSeeds = Array.from({ length: V2_TOP + V2_BOT }, (_, i) => i * 7.31 + 3.14 + (trackId?.charCodeAt(0) || 0) * 0.1);
    const k = kRef.current;
    if (k.prevTrackId && k.prevTrackId !== trackId && k.prevPlaying) {
      k.state = "skip-cut"; k.stateStart = performance.now(); k.target = 0;
    }
    k.prevTrackId = trackId;
  }, [trackId]);

  // Render loop
  useEffect(() => {
    let running = true;
    let lastFrame = 0;

    const render = (timestamp) => {
      if (!running) return;
      animRef.current = requestAnimationFrame(render);
      if (timestamp - lastFrame < 32) return;
      const dt = Math.min(0.05, (timestamp - lastFrame) / 1000);
      lastFrame = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const noise2D = noiseRef.current;
      const k = kRef.current;
      const s = sRef.current;

      if (!bufsRef.current) bufsRef.current = V2_BANDS.map(() => new Float32Array(V2_PTS));
      s.time += dt;

      // ── Kinetic state machine ──
      const now = timestamp;
      const elapsed = now - k.stateStart;
      if (isPlaying && !k.prevPlaying && k.state !== "skip-spool") { k.state = "spool-up"; k.stateStart = now; k.target = 1.0; }
      else if (!isPlaying && k.prevPlaying) { k.state = "wind-down"; k.stateStart = now; k.target = 0.08; }
      k.prevPlaying = isPlaying;
      if (k.state === "spool-up" && elapsed > 600) k.state = "active";
      else if (k.state === "wind-down" && elapsed > 800) k.state = "idle";
      else if (k.state === "skip-cut" && elapsed > 200) { k.state = "skip-silence"; k.stateStart = now; k.target = 0.02; }
      else if (k.state === "skip-silence" && elapsed > 200) { k.state = "skip-spool"; k.stateStart = now; k.target = 1.0; }
      else if (k.state === "skip-spool" && elapsed > 400) { k.state = isPlaying ? "active" : "idle"; k.target = isPlaying ? 1.0 : 0.08; }
      k.amplitude += (k.target - k.amplitude) * (k.state === "skip-cut" ? 0.2 : 0.06);

      // ── Read snapshot ──
      const gsFn = getSnapshotRef.current;
      const snap = gsFn ? gsFn(progressRef.current) : null;
      const hasFabric = !!snap;

      // ── Update band buffers ──
      let totalEnergy = 0;
      for (let b = 0; b < V2_BANDS.length; b++) {
        const band = V2_BANDS[b];
        const buf = bufsRef.current[b];
        let raw;

        if (hasFabric) {
          raw = Math.pow(snap.bands?.[band.name] || 0, 0.6);
          raw *= (0.6 + (snap.loudness || 0) * 0.4);
          if (snap.onset) raw = Math.min(1, raw + (snap.onset_strength || 0) * 0.25);
          if (snap.beat) raw *= (1 + (snap.beat_strength || 0) * 0.15);
          raw *= k.amplitude;
          raw = Math.max(0.02, Math.min(1.0, raw));
        } else if (k.state === "idle") {
          const breath = Math.sin(s.time * 0.35) * 0.5 + 0.5;
          raw = 0.015 + breath * 0.025;
        } else {
          raw = (noise2D(s.time * 0.08 + b * 7.3, b * 4.1 + 50) * 0.5 + 0.5) * k.amplitude * 0.3;
          raw = Math.max(0.02, Math.min(1.0, raw));
        }

        // Asymmetric smoothing: near-instant attack, per-band decay
        const prev = smoothRef.current[b];
        smoothRef.current[b] = raw > prev
          ? prev + (raw - prev) * 0.88
          : prev * band.decay + raw * (1 - band.decay);
        const sm = smoothRef.current[b];

        buf.copyWithin(0, 1);
        buf[V2_PTS - 1] = sm;

        // Onset flash
        if (hasFabric && snap.onset && (snap.onset_strength || 0) > 0.3) {
          for (let fi = V2_PTS - 3; fi < V2_PTS; fi++) buf[fi] = Math.min(1.0, buf[fi] * 1.4 + 0.12);
        }

        totalEnergy += sm * band.w;
      }

      // ── Spine + flux ──
      const spine = spineRef.current;
      const flux = fluxRef.current;
      const spineVal = totalEnergy / V2_TOTAL_W;
      const fluxVal = Math.abs(spineVal - prevSpineRef.current);
      prevSpineRef.current = spineVal;
      spine.copyWithin(0, 1); spine[V2_PTS - 1] = spineVal;
      flux.copyWithin(0, 1); flux[V2_PTS - 1] = fluxVal;

      // ── Beat / onset events ──
      if (hasFabric && snap.beat && spineVal > 0.15) {
        if (s.ghosts.length < V2_MAX_GHOSTS) s.ghosts.push({ profile: Float32Array.from(spine), life: 1.0 });
        s.beatFlash = 1.0;
      }

      if (hasFabric && snap.onset && spineVal > 0.1 && s.particles.length < V2_MAX_PARTICLES) {
        const count = 2 + Math.floor(Math.random() * 4);
        const maxD = h * 0.48;
        for (let p = 0; p < count; p++) {
          const side = Math.random() > 0.5 ? 1 : -1;
          s.particles.push({
            x: w * 0.95, y: h / 2 + side * spineVal * maxD * (0.3 + Math.random() * 0.7),
            vx: (Math.random() - 0.5) * 0.4, vy: (0.4 + Math.random() * 1.4) * side,
            life: 1.0, size: 0.3 + Math.random() * 1.0, decay: 0.012 + Math.random() * 0.021,
          });
        }
      }

      // Update particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= p.decay;
        if (p.life <= 0) s.particles.splice(i, 1);
      }
      // Update ghosts
      for (let i = s.ghosts.length - 1; i >= 0; i--) { s.ghosts[i].life -= 0.01; if (s.ghosts[i].life <= 0) s.ghosts.splice(i, 1); }
      // Update rungs
      for (let i = s.rungs.length - 1; i >= 0; i--) { s.rungs[i].x -= 0.8; s.rungs[i].life -= 0.015; if (s.rungs[i].life <= 0 || s.rungs[i].x < 0) s.rungs.splice(i, 1); }
      // Beat flash decay
      s.beatFlash *= 0.85;
      // Center wander
      s.centerWander = noise2D(s.time * 0.1, 42) * 3;

      // ══════ DRAW ══════
      const textColor = getComputedStyle(canvas).getPropertyValue("--color-text").trim() || "#e8e6e3";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [232, 230, 227];

      ctx.clearRect(0, 0, w, h);
      const centerY = h * 0.5 + s.centerWander;
      const maxDisp = h * 0.48;
      const edgeTaper = (t) => Math.min(1, t / 0.08, (1 - t) / 0.08);

      // ── Layer 1: Ghost echoes ──
      for (const ghost of s.ghosts) {
        const alpha = ghost.life * ghost.life * 0.06;
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = 0.35;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          for (let i = 0; i < ghost.profile.length; i++) {
            const x = (i / (ghost.profile.length - 1)) * w;
            const y = centerY + dir * ghost.profile[i] * maxDisp * 0.6 * edgeTaper(i / (ghost.profile.length - 1));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // ── Layer 2: Terrain (65 lines) ──
      const drawSide = (numLines, dir, bassW, trebleW) => {
        for (let l = 0; l < numLines; l++) {
          const age = l / Math.max(1, numLines - 1);
          const tOff = Math.floor(age * 14);
          const alpha = 0.045 + age * 0.16;
          let lw = 0.35 + age * 0.4;
          if (age > 0.9 && s.beatFlash > 0.4) lw += 0.4;
          const dispScale = 0.35 + age * 0.65;
          const seed = s.lineSeeds[dir === 1 ? l : V2_BOT + l];
          const ampVar = 0.82 + (noise2D(seed, s.time * 0.2) * 0.5 + 0.5) * 0.22;

          ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let i = 0; i < V2_PTS; i++) {
            const x = (i / (V2_PTS - 1)) * w;
            const t = i / (V2_PTS - 1);
            // Amplitude taper — gentle, only kills big swings at edges
            const ampTaper = Math.min(1, i / 5, (V2_PTS - 1 - i) / 5);
            const bIdx = Math.max(0, i - tOff);

            // Bass displacement (sub + bass + low_mid)
            let bassD = 0;
            for (let b = 0; b < 3; b++) bassD += bufsRef.current[b][bIdx] * V2_BANDS[b].amp * V2_BANDS[b].w * 0.45;
            // Treble displacement (mid + high_mid + high + air)
            let trebD = 0;
            for (let b = 3; b < 7; b++) trebD += bufsRef.current[b][bIdx] * V2_BANDS[b].amp * V2_BANDS[b].w * 0.45;
            const combined = bassD * bassW + trebD * trebleW;

            // Noise runs full width — edges stay alive
            const noiseAmt = 1.5 + (1 - age) * 2.0;
            const n = noise2D(t * 9.6 + seed, s.time * 0.6 + seed * 0.1) * noiseAmt;
            let streak = 0;
            if (age > 0.85 && i > V2_PTS - 5) streak = flux[i] * 8 * (i - (V2_PTS - 5)) / 4;

            const y = centerY + dir * (combined * dispScale * maxDisp * ampVar * ampTaper) + n + dir * streak;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      };
      drawSide(V2_BOT, 1, 1.0, 0.4);
      drawSide(V2_TOP, -1, 0.3, 1.0);

      // ── Layer 3: DNA Helix ──
      for (let strand = 0; strand < 3; strand++) {
        const sPhase = (strand * 2 * Math.PI) / 3;
        const aMul = [0.85, 1.0, 1.15][strand];
        for (let trail = 0; trail < 2; trail++) {
          ctx.beginPath();
          for (let i = 0; i < V2_PTS; i++) {
            const t = i / (V2_PTS - 1);
            const x = t * w;
            const edge = edgeTaper(t);
            const twist = Math.sin(i * 0.15 - s.time * 4.2 + sPhase);
            const openAmt = 5 + spine[i] * 14 + flux[i] * 8;
            const hNoise = noise2D(t * 7.2 + strand * 50, s.time * 0.8) * 1.5 * edge;
            const y = centerY + twist * openAmt * aMul * edge + hNoise + trail * 0.5;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          const depth = Math.cos(60 * 0.15 - s.time * 4.2 + sPhase) * 0.5 + 0.5;
          ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${depth * 0.22 * (trail === 0 ? 1 : 0.4)})`;
          ctx.lineWidth = 0.3 + depth * 0.4;
          ctx.stroke();
        }
      }

      // Spawn beat rungs (after helix so we have positions)
      if (hasFabric && snap.beat && s.rungs.length < V2_MAX_RUNGS) {
        const xi = V2_PTS - 1;
        const twist0 = Math.sin(xi * 0.15 - s.time * 4.2);
        const twist1 = Math.sin(xi * 0.15 - s.time * 4.2 + 2 * Math.PI / 3);
        const openAmt = 5 + spineVal * 14 + fluxVal * 8;
        s.rungs.push({ x: xi, twist0, twist1, openAmt, life: 1.0, energy: spineVal });
      }

      // ── Layer 4: Beat rungs ──
      for (const rung of s.rungs) {
        const ri = Math.max(0, Math.floor(rung.x));
        const rx = (rung.x / V2_PTS) * w;
        const edge = edgeTaper(rung.x / V2_PTS);
        if (edge < 0.01) continue;
        const twist0 = Math.sin(ri * 0.15 - s.time * 4.2);
        const twist1 = Math.sin(ri * 0.15 - s.time * 4.2 + 2 * Math.PI / 3);
        const spE = spine[ri] || 0;
        const flE = flux[ri] || 0;
        const openAmt = 5 + spE * 14 + flE * 8;
        const y0 = centerY + twist0 * openAmt * 0.85;
        const y1 = centerY + twist1 * openAmt * 1.0;
        const alpha = rung.life * 0.1 * edge;
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = 0.3 + rung.energy * 0.5;
        ctx.beginPath(); ctx.moveTo(rx, y0); ctx.lineTo(rx, y1); ctx.stroke();
      }

      // ── Layer 5: Particles ──
      for (const p of s.particles) {
        const alpha = p.life * p.life * 0.5;
        if (alpha < 0.005) continue;
        ctx.fillStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }

      // ── Layer 6: Beat flash spine ──
      if (s.beatFlash > 0.4) {
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${s.beatFlash * 0.05})`;
        ctx.lineWidth = s.beatFlash * 1.5;
        ctx.beginPath();
        for (let i = 0; i < V2_PTS; i++) {
          const x = (i / (V2_PTS - 1)) * w;
          const y = centerY + Math.sin(i * 0.1 - s.time * 2) * 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    animRef.current = requestAnimationFrame(render);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [canvasWidth, isPlaying, duration, features]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} width={canvasWidth} height={height} style={{ width: "100%", height, display: "block" }} />
      {onVisualize && (
        <button
          onClick={onVisualize}
          style={{ position: "absolute", top: 8, right: 10, background: "transparent", border: "none", cursor: "pointer", padding: 4, opacity: 0.15, transition: "opacity 300ms", color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}
          title="Visualize"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.5)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.15)}
        >
          <ExternalLink size={12} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
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

  // Per-band temporal buffers — rolling window of smoothed energy values
  const bandBuffersRef = useRef(null);
  const bandSmoothRef = useRef(new Float32Array(7));

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
    // Clear temporal buffers on track change
    if (bandBuffersRef.current) {
      for (const buf of bandBuffersRef.current) buf.fill(0);
      bandSmoothRef.current.fill(0);
    }
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

      // ── Generate 7 frequency ribbons (temporal buffer architecture) ──
      const gsFn = getSnapshotRef.current;
      const curProgress = progressRef.current;
      const snap = gsFn ? gsFn(curProgress) : null;
      const hasFabric = !!snap;

      // Lazy-init temporal buffers
      if (!bandBuffersRef.current) {
        bandBuffersRef.current = BAND_CONFIGS.map(() => new Float32Array(T_POINTS));
      }

      const frameBands = [];

      for (let b = 0; b < BAND_CONFIGS.length; b++) {
        const band = BAND_CONFIGS[b];
        const buf = bandBuffersRef.current[b];

        // ── Compute raw energy for this band ──
        let rawEnergy;
        if (hasFabric && !live.active) {
          // Fabric mode — real frequency data from thumbprint
          const rawBand = snap.bands?.[band.name] || 0;
          const rawLoud = snap.loudness || 0;
          // Log-scale: expands quiet passages, compresses loud ones
          rawEnergy = Math.pow(rawBand, 0.6);
          // Loudness shapes overall level (additive floor, not multiplicative gate)
          rawEnergy *= (0.6 + rawLoud * 0.4);
          // Onset: additive spike for transients
          if (snap.onset) rawEnergy = Math.min(1, rawEnergy + snap.onset_strength * 0.25);
          // Beat: mild boost
          if (snap.beat) rawEnergy *= (1 + snap.beat_strength * 0.15);
          // Kinetic gate (play/pause transitions) — only multiplicative gate
          rawEnergy *= (k.amplitude / 0.55) * exhaleMultiplier;
          // Playing floor — ribbons stay contiguous, peaks ride on top
          rawEnergy = Math.max(0.15, Math.min(1.0, rawEnergy));
        } else if (live.active && (liveBass + liveMids) > 0.01) {
          // Mic mode
          const liveMap = [liveBass, liveBass, (liveBass + liveMids) / 2, liveMids, (liveMids + livePresence) / 2, livePresence, liveAir];
          rawEnergy = Math.pow(liveMap[b], 0.6) * 1.2 * (1 + liveFlux * 0.5);
          rawEnergy = Math.max(0.15, Math.min(1.0, rawEnergy));
        } else {
          // Procedural fallback
          const synthBase = noise2D(phase * 0.08 + b * 7.3, b * 4.1 + 50) * 0.5 + 0.5;
          const envMod = hasEnvelope ? envelopeValue : energy;
          const beatMod = 1 + beatPulse * danceability * 0.3;
          rawEnergy = synthBase * k.amplitude * envMod * beatMod * exhaleMultiplier;
          rawEnergy = Math.min(rawEnergy, amplitudeCeiling);
          const idleFloor = 0.08 + synthBase * 0.08;
          rawEnergy = Math.max(rawEnergy, isPlaying ? amplitudeFloor * 0.3 : idleFloor);
          rawEnergy = Math.max(0, Math.min(1.0, rawEnergy));
        }

        // ── Asymmetric smoothing: fast attack, slow decay ──
        const prev = bandSmoothRef.current[b];
        if (rawEnergy > prev) {
          bandSmoothRef.current[b] = prev * 0.3 + rawEnergy * 0.7;   // attack ~2 frames
        } else {
          bandSmoothRef.current[b] = prev * 0.95 + rawEnergy * 0.05;  // decay ~650ms
        }
        const smoothed = bandSmoothRef.current[b];

        // ── Shift buffer left, push new value at right edge ──
        buf.copyWithin(0, 1);
        buf[T_POINTS - 1] = smoothed;

        // ── Onset flash: boost rightmost points on transients ──
        if (hasFabric && snap.onset && snap.onset_strength > 0.3) {
          const flashBoost = snap.onset_strength * 0.3;
          for (let fi = T_POINTS - 4; fi < T_POINTS; fi++) {
            buf[fi] = Math.min(1.0, buf[fi] + flashBoost);
          }
        }

        // ── Generate sinusoidal ribbon path from temporal buffer ──
        const bandPoints = [];
        for (let i = 0; i < T_POINTS; i++) {
          const t = i / (T_POINTS - 1);
          const edge = Math.min(1, t / 0.08, (1 - t) / 0.08);
          const bufVal = buf[i]; // energy at this time position

          // Primary wave — frequency defines band character
          const wave = Math.sin(2 * Math.PI * band.freq * t + phase * band.phaseSpeed + band.phaseOff);
          // Harmonic overtone (golden ratio) for organic shape
          const harmonic = Math.sin(2 * Math.PI * band.freq * 1.618 * t + phase * band.phaseSpeed * 0.7 + band.phaseOff * 1.3) * 0.25;
          // Noise layer for breath and irregularity
          const tex = noise2D(t * band.noiseScale + keyOffset, phase * 0.2 + b * 10) * 0.2;

          // bufVal modulates the wave — loud = big displacement, quiet = flat
          const displacement = (wave * 0.55 + harmonic + tex) * bufVal * band.ampMax * edge;
          bandPoints.push(displacement);
        }

        frameBands.push(bandPoints);
      }

      historyRef.current.push(frameBands);
      if (historyRef.current.length > T_LAYERS) historyRef.current.shift();

      // ── Render frequency ribbons ──
      const style = getComputedStyle(canvas);
      const textColor = style.getPropertyValue("--color-text").trim() || "#e8e6e3";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [232, 230, 227];

      ctx.clearRect(0, 0, w, h);
      const layers = historyRef.current;
      const centerY = h * 0.5;
      const maxDisp = h * 0.45;

      // Beat width pulse for newest layers
      let beatWidthBoost = 1.0;
      if (hasFabric && snap && snap.beat) {
        beatWidthBoost = 1 + snap.beat_strength * 0.3;
      }

      for (let l = 0; l < layers.length; l++) {
        const age = l / Math.max(1, layers.length - 1);
        const frame = layers[l];
        const isNewest = l >= layers.length - 3;

        for (let b = 0; b < BAND_CONFIGS.length; b++) {
          const band = BAND_CONFIGS[b];
          const data = frame[b];
          if (!data) continue;

          const alpha = 0.02 + age * age * 0.18;
          const baseLw = band.lw * (0.3 + age * 0.7);
          let lw = baseLw * (0.7 + acousticness * 0.6);

          // Dynamic line width on newest layer — thicker at peaks
          if (l === layers.length - 1 && bandBuffersRef.current) {
            const bufAvg = bandBuffersRef.current[b].reduce((s, v) => s + v, 0) / T_POINTS;
            lw *= (0.6 + bufAvg * 0.6);
          }

          // Beat pulse — briefly widen newest layers on beat
          if (isNewest) lw *= beatWidthBoost;

          ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
          ctx.lineWidth = lw;
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * w;
            const y = centerY - data[i] * maxDisp;
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              const px = ((i - 1) / (data.length - 1)) * w;
              const py = centerY - data[i - 1] * maxDisp;
              ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
            }
          }
          ctx.stroke();
        }
      }
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

const ORB_R_POINTS = 64;
const ORB_R_LAYERS = 30;

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
  const wispsRef = useRef([]);
  const sparksRef = useRef([]);
  const style2Ref = useRef({ noise2: createNoise2D(), tracers: [], hits: [], frame: 0, time: 0, amp: 0, ampVel: 0 });
  const style4Ref = useRef({ n: Array.from({ length: 6 }, (_, i) => createNoise2D()), time: 0 });
  const fluidRef = useRef(null);
  const spireRef = useRef({ rings: [], lastAdd: 0 });
  const [vizStyle, setVizStyle] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlViz = params.get("viz");
      const valid = [1, 2, 3, 4];
      if (urlViz) { localStorage.setItem("fulkit-viz-style", urlViz); const v = parseInt(urlViz); return valid.includes(v) ? v : 1; }
      const v = parseInt(localStorage.getItem("fulkit-viz-style")); return valid.includes(v) ? v : 1;
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
  // Adaptive quality — auto-reduce detail if fps drops below threshold
  const perfRef = useRef({ frameTimes: [], quality: 1.0, checkInterval: 0 });

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
    wispsRef.current = [];
    sparksRef.current = [];
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

      // ── Adaptive quality: monitor fps, scale detail ──
      const pf = perfRef.current;
      pf.frameTimes.push(ts);
      if (pf.frameTimes.length > 30) pf.frameTimes.shift();
      pf.checkInterval++;
      if (pf.checkInterval >= 30 && pf.frameTimes.length >= 20) {
        pf.checkInterval = 0;
        const elapsed = pf.frameTimes[pf.frameTimes.length - 1] - pf.frameTimes[0];
        const avgFps = (pf.frameTimes.length - 1) / (elapsed / 1000);
        if (avgFps < 20) pf.quality = Math.max(0.3, pf.quality - 0.15);
        else if (avgFps < 28) pf.quality = Math.max(0.5, pf.quality - 0.05);
        else if (avgFps > 40 && pf.quality < 1) pf.quality = Math.min(1, pf.quality + 0.05);
      }
      const Q = pf.quality; // 0.3–1.0

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
      // STYLE 1: Light Amoeba — fluid pulse + song data
      // Smooth morphing contour with fade trail. Audio data shapes
      // displacement, slow waves add fluid motion.
      // ══════════════════════════════════════════
      if (curVizStyle === 1) {
        const s2 = style2Ref.current;
        if (k.state !== "idle") s2.time += dt;
        s2.frame++;

        const cx = w / 2, cy = h / 2;
        const s2amp = k.amplitude / 0.55;
        const S2_N = 40;
        const rot = s2.time * 0.04;
        const morphT = s2.time * 1.2;
        const col = [100, 97, 90];
        const bandNames2 = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

        // ── Alpha fade trail ──
        const fadeAlpha = k.state === "idle" ? 0.3 : 0.10 + (1 - s2amp) * 0.12;
        ctx.fillStyle = `rgba(239,237,232,${fadeAlpha})`;
        ctx.fillRect(0, 0, w, h);

        // Silent — clean circle
        if (s2amp < 0.05) {
          ctx.clearRect(0, 0, w, h);
          ctx.beginPath();
          ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.12)`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
          return;
        }

        // ── Fluid pulse — slow sine gives continuous motion ──
        const pulse = Math.sin(k.beatAccumulator * Math.PI) * 0.5 + 0.5;
        const deepPulse = Math.sin(k.beatAccumulator * Math.PI * 0.5) * 0.5 + 0.5;

        // ── Energy swell — smooth envelope follower ──
        const targetSwell = hasEnvelope ? envelopeValue : energy;
        if (s2.swell === undefined) s2.swell = 0;
        s2.swell += (targetSwell - s2.swell) * 0.015;
        const swell = s2.swell;

        // ── Build shape ──
        const pts = [];
        const innerPts = [];
        const breathe = Math.sin(s2.time * 0.4) * 0.06 * s2amp;
        const travelPhase = k.beatAccumulator * Math.PI * 0.5;

        for (let i = 0; i < S2_N; i++) {
          const a = (i / S2_N) * Math.PI * 2 + rot;
          const nx = Math.cos(a), ny = Math.sin(a);
          const pointAngle = (i / S2_N) * Math.PI * 2;

          // Liquid morphing
          const m1 = noise2D(nx * 1.0, ny * 1.0 + morphT) * 0.5;
          const m2 = noise2D(nx * 2.0 + 30, ny * 2.0 + morphT * 0.6) * 0.25;

          // Slow traveling lobe
          const travel = Math.sin(pointAngle - travelPhase) * 0.5 + 0.5;
          const travel2 = Math.sin(pointAngle * 2 + travelPhase * 0.3) * 0.25 + 0.5;

          const waveDisp = (travel * 0.7 + travel2 * 0.3) * pulse * s2amp * 0.10;
          const swellDisp = swell * deepPulse * s2amp * 0.10;

          const aR = baseR * (1 + (m1 + m2) * s2amp * 0.12 + breathe + waveDisp + swellDisp);

          // Audio displacement
          let disp;
          if (hasFabric) {
            const bandPos = (i / S2_N) * bandNames2.length;
            const bandIdx = Math.floor(bandPos) % bandNames2.length;
            const bandNext = (bandIdx + 1) % bandNames2.length;
            const bandFrac = bandPos - Math.floor(bandPos);
            const bandVal = (snap.bands[bandNames2[bandIdx]] || 0) * (1 - bandFrac) +
                            (snap.bands[bandNames2[bandNext]] || 0) * bandFrac;
            const realLoud = snap.loudness || 0;
            disp = (Math.pow(bandVal, 0.6) * 0.5 + realLoud * 0.3) * (0.3 + swell * 0.7);
            disp *= (1 + (snap.flux || 0) * 0.1);
            disp *= (0.4 + travel * 0.6);
          } else {
            disp = noise2D(nx * 1.5 + morphT * 0.15, ny * 1.5 + morphT * 0.1) * 0.4 + 0.25;
            disp *= (0.4 + pulse * 0.6);
          }
          disp *= s2amp * exhale * baseR * 1.1;

          const outerR = aR + disp;
          pts.push({ x: cx + nx * outerR, y: cy + ny * outerR });

          // Inner contour
          const im = noise2D(nx * 1.5 + 200, ny * 1.5 + morphT * 0.7);
          const innerDrift = Math.sin(pointAngle + travelPhase) * 0.5 + 0.5;
          const innerR = Math.max(baseR * 0.04, aR * (0.65 + breathe * 0.4) - disp * 0.4 + im * baseR * 0.12 * s2amp - innerDrift * baseR * 0.05 * s2amp);
          innerPts.push({ x: cx + nx * innerR, y: cy + ny * innerR });
        }

        // ── Draw outer contour ──
        drawOrbSmooth(ctx, pts);
        const outerAlpha = 0.18 + s2amp * 0.28 + pulse * s2amp * 0.04;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${outerAlpha})`;
        ctx.lineWidth = 0.8 + s2amp * 0.6 + pulse * s2amp * 0.1;
        ctx.stroke();

        // ── Draw inner contour ──
        drawOrbSmooth(ctx, innerPts);
        const innerAlpha = 0.12 + s2amp * 0.22;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${innerAlpha})`;
        ctx.lineWidth = 0.5 + s2amp * 0.4;
        ctx.stroke();

        return;
      }

      // ══════════════════════════════════════════
      // STYLE 3: Crystal — subdivided icosahedron, audio warps facets
      // Perfect gem at rest, deforms with energy when playing.
      // ══════════════════════════════════════════
      if (curVizStyle === 3) {
        const s4 = style4Ref.current;
        const [n1, n2, n3] = s4.n;
        s4.time += dt;

        const activity = Math.min(1, k.amplitude / 0.55);
        const cx = w / 2, cy = h * 0.48;
        const sc = dim * 0.4;

        const ac = acousticness;
        const val = valence;
        const bandNames4 = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

        // Smoothed audio followers — ebb and flow instead of snapping
        if (s4.sLoud === undefined) {
          s4.sLoud = 0; s4.sEnergy = 0; s4.sBands = new Array(7).fill(0); s4.sBeat = 0;
          s4.presence = 0; // ramp-in from 0→1
        }
        // Presence ramp — ramp in when playing, ramp back to sphere on pause
        const presenceTarget = isPlaying ? 1 : 0;
        s4.presence += (presenceTarget - s4.presence) * 0.03; // ~1.5s ramp in/out
        const presence = s4.presence;
        const rawLoud = hasFabric ? (snap.loudness || 0) : (features?.loudness ? Math.max(0, (features.loudness + 35) / 35) : 0);
        const rawEnergy = energy;
        s4.sLoud += (rawLoud - s4.sLoud) * 0.06;       // slow swell
        s4.sEnergy += (rawEnergy - s4.sEnergy) * 0.05;  // gradual rise/fall
        for (let b = 0; b < 7; b++) {
          const bv = hasFabric ? (snap.bands[bandNames4[b]] || 0) : 0;
          s4.sBands[b] += (bv - s4.sBands[b]) * 0.08;   // per-band smooth
        }
        // Beat decays naturally — quick rise, slow fall
        const rawBeat = hasFabric && snap.beat ? (snap.beat_strength || 0) : 0;
        s4.sBeat = Math.max(s4.sBeat * 0.93, rawBeat);

        const loud = s4.sLoud;
        const en = s4.sEnergy;

        const rotY = s4.time * 0.06 + keyOffset * 0.5;
        const rotX = -0.35 + n1(s4.time * 0.015, 100) * 0.08;

        ctx.clearRect(0, 0, w, h);

        function project(x3, y3, z3) {
          const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
          let rx = x3 * cosY - z3 * sinY;
          let rz = x3 * sinY + z3 * cosY;
          const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
          let ry = y3 * cosX - rz * sinX;
          rz = y3 * sinX + rz * cosX;
          const perspective = 600;
          const depth = perspective / (perspective + rz + 200);
          return { x: cx + rx * sc * depth, y: cy + ry * sc * depth, depth, z: rz };
        }

        // Build icosahedron
        const phi = (1 + Math.sqrt(5)) / 2;
        const icoRaw = [
          [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
          [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
          [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
        ];
        // Normalize
        const icoVerts = icoRaw.map(v => {
          const len = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2);
          return [v[0]/len, v[1]/len, v[2]/len];
        });
        const icoFaces = [
          [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
          [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
          [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
          [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
        ];

        // Subdivide twice for finer facets
        const midCache = {};
        function getMid(a, b) {
          const key = Math.min(a,b) + '-' + Math.max(a,b);
          if (midCache[key] !== undefined) return midCache[key];
          const va = icoVerts[a], vb = icoVerts[b];
          const mid = [(va[0]+vb[0])/2, (va[1]+vb[1])/2, (va[2]+vb[2])/2];
          const len = Math.sqrt(mid[0]**2 + mid[1]**2 + mid[2]**2);
          mid[0]/=len; mid[1]/=len; mid[2]/=len;
          icoVerts.push(mid);
          midCache[key] = icoVerts.length - 1;
          return midCache[key];
        }

        let faces = icoFaces;
        for (let sub = 0; sub < 2; sub++) {
          const newFaces = [];
          for (const [a,b,c] of faces) {
            const ab = getMid(a,b), bc = getMid(b,c), ca = getMid(c,a);
            newFaces.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
          }
          faces = newFaces;
        }

        // Deform vertices — always shows noise surface, audio adds on top
        const vertices = [];
        for (const v of icoVerts) {
          const deform = n1(v[0] * 2 + s4.time * 0.12, v[2] * 2 + v[1] * 1.5 + s4.time * 0.09);
          const deform2 = n3(v[0] * 1.2 - s4.time * 0.08, v[2] * 1.5 + v[1] + s4.time * 0.11) * 0.4;
          const facet = (1 - val) * n2(v[0] * 6, v[2] * 6 + s4.time * 0.15) * 0.3;

          // Base breathing — scales with presence (ramps in, ramps out)
          const baseDeform = (deform * 0.15 + deform2 * 0.1) * presence;

          // Audio adds on top — gated through presence ramp
          let audioDeform = 0;
          if (presence > 0.01) {
            let magnitude = loud * 0.7 + en * 0.5 + s4.sBeat * 0.3;
            const bandPos = ((Math.atan2(v[2], v[0]) + Math.PI) / (Math.PI * 2)) * 7;
            const bandIdx = Math.floor(bandPos) % 7;
            const bandNext = (bandIdx + 1) % 7;
            const bandFrac = bandPos - Math.floor(bandPos);
            const bandVal = s4.sBands[bandIdx] * (1 - bandFrac) + s4.sBands[bandNext] * bandFrac;
            magnitude += bandVal * 0.6;
            const rawShape = deform * 0.8 + deform2 + facet;
            const gated = Math.max(0, rawShape - 0.2) / 0.8;
            audioDeform = gated * magnitude * 1.8 * presence * exhale;
          }

          const r = 1.0 + baseDeform + audioDeform;
          vertices.push({ x3: v[0] * r, y3: v[1] * r, z3: v[2] * r });
        }

        // Edges from faces (deduplicated)
        const edges = [];
        const edgeSet = new Set();
        for (const [a,b,c] of faces) {
          const add = (i,j) => {
            const key = Math.min(i,j) + '-' + Math.max(i,j);
            if (!edgeSet.has(key)) { edgeSet.add(key); edges.push([i,j]); }
          };
          add(a,b); add(b,c); add(c,a);
        }

        // Project
        const projected = vertices.map(v => project(v.x3, v.y3, v.z3));

        // Sort back to front
        edges.sort((a, b) => {
          const za = (projected[a[0]].z + projected[a[1]].z) / 2;
          const zb = (projected[b[0]].z + projected[b[1]].z) / 2;
          return za - zb;
        });

        // Draw
        const col = [32, 30, 26];
        for (const [i, j] of edges) {
          const a = projected[i], b = projected[j];
          if (!a || !b) continue;
          const avgDepth = (a.depth + b.depth) / 2;
          const alpha = Math.pow(avgDepth, 1.3) * 0.65;
          if (alpha < 0.005) continue;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.min(0.8, alpha)})`;
          ctx.lineWidth = (0.3 + ac * 0.5) * avgDepth;
          ctx.stroke();
        }

        return;
      }


      // ══════════════════════════════════════════
      // STYLE 4: Pulse Ring — radial spokes between inner/outer circles
      // Noise modulates each spoke's reach. Audio drives intensity.
      // Inspired by Etienne Jacob's ring of particles.
      // ══════════════════════════════════════════
      if (curVizStyle === 4) {
        const s4 = style4Ref.current;
        const [n1, n2] = s4.n;
        s4.time += dt;

        const noise2D = noiseRef.current;
        const cx = w / 2, cy = h / 2;
        const SEGS = 164;
        const innerR = dim * 0.10;
        const outerR = dim * 0.30;
        const midR = (innerR + outerR) / 2;
        const col = [42, 40, 36];

        // Smoothed followers
        if (!s4.prBands) { s4.prBands = new Array(7).fill(0); s4.prLoud = 0; s4.prBeat = 0; s4.prPresence = 0; }
        const bandNames = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];
        const presTarget = isPlaying ? 1 : 0;
        s4.prPresence += (presTarget - s4.prPresence) * 0.03;
        const presence = s4.prPresence;

        if (hasFabric) {
          for (let b = 0; b < 7; b++) s4.prBands[b] += ((snap.bands[bandNames[b]] || 0) - s4.prBands[b]) * 0.08;
          s4.prLoud += ((snap.loudness || 0) - s4.prLoud) * 0.06;
          s4.prBeat = Math.max(s4.prBeat * 0.94, snap.beat ? (snap.beat_strength || 0) * 0.4 : 0);
        } else {
          const proc = energy * Math.min(1, k.amplitude / 0.55);
          for (let b = 0; b < 7; b++) s4.prBands[b] += (proc * (0.5 + noise2D(b * 3 + s4.time * 0.2, s4.time * 0.1) * 0.5) - s4.prBands[b]) * 0.06;
          s4.prLoud += (proc * 0.7 - s4.prLoud) * 0.06;
          s4.prBeat = Math.max(s4.prBeat * 0.94, beatPulse * 0.3);
        }

        ctx.clearRect(0, 0, w, h);

        // Looping time parameter (like Etienne's seamless loop)
        const loopT = s4.time * 0.04;
        const mr = 0.8; // loop radius in noise space

        // ── Draw radial spokes ──
        for (let i = 0; i < SEGS; i++) {
          const angle = (i / SEGS) * Math.PI * 2;
          const cosA = Math.cos(angle), sinA = Math.sin(angle);

          // Noise displacement — flows around the ring like the original
          const scl = 2.5;
          const nx = cosA * scl, ny = sinA * scl;
          const noiseVal = Math.pow(
            (1 + n1(nx / 2 + mr * Math.cos(Math.PI * 2 * loopT), ny / 2 + mr * Math.sin(Math.PI * 2 * loopT))) / 2,
            2.0
          );

          // Audio modulation — band energy shapes the ring
          const bandPos = (i / SEGS) * 7;
          const bandIdx = Math.floor(bandPos) % 7;
          const bandNext = (bandIdx + 1) % 7;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = s4.prBands[bandIdx] * (1 - bandFrac) + s4.prBands[bandNext] * bandFrac;

          // Combined displacement: noise base + audio push — amplified
          const audioMod = (bandVal * 0.8 + s4.prLoud * 0.4 + s4.prBeat * 0.15) * presence;
          const displacement = noiseVal * (0.4 + audioMod * 2.0);

          // Inner and outer points — wide reach
          const iR = midR - (innerR * 0.5) * (1 - displacement * 0.6);
          const oR = midR + (outerR - midR) * displacement * 1.3 + s4.prBeat * dim * 0.015 * presence;

          const x1 = cx + cosA * iR, y1 = cy + sinA * iR;
          const x2 = cx + cosA * oR, y2 = cy + sinA * oR;

          // Spoke alpha — much more visible
          const spokeAlpha = 0.12 + displacement * 0.5 + audioMod * 0.25;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.min(0.75, spokeAlpha)})`;
          ctx.lineWidth = 0.6 + displacement * 1.2;
          ctx.stroke();
        }

        // ── Outer ring contour ──
        ctx.beginPath();
        for (let i = 0; i <= SEGS; i++) {
          const angle = (i / SEGS) * Math.PI * 2;
          const cosA = Math.cos(angle), sinA = Math.sin(angle);
          const scl = 2.5;
          const noiseVal = Math.pow(
            (1 + n1(cosA * scl / 2 + mr * Math.cos(Math.PI * 2 * loopT), sinA * scl / 2 + mr * Math.sin(Math.PI * 2 * loopT))) / 2,
            2.0
          );
          const bandPos = (i / SEGS) * 7;
          const bIdx = Math.floor(bandPos) % 7;
          const bNext = (bIdx + 1) % 7;
          const bFrac = bandPos - Math.floor(bandPos);
          const bVal = s4.prBands[bIdx] * (1 - bFrac) + s4.prBands[bNext] * bFrac;
          const audioMod = (bVal * 0.8 + s4.prLoud * 0.4) * presence;
          const oR = midR + (outerR - midR) * noiseVal * (0.4 + audioMod * 2.0) * 1.3 + s4.prBeat * dim * 0.015 * presence;
          const x = cx + cosA * oR, y = cy + sinA * oR;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.35 + s4.prLoud * 0.3 * presence})`;
        ctx.lineWidth = 1.2 + s4.prLoud * 0.8 * presence;
        ctx.stroke();

        // ── Inner ring contour — thin, steady ──
        ctx.beginPath();
        for (let i = 0; i <= SEGS; i++) {
          const angle = (i / SEGS) * Math.PI * 2;
          const x = cx + Math.cos(angle) * (midR - innerR * 0.3);
          const y = cy + Math.sin(angle) * (midR - innerR * 0.3);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.25)`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        return;
      }

      // ══════════════════════════════════════════
      // STYLE 2 (archive): Original Radial Terrain
      // ══════════════════════════════════════════
      if (curVizStyle === 2) {
      const points = [];
      const bandNames = ["sub", "bass", "low_mid", "mid", "high_mid", "high", "air"];

      for (let i = 0; i < N; i++) {
        const th = (i / N) * Math.PI * 2;
        const cnx = Math.cos(th), sny = Math.sin(th);

        let amp;
        if (hasFabric) {
          const bandPos = (i / N) * bandNames.length;
          const bandIdx = Math.floor(bandPos) % bandNames.length;
          const bandNext = (bandIdx + 1) % bandNames.length;
          const bandFrac = bandPos - Math.floor(bandPos);
          const bandVal = (snap.bands[bandNames[bandIdx]] || 0) * (1 - bandFrac) +
                          (snap.bands[bandNames[bandNext]] || 0) * bandFrac;
          const realLoud = snap.loudness || 0;
          const texture = noise2D(cnx * 3 + keyOffset, sny * 3 + phase * 0.3) * 0.12;
          const onsetSpike = snap.onset ? (snap.onset_strength || 0) * 0.5 : 0;
          amp = (bandVal * 0.5 + realLoud * 0.35 + onsetSpike + texture) * realLoud;
          amp *= (1 + (snap.flux || 0) * 0.8);
          if (snap.beat) amp *= (1 + (snap.beat_strength || 0) * 0.6);
          amp *= k.amplitude / 0.55;
          amp *= exhale;
          amp = Math.max(amp, isPlaying ? 0.01 : 0.005);
          amp *= 1 + (Math.random() - 0.5) * 0.06;
        } else {
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

      const isWindingDown = k.state === "wind-down" || k.state === "skip-cut" || k.state === "skip-silence";
      if (k.state === "active" || k.state === "spool-up" || k.state === "skip-spool") {
        historyRef.current.push(points);
        if (historyRef.current.length > ORB_R_LAYERS) historyRef.current.shift();
      } else if (isWindingDown) {
        historyRef.current.push(points);
        if (historyRef.current.length > 3) historyRef.current.shift();
        if (historyRef.current.length > 3) historyRef.current.shift();
      } else if (k.state === "idle") {
        if (historyRef.current.length > 3) historyRef.current.shift();
      }

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const rot = phase * 0.3;
      const amoebaMag = 0.03 + acousticness * 0.06;
      const col = [78, 75, 68];
      const layers = historyRef.current;
      const layerCount = layers.length;

      for (let l = 0; l < layerCount; l++) {
        const data = layers[l];
        const age = l / Math.max(1, layerCount - 1);
        const outShift = (layerCount - 1 - l) * 4.5;
        const alpha = 0.03 + age * age * 0.55;
        const baseLw = 0.4 + age * 1.4;
        const lw = baseLw * (0.7 + acousticness * 0.6);
        const ageMorph = (1 - age) * 0.3;
        const outPts = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2 + rot;
          const aR = baseR * (1 + beatPulse * 0.06) * (1 + noise2D(Math.cos(th) * 1.5, Math.sin(th) * 1.5 + phase * 0.05) * amoebaMag);
          let displacement = data[i] * baseR * 1.8;
          if (ageMorph > 0.01) {
            displacement += noise2D(Math.cos(th) * 3 + l * 0.7, Math.sin(th) * 3 + l * 0.7) * baseR * ageMorph;
          }
          const r = aR + displacement + outShift;
          outPts.push({ x: cx + Math.cos(th) * r, y: cy + Math.sin(th) * r });
        }
        drawOrbSmooth(ctx, outPts);
        const isNewest = l === layerCount - 1;
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${isNewest ? alpha * (1 + beatPulse * 0.5) : alpha})`;
        ctx.lineWidth = isNewest ? lw * (1 + beatPulse * 0.4) : lw;
        ctx.stroke();

        const inPts = [];
        for (let i = 0; i < N; i++) {
          const th = (i / N) * Math.PI * 2 + rot;
          const cnTh = Math.cos(th), snTh = Math.sin(th);
          const aR = baseR * (1 + noise2D(cnTh * 1.5, snTh * 1.5 + phase * 0.05) * amoebaMag);
          let inDisp = data[i] * baseR * 0.85;
          inDisp *= (1 + beatPulse * 0.25);
          const inShift = (layerCount - 1 - l) * 1.2;
          const r = Math.max(baseR * 0.06, aR - inDisp - inShift);
          inPts.push({ x: cx + cnTh * r, y: cy + snTh * r });
        }
        drawOrbSmooth(ctx, inPts);
        const inAlpha = 0.01 + age * age * 0.32;
        const inLw = (0.2 + age * 0.9) * (0.7 + acousticness * 0.6);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${isNewest ? inAlpha * (1 + beatPulse * 0.3) : inAlpha})`;
        ctx.lineWidth = isNewest ? inLw * (1 + beatPulse * 0.2) : inLw;
        ctx.stroke();
      }
      } // end style 2


        // Energy propagation buffer — persists between frames
        if (!s2.daEnergy) s2.daEnergy = new Float32Array(DA_N);
        const eBuf = s2.daEnergy;

        // ── Step 1: Inject energy at band positions ──
        for (let b = 0; b < 7; b++) {
          const bandEnergy = s2.daBands[b];
          if (bandEnergy < 0.01) continue;
          // Each band injects at its slice of the contour
          const centerPt = Math.floor((b / 7) * DA_N);
          const spread = 4; // injection spreads across ~8 points
          for (let s = -spread; s <= spread; s++) {
            const idx = (centerPt + s + DA_N) % DA_N;
            const falloff = 1 - Math.abs(s) / (spread + 1);
            eBuf[idx] = Math.max(eBuf[idx], bandEnergy * falloff * 0.8);
          }
        }
        // Onset injects a sharp spike at a rotating position
        if (s2.daOnset > 0.05) {
          const onsetPt = Math.floor((s2.time * 3) % DA_N);
          for (let s = -3; s <= 3; s++) {
            const idx = (onsetPt + s + DA_N) % DA_N;
            eBuf[idx] = Math.max(eBuf[idx], s2.daOnset * (1 - Math.abs(s) / 4));
          }
        }
        // Beat pumps everything
        if (s2.daBeat > 0.05) {
          for (let i = 0; i < DA_N; i++) eBuf[i] = Math.max(eBuf[i], s2.daBeat * 0.3);
        }

        // ── Step 2: Propagate — energy flows to neighbors ──
        const tmp = new Float32Array(DA_N);
        for (let i = 0; i < DA_N; i++) {
          const prev = (i - 1 + DA_N) % DA_N;
          const next = (i + 1) % DA_N;
          // Diffusion: energy spreads sideways
          tmp[i] = eBuf[i] * 0.55 + eBuf[prev] * 0.18 + eBuf[next] * 0.18;
        }

        // ── Step 3: Decay — energy fades each frame ──
        for (let i = 0; i < DA_N; i++) {
          eBuf[i] = tmp[i] * 0.92; // 8% decay per frame
        }

        // ── Step 4: Build displacement from energy buffer ──
        const disp = new Float32Array(DA_N);
        const radii = new Float32Array(DA_N);
        const irregularity = 0.5 + energy * 0.5;

        for (let i = 0; i < DA_N; i++) {
          const a = (i / DA_N) * Math.PI * 2 + rot;
          const nx = Math.cos(a), ny = Math.sin(a);

          // Amoeba base warp
          const d1 = noise2D(nx * 0.3, ny * 0.3 + s2.time * 0.002);
          const d2 = noise2B(nx * 0.6 + 10, ny * 0.6 + s2.time * 0.005);
          const d3 = noise2D(nx * 1.2 + 30, ny * 1.2 + s2.time * 0.008);
          radii[i] = baseR * (1 + (d1 * 0.5 + d2 * 0.25 + d3 * 0.25 * irregularity) * s4amp * 0.55);

          // Displacement from energy buffer + loudness swell
          const eVal = eBuf[i];
          const loudSwell = s2.daLoud * 0.3;
          disp[i] = (Math.pow(eVal, 0.6) * 1.0 + loudSwell) * s4amp * exhale * baseR * 1.3;
        }

        // Light smooth — preserve the energy flow shape
        for (let pass = 0; pass < 2; pass++) {
          const tmpD = new Float32Array(DA_N);
          const tmpR = new Float32Array(DA_N);
          for (let i = 0; i < DA_N; i++) {
            const p = (i - 1 + DA_N) % DA_N;
            const n = (i + 1) % DA_N;
            tmpD[i] = disp[i] * 0.6 + disp[p] * 0.2 + disp[n] * 0.2;
            tmpR[i] = radii[i] * 0.6 + radii[p] * 0.2 + radii[n] * 0.2;
          }
          disp.set(tmpD);
          radii.set(tmpR);
        }

        // Capture tracer layers
        if (!s2.daTracers) { s2.daTracers = []; s2.daHits = []; }
        if (s2.frame % 3 === 0 && s4amp > 0.01) {
          s2.daTracers.push({ d: new Float32Array(disp), r: new Float32Array(radii), op: 0.6, age: 0 });
          if (s2.daTracers.length > 24) s2.daTracers.shift();
        }

        // Hit layers on beat
        if (beatPulse > 0.5 && isPlaying && s2.frame % 3 === 0) {
          const hd = new Float32Array(DA_N);
          for (let i = 0; i < DA_N; i++) hd[i] = disp[i] * 2.0;
          for (let pass = 0; pass < 2; pass++) {
            const tmp = new Float32Array(DA_N);
            for (let i = 0; i < DA_N; i++) tmp[i] = hd[i] * 0.5 + hd[(i-1+DA_N)%DA_N] * 0.25 + hd[(i+1)%DA_N] * 0.25;
            hd.set(tmp);
          }
          s2.daHits.push({ d: hd, r: new Float32Array(radii), op: 0.8, age: 0 });
          if (s2.daHits.length > 6) s2.daHits.shift();
        }

        // Age layers
        for (const l of s2.daTracers) { l.age++; l.op *= 0.96; }
        for (const l of s2.daHits) { l.age++; l.op *= 0.984; }
        s2.daTracers = s2.daTracers.filter(l => l.op > 0.015);
        s2.daHits = s2.daHits.filter(l => l.op > 0.015);

        // ── Render ──
        ctx.clearRect(0, 0, w, h);

        // All layers sorted oldest first
        const allLayers = [
          ...s2.daTracers, ...s2.daHits,
          { d: disp, r: radii, op: 1.0, age: 0 },
        ].sort((a, b) => b.age - a.age);

        for (const layer of allLayers) {
          const alpha = Math.max(0, Math.min(1, layer.op));
          if (alpha < 0.01) continue;

          const rShift = layer.age * 0.35;
          const ageFade = Math.max(0, 1 - layer.age * 0.01);
          const thisLw = lw * ageFade;

          const pts = [];
          for (let i = 0; i < DA_N; i++) {
            const a = (i / DA_N) * Math.PI * 2 + rot;
            const r = layer.r[i] + layer.d[i] - rShift;
            pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }

          // Clip-masked inner bleed
          drawOrbSmooth(ctx, pts);
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.8 * (0.4 + s4amp * 0.6) * 0.12})`;
          ctx.lineWidth = thisLw * 3;
          ctx.stroke();
          ctx.restore();

          // Sharp contour
          drawOrbSmooth(ctx, pts);
          const contourPeak = 0.5 + s4amp * 0.45;
          ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.8 * (0.4 + s4amp * 0.6) * (layer.age === 0 ? contourPeak : 0.45)})`;
          ctx.lineWidth = Math.max(0.2, thisLw * (layer.age === 0 ? 0.8 + s4amp * 0.3 : 0.5));
          ctx.stroke();

          // Inward reflection
          if (alpha > 0.06) {
            const iPts = [];
            for (let i = 0; i < DA_N; i++) {
              const a = (i / DA_N) * Math.PI * 2 + rot;
              const r = Math.max(0, layer.r[i] - layer.d[i] * 0.35 + rShift * 0.3);
              iPts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
            }
            drawOrbSmooth(ctx, iPts);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.04})`;
            ctx.lineWidth = thisLw * 1.8;
            ctx.stroke();
          }
        }

        return;
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
        <span style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tight)",
          color: "var(--color-text)",
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
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => { setVizStyle(n); try { localStorage.setItem("fulkit-viz-style", String(n)); } catch {} }}
            style={{
              width: 28, height: 28,
              background: "transparent",
              border: "none",
              color: vizStyle === n ? "var(--color-text-muted)" : "var(--color-text-dim)",
              fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
              cursor: "pointer",
              padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity 200ms",
              opacity: vizStyle === n ? 1 : 0.5,
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
    connected,
    statusChecked,
    isPlaying,
    currentTrack,
    flagged,
    playlists,
    progress,
    audioFeatures,
    fabricAnalyzed,
    toggle,
    skip,
    prev,
    flag,
    isFlagged,
    reorderFlagged,
    addTrackToSet,
    moveTrackToSet,
    removeTrackFromSet,
    allSets,
    trophiedSets,
    trophySet,
    untrophySet,
    toggleArc,
    activeSetId,
    createSet,
    deleteSet,
    renameSet,
    reorderSets,
    switchSet,
    guyCrate,
    saveGuyCrateAsSet,
    addToGuyCrate,
    removeFromGuyCrate,
    thumbsDownTrack,
    isThumbedDown,
    clearGuyCrate,
    playTrack,
    playTrackInContext,
    playPlaylist,
    fetchPlaylistTracks,
    formatTime,
    setProgress,
    seekTo,
    likeTrack,
    timeline,
    getSnapshot,
    publishedSets,
    publishSet,
    unpublishSet,
    featuredCratesRef,
    musicMessages,
    musicChatOpen,
    musicStreaming,
    tickerFact,
    sendMusicMessage,
    toggleMusicChat,
    reconnectSpotify,
  } = useFabric();

  const isMobile = useIsMobile();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "fabric" }); }, []);
  useOnboardingTrigger("fabric");

  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragNode = useRef(null);
  const [expandedMix, setExpandedMix] = useState(null);
  const [mixTracks, setMixTracks] = useState([]);
  const [mixLoading, setMixLoading] = useState(false);
  const [visualizing, setVisualizing] = useState(false);
  const [vizMode, setVizMode] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const saved = localStorage.getItem("fulkit-viz-mode");
      return saved ? parseInt(saved) : 1;
    } catch { return 1; }
  });
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterTimestamp, setPosterTimestamp] = useState(0);
  const [showSpotifyBrowser, setShowSpotifyBrowser] = useState(false);
  const [importing, setImporting] = useState(null); // playlist id being imported
  const [showSetMenu, setShowSetMenu] = useState(false);
  const [renamingSet, setRenamingSet] = useState(null);
  const [headerDragIdx, setHeaderDragIdx] = useState(null);
  const [headerDragOverIdx, setHeaderDragOverIdx] = useState(null);
  const setDragNode = useRef(null);
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
    // Bump accessed crate to front of list
    if (id) {
      setCrates(prev => {
        const idx = prev.findIndex(c => c.id === id);
        if (idx <= 0) return prev; // already first or not found
        const next = [...prev];
        const [moved] = next.splice(idx, 1);
        next.unshift(moved);
        try { localStorage.setItem("fulkit-crate-order", JSON.stringify(next.map(c => c.id))); } catch {}
        return next;
      });
    }
  }, []);
  const [crateTracks, setCrateTracks] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [completedFoldOpen, setCompletedFoldOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("fulkit-completed-fold") === "true"; } catch { return false; }
  });
  const [publishMsg, setPublishMsg] = useState(null);
  const [musicInput, setMusicInput] = useState("");
  const [expandedFeatured, setExpandedFeatured] = useState(null);
  const [featuredTracks, setFeaturedTracks] = useState([]);
  const musicChatEndRef = useRef(null);
  const musicChatScrollRef = useRef(null);
  const [discoveryAlbum, setDiscoveryAlbum] = useState(null);
  const [discoveryTracks, setDiscoveryTracks] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  // Per-set expand/collapse — default closed, persisted in localStorage
  const [expandedSetIds, setExpandedSetIds] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("fulkit-expanded-sets");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const toggleSetExpanded = useCallback((setId) => {
    setExpandedSetIds(prev => {
      // Only one set open at a time — toggle off if already open, otherwise switch
      const next = prev.includes(setId) ? [] : [setId];
      try { localStorage.setItem("fulkit-expanded-sets", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const setCollapsed = !expandedSetIds.includes(activeSetId);
  const setSetCollapsed = useCallback((fn) => {
    // Compat shim: toggle current active set
    toggleSetExpanded(activeSetId);
  }, [activeSetId, toggleSetExpanded]);

  // Guy's Crate collapse state
  const [thumbedDownIds, setThumbedDownIds] = useState(new Set()); // "confirmed" state
  const [thumbFadingIds, setThumbFadingIds] = useState(new Set()); // "fading" state (after 300ms)
  const [guyCrateCollapsed, setGuyCrateCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("fulkit-guy-crate-collapsed") !== "false"; } catch { return true; }
  });
  const toggleGuyCrateCollapsed = useCallback(() => {
    setGuyCrateCollapsed(prev => {
      const next = !prev;
      if (!next) { // opening B-Sides → close expanded crate
        setExpandedCrate(null);
        setCrateTracks([]);
      }
      try { localStorage.setItem("fulkit-guy-crate-collapsed", String(next)); } catch {}
      return next;
    });
  }, [setExpandedCrate]);

  // B-Sides: manual add only via arrow icon in chat
  // (auto-add removed — user clicks CornerDownRight to push songs to B-Sides)

  // Deck collapse
  const [deckExpanded, setDeckExpanded] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("fulkit-deck-expanded") !== "false"; } catch { return true; }
  });
  const [deckHintShown, setDeckHintShown] = useState(() => {
    if (typeof window === "undefined") return true;
    try { return localStorage.getItem("fulkit-deck-hint") === "1"; } catch { return false; }
  });
  const toggleDeck = useCallback(() => {
    setDeckExpanded(prev => {
      const next = !prev;
      try { localStorage.setItem("fulkit-deck-expanded", String(next)); } catch {}
      return next;
    });
    // Dismiss hint on first toggle
    if (!deckHintShown) {
      setDeckHintShown(true);
      try { localStorage.setItem("fulkit-deck-hint", "1"); } catch {}
    }
  }, [deckHintShown]);

  // Playlist opt-in/opt-out
  const [playlistPickerOpen, setPlaylistPickerOpen] = useState(false);
  const [binPicksOpen, setBinPicksOpen] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [visiblePlaylistIds, setVisiblePlaylistIds] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("fulkit-visible-playlists");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const filteredPlaylists = useMemo(() => {
    if (!visiblePlaylistIds) {
      // Default: only show playlists already imported as crates
      return playlists.filter(pl => crates.some(c => c.source_playlist_id === pl.id));
    }
    return playlists.filter(pl => visiblePlaylistIds.includes(pl.id));
  }, [playlists, visiblePlaylistIds, crates]);

  const togglePlaylistVisibility = useCallback((playlistId) => {
    setVisiblePlaylistIds(prev => {
      const current = prev || playlists.filter(pl => crates.some(c => c.source_playlist_id === pl.id)).map(pl => pl.id);
      const next = current.includes(playlistId)
        ? current.filter(id => id !== playlistId)
        : [...current, playlistId];
      try { localStorage.setItem("fulkit-visible-playlists", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [playlists, crates]);

  // Column toggles (3-column layout)
  const [showBrowse, setShowBrowse] = useState(true);
  const [showCrates, setShowCrates] = useState(true);
  const [showSets, setShowSets] = useState(true);

  // ═══ Centralized Drag Intent ═══
  // Single ref tracks what's being dragged and why. Every drop handler checks
  // intent.type before acting, calls e.stopPropagation(), then clears intent.
  // Types: "set-track" (within/cross set), "crate-track" (from Guy's Crate),
  //        "external-track" (B-Side/discovery/search/crate-browse),
  //        "set-header" (reorder sets), "crate-header" (reorder crates)
  const dragIntent = useRef(null);
  const clearDragIntent = useCallback(() => { dragIntent.current = null; }, []);
  const [dragOverCol, setDragOverCol] = useState(null);

  const PANELS = [
    { id: "browse", label: "Dig", icon: Disc3, active: showBrowse, toggle: () => setShowBrowse((v) => !v) },
    { id: "crates", label: "Crates", icon: showCrates ? PackageOpen : Box, active: showCrates, toggle: () => setShowCrates((v) => !v) },
    { id: "sets", label: "Sets", icon: Turntable, active: showSets, toggle: () => setShowSets((v) => !v) },
  ];

  const colTransition = "flex 300ms ease, min-width 300ms ease, width 300ms ease, opacity 200ms ease, padding 300ms ease";

  const features = currentTrack ? audioFeatures[currentTrack.id] : null;

  // Auto-scroll music chat — only if user is already near bottom
  const musicMsgCount = musicMessages.length;
  const prevMsgCount = useRef(0);
  useEffect(() => {
    const el = musicChatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (musicMsgCount > prevMsgCount.current && nearBottom) {
      musicChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCount.current = musicMsgCount;
  }, [musicMsgCount, musicMessages]);

  // Keyboard shortcut: D toggles deck
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "d" || e.key === "D") toggleDeck();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleDeck]);

  // Auto-dismiss deck hint after 4s
  useEffect(() => {
    if (deckHintShown) return;
    const t = setTimeout(() => {
      setDeckHintShown(true);
      try { localStorage.setItem("fulkit-deck-hint", "1"); } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [deckHintShown]);

  const { accessToken, compactMode, isOwner } = useAuth();

  // Discovery — load album tracks from BTC album links
  const loadDiscovery = useCallback(async (query) => {
    if (!accessToken || discoveryLoading) return;
    setDiscoveryLoading(true);
    try {
      // Search for album
      const searchRes = await fetch(`/api/fabric/search?q=${encodeURIComponent(query)}&type=album`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await searchRes.json();
      const album = searchData.albums?.[0];
      if (!album) { setDiscoveryLoading(false); return; }
      // Get album tracks
      const tracksRes = await fetch(`/api/fabric/search?album=${album.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const tracksData = await tracksRes.json();
      setDiscoveryAlbum(tracksData.album || album);
      setDiscoveryTracks(tracksData.tracks || []);
    } catch (e) {
      console.warn("[discovery]", e.message);
    }
    setDiscoveryLoading(false);
  }, [accessToken, discoveryLoading]);

  // Search — direct Spotify search (artist + albums)
  const runSearch = useCallback(async (query) => {
    if (!accessToken || searchLoading || !query.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    setShowAllAlbums(false);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [artistRes, albumRes, playlistRes] = await Promise.all([
        fetch(`/api/fabric/search?q=${encodeURIComponent(query)}&type=artist`, { headers }),
        fetch(`/api/fabric/search?q=${encodeURIComponent(query)}&type=album`, { headers }),
        fetch(`/api/fabric/search?q=${encodeURIComponent(query)}&type=playlist`, { headers }),
      ]);
      const [artistData, albumData, playlistData] = await Promise.all([artistRes.json(), albumRes.json(), playlistRes.json()]);
      const artist = artistData.artists?.[0] || null;

      // If we found an artist, fetch their top tracks
      let topTracks = [];
      if (artist?.id) {
        try {
          const ttRes = await fetch(`/api/fabric/search?type=top-tracks&artist_id=${artist.id}`, { headers });
          const ttData = await ttRes.json();
          topTracks = ttData.tracks || [];
        } catch {}
      }

      setSearchResults({
        artist,
        topTracks,
        albums: albumData.albums || [],
        playlists: playlistData.playlists || [],
      });
    } catch (e) {
      console.warn("[search]", e.message);
    }
    setSearchLoading(false);
  }, [accessToken, searchLoading]);

  // Load album tracks into discovery tray (reused by search + BTC)
  const loadAlbumTracks = useCallback(async (albumId) => {
    if (!accessToken) return;
    setDiscoveryLoading(true);
    try {
      const res = await fetch(`/api/fabric/search?album=${albumId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setDiscoveryAlbum(data.album || null);
      setDiscoveryTracks(data.tracks || []);
    } catch (e) {
      console.warn("[discovery]", e.message);
    }
    setDiscoveryLoading(false);
  }, [accessToken]);

  // Load imported crates
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

  // Keep featured crates ref in sync for autoAdvance fallback
  useEffect(() => {
    if (featuredCratesRef) {
      featuredCratesRef.current = crates.map(c => ({
        ...c,
        tracks: (c.tracks || []).map(t => ({
          id: t.source_id, title: t.title, artist: t.artist,
          duration: Math.round((t.duration_ms || 0) / 1000),
        })),
      }));
    }
  }, [crates, featuredCratesRef]);

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
    e.stopPropagation();
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

  const handleDrop = useCallback((e, toIdx, setId, tracks) => {
    e.preventDefault();
    e.stopPropagation();
    const intent = dragIntent.current;
    clearDragIntent();
    // Within-set reorder: only act if this is a set-track drag from the SAME set
    if (intent?.type === "set-track" && intent.fromSetId === setId && dragIdx != null && dragIdx !== toIdx) {
      reorderFlagged(dragIdx, toIdx, setId, tracks);
    }
    // Cross-set track drop onto a track row — add to this set at position
    else if (intent && (intent.type === "set-track" || intent.type === "crate-track" || intent.type === "external-track") && intent.fromSetId !== setId) {
      const t = intent.track;
      if (intent.fromSetId) {
        moveTrackToSet(t, intent.fromSetId, setId);
      } else {
        addTrackToSet(t, setId);
      }
    }
    setDragIdx(null);
    setDragOverIdx(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
  }, [dragIdx, reorderFlagged, moveTrackToSet, addTrackToSet, clearDragIntent]);

  const justDragged = useRef(false);
  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
    justDragged.current = true;
    setTimeout(() => { justDragged.current = false; }, 200);
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
      {posterOpen && currentTrack && (
        <PosterModal
          track={currentTrack}
          features={features}
          timestamp={posterTimestamp}
          onClose={() => setPosterOpen(false)}
        />
      )}
          {/* Content area */}
          <div style={{ flex: 1, height: 0, position: "relative", overflow: deckExpanded ? "auto" : "hidden", display: "flex", flexDirection: "column" }}>
          {/* Deck toggle — persistent top-right */}
          <button onClick={toggleDeck} style={{
            position: "absolute", top: 8, right: 8,
            width: 22, height: 22, borderRadius: "var(--radius-full)",
            background: "transparent", border: "1px solid var(--color-border-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, opacity: 0.4, transition: "opacity 120ms",
            zIndex: 10,
          }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
            title={deckExpanded ? "Collapse deck (D)" : "Expand deck (D)"}
          >
            {deckExpanded
              ? <ArrowUpFromLine size={10} strokeWidth={2} color="var(--color-text-muted)" />
              : <ArrowDownFromLine size={10} strokeWidth={2} color="var(--color-text-muted)" />}
          </button>
          {/* First-visit hint */}
          {!deckHintShown && (
            <div onClick={() => { setDeckHintShown(true); try { localStorage.setItem("fulkit-deck-hint", "1"); } catch {} }} style={{
              position: "absolute", top: 8, right: 34,
              background: "var(--color-bg-inverse)", color: "var(--color-text-inverse)",
              fontSize: 9, fontFamily: "var(--font-mono)",
              padding: "var(--space-1) var(--space-2)", borderRadius: 0,
              cursor: "pointer", whiteSpace: "nowrap", zIndex: 10,
            }}>
              Press D to {deckExpanded ? "collapse" : "expand"}
            </div>
          )}

          {/* ═══ THE DECK — compact bar when collapsed ═══ */}
          {!deckExpanded && (
            <div
              style={{
                borderBottom: "1px solid var(--color-border-light)",
                padding: "var(--space-1-5) var(--space-3)",
                paddingRight: 38,
                display: "flex",
                gap: "var(--space-3)",
                alignItems: "center",
                height: 48,
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 36, height: 36, flexShrink: 0,
                background: "var(--color-bg-inverse)",
                borderRadius: 0,
                overflow: "hidden",
                filter: "grayscale(1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {currentTrack?.art ? (
                  <img src={currentTrack.art} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                )}
              </div>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {currentTrack ? (
                  <>
                    <MarqueeText style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)" }}>
                      {currentTrack.title}
                    </MarqueeText>
                    <MarqueeText style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                      {currentTrack.artist}{features ? ` — ${features.bpm} BPM / ${features.key}` : ""}
                    </MarqueeText>
                  </>
                ) : (
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>No track</div>
                )}
              </div>

              {/* Progress */}
              <div
                style={{ flex: 1, minWidth: 80, flexShrink: 1, padding: "4px 0", cursor: "pointer" }}
                onClick={(e) => {
                  if (!currentTrack) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  seekTo((e.clientX - rect.left) / rect.width);
                }}
              >
                <div style={{ width: "100%", height: 3, background: "var(--color-border)", position: "relative" }}>
                  <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--color-text)", transition: "width 0.1s linear" }} />
                </div>
              </div>

              {/* Transport mini + fullscreen viz */}
              <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
                <button onClick={prev} style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <ChevronLeft size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
                </button>
                <button onClick={toggle} style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  {isPlaying ? <PauseLines size={14} strokeWidth={2.8} color="var(--color-text)" /> : <Play size={14} strokeWidth={2.8} color="var(--color-text)" fill="var(--color-text)" style={{ marginLeft: 1 }} />}
                </button>
                <button onClick={skip} style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <ChevronRight size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
                </button>
                <button onClick={() => setVisualizing(true)} title="Fullscreen visualizer" style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <Maximize2 size={12} strokeWidth={2.2} color="var(--color-text-muted)" />
                </button>
              </div>

            </div>
          )}

          {/* ═══ THE DECK (full) ═══ */}
          {deckExpanded && <>
          <div
            style={{
              borderBottom: "1px solid var(--color-border-light)",
              padding: "var(--space-4) var(--space-5)",
              display: "flex",
              gap: "var(--space-5)",
              alignItems: "center",
              minHeight: 0,
              position: "relative",
              flexShrink: 0,
            }}
          >

            {/* Album art */}
            <div
              style={{
                width: 180,
                height: 180,
                flexShrink: 0,
                background: "var(--color-bg-inverse)",
                borderRadius: 0,
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
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-6)", paddingRight: 32 }}>
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
                    {currentTrack
                      ? `${currentTrack.artist}${currentTrack.album ? ` — ${currentTrack.album}` : ""}`
                      : ""}
                  </div>
                </div>

                {/* BPM + Key readout */}
                {features && (
                  <div style={{ flexShrink: 0, textAlign: "right", opacity: 1, transition: "opacity 0.5s" }}>
                    <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "baseline" }}>
                      <div>
                        <div
                          style={{
                            fontSize: 28,
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
                            fontSize: 18,
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
                  <MeterBar label="Energy" value={features.energy} />
                  <MeterBar label="Dance" value={features.danceability} />
                  <MeterBar label="Mood" value={features.valence} />
                </div>
              )}

              {/* Progress */}
              <div>
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
                  <span>{currentTrack?.duration ? formatTime(progress * currentTrack.duration) : "0:00"}</span>
                  <span>{currentTrack?.duration ? formatTime(currentTrack.duration) : "0:00"}</span>
                </div>
              </div>

              {/* Transport */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                {/* Flag — circled */}
                <button
                  onClick={() => {
                    if (!currentTrack) return;
                    flag(currentTrack);
                    likeTrack(currentTrack);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-full)",
                    background: "transparent",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                    transition: "all 150ms",
                  }}
                >
                  <ThumbsUp size={14} strokeWidth={2.2}
                    fill={currentTrack && isFlagged(currentTrack?.id) ? "var(--color-text)" : "none"}
                    color={currentTrack && isFlagged(currentTrack?.id) ? "var(--color-text)" : "var(--color-text-muted)"}
                  />
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

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Poster — far right */}
                {currentTrack && (
                  <button
                    onClick={() => { setPosterTimestamp(Math.round(progress * (currentTrack?.duration || 0))); setPosterOpen(true); }}
                    title="Poster"
                    style={{
                      width: 32, height: 32, borderRadius: "var(--radius-full)",
                      background: "transparent", border: "1px solid var(--color-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0, outline: "none",
                    }}
                  >
                    <Frame size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
                  </button>
                )}

              </div>
            </div>
          </div>

          {/* ═══ VISUALIZATION STRIP ═══ */}
          <div style={{ flexShrink: 0 }}>
            {vizMode === 3 && (
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
            )}
            {vizMode === 1 && (
              <SignalTerrainV4
                height={120}
                isPlaying={isPlaying}
                trackId={currentTrack?.id}
                progress={progress}
                duration={currentTrack?.duration || 0}
                features={features}
                getSnapshot={getSnapshot}
                onVisualize={() => setVisualizing(true)}
              />
            )}
            {vizMode === 2 && (
              <SignalTerrainV2
                height={120}
                isPlaying={isPlaying}
                trackId={currentTrack?.id}
                progress={progress}
                duration={currentTrack?.duration || 0}
                features={features}
                getSnapshot={getSnapshot}
                onVisualize={() => setVisualizing(true)}
              />
            )}
            {vizMode === 4 && (
              <SignalTerrainOG
                height={120}
                isPlaying={isPlaying}
                trackId={currentTrack?.id}
                progress={progress}
                duration={currentTrack?.duration || 0}
                features={features}
                getSnapshot={getSnapshot}
                onVisualize={() => setVisualizing(true)}
              />
            )}
          </div>
          </>}

          {/* ═══ COLUMN TOGGLE BAR ═══ */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "0 var(--space-3)",
              borderBottom: "1px solid var(--color-border-light)",
              flexShrink: 0,
            }}
          >
            {/* Deck toggle */}
            <Tooltip label={deckExpanded ? "Collapse deck (D)" : "Expand deck (D)"} align="left">
              <button
                onClick={toggleDeck}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "var(--space-2-5) var(--space-2)",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  borderRight: "1px solid var(--color-border-light)",
                  marginRight: "var(--space-1)",
                }}
              >
                {deckExpanded ? <ArrowUpFromLine size={TAB_ICON_SIZE} strokeWidth={1.8} /> : <ArrowDownFromLine size={TAB_ICON_SIZE} strokeWidth={1.8} />}
              </button>
            </Tooltip>
            {PANELS.map((col) => (
              <Tooltip key={col.id} label={compactMode ? col.label : null}>
                <button
                  onClick={col.toggle}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
                    background: col.active ? "var(--color-bg-alt)" : "transparent",
                    borderRadius: 0,
                    color: col.active ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: col.active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                    transition: `all var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  <col.icon size={TAB_ICON_SIZE} strokeWidth={1.8} />
                  {!compactMode && col.label}
                </button>
              </Tooltip>
            ))}
            {/* Viz mode selector — owner only, hidden when collapsed */}
            {deckExpanded && isOwner && <div style={{ marginLeft: "auto", display: "flex", gap: 2, alignItems: "center" }}>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    if (n <= 4) {
                      setVizMode(n);
                      try { localStorage.setItem("fulkit-viz-mode", String(n)); } catch {}
                    }
                  }}
                  style={{
                    width: 24, height: 24,
                    background: "transparent",
                    border: "none",
                    color: vizMode === n ? "var(--color-text)" : "var(--color-text-muted)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: vizMode === n ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                    fontFamily: "var(--font-mono)",
                    cursor: n <= 4 ? "pointer" : "default",
                    padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    opacity: n <= 4 ? (vizMode === n ? 1 : 0.5) : 0.2,
                    transition: `all var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>}
          </div>

          {/* ═══ 3-COLUMN WORKSPACE ═══ */}
          <div style={{ flex: 1, height: 0, display: "flex", minHeight: deckExpanded ? "60vh" : 0, overflow: "hidden" }}>

            {/* ── LEFT: Browse ── */}
            <div
              style={{
                flex: showBrowse ? 3 : 0,
                minWidth: showBrowse ? 200 : 0,
                width: showBrowse ? "auto" : 0,
                overflow: "hidden",
                opacity: showBrowse ? 1 : 0,
                transition: colTransition,
                borderRight: showBrowse ? "1px solid var(--color-border-light)" : "none",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Sticky column header */}
              <div style={{
                padding: "var(--space-2-5) var(--space-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--color-border-light)",
                background: "var(--color-bg)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                  <Disc3 size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                  <Label>Dig</Label>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 50 }}>

                {/* ── Record Store Guy — Behind the Counter ── */}
                <div style={{
                  marginBottom: 0,
                  borderBottom: "1px solid var(--color-border-light)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}>
                  {/* RSG title bar — always visible */}
                  <button
                    onClick={toggleMusicChat}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "var(--space-2) var(--space-3)",
                      background: "var(--color-bg-elevated)",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-primary)",
                    }}
                  >
                    <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text)" }}>
                        Behind the Counter
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-normal)", fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 2 }}>
                        Fülkit's B-Side Brain
                      </div>
                    </div>
                    {musicChatOpen
                      ? <ChevronUp size={12} strokeWidth={1.8} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginLeft: "var(--space-2)" }} />
                      : <MessageCircleQuestion size={12} strokeWidth={1.8} style={{ color: "var(--color-text-muted)", flexShrink: 0, marginLeft: "var(--space-2)" }} />
                    }
                  </button>

                  {/* RSG chat drawer */}
                  {musicChatOpen && (
                    <div style={{ borderTop: "1px solid var(--color-border-light)", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                      <div ref={musicChatScrollRef} style={{ padding: "var(--space-3)" }}>
                        {musicMessages.length === 0 && (
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                            {tickerFact || "Ask me anything about music..."}
                          </div>
                        )}
                        {musicMessages.map((msg, i) => (
                          <div key={i} style={{
                            marginBottom: "var(--space-3)",
                            fontSize: "var(--font-size-xs)",
                            fontFamily: "var(--font-primary)",
                            color: msg.role === "user" ? "var(--color-text-muted)" : "var(--color-text)",
                            fontStyle: msg.role === "user" ? "italic" : "normal",
                            lineHeight: msg.role === "assistant" ? "var(--line-height-relaxed)" : 1.4,
                            whiteSpace: msg.role === "user" ? "pre-wrap" : "normal",
                          }}>
                            {msg.role === "assistant" ? (() => {
                              const lines = msg.content.split("\n");
                              const elements = [];
                              let songBlock = [];

                              let textBuffer = "";
                              let textBufferStart = null;

                              const flushText = () => {
                                if (!textBuffer.trim()) { textBuffer = ""; textBufferStart = null; return; }
                                elements.push(
                                  <MessageRenderer
                                    key={`text-${textBufferStart}`}
                                    content={textBuffer.trim()}
                                    compact
                                  />
                                );
                                textBuffer = "";
                                textBufferStart = null;
                              };

                              const flushSongs = () => {
                                if (songBlock.length === 0) return;
                                const songs = [...songBlock]; // snapshot before clear
                                const songsWithIds = songs.map(s => ({
                                  ...s,
                                  trackId: `btc-${s.artist}-${s.title}`.toLowerCase().replace(/\s+/g, "-"),
                                }));
                                const allAdded = songsWithIds.every(s => guyCrate?.tracks?.some(t => t.id === s.trackId));
                                elements.push(
                                  <div key={`songs-${elements.length}`} style={{
                                    borderLeft: "2px solid var(--color-border)",
                                    paddingLeft: "var(--space-2)",
                                    marginTop: "var(--space-1-5)",
                                    marginBottom: "var(--space-1-5)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                  }}>
                                    {songsWithIds.map((s, si) => {
                                      const alreadyAdded = guyCrate?.tracks?.some(t => t.id === s.trackId);
                                      const isPlaying = currentTrack?.id === s.trackId;
                                      return (
                                      <div key={si}
                                        draggable
                                        onDragStart={() => { dragIntent.current = { type: "external-track", track: { id: s.trackId, title: s.title, artist: s.artist } }; }}
                                        onDragEnd={() => { clearDragIntent(); setDragOverCol(null); }}
                                        style={{
                                        fontFamily: "var(--font-primary)",
                                        fontSize: "var(--font-size-xs)",
                                        lineHeight: "var(--line-height-snug)",
                                        padding: "var(--space-1) 0",
                                        cursor: "grab",
                                      }}>
                                        {/* Line 1: Artist — clickable → opens search */}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); runSearch(s.artist); }}
                                          style={{
                                            background: "none", border: "none", padding: 0, cursor: "pointer",
                                            fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)",
                                            fontFamily: "inherit", fontSize: "inherit", textAlign: "left",
                                          }}
                                        >
                                          {s.artist}
                                        </button>
                                        {/* Line 2: - Song title */}
                                        <div style={{ fontWeight: "var(--font-weight-normal)", color: isPlaying ? "var(--color-text)" : "var(--color-text-secondary)" }}>
                                          - {s.title}
                                        </div>
                                        {/* Line 3: BPM left, Play + Save right */}
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                                          <span style={{ color: "var(--color-text-dim)", fontSize: 9 }}>{s.bpm || ""}</span>
                                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                                            <button
                                              onClick={() => playTrackInContext({ id: s.trackId, artist: s.artist, title: s.title }, "bsides", `btc-msg-${i}`, songsWithIds.map(x => ({ id: x.trackId, artist: x.artist, title: x.title })), si)}
                                              style={{
                                                background: "none", border: "none", cursor: "pointer", padding: 0,
                                                color: isPlaying ? "var(--color-text)" : "var(--color-text-muted)",
                                                opacity: isPlaying ? 1 : 0.7,
                                                transition: "opacity 120ms",
                                                display: "flex", alignItems: "center",
                                              }}
                                              title="Play"
                                              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                                              onMouseLeave={(e) => { if (!isPlaying) e.currentTarget.style.opacity = "0.7"; }}
                                            >
                                              <Play size={10} strokeWidth={2.5} fill={isPlaying ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (alreadyAdded) return;
                                                addToGuyCrate({ id: s.trackId, title: s.title, artist: s.artist });

                                                setGuyCrateCollapsed(false);
                                                try { localStorage.setItem("fulkit-guy-crate-collapsed", "false"); } catch {}
                                              }}
                                              style={{
                                                background: "none", border: "none",
                                                cursor: alreadyAdded ? "default" : "pointer",
                                                padding: 0,
                                                color: alreadyAdded ? "var(--color-text)" : "var(--color-text-muted)",
                                                opacity: alreadyAdded ? 0.8 : 0.7,
                                                transition: "opacity 120ms",
                                                display: "flex", alignItems: "center",
                                              }}
                                              title={alreadyAdded ? "In B-Sides" : "Add to B-Sides"}
                                              onMouseEnter={(e) => { if (!alreadyAdded) e.currentTarget.style.opacity = "1"; }}
                                              onMouseLeave={(e) => { if (!alreadyAdded) e.currentTarget.style.opacity = "0.7"; }}
                                            >
                                              {alreadyAdded ? <Check size={10} strokeWidth={2.2} /> : <CornerDownRight size={10} strokeWidth={2} />}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      );
                                    })}
                                    {/* Add all to B-Sides — only show when multiple songs and not all added */}
                                    {songsWithIds.length > 1 && !allAdded && (
                                      <button
                                        onClick={() => {
                                          songsWithIds.forEach(s => {
                                            if (!guyCrate?.tracks?.some(t => t.id === s.trackId)) {
                                              addToGuyCrate({ id: s.trackId, title: s.title, artist: s.artist });

                                            }
                                          });
                                          setGuyCrateCollapsed(false);
                                          try { localStorage.setItem("fulkit-guy-crate-collapsed", "false"); } catch {}
                                        }}
                                        style={{
                                          background: "none", border: "none", cursor: "pointer",
                                          display: "flex", alignItems: "center", gap: "var(--space-1)",
                                          padding: "var(--space-1) 0", marginTop: 2,
                                          fontFamily: "var(--font-primary)", fontSize: 9,
                                          letterSpacing: "var(--letter-spacing-wide)",
                                          color: "var(--color-text-dim)", opacity: 0.5,
                                          transition: "opacity 120ms",
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
                                        title="Add all songs to B-Sides"
                                      >
                                        <CornerDownRight size={9} strokeWidth={2} />
                                        Add all to B-Sides
                                      </button>
                                    )}
                                  </div>
                                );
                                songBlock = [];
                              };

                              // Pre-scan: collect all songs in the message for the mixtape header button
                              const allMsgSongs = [];
                              lines.forEach((line) => {
                                const sm = line.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s+(\d+)\s*BPM)?\s*(?:\[\+\]|♪)?\s*(?:\*?\[.*?\]\*?)?\s*$/);
                                if (sm && /\d+\s*BPM|\[\+\]|♪/.test(line)) {
                                  const cleanTitle = sm[2].replace(/\s+\d+\s*BPM.*$/, "").replace(/\s*\[\+\].*$/, "").replace(/\s*♪.*$/, "").trim();
                                  allMsgSongs.push({
                                    artist: sm[1].trim(),
                                    title: cleanTitle,
                                    trackId: `btc-${sm[1].trim()}-${cleanTitle}`.toLowerCase().replace(/\s+/g, "-"),
                                  });
                                }
                              });
                              const allMsgSongsAdded = allMsgSongs.length > 0 && allMsgSongs.every(s => guyCrate?.tracks?.some(t => t.id === s.trackId));

                              lines.forEach((line, li) => {
                                // Song recommendation: Artist - Title BPM [+] (or ♪, or just BPM suffix)
                                const songMatch = line.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s+(\d+)\s*BPM)?\s*(?:\[\+\]|♪)?\s*(?:\*?\[.*?\]\*?)?\s*$/);
                                const hasSongSignal = /\d+\s*BPM|\[\+\]|♪/.test(line);
                                if (songMatch && hasSongSignal) {
                                  if (songBlock.length === 0) flushText(); // flush prose before first song
                                  const cleanTitle = songMatch[2].replace(/\s+\d+\s*BPM.*$/, "").replace(/\s*\[\+\].*$/, "").replace(/\s*♪.*$/, "").trim();
                                  songBlock.push({
                                    artist: songMatch[1].trim(),
                                    title: cleanTitle,
                                    bpm: songMatch[3] ? `${songMatch[3]} BPM` : null,
                                  });
                                  return;
                                }
                                // Fallback: detect **Artist** - Title (bold markdown songs)
                                const boldMatch = line.match(/^\*\*(.+?)\*\*\s*[-–—]\s*(.+?)$/);
                                if (boldMatch) {
                                  if (songBlock.length === 0) flushText();
                                  songBlock.push({
                                    artist: boldMatch[1].trim(),
                                    title: boldMatch[2].replace(/\*\*/g, "").trim(),
                                    bpm: null,
                                  });
                                  return;
                                }
                                flushSongs();

                                // Separator line (--- or ═══ etc.)
                                if (/^[-–—═]{3,}\s*$/.test(line.trim())) {
                                  flushText();
                                  elements.push(<div key={li} style={{ borderTop: "1px solid var(--color-border-light)", margin: "var(--space-1-5) 0" }} />);
                                  return;
                                }

                                // Mixtape title: ALL CAPS line with — (e.g. "STILL WATER — a mixtape")
                                const titleMatch = line.match(/^([A-Z][A-Z\s]+)\s*[—–-]\s*(.+)$/);
                                if (titleMatch && allMsgSongs.length > 1) {
                                  flushText();
                                  elements.push(
                                    <div key={li} style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      gap: "var(--space-2)", marginBottom: 2,
                                    }}>
                                      <div>
                                        <div style={{
                                          fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)",
                                          fontWeight: "var(--font-weight-semibold)",
                                          letterSpacing: "var(--letter-spacing-wider)",
                                          textTransform: "uppercase", color: "var(--color-text)",
                                        }}>{titleMatch[1].trim()}</div>
                                        <div style={{
                                          fontSize: "var(--font-size-2xs)", fontStyle: "italic",
                                          color: "var(--color-text-secondary)", marginTop: 1,
                                        }}>{titleMatch[2].trim()}</div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          allMsgSongs.forEach(s => {
                                            if (!guyCrate?.tracks?.some(t => t.id === s.trackId)) {
                                              addToGuyCrate({ id: s.trackId, title: s.title, artist: s.artist });

                                            }
                                          });
                                          setGuyCrateCollapsed(false);
                                          try { localStorage.setItem("fulkit-guy-crate-collapsed", "false"); } catch {}
                                        }}
                                        style={{
                                          background: "none", border: "none", cursor: allMsgSongsAdded ? "default" : "pointer",
                                          padding: 2, flexShrink: 0, display: "flex", alignItems: "center",
                                          color: allMsgSongsAdded ? "var(--color-text)" : "var(--color-text-dim)",
                                          opacity: allMsgSongsAdded ? 0.6 : 0.5,
                                          transition: "opacity 120ms",
                                        }}
                                        title={allMsgSongsAdded ? "Mix added to B-Sides" : "Add full mix to B-Sides"}
                                        onMouseEnter={(e) => { if (!allMsgSongsAdded) e.currentTarget.style.opacity = "1"; }}
                                        onMouseLeave={(e) => { if (!allMsgSongsAdded) e.currentTarget.style.opacity = "0.5"; }}
                                      >
                                        {allMsgSongsAdded ? <Check size={14} strokeWidth={2} /> : <ListMusic size={14} strokeWidth={1.8} />}
                                      </button>
                                    </div>
                                  );
                                  return;
                                }

                                // Empty line → accumulate in text buffer (react-markdown handles paragraph breaks)
                                if (!line.trim()) {
                                  textBuffer += "\n";
                                  return;
                                }

                                // Album/artist links: {Display}[album: query] or {Display}[artist: query]
                                const linkRegex = /\{(.+?)\}\[(album|artist):\s*(.+?)\]/g;
                                if (linkRegex.test(line)) {
                                  flushText();
                                  linkRegex.lastIndex = 0;
                                  const parts = [];
                                  let lastIndex = 0;
                                  let match;
                                  while ((match = linkRegex.exec(line)) !== null) {
                                    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
                                    parts.push(
                                      <button
                                        key={`${li}-${match.index}`}
                                        onClick={() => loadDiscovery(match[3])}
                                        style={{
                                          display: "inline",
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          padding: 0,
                                          fontFamily: "var(--font-primary)",
                                          fontSize: "var(--font-size-xs)",
                                          color: "var(--color-text)",
                                          fontWeight: "var(--font-weight-semibold)",
                                          textDecoration: "underline",
                                          textDecorationColor: "var(--color-border)",
                                          textUnderlineOffset: 2,
                                        }}
                                      >
                                        {match[1]}
                                      </button>
                                    );
                                    lastIndex = match.index + match[0].length;
                                  }
                                  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
                                  elements.push(<div key={li}>{parts}</div>);
                                  return;
                                }

                                // List items, numbered items, and regular text → accumulate in buffer
                                // react-markdown handles lists, bold, italic, tables, headers natively
                                textBuffer += line + "\n";
                                if (textBufferStart === null) textBufferStart = li;
                              });
                              flushSongs();
                              flushText();
                              return elements;
                            })() : msg.content}
                          </div>
                        ))}
                        {musicStreaming && !(musicMessages[musicMessages.length - 1]?._streaming && musicMessages[musicMessages.length - 1]?.content) && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "var(--space-1) 0" }}>
                            {[0, 1, 2].map((dot) => (
                              <span
                                key={dot}
                                style={{
                                  display: "inline-block",
                                  width: 3,
                                  height: 3,
                                  borderRadius: "50%",
                                  background: "var(--color-text-muted)",
                                  animation: `typingBounce 1.2s ${dot * 0.15}s infinite ease-in-out`,
                                }}
                              />
                            ))}
                          </div>
                        )}
                        <div ref={musicChatEndRef} />
                      </div>
                    </div>
                  )}

                  {/* Input — always visible */}
                  <div style={{
                    display: "flex",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    borderTop: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <input
                      value={musicInput}
                      onChange={(e) => setMusicInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (musicInput.trim() && !musicStreaming) {
                            if (!musicChatOpen) toggleMusicChat();
                            sendMusicMessage(musicInput);
                            setMusicInput("");
                          }
                        }
                      }}
                      placeholder="Ask the guy..."
                      disabled={musicStreaming}
                      style={{
                        flex: 1,
                        padding: "var(--space-1-5) var(--space-2)",
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: 0,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-primary)",
                        outline: "none",
                        boxSizing: "border-box",
                        opacity: musicStreaming ? 0.5 : 1,
                      }}
                    />
                    <button
                      onClick={() => {
                        if (musicInput.trim() && !musicStreaming) {
                          if (!musicChatOpen) toggleMusicChat();
                          sendMusicMessage(musicInput);
                          setMusicInput("");
                        }
                      }}
                      disabled={musicStreaming || !musicInput.trim()}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: musicStreaming ? "default" : "pointer",
                        padding: 2,
                        color: "var(--color-text-dim)",
                        display: "flex",
                        alignItems: "center",
                        opacity: musicStreaming || !musicInput.trim() ? 0.3 : 1,
                      }}
                    >
                      <Send size={12} strokeWidth={1.8} />
                    </button>
                  </div>

                  {/* Search input — always visible, inside B-Side panel */}
                  <div style={{
                    display: "flex",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-3)",
                    borderTop: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery.trim()) {
                          e.preventDefault();
                          runSearch(searchQuery);
                        }
                      }}
                      placeholder="Search..."
                      style={{
                        flex: 1,
                        padding: "var(--space-1-5) var(--space-2)",
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: 0,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-text)",
                        fontFamily: "var(--font-primary)",
                        outline: "none",
                        boxSizing: "border-box",
                        opacity: searchLoading ? 0.5 : 1,
                      }}
                    />
                    <button
                      onClick={() => searchQuery.trim() && runSearch(searchQuery)}
                      disabled={searchLoading || !searchQuery.trim()}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: searchLoading ? "default" : "pointer",
                        padding: 2,
                        color: "var(--color-text-dim)",
                        display: "flex",
                        alignItems: "center",
                        opacity: searchLoading || !searchQuery.trim() ? 0.3 : 1,
                      }}
                    >
                      <Search size={12} strokeWidth={1.8} />
                    </button>
                  </div>

                </div>

                {/* ── Search Results — sibling below BTC panel, scrolls with outer container ── */}
                {(searchResults || searchLoading) && (
                  <div style={{
                    borderBottom: "1px solid var(--color-border-light)",
                    padding: "var(--space-2) var(--space-3)",
                  }}>
                    {searchLoading && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)" }}>
                        Searching...
                      </div>
                    )}

                    {searchResults && (
                      <div>
                        {/* Artist header — name left, dismiss right, one line */}
                        {searchResults.artist && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "var(--space-2)",
                            paddingBottom: "var(--space-2)",
                            borderBottom: "1px solid var(--color-border-light)",
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-bold)",
                                color: "var(--color-text)",
                              }}>
                                {searchResults.artist.name}
                              </div>
                              {searchResults.artist.genres?.length > 0 && (
                                <div style={{
                                  fontSize: 9,
                                  fontFamily: "var(--font-mono)",
                                  color: "var(--color-text-muted)",
                                  marginTop: 2,
                                }}>
                                  {searchResults.artist.genres.join(" · ")}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", padding: 2, fontSize: 14, lineHeight: 1, flexShrink: 0 }}
                            >
                              ×
                            </button>
                          </div>
                        )}
                        {/* Dismiss only (no artist) */}
                        {!searchResults.artist && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-1)" }}>
                            <button
                              onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", padding: 2, fontSize: 14, lineHeight: 1 }}
                            >
                              ×
                            </button>
                          </div>
                        )}

                        {/* Top Tracks */}
                        {searchResults.topTracks?.length > 0 && (
                          <div style={{ marginBottom: "var(--space-2)" }}>
                            <Label style={{ marginBottom: "var(--space-1)" }}>Top Tracks</Label>
                            {searchResults.topTracks.slice(0, 10).map((track, ti) => {
                              const isActive = currentTrack?.id === track.source_id;
                              const mins = Math.floor((track.duration_ms || 0) / 60000);
                              const secs = String(Math.floor(((track.duration_ms || 0) % 60000) / 1000)).padStart(2, "0");
                              return (
                                <div key={track.source_id || ti} style={{
                                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                                  padding: "var(--space-1-5) var(--space-1)",
                                  borderBottom: "1px solid var(--color-border-light)",
                                  borderLeft: isActive ? "3px solid var(--color-text)" : "3px solid transparent",
                                  background: isActive ? "var(--color-bg-alt)" : "transparent",
                                  cursor: "pointer",
                                }}
                                  onClick={() => {
                                    if (track.source_id) {
                                      playTrack({ id: track.source_id, title: track.title, artist: track.artist, provider: track.provider || "youtube" });
                                    }
                                  }}
                                >
                                  <span style={{ width: 16, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", textAlign: "center", flexShrink: 0 }}>
                                    {String(ti + 1).padStart(2, "0")}
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
                                      fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                                      color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>
                                      {track.title}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                                    {mins}:{secs}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const trackId = `search-${track.artist}-${track.title}`.toLowerCase().replace(/\s+/g, "-");
                                      addToGuyCrate({ id: trackId, title: track.title, artist: track.artist, provider: track.provider || "youtube" });
                                      setGuyCrateCollapsed(false);
                                      try { localStorage.setItem("fulkit-guy-crate-collapsed", "false"); } catch {}
                                    }}
                                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", display: "flex", flexShrink: 0 }}
                                    title="Add to B-Sides"
                                  >
                                    <Plus size={10} strokeWidth={2} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Albums list */}
                        {searchResults.albums?.length > 0 && (() => {
                          const visible = showAllAlbums ? searchResults.albums : searchResults.albums.slice(0, 5);
                          return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: "var(--space-2)" }}>
                            <Label style={{ marginBottom: "var(--space-1)" }}>Albums</Label>
                            {visible.map((album) => (
                              <button
                                key={album.id}
                                onClick={() => {
                                  loadAlbumTracks(album.id);
                                  setSearchResults(null);
                                  setSearchQuery("");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "var(--space-2)",
                                  padding: "var(--space-1-5) var(--space-1)",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  fontFamily: "var(--font-primary)",
                                  width: "100%",
                                  borderRadius: 0,
                                  transition: "background var(--duration-fast) var(--ease-default)",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-bg-alt)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                {album.image && (
                                  <img
                                    src={album.image}
                                    width={28}
                                    height={28}
                                    alt=""
                                    style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0, filter: "grayscale(1)" }}
                                  />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: "var(--font-size-xs)",
                                    color: "var(--color-text)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}>
                                    {album.name}
                                  </div>
                                  <div style={{
                                    fontSize: 9,
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--color-text-dim)",
                                  }}>
                                    {album.year}{album.trackCount ? ` · ${album.trackCount} tracks` : ""}
                                  </div>
                                </div>
                              </button>
                            ))}
                            {searchResults.albums.length > 5 && !showAllAlbums && (
                              <button
                                onClick={() => setShowAllAlbums(true)}
                                style={{
                                  background: "none", border: "none", cursor: "pointer",
                                  padding: "var(--space-1) var(--space-1)",
                                  fontSize: 9, fontFamily: "var(--font-mono)",
                                  letterSpacing: "var(--letter-spacing-wide)",
                                  textTransform: "uppercase",
                                  color: "var(--color-text-dim)",
                                  textAlign: "left",
                                }}
                              >
                                See all {searchResults.albums.length} albums
                              </button>
                            )}
                          </div>
                          );
                        })()}

                        {/* Playlists */}
                        {searchResults.playlists?.length > 0 && (
                          <div style={{ marginBottom: "var(--space-1)" }}>
                            <Label style={{ marginBottom: "var(--space-1)" }}>Playlists</Label>
                            {searchResults.playlists.map((pl) => (
                              <div key={pl.id} style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "var(--space-1-5) var(--space-1)",
                                borderBottom: "1px solid var(--color-border-light)",
                              }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
                                    color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {pl.name}
                                  </div>
                                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                                    {pl.owner}{pl.trackCount ? ` · ${pl.trackCount} tracks` : ""}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* No results */}
                        {!searchResults.artist && searchResults.albums?.length === 0 && !searchResults.topTracks?.length && !searchResults.playlists?.length && (
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)" }}>
                            Nothing found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Discovery Tray — album tracks from BTC links ── */}
                {(discoveryAlbum || discoveryLoading) && (
                  <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-2) var(--space-3)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
                      <Label>{discoveryAlbum ? discoveryAlbum.name : "Loading..."}</Label>
                      <button
                        onClick={() => { setDiscoveryAlbum(null); setDiscoveryTracks([]); }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-dim)",
                          padding: 2,
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {discoveryAlbum && (
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                        {discoveryAlbum.artist} · {discoveryAlbum.year || ""} · {discoveryAlbum.trackCount || discoveryTracks.length} tracks
                      </div>
                    )}
                    {discoveryLoading && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", padding: "var(--space-2) 0" }}>
                        Loading...
                      </div>
                    )}
                    {discoveryTracks.length > 0 && (
                      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                        {discoveryTracks.map((track, i) => {
                          const isActive = currentTrack?.id === track.source_id;
                          return (
                          <div
                            key={track.source_id || i}
                            draggable
                            onDragStart={() => { dragIntent.current = { type: "external-track", track: { id: track.source_id, title: track.title, artist: track.artist, album: discoveryAlbum?.name || "", art: discoveryAlbum?.image || null, duration: Math.round((track.duration_ms || 0) / 1000) } }; }}
                            onDragEnd={() => { clearDragIntent(); setDragOverCol(null); }}
                            onClick={() => playTrackInContext({
                              id: track.source_id,
                              title: track.title,
                              artist: track.artist,
                              album: discoveryAlbum?.name || "",
                              art: discoveryAlbum?.image || null,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                            }, "discovery", discoveryAlbum?.id || null, discoveryTracks.map(t => ({
                              id: t.source_id, title: t.title, artist: t.artist,
                              album: discoveryAlbum?.name || "", art: discoveryAlbum?.image || null,
                              duration: Math.round((t.duration_ms || 0) / 1000),
                            })), i)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-1-5)",
                              padding: "var(--space-1) var(--space-2)",
                              cursor: "grab",
                              borderBottom: "1px solid var(--color-border-light)",
                              borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                              background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                              transition: "background var(--duration-fast) var(--ease-default)",
                            }}
                          >
                            <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: isActive ? "var(--color-text)" : "var(--color-text-dim)", width: 18, flexShrink: 0, textAlign: "right" }}>
                              {String(track.track_number || i + 1).padStart(2, "0")}
                            </div>
                            <div
                              style={{
                                flex: 1,
                                textAlign: "left",
                                padding: 0,
                                fontFamily: "var(--font-primary)",
                                minWidth: 0,
                              }}
                            >
                              <div style={{
                                fontSize: "var(--font-size-xs)",
                                fontWeight: "var(--font-weight-medium)",
                                color: "var(--color-text)",
                                fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}>
                                {track.title}
                              </div>
                            </div>
                            <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                              {formatTime(Math.round((track.duration_ms || 0) / 1000))}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); flag({
                                id: track.source_id,
                                title: track.title,
                                artist: track.artist,
                                album: discoveryAlbum?.name || "",
                                art: discoveryAlbum?.image || null,
                                duration: Math.round((track.duration_ms || 0) / 1000),
                                provider: track.provider || "youtube",
                              }); }}
                              style={{
                                background: "none",
                                border: "1px solid var(--color-border)",
                                borderRadius: 0,
                                cursor: "pointer",
                                padding: "0 3px",
                                fontSize: 8,
                                fontFamily: "var(--font-mono)",
                                color: isFlagged(track.source_id) ? "var(--color-text)" : "var(--color-text-muted)",
                                flexShrink: 0,
                              }}
                            >
                              {isFlagged(track.source_id) ? "✓" : "+"}
                            </button>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Bin Picks — crowned sets that exist in the Sets panel ── */}
                {(() => { const setNames = new Set(allSets.map(s => s.name).concat(trophiedSets.map(s => s.name))); return crates.filter(c => c.source === "set" && setNames.has(c.name)); })().length > 0 && (
                  <div style={{ borderBottom: "1px solid var(--color-border-light)", overflow: "hidden", background: "var(--color-bg-elevated)" }}>
                    <div
                      onClick={() => setBinPicksOpen(v => !v)}
                      style={{
                        padding: "var(--space-2) var(--space-3)",
                        borderBottom: binPicksOpen ? "1px solid var(--color-border-light)" : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        cursor: "pointer",
                        background: "var(--color-bg-elevated)",
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setBinPicksOpen(v => !v); }}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                          transform: binPicksOpen ? "none" : "rotate(-90deg)",
                          transition: "transform 120ms",
                        }}
                      >
                        <ChevronDown size={10} strokeWidth={2} />
                      </button>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 9,
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                      }}>
                        Bin Picks
                      </span>
                    </div>
                    {binPicksOpen && (
                      <div>
                        {(() => { const setNames = new Set(allSets.map(s => s.name).concat(trophiedSets.map(s => s.name))); return crates.filter(c => c.source === "set" && setNames.has(c.name)); })().map((mix) => (
                          <div
                            key={mix.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "var(--space-2) var(--space-3)",
                              borderBottom: "1px solid var(--color-border-light)",
                              cursor: "pointer",
                              background: "var(--color-bg-elevated)",
                            }}
                            onClick={() => {
                              setExpandedFeatured(mix.id);
                              setFeaturedTracks(mix.tracks || []);
                              setExpandedCrate(null);
                              setCrateTracks([]);
                              const first = mix.tracks?.[0];
                              if (first) {
                                playTrackInContext({
                                  id: first.source_id,
                                  title: first.title,
                                  artist: first.artist,
                                  duration: Math.round((first.duration_ms || 0) / 1000),
                                }, "featured", mix.id, (mix.tracks || []).map(t => ({
                                  id: t.source_id, title: t.title, artist: t.artist,
                                  duration: Math.round((t.duration_ms || 0) / 1000),
                                })), 0);
                              }
                            }}
                          >
                            <span style={{
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              fontWeight: "var(--font-weight-bold)",
                              color: "var(--color-text)",
                              textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                            }}>
                              {mix.name}
                            </span>
                            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                              {mix.tracks?.length || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Playlists with opt-in picker ── */}
                <div style={{ borderBottom: "1px solid var(--color-border-light)", overflow: "hidden", background: "var(--color-bg-elevated)" }}>
                <div
                  onClick={() => setPlaylistsOpen(v => !v)}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderBottom: playlistsOpen ? "1px solid var(--color-border-light)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    cursor: "pointer",
                    background: "var(--color-bg-elevated)",
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); setPlaylistsOpen(v => !v); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                      transform: playlistsOpen ? "none" : "rotate(-90deg)",
                      transition: "transform 120ms",
                    }}
                  >
                    <ChevronDown size={10} strokeWidth={2} />
                  </button>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    fontWeight: "var(--font-weight-bold)",
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                    flex: 1,
                  }}>
                    Playlists
                  </span>
                  {playlistsOpen && playlists.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPlaylistPickerOpen(v => !v); }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-dim)",
                        padding: 2,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Choose visible playlists"
                    >
                      <Plus size={10} strokeWidth={2} style={{
                        transform: playlistPickerOpen ? "rotate(45deg)" : "none",
                        transition: "transform 120ms",
                      }} />
                    </button>
                  )}
                </div>

                {/* Playlist picker checklist */}
                {playlistsOpen && playlistPickerOpen && (
                  <div style={{
                    marginBottom: "var(--space-2)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: 0,
                    maxHeight: 200,
                    overflowY: "auto",
                    background: "var(--color-bg-elevated)",
                    flexShrink: 0,
                  }}>
                    {playlists.map(pl => {
                      const isVisible = !visiblePlaylistIds || visiblePlaylistIds.includes(pl.id);
                      return (
                        <button
                          key={pl.id}
                          onClick={() => togglePlaylistVisibility(pl.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            width: "100%",
                            padding: "var(--space-1-5) var(--space-2)",
                            background: "none",
                            border: "none",
                            borderBottom: "1px solid var(--color-border-light)",
                            cursor: "pointer",
                            fontFamily: "var(--font-primary)",
                            textAlign: "left",
                          }}
                        >
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            border: isVisible ? "none" : "1px solid var(--color-border-light)",
                            background: isVisible ? "var(--color-text)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 120ms",
                          }}>
                            {isVisible && <Check size={10} strokeWidth={2.5} style={{ color: "var(--color-bg)" }} />}
                          </div>
                          <span style={{
                            fontSize: "var(--font-size-xs)",
                            color: isVisible ? "var(--color-text)" : "var(--color-text-dim)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}>
                            {pl.name}
                          </span>
                          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                            {pl.trackCount || 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {playlistsOpen && (
                  <div>
                    {filteredPlaylists.map((pl) => {
                      const alreadyImported = crates.some(c => c.source_playlist_id === pl.id);
                      return (
                        <div
                          key={pl.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "var(--space-2) var(--space-3)",
                            borderBottom: "1px solid var(--color-border-light)",
                            background: "var(--color-bg-elevated)",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            if (!alreadyImported && playlists.length > 0) {
                              importPlaylist(pl);
                              setVisiblePlaylistIds(prev => {
                                const next = [...(prev || []), pl.id];
                                try { localStorage.setItem("fulkit-visible-playlists", JSON.stringify(next)); } catch {}
                                return next;
                              });
                            }
                          }}
                        >
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 9,
                            fontWeight: "var(--font-weight-bold)",
                            color: alreadyImported ? "var(--color-text-dim)" : "var(--color-text)",
                            textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                          }}>
                            {pl.name}
                          </span>
                          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                            {alreadyImported ? "imported" : `${pl.trackCount || 0}`}
                          </span>
                        </div>
                      );
                    })}
                    {filteredPlaylists.length === 0 && playlists.length > 0 && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic", padding: "var(--space-2) var(--space-3)" }}>
                        All playlists hidden — click + to manage
                      </div>
                    )}
                    {playlists.length === 0 && (
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic", padding: "var(--space-2) var(--space-3)" }}>
                        No playlists yet — add songs to sets to get started
                      </div>
                    )}
                  </div>
                )}
              </div>{/* end playlists wrapper */}
              </div>{/* end scroll container */}
            </div>

            {/* ── MIDDLE: Crates ── */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverCol("crates"); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => { e.stopPropagation(); clearDragIntent(); setDragOverCol(null); }}
              style={{
                flex: showCrates ? 5 : 0,
                minWidth: showCrates ? 200 : 0,
                width: showCrates ? "auto" : 0,
                overflow: "hidden",
                opacity: showCrates ? 1 : 0,
                transition: colTransition,
                borderRight: showCrates ? "1px solid var(--color-border-light)" : "none",
                display: "flex",
                flexDirection: "column",
                background: dragOverCol === "crates" ? "var(--color-bg-alt)" : undefined,
                minHeight: 0,
              }}
            >
              {/* Sticky column header */}
              <div style={{
                padding: "var(--space-2-5) var(--space-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--color-border-light)",
                background: "var(--color-bg)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                  <PackageOpen size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                  <Label>Crates</Label>
                </div>
                <button
                  onClick={() => setShowSpotifyBrowser(!showSpotifyBrowser)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-text-dim)",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Import playlist"
                >
                  <Plus size={10} strokeWidth={2} style={{
                    transform: showSpotifyBrowser ? "rotate(45deg)" : "none",
                    transition: "transform 120ms",
                  }} />
                </button>
              </div>

              {/* Scrollable crate content */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* Imported crate shelf (exclude published sets) */}
              {crates.filter(c => c.source !== "set").length > 0 && (
                <div className="thin-scroll-x" style={{
                  display: "flex",
                  gap: 0,
                  overflowX: "auto",
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
                          borderLeft: isCrateDragTarget ? "2px solid var(--color-text)" : "none",
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
                              setExpandedFeatured(null);
                              setFeaturedTracks([]);
                              setGuyCrateCollapsed(true);
                              try { localStorage.setItem("fulkit-guy-crate-collapsed", "true"); } catch {}
                            }
                          }}
                          style={{
                            padding: "var(--space-2) var(--space-2-5)",
                            minWidth: 100,
                            width: 110,
                            background: isOpen ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                            border: "none",
                            borderLeft: isOpen ? "3px solid var(--color-text)" : "none",
                            borderRight: "1px solid var(--color-border-light)",
                            borderRadius: 0,
                            cursor: "pointer",
                            fontFamily: "var(--font-primary)",
                            textAlign: "left",
                            transition: "all 120ms",
                          }}
                        >
                          <div style={{
                            fontSize: 10,
                            fontWeight: "var(--font-weight-semibold)",
                            color: "var(--color-text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 100,
                          }}>
                            {crate.name}
                          </div>
                          <div style={{
                            fontSize: 9,
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-muted)",
                            marginTop: 1,
                          }}>
                            {trackCount}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state — no crates yet */}
              {crates.filter(c => c.source !== "set").length === 0 && !cratesLoading && !showSpotifyBrowser && (
                <div style={{
                  padding: "var(--space-4) var(--space-2)",
                  textAlign: "center",
                  border: "1px dashed var(--color-border-light)",
                  borderRadius: 0,
                }}>
                  <Package size={20} strokeWidth={1.2} style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }} />
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                    {playlists.length > 0
                      ? "Import a playlist to get started"
                      : "Connect music in Settings \u2192 Sources"
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
                        borderRadius: 0,
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

              {/* ── B-SIDES ── */}
              {guyCrate && (
                <div style={{
                  borderBottom: "1px solid var(--color-border-light)",
                  overflow: "hidden",
                  marginBottom: 0,
                  flex: guyCrateCollapsed ? "none" : 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  {/* Header */}
                  <div style={{
                    padding: "var(--space-3) var(--space-2)",
                    borderBottom: !guyCrateCollapsed && guyCrate.tracks.length > 0 ? "1px solid var(--color-border-light)" : "none",
                    display: "flex",
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0 }}>
                      <button
                        onClick={toggleGuyCrateCollapsed}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                          transform: guyCrateCollapsed ? "rotate(-90deg)" : "none",
                          transition: "transform 120ms",
                        }}
                      >
                        <ChevronDown size={10} strokeWidth={2} />
                      </button>
                      <MessageCircleQuestion size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
                      <div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1-5)" }}>
                          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
                            B-Sides
                          </span>
                          <span style={{ fontSize: 9, fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-normal)", fontStyle: "italic", color: "var(--color-text-secondary)" }}>
                            -BTC
                          </span>
                        </div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                          {guyCrate.tracks.length} tracks
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <button
                        onClick={() => saveGuyCrateAsSet()}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2,
                          color: "var(--color-text-dim)", transition: "color 120ms", display: "flex",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
                        title="Save as set"
                      >
                        <Save size={12} strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={clearGuyCrate}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2,
                          color: "var(--color-text-dim)", transition: "color 120ms", display: "flex",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
                        title="Clear B-Sides"
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {/* Track list */}
                  {!guyCrateCollapsed && (
                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                      {guyCrate.tracks.length === 0 ? (
                        <div style={{ padding: "var(--space-4) var(--space-2)", textAlign: "center", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                          All cleared — Guy will refill this
                        </div>
                      ) : guyCrate.tracks.map((track, i) => {
                        const inSet = isFlagged(track.id);
                        const isActive = currentTrack?.id === track.id;
                        const isDowned = thumbedDownIds.has(track.id);
                        const isFading = thumbFadingIds.has(track.id);
                        return (
                          <div key={track.id}
                            draggable={!isDowned}
                            onDragStart={!isDowned ? () => { dragIntent.current = { type: "crate-track", track: { id: track.id, title: track.title, artist: track.artist, provider: track.provider, ytId: track.ytId, duration: track.duration, art: track.art }, fromSetId: "guy-crate" }; } : undefined}
                            onDragEnd={() => { clearDragIntent(); setDragOverCol(null); }}
                            onClick={!isDowned ? () => playTrackInContext(track, "bsides", "guy-crate", guyCrate.tracks, i) : undefined}
                            style={{
                              display: "flex", alignItems: "center", gap: "var(--space-2)",
                              padding: "var(--space-2)", cursor: isDowned ? "default" : "grab",
                              borderBottom: "1px solid var(--color-border-light)",
                              borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                              background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                              opacity: isFading ? 0 : 1,
                              maxHeight: isFading ? 0 : 100,
                              overflow: "hidden",
                              transition: isFading ? "opacity 0.6s ease-out, max-height 0.4s 0.5s ease-out, padding 0.4s 0.5s ease-out" : "background var(--duration-fast) var(--ease-default)",
                              ...(isFading ? { padding: 0, borderBottom: "none" } : {}),
                            }}>
                            <div style={{
                              width: 16, fontSize: 9, fontFamily: "var(--font-mono)",
                              color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
                              textAlign: "center", flexShrink: 0,
                            }}>
                              {isActive ? (
                                <div style={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "flex-end", height: 10 }}>
                                  {[0, 1, 2].map((j) => (
                                    <div key={j} style={{ width: 1.5, height: 3 + Math.random() * 7, background: "var(--color-text)" }} />
                                  ))}
                                </div>
                              ) : String(i + 1).padStart(2, "0")}
                            </div>
                            <div style={{
                              width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                              background: (audioFeatures[track.id] || fabricAnalyzed[track.id]) ? "var(--color-text-muted)" : "transparent",
                              border: (audioFeatures[track.id] || fabricAnalyzed[track.id]) ? "none" : "1px solid var(--color-text-dim)",
                            }} title={(audioFeatures[track.id] || fabricAnalyzed[track.id]) ? "Fabric analyzed" : "Pending"} />
                            <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-primary)" }}>
                              <div style={{
                                fontSize: "var(--font-size-xs)",
                                fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                                color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {track.title}
                              </div>
                              <div style={{
                                fontSize: 9, color: "var(--color-text-secondary)",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                              }}>
                                {track.artist}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (thumbedDownIds.has(track.id)) return;
                                thumbsDownTrack(track);
                                setThumbedDownIds(prev => new Set([...prev, track.id]));
                                // After 400ms (thumb fill visible), start row fade
                                setTimeout(() => setThumbFadingIds(prev => new Set([...prev, track.id])), 400);
                                // After fade + collapse completes, remove from Guy's Crate
                                setTimeout(() => removeFromGuyCrate(track.id), 1500);
                              }}
                              style={{
                                background: "none", border: "none",
                                cursor: thumbedDownIds.has(track.id) ? "default" : "pointer",
                                padding: 2, flexShrink: 0,
                                marginRight: "var(--space-2)",
                                color: isDowned ? "var(--color-text)" : "var(--color-text-dim)",
                                transition: "color 120ms",
                              }}
                              onMouseEnter={(e) => { if (!isDowned) e.currentTarget.style.color = "var(--color-text)"; }}
                              onMouseLeave={(e) => { if (!isDowned) e.currentTarget.style.color = "var(--color-text-dim)"; }}
                              title="Never suggest again"
                            >
                              <ThumbsDown size={11} strokeWidth={1.8} fill={isDowned ? "var(--color-text)" : "none"} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); flag(track); }}
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                                color: inSet ? "var(--color-text)" : "var(--color-text-secondary)",
                                transition: "color 120ms",
                              }}
                              onMouseEnter={(e) => { if (!inSet) e.currentTarget.style.color = "var(--color-text)"; }}
                              onMouseLeave={(e) => { if (!inSet) e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                              title={inSet ? "Remove from set" : "Add to set"}
                            >
                              {inSet ? <ListX size={14} strokeWidth={2} /> : <ListMusic size={14} strokeWidth={1.8} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromGuyCrate(track.id); }}
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                                color: "var(--color-text-muted)", transition: "color 120ms",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                              title="Remove"
                            >
                              <MessageCircleX size={12} strokeWidth={1.5} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── SPOTIFY BROWSER — pick playlists to import ── */}
              {showSpotifyBrowser && (
                <div style={{
                  borderBottom: "1px solid var(--color-border-light)",
                  overflow: "hidden",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-2)",
                    borderBottom: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                  }}>
                    <Label>Spotify Playlists</Label>
                    <button
                      onClick={() => setShowSpotifyBrowser(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-muted)" }}
                    >
                      <X size={14} strokeWidth={1.8} />
                    </button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    {playlists.map(pl => {
                      const alreadyImported = crates.some(c => c.source_playlist_id === pl.id);
                      const isImporting = importing === pl.id;
                      return (
                        <div key={pl.id} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "var(--space-2-5) var(--space-2)",
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
                                borderRadius: 0,
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
                  borderBottom: "1px solid var(--color-border-light)",
                  overflow: "hidden",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-2) var(--space-3) var(--space-3)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                      <button
                        onClick={() => deleteCrate(expandedCrate)}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex",
                          color: "var(--color-text-dim)", transition: "color 120ms",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
                        title="Delete crate"
                      >
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                      <button
                        onClick={() => {
                          const crate = crates.find(c => c.id === expandedCrate);
                          if (crate?.source_playlist_id) playPlaylist(crate.source_playlist_id);
                        }}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex",
                          color: "var(--color-text-dim)", transition: "color 120ms",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"}
                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}
                        title="Play crate"
                      >
                        <Play size={12} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    {crateTracks.map((track, i) => {
                      const isActive = currentTrack?.id === track.source_id;
                      const hasFabric = track.fabric_status === "complete";
                      const trackFlagged = isFlagged(track.source_id);
                      const trackObj = { id: track.source_id, title: track.title, artist: track.artist, duration: Math.round((track.duration_ms || 0) / 1000) };
                      return (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={() => { dragIntent.current = { type: "external-track", track: trackObj }; }}
                          onDragEnd={() => { clearDragIntent(); setDragOverCol(null); }}
                          onClick={() => playTrackInContext(trackObj, "crate", expandedCrate, crateTracks.map(t => ({
                            id: t.source_id, title: t.title, artist: t.artist,
                            duration: Math.round((t.duration_ms || 0) / 1000),
                          })), i)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-2)",
                            borderBottom: "1px solid var(--color-border-light)",
                            borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                            background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                            transition: "background var(--duration-fast) var(--ease-default)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-dim)",
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
                          <div
                            style={{
                              flex: 1,
                              textAlign: "left",
                              padding: 0,
                              fontFamily: "var(--font-primary)",
                              minWidth: 0,
                            }}
                          >
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: "var(--color-text)",
                              fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.title}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.artist}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); flag({
                              id: track.source_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                              provider: track.provider || "youtube",
                            }); }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              flexShrink: 0,
                              color: trackFlagged ? "var(--color-text)" : "var(--color-text-dim)",
                              opacity: trackFlagged ? 1 : 0.6,
                              transition: "opacity 120ms",
                            }}
                            title={trackFlagged ? "Remove from set" : "Add to set"}
                          >
                            {trackFlagged ? <ListX size={14} strokeWidth={2} /> : <ListMusic size={14} strokeWidth={1.8} />}
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
                  borderBottom: "1px solid var(--color-border-light)",
                  overflow: "hidden",
                  marginTop: "var(--space-1)",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-2)",
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
                          {featuredTracks.length} tracks · by Fülkit
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                    {featuredTracks.map((track, i) => {
                      const isActive = currentTrack?.id === track.source_id;
                      const trackFlagged = isFlagged(track.source_id);
                      return (
                        <div
                          key={track.id || i}
                          onClick={() => playTrackInContext({
                            id: track.source_id,
                            title: track.title,
                            artist: track.artist,
                            duration: Math.round((track.duration_ms || 0) / 1000),
                          }, "featured", expandedFeatured, featuredTracks.map(t => ({
                            id: t.source_id, title: t.title, artist: t.artist,
                            duration: Math.round((t.duration_ms || 0) / 1000),
                          })), i)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-2)",
                            borderBottom: "1px solid var(--color-border-light)",
                            borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                            background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                            transition: "background var(--duration-fast) var(--ease-default)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-dim)",
                            width: 18,
                            flexShrink: 0,
                            textAlign: "right",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div
                            style={{
                              flex: 1,
                              textAlign: "left",
                              padding: 0,
                              fontFamily: "var(--font-primary)",
                              minWidth: 0,
                            }}
                          >
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: "var(--color-text)",
                              fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.title}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.artist}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); flag({
                              id: track.source_id,
                              title: track.title,
                              artist: track.artist,
                              duration: Math.round((track.duration_ms || 0) / 1000),
                              provider: track.provider || "youtube",
                            }); }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              flexShrink: 0,
                              color: trackFlagged ? "var(--color-text)" : "var(--color-text-dim)",
                              opacity: trackFlagged ? 1 : 0.6,
                              transition: "opacity 120ms",
                            }}
                            title={trackFlagged ? "Remove from set" : "Add to set"}
                          >
                            {trackFlagged ? <ListX size={14} strokeWidth={2} /> : <ListMusic size={14} strokeWidth={1.8} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>{/* end scrollable content */}
            </div>

            {/* ── RIGHT: Sets ── */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverCol("sets"); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => {
                // Column-level fallback: ADD-ONLY to active set. Never toggle, never remove.
                // Only fires if inner handlers didn't stopPropagation (i.e. drop on column background).
                const intent = dragIntent.current;
                clearDragIntent();
                if (intent && (intent.type === "external-track" || intent.type === "crate-track")) {
                  // External/crate tracks → add to active set (not toggle)
                  addTrackToSet(intent.track, activeSetId);
                } else if (intent?.type === "set-track" && intent.fromSetId) {
                  // Track from another set dropped on column bg → add to active set
                  addTrackToSet(intent.track, activeSetId);
                }
                // set-header, reorder, or same-set track drops that somehow reach here → ignored
                setDragOverCol(null);
              }}
              style={{
                flex: showSets ? 3 : 0,
                minWidth: showSets ? 160 : 0,
                width: showSets ? "auto" : 0,
                overflow: "hidden",
                opacity: showSets ? 1 : 0,
                transition: colTransition,
                display: "flex",
                flexDirection: "column",
                background: dragOverCol === "sets" ? "var(--color-bg-alt)" : undefined,
              }}
            >
              {/* Sticky column header */}
              <div style={{
                padding: "var(--space-2-5) var(--space-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--color-border-light)",
                background: "var(--color-bg)",
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                  <Turntable size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                  <Label>Sets</Label>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  {(() => {
                    const activeArc = allSets.find(s => s.id === activeSetId)?.arcActive;
                    return (
                      <div style={{ position: "relative", display: "inline-flex" }}
                        onMouseEnter={(e) => { const tip = e.currentTarget.querySelector("[data-tip]"); if (tip) tip.style.opacity = "1"; }}
                        onMouseLeave={(e) => { const tip = e.currentTarget.querySelector("[data-tip]"); if (tip) tip.style.opacity = "0"; }}
                      >
                        <button
                          onClick={() => { const active = allSets.find(s => s.id === activeSetId); if (active) toggleArc(active.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: 2,
                            display: "flex", alignItems: "center",
                            color: activeArc ? "var(--color-text)" : "var(--color-text-muted)",
                            opacity: activeArc ? 1 : 0.6,
                            transition: "opacity 150ms, color 150ms",
                          }}
                        >
                          <Bold size={11} strokeWidth={2.5} />
                        </button>
                        <div data-tip style={{
                          position: "absolute", top: "calc(100% + 8px)", right: 0,
                          padding: "8px 12px", background: "#ffffff", color: "#2A2826",
                          fontSize: 10, fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)",
                          lineHeight: 1.5, borderRadius: 6,
                          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", border: "1px solid var(--color-border-light)",
                          width: 160, whiteSpace: "normal", pointerEvents: "none", zIndex: 9999,
                          opacity: 0, transition: "opacity 150ms",
                        }}>
                          {activeArc
                            ? <><strong>Flow is on.</strong><br />Your set is arranged. Click to go back to manual.</>
                            : <><strong>Arrange for flow.</strong><br />B-Side sequences your set — energy arc, smooth transitions, no dead spots.</>
                          }
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => createSet()}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-text-dim)", padding: 2,
                      display: "flex", alignItems: "center",
                    }}
                    title="New set"
                  >
                    <Plus size={10} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* ═══ ALL SETS STACKED ═══ */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {allSets.map((set, setIdx) => {
                  const isExpanded = expandedSetIds.includes(set.id);
                  const isActiveSet = set.id === activeSetId;
                  const isPlayingFromThisSet = isActiveSet && currentTrack && set.tracks.some(t => t.id === currentTrack.id);
                  const setPublished = publishedSets[set.name] || null;
                  const isSetDragTarget = headerDragOverIdx === setIdx && headerDragIdx !== setIdx;
                  return (
                    <div key={set.id} style={{
                      borderBottom: "1px solid var(--color-border-light)",
                      overflow: "hidden",
                      background: "var(--color-bg-elevated)",
                    }}>
                      {/* Set header row */}
                      <div
                        draggable
                        onDragStart={(e) => {
                          dragIntent.current = { type: "set-header", setIdx };
                          setHeaderDragIdx(setIdx);
                          setDragNode.current = e.currentTarget;
                          setTimeout(() => { if (setDragNode.current) setDragNode.current.style.opacity = "0.4"; }, 0);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (setIdx !== headerDragOverIdx) setHeaderDragOverIdx(setIdx);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const intent = dragIntent.current;
                          clearDragIntent();
                          if (!intent) { /* no-op */ }
                          // Track drag from a different source → MOVE/ADD to this set
                          else if ((intent.type === "set-track" || intent.type === "crate-track" || intent.type === "external-track") && intent.fromSetId !== set.id) {
                            const t = intent.track;
                            if (intent.fromSetId) {
                              moveTrackToSet(t, intent.fromSetId, set.id);
                            } else {
                              addTrackToSet(t, set.id);
                            }
                          }
                          // Set header reorder
                          else if (intent.type === "set-header" && intent.setIdx !== setIdx) {
                            reorderSets(intent.setIdx, setIdx);
                          }
                          // Any other intent (e.g. track dropped on own set header) — ignored safely
                          setHeaderDragIdx(null);
                          setHeaderDragOverIdx(null);
                          if (setDragNode.current) setDragNode.current.style.opacity = "1";
                        }}
                        onDragEnd={() => {
                          clearDragIntent();
                          setHeaderDragIdx(null);
                          setHeaderDragOverIdx(null);
                          if (setDragNode.current) setDragNode.current.style.opacity = "1";
                        }}
                        onClick={() => { switchSet(set.id); toggleSetExpanded(set.id); }}
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          borderBottom: isExpanded ? "1px solid var(--color-border-light)" : "none",
                          borderLeft: isPlayingFromThisSet ? "3px solid var(--color-accent)" : "3px solid transparent",
                          borderTop: isSetDragTarget ? "2px solid var(--color-text)" : "2px solid transparent",
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          cursor: "pointer",
                          background: isPlayingFromThisSet ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                          transition: "background var(--duration-fast) var(--ease-default)",
                          position: "relative",
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSetExpanded(set.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: 0,
                            color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                            transform: isExpanded ? "none" : "rotate(-90deg)",
                            transition: "transform 120ms",
                          }}
                        >
                          <ChevronDown size={10} strokeWidth={2} />
                        </button>
                        {renamingSet === set.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => { if (renameValue.trim()) renameSet(set.id, renameValue.trim()); setRenamingSet(null); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { if (renameValue.trim()) renameSet(set.id, renameValue.trim()); setRenamingSet(null); }
                              if (e.key === "Escape") setRenamingSet(null);
                            }}
                            style={{
                              flex: 1, minWidth: 0, padding: 0,
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              fontWeight: "var(--font-weight-bold)", color: "var(--color-text)",
                              textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                              border: "none", borderBottom: "1px solid var(--color-text-muted)",
                              background: "transparent", outline: "none",
                            }}
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => { e.stopPropagation(); setRenamingSet(set.id); setRenameValue(set.name); }}
                            style={{
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              fontWeight: "var(--font-weight-bold)",
                              color: isPlayingFromThisSet ? "var(--color-text)" : "var(--color-text-muted)",
                              textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                              cursor: "pointer", whiteSpace: "nowrap",
                              overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                            }}
                          >
                            {set.name}
                          </span>
                        )}
                        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                          {set.trackCount}
                        </span>
                        <div style={{ flex: 1 }} />
                        {/* Trophy — complete/uncomplete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); trophySet(set.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer", padding: 2,
                            color: "var(--color-text-dim)", opacity: 0.6, transition: "opacity 120ms", flexShrink: 0, display: "flex",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                          title="Complete this set"
                        >
                          <Trophy size={10} strokeWidth={1.8} />
                        </button>
                        {/* Crown — publish/unpublish (owner only) */}
                        {isOwner && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (publishing) return;
                            try {
                              if (setPublished) {
                                setPublishing(true);
                                await unpublishSet(setPublished);
                                await loadCrates();
                              } else {
                                if (set.trackCount === 0) { setPublishMsg("Set is empty"); setTimeout(() => setPublishMsg(null), 2000); return; }
                                setPublishing(true);
                                const res = await publishSet(set.id);
                                if (res?.ok) {
                                  await loadCrates();
                                } else if (res?.error === "not_ready") {
                                  setPublishMsg(`${res.pending} of ${res.total} still processing`);
                                  setTimeout(() => setPublishMsg(null), 3000);
                                } else {
                                  setPublishMsg("Failed to publish");
                                  setTimeout(() => setPublishMsg(null), 2000);
                                }
                              }
                            } finally { setPublishing(false); }
                          }}
                          style={{
                            background: "none", border: "none",
                            cursor: publishing ? "wait" : "pointer", padding: 2,
                            color: setPublished ? "var(--color-text)" : "var(--color-text-dim)",
                            opacity: setPublished ? 1 : 0.6, transition: "opacity 120ms", flexShrink: 0,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = setPublished ? "1" : "0.6"}
                          title={setPublished ? "Unpublish" : "Feature this set"}
                        >
                          <Crown size={10} strokeWidth={1.8} />
                        </button>
                        )}
                        {/* Delete set */}
                        {allSets.length >= 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSet(set.id); }}
                            style={{
                              background: "none", border: "none", cursor: "pointer", padding: 2,
                              color: "var(--color-text-muted)", opacity: 0.6, transition: "opacity 120ms",
                              flexShrink: 0, display: "flex",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                            title="Delete set"
                          >
                            <Trash2 size={9} strokeWidth={1.8} />
                          </button>
                        )}
                      </div>

                      {/* Tracks */}
                      {isExpanded && (
                        <div>
                          {set.tracks.length === 0 && (
                            <div style={{ padding: "var(--space-4) var(--space-2)", textAlign: "center" }}>
                              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                                Flag tracks to build this set
                              </div>
                            </div>
                          )}
                          {set.tracks.map((track, i) => {
                            const isActive = currentTrack?.id === track.id;
                            const isDragTarget = isExpanded && dragOverIdx === i && dragIdx !== i;
                            const setFeat = audioFeatures[track.id];
                            return (
                              <div
                                key={track.id}
                                draggable={isExpanded}
                                onDragStart={isExpanded ? (e) => { handleDragStart(e, i); dragIntent.current = { type: "set-track", track: { id: track.id, title: track.title, artist: track.artist, provider: track.provider, ytId: track.ytId, duration: track.duration, art: track.art }, fromSetId: set.id, fromIndex: i }; } : undefined}
                                onDragOver={isExpanded ? (e) => handleDragOver(e, i) : undefined}
                                onDrop={isExpanded ? (e) => handleDrop(e, i, set.id, set.tracks) : undefined}
                                onDragEnd={() => { handleDragEnd(); clearDragIntent(); }}
                                onClick={() => { if (justDragged.current) return; switchSet(set.id); playTrackInContext(track, "set", set.id, set.tracks, i); }}
                                style={{
                                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                                  padding: "var(--space-2) var(--space-2)",
                                  borderBottom: "1px solid var(--color-border-light)",
                                  borderTop: isDragTarget ? "2px solid var(--color-text)" : "2px solid transparent",
                                  borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                                  background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                                  cursor: isExpanded ? "grab" : "pointer",
                                  transition: "background var(--duration-fast) var(--ease-default)", userSelect: "none",
                                }}
                              >
                                <div style={{
                                  width: 16, fontSize: 9, fontFamily: "var(--font-mono)",
                                  color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
                                  textAlign: "center", flexShrink: 0,
                                }}>
                                  {isActive ? (
                                    <div style={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "flex-end", height: 10 }}>
                                      {[0, 1, 2].map((j) => (
                                        <div key={j} style={{ width: 1.5, height: 3 + Math.random() * 7, background: "var(--color-text)" }} />
                                      ))}
                                    </div>
                                  ) : String(i + 1).padStart(2, "0")}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: "var(--font-size-xs)",
                                    fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                                    color: "var(--color-text)", whiteSpace: "nowrap",
                                    overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {track.title}
                                  </div>
                                  <div style={{
                                    fontSize: 9, color: "var(--color-text-dim)",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {track.artist}
                                  </div>
                                </div>
                                {setFeat && (
                                  <div style={{ flexShrink: 0, textAlign: "right" }}>
                                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>{setFeat.bpm}</div>
                                    <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{setFeat.key}</div>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (justDragged.current) return; removeTrackFromSet(track.id, set.id); }}
                                  style={{
                                    background: "none", border: "none", cursor: "pointer", padding: 2,
                                    color: "var(--color-text-secondary)", display: "flex", flexShrink: 0, opacity: 0.6,
                                  }}
                                >
                                  <ListX size={14} strokeWidth={1.8} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {allSets.length === 0 && trophiedSets.length === 0 && (
                  <div style={{ padding: "var(--space-10) var(--space-2)", textAlign: "center" }}>
                    <Plus size={16} strokeWidth={1.2} color="var(--color-text-dim)" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Create a set to get started</div>
                  </div>
                )}

                {/* ═══ COMPLETED SETS FOLD ═══ */}
                {trophiedSets.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--color-border)" }}>
                    <div
                      onClick={() => { setCompletedFoldOpen(p => { const next = !p; try { localStorage.setItem("fulkit-completed-fold", String(next)); } catch {} return next; }); }}
                      style={{
                        padding: "var(--space-2) var(--space-3)",
                        display: "flex", alignItems: "center", gap: "var(--space-2)",
                        cursor: "pointer", background: "var(--color-bg)",
                      }}
                    >
                      <ChevronDown size={10} strokeWidth={2} style={{
                        color: "var(--color-text-dim)",
                        transform: completedFoldOpen ? "none" : "rotate(-90deg)",
                        transition: "transform 120ms",
                      }} />
                      <Trophy size={10} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 9,
                        fontWeight: "var(--font-weight-bold)",
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                      }}>
                        Completed ({trophiedSets.length})
                      </span>
                    </div>
                    {completedFoldOpen && trophiedSets.map((set, setIdx) => {
                      const isExpanded = expandedSetIds.includes(set.id);
                      const isPlayingFromThisSet = currentTrack && set.tracks.some(t => t.id === currentTrack.id);
                      return (
                        <div key={set.id} style={{
                          borderBottom: "1px solid var(--color-border-light)",
                          overflow: "hidden",
                          background: "var(--color-bg)",
                        }}>
                          <div
                            onClick={() => { switchSet(set.id); toggleSetExpanded(set.id); }}
                            style={{
                              padding: "var(--space-2) var(--space-3)",
                              borderBottom: isExpanded ? "1px solid var(--color-border-light)" : "none",
                              borderLeft: isPlayingFromThisSet ? "3px solid var(--color-accent)" : "3px solid transparent",
                              display: "flex", alignItems: "center", gap: "var(--space-2)",
                              cursor: "pointer",
                              background: isPlayingFromThisSet ? "var(--color-bg-alt)" : "var(--color-bg)",
                            }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSetExpanded(set.id); }}
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: 0,
                                color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                                transform: isExpanded ? "none" : "rotate(-90deg)",
                                transition: "transform 120ms",
                              }}
                            >
                              <ChevronDown size={10} strokeWidth={2} />
                            </button>
                            <span style={{
                              fontFamily: "var(--font-mono)", fontSize: 9,
                              fontWeight: "var(--font-weight-bold)",
                              color: isPlayingFromThisSet ? "var(--color-text)" : "var(--color-text-muted)",
                              textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                            }}>
                              {set.name}
                            </span>
                            <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                              {set.trackCount}
                            </span>
                            <div style={{ flex: 1 }} />
                            {/* Un-trophy */}
                            <button
                              onClick={(e) => { e.stopPropagation(); untrophySet(set.id); }}
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: 2,
                                color: "var(--color-text)", opacity: 0.8, transition: "opacity 120ms", flexShrink: 0, display: "flex",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.8"}
                              title="Move back to active sets"
                            >
                              <Trophy size={10} strokeWidth={1.8} />
                            </button>
                          </div>
                          {isExpanded && (
                            <div>
                              {set.tracks.map((track, i) => {
                                const isActive = currentTrack?.id === track.id;
                                return (
                                  <div
                                    key={track.id}
                                    onClick={() => { switchSet(set.id); playTrackInContext(track, "set", set.id, set.tracks, i); }}
                                    style={{
                                      display: "flex", alignItems: "center", gap: "var(--space-2)",
                                      padding: "var(--space-2) var(--space-2)",
                                      borderBottom: "1px solid var(--color-border-light)",
                                      borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                                      background: isActive ? "var(--color-bg-alt)" : "var(--color-bg)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span style={{ width: 18, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", textAlign: "right", flexShrink: 0 }}>
                                      {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{
                                        fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
                                        fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                                        color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                      }}>
                                        {track.title}
                                      </div>
                                      <div style={{ fontSize: 9, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {track.artist}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Publish status message */}
              {publishMsg && (
                <div style={{
                  position: "absolute", bottom: "var(--space-2)", right: "var(--space-3)",
                  zIndex: 20, background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)", borderRadius: 0,
                  padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)", whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}>
                  {publishMsg}
                </div>
              )}

              {/* RSG moved to Browse column */}
            </div>
          </div>
          </div>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-3px); }
        }
      `}</style>
    </AuthGuard>
  );
}
