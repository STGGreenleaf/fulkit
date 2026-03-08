"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Plus, Check, Volume2, VolumeX } from "lucide-react";
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
          <SkipBack size={12} strokeWidth={2} color="var(--color-text-muted)" />
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
          <SkipForward size={12} strokeWidth={2} color="var(--color-text-muted)" />
        </button>
      </div>
    );
  }

  const displayVolume = dragging ? localVolume.current : volume;
  const muted = displayVolume === 0;

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border-light)",
        padding: "var(--space-3) var(--space-2-5)",
      }}
    >
      {/* Track info — left-aligned, no art */}
      <div style={{ marginBottom: "var(--space-2-5)" }}>
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
            border: flaggedNow
              ? "none"
              : "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: `all var(--duration-fast) var(--ease-default)`,
          }}
        >
          {flaggedNow ? (
            <Check
              size={12}
              strokeWidth={2.5}
              color="var(--color-text-inverse)"
            />
          ) : (
            <Plus
              size={12}
              strokeWidth={2}
              color="var(--color-text-muted)"
            />
          )}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <button
            onClick={prev}
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-full)",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <SkipBack
              size={14}
              strokeWidth={2}
              color="var(--color-text-muted)"
            />
          </button>
          <button
            onClick={toggle}
            style={{
              width: 32,
              height: 32,
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
              <Pause
                size={14}
                strokeWidth={2}
                color="var(--color-text-inverse)"
                fill="var(--color-text-inverse)"
              />
            ) : (
              <Play
                size={14}
                strokeWidth={2}
                color="var(--color-text-inverse)"
                fill="var(--color-text-inverse)"
                style={{ marginLeft: 1 }}
              />
            )}
          </button>
          <button
            onClick={skip}
            style={{
              width: 28,
              height: 28,
              borderRadius: "var(--radius-full)",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <SkipForward
              size={14}
              strokeWidth={2}
              color="var(--color-text-muted)"
            />
          </button>
        </div>
      </div>

      {/* Volume slider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginTop: "var(--space-2-5)",
        }}
      >
        <button
          onClick={() => setVolume(muted ? 50 : 0)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {muted ? (
            <VolumeX size={12} strokeWidth={2} color="var(--color-text-dim)" />
          ) : (
            <Volume2 size={12} strokeWidth={2} color="var(--color-text-dim)" />
          )}
        </button>
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
            flex: 1,
            height: 2,
            WebkitAppearance: "none",
            appearance: "none",
            background: "var(--color-border)",
            borderRadius: 1,
            outline: "none",
            cursor: "pointer",
          }}
        />
        <style>{`
          .fulkit-vol::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--color-text-muted);
            border: none;
            cursor: pointer;
          }
          .fulkit-vol::-moz-range-thumb {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--color-text-muted);
            border: none;
            cursor: pointer;
          }
          .fulkit-vol::-moz-range-track {
            height: 2px;
            background: var(--color-border);
            border-radius: 1px;
          }
        `}</style>
      </div>
    </div>
  );
}
