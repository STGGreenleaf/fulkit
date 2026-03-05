"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Plus,
  Check,
  Shuffle,
  Repeat,
  List,
  Music,
  Flag,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useSpotify } from "../../lib/spotify";

function TrackRow({ track, index, onPlay, onFlag, isFlagged, isActive }) {
  return (
    <button
      onClick={() => onPlay(track)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2-5) var(--space-3)",
        background: isActive ? "var(--color-bg-alt)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        fontFamily: "var(--font-primary)",
        transition: `background var(--duration-fast) var(--ease-default)`,
      }}
    >
      {/* Track number / playing indicator */}
      <div
        style={{
          width: 20,
          fontSize: "var(--font-size-2xs)",
          fontFamily: "var(--font-mono)",
          color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
          textAlign: "center",
          fontWeight: isActive ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
        }}
      >
        {isActive ? (
          <div style={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "flex-end", height: 12 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: 4 + Math.random() * 8,
                  background: "var(--color-text)",
                  borderRadius: 1,
                }}
              />
            ))}
          </div>
        ) : (
          index + 1
        )}
      </div>

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--font-size-sm)",
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
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {track.artist}
        </div>
      </div>

      {/* Duration */}
      <div
        style={{
          fontSize: "var(--font-size-2xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-dim)",
          flexShrink: 0,
        }}
      >
        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
      </div>

      {/* Flag button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFlag(track);
        }}
        style={{
          width: 24,
          height: 24,
          borderRadius: "var(--radius-full)",
          background: isFlagged ? "var(--color-text)" : "transparent",
          border: isFlagged ? "none" : "1px solid var(--color-border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          transition: `all var(--duration-fast) var(--ease-default)`,
        }}
      >
        {isFlagged ? (
          <Check size={10} strokeWidth={2.5} color="var(--color-text-inverse)" />
        ) : (
          <Plus size={10} strokeWidth={2} color="var(--color-text-dim)" />
        )}
      </button>
    </button>
  );
}

export default function SpotifyPage() {
  const {
    isPlaying,
    currentTrack,
    queue,
    flagged,
    playlists,
    allTracks,
    progress,
    toggle,
    skip,
    prev,
    flag,
    isFlagged,
    playTrack,
    formatTime,
    setProgress,
  } = useSpotify();

  const [view, setView] = useState("now"); // now | queue | mixes | flagged

  const views = [
    { id: "now", label: "Now Playing", icon: Music },
    { id: "queue", label: "Queue", icon: List },
    { id: "mixes", label: "Mixes", icon: Shuffle },
    { id: "flagged", label: "Flagged", icon: Flag },
  ];

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Top bar with view tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {views.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
                    borderBottom: active ? "1px solid var(--color-text)" : "1px solid transparent",
                    background: "transparent",
                    color: active ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: "var(--font-weight-medium)",
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                    marginBottom: -1,
                  }}
                >
                  <v.icon size={14} strokeWidth={1.8} />
                  {v.label}
                  {v.id === "flagged" && flagged.length > 0 && (
                    <span
                      style={{
                        fontSize: "var(--font-size-2xs)",
                        fontFamily: "var(--font-mono)",
                        background: "var(--color-text)",
                        color: "var(--color-text-inverse)",
                        borderRadius: "var(--radius-full)",
                        padding: "0 5px",
                        lineHeight: "16px",
                      }}
                    >
                      {flagged.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Now Playing hero */}
            {view === "now" && currentTrack && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "var(--space-8)" }}>
                {/* Album art */}
                <div
                  style={{
                    width: 280,
                    height: 280,
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-bg-inverse)",
                    marginBottom: "var(--space-8)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: "grayscale(1)",
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1.2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>

                {/* Track info */}
                <div style={{ textAlign: "center", marginBottom: "var(--space-6)", maxWidth: 400 }}>
                  <div
                    style={{
                      fontSize: "var(--font-size-xl)",
                      fontWeight: "var(--font-weight-black)",
                      letterSpacing: "var(--letter-spacing-tight)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {currentTrack.title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {currentTrack.artist} — {currentTrack.album}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ width: "100%", maxWidth: 400, marginBottom: "var(--space-6)" }}>
                  <div
                    style={{
                      width: "100%",
                      height: 3,
                      background: "var(--color-border)",
                      borderRadius: 2,
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setProgress((e.clientX - rect.left) / rect.width);
                    }}
                  >
                    <div
                      style={{
                        width: `${progress * 100}%`,
                        height: "100%",
                        background: "var(--color-text)",
                        borderRadius: 2,
                        transition: "width 0.1s linear",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "var(--space-1)",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-dim)",
                    }}
                  >
                    <span>{formatTime(progress * currentTrack.duration)}</span>
                    <span>{formatTime(currentTrack.duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                  <button
                    onClick={() => flag(currentTrack)}
                    title={isFlagged(currentTrack.id) ? "Flagged" : "Flag"}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-full)",
                      background: isFlagged(currentTrack.id) ? "var(--color-text)" : "transparent",
                      border: isFlagged(currentTrack.id) ? "none" : "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: `all var(--duration-fast) var(--ease-default)`,
                    }}
                  >
                    {isFlagged(currentTrack.id) ? (
                      <Check size={14} strokeWidth={2.5} color="var(--color-text-inverse)" />
                    ) : (
                      <Plus size={14} strokeWidth={2} color="var(--color-text-muted)" />
                    )}
                  </button>

                  <button onClick={prev} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                    <SkipBack size={20} strokeWidth={1.8} color="var(--color-text-secondary)" />
                  </button>

                  <button
                    onClick={toggle}
                    style={{
                      width: 56,
                      height: 56,
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
                      <Pause size={22} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" />
                    ) : (
                      <Play size={22} strokeWidth={2} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" style={{ marginLeft: 2 }} />
                    )}
                  </button>

                  <button onClick={skip} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                    <SkipForward size={20} strokeWidth={1.8} color="var(--color-text-secondary)" />
                  </button>

                  <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                    <Shuffle size={16} strokeWidth={1.8} color="var(--color-text-dim)" />
                  </button>
                </div>
              </div>
            )}

            {/* Queue view */}
            {view === "queue" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-6)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    color: "var(--color-text-muted)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Now playing
                </div>
                {currentTrack && (
                  <TrackRow
                    track={currentTrack}
                    index={0}
                    onPlay={playTrack}
                    onFlag={flag}
                    isFlagged={isFlagged(currentTrack.id)}
                    isActive={true}
                  />
                )}
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    color: "var(--color-text-muted)",
                    marginTop: "var(--space-6)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Up next
                </div>
                {queue.map((track, i) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={i + 1}
                    onPlay={playTrack}
                    onFlag={flag}
                    isFlagged={isFlagged(track.id)}
                    isActive={false}
                  />
                ))}
                {queue.length === 0 && (
                  <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--color-text-dim)", fontSize: "var(--font-size-sm)" }}>
                    Queue is empty
                  </div>
                )}
              </div>
            )}

            {/* Mixes view */}
            {view === "mixes" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-6)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    color: "var(--color-text-muted)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  Your mixes
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                  {playlists.map((pl) => (
                    <button
                      key={pl.id}
                      style={{
                        padding: "var(--space-5) var(--space-4)",
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--font-primary)",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--color-bg-inverse)",
                          marginBottom: "var(--space-3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1.2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-semibold)",
                          marginBottom: "var(--space-1)",
                        }}
                      >
                        {pl.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                        {pl.description}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--font-size-2xs)",
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-text-dim)",
                          marginTop: "var(--space-2)",
                        }}
                      >
                        {pl.tracks} tracks
                      </div>
                    </button>
                  ))}

                  {/* AI generate new mix */}
                  <button
                    style={{
                      padding: "var(--space-5) var(--space-4)",
                      background: "transparent",
                      border: "1px dashed var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "center",
                      fontFamily: "var(--font-primary)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-2)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <Plus size={20} strokeWidth={1.5} />
                    <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>
                      Ask Chappie to build a mix
                    </div>
                    <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                      From your flags, mood, or vibe
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Flagged view */}
            {view === "flagged" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-6)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                    color: "var(--color-text-muted)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Flagged tracks ({flagged.length})
                </div>
                {flagged.length > 0 ? (
                  <>
                    {flagged.map((track, i) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={i}
                        onPlay={playTrack}
                        onFlag={flag}
                        isFlagged={true}
                        isActive={currentTrack?.id === track.id}
                      />
                    ))}
                    <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                      <button
                        style={{
                          padding: "var(--space-2) var(--space-4)",
                          background: "var(--color-bg-inverse)",
                          color: "var(--color-text-inverse)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-size-xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          fontFamily: "var(--font-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Build a mix from these
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "var(--space-16)",
                      textAlign: "center",
                    }}
                  >
                    <Plus size={24} strokeWidth={1.2} color="var(--color-text-dim)" style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                      No flagged tracks yet
                    </div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                      Hit + on any track to save it here
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
