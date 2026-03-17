"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ChevronUp,
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
  Code,
  RadioTower,
  Smartphone,
  Monitor,
  Megaphone,
  Eye,
  EyeOff,
  Send,
  Zap,
  BookOpen,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import LoadingMark from "../../components/LoadingMark";
import LogoMark from "../../components/LogoMark";
import { TIERS, CREDITS, COST_BASIS } from "../../lib/ful-config";

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
  { id: "developer", label: "Developer", icon: Code },
  { id: "radio", label: "Radio", icon: RadioTower },
];

const VALID_TAB_IDS = TABS.map((t) => t.id);

/* ─── OwnerPanel: reusable inner content (used by Settings > Owner tab) ─── */
export function OwnerPanel({ initialTab, urlPrefix = "/owner" }) {
  const { compactMode, accessToken } = useAuth();
  const [tab, setTab] = useState(initialTab && VALID_TAB_IDS.includes(initialTab) ? initialTab : "dashboard");
  const [maydayAlert, setMaydayAlert] = useState(false);

  useEffect(() => {
    if (initialTab && VALID_TAB_IDS.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  // MAYDAY alert — lightweight check for unseen error signals
  useEffect(() => {
    if (!accessToken) return;
    const checkMayday = async () => {
      const lastSeen = localStorage.getItem("fulkit-radio-last-seen") || "1970-01-01T00:00:00Z";
      try {
        const res = await fetch("/api/owner/signals?period=24&severity=error&limit=1", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setMaydayAlert(data.signals?.length > 0 && data.signals[0].created_at > lastSeen);
      } catch {}
    };
    checkMayday();
    const interval = setInterval(checkMayday, 60000);
    return () => clearInterval(interval);
  }, [accessToken]);

  // Clear alert when visiting Radio
  useEffect(() => {
    if (tab === "radio") {
      localStorage.setItem("fulkit-radio-last-seen", new Date().toISOString());
      setMaydayAlert(false);
    }
  }, [tab]);

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Sub-tab bar */}
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
                {t.id === "radio" && maydayAlert && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-error, #e53e3e)",
                    flexShrink: 0,
                    marginLeft: -4,
                    alignSelf: "flex-start",
                  }} />
                )}
                {!compactMode && t.label}
              </button>
            </Tooltip>
          );
        })}
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
        {tab === "developer" && <DeveloperTab />}
        {tab === "radio" && <RadioTab />}
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

/* ─── Sparkline — inline SVG mini chart ─── */
function Sparkline({ data, width = 80, height = 24, color = "var(--color-text-muted)" }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 1;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const fillPoints = `${pad},${pad + h} ${points.join(" ")} ${pad + w},${pad + h}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polygon points={fillPoints} fill={color} opacity="0.1" />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Area Chart — full-width traffic visualization ─── */
function AreaChart({ data, metricKey, label, height = 120, color = "#8A8784" }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d[metricKey] || 0);
  const max = Math.max(...values, 1);
  const w = 100; // viewBox percentage
  const h = height;
  const pad = { top: 4, bottom: 16, left: 0, right: 0 };
  const plotH = h - pad.top - pad.bottom;
  const plotW = w;

  const points = values.map((v, i) => {
    const x = pad.left + (i / (values.length - 1)) * plotW;
    const y = pad.top + plotH - (v / max) * plotH;
    return { x, y, v };
  });
  const line = points.map(p => `${p.x},${p.y}`).join(" ");
  const fill = `${pad.left},${pad.top + plotH} ${line} ${pad.left + plotW},${pad.top + plotH}`;

  // Date labels (first, middle, last)
  const formatDate = (d) => {
    if (!d?.date) return "";
    const s = d.date;
    return `${s.slice(4, 6)}/${s.slice(6, 8)}`;
  };

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={frac} x1={pad.left} y1={pad.top + plotH * (1 - frac)} x2={pad.left + plotW} y2={pad.top + plotH * (1 - frac)} stroke="#E5E2DD" strokeWidth="0.3" />
        ))}
        <polygon points={fill} fill={color} opacity="0.08" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots on peaks */}
        {points.map((p, i) => p.v === max ? (
          <circle key={i} cx={p.x} cy={p.y} r="1" fill={color} />
        ) : null)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: 2 }}>
        <span>{formatDate(data[0])}</span>
        <span>{formatDate(data[Math.floor(data.length / 2)])}</span>
        <span>{formatDate(data[data.length - 1])}</span>
      </div>
    </div>
  );
}

/* ─── Card wrapper ─── */
const CARD = { padding: "var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)" };
const DASH_LABEL = { fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" };

/* ─── Bar list ─── */
function BarList({ items, labelKey, valueKey, maxItems = 10, suffix = "", labelStyle = {} }) {
  if (!items || items.length === 0) return <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2) 0" }}>No data yet</div>;
  const max = Math.max(...items.slice(0, maxItems).map(i => i[valueKey] || 0), 1);
  return items.slice(0, maxItems).map((item, i) => (
    <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", minWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...labelStyle }}>
        {item[labelKey] || "(not set)"}
      </span>
      <div style={{ flex: 1, height: 6, background: "var(--color-border-light)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${(item[valueKey] / max) * 100}%`, height: "100%", background: "var(--color-text-muted)", borderRadius: 3, transition: "width var(--duration-slow) var(--ease-default)" }} />
      </div>
      <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", minWidth: 36, textAlign: "right" }}>
        {item[valueKey]}{suffix}
      </span>
    </div>
  ));
}

/* ─── Period toggle ─── */
const PERIODS = [{ label: "7d", value: 7 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }];

