"use client";

import { Play, Pause, SkipForward, SkipBack, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useSpotify } from "../lib/spotify";

export default function MiniPlayer({ compact }) {
  const { connected, isPlaying, currentTrack, toggle, skip, prev, flag, isFlagged } =
    useSpotify();

  if (!connected || !currentTrack) return null;

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

  return (
    <div
      style={{
        borderTop: "1px solid var(--color-border-light)",
        padding: "var(--space-3) var(--space-2-5)",
      }}
    >
      {/* Track info — click to open /spotify */}
      <Link
        href="/spotify"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2-5)",
          textDecoration: "none",
          marginBottom: "var(--space-2-5)",
        }}
      >
        {/* Album art placeholder — monochrome */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-xs)",
            background: "var(--color-bg-inverse)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "grayscale(1)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-inverse)"
            strokeWidth="1.8"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
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
      </Link>

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
    </div>
  );
}
