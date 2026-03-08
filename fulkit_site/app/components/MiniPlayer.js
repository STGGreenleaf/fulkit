"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Plus, Check } from "lucide-react";
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

  // Sync from provider when not dragging
  useEffect(() => {
    if (!dragging) localVolume.current = volume;
  }, [volume, dragging]);

  if (!enabled || !connected || !currentTrack) return null;

  const flaggedNow = isFlagged(currentTrack.id);

  if (compact) {
    return (
      <div
        style={{
          borderTop: "1px solid var(--color-border-light)",
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
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: flaggedNow ? "var(--color-text)" : "transparent",
            border: flaggedNow ? "none" : "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
        <button
          onClick={prev}
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={12} strokeWidth={2} color="var(--color-text-muted)" />
        </button>
        <button
          onClick={toggle}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            background: "var(--color-bg-inverse)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isPlaying ? (
            <Pause size={12} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" />
          ) : (
            <Play size={12} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" style={{ marginLeft: 1 }} />
          )}
        </button>
        <button
          onClick={skip}
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <ChevronRight size={12} strokeWidth={2} color="var(--color-text-muted)" />
        </button>
      </div>
    );
  }

  const displayVolume = dragging ? localVolume.current : volume;

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

        {/* Controls */}
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
              width: 28,
              height: 28,
              borderRadius: "var(--radius-full)",
              background: flaggedNow ? "var(--color-text)" : "transparent",
              border: flaggedNow ? "none" : "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
            <button
              onClick={prev}
              style={{
                width: 28, height: 28, borderRadius: "var(--radius-full)",
                background: "transparent", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <ChevronLeft size={14} strokeWidth={2} color="var(--color-text-muted)" />
            </button>
            <button
              onClick={toggle}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-full)",
                background: isPlaying ? "var(--color-text)" : "var(--color-bg-inverse)",
                border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "background var(--duration-fast) var(--ease-default)",
              }}
            >
              {isPlaying ? (
                <Pause size={14} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" />
              ) : (
                <Play size={14} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" style={{ marginLeft: 1 }} />
              )}
            </button>
            <button
              onClick={skip}
              style={{
                width: 28, height: 28, borderRadius: "var(--radius-full)",
                background: "transparent", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <ChevronRight size={14} strokeWidth={2} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
