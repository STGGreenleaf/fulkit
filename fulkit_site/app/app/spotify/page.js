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

// Live signal meter — listens via mic, draws waveform on canvas
function SignalMeter({ width = 400, height = 40, active = false }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null); // AudioContext
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [denied, setDenied] = useState(false);

  // Start/stop mic capture
  const toggleMic = useCallback(async () => {
    if (listening) {
      // Stop
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) ctxRef.current.close();
      ctxRef.current = null;
      analyserRef.current = null;
      streamRef.current = null;
      setListening(false);
      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw flat line
        ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--color-border").trim() || "#3a3835";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;
      setListening(true);
      setDenied(false);
      draw();
    } catch {
      setDenied(true);
    }
  }, [listening]);

  // Animation loop — draw waveform
  function draw() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animRef.current = requestAnimationFrame(render);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get computed color
      const style = getComputedStyle(canvas);
      const lineColor = style.getPropertyValue("--color-text").trim() || "#e8e6e3";
      const dimColor = style.getPropertyValue("--color-border").trim() || "#3a3835";

      // Center line (dim)
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Waveform
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    render();
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (ctxRef.current) ctxRef.current.close();
    };
  }, []);

  // Draw flat line on initial render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || listening) return;
    const ctx = canvas.getContext("2d");
    const style = getComputedStyle(canvas);
    const dimColor = style.getPropertyValue("--color-border").trim() || "#3a3835";
    ctx.strokeStyle = dimColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }, [listening]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <Label style={{ margin: 0 }}>Signal</Label>
        <button
          onClick={toggleMic}
          style={{
            fontSize: 8,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: listening ? "var(--color-text)" : "var(--color-text-dim)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {denied ? "denied" : listening ? "● live" : "off"}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={!listening ? toggleMic : undefined}
        style={{
          width,
          height,
          cursor: listening ? "default" : "pointer",
          borderRadius: 2,
        }}
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
            transition: "background 0.2s",
          }}
        />
      ))}
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

  // Pad grid — 16 slots, fill with flagged tracks
  const PADS = 16;
  const pads = Array.from({ length: PADS }, (_, i) => flagged[i] || null);

  const features = currentTrack ? audioFeatures[currentTrack.id] : null;

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
              {/* BPM + Key — big hardware readout */}
              <div style={{ display: "flex", gap: "var(--space-8)", alignItems: "baseline" }}>
                <div>
                  <Label>BPM</Label>
                  <div
                    style={{
                      fontSize: 42,
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-bold)",
                      lineHeight: 1,
                      letterSpacing: "-2px",
                      color: "var(--color-text)",
                      marginTop: 2,
                    }}
                  >
                    {features?.bpm || "---"}
                  </div>
                </div>
                <div>
                  <Label>KEY</Label>
                  <div
                    style={{
                      fontSize: 28,
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-semibold)",
                      lineHeight: 1,
                      color: "var(--color-text)",
                      marginTop: 2,
                    }}
                  >
                    {features?.key || "--"}
                  </div>
                </div>
              </div>

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

              {/* Meters */}
              <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
                <div>
                  <Label style={{ marginBottom: 3 }}>Energy</Label>
                  <MeterBar value={features?.energy || 0} width={80} />
                </div>
                <div>
                  <Label style={{ marginBottom: 3 }}>Dance</Label>
                  <MeterBar value={features?.danceability || 0} width={80} />
                </div>
                <div>
                  <Label style={{ marginBottom: 3 }}>Mood</Label>
                  <MeterBar value={features?.valence || 0} width={80} />
                </div>
              </div>

              {/* Signal meter — live audio waveform via mic */}
              <SignalMeter width={400} height={32} active={isPlaying} />

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
                  const feat = track ? audioFeatures[track.id] : null;
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
                          {/* BPM in corner */}
                          {feat && (
                            <div
                              style={{
                                fontSize: 8,
                                fontFamily: "var(--font-mono)",
                                color: isActive ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                                opacity: 0.7,
                              }}
                            >
                              {feat.bpm}
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
                  const feat = audioFeatures[track.id];
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

                      {/* BPM + Key */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        {feat ? (
                          <>
                            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>
                              {feat.bpm}
                            </div>
                            <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                              {feat.key}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>···</div>
                        )}
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
