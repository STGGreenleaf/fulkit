"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Palette,
  Users,
  Share2,
  Image,
  Crown,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Copy,
  Check as CheckIcon,
  Upload,
  FileText,
  Music,
  GamepadDirectional,
  RefreshCw,
  X,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import LoadingMark from "../../components/LoadingMark";

const TAB_ICON_SIZE = 14;

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "questions", label: "Questions", icon: ClipboardList },
  { id: "design", label: "Design", icon: Palette },
  { id: "users", label: "Users", icon: Users },
  { id: "socials", label: "Socials", icon: Share2 },
  { id: "og", label: "OG Creator", icon: Image },
  { id: "fabric", label: "Fabric", icon: Music },
  { id: "playground", label: "Playground", icon: GamepadDirectional },
  { id: "notes", label: "Notes", icon: FileText },
];

const VALID_TAB_IDS = TABS.map((t) => t.id);

/* ─── DevToggle (pill switch for dev mode) ─── */
function DevToggle({ compact }) {
  const [on, setOn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fulkit-dev-mode") === "true";
    }
    return false;
  });

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem("fulkit-dev-mode", String(next));
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "var(--font-size-2xs)",
        color: "var(--color-text-muted)",
        fontFamily: "var(--font-primary)",
      }}
      title="Dev mode"
    >
      {!compact && <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Dev</span>}
      <div
        style={{
          width: 22,
          height: 12,
          borderRadius: 6,
          border: "1px solid var(--color-text-muted)",
          background: on ? "var(--color-text-muted)" : "transparent",
          position: "relative",
          transition: "all var(--duration-fast) var(--ease-default)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: on ? "var(--color-bg)" : "var(--color-text-muted)",
            position: "absolute",
            top: 1,
            left: on ? 11 : 1,
            transition: "left var(--duration-fast) var(--ease-default)",
          }}
        />
      </div>
    </button>
  );
}

