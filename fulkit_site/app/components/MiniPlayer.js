"use client";

import { useState, useEffect, useRef } from "react";
import { Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Check, Disc } from "lucide-react";

// Minimal pause mark — two vertical lines, no circle
function PauseLines({ size = 16, color = "currentColor", strokeWidth = 2.5 }) {
  const w = size, h = size;
  const gap = w * 0.3;
  const x1 = w / 2 - gap, x2 = w / 2 + gap;
  const py = h * 0.18;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <line x1={x1} y1={py} x2={x1} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={x2} y1={py} x2={x2} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

import Link from "next/link";
import { useSpotify } from "../lib/spotify";

// Normalized icon size for all controls
const IC = 14;
const IC_SM = 12;
const STROKE = 2.2;
const STROKE_BOLD = 2.8;

export default function MiniPlayer({ compact }) {
  const { connected, isPlaying, currentTrack, toggle, skip, prev, flag, isFlagged, volume, setVolume } =
    useSpotify();
  const [enabled, setEnabled] = useState(true);
  const [dragging, setDragging] = useState(false);
  const localVolume = useRef(volume);

  useEffect(() => {
    setEnabled(localStorage.getItem("fulkit-spotify-player") !== "false");
    const onStorage = () => setEnabled(localStorage.getItem("fulkit-spotify-player") !== "false");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!dragging) localVolume.current = volume;
  }, [volume, dragging]);

  if (!enabled || !connected || !currentTrack) return null;

  const flaggedNow = isFlagged(currentTrack.id);
  const displayVolume = dragging ? localVolume.current : volume;

  // All buttons share the same circular footprint
  const SZ = 28;
  const baseBtn = {
    width: SZ, height: SZ,
    borderRadius: "var(--radius-full)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    outline: "none",
  };
  // Circled buttons (flag + disc)
  const circleBtn = {
    ...baseBtn,
    background: "transparent",
    border: "1px solid var(--color-border)",
  };
  // Bare buttons (prev, play/pause, next) — same footprint, no visible circle
  const bareBtn = {
    ...baseBtn,
    background: "transparent",
    border: "1px solid transparent",
  };

  /* ═══════════════════════════════════════════
   * COMPACT / VERTICAL
   * ═══════════════════════════════════════════ */
  if (compact) {
    return (
      <div
        style={{
          borderTop: "1px solid var(--color-border-light)",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* Vertical volume slider — left edge */}
        <div style={{ position: "relative", width: 14, flexShrink: 0 }}>
          <input
            type="range"
            min={0} max={100} step={1}
            value={displayVolume}
            className="fulkit-vol-v"
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onTouchStart={() => setDragging(true)}
            onTouchEnd={() => setDragging(false)}
            onChange={(e) => { const v = Number(e.target.value); localVolume.current = v; setVolume(v); }}
            style={{
              position: "absolute", bottom: 0, left: 7,
              width: "var(--_vol-h, 100px)", height: 3,
              WebkitAppearance: "none", appearance: "none",
              background: "var(--color-border)", borderRadius: 0,
              outline: "none", cursor: "pointer", margin: 0, padding: 0,
              transformOrigin: "bottom left", transform: "rotate(-90deg)",
            }}
            ref={(el) => {
              if (el && el.parentElement) {
                const pad = parseFloat(getComputedStyle(el.parentElement.parentElement).getPropertyValue("--space-4") || "16");
                el.style.setProperty("--_vol-h", (el.parentElement.offsetHeight - pad) + "px");
              }
            }}
          />
        </div>
        <style>{`
          .fulkit-vol-v::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:2px; border-radius:0; background:var(--color-text); border:none; cursor:pointer; transform:rotate(90deg); }
          .fulkit-vol-v::-moz-range-thumb { width:12px; height:2px; border-radius:0; background:var(--color-text); border:none; cursor:pointer; transform:rotate(90deg); }
          .fulkit-vol-v::-moz-range-track { height:3px; background:var(--color-border); border-radius:0; }
        `}</style>

        {/* Controls column — all same size, even spacing */}
        <div
          style={{
            flex: 1,
            padding: "var(--space-5) 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
          }}
        >
          {/* Flag — circled */}
          <button
            onClick={(e) => { e.preventDefault(); flag(currentTrack); }}
            style={{
              ...circleBtn,
              background: flaggedNow ? "var(--color-text)" : "transparent",
              border: flaggedNow ? "1px solid var(--color-text)" : "1px solid var(--color-border)",
              transition: "all 150ms",
            }}
          >
            {flaggedNow
              ? <Check size={IC_SM} strokeWidth={STROKE_BOLD} color="var(--color-text-inverse)" />
              : <Plus size={IC_SM} strokeWidth={STROKE} color="var(--color-text-muted)" />
            }
          </button>

          {/* Prev — bare */}
          <button onClick={prev} style={bareBtn}>
            <ChevronUp size={IC} strokeWidth={STROKE} color="var(--color-text-muted)" />
          </button>

          {/* Play/Pause — bare, thicker */}
          <button onClick={toggle} style={bareBtn}>
            {isPlaying
              ? <PauseLines size={IC} strokeWidth={STROKE_BOLD} color="var(--color-text)" />
              : <Play size={IC} strokeWidth={STROKE_BOLD} color="var(--color-text)" fill="var(--color-text)" style={{ marginLeft: 1 }} />
            }
          </button>

          {/* Next — bare */}
          <button onClick={skip} style={bareBtn}>
            <ChevronDown size={IC} strokeWidth={STROKE} color="var(--color-text-muted)" />
          </button>

          {/* Deck link — circled */}
          <Link href="/spotify" style={{ ...circleBtn, textDecoration: "none", color: "var(--color-text-dim)" }}>
            <Disc size={IC_SM} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
   * EXPANDED / HORIZONTAL
   * ═══════════════════════════════════════════ */
  return (
    <div>
      {/* Volume slider — IS the divider rule */}
      <input
        type="range"
        min={0} max={100} step={1}
        value={displayVolume}
        className="fulkit-vol"
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        onChange={(e) => { const v = Number(e.target.value); localVolume.current = v; setVolume(v); }}
        style={{
          display: "block", width: "100%", height: 3,
          WebkitAppearance: "none", appearance: "none",
          background: "var(--color-border)", borderRadius: 0,
          outline: "none", cursor: "pointer", margin: 0, padding: 0,
        }}
      />
      <style>{`
        .fulkit-vol::-webkit-slider-thumb { -webkit-appearance:none; width:2px; height:12px; border-radius:0; background:var(--color-text); border:none; cursor:pointer; }
        .fulkit-vol::-moz-range-thumb { width:2px; height:12px; border-radius:0; background:var(--color-text); border:none; cursor:pointer; }
        .fulkit-vol::-moz-range-track { height:3px; background:var(--color-border); border-radius:0; }
      `}</style>

      <div style={{ padding: "var(--space-2-5) var(--space-2-5) var(--space-3)" }}>
        {/* Track info — links to /spotify */}
        <Link href="/spotify" style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: "var(--space-3)" }}>
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-bold)",
              fontFamily: "var(--font-primary)",
              color: "var(--color-text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack.title}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {currentTrack.artist}
          </div>
        </Link>

        {/* Controls — all same size, full width, evenly spaced */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Flag — circled */}
          <button
            onClick={(e) => { e.preventDefault(); flag(currentTrack); }}
            title={flaggedNow ? "Flagged" : "Flag this track"}
            style={{
              ...circleBtn,
              background: flaggedNow ? "var(--color-text)" : "transparent",
              border: flaggedNow ? "1px solid var(--color-text)" : "1px solid var(--color-border)",
              transition: "all 150ms",
            }}
          >
            {flaggedNow
              ? <Check size={IC_SM} strokeWidth={STROKE_BOLD} color="var(--color-text-inverse)" />
              : <Plus size={IC_SM} strokeWidth={STROKE} color="var(--color-text-muted)" />
            }
          </button>

          {/* Prev — bare */}
          <button onClick={prev} style={bareBtn}>
            <ChevronLeft size={IC} strokeWidth={STROKE} color="var(--color-text-muted)" />
          </button>

          {/* Play/Pause — bare, thicker */}
          <button onClick={toggle} style={bareBtn}>
            {isPlaying
              ? <PauseLines size={IC} strokeWidth={STROKE_BOLD} color="var(--color-text)" />
              : <Play size={IC} strokeWidth={STROKE_BOLD} color="var(--color-text)" fill="var(--color-text)" style={{ marginLeft: 1 }} />
            }
          </button>

          {/* Next — bare */}
          <button onClick={skip} style={bareBtn}>
            <ChevronRight size={IC} strokeWidth={STROKE} color="var(--color-text-muted)" />
          </button>

          {/* Deck link — circled */}
          <Link href="/spotify" style={{ ...circleBtn, textDecoration: "none", color: "var(--color-text-dim)" }}>
            <Disc size={IC_SM} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  );
}
