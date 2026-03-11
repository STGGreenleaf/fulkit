"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Disc3, Box, Package, PackageOpen, Plus, Play, ListX, Turntable, X, MessageCircle, ChevronUp, Send, Loader2, Trash2 } from "lucide-react";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const TAB_ICON_SIZE = 14;

// ── Mock Data ──────────────────────────────────────────────

const MOCK_PLAYLISTS = [
  { id: "pl1", name: "Deep House Essentials", count: 48 },
  { id: "pl2", name: "Acid Jazz Rarities", count: 23 },
  { id: "pl3", name: "Dub Techno Selects", count: 67 },
  { id: "pl4", name: "Sunday Slow Jams", count: 31 },
  { id: "pl5", name: "Broken Beat Archive", count: 19 },
];

const MOCK_BROWSE_TRACKS = [
  { id: "bt1", title: "Blue in Green", artist: "Miles Davis", bpm: 68 },
  { id: "bt2", title: "Windowlicker", artist: "Aphex Twin", bpm: 134 },
  { id: "bt3", title: "Midnight City", artist: "M83", bpm: 105 },
  { id: "bt4", title: "Teardrop", artist: "Massive Attack", bpm: 79 },
  { id: "bt5", title: "Donna Summer", artist: "Giorgio Moroder", bpm: 120 },
  { id: "bt6", title: "Inner City Life", artist: "Goldie", bpm: 170 },
];

const MOCK_CRATES = [
  { id: "c1", name: "Electro Static", songs: 44, ready: 43 },
  { id: "c2", name: "Sunday Morning DJ", songs: 100, ready: 8 },
  { id: "c3", name: "chill beats wednesday", songs: 100, ready: 1 },
];

const MOCK_CRATE_TRACKS = [
  { id: "ct1", title: "Adrift", artist: "Vök", analyzed: true },
  { id: "ct2", title: "Amber Decay", artist: "Kangding Ray", analyzed: true },
  { id: "ct3", title: "Phobos", artist: "Stephan Bodzin, Marc Romboy", analyzed: true },
  { id: "ct4", title: "Crow", artist: "Forest Swords", analyzed: true },
  { id: "ct5", title: "Recovery", artist: "Rival Consoles", analyzed: true },
  { id: "ct6", title: "Resolve", artist: "Colyn", analyzed: true },
  { id: "ct7", title: "Plastic Dreams", artist: "Jaydee", analyzed: true },
  { id: "ct8", title: "Cafe Del Mar", artist: "Energy 52", analyzed: false },
  { id: "ct9", title: "French Kiss", artist: "Lil Louis", analyzed: true },
  { id: "ct10", title: "Strings of Life", artist: "Derrick May", analyzed: true },
];

const MOCK_SET_TRACKS = [
  { id: "st1", title: "Cafe Del Mar", artist: "Energy 52", bpm: 132, duration: "7:12" },
  { id: "st2", title: "French Kiss", artist: "Lil Louis", bpm: 122, duration: "10:03" },
  { id: "st3", title: "Strings of Life", artist: "Derrick May", bpm: 130, duration: "6:48" },
  { id: "st4", title: "Blue in Green", artist: "Miles Davis", bpm: 68, duration: "5:27" },
  { id: "st5", title: "Your Love", artist: "Frankie Knuckles", bpm: 120, duration: "8:34" },
];

const MOCK_RSG_RECS = [
  { id: "rsg1", title: "Blurred", artist: "Kiasmos", bpm: 101 },
  { id: "rsg2", title: "Near Light", artist: "Ólafur Arnalds", bpm: 67 },
  { id: "rsg3", title: "Articulation", artist: "Rival Consoles", bpm: 118 },
];

const MOCK_RSG_MESSAGES = [
  { role: "user", content: "What goes with Vök?" },
  { role: "assistant", content: "Vök lives in that Iceland-meets-electronica lane. Try:" },
];

// ── Parse [REC: Artist — Title (BPM)] from RSG responses ──

function parseRecs(text) {
  const recs = [];
  const re = /\[REC:\s*(.+?)\s*—\s*(.+?)(?:\s*\((\d+)\))?\s*\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    recs.push({
      id: `rsg-${recs.length}-${Date.now()}`,
      artist: m[1].trim(),
      title: m[2].trim(),
      bpm: m[3] ? parseInt(m[3], 10) : null,
    });
  }
  return recs;
}

