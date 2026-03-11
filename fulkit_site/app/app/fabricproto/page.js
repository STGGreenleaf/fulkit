"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, Disc3, Box, Plus, ListX, Turntable, X, MessageCircle, ChevronUp, Send, Loader2, Trash2, ArrowUpFromLine, ArrowDownFromLine } from "lucide-react";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";

const TAB_ICON_SIZE = 14;

// ── Mock Data ──

const MOCK_TRACK = {
  title: "Cafe Del Mar",
  artist: "Energy 52",
  album: "Cafe Del Mar — The Best Of",
  art: null,
  bpm: 132,
  key: "Am",
};

const MOCK_FEATURES = { bpm: 132, key: "Am", energy: 0.72, danceability: 0.65, valence: 0.48 };

const MOCK_CRATES = [
  {
    id: "c1", name: "Late Night Selects", source: "set",
    tracks: [
      { id: "st1", title: "Cafe Del Mar", artist: "Energy 52", bpm: 132, duration: "7:12" },
      { id: "st2", title: "French Kiss", artist: "Lil Louis", bpm: 122, duration: "10:03" },
      { id: "st3", title: "Strings of Life", artist: "Derrick May", bpm: 130, duration: "6:48" },
      { id: "st4", title: "Blue in Green", artist: "Miles Davis", bpm: 68, duration: "5:27" },
      { id: "st5", title: "Your Love", artist: "Frankie Knuckles", bpm: 120, duration: "8:34" },
    ],
  },
  {
    id: "c2", name: "Ambient Drift", source: "set",
    tracks: [
      { id: "a1", title: "An Ending (Ascent)", artist: "Brian Eno", bpm: 72, duration: "4:23" },
      { id: "a2", title: "Nuvole Bianche", artist: "Ludovico Einaudi", bpm: 68, duration: "5:57" },
      { id: "a3", title: "Near Light", artist: "Ólafur Arnalds", bpm: 67, duration: "3:48" },
    ],
  },
];

const MOCK_RSG_MESSAGES = [
  { role: "user", content: "What goes with Vök?" },
  { role: "assistant", content: "Vök lives in that Iceland-meets-electronica lane. Try:\n\nKiasmos - Blurred  101  [+]\nÓlafur Arnalds - Near Light  67  [+]\nRival Consoles - Articulation  118  [+]" },
];

const MOCK_RSG_RECS = [
  { id: "rsg1", title: "Blurred", artist: "Kiasmos", bpm: 101 },
  { id: "rsg2", title: "Near Light", artist: "Ólafur Arnalds", bpm: 67 },
  { id: "rsg3", title: "Articulation", artist: "Rival Consoles", bpm: 118 },
];

// ── Label Component ──

function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 9,
      fontFamily: "var(--font-mono)",
      fontWeight: "var(--font-weight-medium)",
      textTransform: "uppercase",
      letterSpacing: "var(--letter-spacing-wider)",
      color: "var(--color-text-dim)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Meter Bar ──

function Meter({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <Label style={{ marginBottom: 2 }}>{label}</Label>
      <div style={{ width: "100%", height: 3, background: "var(--color-border)", borderRadius: 1.5, overflow: "hidden" }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: "var(--color-text-muted)", borderRadius: 1.5 }} />
      </div>
    </div>
  );
}

// ── Main Page ──

