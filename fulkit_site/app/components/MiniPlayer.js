"use client";

import { useState, useEffect, useRef } from "react";
import { Play, CirclePause, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Check } from "lucide-react";
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
        <div style={{ display: "flex", alignItems: "center", width: 14, flexShrink: 0 }}>
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
              writingMode: "vertical-lr",
              direction: "rtl",
              width: 3,
              height: "100%",
              WebkitAppearance: "none",
              appearance: "none",
              background: "var(--color-border)",
              borderRadius: 0,
              outline: "none",
              cursor: "pointer",
              margin: "0 auto",
              padding: 0,
            }}
          />
        </div>
        <style>{`
          .fulkit-vol-v::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 2px;
            height: 12px;
            border-radius: 0;
            background: var(--color-text);
            border: none;
            cursor: pointer;
          }
          .fulkit-vol-v::-moz-range-thumb {
            width: 2px;
            height: 12px;
            border-radius: 0;
            background: var(--color-text);
            border: none;
            cursor: pointer;
          }
          .fulkit-vol-v::-moz-range-track {
            width: 3px;
            background: var(--color-border);
            border-radius: 0;
          }
        `}</style>

        {/* Controls column */}
        <div
          style={{
            flex: 1,
            padding: "var(--space-2) 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
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
              <CirclePause size={14} strokeWidth={2} color="var(--color-text)" />
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
                <CirclePause size={16} strokeWidth={2} color="var(--color-text)" />
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
