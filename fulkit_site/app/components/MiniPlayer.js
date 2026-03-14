"use client";

import { useState, useEffect } from "react";
import { Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Check, Disc, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useFabric } from "../lib/fabric";
import VolumeSlider from "./VolumeSlider";
import Tooltip from "./Tooltip";

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

// Normalized icon size for all controls
const IC = 14;
const IC_SM = 12;
const STROKE = 2.2;
const STROKE_BOLD = 2.8;

export default function MiniPlayer({ compact }) {
  const { connected, isPlaying, currentTrack, toggle, skip, prev, flag, isFlagged, volume, setVolume } =
    useFabric();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(localStorage.getItem("fulkit-fabric-player") !== "false");
    const onStorage = () => setEnabled(localStorage.getItem("fulkit-fabric-player") !== "false");
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!enabled) return null;

  // Button styles needed for both idle and active states
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
  const circleBtn = {
    ...baseBtn,
    background: "transparent",
    border: "1px solid var(--color-border)",
  };

  // Idle state — Spotify not connected or nothing playing
  if (!connected || !currentTrack) {
    return (
      <div style={{
        borderTop: "1px solid var(--color-border-light)",
        padding: "var(--space-2) 0",
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        paddingLeft: compact ? 0 : "var(--space-2-5)",
      }}>
        <Tooltip label={compact ? "Fabric" : null}>
          <Link href="/fabric" style={{ ...circleBtn, textDecoration: "none", color: "var(--color-text-dim)" }}>
            <Disc size={IC_SM} strokeWidth={1.8} />
          </Link>
        </Tooltip>
        {!compact && (
          <Link href="/fabric" style={{
            marginLeft: "var(--space-2)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            alignSelf: "center",
          }}>
            Fabric
          </Link>
        )}
      </div>
    );
  }

  const flaggedNow = isFlagged(currentTrack.id);

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
        <VolumeSlider value={volume ?? 0} onChange={setVolume} vertical />

        {/* Controls column — tight, pushed to bottom */}
        <div
          style={{
            flex: 1,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
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
          <Link href="/fabric" style={{ ...circleBtn, textDecoration: "none", color: "var(--color-text-dim)" }}>
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
      <VolumeSlider value={volume ?? 0} onChange={setVolume} />

      <div style={{ padding: "var(--space-2) 0 var(--space-2)" }}>
        {/* Track info — links to /fabric */}
        <Link href="/fabric" style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: "var(--space-2)", padding: "0 var(--space-2-5)" }}>
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
          <Link href="/fabric" style={{ ...circleBtn, textDecoration: "none", color: "var(--color-text-dim)" }}>
            <Disc size={IC_SM} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </div>
  );
}
