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
  Frame,
  Megaphone,
  Eye,
  EyeOff,
  Send,
  Zap,
  BookOpen,
  Settings2,
  Mail,
  ExternalLink,
} from "lucide-react";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import LoadingMark from "../../components/LoadingMark";
import LogoMark from "../../components/LogoMark";
import { TIERS, CREDITS, REFERRALS } from "../../lib/ful-config";
import { PLANS, COST_BASIS, PROJECTIONS } from "../../lib/ful-legend";
import { useIsMobile } from "../../lib/use-mobile";

const TAB_ICON_SIZE = 16;

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
export function OwnerPanel({ initialTab, urlPrefix = "/owner", onMayday }) {
  const { compactMode, accessToken } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState(initialTab && VALID_TAB_IDS.includes(initialTab) ? initialTab : "dashboard");
  const [maydayAlert, setMaydayAlert] = useState(false);
  const [warningAlert, setWarningAlert] = useState(false);

  useEffect(() => {
    if (initialTab && VALID_TAB_IDS.includes(initialTab)) setTab(initialTab);
  }, [initialTab]);

  // MAYDAY + WARNING alerts — lightweight check for unseen signals
  useEffect(() => {
    if (!accessToken) return;
    const checkAlerts = async () => {
      const lastSeen = localStorage.getItem("fulkit-radio-last-seen") || "1970-01-01T00:00:00Z";
      try {
        const [errRes, warnRes] = await Promise.all([
          fetch("/api/owner/signals?period=24&severity=error&limit=1", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch("/api/owner/signals?period=24&severity=warning&limit=1", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);
        if (errRes.ok) {
          const errData = await errRes.json();
          const hasError = errData.signals?.length > 0 && errData.signals[0].created_at > lastSeen;
          setMaydayAlert(hasError);
          if (onMayday) onMayday(hasError);
        }
        if (warnRes.ok) {
          const warnData = await warnRes.json();
          setWarningAlert(warnData.signals?.length > 0 && warnData.signals[0].created_at > lastSeen);
        }
      } catch {}
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [accessToken, onMayday]);

  // Clear alerts when visiting Radio
  useEffect(() => {
    if (tab === "radio") {
      localStorage.setItem("fulkit-radio-last-seen", new Date().toISOString());
      setMaydayAlert(false);
      setWarningAlert(false);
      if (onMayday) onMayday(false);
    }
  }, [tab, onMayday]);

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {/* Sub-tab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 0 : "var(--space-1)",
          padding: isMobile ? "var(--space-2) 0" : "var(--space-3) var(--space-6)",
          justifyContent: isMobile ? "space-around" : "flex-start",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Tooltip key={t.id} label={t.label} position="bottom">
              <button
                type="button"
                onClick={() => {
                  setTab(t.id);
                  window.history.replaceState({}, "", `${urlPrefix}/${t.id}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1-5)",
                  padding: isMobile ? "var(--space-2-5) var(--space-2-5)" : "var(--space-2-5) var(--space-3)",
                  minHeight: 36,
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
                <t.icon size={isMobile ? 18 : TAB_ICON_SIZE} strokeWidth={1.8} style={{ pointerEvents: "none" }} />
                {t.id === "radio" && maydayAlert && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-error, #e53e3e)",
                    flexShrink: 0,
                    marginLeft: 2,
                    alignSelf: "flex-start",
                    pointerEvents: "none",
                  }} />
                )}
                {t.id === "radio" && !maydayAlert && warningAlert && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--color-warning, #b7791f)",
                    flexShrink: 0,
                    marginLeft: 2,
                    alignSelf: "flex-start",
                    pointerEvents: "none",
                  }} />
                )}
                {!compactMode && !isMobile && t.label}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Sub-tab content — full width */}
      <div style={{ padding: isMobile ? "var(--space-3) var(--space-2) var(--space-4)" : "0 var(--space-6) var(--space-6)" }}>
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
      <OwnerPanel initialTab={initialTab} urlPrefix="/owner" />
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
const TAB_TITLE = { fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-3)" };

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
  const isMobile = useIsMobile();
  const [siteMetrics, setSiteMetrics] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  const fetchData = useCallback((p) => {
    if (!accessToken) return;
    setLoading(true);
    fetch(`/api/owner/dashboard?period=${p}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setSiteMetrics(data.metrics);
          setAnalytics(data.analytics);
          setEvents(data.events);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
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
    {
      label: "Avg Duration",
      value: analytics?.overview?.avgDuration || "\u2014",
      sub: "\u00A0",
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: isMobile ? "var(--space-2)" : "var(--space-3)", marginBottom: "var(--space-4)" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
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

/* ─── Spend Moderator — cost auditor inside Radio ─── */

const SPEND_RULE_LABELS = {
  expensive_round: "Expensive Round",
  tool_waste: "Tool Waste",
  cache_miss: "Cache Miss",
  slow_response: "Slow Response",
  unused_context: "Unused Context",
  github_waste: "GitHub Waste",
  compression_heavy: "Heavy Compression",
  system_prompt_bloat: "System Bloat",
  opus_on_simple: "Opus Overkill",
  multi_round_cost: "Multi-Round Cost",
  integration_ghost: "Ghost Integrations",
  cache_efficiency_low: "Poor Cache Efficiency",
  context_token_heavy: "Context Inflation",
  doc_stale: "Stale Doc",
};

function SpendModeratorSection({ period }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("fulkit-spend-moderator-open") === "true";
  });
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("fulkit-spend-moderator-open", String(next));
      return next;
    });
  };

  const fetchSpend = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`/api/owner/spend?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      setData(await res.json());
    } catch {}
    setLoading(false);
  }, [accessToken, period]);

  useEffect(() => {
    setLoading(true);
    fetchSpend();
  }, [fetchSpend]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchSpend, 30000);
    return () => clearInterval(iv);
  }, [fetchSpend]);

  const exportFlags = () => {
    if (!data) return;
    const payload = {
      exported: new Date().toISOString(),
      period: `${period}h`,
      summary: data.summary,
      flags: data.flags,
    };
    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    }).catch(() => {});
  };

  if (loading && !data) return null;
  if (!data) return null;

  const { summary, previous, flags } = data;
  const hasFlags = flags.length > 0;
  const totalFlags = flags.reduce((sum, f) => sum + f.count, 0);

  // Delta helper: returns { pct, direction, color } or null
  const delta = (current, prev, lowerIsBetter = true) => {
    if (prev == null || prev === 0 || current == null) return null;
    const pct = Math.round(((current - prev) / prev) * 100);
    if (pct === 0) return null;
    const improved = lowerIsBetter ? pct < 0 : pct > 0;
    return {
      pct: Math.abs(pct),
      arrow: pct < 0 ? "\u2193" : "\u2191",
      color: improved ? "var(--color-success, #48bb78)" : "var(--color-error, #e53e3e)",
    };
  };

  return (
    <div style={{
      marginBottom: "var(--space-5)",
      border: "1px solid var(--color-border-light)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Spend Moderator header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "var(--space-3) var(--space-4)",
        background: hasFlags ? "rgba(183, 121, 31, 0.06)" : "var(--color-bg-alt)",
      }}>
        <button
          onClick={toggleExpanded}
          style={{
            display: "flex", alignItems: "center", gap: "var(--space-2)",
            background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1,
          }}
        >
          <CreditCard size={14} strokeWidth={1.5} color="var(--color-text-muted)" />
          <span style={{
            fontSize: "var(--font-size-xs)",
            fontFamily: "var(--font-mono)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text)",
          }}>
            Spend Moderator
          </span>
          {totalFlags > 0 && (
            <span style={{
              fontSize: 9,
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-mono)",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-warning, #b7791f)",
              background: "rgba(183, 121, 31, 0.12)",
            }}>
              {totalFlags} flag{totalFlags !== 1 ? "s" : ""}
            </span>
          )}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {/* Quick cost stat */}
          <span style={{
            fontSize: "var(--font-size-2xs)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-dim)",
          }}>
            ${summary.totalCost.toFixed(4)} / {summary.messages} msg{summary.messages !== 1 ? "s" : ""}
            {previous && previous.messages > 0 && (() => {
              const d = delta(summary.avgCost, previous.avgCost);
              return d ? <span style={{ color: d.color, marginLeft: 4 }}>{d.arrow}{d.pct}%</span> : null;
            })()}
          </span>
          {/* Export — always visible */}
          <button
            onClick={(e) => { e.stopPropagation(); exportFlags(); }}
            title="Copy spend data as JSON"
            style={{
              display: "flex", alignItems: "center", gap: "var(--space-1)",
              padding: "var(--space-1) var(--space-2-5)",
              fontSize: "var(--font-size-2xs)",
              fontFamily: "var(--font-mono)",
              color: copiedAll ? "var(--color-text)" : "var(--color-text-muted)",
              background: "var(--color-bg-elevated, var(--color-bg))",
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            {copiedAll ? <CheckIcon size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
            {copiedAll ? "Copied" : "Export"}
          </button>
          <button
            onClick={toggleExpanded}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
          >
            {expanded ? <ChevronUp size={14} strokeWidth={1.5} color="var(--color-text-dim)" /> : <ChevronDown size={14} strokeWidth={1.5} color="var(--color-text-dim)" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "var(--space-4)", background: "var(--color-bg)" }}>
          {/* Cost summary tiles */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "var(--space-2)",
            marginBottom: "var(--space-4)",
          }}>
            {[
              { label: "Total Cost", value: `$${summary.totalCost.toFixed(4)}`, d: previous && delta(summary.totalCost, previous.totalCost) },
              { label: "Avg / Msg", value: `$${summary.avgCost.toFixed(4)}`, d: previous && delta(summary.avgCost, previous.avgCost) },
              { label: "Max Single", value: `$${summary.maxCost.toFixed(4)}`, d: previous && delta(summary.maxCost, previous.maxCost) },
              { label: "Avg Latency", value: `${(summary.avgElapsed / 1000).toFixed(1)}s`, d: previous && delta(summary.avgElapsed, previous.avgElapsed) },
            ].map((tile) => (
              <div key={tile.label} style={{
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg-alt)",
                borderRadius: "var(--radius-sm)",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wider)",
                  color: "var(--color-text-dim)",
                  marginBottom: 2,
                }}>
                  {tile.label}
                </div>
                <div style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-text)",
                }}>
                  {tile.value}
                </div>
                {tile.d && (
                  <div style={{
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    color: tile.d.color,
                    marginTop: 1,
                  }}>
                    {tile.d.arrow}{tile.d.pct}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Token breakdown table */}
          <div style={{
            marginBottom: "var(--space-4)",
            background: "var(--color-bg-alt)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}>
            <div style={{
              padding: "var(--space-2) var(--space-3)",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              color: "var(--color-text-dim)",
              borderBottom: "1px solid var(--color-border-light)",
            }}>
              Token Breakdown (avg/msg)
            </div>
            {(() => {
              const avgIn = summary.messages > 0 ? Math.round(summary.totalInput / summary.messages) : 0;
              const avgOut = summary.messages > 0 ? Math.round(summary.totalOutput / summary.messages) : 0;
              const avgSys = summary.avgSystemTokens || 0;
              const avgSchema = summary.avgToolSchemaTokens || 0;
              const avgConvo = Math.max(0, avgIn - avgSys - avgSchema);
              const total = avgIn + avgOut;
              const pct = (v) => total > 0 ? `${Math.round(v / total * 100)}%` : "—";
              const rows = [
                { label: "System Prompt", tokens: avgSys, share: pct(avgSys) },
                { label: "Conversation", tokens: avgConvo, share: pct(avgConvo) },
                { label: "Tool Schemas", tokens: avgSchema, share: pct(avgSchema) },
                { label: "Output", tokens: avgOut, share: pct(avgOut) },
              ];
              return rows.map((row, i) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "var(--space-1-5) var(--space-3)",
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  background: i % 2 === 0 ? "transparent" : "var(--color-bg)",
                }}>
                  <span style={{ color: "var(--color-text-muted)", flex: 1 }}>{row.label}</span>
                  <span style={{ color: "var(--color-text)", fontWeight: "var(--font-weight-semibold)", width: 80, textAlign: "right" }}>{row.tokens.toLocaleString()}</span>
                  <span style={{ color: "var(--color-text-dim)", width: 50, textAlign: "right" }}>{row.share}</span>
                </div>
              ));
            })()}
          </div>

          {/* Cache efficiency gauge */}
          {summary.cacheEfficiency !== null && (
            <div style={{
              marginBottom: "var(--space-4)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg-alt)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "var(--space-1)",
              }}>
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)" }}>
                  Cache Efficiency
                </span>
                <span style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", color: summary.cacheEfficiency >= 60 ? "var(--color-success, #48bb78)" : summary.cacheEfficiency >= 30 ? "var(--color-warning, #b7791f)" : "var(--color-error, #e53e3e)" }}>
                  {summary.cacheEfficiency}% hit rate
                </span>
              </div>
              <div style={{ height: 6, background: "var(--color-bg)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(summary.cacheEfficiency, 100)}%`,
                  background: summary.cacheEfficiency >= 60 ? "var(--color-success, #48bb78)" : summary.cacheEfficiency >= 30 ? "var(--color-warning, #b7791f)" : "var(--color-error, #e53e3e)",
                  borderRadius: 3,
                  transition: "width var(--duration-normal) var(--ease-default)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                <span>Read: {summary.totalCacheRead.toLocaleString()}</span>
                <span>Write: {summary.totalCacheCreation.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Compression stats (conditional) */}
          {summary.compression && (
            <div style={{
              display: "flex", gap: "var(--space-3)", flexWrap: "wrap",
              fontSize: "var(--font-size-2xs)",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-dim)",
              marginBottom: "var(--space-4)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg-alt)",
              borderRadius: "var(--radius-sm)",
            }}>
              <span>Compression fired <b style={{ color: "var(--color-text-muted)" }}>{summary.compression.timesCompressed}x</b></span>
              <span style={{ color: "var(--color-border)" }}>|</span>
              <span>Saved <b style={{ color: "var(--color-text-muted)" }}>~{summary.compression.totalTokensSaved.toLocaleString()}</b> tokens</span>
              <span style={{ color: "var(--color-border)" }}>|</span>
              <span>Avg <b style={{ color: "var(--color-text-muted)" }}>{summary.compression.avgSavingsPerCompression.toLocaleString()}</b>/compression</span>
            </div>
          )}

          {/* Cost attribution — model + type */}
          {(summary.costByModel && Object.keys(summary.costByModel).length > 0) && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Object.keys(summary.costByModel).length + (summary.byokMessages > 0 ? 2 : 1)}, 1fr)`,
              gap: "var(--space-2)",
              marginBottom: "var(--space-4)",
            }}>
              {Object.entries(summary.costByModel).map(([model, data]) => (
                <div key={model} style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: 2 }}>
                    {model}
                  </div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                    ${data.cost.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                    {data.messages} msg{data.messages !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
              {summary.fulkitPaidMessages > 0 && (
                <div style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: 2 }}>
                    Fulkit-Paid
                  </div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                    {summary.fulkitPaidMessages}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                    messages
                  </div>
                </div>
              )}
              {summary.byokMessages > 0 && (
                <div style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-bg-alt)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: 2 }}>
                    BYOK
                  </div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-mono)", color: "var(--color-text)" }}>
                    {summary.byokMessages}
                  </div>
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>
                    messages
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Integration usage (conditional) */}
          {summary.integrationUsage && Object.keys(summary.integrationUsage.loads).length > 0 && (
            <div style={{
              marginBottom: "var(--space-4)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg-alt)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
                Integration Usage
              </div>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)" }}>
                {Object.entries(summary.integrationUsage.loads).map(([name, loadCount]) => {
                  const useCount = summary.integrationUsage.uses[name] || 0;
                  const ratio = loadCount > 0 ? Math.round(useCount / loadCount * 100) : 0;
                  return (
                    <span key={name} style={{ color: ratio === 0 ? "var(--color-warning, #b7791f)" : "var(--color-text-muted)" }}>
                      {name}: {loadCount}x loaded, {useCount}x used ({ratio}%)
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra stats row */}
          <div style={{
            display: "flex", gap: "var(--space-4)", flexWrap: "wrap",
            fontSize: "var(--font-size-2xs)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-dim)",
            marginBottom: "var(--space-4)",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-bg-alt)",
            borderRadius: "var(--radius-sm)",
          }}>
            <span>Avg Rounds: <b style={{ color: "var(--color-text-muted)" }}>{summary.avgRounds || "—"}</b>{(() => { const d = previous && delta(summary.avgRounds, previous.avgRounds); return d ? <span style={{ color: d.color, marginLeft: 3 }}>{d.arrow}{d.pct}%</span> : null; })()}</span>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span>Avg System: <b style={{ color: "var(--color-text-muted)" }}>{(summary.avgSystemTokens || 0).toLocaleString()}</b>{(() => { const d = previous && delta(summary.avgSystemTokens, previous.avgSystemTokens); return d ? <span style={{ color: d.color, marginLeft: 3 }}>{d.arrow}{d.pct}%</span> : null; })()}</span>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span>Avg Schema: <b style={{ color: "var(--color-text-muted)" }}>{(summary.avgToolSchemaTokens || 0).toLocaleString()}</b>{(() => { const d = previous && delta(summary.avgToolSchemaTokens, previous.avgToolSchemaTokens); return d ? <span style={{ color: d.color, marginLeft: 3 }}>{d.arrow}{d.pct}%</span> : null; })()}</span>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span>Tools/Msg: <b style={{ color: "var(--color-text-muted)" }}>{summary.avgToolsLoaded || "—"}</b>{(() => { const d = previous && delta(summary.avgToolsLoaded, previous.avgToolsLoaded); return d ? <span style={{ color: d.color, marginLeft: 3 }}>{d.arrow}{d.pct}%</span> : null; })()}</span>
          </div>

          {/* Flags section */}
          {hasFlags ? (
            <>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <span style={{
                  fontSize: "var(--font-size-2xs)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wider)",
                }}>
                  Flags ({totalFlags})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {flags.map((flag) => (
                  <div key={flag.rule} style={{
                    padding: "var(--space-3)",
                    background: "var(--color-bg-alt)",
                    borderRadius: "var(--radius-sm)",
                    borderLeft: "3px solid var(--color-warning, #b7791f)",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      marginBottom: "var(--space-1)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <span style={{
                          fontSize: "var(--font-size-xs)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--color-text)",
                        }}>
                          {SPEND_RULE_LABELS[flag.rule] || flag.rule}
                        </span>
                        {flag.impact && (
                          <span style={{
                            fontSize: 9,
                            fontFamily: "var(--font-mono)",
                            padding: "1px 4px",
                            borderRadius: "var(--radius-xs)",
                            color: "var(--color-warning, #b7791f)",
                            background: "rgba(183, 121, 31, 0.1)",
                          }}>
                            {flag.impact}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 9,
                        fontWeight: "var(--font-weight-semibold)",
                        fontFamily: "var(--font-mono)",
                        padding: "2px 5px",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-text-muted)",
                        background: "var(--color-bg-elevated, var(--color-bg))",
                      }}>
                        &times;{flag.count}
                      </span>
                    </div>
                    <div style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-muted)",
                      marginBottom: "var(--space-1)",
                    }}>
                      {flag.msg}
                    </div>
                    <div style={{
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-dim)",
                      display: "flex", alignItems: "center", gap: "var(--space-1)",
                    }}>
                      <Zap size={10} strokeWidth={1.5} />
                      {flag.fix}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: "center",
              padding: "var(--space-4)",
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              fontFamily: "var(--font-mono)",
            }}>
              No waste patterns detected in this period.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [expandedGroups, setExpandedGroups] = useState(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("fulkit-radio-expanded-groups") || "{}"); } catch { return {}; }
  });
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
        <div style={TAB_TITLE}>Signal Radio</div>
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

      {/* Spend Moderator */}
      <SpendModeratorSection period={period} />

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

      {/* Health summary strip */}
      {(() => {
        const lastError = signals.find(s => s.meta?.severity === "error");
        const lastErrorAgo = lastError ? Math.floor((Date.now() - new Date(lastError.created_at).getTime()) / 3600000) : null;
        const errorRate = period > 0 && counts.error > 0 ? (counts.error / period).toFixed(1) : "0";
        const healthy = counts.error === 0;
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            background: healthy ? "var(--color-bg)" : "var(--color-bg-alt)",
            border: `1px solid ${healthy ? "var(--color-border-light)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-sm)",
            marginBottom: "var(--space-4)",
            fontSize: "var(--font-size-2xs)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-dim)",
          }}>
            <span style={{ color: healthy ? "var(--color-success, #48bb78)" : "var(--color-error, #e53e3e)" }}>
              {healthy ? "All clear" : `${counts.error} error${counts.error !== 1 ? "s" : ""}`}
            </span>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span>{counts.warning} warning{counts.warning !== 1 ? "s" : ""}</span>
            <span style={{ color: "var(--color-border)" }}>|</span>
            <span>{total} total</span>
            {lastErrorAgo !== null && (
              <>
                <span style={{ color: "var(--color-border)" }}>|</span>
                <span>Last error: {lastErrorAgo === 0 ? "<1h ago" : `${lastErrorAgo}h ago`}</span>
              </>
            )}
            {counts.error > 0 && (
              <>
                <span style={{ color: "var(--color-border)" }}>|</span>
                <span>Rate: {errorRate}/hr</span>
              </>
            )}
          </div>
        );
      })()}

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
                      onClick={() => setExpandedGroups((prev) => {
                        const next = { ...prev, [group.event]: !prev[group.event] };
                        try { localStorage.setItem("fulkit-radio-expanded-groups", JSON.stringify(next)); } catch {}
                        return next;
                      })}
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

  // ── Batch embed ──
  const [embedStatus, setEmbedStatus] = useState(null);
  const [embedding, setEmbedding] = useState(false);
  const runBatchEmbed = async () => {
    if (embedding) return;
    setEmbedding(true);
    setEmbedStatus("Starting...");
    let totalEmbedded = 0;
    for (let round = 0; round < 10; round++) {
      try {
        const res = await fetch("/api/embed", {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) { setEmbedStatus(`Error: ${res.status}`); break; }
        const data = await res.json();
        totalEmbedded += data.embedded || 0;
        setEmbedStatus(`${totalEmbedded} embedded${data.embedded === 0 ? " — done" : "..."}`);
        if (data.embedded === 0) break;
      } catch (err) {
        setEmbedStatus(`Error: ${err.message}`);
        break;
      }
    }
    setEmbedding(false);
  };

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

  // ── Waitlist ──
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [notifyCategory, setNotifyCategory] = useState("all");
  const [notifyTemplate, setNotifyTemplate] = useState("seat-open");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/feedback", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTickets(data || []))
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
    fetch("/api/waitlist", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setWaitlist(data || []))
      .catch(() => {})
      .finally(() => setWaitlistLoading(false));
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

  // ── Drawer states ──
  const [switchesOpen, setSwitchesOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-switchesOpen") === "true");
  const [factsOpen, setFactsOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-factsOpen") === "true");
  const [announcementsOpen, setAnnouncementsOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-announcementsOpen") === "true");

  useEffect(() => { localStorage.setItem("owner-switchesOpen", switchesOpen); }, [switchesOpen]);
  useEffect(() => { localStorage.setItem("owner-factsOpen", factsOpen); }, [factsOpen]);
  useEffect(() => { localStorage.setItem("owner-announcementsOpen", announcementsOpen); }, [announcementsOpen]);

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={TAB_TITLE}>Developer</div>
      {/* ── Tickets (priority — always on top) ── */}
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

      {/* ── Waitlist (collapsible fold) ── */}
      <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <button onClick={() => setWaitlistOpen(!waitlistOpen)} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", background: "none", border: "none", cursor: "pointer" }}>
          <Mail size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" }}>Waitlist</span>
          {waitlist.length > 0 && (
            <span style={{
              fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)",
              background: "var(--color-text)", color: "var(--color-bg)",
              padding: "1px 6px", borderRadius: "var(--radius-full)",
            }}>
              {waitlist.length}
            </span>
          )}
          {waitlistOpen ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {waitlistOpen && (
          <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
            {/* ── Notify section ── */}
            <div style={{ padding: "var(--space-3)", borderBottom: "1px solid var(--color-border-light)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: "var(--font-weight-medium)" }}>Notify</span>
                {(() => {
                  const categories = [...new Set(waitlist.map(w => w.category))];
                  return (
                    <div style={{ display: "flex", gap: "var(--space-1)" }}>
                      <button
                        onClick={() => setNotifyCategory("all")}
                        style={{
                          padding: "1px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                          background: notifyCategory === "all" ? "var(--color-text)" : "transparent",
                          color: notifyCategory === "all" ? "var(--color-bg)" : "var(--color-text-dim)",
                          fontSize: 9, fontFamily: "var(--font-mono)", cursor: "pointer", textTransform: "uppercase",
                        }}
                      >
                        all ({waitlist.length})
                      </button>
                      {categories.map(cat => {
                        const count = waitlist.filter(w => w.category === cat).length;
                        return (
                          <button
                            key={cat}
                            onClick={() => setNotifyCategory(cat)}
                            style={{
                              padding: "1px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                              background: notifyCategory === cat ? "var(--color-text)" : "transparent",
                              color: notifyCategory === cat ? "var(--color-bg)" : "var(--color-text-dim)",
                              fontSize: 9, fontFamily: "var(--font-mono)", cursor: "pointer", textTransform: "uppercase",
                            }}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              {/* Template select */}
              <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-2)" }}>
                {[
                  { id: "seat-open", label: "Seat opened" },
                  { id: "custom", label: "Custom" },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setNotifyTemplate(t.id)}
                    style={{
                      padding: "1px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                      background: notifyTemplate === t.id ? "var(--color-text)" : "transparent",
                      color: notifyTemplate === t.id ? "var(--color-bg)" : "var(--color-text-dim)",
                      fontSize: 9, fontFamily: "var(--font-mono)", cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Custom message input (only for custom template) */}
              {notifyTemplate === "custom" && (
                <div style={{ marginBottom: "var(--space-2)" }}>
                  <input
                    type="text"
                    placeholder="Message to send..."
                    value={notifyMsg}
                    onChange={(e) => setNotifyMsg(e.target.value)}
                    style={{ width: "100%", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <button
                  onClick={async () => {
                    if (notifySending) return;
                    if (notifyTemplate === "custom" && !notifyMsg.trim()) return;
                    setNotifySending(true);
                    const targets = notifyCategory === "all" ? waitlist : waitlist.filter(w => w.category === notifyCategory);
                    try {
                      const res = await fetch("/api/email/waitlist", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                          emails: targets.map(w => w.email),
                          template: notifyTemplate,
                          message: notifyTemplate === "custom" ? notifyMsg.trim() : undefined,
                          category: notifyCategory,
                        }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setNotifyResult(`Sent to ${data.sent || targets.length}`);
                      } else {
                        setNotifyResult("Failed");
                      }
                    } catch { setNotifyResult("Failed"); }
                    setNotifySending(false);
                    setTimeout(() => setNotifyResult(null), 3000);
                  }}
                  disabled={notifySending || (notifyTemplate === "custom" && !notifyMsg.trim())}
                  style={{
                    flex: 1, padding: "var(--space-2) var(--space-3)",
                    background: notifySending ? "var(--color-bg-alt)" : "var(--color-accent)",
                    color: notifySending ? "var(--color-text-muted)" : "var(--color-text-inverse)",
                    border: "none", borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                    fontFamily: "var(--font-primary)",
                    cursor: notifySending ? "default" : "pointer",
                    opacity: (notifyTemplate === "custom" && !notifyMsg.trim()) ? 0.5 : 1,
                  }}
                >
                  {notifySending ? "Sending..." : `Send ${notifyTemplate === "seat-open" ? "\"Seat opened\"" : "message"}`}
                </button>
              </div>
              {notifyResult && (
                <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: "var(--space-1)" }}>{notifyResult}</div>
              )}
            </div>

            {/* ── Entries ── */}
            {waitlistLoading ? (
              <div style={{ padding: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>Loading...</div>
            ) : waitlist.length === 0 ? (
              <div style={{ padding: "var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No waitlist entries.</div>
            ) : (
              <div>
                {(notifyCategory === "all" ? waitlist : waitlist.filter(w => w.category === notifyCategory)).map((w, i, arr) => (
                  <div key={w.id} style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "var(--space-2-5) var(--space-3)",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-light)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)" }}>{w.email}</div>
                      <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginTop: 2 }}>
                        {w.category} {"\u00b7"} {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {w.notified_at ? ` \u00b7 notified ${new Date(w.notified_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Switches (collapsible drawer) ── */}
      <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <button onClick={() => setSwitchesOpen(!switchesOpen)} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", background: "none", border: "none", cursor: "pointer" }}>
          <Settings2 size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" }}>Switches</span>
          {switchesOpen ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {switchesOpen && (
          <div style={{ padding: "0 var(--space-3) var(--space-3)" }}>
            <DevSwitch label="Expanded View" description="Show labels in sidebar nav" on={!compactMode} onToggle={() => setCompactMode(!compactMode)} />
            <div style={{ height: "var(--space-2)" }} />
            <DevSwitch label="Inspector" description="CSS selector overlay" on={inspector} onToggle={() => setInspector(!inspector)} />
            <div style={{ height: "var(--space-3)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <button onClick={runBatchEmbed} disabled={embedding} style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: embedding ? "var(--color-bg-alt)" : "var(--color-accent)", color: embedding ? "var(--color-text-muted)" : "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: embedding ? "default" : "pointer" }}>
                {embedding ? "Embedding..." : "Embed Notes"}
              </button>
              {embedStatus && <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{embedStatus}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Facts (collapsible drawer) ── */}
      <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <button onClick={() => setFactsOpen(!factsOpen)} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", background: "none", border: "none", cursor: "pointer" }}>
          <Zap size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" }}>Quick Facts</span>
          <span style={{ fontSize: 9, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", marginRight: "var(--space-2)" }}>{quickFacts.length}</span>
          {factsOpen ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {factsOpen && (
          <div style={{ padding: "0 var(--space-3) var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-2)" }}>
              <button onClick={() => { setNewBroadcast({ channel: "context", subtype: "fact" }); setEditingBroadcast(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}><Plus size={14} /></button>
            </div>
            {quickFacts.length === 0 && !newBroadcast ? (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No quick facts yet.</div>
            ) : (
              <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                {quickFacts.map(b => (
                  <div key={b.id}>
                    <BroadcastItem b={b} />
                    {editingBroadcast?.id === b.id && <BroadcastEditor item={b} onSave={saveBroadcast} onCancel={() => setEditingBroadcast(null)} />}
                  </div>
                ))}
              </div>
            )}
            {newBroadcast?.channel === "context" && newBroadcast?.subtype !== "doc" && <BroadcastEditor item={newBroadcast} onSave={saveBroadcast} onCancel={() => setNewBroadcast(null)} />}
          </div>
        )}
      </div>

      {/* ── Announcements (collapsible drawer) ── */}
      <div style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <button onClick={() => setAnnouncementsOpen(!announcementsOpen)} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", background: "none", border: "none", cursor: "pointer" }}>
          <Megaphone size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" }}>Announcements</span>
          <span style={{ fontSize: 9, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)", marginRight: "var(--space-2)" }}>{announcementBroadcasts.length}</span>
          {announcementsOpen ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {announcementsOpen && (
          <div style={{ padding: "0 var(--space-3) var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-2)" }}>
              <button onClick={() => { setNewBroadcast({ channel: "announcement" }); setEditingBroadcast(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: "var(--color-text-dim)" }}><Plus size={14} /></button>
            </div>
            {announcementBroadcasts.length === 0 && !newBroadcast ? (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>No announcements yet.</div>
            ) : (
              <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                {announcementBroadcasts.map(b => (
                  <div key={b.id}>
                    <BroadcastItem b={b} />
                    {editingBroadcast?.id === b.id && <BroadcastEditor item={b} onSave={saveBroadcast} onCancel={() => setEditingBroadcast(null)} />}
                  </div>
                ))}
              </div>
            )}
            {newBroadcast?.channel === "announcement" && <BroadcastEditor item={newBroadcast} onSave={saveBroadcast} onCancel={() => setNewBroadcast(null)} />}
          </div>
        )}
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
  const isMobile = useIsMobile();
  return (
    <div>

      {/* ═══ MASTHEAD ═══ */}
      <div style={{ marginBottom: isMobile ? "var(--space-4)" : "var(--space-12)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontSize: isMobile ? 36 : 64, fontWeight: "var(--font-weight-black)",
            fontFamily: "var(--font-primary)", letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: 1, color: "var(--color-text)", marginBottom: "var(--space-2)",
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
      { name: "Upstash Redis", url: "https://console.upstash.com/redis/34b124cd-3c2c-49f2-a023-f12222ee4ea7?teamid=0", note: "Distributed rate limiting — sliding window per API route. Shared across all serverless instances. Free tier (10K cmds/day)." },
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
      { name: "QuickBooks", url: "https://developer.intuit.com/app/developer/dashboard", note: "Intuit Developer. App: Fulkit. Production keys live. Accounting + Payments API." },
      { name: "Notion", url: "https://www.notion.so/my-integrations", note: "Public integration. OAuth Client ID + Secret. Read content only." },
      { name: "Dropbox", url: "https://www.dropbox.com/developers/apps", note: "App: F\u00FClkit. Production applied. Read-only (files.metadata.read, files.content.read)." },
      { name: "Slack", url: "https://api.slack.com/apps", note: "App: Fulkit. User scopes: channels:read, channels:history, search:read, users:read." },
      { name: "Microsoft (OneNote)", url: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", note: "Azure App Registration: Fulkit. Notes.Read + User.Read + offline_access. Multi-tenant." },
      { name: "Todoist", url: "https://developer.todoist.com/appconsole.html", note: "App: Fulkit. data:read scope." },
      { name: "Readwise", url: "https://readwise.io/access_token", note: "API key based \u2014 no developer app needed. Users paste their own key." },
    ],
  },
  {
    category: "Domain",
    items: [
      { name: "GoDaddy", url: "https://www.godaddy.com", note: "Domain registrar for fulkit.app + fullkit.app. Nameservers pointed to Vercel." },
    ],
  },
  {
    category: "Google Suite",
    items: [
      { name: "Google Cloud Console", url: "https://console.cloud.google.com", note: "OAuth app, API keys, Calendar/Gmail/Drive APIs. Project: fulkit." },
      { name: "Google Auth Platform", url: "https://console.cloud.google.com/auth/overview", note: "Branding, scopes, audience, verification status." },
      { name: "Google Groups", url: "https://groups.google.com", note: "fulkit-dev@googlegroups.com — support email on consent screen." },
    ],
  },
  {
    category: "Health",
    items: [
      { name: "Fitbit Dev", url: "https://dev.fitbit.com", note: "OAuth app registered. Client ID: 23V5V8. Activity, sleep, heart rate, weight." },
      { name: "Whoop Dev", url: "https://developer-dashboard.whoop.com", note: "Requires Whoop device + membership. Sleep, recovery, strain, HR." },
      { name: "Oura Dev", url: "https://cloud.ouraring.com/oauth/applications", note: "Not yet registered. Sleep, readiness, HR." },
      { name: "Strava Dev", url: "https://developers.strava.com", note: "Not yet registered. Runs, rides, workouts." },
      { name: "Garmin Dev", url: "https://developerprogram.garmin.com", note: "Not yet registered. OAuth 1.0a (harder). Activity, sleep, HR, stress." },
      { name: "Vital (paused)", url: "https://dashboard.tryvital.io", note: "Health aggregator. $300/mo min. Webhook configured, signing secret saved. Revisit at scale." },
      { name: "Terra (skipped)", url: "https://dashboard.tryterra.co", note: "Health aggregator. $499/mo min. Too expensive pre-launch." },
    ],
  },
  {
    category: "User Integrations (19 live)",
    items: [
      { name: "Google Suite", url: "https://console.cloud.google.com", note: "\u2705 Calendar (4 tools) + Gmail (2 tools) + Drive (3 tools). Verification submitted. Events on ThreadCalendar." },
      { name: "GitHub", url: "https://github.com/settings/developers", note: "\u2705 Live. File fetch, repo tree, search." },
      { name: "Spotify", url: "https://developer.spotify.com", note: "\u2705 Live. 5-seat extended quota. Fabric player + audio viz." },
      { name: "Square", url: "https://developer.squareup.com", note: "\u2705 Live. 17 chat tools. Daily summary, orders, inventory, customers." },
      { name: "Shopify", url: "https://partners.shopify.com", note: "\u2705 Live. 6 chat tools. Products, orders, customers." },
      { name: "Stripe", url: "https://dashboard.stripe.com", note: "\u2705 Live. 13 chat tools. Revenue, subscriptions, invoices." },
      { name: "Toast", url: "https://developer.toasttab.com", note: "\u2705 Live. 6 chat tools. Restaurant orders, menu, labor." },
      { name: "Trello", url: "https://trello.com/power-ups/admin", note: "\u2705 Live. Boards, cards, due dates. Events on ThreadCalendar." },
      { name: "Numbrly", url: "https://numbrly.app", note: "\u2705 Live. 10 chat tools. Margins, vendors, components." },
      { name: "TrueGauge", url: "https://truegauge.app", note: "\u2705 Live. 15 chat tools. Pace, cash, expenses." },
      { name: "Fitbit", url: "https://dev.fitbit.com", note: "\u2705 Live. Daily summary, sleep, heart rate, weight." },
      { name: "QuickBooks", url: "https://developer.intuit.com/app/developer/dashboard", note: "\u2705 Live. Production keys. P&L, balance sheet, invoices, expenses, customers." },
      { name: "Obsidian", url: "https://obsidian.md", note: "\u2705 Live. Folder picker import via File System Access API." },
      { name: "Notion", url: "https://www.notion.so/my-integrations", note: "\u2705 Live. Search pages, read content, import to vault." },
      { name: "Dropbox", url: "https://www.dropbox.com/developers/apps", note: "\u2705 Live. File search + read. Production applied." },
      { name: "Slack", url: "https://api.slack.com/apps", note: "\u2705 Live. Search messages, channels, history." },
      { name: "OneNote", url: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade", note: "\u2705 Live. Notebooks, sections, page content." },
      { name: "Todoist", url: "https://developer.todoist.com/appconsole.html", note: "\u2705 Live. Tasks, projects, priorities." },
      { name: "Readwise", url: "https://readwise.io/access_token", note: "\u2705 Live. API key based. Highlights, books." },
    ],
  },
  {
    category: "Invisible Intelligence (12 APIs)",
    items: [
      { name: "Open-Meteo", url: "https://open-meteo.com", note: "\u2705 Live. Weather, UV, forecast. No key needed." },
      { name: "Sunrise-Sunset", url: "https://sunrise-sunset.org", note: "\u2705 Live. Sunrise, sunset, golden hour. No key needed." },
      { name: "Open Food Facts", url: "https://world.openfoodfacts.org", note: "\u2705 Live. Nutrition, ingredients, allergens. No key needed." },
      { name: "USDA FoodData", url: "https://fdc.nal.usda.gov", note: "\u2705 Live. Gold standard nutrition. Key registered." },
      { name: "OpenLibrary", url: "https://openlibrary.org", note: "\u2705 Live. Book metadata, covers, authors. No key needed." },
      { name: "Frankfurter", url: "https://frankfurter.dev", note: "\u2705 Live. Currency exchange rates. No key needed." },
      { name: "Free Dictionary", url: "https://dictionaryapi.dev", note: "\u2705 Live. Definitions, etymology, synonyms. No key needed." },
      { name: "Nominatim", url: "https://nominatim.org", note: "\u2705 Live. Geocoding with cache. No key needed." },
      { name: "Wikipedia", url: "https://en.wikipedia.org/api", note: "\u2705 Live. Topic summaries. No key needed." },
      { name: "NASA", url: "https://api.nasa.gov", note: "\u2705 Live. APOD, asteroids. DEMO_KEY works." },
      { name: "WAQI", url: "https://aqicn.org/data-platform/token", note: "\u2705 Live. Air quality. Key registered." },
      { name: "Wolfram Alpha", url: "https://developer.wolframalpha.com", note: "\u2705 Live. Math, conversions, facts. AppID registered." },
      { name: "Currents API", url: "https://currentsapi.services", note: "\u2705 Live. News headlines. Key registered." },
      { name: "HIBP", url: "https://haveibeenpwned.com/API/Key", note: "\u23F3 One day. $3.50/mo. Breach check." },
    ],
  },
  {
    category: "Features Shipped (Session 23)",
    items: [
      { name: "Inbox Triage", url: "https://fulkit.app/chat", note: "Drop any file \u2192 AI reads \u2192 triage card \u2192 file/discuss/extract/connect." },
      { name: "ThreadCalendar", url: "https://fulkit.app/threads/calendar", note: "Google Calendar + Trello events on calendar grid. Drag-to-folder mapping." },
      { name: "Sources Search", url: "https://fulkit.app/settings/sources", note: "Search upcoming integrations + waitlist tickets + suggestion input." },
      { name: "Manual Redesign", url: "https://fulkit.app/settings/manual", note: "The manual is the chat. Try Asking section with 32 prompts." },
      { name: "Global Hotkeys", url: "https://fulkit.app/settings/manual", note: "Cmd+N (chat), Cmd+H (home), Cmd+J (threads), Cmd+Shift+C (side chat)." },
      { name: "Landing Cleanup", url: "https://fulkit.app/landing", note: "Removed unsourced stats, updated shipped features." },
      { name: "Location Intelligence", url: "https://fulkit.app/chat", note: "Auto-detect via memory \u2192 IP fallback. Nominatim geocoding with cache." },
    ],
  },
  {
    category: "Pending / One Day",
    items: [
      { name: "Vagaro", url: "https://docs.vagaro.com", note: "\u23F3 Email sent to Enterprise Sales for API access." },
      { name: "Whoop", url: "https://developer-dashboard.whoop.com", note: "\u23F3 Requires device + membership." },
      { name: "Oura", url: "https://cloud.ouraring.com/oauth/applications", note: "\u23F3 Requires ring + account." },
      { name: "Strava", url: "https://developers.strava.com", note: "\u23F3 API page erroring. Circle back." },
      { name: "Garmin", url: "https://developerprogram.garmin.com", note: "\u23F3 OAuth 1.0a. Build when account available." },
      { name: "Sonos", url: "https://developer.sonos.com", note: "\u23F3 Fabric playback through speakers. Not started." },
      { name: "Linear", url: "https://linear.app/developers", note: "\u23F3 Issue tracking. Not started." },
      { name: "HIBP", url: "https://haveibeenpwned.com/API/Key", note: "\u23F3 Breach check. $3.50/mo. Code ready, needs key." },
      { name: "Terra/Vital", url: "https://dashboard.tryvital.io", note: "\u274C $300-499/mo. Webhook configured, revisit at scale." },
    ],
  },
  {
    category: "Internal Pages",
    items: [
      { name: "/landing", url: "https://fulkit.app/landing", note: "Public landing page — hero, problem, math, features, grid, pricing, trust, CTA" },
      { name: "/about", url: "https://fulkit.app/about", note: "Public — brand philosophy, design language, Dieter Rams principles" },
      { name: "/login", url: "https://fulkit.app/login", note: "Public — Google OAuth + email sign-in" },
      { name: "/security", url: "https://fulkit.app/security", note: "Public — full security architecture (encryption, RLS, CSP, rate limiting)" },
      { name: "/privacy", url: "https://fulkit.app/privacy", note: "Public — privacy policy, data handling, third parties, deletion rights" },
      { name: "/terms", url: "https://fulkit.app/terms", note: "Public — terms of service, acceptable use, AI limitations" },
      { name: "/wtf", url: "https://fulkit.app/wtf", note: "Public — about/FAQ page" },
      { name: "/home", url: "https://fulkit.app/home", note: "App — dashboard, whispers, recent threads, action items" },
      { name: "/chat", url: "https://fulkit.app/chat", note: "App — main AI chat with streaming, tools, context injection" },
      { name: "/threads", url: "https://fulkit.app/threads", note: "App — kanban board (5 columns), drag-and-drop, due dates, labels" },
      { name: "/actions", url: "https://fulkit.app/actions", note: "App — task list with status tabs (active, done, deferred, dismissed)" },
      { name: "/fabric", url: "https://fulkit.app/fabric", note: "App — Signal Terrain audio viz, B-Side chat, crates, search" },
      { name: "/hum", url: "https://fulkit.app/hum", note: "App — voice capture mode" },
      { name: "/settings", url: "https://fulkit.app/settings", note: "App — profile, vault, integrations, AI, appearance, about tabs" },
      { name: "/owner", url: "https://fulkit.app/owner", note: "Owner — dashboard, design, users, notes, developer, fabric tabs" },
      { name: "/onboarding", url: "https://fulkit.app/onboarding", note: "App — new user questionnaire flow" },
      { name: "/ref/[code]", url: "https://fulkit.app/ref/code", note: "Public — referral landing page (dynamic per referral code)" },
    ],
  },
];

function NotesTab() {
  return (
    <div>
      <div style={TAB_TITLE}>Owner Notes</div>
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

// Dynamic revenue grid — all values derived from legend
function buildRevenueGrid() {
  const split = PROJECTIONS.standardProSplit;
  const freeSeats = PROJECTIONS.freeSeatsDefault;
  const costPerMsg = COST_BASIS.targetCostPerFul;
  const avgMsgs = PROJECTIONS.avgMsgsPerUserPerMonth;
  const hostBase = PROJECTIONS.hostingBase;
  const hostPer100 = PROJECTIONS.hostingPerHundredUsers;
  const refCredit = PROJECTIONS.blendedRefCreditPerUser;
  const stdPrice = PLANS.standard.priceMonthly;
  const proPrice = PLANS.pro.priceMonthly;

  return [20, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000].map(users => {
    const paying = users - freeSeats;
    const std = Math.round(paying * split);
    const pro = paying - std;
    const revenue = (std * stdPrice) + (pro * proPrice);
    const apiCost = Math.round(users * avgMsgs * costPerMsg);
    const credits = Math.round(paying * refCredit);
    const hosting = hostBase + Math.floor(users / 100) * hostPer100;
    const net = revenue - apiCost - credits - hosting;
    return { users, free: freeSeats, std, pro, revenue, apiCost, credits, hosting, net };
  });
}
const REVENUE_GRID = buildRevenueGrid();

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
  const isMobile = useIsMobile();
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
    padding: isMobile ? "var(--space-3)" : "var(--space-5)",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-lg)",
    marginBottom: isMobile ? "var(--space-3)" : "var(--space-6)",
  };

  const sectionLabel = {
    fontSize: 9,
    fontFamily: "var(--font-mono)",
    fontWeight: "var(--font-weight-medium)",
    textTransform: "uppercase",
    letterSpacing: "var(--letter-spacing-widest)",
    color: "var(--color-text-dim)",
    marginBottom: isMobile ? "var(--space-2)" : "var(--space-4)",
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
      <div style={TAB_TITLE}>Users</div>
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
          <div>{Math.round(PROJECTIONS.standardProSplit * 100)}/{Math.round((1 - PROJECTIONS.standardProSplit) * 100)} {TIERS.standard.label}/{TIERS.pro.label} split &middot; {PROJECTIONS.freeSeatsDefault} free seats &middot; ~{COST_BASIS.targetCostPerFul * 100}&cent;/msg target API cost &middot; ~${PROJECTIONS.blendedRefCreditPerUser}/mo blended ref credit</div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Users", "Trial", "Std", "Pro", "Revenue", "API Cost", "Ref Credits", "Hosting", "Net"].map((h, i) => (
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
  // ── Value Props ──
  { cat: "Value Props", text: `$${TIERS.standard.price}/mo. No onboarding. It read your notes.`, star: true },
  { cat: "Value Props", text: `You\u2019re paying $92/mo for 8 apps. F\u00FClkit replaces them for $${TIERS.standard.price}.` },
  { cat: "Value Props", text: `$${TIERS.standard.price}/mo. AI chat. Voice capture. Task manager. Note system. Decision log. One app.` },
  { cat: "Value Props", text: `ChatGPT Plus is $20. It doesn\u2019t know your name. F\u00FClkit is $${TIERS.standard.price}. It knows your week.`, star: true },
  { cat: "Value Props", text: `$${TIERS.standard.price}/mo is less than one lunch. F\u00FClkit remembers every lunch meeting you\u2019ve ever had.`, star: true },
  { cat: "Value Props", text: "Cancel 3 subscriptions. Keep F\u00FClkit. You\u2019re still saving money." },
  { cat: "Value Props", text: "Every other AI starts with a blank page. F\u00FClkit starts with yours.", star: true },
  { cat: "Value Props", text: `$${TIERS.standard.price}/mo for an AI that texts you first.` },
  { cat: "Value Props", text: `Notes app: $10. AI chat: $20. Voice recorder: $17. Or F\u00FClkit: $${TIERS.standard.price}. All of it.` },
  { cat: "Value Props", text: "The most expensive app is the one you forgot you\u2019re paying for. F\u00FClkit is the one you actually open." },
  { cat: "Value Props", text: "You\u2019re paying for 8 apps. You use 3. F\u00FClkit is the 1." },
  // ── Ful-Up ──
  { cat: "Ful-Up", text: "Share a link. Get $1/mo off. Every friend, every month." },
  { cat: "Ful-Up", text: `${REFERRALS.freeAtStandard} friends. $0/mo. Standard is free. Math, not marketing.` },
  { cat: "Ful-Up", text: `${REFERRALS.freeAtPro} friends and Pro is free. 25 friends and F\u00FClkit pays you.` },
  { cat: "Ful-Up", text: "Most referral programs give you a coupon. Ful-Up gives you a paycheck.", star: true },
  { cat: "Ful-Up", text: "Your referral link is permanent. Every friend who joins keeps paying you back." },
  { cat: "Ful-Up", text: "$1/mo per friend. It compounds. They stay, you save." },
  { cat: "Ful-Up", text: "At 25 referrals, F\u00FClkit starts writing you checks. Real ones." },
  { cat: "Ful-Up", text: "Free app. Cash back. No catch. Just a link." },
  { cat: "Ful-Up", text: "You don\u2019t need a promo code. You are the promo code." },
  { cat: "Ful-Up", text: `F\u00FClkit is $${TIERS.standard.price}/mo. Or $0/mo with ${REFERRALS.freeAtStandard} friends. Your move.` },
  { cat: "Ful-Up", text: "Refer 25 people and F\u00FClkit becomes a side hustle that runs itself." },
  { cat: "Ful-Up", text: "F\u00FCl you, pay me.", star: true },
  { cat: "Ful-Up", text: "Nothing\u2019s better than getting paid to F\u00FClkit.", star: true },
  { cat: "Ful-Up", text: "Get your F\u00FClkit free. Then get paid for it." },
  { cat: "Ful-Up", text: "F\u00FClkit around and find out how much you earn.", star: true },
  { cat: "Ful-Up", text: "Give a F\u00FCl. Get paid." },
  { cat: "Ful-Up", text: "The more F\u00FClkits you give, the more you get back." },
  { cat: "Ful-Up", text: "Stop paying for F\u00FClkit. Start getting paid for it.", star: true },
  { cat: "Ful-Up", text: "F\u00FClkit pays for itself. Then it pays for lunch.", star: true },
  { cat: "Ful-Up", text: "Tell your friends to get their F\u00FClkit together. You\u2019ll both save money." },
  { cat: "Ful-Up", text: "Share the F\u00FCl. Split the bill. Actually \u2014 delete the bill." },
  { cat: "Ful-Up", text: "No F\u00FClks given? That\u2019s money left on the table.", star: true },
  { cat: "Ful-Up", text: "F\u00FClkit your friends. They\u2019ll thank you. Your wallet will too." },
  { cat: "Ful-Up", text: "Who gives a F\u00FCl? You do. And you get $1/mo for each one." },
  // ── Comparisons ──
  { cat: "Comparisons", text: "ChatGPT, Claude, Gemini, Copilot \u2014 they all sit there with a cursor blinking until you type. F\u00FClkit texts first." },
  { cat: "Comparisons", text: "Notion remembers your pages. F\u00FClkit remembers your thoughts." },
  { cat: "Comparisons", text: "Obsidian is a vault. F\u00FClkit is a vault that talks back." },
  { cat: "Comparisons", text: "ChatGPT has memory now. It remembers your name. F\u00FClkit remembers your Friday.", star: true },
  { cat: "Comparisons", text: "Apple Notes is free. You get what you pay for.", star: true },
  { cat: "Comparisons", text: "Todoist tracks what you type. F\u00FClkit writes the list for you." },
  { cat: "Comparisons", text: "Your AI assistant has amnesia. Ours has a journal.", star: true },
  { cat: "Comparisons", text: "Every AI app: \u201CHow can I help you today?\u201D F\u00FClkit: \u201CYou left 3 things unfinished Friday. Start with the pitch deck.\u201D", star: true },
  { cat: "Comparisons", text: "Notion is a workspace. F\u00FClkit is a workmate." },
  { cat: "Comparisons", text: "Siri can set a timer. F\u00FClkit can set your priorities." },
  { cat: "Comparisons", text: "Google Keep keeps notes. F\u00FClkit keeps up." },
  { cat: "Comparisons", text: "You can talk to ChatGPT. You can talk with F\u00FClkit. There\u2019s a difference.", star: true },
  { cat: "Comparisons", text: "Every productivity app is a filing cabinet. F\u00FClkit is the person who knows where everything is." },
  { cat: "Comparisons", text: "Alexa, Siri, and Google listen to commands. F\u00FClkit listens to context." },
  { cat: "Comparisons", text: "ChatGPT forgets you between threads. F\u00FClkit never does." },
  { cat: "Comparisons", text: "You spend the first 3 messages catching AI up to speed. F\u00FClkit starts at message zero." },
  // ── Features ──
  { cat: "Features", text: "You talked for 5 minutes. You never looked at a screen. Everything was filed." },
  { cat: "Features", text: "No transcript. No typing. Just an orb that breathes while you think out loud.", star: true },
  { cat: "Features", text: "Voice mode for people who think better when they talk." },
  { cat: "Features", text: "Most apps notify. F\u00FClkit whispers.", star: true },
  { cat: "Features", text: "A suggestion drifted in at 9am. By 10am it was the best idea you had all week." },
  { cat: "Features", text: "Like a text from a friend who actually pays attention." },
  { cat: "Features", text: "Your notes used to just sit there. Now they argue back.", star: true },
  { cat: "Features", text: "Ask your notes a question. Get an answer you forgot you knew." },
  { cat: "Features", text: "You wrote it Tuesday. F\u00FClkit connected it to something from March. You didn\u2019t ask it to.", star: true },
  { cat: "Features", text: "Your data. Three locks. You pick which one." },
  { cat: "Features", text: "Local-first, encrypted sync, or managed. Most apps don\u2019t give you a choice. We give you three." },
  { cat: "Features", text: "You didn\u2019t write a to-do list. F\u00FClkit read your notes and wrote one for you.", star: true },
  { cat: "Features", text: "Friday brain dump. Monday morning: sorted, prioritized, waiting for you." },
  // ── Fabric ──
  { cat: "Fabric", text: "Your music has a shape. Fabric shows it to you.", star: true },
  { cat: "Fabric", text: "Hit play. Watch the wave come alive. That\u2019s your song \u2014 no two look the same." },
  { cat: "Fabric", text: "A waveform that breathes with the beat. Not a screensaver. A fingerprint." },
  { cat: "Fabric", text: "The breakdown goes flat. The drop hits hard. The wave doesn\u2019t fake it.", star: true },
  { cat: "Fabric", text: "Fullscreen. One orb. Breathing. You\u2019ll forget it\u2019s an app.", star: true },
  { cat: "Fabric", text: "There\u2019s a guy behind the counter. He only talks music. And he\u2019s better than your algorithm.", star: true },
  { cat: "Fabric", text: "Ask for jazz. He won\u2019t give you a playlist. He\u2019ll give you a pressing." },
  { cat: "Fabric", text: "He doesn\u2019t recommend what\u2019s popular. He recommends what\u2019s right.", star: true },
  { cat: "Fabric", text: "Not an algorithm. A record store guy with opinions." },
  { cat: "Fabric", text: "\u201CNo. Not that. This.\u201D", star: true },
  { cat: "Fabric", text: "Build sets like a DJ. Not like a consumer.", star: true },
  { cat: "Fabric", text: "Import your Spotify playlist. Refine it. Push it back. The original stays untouched." },
  { cat: "Fabric", text: "Thumbs down means gone. From everything. Forever. Spotify took that away. We brought it back.", star: true },
  { cat: "Fabric", text: "Your playlists, your order, your taste. No algorithm overriding you." },
  { cat: "Fabric", text: "Every song you play gets understood. Not just heard. Understood.", star: true },
  { cat: "Fabric", text: "Same song. Same shape. Every time. That\u2019s not random \u2014 that\u2019s honest." },
  { cat: "Fabric", text: "Print your favorite song. 11\u00D717. The actual shape of the sound." },
  // ── One-Liners ──
  { cat: "One-Liners", text: "I\u2019ll be your bestie.", star: true },
  { cat: "One-Liners", text: "One app. One bestie. Everything else is noise.", star: true },
  { cat: "One-Liners", text: "A friend with benefits \u2014 and the benefits are real.", star: true },
  { cat: "One-Liners", text: "Everything you see was chosen. Everything you don\u2019t was removed.", star: true },
  { cat: "One-Liners", text: "Let\u2019s chat and get shit done.", star: true },
  { cat: "One-Liners", text: "Every AI chat waits for you. F\u00FClkit texts first.", star: true },
  { cat: "One-Liners", text: "It\u2019s not magic. It\u2019s memory.", star: true },
  { cat: "One-Liners", text: "The full kit for your mind." },
  { cat: "One-Liners", text: "F\u00FClkit your brains out.", star: true },
  { cat: "One-Liners", text: "Get your F\u00FClkit together.", star: true },
  { cat: "One-Liners", text: "Open it. Talk. It already knows.", star: true },
  { cat: "One-Liners", text: "Less apps. More done." },
  { cat: "One-Liners", text: "A bestie anticipates." },
  { cat: "One-Liners", text: "The last app you\u2019ll ever need." },
  { cat: "One-Liners", text: "Remember everything. Explain nothing.", star: true },
  { cat: "One-Liners", text: "Not a chatbot. A thinking partner." },
  { cat: "One-Liners", text: "Your notes. Your voice. Your bestie." },
  { cat: "One-Liners", text: "F\u00FClkit. / fu:l\u00B7kit / \u2014 noun. A feeling." },
  { cat: "One-Liners", text: "Built to feel right." },
  { cat: "One-Liners", text: "F\u00FClkit. Because honestly? F\u00FClkit.", star: true },
  { cat: "One-Liners", text: "I don\u2019t give a F\u00FCl. Actually, I give several." },
  { cat: "One-Liners", text: "Absolutely F\u00FClking brilliant.", star: true },
  { cat: "One-Liners", text: "What the F\u00FCl." },
  { cat: "One-Liners", text: "Zero F\u00FClks given. Maximum F\u00FClks earned." },
  { cat: "One-Liners", text: "Go F\u00FCl yourself. Seriously. You deserve it.", star: true },
  { cat: "One-Liners", text: "Holy F\u00FClkit." },
  { cat: "One-Liners", text: "F\u00FCl of surprises." },
  { cat: "One-Liners", text: "Un-F\u00FClking-believable." },
  { cat: "One-Liners", text: "F\u00FCl me once, shame on you. F\u00FCl me twice \u2014 wait, F\u00FClkit never forgets.", star: true },
  { cat: "One-Liners", text: `Are you F\u00FClking kidding me? $${TIERS.standard.price}/mo?`, star: true },
  { cat: "One-Liners", text: "Too much to do? F\u00FClkit.", star: true },
  { cat: "One-Liners", text: "Can\u2019t remember? F\u00FClkit.", star: true },
  { cat: "One-Liners", text: "Stressed? Overwhelmed? F\u00FClkit.", star: true },
  { cat: "One-Liners", text: "My memory is F\u00FClkit. And that\u2019s the point." },
  { cat: "One-Liners", text: "I\u2019m so F\u00FClkit it\u2019s not even funny. Actually it is." },
  { cat: "One-Liners", text: "F\u00FClkit all. One app.", star: true },
  // ── Brand ──
  { cat: "Brand", text: "F\u00FClkit \u2014 from German \u2018f\u00FChlen\u2019 (to feel) + kit. A toolkit that feels right." },
  { cat: "Brand", text: "The two dots aren\u2019t decoration. They\u2019re German. F\u00FCl = to feel." },
  { cat: "Brand", text: "A tool called \u2018Productivity Suite 3.0\u2019 gets scrolled past. A tool called F\u00FClkit gets a reaction.", star: true },
  { cat: "Brand", text: "The umlaut makes it German. The meaning makes it real. The double-take makes it memorable.", star: true },
  { cat: "Brand", text: "You either get the name or you Google it. Either way, you remember it.", star: true },
  { cat: "Brand", text: "Yes, it\u2019s pronounced like that. No, we\u2019re not sorry.", star: true },
  { cat: "Brand", text: "Bestie energy, not servant energy.", star: true },
  { cat: "Brand", text: "Warm but not chatty. Useful but not desperate." },
  { cat: "Brand", text: "Built by one person. For people who think one app should be enough." },
  { cat: "Brand", text: "No board. No investors. No one telling us to add a social feed.", star: true },
  { cat: "Brand", text: "We didn\u2019t raise money. We raised standards.", star: true },
  { cat: "Brand", text: "This isn\u2019t a startup. It\u2019s a tool someone needed, so they built it." },
  { cat: "Brand", text: "No pitch deck. No Series A. Just a product that works and a guy who gives a F\u00FCl.", star: true },
  { cat: "Brand", text: "F\u00FClkit isn\u2019t trying to be cool. It\u2019s trying to be useful. The cool part is an accident." },
  // ── Social Posts ──
  { cat: "Social Posts", text: "My AI remembers everything I\u2019ve ever saved. Yours starts from zero every time.", star: true },
  { cat: "Social Posts", text: "I stopped using 8 apps last month. I don\u2019t miss any of them.", star: true },
  { cat: "Social Posts", text: "People ask what AI I use. I say F\u00FClkit. They Google it. They come back different.", star: true },
  { cat: "Social Posts", text: "Every AI app in 2026 has memory now. Cool. F\u00FClkit had it before it was a feature." },
  { cat: "Social Posts", text: "I don\u2019t catch my AI up to speed anymore. If yours still needs context, that\u2019s a you problem." },
  { cat: "Social Posts", text: "I talked to an orb for 5 minutes. It organized my entire week.", star: true },
  { cat: "Social Posts", text: "Friday: brain dump into F\u00FClkit. Monday: open the app. Everything sorted. I didn\u2019t touch it all weekend.", star: true },
  { cat: "Social Posts", text: "I wrote a note in February. Forgot about it. F\u00FClkit connected it to something I said yesterday. I didn\u2019t ask it to." },
  { cat: "Social Posts", text: "My friend asked how I stay organized. I showed them my app. They said \u201Cwhat the F\u00FCl.\u201D", star: true },
  { cat: "Social Posts", text: "I asked B-Side for a playlist. He said \u201Cno, not that\u201D and gave me a 1964 Blue Note pressing. He was right." },
  { cat: "Social Posts", text: `$${TIERS.standard.price}/mo. No ads. No tracking. No selling my data. I genuinely don\u2019t know why everyone isn\u2019t on this.`, star: true },
  { cat: "Social Posts", text: `I pay less for F\u00FClkit than I do for oat milk. And F\u00FClkit remembers my meetings.` },
  { cat: "Social Posts", text: `My notes app, task manager, AI chat, voice recorder, and decision log are the same app. It costs $${TIERS.standard.price}.` },
  { cat: "Social Posts", text: "I have one app open. You have twelve. We are not the same.", star: true },
  { cat: "Social Posts", text: "The AI app nobody talks about yet.", star: true },
  { cat: "Social Posts", text: "I found an app that texts ME first." },
  { cat: "Social Posts", text: "An app with an umlaut just changed how I work. Let me explain.", star: true },
  { cat: "Social Posts", text: "You know that friend who remembers everything? I have an app version of that." },
  { cat: "Social Posts", text: "I don\u2019t use ChatGPT anymore and nobody\u2019s asked me why.", star: true },
  { cat: "Social Posts", text: "Wait until you hear what happens when you thumbs-down a song in F\u00FClkit. It\u2019s gone. From everything. Forever. Spotify could never." },
  { cat: "Social Posts", text: "The security page is public. I actually read it. That\u2019s never happened before." },
  { cat: "Social Posts", text: "I opened my laptop and my AI already knew what I was working on. Nobody else\u2019s does that.", star: true },
  { cat: "Social Posts", text: `People pay $20/mo for ChatGPT and still spend the first 3 messages explaining themselves. I pay $${TIERS.standard.price} and say \u201Chey.\u201D`, star: true },
  { cat: "Social Posts", text: "My AI texted me before I texted it. Read that again.", star: true },
  { cat: "Social Posts", text: "I deleted Notion, Todoist, and Otter last month. My workflow got better." },
  { cat: "Social Posts", text: "Someone asked me how I get so much done. It\u2019s not discipline. It\u2019s one app.", star: true },
  { cat: "Social Posts", text: "I told F\u00FClkit about a meeting on Tuesday. Thursday it connected it to a note from January. I forgot I wrote that note." },
  { cat: "Social Posts", text: `My AI knows my week better than I do. That\u2019s not creepy. That\u2019s $${TIERS.standard.price}/mo.`, star: true },
  { cat: "Social Posts", text: "I don\u2019t take notes in meetings anymore. I talk to an orb after. Everything gets filed. People think I have a system. I do. It\u2019s called F\u00FClkit.", star: true },
  { cat: "Social Posts", text: "Cancelled 4 subscriptions. Kept one. Saving $70/mo. Do the math." },
  { cat: "Social Posts", text: "My coworkers use 3 AI tools. I use one. Mine knows my name." },
  { cat: "Social Posts", text: `${REFERRALS.freeAtStandard} friends and F\u00FClkit is free. I\u2019m at 6. Who wants in.`, star: true },
  { cat: "Social Posts", text: "F\u00FClkit has a referral program where you can literally get paid to use the app. I\u2019m not even kidding." },
  { cat: "Social Posts", text: "Told my coworker about F\u00FClkit. Now we\u2019re both saving money. That\u2019s how this works." },
  { cat: "Social Posts", text: "I got 3 friends on F\u00FClkit. My bill dropped $3. Their lives improved. Everybody wins." },
  { cat: "Social Posts", text: "At 25 referrals F\u00FClkit starts paying you. I\u2019m treating this as a part-time job.", star: true },
  { cat: "Social Posts", text: "My friend asked why I keep recommending this app. Because I get $1/mo every time you sign up, Karen. And also it\u2019s amazing.", star: true },
  { cat: "Social Posts", text: "Free AI app that remembers everything AND pays me to tell people about it. Where\u2019s the catch? There isn\u2019t one." },
  { cat: "Social Posts", text: "Link in bio. You get a bestie. I get $1/mo. We both win.", star: true },
  // ── Security ──
  { cat: "Security", text: "Security is not a feature we added. It\u2019s the way we built everything else.", star: true },
  { cat: "Security", text: "We built the vault before we built the product.", star: true },
  { cat: "Security", text: "Delete everything. Right now. For real. Not \u201Cwithin 30 days.\u201D", star: true },
  { cat: "Security", text: "ChatGPT says \u201Cwe may retain your data for 30 days.\u201D F\u00FClkit says \u201Cdelete now\u201D and means it.", star: true },
  { cat: "Security", text: "We publish our security architecture because we built it to be read. Most AI apps don\u2019t \u2014 because they can\u2019t.", star: true },
  { cat: "Security", text: "Your data isn\u2019t the product. You\u2019re not the product. You\u2019re the customer." },
  { cat: "Security", text: "Read the whole thing. fulkit.app/security. We\u2019ll wait.", star: true },
  { cat: "Security", text: "Encrypted before it touches the database. Decrypted only in your session. Never logged." },
  { cat: "Security", text: "Your AI key. Your encryption. Your vault. We just built the room." },
  { cat: "Security", text: "Most AI apps have a privacy policy. We have a security architecture.", star: true },
  { cat: "Security", text: "We don\u2019t read your notes. We encrypt them so we can\u2019t.", star: true },
  { cat: "Security", text: "\u201CWhere does my data go?\u201D Nowhere. It stays with you. That\u2019s the whole point." },
  { cat: "Security", text: "Three vault modes because one size doesn\u2019t fit trust." },
  { cat: "Security", text: "Even a bug in our code can\u2019t show your data to another user. That\u2019s not a promise \u2014 it\u2019s the database design." },
  { cat: "Security", text: `You know how free apps make money? You\u2019re the product. F\u00FClkit costs $${TIERS.standard.price} because you\u2019re the customer.`, star: true },
  { cat: "Security", text: "Every AI company says \u201Cwe take privacy seriously.\u201D We say \u201Cread the architecture.\u201D There\u2019s a difference.", star: true },
  { cat: "Security", text: "You\u2019ve never read a privacy policy. That\u2019s fine. Ours is built so you don\u2019t have to trust us \u2014 the math does." },
  { cat: "Security", text: "Other apps ask you to trust them. We ask you to verify us.", star: true },
  { cat: "Security", text: "Your grandkids\u2019 AI will know everything about them. F\u00FClkit is the one that lets them decide how much." },
  { cat: "Security", text: "\u201CBut what if you get hacked?\u201D Even then \u2014 encrypted at rest, scoped per user, no plaintext keys. A hacker gets noise." },
  { cat: "Security", text: "Big tech reads your email to sell you ads. We encrypt your notes so even we can\u2019t read them. That\u2019s not a slogan. That\u2019s engineering.", star: true },
  { cat: "Security", text: "You wouldn\u2019t hand your journal to a stranger. So why do you hand your thoughts to an app that sells them?", star: true },
  { cat: "Security", text: "We don\u2019t have investors telling us to monetize your data. We have customers telling us to protect it." },
  // ── Invisible Intelligence ──
  { cat: "Invisible Intelligence", text: "I said \u201Cthinking about hiking Zion tomorrow.\u201D F\u00FClkit said \u201Cit\u2019s gonna cook out there \u2014 mid-90s. Go early.\u201D I didn\u2019t ask for the weather.", star: true },
  { cat: "Invisible Intelligence", text: "My AI knows the weather. The air quality. The exchange rate. When the sun sets. The nutrition facts. I never turned any of it on.", star: true },
  { cat: "Invisible Intelligence", text: "I mentioned a smoothie recipe. F\u00FClkit said \u201Cyou might want to ease up on the agave.\u201D It knew the sugar content. I didn\u2019t ask.", star: true },
  { cat: "Invisible Intelligence", text: "The best AI features are the ones you never set up.", star: true },
  { cat: "Invisible Intelligence", text: "ChatGPT doesn\u2019t know what time the sun sets. F\u00FClkit does. And it only mentions it when it matters." },
  { cat: "Invisible Intelligence", text: "12 APIs running silently. Zero configuration. You just notice your AI is smarter than everyone else\u2019s." },
  { cat: "Invisible Intelligence", text: "No weather widget. No nutrition tracker. No currency converter. F\u00FClkit just knows \u2014 and only says something when it matters.", star: true },
  { cat: "Invisible Intelligence", text: "I asked \u201Cwhat\u2019s the word for when something feels both good and bad?\u201D F\u00FClkit gave me the word, the etymology, and a better way to phrase my sentence. One breath." },
  // ── Integrations ──
  { cat: "Integrations", text: "19 integrations. One conversation. \u201CHow\u2019s the business?\u201D pulls from Square, QuickBooks, and your calendar. Simultaneously.", star: true },
  { cat: "Integrations", text: "Connected my calendar, my invoices, and my task list. Asked \u201Cwhat should I focus on today?\u201D Got a real answer.", star: true },
  { cat: "Integrations", text: "Drop a PDF into chat. F\u00FClkit reads it, summarizes it, extracts the action items, and files it. In seconds.", star: true },
  { cat: "Integrations", text: "I dropped a 20-page contract into F\u00FClkit. Got a 3-sentence summary and 4 action items. Took 8 seconds." },
  { cat: "Integrations", text: "Google Calendar, Slack, Dropbox, QuickBooks, Notion, Todoist \u2014 all in one chat window. No switching. No copy-pasting. Just ask." },
  { cat: "Integrations", text: "\u201CWhat did Sarah say about the contract?\u201D F\u00FClkit searched my Gmail and found it. I didn\u2019t open Gmail.", star: true },
  { cat: "Integrations", text: "My calendar, my email, and my Slack all live in the same conversation. I ask one question and get context from three places.", star: true },
  { cat: "Integrations", text: "Every integration connects with one click. Disconnects with one click. No forms. No setup wizards. Just in or out." },
  { cat: "Integrations", text: "I imported my entire Obsidian vault in 10 seconds. 200 notes. All searchable in chat immediately." },
  // ── Health ──
  { cat: "Health", text: "\u201CHow did I sleep?\u201D Real answer. From your Fitbit. In chat. Not a dashboard.", star: true },
  { cat: "Health", text: "Your AI knows your resting heart rate, your sleep efficiency, and how many steps you took. And it only brings it up when you need to hear it." },
  { cat: "Health", text: "No health app dashboard. No charts. Just \u201Cyou slept 5 hours \u2014 maybe skip the hard workout today.\u201D", star: true },
  // ── Calendar ──
  { cat: "Calendar", text: "Your Google Calendar, Trello boards, and Fulkit threads \u2014 all on one calendar. Drag an event to a folder. Done.", star: true },
  { cat: "Calendar", text: "\u201CBlock off Friday morning for deep work.\u201D Done. From chat. No switching to Google Calendar.", star: true },
  { cat: "Calendar", text: "I asked \u201Cam I free Thursday afternoon?\u201D F\u00FClkit checked my calendar and said \u201Cyou have a dentist at 2. After that you\u2019re clear.\u201D" },
  { cat: "Security", text: "The question isn\u2019t \u201Cis my data safe?\u201D The question is \u201Cwho benefits from it?\u201D With F\u00FClkit, only you.", star: true },
  // ── For Cynics ──
  // ── Cynics ──
  { cat: "Cynics", text: "Another AI app. Except this one shuts up until it has something useful to say.", star: true },
  { cat: "Cynics", text: "We\u2019re not revolutionizing anything. We just made your notes useful." },
  { cat: "Cynics", text: "You don\u2019t need another app. You need fewer apps.", star: true },
  { cat: "Cynics", text: "No blockchain. No metaverse. No \u2018delightful experience.\u2019 Just a tool that works.", star: true },
  { cat: "Cynics", text: "Tired of catching AI up to speed? Same." },
  { cat: "Cynics", text: "Zero push notifications. We respect your attention span." },
  { cat: "Cynics", text: "Yes, it uses AI. No, it\u2019s not a ChatGPT wrapper.", star: true },
  { cat: "Cynics", text: "No VC money. No growth-at-all-costs. Just a tool someone actually uses.", star: true },
  { cat: "Cynics", text: "We don\u2019t have a growth team. We have a product.", star: true },
  { cat: "Cynics", text: "No onboarding email sequence. No \u201Cjust checking in!\u201D No drip campaign. You\u2019ll hear from us when we ship something.", star: true },
  { cat: "Cynics", text: "We\u2019re not going to ask you to \u201Cjoin the waitlist.\u201D It\u2019s $9. It\u2019s ready. Use it or don\u2019t.", star: true },
  { cat: "Cynics", text: "The landing page doesn\u2019t have a countdown timer. You\u2019re welcome." },
  { cat: "Cynics", text: "We didn\u2019t A/B test the button color. We made the product good.", star: true },
  { cat: "Cynics", text: "No \u201Cwe\u2019re excited to announce.\u201D We shipped it. It\u2019s there. Go look." },
  { cat: "Cynics", text: "You\u2019ve been burned by 6 productivity apps that got acquired, pivoted, or died. This one\u2019s built by someone who actually uses it.", star: true },
  { cat: "Cynics", text: "We\u2019re not disrupting anything. We\u2019re just not wasting your time." },
  { cat: "Cynics", text: "No gamification. No streaks. No badges. You\u2019re a grown adult.", star: true },
  { cat: "Cynics", text: "The last app that promised to \u201Cchange how you work\u201D lasted 4 months. F\u00FClkit\u2019s been here. It\u2019ll be here." },
  { cat: "Cynics", text: "We don\u2019t have a \u201Ccommunity.\u201D We have an app. Open it and work." },
  { cat: "Cynics", text: "If you\u2019re tired of apps that feel like they were designed by a committee of LinkedIn influencers \u2014 this one wasn\u2019t.", star: true },
  { cat: "Cynics", text: "Built by a person, not a persona." },
  { cat: "Cynics", text: "You\u2019ve read this far because nothing sounded like bullshit. That\u2019s the point.", star: true },
  { cat: "Cynics", text: "We don\u2019t want to be your platform. We want to be your tool." },
  // ── For Developers ──
  // ── Developers ──
  { cat: "Developers", text: "Supabase. Row-level security. AES-256-GCM. No plaintext secrets. Read the receipts.", star: true },
  { cat: "Developers", text: "Bring your own key. Your API calls, your model, your bill.", star: true },
  { cat: "Developers", text: "No vendor lock-in. Export everything. Delete everything. We wrote the cascade.", star: true },
  { cat: "Developers", text: "One repo. One framework. No microservices pretending to be simple.", star: true },
  { cat: "Developers", text: "No analytics SDK. No Mixpanel. No \u2018anonymous\u2019 telemetry that isn\u2019t.", star: true },
  { cat: "Developers", text: "The security model is documented. Not behind a sales call.", star: true },
  { cat: "Developers", text: "Three storage models. Local-first, encrypted sync, or managed. You pick." },
  { cat: "Developers", text: "Next.js. Supabase. Claude. Vercel. That\u2019s the whole stack. No, really.", star: true },
  { cat: "Developers", text: "We don\u2019t have a design system library. We have opinions.", star: true },
  { cat: "Developers", text: "The chat route is 2000 lines. It\u2019s the nervous system. We\u2019re not embarrassed.", star: true },
  { cat: "Developers", text: "OAuth flow: connect \u2192 callback \u2192 status \u2192 disconnect. Every integration. Same pattern. No snowflakes." },
  { cat: "Developers", text: "Every bug we hit made the product better. We ship the lessons, not the excuses." },
  { cat: "Developers", text: "We wrote the security page so devs could audit it. Not so marketers could summarize it.", star: true },
  { cat: "Developers", text: "No feature flags. No backwards-compatibility shims. If it\u2019s unused, it\u2019s deleted." },
  { cat: "Developers", text: "One font. One color family. Inline styles. Devs look at the code and say \u201Cwait, that\u2019s it?\u201D Yes. That\u2019s it.", star: true },
  { cat: "Developers", text: "We\u2019d rather ship one thing that works than announce five things that don\u2019t.", star: true },
  // ── Design ──
  { cat: "Design", text: "Good design is invisible. You notice the work, not the interface.", star: true },
  { cat: "Design", text: "Less, but better. \u2014 Dieter Rams, 1960s. Us, today.", star: true },
  { cat: "Design", text: "One color family. Warm grey. #2A2826 to #EFEDE8. That\u2019s not a limitation. That\u2019s a decision.", star: true },
  { cat: "Design", text: "The only color you\u2019ll see is functional. Green means success. Red means error. Grey means everything else." },
  { cat: "Design", text: "Eggshell, not white. Deep slate, not black. Warm, not cold." },
  { cat: "Design", text: "No gradients pretending to be depth. No shadows pretending to be dimension.", star: true },
  { cat: "Design", text: "The font was built for German road signs. Legible at 120 km/h. In rain. At night. We use it for the same reason \u2014 every word earns its place.", star: true },
  { cat: "Design", text: "Good design is innovative. Good design is useful. Good design is honest. Good design is as little design as possible. \u2014 We didn\u2019t write those rules. We just follow them." },
  { cat: "Design", text: "The whitespace isn\u2019t empty. It\u2019s working.", star: true },
  { cat: "Design", text: "Horizontal rules aren\u2019t decoration. They\u2019re architecture." },
  { cat: "Design", text: "We removed the thing you didn\u2019t notice was bothering you.", star: true },
  { cat: "Design", text: "If it\u2019s not a status signal, it\u2019s grey. That\u2019s the rule. No exceptions." },
  { cat: "Design", text: "A century of German and Swiss design thinking. Not trend-chasing. Philosophy." },
  { cat: "Design", text: "Bauhaus, 1919: form follows function. We\u2019re still following." },
  { cat: "Design", text: "You open it and it feels right. You can\u2019t explain why. That\u2019s the design working.", star: true },
  { cat: "Design", text: "We don\u2019t add features. We remove friction.", star: true },
  { cat: "Design", text: "The interface should be so quiet that your thoughts are the loudest thing in the room.", star: true },
  { cat: "Design", text: "No animation for the sake of animation. Motion means something changed." },
  { cat: "Design", text: "When in doubt, we remove something. It\u2019s always the right call." },
  { cat: "Design", text: "Pretty is easy. Quiet is hard. We built quiet.", star: true },
  { cat: "Design", text: "Form follows function. Color follows meaning. Everything else is removed." },
  { cat: "Design", text: "We don\u2019t have a mascot. We have a typeface.", star: true },
  // ── For Creatives ──
  // ── Creatives ──
  { cat: "Creatives", text: "Your ideas deserve better than a notes app graveyard." },
  { cat: "Creatives", text: "You had the idea Tuesday. The connection was there Thursday. F\u00FClkit saw it Wednesday.", star: true },
  { cat: "Creatives", text: "No notification badges. No social feeds. Just you and what you\u2019re thinking.", star: true },
  { cat: "Creatives", text: "Talk through it. F\u00FClkit listens, files, connects. You just think out loud." },
  { cat: "Creatives", text: "It doesn\u2019t interrupt. It whispers. Like a collaborator who reads the room.", star: true },
  { cat: "Creatives", text: "Built by a designer. For people who notice when something feels off." },
  { cat: "Creatives", text: "Your creative process is messy. Your tools don\u2019t have to be." },
  { cat: "Creatives", text: "No blank canvas anxiety. Open it and it already knows what you\u2019re working on.", star: true },
  { cat: "Creatives", text: "You don\u2019t need a productivity system. You need a place to think.", star: true },
  { cat: "Creatives", text: "F\u00FClkit doesn\u2019t organize your creativity. It follows it." },
  { cat: "Creatives", text: "You rambled for 10 minutes about a project. F\u00FClkit turned it into an outline, a task list, and a follow-up question.", star: true },
  { cat: "Creatives", text: "The best ideas don\u2019t come at your desk. They come in the shower, on a walk, in the car. F\u00FClkit catches them after.", star: true },
  { cat: "Creatives", text: "Your sketchbook doesn\u2019t judge. Neither does F\u00FClkit." },
  { cat: "Creatives", text: "Write drunk. Edit sober. F\u00FClkit remembers both.", star: true },
  { cat: "Creatives", text: "The mood board is in your head. F\u00FClkit helps you get it out." },
  { cat: "Creatives", text: "Other tools want you to organize before you create. F\u00FClkit lets you create, then organizes for you.", star: true },
  { cat: "Creatives", text: "You don\u2019t file ideas. You throw them at F\u00FClkit. It figures out where they go." },
  { cat: "Creatives", text: "For the person with 47 open tabs and a vision.", star: true },
  // ── For Entrepreneurs ──
  // ── Entrepreneurs ──
  { cat: "Entrepreneurs", text: "Your AI doesn\u2019t know about the investor call, the pricing pivot, or the hire you\u2019re agonizing over. F\u00FClkit does.", star: true },
  { cat: "Entrepreneurs", text: "Every conversation starts with context. Not from scratch." },
  { cat: "Entrepreneurs", text: "Move fast. Don\u2019t explain yourself twice.", star: true },
  { cat: "Entrepreneurs", text: "Solo founder? F\u00FClkit is the thinking partner you can\u2019t afford to hire.", star: true },
  { cat: "Entrepreneurs", text: "Investors ask about security. You send them the architecture doc. Not a slide deck.", star: true },
  { cat: "Entrepreneurs", text: "Every decision you\u2019ve made, searchable. Every pivot, timestamped." },
  { cat: "Entrepreneurs", text: "Stripe, Shopify, Square, GitHub \u2014 already connected. Your business data in your bestie\u2019s brain." },
  { cat: "Entrepreneurs", text: "It\u2019s not a pitch deck tool. It\u2019s the thing that makes your pitch deck honest." },
  { cat: "Entrepreneurs", text: "You\u2019re the CEO, CFO, CTO, and intern. F\u00FClkit is the one that doesn\u2019t forget what you said in all four meetings.", star: true },
  { cat: "Entrepreneurs", text: "Your cofounder is an AI that actually read the last 6 months of notes.", star: true },
  { cat: "Entrepreneurs", text: "The first 3 messages of every ChatGPT conversation is you explaining your business. F\u00FClkit already knows your business.", star: true },
  { cat: "Entrepreneurs", text: "You don\u2019t have time to maintain a second brain. F\u00FClkit maintains itself.", star: true },
  { cat: "Entrepreneurs", text: `$${TIERS.standard.price}/mo for something that actually remembers the conversation you had with your accountant in January.` },
  { cat: "Entrepreneurs", text: "You pivoted twice last quarter. F\u00FClkit tracked both. Your notes app didn\u2019t." },
  { cat: "Entrepreneurs", text: "Everyone tells founders to \u201Cdocument everything.\u201D F\u00FClkit does it for you.", star: true },
  { cat: "Entrepreneurs", text: "Board meeting prep used to take a day. Now you open F\u00FClkit and ask \u201Cwhat happened this quarter?\u201D", star: true },
  { cat: "Entrepreneurs", text: `You can\u2019t hire a chief of staff. You can get F\u00FClkit for $${TIERS.standard.price}.` },
  { cat: "Entrepreneurs", text: "The difference between a founder who wings it and a founder who\u2019s prepared is what their AI remembers.", star: true },
  // ── Switch ──
  { cat: "Switch", text: "Cancel Notion. Cancel Otter. Cancel Todoist. Open F\u00FClkit. That\u2019s the whole migration.", star: true },
  { cat: "Switch", text: "The hardest part of switching is deciding to. After that it takes 4 minutes.", star: true },
  { cat: "Switch", text: "You don\u2019t need to export anything. Just start talking. F\u00FClkit builds your brain from day one." },
  { cat: "Switch", text: "No migration wizard. No CSV import hell. Just open it and go." },
  { cat: "Switch", text: "Your old apps had 3 years of notes you never looked at. Start fresh. F\u00FClkit will be smarter than them by Friday.", star: true },
  { cat: "Switch", text: "You\u2019re not \u201Cinvested\u201D in your old apps. You\u2019re trapped. There\u2019s a difference.", star: true },
  { cat: "Switch", text: "Sunk cost isn\u2019t a reason to keep paying. It\u2019s a reason to stop.", star: true },
  { cat: "Switch", text: "That Notion setup you spent a weekend building? You haven\u2019t opened it in 3 weeks. It\u2019s okay to let go.", star: true },
  { cat: "Switch", text: "You don\u2019t owe your productivity stack loyalty." },
  { cat: "Switch", text: "Every app you cancel is one less password, one less tab, one less \u201Cjust checking in!\u201D email." },
  { cat: "Switch", text: "Your old apps will send you \u201Cwe miss you\u201D emails. F\u00FClkit won\u2019t. It\u2019ll be too busy remembering your week.", star: true },
  { cat: "Switch", text: "Day 1: skeptical. Day 3: curious. Day 7: you forgot you had other apps.", star: true },
  { cat: "Switch", text: "The first time F\u00FClkit references something you said last week without being asked \u2014 that\u2019s the moment you know.", star: true },
  { cat: "Switch", text: "Nobody switches back. Not because they can\u2019t. Because there\u2019s nothing to go back to.", star: true },
  { cat: "Switch", text: "You\u2019ll spend 5 minutes setting up F\u00FClkit and wonder why you spent 5 years setting up everything else.", star: true },
  { cat: "Switch", text: "Cancel 3 apps today. Sign up for F\u00FClkit. Net savings by tomorrow: $40+/mo." },
  { cat: "Switch", text: "The free trial is 100 messages. That\u2019s enough to know." },
  { cat: "Switch", text: `$${TIERS.standard.price}/mo. 30-day cancel anytime. No annual trap. No \u201Care you sure?\u201D guilt screen.`, star: true },
];

const PITCH_CATEGORIES = ["Value Props", "Ful-Up", "Comparisons", "Features", "Fabric", "Security", "One-Liners", "Brand", "Design", "Social Posts", "Cynics", "Developers", "Creatives", "Entrepreneurs", "Switch"];

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
  // TODO: Pre-launch — publish Meta "Fülkit Social" app before going live.
  // Dashboard: developers.facebook.com → Fülkit Social → Publish.
  // Required for non-test-user access to Threads + Facebook posting.

  const { accessToken } = useAuth();
  const isMobile = useIsMobile();
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
  const [metaOpen, setMetaOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-metaOpen") === "true");
  const [socialsOpen, setSocialsOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-socialsOpen") === "true");
  const [socialSize, setSocialSize] = useState("og");
  const [socialConceptIdx, setSocialConceptIdx] = useState(0);
  const [socialKitOpen, setSocialKitOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-socialKitOpen") === "true");
  const [previewTemplate, setPreviewTemplate] = useState(null); // { url, concept, size, aspect, sizeKey }
  const [localAppOpen, setLocalAppOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-localAppOpen") === "true");

  // Persist drawer state
  useEffect(() => { localStorage.setItem("owner-metaOpen", metaOpen); }, [metaOpen]);
  useEffect(() => { localStorage.setItem("owner-socialsOpen", socialsOpen); }, [socialsOpen]);
  useEffect(() => { localStorage.setItem("owner-socialKitOpen", socialKitOpen); }, [socialKitOpen]);
  useEffect(() => { localStorage.setItem("owner-localAppOpen", localAppOpen); }, [localAppOpen]);

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
      {/* ─── Publish ─── */}
      <PublishSection accessToken={accessToken} />


      {/* ── SOCIAL KIT ── */}
      {(() => {
        const PLATFORMS = [
          { key: "og", label: "Bluesky / OG", dims: "1200 \u00D7 630", aspect: "1200/630" },
          { key: "ig-post", label: "Instagram Post", dims: "1080 \u00D7 1350", aspect: "1080/1350" },
          { key: "ig-stories", label: "Instagram Stories", dims: "1080 \u00D7 1920", aspect: "1080/1920" },
          { key: "square", label: "1:1", dims: "1080 \u00D7 1080", aspect: "1080/1080" },
        ];
        const concepts = ["hero", "price", "memory", "stack", "voice", "bestie", "notes"];
        const active = PLATFORMS.find(p => p.key === socialSize) || PLATFORMS[0];
        const sizeParam = socialSize;
        return (
          <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-6)", marginBottom: "var(--space-6)" }}>
            <button onClick={() => setSocialKitOpen(prev => !prev)} style={{
              ...TAB_TITLE,
              background: "#FFFFFF", border: "1px solid var(--color-border-light)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left",
              padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-3)",
            }}>
              Social Kit
              {socialKitOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            {socialKitOpen && (<>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "140px 1fr", gap: "var(--space-4)", overflow: "hidden" }}>
              {/* Left: Platform picker */}
              <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: "var(--space-2)", overflowX: isMobile ? "auto" : "visible" }}>
                {PLATFORMS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSocialSize(p.key)}
                    style={{
                      display: "flex", flexDirection: "column", gap: 2,
                      padding: "var(--space-2) var(--space-2-5)",
                      borderRadius: "var(--radius-md)",
                      border: socialSize === p.key ? "1px solid var(--color-text-muted)" : "1px solid var(--color-border-light)",
                      borderLeft: socialSize === p.key ? "3px solid var(--color-accent)" : "3px solid transparent",
                      background: socialSize === p.key ? "var(--color-bg-alt)" : "transparent",
                      cursor: "pointer", textAlign: "left", fontFamily: "var(--font-primary)",
                      flexShrink: 0, minWidth: isMobile ? 140 : "auto",
                    }}
                  >
                    <span style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: socialSize === p.key ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                      color: socialSize === p.key ? "var(--color-text)" : "var(--color-text-secondary)",
                    }}>{p.label}</span>
                    <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)" }}>{p.dims}</span>
                  </button>
                ))}
              </div>

              {/* Right: Concept carousel */}
              {(() => {
                const idx = Math.min(socialConceptIdx, concepts.length - 1);
                const concept = concepts[idx];
                const url = `/api/social/template?concept=${concept}&size=${sizeParam}`;
                const prev = () => setSocialConceptIdx((idx - 1 + concepts.length) % concepts.length);
                const next = () => setSocialConceptIdx((idx + 1) % concepts.length);
                return (
                  <div style={{ minWidth: 0 }}>
                    {/* Main preview */}
                    <div
                      onClick={() => setPreviewTemplate({ url, concept, size: active.label, aspect: active.aspect, sizeKey: active.key })}
                      style={{
                        width: "100%", maxWidth: "100%", aspectRatio: active.aspect,
                        border: "1px solid var(--color-text-dim)", borderRadius: "var(--radius-lg)",
                        overflow: "hidden", background: "var(--color-bg-alt)", cursor: "pointer",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      <img src={url} alt={concept} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} loading="lazy" />
                    </div>

                    {/* Controls: prev / label / next / download / delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                      <button onClick={prev} style={{ background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)", color: "var(--color-text-muted)" }}>
                        <ChevronRight size={20} style={{ transform: "rotate(180deg)" }} />
                      </button>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", textTransform: "capitalize" }}>
                          #{idx + 1} {concept}
                        </span>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginLeft: "var(--space-2)" }}>
                          {idx + 1}/{concepts.length}
                        </span>
                      </div>
                      <button onClick={next} style={{ background: "none", border: "none", cursor: "pointer", padding: "var(--space-1)", color: "var(--color-text-muted)" }}>
                        <ChevronRight size={20} />
                      </button>
                      <a
                        href={url}
                        download={`fulkit-${concept}-${active.key}.png`}
                        style={{
                          display: "flex", alignItems: "center", gap: "var(--space-1)",
                          padding: "var(--space-1-5) var(--space-3)",
                          background: "var(--color-text)", color: "var(--color-bg)", border: "none",
                          borderRadius: "var(--radius-md)", fontSize: "var(--font-size-2xs)",
                          fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)",
                          textDecoration: "none", cursor: "pointer",
                        }}
                      >
                        <Download size={10} /> PNG
                      </a>
                      <button
                        onClick={(e) => {
                          const btn = e.currentTarget;
                          const imgUrl = window.location.origin + url;
                          navigator.clipboard.writeText(imgUrl).then(() => {
                            btn.textContent = "Copied!";
                            setTimeout(() => { btn.textContent = ""; btn.innerHTML = ""; }, 1500);
                          }).catch(() => {
                            window.prompt("Copy this URL:", imgUrl);
                          });
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "var(--space-1)",
                          padding: "var(--space-1-5) var(--space-3)",
                          background: "var(--color-text)", color: "var(--color-bg)", border: "none",
                          borderRadius: "var(--radius-md)", fontSize: "var(--font-size-2xs)",
                          fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: "pointer",
                        }}
                        title="Copy image URL"
                      >
                        <Copy size={10} /> Copy URL
                      </button>
                    </div>

                    {/* Thumbnail strip */}
                    <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-2)" }}>
                      {concepts.map((c, i) => {
                        const thumbUrl = `/api/social/template?concept=${c}&size=${sizeParam}`;
                        const isActive = i === idx;
                        return (
                          <div key={c} style={{ flexShrink: 0, textAlign: "center" }}>
                            <div
                              onClick={() => setSocialConceptIdx(i)}
                              style={{
                                width: 80, aspectRatio: active.aspect,
                                border: isActive ? "2px solid var(--color-accent)" : "1px solid var(--color-text-dim)",
                                borderRadius: "var(--radius-sm)",
                                overflow: "hidden", background: "var(--color-bg-alt)", cursor: "pointer",
                              }}
                            >
                              <img src={thumbUrl} alt={c} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} loading="lazy" />
                            </div>
                            <span style={{ fontSize: "var(--font-size-2xs)", color: isActive ? "var(--color-text)" : "var(--color-text-dim)", textTransform: "capitalize", fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)" }}>
                              #{i + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
            </>)}
          </div>
        );
      })()}


      {/* Template Preview Modal */}
      {previewTemplate && (() => {
        const concepts = ["hero", "price", "memory", "stack", "voice", "bestie", "notes"];
        const sizes = [
          { key: "og", label: "OG / Bluesky", aspect: "1200/630" },
          { key: "ig-post", label: "Instagram Post", aspect: "1080/1350" },
          { key: "ig-stories", label: "Instagram Stories", aspect: "1080/1920" },
          { key: "square", label: "1:1", aspect: "1080/1080" },
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
                <button
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    const imgUrl = window.location.origin + previewTemplate.url;
                    navigator.clipboard.writeText(imgUrl).then(() => {
                      btn.textContent = "Copied!";
                      setTimeout(() => { btn.textContent = ""; }, 1500);
                    }).catch(() => {
                      window.prompt("Copy this URL:", imgUrl);
                    });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-1)",
                    padding: "var(--space-1-5) var(--space-3)",
                    background: "#EFEDE8", color: "#2A2826", border: "none",
                    borderRadius: "var(--radius-md)", fontSize: "var(--font-size-2xs)",
                    fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: "pointer",
                  }}
                  title="Copy image URL"
                >
                  <Copy size={10} /> Copy URL
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── LOCAL APP ── */}
      <button onClick={() => setLocalAppOpen(prev => !prev)} style={{
        ...TAB_TITLE,
        background: "#FFFFFF", border: "1px solid var(--color-border-light)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left",
        padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-3)",
      }}>
        Local App
        {localAppOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      {localAppOpen && (
        <DownloadAppCard />
      )}

      <button onClick={() => setSocialsOpen(prev => !prev)} style={{
        ...TAB_TITLE,
        background: "#FFFFFF", border: "1px solid var(--color-border-light)", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left",
        padding: "var(--space-3) var(--space-4)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-3)",
      }}>
        Socials & Identity
        {socialsOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {socialsOpen && (<>
      {/* ── METADATA + PREVIEWS + IDENTITY ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 2fr 1fr", gap: isMobile ? "var(--space-3)" : "var(--space-6)", marginBottom: isMobile ? "var(--space-3)" : "var(--space-6)" }}>

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
      </>)}

    </div>
  );
}

function PublishSection({ accessToken }) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [posting, setPosting] = useState(false);
  const [results, setResults] = useState({});
  const [platforms, setPlatforms] = useState({ bluesky: true, threads: true, instagram: true, facebook: true });
  const [publishOpen, setPublishOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner-publishOpen") === "true");

  useEffect(() => { localStorage.setItem("owner-publishOpen", publishOpen); }, [publishOpen]);

  const PLATFORMS = [
    { key: "bluesky", label: "Bluesky", available: true },
    { key: "threads", label: "Threads", available: true },
    { key: "instagram", label: "Instagram", available: false },
    { key: "facebook", label: "Facebook", available: true },
  ];

  function togglePlatform(key) {
    setPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const selectedCount = Object.values(platforms).filter(Boolean).length;

  async function handlePublish() {
    if (!text.trim() || selectedCount === 0) return;
    setPosting(true);
    setResults({});
    const newResults = {};

    if (platforms.bluesky) {
      try {
        const res = await fetch("/api/bluesky/post", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ text: text.trim(), imageUrl: imageUrl || undefined, altText: altText || undefined }),
        });
        const data = await res.json();
        newResults.bluesky = data.success ? { ok: true } : { ok: false, error: data.error };
      } catch (err) {
        newResults.bluesky = { ok: false, error: err.message };
      }
    }

    // Threads: post via Threads API
    if (platforms.threads) {
      try {
        const res = await fetch("/api/threads/post", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ text: text.trim(), imageUrl: imageUrl || undefined }),
        });
        const data = await res.json();
        newResults.threads = data.success ? { ok: true } : { ok: false, error: data.error };
      } catch (err) {
        newResults.threads = { ok: false, error: err.message };
      }
    }

    // Instagram: post via Graph API (requires image)
    if (platforms.instagram) {
      if (!imageUrl) {
        newResults.instagram = { ok: false, error: "Instagram requires an image" };
      } else {
        try {
          const res = await fetch("/api/instagram/post", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ text: text.trim(), imageUrl }),
          });
          const data = await res.json();
          newResults.instagram = data.success ? { ok: true } : { ok: false, error: data.error };
        } catch (err) {
          newResults.instagram = { ok: false, error: err.message };
        }
      }
    }

    // Facebook: post via Graph API (text or text + image)
    if (platforms.facebook) {
      try {
        const res = await fetch("/api/facebook/post", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ text: text.trim(), imageUrl: imageUrl || undefined }),
        });
        const data = await res.json();
        newResults.facebook = data.success ? { ok: true } : { ok: false, error: data.error };
      } catch (err) {
        newResults.facebook = { ok: false, error: err.message };
      }
    }

    setResults(newResults);
    const allOk = Object.values(newResults).every(r => r.ok);
    if (allOk) { setText(""); setImageUrl(""); setAltText(""); }
    setPosting(false);
  }

  const pillStyle = (active, available) => ({
    display: "flex", alignItems: "center", gap: "var(--space-1-5)",
    padding: "var(--space-1-5) var(--space-3)", borderRadius: "var(--radius-sm)",
    border: `1px solid ${active ? "var(--color-text-muted)" : "var(--color-border)"}`,
    background: active ? "var(--color-bg-alt)" : "transparent",
    color: active ? "var(--color-text)" : "var(--color-text-dim)",
    fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
    fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
    cursor: available ? "pointer" : "default",
    opacity: available ? 1 : 0.4,
  });

  return (
    <div style={{ marginTop: "var(--space-6)" }}>
      <button
        onClick={() => setPublishOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)",
          borderRadius: publishOpen ? "var(--radius-md) var(--radius-md) 0 0" : "var(--radius-md)",
          cursor: "pointer", padding: "var(--space-3) var(--space-4)", fontFamily: "var(--font-primary)",
        }}
      >
        <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", fontWeight: "var(--font-weight-semibold)" }}>
          Publish
        </span>
        <ChevronDown size={14} strokeWidth={2} style={{
          color: "var(--color-text-muted)", transition: "transform var(--duration-fast) var(--ease-default)",
          transform: publishOpen ? "rotate(0deg)" : "rotate(-90deg)",
        }} />
      </button>
      {publishOpen && (
        <div style={{
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderTop: "none",
          borderRadius: "0 0 var(--radius-md) var(--radius-md)", padding: "var(--space-4)",
          display: "flex", flexDirection: "column", gap: "var(--space-3)",
        }}>
          {/* Platform selectors */}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {PLATFORMS.map(p => (
              <button key={p.key} onClick={() => p.available && togglePlatform(p.key)} style={pillStyle(platforms[p.key], p.available)} title={p.available ? p.label : `${p.label} — coming soon`}>
                {p.label}
                {!p.available && <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>soon</span>}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What's on your mind..."
              rows={3}
              style={{
                width: "100%", resize: "vertical", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", padding: "var(--space-2-5) var(--space-3)",
                fontSize: "var(--font-size-sm)", fontFamily: "var(--font-primary)",
                background: "var(--color-bg)", color: "var(--color-text)", outline: "none",
              }}
            />
            <div style={{ fontSize: "var(--font-size-2xs)", color: text.length > 280 ? "var(--color-error)" : "var(--color-text-dim)", textAlign: "right", marginTop: 2 }}>
              {text.length}/300
            </div>
          </div>
          <input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="Image URL (paste from social templates above)"
            style={{
              width: "100%", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)",
              fontFamily: "var(--font-primary)", background: "var(--color-bg)", color: "var(--color-text)", outline: "none",
            }}
          />
          {imageUrl && (
            <input
              value={altText}
              onChange={e => setAltText(e.target.value)}
              placeholder="Alt text for image (accessibility)"
              style={{
                width: "100%", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-3)", fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-primary)", background: "var(--color-bg)", color: "var(--color-text)", outline: "none",
              }}
            />
          )}

          {/* Publish button + results */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <button
              onClick={handlePublish}
              disabled={!text.trim() || text.length > 300 || posting || selectedCount === 0}
              style={{
                padding: "var(--space-2) var(--space-4)", borderRadius: "var(--radius-sm)",
                border: "none", cursor: text.trim() && !posting && selectedCount > 0 ? "pointer" : "default",
                background: text.trim() && !posting && selectedCount > 0 ? "var(--color-text)" : "var(--color-border)",
                color: "var(--color-bg)", fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)",
              }}
            >
              {posting ? "Publishing..." : `Publish${selectedCount > 1 ? ` to ${selectedCount} platforms` : ""}`}
            </button>
            {Object.entries(results).map(([key, r]) => (
              <span key={key} style={{ fontSize: "var(--font-size-xs)", color: r.ok ? "var(--color-text-muted)" : "var(--color-error)" }}>
                {key}: {r.ok ? "posted" : r.error}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Pitches Tab ─── */

function PitchesTab() {
  const allCats = ["All", ...PITCH_CATEGORIES];
  const [activeCat, setActiveCat] = useState(() => {
    if (typeof window === "undefined") return "All";
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return allCats.includes(hash) ? hash : "All";
  });
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("fulkit-hidden-pitches") || "[]")); } catch { return new Set(); }
  });
  const hidePitch = (text) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.add(text);
      localStorage.setItem("fulkit-hidden-pitches", JSON.stringify([...next]));
      return next;
    });
  };
  const selectCat = (cat) => {
    const next = cat === activeCat && cat !== "All" ? "All" : cat;
    setActiveCat(next);
    window.history.replaceState({}, "", next === "All" ? window.location.pathname : `${window.location.pathname}#${encodeURIComponent(next)}`);
  };
  const visiblePitches = PITCHES.filter(p => !hidden.has(p.text));
  const items = activeCat === "All" ? visiblePitches : visiblePitches.filter(p => p.cat === activeCat);
  return (
    <div>
      <div style={TAB_TITLE}>Pitches <span style={{ fontWeight: "var(--font-weight-normal)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>{visiblePitches.length}</span></div>
      {/* Pill group */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginBottom: "var(--space-4)" }}>
        {["All", ...PITCH_CATEGORIES].map((cat) => {
          const active = activeCat === cat;
          const count = cat === "All" ? visiblePitches.length : visiblePitches.filter(p => p.cat === cat).length;
          return (
            <button key={cat} onClick={() => selectCat(cat)} style={{
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: active ? "1px solid var(--color-text-muted)" : "1px solid var(--color-border-light)",
              background: active ? "var(--color-bg-alt)" : "#FFFFFF",
              color: active ? "var(--color-text)" : "var(--color-text-secondary)",
              fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
              cursor: "pointer",
            }}>
              {cat} <span style={{ opacity: 0.5, fontSize: "var(--font-size-2xs)" }}>{count}</span>
            </button>
          );
        })}
      </div>
      {/* List for selected category */}
      {items.length > 0 && (
        <div style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}>
          {items.map((pitch, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "var(--space-3)",
              padding: "var(--space-3) var(--space-4)",
              borderBottom: i < items.length - 1 ? "1px solid var(--color-border-light)" : "none",
            }}>
              {pitch.star && <span style={{ color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)", flexShrink: 0 }}>{"\u2605"}</span>}
              <span style={{
                flex: 1, fontSize: "var(--font-size-sm)",
                color: "var(--color-text)", lineHeight: "var(--line-height-relaxed)",
                fontWeight: pitch.star ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
              }}>
                {pitch.text}
              </span>
              <button
                onClick={() => hidePitch(pitch.text)}
                title="Remove"
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 2,
                  color: "var(--color-text-dim)", display: "flex", flexShrink: 0,
                  opacity: 0.4, transition: "opacity var(--duration-fast) var(--ease-default)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "0.4"}
              >
                <Trash2 size={11} strokeWidth={1.5} />
              </button>
              <CopyButton text={pitch.text} />
            </div>
          ))}
        </div>
      )}
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
  // ── Section state (persisted to localStorage) ──
  const [openSections, setOpenSections] = useState(() => {
    if (typeof window === "undefined") return { onboarding: true };
    try { return JSON.parse(localStorage.getItem("fulkit-playground-folds")) || { onboarding: true }; } catch { return { onboarding: true }; }
  });
  const toggle = (id) => setOpenSections(p => {
    const next = { ...p, [id]: !p[id] };
    try { localStorage.setItem("fulkit-playground-folds", JSON.stringify(next)); } catch {}
    return next;
  });

  // ── Onboarding state ──
  const [tiers, setTiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tierIdx, setTierIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [showAssignment, setShowAssignment] = useState(false);
  const [showCopy, setShowCopy] = useState(null);
  const [textVal, setTextVal] = useState("");
  const [multiSel, setMultiSel] = useState([]);

  // ── Email preview state ──
  const [emailTemplate, setEmailTemplate] = useState("added");
  const emailIframeRef = useRef(null);

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

  // ── Onboarding logic ──
  const tier = tiers[tierIdx];
  const tierQs = questions.filter((q) => q.tier_id === tier?.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const question = tierQs[qIdx];
  const totalQ = tierQs.length;
  const progressPct = tiers.length ? ((tierIdx + (showAssignment ? 1 : (qIdx / Math.max(totalQ, 1)))) / tiers.length) * 100 : 0;

  const advance = () => {
    if (showCopy) { setShowCopy(null); return; }
    if (question?.copy_after_answer) { setShowCopy(question.copy_after_answer); return; }
    goNext();
  };
  const goNext = () => { setTextVal(""); setMultiSel([]); setShowCopy(null); if (qIdx + 1 < totalQ) setQIdx(qIdx + 1); else setShowAssignment(true); };
  const nextTier = () => { setShowAssignment(false); setQIdx(0); if (tierIdx + 1 < tiers.length) setTierIdx(tierIdx + 1); else setTierIdx(0); };
  const jumpToTier = (i) => { setTierIdx(i); setQIdx(0); setShowAssignment(false); setShowCopy(null); setTextVal(""); setMultiSel([]); };

  const previewCard = {
    background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
    padding: "var(--space-6)", maxWidth: 520, margin: "0 auto", minHeight: 300,
    display: "flex", flexDirection: "column", justifyContent: "center",
  };

  // ── Email HTML builder ──
  const emailCta = (href, label) =>
    `<a href="${href}" style="display:block;width:100%;padding:14px 0;background-color:#2A2826;color:#EFEDE8;font-size:15px;font-weight:600;text-align:center;text-decoration:none;border-radius:8px;margin-bottom:28px;">${label}</a>`;

  const emailContents = {
    welcome: `
      <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Hey there.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Welcome to Fülkit. You just got yourself a bestie that remembers everything and never makes you start from zero.</div>
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">Get started in 60 seconds</div>
      <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
        <div style="margin-bottom:6px;"><strong style="color:#2A2826;">1. Say hey</strong> — Open chat and talk like you would to a friend.</div>
        <div style="margin-bottom:6px;"><strong style="color:#2A2826;">2. Drop a note</strong> — Save an idea, a doc, a thought.</div>
        <div><strong style="color:#2A2826;">3. Watch it click</strong> — Ask about something you saved. Fülkit connects the dots.</div>
      </div>
      ${emailCta("https://fulkit.app/chat", "Open Fülkit")}`,
    added: `
      <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">You're on the list.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Spotify's developer platform limits how many people can connect at once. We saved your spot.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">In the meantime — you're not waiting. You're already inside.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Fabric is a music system. Not a wrapper around someone else's. Every track plays instantly. No login, no permissions. Just music.</div>
      <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
        <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Dig</strong> — search across sources, discover new music, tap "more like this" on anything that catches your ear.</div>
        <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Crates</strong> — not algorithmic playlists. Curated shelves that get sharper the more you use them.</div>
        <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Sets</strong> — your playlists, built here. Drag to reorder, flag tracks from anywhere, trophy the ones worth keeping.</div>
        <div><strong style="color:#2A2826;">Signal Terrain</strong> — a visualization that actually listens.</div>
      </div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">And behind the counter, there's someone who knows the catalog better than you do. He has opinions. He's usually right. Ask him what to play next.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">When a Spotify seat opens, we'll let you know. But most people forget they were waiting.</div>
      <div style="font-size:16px;font-weight:600;color:#2A2826;margin-bottom:28px;">Go dig.</div>
      ${emailCta("https://fulkit.app/fabric", "Open Fabric")}`,
    "seat-open": `
      <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Your Spotify seat is ready.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">A seat opened up. Head to <strong style="color:#2A2826;">Settings → Sources</strong> and connect your Spotify account.</div>
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Your existing playlists will sync automatically. Everything you've already built in Fabric — sets, crates, history — stays exactly where it is. Spotify just adds another playback source.</div>
      ${emailCta("https://fulkit.app/settings/sources", "Connect Spotify")}`,
    custom: `
      <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Your custom message goes here. Use the Custom template from the Waitlist fold in the Developer tab to send freeform messages.</div>
      ${emailCta("https://fulkit.app", "Open Fülkit")}`,
  };

  const emailFooters = {
    welcome: `You're getting this because you signed up at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
    added: `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
    "seat-open": `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
    custom: `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  };

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'D-DIN',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#EFEDE8;">
<div style="padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background-color:#FAF9F6;border-radius:12px;overflow:hidden;">
<div style="background-color:#2A2826;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:700;color:#EFEDE8;letter-spacing:-0.02em;">Fülkit</div>
</div>
<div style="padding:40px 40px 32px;">
  ${emailContents[emailTemplate] || emailContents.custom}
  <div style="height:1px;background-color:#E8E5E0;margin-bottom:24px;"></div>
  <div style="font-size:14px;color:#6B6560;line-height:1.6;">Questions? Just reply to this email.</div>
</div>
<div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #E8E5E0;">
  <div style="font-size:12px;color:#9B9590;line-height:1.6;">${emailFooters[emailTemplate] || emailFooters.custom}</div>
  <div style="font-size:12px;color:#B8B3AE;margin-top:6px;">Fülkit — your second brain that talks back.</div>
</div>
</div></div>
</body></html>`;

  useEffect(() => {
    if (emailIframeRef.current && openSections.emails) {
      const doc = emailIframeRef.current.contentDocument;
      doc.open(); doc.write(emailHtml); doc.close();
    }
  }, [emailTemplate, emailHtml, openSections.emails]);

  // ── Fold helper ──
  const FOLD = { background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" };
  const FOLD_BTN = { display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%", padding: "var(--space-3)", background: "none", border: "none", cursor: "pointer" };
  const FOLD_LABEL = { fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", flex: 1, textAlign: "left" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <div style={TAB_TITLE}>Playground</div>
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          Preview everything users see.
        </p>
      </div>

      {/* ═══ ONBOARDING ═══ */}
      <div style={FOLD}>
        <button onClick={() => toggle("onboarding")} style={FOLD_BTN}>
          <Users size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={FOLD_LABEL}>Onboarding</span>
          {openSections.onboarding ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {openSections.onboarding && (
          <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "var(--space-3)" }}>
            {loading ? (
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>Loading preview...</div>
            ) : tiers.length === 0 ? (
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>No tiers configured. Add tiers in the Questions tab first.</div>
            ) : (<>
              {/* Tier selector */}
              <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
                {tiers.map((t, i) => (
                  <button key={t.id} onClick={() => jumpToTier(i)} style={{ ...btnSmall, background: i === tierIdx ? "var(--color-text)" : "var(--color-bg)", color: i === tierIdx ? "var(--color-bg)" : "var(--color-text-secondary)", fontSize: "var(--font-size-2xs)", padding: "var(--space-1) var(--space-2)" }}>
                    Tier {t.tier_num}: {t.label}
                  </button>
                ))}
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: "var(--color-border-light)", borderRadius: 2, marginBottom: "var(--space-4)" }}>
                <div style={{ height: "100%", background: "var(--color-text-dim)", borderRadius: 2, width: `${progressPct}%`, transition: "width 400ms ease" }} />
              </div>
              {/* Preview card */}
              <div style={previewCard}>
                {showCopy ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "var(--font-size-md)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-6)" }}>"{showCopy}"</p>
                    <button onClick={goNext} style={btnPrimary}>Continue</button>
                  </div>
                ) : showAssignment ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "var(--radius-full)", background: "var(--color-success-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-4)" }}>
                      <CheckIcon size={18} strokeWidth={2.5} color="var(--color-success)" />
                    </div>
                    <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>Tier {tier.tier_num} Complete</p>
                    {tier.assignment_copy && <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)", fontStyle: "italic", marginBottom: "var(--space-4)" }}>"{tier.assignment_copy}"</p>}
                    {tier.primary_destination && <div style={{ display: "block", width: "100%", textAlign: "center", padding: "var(--space-2-5) var(--space-4)", background: "var(--color-text)", color: "var(--color-bg)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-2)" }}>Go to {tier.primary_destination}</div>}
                    <button onClick={nextTier} style={{ ...btnSmall, marginTop: "var(--space-2)" }}>{tierIdx < tiers.length - 1 ? "Next Tier" : "Back to Tier 1"}</button>
                  </div>
                ) : question ? (
                  <div>
                    <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-bold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>Tier {tier.tier_num} &middot; Q{qIdx + 1} of {totalQ}</div>
                    {(qIdx === 0 && tier.trust_line) && <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", marginBottom: "var(--space-4)" }}>{tier.trust_line}</p>}
                    {question.trust_line && <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", marginBottom: "var(--space-4)" }}>{question.trust_line}</p>}
                    <h3 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)", lineHeight: "var(--line-height-snug)", marginBottom: "var(--space-2)" }}>{question.text}</h3>
                    {question.why && <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-4)" }}>{question.why}</p>}
                    {(question.type === "text_input" || question.type === "text") && (
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <input value={textVal} onChange={(e) => setTextVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) advance(); }} placeholder={question.placeholder || "Type here..."} style={{ flex: 1, padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }} />
                        <button onClick={advance} disabled={!textVal.trim()} style={{ ...btnPrimary, opacity: textVal.trim() ? 1 : 0.4 }}>Go</button>
                      </div>
                    )}
                    {(question.type === "single_select" || (question.type === "choice" && !question.multi)) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {(question.options || []).map((opt) => { const label = typeof opt === "string" ? opt : opt.label; return <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>{label}</button>; })}
                      </div>
                    )}
                    {(question.type === "multi_select" || (question.type === "choice" && question.multi)) && (<>
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {(question.options || []).map((opt) => { const label = typeof opt === "string" ? opt : opt.label; const sel = multiSel.includes(label); return <button key={label} onClick={() => setMultiSel((p) => sel ? p.filter((x) => x !== label) : [...p, label])} style={{ padding: "var(--space-2-5) var(--space-4)", background: sel ? "var(--color-text)" : "var(--color-bg-elevated)", color: sel ? "var(--color-bg)" : "var(--color-text)", border: sel ? "1px solid var(--color-text)" : "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>{label}</button>; })}
                      </div>
                      {multiSel.length > 0 && <button onClick={advance} style={{ ...btnPrimary, marginTop: "var(--space-3)" }}>Continue</button>}
                    </>)}
                    {question.type === "integration_picker" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {(question.options || [{ label: "Spotify" }, { label: "Google Calendar" }, { label: "Apple Calendar" }, { label: "Add another" }, { label: "I'll do this later" }]).map((opt) => { const label = typeof opt === "string" ? opt : opt.label; return <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>{label}</button>; })}
                      </div>
                    )}
                    {question.type === "vault_setup" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                        {(question.options || []).map((opt) => { const label = typeof opt === "string" ? opt : opt.label; return <button key={label} onClick={advance} style={{ padding: "var(--space-2-5) var(--space-4)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-base)", fontFamily: "var(--font-primary)", textAlign: "left", cursor: "pointer" }}>{label}</button>; })}
                      </div>
                    )}
                    {question.type === "feature_walkthrough" && <button onClick={advance} style={btnPrimary}>Got it</button>}
                    {(question.skippable || question.type === "text_input" || question.type === "text") && <button onClick={goNext} style={{ marginTop: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)" }}>Skip</button>}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>No questions in this tier.</div>
                )}
              </div>
            </>)}
          </div>
        )}
      </div>

      {/* ═══ EMAILS ═══ */}
      <div style={FOLD}>
        <button onClick={() => toggle("emails")} style={FOLD_BTN}>
          <Mail size={13} strokeWidth={2} color="var(--color-text-muted)" />
          <span style={FOLD_LABEL}>Emails</span>
          {openSections.emails ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
        </button>
        {openSections.emails && (
          <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "var(--space-3)" }}>
            <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-3)", flexWrap: "wrap" }}>
              {[
                { id: "welcome", label: "Welcome" },
                { id: "added", label: "Waitlist: Added" },
                { id: "seat-open", label: "Waitlist: Seat opened" },
                { id: "custom", label: "Custom" },
              ].map(t => (
                <button key={t.id} onClick={() => setEmailTemplate(t.id)} style={{
                  padding: "3px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                  background: emailTemplate === t.id ? "var(--color-text)" : "transparent",
                  color: emailTemplate === t.id ? "var(--color-bg)" : "var(--color-text-dim)",
                  fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer",
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#EFEDE8" }}>
              <iframe ref={emailIframeRef} title="Email preview" style={{ width: "100%", height: 700, border: "none" }} sandbox="allow-same-origin" />
            </div>
          </div>
        )}
      </div>

      {/* ═══ POSTER PREVIEW ═══ */}
      <PosterPreview openSections={openSections} toggle={toggle} FOLD={FOLD} FOLD_BTN={FOLD_BTN} FOLD_LABEL={FOLD_LABEL} />

      {/* ═══ QUICK PREVIEWS ═══ */}
      <div style={FOLD}>
        <div style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <span style={{ ...FOLD_LABEL, marginBottom: "var(--space-1)" }}>Page Previews</span>
          {[
            { href: "/payment-preview", icon: CreditCard, label: "Payment" },
            { href: "/loading-preview", icon: Zap, label: "Loading" },
            { href: "/share-preview", icon: ExternalLink, label: "Share Page" },
          ].map(p => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
                borderRadius: "var(--radius-sm)", textDecoration: "none",
                fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)",
                color: "var(--color-text-secondary)", cursor: "pointer",
              }}
            >
              <p.icon size={13} strokeWidth={2} color="var(--color-text-muted)" />
              {p.label}
              <span style={{ flex: 1 }} />
              <ExternalLink size={10} strokeWidth={1.5} color="var(--color-text-dim)" />
            </a>
          ))}
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <div style={TAB_TITLE}>Fabric</div>
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

// ═══ POSTER PREVIEW COMPONENT ═══

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = ((h << 5) - h + seed.charCodeAt(i)) | 0; }
  return function () { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 2147483647; };
}

function generateTerrain(seed, width, height, layers, yOffset) {
  const rng = seededRandom(seed);
  const paths = [];
  for (let l = 0; l < layers; l++) {
    const baseY = yOffset + (l / layers) * (height - yOffset);
    const amp = 12 + rng() * 24;
    const freq = 2 + rng() * 4;
    const phase = rng() * Math.PI * 2;
    const points = [];
    for (let x = 0; x <= width; x += 2) {
      const nx = x / width;
      const y = baseY
        + Math.sin(nx * freq * Math.PI + phase) * amp
        + Math.sin(nx * freq * 2.3 * Math.PI + phase * 1.7) * (amp * 0.4)
        + Math.sin(nx * freq * 5.1 * Math.PI + phase * 0.3) * (amp * 0.15);
      points.push(`${x},${y.toFixed(1)}`);
    }
    const opacity = 0.08 + (l / layers) * 0.12;
    paths.push({ d: `M0,${height} L${points.join(" L")} L${width},${height} Z`, opacity });
  }
  return paths;
}

function PosterPreview({ openSections, toggle, FOLD, FOLD_BTN, FOLD_LABEL }) {
  const [track, setTrack] = useState({ title: "Midnight Architecture", artist: "Rival Consoles", bpm: "128", key: "Am", duration: "4:37" });
  const [layout, setLayoutState] = useState(() => {
    if (typeof window === "undefined") return { header: "top", align: "left", theme: "dark", margin: 40 };
    try { return JSON.parse(localStorage.getItem("fulkit-poster-layout")) || { header: "top", align: "left", theme: "dark", margin: 40 }; } catch { return { header: "top", align: "left", theme: "dark", margin: 40 }; }
  });
  const setLayout = useCallback((fn) => {
    setLayoutState(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      try { localStorage.setItem("fulkit-poster-layout", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const posterRef = useRef(null);

  const W = 340;
  const H = Math.round(W * (17 / 11));
  const m = layout.margin;
  const innerW = W - m * 2;

  const bg = layout.theme === "dark" ? "#2A2826" : "#EFEDE8";
  const fg = layout.theme === "dark" ? "#F0EEEB" : "#2A2826";
  const fgDim = layout.theme === "dark" ? "#8A8784" : "#8A8784";
  const fgMuted = layout.theme === "dark" ? "#5C5955" : "#B0ADA8";
  const divColor = layout.theme === "dark" ? "#3D3A37" : "#D4D1CC";

  const terrain = useMemo(() => generateTerrain(
    track.title + track.artist, W, H, 18, H * 0.22
  ), [track.title, track.artist, W, H]);

  const metaLine = [track.duration, track.bpm ? `${track.bpm} BPM` : null, track.key].filter(Boolean).join("  ·  ");

  const headerBlock = (
    <div style={{ textAlign: layout.align }}>
      <div style={{ fontFamily: "'D-DIN', sans-serif", fontSize: 22, fontWeight: 700, color: fg, lineHeight: 1.15, letterSpacing: "-0.3px", marginBottom: 4 }}>
        {track.title || "Track Title"}
      </div>
      <div style={{ fontFamily: "'D-DIN', sans-serif", fontSize: 11, fontWeight: 400, color: fgDim, letterSpacing: "0.5px", textTransform: "uppercase" }}>
        {track.artist || "Artist"}
      </div>
    </div>
  );

  const footerBlock = (
    <div style={{ textAlign: layout.footerAlign || layout.align }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: fgDim, letterSpacing: "0.8px" }}>
        {metaLine}
      </div>
    </div>
  );

  const watermark = (
    <div style={{ textAlign: layout.footerAlign || layout.align, fontFamily: "'D-DIN', sans-serif", fontSize: 7, color: fgMuted, letterSpacing: "1.2px", textTransform: "uppercase" }}>
      Fülkit Fabric
    </div>
  );

  const controlRow = { display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" };
  const controlLabel = { fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", width: 52, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 };
  const pillBtn = (active) => ({
    padding: "2px 8px", borderRadius: "var(--radius-full)", border: `1px solid ${active ? "var(--color-text)" : "var(--color-border)"}`,
    background: active ? "var(--color-text)" : "transparent", color: active ? "var(--color-bg)" : "var(--color-text-dim)",
    fontSize: 9, fontFamily: "var(--font-primary)", cursor: "pointer", fontWeight: 500,
  });
  const fieldInput = {
    flex: 1, padding: "3px 8px", background: "var(--color-bg)", border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-xs)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none",
  };

  return (
    <div style={FOLD}>
      <button onClick={() => toggle("poster")} style={FOLD_BTN}>
        <Frame size={13} strokeWidth={2} color="var(--color-text-muted)" />
        <span style={FOLD_LABEL}>Poster Preview</span>
        {openSections.poster ? <ChevronDown size={14} color="var(--color-text-dim)" /> : <ChevronRight size={14} color="var(--color-text-dim)" />}
      </button>
      {openSections.poster && (
        <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "var(--space-3)" }}>
          <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>

            {/* ── Poster canvas ── */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 8, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginBottom: 4, textAlign: "center" }}>
                11 × 17 in · 3300 × 5100 px @ 300 DPI
              </div>
              <div
                ref={posterRef}
                style={{
                  width: W, height: H, background: bg, borderRadius: 4,
                  position: "relative", overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(42,40,38,0.18), 0 2px 6px rgba(42,40,38,0.08)",
                }}
              >
                {/* Terrain SVG */}
                <svg width={W} height={H} style={{ position: "absolute", top: 0, left: 0 }}>
                  {terrain.map((p, i) => (
                    <path key={i} d={p.d} fill={fg} opacity={p.opacity} />
                  ))}
                </svg>

                {/* Content overlay */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  display: "flex", flexDirection: "column",
                  padding: m, justifyContent: "space-between",
                }}>
                  {layout.header === "top" && (
                    <>
                      <div>{headerBlock}</div>
                      <div>{footerBlock}<div style={{ marginTop: 10 }}>{watermark}</div></div>
                    </>
                  )}
                  {layout.header === "bottom" && (
                    <>
                      <div>{footerBlock}</div>
                      <div>{headerBlock}<div style={{ marginTop: 10 }}>{watermark}</div></div>
                    </>
                  )}
                  {layout.header === "overlay" && (
                    <>
                      <div style={{ flex: 1 }} />
                      <div>
                        {headerBlock}
                        <div style={{ marginTop: 6 }}>{footerBlock}</div>
                        <div style={{ marginTop: 10 }}>{watermark}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Controls ── */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                Track
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Title</span>
                <input value={track.title} onChange={(e) => setTrack(p => ({ ...p, title: e.target.value }))} style={fieldInput} />
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Artist</span>
                <input value={track.artist} onChange={(e) => setTrack(p => ({ ...p, artist: e.target.value }))} style={fieldInput} />
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                <div style={{ ...controlRow, flex: 1, marginBottom: 0 }}>
                  <span style={controlLabel}>BPM</span>
                  <input value={track.bpm} onChange={(e) => setTrack(p => ({ ...p, bpm: e.target.value }))} style={{ ...fieldInput, width: 48 }} />
                </div>
                <div style={{ ...controlRow, flex: 1, marginBottom: 0 }}>
                  <span style={controlLabel}>Key</span>
                  <input value={track.key} onChange={(e) => setTrack(p => ({ ...p, key: e.target.value }))} style={{ ...fieldInput, width: 48 }} />
                </div>
                <div style={{ ...controlRow, flex: 1, marginBottom: 0 }}>
                  <span style={controlLabel}>Time</span>
                  <input value={track.duration} onChange={(e) => setTrack(p => ({ ...p, duration: e.target.value }))} style={{ ...fieldInput, width: 48 }} />
                </div>
              </div>

              <div style={{ height: 1, background: "var(--color-border-light)", margin: "var(--space-3) 0" }} />

              <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                Layout
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Header</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["top", "bottom", "overlay"].map(v => (
                    <button key={v} onClick={() => setLayout(p => ({ ...p, header: v }))} style={pillBtn(layout.header === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Header</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["left", "center", "right"].map(v => (
                    <button key={v} onClick={() => setLayout(p => ({ ...p, align: v }))} style={pillBtn(layout.align === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Footer</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["left", "center", "right"].map(v => (
                    <button key={v} onClick={() => setLayout(p => ({ ...p, footerAlign: v }))} style={pillBtn((layout.footerAlign || layout.align) === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Theme</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {["dark", "light"].map(v => (
                    <button key={v} onClick={() => setLayout(p => ({ ...p, theme: v }))} style={pillBtn(layout.theme === v)}>{v}</button>
                  ))}
                </div>
              </div>
              <div style={controlRow}>
                <span style={controlLabel}>Margin</span>
                <input
                  type="range" min={20} max={60} value={layout.margin}
                  onChange={(e) => setLayout(p => ({ ...p, margin: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: "#2A2826" }}
                />
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", width: 24, textAlign: "right" }}>{layout.margin}</span>
              </div>

              <div style={{ height: 1, background: "var(--color-border-light)", margin: "var(--space-3) 0" }} />

              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", lineHeight: 1.5 }}>
                Terrain is deterministic — same title + artist always renders the same poster. Final version will use Essentia.js timeline data (energy, BPM, spectral centroid) for the actual terrain contours.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

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
          <div style={TAB_TITLE}>Onboarding Questions</div>
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
