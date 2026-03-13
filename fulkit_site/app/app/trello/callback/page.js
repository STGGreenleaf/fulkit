"use client";

import { useEffect, useState } from "react";

export default function TrelloCallback() {
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function processCallback() {
      try {
        // Extract token from hash fragment: #token=XXXXX
        const hash = window.location.hash;
        const token = hash.replace(/^#token=/, "");
        if (!token || token === hash) {
          throw new Error("No token in redirect");
        }

        // Extract state from query params
        const params = new URLSearchParams(window.location.search);
        const state = params.get("state");
        if (!state) {
          throw new Error("No state in redirect");
        }

        // POST to server-side save endpoint
        const res = await fetch("/api/trello/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, state }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save connection");
        }

        setStatus("success");
        window.location.href = "/settings/sources?trello=connected";
      } catch (err) {
        setError(err.message);
        setStatus("error");
        setTimeout(() => {
          window.location.href = `/settings/sources?trello=error&reason=${encodeURIComponent(err.message)}`;
        }, 2000);
      }
    }

    processCallback();
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      fontFamily: "var(--font-primary)",
      background: "var(--color-bg)",
      color: "var(--color-text)",
    }}>
      <div style={{ textAlign: "center" }}>
        {status === "connecting" && (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            Connecting Trello...
          </p>
        )}
        {status === "error" && (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-error)" }}>
            {error || "Connection failed"} — redirecting...
          </p>
        )}
      </div>
    </div>
  );
}
