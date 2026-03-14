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

function safeDate(str) {
  if (!str) return null;
  if (typeof str === "string" && str.length === 10) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(str);
}

function getUrgency(dueDate) {
  if (!dueDate) return null;
  const days = Math.ceil((safeDate(dueDate) - new Date()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 3) return "soon";
  return "on-track";
}

function UrgencyMeter({ urgency }) {
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
}

function formatDueDate(dueDate) {
  const d = safeDate(dueDate);
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
        borderLeft: active ? "3px solid var(--color-accent)" : "3px solid transparent",
        borderTop: dragOver ? "2px solid var(--color-text)" : "none",
        borderRight: "none",
        borderBottom: "1px solid var(--color-border-light)",
        borderRadius: 0,
        padding: compact ? "var(--space-2) var(--space-2-5)" : "var(--space-2-5) var(--space-3)",
        cursor: draggable ? "grab" : "pointer",
        boxShadow: "none",
        opacity: urgency === "overdue" ? 0.55 : 1,
        transition: "background var(--duration-fast) var(--ease-default), opacity var(--duration-fast) var(--ease-default)",
      }}
    >
      {/* Title row */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-2)",
      }}>
        <div style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: "var(--line-height-snug)",
          flex: 1,
        }}>
          {note.title}
        </div>
        {/* Urgency dot */}
        {urgency && (
          <span style={{ marginTop: 5 }}>
            <UrgencyMeter urgency={urgency} />
          </span>
        )}
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
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text-muted)",
                lineHeight: "18px",
              }}
            >
              /{label}
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
        marginTop: compact ? "var(--space-1)" : "var(--space-1-5)",
        gap: "var(--space-2)",
      }}>
        <span style={{
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-dim)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {compact ? timeAgo(note.created_at) : `${note.source || "Manual"} · ${timeAgo(note.created_at)}`}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexShrink: 0 }}>
          {totalCount > 0 && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              fontSize: "var(--font-size-2xs)",
              color: doneCount === totalCount ? "var(--color-text)" : "var(--color-text-muted)",
            }}>
              <Check size={10} strokeWidth={2} />
              {doneCount}/{totalCount}
            </span>
          )}

          {!compact && urgency && (
            <span style={{
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-muted)",
            }}>
              {formatDueDate(note.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
