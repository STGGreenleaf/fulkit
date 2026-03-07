"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Plus, X, Clock, Check, MoreHorizontal, ArrowDown, ArrowUp, Minus } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

const FILTERS = ["active", "done", "deferred", "dismissed"];

const DEV_ACTIONS = [
  { id: "1", title: "Review Q1 budget draft", source: "Obsidian", status: "active", priority: 1, parent_id: null, created_at: "2026-02-28T10:00:00Z" },
  { id: "2", title: "Send Mike the revised proposal", source: "Chat", status: "active", priority: 2, parent_id: null, created_at: "2026-03-01T14:00:00Z" },
  { id: "3", title: "Book dentist appointment", source: "Whisper", status: "active", priority: 3, parent_id: null, created_at: "2026-03-02T09:00:00Z" },
  { id: "4", title: "Follow up with Sarah", source: "Chat", status: "done", priority: null, parent_id: null, created_at: "2026-02-25T11:00:00Z", completed_at: "2026-03-01T16:00:00Z" },
  { id: "5", title: "Cancel old subscription", source: "Whisper", status: "dismissed", priority: null, parent_id: null, created_at: "2026-02-20T08:00:00Z" },
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

export default function Actions() {
  const { user } = useAuth();
  const isDev = user?.isDev;

  const [actions, setActions] = useState([]);
  const [filter, setFilter] = useState("active");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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

  const filtered = (isDev ? DEV_ACTIONS : actions).filter((a) => a.status === filter);
  const counts = {};
  for (const f of FILTERS) {
    counts[f] = (isDev ? DEV_ACTIONS : actions).filter((a) => a.status === f).length;
  }

  async function updateStatus(id, status) {
    const updates = { status };
    if (status === "done") updates.completed_at = new Date().toISOString();
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, ...updates } : a));
    if (!isDev) {
      await supabase.from("actions").update(updates).eq("id", id);
    }
  }

  async function addAction() {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setAdding(false);

    if (isDev) {
      setActions((prev) => [...prev, { id: crypto.randomUUID(), title, source: "Manual", status: "active", priority: null, parent_id: null, created_at: new Date().toISOString() }]);
      return;
    }

    const { data } = await supabase
      .from("actions")
      .insert({ user_id: user.id, title, source: "manual", status: "active" })
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
                  onClick={() => setFilter(f)}
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

              {/* Action list */}
              {filtered.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {filtered.map((action) => (
                    <ActionRow
                      key={action.id}
                      action={action}
                      filter={filter}
                      onUpdateStatus={updateStatus}
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

function ActionRow({ action, filter, onUpdateStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const actions = [];
  if (filter !== "done") actions.push({ label: "Complete", status: "done", icon: Check, color: "var(--color-success)" });
  if (filter !== "deferred") actions.push({ label: "Defer", status: "deferred", icon: Clock, color: "var(--color-warning)" });
  if (filter !== "dismissed") actions.push({ label: "Dismiss", status: "dismissed", icon: X, color: "var(--color-text-muted)" });
  if (filter !== "active") actions.push({ label: "Reactivate", status: "active", icon: ArrowUp, color: "var(--color-accent)" });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2-5) var(--space-4)",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-md)",
        position: "relative",
      }}
    >
      {/* Quick complete checkbox (active only) */}
      {filter === "active" && (
        <div
          onClick={() => onUpdateStatus(action.id, "done")}
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

      {/* Action menu */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
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
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9 }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 4,
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              zIndex: 10,
              minWidth: 140,
              overflow: "hidden",
            }}
          >
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => {
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
  );
}
