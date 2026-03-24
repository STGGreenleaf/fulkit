"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function RecoverPage() {
  const [sets, setSets] = useState(null);
  const [backup, setBackup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imported, setImported] = useState(new Set());

  // Load current localStorage state
  const loadCurrent = () => {
    try {
      const raw = localStorage.getItem("fulkit-sets");
      setSets(raw ? JSON.parse(raw) : null);
    } catch { setSets(null); }
  };

  // Fetch backup from API on mount
  useEffect(() => {
    loadCurrent();
    fetch("/api/recover-sets")
      .then(r => r.json())
      .then(data => { setBackup(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const importSet = (backupSet) => {
    const raw = localStorage.getItem("fulkit-sets");
    const current = raw ? JSON.parse(raw) : { activeId: "set-1", sets: [] };

    const existing = current.sets.find(s => s.name === backupSet.name);
    if (existing) {
      existing.tracks = backupSet.tracks;
    } else {
      const id = `set-${Date.now()}`;
      current.sets.unshift({ id, name: backupSet.name, tracks: backupSet.tracks });
      if (!current.activeId) current.activeId = id;
    }

    localStorage.setItem("fulkit-sets", JSON.stringify(current));
    setImported(prev => new Set([...prev, backupSet.name]));
    loadCurrent();
  };

  const importAll = () => {
    if (!backup?.sets) return;
    const raw = localStorage.getItem("fulkit-sets");
    const current = raw ? JSON.parse(raw) : { activeId: "set-1", sets: [] };

    for (const backupSet of backup.sets) {
      const existing = current.sets.find(s => s.name === backupSet.name);
      if (existing) {
        existing.tracks = backupSet.tracks;
      } else {
        current.sets.unshift({ id: `set-${Date.now()}-${backupSet.name}`, name: backupSet.name, tracks: backupSet.tracks });
      }
    }

    if (!current.activeId || !current.sets.some(s => s.id === current.activeId)) {
      current.activeId = current.sets[0]?.id || "set-1";
    }

    localStorage.setItem("fulkit-sets", JSON.stringify(current));
    setImported(new Set(backup.sets.map(s => s.name)));
    loadCurrent();
  };

  const btnStyle = (active) => ({
    display: "block", width: "100%", padding: "14px 0",
    background: active ? "#2A2826" : "#5C5955",
    color: "#EFEDE8", fontSize: 14, fontWeight: 600,
    fontFamily: "'D-DIN', sans-serif", border: "none",
    borderRadius: 8, cursor: active ? "pointer" : "default",
    marginBottom: 8, textAlign: "center", textDecoration: "none",
  });

  return (
    <div style={{ padding: 40, fontFamily: "'D-DIN', sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#8A8784", marginBottom: 8 }}>
        Set Recovery
      </div>

      {/* Current state */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2A2826", marginBottom: 12 }}>Current Sets</h2>
      {sets?.sets?.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          {sets.sets.map(s => (
            <div key={s.id} style={{ padding: "10px 16px", borderBottom: "1px solid #E5E2DD", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600, color: "#2A2826" }}>{s.name}</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: s.tracks.length === 0 ? "#C43B2E" : "#5C5955" }}>
                {s.tracks.length} tracks
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#8A8784", marginBottom: 32 }}>No sets in localStorage.</div>
      )}

      {/* Available backups */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2A2826", marginBottom: 12 }}>Available Backups</h2>
      {loading ? (
        <div style={{ color: "#8A8784", marginBottom: 32 }}>Loading...</div>
      ) : backup?.sets?.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          {backup.sets.map(s => (
            <div key={s.name} style={{ padding: "12px 16px", borderBottom: "1px solid #E5E2DD", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, color: "#2A2826" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "#8A8784", marginTop: 2 }}>{s.tracks.map(t => t.title).join(", ")}</div>
              </div>
              <button
                onClick={() => importSet(s)}
                disabled={imported.has(s.name)}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "none", flexShrink: 0, marginLeft: 12,
                  background: imported.has(s.name) ? "#D4D1CC" : "#2A2826",
                  color: imported.has(s.name) ? "#8A8784" : "#EFEDE8",
                  fontSize: 11, fontWeight: 600, fontFamily: "'D-DIN', sans-serif",
                  cursor: imported.has(s.name) ? "default" : "pointer",
                }}
              >
                {imported.has(s.name) ? "Imported" : "Import"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#8A8784", marginBottom: 32 }}>No backups available.</div>
      )}

      {/* Import all */}
      {backup?.sets?.length > 0 && (
        <button onClick={importAll} disabled={imported.size === backup.sets.length} style={btnStyle(imported.size < backup.sets.length)}>
          {imported.size === backup.sets.length ? "All Imported" : "Import All"}
        </button>
      )}

      {/* Link to Fabric */}
      {imported.size > 0 && (
        <Link href="/fabric" style={{ ...btnStyle(true), display: "block", marginTop: 8 }}>
          Open Fabric
        </Link>
      )}
    </div>
  );
}
