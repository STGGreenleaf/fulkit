"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const STATUS_URL = "https://status.claude.com/api/v2/status.json";
const POLL_INTERVAL = 60_000;

// Polls Anthropic's status page + accepts reactive markDown() calls from chat errors.
// isDown is true when Claude API is degraded, major, or critical — or when a chat request 5xx'd.
export function useClaudeStatus() {
  const [status, setStatus] = useState(null); // "none" | "minor" | "major" | "critical"
  const [description, setDescription] = useState(null);
  const [reactiveDown, setReactiveDown] = useState(false);
  const reactiveTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch(STATUS_URL, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setStatus(data.status?.indicator || "none");
        setDescription(data.status?.description || null);
        // Clear reactive flag if status page says all clear
        if (data.status?.indicator === "none") setReactiveDown(false);
      } catch {}
    };
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Called by use-chat when a streaming request fails with 5xx/network error
  const markDown = useCallback(() => {
    setReactiveDown(true);
    // Auto-clear after 60s (next poll will take over)
    clearTimeout(reactiveTimer.current);
    reactiveTimer.current = setTimeout(() => setReactiveDown(false), POLL_INTERVAL);
  }, []);

  const isDown = reactiveDown || (status && status !== "none");

  return { status, description, isDown, markDown };
}
