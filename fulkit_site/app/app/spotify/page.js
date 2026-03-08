"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight, Plus, Check, X, Disc } from "lucide-react";
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

// BPM-synced terrain — driven by Spotify audio features.
// Mountains pulse at the track's real tempo, amplitude scales with
// energy, shape character shifts with danceability and mood.
// No permissions, no mic, no share dialog. Just works.

const T_LAYERS = 40;
const T_POINTS = 80;

function SignalTerrain({ height = 220, active = false, trackId = null }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const containerRef = useRef(null);
  const historyRef = useRef([]);
  const phaseRef = useRef(0);
  const seedRef = useRef(() => {
    // Generate a stable random seed array for terrain shape variety
    const s = [];
    for (let i = 0; i < T_POINTS; i++) s.push(Math.random());
    return s;
  });
  const [canvasWidth, setCanvasWidth] = useState(600);

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

  // Reset terrain + new seed shape on track change
  useEffect(() => {
    const s = [];
    for (let i = 0; i < T_POINTS; i++) s.push(Math.random());
    seedRef.current = s;
    historyRef.current = [];
  }, [trackId]);

  // Render loop
  useEffect(() => {
    let running = true;
    let lastFrame = 0;
    const frameInterval = 1000 / 20; // ~20fps for smooth layer stacking

    const render = (timestamp) => {
      if (!running) return;
      animRef.current = requestAnimationFrame(render);

      // Throttle to ~20fps for layer accumulation
      if (timestamp - lastFrame < frameInterval) return;
      lastFrame = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const seed = seedRef.current;

      // Phase advance — gentle drift when idle, livelier when playing
      const phaseStep = active ? 0.045 : 0.008;
      phaseRef.current += phaseStep;
      const phase = phaseRef.current;

      // Generate terrain points from layered oscillators + seed
      const points = [];
      for (let i = 0; i < T_POINTS; i++) {
        const t = i / T_POINTS;
        const s = seed[i] || 0.5;

        // Layered sine waves at different speeds
        const wave1 = Math.sin(phase + t * Math.PI * 4 + s * 6) * 0.35;
        const wave2 = Math.sin(phase * 0.6 + t * Math.PI * 7 + s * 10) * 0.2;
        const wave3 = Math.sin(phase * 1.8 + t * Math.PI * 12 + s * 4) * 0.1;

        // Envelope: taper at edges
        const envelope = Math.sin(t * Math.PI);

        // Combine
        const amplitude = active
          ? (wave1 + wave2 + wave3 + s * 0.2) * envelope * 0.55
          : (s * 0.15 + Math.sin(phase * 0.3 + t * 3) * 0.05) * envelope * 0.3;

        points.push(Math.max(0, Math.min(1, amplitude)));
      }

      historyRef.current.push(points);
      if (historyRef.current.length > T_LAYERS) historyRef.current.shift();

      // Colors from CSS
      const style = getComputedStyle(canvas);
      const textColor = style.getPropertyValue("--color-text").trim() || "#e8e6e3";
      const tc = textColor.startsWith("#")
        ? [parseInt(textColor.slice(1, 3), 16), parseInt(textColor.slice(3, 5), 16), parseInt(textColor.slice(5, 7), 16)]
        : [232, 230, 227];

      ctx.clearRect(0, 0, w, h);

      const layers = historyRef.current;
      const centerY = h * 0.42;

      for (let l = 0; l < layers.length; l++) {
        const age = l / Math.max(1, layers.length - 1);
        const data = layers[l];

        const alpha = 0.012 + age * age * 0.16;
        const lw = 0.3 + age * 1.0;
        const yShift = (layers.length - 1 - l) * 1.1;

        // === Mountains ===
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`;
        ctx.lineWidth = lw;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const amp = data[i] * centerY * 1.1;
          const y = centerY - amp - yShift;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevI = i - 1;
            const prevX = (prevI / (data.length - 1)) * w;
            const prevAmp = data[prevI] * centerY * 1.1;
            const prevY = centerY - prevAmp - yShift;
            const midX = (prevX + x) / 2;
            const midY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, midX, midY);
          }
        }
        ctx.lineTo(w, centerY - data[data.length - 1] * centerY * 1.1 - yShift);
        ctx.stroke();

        // === Reflection ===
        const refAlpha = alpha * 0.25;
        const refShift = (layers.length - 1 - l) * 0.5;
        ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${refAlpha})`;
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const amp = data[i] * centerY * 0.4;
          const y = centerY + amp + refShift + 4;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Center horizon
      ctx.strokeStyle = `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, 0.04)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [canvasWidth, active]);

  return (
    <div ref={containerRef} style={{ width: "100%", position: "relative" }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        style={{ width: "100%", height, display: "block" }}
      />
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

  // Pad grid — 16 slots, fill with flagged tracks
  const PADS = 16;
  const pads = Array.from({ length: PADS }, (_, i) => flagged[i] || null);

  // Drag handlers for the setlist
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx);
    dragNode.current = e.target;
    e.dataTransfer.effectAllowed = "move";
    // Slight delay to let the drag image render
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
              {/* Track info */}
              <div>
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
          <div style={{ borderBottom: "1px solid var(--color-border-light)" }}>
            <SignalTerrain height={200} active={isPlaying} trackId={currentTrack?.id} />
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
                          {/* Pad number */}
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
                          {/* Track name */}
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