// ── Label Component ────────────────────────────────────────

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

// ── Main Page ──────────────────────────────────────────────

export default function FabricProto() {
  const { compactMode, user } = useAuth();
  const [showBrowse, setShowBrowse] = useState(true);
  const [showCrates, setShowCrates] = useState(true);
  const [showSets, setShowSets] = useState(true);
  const [expandedCrate, setExpandedCrate] = useState("c1");
  const [setTracks, setSetTracks] = useState(MOCK_SET_TRACKS);
  const [musicChatOpen, setMusicChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dragTrack = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // RSG state
  const isDev = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("auth") === "dev";
  const [rsgMessages, setRsgMessages] = useState(isDev ? MOCK_RSG_MESSAGES : []);
  const [rsgRecs, setRsgRecs] = useState(isDev ? MOCK_RSG_RECS : []);
  const [rsgConvId, setRsgConvId] = useState(null);
  const [rsgLoading, setRsgLoading] = useState(false);
  const [rsgInput, setRsgInput] = useState("");
  const rsgScrollRef = useRef(null);

  // Load RSG conversation on mount
  useEffect(() => {
    if (!user || isDev) return;
    async function loadRsg() {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "rsg")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!conv) return;
      setRsgConvId(conv.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      if (msgs && msgs.length > 0) {
        setRsgMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
        // Parse recs from last assistant message
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        if (lastAssistant) setRsgRecs(parseRecs(lastAssistant.content));
      }
    }
    loadRsg();
  }, [user, isDev]);

  // Auto-scroll RSG chat
  useEffect(() => {
    rsgScrollRef.current?.scrollTo({ top: rsgScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [rsgMessages]);

  // Ensure RSG conversation exists
  const ensureRsgConv = useCallback(async () => {
    if (rsgConvId) return rsgConvId;
    if (isDev || !user) return null;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: "Behind the Counter", type: "rsg" })
      .select("id")
      .single();
    if (data) {
      setRsgConvId(data.id);
      return data.id;
    }
    return null;
  }, [rsgConvId, isDev, user]);

  // Save message to DB
  const saveRsgMessage = useCallback(async (convId, role, content) => {
    if (!convId || isDev) return;
    await supabase
      .from("messages")
      .insert({ conversation_id: convId, role, content });
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convId);
  }, [isDev]);

  // Send RSG message
  const sendRsgMessage = useCallback(async (content) => {
    if (!content.trim() || rsgLoading) return;
    const userMsg = { role: "user", content: content.trim() };
    const newMessages = [...rsgMessages, userMsg];
    setRsgMessages(newMessages);
    setRsgInput("");
    setRsgLoading(true);
    setRsgRecs([]);

    try {
      const convId = await ensureRsgConv();
      await saveRsgMessage(convId, "user", userMsg.content);

      // Get auth token for API
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/rsg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("RSG request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (text) {
              fullResponse += text;
              setRsgMessages([...newMessages, { role: "assistant", content: fullResponse }]);
            }
          } catch { /* skip malformed */ }
        }
      }

      // Save assistant response & parse recs
      await saveRsgMessage(convId, "assistant", fullResponse);
      const recs = parseRecs(fullResponse);
      if (recs.length > 0) setRsgRecs(recs);
    } catch (err) {
      setRsgMessages([...newMessages, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setRsgLoading(false);
    }
  }, [rsgMessages, rsgLoading, ensureRsgConv, saveRsgMessage]);

  // Clear RSG conversation
  const clearRsg = useCallback(async () => {
    if (rsgConvId && !isDev) {
      await supabase.from("messages").delete().eq("conversation_id", rsgConvId);
    }
    setRsgMessages([]);
    setRsgRecs([]);
  }, [rsgConvId, isDev]);

  const PANELS = [
    { id: "browse", label: "Browse", icon: Disc3, active: showBrowse, toggle: () => setShowBrowse((v) => !v) },
    { id: "crates", label: "Crates", icon: Box, active: showCrates, toggle: () => setShowCrates((v) => !v) },
    { id: "sets", label: "Sets", icon: Turntable, active: showSets, toggle: () => setShowSets((v) => !v) },
  ];

  const colTransition = "flex 300ms ease, min-width 300ms ease, width 300ms ease, opacity 200ms ease, padding 300ms ease";

  // Check if a track is in the set
  const isInSet = (id) => setTracks.some((t) => t.id === id);

  // Toggle track in/out of set (mock)
  const toggleSet = (track) => {
    if (isInSet(track.id)) {
      setSetTracks((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setSetTracks((prev) => [...prev, { ...track, bpm: "—", duration: "—" }]);
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden", background: "var(--color-bg)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Mock Header (The Deck) ── */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
            borderBottom: "1px solid var(--color-border-light)",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--space-1)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", fontFamily: "var(--font-primary)" }}>
              Adrift
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "var(--font-primary)" }}>
              Vök
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-1)" }}>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-bold)" }}>118 BPM</span>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>Cm</span>
              <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>4:32</span>
            </div>
          </div>
        </div>

        {/* ── Signal Terrain Placeholder ── */}
        <div
          style={{
            height: 40,
            background: "var(--color-bg-elevated)",
            borderBottom: "1px solid var(--color-border-light)",
          }}
        />

        {/* ── Column Toggle Bar ── */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-1)",
            padding: "0 var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
          }}
        >
          {PANELS.map((col) => (
            <Tooltip key={col.id} label={compactMode ? col.label : null}>
              <button
                onClick={col.toggle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1-5)",
                  padding: "var(--space-2-5) var(--space-3)",
                  border: "none",
                  background: col.active ? "var(--color-bg-alt)" : "transparent",
                  borderRadius: "var(--radius-md)",
                  color: col.active ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: col.active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  cursor: "pointer",
                  transition: `all var(--duration-fast) var(--ease-default)`,
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

          {/* ── LEFT: Browse ── */}
          <div
            style={{
              flex: showBrowse ? 3 : 0,
              minWidth: showBrowse ? 200 : 0,
              width: showBrowse ? "auto" : 0,
              overflow: "hidden",
              opacity: showBrowse ? 1 : 0,
              transition: colTransition,
              borderRight: showBrowse ? "1px solid var(--color-border-light)" : "none",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "var(--space-3) var(--space-4)", flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", marginBottom: "var(--space-3)" }}>
                <Disc3 size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                <Label>Browse</Label>
              </div>

              {/* ── Record Store Guy ── */}
              <div style={{
                marginBottom: "var(--space-3)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
              }}>
                {/* RSG title bar — always visible */}
                <button
                  onClick={() => setMusicChatOpen((v) => !v)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-bg-elevated)",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                  }}
                >
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text)" }}>
                      Behind the Counter
                    </div>
                    <div style={{ fontSize: 9, fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-normal)", fontStyle: "italic", color: "var(--color-text-secondary)", marginTop: 2 }}>
                      Fülkit's B-Side Brain
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", flexShrink: 0, marginLeft: "var(--space-2)" }}>
                    {rsgMessages.length > 0 && musicChatOpen && (
                      <span
                        onClick={(e) => { e.stopPropagation(); clearRsg(); }}
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

                {/* RSG chat drawer */}
                {musicChatOpen && (
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div ref={rsgScrollRef} style={{ padding: "var(--space-3)", maxHeight: 240, overflowY: "auto" }}>
                      {rsgMessages.length === 0 && !rsgLoading && (
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                          Ask me anything about music...
                        </div>
                      )}
                      {rsgMessages.map((msg, i) => (
                        <div key={i} style={{
                          marginBottom: "var(--space-2)",
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-primary)",
                          color: msg.role === "user" ? "var(--color-text-muted)" : "var(--color-text)",
                          fontStyle: msg.role === "user" ? "italic" : "normal",
                          lineHeight: 1.4,
                          whiteSpace: "pre-wrap",
                        }}>
                          {/* Render text without [REC:] lines — recs shown separately */}
                          {msg.content.replace(/\[REC:.*?\]/g, "").trim()}
                        </div>
                      ))}
                      {rsgLoading && (
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--color-text-dim)" }}>
                          <Loader2 size={10} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                          <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)" }}>thinking...</span>
                        </div>
                      )}
                      {/* Recommendations — clickable */}
                      {rsgRecs.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
                          {rsgRecs.map((rec) => (
                            <div key={rec.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                              <button
                                onClick={() => setSearchQuery(rec.artist)}
                                style={{
                                  flex: 1,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  padding: "var(--space-1) 0",
                                  fontFamily: "var(--font-primary)",
                                  fontSize: "var(--font-size-xs)",
                                  color: "var(--color-text)",
                                  minWidth: 0,
                                }}
                              >
                                <span style={{ fontWeight: "var(--font-weight-medium)" }}>{rec.artist}</span>
                                <span style={{ color: "var(--color-text-muted)" }}> — {rec.title}</span>
                                {rec.bpm && <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>{rec.bpm}</span>}
                              </button>
                              <button
                                onClick={() => toggleSet(rec)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 2,
                                  flexShrink: 0,
                                  color: isInSet(rec.id) ? "var(--color-text)" : "var(--color-text-dim)",
                                  opacity: isInSet(rec.id) ? 1 : 0.3,
                                  transition: "opacity 120ms",
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

                {/* Input — always visible, pinned at bottom of RSG */}
                <div style={{
                  display: "flex",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderTop: "1px solid var(--color-border-light)",
                  background: "var(--color-bg-elevated)",
                }}>
                  <input
                    value={musicChatOpen ? rsgInput : searchQuery}
                    onChange={(e) => {
                      if (musicChatOpen) {
                        setRsgInput(e.target.value);
                      } else {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && musicChatOpen && rsgInput.trim()) {
                        setSearchQuery(rsgInput.trim());
                        sendRsgMessage(rsgInput);
                      }
                    }}
                    placeholder={musicChatOpen ? "Ask the guy..." : "Search..."}
                    disabled={rsgLoading}
                    style={{
                      flex: 1,
                      padding: "var(--space-1-5) var(--space-2)",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border-light)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--color-text)",
                      fontFamily: "var(--font-primary)",
                      outline: "none",
                      boxSizing: "border-box",
                      opacity: rsgLoading ? 0.5 : 1,
                    }}
                  />
                  <button
                    onClick={() => {
                      if (musicChatOpen && rsgInput.trim()) {
                        setSearchQuery(rsgInput.trim());
                        sendRsgMessage(rsgInput);
                      }
                    }}
                    disabled={rsgLoading || (musicChatOpen && !rsgInput.trim())}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: rsgLoading ? "default" : "pointer",
                      padding: 2,
                      color: "var(--color-text-dim)",
                      display: "flex",
                      alignItems: "center",
                      opacity: rsgLoading ? 0.3 : 1,
                    }}
                  >
                    <Send size={12} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              {/* Playlist cards */}
              {/* Ticker — the plate */}
              <div style={{
                fontSize: 9,
                fontFamily: "var(--font-primary)",
                fontStyle: "italic",
                color: "var(--color-text-secondary)",
                lineHeight: 1.4,
                marginBottom: "var(--space-4)",
              }}>
                — Adrift was recorded at Greenhouse Studios in Reykjavík using a modified Juno-106 run through a chain of Eventide effects.
              </div>

              <Label style={{ marginBottom: "var(--space-2)" }}>Playlists</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                {MOCK_PLAYLISTS.map((pl) => (
                  <div
                    key={pl.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-2) var(--space-3)",
                      background: "var(--color-bg-elevated)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", fontFamily: "var(--font-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                      {pl.name}
                    </span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0, marginLeft: "var(--space-2)" }}>
                      {pl.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Track results */}
              <Label style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>Tracks</Label>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {MOCK_BROWSE_TRACKS.map((t, i) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => { dragTrack.current = t; }}
                    onDragEnd={() => { dragTrack.current = null; setDragOverCol(null); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      padding: "var(--space-1-5) var(--space-2)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "grab",
                    }}
                  >
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
                    <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0 }}>
                      {t.bpm}
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
            onDrop={() => { setDragOverCol(null); /* proto: visual only for crates drop */ }}
            style={{
              flex: showCrates ? 5 : 0,
              minWidth: showCrates ? 200 : 0,
              width: showCrates ? "auto" : 0,
              overflow: "hidden",
              opacity: showCrates ? 1 : 0,
              transition: colTransition,
              borderRight: (showCrates) ? "1px solid var(--color-border-light)" : "none",
              display: "flex",
              flexDirection: "column",
              background: dragOverCol === "crates" ? "var(--color-bg-alt)" : undefined,
            }}
          >
            {/* Crate header + shelf */}
            <div style={{ flexShrink: 0, padding: "var(--space-3) var(--space-4) 0", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}>
                  <Box size={12} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />
                  <Label>Crates</Label>
                </div>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-2)",
                    background: "transparent",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                  }}
                >
                  <Plus size={10} strokeWidth={2} />
                  Import
                </button>
              </div>

              {/* Crate shelf (horizontal scroll) */}
              <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-1)" }}>
                {MOCK_CRATES.map((crate) => {
                  const isOpen = expandedCrate === crate.id;
                  return (
                    <button
                      key={crate.id}
                      onClick={() => setExpandedCrate(isOpen ? null : crate.id)}
                      style={{
                        padding: "var(--space-2) var(--space-3)",
                        background: isOpen ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                        border: isOpen ? "1px solid var(--color-border-focus)" : "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontFamily: "var(--font-primary)",
                        textAlign: "left",
                        flexShrink: 0,
                        transition: "all 120ms",
                      }}
                    >
                      <div style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-text)",
                        whiteSpace: "nowrap",
                      }}>
                        {crate.name}
                      </div>
                      <div style={{
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                        color: "var(--color-text-muted)",
                        marginTop: 1,
                      }}>
                        {crate.songs} songs
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expanded crate track list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 var(--space-4) var(--space-4)" }}>
              {expandedCrate && (
                <div style={{
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  marginTop: "var(--space-2)",
                }}>
                  {/* White readout header */}
                  <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--color-border-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--color-bg-elevated)",
                  }}>
                    <div>
                      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                        {MOCK_CRATES.find((c) => c.id === expandedCrate)?.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {MOCK_CRATE_TRACKS.length} tracks
                      </div>
                    </div>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1)",
                        padding: "var(--space-1-5) var(--space-3)",
                        background: "var(--color-bg-elevated)",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                      }}
                    >
                      <Play size={10} strokeWidth={2.5} fill="var(--color-text)" />
                      Play
                    </button>
                  </div>

                  {/* Track rows */}
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {MOCK_CRATE_TRACKS.map((track, i) => {
                      const inSet = isInSet(track.id);
                      return (
                        <div
                          key={track.id}
                          draggable
                          onDragStart={() => { dragTrack.current = track; }}
                          onDragEnd={() => { dragTrack.current = null; setDragOverCol(null); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            padding: "var(--space-2) var(--space-4)",
                            borderBottom: "1px solid var(--color-border-light)",
                            transition: "background 120ms",
                            cursor: "grab",
                          }}
                        >
                          {/* Track number */}
                          <div style={{
                            fontSize: 8,
                            fontFamily: "var(--font-mono)",
                            color: "var(--color-text-dim)",
                            width: 18,
                            flexShrink: 0,
                            textAlign: "right",
                          }}>
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          {/* Analyze dot */}
                          <div style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: track.analyzed ? "var(--color-text-muted)" : "transparent",
                            border: track.analyzed ? "none" : "1px solid var(--color-text-dim)",
                            flexShrink: 0,
                          }} title={track.analyzed ? "Fabric analyzed" : "Pending"} />
                          {/* Song info */}
                          <button
                            style={{
                              flex: 1,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              textAlign: "left",
                              padding: 0,
                              fontFamily: "var(--font-primary)",
                              minWidth: 0,
                            }}
                          >
                            <div style={{
                              fontSize: "var(--font-size-xs)",
                              fontWeight: "var(--font-weight-medium)",
                              color: "var(--color-text)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.title}
                            </div>
                            <div style={{
                              fontSize: 9,
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {track.artist}
                            </div>
                          </button>
                          {/* Add to set */}
                          <button
                            onClick={() => toggleSet(track)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 2,
                              flexShrink: 0,
                              color: inSet ? "var(--color-text)" : "var(--color-text-dim)",
                              opacity: inSet ? 1 : 0.3,
                              transition: "opacity 120ms",
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
              if (dragTrack.current && !isInSet(dragTrack.current.id)) {
                toggleSet(dragTrack.current);
              }
              dragTrack.current = null;
              setDragOverCol(null);
            }}
            style={{
              flex: showSets ? 2 : 0,
              minWidth: showSets ? 160 : 0,
              width: showSets ? "auto" : 0,
              overflow: "hidden",
              opacity: showSets ? 1 : 0,
              transition: colTransition,
              display: "flex",
              flexDirection: "column",
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

            {/* Set tracks */}
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
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-1-5) var(--space-2)",
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
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
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      flexShrink: 0,
                      color: "var(--color-text-dim)",
                      opacity: 0.4,
                      transition: "opacity 120ms",
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
