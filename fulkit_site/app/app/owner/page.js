"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  Palette,
  Users,
  Share2,
  Speech,
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
  CreditCard,
  Download,
  DatabaseSearch,
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
  { id: "pitches", label: "Pitches", icon: Speech },
  { id: "fabric", label: "Fabric", icon: Music },
  { id: "playground", label: "Playground", icon: GamepadDirectional },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "dogfood", label: "Dogfood", icon: DatabaseSearch },
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
        {tab === "users" && <UsersTab />}
        {tab === "socials" && <SocialsTab />}
        {tab === "pitches" && <PitchesTab />}
        {tab === "fabric" && <FabricTab />}
        {tab === "playground" && <PlaygroundTab />}
        {tab === "notes" && <NotesTab />}
        {tab === "dogfood" && <DogfoodTab />}
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

// Reusable bar-list card for analytics sections
function AnalyticsCard({ title, items, valueKey, labelKey, maxItems = 10 }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.slice(0, maxItems).map(i => i[valueKey] || 0), 1);
  return (
    <div style={{ padding: "var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)" }}>
      <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
        {title}
      </div>
      {items.slice(0, maxItems).map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item[labelKey] || "(not set)"}
          </span>
          <div style={{ flex: 1, height: 6, background: "var(--color-border-light)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${(item[valueKey] / max) * 100}%`, height: "100%", background: "var(--color-text-muted)", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", minWidth: 32, textAlign: "right" }}>
            {item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardTab() {
  const { accessToken } = useAuth();
  const [siteMetrics, setSiteMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    // Fetch both in parallel
    fetch("/api/owner/metrics", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setSiteMetrics(data); })
      .catch(() => {});

    fetch("/api/owner/analytics", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { setAnalytics(data); setLoadingAnalytics(false); })
      .catch(() => { setLoadingAnalytics(false); });
  }, [accessToken]);

  const paying = siteMetrics ? siteMetrics.standard + siteMetrics.pro : 0;
  const mrr = siteMetrics ? (siteMetrics.standard * 7) + (siteMetrics.pro * 15) : 0;

  const metrics = [
    { label: "Total Users", value: siteMetrics ? String(siteMetrics.total) : "\u2014", sub: siteMetrics?.total === 1 ? "You" : "" },
    { label: "Visitors (30d)", value: analytics?.overview ? String(analytics.overview.visitors) : "\u2014", sub: !analytics?.configured ? "GA4 not configured" : "" },
    { label: "Avg Session", value: analytics?.overview?.avgDuration || "\u2014", sub: "" },
    { label: "Messages/mo", value: siteMetrics ? String(siteMetrics.messagesThisMonth) : "\u2014", sub: "" },
    { label: "MRR", value: siteMetrics ? `$${mrr}` : "\u2014", sub: mrr === 0 ? "Pre-launch" : "" },
  ];

  return (
    <div>
      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ padding: "var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)" }}>
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {m.label}
            </div>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>
              {m.value}
            </div>
            {m.sub && <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Analytics Sections */}
      {loadingAnalytics ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}>
          <LoadingMark size={32} />
        </div>
      ) : !analytics?.configured ? (
        <div style={{ padding: "var(--space-6)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-primary)", marginBottom: "var(--space-2)" }}>
            Connect Google Analytics
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", maxWidth: 400, margin: "0 auto" }}>
            Set GA_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in your environment to see traffic, geographic, and engagement data here.
          </div>
        </div>
      ) : analytics?.overview?.visitors === 0 ? (
        <div style={{ padding: "var(--space-6)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", textAlign: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Data will appear after your first visitors.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <AnalyticsCard title="Top Pages" items={analytics.topPages} labelKey="path" valueKey="views" />
          <div>
            <AnalyticsCard title="Geographic" items={analytics.countries} labelKey="name" valueKey="users" maxItems={8} />
            {analytics.cities?.length > 0 && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <AnalyticsCard title="US Cities" items={analytics.cities} labelKey="name" valueKey="users" maxItems={8} />
              </div>
            )}
          </div>
          <AnalyticsCard title="Referrers" items={analytics.referrers} labelKey="source" valueKey="sessions" maxItems={8} />
          <div>
            <AnalyticsCard title="Devices" items={analytics.devices} labelKey="type" valueKey="users" />
            {analytics.browsers?.length > 0 && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <AnalyticsCard title="Browsers" items={analytics.browsers} labelKey="name" valueKey="users" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dogfood Tab ─── */

function DogfoodTab() {
  const { accessToken } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [mdFiles, setMdFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [discovered, setDiscovered] = useState(false);

  const getFolder = (path) => {
    if (path.includes("Audio_Crate")) return "02-AUDIO";
    if (path.includes("numbrly") || path.includes("truegauge")) return "03-INTEGRATIONS";
    return "01-PROJECT";
  };

  const getTitle = (name) => name.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

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

      const mdItems = await fetchDir("fulkit_site/md");
      for (const item of mdItems) {
        if (item.type === "dir") {
          if (item.name === "archive") continue;
          const subItems = await fetchDir(item.path);
          for (const sub of subItems) {
            if (sub.name.endsWith(".md")) allFiles.push(sub);
          }
        } else if (item.name.endsWith(".md")) {
          allFiles.push(item);
        }
      }

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

  return (
    <div>
      <div style={{ padding: "var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <FileText size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
            Doc Import
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
                style={{ padding: "var(--space-1) var(--space-3)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                style={{ padding: "var(--space-1) var(--space-3)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Deselect all
              </button>
              <button
                onClick={discoverDocs}
                disabled={loadingFiles}
                style={{ padding: "var(--space-1) var(--space-3)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer", marginLeft: "auto" }}
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
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-2)" }}>
        Owner Notes
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {OWNER_NOTES.map((cat) => (
          <div key={cat.category}>
            <h3 style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-1)" }}>
              {cat.category}
            </h3>
            {cat.items.map((item) => (
              <div key={item.name} style={{ padding: "var(--space-1) 0" }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", textDecoration: "none", borderBottom: "1px solid var(--color-border)" }}>
                  {item.name}
                </a>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginLeft: "var(--space-2)" }}>
                  {item.note}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Revenue Projections Data ─── */

const REVENUE_GRID = [
  { users: 20, free: 6, std: 10, pro: 4, revenue: 130, apiCost: 90, credits: 14, hosting: 25, net: 1 },
  { users: 35, free: 6, std: 20, pro: 9, revenue: 275, apiCost: 158, credits: 29, hosting: 25, net: 63 },
  { users: 50, free: 6, std: 31, pro: 13, revenue: 412, apiCost: 225, credits: 44, hosting: 30, net: 113 },
  { users: 75, free: 6, std: 48, pro: 21, revenue: 651, apiCost: 338, credits: 69, hosting: 35, net: 209 },
  { users: 100, free: 6, std: 66, pro: 28, revenue: 882, apiCost: 450, credits: 94, hosting: 40, net: 298 },
  { users: 150, free: 6, std: 101, pro: 43, revenue: 1352, apiCost: 675, credits: 144, hosting: 50, net: 483 },
  { users: 200, free: 6, std: 136, pro: 58, revenue: 1822, apiCost: 900, credits: 194, hosting: 50, net: 678 },
  { users: 300, free: 6, std: 206, pro: 88, revenue: 2762, apiCost: 1350, credits: 294, hosting: 60, net: 1058 },
  { users: 500, free: 6, std: 346, pro: 148, revenue: 4642, apiCost: 2250, credits: 494, hosting: 75, net: 1823 },
  { users: 750, free: 6, std: 521, pro: 223, revenue: 6992, apiCost: 3375, credits: 744, hosting: 100, net: 2773 },
  { users: 1000, free: 6, std: 696, pro: 298, revenue: 9342, apiCost: 4500, credits: 994, hosting: 200, net: 3648 },
  { users: 1500, free: 6, std: 1046, pro: 448, revenue: 14042, apiCost: 6750, credits: 1494, hosting: 200, net: 5598 },
  { users: 2000, free: 6, std: 1396, pro: 598, revenue: 18742, apiCost: 9000, credits: 1994, hosting: 200, net: 7548 },
];

const MILESTONES = REVENUE_GRID.map(r => r.users);

const BINGO_CARDS = [
  { label: "First paying user", threshold: 7 },
  { label: "Cover hosting", threshold: 12 },
  { label: "Break even", threshold: 20 },
  { label: "First $100/mo", threshold: 50 },
  { label: "Ramen profitable", threshold: 75 },
  { label: "First $500/mo", threshold: 150 },
  { label: "$1K/mo club", threshold: 300 },
  { label: "Quit your day job", threshold: 500 },
  { label: "Real business", threshold: 750 },
  { label: "Four figures net", threshold: 1000 },
  { label: "Scaling", threshold: 1500 },
  { label: "Two thousand strong", threshold: 2000 },
];

function getProgressPercent(userCount) {
  if (userCount <= 0) return 0;
  if (userCount >= 2000) return 100;
  for (let i = 0; i < MILESTONES.length; i++) {
    if (userCount <= MILESTONES[i]) {
      const prev = i === 0 ? 0 : MILESTONES[i - 1];
      const segmentWidth = 100 / MILESTONES.length;
      const segmentProgress = (userCount - prev) / (MILESTONES[i] - prev);
      return (i * segmentWidth) + (segmentProgress * segmentWidth);
    }
  }
  return 100;
}

function formatDollar(n) {
  return n >= 1000 ? `$${n.toLocaleString()}` : `$${n}`;
}

/* ─── Users Tab — Revenue Dashboard ─── */

function UsersTab() {
  const { accessToken } = useAuth();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/owner/metrics", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMetrics(data); })
      .catch(() => {});
  }, [accessToken]);

  const currentTotal = metrics?.total || 0;
  const progressPct = getProgressPercent(currentTotal);

  // Find the row to highlight (closest milestone >= current)
  const highlightUsers = REVENUE_GRID.find(r => r.users >= currentTotal)?.users || REVENUE_GRID[0].users;

  const cardStyle = {
    padding: "var(--space-5)",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-lg)",
    marginBottom: "var(--space-6)",
  };

  const sectionLabel = {
    fontSize: 9,
    fontFamily: "var(--font-mono)",
    fontWeight: "var(--font-weight-medium)",
    textTransform: "uppercase",
    letterSpacing: "var(--letter-spacing-widest)",
    color: "var(--color-text-dim)",
    marginBottom: "var(--space-4)",
  };

  const thStyle = {
    fontSize: "var(--font-size-2xs)",
    fontWeight: "var(--font-weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "var(--letter-spacing-wider)",
    color: "var(--color-text-muted)",
    padding: "var(--space-2) var(--space-3)",
    textAlign: "right",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-border-light)",
  };

  const tdStyle = {
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-mono)",
    padding: "var(--space-2) var(--space-3)",
    textAlign: "right",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--color-border-light)",
  };

  // Milestone label positions (show subset to avoid crowding)
  const labelMilestones = [20, 100, 500, 1000, 2000];

  return (
    <div>
      {/* ── PROGRESS METER ── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Progress</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
          <span style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>
            {currentTotal}
          </span>
          <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)" }}>
            / 2,000 users
          </span>
        </div>

        {/* Track */}
        <div style={{ position: "relative", marginBottom: "var(--space-6)" }}>
          <div style={{
            height: 8,
            background: "var(--color-border-light)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.max(progressPct, 1)}%`,
              background: "var(--color-text)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.6s ease",
            }} />
          </div>

          {/* Milestone ticks */}
          <div style={{ position: "relative", height: 28, marginTop: 4 }}>
            {MILESTONES.map((m, i) => {
              const left = ((i + 1) / MILESTONES.length) * 100;
              const showLabel = labelMilestones.includes(m);
              const passed = currentTotal >= m;
              return (
                <div key={m} style={{ position: "absolute", left: `${left}%`, transform: "translateX(-50%)" }}>
                  <div style={{
                    width: 1,
                    height: 6,
                    background: passed ? "var(--color-text)" : "var(--color-border)",
                    margin: "0 auto",
                  }} />
                  {showLabel && (
                    <div style={{
                      fontSize: 9,
                      fontFamily: "var(--font-mono)",
                      color: passed ? "var(--color-text)" : "var(--color-text-dim)",
                      marginTop: 2,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}>
                      {m >= 1000 ? `${m / 1000}K` : m}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BINGO CARD ── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Milestones</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "var(--space-2)",
        }}>
          {BINGO_CARDS.map((card) => {
            const achieved = currentTotal >= card.threshold;
            return (
              <div
                key={card.label}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                  background: achieved ? "var(--color-bg-inverse)" : "transparent",
                  border: achieved ? "1px solid var(--color-bg-inverse)" : "1px dashed var(--color-border-light)",
                  color: achieved ? "var(--color-text-inverse)" : "var(--color-text-dim)",
                }}
              >
                <div style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  marginBottom: 2,
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  opacity: 0.6,
                }}>
                  {card.threshold >= 1000 ? `~${(card.threshold / 1000).toFixed(0)}K` : `~${card.threshold}`} users
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── REVENUE GRID ── */}
      <div style={cardStyle}>
        <div style={sectionLabel}>Revenue Projections</div>

        {/* Key */}
        <div style={{
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-4)",
        }}>
          <div>Standard $7/mo (450 msgs) &middot; Pro $15/mo (800 msgs) &middot; Credits $2/100</div>
          <div>70/30 Standard/Pro split &middot; 6 free seats &middot; ~1.5&cent;/msg API cost &middot; ~$1/mo blended referral credit</div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Users", "Free", "Std", "Pro", "Revenue", "API Cost", "Credits", "Hosting", "Net"].map((h, i) => (
                  <th key={h} style={{ ...thStyle, textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REVENUE_GRID.map((row) => {
                const isHighlight = row.users === highlightUsers;
                const rowBg = isHighlight ? "var(--color-bg-alt)" : "transparent";
                const rowWeight = isHighlight ? "var(--font-weight-semibold)" : "normal";
                const leftBorder = isHighlight ? "3px solid var(--color-text)" : "3px solid transparent";
                return (
                  <tr key={row.users} style={{ background: rowBg }}>
                    <td style={{ ...tdStyle, textAlign: "left", fontWeight: rowWeight, borderLeft: leftBorder }}>{row.users.toLocaleString()}</td>
                    <td style={tdStyle}>{row.free}</td>
                    <td style={tdStyle}>{row.std.toLocaleString()}</td>
                    <td style={tdStyle}>{row.pro}</td>
                    <td style={tdStyle}>{formatDollar(row.revenue)}</td>
                    <td style={tdStyle}>{formatDollar(row.apiCost)}</td>
                    <td style={tdStyle}>{formatDollar(row.credits)}</td>
                    <td style={tdStyle}>{formatDollar(row.hosting)}</td>
                    <td style={{ ...tdStyle, fontWeight: "var(--font-weight-bold)" }}>
                      {row.net >= 0 ? "+" : ""}{formatDollar(row.net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Wrap-up */}
        <p style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
          lineHeight: "var(--line-height-relaxed)",
          marginTop: "var(--space-4)",
          fontStyle: "italic",
        }}>
          The house never loses. Every user is capped by the {"\u00FC"}l system. At 100 users you net ~$300/mo. At 500 it's a real income.
        </p>
      </div>
    </div>
  );
}

/* ─── Copy Button Helper ─── */

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      display: "inline-flex", alignItems: "center", gap: "var(--space-1-5)",
      padding: "var(--space-1-5) var(--space-3)",
      border: "1px solid var(--color-border-light)",
      borderRadius: "var(--radius-md)",
      background: copied ? "var(--color-bg-inverse)" : "var(--color-bg-elevated)",
      color: copied ? "var(--color-text-inverse)" : "var(--color-text-muted)",
      fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
      fontWeight: "var(--font-weight-medium)", cursor: "pointer",
      transition: "all var(--duration-normal) var(--ease-default)",
      flexShrink: 0,
    }}>
      {copied ? <><CheckIcon size={11} /> Copied</> : <><Copy size={11} /> {label}</>}
    </button>
  );
}

/* ─── Socials Tab Data ─── */

const SITE_META = {
  title: "F\u00FClkit \u2014 I'll be your bestie",
  description: "Your second brain that talks back. AI-powered notes, voice capture, and a bestie that knows everything you\u2019ve saved.",
  ogTitle: "F\u00FClkit \u2014 I'll be your bestie",
  ogDescription: "The app that thinks with you.",
  ogType: "website",
  twitterCard: "summary_large_image",
  themeColor: "#EFEDE8",
  url: "fulkit.app",
};

const SITE_ASSETS = [
  { name: "Favicon", src: "/favicon.ico", previewSize: 32, info: "16x16 + 32x32 ICO", desc: "Browser tab" },
  { name: "PWA Icon", src: "/icon-192.png", previewSize: 48, info: "192x192 PNG", desc: "Android / PWA" },
  { name: "PWA Icon (lg)", src: "/icon-512.png", previewSize: 64, info: "512x512 PNG", desc: "Splash / install" },
  { name: "Apple Touch", src: "/apple-touch-icon.png", previewSize: 60, info: "180x180 PNG", desc: "iOS home screen", rounded: true },
  { name: "Logo Mark", src: "/logo-mark.png", previewSize: 48, info: "PNG", desc: "Sidebar circle logo" },
];

const PITCHES = [
  { cat: "Value Props", text: "$15/mo instead of Claude or OpenAI \u2014 and it knows you." },
  { cat: "Value Props", text: "You\u2019re paying $88/mo for 10 apps. F\u00FClkit replaces them for $7." },
  { cat: "Value Props", text: "F\u00FClkit pays for itself 12x over. $972/year in savings." },
  { cat: "Value Props", text: "ChatGPT forgets you between threads. F\u00FClkit never does." },
  { cat: "Value Props", text: "Stop catching AI up to speed. F\u00FClkit already knows what you\u2019re working on." },
  { cat: "Comparisons", text: "10 apps. $88/month. Or F\u00FClkit. $7." },
  { cat: "Comparisons", text: "Average knowledge worker uses 9.4 apps daily. F\u00FClkit replaces them with 1." },
  { cat: "Comparisons", text: "Workers spend 3.6 hours a day searching for information. F\u00FClkit finds it in seconds." },
  { cat: "Comparisons", text: "Only 15% of saved knowledge is ever found again. F\u00FClkit retrieves it \u2014 proactively." },
  { cat: "Comparisons", text: "Context switching costs 23 minutes to return to focus. With F\u00FClkit, everything\u2019s in one place." },
  { cat: "Features", text: "The Hum: talk to an orb, not a transcript. It silently files your thoughts." },
  { cat: "Features", text: "Whispers: proactive suggestions that drift in and fade out. Like a text from a friend." },
  { cat: "Features", text: "Your notes talk back. Ask a question, get an answer from your own knowledge." },
  { cat: "Features", text: "Three vault modes: local-first, encrypted sync, or F\u00FClkit-managed. Your data, your rules." },
  { cat: "Features", text: "Voice mode that auto-files: ramble for 5 minutes, open your notes, everything\u2019s organized." },
  { cat: "One-Liners", text: "I\u2019ll be your bestie." },
  { cat: "One-Liners", text: "One app. One bestie. Everything else is noise." },
  { cat: "One-Liners", text: "A friend with benefits \u2014 and the benefits are real." },
  { cat: "One-Liners", text: "Your notes finally talk back." },
  { cat: "One-Liners", text: "The app that thinks with you." },
  { cat: "One-Liners", text: "Everything you see was chosen. Everything you don\u2019t was removed." },
  { cat: "One-Liners", text: "Let\u2019s chat and get shit done." },
  { cat: "One-Liners", text: "Your second brain, fully loaded." },
  { cat: "One-Liners", text: "Capture everything. Retrieve anything. Forget nothing." },
  { cat: "Brand", text: "F\u00FClkit \u2014 from German \u2018f\u00FChlen\u2019 (to feel) + kit. A toolkit that feels right." },
  { cat: "Brand", text: "The two dots aren\u2019t decoration. They\u2019re German. F\u00FCl = to feel." },
  { cat: "Brand", text: "Get your F\u00FClkit together." },
  { cat: "Brand", text: "F\u00FClkit around and find out." },
  { cat: "Social Posts", text: "I replaced 10 apps with one. Here\u2019s how." },
  { cat: "Social Posts", text: "My AI remembers everything I\u2019ve ever saved. Yours starts from zero every time." },
  { cat: "Social Posts", text: "I talked to an orb for 5 minutes. It organized my entire week." },
  { cat: "Social Posts", text: "Refer 7 friends, use F\u00FClkit free forever. The math works." },
];

const PITCH_CATEGORIES = ["Value Props", "Comparisons", "Features", "One-Liners", "Brand", "Social Posts"];

/* ─── Socials Tab ─── */

function SocialsTab() {
  const { accessToken } = useAuth();
  const [meta, setMeta] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogSlot, setOgSlot] = useState(1);
  const [ogSlots, setOgSlots] = useState([null, null, null]);
  const [twitterImage, setTwitterImage] = useState(null);
  const [canonicalUrl, setCanonicalUrl] = useState("https://fulkit.app");
  const [syncOgTitle, setSyncOgTitle] = useState(false);
  const [syncOgDesc, setSyncOgDesc] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [author, setAuthor] = useState("");
  const [ogSiteName, setOgSiteName] = useState("F\u00FClkit");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null); // { url, concept, size, aspect, sizeKey }

  // Load current metadata
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/owner/site-metadata", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setMeta(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setOgTitle(data.og_title || "");
        setOgDescription(data.og_description || "");
        setOgSlot(data.og_image_slot || 1);
        if (data.og_image_url) {
          const slots = [null, null, null];
          slots[(data.og_image_slot || 1) - 1] = data.og_image_url;
          setOgSlots(slots);
        }
        if (data.twitter_image_url) setTwitterImage(data.twitter_image_url);
        if (data.canonical_url) setCanonicalUrl(data.canonical_url);
        if (data.keywords) setKeywords(data.keywords);
        if (data.author) setAuthor(data.author);
        if (data.og_site_name) setOgSiteName(data.og_site_name);
        if (data.twitter_handle) setTwitterHandle(data.twitter_handle);
      })
      .catch(() => {});
  }, [accessToken]);

  const saveMeta = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const activeUrl = ogSlots[ogSlot - 1];
      await fetch("/api/owner/site-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title, description, og_title: ogTitle, og_description: ogDescription,
          og_image_slot: ogSlot, og_image_url: activeUrl || null, twitter_image_url: twitterImage || null,
          canonical_url: canonicalUrl,
          keywords, author, og_site_name: ogSiteName, twitter_handle: twitterHandle,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const uploadOg = async (slot, file) => {
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", String(slot));
      const res = await fetch("/api/owner/og-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (res.ok) {
        const { url } = await res.json();
        setOgSlots(prev => { const n = [...prev]; n[slot - 1] = url; return n; });
      }
    } catch {}
    setUploading(null);
  };

  // Sync OG fields when toggled
  useEffect(() => {
    if (syncOgTitle) setOgTitle(title);
  }, [title, syncOgTitle]);

  useEffect(() => {
    if (syncOgDesc) setOgDescription(description);
  }, [description, syncOgDesc]);

  const charCount = (val, min, max) => {
    const n = val.length;
    const color = n >= min && n <= max ? "var(--color-text-dim)"
      : n > max ? "#8A6E4E"
      : "var(--color-text-muted)";
    const hint = n > max ? " \u00B7 too long" : n < min && n > 0 ? " \u00B7 add more" : "";
    return (
      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color, marginTop: 2, textAlign: "right" }}>
        {n}/{max}{hint}
      </div>
    );
  };

  const inputStyle = {
    width: "100%",
    padding: "var(--space-2) var(--space-3)",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-md)",
    background: "var(--color-bg-elevated)",
    color: "var(--color-text)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "var(--font-primary)",
    outline: "none",
  };

  const labelStyle = {
    fontSize: "var(--font-size-2xs)",
    fontWeight: "var(--font-weight-semibold)",
    textTransform: "uppercase",
    letterSpacing: "var(--letter-spacing-wider)",
    color: "var(--color-text-muted)",
    marginBottom: "var(--space-1)",
  };

  const sectionLabel = {
    fontSize: 9,
    fontFamily: "var(--font-mono)",
    fontWeight: "var(--font-weight-medium)",
    textTransform: "uppercase",
    letterSpacing: "var(--letter-spacing-widest)",
    color: "var(--color-text-dim)",
    marginBottom: "var(--space-4)",
  };

  const cardStyle = {
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-4)",
  };

  // Live preview values
  const pTitle = title || "F\u00FClkit \u2014 I'll be your bestie";
  const pDesc = description || "Your second brain that talks back.";
  const pOgTitle = ogTitle || pTitle;
  const pOgDesc = ogDescription || "The app that thinks with you.";
  const pOgImage = ogSlots[ogSlot - 1];
  const pTwitterImage = twitterImage || pOgImage;

  return (
    <div>
      {/* Masthead */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h2 style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tighter)",
          lineHeight: "var(--line-height-tight)",
          marginBottom: "var(--space-1)",
        }}>
          Socials & Identity
        </h2>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          Edit how {"F\u00FCl"}kit appears everywhere. Changes update your real site metadata.
        </p>
      </div>

      {/* ── METADATA + PREVIEWS + IDENTITY ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>

        {/* LEFT: Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={sectionLabel}>Edit Metadata</div>

          <div>
            <div style={labelStyle}>Site Title</div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} placeholder="F\u00FClkit \u2014 I'll be your bestie" />
            {charCount(title, 50, 60)}
          </div>

          <div>
            <div style={labelStyle}>Site Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Your second brain that talks back." />
            {charCount(description, 150, 160)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={labelStyle}>OG Title</div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", cursor: "pointer" }}>
                <input type="checkbox" checked={syncOgTitle} onChange={e => setSyncOgTitle(e.target.checked)} style={{ width: 12, height: 12, accentColor: "var(--color-text)" }} />
                Same as Site Title
              </label>
            </div>
            <input type="text" value={ogTitle} onChange={e => setOgTitle(e.target.value)} disabled={syncOgTitle} style={{ ...inputStyle, ...(syncOgTitle && { opacity: 0.5, cursor: "not-allowed" }) }} placeholder="F&#252;lkit &#8212; I'll be your bestie" />
            {charCount(ogTitle, 50, 60)}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={labelStyle}>OG Description</div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", cursor: "pointer" }}>
                <input type="checkbox" checked={syncOgDesc} onChange={e => setSyncOgDesc(e.target.checked)} style={{ width: 12, height: 12, accentColor: "var(--color-text)" }} />
                Same as Site Description
              </label>
            </div>
            <textarea value={ogDescription} onChange={e => setOgDescription(e.target.value)} disabled={syncOgDesc} rows={2} style={{ ...inputStyle, resize: "vertical", ...(syncOgDesc && { opacity: 0.5, cursor: "not-allowed" }) }} placeholder="The app that thinks with you." />
            {charCount(ogDescription, 55, 200)}
          </div>

          <div>
            <div style={labelStyle}>Canonical URL</div>
            <input value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} style={inputStyle} placeholder="https://fulkit.app" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <div style={labelStyle}>OG Site Name</div>
              <input value={ogSiteName} onChange={e => setOgSiteName(e.target.value)} style={inputStyle} placeholder="F&#252;lkit" />
            </div>
            <div>
              <div style={labelStyle}>Author</div>
              <input value={author} onChange={e => setAuthor(e.target.value)} style={inputStyle} placeholder="Collin Greenleaf" />
            </div>
            <div>
              <div style={labelStyle}>Twitter Handle</div>
              <input value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} style={inputStyle} placeholder="@fulkit" />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Keywords</div>
            <input value={keywords} onChange={e => setKeywords(e.target.value)} style={inputStyle} placeholder="AI, notes, voice, personal assistant, second brain" />
          </div>

          {/* Link */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>fulkit.app</span>
            <CopyButton text="https://fulkit.app" label="Link" />
          </div>

        </div>

        {/* RIGHT: Live Previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={sectionLabel}>Live Previews</div>

          {/* OG Image Preview */}
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>OG Image (1200 × 630)</div>
            <div style={{
              width: "100%",
              aspectRatio: "1200/630",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-bg-alt)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}>
              {pOgImage ? (
                <img src={pOgImage} alt="OG preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No OG image set — upload one on the left</span>
              )}
            </div>
          </div>

          {/* Google SERP */}
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>Google</div>
            <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)", padding: "var(--space-3)" }}>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "#202124", marginBottom: 2 }}>https://fulkit.app</div>
              <div style={{ fontSize: "var(--font-size-base)", color: "#1a0dab", fontWeight: "var(--font-weight-medium)", lineHeight: "var(--line-height-snug)", marginBottom: 2 }}>{pTitle}</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "#4d5156", lineHeight: "var(--line-height-relaxed)" }}>{pDesc}</div>
            </div>
          </div>

          {/* Twitter/X Card */}
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>X / Twitter</div>
            <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              <div style={{
                width: "100%",
                aspectRatio: "2/1",
                background: "var(--color-bg-alt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid var(--color-border-light)",
                overflow: "hidden",
              }}>
                {pTwitterImage ? (
                  <img src={pTwitterImage} alt="Twitter card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No image set</span>
                )}
              </div>
              <div style={{ padding: "var(--space-2-5)" }}>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: 2 }}>fulkit.app</div>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: 2 }}>{pOgTitle}</div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{pOgDesc}</div>
              </div>
            </div>
          </div>

          {/* iMessage Preview */}
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>iMessage</div>
            <div style={{ background: "var(--color-bg-alt)", borderRadius: "var(--radius-lg)", padding: "var(--space-3)", border: "1px solid var(--color-border-light)", maxWidth: 280 }}>
              {pOgImage && <img src={pOgImage} alt="OG" style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: "var(--space-2)" }} />}
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: 2 }}>{pOgTitle}</div>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginBottom: 2 }}>{pOgDesc}</div>
              <div style={{ fontSize: 9, color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)" }}>fulkit.app</div>
            </div>
          </div>

          {/* Meta Tags & Manifest — collapsed */}
          <div style={{ marginTop: "var(--space-5)" }}>
            <button onClick={() => setMetaOpen(!metaOpen)} style={{
              display: "flex", alignItems: "center", gap: "var(--space-1-5)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)",
              textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
              fontFamily: "var(--font-primary)", padding: 0, marginBottom: metaOpen ? "var(--space-2)" : 0,
            }}>
              {metaOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Meta Tags & Manifest
            </button>
            {metaOpen && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <div style={cardStyle}>
                  <div style={{ ...labelStyle, marginBottom: "var(--space-2)" }}>Meta Tags</div>
                  <div style={{ fontSize: 9, color: "var(--color-text-dim)", marginBottom: "var(--space-2)", lineHeight: "var(--line-height-relaxed)" }}>
                    HTML tags platforms read when someone shares your link.
                  </div>
                  {[
                    ["og:title", pOgTitle],
                    ["og:description", pOgDesc],
                    ["og:type", "website"],
                    ["og:site_name", ogSiteName || "(not set)"],
                    ["og:image", pOgImage || "(not set)"],
                    ["twitter:card", "summary_large_image"],
                    ["twitter:image", twitterImage || "(uses og:image)"],
                    ["twitter:site", twitterHandle || "(not set)"],
                    ["canonical", canonicalUrl],
                    ["theme-color", "#EFEDE8"],
                    ["author", author || "(not set)"],
                    ["keywords", keywords || "(not set)"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: "var(--space-2)", padding: "2px 0", fontSize: 9, fontFamily: "var(--font-mono)" }}>
                      <span style={{ color: "var(--color-text-muted)", minWidth: 90, flexShrink: 0 }}>{k}</span>
                      <span style={{ color: v === "(not set)" ? "var(--color-text-dim)" : "var(--color-text)", fontStyle: v === "(not set)" ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <div style={{ ...labelStyle, marginBottom: "var(--space-2)" }}>PWA Manifest</div>
                  <div style={{ fontSize: 9, color: "var(--color-text-dim)", marginBottom: "var(--space-2)", lineHeight: "var(--line-height-relaxed)" }}>
                    Controls how the app appears when installed on a device.
                  </div>
                  {[
                    ["Name", "F\u00FClkit"],
                    ["Display", "standalone"],
                    ["Start URL", "/"],
                    ["Background", "#EFEDE8"],
                    ["Theme", "#EFEDE8"],
                    ["Icons", "192, 512"],
                    ["Verified", "\u2713"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: "var(--space-2)", padding: "2px 0", fontSize: 9, fontFamily: "var(--font-mono)" }}>
                      <span style={{ color: "var(--color-text-muted)", minWidth: 70, flexShrink: 0 }}>{k}</span>
                      <span style={{ color: "var(--color-text)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Site Identity */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div style={sectionLabel}>Site Identity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {SITE_ASSETS.map((asset) => (
              <div key={asset.name} style={{
                padding: "var(--space-3)",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-2)",
              }}>
                <div style={{
                  width: asset.previewSize + 12,
                  height: asset.previewSize + 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-bg-alt)",
                  borderRadius: asset.rounded ? "var(--radius-lg)" : "var(--radius-sm)",
                  border: "1px solid var(--color-border-light)",
                }}>
                  <img src={asset.src} alt={asset.name} width={asset.previewSize} height={asset.previewSize} style={{ imageRendering: asset.previewSize <= 32 ? "pixelated" : "auto", borderRadius: asset.rounded ? "var(--radius-md)" : 0 }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>{asset.name}</div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 1 }}>{asset.info}</div>
                  <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 2 }}>{asset.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── IMAGES ── */}
      <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-6)" }}>

          {/* LEFT: OG Image Manager */}
          <div>
            <div style={sectionLabel}>OG Images</div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-3)", marginTop: "calc(-1 * var(--space-2))" }}>
              Recommended: 1200 {"\u00D7"} 630px. Upload up to 3, click to set live.
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              {[1, 2, 3].map(slot => (
                <div key={slot} style={{ flex: 1 }}>
                  <div
                    onClick={() => { if (ogSlots[slot - 1]) setOgSlot(slot); }}
                    style={{
                      width: "100%",
                      aspectRatio: "1200/630",
                      border: ogSlot === slot && ogSlots[slot - 1] ? "2px solid var(--color-text)" : "1px dashed var(--color-border-light)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--color-bg-alt)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: ogSlots[slot - 1] ? "pointer" : "default",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {ogSlots[slot - 1] ? (
                      <img src={ogSlots[slot - 1]} alt={`OG slot ${slot}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 9, color: "var(--color-text-dim)" }}>{uploading === slot ? "Uploading\u2026" : `Slot ${slot}`}</span>
                    )}
                    {ogSlot === slot && ogSlots[slot - 1] && (
                      <div style={{ position: "absolute", top: 4, right: 4, fontSize: 8, fontFamily: "var(--font-mono)", background: "var(--color-bg-inverse)", color: "var(--color-text-inverse)", padding: "1px 4px", borderRadius: "var(--radius-sm)", textTransform: "uppercase" }}>
                        Live
                      </div>
                    )}
                    {ogSlots[slot - 1] && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setOgSlots(prev => { const n = [...prev]; n[slot - 1] = null; return n; }); }}
                        style={{
                          position: "absolute", top: 4, left: 4,
                          width: 18, height: 18,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(42,40,38,0.7)", border: "none", borderRadius: "50%",
                          cursor: "pointer", padding: 0,
                        }}
                      >
                        <X size={10} color="#EFEDE8" />
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1-5) 0",
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                    }}>
                      <Upload size={10} /> Upload
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) uploadOg(slot, e.target.files[0]); }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Twitter/X Image */}
          <div>
            <div style={sectionLabel}>Twitter / X Image</div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-3)", marginTop: "calc(-1 * var(--space-2))", lineHeight: "var(--line-height-relaxed)" }}>
              Optional. Falls back to OG image if not set. 1200 {"\u00D7"} 630px.
            </div>
            <div style={{ position: "relative" }}>
              <div style={{
                width: "100%",
                aspectRatio: "1200/630",
                border: twitterImage ? "2px solid var(--color-text)" : "1px dashed var(--color-border-light)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg-alt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                position: "relative",
              }}>
                {twitterImage ? (
                  <img src={twitterImage} alt="Twitter card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                    {uploading === "twitter" ? "Uploading\u2026" : "Uses OG image"}
                  </span>
                )}
                {twitterImage && (
                  <button
                    onClick={() => setTwitterImage(null)}
                    style={{
                      position: "absolute", top: 4, left: 4,
                      width: 18, height: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(42,40,38,0.7)", border: "none", borderRadius: "50%",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    <X size={10} color="#EFEDE8" />
                  </button>
                )}
              </div>
              <label style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-1)",
                padding: "var(--space-1-5) 0",
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                marginTop: "var(--space-1)",
              }}>
                <Upload size={10} /> Upload
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading("twitter");
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("slot", "twitter");
                    const res = await fetch("/api/owner/og-upload", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${accessToken}` },
                      body: fd,
                    });
                    if (res.ok) {
                      const { url } = await res.json();
                      setTwitterImage(url);
                    }
                  } catch {}
                  setUploading(null);
                }} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── SAVE ── */}
      <button onClick={saveMeta} disabled={saving} style={{
        padding: "var(--space-2-5) var(--space-4)",
        background: saved ? "var(--color-bg-inverse)" : "var(--color-text)",
        color: "var(--color-bg)",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-semibold)",
        fontFamily: "var(--font-primary)",
        cursor: saving ? "wait" : "pointer",
        transition: "all var(--duration-normal) var(--ease-default)",
        width: "100%",
        marginBottom: "var(--space-6)",
      }}>
        {saved ? "Saved" : saving ? "Saving\u2026" : "Save Changes"}
      </button>

      {/* ── SOCIAL TEMPLATES ── */}
      <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div style={sectionLabel}>Social Templates</div>
        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)", marginTop: "calc(-1 * var(--space-2))", lineHeight: "var(--line-height-relaxed)" }}>
          Ready-to-use designs across 3 sizes. Download as PNG.
        </div>
        {[
          { key: "og", label: "OG / Twitter", dims: "1200 \u00D7 630", aspect: "1200/630", thumbW: 300 },
          { key: "ig-post", label: "Instagram Post", dims: "1080 \u00D7 1350", aspect: "1080/1350", thumbW: 300 },
          { key: "ig-stories", label: "Instagram Stories", dims: "1080 \u00D7 1920", aspect: "1080/1920", thumbW: 300 },
        ].map(row => (
          <div key={row.key} style={{ marginBottom: "var(--space-5)" }}>
            <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-medium)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-widest)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
              {row.label} {"\u00B7"} {row.dims}
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", overflowX: "auto", paddingBottom: "var(--space-2)" }}>
              {["hero", "price", "memory", "stack", "voice", "bestie", "notes"].map(concept => {
                const url = `/api/social/template?concept=${concept}&size=${row.key}`;
                return (
                  <div key={concept} style={{ flexShrink: 0 }}>
                    <div
                      onClick={() => setPreviewTemplate({ url, concept, size: row.label, aspect: row.aspect, sizeKey: row.key })}
                      style={{
                        width: row.thumbW,
                        aspectRatio: row.aspect,
                        border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        background: "var(--color-bg-alt)",
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={url}
                        alt={`${concept} ${row.key}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--space-1)" }}>
                      <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", textTransform: "capitalize" }}>{concept}</span>
                      <a
                        href={url}
                        download={`fulkit-${concept}-${row.key}.png`}
                        style={{
                          display: "flex", alignItems: "center",
                          padding: "2px 6px",
                          background: "var(--color-text)",
                          color: "var(--color-bg)",
                          border: "none",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 8,
                          fontWeight: "var(--font-weight-semibold)",
                          fontFamily: "var(--font-primary)",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                      >
                        <Download size={8} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>


      {/* Template Preview Modal */}
      {previewTemplate && (() => {
        const concepts = ["hero", "price", "memory", "stack", "voice", "bestie", "notes"];
        const sizes = [
          { key: "og", label: "OG / Twitter", aspect: "1200/630" },
          { key: "ig-post", label: "Instagram Post", aspect: "1080/1350" },
          { key: "ig-stories", label: "Instagram Stories", aspect: "1080/1920" },
        ];
        const ci = concepts.indexOf(previewTemplate.concept);
        const si = sizes.findIndex(s => s.key === previewTemplate.sizeKey);
        const totalItems = concepts.length * sizes.length;
        const currentIndex = si * concepts.length + ci;
        const navigate = (delta) => {
          const next = (currentIndex + delta + totalItems) % totalItems;
          const nextSi = Math.floor(next / concepts.length);
          const nextCi = next % concepts.length;
          const nextSize = sizes[nextSi];
          const nextConcept = concepts[nextCi];
          setPreviewTemplate({
            url: `/api/social/template?concept=${nextConcept}&size=${nextSize.key}`,
            concept: nextConcept,
            size: nextSize.label,
            aspect: nextSize.aspect,
            sizeKey: nextSize.key,
          });
        };
        return (
          <div
            onClick={() => setPreviewTemplate(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(42,40,38,0.85)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "var(--space-6)",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: "relative",
                maxWidth: "80vw",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setPreviewTemplate(null)}
                style={{
                  position: "absolute", top: -32, right: 0,
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                <X size={20} color="#EFEDE8" />
              </button>

              {/* Image */}
              <div style={{
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid rgba(239,237,232,0.15)",
                maxHeight: "75vh",
                display: "flex",
              }}>
                <img
                  src={previewTemplate.url}
                  alt={`${previewTemplate.concept} ${previewTemplate.sizeKey}`}
                  style={{ maxWidth: "80vw", maxHeight: "75vh", objectFit: "contain", display: "block" }}
                />
              </div>

              {/* Controls bar */}
              <div style={{
                display: "flex", alignItems: "center", gap: "var(--space-4)",
              }}>
                {/* Prev */}
                <button
                  onClick={() => navigate(-1)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)",
                    color: "#EFEDE8", fontSize: "var(--font-size-lg)", fontFamily: "var(--font-primary)",
                  }}
                >
                  <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} />
                </button>

                {/* Label */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "#EFEDE8", textTransform: "capitalize" }}>
                    {previewTemplate.concept}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "#8A8784" }}>
                    {previewTemplate.size}
                  </div>
                </div>

                {/* Next */}
                <button
                  onClick={() => navigate(1)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)",
                    color: "#EFEDE8", fontSize: "var(--font-size-lg)", fontFamily: "var(--font-primary)",
                  }}
                >
                  <ChevronRight size={18} />
                </button>

                {/* Download */}
                <a
                  href={previewTemplate.url}
                  download={`fulkit-${previewTemplate.concept}-${previewTemplate.sizeKey}.png`}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)",
                    padding: "var(--space-1-5) var(--space-3)",
                    background: "#EFEDE8",
                    color: "#2A2826",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--font-size-2xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: "var(--font-primary)",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <Download size={10} /> PNG
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Pitches Tab ─── */

function PitchesTab() {
  return (
    <div>
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h2 style={{
          fontSize: "var(--font-size-3xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tighter)",
          lineHeight: "var(--line-height-tight)",
          marginBottom: "var(--space-1)",
        }}>
          Pitches
        </h2>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          Sales facts, one-liners, and CTAs. Copy and paste anywhere.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        {PITCH_CATEGORIES.map((cat) => {
          const items = PITCHES.filter(p => p.cat === cat);
          return (
            <div key={cat}>
              <div style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wider)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-2)",
              }}>
                {cat}
              </div>
              <div style={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}>
                {items.map((pitch, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: i < items.length - 1 ? "1px solid var(--color-border-light)" : "none",
                  }}>
                    <span style={{
                      flex: 1,
                      fontSize: "var(--font-size-sm)",
                      color: "var(--color-text)",
                      lineHeight: "var(--line-height-relaxed)",
                    }}>
                      {pitch.text}
                    </span>
                    <CopyButton text={pitch.text} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* ── PAYMENT GATEWAY ── */}
      <div>
        <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", margin: "0 0 var(--space-4)" }}>
          Payment Gateway
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
            <CreditCard size={50} strokeWidth={1} style={{ color: "var(--color-text-muted)" }} />
          </div>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", margin: 0, textAlign: "center" }}>
            Full Stripe lifecycle mock — plan selection, checkout, webhooks, portal, cancellation.
          </p>
          <a
            href="/payment-preview"
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
            Open Payment Preview
          </a>
        </div>
      </div>

      {/* ── LOADING PREVIEW ── */}
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
