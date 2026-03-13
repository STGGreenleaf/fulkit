"use client";

import { useState, useRef, useCallback } from "react";
import { Inbox, Zap, Loader, Eye, CheckCircle } from "lucide-react";
import ThreadCard from "./ThreadCard";
import Tooltip from "./Tooltip";

const COLUMNS = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "active", label: "Active", icon: Zap },
  { key: "in-progress", label: "In Progress", icon: Loader },
  { key: "review", label: "Review", icon: Eye },
  { key: "done", label: "Done", icon: CheckCircle },
];

export default function ThreadBoard({ notes, selectedId, onSelect, onUpdateNote, compact }) {
  // Drag state
  const [dragNoteId, setDragNoteId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const dragGhost = useRef(null);
  const dragNodeRef = useRef(null);

  // Group notes by status
  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];
  for (const note of notes) {
    const status = note.status || "inbox";
    if (grouped[status]) grouped[status].push(note);
    else grouped.inbox.push(note);
  }
  // Sort each column by position
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => (a.position || 0) - (b.position || 0));
  }

  const handleDragStart = useCallback((e, noteId) => {
    setDragNoteId(noteId);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    // Small ghost
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
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, []);

  const handleColumnDrop = useCallback((e, columnKey) => {
    e.preventDefault();
    if (!dragNoteId) return;
    // Move note to new column
    onUpdateNote(dragNoteId, "status", columnKey);
    setDragNoteId(null);
    setDragOverColumn(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, [dragNoteId, onUpdateNote]);

  return (
    <div style={{
      flex: 1,
      display: "flex",
      gap: "var(--space-3)",
      padding: "var(--space-4) var(--space-6)",
      overflowX: "auto",
      overflowY: "hidden",
    }}>
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const cards = grouped[col.key];
        const isDropTarget = dragNoteId && dragOverColumn === col.key;

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
              width: compact ? 220 : 280,
              minWidth: compact ? 220 : 280,
              display: "flex",
              flexDirection: "column",
              background: "var(--color-bg-alt)",
              borderRadius: "var(--radius-lg)",
              border: isDropTarget ? "2px dashed var(--color-border)" : "2px solid transparent",
              transition: "border var(--duration-fast) var(--ease-default)",
            }}
          >
            {/* Column header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1-5)",
              padding: compact ? "var(--space-2) var(--space-2-5)" : "var(--space-2-5) var(--space-3)",
            }}>
              <Tooltip label={compact ? col.label : null}>
                <span style={{ display: "flex", color: "var(--color-text-muted)" }}>
                  <Icon size={14} strokeWidth={1.8} />
                </span>
              </Tooltip>
              {!compact && (
                <span style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text)",
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
            </div>

            {/* Cards */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: `0 ${compact ? "var(--space-1-5)" : "var(--space-2)"} var(--space-2)`,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
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
                  onDragEnd={handleDragEnd}
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