function PeriodToggle({ period, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: "var(--color-bg-alt)", borderRadius: "var(--radius-sm)", padding: 2 }}>
      {PERIODS.map(p => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          style={{
            padding: "var(--space-1) var(--space-2-5)",
            fontSize: "var(--font-size-2xs)",
            fontFamily: "var(--font-mono)",
            fontWeight: period === p.value ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
            color: period === p.value ? "var(--color-text)" : "var(--color-text-muted)",
            background: period === p.value ? "var(--color-bg-elevated)" : "transparent",
            border: "none",
            borderRadius: "var(--radius-xs)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-default)",
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function DashboardTab() {
  const { accessToken } = useAuth();
  const [siteMetrics, setSiteMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback((p) => {
    if (!accessToken) return;
    setLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };

    Promise.all([
      fetch("/api/owner/metrics", { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/owner/analytics?period=${p}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/owner/events?period=${p}`, { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([m, a, e]) => {
      if (m) setSiteMetrics(m);
      if (a) setAnalytics(a);
      if (e) setEvents(e);
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [accessToken]);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const handlePeriod = (p) => { setPeriod(p); };

  const paying = siteMetrics ? siteMetrics.standard + siteMetrics.pro : 0;
  const mrr = siteMetrics ? (siteMetrics.standard * 7) + (siteMetrics.pro * 15) : 0;
  const daily = analytics?.daily || [];

  // KPI tiles with sparkline data extracted from daily series
  const kpis = useMemo(() => [
    {
      label: "Visitors",
      value: analytics?.overview ? String(analytics.overview.visitors) : "\u2014",
      sub: analytics?.overview?.newUsers ? `${analytics.overview.newUsers} new` : "\u00A0",
      spark: daily.map(d => d.visitors),
    },
    {
      label: "Sessions",
      value: analytics?.overview ? String(analytics.overview.sessions) : "\u2014",
      sub: "\u00A0",
      spark: daily.map(d => d.sessions),
    },
    {
      label: "Pageviews",
      value: analytics?.overview ? String(analytics.overview.pageviews) : "\u2014",
      sub: "\u00A0",
      spark: daily.map(d => d.pageviews),
    },
    {
      label: "Messages/mo",
      value: siteMetrics ? String(siteMetrics.messagesThisMonth) : "\u2014",
      sub: siteMetrics?.total ? `${siteMetrics.total} user${siteMetrics.total === 1 ? "" : "s"}` : "\u00A0",
      spark: null,
    },
    {
      label: "MRR",
      value: siteMetrics ? `$${mrr}` : "\u2014",
      sub: paying > 0 ? `${paying} paying` : "Pre-launch",
      spark: null,
    },
  ], [analytics, siteMetrics, daily, mrr, paying]);

  if (loading && !analytics && !siteMetrics) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-12)" }}>
        <LoadingMark size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Period toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)" }}>
          Command Center
        </div>
        <PeriodToggle period={period} onChange={handlePeriod} />
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...CARD, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 90 }}>
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
              {k.label}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-2)" }}>
              <div>
                <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>{k.sub}</div>
              </div>
              {k.spark?.length > 1 && <Sparkline data={k.spark} width={60} height={28} />}
            </div>
          </div>
        ))}
      </div>

      {/* Traffic chart — full width */}
      {daily.length > 1 && (
        <div style={{ ...CARD, marginBottom: "var(--space-4)" }}>
          <div style={DASH_LABEL}>Traffic ({period}d)</div>
          <AreaChart data={daily} metricKey="visitors" label="Visitors" height={100} />
        </div>
      )}

      {/* Main grid: Feature Usage + Funnel */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
        {/* Feature Usage */}
        <div style={CARD}>
          <div style={DASH_LABEL}>Feature Usage ({period}d)</div>
          {events?.featureUsage?.length > 0 ? (
            <BarList items={events.featureUsage} labelKey="feature" valueKey="visits" labelStyle={{ textTransform: "capitalize" }} />
          ) : (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2) 0" }}>Collecting data...</div>
          )}
          {events?.featureUsage?.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>
              {events.featureUsage.slice(0, 3).map((f, i) => (
                <div key={i} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>{f.uniqueUsers}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "capitalize" }}>{f.feature} users</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Funnel */}
        <div style={CARD}>
          <div style={DASH_LABEL}>User Funnel</div>
          {events?.funnel ? (
            <>
              {[
                { label: "Signed Up", count: events.funnel.signedUp },
                { label: "Onboarded", count: events.funnel.onboarded },
                { label: "First Chat", count: events.funnel.firstChat },
                { label: "Active/mo", count: events.funnel.activeThisMonth },
                { label: "Paid", count: events.funnel.paid },
              ].map((stage, i) => {
                const base = events.funnel.signedUp || 1;
                const pct = Math.round((stage.count / base) * 100);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", minWidth: 70 }}>
                      {stage.label}
                    </span>
                    <div style={{ flex: 1, height: 8, background: "var(--color-border-light)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-text-muted)", borderRadius: 4, transition: "width var(--duration-slow) var(--ease-default)" }} />
                    </div>
                    <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", minWidth: 44, textAlign: "right" }}>
                      {stage.count} <span style={{ opacity: 0.5 }}>{pct}%</span>
                    </span>
                  </div>
                );
              })}
            </>
          ) : <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>No data yet</div>}
        </div>
      </div>

      {/* Second grid: Pages + Geo + Referrers + Chat Depth */}
      {analytics?.configured && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          {/* Top Pages */}
          <div style={CARD}>
            <div style={DASH_LABEL}>Top Pages</div>
            <BarList items={analytics.topPages} labelKey="path" valueKey="views" />
          </div>

          {/* Geographic */}
          <div style={CARD}>
            <div style={DASH_LABEL}>Geographic</div>
            <BarList items={analytics.countries} labelKey="name" valueKey="users" maxItems={6} />
            {analytics.cities?.length > 0 && (
              <>
                <div style={{ ...DASH_LABEL, marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>US Cities</div>
                <BarList items={analytics.cities} labelKey="name" valueKey="users" maxItems={5} />
              </>
            )}
          </div>

          {/* Referrers */}
          <div style={CARD}>
            <div style={DASH_LABEL}>Referrers</div>
            <BarList items={analytics.referrers} labelKey="source" valueKey="sessions" maxItems={6} />
          </div>

          {/* Devices + Browsers + Chat Depth */}
          <div style={CARD}>
            <div style={DASH_LABEL}>Devices</div>
            <BarList items={analytics.devices} labelKey="type" valueKey="users" />
            {analytics.browsers?.length > 0 && (
              <>
                <div style={{ ...DASH_LABEL, marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>Browsers</div>
                <BarList items={analytics.browsers} labelKey="name" valueKey="users" maxItems={4} />
              </>
            )}
            {events?.chatDepth?.totalMessages > 0 && (
              <>
                <div style={{ ...DASH_LABEL, marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border-light)" }}>Chat Depth</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  {[
                    { label: "Messages", value: events.chatDepth.totalMessages },
                    { label: "Tools", value: events.chatDepth.withTools },
                    { label: "Context", value: events.chatDepth.withContext },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>{m.value}</div>
                      <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>{m.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Integrations row (if any) */}
      {events?.integrations?.length > 0 && (
        <div style={{ ...CARD, marginBottom: "var(--space-4)" }}>
          <div style={DASH_LABEL}>Integration Adoption</div>
          <div style={{ display: "flex", gap: "var(--space-6)" }}>
            {events.integrations.map((int, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{int.provider}</span>
                <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", background: "var(--color-bg-alt)", padding: "2px 6px", borderRadius: "var(--radius-xs)", color: "var(--color-text-muted)" }}>{int.connected}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GA4 not configured fallback */}
      {!analytics?.configured && !loading && (
        <div style={{ ...CARD, textAlign: "center", padding: "var(--space-8)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Connect Google Analytics
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", maxWidth: 400, margin: "0 auto" }}>
            Set GA_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in your environment to unlock traffic, geographic, and engagement data.
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dev Switch ─── */

function DevSwitch({ label, description, on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2-5)",
        width: "100%",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        fontFamily: "var(--font-primary)",
      }}
    >
      <div
        style={{
          width: 26,
          height: 14,
          borderRadius: 7,
          border: "1px solid var(--color-text-muted)",
          background: on ? "var(--color-text-muted)" : "transparent",
          position: "relative",
          transition: "all var(--duration-fast) var(--ease-default)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: on ? "var(--color-bg)" : "var(--color-text-muted)",
            position: "absolute",
            top: 1,
            left: on ? 13 : 1,
            transition: "left var(--duration-fast) var(--ease-default)",
          }}
        />
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)" }}>{label}</div>
        <div style={{ fontSize: 9, color: "var(--color-text-dim)", lineHeight: "var(--line-height-relaxed)" }}>{description}</div>
      </div>
    </button>
  );
}

/* ─── Developer Tab ─── */

/* ─── Signal Radio — listening dashboard ─── */

const RADIO_PERIODS = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

const SEVERITY_LABELS = { error: "Mayday", warning: "Static", info: "Interference" };

function groupSignals(signals) {
  const map = new Map();
  for (const s of signals) {
    const key = s.event;
    if (!map.has(key)) {
      map.set(key, { event: key, latest: s, all: [s] });
    } else {
      const g = map.get(key);
      g.all.push(s);
      if (s.created_at > g.latest.created_at) g.latest = s;
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.latest.created_at.localeCompare(a.latest.created_at)
  );
}

function RadioTab() {
  const { accessToken } = useAuth();
  const [signals, setSignals] = useState([]);
  const [counts, setCounts] = useState({ error: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(24);
  const [filter, setFilter] = useState(null); // null = all, "error" | "warning" | "info"
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [exported, setExported] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purging, setPurging] = useState(false);
  const refreshRef = useRef(null);

  const fetchSignals = useCallback(async (hrs, sev, cur) => {
    if (!accessToken) return;
    const params = new URLSearchParams({ period: String(hrs), limit: "50" });
    if (sev) params.set("severity", sev);
    if (cur) params.set("cursor", cur);
    try {
      const res = await fetch(`/api/owner/signals?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (cur) {
        setSignals((prev) => [...prev, ...(data.signals || [])]);
      } else {
        setSignals(data.signals || []);
        setCounts(data.counts || { error: 0, warning: 0, info: 0 });
      }
      setHasMore(data.hasMore || false);
    } catch {}
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    setLoading(true);
    setCursor(null);
    fetchSignals(period, filter, null);
  }, [period, filter, fetchSignals]);

  // Auto-refresh every 30s
  useEffect(() => {
    refreshRef.current = setInterval(() => {
      fetchSignals(period, filter, null);
    }, 30000);
    return () => clearInterval(refreshRef.current);
  }, [period, filter, fetchSignals]);

  const loadMore = () => {
    if (!signals.length) return;
    const last = signals[signals.length - 1].created_at;
    setCursor(last);
    fetchSignals(period, filter, last);
  };

  const total = counts.error + counts.warning + counts.info;

  const severityColor = (sev) => {
    if (sev === "error") return "var(--color-error, #e53e3e)";
    if (sev === "warning") return "var(--color-warning, #b7791f)";
    return "var(--color-text-muted)";
  };

  const severityBg = (sev) => {
    if (sev === "error") return "rgba(229, 62, 62, 0.08)";
    if (sev === "warning") return "rgba(183, 121, 31, 0.08)";
    return "var(--color-bg-alt)";
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const signalLabel = (event) => event.replace("signal:", "").replace(/_/g, " ");

  const copySignal = (s) => {
    const sev = s.meta?.severity || "info";
    const label = SEVERITY_LABELS[sev]?.toUpperCase() || sev.toUpperCase();
    const name = signalLabel(s.event);
    const time = new Date(s.created_at).toLocaleString();
    const detail = s.meta?.error || s.meta?.message || (s.meta?.elapsed ? `${s.meta.elapsed}ms` : "");
    const extra = Object.entries(s.meta || {})
      .filter(([k]) => !["severity", "error", "message", "elapsed"].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    // Dump every meta key for full debug context
    const metaLines = Object.entries(s.meta || {})
      .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");

    const lines = [
      `[${label}] ${name}`,
      `Event: ${s.event}`,
      `Time: ${time}`,
      `User: ${s.user_label} (${s.user_id})`,
      `Page: ${s.page || "unknown"}`,
      metaLines ? `Meta:\n${metaLines}` : null,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedId(`${s.created_at}-${s.user_id}`);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  const exportSignals = () => {
    if (!signals.length) return;
    const payload = {
      exported: new Date().toISOString(),
      period: `${period}h`,
      filter: filter || "all",
      count: signals.length,
      signals: signals.map((s) => ({
        event: s.event,
        severity: s.meta?.severity || "info",
        time: s.created_at,
        user: `${s.user_label} (${s.user_id})`,
        page: s.page || null,
        meta: Object.fromEntries(
          Object.entries(s.meta || {}).filter(([k]) => k !== "severity")
        ),
      })),
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulkit-signals-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard.writeText(json).then(() => {
      setExported(true);
      setTimeout(() => setExported(false), 1500);
    }).catch(() => {});
  };

  const purgeSignals = async () => {
    if (!accessToken) return;
    setPurging(true);
    try {
      const params = new URLSearchParams({ period: String(period) });
      if (filter) params.set("severity", filter);
      await fetch(`/api/owner/signals?${params}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSignals([]);
      setCounts({ error: 0, warning: 0, info: 0 });
      setConfirmPurge(false);
    } catch {} finally { setPurging(false); }
  };

  const copyGroup = (group) => {
    const sev = group.latest.meta?.severity || "info";
    const label = SEVERITY_LABELS[sev]?.toUpperCase() || sev.toUpperCase();
    const name = signalLabel(group.event);
    const uniqueUsers = new Set(group.all.map((s) => s.user_id)).size;
    const header = [
      `[${label}] ${name} (×${group.all.length})`,
      `Period: ${period}h | Users affected: ${uniqueUsers}`,
      "---",
    ].join("\n");
    const instances = group.all.map((s, i) => {
      const time = new Date(s.created_at).toLocaleString();
      const metaLines = Object.entries(s.meta || {})
        .filter(([k]) => k !== "severity")
        .map(([k, v]) => `    ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("\n");
      return [`Instance ${i + 1}:`, `  Time: ${time}`, `  User: ${s.user_label} (${s.user_id})`, `  Page: ${s.page || "unknown"}`, metaLines ? `  Meta:\n${metaLines}` : null].filter(Boolean).join("\n");
    }).join("\n---\n");
    const text = `${header}\n${instances}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(`group-${group.event}`);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {});
  };

  const grouped = groupSignals(signals);

  if (loading && signals.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-12)" }}>
        <LoadingMark size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)" }}>
        <div style={DASH_LABEL}>Signal Radio</div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {signals.length > 0 && (
            <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
              <button
                onClick={exportSignals}
                title="Export filtered signals as JSON (also copies to clipboard)"
                style={{
                  display: "flex", alignItems: "center", gap: "var(--space-1)",
                  padding: "var(--space-1) var(--space-2-5)",
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-weight-normal)",
                  color: exported ? "var(--color-text)" : "var(--color-text-muted)",
                  background: "var(--color-bg-alt)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  transition: "all var(--duration-fast) var(--ease-default)",
                }}
              >
                {exported ? <CheckIcon size={13} strokeWidth={2} /> : <Download size={13} strokeWidth={1.5} />}
                {exported ? "Copied" : "Export"}
              </button>
              {confirmPurge ? (
                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <button
                    onClick={purgeSignals}
                    disabled={purging}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-1)",
                      padding: "var(--space-1) var(--space-2-5)",
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "#fff",
                      background: "var(--color-error, #e53e3e)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: purging ? "wait" : "pointer",
                    }}
                  >
                    {purging ? "..." : "Purge"}
                  </button>
                  <button
                    onClick={() => setConfirmPurge(false)}
                    style={{
                      padding: "var(--space-1)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--color-text-dim)", lineHeight: 0,
                    }}
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmPurge(true)}
                  title={`Delete ${filter ? SEVERITY_LABELS[filter] : "all"} signals in this period`}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-2-5)",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-normal)",
                    color: "var(--color-text-dim)",
                    background: "var(--color-bg-alt)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    transition: "all var(--duration-fast) var(--ease-default)",
                  }}
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  Delete
                </button>
              )}
            </div>
          )}
        <div style={{ display: "flex", gap: 2, background: "var(--color-bg-alt)", borderRadius: "var(--radius-sm)", padding: 2 }}>
          {RADIO_PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: "var(--space-1) var(--space-2-5)",
                fontSize: "var(--font-size-2xs)",
                fontFamily: "var(--font-mono)",
                fontWeight: period === p.value ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                color: period === p.value ? "var(--color-text)" : "var(--color-text-muted)",
                background: period === p.value ? "var(--color-bg-elevated)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-xs)",
                cursor: "pointer",
                transition: "all var(--duration-fast) var(--ease-default)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
        {[
          { key: "error", label: "Mayday", count: counts.error },
          { key: "warning", label: "Static", count: counts.warning },
          { key: "info", label: "Interference", count: counts.info },
        ].map((kpi) => (
          <button
            key={kpi.key}
            onClick={() => setFilter(filter === kpi.key ? null : kpi.key)}
            style={{
              ...CARD,
              cursor: "pointer",
              textAlign: "center",
              outline: filter === kpi.key ? `2px solid ${severityColor(kpi.key)}` : "none",
              outlineOffset: -2,
            }}
          >
            <div style={{ fontSize: "var(--font-size-2xs)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: "var(--font-size-xl, 20px)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-mono)", color: kpi.count > 0 ? severityColor(kpi.key) : "var(--color-text-dim)" }}>
              {kpi.count}
            </div>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        {[
          { key: null, label: `All (${total})` },
          { key: "error", label: `Mayday (${counts.error})` },
          { key: "warning", label: `Static (${counts.warning})` },
          { key: "info", label: `Interference (${counts.info})` },
        ].map((pill) => (
          <button
            key={pill.key || "all"}
            onClick={() => setFilter(pill.key)}
            style={{
              padding: "var(--space-1) var(--space-2-5)",
              fontSize: "var(--font-size-2xs)",
              fontFamily: "var(--font-primary)",
              fontWeight: filter === pill.key ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              color: filter === pill.key ? "var(--color-text)" : "var(--color-text-muted)",
              background: filter === pill.key ? "var(--color-bg-alt)" : "transparent",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              transition: "all var(--duration-fast) var(--ease-default)",
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Signal feed — grouped by event */}
      {signals.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "var(--space-8)" }}>
          <RadioTower size={24} strokeWidth={1.2} color="var(--color-text-dim)" style={{ marginBottom: "var(--space-3)" }} />
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            {filter ? `No ${SEVERITY_LABELS[filter] || filter} signals in this period` : "All quiet. No signals detected."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {grouped.map((group) => {
            const s = group.latest;
            const sev = s.meta?.severity || "info";
            const isGroup = group.all.length > 1;
            const isExpanded = expandedGroups[group.event];
            const uniqueUsers = isGroup ? new Set(group.all.map((x) => x.user_id)).size : 0;
            const oldest = isGroup ? group.all[group.all.length - 1] : null;
            return (
              <div key={group.event}>
                <div style={{ ...CARD, padding: "var(--space-3)" }}>
                  {/* Title row: copy + signal name + count badge + severity badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                    <button
                      onClick={() => isGroup ? copyGroup(group) : copySignal(s)}
                      title={isGroup ? `Copy all ${group.all.length} signals` : "Copy signal"}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        display: "flex", alignItems: "center", flexShrink: 0,
                        color: copiedId === (isGroup ? `group-${group.event}` : `${s.created_at}-${s.user_id}`) ? "var(--color-text-muted)" : "var(--color-text-dim)",
                        transition: "color var(--duration-fast) var(--ease-default)",
                      }}
                    >
                      {copiedId === (isGroup ? `group-${group.event}` : `${s.created_at}-${s.user_id}`) ? <CheckIcon size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
                    </button>
                    <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {signalLabel(s.event)}
                    </span>
                    {isGroup && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: "var(--font-weight-semibold)",
                        fontFamily: "var(--font-mono)",
                        padding: "2px 5px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text-muted)",
                        background: "var(--color-bg-alt)",
                        flexShrink: 0,
                      }}>
                        &times;{group.all.length}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9,
                      fontWeight: "var(--font-weight-semibold)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--letter-spacing-wider)",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-sm)",
                      color: severityColor(sev),
                      background: severityBg(sev),
                      flexShrink: 0,
                    }}>
                      {SEVERITY_LABELS[sev] || sev}
                    </span>
                  </div>
                  {/* Info row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
                    {isGroup ? (
                      <>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{formatTime(oldest.created_at)} – {formatTime(s.created_at)}</span>
                        <span>&middot;</span>
                        <span>{uniqueUsers} {uniqueUsers === 1 ? "user" : "users"}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{formatTime(s.created_at)}</span>
                        <span>&middot;</span>
                        <span>{s.user_label}</span>
                        {s.page && <><span>&middot;</span><span>{s.page}</span></>}
                      </>
                    )}
                  </div>
                  {/* Meta — show latest signal's meta */}
                  {s.meta && Object.keys(s.meta).filter((k) => k !== "severity").length > 0 && (
                    <div style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", marginTop: "var(--space-1)", display: "flex", flexDirection: "column", gap: 1 }}>
                      {Object.entries(s.meta).filter(([k]) => k !== "severity").map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: "var(--space-2)" }}>
                          <span style={{ color: "var(--color-text-dim)", flexShrink: 0 }}>{k}:</span>
                          <span style={{ wordBreak: "break-all" }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Expand/collapse toggle for groups */}
                  {isGroup && (
                    <button
                      onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.event]: !prev[group.event] }))}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-1)",
                        marginTop: "var(--space-2)", padding: 0,
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
                      {isExpanded ? "Collapse" : `Show all ${group.all.length} signals`}
                    </button>
                  )}
                </div>
                {/* Expanded sub-cards */}
                {isGroup && isExpanded && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: "var(--space-4)", marginTop: 2, borderLeft: `2px solid ${severityColor(sev)}20`, paddingLeft: "var(--space-3)" }}>
                    {group.all.map((sub, j) => {
                      const subSev = sub.meta?.severity || "info";
                      return (
                        <div key={`${sub.created_at}-${j}`} style={{ padding: "var(--space-2)", background: "var(--color-bg-alt)", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
                            <button
                              onClick={() => copySignal(sub)}
                              title="Copy signal"
                              style={{
                                background: "none", border: "none", cursor: "pointer", padding: 0,
                                display: "flex", alignItems: "center", flexShrink: 0,
                                color: copiedId === `${sub.created_at}-${sub.user_id}` ? "var(--color-text-muted)" : "var(--color-text-dim)",
                              }}
                            >
                              {copiedId === `${sub.created_at}-${sub.user_id}` ? <CheckIcon size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={1.5} />}
                            </button>
                            <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                              {formatTime(sub.created_at)}
                            </span>
                            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>&middot;</span>
                            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>{sub.user_label}</span>
                            {sub.page && <><span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>&middot;</span><span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>{sub.page}</span></>}
                          </div>
                          {sub.meta && Object.keys(sub.meta).filter((k) => k !== "severity").length > 0 && (
                            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", display: "flex", flexDirection: "column", gap: 1 }}>
                              {Object.entries(sub.meta).filter(([k]) => k !== "severity").map(([k, v]) => (
                                <div key={k} style={{ display: "flex", gap: "var(--space-2)" }}>
                                  <span style={{ flexShrink: 0 }}>{k}:</span>
                                  <span style={{ wordBreak: "break-all" }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              style={{
                padding: "var(--space-2-5)",
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
                background: "var(--color-bg-alt)",
                border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DeveloperTab() {
  const { accessToken, compactMode, setCompactMode } = useAuth();

  // ── Inspector switch ──
  const [inspector, setInspectorState] = useState(false);
  useEffect(() => {
    setInspectorState(localStorage.getItem("fulkit-inspector") === "true");
  }, []);
  const setInspector = (val) => {
    setInspectorState(val);
    localStorage.setItem("fulkit-inspector", String(val));
    window.dispatchEvent(new StorageEvent("storage", { key: "fulkit-inspector", newValue: String(val) }));
  };

  // ── Tickets ──
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/feedback", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTickets(data || []))
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, [accessToken]);

  const updateStatus = async (id, status) => {
    const res = await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTickets(prev => prev.map(t => t.id === id ? updated : t));
    }
  };

  const STATUS_STYLES = {
    open: { background: "var(--color-bg-alt)", color: "var(--color-text)" },
    seen: { background: "var(--color-border-light)", color: "var(--color-text-secondary)" },
    fixed: { background: "var(--color-bg-inverse)", color: "var(--color-text-inverse)" },
    wontfix: { background: "transparent", color: "var(--color-text-dim)", border: "1px solid var(--color-border-light)" },
  };

  const nextStatus = (s) => ({ open: "seen", seen: "fixed", fixed: "wontfix", wontfix: "open" }[s] || "open");

  const openCount = tickets.filter(t => t.status === "open").length;

  // ── Broadcasts ──
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(true);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [newBroadcast, setNewBroadcast] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/owner/broadcasts", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setBroadcasts(data || []))
      .catch(() => {})
      .finally(() => setBroadcastsLoading(false));
  }, [accessToken]);

  const saveBroadcast = async (broadcast) => {
    const isNew = !broadcast.id;
    const method = isNew ? "POST" : "PATCH";
    const res = await fetch("/api/owner/broadcasts", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(broadcast),
    });
    if (res.ok) {
      const saved = await res.json();
      if (isNew) {
        setBroadcasts(prev => [saved, ...prev]);
      } else {
        setBroadcasts(prev => prev.map(b => b.id === saved.id ? saved : b));
      }
      setEditingBroadcast(null);
      setNewBroadcast(null);
    }
  };

  const toggleBroadcastActive = async (b) => {
    const res = await fetch("/api/owner/broadcasts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id: b.id, active: !b.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBroadcasts(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  };

  const deleteBroadcast = async (id) => {
    const res = await fetch("/api/owner/broadcasts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setBroadcasts(prev => prev.filter(b => b.id !== id));
      if (editingBroadcast?.id === id) setEditingBroadcast(null);
    }
  };

  const quickFacts = broadcasts.filter(b => b.channel === "context" && b.subtype !== "doc");
  const userDocs = broadcasts.filter(b => b.channel === "context" && b.subtype === "doc");
  const fulkitDocs = broadcasts.filter(b => b.channel === "owner-context" && b.subtype === "doc");
  const fabricDocs = broadcasts.filter(b => b.channel === "fabric-context" && b.subtype === "doc");
  const announcementBroadcasts = broadcasts.filter(b => b.channel === "announcement");

  const refreshBroadcasts = useCallback(async () => {
    const res = await fetch("/api/owner/broadcasts", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (res.ok) setBroadcasts(await res.json());
  }, [accessToken]);

  // ── Doc Import ──
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

  // ── Broadcast editor inline ──
  const BroadcastEditor = ({ item, onSave, onCancel }) => {
    const [title, setTitle] = useState(item.title || "");
    const [content, setContent] = useState(item.content || "");
    const channel = item.channel || "context";
    return (
      <div style={{ padding: "var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", marginTop: "var(--space-2)" }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          style={{
            width: "100%", padding: "var(--space-2)", marginBottom: "var(--space-2)",
            background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)",
            color: "var(--color-text)", fontFamily: "var(--font-primary)",
          }}
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Markdown content..."
          rows={5}
          style={{
            width: "100%", padding: "var(--space-2)", marginBottom: "var(--space-2)",
            background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
            color: "var(--color-text)", fontFamily: "var(--font-mono)",
            resize: "vertical", lineHeight: "var(--line-height-relaxed)",
          }}
        />
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "var(--space-1) var(--space-3)", background: "transparent",
              border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...(item.id ? { id: item.id } : {}), title, content, channel })}
            disabled={!title.trim() || !content.trim()}
            style={{
              padding: "var(--space-1) var(--space-3)",
              background: !title.trim() || !content.trim() ? "var(--color-bg-elevated)" : "var(--color-text)",
              color: !title.trim() || !content.trim() ? "var(--color-text-muted)" : "var(--color-bg)",
              border: "none", borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
              cursor: !title.trim() || !content.trim() ? "default" : "pointer",
            }}
          >
            {channel === "announcement" ? "Send" : "Save"}
          </button>
        </div>
      </div>
    );
  };

  const BroadcastItem = ({ b }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-2)",
      padding: "var(--space-2) var(--space-2-5)",
      borderBottom: "1px solid var(--color-border-light)",
      opacity: b.active ? 1 : 0.5,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text)", fontWeight: "var(--font-weight-medium)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {b.title}
          </span>
          {!b.active && (
            <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", background: "var(--color-bg-alt)", padding: "0 4px", borderRadius: "var(--radius-sm)" }}>
              off
            </span>
          )}
        </div>
        <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 1 }}>
          {new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <button
        onClick={() => toggleBroadcastActive(b)}
        title={b.active ? "Deactivate" : "Activate"}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}
      >
        {b.active ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
      <button
        onClick={() => setEditingBroadcast(editingBroadcast?.id === b.id ? null : b)}
        title="Edit"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}
      >
        <FileText size={12} />
      </button>
      <button
        onClick={() => deleteBroadcast(b.id)}
        title="Delete"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );

  // ── Reusable Knowledge Base Card ──
  const KnowledgeBaseCard = ({ title, description, icon: CardIcon, channel, seedTags, storageKey, docs, defaultOpen = true }) => {
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [docTitle, setDocTitle] = useState("");
    const [docContent, setDocContent] = useState("");
    const [docTag, setDocTag] = useState("all");
    const [docSaving, setDocSaving] = useState(false);
    const openKey = `${storageKey}-open`;
    const [kbOpen, setKbOpen] = useState(() => {
      if (typeof window === "undefined") return defaultOpen;
      try {
        const stored = localStorage.getItem(openKey);
        if (stored !== null) return stored === "true";
      } catch {}
      return defaultOpen;
    });
    const toggleKbOpen = useCallback(() => {
      setKbOpen(prev => {
        const next = !prev;
        try { localStorage.setItem(openKey, String(next)); } catch {}
        return next;
      });
    }, [openKey]);
    const [kbFilter, setKbFilter] = useState("all");
    const [addingTag, setAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState("");
    const [editingTagKey, setEditingTagKey] = useState(null);
    const [editingTagLabel, setEditingTagLabel] = useState("");
    const [dragTagKey, setDragTagKey] = useState(null);
    const [dragOverTagKey, setDragOverTagKey] = useState(null);
    const [fileDragOver, setFileDragOver] = useState(false);
    const [fileImporting, setFileImporting] = useState(false);
    const [dragDocId, setDragDocId] = useState(null);
    const [dragOverDocTag, setDragOverDocTag] = useState(null);

    const [kbTags, setKbTags] = useState(() => {
      if (typeof window === "undefined") return seedTags;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch {}
      return seedTags;
    });

    useEffect(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(kbTags)); } catch {}
    }, [kbTags, storageKey]);

    const docOnlyTags = [...new Set(docs.map(d => d.tag).filter(t => t && !kbTags.some(kt => kt.key === t)))];
    const allTags = [{ key: "all", label: "All" }, ...kbTags, ...docOnlyTags.map(t => ({ key: t, label: t }))];
    const filteredDocs = kbFilter === "all" ? docs : docs.filter(d => d.tag === kbFilter);
    const selectedDoc = docs.find(d => d.id === selectedDocId);

    const addCustomTag = () => {
      const raw = newTagName.trim();
      if (!raw) return;
      const key = raw.toLowerCase().replace(/\s+/g, "_");
      if (kbTags.some(t => t.key === key)) return;
      setKbTags(prev => [...prev, { key, label: raw }]);
      setKbFilter(key);
      setNewTagName("");
      setAddingTag(false);
    };

    const renameTag = (oldKey, newLabel) => {
      const newKey = newLabel.trim().toLowerCase().replace(/\s+/g, "_");
      if (!newLabel.trim() || (newKey !== oldKey && kbTags.some(t => t.key === newKey))) return;
      setKbTags(prev => prev.map(t => t.key === oldKey ? { key: newKey, label: newLabel.trim() } : t));
      if (newKey !== oldKey) {
        docs.filter(d => d.tag === oldKey).forEach(d => {
          saveBroadcast({ id: d.id, title: d.title, content: d.content, channel, subtype: "doc", tag: newKey });
        });
        if (kbFilter === oldKey) setKbFilter(newKey);
        if (docTag === oldKey) setDocTag(newKey);
      }
      setEditingTagKey(null);
      setEditingTagLabel("");
    };

    const deleteTag = (key) => {
      setKbTags(prev => prev.filter(t => t.key !== key));
      if (kbFilter === key) setKbFilter("all");
    };

    const handleTagDragStart = (key) => { setDragTagKey(key); };
    const handleTagDragOver = (e, key) => { e.preventDefault(); setDragOverTagKey(key); };
    const handleTagDrop = (targetKey) => {
      if (!dragTagKey || dragTagKey === targetKey) { setDragTagKey(null); setDragOverTagKey(null); return; }
      setKbTags(prev => {
        const list = [...prev];
        const fromIdx = list.findIndex(t => t.key === dragTagKey);
        const toIdx = list.findIndex(t => t.key === targetKey);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        return list;
      });
      setDragTagKey(null);
      setDragOverTagKey(null);
    };
    const handleTagDragEnd = () => { setDragTagKey(null); setDragOverTagKey(null); };

    const handleDocDragStart = (e, docId) => {
      setDragDocId(docId);
      e.dataTransfer.setData("text/plain", docId);
    };
    const handleDocDropOnTag = async (tagKey) => {
      if (!dragDocId) return;
      const doc = docs.find(d => d.id === dragDocId);
      if (!doc || doc.tag === tagKey) { setDragDocId(null); setDragOverDocTag(null); return; }
      const newTag = tagKey === "all" ? null : tagKey;
      await saveBroadcast({ id: doc.id, title: doc.title, content: doc.content, channel, subtype: "doc", tag: newTag });
      setDragDocId(null);
      setDragOverDocTag(null);
    };
    const handleDocDragEnd = () => { setDragDocId(null); setDragOverDocTag(null); };

    const handleFileDrop = async (e) => {
      e.preventDefault();
      setFileDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter(f =>
        f.name.endsWith(".md") || f.name.endsWith(".txt") || f.type === "text/plain" || f.type === "text/markdown"
      );
      if (files.length === 0) return;
      setFileImporting(true);
      const tag = kbFilter !== "all" ? kbFilter : null;
      for (const file of files) {
        try {
          const content = await file.text();
          const fileTitle = file.name.replace(/\.(md|txt)$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          await saveBroadcast({ title: fileTitle, content, channel, subtype: "doc", tag });
        } catch (err) {
          console.error("[kb] file import error:", err);
        }
      }
      await refreshBroadcasts();
      setFileImporting(false);
    };

    const selectDoc = (doc) => {
      setSelectedDocId(doc.id);
      setDocTitle(doc.title);
      setDocContent(doc.content);
      setDocTag(doc.tag || "all");
    };

    const newDoc = () => {
      setSelectedDocId("new");
      setDocTitle("");
      setDocContent("");
      setDocTag(kbFilter !== "all" ? kbFilter : kbTags[0]?.key || seedTags[0]?.key || "general");
    };

    const saveDoc = async () => {
      if (!docTitle.trim() || !docContent.trim()) return;
      setDocSaving(true);
      const tag = docTag === "all" ? null : docTag;
      const payload = { title: docTitle, content: docContent, channel, subtype: "doc", tag };
      if (selectedDocId !== "new") payload.id = selectedDocId;
      await saveBroadcast(payload);
      if (selectedDocId === "new") {
        await refreshBroadcasts();
        // Find the newest doc matching our title in the refreshed broadcasts
        const freshDocs = broadcasts.filter(b => b.channel === channel && b.subtype === "doc" && b.title === docTitle);
        if (freshDocs.length > 0) setSelectedDocId(freshDocs[0].id);
      }
      setDocSaving(false);
    };

    const deleteDoc = async () => {
      if (!selectedDocId || selectedDocId === "new") return;
      await deleteBroadcast(selectedDocId);
      setSelectedDocId(null);
      setDocTitle("");
      setDocContent("");
    };

    return (
      <div style={{ padding: "var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-lg)" }}>
        <button
          onClick={toggleKbOpen}
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%",
            background: "none", border: "none", cursor: "pointer",
            padding: "var(--space-2) 0", marginBottom: kbOpen ? "var(--space-1)" : 0,
            position: "relative", zIndex: 1,
          }}
        >
          <CardIcon size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" }}>
            {title}
          </span>
          <span style={{ fontSize: 9, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", marginRight: "var(--space-2)" }}>
            {docs.filter(d => d.active).length} active
          </span>
          {kbOpen ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>

        {kbOpen && (
          <>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-3)" }}>
              {description}
            </p>

            {/* Tag pills */}
            <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap", marginBottom: "var(--space-3)", alignItems: "center" }}>
              {allTags.map(tag => {
                const active = kbFilter === tag.key;
                const count = tag.key === "all" ? docs.length : docs.filter(d => d.tag === tag.key).length;
                const isDraggable = tag.key !== "all";
                const isEditing = editingTagKey === tag.key;
                const isDragOver = dragOverTagKey === tag.key && dragTagKey !== tag.key;

                if (isEditing) {
                  return (
                    <div key={tag.key} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <input
                        value={editingTagLabel}
                        onChange={e => setEditingTagLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") renameTag(tag.key, editingTagLabel);
                          if (e.key === "Escape") { setEditingTagKey(null); setEditingTagLabel(""); }
                        }}
                        onBlur={() => renameTag(tag.key, editingTagLabel)}
                        autoFocus
                        style={{
                          width: Math.max(60, editingTagLabel.length * 7 + 20),
                          padding: "var(--space-1) var(--space-2)",
                          border: "1px solid var(--color-text)", borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-size-xs)", color: "var(--color-text)",
                          background: "var(--color-bg)", fontFamily: "var(--font-primary)",
                        }}
                      />
                      <button
                        onClick={() => deleteTag(tag.key)}
                        title="Delete tag"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 18, height: 18, border: "none", background: "transparent",
                          color: "var(--color-text-dim)", cursor: "pointer", borderRadius: "var(--radius-sm)",
                        }}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                }

                const isDocTarget = dragDocId && dragOverDocTag === tag.key;

                return (
                  <button
                    key={tag.key}
                    draggable={isDraggable && !dragDocId}
                    onDragStart={() => isDraggable && !dragDocId && handleTagDragStart(tag.key)}
                    onDragOver={e => {
                      e.preventDefault();
                      if (dragDocId) { setDragOverDocTag(tag.key); }
                      else if (isDraggable) { handleTagDragOver(e, tag.key); }
                    }}
                    onDragLeave={() => { if (dragDocId) setDragOverDocTag(null); }}
                    onDrop={() => {
                      if (dragDocId) { handleDocDropOnTag(tag.key); }
                      else if (isDraggable) { handleTagDrop(tag.key); }
                    }}
                    onDragEnd={handleTagDragEnd}
                    onClick={() => { setKbFilter(tag.key); setSelectedDocId(null); }}
                    onDoubleClick={() => {
                      if (tag.key === "all") return;
                      setEditingTagKey(tag.key);
                      setEditingTagLabel(tag.label);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: "var(--space-1)",
                      padding: "var(--space-1) var(--space-2-5)",
                      border: (isDragOver || isDocTarget) ? "1px dashed var(--color-text-muted)" : "none",
                      outline: "none",
                      background: isDocTarget ? "var(--color-bg-alt)" : active ? "var(--color-bg-alt)" : "transparent",
                      borderRadius: "var(--radius-md)",
                      color: active ? "var(--color-text)" : "var(--color-text-muted)",
                      fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                      fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
                      cursor: isDraggable ? "grab" : "pointer",
                      transition: "all 100ms ease",
                      opacity: dragTagKey === tag.key ? 0.4 : 1,
                      transform: isDocTarget ? "scale(1.08)" : "none",
                    }}
                  >
                    {isDraggable && active && !dragDocId && <GripVertical size={10} style={{ opacity: 0.4, marginLeft: -4 }} />}
                    {tag.label}
                    {count > 0 && tag.key !== "all" && (
                      <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", opacity: 0.6 }}>{count}</span>
                    )}
                  </button>
                );
              })}
              {addingTag ? (
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                  <input
                    value={newTagName}
                    onChange={e => setNewTagName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCustomTag(); if (e.key === "Escape") { setAddingTag(false); setNewTagName(""); } }}
                    placeholder="Tag name"
                    autoFocus
                    style={{
                      width: 100, padding: "var(--space-1) var(--space-2)",
                      border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)", color: "var(--color-text)",
                      background: "var(--color-bg)", fontFamily: "var(--font-primary)",
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setAddingTag(true)}
                  title="Add tag"
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "var(--space-1) var(--space-2)",
                    border: "none", background: "transparent",
                    color: "var(--color-text-dim)", cursor: "pointer",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  <Plus size={12} />
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--space-4)", minHeight: 280 }}>
              {/* Doc list */}
              <div
                onDragOver={e => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setFileDragOver(true); }}
                onDragLeave={() => setFileDragOver(false)}
                onDrop={handleFileDrop}
                style={{
                  border: fileDragOver ? "2px dashed var(--color-text-muted)" : "none",
                  borderRadius: fileDragOver ? "var(--radius-md)" : undefined,
                  padding: fileDragOver ? "var(--space-2)" : undefined,
                  transition: "all 150ms ease",
                }}
              >
                <button
                  onClick={newDoc}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                    width: "100%", padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-text)", color: "var(--color-bg)",
                    border: "none", borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                    cursor: "pointer", marginBottom: "var(--space-2)",
                  }}
                >
                  <Plus size={12} /> {fileImporting ? "Importing..." : "New document"}
                </button>
                {fileDragOver ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "var(--space-6)", fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)", fontStyle: "italic",
                  }}>
                    Drop .md files here
                  </div>
                ) : broadcastsLoading ? (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Loading...</div>
                ) : filteredDocs.length === 0 ? (
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic", padding: "var(--space-2)" }}>
                    {docs.length === 0 ? "No documents yet. Drag .md files here or click New." : "No docs in this tag."}
                  </div>
                ) : (
                  <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    {filteredDocs.map(d => (
                      <button
                        key={d.id}
                        draggable
                        onDragStart={e => handleDocDragStart(e, d.id)}
                        onDragEnd={handleDocDragEnd}
                        onClick={() => selectDoc(d)}
                        style={{
                          display: "flex", alignItems: "center", gap: "var(--space-2)",
                          width: "100%", textAlign: "left",
                          padding: "var(--space-2) var(--space-3)",
                          background: selectedDocId === d.id ? "var(--color-bg-alt)" : "transparent",
                          border: "none", borderBottom: "1px solid var(--color-border-light)",
                          cursor: "grab", opacity: dragDocId === d.id ? 0.4 : d.active ? 1 : 0.5,
                        }}
                      >
                        <GripVertical size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text)", fontWeight: "var(--font-weight-medium)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {d.title}
                            </span>
                            {!d.active && (
                              <span style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", textTransform: "uppercase", background: "var(--color-bg-alt)", padding: "0 4px", borderRadius: "var(--radius-sm)" }}>off</span>
                            )}
                          </div>
                          <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 1 }}>
                            {d.tag && <span style={{ marginRight: 4 }}>{d.tag}</span>}
                            {new Date(d.updated_at || d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor */}
              <div>
                {selectedDocId ? (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <input
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      placeholder="Document title"
                      style={{
                        width: "100%", padding: "var(--space-2) var(--space-3)",
                        background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)",
                        color: "var(--color-text)", fontFamily: "var(--font-primary)",
                        fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)",
                      }}
                    />
                    {/* Tag selector */}
                    <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
                      {allTags.filter(t => t.key !== "all").map(tag => (
                        <button
                          key={tag.key}
                          onClick={() => setDocTag(tag.key)}
                          style={{
                            padding: "2px var(--space-2)",
                            border: docTag === tag.key ? "1px solid var(--color-text)" : "1px solid var(--color-border-light)",
                            background: docTag === tag.key ? "var(--color-bg-alt)" : "transparent",
                            borderRadius: "var(--radius-sm)", fontSize: 9,
                            color: docTag === tag.key ? "var(--color-text)" : "var(--color-text-dim)",
                            fontFamily: "var(--font-mono)", cursor: "pointer",
                          }}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={docContent}
                      onChange={e => setDocContent(e.target.value)}
                      placeholder="Write your document in markdown — or drag a .md file here..."
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--color-text-muted)"; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = "var(--color-border-light)"; }}
                      onDrop={async e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = "var(--color-border-light)";
                        const file = Array.from(e.dataTransfer.files).find(f =>
                          f.name.endsWith(".md") || f.name.endsWith(".txt") || f.type === "text/plain" || f.type === "text/markdown"
                        );
                        if (!file) return;
                        const content = await file.text();
                        setDocContent(content);
                        if (!docTitle.trim()) {
                          setDocTitle(file.name.replace(/\.(md|txt)$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
                        }
                      }}
                      style={{
                        width: "100%", flex: 1, minHeight: 200, padding: "var(--space-3)",
                        background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
                        borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)",
                        color: "var(--color-text)", fontFamily: "var(--font-mono)",
                        resize: "vertical", lineHeight: "var(--line-height-relaxed)",
                        marginBottom: "var(--space-2)",
                        transition: "border-color 150ms ease",
                      }}
                    />
                    <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      {selectedDocId !== "new" && selectedDoc && (
                        <button
                          onClick={() => toggleBroadcastActive(selectedDoc)}
                          style={{
                            padding: "var(--space-1) var(--space-3)", background: "transparent",
                            border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                            fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "var(--space-1)",
                          }}
                        >
                          {selectedDoc.active ? <><EyeOff size={11} /> Deactivate</> : <><Eye size={11} /> Activate</>}
                        </button>
                      )}
                      <div style={{ flex: 1 }} />
                      {selectedDocId !== "new" && (
                        <button
                          onClick={deleteDoc}
                          style={{
                            padding: "var(--space-1) var(--space-3)", background: "transparent",
                            border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
                            fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "var(--space-1)",
                          }}
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      )}
                      <button
                        onClick={saveDoc}
                        disabled={!docTitle.trim() || !docContent.trim() || docSaving}
                        style={{
                          padding: "var(--space-1-5) var(--space-4)",
                          background: !docTitle.trim() || !docContent.trim() ? "var(--color-bg-alt)" : "var(--color-text)",
                          color: !docTitle.trim() || !docContent.trim() ? "var(--color-text-muted)" : "var(--color-bg)",
                          border: "none", borderRadius: "var(--radius-sm)",
                          fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                          cursor: !docTitle.trim() || !docContent.trim() ? "default" : "pointer",
                        }}
                      >
                        {docSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    height: "100%", minHeight: 280,
                    border: "1px dashed var(--color-border-light)", borderRadius: "var(--radius-md)",
                    color: "var(--color-text-dim)", fontSize: "var(--font-size-sm)",
                  }}>
                    Select or create a document
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "var(--space-4)", alignItems: "start" }}>
      {/* ── LEFT: Tickets ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
            Tickets
          </span>
          {openCount > 0 && (
            <span style={{
              fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)",
              background: "var(--color-text)", color: "var(--color-bg)",
              padding: "1px 6px", borderRadius: "var(--radius-full)",
            }}>
              {openCount}
            </span>
          )}
        </div>

        {ticketsLoading ? (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Loading...</div>
        ) : tickets.length === 0 ? (
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No tickets yet.</div>
        ) : (
          <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            {tickets.map((t, i) => (
              <div key={t.id} style={{
                display: "flex", alignItems: "flex-start", gap: "var(--space-3)",
                padding: "var(--space-2-5) var(--space-3)",
                borderBottom: i < tickets.length - 1 ? "1px solid var(--color-border-light)" : "none",
                background: t.status === "open" ? "var(--color-bg-elevated)" : "transparent",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)", lineHeight: "var(--line-height-relaxed)", wordBreak: "break-word" }}>
                    {t.message}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 2 }}>
                    {t.email || "unknown"} {"\u00b7"} {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {t.page_url ? ` \u00b7 ${t.page_url.replace(/^https?:\/\/[^/]+/, "")}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => updateStatus(t.id, nextStatus(t.status))}
                  style={{
                    padding: "2px 8px", borderRadius: "var(--radius-sm)",
                    fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-medium)",
                    textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)",
                    cursor: "pointer", border: "none", flexShrink: 0,
                    ...STATUS_STYLES[t.status],
                  }}
                >
                  {t.status}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Outgoing ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", paddingTop: "var(--space-6)" }}>

        {/* Dev Switches */}
        <div style={{ padding: "var(--space-3)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: 9, fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
            Switches
          </div>
          <DevSwitch label="Expanded View" description="Show labels in sidebar nav" on={!compactMode} onToggle={() => setCompactMode(!compactMode)} />
          <div style={{ height: "var(--space-2)" }} />
          <DevSwitch label="Inspector" description="CSS selector overlay + Ctrl+Shift+I" on={inspector} onToggle={() => setInspector(!inspector)} />
        </div>

        {/* Quick Facts */}
        <div style={{ padding: "var(--space-3)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <Zap size={12} strokeWidth={2} color="var(--color-text-muted)" />
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1 }}>
              Quick Facts
            </span>
            <button
              onClick={() => { setNewBroadcast({ channel: "context", subtype: "fact" }); setEditingBroadcast(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}
            >
              <Plus size={14} />
            </button>
          </div>
          <p style={{ fontSize: 9, color: "var(--color-text-dim)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-2)" }}>
            Short facts F{"\u00FC"}lkit knows about you and your brand.
          </p>
          {broadcastsLoading ? (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Loading...</div>
          ) : quickFacts.length === 0 && !newBroadcast ? (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No quick facts yet.</div>
          ) : (
            <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              {quickFacts.map(b => (
                <div key={b.id}>
                  <BroadcastItem b={b} />
                  {editingBroadcast?.id === b.id && (
                    <BroadcastEditor item={b} onSave={saveBroadcast} onCancel={() => setEditingBroadcast(null)} />
                  )}
                </div>
              ))}
            </div>
          )}
          {newBroadcast?.channel === "context" && newBroadcast?.subtype !== "doc" && (
            <BroadcastEditor item={newBroadcast} onSave={saveBroadcast} onCancel={() => setNewBroadcast(null)} />
          )}
        </div>

        {/* Announcements */}
        <div style={{ padding: "var(--space-3)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <Megaphone size={12} strokeWidth={2} color="var(--color-text-muted)" />
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1 }}>
              Announcements
            </span>
            <button
              onClick={() => { setNewBroadcast({ channel: "announcement" }); setEditingBroadcast(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}
            >
              <Plus size={14} />
            </button>
          </div>
          <p style={{ fontSize: 9, color: "var(--color-text-dim)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-2)" }}>
            Visible to users as a banner. Dismissible, delivered once.
          </p>
          {broadcastsLoading ? (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Loading...</div>
          ) : announcementBroadcasts.length === 0 && !newBroadcast ? (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No announcements yet.</div>
          ) : (
            <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              {announcementBroadcasts.map(b => (
                <div key={b.id}>
                  <BroadcastItem b={b} />
                  {editingBroadcast?.id === b.id && (
                    <BroadcastEditor item={b} onSave={saveBroadcast} onCancel={() => setEditingBroadcast(null)} />
                  )}
                </div>
              ))}
            </div>
          )}
          {newBroadcast?.channel === "announcement" && (
            <BroadcastEditor item={newBroadcast} onSave={saveBroadcast} onCancel={() => setNewBroadcast(null)} />
          )}
        </div>

        {/* Doc Import */}
        <div style={{ padding: "var(--space-3)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <FileText size={12} strokeWidth={2} color="var(--color-text-muted)" />
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>
              Doc Import
            </span>
          </div>
          <p style={{ fontSize: 9, color: "var(--color-text-dim)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-2)" }}>
            Import project docs from GitHub as notes.
          </p>

          {!discovered ? (
            <button
              onClick={discoverDocs}
              disabled={loadingFiles}
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-1-5) var(--space-3)",
                background: loadingFiles ? "var(--color-bg-elevated)" : "var(--color-text)",
                color: loadingFiles ? "var(--color-text-muted)" : "var(--color-bg)",
                border: "none", borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                cursor: loadingFiles ? "wait" : "pointer",
              }}
            >
              <RefreshCw size={11} strokeWidth={2} style={loadingFiles ? { animation: "spin 1s linear infinite" } : {}} />
              {loadingFiles ? "Discovering..." : "Discover from GitHub"}
            </button>
          ) : (
            <>
              <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-2)", flexWrap: "wrap" }}>
                <button
                  onClick={() => setSelectedFiles(new Set(mdFiles.map(f => f.path)))}
                  style={{ padding: "2px var(--space-2)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: 9, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  style={{ padding: "2px var(--space-2)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: 9, color: "var(--color-text-secondary)", cursor: "pointer" }}
                >
                  None
                </button>
                <button
                  onClick={discoverDocs}
                  disabled={loadingFiles}
                  style={{ padding: "2px var(--space-2)", background: "transparent", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", fontSize: 9, color: "var(--color-text-secondary)", cursor: "pointer", marginLeft: "auto" }}
                >
                  <RefreshCw size={9} strokeWidth={2} style={{ marginRight: 2, verticalAlign: "middle", ...(loadingFiles ? { animation: "spin 1s linear infinite" } : {}) }} />
                  Refresh
                </button>
              </div>

              <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: "var(--space-2)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)" }}>
                {mdFiles.map((file) => {
                  const name = file.path.split("/").pop();
                  return (
                    <label
                      key={file.path}
                      style={{
                        display: "flex", alignItems: "center", gap: "var(--space-1-5)",
                        padding: "3px var(--space-2)",
                        borderBottom: "1px solid var(--color-border-light)",
                        cursor: "pointer", fontSize: "var(--font-size-xs)",
                        background: selectedFiles.has(file.path) ? "var(--color-bg-elevated)" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFile(file.path)}
                        style={{ accentColor: "var(--color-text-primary)" }}
                      />
                      <span style={{ color: "var(--color-text-primary)", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
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
                  padding: "var(--space-1-5) var(--space-3)",
                  background: importing || selectedFiles.size === 0 ? "var(--color-bg-elevated)" : "var(--color-text)",
                  color: importing || selectedFiles.size === 0 ? "var(--color-text-muted)" : "var(--color-bg)",
                  border: "none", borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                  cursor: importing || selectedFiles.size === 0 ? "default" : "pointer",
                }}
              >
                <Upload size={11} strokeWidth={2} />
                {importing ? "Importing..." : `Import ${selectedFiles.size}`}
              </button>
            </>
          )}

          {importResult?.success && (
            <div style={{ marginTop: "var(--space-2)", fontSize: 9, color: "var(--color-success)" }}>{importResult.success}</div>
          )}
          {importResult?.error && (
            <div style={{ marginTop: "var(--space-2)", fontSize: 9, color: "var(--color-error)" }}>{importResult.error}</div>
          )}
        </div>
      </div>

      {/* ── USER KNOWLEDGE BASE ── */}
      <div style={{ gridColumn: "1 / -1", marginTop: "var(--space-2)" }}>
        <KnowledgeBaseCard
          title="User Knowledge Base"
          description="What users see in chat. Product info, pricing, support, brand voice."
          icon={Users}
          channel="context"
          seedTags={[
            { key: "brand", label: "Brand" },
            { key: "product", label: "Product" },
            { key: "support", label: "Support" },
            { key: "policy", label: "Policy" },
          ]}
          storageKey="fulkit-kb-tags-user"
          docs={userDocs}
          defaultOpen={true}
        />
      </div>

      {/* ── FÜLKIT KNOWLEDGE BASE (owner only) ── */}
      <div style={{ gridColumn: "1 / -1", marginTop: "var(--space-2)" }}>
        <KnowledgeBaseCard
          title={`F\u00fclkit Knowledge Base`}
          description="Internal docs. Dev specs, business ops, margins. Only your chat sees these."
          icon={BookOpen}
          channel="owner-context"
          seedTags={[
            { key: "ful_system", label: "Ful_System" },
            { key: "dev", label: "Dev" },
            { key: "ops", label: "Ops" },
          ]}
          storageKey="fulkit-kb-tags-fulkit"
          docs={fulkitDocs}
          defaultOpen={false}
        />
      </div>

      {/* ── FABRIC KNOWLEDGE BASE (B-Side's island) ── */}
      <div style={{ gridColumn: "1 / -1", marginTop: "var(--space-2)", paddingBottom: "var(--space-16)" }}>
        <KnowledgeBaseCard
          title="Fabric Knowledge Base"
          description="B-Side's world. Music specs, audio analysis, crate system. Only /fabric chat sees these."
          icon={Music}
          channel="fabric-context"
          seedTags={[
            { key: "persona", label: "Persona" },
            { key: "audio", label: "Audio" },
            { key: "crate", label: "Crate" },
          ]}
          storageKey="fulkit-kb-tags-fabric"
          docs={fabricDocs}
          defaultOpen={false}
        />
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
      { name: "Voyage AI", url: "https://dash.voyageai.com", note: "voyage-3.5-lite — note embeddings for semantic search. 1024d, $0.02/M tokens." },
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
  { users: 20, free: 6, std: 10, pro: 4, revenue: 150, apiCost: 90, credits: 14, hosting: 25, net: 21 },
  { users: 35, free: 6, std: 20, pro: 9, revenue: 315, apiCost: 158, credits: 29, hosting: 25, net: 103 },
  { users: 50, free: 6, std: 31, pro: 13, revenue: 474, apiCost: 225, credits: 44, hosting: 30, net: 175 },
  { users: 75, free: 6, std: 48, pro: 21, revenue: 747, apiCost: 338, credits: 69, hosting: 35, net: 305 },
  { users: 100, free: 6, std: 66, pro: 28, revenue: 1014, apiCost: 450, credits: 94, hosting: 40, net: 430 },
  { users: 150, free: 6, std: 101, pro: 43, revenue: 1554, apiCost: 675, credits: 144, hosting: 50, net: 685 },
  { users: 200, free: 6, std: 136, pro: 58, revenue: 2094, apiCost: 900, credits: 194, hosting: 50, net: 950 },
  { users: 300, free: 6, std: 206, pro: 88, revenue: 3174, apiCost: 1350, credits: 294, hosting: 60, net: 1470 },
  { users: 500, free: 6, std: 346, pro: 148, revenue: 5334, apiCost: 2250, credits: 494, hosting: 75, net: 2515 },
  { users: 750, free: 6, std: 521, pro: 223, revenue: 8034, apiCost: 3375, credits: 744, hosting: 100, net: 3815 },
  { users: 1000, free: 6, std: 696, pro: 298, revenue: 10734, apiCost: 4500, credits: 994, hosting: 200, net: 5040 },
  { users: 1500, free: 6, std: 1046, pro: 448, revenue: 16134, apiCost: 6750, credits: 1494, hosting: 200, net: 7690 },
  { users: 2000, free: 6, std: 1396, pro: 598, revenue: 21534, apiCost: 9000, credits: 1994, hosting: 200, net: 10340 },
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
  { label: "Real side income", threshold: 500 },
  { label: "Real business", threshold: 750 },
  { label: "Four figures net", threshold: 1000 },
  { label: "Scaling", threshold: 1500 },
  { label: "Quit your day job", threshold: 2000 },
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
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-primary)", color: "var(--color-text)" }}>
          {currentTotal} <span style={{ color: "var(--color-text-dim)" }}>|</span> 2,000
        </div>
        <div style={{
          height: 3,
          background: "var(--color-border-light)",
          borderRadius: 2,
          overflow: "hidden",
          marginTop: "var(--space-1-5)",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.max(progressPct, 1)}%`,
            background: "var(--color-text-dim)",
            borderRadius: 2,
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>

      {/* ── MILESTONES ── */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <div style={sectionLabel}>Milestones</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "var(--space-1-5)",
        }}>
          {BINGO_CARDS.map((card) => {
            const achieved = currentTotal >= card.threshold;
            return (
              <div
                key={card.label}
                style={{
                  padding: "var(--space-1-5) var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  background: achieved ? "var(--color-bg-inverse)" : "transparent",
                  border: achieved ? "1px solid var(--color-bg-inverse)" : "1px dashed var(--color-border-light)",
                  color: achieved ? "var(--color-text-inverse)" : "var(--color-text)",
                }}
              >
                <div style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  lineHeight: "var(--line-height-tight)",
                  color: achieved ? "var(--color-text-inverse)" : "var(--color-text)",
                }}>
                  {card.label}
                </div>
                <div style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  opacity: achieved ? 0.7 : 0.6,
                  marginTop: 1,
                  color: achieved ? "var(--color-text-inverse)" : "var(--color-text)",
                }}>
                  {card.threshold >= 1000 ? `${(card.threshold / 1000).toFixed(0)}K` : card.threshold}
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
          <div>{TIERS.standard.label} {TIERS.standard.priceLabel} ({TIERS.standard.messages} msgs) &middot; {TIERS.pro.label} {TIERS.pro.priceLabel} ({TIERS.pro.messages} msgs) &middot; Credits {CREDITS.priceLabel}/{CREDITS.amount}</div>
          <div>70/30 {TIERS.standard.label}/{TIERS.pro.label} split &middot; 6 free seats &middot; ~{COST_BASIS.avgCostPerMsg * 100}&cent;/msg API cost &middot; ~$1/mo blended referral credit</div>
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
          The house never loses. Every user is capped by the {"\u00FC"}l system. At 100 users you net ~$430/mo. At 1,000 it's $5K/mo.
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
  { cat: "Value Props", text: `${TIERS.pro.priceLabel} for a personal AI that actually knows you.` },
  { cat: "Value Props", text: `You\u2019re paying $88/mo for 10 apps. F\u00FClkit replaces them for $${TIERS.standard.price}.` },
  { cat: "Value Props", text: `F\u00FClkit pays for itself 12x over. $${(88 - TIERS.standard.price) * 12}/year in savings.` },
  { cat: "Value Props", text: "ChatGPT forgets you between threads. F\u00FClkit never does." },
  { cat: "Value Props", text: "Stop catching AI up to speed. F\u00FClkit already knows what you\u2019re working on." },
  { cat: "Comparisons", text: `10 apps. $88/month. Or F\u00FClkit. $${TIERS.standard.price}.` },
  { cat: "Comparisons", text: "Average knowledge worker uses 9.4 apps daily. F\u00FClkit replaces them with 1." },
  { cat: "Comparisons", text: "Workers spend 3.6 hours a day searching for information. F\u00FClkit finds it in seconds." },
  { cat: "Comparisons", text: "Only 15% of saved knowledge is ever found again. F\u00FClkit retrieves it \u2014 proactively." },
  { cat: "Comparisons", text: "Context switching costs 23 minutes to return to focus. With F\u00FClkit, everything\u2019s in one place." },
  { cat: "Comparisons", text: "ChatGPT, Claude, Gemini, Copilot \u2014 they all sit there with a cursor blinking until you type. F\u00FClkit texts first." },
  { cat: "Features", text: "The Hum: talk to an orb, not a transcript. It silently files your thoughts." },
  { cat: "Features", text: "Whispers: proactive suggestions that drift in and fade out. Like a text from a friend." },
  { cat: "Features", text: "Your notes talk back. Ask a question, get an answer from your own knowledge." },
  { cat: "Features", text: "Three vault modes: local-first, encrypted sync, or F\u00FClkit-managed. Your data, your rules." },
  { cat: "Features", text: "Voice mode that auto-files: ramble for 5 minutes, open your notes, everything\u2019s organized." },
  { cat: "Features", text: "Proactive chat: F\u00FClkit opens the conversation based on what it knows about you. No other AI does this." },
  { cat: "One-Liners", text: "I\u2019ll be your bestie." },
  { cat: "One-Liners", text: "One app. One bestie. Everything else is noise." },
  { cat: "One-Liners", text: "A friend with benefits \u2014 and the benefits are real." },
  { cat: "One-Liners", text: "Your notes finally talk back." },
  { cat: "One-Liners", text: "The app that thinks with you." },
  { cat: "One-Liners", text: "Everything you see was chosen. Everything you don\u2019t was removed." },
  { cat: "One-Liners", text: "Let\u2019s chat and get shit done." },
  { cat: "One-Liners", text: "Your second brain, fully loaded." },
  { cat: "One-Liners", text: "Capture everything. Retrieve anything. Forget nothing." },
  { cat: "One-Liners", text: "Every AI chat waits for you. F\u00FClkit texts first." },
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

/* ─── Download the App Card (visual PWA install) ─── */

function DownloadAppCard() {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (!ios && !standalone) {
      const handler = (e) => {
        e.preventDefault();
        deferredPromptRef.current = e;
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPromptRef.current) {
      setInstalling(true);
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === "accepted") setInstalled(true);
      deferredPromptRef.current = null;
      setInstalling(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-6)", marginBottom: "var(--space-6)" }}>
      <div style={{
        fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-medium)",
        textTransform: "uppercase", letterSpacing: "var(--letter-spacing-widest)",
        color: "var(--color-text-dim)", marginBottom: "var(--space-3)",
      }}>
        Download the App
      </div>

      <div style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
      }}>
        {/* Logo + heading */}
        <div style={{ display: "flex", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{
              width: 76, height: 76, borderRadius: 18,
              background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              <LogoMark size={60} />
            </div>
            <div style={{
              fontSize: 9, color: "var(--color-text-dim)", textAlign: "center", marginTop: 3,
              fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)",
            }}>
              F{"\u00FC"}lkit
            </div>
          </div>
          <div style={{ paddingTop: 4 }}>
            <div style={{
              fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text)", marginBottom: 4,
            }}>
              Add F{"\u00FC"}lkit to Home Screen
            </div>
            <div style={{
              fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)",
              lineHeight: "var(--line-height-relaxed)",
            }}>
              Install for quick access and an app-like experience
            </div>
          </div>
        </div>

        {/* Device instructions */}
        <div style={{
          display: "flex", flexDirection: "column", gap: "var(--space-2)",
          marginBottom: "var(--space-4)",
          padding: "var(--space-3)",
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-light)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            <Smartphone size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-dim)" }} />
            <span><strong style={{ color: "var(--color-text)" }}>iPhone / iPad</strong> — Tap Share in Safari, then &quot;Add to Home Screen&quot;</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            <Smartphone size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-dim)" }} />
            <span><strong style={{ color: "var(--color-text)" }}>Android</strong> — Tap menu in Chrome, then &quot;Install app&quot;</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)" }}>
            <Monitor size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: "var(--color-text-dim)" }} />
            <span><strong style={{ color: "var(--color-text)" }}>Desktop</strong> — Look for the install icon in your address bar</span>
          </div>
        </div>

        {/* Status / Install button */}
        {isStandalone ? (
          <div style={{
            textAlign: "center", padding: "var(--space-2)",
            fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)",
            fontStyle: "italic",
          }}>
            Already installed
          </div>
        ) : installed ? (
          <div style={{
            textAlign: "center", padding: "var(--space-2)",
            fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)",
            fontStyle: "italic",
          }}>
            Installed — you&apos;re all set
          </div>
        ) : (
          <button
            onClick={handleInstall}
            disabled={installing || (isIOS && !deferredPromptRef.current)}
            style={{
              width: "100%", padding: "var(--space-2-5)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
              background: deferredPromptRef.current ? "var(--color-text)" : "var(--color-text-muted)",
              color: "var(--color-bg)",
              border: "none", borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: deferredPromptRef.current ? "pointer" : "default",
              transition: "all var(--duration-normal) var(--ease-default)",
            }}
          >
            <Download size={14} strokeWidth={2} />
            {installing ? "Installing\u2026" : "Install App"}
          </button>
        )}
      </div>
    </div>
  );
}

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
      const res = await fetch("/api/owner/site-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title, description, og_title: ogTitle, og_description: ogDescription,
          og_image_slot: ogSlot, og_image_url: activeUrl || null, twitter_image_url: twitterImage || null,
          canonical_url: canonicalUrl,
          keywords, author, og_site_name: ogSiteName, twitter_handle: twitterHandle,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Save failed: " + (err.error || res.statusText));
        setSaving(false);
        return;
      }
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
              <div style={labelStyle}>Bluesky Handle</div>
              <input value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} style={inputStyle} placeholder="@fulkit.bsky.social" />
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
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: "var(--space-1)" }}>Bluesky</div>
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
                  <img src={pTwitterImage} alt="Social card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            <div style={sectionLabel}>Social Card Image</div>
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
                  <img src={twitterImage} alt="Social card" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

      {/* ── DOWNLOAD THE APP ── */}
      <DownloadAppCard />

      {/* ── SOCIAL TEMPLATES ── */}
      <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div style={sectionLabel}>Social Templates</div>
        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginBottom: "var(--space-4)", marginTop: "calc(-1 * var(--space-2))", lineHeight: "var(--line-height-relaxed)" }}>
          Ready-to-use designs across 3 sizes. Download as PNG.
        </div>
        {[
          { key: "og", label: "OG / Bluesky", dims: "1200 \u00D7 630", aspect: "1200/630", thumbW: 300 },
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
          { key: "og", label: "OG / Bluesky", aspect: "1200/630" },
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
  const [tiers, setTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierIdx, setTierIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showCopy, setShowCopy] = useState(null); // copy_after_answer text
  const [textVal, setTextVal] = useState("");
  const [multiSel, setMultiSel] = useState([]);

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: q }] = await Promise.all([
        supabase.from("onboarding_tiers").select("*").order("sort_order"),
        supabase.from("questions").select("*").order("sort_order"),
      ]);
      setTiers(t || []);
      setQuestions(q || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Loading preview...</div>;
  if (tiers.length === 0) return <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>No tiers configured. Add tiers in the Questions tab first.</div>;

  const tier = tiers[tierIdx];
  const tierQs = questions.filter((q) => q.tier_id === tier?.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const question = tierQs[qIdx];
  const totalQ = tierQs.length;
  const progressPct = ((tierIdx + (showAssignment ? 1 : (qIdx / Math.max(totalQ, 1)))) / tiers.length) * 100;

  const advance = () => {
    if (showCopy) { setShowCopy(null); return; }
    if (question?.copy_after_answer) {
      setShowCopy(question.copy_after_answer);
      return;
    }
    goNext();
  };

  const goNext = () => {
    setTextVal("");
    setMultiSel([]);
    setShowCopy(null);
    if (qIdx + 1 < totalQ) {
      setQIdx(qIdx + 1);
    } else {
      setShowAssignment(true);
    }
  };

  const nextTier = () => {
    setShowAssignment(false);
    setQIdx(0);
    if (tierIdx + 1 < tiers.length) setTierIdx(tierIdx + 1);
    else setTierIdx(0); // loop back
  };

  const jumpToTier = (i) => {
    setTierIdx(i);
    setQIdx(0);
    setShowAssignment(false);
    setShowCopy(null);
    setTextVal("");
    setMultiSel([]);
  };

  const previewCard = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)",
    maxWidth: 520,
    margin: "0 auto",
    minHeight: 300,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <div>
        <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-1)" }}>
          Onboarding Preview
        </h2>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          Live preview of the onboarding flow. No data is saved.
        </p>

        {/* Other previews */}
        <div style={{ marginBottom: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <a href="/payment-preview" target="_blank" rel="noopener noreferrer" style={{ ...btnSmall, textDecoration: "none" }}>
              <CreditCard size={12} /> Payment
            </a>
            <a href="/loading-preview" target="_blank" rel="noopener noreferrer" style={{ ...btnSmall, textDecoration: "none" }}>
              Loading
            </a>
          </div>
        </div>

        {/* Tier selector */}
        <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          {tiers.map((t, i) => (
            <button
              key={t.id}
              onClick={() => jumpToTier(i)}
              style={{
                ...btnSmall,
                background: i === tierIdx ? "var(--color-text)" : "var(--color-bg-elevated)",
                color: i === tierIdx ? "var(--color-bg)" : "var(--color-text-secondary)",
                fontSize: "var(--font-size-2xs)",
                padding: "var(--space-1) var(--space-2)",
              }}
            >
              Tier {t.tier_num}: {t.label}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "var(--color-border-light)", borderRadius: 2, marginBottom: "var(--space-4)" }}>
          <div style={{ height: "100%", background: "var(--color-text-dim)", borderRadius: 2, width: `${progressPct}%`, transition: "width 400ms ease" }} />
        </div>
      </div>

      {/* Preview card */}
      <div style={previewCard}>
        {showCopy ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-6)" }}>
              "{showCopy}"
            </p>
            <button onClick={goNext} style={btnPrimary}>Continue</button>
          </div>
        ) : showAssignment ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--color-success-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-4)" }}>
              <CheckIcon size={18} strokeWidth={2.5} color="var(--color-success)" />
            </div>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
              Tier {tier.tier_num} Complete
            </p>
            {tier.assignment_copy && (
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-4)" }}>
                "{tier.assignment_copy}"
              </p>
            )}
            {tier.primary_destination && (
              <div style={{ display: "block", width: "100%", textAlign: "center", padding: "var(--space-2-5) var(--space-4)", background: "var(--color-text)", color: "var(--color-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-2)" }}>
                Go to {tier.primary_destination}
              </div>
            )}
            <button onClick={nextTier} style={{ ...btnSmall, marginTop: "var(--space-2)" }}>
              {tierIdx < tiers.length - 1 ? "Next Tier" : "Back to Tier 1"}
            </button>
          </div>
        ) : question ? (
          <div>
            {/* Phase label */}
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-bold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
              Tier {tier.tier_num} &middot; Q{qIdx + 1} of {totalQ}
            </div>

            {/* Trust line */}
            {(qIdx === 0 && tier.trust_line) && (
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                {tier.trust_line}
              </p>
            )}
            {question.trust_line && (
              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                {question.trust_line}
              </p>
            )}

            {/* Question */}
            <h3 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", lineHeight: "var(--line-height-snug)", marginBottom: "var(--space-2)" }}>
              {question.text}
            </h3>
            {question.why && (
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-4)" }}>
                {question.why}
              </p>
            )}

            {/* Renderer by type */}
            {(question.type === "text_input" || question.type === "text") && (
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input
                  value={textVal}
                  onChange={(e) => setTextVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) advance(); }}
                  placeholder={question.placeholder || "Type here..."}
                  style={{ flex: 1, padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }}
                />
                <button onClick={advance} disabled={!textVal.trim()} style={{ ...btnPrimary, opacity: textVal.trim() ? 1 : 0.4 }}>Go</button>
              </div>
            )}

            {(question.type === "single_select" || (question.type === "choice" && !question.multi)) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(question.options || []).map((opt) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {(question.type === "multi_select" || (question.type === "choice" && question.multi)) && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {(question.options || []).map((opt) => {
                    const label = typeof opt === "string" ? opt : opt.label;
                    const sel = multiSel.includes(label);
                    return (
                      <button key={label} onClick={() => setMultiSel((p) => sel ? p.filter((x) => x !== label) : [...p, label])} style={{ padding: "var(--space-2-5) var(--space-4)", background: sel ? "var(--color-text)" : "var(--color-bg-elevated)", color: sel ? "var(--color-bg)" : "var(--color-text)", border: sel ? "1px solid var(--color-text)" : "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {multiSel.length > 0 && (
                  <button onClick={advance} style={{ ...btnPrimary, marginTop: "var(--space-3)" }}>Continue</button>
                )}
              </>
            )}

            {question.type === "integration_picker" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(question.options || [{ label: "Spotify" }, { label: "Google Calendar" }, { label: "Apple Calendar" }, { label: "Add another" }, { label: "I'll do this later" }]).map((opt) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "vault_setup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {(question.options || []).map((opt) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "feature_walkthrough" && (
              <button onClick={advance} style={btnPrimary}>Got it</button>
            )}

            {/* Skip */}
            {(question.skippable || question.type === "text_input" || question.type === "text") && (
              <button onClick={goNext} style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)" }}>
                Skip
              </button>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
            No questions in this tier.
          </div>
        )}
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

/* ─── Questions Tab (v2 — tier-based) ─── */
const COMPLETION_TRIGGERS = [
  "visited_inbox", "performed_search", "visited_threads", "visited_calendar",
  "used_capture", "visited_action_list", "visited_settings", "visited_bsides",
];

function QuestionsTab() {
  const [tiers, setTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTiers, setExpandedTiers] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingTier, setEditingTier] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchAll = useCallback(async () => {
    const [{ data: t }, { data: q }] = await Promise.all([
      supabase.from("onboarding_tiers").select("*").order("sort_order"),
      supabase.from("questions").select("*").order("sort_order"),
    ]);
    setTiers(t || []);
    setQuestions(q || []);
    if (Object.keys(expandedTiers).length === 0 && t?.length) {
      const exp = {};
      t.forEach((tier) => (exp[tier.id] = true));
      setExpandedTiers(exp);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleTier = (id) =>
    setExpandedTiers((prev) => ({ ...prev, [id]: !prev[id] }));

  /* ── Tier CRUD ── */
  const saveTier = async (tier) => {
    const { error } = await supabase
      .from("onboarding_tiers")
      .update({
        label: tier.label,
        intro: tier.intro,
        trust_line: tier.trust_line || "",
        assignment_copy: tier.assignment_copy || "",
        primary_destination: tier.primary_destination || "",
        secondary_destination: tier.secondary_destination || "",
        secondary_condition: tier.secondary_condition || "",
        completion_trigger: tier.completion_trigger || "",
      })
      .eq("id", tier.id);
    if (!error) {
      setTiers((prev) => prev.map((t) => (t.id === tier.id ? { ...t, ...tier } : t)));
      setEditingTier(null);
    }
  };

  const addTier = async () => {
    const maxSort = tiers.reduce((mx, t) => Math.max(mx, t.sort_order || 0), 0);
    const maxNum = tiers.reduce((mx, t) => Math.max(mx, t.tier_num || 0), 0);
    const { data, error } = await supabase
      .from("onboarding_tiers")
      .insert({ tier_num: maxNum + 1, label: "New Tier", intro: "", sort_order: maxSort + 1 })
      .select()
      .single();
    if (!error && data) {
      setTiers((prev) => [...prev, data]);
      setExpandedTiers((prev) => ({ ...prev, [data.id]: true }));
      setEditingTier(data.id);
    }
  };

  const deleteTier = async (id) => {
    const count = questions.filter((q) => q.tier_id === id).length;
    if (count > 0 && !window.confirm(`Delete tier and its ${count} question(s)?`)) return;
    await supabase.from("questions").delete().eq("tier_id", id);
    await supabase.from("onboarding_tiers").delete().eq("id", id);
    setTiers((prev) => prev.filter((t) => t.id !== id));
    setQuestions((prev) => prev.filter((q) => q.tier_id !== id));
  };

  /* ── Load V2 Defaults ── */
  const loadDefaults = async () => {
    if (!window.confirm("This will replace ALL existing tiers and questions with the v2 defaults. Continue?")) return;
    setSeeding(true);
    try {
      const seedData = (await import("../../scripts/onboarding-v2-seed.json")).default;
      // Wipe existing
      await supabase.from("questions").delete().not("tier_id", "is", null);
      await supabase.from("onboarding_tiers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      // Insert tiers + questions
      const hasOptions = (t) => t === "single_select" || t === "multi_select" || t === "choice" || t === "integration_picker";
      for (let ti = 0; ti < seedData.tiers.length; ti++) {
        const tier = seedData.tiers[ti];
        const { data: newTier, error: tErr } = await supabase
          .from("onboarding_tiers")
          .insert({
            tier_num: tier.tier_num || ti + 1,
            label: tier.label,
            intro: tier.intro || "",
            trust_line: tier.trust_line || "",
            assignment_copy: tier.assignment_copy || "",
            primary_destination: tier.primary_destination || "",
            secondary_destination: tier.secondary_destination || "",
            secondary_condition: tier.secondary_condition || "",
            completion_trigger: tier.completion_trigger || "",
            sort_order: ti + 1,
          })
          .select()
          .single();
        if (tErr) throw new Error(tErr.message);
        if (tier.questions?.length > 0) {
          const rows = tier.questions.map((q, qi) => ({
            tier_id: newTier.id,
            question_id: q.id || `q_${Date.now()}_${qi}`,
            text: q.text || "",
            why: q.why || "",
            type: q.type || "text_input",
            multi: q.type === "multi_select" || q.multi || false,
            options: hasOptions(q.type) && q.options
              ? q.options.map((o) => (typeof o === "string" ? { label: o, value: o.toLowerCase().replace(/\s+/g, "_") } : o))
              : null,
            placeholder: q.placeholder || "",
            skippable: q.skippable || false,
            trust_line: q.trust_line || "",
            copy_after_answer: q.copy_after_answer || "",
            allow_voice: q.allow_voice || false,
            fulkit_action: q.fulkit_action || "",
            follow_up: q.follow_up || null,
            sort_order: qi,
          }));
          const { error: qErr } = await supabase.from("questions").insert(rows);
          if (qErr) throw new Error(qErr.message);
        }
      }
      setLoading(true);
      await fetchAll();
    } catch (err) {
      alert("Seed failed: " + err.message);
    }
    setSeeding(false);
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
        multi: q.type === "multi_select",
        trust_line: q.trust_line || "",
        copy_after_answer: q.copy_after_answer || "",
        allow_voice: q.allow_voice || false,
        fulkit_action: q.fulkit_action || "",
        follow_up: q.follow_up || null,
      })
      .eq("id", q.id);
    if (!error) {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...q } : x)));
      setEditingQuestion(null);
    }
  };

  const addQuestion = async (tierId) => {
    const tierQs = questions.filter((q) => q.tier_id === tierId);
    const maxSort = tierQs.reduce((mx, q) => Math.max(mx, q.sort_order || 0), 0);
    const { data, error } = await supabase
      .from("questions")
      .insert({
        tier_id: tierId,
        question_id: `q_${Date.now()}`,
        text: "",
        why: "",
        type: "text_input",
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
            {tiers.length} tiers, {questions.length} questions
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button onClick={loadDefaults} disabled={seeding} style={{ ...btnSmall, background: seeding ? "var(--color-border-light)" : "var(--color-success-soft, var(--color-bg-elevated))", color: seeding ? "var(--color-text-dim)" : "var(--color-text)" }}>
            {seeding ? "Seeding..." : "Load V2 Defaults"}
          </button>
          <button onClick={() => setShowExport(true)} style={btnSmall}>Export</button>
          <button onClick={() => setShowImport(true)} style={btnSmall}>Import JSON</button>
          <button onClick={addTier} style={btnPrimary}>
            <Plus size={12} /> Add Tier
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          tiers={tiers}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); setLoading(true); fetchAll(); }}
        />
      )}

      {showExport && (
        <ExportModal
          tiers={tiers}
          questions={questions}
          onClose={() => setShowExport(false)}
        />
      )}

      {tiers.map((tier) => {
        const tierQs = questions
          .filter((q) => q.tier_id === tier.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const expanded = expandedTiers[tier.id];

        return (
          <div key={tier.id} style={{ ...cardStyle, marginBottom: "var(--space-4)" }}>
            {/* Tier header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-3) var(--space-4)",
                cursor: "pointer",
              }}
              onClick={() => toggleTier(tier.id)}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {editingTier === tier.id ? (
                <TierEditForm
                  tier={tier}
                  onUpdate={(field, val) => setTiers((prev) => prev.map((t) => t.id === tier.id ? { ...t, [field]: val } : t))}
                  onSave={() => saveTier(tier)}
                  onCancel={() => setEditingTier(null)}
                />
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginRight: "var(--space-2)" }}>
                      Tier {tier.tier_num}
                    </span>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                      {tier.label}
                    </span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>
                      {tierQs.length} question{tierQs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingTier(tier.id); }}
                    style={{ ...btnSmall, padding: "var(--space-1) var(--space-2)" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTier(tier.id); }}
                    style={{ ...btnDanger, padding: "var(--space-1) var(--space-2)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>

            {tier.intro && editingTier !== tier.id && (
              <div style={{ padding: "0 var(--space-4) var(--space-2)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                {tier.intro}
              </div>
            )}

            {tier.completion_trigger && editingTier !== tier.id && (
              <div style={{ padding: "0 var(--space-4) var(--space-2)", display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {tier.primary_destination && (
                  <span style={{ fontSize: "var(--font-size-2xs)", padding: "1px var(--space-1-5)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", color: "var(--color-text-muted)" }}>
                    {tier.primary_destination}
                  </span>
                )}
                <span style={{ fontSize: "var(--font-size-2xs)", padding: "1px var(--space-1-5)", borderRadius: "var(--radius-sm)", background: "var(--color-bg-surface)", color: "var(--color-text-muted)" }}>
                  {tier.completion_trigger}
                </span>
              </div>
            )}

            {/* Questions list */}
            {expanded && (
              <div style={{ padding: "0 var(--space-4) var(--space-3)" }}>
                {tierQs.map((q, qi) => (
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
                  onClick={() => addQuestion(tier.id)}
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

/* ─── Tier edit form (expanded in-place) ─── */
function TierEditForm({ tier, onUpdate, onSave, onCancel }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <input
          value={tier.label}
          onChange={(e) => onUpdate("label", e.target.value)}
          style={{ ...inputStyle, flex: 1, fontWeight: "var(--font-weight-semibold)" }}
          placeholder="Tier label"
        />
      </div>
      <textarea
        value={tier.intro || ""}
        onChange={(e) => onUpdate("intro", e.target.value)}
        style={{ ...inputStyle, resize: "vertical" }}
        rows={2}
        placeholder="Tier intro / opener copy"
      />
      <textarea
        value={tier.trust_line || ""}
        onChange={(e) => onUpdate("trust_line", e.target.value)}
        style={{ ...inputStyle, resize: "vertical" }}
        rows={2}
        placeholder="Trust line (privacy copy)"
      />
      <textarea
        value={tier.assignment_copy || ""}
        onChange={(e) => onUpdate("assignment_copy", e.target.value)}
        style={{ ...inputStyle, resize: "vertical" }}
        rows={2}
        placeholder="Feature assignment copy"
      />
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <input
          value={tier.primary_destination || ""}
          onChange={(e) => onUpdate("primary_destination", e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Primary destination (e.g. /home)"
        />
        <input
          value={tier.secondary_destination || ""}
          onChange={(e) => onUpdate("secondary_destination", e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Secondary destination"
        />
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <input
          value={tier.secondary_condition || ""}
          onChange={(e) => onUpdate("secondary_condition", e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Secondary condition (e.g. spotify_connected)"
        />
        <select
          value={tier.completion_trigger || ""}
          onChange={(e) => onUpdate("completion_trigger", e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        >
          <option value="">Completion trigger...</option>
          {COMPLETION_TRIGGERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <button onClick={onSave} style={btnPrimary}>Save</button>
        <button onClick={onCancel} style={btnSmall}>Cancel</button>
      </div>
    </div>
  );
}

/* ─── Single question row (v2) ─── */
const Q_TYPES = ["text_input", "single_select", "multi_select", "integration_picker", "feature_walkthrough"];
const Q_TYPE_LABELS = { text_input: "Text", single_select: "Single Select", multi_select: "Multi Select", integration_picker: "Integration", feature_walkthrough: "Walkthrough" };
const Q_LABEL_STYLE = { fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)", display: "block" };

function QuestionRow({ q, index, editing, onEdit, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(q);

  useEffect(() => { setDraft(q); }, [q]);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const setType = (newType) => {
    const needsOptions = newType === "single_select" || newType === "multi_select";
    setDraft((prev) => ({
      ...prev,
      type: newType,
      multi: newType === "multi_select",
      options: needsOptions && (!prev.options || prev.options.length === 0)
        ? [{ label: "Option A", value: "a" }, { label: "Option B", value: "b" }]
        : needsOptions ? prev.options : null,
    }));
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

  // Map legacy types for display
  const displayType = q.type === "choice" ? (q.multi ? "multi_select" : "single_select") : (q.type === "text" ? "text_input" : q.type);

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
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "var(--font-size-2xs)",
              padding: "1px var(--space-1-5)",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-bg-surface)",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--letter-spacing-wider)",
            }}>
              {Q_TYPE_LABELS[displayType] || displayType}
            </span>
            {q.skippable && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>skippable</span>
            )}
            {q.allow_voice && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>voice</span>
            )}
            {q.fulkit_action && (
              <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>{q.fulkit_action}</span>
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

  const showOptions = draft.type === "single_select" || draft.type === "multi_select" || draft.type === "choice";
  const showPlaceholder = draft.type === "text_input" || draft.type === "text";

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
        <label style={Q_LABEL_STYLE}>Question</label>
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
        <label style={Q_LABEL_STYLE}>Why we ask (shown to user)</label>
        <input
          value={draft.why || ""}
          onChange={(e) => update("why", e.target.value)}
          style={inputStyle}
          placeholder="Helps us understand..."
        />
      </div>

      {/* Type selector (5 options) */}
      <div>
        <label style={Q_LABEL_STYLE}>Type</label>
        <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
          {Q_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                ...btnSmall,
                background: (draft.type === t) ? "var(--color-text)" : "var(--color-bg-elevated)",
                color: (draft.type === t) ? "var(--color-bg)" : "var(--color-text-secondary)",
                fontSize: "var(--font-size-2xs)",
                padding: "var(--space-1) var(--space-2)",
              }}
            >
              {Q_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Row: placeholder + skip + voice */}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
        {showPlaceholder && (
          <div style={{ flex: 2 }}>
            <label style={Q_LABEL_STYLE}>Placeholder</label>
            <input
              value={draft.placeholder || ""}
              onChange={(e) => update("placeholder", e.target.value)}
              style={inputStyle}
              placeholder="Input placeholder text"
            />
          </div>
        )}
        <div>
          <label style={Q_LABEL_STYLE}>Skip</label>
          <button
            onClick={() => update("skippable", !draft.skippable)}
            style={{ ...btnSmall, width: "100%", justifyContent: "center", background: draft.skippable ? "var(--color-bg-surface)" : "var(--color-bg-elevated)" }}
          >
            {draft.skippable ? "Yes" : "No"}
          </button>
        </div>
        {showPlaceholder && (
          <div>
            <label style={Q_LABEL_STYLE}>Voice</label>
            <button
              onClick={() => update("allow_voice", !draft.allow_voice)}
              style={{ ...btnSmall, width: "100%", justifyContent: "center", background: draft.allow_voice ? "var(--color-bg-surface)" : "var(--color-bg-elevated)" }}
            >
              {draft.allow_voice ? "On" : "Off"}
            </button>
          </div>
        )}
      </div>

      {/* Trust line */}
      <div>
        <label style={Q_LABEL_STYLE}>Trust line (privacy copy)</label>
        <textarea
          value={draft.trust_line || ""}
          onChange={(e) => update("trust_line", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Privacy/trust copy shown with this question (optional)"
        />
      </div>

      {/* Copy after answer */}
      <div>
        <label style={Q_LABEL_STYLE}>Copy after answer</label>
        <textarea
          value={draft.copy_after_answer || ""}
          onChange={(e) => update("copy_after_answer", e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="What Fülkit says after they answer (optional)"
        />
      </div>

      {/* F\u00FClkit action (read-only) */}
      <div>
        <label style={Q_LABEL_STYLE}>F\u00FClkit action (structural)</label>
        <input
          value={draft.fulkit_action || ""}
          onChange={(e) => update("fulkit_action", e.target.value)}
          style={{ ...inputStyle, color: "var(--color-text-dim)" }}
          placeholder="e.g. create_identity_file, set_whisper_frequency"
        />
      </div>

      {/* Choice options editor */}
      {showOptions && (
        <div>
          <label style={Q_LABEL_STYLE}>Options</label>
          {(draft.options || []).map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-1-5)", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-muted)", minWidth: 16 }}>
                {String.fromCharCode(65 + i)}
              </span>
              <input
                value={typeof opt === "string" ? opt : opt.label}
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
  "tiers": [
    {
      "tier_num": 1,
      "label": "Tier Name",
      "intro": "Tier opener copy.",
      "trust_line": "Privacy copy shown at tier start.",
      "assignment_copy": "Feature assignment copy after questions.",
      "primary_destination": "/home",
      "secondary_destination": "/fabric",
      "secondary_condition": "spotify_connected",
      "completion_trigger": "visited_inbox",
      "questions": [
        {
          "id": "q1",
          "text": "Your question here?",
          "why": "Why we ask this.",
          "type": "text_input",
          "placeholder": "Optional placeholder",
          "skippable": false,
          "allow_voice": false,
          "trust_line": null,
          "copy_after_answer": null,
          "fulkit_action": "create_identity_file"
        },
        {
          "id": "q2",
          "text": "Pick one:",
          "why": "Reason for asking.",
          "type": "single_select",
          "options": ["Option A", "Option B", "Option C"],
          "skippable": false,
          "fulkit_action": ""
        }
      ]
    }
  ]
}`;

/* ─── Import Modal (v2 — tier-based) ─── */
function ImportModal({ tiers: existingTiers, onClose, onDone }) {
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
    if (!parsed.tiers || !Array.isArray(parsed.tiers)) {
      setError('JSON must have a "tiers" array at the top level.');
      return;
    }
    for (const t of parsed.tiers) {
      if (!t.label || !Array.isArray(t.questions)) {
        setError("Each tier needs a label and a questions array.");
        return;
      }
    }

    setImporting(true);
    try {
      if (replaceAll) {
        // Wipe questions that have tier_id, then wipe tiers
        await supabase.from("questions").delete().not("tier_id", "is", null);
        await supabase.from("onboarding_tiers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      const maxSort = replaceAll ? 0 : (existingTiers || []).reduce((mx, t) => Math.max(mx, t.sort_order || 0), 0);

      for (let ti = 0; ti < parsed.tiers.length; ti++) {
        const tier = parsed.tiers[ti];
        const { data: newTier, error: tErr } = await supabase
          .from("onboarding_tiers")
          .insert({
            tier_num: tier.tier_num || ti + 1,
            label: tier.label,
            intro: tier.intro || "",
            trust_line: tier.trust_line || "",
            assignment_copy: tier.assignment_copy || "",
            primary_destination: tier.primary_destination || "",
            secondary_destination: tier.secondary_destination || "",
            secondary_condition: tier.secondary_condition || "",
            completion_trigger: tier.completion_trigger || "",
            sort_order: maxSort + ti + 1,
          })
          .select()
          .single();
        if (tErr) throw new Error(tErr.message);

        if (tier.questions.length > 0) {
          const hasOptions = (t) => t === "single_select" || t === "multi_select" || t === "choice";
          const rows = tier.questions.map((q, qi) => ({
            tier_id: newTier.id,
            question_id: q.id || `q_${Date.now()}_${qi}`,
            text: q.text || "",
            why: q.why || "",
            type: q.type || "text_input",
            multi: q.type === "multi_select" || q.multi || false,
            options: hasOptions(q.type) && q.options
              ? q.options.map((o) => (typeof o === "string" ? { label: o, value: o.toLowerCase().replace(/\s+/g, "_") } : o))
              : null,
            placeholder: q.placeholder || "",
            skippable: q.skippable || false,
            trust_line: q.trust_line || "",
            copy_after_answer: q.copy_after_answer || "",
            allow_voice: q.allow_voice || false,
            fulkit_action: q.fulkit_action || "",
            follow_up: q.follow_up || null,
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
            placeholder='{"tiers": [...]}'
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

/* ─── Export Modal (v2) ─── */
function ExportModal({ tiers, questions, onClose }) {
  const [copied, setCopied] = useState(false);

  const exportData = {
    tiers: tiers.map((t) => ({
      tier_num: t.tier_num,
      label: t.label,
      intro: t.intro || "",
      trust_line: t.trust_line || "",
      assignment_copy: t.assignment_copy || "",
      primary_destination: t.primary_destination || "",
      secondary_destination: t.secondary_destination || "",
      secondary_condition: t.secondary_condition || "",
      completion_trigger: t.completion_trigger || "",
      questions: questions
        .filter((q) => q.tier_id === t.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((q) => ({
          id: q.question_id,
          text: q.text,
          why: q.why || "",
          type: q.type,
          ...(q.options ? { options: q.options.map((o) => (typeof o === "string" ? o : o.label)) } : {}),
          ...(q.placeholder ? { placeholder: q.placeholder } : {}),
          skippable: q.skippable || false,
          allow_voice: q.allow_voice || false,
          trust_line: q.trust_line || "",
          copy_after_answer: q.copy_after_answer || "",
          fulkit_action: q.fulkit_action || "",
          ...(q.follow_up ? { follow_up: q.follow_up } : {}),
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