export default function FabricProto() {
  const { compactMode } = useAuth();
  const [showBrowse, setShowBrowse] = useState(true);
  const [showCrates, setShowCrates] = useState(true);
  const [showSets, setShowSets] = useState(true);
  const [expandedCrate, setExpandedCrate] = useState(MOCK_CRATES[0].id);
  const [setTracks, setSetTracks] = useState(MOCK_CRATES[0].tracks.slice(0, 3));
  const [musicChatOpen, setMusicChatOpen] = useState(true);
  const [rsgMessages, setRsgMessages] = useState(MOCK_RSG_MESSAGES);
  const [rsgRecs, setRsgRecs] = useState(MOCK_RSG_RECS);
  const [rsgInput, setRsgInput] = useState("");
  const [rsgLoading, setRsgLoading] = useState(false);
  const [deckExpanded, setDeckExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.35);
  const dragTrack = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const rsgScrollRef = useRef(null);

  const currentTrack = MOCK_TRACK;
  const features = MOCK_FEATURES;

  const toggleDeck = useCallback(() => setDeckExpanded((v) => !v), []);

  // Keyboard shortcut: D
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "d" || e.key === "D") toggleDeck();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleDeck]);

  // Mock progress animation
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setProgress((p) => p >= 1 ? 0 : p + 0.002), 100);
    return () => clearInterval(id);
  }, [isPlaying]);

  const expandedCrateTracks = MOCK_CRATES.find((c) => c.id === expandedCrate)?.tracks || [];

  const isInSet = (id) => setTracks.some((t) => t.id === id);
  const toggleSet = (track) => {
    if (isInSet(track.id)) {
      setSetTracks((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setSetTracks((prev) => [...prev, { ...track, bpm: track.bpm || "—", duration: track.duration || "—" }]);
    }
  };

  const PANELS = [
    { id: "browse", label: "DIG", icon: Disc3, active: showBrowse, toggle: () => setShowBrowse((v) => !v) },
    { id: "crates", label: "CRATES", icon: Box, active: showCrates, toggle: () => setShowCrates((v) => !v) },
    { id: "sets", label: "SETS", icon: Turntable, active: showSets, toggle: () => setShowSets((v) => !v) },
  ];

  const colTransition = "flex 300ms ease, min-width 300ms ease, width 300ms ease, opacity 200ms ease, padding 300ms ease";

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden", background: "var(--color-bg)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>

        {/* Deck toggle — persistent top-right */}
        <button onClick={toggleDeck} style={{
          position: "absolute", top: 8, right: 8,
          width: 22, height: 22, borderRadius: "var(--radius-full)",
          background: "transparent", border: "1px solid var(--color-border-light)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0, opacity: 0.4, transition: "opacity 120ms",
          zIndex: 10,
        }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
          title={deckExpanded ? "Collapse deck (D)" : "Expand deck (D)"}
        >
          {deckExpanded
            ? <ArrowUpFromLine size={10} strokeWidth={2} color="var(--color-text-muted)" />
            : <ArrowDownFromLine size={10} strokeWidth={2} color="var(--color-text-muted)" />}
        </button>

        {/* ═══ COMPACT BAR ═══ */}
        {!deckExpanded && (
          <div style={{
            borderBottom: "1px solid var(--color-border-light)",
            padding: "var(--space-1-5) var(--space-3)",
            display: "flex", gap: "var(--space-3)", alignItems: "center", height: 48,
          }}>
            {/* Thumbnail */}
            <div style={{
              width: 36, height: 36, flexShrink: 0,
              background: "var(--color-bg-inverse)", borderRadius: "var(--radius-sm)",
              overflow: "hidden", filter: "grayscale(1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentTrack.title}
              </div>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentTrack.artist} — {features.bpm} BPM / {features.key}
              </div>
            </div>
            {/* Progress */}
            <div style={{ width: 120, flexShrink: 0 }}>
              <div
                style={{ width: "100%", height: 2, background: "var(--color-border)", cursor: "pointer", position: "relative" }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setProgress((e.clientX - rect.left) / rect.width);
                }}
              >
                <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--color-text)", transition: "width 0.1s linear" }} />
              </div>
            </div>
            {/* Transport mini */}
            <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
              <button style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <ChevronLeft size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
              </button>
              <button onClick={() => setIsPlaying((v) => !v)} style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                {isPlaying ? <Pause size={14} strokeWidth={2.8} color="var(--color-text)" /> : <Play size={14} strokeWidth={2.8} color="var(--color-text)" fill="var(--color-text)" style={{ marginLeft: 1 }} />}
              </button>
              <button style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <ChevronRight size={14} strokeWidth={2.2} color="var(--color-text-muted)" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ THE DECK (full) ═══ */}
        {deckExpanded && (
          <div style={{
            borderBottom: "1px solid var(--color-border-light)",
            padding: "var(--space-4) var(--space-5)",
            display: "flex", gap: "var(--space-5)", alignItems: "center",
            minHeight: 0, position: "relative",
          }}>
            {/* Album art */}
            <div style={{
              width: 180, height: 180, flexShrink: 0,
              background: "var(--color-bg-inverse)", borderRadius: "var(--radius-sm)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
              filter: "grayscale(1)",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-inverse)" strokeWidth="1">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>

            {/* Readout panel */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {/* Track info + BPM/Key */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-6)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)",
                    letterSpacing: "var(--letter-spacing-tight)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {currentTrack.title}
                  </div>
                  <div style={{
                    fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {currentTrack.artist} — {currentTrack.album}
                  </div>
                </div>
                {/* BPM + Key */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontSize: 32, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", lineHeight: 1, letterSpacing: "-1px", color: "var(--color-text)" }}>
                        {features.bpm}
                      </div>
                      <Label>BPM</Label>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", lineHeight: 1, color: "var(--color-text)" }}>
                        {features.key}
                      </div>
                      <Label>Key</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meters */}
              <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center" }}>
                <Meter label="Energy" value={features.energy} />
                <Meter label="Dance" value={features.danceability} />
                <Meter label="Mood" value={features.valence} />
              </div>

              {/* Transport + Progress */}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
                <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                  <button style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <ChevronLeft size={16} strokeWidth={2} color="var(--color-text-muted)" />
                  </button>
                  <button onClick={() => setIsPlaying((v) => !v)} style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "var(--color-bg-inverse)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    {isPlaying
                      ? <Pause size={16} strokeWidth={2.5} color="var(--color-text-inverse)" />
                      : <Play size={16} strokeWidth={2.5} color="var(--color-text-inverse)" fill="var(--color-text-inverse)" style={{ marginLeft: 1 }} />}
                  </button>
                  <button style={{ width: 32, height: 32, borderRadius: "var(--radius-full)", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <ChevronRight size={16} strokeWidth={2} color="var(--color-text-muted)" />
                  </button>
                </div>
                {/* Progress bar */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{ width: "100%", height: 3, background: "var(--color-border)", cursor: "pointer", borderRadius: 1.5, position: "relative" }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setProgress((e.clientX - rect.left) / rect.width);
                    }}
                  >
                    <div style={{ width: `${progress * 100}%`, height: "100%", background: "var(--color-text)", borderRadius: 1.5, transition: "width 0.1s linear" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                      {Math.floor(progress * 7)}:{String(Math.floor((progress * 432) % 60)).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>7:12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Waveform placeholder ═══ */}
        {deckExpanded && (
          <div style={{
            height: 80, borderBottom: "1px solid var(--color-border-light)",
            background: "var(--color-bg-elevated)", display: "flex", alignItems: "center",
            justifyContent: "center", position: "relative", overflow: "hidden",
          }}>
            {/* Simple waveform visualization */}
            <svg width="100%" height="60" viewBox="0 0 800 60" preserveAspectRatio="none" style={{ opacity: 0.3 }}>
              {Array.from({ length: 200 }, (_, i) => {
                const h = Math.abs(Math.sin(i * 0.15) * Math.cos(i * 0.08) * 25 + Math.sin(i * 0.3) * 10);
                return <rect key={i} x={i * 4} y={30 - h} width={2} height={h * 2} fill="var(--color-text-muted)" />;
              })}
            </svg>
            {/* Playhead */}
            <div style={{
              position: "absolute", left: `${progress * 100}%`, top: 0, bottom: 0,
              width: 1, background: "var(--color-text)", transition: "left 0.1s linear",
            }} />
          </div>
        )}

        {/* ── Column Toggle Bar ── */}
        <div style={{
          display: "flex", gap: "var(--space-1)", padding: "0 var(--space-3)",
          borderBottom: "1px solid var(--color-border-light)",
        }}>
          {/* Deck toggle */}
          <Tooltip label={deckExpanded ? "Collapse deck (D)" : "Expand deck (D)"} align="left">
            <button onClick={toggleDeck} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "var(--space-2-5) var(--space-2)", border: "none",
              background: "transparent", color: "var(--color-text-muted)", cursor: "pointer",
              borderRight: "1px solid var(--color-border-light)", marginRight: "var(--space-1)",
            }}>
              {deckExpanded
                ? <ArrowUpFromLine size={TAB_ICON_SIZE} strokeWidth={1.8} />
                : <ArrowDownFromLine size={TAB_ICON_SIZE} strokeWidth={1.8} />}
            </button>
          </Tooltip>
          {PANELS.map((col) => (
            <Tooltip key={col.id} label={compactMode ? col.label : null}>
              <button
                onClick={col.toggle}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-1-5)",
                  padding: "var(--space-2-5) var(--space-3)", border: "none",
                  background: col.active ? "var(--color-bg-alt)" : "transparent",
                  borderRadius: "var(--radius-md)",
                  color: col.active ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: col.active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer",
                  transition: "all var(--duration-fast) var(--ease-default)",
                }}
              >
                <col.icon size={TAB_ICON_SIZE} strokeWidth={1.8} />
                {!compactMode && col.label}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* ── 3-Column Workspace ── */}
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

          {/* ── LEFT: DIG ── */}
          <div style={{
            flex: showBrowse ? 3 : 0, minWidth: showBrowse ? 200 : 0, width: showBrowse ? "auto" : 0,
            overflow: "hidden", opacity: showBrowse ? 1 : 0, transition: colTransition,
            borderRight: showBrowse ? "1px solid var(--color-border-light)" : "none",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ padding: "var(--space-3) var(--space-4)", flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", marginBottom: "var(--space-3)" }}>
                <Disc3 size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                <Label>Dig</Label>
              </div>

              {/* ── Behind the Counter ── */}
              <div style={{
                marginBottom: "var(--space-3)", border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)", overflow: "hidden",
              }}>
                <button
                  onClick={() => setMusicChatOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-bg-elevated)", border: "none", cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                  }}
                >
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text)" }}>
                      Behind the Counter
                    </div>
                    <div style={{ fontSize: 9, fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-normal)", fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 2 }}>
                      Fülkit&apos;s B-Side Brain
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", flexShrink: 0, marginLeft: "var(--space-2)" }}>
                    {rsgMessages.length > 0 && musicChatOpen && (
                      <span
                        onClick={(e) => { e.stopPropagation(); setRsgMessages([]); setRsgRecs([]); }}
                        style={{ cursor: "pointer", color: "var(--color-text-dim)", display: "flex", alignItems: "center" }}
                        title="Clear conversation"
                      >
                        <Trash2 size={10} strokeWidth={1.8} />
                      </span>
                    )}
                    {musicChatOpen
                      ? <ChevronUp size={12} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
                      : <MessageCircle size={12} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
                    }
                  </div>
                </button>

                {/* Chat drawer */}
                {musicChatOpen && (
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div ref={rsgScrollRef} style={{ padding: "var(--space-3)", maxHeight: 240, overflowY: "auto" }}>
                      {rsgMessages.length === 0 && (
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                          Ask me anything about music...
                        </div>
                      )}
                      {rsgMessages.map((msg, i) => (
                        <div key={i} style={{
                          marginBottom: "var(--space-2)", fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-primary)",
                          color: msg.role === "user" ? "var(--color-text-muted)" : "var(--color-text)",
                          fontStyle: msg.role === "user" ? "italic" : "normal",
                          lineHeight: 1.4, whiteSpace: "pre-wrap",
                        }}>
                          {msg.content}
                        </div>
                      ))}
                      {rsgLoading && (
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--color-text-dim)" }}>
                          <Loader2 size={10} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                          <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)" }}>thinking...</span>
                        </div>
                      )}
                      {/* Recommendations */}
                      {rsgRecs.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
                          {rsgRecs.map((rec) => (
                            <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                              <div style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-primary)", fontSize: "var(--font-size-xs)" }}>
                                <span style={{ fontWeight: "var(--font-weight-medium)" }}>{rec.artist}</span>
                                <span style={{ color: "var(--color-text-muted)" }}> — {rec.title}</span>
                                {rec.bpm && <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>{rec.bpm}</span>}
                              </div>
                              <button
                                onClick={() => toggleSet(rec)}
                                style={{
                                  background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                                  color: isInSet(rec.id) ? "var(--color-text)" : "var(--color-text-dim)",
                                  opacity: isInSet(rec.id) ? 1 : 0.3, transition: "opacity 120ms",
                                }}
                                title={isInSet(rec.id) ? "Remove from set" : "Add to set"}
                              >
                                {isInSet(rec.id) ? <ListX size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={1.5} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div style={{
                  display: "flex", gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderTop: "1px solid var(--color-border-light)",
                  background: "var(--color-bg-elevated)",
                }}>
                  <input
                    value={rsgInput}
                    onChange={(e) => setRsgInput(e.target.value)}
                    placeholder="Ask the guy..."
                    style={{
                      flex: 1, padding: "var(--space-1-5) var(--space-2)",
                      background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
                      color: "var(--color-text)", fontFamily: "var(--font-primary)",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <button style={{
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    color: "var(--color-text-dim)", display: "flex", alignItems: "center",
                  }}>
                    <Send size={12} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {/* Featured crates list */}
              <Label style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>Featured Crates</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                {MOCK_CRATES.map((crate) => (
                  <div
                    key={crate.id}
                    onClick={() => setExpandedCrate(expandedCrate === crate.id ? null : crate.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "var(--space-2) var(--space-3)",
                      background: expandedCrate === crate.id ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                      border: expandedCrate === crate.id ? "1px solid var(--color-border-focus)" : "1px solid transparent",
                      transition: "all 120ms",
                    }}
                  >
                    <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", fontFamily: "var(--font-primary)" }}>
                      {crate.name}
                    </span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0, marginLeft: "var(--space-2)" }}>
                      {crate.tracks.length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── MIDDLE: Crates ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverCol("crates"); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => setDragOverCol(null)}
            style={{
              flex: showCrates ? 5 : 0, minWidth: showCrates ? 200 : 0, width: showCrates ? "auto" : 0,
              overflow: "hidden", opacity: showCrates ? 1 : 0, transition: colTransition,
              borderRight: showCrates ? "1px solid var(--color-border-light)" : "none",
              display: "flex", flexDirection: "column",
              background: dragOverCol === "crates" ? "var(--color-bg-alt)" : undefined,
            }}
          >
            {/* Crate header + shelf */}
            <div style={{ flexShrink: 0, padding: "var(--space-3) var(--space-4) 0", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                <Box size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                <Label>Crates</Label>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-1)" }}>
                {MOCK_CRATES.map((crate) => {
                  const isOpen = expandedCrate === crate.id;
                  return (
                    <button key={crate.id} onClick={() => setExpandedCrate(isOpen ? null : crate.id)} style={{
                      padding: "var(--space-2) var(--space-3)",
                      background: isOpen ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                      border: isOpen ? "1px solid var(--color-border-focus)" : "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                      fontFamily: "var(--font-primary)", textAlign: "left", flexShrink: 0, transition: "all 120ms",
                    }}>
                      <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", whiteSpace: "nowrap" }}>
                        {crate.name}
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {crate.tracks.length} tracks
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expanded crate track list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 var(--space-4) var(--space-4)" }}>
              {expandedCrate && expandedCrateTracks.length > 0 && (
                <div style={{
                  border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)",
                  overflow: "hidden", marginTop: "var(--space-2)",
                }}>
                  <div style={{
                    padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--color-border-light)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <div>
                      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                        {MOCK_CRATES.find((c) => c.id === expandedCrate)?.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {expandedCrateTracks.length} tracks
                      </div>
                    </div>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {expandedCrateTracks.map((track, i) => {
                      const inSet = isInSet(track.id);
                      return (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={() => { dragTrack.current = track; }}
                          onDragEnd={() => { dragTrack.current = null; setDragOverCol(null); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-4)",
                            borderBottom: "1px solid var(--color-border-light)",
                            cursor: "grab",
                          }}
                        >
                          <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", width: 18, flexShrink: 0, textAlign: "right" }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-text-muted)", flexShrink: 0 }} title="Fabric analyzed" />
                          <button style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "var(--font-primary)", minWidth: 0 }}>
                            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {track.title}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {track.artist}
                            </div>
                          </button>
                          <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>{track.bpm}</span>
                          <button
                            onClick={() => toggleSet(track)}
                            style={{
                              background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                              color: inSet ? "var(--color-text)" : "var(--color-text-dim)",
                              opacity: inSet ? 1 : 0.3, transition: "opacity 120ms",
                            }}
                            title={inSet ? "Remove from set" : "Add to set"}
                          >
                            {inSet ? <ListX size={12} strokeWidth={2} /> : <Plus size={12} strokeWidth={1.5} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Sets ── */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverCol("sets"); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => {
              if (dragTrack.current && !isInSet(dragTrack.current.id)) toggleSet(dragTrack.current);
              dragTrack.current = null;
              setDragOverCol(null);
            }}
            style={{
              flex: showSets ? 2 : 0, minWidth: showSets ? 160 : 0, width: showSets ? "auto" : 0,
              overflow: "hidden", opacity: showSets ? 1 : 0, transition: colTransition,
              display: "flex", flexDirection: "column",
              background: dragOverCol === "sets" ? "var(--color-bg-alt)" : undefined,
            }}
          >
            <div style={{ padding: "var(--space-3) var(--space-3) 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                <Turntable size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                <Label>Sets</Label>
              </div>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                Set 1 · {setTracks.length} trk
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-2) var(--space-3) var(--space-3)" }}>
              {setTracks.length === 0 && (
                <div style={{ padding: "var(--space-4) var(--space-2)", textAlign: "center" }}>
                  <Turntable size={20} strokeWidth={1.2} style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }} />
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                    Add tracks from crates or browse
                  </div>
                </div>
              )}
              {setTracks.map((t, i) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: "var(--space-2)",
                  padding: "var(--space-1-5) var(--space-2)",
                  borderBottom: "1px solid var(--color-border-light)",
                }}>
                  <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", width: 14, flexShrink: 0, opacity: 0.5 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-primary)" }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "var(--font-primary)" }}>
                      {t.artist}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSet(t)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0,
                      color: "var(--color-text-dim)", opacity: 0.4, transition: "opacity 120ms",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
                    title="Remove from set"
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
