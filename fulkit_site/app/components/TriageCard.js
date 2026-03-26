"use client";

import { useState } from "react";
import { FileText, FolderOpen, CheckSquare, MessageCircle, Link2, ChevronDown, Check, Loader2, AlertCircle } from "lucide-react";
import { VAULT_FOLDERS } from "../lib/vault-writeback";
import { useAuth } from "../lib/auth";

// ─── Phase indicator (scanning/analyzing) ──────────────────────────

function ScanningState({ fileName, phase }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "var(--space-4)",
    }}>
      <div style={{
        width: 36, height: 36,
        borderRadius: "var(--radius-md)",
        background: "var(--color-accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "triage-pulse 1.5s ease-in-out infinite",
      }}>
        <FileText size={18} color="var(--color-text-inverse)" style={{ pointerEvents: "none" }} />
      </div>
      <div>
        <div style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-semibold)",
          color: "var(--color-text)",
          fontFamily: "var(--font-primary)",
        }}>
          {fileName}
        </div>
        <div style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          fontFamily: "var(--font-primary)",
        }}>
          {phase === "parsing" ? "Reading..." : "Analyzing..."}
        </div>
      </div>
    </div>
  );
}

// ─── Action button row ─────────────────────────────────────────────

function TriageAction({ icon: Icon, label, onClick, loading, done, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || done || disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        width: "100%",
        padding: "var(--space-2-5) var(--space-3)",
        background: done ? "var(--color-bg-elevated)" : "var(--color-accent)",
        color: done ? "var(--color-text-muted)" : "var(--color-text-inverse)",
        border: done ? "1px solid var(--color-border-light)" : "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        fontFamily: "var(--font-primary)",
        cursor: loading || done || disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background var(--duration-fast) var(--ease-default)",
      }}
      onMouseEnter={(e) => { if (!loading && !done && !disabled) e.currentTarget.style.background = "var(--color-accent-hover)"; }}
      onMouseLeave={(e) => { if (!loading && !done && !disabled) e.currentTarget.style.background = "var(--color-accent)"; }}
    >
      {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite", pointerEvents: "none" }} />
        : done ? <Check size={14} style={{ pointerEvents: "none" }} />
        : <Icon size={14} style={{ pointerEvents: "none" }} />}
      {label}
    </button>
  );
}

// ─── Folder selector dropdown ──────────────────────────────────────

function FolderPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const current = VAULT_FOLDERS.find((f) => f.id === selected) || VAULT_FOLDERS[0];

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-0-5) var(--space-2)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-xs)",
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-secondary)",
          fontFamily: "var(--font-primary)",
          cursor: "pointer",
        }}
      >
        <FolderOpen size={10} style={{ pointerEvents: "none" }} />
        {current.label}
        <ChevronDown size={10} style={{ pointerEvents: "none" }} />
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          marginTop: "var(--space-0-5)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-md)",
          zIndex: 20,
          minWidth: 180,
          padding: "var(--space-1) 0",
        }}>
          {VAULT_FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { onChange(f.id); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                padding: "var(--space-1-5) var(--space-3)",
                background: f.id === selected ? "var(--color-accent-soft)" : "none",
                border: "none",
                textAlign: "left",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { if (f.id !== selected) e.currentTarget.style.background = "var(--color-accent-soft)"; }}
              onMouseLeave={(e) => { if (f.id !== selected) e.currentTarget.style.background = "none"; }}
            >
              <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{f.id}</span>
              <span style={{ color: "var(--color-text-muted)", marginLeft: "var(--space-1-5)" }}>{f.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Connection (related note) ─────────────────────────────────────

function ConnectionItem({ note }) {
  return (
    <div style={{
      padding: "var(--space-1-5) var(--space-2)",
      background: "var(--color-bg-elevated)",
      borderRadius: "var(--radius-xs)",
      fontSize: "var(--font-size-2xs)",
      fontFamily: "var(--font-primary)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        color: "var(--color-text)",
        fontWeight: "var(--font-weight-medium)",
      }}>
        <Link2 size={10} style={{ pointerEvents: "none", flexShrink: 0 }} />
        {note.title}
        <span style={{ color: "var(--color-text-dim)", marginLeft: "auto", fontSize: "var(--font-size-2xs)" }}>
          {Math.round(note.similarity * 100)}%
        </span>
      </div>
      {note.snippet && (
        <div style={{
          color: "var(--color-text-muted)",
          marginTop: "var(--space-0-5)",
          lineHeight: "var(--line-height-normal)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}>
          {note.snippet}
        </div>
      )}
    </div>
  );
}

// ─── Main TriageCard ───────────────────────────────────────────────

export default function TriageCard({ result, onDiscuss, onFileComplete, accessToken }) {
  const [folder, setFolder] = useState(result.triage?.suggestedFolder || "00-INBOX");
  const [filing, setFiling] = useState(false);
  const [filed, setFiled] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [discussing, setDiscussing] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const [fileResult, setFileResult] = useState(null); // "Filed to Business" etc.
  const [extractResult, setExtractResult] = useState(null);

  const triage = result.triage;
  if (!triage) return null;

  const connections = result.connections || [];
  const hasActions = triage.actionItems && triage.actionItems.length > 0;

  // ─── Handlers ──────────────────────────────────────────────────

  async function handleFile() {
    setFiling(true);
    try {
      const res = await fetch("/api/notes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          notes: [{
            title: triage.suggestedTitle || result.fileName,
            content: result.rawContent || triage.summary,
            source: "triage",
            folder,
          }],
        }),
      });
      if (res.ok) {
        const folderLabel = VAULT_FOLDERS.find((f) => f.id === folder)?.label || folder;
        setFileResult(`Filed to ${folderLabel}`);
        setFiled(true);
        if (onFileComplete) onFileComplete(result.fileName, folder);
      }
    } catch { /* silent */ }
    setFiling(false);
  }

  async function handleExtractActions() {
    setExtracting(true);
    try {
      const actions = triage.actionItems || [];
      let saved = 0;
      for (const item of actions) {
        const res = await fetch("/api/notes/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            notes: [{
              title: item.text,
              content: `Action from triage: ${result.fileName}${item.dueDate ? `\nDue: ${item.dueDate}` : ""}`,
              source: "triage-action",
              folder: "00-INBOX",
            }],
          }),
        });
        if (res.ok) saved++;
      }
      setExtractResult(`${saved} action${saved !== 1 ? "s" : ""} saved`);
      setExtracted(true);
    } catch { /* silent */ }
    setExtracting(false);
  }

  function handleDiscuss() {
    setDiscussing(true);
    if (onDiscuss) {
      onDiscuss({
        fileName: result.fileName,
        content: result.rawContent,
        summary: triage.summary,
        fileType: result.fileType,
        fileData: result.fileData,
        fileMediaType: result.fileMediaType,
      });
    }
  }

  function handleConnect() {
    setShowConnections(!showConnections);
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div style={{
      background: "var(--color-bg-alt)",
      border: "1px solid var(--color-border-light)",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      maxWidth: 520,
    }}>
      {/* Header: doc type badge + folder + filename */}
      <div style={{
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        flexWrap: "wrap",
      }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-0-5) var(--space-2)",
          background: "var(--color-accent)",
          color: "var(--color-text-inverse)",
          borderRadius: "var(--radius-full)",
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          fontFamily: "var(--font-primary)",
          letterSpacing: "var(--letter-spacing-wide)",
          textTransform: "capitalize",
        }}>
          <FileText size={10} style={{ pointerEvents: "none" }} />
          {triage.documentType}
        </span>
        <FolderPicker selected={folder} onChange={setFolder} />
        <span style={{
          marginLeft: "auto",
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-dim)",
          fontFamily: "var(--font-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 150,
        }}>
          {result.fileName}
        </span>
      </div>

      {/* Summary */}
      <div style={{
        padding: "0 var(--space-4) var(--space-3)",
        fontSize: "var(--font-size-sm)",
        color: "var(--color-text)",
        lineHeight: "var(--line-height-relaxed)",
        fontFamily: "var(--font-primary)",
      }}>
        {triage.summary}
      </div>

      {/* Action items (if any) */}
      {hasActions && (
        <div style={{
          padding: "0 var(--space-4) var(--space-3)",
        }}>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            color: "var(--color-text-muted)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
            marginBottom: "var(--space-1)",
          }}>
            Action Items
          </div>
          {triage.actionItems.map((item, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-1-5)",
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-normal)",
              fontFamily: "var(--font-primary)",
              marginBottom: "var(--space-0-5)",
            }}>
              <CheckSquare size={12} style={{ marginTop: 2, flexShrink: 0, pointerEvents: "none", color: "var(--color-text-muted)" }} />
              <span>{item.text}{item.dueDate && <span style={{ color: "var(--color-text-dim)", marginLeft: "var(--space-1)" }}>({item.dueDate})</span>}</span>
            </div>
          ))}
        </div>
      )}

      {/* Key facts */}
      {triage.keyFacts && triage.keyFacts.length > 0 && (
        <div style={{
          padding: "0 var(--space-4) var(--space-3)",
        }}>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            color: "var(--color-text-muted)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
            marginBottom: "var(--space-1)",
          }}>
            Key Facts
          </div>
          {triage.keyFacts.map((fact, i) => (
            <div key={i} style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-normal)",
              fontFamily: "var(--font-primary)",
              marginBottom: "var(--space-0-5)",
              paddingLeft: "var(--space-2)",
            }}>
              {fact}
            </div>
          ))}
        </div>
      )}

      {/* Connections (expandable) */}
      {showConnections && connections.length > 0 && (
        <div style={{
          padding: "0 var(--space-4) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
        }}>
          <div style={{
            fontSize: "var(--font-size-2xs)",
            color: "var(--color-text-muted)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            letterSpacing: "var(--letter-spacing-wide)",
            textTransform: "uppercase",
            marginBottom: "var(--space-0-5)",
          }}>
            Related in Your Vault
          </div>
          {connections.map((note) => (
            <ConnectionItem key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Status messages */}
      {(fileResult || extractResult) && (
        <div style={{
          padding: "0 var(--space-4) var(--space-2)",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-success)",
          fontFamily: "var(--font-primary)",
        }}>
          {fileResult && <div>{fileResult}</div>}
          {extractResult && <div>{extractResult}</div>}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        padding: "var(--space-2) var(--space-4) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}>
        <TriageAction icon={FolderOpen} label={filed ? fileResult : "File it"} onClick={handleFile} loading={filing} done={filed} />
        <TriageAction icon={MessageCircle} label="Discuss it" onClick={handleDiscuss} loading={discussing} done={false} disabled={discussing} />
        {hasActions && (
          <TriageAction icon={CheckSquare} label={extracted ? extractResult : "Extract actions"} onClick={handleExtractActions} loading={extracting} done={extracted} />
        )}
        {connections.length > 0 && (
          <TriageAction
            icon={Link2}
            label={showConnections ? "Hide connections" : `Connect it (${connections.length} related)`}
            onClick={handleConnect}
            loading={false}
            done={false}
          />
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes triage-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Export the scanning state for use during streaming
export { ScanningState };
