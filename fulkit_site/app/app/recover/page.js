"use client";

import { useState, useEffect } from "react";

export default function RecoverPage() {
  const [sets, setSets] = useState(null);
  const [status, setStatus] = useState("");
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fulkit-sets");
      const parsed = raw ? JSON.parse(raw) : null;
      setSets(parsed);
    } catch {
      setSets(null);
    }
  }, [recovered]);

  const recover = async () => {
    setStatus("Fetching backup...");
    try {
      const res = await fetch("/api/recover-sets");
      const backup = await res.json();

      const raw = localStorage.getItem("fulkit-sets");
      const current = raw ? JSON.parse(raw) : { activeId: "set-1", sets: [] };

      const existing = current.sets.find((s) => s.name === backup.name);
      if (existing) {
        existing.tracks = backup.tracks;
      } else {
        current.sets.unshift({
          id: "set-electro-static",
          name: backup.name,
          tracks: backup.tracks,
        });
      }

      localStorage.setItem("fulkit-sets", JSON.stringify(current));
      setRecovered(true);
      setStatus(
        "Restored " + backup.name + " with " + backup.tracks.length + " tracks. Refresh Fabric to see them."
      );
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "'D-DIN', sans-serif", maxWidth: 600, margin: "0 auto" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#8A8784", marginBottom: 8 }}>
        Set Recovery
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#2A2826", marginBottom: 24 }}>
        Current Sets
      </h1>

      {sets?.sets?.length > 0 ? (
        <div style={{ marginBottom: 32 }}>
          {sets.sets.map((s) => (
            <div
              key={s.id}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #E5E2DD",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600, color: "#2A2826" }}>{s.name}</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: s.tracks.length === 0 ? "#C43B2E" : "#5C5955" }}>
                {s.tracks.length} tracks
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: "#8A8784", marginBottom: 32 }}>No sets found in localStorage.</div>
      )}

      <button
        onClick={recover}
        disabled={recovered}
        style={{
          display: "block",
          width: "100%",
          padding: "14px 0",
          background: recovered ? "#5C5955" : "#2A2826",
          color: "#EFEDE8",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'D-DIN', sans-serif",
          border: "none",
          borderRadius: 8,
          cursor: recovered ? "default" : "pointer",
          marginBottom: 16,
        }}
      >
        {recovered ? "Restored" : "Restore Electro Static (10 tracks from backup)"}
      </button>

      {status && (
        <div style={{ fontSize: 13, color: recovered ? "#2F8F4E" : "#5C5955", lineHeight: 1.5 }}>
          {status}
        </div>
      )}
    </div>
  );
}
