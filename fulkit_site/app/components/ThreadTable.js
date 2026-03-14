"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, Inbox, Zap, Loader, Eye, CheckCircle } from "lucide-react";

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

function formatDate(dateStr) {
  if (!dateStr) return "\u2014";
  return safeDate(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const STATUS_CONFIG = {
  inbox:         { label: "Inbox",       Icon: Inbox },
  active:        { label: "Active",      Icon: Zap },
  "in-progress": { label: "In Progress", Icon: Loader },
  review:        { label: "Review",      Icon: Eye },
  done:          { label: "Done",        Icon: CheckCircle },
};

const COLUMNS = [
  { key: "title", label: "Title", flex: 3 },
  { key: "folder", label: "Folder", flex: 1 },
  { key: "status", label: "Status", flex: 1.2 },
  { key: "due_date", label: "Due", flex: 1 },
  { key: "labels", label: "Labels", flex: 1.5 },
  { key: "source", label: "Source", flex: 1 },
  { key: "created_at", label: "Created", flex: 1 },
];

export default function ThreadTable({ notes, selectedId, onSelect, onUpdateNote, columns, compact }) {
  const [sortKey, setSortKey] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...notes];
    arr.sort((a, b) => {
      let va = a[sortKey] || "";
      let vb = b[sortKey] || "";
      if (sortKey === "labels") { va = (a.labels || []).join(","); vb = (b.labels || []).join(","); }
      if (sortKey === "created_at" || sortKey === "due_date") { va = va ? safeDate(va).getTime() : 0; vb = vb ? safeDate(vb).getTime() : 0; }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return arr;
  }, [notes, sortKey, sortAsc]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      margin: "var(--space-4) var(--space-6)",
      border: "1px solid var(--color-border-light)",
      background: "var(--color-bg-elevated)",
    }}>
      {/* Header row */}
      <div style={{
        display: "flex",
        borderBottom: "2px solid var(--color-border-light)",
        background: "var(--color-bg-alt)",
      }}>
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => toggleSort(col.key)}
            style={{
              flex: col.flex,
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "var(--space-2) var(--space-3)",
              background: "none",
              border: "none",
              borderRight: "1px solid var(--color-border-light)",
              cursor: "pointer",
              fontSize: "var(--font-size-2xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              color: sortKey === col.key ? "var(--color-text)" : "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              textAlign: "left",
            }}
          >
            {col.label}
            {sortKey === col.key && (
              sortAsc
                ? <ArrowUp size={10} strokeWidth={2} />
                : <ArrowDown size={10} strokeWidth={2} />
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {sorted.map((note) => {
          const isActive = String(note.id) === String(selectedId);
          const urgency = getUrgency(note.due_date);
          const statusKey = note.status || "inbox";
          const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.inbox;
          return (
            <div
              key={note.id}
              onClick={() => onSelect(note.id)}
              style={{
                display: "flex",
                borderBottom: "1px solid var(--color-border-light)",
                background: isActive ? "var(--color-bg-alt)" : "transparent",
                borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                cursor: "pointer",
                opacity: urgency === "overdue" ? 0.55 : 1,
                transition: "background var(--duration-fast) var(--ease-default), opacity var(--duration-fast) var(--ease-default)",
              }}
            >
              {/* Title */}
              <div style={{
                flex: 3,
                padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-sm)",
                fontWeight: "var(--font-weight-medium)",
                color: "var(--color-text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                borderRight: "1px solid var(--color-border-light)",
              }}>
                {note.title}
              </div>

              {/* Folder */}
              <div style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                textTransform: "capitalize",
                borderRight: "1px solid var(--color-border-light)",
              }}>
                {note.folder}
              </div>

              {/* Status — icon + label */}
              <div style={{
                flex: 1.2,
                padding: "var(--space-2-5) var(--space-3)",
                display: "flex",
                alignItems: "center",
                borderRight: "1px solid var(--color-border-light)",
              }}>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-text-muted)",
                  letterSpacing: "var(--letter-spacing-wide)",
                }}>
                  {statusCfg.Icon && <statusCfg.Icon size={10} strokeWidth={1.8} />}
                  {statusCfg.label}
                </span>
              </div>

              {/* Due date */}
              <div style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                borderRight: "1px solid var(--color-border-light)",
              }}>
                <UrgencyMeter urgency={urgency} />
                {formatDate(note.due_date)}
              </div>

              {/* Labels — dot + text pattern */}
              <div style={{
                flex: 1.5,
                padding: "var(--space-2-5) var(--space-3)",
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-1-5)",
                borderRight: "1px solid var(--color-border-light)",
                overflow: "hidden",
                alignItems: "center",
              }}>
                {(note.labels || []).slice(0, 3).map((label) => (
                  <span key={label} style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}>
                    /{label}
                  </span>
                ))}
                {(note.labels || []).length > 3 && (
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                    +{note.labels.length - 3}
                  </span>
                )}
              </div>

              {/* Source */}
              <div style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-dim)",
                borderRight: "1px solid var(--color-border-light)",
              }}>
                {note.source}
              </div>

              {/* Created */}
              <div style={{
                flex: 1,
                padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-dim)",
              }}>
                {timeAgo(note.created_at)}
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div style={{
            padding: "var(--space-6) var(--space-4)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-dim)",
            textAlign: "center",
          }}>
            No threads to display
          </div>
        )}
      </div>
    </div>
  );
}
