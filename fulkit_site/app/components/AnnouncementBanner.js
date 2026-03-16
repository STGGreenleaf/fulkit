"use client";

import { useState, useEffect } from "react";
import { X, Megaphone } from "lucide-react";

const STORAGE_KEY = "fulkit.announcements.seen";

function getSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function markSeen(id) {
  const seen = getSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);

  useEffect(() => {
    fetch("/api/broadcasts/active")
      .then(r => r.ok ? r.json() : [])
      .then(items => {
        const seen = getSeenIds();
        const unseen = items.filter(a => !seen.includes(a.id));
        if (unseen.length > 0) setAnnouncement(unseen[0]);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (announcement) markSeen(announcement.id);
    setAnnouncement(null);
  };

  if (!announcement) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 998,
      background: "var(--color-bg-inverse)",
      color: "var(--color-text-inverse)",
      fontFamily: "var(--font-primary)",
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        padding: "var(--space-2-5) var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
      }}>
        <Megaphone size={14} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.7 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            marginBottom: 1,
          }}>
            {announcement.title}
          </div>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            opacity: 0.8,
            lineHeight: "var(--line-height-relaxed)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {announcement.content.split("\n")[0]}
          </div>
        </div>
        <button
          onClick={dismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "var(--space-1)",
            display: "flex",
            color: "var(--color-text-inverse)",
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
