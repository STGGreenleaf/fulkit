"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { Plus, Search, X } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
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
  // Work
  { id: "1", title: "Meeting notes — product roadmap", content: "Discussed Q2 priorities:\n\n- Ship vault sync by end of month\n- Numbrly integration blocked on API key provisioning\n- Whispers MVP ready for internal testing\n- Need to finalize pricing tiers before launch\n\nAction items assigned in separate thread.", source: "Obsidian", folder: "work", created_at: "2024-01-15T10:00:00Z" },
  { id: "5", title: "Standup recap — March 10", content: "What shipped:\n- Compact mode toggle across all tabs\n- Spotify OAuth flow wired up\n- Drag-and-drop on Fabric sets\n\nBlocked:\n- Numbrly API key provisioning still pending\n- Need design review on Threads folder tabs\n\nUp next:\n- Vault Model B encryption layer\n- Chat context injection from vault", source: "Chat", folder: "work", created_at: "2024-01-14T09:00:00Z" },
  { id: "6", title: "Pricing tier notes", content: "Free: 25 messages/day, local vault only\nPro ($12/mo): unlimited messages, encrypted sync, BYOK\nTeam ($29/seat): shared vaults, admin panel, audit log\n\nStill debating whether BYOK should be Pro-only or available on Free with rate limits. Leaning Pro-only — simplifies the pitch.", source: "Obsidian", folder: "work", created_at: "2024-01-11T16:00:00Z" },
  // Personal
  { id: "2", title: "Voice capture: meal planning ideas", content: "Try the lemon chicken recipe from that conversation last week. Marinade: lemon juice, garlic, olive oil, oregano, salt. 400°F for 25 min.\n\nAlso want to try:\n- Thai basil stir fry\n- Homemade pizza dough (the no-knead version)\n- That mushroom risotto technique", source: "Hum", folder: "personal", created_at: "2024-01-14T15:30:00Z" },
  { id: "7", title: "Weekend trip packing list", content: "Clothes:\n- 2 shirts, 1 hoodie, jeans\n- Running shoes + flip flops\n\nGear:\n- Laptop + charger\n- AirPods\n- Kindle\n- Sunglasses\n\nDon't forget:\n- Water bottle\n- Snacks for the drive\n- Playlist queued up", source: "Hum", folder: "personal", created_at: "2024-01-13T20:00:00Z" },
  { id: "8", title: "Gift ideas — Mom's birthday", content: "She mentioned wanting:\n- A nice candle (not vanilla — she's over vanilla)\n- That cookbook from the farmer's market guy\n- New garden gloves\n\nBackup: a framed photo from the lake trip last summer. Check Google Photos for the good ones.", source: "Chat", folder: "personal", created_at: "2024-01-10T11:00:00Z" },
  // Ideas
  { id: "4", title: "API key rotation checklist", content: "Steps:\n1. Generate new key in Anthropic console\n2. Update .env.local locally\n3. Update Vercel env vars (Settings → Environment Variables)\n4. Restart local dev server\n5. Verify chat works on localhost\n6. Push to trigger Vercel redeploy\n7. Verify production chat works\n8. Revoke old key in Anthropic console\n\nDo NOT revoke old key until new one is confirmed working in prod.", source: "Chat", folder: "ideas", created_at: "2024-01-12T14:00:00Z" },
  { id: "9", title: "Hats — context profiles concept", content: "What if users could switch 'hats' in chat?\n\nEach hat = a filtered vault context. Examples:\n- Work hat: only pulls from /work folder\n- Creative hat: pulls from /ideas + /reference\n- Personal hat: pulls from /personal, excludes work\n\nUI: dropdown in chat header, icon changes per hat. Vault folders map 1:1 to hat filters. Could reuse the same folder system from Threads.", source: "Obsidian", folder: "ideas", created_at: "2024-01-11T22:00:00Z" },
  { id: "10", title: "Whispers — ambient capture UX", content: "Core loop: phone mic picks up ambient conversation → transcribes → extracts actionable items → saves to vault as a thread.\n\nKey questions:\n- Always listening vs. tap to start?\n- How to handle multi-speaker?\n- Privacy indicator — must be obvious when recording\n- Battery impact on mobile\n\nMVP: tap to start, single speaker, 5 min max, auto-stop on silence.", source: "Hum", folder: "ideas", created_at: "2024-01-09T18:00:00Z" },
  // Reference
  { id: "3", title: "Startup reading list", content: "1. Zero to One — Peter Thiel\n2. The Mom Test — Rob Fitzpatrick\n3. Inspired — Marty Cagan\n4. Shape Up — Ryan Singer (free online)\n5. Obviously Awesome — April Dunford\n\nStart with The Mom Test — shortest and most immediately useful.", source: "Google Drive", folder: "reference", created_at: "2024-01-13T09:00:00Z" },
  { id: "11", title: "Supabase RLS cheat sheet", content: "Row Level Security patterns:\n\nRead own rows:\n  USING (auth.uid() = user_id)\n\nInsert own rows:\n  WITH CHECK (auth.uid() = user_id)\n\nService role bypasses RLS — never expose in client.\n\nCommon gotcha: forgetting to enable RLS on new tables. Always run:\n  ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;", source: "Google Drive", folder: "reference", created_at: "2024-01-08T13:00:00Z" },
  { id: "12", title: "Design tokens reference", content: "Warm monochrome palette:\n- bg: #EFEDE8\n- bg-elevated: #F5F3EE\n- bg-alt: #E7E4DF\n- text: #2A2826\n- text-muted: #6B6560\n- text-dim: #9B958E\n- border-light: #D6D3CC\n\nSpacing scale: 2/4/6/8/12/16/20/24/32/40/48/64\nFont sizes: 10/11/12/13/14/16/18/20/24/32\nRadius: 4/6/8/12/16", source: "Obsidian", folder: "reference", created_at: "2024-01-07T10:00:00Z" },
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
  const searchRef = useRef(null);
  const saveTimer = useRef(null);

  // Drag state — reorder within list + move to folder
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const dragNode = useRef(null);
  const dragNoteId = useRef(null);

  // Load custom folders from localStorage (keep default keys, only override icons)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fulkit-thread-folders");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved icon customizations onto default folders (preserves keys/labels)
        const merged = DEFAULT_FOLDERS.map((df) => {
          const match = parsed.find((p) => p.key === df.key);
          return match ? { ...df, icon: match.icon } : df;
        });
        setFolders(merged);
      }
    } catch {}
  }, []);

  // Persist folders to localStorage on change
  const persistFolders = useCallback((next) => {
    setFolders(next);
    localStorage.setItem("fulkit-thread-folders", JSON.stringify(next));
  }, []);

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
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("[threads] notes query failed:", error.message);
        if (data) setNotes(data);
      });
  }, [user, isDev]);

  // Select note from URL param on load
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  // Auto-select first note on initial load only
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!hasAutoSelected.current && !selectedId && notes.length > 0) {
      hasAutoSelected.current = true;
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  const folderFiltered = folder === "all" ? notes : notes.filter((n) => n.folder === folder);
  const q = searchQuery.toLowerCase().trim();
  const filteredNotes = q
    ? notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    : folderFiltered;
  const selectedNote = filteredNotes.find((n) => String(n.id) === String(selectedId));

  const addNote = useCallback(async () => {
    const newNote = {
      id: isDev ? String(Date.now()) : undefined,
      title: "Untitled thread",
      content: "",
      source: "Manual",
      folder: folder === "all" ? "work" : folder,
      created_at: new Date().toISOString(),
    };

    if (isDev) {
      setNotes((prev) => [newNote, ...prev]);
      setSelectedId(newNote.id);
    } else {
      const { data } = await supabase
        .from("notes")
        .insert({ ...newNote, user_id: user.id })
        .select()
        .single();
      if (data) {
        setNotes((prev) => [data, ...prev]);
        setSelectedId(data.id);
      }
    }
  }, [isDev, folder, user]);

  const updateNote = useCallback((id, field, value) => {
    setNotes((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, [field]: value } : n));

    // Debounced save to Supabase
    if (!isDev) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        supabase.from("notes").update({ [field]: value }).eq("id", id);
      }, 800);
    }
  }, [isDev]);

  const commitIconEdit = useCallback((folderKey) => {
    const trimmed = editIconValue.trim().toLowerCase();
    if (trimmed && iconNames.includes(trimmed)) {
      persistFolders(folders.map((f) => f.key === folderKey ? { ...f, icon: trimmed } : f));
    }
    setEditingFolder(null);
  }, [editIconValue, folders, persistFolders]);

  // --- Drag handlers ---
  const dragGhost = useRef(null);
  const handleDragStart = useCallback((e, idx, noteId) => {
    setDragIdx(idx);
    dragNode.current = e.currentTarget;
    dragNoteId.current = noteId;
    e.dataTransfer.effectAllowed = "move";
    // Create a small card-shaped drag ghost so it doesn't cover folder tabs
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;width:120px;height:32px;background:#D9D5CE;border:1px solid #CBC7C0;border-left:2px solid #2A2826;opacity:0.85;";
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
        // Reorder within the filtered view, then map back to full array
        const filtered = folder === "all" ? [...prev] : prev.filter((n) => n.folder === folder);
        const [moved] = filtered.splice(dragIdx, 1);
        filtered.splice(toIdx, 0, moved);
        if (folder === "all") return filtered;
        // Rebuild full array: non-folder notes stay in place, folder notes get new order
        const reordered = [];
        let fi = 0;
        for (const n of prev) {
          if (n.folder === folder) {
            reordered.push(filtered[fi++]);
          } else {
            reordered.push(n);
          }
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

  // Drop onto folder tab — move thread to that folder
  const handleFolderDrop = useCallback((e, folderKey) => {
    e.preventDefault();
    if (folderKey === "all" || !dragNoteId.current) return;
    const noteId = dragNoteId.current;
    // Update folder on the note
    setNotes((prev) => prev.map((n) => String(n.id) === String(noteId) ? { ...n, folder: folderKey } : n));
    // Always clear selection — the note just left this folder
    setSelectedId(null);
    if (!isDev) {
      supabase.from("notes").update({ folder: folderKey }).eq("id", noteId);
    }
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
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/</span>
            )}
            {!compactMode && (
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                Threads
              </span>
            )}
          </div>

          {/* Folder tabs */}
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
                    onClick={() => { setFolder(f.key); setSelectedId(null); }}
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
                      // When dragging: dim non-target tabs, pop target tab above drag ghost
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
                        style={{
                          display: "flex",
                          cursor: f.key !== "all" ? "pointer" : "default",
                        }}
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

            {/* Search + New — right-justified */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
              {searchOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)", padding: "2px var(--space-2)" }}>
                  <Search size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); }
                    }}
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
                  title="Search threads"
                >
                  <Search size={12} strokeWidth={2} />
                </button>
              )}
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

          {/* Split panel */}
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
                        {note.source} · {timeAgo(note.created_at)}
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
                  No threads yet. Threads are created from conversations, actions, imports, or The Hum.
                </div>
              )}
            </div>

            {/* Right — note viewer */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-6)",
            }}>
              {selectedNote ? (
                <div>
                  <input
                    value={selectedNote.title}
                    onChange={(e) => updateNote(selectedNote.id, "title", e.target.value)}
                    style={{
                      fontSize: "var(--font-size-lg)",
                      fontWeight: "var(--font-weight-bold)",
                      letterSpacing: "var(--letter-spacing-tight)",
                      marginBottom: "var(--space-2)",
                      width: "100%",
                      background: "none",
                      border: "none",
                      outline: "none",
                      padding: 0,
                      color: "var(--color-text)",
                      fontFamily: "var(--font-primary)",
                    }}
                  />
                  <div style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-dim)",
                    marginBottom: "var(--space-6)",
                    display: "flex",
                    gap: "var(--space-2)",
                    alignItems: "center",
                  }}>
                    <span style={{
                      padding: "1px var(--space-2)",
                      background: "var(--color-bg-alt)",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: "var(--font-weight-medium)",
                    }}>
                      {selectedNote.source}
                    </span>
                    <span>·</span>
                    <span>{timeAgo(selectedNote.created_at)}</span>
                  </div>
                  <textarea
                    value={selectedNote.content}
                    onChange={(e) => updateNote(selectedNote.id, "content", e.target.value)}
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-secondary)",
                      lineHeight: "var(--line-height-relaxed)",
                      whiteSpace: "pre-wrap",
                      width: "100%",
                      minHeight: 300,
                      background: "none",
                      border: "none",
                      outline: "none",
                      padding: 0,
                      resize: "none",
                      fontFamily: "var(--font-primary)",
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-dim)",
                  textAlign: "center",
                  marginTop: "var(--space-10)",
                }}>
                  Select a thread to view
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