/* ─── OwnerPanel: reusable inner content (used by Settings > Owner tab) ─── */
export function OwnerPanel({ initialTab, urlPrefix = "/owner" }) {
  const { compactMode } = useAuth();
  const [tab, setTab] = useState(initialTab && VALID_TAB_IDS.includes(initialTab) ? initialTab : "dashboard");

  useEffect(() => {
    if (initialTab && VALID_TAB_IDS.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Sub-tab bar + DevToggle right-justified */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-3) var(--space-6)",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Tooltip key={t.id} label={null}>
              <button
                onClick={() => {
                  setTab(t.id);
                  window.history.replaceState({}, "", `${urlPrefix}/${t.id}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1-5)",
                  padding: "var(--space-2-5) var(--space-3)",
                  border: "none",
                  outline: "none",
                  background: active ? "var(--color-bg-alt)" : "transparent",
                  borderRadius: "var(--radius-md)",
                  color: active ? "var(--color-text)" : "var(--color-text-muted)",
                  fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  cursor: "pointer",
                  transition: `all var(--duration-fast) var(--ease-default)`,
                }}
              >
                <t.icon size={TAB_ICON_SIZE} strokeWidth={1.8} />
                {!compactMode && t.label}
              </button>
            </Tooltip>
          );
        })}
        <div style={{ marginLeft: "auto" }}>
          <DevToggle compact={compactMode} />
        </div>
      </div>

      {/* Sub-tab content — full width */}
      <div style={{ padding: "0 var(--space-6) var(--space-6)" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "questions" && <QuestionsTab />}
        {tab === "design" && <DesignTab />}
        {tab === "users" && <PlaceholderTab title="Users" description="Invite tree, usage stats, revenue per user. Coming soon." />}
        {tab === "socials" && <PlaceholderTab title="Socials" description="Social post templates, scheduling, brand voice. Coming soon." />}
        {tab === "og" && <PlaceholderTab title="OG Image Creator" description="Template editor with brand tokens. Coming soon." />}
        {tab === "fabric" && <FabricTab />}
        {tab === "playground" && <PlaygroundTab />}
        {tab === "notes" && <NotesTab />}
      </div>
    </div>
  );
}

/* ─── Standalone /owner page ─── */
export default function Owner({ initialTab }) {
  const { isOwner, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isOwner) router.replace("/");
  }, [loading, isOwner, router]);

  return (
    <AuthGuard>
      <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <OwnerPanel initialTab={initialTab} urlPrefix="/owner" />
        </div>
      </div>
    </AuthGuard>
  );
}

function DashboardTab() {
  const { accessToken } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [mdFiles, setMdFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [discovered, setDiscovered] = useState(false);

  // Folder assignment based on path
  const getFolder = (path) => {
    if (path.includes("Audio_Crate")) return "02-AUDIO";
    if (path.includes("numbrly") || path.includes("truegauge")) return "03-INTEGRATIONS";
    return "01-PROJECT";
  };

  // Title from filename
  const getTitle = (name) => name.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  // Discover all .md files from GitHub
  const discoverDocs = useCallback(async () => {
    setLoadingFiles(true);
    setImportResult(null);
    try {
      const allFiles = [];
      const fetchDir = async (dirPath) => {
        const res = await fetch(`/api/github/tree?repo=STGGreenleaf/fulkit&path=${dirPath}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return [];
        return await res.json();
      };

      // Fetch md/ directory
      const mdItems = await fetchDir("fulkit_site/md");
      for (const item of mdItems) {
        if (item.type === "dir") {
          // Skip archive directory
          if (item.name === "archive") continue;
          const subItems = await fetchDir(item.path);
          for (const sub of subItems) {
            if (sub.name.endsWith(".md")) allFiles.push(sub);
          }
        } else if (item.name.endsWith(".md")) {
          allFiles.push(item);
        }
      }

      // Also include CLAUDE.md and TODO.md from fulkit_site/
      const rootItems = await fetchDir("fulkit_site");
      for (const item of rootItems) {
        if (["CLAUDE.md", "TODO.md"].includes(item.name)) {
          allFiles.push(item);
        }
      }

      setMdFiles(allFiles);
      setSelectedFiles(new Set(allFiles.map(f => f.path)));
      setDiscovered(true);
    } catch (err) {
      setImportResult({ error: "Failed to discover docs: " + err.message });
    } finally {
      setLoadingFiles(false);
    }
  }, [accessToken]);

  const toggleFile = (path) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const importDocs = async () => {
    if (selectedFiles.size === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const notes = [];
      for (const filePath of selectedFiles) {
        try {
          const res = await fetch(`/api/github/file?repo=STGGreenleaf/fulkit&path=${filePath}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) continue;
          const { content } = await res.json();
          const name = filePath.split("/").pop();
          if (content) notes.push({ title: getTitle(name), content, source: "import", folder: getFolder(filePath) });
        } catch { /* skip failed files */ }
      }

      if (notes.length === 0) {
        setImportResult({ error: "No files fetched. Is GitHub connected?" });
        return;
      }

      const res = await fetch("/api/notes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ success: `${data.imported} docs imported as notes` });
      } else {
        setImportResult({ error: data.error });
      }
    } catch (err) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const metrics = [
    { label: "Total Users", value: "1", change: "You" },
    { label: "Active This Week", value: "1", change: "100%" },
    { label: "Messages Today", value: "0", change: "—" },
    { label: "MRR", value: "$0", change: "Pre-launch" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-8)" }}>
        {metrics.map((m, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-4)",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>
              {m.value}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>
              {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* Dogfood Tools */}
      <div
        style={{
          padding: "var(--space-4)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <FileText size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
            Dogfood Tools
          </span>
        </div>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-3)" }}>
          Discover and import project docs from GitHub so F\u00FClkit can reference them in chat.
        </p>

        {!discovered ? (
          <button
            onClick={discoverDocs}
            disabled={loadingFiles}
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              background: loadingFiles ? "var(--color-bg-elevated)" : "var(--color-accent)",
              color: loadingFiles ? "var(--color-text-muted)" : "var(--color-text-inverse)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              cursor: loadingFiles ? "wait" : "pointer",
            }}
          >
            <RefreshCw size={14} strokeWidth={2} style={loadingFiles ? { animation: "spin 1s linear infinite" } : {}} />
            {loadingFiles ? "Discovering..." : "Discover docs from GitHub"}
          </button>
        ) : (
          <>
            <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
              <button
                onClick={() => setSelectedFiles(new Set(mdFiles.map(f => f.path)))}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  background: "transparent", border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  background: "transparent", border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                Deselect all
              </button>
              <button
                onClick={discoverDocs}
                disabled={loadingFiles}
                style={{
                  padding: "var(--space-1) var(--space-3)",
                  background: "transparent", border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                  marginLeft: "auto",
                }}
              >
                <RefreshCw size={10} strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle", ...(loadingFiles ? { animation: "spin 1s linear infinite" } : {}) }} />
                Refresh
              </button>
            </div>

            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: "var(--space-3)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" }}>
              {mdFiles.map((file) => {
                const name = file.path.split("/").pop();
                const dir = file.path.includes("Audio_Crate") ? "Audio_Crate/" : file.path.includes("/md/") ? "md/" : "";
                return (
                  <label
                    key={file.path}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-2)",
                      padding: "var(--space-2) var(--space-3)",
                      borderBottom: "1px solid var(--color-border-light)",
                      cursor: "pointer",
                      background: selectedFiles.has(file.path) ? "var(--color-bg-elevated)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={() => toggleFile(file.path)}
                      style={{ accentColor: "var(--color-text-primary)" }}
                    />
                    <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)", flex: 1 }}>
                      {dir && <span style={{ color: "var(--color-text-dim)", fontSize: "var(--font-size-xs)" }}>{dir}</span>}
                      {name}
                    </span>
                    <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
                      {file.size > 1024 ? `${Math.round(file.size / 1024)}KB` : `${file.size}B`}
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              onClick={importDocs}
              disabled={importing || selectedFiles.size === 0}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                background: importing || selectedFiles.size === 0 ? "var(--color-bg-elevated)" : "var(--color-accent)",
                color: importing || selectedFiles.size === 0 ? "var(--color-text-muted)" : "var(--color-text-inverse)",
                border: "none", borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
                cursor: importing || selectedFiles.size === 0 ? "default" : "pointer",
              }}
            >
              <Upload size={14} strokeWidth={2} />
              {importing ? "Importing..." : `Import ${selectedFiles.size} doc${selectedFiles.size !== 1 ? "s" : ""}`}
            </button>
          </>
        )}

        {importResult?.success && (
          <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-success)" }}>{importResult.success}</div>
        )}
        {importResult?.error && (
          <div style={{ marginTop: "var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-error)" }}>{importResult.error}</div>
        )}
      </div>

      <div
        style={{
          padding: "var(--space-4)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        This is your command center. Metrics, user management, design tools, and content creation — all here. Tabs will fill in as we build them out.
      </div>
    </div>
  );
}

/* ─── Design System / Brand Guide ─── */

const SECTION_LABEL = {
  fontSize: 9,
  fontFamily: "var(--font-mono)",
  fontWeight: "var(--font-weight-medium)",
  textTransform: "uppercase",
  letterSpacing: "var(--letter-spacing-widest)",
  color: "var(--color-text-dim)",
  marginBottom: "var(--space-5)",
};

const SECTION_RULE = {
  borderTop: "1px solid var(--color-border-light)",
  paddingTop: "var(--space-8)",
  marginTop: "var(--space-8)",
};

function SwatchRow({ label, token, hex }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "var(--radius-sm)",
        background: hex, border: "1px solid var(--color-border-light)",
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>{label}</div>
        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
          {token}
        </div>
      </div>
      <div style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", flexShrink: 0 }}>
        {hex}
      </div>
    </div>
  );
}

function TypeSample({ label, size, weight, family, sample }) {
  return (
    <div style={{ marginBottom: "var(--space-5)" }}>
      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)", letterSpacing: "var(--letter-spacing-wider)", textTransform: "uppercase" }}>
        {label} — {size} / {weight}
      </div>
      <div style={{
        fontSize: size, fontWeight: weight, fontFamily: family || "var(--font-primary)",
        lineHeight: "var(--line-height-tight)", color: "var(--color-text)",
      }}>
        {sample || "The wave does not decorate. It responds."}
      </div>
    </div>
  );
}

function SpacingBlock({ label, size, px }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1-5)" }}>
      <div style={{
        width: px, height: 12, background: "var(--color-text)", borderRadius: 1,
        minWidth: 2, opacity: 0.25,
      }} />
      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", minWidth: 60 }}>
        {label}
      </div>
      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
        {px}px
      </div>
    </div>
  );
}

function DesignTab() {
  return (
    <div>

      {/* ═══ MASTHEAD ═══ */}
      <div style={{ marginBottom: "var(--space-12)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontSize: 64, fontWeight: "var(--font-weight-black)",
            fontFamily: "var(--font-primary)", letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: 1, color: "var(--color-text)", marginBottom: "var(--space-3)",
          }}>
            Fülkit
          </div>
          <div style={{
            fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)",
            textTransform: "uppercase", letterSpacing: "var(--letter-spacing-widest)",
            color: "var(--color-text-dim)",
          }}>
            Brand &amp; Design System
          </div>
        </div>
        <DesignExportButton />
      </div>

      {/* ═══ BRAND IDENTITY ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Brand Identity</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", lineHeight: 1, marginBottom: "var(--space-3)" }}>
              Fülkit
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-4)" }}>
              The <span style={{ fontWeight: "var(--font-weight-semibold)" }}>ü</span> (diaeresis/umlaut) is the brand mark.
              Pronunciation: "Fühl-kit" — German: <em>fühl</em> = to feel. Fülkit = feel-kit.
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              The two dots work as a standalone visual mark. Intentional, European, designed.
              The logotype IS the logo — the F with diaeresis. No separate icon needed.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Taglines
            </div>
            {[
              { label: "Primary", text: "I'll be your bestie." },
              { label: "Secondary", text: "Let's chat and get shit done." },
              { label: "Formal", text: "Your second brain, fully loaded." },
              { label: "Action", text: "Get Fülkit." },
            ].map((t) => (
              <div key={t.label} style={{ marginBottom: "var(--space-2)" }}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>{t.text}</div>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{t.label}</div>
              </div>
            ))}
            <div style={{ marginTop: "var(--space-4)", fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              Logo Variants
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              Full wordmark ("Fülkit") · Icon mark ("F" with dots) · Monochrome
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PHILOSOPHY ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Philosophy</div>
        <div style={{
          fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)",
          lineHeight: "var(--line-height-snug)", color: "var(--color-text)",
          marginBottom: "var(--space-4)", maxWidth: 560,
        }}>
          Warm monochrome. One color family at varying lightness. Ink on warm paper.
        </div>
        <div style={{
          fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)", maxWidth: 560,
        }}>
          The palette is a single warm-grey family — #2A2826 through #EFEDE8. Every surface, text value,
          border, and accent lives on this axis. The only color permitted is functional: semantic states
          (success, warning, error) and source indicators. If it's not a status signal, it's grey.
          No decorative color. No accent hues. No brand colors on UI elements.
        </div>

        <div style={{
          marginTop: "var(--space-6)", padding: "var(--space-4)",
          background: "var(--color-bg-inverse)", borderRadius: "var(--radius-lg)",
        }}>
          <div style={{
            fontSize: "var(--font-size-sm)", color: "var(--color-text-inverse)",
            fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", opacity: 0.8,
          }}>
            "As little design as possible. Less, but better — because it concentrates on the essential
            aspects, and the products are not burdened with non-essentials."
          </div>
          <div style={{
            fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-inverse)",
            opacity: 0.4, marginTop: "var(--space-2)", textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
          }}>
            Dieter Rams
          </div>
        </div>

        <div style={{ marginTop: "var(--space-6)" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            Design Heritage
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)" }}>
            {[
              { era: "1931", label: "DIN Standard", note: "German Institute for Standardization. Road signs, technical docs. Our typeface DNA." },
              { era: "1919", label: "Bauhaus", note: "Form follows function. Grid systems. The ü itself says 'this has German DNA.'" },
              { era: "1950s", label: "Swiss Style", note: "International Typographic Style. Grids, hierarchy through weight, clarity." },
              { era: "1960s", label: "Braun / Rams", note: "Less but better. Industrial design as restraint. Our visual north star." },
            ].map((h) => (
              <div key={h.label} style={{
                padding: "var(--space-3)", background: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-light)",
              }}>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>{h.era}</div>
                <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>{h.label}</div>
                <div style={{ fontSize: 9, color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>{h.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ COLOR PALETTE ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Color Palette</div>

        {/* Full gradient bar */}
        <div style={{
          display: "flex", height: 48, borderRadius: "var(--radius-md)",
          overflow: "hidden", marginBottom: "var(--space-6)",
          border: "1px solid var(--color-border-light)",
        }}>
          {[
            { hex: "#2A2826", flex: 1 },
            { hex: "#5C5955", flex: 1 },
            { hex: "#8A8784", flex: 1 },
            { hex: "#B0ADA8", flex: 1 },
            { hex: "#D4D1CC", flex: 1 },
            { hex: "#E5E2DD", flex: 1 },
            { hex: "#E7E4DF", flex: 1 },
            { hex: "#EFEDE8", flex: 1 },
            { hex: "#F5F3F0", flex: 1 },
          ].map((c, i) => (
            <div key={i} style={{ flex: c.flex, background: c.hex }} />
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)" }}>
          {/* Backgrounds */}
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Surfaces
            </div>
            <SwatchRow label="Background" token="--color-bg" hex="#EFEDE8" />
            <SwatchRow label="Alt Surface" token="--color-bg-alt" hex="#E7E4DF" />
            <SwatchRow label="Elevated" token="--color-bg-elevated" hex="#F5F3F0" />
            <SwatchRow label="Inverse" token="--color-bg-inverse" hex="#2A2826" />
          </div>

          {/* Text */}
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Text
            </div>
            <SwatchRow label="Primary" token="--color-text" hex="#2A2826" />
            <SwatchRow label="Secondary" token="--color-text-secondary" hex="#5C5955" />
            <SwatchRow label="Muted" token="--color-text-muted" hex="#8A8784" />
            <SwatchRow label="Dim" token="--color-text-dim" hex="#B0ADA8" />
          </div>
        </div>

        {/* Borders */}
        <div style={{ marginTop: "var(--space-6)" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            Borders &amp; Accents
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)" }}>
            <div>
              <SwatchRow label="Border" token="--color-border" hex="#D4D1CC" />
              <SwatchRow label="Border Light" token="--color-border-light" hex="#E5E2DD" />
              <SwatchRow label="Focus Ring" token="--color-border-focus" hex="#2A2826" />
            </div>
            <div>
              <SwatchRow label="Accent" token="--color-accent" hex="#2A2826" />
              <SwatchRow label="Accent Hover" token="--color-accent-hover" hex="#1A1816" />
              <SwatchRow label="Accent Active" token="--color-accent-active" hex="#111010" />
            </div>
          </div>
        </div>

        {/* Functional color — the only exceptions */}
        <div style={{ marginTop: "var(--space-8)" }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
            Functional Color — the only exceptions
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)", lineHeight: "var(--line-height-normal)" }}>
            Color is never decorative. It appears in exactly three contexts. Everywhere else is grey.
          </div>

          {/* 1. Semantic states */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
              1. Semantic States
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-normal)" }}>
              Status signals only. Each has a soft variant (6-8% opacity) for tint backgrounds.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
              {[
                { label: "Success", hex: "#2F8F4E", soft: "#2F8F4E12", uses: "Connected, synced, profitable, confirmed" },
                { label: "Warning", hex: "#C4890A", soft: "#C4890A12", uses: "Syncing, nearing limit, caution" },
                { label: "Error", hex: "#C43B2E", soft: "#C43B2E12", uses: "Failed, over budget, disconnected" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "var(--space-3)", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-light)" }}>
                  <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginBottom: "var(--space-2)" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "var(--radius-sm)", background: s.hex }} />
                    <div style={{ width: 24, height: 24, borderRadius: "var(--radius-sm)", background: s.soft, border: "1px solid var(--color-border-light)" }} />
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{s.hex}</div>
                  <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: "var(--space-1)", lineHeight: "var(--line-height-relaxed)" }}>{s.uses}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Source indicators */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
              2. Source Indicator Dots
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-normal)" }}>
              6-8px colored dots identifying content origin. Used in note lists, file browsers, sync status. Dots only — never as fill, border, or accent.
            </div>
            <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
              {[
                { label: "Obsidian", hex: "#7C3AED" },
                { label: "Google Drive", hex: "#16A34A" },
                { label: "Dropbox", hex: "#2563EB" },
                { label: "iCloud", hex: "#3B82F6" },
                { label: "Fülkit", hex: "#2A2826" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "var(--radius-full)", background: s.hex }} />
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{s.label}</div>
                  <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{s.hex}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Third-party hover */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
              3. Third-Party Icon Hover
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              Third-party brand icons (Dropbox, Drive, Obsidian, iCloud, Anthropic) render in monochrome
              (<span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}>--color-text</span> or <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}>--color-text-muted</span>).
              On hover, their brand color appears at 30-40% opacity for recognition.
              Only in: source selector, connected sources list, import flow, BYOK connect screen.
            </div>
          </div>

          {/* Never colored */}
          <div style={{
            padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-inverse)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-inverse)", opacity: 0.5, marginBottom: "var(--space-2)" }}>
              Never colored
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-inverse)", opacity: 0.7, lineHeight: "var(--line-height-relaxed)" }}>
              Nav items, buttons, headers, borders, backgrounds, badges, tags, charts, progress bars, focus rings, icons (at rest), text. All warm monochrome. No exceptions.
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TYPOGRAPHY ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Typography</div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)", marginBottom: "var(--space-8)",
        }}>
          <div>
            <div style={{
              fontSize: 40, fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-primary)",
              lineHeight: 1, marginBottom: "var(--space-2)",
            }}>
              Aa
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
              D-DIN
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              Primary typeface. German industrial heritage, 1931. Designed for clarity at any size.
              Upgrade path to DIN Pro when licensed.
            </div>
          </div>
          <div>
            <div style={{
              fontSize: 40, fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)",
              lineHeight: 1, marginBottom: "var(--space-2)",
            }}>
              01
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>
              JetBrains Mono
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              Data, code, timestamps, labels. Monospaced for alignment.
              Used in all technical readouts.
            </div>
          </div>
        </div>

        {/* Type scale */}
        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Type Scale
        </div>

        <TypeSample label="Hero" size="48px" weight="900" sample="Fülkit" />
        <TypeSample label="Marketing" size="36px" weight="700" sample="Your second brain, fully loaded." />
        <TypeSample label="Page Title" size="22px" weight="700" sample="Settings" />
        <TypeSample label="Section Header" size="16px" weight="600" sample="Connected Sources" />
        <TypeSample label="Body" size="14px" weight="400" sample="The wave does not decorate. It responds. No chrome, no gradients, no glow unless earned by real signal." />
        <TypeSample label="Small" size="12px" weight="500" sample="Last synced 4 minutes ago" />
        <TypeSample label="Caption" size="11px" weight="500" sample="ENERGY · DANCE · MOOD" family="var(--font-mono)" />
        <TypeSample label="Fine Print" size="10px" weight="400" sample="v1.0 · fulkit.app" family="var(--font-mono)" />

        {/* Weight scale */}
        <div style={{ marginTop: "var(--space-6)", fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Weight Scale
        </div>
        {[
          { w: 400, label: "Normal", sample: "Body text, descriptions" },
          { w: 500, label: "Medium", sample: "Labels, emphasized body" },
          { w: 600, label: "Semibold", sample: "Sub-headers, active states" },
          { w: 700, label: "Bold", sample: "Headers, strong emphasis" },
          { w: 900, label: "Black", sample: "Hero numbers, KPIs" },
        ].map((r) => (
          <div key={r.w} style={{ display: "flex", alignItems: "baseline", gap: "var(--space-4)", marginBottom: "var(--space-2)" }}>
            <div style={{ fontSize: "var(--font-size-lg)", fontWeight: r.w, width: 180 }}>{r.sample}</div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
              {r.w} · {r.label}
            </div>
          </div>
        ))}

        {/* Font exploration */}
        <div style={{ marginTop: "var(--space-8)", fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Font Exploration
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-4)" }}>
          All options share the same German/Swiss industrial lineage. DIN Pro is the default. D-DIN is the free prototype fallback.
        </div>
        {[
          { name: "DIN Pro", origin: "Germany, 1931", vibe: "Industrial, engineered, functional", weights: "Thin→Black (9)", license: "Commercial", note: "German road signs, railway timetables, government docs", default: true },
          { name: "Futura", origin: "Germany, 1927", vibe: "Geometric, modernist, Bauhaus", weights: "Light→ExtraBold (7)", license: "Commercial", note: "2001: A Space Odyssey, Supreme logo, Wes Anderson" },
          { name: "Neue Haas Grotesk", origin: "Switzerland, 1957", vibe: "The original Helvetica", weights: "Thin→Black (9)", license: "Commercial", note: "Renamed to Helvetica — lost its Swiss-German identity" },
          { name: "FF Meta", origin: "Germany, 1991", vibe: "Humanist, warm, anti-Helvetica", weights: "Thin→Black (9)", license: "Commercial", note: "Spiekermann designed it for the German Post Office" },
          { name: "GT Walsheim", origin: "Switzerland, 2010", vibe: "Geometric, quirky, modern", weights: "Thin→Black (7)", license: "Commercial", note: "Named after Swiss typographer Otto Walsheim" },
          { name: "FF DIN", origin: "Germany, 2010", vibe: "Definitive digital DIN revival", weights: "Light→Black (8)", license: "Commercial", note: "Pool studied original DIN metal type specimens" },
          { name: "D-DIN", origin: "Open source", vibe: "Close to DIN, slightly less refined", weights: "Regular→Bold (3)", license: "Free", note: "Prototype fallback — swap for real DIN later", active: true },
          { name: "Barlow", origin: "Open source", vibe: "Industrial, wide, confident", weights: "Thin→Black (9)", license: "Free", note: "Inspired by California highway signs — DIN's cousin" },
          { name: "IBM Plex Sans", origin: "International, 2017", vibe: "Industrial, neutral, engineered", weights: "Thin→Bold (7)", license: "Free", note: "IBM's engineering identity — shares DIN's ethos" },
          { name: "Outfit", origin: "Open source", vibe: "Clean, modern, geometric", weights: "Thin→Black (9)", license: "Free", note: "Full weight range, solid DIN alternative" },
        ].map((f) => (
          <div key={f.name} style={{
            display: "grid", gridTemplateColumns: "140px 1fr", gap: "var(--space-3)",
            padding: "var(--space-2) 0",
            borderBottom: "1px solid var(--color-border-light)",
            opacity: f.default || f.active ? 1 : 0.7,
          }}>
            <div>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                {f.name}
                {f.default && <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginLeft: "var(--space-1-5)" }}>DEFAULT</span>}
                {f.active && <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginLeft: "var(--space-1-5)" }}>ACTIVE</span>}
              </div>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{f.origin}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>{f.vibe}</div>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 2 }}>
                {f.weights} · {f.license} · {f.note}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ SPACING ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Spacing Scale</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
          <div>
            {[
              { label: "--space-0-5", px: 2 },
              { label: "--space-1", px: 4 },
              { label: "--space-1-5", px: 6 },
              { label: "--space-2", px: 8 },
              { label: "--space-2-5", px: 10 },
              { label: "--space-3", px: 12 },
              { label: "--space-3-5", px: 14 },
              { label: "--space-4", px: 16 },
            ].map((s) => <SpacingBlock key={s.label} {...s} />)}
          </div>
          <div>
            {[
              { label: "--space-5", px: 20 },
              { label: "--space-6", px: 24 },
              { label: "--space-8", px: 32 },
              { label: "--space-10", px: 40 },
              { label: "--space-12", px: 48 },
              { label: "--space-16", px: 64 },
              { label: "--space-20", px: 80 },
              { label: "--space-24", px: 96 },
            ].map((s) => <SpacingBlock key={s.label} {...s} />)}
          </div>
        </div>
      </div>

      {/* ═══ RADII ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Border Radius</div>
        <div style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-end", flexWrap: "wrap" }}>
          {[
            { label: "xs", px: 4, size: 32 },
            { label: "sm", px: 6, size: 36 },
            { label: "md", px: 8, size: 40 },
            { label: "lg", px: 10, size: 48 },
            { label: "xl", px: 14, size: 56 },
            { label: "2xl", px: 20, size: 64 },
            { label: "full", px: 9999, size: 48 },
          ].map((r) => (
            <div key={r.label} style={{ textAlign: "center" }}>
              <div style={{
                width: r.size, height: r.size,
                border: "2px solid var(--color-text)",
                borderRadius: r.px, opacity: 0.2,
                marginBottom: "var(--space-2)",
              }} />
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                {r.label}
              </div>
              <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                {r.px === 9999 ? "pill" : `${r.px}px`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ SHADOWS ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Elevation</div>
        <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
          {[
            { label: "xs", shadow: "0 1px 2px rgba(42,40,38,0.04)" },
            { label: "sm", shadow: "0 1px 3px rgba(42,40,38,0.06), 0 1px 2px rgba(42,40,38,0.04)" },
            { label: "md", shadow: "0 4px 6px rgba(42,40,38,0.06), 0 2px 4px rgba(42,40,38,0.04)" },
            { label: "lg", shadow: "0 10px 15px rgba(42,40,38,0.08), 0 4px 6px rgba(42,40,38,0.04)" },
            { label: "xl", shadow: "0 20px 25px rgba(42,40,38,0.10), 0 10px 10px rgba(42,40,38,0.04)" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{
                width: 72, height: 72, background: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-lg)", boxShadow: s.shadow,
                marginBottom: "var(--space-2)",
              }} />
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ MOTION ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Motion</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Duration
            </div>
            {[
              { label: "Fast", token: "--duration-fast", value: "100ms", use: "Hover, toggles" },
              { label: "Normal", token: "--duration-normal", value: "200ms", use: "Most transitions" },
              { label: "Slow", token: "--duration-slow", value: "300ms", use: "Panel slides" },
              { label: "Slower", token: "--duration-slower", value: "500ms", use: "Page transitions" },
              { label: "Slowest", token: "--duration-slowest", value: "800ms", use: "Whisper fade" },
            ].map((d) => (
              <div key={d.label} style={{ display: "flex", gap: "var(--space-3)", alignItems: "baseline", marginBottom: "var(--space-1-5)" }}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", width: 60 }}>{d.label}</div>
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", width: 48 }}>{d.value}</div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{d.use}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Easing
            </div>
            {[
              { label: "Default", value: "cubic-bezier(0.22, 1, 0.36, 1)", use: "Smooth deceleration" },
              { label: "Bounce", value: "cubic-bezier(0.34, 1.56, 0.64, 1)", use: "Playful overshoot" },
              { label: "In", value: "cubic-bezier(0.4, 0, 1, 1)", use: "Accelerating exit" },
              { label: "Out", value: "cubic-bezier(0, 0, 0.2, 1)", use: "Decelerating entry" },
            ].map((e) => (
              <div key={e.label} style={{ marginBottom: "var(--space-2)" }}>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "baseline" }}>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{e.label}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{e.use}</div>
                </div>
                <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{e.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ VOICE ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Voice &amp; Tone</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-8)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
              I'll be your bestie.
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Warm but not chatty. Has initiative. Permission-based personality.
              The kind of friend who remembers what you said three weeks ago and brings it up
              at exactly the right moment.
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>Do: </span>
                Be direct. Be useful. Anticipate.
              </div>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>Don't: </span>
                Over-explain. Apologize. Use filler.
              </div>
              <div>
                <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>Never: </span>
                Feel like software talking.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ GUARDRAILS ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Guardrails</div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)",
        }}>
          {[
            "No raw color values — everything uses var(--token)",
            "No decorative color — grey or functional only",
            "No CSS modules, Tailwind, or styled-components",
            "No arbitrary font sizes — scale only",
            "No arbitrary spacing — scale only",
            "Hover states auto-derived (darken 10%)",
            "All icons from Lucide React, 18px default",
            "Heroes/titles left-aligned, never centered",
            "Brand mark always links to /",
          ].map((rule, i) => (
            <div key={i} style={{
              fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)",
              padding: "var(--space-2-5) var(--space-3)",
              background: "var(--color-bg-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-light)",
              lineHeight: "var(--line-height-normal)",
            }}>
              {rule}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ ICONS ═══ */}
      <div style={SECTION_RULE}>
        <div style={SECTION_LABEL}>Icon System</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>Lucide React</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Every icon comes from one library. 18px default, 1.8px stroke. Color inherits from parent via text tokens. Interactive icons use ghost button wrappers.
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>Third-Party Marks</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Their mark, our vibe. Render third-party logos in monochrome (--color-text or --color-text-muted). Match Lucide at 18px/1.8px. Brand color only as 30-40% opacity hover tint.
            </div>
          </div>
        </div>
        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          Curated Pool
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
          {[
            { cat: "Navigation", icons: "Home, MessageCircle, Mic, Search, Settings, Menu, ChevronRight, X, ArrowLeft" },
            { cat: "Notes & Knowledge", icons: "FileText, FolderOpen, BookOpen, PenTool, Bookmark, Hash, Link, Layers" },
            { cat: "Actions & Status", icons: "Check, Plus, ArrowRight, RefreshCw, Upload, Download, Trash2, Clock, Bell" },
            { cat: "AI & Intelligence", icons: "Sparkles, Zap, Brain, Lightbulb, Eye, Wand2" },
            { cat: "People & Social", icons: "User, Users, UserPlus, Heart, Gift" },
            { cat: "Data & Business", icons: "BarChart3, TrendingUp, TrendingDown, CreditCard, Shield, Key" },
          ].map((g) => (
            <div key={g.cat} style={{
              padding: "var(--space-2-5) var(--space-3)",
              background: "var(--color-bg-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-light)",
            }}>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1-5)" }}>
                {g.cat}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                {g.icons}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: "var(--space-4)", padding: "var(--space-3)",
          background: "var(--color-bg-inverse)", borderRadius: "var(--radius-md)",
        }}>
          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-inverse)", opacity: 0.5, marginBottom: "var(--space-1-5)" }}>
            Easter Eggs
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-inverse)", opacity: 0.7, lineHeight: "var(--line-height-relaxed)" }}>
            Compass (Bauhaus purity) · Hexagon (DIN standards) · Target (German engineering) · Ruler (standardization) · Grid3x3 (Swiss grid)
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{
        marginTop: "var(--space-12)", paddingTop: "var(--space-8)",
        borderTop: "1px solid var(--color-border-light)", textAlign: "center",
      }}>
        <div style={{
          fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-widest)", color: "var(--color-text-dim)",
        }}>
          Fülkit Design System · v1.0 · fulkit.app
        </div>
      </div>
    </div>
  );
}

function DesignExportButton() {
  const [copied, setCopied] = useState(false);

  const designJSON = JSON.stringify({
    brand: {
      name: "Fülkit",
      url: "fulkit.app",
      pronunciation: "Fühl-kit (German: fühl = to feel)",
      mark: "The ü — diaeresis as design element. German DNA without being literal.",
      taglines: {
        primary: "I'll be your bestie.",
        secondary: "Your second brain, fully loaded.",
        formal: "The AI-powered knowledge companion.",
        cta: "Get Fülkit",
      },
      logo: {
        style: "Typographic — the logotype IS the logo",
        variants: ["Full wordmark (Fülkit)", "Icon mark (F with diaeresis)", "Monochrome"],
      },
      voice: "Warm but not chatty. Direct. Anticipates. Permission-based personality.",
    },
    philosophy: {
      approach: "Warm monochrome",
      description: "One color family — warm grey (#2A2826 → #EFEDE8). The only color permitted is functional: semantic states and source indicators. If it's not a status signal, it's grey.",
      lineage: "Dieter Rams — as little design as possible.",
      heritage: [
        "DIN 1931 — German Institute for Standardization. Design should be reliable, trustworthy.",
        "Bauhaus (1919-1933) — Form follows function. No decoration. Geometric purity.",
        "Swiss/International Style (1950s) — Grid systems, clean hierarchy, objective presentation.",
        "Braun/Dieter Rams — Less but better. 10 principles of good design.",
      ],
    },
    palette: {
      surfaces: {
        background: { token: "--color-bg", hex: "#EFEDE8" },
        alt: { token: "--color-bg-alt", hex: "#E7E4DF" },
        elevated: { token: "--color-bg-elevated", hex: "#F5F3F0" },
        inverse: { token: "--color-bg-inverse", hex: "#2A2826" },
      },
      text: {
        primary: { token: "--color-text", hex: "#2A2826" },
        secondary: { token: "--color-text-secondary", hex: "#5C5955" },
        muted: { token: "--color-text-muted", hex: "#8A8784" },
        dim: { token: "--color-text-dim", hex: "#B0ADA8" },
        inverse: { token: "--color-text-inverse", hex: "#F0EEEB" },
      },
      borders: {
        default: { token: "--color-border", hex: "#D4D1CC" },
        light: { token: "--color-border-light", hex: "#E5E2DD" },
        focus: { token: "--color-border-focus", hex: "#2A2826" },
      },
      accent: {
        base: { token: "--color-accent", hex: "#2A2826" },
        hover: { token: "--color-accent-hover", hex: "#1A1816" },
        active: { token: "--color-accent-active", hex: "#111010" },
      },
      functional: {
        success: { token: "--color-success", hex: "#2F8F4E", use: "Connected, synced, profitable, confirmed" },
        warning: { token: "--color-warning", hex: "#C4890A", use: "Syncing, nearing limit, action needed" },
        error: { token: "--color-error", hex: "#C43B2E", use: "Failed, over budget, disconnected, blocked" },
        rule: "Only appears next to a status. Never standalone decoration. Soft variants at 6-8% opacity for backgrounds.",
      },
      sourceIndicators: {
        rule: "6-8px colored dots only. Used in note lists, file browsers, sync status. Never as fill, border, or accent.",
        obsidian: { token: "--color-source-obsidian", hex: "#7C3AED", label: "Vault notes" },
        googleDrive: { token: "--color-source-gdrive", hex: "#16A34A", label: "Synced docs" },
        dropbox: { token: "--color-source-dropbox", hex: "#2563EB", label: "Synced files" },
        icloud: { token: "--color-source-icloud", hex: "#3B82F6", label: "Synced files" },
        fulkit: { token: "--color-source-fulkit", hex: "#2A2826", label: "Native notes" },
      },
      thirdPartyHover: {
        rule: "Icons always monochrome. Brand color only as 30-40% hover tint. Only in: source selector, connected sources list, import flow, BYOK connect screen.",
      },
      neverColored: [
        "Nav items", "Buttons", "Headers", "Borders", "Backgrounds", "Badges",
        "Tags", "Charts", "Progress bars", "Focus rings", "Decorative elements",
      ],
    },
    typography: {
      primary: { family: "D-DIN", fallback: "-apple-system, sans-serif", note: "Upgrade to DIN Pro when licensed" },
      mono: { family: "JetBrains Mono", fallback: "monospace" },
      scale: {
        "2xs": "10px", xs: "11px", sm: "12px", base: "14px", md: "15px",
        lg: "16px", xl: "18px", "2xl": "22px", "3xl": "28px", "4xl": "36px", "5xl": "48px",
      },
      weights: { normal: 400, medium: 500, semibold: 600, bold: 700, black: 900 },
      lineHeights: { none: 1, tight: 1.25, snug: 1.35, normal: 1.5, relaxed: 1.65, loose: 1.8 },
      letterSpacing: { tighter: "-0.5px", tight: "-0.3px", normal: "0", wide: "0.5px", wider: "0.8px", widest: "1.2px" },
      fontExploration: [
        { name: "DIN Pro", origin: "Germany, 1931", license: "Commercial", note: "Default. German road signs, railway timetables." },
        { name: "Futura", origin: "Germany, 1927", license: "Commercial", note: "Bauhaus geometric. 2001, Supreme, Wes Anderson." },
        { name: "Neue Haas Grotesk", origin: "Switzerland, 1957", license: "Commercial", note: "Original Helvetica before rename." },
        { name: "FF Meta", origin: "Germany, 1991", license: "Commercial", note: "Spiekermann's anti-Helvetica. German Post Office." },
        { name: "GT Walsheim", origin: "Switzerland, 2010", license: "Commercial", note: "Modern geometric by Grilli Type." },
        { name: "FF DIN", origin: "Germany, 2010", license: "Commercial", note: "Definitive digital DIN revival." },
        { name: "D-DIN", origin: "Open source", license: "Free", note: "Active prototype fallback." },
        { name: "Barlow", origin: "Open source", license: "Free", note: "California highway signs — DIN's cousin." },
        { name: "IBM Plex Sans", origin: "International, 2017", license: "Free", note: "IBM industrial identity." },
        { name: "Outfit", origin: "Open source", license: "Free", note: "Full weight range, solid DIN alternative." },
      ],
    },
    icons: {
      library: "Lucide React",
      size: "18px",
      strokeWidth: "1.8px",
      color: "Inherits from parent via text tokens",
      thirdParty: "Monochrome line versions. Brand color only as 30-40% hover tint.",
      pool: {
        navigation: "Home, MessageCircle, Mic, Search, Settings, Menu, ChevronRight, X, ArrowLeft",
        notes: "FileText, FolderOpen, BookOpen, PenTool, Bookmark, Hash, Link, Layers",
        actions: "Check, Plus, ArrowRight, RefreshCw, Upload, Download, Trash2, Clock, Bell",
        ai: "Sparkles, Zap, Brain, Lightbulb, Eye, Wand2",
        people: "User, Users, UserPlus, Heart, Gift",
        data: "BarChart3, TrendingUp, TrendingDown, CreditCard, Shield, Key",
        easterEggs: "Compass, Hexagon, Target, Ruler, Grid3x3",
      },
    },
    spacing: { "0.5": 2, "1": 4, "1.5": 6, "2": 8, "2.5": 10, "3": 12, "3.5": 14, "4": 16, "5": 20, "6": 24, "8": 32, "10": 40, "12": 48, "16": 64, "20": 80, "24": 96 },
    radii: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "14px", "2xl": "20px", full: "9999px" },
    shadows: {
      xs: "0 1px 2px rgba(42,40,38,0.04)",
      sm: "0 1px 3px rgba(42,40,38,0.06), 0 1px 2px rgba(42,40,38,0.04)",
      md: "0 4px 6px rgba(42,40,38,0.06), 0 2px 4px rgba(42,40,38,0.04)",
      lg: "0 10px 15px rgba(42,40,38,0.08), 0 4px 6px rgba(42,40,38,0.04)",
      xl: "0 20px 25px rgba(42,40,38,0.10), 0 10px 10px rgba(42,40,38,0.04)",
    },
    motion: {
      durations: { fast: "100ms", normal: "200ms", slow: "300ms", slower: "500ms", slowest: "800ms" },
      easing: {
        default: "cubic-bezier(0.22, 1, 0.36, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        in: "cubic-bezier(0.4, 0, 1, 1)",
        out: "cubic-bezier(0, 0, 0.2, 1)",
      },
    },
    guardrails: [
      "No raw color values — everything uses var(--token)",
      "No decorative color — warm monochrome or functional only",
      "No CSS modules, Tailwind, or styled-components — inline styles only",
      "No arbitrary font sizes, spacing, or radii — scale only",
      "Hover states auto-derived (darken 10%)",
      "All icons from Lucide React, 18px default, 1.8px stroke",
      "Heroes and titles left-aligned — never centered",
      "Brand mark always links to /",
      "The only color permitted is functional: semantic states and source indicators",
      "Never colored: nav items, buttons, headers, borders, backgrounds, badges, tags, charts, progress bars, focus rings",
    ],
  }, null, 2);

  const copyJSON = () => {
    navigator.clipboard.writeText(designJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copyJSON} style={{
      display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)",
      padding: "var(--space-1-5) var(--space-3)", border: "1px solid var(--color-border-light)",
      borderRadius: "var(--radius-md)", background: copied ? "var(--color-bg-inverse)" : "var(--color-bg-elevated)",
      color: copied ? "var(--color-text-inverse)" : "var(--color-text-muted)",
      fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
      fontWeight: "var(--font-weight-medium)", cursor: "pointer",
      transition: "all var(--duration-normal) var(--ease-default)",
      marginTop: "var(--space-2)",
    }}>
      {copied ? <><CheckIcon size={11} /> Copied</> : <><Copy size={11} /> Copy JSON</>}
    </button>
  );
}

const OWNER_NOTES = [
  {
    category: "Email",
    items: [
      { name: "ImprovMX", url: "https://improvmx.com", note: "Email forwarding — *@fulkit.app catch-all → CollinGreenleaf@Gmail.com. Free tier. MX + SPF records in Vercel DNS." },
    ],
  },
  {
    category: "Hosting & DNS",
    items: [
      { name: "Vercel", url: "https://vercel.com", note: "Hosting, deployments, DNS for fulkit.app. Pro plan." },
      { name: "Cloudflare", url: "https://dash.cloudflare.com", note: "Domain connected but DNS stays on Vercel. Don't move nameservers." },
    ],
  },
  {
    category: "Database & Auth",
    items: [
      { name: "Supabase", url: "https://supabase.com/dashboard", note: "Postgres + Auth + RLS. Project: zwezmthocrbavowrprzl." },
    ],
  },
  {
    category: "AI",
    items: [
      { name: "Anthropic", url: "https://console.anthropic.com", note: "Claude API — main chat engine." },
      { name: "OpenAI", url: "https://platform.openai.com", note: "text-embedding-3-small — note embeddings for semantic search." },
    ],
  },
  {
    category: "Integrations",
    items: [
      { name: "Stripe", url: "https://dashboard.stripe.com", note: "Payments — account 'Fulkit'. sk_live_ key wired directly (no Connect OAuth yet)." },
      { name: "Spotify", url: "https://developer.spotify.com", note: "Development Mode — only Collin's account. Needs Extended Quota Mode for other users." },
      { name: "GitHub", url: "https://github.com/settings/developers", note: "OAuth app for repo access integration." },
      { name: "Trello", url: "https://trello.com/power-ups/admin", note: "Power-Up for board integration." },
    ],
  },
  {
    category: "Domain",
    items: [
      { name: "GoDaddy", url: "https://www.godaddy.com", note: "Domain registrar for fulkit.app + fullkit.app. Nameservers pointed to Vercel." },
    ],
  },
];

function NotesTab() {
  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-4)" }}>
        Owner Notes
      </h2>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
        Service providers, credentials locations, and operational notes.
      </p>
      {OWNER_NOTES.map((cat) => (
        <div key={cat.category} style={{ marginBottom: "var(--space-6)" }}>
          <h3 style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-3)" }}>
            {cat.category}
          </h3>
          {cat.items.map((item) => (
            <div key={item.name} style={{ padding: "var(--space-3) var(--space-4)", background: "var(--color-surface-alt)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-1)" }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", textDecoration: "none", borderBottom: "1px solid var(--color-border)" }}>
                  {item.name}
                </a>
              </div>
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: 0, lineHeight: "var(--line-height-relaxed)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlaceholderTab({ title, description }) {
  return (
    <div>
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        {title}
      </h2>
      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
        {description}
      </p>
    </div>
  );
}

function PlaygroundTab() {
  return (
    <div>
      <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", margin: "0 0 var(--space-4)" }}>
        Loading Preview
      </h3>
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-4)",
      }}>
        <div style={{
          width: 120,
          height: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          borderRadius: "var(--radius-md)",
        }}>
          <LoadingMark size={50} />
        </div>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: 0, textAlign: "center" }}>
          Animated loading mark — rocks and winks. Plays on every auth-gated page load.
        </p>
        <a
          href="/loading-preview"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            padding: "var(--space-2-5) var(--space-4)",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            fontFamily: "var(--font-primary)",
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          Open Full Preview
        </a>
      </div>
    </div>
  );
}

function FabricTab() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playlistInput, setPlaylistInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    // Fetch stats
    const [pendingRes, analyzingRes, completeRes, failedRes, timelinesRes] = await Promise.all([
      supabase.from("fabric_tracks").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("fabric_tracks").select("id", { count: "exact", head: true }).eq("status", "analyzing"),
      supabase.from("fabric_tracks").select("id", { count: "exact", head: true }).eq("status", "complete"),
      supabase.from("fabric_tracks").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("fabric_timelines").select("track_id", { count: "exact", head: true }),
    ]);

    setStats({
      pending: pendingRes.count || 0,
      analyzing: analyzingRes.count || 0,
      complete: completeRes.count || 0,
      failed: failedRes.count || 0,
      timelines: timelinesRes.count || 0,
    });

    // Fetch featured
    try {
      const res = await fetch("/api/fabric/featured");
      const data = await res.json();
      setFeatured(data.crates || []);
    } catch {}

    setLoading(false);
  }, [accessToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addFeatured = async () => {
    if (!playlistInput.trim() || !accessToken) return;
    setAdding(true);

    // Extract playlist ID from URL or raw ID
    let playlistId = playlistInput.trim();
    const match = playlistId.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match) playlistId = match[1];

    try {
      const res = await fetch("/api/fabric/featured/manage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playlistId, name: nameInput.trim() || undefined }),
      });
      const data = await res.json();
      if (data.error) {
        alert(`Error: ${data.error}`);
      } else {
        setPlaylistInput("");
        setNameInput("");
        fetchData();
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
    setAdding(false);
  };

  const removeFeatured = async (crateId) => {
    if (!accessToken) return;
    await fetch(`/api/fabric/featured/manage?id=${crateId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    fetchData();
  };

  const statBox = { padding: "var(--space-3)", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)", textAlign: "center", minWidth: 100 };
  const statNum = { fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)" };
  const statLabel = { fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)" }}>Fabric</h2>
        <button
          onClick={fetchData}
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "var(--space-1)" }}
        >
          <RefreshCw size={14} strokeWidth={1.8} />
        </button>
      </div>

      {/* Analysis Stats */}
      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginBottom: "var(--space-6)" }}>
        {loading ? (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Loading...</p>
        ) : stats && (
          <>
            <div style={statBox}><div style={statNum}>{stats.pending}</div><div style={statLabel}>Pending</div></div>
            <div style={statBox}><div style={statNum}>{stats.analyzing}</div><div style={statLabel}>Analyzing</div></div>
            <div style={statBox}><div style={statNum}>{stats.complete}</div><div style={statLabel}>Complete</div></div>
            <div style={statBox}><div style={statNum}>{stats.failed}</div><div style={statLabel}>Failed</div></div>
            <div style={statBox}><div style={statNum}>{stats.timelines}</div><div style={statLabel}>Timelines</div></div>
          </>
        )}
      </div>

      {/* Featured Playlists */}
      <h3 style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>Featured Playlists</h3>

      {featured.length === 0 && !loading && (
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          No featured playlists yet.
        </p>
      )}

      {featured.map(crate => {
        const analyzed = crate.tracks?.filter(t => t.fabric_status === "complete").length || 0;
        const total = crate.tracks?.length || 0;
        const pct = total > 0 ? Math.round((analyzed / total) * 100) : 0;
        return (
          <div key={crate.id} style={{
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-bg-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-light)",
            marginBottom: "var(--space-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)" }}>{crate.name}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                {total} tracks · {analyzed}/{total} analyzed ({pct}%)
              </div>
            </div>
            <button
              onClick={() => removeFeatured(crate.id)}
              style={{ border: "none", background: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "var(--space-1)" }}
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        );
      })}

      {/* Add Featured */}
      <div style={{ marginTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <input
          type="text"
          placeholder="Spotify playlist URL or ID"
          value={playlistInput}
          onChange={e => setPlaylistInput(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--space-2) var(--space-2-5)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-elevated)",
            color: "var(--color-text)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-primary)",
            outline: "none",
          }}
        />
        <input
          type="text"
          placeholder="Custom name (optional)"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          style={{
            width: "100%",
            padding: "var(--space-2) var(--space-2-5)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-bg-elevated)",
            color: "var(--color-text)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-primary)",
            outline: "none",
          }}
        />
        <button
          onClick={addFeatured}
          disabled={adding || !playlistInput.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-1-5)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-text)",
            color: "var(--color-bg)",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            cursor: adding ? "wait" : "pointer",
            opacity: !playlistInput.trim() ? 0.5 : 1,
          }}
        >
          <Plus size={14} strokeWidth={2} />
          {adding ? "Adding..." : "Add Featured Playlist"}
        </button>
      </div>

      {/* Harvest Info */}
      <div style={{ marginTop: "var(--space-6)", padding: "var(--space-3) var(--space-4)", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)" }}>
        <div style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-1)" }}>Scripts</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", lineHeight: "var(--line-height-relaxed)" }}>
          node scripts/harvest-library.mjs<br />
          node scripts/batch-analyze.mjs --limit 50
        </div>
      </div>
    </div>
  );
}

