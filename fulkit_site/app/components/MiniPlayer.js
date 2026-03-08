"use client";

import { useState, useEffect, useRef } from "react";
import { Play, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Check } from "lucide-react";

// Minimal pause mark — two vertical lines, no circle
function PauseLines({ size = 16, color = "currentColor", strokeWidth = 2 }) {
  const w = size;
  const h = size;
  const gap = w * 0.28;
  const x1 = w / 2 - gap;
  const x2 = w / 2 + gap;
  const py = h * 0.22;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <line x1={x1} y1={py} x2={x1} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <line x1={x2} y1={py} x2={x2} y2={h - py} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}
import { useSpotify } from "../lib/spotify";

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

  // Shared bare button style — no circle, just the mark
  const bareBtn = {
    width: 28, height: 28,
    background: "transparent", border: "none", outline: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", padding: 0,
  };

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
            min={0}
            max={100}
            step={1}
            value={displayVolume}
            className="fulkit-vol-v"
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onTouchStart={() => setDragging(true)}
            onTouchEnd={() => setDragging(false)}
            onChange={(e) => {
              const v = Number(e.target.value);
              localVolume.current = v;
              setVolume(v);
            }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 7,
              width: "var(--_vol-h, 100px)",
              height: 3,
              WebkitAppearance: "none",
              appearance: "none",
              background: "var(--color-border)",
              borderRadius: 0,
              outline: "none",
              cursor: "pointer",
              margin: 0,
              padding: 0,
              transformOrigin: "bottom left",
              transform: "rotate(-90deg)",
            }}
            ref={(el) => {
              if (el && el.parentElement) {
                // Shorten slider so its top aligns with the flag button's top edge
                const pad = parseFloat(getComputedStyle(el.parentElement.parentElement).getPropertyValue("--space-4") || "16");
                el.style.setProperty("--_vol-h", (el.parentElement.offsetHeight - pad) + "px");
              }
            }}
          />
        </div>
        <style>{`
          .fulkit-vol-v::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 12px;
            height: 2px;
            border-radius: 0;
            background: var(--color-text);
            border: none;
            cursor: pointer;
            transform: rotate(90deg);
          }
          .fulkit-vol-v::-moz-range-thumb {
            width: 12px;
            height: 2px;
            border-radius: 0;
            background: var(--color-text);
            border: none;
            cursor: pointer;
            transform: rotate(90deg);
          }
          .fulkit-vol-v::-moz-range-track {
            height: 3px;
            background: var(--color-border);
            border-radius: 0;
          }
        `}</style>

        {/* Controls column */}
        <div
          style={{
            flex: 1,
            padding: "var(--space-4) 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <button
            onClick={(e) => { e.preventDefault(); flag(currentTrack); }}
            style={{
              width: 24, height: 24,
              borderRadius: "var(--radius-full)",
              background: flaggedNow ? "var(--color-text)" : "transparent",
              border: flaggedNow ? "none" : "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: `all var(--duration-fast) var(--ease-default)`,
              marginBottom: "var(--space-2)",
            }}
          >
            {flaggedNow ? (
              <Check size={10} strokeWidth={2.5} color="var(--color-text-inverse)" />
            ) : (
              <Plus size={10} strokeWidth={2} color="var(--color-text-muted)" />
            )}
          </button>
          <button onClick={prev} style={{ ...bareBtn, width: 24, height: 24 }}>
            <ChevronUp size={12} strokeWidth={2} color="var(--color-text-muted)" />
          </button>
          <button onClick={toggle} style={{ ...bareBtn, width: 24, height: 24 }}>
            {isPlaying ? (
              <PauseLines size={14} strokeWidth={2} color="var(--color-text)" />
            ) : (
              <Play size={14} strokeWidth={2.5} color="var(--color-text)" style={{ marginLeft: 1 }} />
            )}
          </button>
          <button onClick={skip} style={{ ...bareBtn, width: 24, height: 24 }}>
            <ChevronDown size={12} strokeWidth={2} color="var(--color-text-muted)" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Volume slider — IS the divider rule */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={displayVolume}
        className="fulkit-vol"
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        onChange={(e) => {
          const v = Number(e.target.value);
          localVolume.current = v;
          setVolume(v);
        }}
        style={{
          display: "block",
          width: "100%",
          height: 3,
          WebkitAppearance: "none",
          appearance: "none",
          background: "var(--color-border)",
          borderRadius: 0,
          outline: "none",
          cursor: "pointer",
          margin: 0,
          padding: 0,
        }}
      />
      <style>{`
        .fulkit-vol::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 2px;
          height: 12px;
          border-radius: 0;
          background: var(--color-text);
          border: none;
          cursor: pointer;
        }
        .fulkit-vol::-moz-range-thumb {
          width: 2px;
          height: 12px;
          border-radius: 0;
          background: var(--color-text);
          border: none;
          cursor: pointer;
        }
        .fulkit-vol::-moz-range-track {
          height: 3px;
          background: var(--color-border);
          border-radius: 0;
        }
      `}</style>

      <div style={{ padding: "var(--space-2-5) var(--space-2-5) var(--space-3)" }}>
        {/* Track info */}
        <div style={{ marginBottom: "var(--space-2)" }}>
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
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
        </div>

        {/* Controls — bare marks, no circles */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              flag(currentTrack);
            }}
            title={flaggedNow ? "Flagged" : "Flag this track"}
            style={{
              width: 28, height: 28,
              borderRadius: "var(--radius-full)",
              background: flaggedNow ? "var(--color-text)" : "transparent",
              border: flaggedNow ? "none" : "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
              transition: `all var(--duration-fast) var(--ease-default)`,
            }}
          >
            {flaggedNow ? (
              <Check size={12} strokeWidth={2.5} color="var(--color-text-inverse)" />
            ) : (
              <Plus size={12} strokeWidth={2} color="var(--color-text-muted)" />
            )}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
            <button onClick={prev} style={bareBtn}>
              <ChevronLeft size={16} strokeWidth={2} color="var(--color-text-muted)" />
            </button>
            <button onClick={toggle} style={bareBtn}>
              {isPlaying ? (
                <PauseLines size={16} strokeWidth={2} color="var(--color-text)" />
              ) : (
                <Play size={16} strokeWidth={2.5} color="var(--color-text)" style={{ marginLeft: 1 }} />
              )}
            </button>
            <button onClick={skip} style={bareBtn}>
              <ChevronRight size={16} strokeWidth={2} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
