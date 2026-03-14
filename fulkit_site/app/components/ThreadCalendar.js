"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  const weeks = [];
  let day = 1 - startDay;
  while (day <= totalDays) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (day >= 1 && day <= totalDays) {
        week.push(new Date(year, month, day));
      } else {
        week.push(null);
      }
      day++;
    }
    weeks.push(week);
  }
  return weeks;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}


export default function ThreadCalendar({ notes, selectedId, onSelect, onUpdateNote, onAddNote, compact }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dragNoteId, setDragNoteId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const dragGhost = useRef(null);
  const dragNodeRef = useRef(null);

  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const notesByDate = useMemo(() => {
    const map = {};
    for (const note of notes) {
      if (note.due_date) {
        const d = safeDate(note.due_date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(note);
      }
    }
    return map;
  }, [notes]);

  const unscheduled = useMemo(() => notes.filter((n) => !n.due_date), [notes]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  // Drag handlers
  const handleDragStart = useCallback((e, noteId) => {
    setDragNoteId(noteId);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
    const ghost = document.createElement("div");
    ghost.style.cssText = "position:fixed;top:-100px;left:-100px;width:100px;height:24px;background:#D9D5CE;border:1px solid #CBC7C0;opacity:0.85;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 50, 12);
    dragGhost.current = ghost;
    setTimeout(() => { if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.3"; }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragNoteId(null);
    setDragOverDate(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, []);

  const handleDayDrop = useCallback((e, date) => {
    e.preventDefault();
    if (!dragNoteId || !date) return;
    onUpdateNote(dragNoteId, "due_date", toDateString(date));
    setDragNoteId(null);
    setDragOverDate(null);
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "1";
    if (dragGhost.current) { dragGhost.current.remove(); dragGhost.current = null; }
  }, [dragNoteId, onUpdateNote]);

  // Double-click day to create thread
  const handleDayDoubleClick = useCallback((date) => {
    if (!date || !onAddNote) return;
    onAddNote("inbox", toDateString(date));
  }, [onAddNote]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "var(--space-4) var(--space-6)" }}>
      {/* Month nav */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        marginBottom: "var(--space-4)",
      }}>
        <button onClick={prevMonth} style={{
          display: "flex", background: "none", border: "1px solid var(--color-border-light)",
          borderRadius: 0, cursor: "pointer", padding: "var(--space-1)", color: "var(--color-text-muted)",
        }}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <span style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text)",
          minWidth: 160,
          textAlign: "center",
        }}>
          {monthLabel}
        </span>
        <button onClick={nextMonth} style={{
          display: "flex", background: "none", border: "1px solid var(--color-border-light)",
          borderRadius: 0, cursor: "pointer", padding: "var(--space-1)", color: "var(--color-text-muted)",
        }}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--color-border-light)" }}>
          {DAYS.map((d) => (
            <div key={d} style={{
              padding: "var(--space-1-5) var(--space-2)",
              fontSize: "var(--font-size-2xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              textAlign: "center",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              flex: 1,
              minHeight: 80,
              borderBottom: "1px solid var(--color-border-light)",
            }}>
              {week.map((date, di) => {
                if (!date) return <div key={di} style={{ background: "var(--color-bg-alt)", borderRight: "1px solid var(--color-border-light)" }} />;
                const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                const dayNotes = notesByDate[key] || [];
                const isToday = sameDay(date, today);
                const isDragOver = dragNoteId && dragOverDate === key;
                return (
                  <div
                    key={di}
                    onDoubleClick={() => handleDayDoubleClick(date)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverDate !== key) setDragOverDate(key);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDate(null);
                    }}
                    onDrop={(e) => handleDayDrop(e, date)}
                    style={{
                      borderRight: "1px solid var(--color-border-light)",
                      padding: "var(--space-1)",
                      background: isDragOver ? "var(--color-bg-alt)" : isToday ? "var(--color-bg-alt)" : "transparent",
                      borderTop: isDragOver ? "2px solid var(--color-text)" : "2px solid transparent",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      cursor: "default",
                      overflow: "hidden",
                      transition: "background var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    <span style={{
                      fontSize: "var(--font-size-2xs)",
                      fontWeight: isToday ? "var(--font-weight-bold)" : "var(--font-weight-medium)",
                      color: isToday ? "var(--color-text)" : "var(--color-text-muted)",
                      textAlign: "right",
                      padding: "0 var(--space-1)",
                    }}>
                      {date.getDate()}
                    </span>
                    {dayNotes.slice(0, 3).map((note) => {
                      const urgency = getUrgency(note.due_date);
                      const isActive = String(note.id) === String(selectedId);
                      return (
                        <button
                          key={note.id}
                          draggable
                          onClick={(e) => { e.stopPropagation(); onSelect(note.id); }}
                          onDragStart={(e) => handleDragStart(e, note.id)}
                          onDragEnd={handleDragEnd}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            width: "100%",
                            padding: "2px var(--space-1)",
                            background: isActive ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                            borderLeft: isActive ? "2px solid var(--color-accent)" : "2px solid transparent",
                            borderTop: "none",
                            borderRight: "none",
                            borderBottom: "none",
                            borderRadius: 0,
                            cursor: "grab",
                            textAlign: "left",
                            fontSize: "var(--font-size-2xs)",
                            fontFamily: "var(--font-primary)",
                            color: "var(--color-text)",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            opacity: urgency === "overdue" ? 0.55 : 1,
                          }}
                        >
                          <UrgencyMeter urgency={urgency} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{note.title}</span>
                        </button>
                      );
                    })}
                    {dayNotes.length > 3 && (
                      <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", paddingLeft: "var(--space-1)" }}>
                        +{dayNotes.length - 3} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Unscheduled — draggable */}
      {unscheduled.length > 0 && (
        <div style={{
          borderTop: "1px solid var(--color-border-light)",
          paddingTop: "var(--space-3)",
          marginTop: "var(--space-2)",
        }}>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            marginBottom: "var(--space-2)",
          }}>
            Unscheduled ({unscheduled.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1-5)", maxHeight: 60, overflow: "auto" }}>
            {unscheduled.map((note) => (
              <button
                key={note.id}
                draggable
                onClick={() => onSelect(note.id)}
                onDragStart={(e) => handleDragStart(e, note.id)}
                onDragEnd={handleDragEnd}
                style={{
                  padding: "2px var(--space-2)",
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-primary)",
                  background: String(note.id) === String(selectedId) ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: 0,
                  cursor: "grab",
                  color: "var(--color-text)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                }}
              >
                {note.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
