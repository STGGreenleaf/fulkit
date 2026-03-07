"use client";

import { useState, useEffect, useRef } from "react";
import { CheckSquare, Plus, X, Clock, Check, MoreHorizontal, ArrowDown, ArrowUp, Minus, Copy, Layers, MessageSquareCode, Home, Trash2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const FILTERS = ["active", "done", "deferred", "dismissed"];
const LENSES = [
  { key: "all", Icon: Layers },
  { key: "build", Icon: MessageSquareCode },
  { key: "life", Icon: Home },
];
const PRIORITY_LABELS = { 1: "High", 2: "Normal", 3: "Low" };
const BUCKET_LABELS = { build: "Build", life: "Life" };

const DEV_ACTIONS = [
  { id: "1", title: "Review Q1 budget draft", source: "Obsidian", status: "active", priority: 1, parent_id: null, created_at: "2026-02-28T10:00:00Z", description: "Compare against last quarter's actual spend. Mike needs this by Friday.", bucket: "build" },
  { id: "2", title: "Send Mike the revised proposal", source: "Chat", status: "active", priority: 2, parent_id: null, created_at: "2026-03-01T14:00:00Z", description: null, bucket: "build" },
  { id: "3", title: "Book dentist appointment", source: "Whisper", status: "active", priority: 3, parent_id: null, created_at: "2026-03-02T09:00:00Z", description: null, bucket: "life" },
  { id: "4", title: "Follow up with Sarah", source: "Chat", status: "done", priority: null, parent_id: null, created_at: "2026-02-25T11:00:00Z", completed_at: "2026-03-01T16:00:00Z", description: "She confirmed the budget numbers look good.", bucket: null },
  { id: "5", title: "Cancel old subscription", source: "Whisper", status: "dismissed", priority: null, parent_id: null, created_at: "2026-02-20T08:00:00Z", description: null, bucket: "life" },
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

function buildRichCopy(action) {
  const lines = [`## ${action.title}`];
  const meta = [];
  if (action.priority) meta.push(`Priority: ${PRIORITY_LABELS[action.priority] || "—"}`);
  if (action.bucket) meta.push(`Bucket: ${BUCKET_LABELS[action.bucket] || "—"}`);
  if (action.source) meta.push(`Source: ${action.source}`);
  meta.push(`Created: ${new Date(action.created_at).toLocaleDateString()}`);
  if (action.completed_at) meta.push(`Completed: ${new Date(action.completed_at).toLocaleDateString()}`);
  lines.push(meta.join(" · "));
  if (action.description) {
    lines.push("");
    lines.push(action.description);
  }
  return lines.join("\n");
}

function PriorityBadge({ priority }) {
  if (priority == null) return <div style={{ width: 20, flexShrink: 0 }} />;
  const config = {
    1: { Icon: ArrowUp, opacity: 1 },
    2: { Icon: Minus, opacity: 0.5 },
    3: { Icon: ArrowDown, opacity: 0.35 },
  };
  const { Icon, opacity } = config[priority] || config[2];
  return (
    <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
      <Icon size={12} strokeWidth={2} />
    </div>
  );
}

const labelStyle = {
  fontSize: "var(--font-size-2xs)",
  fontWeight: "var(--font-weight-semibold)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--color-text-muted)",
  marginBottom: "var(--space-1)",
  display: "block",
};

const fieldInputStyle = {
  width: "100%",
  padding: "var(--space-2) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "var(--font-primary)",
  outline: "none",
};

export default function Actions() {
  const { user } = useAuth();
  const isDev = user?.isDev;

  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState("active");
  const [lens, setLens] = useState("all");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!user || isDev) return;
    loadActions();
  }, [user, isDev]);

  async function loadActions() {
    const { data } = await supabase
      .from("actions")
      .select("*")
      .order("priority", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (data) setActions(data);
  }

  const allActions = isDev ? DEV_ACTIONS : actions;
  const lensed = lens === "all" ? allActions : allActions.filter((a) => a.bucket === lens);
  const filtered = lensed.filter((a) => a.status === filter);
  const counts = {};
  for (const f of FILTERS) {
    counts[f] = lensed.filter((a) => a.status === f).length;
  }

  async function updateStatus(id, status) {
    const updates = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    if (!isDev) {
      await supabase.from("actions").update(updates).eq("id", id);
    }
  }

  async function updateAction(id, updates) {
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    if (!isDev) {
      await supabase.from("actions").update(updates).eq("id", id);
    }
  }

  async function clearDone() {
    const doneIds = filtered.filter((a) => a.status === "done").map((a) => a.id);
    if (doneIds.length === 0) return;
    setActions((prev) => prev.filter((a) => !doneIds.includes(a.id)));
    setConfirmClear(false);
    if (!isDev) {
      await supabase.from("actions").delete().in("id", doneIds);
    }
  }

  async function addAction() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setAdding(false);

    const bucket = lens !== "all" ? lens : null;

    if (isDev) {
      setActions((prev) => [...prev, { id: crypto.randomUUID(), title, source: "Manual", status: "active", priority: null, parent_id: null, created_at: new Date().toISOString(), description: null, bucket }]);
      return;
    }

    const { data } = await supabase
      .from("actions")
      .insert({ user_id: user.id, title, source: "manual", status: "active", bucket })
      .select()
      .single();
    if (data) setActions((prev) => [...prev, data]);
  }

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              padding: "var(--space-2-5) var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <CheckSquare size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Actions
            </span>
            <button
              onClick={() => setAdding(true)}
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-primary)",
                padding: "var(--space-1) var(--space-2)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Plus size={12} strokeWidth={2} />
              Add
            </button>
          </div>

          {/* Lens row */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {LENSES.map(({ key, Icon }) => {
              const active = lens === key;
              return (
                <button
                  key={key}
                  onClick={() => { setLens(key); setExpandedId(null); setConfirmClear(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-3) var(--space-5)",
                    border: "none",
                    borderBottom: active ? "1px solid var(--color-text)" : "1px solid transparent",
                    background: "transparent",
                    borderRadius: 0,
                    color: active ? "var(--color-text)" : "var(--color-text-dim)",
                    marginBottom: -1,
                    cursor: "pointer",
                  }}
                  title={key}
                >
                  <Icon size={14} strokeWidth={1.8} />
                </button>
              );
            })}
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "0 var(--space-6)",
              borderBottom: "1px solid var(--color-border-light)",
            }}
          >
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setExpandedId(null); setConfirmClear(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
                    borderBottom: active ? "1px solid var(--color-text)" : "1px solid transparent",
                    background: "transparent",
                    borderRadius: 0,
                    color: active ? "var(--color-text)" : "var(--color-text-muted)",
                    fontWeight: "var(--font-weight-medium)",
                    marginBottom: -1,
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                  {counts[f] > 0 && (
                    <span
                      style={{
                        fontSize: "var(--font-size-2xs)",
                        fontFamily: "var(--font-mono)",
                        color: active ? "var(--color-text-secondary)" : "var(--color-text-dim)",
                        fontWeight: "var(--font-weight-bold)",
                      }}
                    >
                      {counts[f]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-4) var(--space-6)" }}>
            <div style={{ maxWidth: 640 }}>
              {/* Add action inline */}
              {adding && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2-5) var(--space-4)",
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-accent)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addAction();
                      if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                    }}
                    placeholder="What needs to get done?"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "var(--font-size-sm)",
                      fontFamily: "var(--font-primary)",
                      color: "var(--color-text)",
                    }}
                  />
                  <button
                    onClick={addAction}
                    style={{
                      padding: "var(--space-1) var(--space-2-5)",
                      background: "var(--color-accent)",
                      color: "var(--color-text-inverse)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-2xs)",
                      fontWeight: "var(--font-weight-semibold)",
                      fontFamily: "var(--font-primary)",
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewTitle(""); }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-muted)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* Clear done */}
              {filter === "done" && filtered.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  {confirmClear ? (
                    <>
                      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>
                        Clear {filtered.length} done?
                      </span>
                      <button
                        onClick={clearDone}
                        style={{
                          padding: "var(--space-1) var(--space-2)",
                          background: "var(--color-accent)",
                          color: "var(--color-text-inverse)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-size-2xs)",
                          fontWeight: "var(--font-weight-semibold)",
                          fontFamily: "var(--font-primary)",
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-muted)",
                          fontSize: "var(--font-size-2xs)",
                          fontFamily: "var(--font-primary)",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-dim)",
                        display: "flex",
                        alignItems: "center",
                        padding: "var(--space-1)",
                        borderRadius: "var(--radius-sm)",
                      }}
                      title="Clear done items"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              )}

              {/* Action list */}
              {filtered.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {filtered.map((action) => (
                    <ActionRow
                      key={action.id}
                      action={action}
                      filter={filter}
                      onUpdateStatus={updateStatus}
                      onUpdateAction={updateAction}
                      expanded={expandedId === action.id}
                      onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "var(--space-8)",
                    textAlign: "center",
                    color: "var(--color-text-dim)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {filter === "active" && "No active actions. Add one or ask in Chat."}
                  {filter === "done" && "Nothing completed yet."}
                  {filter === "deferred" && "No deferred actions."}
                  {filter === "dismissed" && "Nothing dismissed."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function ActionRow({ action, filter, onUpdateStatus, onUpdateAction, expanded, onToggleExpand }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editTitle, setEditTitle] = useState(action.title);
  const [editDesc, setEditDesc] = useState(action.description || "");
  const detailRef = useRef(null);
  const [detailHeight, setDetailHeight] = useState(0);

  useEffect(() => { setEditTitle(action.title); }, [action.title]);
  useEffect(() => { setEditDesc(action.description || ""); }, [action.description]);

  useEffect(() => {
    if (expanded && detailRef.current) {
      requestAnimationFrame(() => setDetailHeight(detailRef.current.scrollHeight));
    } else {
      setDetailHeight(0);
    }
  }, [expanded, editDesc]);

  const menuActions = [];
  if (filter !== "done") menuActions.push({ label: "Complete", status: "done", icon: Check, color: "var(--color-success)" });
  if (filter !== "deferred") menuActions.push({ label: "Defer", status: "deferred", icon: Clock, color: "var(--color-warning)" });
  if (filter !== "dismissed") menuActions.push({ label: "Dismiss", status: "dismissed", icon: X, color: "var(--color-text-muted)" });
  if (filter !== "active") menuActions.push({ label: "Reactivate", status: "active", icon: ArrowUp, color: "var(--color-accent)" });

  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: expanded ? "1px solid var(--color-border)" : "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        position: "relative",
        transition: "border-color var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Summary row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-2-5) var(--space-4)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Quick complete checkbox (active only) */}
        {filter === "active" && (
          <div
            onClick={(e) => { e.stopPropagation(); onUpdateStatus(action.id, "done"); }}
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--radius-xs)",
              border: "1.5px solid var(--color-border)",
              flexShrink: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--duration-fast) var(--ease-default)",
            }}
          />
        )}

        {/* Done checkmark */}
        {filter === "done" && (
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "var(--radius-xs)",
              background: "var(--color-success)",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={10} strokeWidth={3} color="white" />
          </div>
        )}

        {/* Priority badge */}
        <PriorityBadge priority={action.priority} />

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: filter === "done" ? "var(--color-text-muted)" : "var(--color-text)",
              textDecoration: filter === "done" ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {action.title}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              marginTop: 2,
              display: "flex",
              gap: "var(--space-2)",
            }}
          >
            {action.source && <span>{action.source}</span>}
            <span>{timeAgo(action.completed_at || action.created_at)}</span>
          </div>
        </div>

        {/* Rich copy */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(buildRichCopy(action));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "var(--color-text-secondary)" : "var(--color-text-dim)",
            display: "flex",
            alignItems: "center",
            padding: "var(--space-1)",
            borderRadius: "var(--radius-sm)",
            opacity: copied ? 1 : 0.5,
            transition: "opacity var(--duration-fast) var(--ease-default)",
          }}
          title="Copy action details"
        >
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
        </button>

        {/* Action menu */}
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-dim)",
            display: "flex",
            alignItems: "center",
            padding: "var(--space-1)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
              style={{ position: "fixed", inset: 0, zIndex: 9 }}
            />
            <div
              style={{
                position: "absolute",
                right: "var(--space-4)",
                top: 44,
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                zIndex: 10,
                minWidth: 140,
                overflow: "hidden",
              }}
            >
              {menuActions.map((a) => (
                <button
                  key={a.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(action.id, a.status);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "var(--font-size-xs)",
                    fontFamily: "var(--font-primary)",
                    color: a.color,
                    textAlign: "left",
                  }}
                >
                  <a.icon size={12} strokeWidth={2} />
                  {a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Expandable detail panel */}
      <div
        ref={detailRef}
        style={{
          maxHeight: expanded ? detailHeight : 0,
          overflow: "hidden",
          transition: "max-height var(--duration-slow, 300ms) var(--ease-default, ease)",
        }}
      >
        <div
          style={{
            padding: "0 var(--space-4) var(--space-4)",
            borderTop: "1px solid var(--color-border-light)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            paddingTop: "var(--space-3)",
          }}
        >
          {/* Title edit */}
          <div>
            <label style={labelStyle}>Title</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                const trimmed = editTitle.trim();
                if (trimmed && trimmed !== action.title) {
                  onUpdateAction(action.id, { title: trimmed });
                } else {
                  setEditTitle(action.title);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.target.blur();
                if (e.key === "Escape") { setEditTitle(action.title); e.target.blur(); }
              }}
              onClick={(e) => e.stopPropagation()}
              style={fieldInputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={() => {
                const val = editDesc.trim() || null;
                if (val !== (action.description || null)) {
                  onUpdateAction(action.id, { description: val });
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add notes..."
              rows={3}
              style={{
                ...fieldInputStyle,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Priority selector */}
          <div>
            <label style={labelStyle}>Priority</label>
            <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
              {[
                { value: 1, label: "High", Icon: ArrowUp },
                { value: 2, label: "Normal", Icon: Minus },
                { value: 3, label: "Low", Icon: ArrowDown },
              ].map(({ value, label, Icon }, i) => {
                const active = action.priority === value;
                return (
                  <button
                    key={value}
                    onClick={(e) => { e.stopPropagation(); onUpdateAction(action.id, { priority: active ? null : value }); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1-5) var(--space-2)",
                      background: active ? "var(--color-accent)" : "transparent",
                      color: active ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                      border: "none",
                      borderRight: i < 2 ? "1px solid var(--color-border-light)" : "none",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-primary)",
                      fontWeight: "var(--font-weight-medium)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={10} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bucket selector */}
          <div>
            <label style={labelStyle}>Bucket</label>
            <div style={{ display: "flex", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
              {[
                { value: "build", label: "Build", Icon: MessageSquareCode },
                { value: "life", label: "Life", Icon: Home },
                { value: null, label: "None", Icon: X },
              ].map(({ value, label, Icon }, i) => {
                const active = (action.bucket || null) === value;
                return (
                  <button
                    key={label}
                    onClick={(e) => { e.stopPropagation(); onUpdateAction(action.id, { bucket: active ? null : value }); }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1-5) var(--space-2)",
                      background: active ? "var(--color-accent)" : "transparent",
                      color: active ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                      border: "none",
                      borderRight: i < 2 ? "1px solid var(--color-border-light)" : "none",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-primary)",
                      fontWeight: "var(--font-weight-medium)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={10} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              paddingTop: "var(--space-1)",
            }}
          >
            {action.source && <span>Source: {action.source}</span>}
            <span>Created: {new Date(action.created_at).toLocaleDateString()}</span>
            {action.completed_at && <span>Completed: {new Date(action.completed_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
