"use client";

import { useState, useRef, useCallback } from "react";
import { Inbox, Zap, Loader, Eye, CheckCircle, Plus, X, MoreHorizontal } from "lucide-react";
import ThreadCard from "./ThreadCard";
import Tooltip from "./Tooltip";

const DEFAULT_ICONS = {
  inbox: Inbox,
  active: Zap,
  "in-progress": Loader,
  review: Eye,
  done: CheckCircle,
};

const DEFAULT_KEYS = new Set(["inbox", "active", "in-progress", "review", "done"]);

export default function ThreadBoard({ notes, columns, selectedId, onSelect, onUpdateNote, onMoveNote, onAddNote, onAddColumn, onRemoveColumn, compact }) {
  const [dragNoteId, setDragNoteId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverCardId, setDragOverCardId] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [menuColumn, setMenuColumn] = useState(null);
  const dragGhost = useRef(null);
  const dragNodeRef = useRef(null);

  // Group notes by status
  const grouped = {};
  for (const col of columns) grouped[col.key] = [];
  for (const note of notes) {
    const status = note.status || "inbox";
    if (grouped[status]) grouped[status].push(note);
    else grouped.inbox.push(note);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      // Overdue items sink to bottom
      const aOver = a.due_date && new Date(a.due_date) < new Date() ? 1 : 0;
      const bOver = b.due_date && new Date(b.due_date) < new Date() ? 1 : 0;
      if (aOver !== bOver) return aOver - bOver;
      return (a.position || 0) - (b.position || 0);
    });
  }

  const handleDragStart = useCallback((e, noteId) => {
    setDragNoteId(noteId);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;width:120px;height:32px;background:#D9D5CE;border:1px solid #CBC7C0;border-left:2px solid #2A2826;opacity:0.85;border-radius:6px;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 60, 16);
    dragGhost.current = ghost;
    setTimeout(() => { if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.2"; }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragNoteId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, []);

  const handleColumnDrop = useCallback((e, columnKey) => {
    e.preventDefault();
    if (!dragNoteId) return;
    // Drop on empty column area — move to end
    const cards = grouped[columnKey] || [];
    const lastPos = cards.length > 0 ? Math.max(...cards.map((c) => c.position || 0)) + 1 : 0;
    onMoveNote(dragNoteId, columnKey, lastPos);
    setDragNoteId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, [dragNoteId, onMoveNote, grouped]);

  const handleCardDragOver = useCallback((e, cardNoteId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCardId !== cardNoteId) setDragOverCardId(cardNoteId);
  }, [dragOverCardId]);

  const handleCardDrop = useCallback((e, targetNoteId, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragNoteId || dragNoteId === targetNoteId) return;
    // Find the target card's position in this column
    const cards = grouped[columnKey] || [];
    const targetIdx = cards.findIndex((c) => String(c.id) === String(targetNoteId));
    onMoveNote(dragNoteId, columnKey, targetIdx >= 0 ? targetIdx : 0);
    setDragNoteId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, [dragNoteId, onMoveNote, grouped]);

  const handleAddColumn = useCallback(() => {
    const name = newColumnName.trim();
    if (name && onAddColumn) {
      onAddColumn(name);
    }
    setNewColumnName("");
    setAddingColumn(false);
  }, [newColumnName, onAddColumn]);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      gap: 0,
      padding: "var(--space-4) var(--space-6)",
      overflowX: "auto",
      overflowY: "hidden",
    }}>
      {columns.map((col) => {
        const Icon = DEFAULT_ICONS[col.key] || null;
        const cards = grouped[col.key] || [];
        const isDropTarget = dragNoteId && dragOverColumn === col.key;
        const isCustom = !DEFAULT_KEYS.has(col.key);

        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverColumn !== col.key) setDragOverColumn(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null);
            }}
            onDrop={(e) => handleColumnDrop(e, col.key)}
            style={{
              flex: 1,
              minWidth: compact ? 180 : 200,
              display: "flex",
              flexDirection: "column",
              background: "transparent",
              borderRadius: 0,
              borderRight: "1px solid var(--color-border-light)",
              borderTop: isDropTarget ? "2px solid var(--color-text)" : "2px solid transparent",
              transition: "border-top var(--duration-fast) var(--ease-default)",
            }}
          >
            {/* Column header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1-5)",
              padding: compact ? "var(--space-2-5) var(--space-2-5)" : "var(--space-3) var(--space-3) var(--space-2)",
              position: "relative",
            }}>
              {Icon && (
                <Tooltip label={compact ? col.label : null}>
                  <span style={{ display: "flex", color: "var(--color-text-dim)" }}>
                    <Icon size={13} strokeWidth={1.6} />
                  </span>
                </Tooltip>
              )}
              {!compact && (
                <span style={{
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wider)",
                }}>
                  {col.label}
                </span>
              )}
              <span style={{
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-dim)",
                marginLeft: compact ? 0 : "auto",
              }}>
                {cards.length}
              </span>
              {/* Custom column menu */}
              {isCustom && (
                <div style={{ position: "relative", marginLeft: compact ? "auto" : 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuColumn(menuColumn === col.key ? null : col.key); }}
                    style={{
                      display: "flex",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-text-dim)",
                      padding: 2,
                      opacity: 0.5,
                    }}
                  >
                    <MoreHorizontal size={12} strokeWidth={2} />
                  </button>
                  {menuColumn === col.key && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        zIndex: 30,
                        minWidth: 120,
                        padding: "var(--space-1) 0",
                      }}
                      onMouseLeave={() => setMenuColumn(null)}
                    >
                      <button
                        onClick={() => { onRemoveColumn(col.key); setMenuColumn(null); }}
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
                        Delete column
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cards */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}>
              {cards.map((note) => (
                <ThreadCard
                  key={note.id}
                  note={note}
                  active={String(note.id) === String(selectedId)}
                  compact={compact}
                  onClick={() => onSelect(note.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, note.id)}
                  onDragOver={(e) => handleCardDragOver(e, note.id)}
                  onDrop={(e) => handleCardDrop(e, note.id, col.key)}
                  onDragEnd={handleDragEnd}
                  dragOver={dragNoteId && dragNoteId !== note.id && dragOverCardId === note.id}
                />
              ))}
              {cards.length === 0 && (
                <div style={{
                  padding: "var(--space-4) var(--space-2)",
                  fontSize: "var(--font-size-2xs)",
                  color: "var(--color-text-dim)",
                  textAlign: "center",
                }}>
                  {isDropTarget ? "Drop here" : ""}
                </div>
              )}
              {/* Per-column new thread button */}
              {onAddNote && (
                <button
                  onClick={() => onAddNote(col.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-1)",
                    width: "100%",
                    padding: "var(--space-2) var(--space-3)",
                    marginTop: "auto",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px dashed var(--color-border-light)",
                    cursor: "pointer",
                    color: "var(--color-text-dim)",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    transition: "color var(--duration-fast) var(--ease-default)",
                  }}
                >
                  <Plus size={10} strokeWidth={2} />
                  {!compact && "New thread"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add column button */}
      {onAddColumn && (
        <div style={{
          minWidth: addingColumn ? (compact ? 180 : 200) : 40,
          display: "flex",
          flexDirection: "column",
          alignItems: addingColumn ? "stretch" : "center",
          justifyContent: "flex-start",
          paddingTop: "var(--space-2-5)",
          transition: "min-width var(--duration-normal) var(--ease-default)",
        }}>
          {addingColumn ? (
            <div style={{
              background: "transparent",
              borderRadius: 0,
              padding: "var(--space-3)",
            }}>
              <input
                autoFocus
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setAddingColumn(false); setNewColumnName(""); }
                }}
                placeholder="Column name..."
                style={{
                  width: "100%",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 0,
                  padding: "var(--space-1-5) var(--space-2)",
                  outline: "none",
                  color: "var(--color-text)",
                  marginBottom: "var(--space-2)",
                }}
              />
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={handleAddColumn}
                  style={{
                    flex: 1,
                    padding: "var(--space-1-5)",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    fontWeight: "var(--font-weight-semibold)",
                    background: "var(--color-accent)",
                    color: "var(--color-text-inverse)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingColumn(false); setNewColumnName(""); }}
                  style={{
                    padding: "var(--space-1-5)",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    background: "none",
                    color: "var(--color-text-muted)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <Tooltip label="Add column">
              <button
                onClick={() => setAddingColumn(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  background: "transparent",
                  border: "1px dashed var(--color-border-light)",
                  borderRadius: 0,
                  cursor: "pointer",
                  color: "var(--color-text-dim)",
                  transition: "all var(--duration-fast) var(--ease-default)",
                }}
              >
                <Plus size={14} strokeWidth={2} />
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}