/* ─── Shared inline-style helpers ─── */
const inputStyle = {
  width: "100%",
  padding: "var(--space-2) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text)",
  fontSize: "var(--font-size-sm)",
  fontFamily: "var(--font-primary)",
  outline: "none",
};

const btnSmall = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--space-1)",
  padding: "var(--space-1-5) var(--space-2-5)",
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-md)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text-muted)",
  fontSize: "var(--font-size-xs)",
  fontFamily: "var(--font-primary)",
  fontWeight: "var(--font-weight-medium)",
  cursor: "pointer",
};

const btnDanger = {
  ...btnSmall,
  border: "1px solid var(--color-error, #e53e3e)",
  color: "var(--color-error, #e53e3e)",
};

const btnPrimary = {
  ...btnSmall,
  background: "var(--color-text)",
  color: "var(--color-bg)",
  border: "1px solid var(--color-text)",
};

const cardStyle = {
  border: "1px solid var(--color-border-light)",
  borderRadius: "var(--radius-lg)",
  background: "var(--color-bg-elevated)",
  marginBottom: "var(--space-2)",
};

/* ─── Questions Tab ─── */
function QuestionsTab() {
  const [phases, setPhases] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [addingTo, setAddingTo] = useState(null); // phase_id currently adding to
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const fetchAll = useCallback(async () => {
    const [{ data: p }, { data: q }] = await Promise.all([
      supabase.from("question_phases").select("*").order("sort_order"),
      supabase.from("questions").select("*").order("sort_order"),
    ]);
    setPhases(p || []);
    setQuestions(q || []);
    // expand all phases by default on first load
    if (Object.keys(expandedPhases).length === 0 && p?.length) {
      const exp = {};
      p.forEach((ph) => (exp[ph.id] = true));
      setExpandedPhases(exp);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const togglePhase = (id) =>
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── Phase CRUD ── */
  const savePhase = async (phase) => {
    const { error } = await supabase
      .from("question_phases")
      .update({ label: phase.label, intro: phase.intro })
      .eq("id", phase.id);
    if (!error) {
      setPhases((prev) => prev.map((p) => (p.id === phase.id ? { ...p, ...phase } : p)));
      setEditingPhase(null);
    }
  };

  const addPhase = async () => {
    const maxSort = phases.reduce((mx, p) => Math.max(mx, p.sort_order || 0), 0);
    const { data, error } = await supabase
      .from("question_phases")
      .insert({ label: "New Phase", intro: "", sort_order: maxSort + 1 })
      .select()
      .single();
    if (!error && data) {
      setPhases((prev) => [...prev, data]);
      setExpandedPhases((prev) => ({ ...prev, [data.id]: true }));
      setEditingPhase(data.id);
    }
  };

  const deletePhase = async (id) => {
    const count = questions.filter((q) => q.phase_id === id).length;
    if (count > 0 && !window.confirm(`Delete phase and its ${count} question(s)?`)) return;
    await supabase.from("questions").delete().eq("phase_id", id);
    await supabase.from("question_phases").delete().eq("id", id);
    setPhases((prev) => prev.filter((p) => p.id !== id));
    setQuestions((prev) => prev.filter((q) => q.phase_id !== id));
  };

  /* ── Question CRUD ── */
  const saveQuestion = async (q) => {
    const { error } = await supabase
      .from("questions")
      .update({
        text: q.text,
        why: q.why,
        type: q.type,
        options: q.options,
        placeholder: q.placeholder,
        skippable: q.skippable,
        multi: q.multi,
      })
      .eq("id", q.id);
    if (!error) {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x)));
      setEditingQuestion(null);
    }
  };

  const addQuestion = async (phaseId) => {
    const phaseQs = questions.filter((q) => q.phase_id === phaseId);
    const maxSort = phaseQs.reduce((mx, q) => Math.max(mx, q.sort_order || 0), 0);
    const { data, error } = await supabase
      .from("questions")
      .insert({
        phase_id: phaseId,
        question_id: `q_${Date.now()}`,
        text: "",
        why: "",
        type: "text",
        options: null,
        placeholder: "",
        skippable: true,
        multi: false,
        sort_order: maxSort + 1,
      })
      .select()
      .single();
    if (!error && data) {
      setQuestions((prev) => [...prev, data]);
      setEditingQuestion(data.id);
      setAddingTo(null);
    }
  };

  const deleteQuestion = async (id) => {
    await supabase.from("questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    if (editingQuestion === id) setEditingQuestion(null);
  };

  if (loading) {
    return (
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
        Loading questions...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-1)" }}>
            Onboarding Questions
          </h2>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            {phases.length} phases, {questions.length} questions
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button onClick={() => setShowExport(true)} style={btnSmall}>Export</button>
          <button onClick={() => setShowImport(true)} style={btnSmall}>Import JSON</button>
          <button onClick={addPhase} style={btnPrimary}>
            <Plus size={12} /> Add Phase
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          phases={phases}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); setLoading(true); fetchAll(); }}
        />
      )}

      {showExport && (
        <ExportModal
          phases={phases}
          questions={questions}
          onClose={() => setShowExport(false)}
        />
      )}

      {phases.map((phase) => {
        const phaseQs = questions
          .filter((q) => q.phase_id === phase.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const expanded = expandedPhases[phase.id];

        return (
          <div key={phase.id} style={{ ...cardStyle, marginBottom: "var(--space-4)" }}>
            {/* Phase header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                cursor: "pointer",
              }}
              onClick={() => togglePhase(phase.id)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {editingPhase === phase.id ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    value={phase.label}
                    onChange={(e) => setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, label: e.target.value } : p))}
                    style={{ ...inputStyle, fontWeight: "var(--font-weight-semibold)" }}
                    placeholder="Phase name"
                  />
                  <input
                    value={phase.intro || ""}
                    onChange={(e) => setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, intro: e.target.value } : p))}
                    style={inputStyle}
                    placeholder="Intro text shown to user"
                  />
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button onClick={() => savePhase(phase)} style={btnPrimary}>Save</button>
                    <button onClick={() => setEditingPhase(null)} style={btnSmall}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                      {phase.label}
                    </span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>
                      {phaseQs.length} question{phaseQs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingPhase(phase.id); }}
                    style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePhase(phase.id); }}
                    style={{ ...btnDanger, padding: "var(--space-1) var(--space-2)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>

            {phase.intro && editingPhase !== phase.id && (
              <div style={{ padding: "0 var(--space-4) var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                {phase.intro}
              </div>
            )}

            {/* Questions list */}
            {expanded && (
              <div style={{ padding: "0 var(--space-4) var(--space-3)" }}>
                {phaseQs.map((q, qi) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    index={qi}
                    editing={editingQuestion === q.id}
                    onEdit={() => setEditingQuestion(q.id)}
                    onSave={saveQuestion}
                    onCancel={() => setEditingQuestion(null)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                ))}

                <button
                  onClick={() => addQuestion(phase.id)}
                  style={{ ...btnSmall, marginTop: "var(--space-2)" }}
                >
                  <Plus size={12} /> Add Question
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Single question row ─── */
function QuestionRow({ q, index, editing, onEdit, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(q);

  useEffect(() => { setDraft(q); }, [q]);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const toggleType = () => {
    if (draft.type === "text") {
      update("type", "choice");
      if (!draft.options || draft.options.length === 0) {
        setDraft((prev) => ({ ...prev, type: "choice", options: [{ label: "A", value: "a" }, { label: "B", value: "b" }] }));
      }
    } else {
      setDraft((prev) => ({ ...prev, type: "text", options: null }));
    }
  };

  const addOption = () => {
    const opts = draft.options || [];
    const letters = "ABCDEFGHIJ";
    const next = letters[opts.length] || String(opts.length + 1);
    setDraft((prev) => ({ ...prev, options: [...opts, { label: next, value: next.toLowerCase() }] }));
  };

  const removeOption = (i) => {
    setDraft((prev) => ({ ...prev, options: prev.options.filter((_, idx) => idx !== i) }));
  };

  const updateOption = (i, field, value) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((opt, idx) => (idx === i ? { ...opt, [field]: value } : opt)),
    }));
  };

  if (!editing) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-2)",
          padding: "var(--space-2) 0",
          borderBottom: "1px solid var(--color-border-light)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", minWidth: 20, paddingTop: 2 }}>
          {index + 1}.
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "var(--font-size-sm)", lineHeight: "var(--line-height-normal)" }}>
            {q.text || <span style={{ color: "var(--color-text-dim)", fontStyle: "italic" }}>Empty question</span>}
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
            <span style={{
              fontSize: "var(--font-size-2xs)",
              padding: "1px var(--space-1-5)",
              borderRadius: "var(--radius-sm)",
              background: q.type === "choice" ? "var(--color-accent-dim, rgba(99,102,241,0.1))" : "var(--color-bg-surface)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-wider)",
            }}>
              {q.type === "choice" ? `${q.options?.length || 0} choices` : "text"}
            </span>
            {q.skippable && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>skippable</span>
            )}
          </div>
        </div>
        <button onClick={onEdit} style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}>Edit</button>
        <button onClick={onDelete} style={{ ...btnDanger, padding: "var(--space-1) var(--space-2)" }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  }

  // Editing mode
  return (
    <div
      style={{
        padding: "var(--space-3)",
        border: "1px solid var(--color-text)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-2)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {/* Question text */}
      <div>
        <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
          Question
        </label>
        <textarea
          value={draft.text}
          onChange={(e) => update("text", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="What do you want to ask?"
        />
      </div>

      {/* Why */}
      <div>
        <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
          Why we ask (shown to user)
        </label>
        <input
          value={draft.why || ""}
          onChange={(e) => update("why", e.target.value)}
          style={inputStyle}
          placeholder="Helps us understand..."
        />
      </div>

      {/* Type toggle + placeholder */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
            Type
          </label>
          <button onClick={toggleType} style={{ ...btnSmall, width: "100%", justifyContent: "center" }}>
            {draft.type === "choice" ? "Multiple Choice" : "Free Text"}
          </button>
        </div>
        {draft.type === "text" && (
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
              Placeholder
            </label>
            <input
              value={draft.placeholder || ""}
              onChange={(e) => update("placeholder", e.target.value)}
              style={inputStyle}
              placeholder="Input placeholder text"
            />
          </div>
        )}
        <div>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" }}>
            Skip
          </label>
          <button
            onClick={() => update("skippable", !draft.skippable)}
            style={{ ...btnSmall, width: "100%", justifyContent: "center", background: draft.skippable ? "var(--color-bg-surface)" : "var(--color-bg-elevated)" }}
          >
            {draft.skippable ? "Yes" : "No"}
          </button>
        </div>
      </div>

      {/* Choice options editor */}
      {draft.type === "choice" && (
        <div>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", display: "block" }}>
            Options
          </label>
          {(draft.options || []).map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-1-5)", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-muted)", minWidth: 16 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <input
                value={opt.label}
                onChange={(e) => updateOption(i, "label", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Option label"
              />
              {(draft.options?.length || 0) > 2 && (
                <button onClick={() => removeOption(i)} style={{ ...btnDanger, padding: "var(--space-1)" }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addOption} style={{ ...btnSmall, marginTop: "var(--space-1)" }}>
            <Plus size={11} /> Add Option
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={btnSmall}>Cancel</button>
        <button onClick={() => onSave(draft)} style={btnPrimary}>Save</button>
      </div>
    </div>
  );
}

/* ─── Modal backdrop ─── */
function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "var(--space-6)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: 640,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── JSON template shown in import modal ─── */
const TEMPLATE_JSON = `{
  "phases": [
    {
      "label": "Phase Name",
      "intro": "Intro text shown before questions.",
      "questions": [
        {
          "id": "unique_id",
          "text": "Your question here?",
          "why": "Why we ask this.",
          "type": "text",
          "placeholder": "Optional placeholder",
          "skippable": false
        },
        {
          "id": "choice_example",
          "text": "Pick one:",
          "why": "Reason for asking.",
          "type": "choice",
          "multi": false,
          "options": ["Option A", "Option B", "Option C"],
          "skippable": false
        }
      ]
    }
  ]
}`;

/* ─── Import Modal ─── */
function ImportModal({ phases, onClose, onDone }) {
  const [json, setJson] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE_JSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const doImport = async () => {
    setError(null);
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON. Check syntax and try again.");
      return;
    }
    if (!parsed.phases || !Array.isArray(parsed.phases)) {
      setError('JSON must have a "phases" array at the top level.');
      return;
    }
    for (const p of parsed.phases) {
      if (!p.label || !Array.isArray(p.questions)) {
        setError("Each phase needs a label and a questions array.");
        return;
      }
    }

    setImporting(true);
    try {
      // If replace all, wipe existing
      if (replaceAll) {
        await supabase.from("questions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("question_phases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      const maxSort = replaceAll ? 0 : phases.reduce((mx, p) => Math.max(mx, p.sort_order || 0), 0);

      for (let pi = 0; pi < parsed.phases.length; pi++) {
        const ph = parsed.phases[pi];
        const { data: newPhase, error: phErr } = await supabase
          .from("question_phases")
          .insert({ label: ph.label, intro: ph.intro || "", sort_order: maxSort + pi + 1 })
          .select()
          .single();
        if (phErr) throw new Error(phErr.message);

        if (ph.questions.length > 0) {
          const rows = ph.questions.map((q, qi) => ({
            phase_id: newPhase.id,
            question_id: q.id || `q_${Date.now()}_${qi}`,
            text: q.text || "",
            why: q.why || "",
            type: q.type || "text",
            multi: q.multi || false,
            options: q.type === "choice" && q.options
              ? q.options.map((o) => (typeof o === "string" ? { label: o, value: o.toLowerCase() } : o))
              : null,
            placeholder: q.placeholder || "",
            skippable: q.skippable || false,
            sort_order: qi,
          }));
          const { error: qErr } = await supabase.from("questions").insert(rows);
          if (qErr) throw new Error(qErr.message);
        }
      }
      onDone();
    } catch (err) {
      setError(err.message);
      setImporting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)" }}>Import Questionnaire</h3>
        <button onClick={onClose} style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}>Close</button>
      </div>

      <div style={{ padding: "var(--space-4) var(--space-5)", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Template */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
              JSON Template — copy this and give it to any LLM
            </label>
            <button onClick={copyTemplate} style={btnSmall}>
              {copied ? <><CheckIcon size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
          </div>
          <pre style={{
            padding: "var(--space-3)",
            background: "var(--color-bg-surface, var(--color-bg-elevated))",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-secondary)",
            overflow: "auto",
            maxHeight: 160,
            whiteSpace: "pre-wrap",
            margin: 0,
          }}>
            {TEMPLATE_JSON}
          </pre>
        </div>

        {/* Paste area */}
        <div>
          <label style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)", display: "block" }}>
            Paste your JSON below
          </label>
          <textarea
            value={json}
            onChange={(e) => { setJson(e.target.value); setError(null); }}
            rows={10}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)", fontSize: "var(--font-size-xs)" }}
            placeholder='{"phases": [...]}'
          />
        </div>

        {/* Replace toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-sm)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={replaceAll}
            onChange={(e) => setReplaceAll(e.target.checked)}
            style={{ accentColor: "var(--color-accent)" }}
          />
          <span style={{ color: replaceAll ? "var(--color-error, #e53e3e)" : "var(--color-text-secondary)" }}>
            {replaceAll ? "Replace all — this will delete existing questions" : "Append to existing questions"}
          </span>
        </label>

        {error && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-error, #e53e3e)", padding: "var(--space-2) var(--space-3)", background: "rgba(229,62,62,0.08)", borderRadius: "var(--radius-md)" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border-light)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
        <button onClick={onClose} style={btnSmall}>Cancel</button>
        <button onClick={doImport} disabled={!json.trim() || importing} style={{ ...btnPrimary, opacity: !json.trim() || importing ? 0.5 : 1 }}>
          {importing ? "Importing..." : "Import"}
        </button>
      </div>
    </Modal>
  );
}

/* ─── Export Modal ─── */
function ExportModal({ phases, questions, onClose }) {
  const [copied, setCopied] = useState(false);

  const exportData = {
    phases: phases.map((p) => ({
      label: p.label,
      intro: p.intro || "",
      questions: questions
        .filter((q) => q.phase_id === p.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((q) => ({
          id: q.question_id,
          text: q.text,
          why: q.why || "",
          type: q.type,
          ...(q.multi ? { multi: true } : {}),
          ...(q.type === "choice" && q.options ? { options: q.options.map((o) => (typeof o === "string" ? o : o.label)) } : {}),
          ...(q.placeholder ? { placeholder: q.placeholder } : {}),
          skippable: q.skippable || false,
        })),
    })),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);

  const copyExport = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)" }}>Export Questionnaire</h3>
        <button onClick={onClose} style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}>Close</button>
      </div>

      <div style={{ padding: "var(--space-4) var(--space-5)", overflowY: "auto", flex: 1 }}>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          Copy this JSON, refine it with any LLM, then import it back.
        </p>
        <pre style={{
          padding: "var(--space-3)",
          background: "var(--color-bg-surface, var(--color-bg-elevated))",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-secondary)",
          overflow: "auto",
          maxHeight: 400,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}>
          {jsonStr}
        </pre>
      </div>

      <div style={{ padding: "var(--space-3) var(--space-5)", borderTop: "1px solid var(--color-border-light)", display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
        <button onClick={onClose} style={btnSmall}>Close</button>
        <button onClick={copyExport} style={btnPrimary}>
          {copied ? <><CheckIcon size={11} /> Copied</> : <><Copy size={11} /> Copy JSON</>}
        </button>
      </div>
    </Modal>
  );
}
