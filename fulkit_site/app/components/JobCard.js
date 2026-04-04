"use client";

import { useState, useEffect, useRef } from "react";
import { Check, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/auth";

const TYPE_LABELS = {
  inventory_update: "Inventory Update",
  price_change: "Price Change",
  "86_batch": "86 Batch",
  qb_reconcile: "QuickBooks Reconciliation",
  invoice_batch: "Invoice Batch",
  shopify_sync: "Shopify Sync",
  catalog_import: "Catalog Import",
};

export default function JobCard({ jobId, type, total: initialTotal }) {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState("queued");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(initialTotal || 0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!jobId || !accessToken) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/status?id=${jobId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
        setProgress(data.progress || 0);
        setTotal(data.total || initialTotal || 0);
        if (data.result) setResult(data.result);
        if (data.error) setError(data.error);

        // Stop polling when done
        if (["done", "failed", "partial"].includes(data.status)) {
          clearInterval(intervalRef.current);
        }
      } catch {}
    };

    poll(); // Immediate first poll
    intervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(intervalRef.current);
  }, [jobId, accessToken, initialTotal]);

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  const label = TYPE_LABELS[type] || type;
  const isDone = status === "done";
  const isFailed = status === "failed";
  const isPartial = status === "partial";
  const isRunning = status === "running" || status === "queued";

  return (
    <div style={{
      background: "var(--color-bg-elevated)",
      border: `1px solid ${isFailed ? "var(--color-error-soft, rgba(196,59,46,0.15))" : "var(--color-border-light)"}`,
      borderRadius: "var(--radius-md)",
      padding: "var(--space-3) var(--space-4)",
      marginTop: "var(--space-2)",
      maxWidth: 420,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-2)",
        marginBottom: "var(--space-2)",
      }}>
        {isDone && <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-success)" }} />}
        {isPartial && <AlertTriangle size={14} strokeWidth={2} style={{ color: "var(--color-warning)" }} />}
        {isFailed && <AlertTriangle size={14} strokeWidth={2} style={{ color: "var(--color-error)" }} />}
        <span style={{
          fontSize: "var(--font-size-xs)",
          fontWeight: "var(--font-weight-semibold)",
          color: isDone ? "var(--color-success)" : isFailed ? "var(--color-error)" : "var(--color-text)",
        }}>
          {isDone ? `${label} Complete` : isFailed ? `${label} Failed` : isPartial ? `${label} — ${result?.updated || 0}/${total}` : label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4,
        borderRadius: "var(--radius-full)",
        background: "var(--color-border-light)",
        overflow: "hidden",
        marginBottom: "var(--space-1-5)",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: "var(--radius-full)",
          background: isFailed ? "var(--color-error)" : isPartial ? "var(--color-warning)" : "var(--color-accent)",
          transition: "width 400ms ease",
        }} />
      </div>

      {/* Counter */}
      <div style={{
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        color: "var(--color-text-dim)",
        marginBottom: isRunning ? 0 : "var(--space-1)",
      }}>
        {progress}/{total}
        {isRunning && <span style={{ marginLeft: "var(--space-2)" }}>Running...</span>}
      </div>

      {/* Result summary */}
      {isDone && result && (
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
          All {result.total} items updated.
        </div>
      )}

      {/* Error / partial failure */}
      {(isFailed || isPartial) && error && (
        <div style={{ fontSize: "var(--font-size-xs)", color: isFailed ? "var(--color-error)" : "var(--color-warning)", marginTop: "var(--space-1)" }}>
          {error}
        </div>
      )}

      {/* Retry button for partial/failed */}
      {(isFailed || isPartial) && (
        <button
          onClick={() => {
            fetch("/api/jobs/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ job_id: jobId }),
            }).catch(() => {});
            setStatus("queued");
            setProgress(0);
            // Restart polling
            intervalRef.current = setInterval(async () => {
              try {
                const res = await fetch(`/api/jobs/status?id=${jobId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
                if (!res.ok) return;
                const data = await res.json();
                setStatus(data.status);
                setProgress(data.progress || 0);
                if (data.result) setResult(data.result);
                if (data.error) setError(data.error);
                if (["done", "failed", "partial"].includes(data.status)) clearInterval(intervalRef.current);
              } catch {}
            }, 3000);
          }}
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-1)",
            marginTop: "var(--space-2)",
            padding: "var(--space-1-5) var(--space-3)",
            background: "none", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)", fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-primary)", color: "var(--color-text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}
