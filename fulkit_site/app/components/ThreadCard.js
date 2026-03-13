"use client";

import { Check } from "lucide-react";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getUrgency(dueDate) {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "on-track";
}

const URGENCY_COLORS = {
  overdue: "var(--color-error)",
  soon: "var(--color-warning)",
  "on-track": "var(--color-success)",
};

function formatDueDate(dueDate) {
  const d = new Date(dueDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ThreadCard({ note, active, compact, onClick, draggable, onDragStart, onDragOver, onDrop, onDragEnd, dragOver }) {
  const urgency = getUrgency(note.due_date);
  const labels = note.labels || [];
  const actions = note.actions || [];
  const doneCount = actions.filter((a) => a.status === "done").length;
  const totalCount = actions.length;

  return (
    <div
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: active ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
        border: active ? "1px solid var(--color-border)" : dragOver ? "1px dashed var(--color-border)" : "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-lg)",
        padding: compact ? "var(--space-2)" : "var(--space-3)",
        cursor: draggable ? "grab" : "pointer",
        transition: "all var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Title */}
      <div style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text)",
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        lineHeight: "var(--line-height-snug)",
      }}>
        {note.title}
      </div>

      {/* Labels — max 3 visible */}
      {!compact && labels.length > 0 && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-1)",
          marginTop: "var(--space-1-5)",
        }}>
          {labels.slice(0, 3).map((label) => (
            <span
              key={label}
              style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-text-muted)",
                background: "var(--color-bg-alt)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-xs)",
                padding: "0 var(--space-1-5)",
                lineHeight: "18px",
              }}
            >
              {label}
            </span>
          ))}
          {labels.length > 3 && (
            <span style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              lineHeight: "18px",
            }}>
              +{labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row — source + metadata */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: compact ? "var(--space-1)" : "var(--space-2)",
        gap: "var(--space-2)",
      }}>
        {/* Source badge */}
        <span style={{
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-dim)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {compact ? timeAgo(note.created_at) : `${note.source || "Manual"} · ${timeAgo(note.created_at)}`}
        </span>

        {/* Right indicators */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
          {/* Checklist count */}
          {totalCount > 0 && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              fontSize: "var(--font-size-2xs)",
              color: doneCount === totalCount ? "var(--color-success)" : "var(--color-text-muted)",
            }}>
              <Check size={10} strokeWidth={2} />
              {doneCount}/{totalCount}
            </span>
          )}

          {/* Due date + urgency dot */}
          {urgency && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-muted)",
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: "var(--radius-full)",
                background: URGENCY_COLORS[urgency],
                flexShrink: 0,
              }} />
              {!compact && formatDueDate(note.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
