"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";
import { Plus, Search, X, LayoutGrid, List, CalendarDays, Table2, MoreVertical } from "lucide-react";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import ThreadBoard from "../../components/ThreadBoard";
import ThreadCalendar from "../../components/ThreadCalendar";
import ThreadTable from "../../components/ThreadTable";
import ThreadDetail from "../../components/ThreadDetail";
import { useAuth } from "../../lib/auth";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import { supabase } from "../../lib/supabase";
import { useIsMobile } from "../../lib/use-mobile";

const TAB_ICON_SIZE = 16;

const DEFAULT_FOLDERS = [
  { key: "all", label: "All", icon: "layers" },
  { key: "work", label: "Work", icon: "briefcase" },
  { key: "personal", label: "Personal", icon: "user-round" },
  { key: "ideas", label: "Ideas", icon: "lightbulb" },
  { key: "reference", label: "Reference", icon: "book-open" },
];

const DEFAULT_COLUMNS = [
  { key: "inbox", label: "Inbox" },
  { key: "active", label: "Active" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const VIEWS = [
  { key: "board", label: "Board", Icon: LayoutGrid },
  { key: "list", label: "List", Icon: List },
  { key: "calendar", label: "Calendar", Icon: CalendarDays },
  { key: "table", label: "Table", Icon: Table2 },
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

export default function ThreadsPage({ initialFolder, initialView }) {
  return (
    <Suspense>
      <ThreadsContent initialFolder={initialFolder} initialView={initialView} />
    </Suspense>
  );
}

function ThreadsContent({ initialFolder, initialView }) {
  const { user, compactMode, accessToken } = useAuth();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "threads" }); }, []);
  useOnboardingTrigger("threads");

  // --- Core state ---
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [folder, setFolder] = useState(initialFolder || "all");
  const [view, setView] = useState(initialView || "board");
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [customColumns, setCustomColumns] = useState([]);
  const [customFolders, setCustomFolders] = useState([]);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuFolder, setMenuFolder] = useState(null);
  const [hoverFolder, setHoverFolder] = useState(null);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [editIconValue, setEditIconValue] = useState("");
  const [detailMode, setDetailMode] = useState("overlap"); // "overlap" or "column"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const saveTimer = useRef(null);

  // --- List view drag state ---
  const [listDragIdx, setListDragIdx] = useState(null);
  const [listDragOverIdx, setListDragOverIdx] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const listDragNode = useRef(null);
  const listDragNoteId = useRef(null);
  const listDragGhost = useRef(null);

  // --- Columns ---
  const allColumns = useMemo(() => {
    return [...DEFAULT_COLUMNS, ...customColumns];
  }, [customColumns]);

  // --- All folders (defaults + custom) ---
  const allFolders = useMemo(() => [...folders, ...customFolders], [folders, customFolders]);

  // --- All labels (for autocomplete, sorted by frequency) ---
  const allLabels = useMemo(() => {
    const counts = {};
    notes.forEach((n) => (n.labels || []).forEach((l) => {
      counts[l] = (counts[l] || 0) + 1;
    }));
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [notes]);

  // --- URL sync helper ---
  const updateThreadsUrl = useCallback((f, v) => {
    const slug = f === "all" ? `/threads` : `/threads/${f}`;
    const full = v && v !== "board" ? `${slug}/${v}` : slug;
    window.history.replaceState({}, "", full);
  }, []);

  // --- Load persisted state ---
  useEffect(() => {
    try {
      if (!initialView) {
        const savedView = localStorage.getItem("fulkit-threads-view");
        if (savedView && VIEWS.some((v) => v.key === savedView)) setView(savedView);
      }
    } catch {}
    try {
      const savedDetailMode = localStorage.getItem("fulkit-threads-detail-mode");
      if (savedDetailMode === "column" || savedDetailMode === "overlap") setDetailMode(savedDetailMode);
    } catch {}
    try {
      const savedFolders = localStorage.getItem("fulkit-thread-folders");
      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);
        const merged = DEFAULT_FOLDERS.map((df) => {
          const match = parsed.find((p) => p.key === df.key);
          return match ? { ...df, icon: match.icon || df.icon, label: match.label || df.label } : df;
        });
        setFolders(merged);
      }
    } catch {}
    try {
      const savedCols = localStorage.getItem("fulkit-thread-columns");
      if (savedCols) setCustomColumns(JSON.parse(savedCols));
    } catch {}
    try {
      const savedCustomFolders = localStorage.getItem("fulkit-thread-custom-folders");
      if (savedCustomFolders) setCustomFolders(JSON.parse(savedCustomFolders));
    } catch {}
  }, []);

  // --- Persist view ---
  const setViewPersist = useCallback((v) => {
    setView(v);
    localStorage.setItem("fulkit-threads-view", v);
    updateThreadsUrl(folder, v);
  }, [folder, updateThreadsUrl]);

  const toggleDetailMode = useCallback(() => {
    const next = detailMode === "overlap" ? "column" : "overlap";
    setDetailMode(next);
    localStorage.setItem("fulkit-threads-detail-mode", next);
  }, [detailMode]);

  // --- Persist folders ---
  const persistFolders = useCallback((next) => {
    setFolders(next);
    localStorage.setItem("fulkit-thread-folders", JSON.stringify(next));
  }, []);

  // --- Persist custom folders ---
  const persistCustomFolders = useCallback((next) => {
    setCustomFolders(next);
    localStorage.setItem("fulkit-thread-custom-folders", JSON.stringify(next));
  }, []);

  const addFolder = useCallback((label) => {
    const key = label.trim().toLowerCase().replace(/\s+/g, "-");
    if (!key) return;
    const allKeys = [...DEFAULT_FOLDERS.map((f) => f.key), ...customFolders.map((f) => f.key)];
    if (allKeys.includes(key)) return;
    persistCustomFolders([...customFolders, { key, label: label.trim(), icon: "pen-line" }]);
  }, [customFolders, persistCustomFolders]);

  const removeFolder = useCallback((key) => {
    persistCustomFolders(customFolders.filter((f) => f.key !== key));
    // Move notes in deleted folder to "work"
    setNotes((prev) => prev.map((n) => n.folder === key ? { ...n, folder: "work" } : n));
    supabase.from("notes").update({ folder: "work" }).eq("folder", key);
    if (folder === key) setFolder("all");
  }, [customFolders, persistCustomFolders, folder]);

  // --- Persist columns ---
  const persistColumns = useCallback((next) => {
    setCustomColumns(next);
    localStorage.setItem("fulkit-thread-columns", JSON.stringify(next));
  }, []);

  const addColumn = useCallback((label) => {
    const key = label.trim().toLowerCase().replace(/\s+/g, "-");
    if (!key || allColumns.some((c) => c.key === key)) return;
    persistColumns([...customColumns, { key, label: label.trim() }]);
  }, [customColumns, allColumns, persistColumns]);

  const removeColumn = useCallback((key) => {
    persistColumns(customColumns.filter((c) => c.key !== key));
    // Move notes in deleted column back to inbox
    setNotes((prev) => prev.map((n) => n.status === key ? { ...n, status: "inbox" } : n));
    supabase.from("notes").update({ status: "inbox" }).eq("status", key);
  }, [customColumns, persistColumns]);

  // --- Load notes ---
  useEffect(() => {
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

    // Auto-archive: move "done" threads older than 7 days to archived (fire-and-forget)
    supabase.from("preferences").select("value").eq("user_id", user.id).eq("key", "auto_archive_enabled").maybeSingle()
      .then(({ data: pref }) => {
        if (pref?.value === "false") return;
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        supabase.from("notes")
          .update({ status: "archived" })
          .eq("user_id", user.id)
          .eq("status", "done")
          .lt("updated_at", cutoff)
          .then(() => {});
      }).catch(() => {});
  }, [user]);

  // --- External events (Google Calendar + Trello) ---
  const [externalEvents, setExternalEvents] = useState([]);
  const [calendarFolderMap, setCalendarFolderMap] = useState({});

  useEffect(() => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Load folder mapping from preferences
    supabase.from("preferences").select("value").eq("user_id", user?.id).eq("key", "calendar_folder_map").maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try { setCalendarFolderMap(JSON.parse(data.value)); } catch {}
        }
      }).catch(() => {});

    // Fetch external events in parallel
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    Promise.all([
      fetch(`/api/google/calendar/events?start=${start}&end=${end}`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/trello/cards", { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([gcal, trello]) => {
      const events = [];
      if (gcal?.events) {
        for (const e of gcal.events) {
          const dateStr = (e.start || "").slice(0, 10);
          events.push({
            id: `gcal_${e.id}`,
            title: e.title,
            due_date: dateStr,
            source: "google_calendar",
            _external: true,
            _sourceId: `google_calendar:${e.calendarId}`,
            _calendarName: e.calendarName,
            _location: e.location,
            _start: e.start,
            _end: e.end,
          });
        }
      }
      if (trello?.cards) {
        for (const c of trello.cards) {
          events.push({
            id: `trello_${c.id}`,
            title: c.title,
            due_date: c.due_date,
            source: "trello",
            _external: true,
            _sourceId: `trello:${c.boardId}`,
            _boardName: c.boardName,
            _url: c.url,
            _dueComplete: c.dueComplete,
          });
        }
      }
      setExternalEvents(events);
    });
  }, [accessToken, user?.id]);

  // Assign folders to external events based on mapping
  const mappedExternalEvents = useMemo(() => {
    return externalEvents.map((e) => {
      const mappedFolder = calendarFolderMap[e._sourceId];
      if (mappedFolder) return { ...e, folder: mappedFolder };
      // Auto-match calendar/board name to folder keys
      const name = (e._calendarName || e._boardName || "").toLowerCase();
      for (const f of DEFAULT_FOLDERS) {
        if (f.key !== "all" && name.includes(f.key)) return { ...e, folder: f.key };
      }
      return { ...e, folder: "work" }; // default
    });
  }, [externalEvents, calendarFolderMap]);

  // --- URL param selection ---
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  // --- Auto-select first note (list view only) ---
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (view === "list" && !hasAutoSelected.current && !selectedId && notes.length > 0) {
      hasAutoSelected.current = true;
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId, view]);

  // --- Filtered notes ---
  const filteredNotes = useMemo(() => {
    let result = folder === "all" ? notes : notes.filter((n) => n.folder === folder);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = notes.filter((n) => n.title.toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q));
    }
    // Exclude archived from non-archive contexts
    result = result.filter((n) => n.status !== "archived");

    // Merge external events (calendar view — folder-filtered)
    const filteredExternal = folder === "all"
      ? mappedExternalEvents
      : mappedExternalEvents.filter((e) => e.folder === folder);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return [...result, ...filteredExternal.filter((e) => e.title.toLowerCase().includes(q))];
    }
    return [...result, ...filteredExternal];
  }, [notes, folder, searchQuery, mappedExternalEvents]);

  const selectedNote = useMemo(() => {
    return notes.find((n) => String(n.id) === String(selectedId));
  }, [notes, selectedId]);

  // --- Note CRUD ---
  const addNote = useCallback(async (status = "inbox", dueDate = null) => {
    const newNote = {
      title: "Untitled thread",
      content: "",
      source: "Manual",
      folder: folder === "all" ? "work" : folder,
      status,
      labels: [],
      due_date: dueDate,
      position: 0,
      created_at: new Date().toISOString(),
      actions: [],
    };
    const { id: _id, actions: _actions, ...insertData } = newNote;
    const { data } = await supabase
      .from("notes")
      .insert({ ...insertData, user_id: user.id })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setSelectedId(data.id);
    }
  }, [folder, user]);

  const updateNote = useCallback((id, field, value) => {
    setNotes((prev) => prev.map((n) => String(n.id) === String(id) ? { ...n, [field]: value } : n));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from("notes").update({ [field]: value }).eq("id", id);
      if (error) console.error("[threads] save failed:", error.message);
    }, 800);
  }, []);

  const deleteNote = useCallback(async (id) => {
    setNotes((prev) => prev.filter((n) => String(n.id) !== String(id)));
    if (String(selectedId) === String(id)) setSelectedId(null);
    // Delete linked actions first, then the note
    const { error: actErr } = await supabase.from("actions").delete().eq("thread_id", id);
    if (actErr) console.error("[threads] action cleanup failed:", actErr.message);
    const { error: noteErr } = await supabase.from("notes").delete().eq("id", id);
    if (noteErr) {
      console.error("[threads] delete failed:", noteErr.message);
      // Restore note in UI since delete failed
      // (note is already removed from state — user can refresh to recover)
    }
  }, [selectedId]);

  // Move a note to a column at a specific position (handles both cross-column and within-column reorder)
  const moveNote = useCallback((noteId, toStatus, toPosition) => {
    setNotes((prev) => {
      const note = prev.find((n) => String(n.id) === String(noteId));
      if (!note) return prev;

      // Get all notes in the target column, excluding the dragged note
      const columnNotes = prev
        .filter((n) => (n.status || "inbox") === toStatus && String(n.id) !== String(noteId))
        .sort((a, b) => (a.position || 0) - (b.position || 0));

      // Insert at the target position
      const clamped = Math.max(0, Math.min(toPosition, columnNotes.length));
      columnNotes.splice(clamped, 0, { ...note, status: toStatus });

      // Reassign positions sequentially
      const positionMap = {};
      columnNotes.forEach((n, i) => { positionMap[String(n.id)] = i; });

      return prev.map((n) => {
        if (String(n.id) === String(noteId)) {
          return { ...n, status: toStatus, position: positionMap[String(noteId)] ?? 0 };
        }
        if ((n.status || "inbox") === toStatus && positionMap[String(n.id)] !== undefined) {
          return { ...n, position: positionMap[String(n.id)] };
        }
        return n;
      });
    });

    // Persist to DB
    setTimeout(async () => {
      const { error } = await supabase.from("notes").update({ status: toStatus, position: toPosition }).eq("id", noteId);
      if (error) console.error("[threads] move failed:", error.message);
    }, 100);
  }, []);

  // --- Folder editing (name + icon) ---
  const commitFolderEdit = useCallback((folderKey) => {
    const newLabel = editLabelValue.trim();
    const newIcon = editIconValue.trim().toLowerCase();
    const validIcon = newIcon && iconNames.includes(newIcon);

    const update = (f) => {
      if (f.key !== folderKey) return f;
      return {
        ...f,
        ...(newLabel ? { label: newLabel } : {}),
        ...(validIcon ? { icon: newIcon } : {}),
      };
    };

    if (DEFAULT_FOLDERS.some((df) => df.key === folderKey)) {
      persistFolders(folders.map(update));
    } else {
      persistCustomFolders(customFolders.map(update));
    }
    setEditingFolder(null);
  }, [editLabelValue, editIconValue, folders, customFolders, persistFolders, persistCustomFolders]);

  // --- List view drag handlers ---
  const handleListDragStart = useCallback((e, idx, noteId) => {
    setListDragIdx(idx);
    listDragNode.current = e.currentTarget;
    listDragNoteId.current = noteId;
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;width:120px;height:32px;background:#D9D5CE;border:1px solid #CBC7C0;border-left:2px solid #2A2826;opacity:0.85;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 60, 16);
    listDragGhost.current = ghost;
    setTimeout(() => { if (listDragNode.current) listDragNode.current.style.opacity = "0.15"; }, 0);
  }, []);

  const handleListDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== listDragOverIdx) setListDragOverIdx(idx);
  }, [listDragOverIdx]);

  const handleListDrop = useCallback((e, toIdx) => {
    e.preventDefault();
    if (listDragIdx != null && listDragIdx !== toIdx) {
      setNotes((prev) => {
        const filtered = folder === "all" ? [...prev] : prev.filter((n) => n.folder === folder);
        const [moved] = filtered.splice(listDragIdx, 1);
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
    setListDragIdx(null);
    setListDragOverIdx(null);
    if (listDragNode.current) listDragNode.current.style.opacity = "1";
  }, [listDragIdx, folder]);

  const handleListDragEnd = useCallback(() => {
    setListDragIdx(null);
    setListDragOverIdx(null);
    setDragOverFolder(null);
    if (listDragNode.current) listDragNode.current.style.opacity = "1";
    if (listDragGhost.current) { listDragGhost.current.remove(); listDragGhost.current = null; }
    listDragNoteId.current = null;
  }, []);

  // Toast state for "move all like it" prompt
  const [folderToast, setFolderToast] = useState(null); // { sourceId, folderKey, folderLabel }

  const handleFolderDrop = useCallback((e, folderKey) => {
    e.preventDefault();
    if (folderKey === "all" || !listDragNoteId.current) return;
    const noteId = listDragNoteId.current;

    // Check if this is an external event (from calendar drag)
    const externalEvent = externalEvents.find((ev) => String(ev.id) === String(noteId));
    if (externalEvent) {
      // Move this event immediately
      setExternalEvents((prev) => prev.map((ev) => String(ev.id) === String(noteId) ? { ...ev, folder: folderKey } : ev));
      // Show toast asking to move all from this source
      const folderLabel = [...folders, ...customFolders].find((f) => f.key === folderKey)?.label || folderKey;
      setFolderToast({ sourceId: externalEvent._sourceId, folderKey, folderLabel });
      setDragOverFolder(null);
      listDragNoteId.current = null;
      return;
    }

    setNotes((prev) => prev.map((n) => String(n.id) === String(noteId) ? { ...n, folder: folderKey } : n));
    setSelectedId(null);
    supabase.from("notes").update({ folder: folderKey }).eq("id", noteId);
    setListDragIdx(null);
    setListDragOverIdx(null);
    setDragOverFolder(null);
    if (listDragNode.current) listDragNode.current.style.opacity = "1";
    if (listDragGhost.current) { listDragGhost.current.remove(); listDragGhost.current = null; }
    listDragNoteId.current = null;
  }, [externalEvents, folders, customFolders]);

  // Handle "move all like it" confirmation
  const confirmFolderMapping = useCallback(async (moveAll) => {
    if (!folderToast || !user?.id) return;
    if (moveAll) {
      const newMap = { ...calendarFolderMap, [folderToast.sourceId]: folderToast.folderKey };
      setCalendarFolderMap(newMap);
      // Persist to Supabase preferences
      supabase.from("preferences").upsert({
        user_id: user.id,
        key: "calendar_folder_map",
        value: JSON.stringify(newMap),
      }, { onConflict: "user_id,key" }).then(() => {}).catch(() => {});
    }
    setFolderToast(null);
  }, [folderToast, calendarFolderMap, user?.id]);

  // Urgency helper for list view
  const safeDate = (str) => {
    if (!str) return null;
    if (typeof str === "string" && str.length === 10) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(str);
  };
  const getUrgency = (dueDate) => {
    if (!dueDate) return null;
    const days = Math.ceil((safeDate(dueDate) - new Date()) / 86400000);
    if (days < 0) return "overdue";
    if (days <= 3) return "soon";
    return "on-track";
  };
  const UrgencyMeter = ({ urgency }) => {
    if (!urgency) return null;
    const filled = urgency === "overdue" ? 3 : urgency === "soon" ? 2 : 1;
    const on = filled === 3 ? "var(--color-text)" : filled === 2 ? "var(--color-text-muted)" : "var(--color-text-dim)";
    const off = "var(--color-border-light)";
    return (
      <svg width={5} height={14} viewBox="0 0 5 14" style={{ flexShrink: 0 }}>
        <circle cx="2.5" cy="2.5" r="2" fill={filled >= 3 ? on : off} />
        <circle cx="2.5" cy="7" r="2" fill={filled >= 2 ? on : off} />
        <circle cx="2.5" cy="11.5" r="2" fill={on} />
      </svg>
    );
  };

  // --- Render ---
  return (
    <AuthGuard>
          {/* Tab bar: folder tabs left, view toggle + actions right */}
          <div style={{
            display: "flex",
            flexWrap: isMobile ? "wrap" : "nowrap",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: isMobile ? "0 var(--space-3)" : "0 var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            position: "relative",
            zIndex: 10,
          }}>
            {/* Folder tabs */}
            {allFolders.map((f) => {
              const active = folder === f.key;
              const isEditing = editingFolder === f.key;
              const isDropTarget = f.key !== "all";
              const isCustomFolder = !DEFAULT_FOLDERS.some((df) => df.key === f.key);
              return (
                <div
                  key={f.key}
                  style={{ position: "relative", display: "flex", alignItems: "center" }}
                  onMouseEnter={isCustomFolder ? () => setHoverFolder(f.key) : undefined}
                  onMouseLeave={isCustomFolder ? () => setHoverFolder(null) : undefined}
                  onDragEnter={isDropTarget ? (e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(f.key); } : undefined}
                  onDragOver={isDropTarget ? (e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; } : undefined}
                  onDragLeave={isDropTarget ? (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverFolder(null); } : undefined}
                  onDrop={isDropTarget ? (e) => handleFolderDrop(e, f.key) : undefined}
                >
                  <Tooltip label={f.label} position="bottom">
                    <button
                      onClick={() => { setFolder(f.key); setSelectedId(null); setMenuFolder(null); updateThreadsUrl(f.key, view); }}
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
                        ...(listDragIdx != null && isDropTarget ? (dragOverFolder === f.key ? {
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
                      <span
                        onDoubleClick={(e) => {
                          if (f.key === "all") return;
                          e.stopPropagation();
                          setEditingFolder(f.key);
                          setEditLabelValue(f.label);
                          setEditIconValue(f.icon);
                        }}
                        style={{ display: "flex", cursor: f.key !== "all" ? "pointer" : "default" }}
                      >
                        <DynamicIcon name={f.icon} size={TAB_ICON_SIZE} strokeWidth={1.8} />
                      </span>
                      {!compactMode && f.label}
                    </button>
                  </Tooltip>
                  {/* Folder edit popover (name + icon) */}
                  {isEditing && (
                    <div
                      tabIndex={-1}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) commitFolderEdit(f.key);
                      }}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 40,
                        background: "var(--color-bg-elevated)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        border: "1px solid var(--color-border-light)",
                        padding: "var(--space-2-5) var(--space-3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                        minWidth: 140,
                      }}
                    >
                      <input
                        autoFocus
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitFolderEdit(f.key);
                          if (e.key === "Escape") setEditingFolder(null);
                          e.stopPropagation();
                        }}
                        placeholder="Name"
                        style={{
                          width: "100%",
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-primary)",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--color-text-muted)",
                          outline: "none",
                          padding: "0 0 var(--space-1) 0",
                          color: "var(--color-text)",
                        }}
                      />
                      <input
                        value={editIconValue}
                        onChange={(e) => setEditIconValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitFolderEdit(f.key);
                          if (e.key === "Escape") setEditingFolder(null);
                          e.stopPropagation();
                        }}
                        placeholder="Icon name"
                        style={{
                          width: "100%",
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-mono)",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--color-text-muted)",
                          outline: "none",
                          padding: "0 0 var(--space-1) 0",
                          color: "var(--color-text)",
                        }}
                      />
                      <span style={{
                        fontSize: "var(--font-size-2xs)",
                        color: "var(--color-text-dim)",
                        marginTop: -4,
                      }}>
                        Lucide Icon
                      </span>
                    </div>
                  )}
                  {/* Custom folder kebab menu — visible on hover only */}
                  {isCustomFolder && (hoverFolder === f.key || menuFolder === f.key) && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuFolder(menuFolder === f.key ? null : f.key); }}
                        style={{
                          position: "absolute",
                          right: -2,
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "flex",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-dim)",
                          padding: 2,
                        }}
                      >
                        <MoreVertical size={10} strokeWidth={2} />
                      </button>
                      {menuFolder === f.key && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            background: "var(--color-bg-elevated)",
                            border: "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-sm)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                            zIndex: 30,
                            minWidth: 120,
                            padding: "var(--space-1) 0",
                          }}
                          onMouseLeave={() => setMenuFolder(null)}
                        >
                          <button
                            onClick={() => { removeFolder(f.key); setMenuFolder(null); }}
                            style={{
                              display: "block",
                              width: "100%",
                              textAlign: "left",
                              padding: "var(--space-1-5) var(--space-3)",
                              fontSize: "var(--font-size-xs)",
                              fontFamily: "var(--font-primary)",
                              color: "var(--color-error)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Delete folder
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* Add folder — belongs with bucket tabs */}
              {addingFolder ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)", padding: "2px var(--space-2)" }}>
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const name = newFolderName.trim();
                        if (name) addFolder(name);
                        setNewFolderName("");
                        setAddingFolder(false);
                      }
                      if (e.key === "Escape") { setNewFolderName(""); setAddingFolder(false); }
                    }}
                    onBlur={() => { setNewFolderName(""); setAddingFolder(false); }}
                    placeholder="Folder name..."
                    style={{
                      width: 120,
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
                    onMouseDown={(e) => { e.preventDefault(); setNewFolderName(""); setAddingFolder(false); }}
                    style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-text-muted)" }}
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <Tooltip label="Add folder">
                  <button
                    onClick={() => setAddingFolder(true)}
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
                  >
                    <Plus size={12} strokeWidth={2} />
                  </button>
                </Tooltip>
              )}

            {/* Search + view toggle — desktop: inline after tabs, mobile: rendered in content area */}
            {!isMobile && (
              <>
                <div style={{ marginLeft: "auto" }} />

                {/* Search */}
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
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-md)",
                  padding: 2,
                  gap: 1,
                }}>
                  {VIEWS.map((v) => {
                    const isActive = view === v.key;
                    return (
                      <Tooltip key={v.key} label={v.label} position="bottom">
                        <button
                          onClick={() => setViewPersist(v.key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-1)",
                            padding: "var(--space-1) var(--space-2)",
                            border: "none",
                            outline: "none",
                            background: isActive ? "var(--color-bg-elevated)" : "transparent",
                            borderRadius: "var(--radius-sm)",
                            color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
                            fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                            fontSize: "var(--font-size-2xs)",
                            fontFamily: "var(--font-primary)",
                            cursor: "pointer",
                            transition: "all var(--duration-fast) var(--ease-default)",
                            boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                          }}
                        >
                          <v.Icon size={12} strokeWidth={1.8} />
                          {!compactMode && v.label}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Mobile toolbar — search + view toggle on one compact line */}
          {isMobile && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              borderBottom: "1px solid var(--color-border-light)",
            }}>
              {/* Search */}
              {searchOpen ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-md)", padding: "2px var(--space-2)", flex: 1, minWidth: 0 }}>
                  <Search size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setSearchQuery(""); setSearchOpen(false); }
                    }}
                    placeholder="Search..."
                    style={{
                      width: "100%",
                      minWidth: 0,
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
                    style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--color-text-muted)", flexShrink: 0 }}
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
                    padding: "var(--space-1) var(--space-2)",
                    lineHeight: 1,
                  }}
                >
                  <Search size={12} strokeWidth={2} />
                </button>
              )}

              <div style={{ marginLeft: "auto" }} />

              {/* View toggle — compact */}
              <div style={{
                display: "flex",
                alignItems: "center",
                background: "var(--color-bg-alt)",
                borderRadius: "var(--radius-md)",
                padding: 2,
                gap: 1,
                flexShrink: 0,
              }}>
                {VIEWS.map((v) => {
                  const isActive = view === v.key;
                  return (
                    <Tooltip key={v.key} label={v.label} position="bottom">
                      <button
                        onClick={() => setViewPersist(v.key)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "var(--space-1) var(--space-1-5)",
                          border: "none",
                          outline: "none",
                          background: isActive ? "var(--color-bg-elevated)" : "transparent",
                          borderRadius: "var(--radius-sm)",
                          color: isActive ? "var(--color-text)" : "var(--color-text-dim)",
                          cursor: "pointer",
                          boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                        }}
                      >
                        <v.Icon size={12} strokeWidth={1.8} />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            {/* === BOARD VIEW === */}
            {view === "board" && (
              <>
                <ThreadBoard
                  notes={filteredNotes}
                  columns={allColumns}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdateNote={updateNote}
                  onMoveNote={moveNote}
                  onAddNote={addNote}
                  onAddColumn={addColumn}
                  onRemoveColumn={removeColumn}
                  compact={compactMode}
                />
                {selectedNote && (
                  <div style={{
                    width: 420,
                    ...(detailMode === "overlap" ? {
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 20,
                      boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
                    } : {
                      minWidth: 420,
                    }),
                    borderLeft: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                    overflowY: "auto",
                  }}>
                    <ThreadDetail
                      note={selectedNote}

                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      onClose={() => setSelectedId(null)}
                      allLabels={allLabels}
                      columns={allColumns}
                      detailMode={detailMode}
                      onToggleDetailMode={toggleDetailMode}
                    />
                  </div>
                )}
              </>
            )}

            {/* === LIST VIEW === */}
            {view === "list" && (
              <div style={{
                flex: 1,
                display: "flex",
                overflow: "hidden",
                margin: isMobile ? "var(--space-4) var(--space-3)" : "var(--space-4) var(--space-6)",
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
                      const urgency = getUrgency(note.due_date);
                      return (
                        <div
                          key={note.id}
                          draggable
                          onClick={() => setSelectedId(note.id)}
                          onDragStart={(e) => handleListDragStart(e, i, note.id)}
                          onDragOver={(e) => handleListDragOver(e, i)}
                          onDrop={(e) => handleListDrop(e, i)}
                          onDragEnd={handleListDragEnd}
                          style={{
                            padding: "var(--space-3) var(--space-4)",
                            cursor: "grab",
                            background: active ? "var(--color-bg-alt)" : "transparent",
                            borderLeft: active ? "2px solid var(--color-text)" : "2px solid transparent",
                            borderTop: listDragOverIdx === i && listDragIdx !== i ? "2px solid var(--color-text)" : "2px solid transparent",
                            opacity: urgency === "overdue" ? 0.55 : 1,
                            transition: "background var(--duration-fast) var(--ease-default), opacity var(--duration-fast) var(--ease-default)",
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                          }}>
                            {/* Status dot */}
                            {note.status && note.status !== "inbox" && (
                              <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: "var(--radius-full)",
                                background: note.status === "done" ? "var(--color-text)" : "var(--color-text-muted)",
                                flexShrink: 0,
                                opacity: note.status === "done" ? 1 : 0.6,
                              }} />
                            )}
                            <div style={{
                              fontSize: "var(--font-size-sm)",
                              fontWeight: "var(--font-weight-medium)",
                              color: "var(--color-text)",
                              marginBottom: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}>
                              {note.title}
                            </div>
                            {/* Urgency dot */}
                            <UrgencyMeter urgency={urgency} />
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

                {/* Right — detail */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {selectedNote ? (
                    <ThreadDetail
                      note={selectedNote}

                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      onClose={() => setSelectedId(null)}
                      allLabels={allLabels}
                      columns={allColumns}
                      detailMode={detailMode}
                      onToggleDetailMode={toggleDetailMode}
                    />
                  ) : (
                    <div style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text-dim)",
                      textAlign: "center",
                      marginTop: "var(--space-10)",
                      padding: "var(--space-6)",
                    }}>
                      Select a thread to view
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === CALENDAR VIEW === */}
            {view === "calendar" && (
              <>
                <ThreadCalendar
                  notes={filteredNotes}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdateNote={updateNote}
                  onAddNote={addNote}
                  compact={compactMode}
                />
                {selectedNote && (
                  <div style={{
                    width: 420,
                    ...(detailMode === "overlap" ? {
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 20,
                      boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
                    } : {
                      minWidth: 420,
                    }),
                    borderLeft: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                    overflowY: "auto",
                  }}>
                    <ThreadDetail
                      note={selectedNote}

                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      onClose={() => setSelectedId(null)}
                      allLabels={allLabels}
                      columns={allColumns}
                      detailMode={detailMode}
                      onToggleDetailMode={toggleDetailMode}
                    />
                  </div>
                )}
              </>
            )}

            {/* === TABLE VIEW === */}
            {view === "table" && (
              <>
                <ThreadTable
                  notes={filteredNotes}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onUpdateNote={updateNote}
                  columns={allColumns}
                  compact={compactMode}
                />
                {selectedNote && (
                  <div style={{
                    width: 420,
                    ...(detailMode === "overlap" ? {
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 20,
                      boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
                    } : {
                      minWidth: 420,
                    }),
                    borderLeft: "1px solid var(--color-border-light)",
                    background: "var(--color-bg-elevated)",
                    overflowY: "auto",
                  }}>
                    <ThreadDetail
                      note={selectedNote}

                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      onClose={() => setSelectedId(null)}
                      allLabels={allLabels}
                      columns={allColumns}
                      detailMode={detailMode}
                      onToggleDetailMode={toggleDetailMode}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Folder mapping toast */}
          {folderToast && (
            <div style={{
              position: "fixed",
              bottom: "var(--space-8)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
              background: "var(--color-bg-inverse)",
              color: "var(--color-text-inverse)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3) var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              boxShadow: "var(--shadow-lg)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-primary)",
              maxWidth: 440,
            }}>
              <span>Moved to {folderToast.folderLabel}. Move all from this source?</span>
              <button
                onClick={() => confirmFolderMapping(true)}
                style={{
                  padding: "var(--space-1) var(--space-2)",
                  background: "var(--color-bg-elevated)",
                  color: "var(--color-text)",
                  border: "none",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontFamily: "var(--font-primary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Yes, all
              </button>
              <button
                onClick={() => confirmFolderMapping(false)}
                style={{
                  padding: "var(--space-1) var(--space-2)",
                  background: "transparent",
                  color: "var(--color-text-dim)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xs)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Just this one
              </button>
            </div>
          )}
    </AuthGuard>
  );
}
