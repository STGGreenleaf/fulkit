"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Disc3, Box, Plus, ListX, Turntable, X, MessageCircle, ChevronUp, Send, Loader2, Trash2 } from "lucide-react";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const TAB_ICON_SIZE = 14;

// ── Mock Data (kept for dev fallback / sets column) ──

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
  const [expandedCrate, setExpandedCrate] = useState(null);
  const [setTracks, setSetTracks] = useState(MOCK_SET_TRACKS);
  const [musicChatOpen, setMusicChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dragTrack = useRef(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // ── Featured crates from API ──
  const [featuredCrates, setFeaturedCrates] = useState([]);
  const [cratesLoading, setCratesLoading] = useState(true);
  const [expandedCrateTracks, setExpandedCrateTracks] = useState([]);

  useEffect(() => {
    async function loadFeatured() {
      try {
        const res = await fetch("/api/fabric/featured");
        const data = await res.json();
        const crates = (data.crates || []).filter(c => c.source === "set");
        setFeaturedCrates(crates);
        if (crates.length > 0) setExpandedCrate(crates[0].id);
      } catch {
        setFeaturedCrates([]);
      }
      setCratesLoading(false);
    }
    loadFeatured();
  }, []);

  // Load tracks when expanded crate changes
  useEffect(() => {
    if (!expandedCrate) { setExpandedCrateTracks([]); return; }
    const crate = featuredCrates.find(c => c.id === expandedCrate);
    if (crate?.tracks) {
      setExpandedCrateTracks(crate.tracks);
    } else {
      setExpandedCrateTracks([]);
    }
  }, [expandedCrate, featuredCrates]);

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

  // Toggle track in/out of set
  const toggleSet = (track) => {
    if (isInSet(track.id)) {
      setSetTracks((prev) => prev.filter((t) => t.id !== track.id));
    } else {
      setSetTracks((prev) => [...prev, { ...track, bpm: track.bpm || "—", duration: track.duration || "—" }]);
    }
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden", background: "var(--color-bg)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Deck Screenshot ── */}
        <div
          style={{
            borderBottom: "1px solid var(--color-border-light)",
            background: "var(--color-bg-elevated)",
            overflow: "hidden",
          }}
        >
          <img
            src="/fabricproto-deck.png"
            alt="Fabric Deck"
            style={{
              width: "100%",
              display: "block",
              objectFit: "cover",
              maxHeight: 160,
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>

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
                      Fulkit's B-Side Brain
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

              {/* Featured crates as browse list */}
              <Label style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>Featured Crates</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                {cratesLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", color: "var(--color-text-dim)", padding: "var(--space-2)" }}>
                    <Loader2 size={10} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)" }}>Loading...</span>
                  </div>
                )}
                {!cratesLoading && featuredCrates.length === 0 && (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", fontStyle: "italic", padding: "var(--space-2)" }}>
                    No published crates yet
                  </div>
                )}
                {featuredCrates.map((crate) => (
                  <div
                    key={crate.id}
                    onClick={() => setExpandedCrate(expandedCrate === crate.id ? null : crate.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-2) var(--space-3)",
                      background: expandedCrate === crate.id ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      border: expandedCrate === crate.id ? "1px solid var(--color-border-focus)" : "1px solid transparent",
                      transition: "all 120ms",
                    }}
                  >
                    <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", fontFamily: "var(--font-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                      {crate.name}
                    </span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", flexShrink: 0, marginLeft: "var(--space-2)" }}>
                      {crate.tracks?.length || 0}
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
            onDrop={() => { setDragOverCol(null); }}
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
              </div>

              {/* Crate shelf (horizontal scroll) */}
              <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-1)" }}>
                {featuredCrates.map((crate) => {
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
                        {crate.tracks?.length || 0} tracks
                      </div>
                    </button>
                  );
                })}
                {cratesLoading && (
                  <div style={{ display: "flex", alignItems: "center", padding: "var(--space-2)", color: "var(--color-text-dim)" }}>
                    <Loader2 size={12} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Expanded crate track list */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 var(--space-4) var(--space-4)" }}>
              {expandedCrate && expandedCrateTracks.length > 0 && (
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
                        {featuredCrates.find((c) => c.id === expandedCrate)?.name}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {expandedCrateTracks.length} tracks
                      </div>
                    </div>
                  </div>

                  {/* Track rows */}
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {expandedCrateTracks.map((track, i) => {
                      const trackId = track.spotify_id || track.id || `t-${i}`;
                      const inSet = isInSet(trackId);
                      const isAnalyzed = track.fabric_status === "complete" || track.analyzed;
                      return (
                        <div
                          key={trackId}
                          draggable
                          onDragStart={() => { dragTrack.current = { ...track, id: trackId }; }}
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
                            background: isAnalyzed ? "var(--color-text-muted)" : "transparent",
                            border: isAnalyzed ? "none" : "1px solid var(--color-text-dim)",
                            flexShrink: 0,
                          }} title={isAnalyzed ? "Fabric analyzed" : "Pending"} />
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
                            onClick={() => toggleSet({ ...track, id: trackId })}
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
              {expandedCrate && expandedCrateTracks.length === 0 && !cratesLoading && (
                <div style={{ padding: "var(--space-4) var(--space-2)", textAlign: "center" }}>
                  <Box size={20} strokeWidth={1.2} style={{ color: "var(--color-text-dim)", marginBottom: "var(--space-2)" }} />
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                    No tracks in this crate
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
