"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { Plus, Search, X, LayoutGrid, List } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import ThreadBoard from "../../components/ThreadBoard";
import ThreadCard from "../../components/ThreadCard";
import ThreadDetail from "../../components/ThreadDetail";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const TAB_ICON_SIZE = 14;

const DEFAULT_FOLDERS = [
  { key: "all", label: "All", icon: "layers" },
  { key: "work", label: "Work", icon: "briefcase" },
  { key: "personal", label: "Personal", icon: "user-round" },
  { key: "ideas", label: "Ideas", icon: "lightbulb" },
  { key: "reference", label: "Reference", icon: "book-open" },
];

const DEV_NOTES = [
  { id: "1", title: "Meeting notes — product roadmap", content: "Discussed Q2 priorities:\n\n- Ship vault sync by end of month\n- Numbrly integration blocked on API key provisioning\n- Whispers MVP ready for internal testing\n- Need to finalize pricing tiers before launch", source: "Obsidian", folder: "work", status: "active", labels: ["roadmap"], due_date: null, position: 0, created_at: "2024-01-15T10:00:00Z", actions: [] },
  { id: "5", title: "Standup recap — March 10", content: "What shipped:\n- Compact mode toggle\n- Spotify OAuth flow\n- Drag-and-drop on Fabric sets\n\nBlocked:\n- Numbrly API key provisioning", source: "Chat", folder: "work", status: "active", labels: ["standup"], due_date: null, position: 1, created_at: "2024-01-14T09:00:00Z", actions: [{ id: "a1", title: "Fix Numbrly API key", status: "active" }] },
  { id: "6", title: "Pricing tier notes", content: "Free: 25 messages/day\nPro ($12/mo): unlimited, encrypted sync, BYOK\nTeam ($29/seat): shared vaults", source: "Obsidian", folder: "work", status: "in-progress", labels: ["pricing", "launch"], due_date: new Date(Date.now() + 2 * 86400000).toISOString(), position: 0, created_at: "2024-01-11T16:00:00Z", actions: [{ id: "a2", title: "Finalize Pro tier", status: "done" }, { id: "a3", title: "Set up Stripe", status: "active" }] },
  { id: "2", title: "Voice capture: meal planning ideas", content: "Try the lemon chicken recipe. Marinade: lemon juice, garlic, olive oil, oregano, salt. 400°F for 25 min.", source: "Hum", folder: "personal", status: "inbox", labels: [], due_date: null, position: 0, created_at: "2024-01-14T15:30:00Z", actions: [] },
  { id: "7", title: "Weekend trip packing list", content: "Clothes: 2 shirts, 1 hoodie, jeans\nGear: Laptop, AirPods, Kindle\nDon't forget: Water bottle, snacks, playlist", source: "Hum", folder: "personal", status: "done", labels: [], due_date: null, position: 0, created_at: "2024-01-13T20:00:00Z", actions: [] },
  { id: "8", title: "Gift ideas — Mom's birthday", content: "Nice candle (not vanilla), cookbook from farmer's market, garden gloves. Backup: framed photo from lake trip.", source: "Chat", folder: "personal", status: "active", labels: ["gift"], due_date: new Date(Date.now() + 5 * 86400000).toISOString(), position: 2, created_at: "2024-01-10T11:00:00Z", actions: [] },
  { id: "4", title: "API key rotation checklist", content: "1. Generate new key\n2. Update .env.local\n3. Update Vercel env vars\n4. Restart dev server\n5. Verify chat on localhost\n6. Push to Vercel\n7. Verify production\n8. Revoke old key", source: "Chat", folder: "ideas", status: "review", labels: ["security"], due_date: new Date(Date.now() - 86400000).toISOString(), position: 0, created_at: "2024-01-12T14:00:00Z", actions: [{ id: "a4", title: "Generate new key", status: "done" }, { id: "a5", title: "Update Vercel", status: "done" }, { id: "a6", title: "Verify production", status: "active" }] },
  { id: "9", title: "Hats — context profiles concept", content: "What if users could switch 'hats' in chat? Each hat = a filtered vault context.", source: "Obsidian", folder: "ideas", status: "inbox", labels: ["feature"], due_date: null, position: 1, created_at: "2024-01-11T22:00:00Z", actions: [] },
  { id: "10", title: "Whispers — ambient capture UX", content: "Core loop: phone mic → transcribes → extracts actions → saves to vault.\nMVP: tap to start, single speaker, 5 min max.", source: "Hum", folder: "ideas", status: "inbox", labels: ["feature", "mvp"], due_date: null, position: 2, created_at: "2024-01-09T18:00:00Z", actions: [] },
  { id: "3", title: "Startup reading list", content: "1. Zero to One\n2. The Mom Test\n3. Inspired\n4. Shape Up\n5. Obviously Awesome", source: "Google Drive", folder: "reference", status: "inbox", labels: [], due_date: null, position: 0, created_at: "2024-01-13T09:00:00Z", actions: [] },
  { id: "11", title: "Supabase RLS cheat sheet", content: "Read own rows: USING (auth.uid() = user_id)\nInsert own rows: WITH CHECK (auth.uid() = user_id)\nService role bypasses RLS.", source: "Google Drive", folder: "reference", status: "inbox", labels: ["reference"], due_date: null, position: 1, created_at: "2024-01-08T13:00:00Z", actions: [] },
  { id: "12", title: "Design tokens reference", content: "Warm monochrome palette: bg #EFEDE8, text #2A2826\nSpacing: 2/4/6/8/12/16/20/24/32/40", source: "Obsidian", folder: "reference", status: "inbox", labels: ["reference"], due_date: null, position: 2, created_at: "2024-01-07T10:00:00Z", actions: [] },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ThreadsPage() {
  return (
    <Suspense>
      <ThreadsContent />
    </Suspense>
  );
}

function ThreadsContent() {
  const { user, compactMode } = useAuth();
  const searchParams = useSearchParams();
  const isDev = user?.isDev;

  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [folder, setFolder] = useState("all");
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editIconValue, setEditIconValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewMode, setViewMode] = useState("board");
  const [labelFilter, setLabelFilter] = useState(null);
  const searchRef = useRef(null);
  const saveTimer = useRef(null);

  // Drag state for list view
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const dragNode = useRef(null);
  const dragNoteId = useRef(null);
  const dragGhost = useRef(null);

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fulkit-threads-view");
    if (saved === "board" || saved === "list") setViewMode(saved);
  }, []);

  // Load custom folders from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fulkit-thread-folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = DEFAULT_FOLDERS.map((df) => {
          const match = parsed.find((p) => p.key === df.key);
          return match ? { ...df, icon: match.icon } : df;
        });
        setFolders(merged);
      }
    } catch {}
  }, []);

  const persistFolders = useCallback((next) => {
    setFolders(next);
    localStorage.setItem("fulkit-thread-folders", JSON.stringify(next));
  }, []);

  // Load notes
  useEffect(() => {
    if (isDev) {
      setNotes(DEV_NOTES);
      return;
    }
    if (!user) return;
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("position", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("[threads] notes query failed:", error.message);
        if (data) setNotes(data);
      });
  }, [user, isDev]);

  // Select note from URL param
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  // Derive all labels across notes (for label filter + autocomplete)
  const allLabels = useMemo(() => {
    const set = new Set();
    for (const n of notes) {
      for (const l of n.labels || []) set.add(l);
    }
    return [...set].sort();
  }, [notes]);

  // Filter notes by folder, search, and label
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (folder !== "all") result = result.filter((n) => n.folder === folder);
    if (labelFilter) result = result.filter((n) => (n.labels || []).includes(labelFilter));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) =>
        n.title.toLowerCase().includes(q) ||
        (n.content || "").toLowerCase().includes(q) ||
        (n.labels || []).some((l) => l.includes(q))
      );
    }
    return result;
  }, [notes, folder, labelFilter, searchQuery]);

  const selectedNote = notes.find((n) => String(n.id) === String(selectedId));

  const addNote = useCallback(async () => {
    const newNote = {
      id: isDev ? String(Date.now()) : undefined,
      title: "Untitled thread",
      content: "",
      source: "Manual",
      folder: folder === "all" ? "work" : folder,
      status: "inbox",
      labels: [],
      position: 0,
      created_at: new Date().toISOString(),
      actions: [],
    };

    if (isDev) {
      setNotes((prev) => [newNote, ...prev]);
      setSelectedId(newNote.id);
    } else {
      const { data } = await supabase
        .from("notes")
        .insert({ ...newNote, user_id: user.id, actions: undefined })
        .select()
        .single();
      if (data) {
        setNotes((prev) => [{ ...data, actions: [] }, ...prev]);
        setSelectedId(data.id);
      }
    }
  }, [isDev, folder, user]);

  const updateNote = useCallback((id, field, value) => {
    setNotes((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, [field]: value } : n));

    if (!isDev) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase.from("notes").update({ [field]: value }).eq("id", id);
      }, 800);
    }
  }, [isDev]);

  const toggleViewMode = useCallback(() => {
    const next = viewMode === "board" ? "list" : "board";
    setViewMode(next);
    localStorage.setItem("fulkit-threads-view", next);
  }, [viewMode]);

  const commitIconEdit = useCallback((folderKey) => {
    const trimmed = editIconValue.trim().toLowerCase();
    if (trimmed && iconNames.includes(trimmed)) {
      persistFolders(folders.map((f) => f.key === folderKey ? { ...f, icon: trimmed } : f));
    }
    setEditingFolder(null);
  }, [editIconValue, folders, persistFolders]);

  // --- List view drag handlers (reused from original) ---
  const handleDragStart = useCallback((e, idx, noteId) => {
    setDragIdx(idx);
    dragNode.current = e.currentTarget;
    dragNoteId.current = noteId;
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;width:120px;height:32px;background:#D9D5CE;border:1px solid #CBC7C0;border-left:2px solid #2A2826;opacity:0.85;border-radius:6px;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 60, 16);
    dragGhost.current = ghost;
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = "0.15"; }, 0);
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  }, [dragOverIdx]);

  const handleDrop = useCallback((e, toIdx) => {
    e.preventDefault();
    if (dragIdx != null && dragIdx !== toIdx) {
      setNotes((prev) => {
        const filtered = folder === "all" ? [...prev] : prev.filter((n) => n.folder === folder);
        const [moved] = filtered.splice(dragIdx, 1);
        filtered.splice(toIdx, 0, moved);
        if (folder === "all") return filtered;
        const reordered = [];
        let fi = 0;
        for (const n of prev) {
          if (n.folder === folder) reordered.push(filtered[fi++]);
          else reordered.push(n);
        }
        return reordered;
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
  }, [dragIdx, folder]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
    setDragOverFolder(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
    dragNoteId.current = null;
  }, []);

  const handleFolderDrop = useCallback((e, folderKey) => {
    e.preventDefault();
    if (folderKey === "all" || !dragNoteId.current) return;
    const noteId = dragNoteId.current;
    setNotes((prev) => prev.map((n) => String(n.id) === String(noteId) ? { ...n, folder: folderKey } : n));
    setSelectedId(null);
    if (!isDev) supabase.from("notes").update({ folder: folderKey }).eq("id", noteId);
    setDragIdx(null);
    setDragOverIdx(null);
    setDragOverFolder(null);
    if (dragNode.current) dragNode.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
    dragNoteId.current = null;
  }, [isDev]);

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{
            padding: "var(--space-2-5) var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}>
            <span style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tight)",
              color: "var(--color-text)",
            }}>
              Fülkit
            </span>
            {!compactMode && (
              <>
                <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/</span>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                  Threads
                </span>
              </>
            )}
          </div>

          {/* Folder tabs + controls */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "0 var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            position: "relative",
            zIndex: 10,
          }}>
            {folders.map((f) => {
              const active = folder === f.key;
              const isEditing = editingFolder === f.key;
              const isDropTarget = f.key !== "all";
              return (
                <div
                  key={f.key}
                  onDragEnter={isDropTarget ? (e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(f.key); } : undefined}
                  onDragOver={isDropTarget ? (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; } : undefined}
                  onDragLeave={isDropTarget ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFolder(null); } : undefined}
                  onDrop={isDropTarget ? (e) => handleFolderDrop(e, f.key) : undefined}
                >
                  <Tooltip label={compactMode ? f.label : null}>
                    <button
                      onClick={() => { setFolder(f.key); if (viewMode === "list") setSelectedId(null); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-1-5)",
                        padding: "var(--space-2-5) var(--space-3)",
                        border: "none",
                        outline: "none",
                        background: dragOverFolder === f.key ? "var(--color-bg-alt)" : active ? "var(--color-bg-alt)" : "transparent",
                        borderRadius: "var(--radius-md)",
                        color: active ? "var(--color-text)" : "var(--color-text-muted)",
                        fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                        fontSize: "var(--font-size-xs)",
                        fontFamily: "var(--font-primary)",
                        cursor: "pointer",
                        transition: "all var(--duration-fast) var(--ease-default)",
                        ...(dragIdx != null && isDropTarget ? (dragOverFolder === f.key ? {
                          position: "relative",
                          zIndex: 9999,
                          transform: "translateY(-8px) scale(1.15)",
                          background: "var(--color-bg-elevated)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                          opacity: 1,
                        } : {
                          opacity: 0.35,
                        }) : {}),
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editIconValue}
                          onChange={(e) => setEditIconValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitIconEdit(f.key);
                            if (e.key === "Escape") setEditingFolder(null);
                            e.stopPropagation();
                          }}
                          onBlur={() => commitIconEdit(f.key)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={f.icon}
                          style={{
                            width: 80,
                            fontSize: "var(--font-size-2xs)",
                            fontFamily: "var(--font-mono)",
                            background: "transparent",
                            border: "none",
                            borderBottom: "1px solid var(--color-text-muted)",
                            outline: "none",
                            padding: 0,
                            color: "var(--color-text)",
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            if (f.key === "all") return;
                            e.stopPropagation();
                            setEditingFolder(f.key);
                            setEditIconValue(f.icon);
                          }}
                          style={{ display: "flex", cursor: f.key !== "all" ? "pointer" : "default" }}
                        >
                          <DynamicIcon name={f.icon} size={TAB_ICON_SIZE} strokeWidth={1.8} />
                        </span>
                      )}
                      {!compactMode && f.label}
                    </button>
                  </Tooltip>
                </div>
              );
            })}

            {/* Right controls: label filter, search, view toggle, new */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              {/* Label filter pills */}
              {allLabels.length > 0 && !compactMode && (
                <div style={{ display: "flex", gap: 2, marginRight: "var(--space-2)" }}>
                  {allLabels.slice(0, 5).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLabelFilter(labelFilter === l ? null : l)}
                      style={{
                        fontSize: "var(--font-size-2xs)",
                        fontWeight: labelFilter === l ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                        color: labelFilter === l ? "var(--color-text)" : "var(--color-text-dim)",
                        background: labelFilter === l ? "var(--color-bg-alt)" : "transparent",
                        border: labelFilter === l ? "1px solid var(--color-border)" : "1px solid transparent",
                        borderRadius: "var(--radius-xs)",
                        padding: "1px var(--space-1-5)",
                        cursor: "pointer",
                        fontFamily: "var(--font-primary)",
                        lineHeight: "16px",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}

              {/* Search */}
              {searchOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)", padding: "2px var(--space-2)" }}>
                  <Search size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); } }}
                    placeholder="Search threads..."
                    style={{
                      width: 140,
                      fontSize: "var(--font-size-xs)",
                      fontFamily: "var(--font-primary)",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      padding: "var(--space-1) 0",
                      color: "var(--color-text)",
                    }}
                  />
                  <button
                    onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                    style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-text-muted)" }}
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 0); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-muted)",
                    background: "none",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-primary)",
                    padding: "var(--space-2-5) var(--space-2)",
                    lineHeight: 1,
                  }}
                  title="Search threads"
                >
                  <Search size={12} strokeWidth={2} />
                </button>
              )}

              {/* View toggle */}
              <Tooltip label={viewMode === "board" ? "List view" : "Board view"}>
                <button
                  onClick={toggleViewMode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "var(--color-text-muted)",
                    background: "none",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    padding: "var(--space-2-5) var(--space-2)",
                    lineHeight: 1,
                  }}
                >
                  {viewMode === "board" ? <List size={12} strokeWidth={2} /> : <LayoutGrid size={12} strokeWidth={2} />}
                </button>
              </Tooltip>

              {/* New thread */}
              <button
                onClick={addNote}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  background: "none",
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-primary)",
                  padding: "var(--space-2-5) var(--space-2)",
                  lineHeight: 1,
                }}
                title="New thread"
              >
                <Plus size={12} strokeWidth={2} />
                {!compactMode && "New"}
              </button>
            </div>
          </div>

          {/* Main content area */}
          {viewMode === "board" ? (
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              <ThreadBoard
                notes={filteredNotes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdateNote={updateNote}
                compact={compactMode}
              />
              {/* Detail slide-over */}
              {selectedNote && (
                <div style={{
                  width: 380,
                  minWidth: 380,
                  borderLeft: "1px solid var(--color-border-light)",
                  background: "var(--color-bg-elevated)",
                  overflowY: "auto",
                }}>
                  <ThreadDetail
                    note={selectedNote}
                    isDev={isDev}
                    onUpdate={updateNote}
                    onClose={() => setSelectedId(null)}
                    allLabels={allLabels}
                  />
                </div>
              )}
            </div>
          ) : (
            /* List view — preserved from original */
            <div style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
              margin: "var(--space-4) var(--space-6)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
            }}>
              {/* Left — note list */}
              <div style={{
                width: 280,
                minWidth: 280,
                borderRight: "1px solid var(--color-border-light)",
                overflowY: "auto",
                padding: "var(--space-3) 0",
              }}>
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((note, i) => {
                    const active = String(note.id) === String(selectedId);
                    return (
                      <div
                        key={note.id}
                        draggable
                        onClick={() => setSelectedId(note.id)}
                        onDragStart={(e) => handleDragStart(e, i, note.id)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={(e) => handleDrop(e, i)}
                        onDragEnd={handleDragEnd}
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          cursor: "grab",
                          background: active ? "var(--color-bg-alt)" : "transparent",
                          borderLeft: active ? "2px solid var(--color-text)" : "2px solid transparent",
                          borderTop: dragOverIdx === i && dragIdx !== i ? "2px solid var(--color-text)" : "2px solid transparent",
                          transition: "background var(--duration-fast) var(--ease-default)",
                        }}
                      >
                        <div style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-text)",
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {note.title}
                        </div>
                        <div style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--color-text-dim)",
                        }}>
                          {note.source || "Manual"} · {timeAgo(note.created_at)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: "var(--space-6) var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-dim)",
                    textAlign: "center",
                  }}>
                    No threads yet.
                  </div>
                )}
              </div>

              {/* Right — detail */}
              {selectedNote ? (
                <ThreadDetail
                  note={selectedNote}
                  isDev={isDev}
                  onUpdate={updateNote}
                  allLabels={allLabels}
                />
              ) : (
                <div style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-dim)",
                  }}>
                    Select a thread to view
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
