"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Plus, Check, Calendar, Tag, ArrowRightFromLine, ArrowLeftFromLine, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

const DEFAULT_STATUSES = [
  { key: "inbox", label: "Inbox" },
  { key: "active", label: "Active" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
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

export default function ThreadDetail({ note, isDev, onUpdate, onDelete, onClose, allLabels, columns, detailMode, onToggleDetailMode }) {
  const [checklistItems, setChecklistItems] = useState([]);
  const [newItemText, setNewItemText] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef(null);
  const labelRef = useRef(null);

  // Load checklist items (actions linked to this thread)
  useEffect(() => {
    if (isDev || !note?.id) {
      setChecklistItems([]);
      return;
    }
    supabase
      .from("actions")
      .select("id, title, status, priority")
      .eq("thread_id", note.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setChecklistItems(data);
      });
  }, [note?.id, isDev]);

  const updateField = useCallback((field, value) => {
    onUpdate(note.id, field, value);
  }, [note?.id, onUpdate]);

  const debouncedSave = useCallback((field, value) => {
    onUpdate(note.id, field, value);
  }, [note?.id, onUpdate]);

  // Toggle checklist item status
  const toggleChecklistItem = useCallback(async (actionId, currentStatus) => {
    const newStatus = currentStatus === "done" ? "active" : "done";
    setChecklistItems((prev) =>
      prev.map((a) => a.id === actionId ? { ...a, status: newStatus } : a)
    );
    if (!isDev) {
      const updates = { status: newStatus };
      if (newStatus === "done") updates.completed_at = new Date().toISOString();
      await supabase.from("actions").update(updates).eq("id", actionId);
    }
  }, [isDev]);

  // Add checklist item
  const addChecklistItem = useCallback(async () => {
    const title = newItemText.trim();
    if (!title) return;
    setNewItemText("");

    if (isDev) {
      setChecklistItems((prev) => [...prev, { id: String(Date.now()), title, status: "active" }]);
      return;
    }

    const { data } = await supabase
      .from("actions")
      .insert({
        user_id: note.user_id || undefined,
        title,
        status: "active",
        priority: 2,
        source: "Manual",
        thread_id: note.id,
      })
      .select("id, title, status, priority")
      .single();
    if (data) setChecklistItems((prev) => [...prev, data]);
  }, [newItemText, note?.id, note?.user_id, isDev]);

  // Add label
  const addLabel = useCallback((label) => {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return;
    const current = note.labels || [];
    if (current.includes(trimmed)) return;
    updateField("labels", [...current, trimmed]);
    setLabelInput("");
    setShowLabelPicker(false);
  }, [note?.labels, updateField]);

  // Remove label
  const removeLabel = useCallback((label) => {
    const current = note.labels || [];
    updateField("labels", current.filter((l) => l !== label));
  }, [note?.labels, updateField]);

  if (!note) return null;

  const labels = note.labels || [];
  const doneCount = checklistItems.filter((a) => a.status === "done").length;
  const totalCount = checklistItems.length;

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "var(--space-6)",
      position: "relative",
    }}>
      {/* Panel controls */}
      {onClose && (
        <div style={{
          position: "absolute",
          top: "var(--space-4)",
          right: "var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
        }}>
          {onDelete && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete thread"
              style={{
                display: "flex",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-dim)",
                padding: "var(--space-1)",
              }}
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          )}
          {onToggleDetailMode && (
            <button
              onClick={onToggleDetailMode}
              title={detailMode === "overlap" ? "Pop out to column" : "Overlap mode"}
              style={{
                display: "flex",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-dim)",
                padding: "var(--space-1)",
              }}
            >
              {detailMode === "overlap"
                ? <ArrowRightFromLine size={14} strokeWidth={1.8} />
                : <ArrowLeftFromLine size={14} strokeWidth={1.8} />
              }
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              display: "flex",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "var(--space-1)",
            }}
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-2) 0",
          marginBottom: "var(--space-2)",
        }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Delete?</span>
          <button
            onClick={() => { onDelete(note.id); setConfirmDelete(false); }}
            style={{
              fontSize: "var(--font-size-xs)",
              fontFamily: "var(--font-primary)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-error)",
              background: "none",
              border: "1px solid var(--color-error)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-1) var(--space-3)",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{
              fontSize: "var(--font-size-xs)",
              fontFamily: "var(--font-primary)",
              color: "var(--color-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "var(--space-1)",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Title */}
      <input
        value={note.title}
        onChange={(e) => debouncedSave("title", e.target.value)}
        style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-bold)",
          letterSpacing: "var(--letter-spacing-tight)",
          marginBottom: "var(--space-3)",
          width: "100%",
          background: "none",
          border: "none",
          outline: "none",
          padding: 0,
          color: "var(--color-text)",
          fontFamily: "var(--font-primary)",
        }}
      />

      {/* Status selector */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wider)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1)",
        }}>
          Status
        </div>
        <div style={{
          display: "flex",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-light)",
          overflow: "hidden",
        }}>
          {(columns || DEFAULT_STATUSES).map((s) => (
            <button
              key={s.key}
              onClick={() => updateField("status", s.key)}
              style={{
                flex: 1,
                padding: "var(--space-1-5) var(--space-1)",
                fontSize: "var(--font-size-2xs)",
                fontWeight: (note.status || "inbox") === s.key ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                fontFamily: "var(--font-primary)",
                background: (note.status || "inbox") === s.key ? "var(--color-accent)" : "transparent",
                color: (note.status || "inbox") === s.key ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
                border: "none",
                borderRight: "1px solid var(--color-border-light)",
                cursor: "pointer",
                transition: "all var(--duration-fast) var(--ease-default)",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due date */}
      <div style={{ marginBottom: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wider)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1)",
        }}>
          Due Date
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Calendar size={14} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
          <input
            type="date"
            value={note.due_date ? (note.due_date.length === 10 ? note.due_date : new Date(note.due_date).toISOString().split("T")[0]) : ""}
            onChange={(e) => updateField("due_date", e.target.value || null)}
            style={{
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-primary)",
              color: "var(--color-text)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-1-5) var(--space-2)",
              outline: "none",
            }}
          />
          {note.due_date && (
            <button
              onClick={() => updateField("due_date", null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-dim)",
                padding: 2,
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Labels */}
      <div style={{ marginBottom: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wider)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-1)",
        }}>
          Labels
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", alignItems: "center" }}>
          {labels.map((label) => (
            <span
              key={label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-muted)",
                background: "transparent",
                border: "none",
                borderRadius: 0,
                padding: "1px var(--space-1)",
                lineHeight: "18px",
              }}
            >
              /{label}
              <button
                onClick={() => removeLabel(label)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-dim)",
                  padding: 0,
                  display: "flex",
                  lineHeight: 1,
                }}
              >
                <X size={8} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {showLabelPicker ? (
            <div style={{ position: "relative" }} ref={labelRef}>
              <input
                autoFocus
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addLabel(labelInput);
                  if (e.key === "Escape") { setShowLabelPicker(false); setLabelInput(""); }
                }}
                onBlur={() => { setTimeout(() => { setShowLabelPicker(false); setLabelInput(""); }, 150); }}
                placeholder="Add label..."
                style={{
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-primary)",
                  width: 100,
                  padding: "1px var(--space-1-5)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-xs)",
                  background: "var(--color-bg-elevated)",
                  outline: "none",
                  color: "var(--color-text)",
                }}
              />
              {/* Suggestions from existing labels */}
              {labelInput && allLabels && allLabels.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 2,
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  zIndex: 20,
                  maxHeight: 120,
                  overflowY: "auto",
                  minWidth: 100,
                }}>
                  {allLabels
                    .filter((l) => l.includes(labelInput.toLowerCase()) && !labels.includes(l))
                    .slice(0, 5)
                    .map((l) => (
                      <button
                        key={l}
                        onMouseDown={(e) => { e.preventDefault(); addLabel(l); }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "var(--space-1) var(--space-2)",
                          fontSize: "var(--font-size-2xs)",
                          fontFamily: "var(--font-primary)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {l}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowLabelPicker(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-dim)",
                background: "none",
                border: "1px dashed var(--color-border-light)",
                borderRadius: "var(--radius-xs)",
                padding: "1px var(--space-1-5)",
                cursor: "pointer",
                lineHeight: "18px",
              }}
            >
              <Tag size={8} strokeWidth={2} />
            </button>
          )}
        </div>
        {/* Quick picks — top used labels when picker is open and input is empty */}
        {showLabelPicker && !labelInput && allLabels && allLabels.length > 0 && (() => {
          const picks = allLabels.filter((l) => !labels.includes(l)).slice(0, 5);
          if (picks.length === 0) return null;
          return (
            <div style={{
              display: "flex",
              gap: "var(--space-2)",
              marginTop: "var(--space-1-5)",
            }}>
              {picks.map((l) => (
                <button
                  key={l}
                  onMouseDown={(e) => { e.preventDefault(); addLabel(l); }}
                  style={{
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    color: "var(--color-text-dim)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  /{l}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Source + timestamp */}
      <div style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--color-text-dim)",
        marginBottom: "var(--space-4)",
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
          {note.source || "Manual"}
        </span>
        <span>·</span>
        <span>{timeAgo(note.created_at)}</span>
      </div>

      {/* Content */}
      <textarea
        value={note.content || ""}
        onChange={(e) => debouncedSave("content", e.target.value)}
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
          whiteSpace: "pre-wrap",
          width: "100%",
          minHeight: 200,
          background: "none",
          border: "none",
          outline: "none",
          padding: 0,
          resize: "none",
          fontFamily: "var(--font-primary)",
        }}
      />

      {/* Checklist */}
      <div style={{ marginTop: "var(--space-6)", borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-4)" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-3)",
        }}>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
          }}>
            Checklist {totalCount > 0 && `(${doneCount}/${totalCount})`}
          </div>
          {/* Progress bar */}
          {totalCount > 0 && (
            <div style={{
              width: 60,
              height: 4,
              background: "var(--color-border-light)",
              borderRadius: "var(--radius-full)",
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(doneCount / totalCount) * 100}%`,
                height: "100%",
                background: doneCount === totalCount ? "var(--color-success)" : "var(--color-text-muted)",
                borderRadius: "var(--radius-full)",
                transition: "width var(--duration-normal) var(--ease-default)",
              }} />
            </div>
          )}
        </div>

        {/* Items */}
        {checklistItems.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleChecklistItem(item.id, item.status)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-1-5) 0",
              cursor: "pointer",
            }}
          >
            <div style={{
              width: 16,
              height: 16,
              borderRadius: "var(--radius-xs)",
              border: item.status === "done" ? "none" : "1.5px solid var(--color-border)",
              background: item.status === "done" ? "var(--color-accent)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all var(--duration-fast) var(--ease-default)",
            }}>
              {item.status === "done" && <Check size={10} strokeWidth={2.5} style={{ color: "var(--color-text-inverse)" }} />}
            </div>
            <span style={{
              fontSize: "var(--font-size-sm)",
              color: item.status === "done" ? "var(--color-text-dim)" : "var(--color-text)",
              textDecoration: item.status === "done" ? "line-through" : "none",
            }}>
              {item.title}
            </span>
          </div>
        ))}

        {/* Add item input */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginTop: "var(--space-2)",
        }}>
          <Plus size={14} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addChecklistItem();
            }}
            placeholder="Add checklist item..."
            style={{
              flex: 1,
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-primary)",
              color: "var(--color-text)",
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "var(--space-1-5) 0",
            }}
          />
        </div>
      </div>

    </div>
  );
}
