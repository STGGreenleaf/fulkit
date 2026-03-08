"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Settings as SettingsIcon,
  User,
  Key,
  Shield,
  CreditCard,
  Quote,
  Download,
  Trash2,
  Gift,
  Users,
  Brain,
  Eye,
  ChevronRight,
  Check,
  X,
  Bell,
  Zap,
  FolderOpen,
  FileText,
  Paperclip,
  Search,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import StorageModeSelector from "../../components/StorageModeSelector";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";

const TAB_ICON_SIZE = 14;
import { useVaultContext } from "../../lib/vault";
import { supabase } from "../../lib/supabase";

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "sources", label: "Sources", icon: Quote },
  { id: "vault", label: "Vault", icon: FolderOpen },
  { id: "ai", label: "AI & Memory", icon: Brain },
  { id: "referrals", label: "Get Fülkit", icon: Gift },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy", icon: Shield },
];

const SOURCE_LOGOS = {
  obsidian: (
    <svg width="16" height="16" viewBox="0 0 65 100" fill="var(--color-text-muted)">
      <path d="M23.7 3.3c5.6-6 15.5-2.2 15.8 5.8.2 4.8-1.5 9.8-1.5 14.6 0 8.5 6.2 16 14.6 17.4 4 .7 8.2-.2 11.5-2.7 5-3.8 12.3-1 12.3 5.3 0 4-2.5 7.6-5.2 10.5-5.6 6-12 11.4-15.4 18.8-2.7 5.8-3 12.3-4.3 18.5-.8 3.7-2 7.5-5 10-3.5 2.8-8.5 2.7-12.6 1.2C26 99 19.7 92 16.8 84.3c-2-5.2-2.4-10.9-4.5-16.1C9 60.5 2.6 53.8.6 45.5c-1.6-6.5 1-13.8 6.3-17.8 3.4-2.6 8-3.4 11.4-6 3-2.2 4.7-5.8 5.4-9.4.5-3 .5-6.2 0-9z"/>
    </svg>
  ),
  google: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" opacity=".6"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/>
      <path d="M5.84 14.09A6.97 6.97 0 015.46 12c0-.72.12-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" opacity=".5"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".8"/>
    </svg>
  ),
  dropbox: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 2l6 4-6 4 6 4-6 4-6-4 6-4-6-4zm12 0l6 4-6 4 6 4-6 4-6-4 6-4-6-4z"/>
    </svg>
  ),
  icloud: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 19c3.5 0 6-2.5 6-5.5 0-2.8-2-5-4.8-5.4C13.4 5.8 11 4 8.5 4 5.4 4 3 6.5 3 9.5c0 .3 0 .6.1.9C1.3 11.1 0 12.9 0 15c0 2.8 2.2 4 4 4h9z"/>
    </svg>
  ),
  notion: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 2.5c.3.2.4.3.8.3h12.5c.4 0 .9-.2 1.2-.5l.5.5c-.1.5-.2 1.3-.2 2.1v14.3c0 .8.1 1.2.3 1.5l-.3.3H14l-.3-.3c.2-.3.3-.6.3-1.5V5.5L8.2 20l-.4.3c-.2-.2-.5-.4-.9-.7L4 17.3V5.6c0-.8-.1-1.2-.3-1.5l.8-1.6z"/>
    </svg>
  ),
  onenote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z"/><path d="M8 8v8l4-6v6"/>
    </svg>
  ),
  markdown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8v8l3-3 3 3V8"/><path d="M18 12l-2-2v4"/>
    </svg>
  ),
  apple_notes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>
    </svg>
  ),
  slack: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 10c-.8 0-1.5-.7-1.5-1.5v-5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5z"/><path d="M20.5 10H19v-1.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/><path d="M9.5 14c.8 0 1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5S8 21.3 8 20.5v-5c0-.8.7-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .8-.7 1.5-1.5 1.5S2 16.3 2 15.5 2.7 14 3.5 14z"/><path d="M14 14.5c0-.8.7-1.5 1.5-1.5h5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5z"/><path d="M14 20.5V19h1.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5z"/><path d="M10 9.5c0 .8-.7 1.5-1.5 1.5h-5C2.7 11 2 10.3 2 9.5S2.7 8 3.5 8h5c.8 0 1.5.7 1.5 1.5z"/><path d="M10 3.5V5H8.5C7.7 5 7 4.3 7 3.5S7.7 2 8.5 2s1.5.7 1.5 1.5z"/>
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  ),
  readwise: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M8 7h8"/><path d="M8 11h5"/>
    </svg>
  ),
  spotify: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 11-.277-1.216c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.858zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.452-1.492c3.632-1.102 8.147-.568 11.234 1.329a.78.78 0 01.255 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.533-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.954 1.611z"/>
    </svg>
  ),
  todoist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  linear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.357 20.643a1.22 1.22 0 010-1.724L18.92 3.357a1.22 1.22 0 011.724 1.724L5.08 20.643a1.22 1.22 0 01-1.724 0z"/>
      <path d="M2 12.77l9.23 9.23C6.377 21.476 2.524 17.623 2 12.77z"/>
      <path d="M12.77 2l9.23 9.23C21.476 6.377 17.623 2.524 12.77 2z"/>
    </svg>
  ),
  numbrly: (
    <svg width="16" height="16" viewBox="0 0 1080 1080" fill="currentColor">
      <circle cx="540" cy="540" r="490" fill="none" stroke="currentColor" strokeWidth="70"/>
      <rect x="250" y="580" width="100" height="200" rx="12"/>
      <rect x="410" y="440" width="100" height="340" rx="12"/>
      <rect x="570" y="340" width="100" height="440" rx="12"/>
      <rect x="730" y="260" width="100" height="520" rx="12"/>
      <path d="M240 520l160-100 160 60 180-200 60 0-50-70 90 20-20 90-50-70-70 78-160 52-160 100z"/>
    </svg>
  ),
  truegauge: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 3.04 1.36 5.77 3.5 7.6l1.4-1.4C5.14 16.72 4 14.49 4 12c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2.49-1.14 4.72-2.9 6.2l1.4 1.4C20.64 17.77 22 15.04 22 12c0-5.52-4.48-10-10-10z"/>
      <path d="M13.4 7.2l-3.2 5.6c-.3.5.1 1.1.7 1.1h.2c.5 0 .9-.3 1.1-.7l2.5-5c.3-.5-.2-1.1-.8-1.1-.2 0-.4.1-.5.1z"/>
    </svg>
  ),
};

// Mock connected state — will come from DB
const INITIAL_CONNECTED = [];

const SUGGESTED_SOURCES = ["obsidian", "google", "numbrly"];

const REAL_INTEGRATIONS = ["github", "spotify", "numbrly"];

const ALL_SOURCES = [
  { id: "obsidian", name: "Obsidian", cat: "Notes" },
  { id: "google", name: "Google", cat: "Account" },
  { id: "notion", name: "Notion", cat: "Notes" },
  { id: "apple_notes", name: "Apple Notes", cat: "Notes" },
  { id: "dropbox", name: "Dropbox", cat: "Files" },
  { id: "icloud", name: "iCloud Drive", cat: "Files" },
  { id: "onenote", name: "OneNote", cat: "Notes" },
  { id: "markdown", name: "Markdown files", cat: "Notes" },
  { id: "slack", name: "Slack", cat: "Chat" },
  { id: "github", name: "GitHub", cat: "Dev" },
  { id: "readwise", name: "Readwise", cat: "Reading" },
  { id: "spotify", name: "Spotify", cat: "Media" },
  { id: "todoist", name: "Todoist", cat: "Tasks" },
  { id: "linear", name: "Linear", cat: "Tasks" },
  { id: "numbrly", name: "Numbrly", cat: "Small Business" },
  { id: "truegauge", name: "TrueGauge", cat: "Analytics" },
];

const PREFERENCES = [
  { key: "Tone", value: "Warm and conversational", learned: true },
  { key: "Whisper frequency", value: "2x per day", learned: false },
  { key: "Morning briefing", value: "Enabled — work focus", learned: true },
  { key: "Fitness nudges", value: "Disabled", learned: true },
  { key: "Meal suggestions", value: "Afternoons only", learned: true },
  { key: "Follow-up timing", value: "Fridays", learned: true },
];

const REFERRALS = [
  { name: "Sarah M.", status: "active", since: "Jan 2026" },
  { name: "Mike R.", status: "active", since: "Feb 2026" },
  { name: "Pending invite", status: "pending", since: "—" },
];

export default function Settings() {
  const { compactMode } = useAuth();
  // Read ?tab= from URL on mount
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") || "account";
    }
    return "account";
  });

  return (
    <AuthGuard>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Sidebar />

        {/* ─── Main ─── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            padding: "var(--space-2-5) var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <SettingsIcon size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
          {!compactMode && (
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
              Settings
            </span>
          )}
        </div>

        {/* Horizontal tab bar */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-1)",
            padding: "0 var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Tooltip key={t.id} label={compactMode ? t.label : null}>
                <button
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-2-5) var(--space-3)",
                    border: "none",
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
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6)" }}>
            {tab === "account" && <AccountTab />}
            {tab === "sources" && <SourcesTab />}
            {tab === "vault" && <VaultTab />}
            {tab === "ai" && <AITab />}
            {tab === "referrals" && <ReferralsTab />}
            {tab === "billing" && <BillingTab />}
            {tab === "privacy" && <PrivacyTab />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

/* ─── Tab Components ─── */

function SectionTitle({ children }) {
  return (
    <h3
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        textTransform: "uppercase",
        letterSpacing: "var(--letter-spacing-wider)",
        color: "var(--color-text-muted)",
        marginBottom: "var(--space-3)",
      }}
    >
      {children}
    </h3>
  );
}

function Card({ children, style: s }) {
  return (
    <div
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        ...s,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value, action, actionLabel, danger }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-2-5) 0",
        borderBottom: "1px solid var(--color-border-light)",
      }}
    >
      <div>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
          {label}
        </div>
        {value && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
            {value}
          </div>
        )}
      </div>
      {actionLabel && (
        <button
          onClick={action}
          style={{
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "var(--radius-sm)",
            border: danger ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
            background: "transparent",
            color: danger ? "var(--color-error)" : "var(--color-text-secondary)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function CardHeader({ logo, name, subtitle, isExpanded, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        width: "100%",
        padding: "var(--space-3) var(--space-4)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-primary)",
        textAlign: "left",
      }}
    >
      <div style={{ width: 16, height: 16, flexShrink: 0, color: "var(--color-text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {logo}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)" }}>{name}</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{subtitle}</div>
      </div>
      <ChevronRight
        size={14}
        strokeWidth={2}
        style={{
          color: "var(--color-text-dim)",
          transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

// Stable module-level components — must NOT be inside SourcesTab or React
// will unmount/remount on every render, killing CSS transitions.
function Drawer({ open, children }) {
  const [overflow, setOverflow] = useState("hidden");
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setOverflow("visible"), 300);
      return () => clearTimeout(t);
    }
    setOverflow("hidden");
  }, [open]);
  return (
    <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <div style={{ overflow, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function DrawerItem({ index = 0, visible, children }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(4px)",
      transition: visible
        ? `opacity 200ms cubic-bezier(0.22, 1, 0.36, 1) ${100 + Math.min(index, 7) * 40}ms, transform 200ms cubic-bezier(0.22, 1, 0.36, 1) ${100 + Math.min(index, 7) * 40}ms`
        : "opacity 150ms cubic-bezier(0.4, 0, 1, 1), transform 150ms cubic-bezier(0.4, 0, 1, 1)",
    }}>
      {children}
    </div>
  );
}

function AccountTab() {
  const { user, profile, signOut, isOwner } = useAuth();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <Row label="Name" value={user?.name || profile?.name || "—"} />
        <Row label="Email" value={user?.email || "—"} />
        <Row label="Role" value={isOwner ? "Owner" : (profile?.role || "Member")} />
        <Row label="Member since" value={memberSince} />
      </Card>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>API Key</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Key size={18} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
                Anthropic API Key
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                {isOwner
                  ? "Connected — using owner key (server-side)"
                  : "Use your own key — burn your own Fül."}
              </div>
            </div>
            {isOwner && (
              <div style={{
                padding: "var(--space-1) var(--space-2-5)",
                background: "var(--color-success-soft, rgba(72,187,120,0.1))",
                color: "var(--color-success, #48bb78)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wider)",
              }}>
                Active
              </div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-8)" }}>
        <button
          onClick={signOut}
          style={{
            width: "100%",
            padding: "var(--space-2-5) var(--space-4)",
            background: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-semibold)",
            fontFamily: "var(--font-primary)",
            color: "var(--color-error)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-default)",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function SourcesTab() {
  const { user, accessToken, githubConnected, setGithubConnected, checkGitHub } = useAuth();
  const isDev = user?.isDev;
  const [connected, setConnected] = useState(isDev ? INITIAL_CONNECTED : []);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubActiveRepos, setGithubActiveRepos] = useState([]);
  const [githubDisconnecting, setGithubDisconnecting] = useState(false);
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [githubSaving, setGithubSaving] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyDisconnecting, setSpotifyDisconnecting] = useState(false);
  const [spotifyExpanded, setSpotifyExpanded] = useState(false);
  const [spotifyPlayerEnabled, setSpotifyPlayerEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("fulkit-spotify-player") !== "false";
  });
  const [expanded, setExpanded] = useState({});
  const [googleExpanded, setGoogleExpanded] = useState(false);
  const [googleServices, setGoogleServices] = useState({ drive: false, gmail: false, calendar: false });
  const [numbrlyConnected, setNumbrlyConnected] = useState(false);
  const [numbrlyExpanded, setNumbrlyExpanded] = useState(false);
  const [numbrlyKeyInput, setNumbrlyKeyInput] = useState("");
  const [numbrlyConnecting, setNumbrlyConnecting] = useState(false);
  const [numbrlyError, setNumbrlyError] = useState("");
  const [numbrlyDisconnecting, setNumbrlyDisconnecting] = useState(false);

  // Fetch repos and active state on mount
  useEffect(() => {
    if (isDev || !accessToken || !githubConnected) return;
    fetchGithubRepos();
  }, [githubConnected, accessToken, isDev]);

  // Refresh GitHub/Spotify status if we just came back from OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected" && accessToken) {
      checkGitHub(accessToken);
    }
    if (params.get("sp") === "connected") {
      setSpotifyConnected(true);
    }
  }, [accessToken, checkGitHub]);

  // Check Spotify connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/spotify/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setSpotifyConnected(data.connected); })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Numbrly connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/numbrly/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setNumbrlyConnected(data.connected); })
      .catch(() => {});
  }, [accessToken, isDev]);

  async function fetchGithubRepos() {
    try {
      const [reposRes, activeRes] = await Promise.all([
        fetch("/api/github/repos", { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch("/api/github/active", { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (reposRes.ok) setGithubRepos(await reposRes.json());
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setGithubActiveRepos(activeData.map((r) => r.repo));
      }
    } catch {}
  }

  async function toggleGithubRepo(fullName) {
    const isActive = githubActiveRepos.includes(fullName);
    const updated = isActive
      ? githubActiveRepos.filter((r) => r !== fullName)
      : [...githubActiveRepos, fullName];
    setGithubActiveRepos(updated);
    setGithubSaving(true);
    try {
      await fetch("/api/github/active", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ activeRepos: updated }),
      });
    } catch {}
    setGithubSaving(false);
  }

  function connectGitHub() {
    if (isDev || !accessToken) return;
    document.cookie = `gh_auth_token=${accessToken}; path=/; max-age=300; SameSite=Lax`;
    window.location.href = "/api/github/connect";
  }

  function connectSpotify() {
    if (isDev) { setSpotifyConnected(true); return; }
    if (accessToken) {
      window.location.href = "/api/spotify/connect?token=" + encodeURIComponent(accessToken);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.location.href = "/api/spotify/connect?token=" + encodeURIComponent(token);
      } else {
        alert("No active session. Please sign out and sign back in, then try again.");
      }
    }).catch(() => {
      alert("Session error. Please sign out and sign back in.");
    });
  }

  async function disconnectGitHub() {
    setGithubDisconnecting(true);
    try {
      await fetch("/api/github/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setGithubConnected(false);
    } catch {}
    setGithubDisconnecting(false);
  }

  function toggleSpotifyPlayer() {
    const next = !spotifyPlayerEnabled;
    setSpotifyPlayerEnabled(next);
    localStorage.setItem("fulkit-spotify-player", String(next));
  }

  async function disconnectSpotify() {
    setSpotifyDisconnecting(true);
    try {
      await fetch("/api/spotify/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSpotifyConnected(false);
    } catch {}
    setSpotifyDisconnecting(false);
  }

  async function connectNumbrly() {
    if (!numbrlyKeyInput.trim()) return;
    setNumbrlyConnecting(true);
    setNumbrlyError("");
    try {
      const res = await fetch("/api/numbrly/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: numbrlyKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNumbrlyError(data.error || "Connection failed");
      } else {
        setNumbrlyConnected(true);
        setNumbrlyKeyInput("");
      }
    } catch {
      setNumbrlyError("Connection failed");
    }
    setNumbrlyConnecting(false);
  }

  async function disconnectNumbrly() {
    setNumbrlyDisconnecting(true);
    try {
      await fetch("/api/numbrly/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNumbrlyConnected(false);
    } catch {}
    setNumbrlyDisconnecting(false);
  }

  const allConnected = [
    ...connected,
    ...(githubConnected ? ["github"] : []),
    ...(spotifyConnected ? ["spotify"] : []),
    ...(numbrlyConnected ? ["numbrly"] : []),
  ];
  const connectedSources = ALL_SOURCES.filter((s) => allConnected.includes(s.id) && s.id !== "spotify" && s.id !== "github" && s.id !== "numbrly");
  const suggested = ALL_SOURCES.filter((s) => SUGGESTED_SOURCES.includes(s.id) && !allConnected.includes(s.id));
  const otherSources = ALL_SOURCES.filter(
    (s) => !allConnected.includes(s.id) && !SUGGESTED_SOURCES.includes(s.id)
  );

  const connect = (id) => {
    if (id === "github") { connectGitHub(); return; }
    if (id === "spotify") { connectSpotify(); return; }
    if (id === "numbrly") { setNumbrlyExpanded(true); return; }
    setConnected((prev) => [...prev, id]);
  };
  const disconnect = (id) => {
    if (id === "github") { disconnectGitHub(); return; }
    if (id === "spotify") { disconnectSpotify(); return; }
    if (id === "numbrly") { disconnectNumbrly(); return; }
    setConnected((prev) => prev.filter((x) => x !== id));
  };

  // Shared checkbox row
  const checkboxRow = (label, checked, onChange) => (
    <button
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        width: "100%",
        padding: "var(--space-2-5) var(--space-4)",
        background: checked ? "var(--color-bg-alt)" : "transparent",
        border: "none",
        borderTop: "1px solid var(--color-border-light)",
        cursor: "pointer",
        fontFamily: "var(--font-primary)",
        textAlign: "left",
        transition: "background var(--duration-fast) var(--ease-default)",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: "var(--radius-xs)",
          border: checked ? "none" : "1px solid var(--color-border)",
          background: checked ? "var(--color-accent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all var(--duration-fast) var(--ease-default)",
        }}
      >
        {checked && <Check size={10} strokeWidth={3} style={{ color: "var(--color-text-inverse)" }} />}
      </div>
      <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: checked ? "var(--color-text)" : "var(--color-text-secondary)" }}>
        {label}
      </div>
    </button>
  );

  // Shared disconnect footer
  const disconnectFooter = (onClick, loading) => (
    <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={onClick}
        disabled={loading}
        style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: loading ? 0.5 : 1 }}
      >
        {loading ? "..." : "Disconnect"}
      </button>
    </div>
  );

  const sourceButton = (src) => {
    const isReal = REAL_INTEGRATIONS.includes(src.id);
    return (
      <button
        key={src.id}
        onClick={isReal ? () => connect(src.id) : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          cursor: isReal ? "pointer" : "default",
          fontFamily: "var(--font-primary)",
          opacity: 1,
          transition: `all var(--duration-fast) var(--ease-default)`,
        }}
      >
        <div style={{ width: 16, height: 16, flexShrink: 0, color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {SOURCE_LOGOS[src.id]}
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", textDecoration: isReal ? "none" : "line-through" }}>{src.name}</div>
          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: isReal ? "none" : "line-through" }}>{isReal ? src.cat : "Coming soon"}</div>
        </div>
      </button>
    );
  };

  const hasConnected = githubConnected || spotifyConnected || numbrlyConnected || connectedSources.length > 0;

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Connected */}
      {hasConnected && (
        <>
          <SectionTitle>Connected</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
            {/* GitHub */}
            {githubConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.github}
                  name="GitHub"
                  subtitle={githubActiveRepos.length > 0
                    ? `${githubActiveRepos.length} active source${githubActiveRepos.length !== 1 ? "s" : ""} of ${githubRepos.length}`
                    : `${githubRepos.length} repos accessible`}
                  isExpanded={githubExpanded}
                  onToggle={() => setGithubExpanded(!githubExpanded)}
                />
                <Drawer open={githubExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    {githubRepos.length === 0 && (
                      <DrawerItem index={0} visible={githubExpanded}>
                        <div style={{ padding: "var(--space-4)", textAlign: "center", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
                          Loading repos...
                        </div>
                      </DrawerItem>
                    )}
                    {githubRepos.map((repo, i) => {
                      const isActive = githubActiveRepos.includes(repo.full_name);
                      return (
                        <DrawerItem key={repo.full_name} index={i} visible={githubExpanded}>
                          <button
                            onClick={() => toggleGithubRepo(repo.full_name)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-3)",
                              width: "100%",
                              padding: "var(--space-2-5) var(--space-4)",
                              background: isActive ? "var(--color-bg-alt)" : "transparent",
                              border: "none",
                              borderTop: "1px solid var(--color-border-light)",
                              cursor: "pointer",
                              fontFamily: "var(--font-primary)",
                              textAlign: "left",
                              transition: "background var(--duration-fast) var(--ease-default)",
                            }}
                          >
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "var(--radius-xs)",
                                border: isActive ? "none" : "1px solid var(--color-border)",
                                background: isActive ? "var(--color-accent)" : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all var(--duration-fast) var(--ease-default)",
                              }}
                            >
                              {isActive && <Check size={10} strokeWidth={3} style={{ color: "var(--color-text-inverse)" }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: isActive ? "var(--color-text)" : "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {repo.name}
                              </div>
                              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                                {repo.full_name}{repo.private ? " · private" : ""}
                              </div>
                            </div>
                          </button>
                        </DrawerItem>
                      );
                    })}
                    <DrawerItem index={githubRepos.length} visible={githubExpanded}>
                      {disconnectFooter(disconnectGitHub, githubDisconnecting)}
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Spotify */}
            {spotifyConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.spotify}
                  name="Spotify"
                  subtitle={spotifyPlayerEnabled ? "Player active" : "Player off"}
                  isExpanded={spotifyExpanded}
                  onToggle={() => setSpotifyExpanded(!spotifyExpanded)}
                />
                <Drawer open={spotifyExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <DrawerItem index={0} visible={spotifyExpanded}>
                      {checkboxRow("Show MiniPlayer in sidebar", spotifyPlayerEnabled, toggleSpotifyPlayer)}
                    </DrawerItem>
                    <DrawerItem index={1} visible={spotifyExpanded}>
                      {disconnectFooter(disconnectSpotify, spotifyDisconnecting)}
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Google — sub-service picker */}
            {allConnected.includes("google") && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.google}
                  name="Google"
                  subtitle={[googleServices.drive && "Drive", googleServices.gmail && "Gmail", googleServices.calendar && "Calendar"].filter(Boolean).join(", ") || "No services selected"}
                  isExpanded={googleExpanded}
                  onToggle={() => setGoogleExpanded(!googleExpanded)}
                />
                <Drawer open={googleExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <DrawerItem index={0} visible={googleExpanded}>
                      {checkboxRow("Google Drive", googleServices.drive, () => setGoogleServices((p) => ({ ...p, drive: !p.drive })))}
                    </DrawerItem>
                    <DrawerItem index={1} visible={googleExpanded}>
                      {checkboxRow("Gmail", googleServices.gmail, () => setGoogleServices((p) => ({ ...p, gmail: !p.gmail })))}
                    </DrawerItem>
                    <DrawerItem index={2} visible={googleExpanded}>
                      {checkboxRow("Google Calendar", googleServices.calendar, () => setGoogleServices((p) => ({ ...p, calendar: !p.calendar })))}
                    </DrawerItem>
                    <DrawerItem index={3} visible={googleExpanded}>
                      {disconnectFooter(() => disconnect("google"), false)}
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Numbrly — connected */}
            {numbrlyConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.numbrly}
                  name="Numbrly"
                  subtitle="Business data source"
                  isExpanded={numbrlyExpanded}
                  onToggle={() => setNumbrlyExpanded(!numbrlyExpanded)}
                />
                <Drawer open={numbrlyExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <DrawerItem index={0} visible={numbrlyExpanded}>
                      <div style={{ padding: "var(--space-3) var(--space-4)", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
                        Pulls org summary, margin alerts, and recent activity into chat context automatically.
                      </div>
                    </DrawerItem>
                    <DrawerItem index={1} visible={numbrlyExpanded}>
                      {disconnectFooter(disconnectNumbrly, numbrlyDisconnecting)}
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Numbrly — API key input (not yet connected, tile was clicked) */}
            {!numbrlyConnected && numbrlyExpanded && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.numbrly}
                  name="Numbrly"
                  subtitle="Paste your API key"
                  isExpanded={numbrlyExpanded}
                  onToggle={() => { setNumbrlyExpanded(false); setNumbrlyError(""); }}
                />
                <Drawer open={numbrlyExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "var(--space-3) var(--space-4)" }}>
                    <DrawerItem index={0} visible={numbrlyExpanded}>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                        Generate a key in Numbrly at Settings &rarr; Developer &rarr; API Access.
                      </div>
                    </DrawerItem>
                    <DrawerItem index={1} visible={numbrlyExpanded}>
                      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                        <input
                          type="password"
                          placeholder="nbl_sk_..."
                          value={numbrlyKeyInput}
                          onChange={(e) => { setNumbrlyKeyInput(e.target.value); setNumbrlyError(""); }}
                          style={{
                            flex: 1,
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-bg)",
                            border: numbrlyError ? "1px solid var(--color-error)" : "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "var(--font-size-xs)",
                            fontFamily: "var(--font-primary)",
                            color: "var(--color-text)",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={connectNumbrly}
                          disabled={numbrlyConnecting || !numbrlyKeyInput.trim()}
                          style={{
                            padding: "var(--space-2) var(--space-3)",
                            background: "var(--color-accent)",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--color-text-inverse)",
                            fontSize: "var(--font-size-xs)",
                            fontWeight: "var(--font-weight-semibold)",
                            fontFamily: "var(--font-primary)",
                            cursor: numbrlyConnecting || !numbrlyKeyInput.trim() ? "default" : "pointer",
                            opacity: numbrlyConnecting || !numbrlyKeyInput.trim() ? 0.5 : 1,
                          }}
                        >
                          {numbrlyConnecting ? "..." : "Connect"}
                        </button>
                      </div>
                    </DrawerItem>
                    {numbrlyError && (
                      <DrawerItem index={2} visible={numbrlyExpanded}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-error)", marginTop: "var(--space-2)" }}>
                          {numbrlyError}
                        </div>
                      </DrawerItem>
                    )}
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Other connected sources */}
            {connectedSources.filter((s) => s.id !== "google" && s.id !== "numbrly").map((src) => {
              const isExpanded = expanded[src.id];
              return (
                <Card key={src.id} style={{ padding: 0, overflow: "hidden" }}>
                  <CardHeader
                    logo={SOURCE_LOGOS[src.id]}
                    name={src.name}
                    subtitle={src.cat}
                    isExpanded={isExpanded}
                    onToggle={() => setExpanded((prev) => ({ ...prev, [src.id]: !prev[src.id] }))}
                  />
                  <Drawer open={isExpanded}>
                    <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                      <DrawerItem index={0} visible={isExpanded}>
                        {disconnectFooter(() => disconnect(src.id), false)}
                      </DrawerItem>
                    </div>
                  </Drawer>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Suggested */}
      {suggested.length > 0 && (
        <>
          <SectionTitle>Suggested</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
            {suggested.map(sourceButton)}
          </div>
        </>
      )}

      {/* All other sources */}
      {otherSources.length > 0 && (
        <>
          <SectionTitle>More</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
            {otherSources.map(sourceButton)}
          </div>
        </>
      )}
    </div>
  );
}

function AITab() {
  const { user } = useAuth();
  const isDev = user?.isDev;
  const prefs = isDev ? PREFERENCES : [];

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionTitle>Learned Preferences</SectionTitle>
      <Card>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          Fülkit learns these from your interactions — not a settings form.
        </div>
        {prefs.length === 0 && (
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
            No preferences learned yet. Start chatting and I'll pick up on your style.
          </div>
        )}
        {prefs.map((pref, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-2) 0",
              borderBottom: i < prefs.length - 1 ? "1px solid var(--color-border-light)" : "none",
            }}
          >
            <div>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
                {pref.key}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "var(--space-1)", marginTop: 2 }}>
                {pref.value}
                {pref.learned && (
                  <span
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      padding: "0 var(--space-1)",
                      borderRadius: "var(--radius-xs)",
                      background: "var(--color-accent-soft)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    learned
                  </span>
                )}
              </div>
            </div>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                border: "none",
                color: "var(--color-text-dim)",
                cursor: "pointer",
              }}
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>
        ))}
      </Card>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>AI Memory</SectionTitle>
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-3)",
            }}
          >
            <Eye size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Everything Fülkit knows about you is visible here. You can clear any specific memory or wipe everything.
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              style={{
                padding: "var(--space-1-5) var(--space-3)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
              }}
            >
              View all memories
            </button>
            <button
              style={{
                padding: "var(--space-1-5) var(--space-3)",
                background: "transparent",
                border: "1px solid var(--color-error)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-error)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
              }}
            >
              Clear all
            </button>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>Whispers</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <Bell size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              Adjust through conversation: "check in more" or "dial it back"
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-2-5) var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <span style={{ color: "var(--color-text-secondary)" }}>Current frequency</span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>
              {isDev ? "2x / day" : "Not set"}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReferralsTab() {
  const { user } = useAuth();
  const isDev = user?.isDev;
  const refs = isDev ? REFERRALS : [];
  const activeRefs = refs.filter((r) => r.status === "active").length;
  const credit = activeRefs * 1;

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionTitle>Get Fülkit</SectionTitle>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-6)" }}>
        {[
          { label: "Active referrals", value: activeRefs, color: "var(--color-text)" },
          { label: "Monthly credit", value: `$${credit}`, color: "var(--color-success)" },
          { label: "To free", value: `${Math.max(0, 7 - activeRefs)} more`, color: "var(--color-text-muted)" },
        ].map((kpi, i) => (
          <Card key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-wider)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: "var(--font-weight-black)",
                fontFamily: "var(--font-mono)",
                color: kpi.color,
              }}
            >
              {kpi.value}
            </div>
          </Card>
        ))}
      </div>

      {/* Referral link */}
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-2)" }}>
          Your referral link
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            readOnly
            value="fulkit.app/ref/you"
            style={{
              flex: 1,
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-sm)",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-secondary)",
              outline: "none",
            }}
          />
          <button
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: "pointer",
            }}
          >
            Copy
          </button>
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
          Every friend who joins earns you $1/mo off your subscription.
        </div>
      </Card>

      {/* Referral list */}
      <SectionTitle>Your referrals</SectionTitle>
      {refs.length > 0 ? (
        <Card>
          {refs.map((ref, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) 0",
                borderBottom: i < refs.length - 1 ? "1px solid var(--color-border-light)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "var(--radius-full)",
                    background: ref.status === "active" ? "var(--color-accent-soft)" : "var(--color-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
                    {ref.name}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    Since {ref.since}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  padding: "var(--space-0-5) var(--space-2)",
                  borderRadius: "var(--radius-xs)",
                  background: ref.status === "active" ? "var(--color-success-soft)" : "var(--color-warning-soft)",
                  color: ref.status === "active" ? "var(--color-success)" : "var(--color-warning)",
                }}
              >
                {ref.status}
              </span>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
            No referrals yet. Share your link to earn credits.
          </div>
        </Card>
      )}
    </div>
  );
}

function BillingTab() {
  const { user, profile, isOwner } = useAuth();
  const isDev = user?.isDev;

  const SEAT_LIMITS = { standard: 450, pro: 800, free: 100 };
  const seatType = isDev ? "standard" : (profile?.seat_type || "standard");
  const seatLimit = SEAT_LIMITS[seatType] || 450;
  const messagesUsed = isDev ? 138 : (profile?.messages_this_month || 0);
  const remaining = seatLimit - messagesUsed;
  const PLAN_LABELS = { standard: "Standard", pro: "Pro", free: "Free" };
  const PLAN_PRICES = { standard: "$7/mo", pro: "$15/mo", free: "Free" };

  // Owner with own API key = unlimited
  if (!isDev && isOwner) {
    return (
      <div style={{ maxWidth: 520 }}>
        <SectionTitle>Your plan</SectionTitle>
        <Card style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)" }}>
              Owner
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              Unlimited — using your own API key
            </div>
          </div>
        </Card>

        <SectionTitle>Referral credits</SectionTitle>
        <Card>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
            No referral credits yet.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionTitle>Your plan</SectionTitle>
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)" }}>
              {PLAN_LABELS[seatType] || "Standard"}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              {PLAN_PRICES[seatType] || "$7/mo"} — {seatLimit} messages
            </div>
          </div>
          {seatType !== "pro" && (
            <button
              style={{
                padding: "var(--space-1-5) var(--space-3)",
                background: "transparent",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                fontFamily: "var(--font-primary)",
                cursor: "pointer",
              }}
            >
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Fül gauge */}
        <div style={{ marginBottom: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              Fül remaining
            </span>
            <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>
              {remaining} / {seatLimit}
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: "var(--radius-full)",
              background: "var(--color-border-light)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, (remaining / seatLimit) * 100)}%`,
                borderRadius: "var(--radius-full)",
                background: "var(--color-accent)",
                transition: `width var(--duration-slow) var(--ease-default)`,
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)" }}>
          {isDev ? "Resets Mar 15. ~10 messages/day remaining." : `${remaining} messages remaining this period.`}
        </div>
      </Card>

      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <Zap size={16} strokeWidth={1.8} style={{ color: "var(--color-warning)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
              Buy credits
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              $2 per 100 messages. On demand.
            </div>
          </div>
          <button
            style={{
              padding: "var(--space-1-5) var(--space-3)",
              background: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: "pointer",
            }}
          >
            Fül up
          </button>
        </div>
      </Card>

      <SectionTitle>Referral credits</SectionTitle>
      <Card>
        {isDev ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
                2 active referrals
              </span>
              <span style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)", color: "var(--color-success)" }}>
                -$2/mo
              </span>
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              You pay $5/mo after credits. 5 more referrals for free.
            </div>
          </>
        ) : (
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
            No referral credits yet.
          </div>
        )}
      </Card>
    </div>
  );
}

function ContextModeToggle({ mode, onChange, disabled }) {
  const modes = [
    { key: "always", label: "Always", symbol: "\u25CF" },
    { key: "available", label: "Available", symbol: "\u25CB" },
    { key: "off", label: "Off", symbol: "\u2715" },
  ];

  return (
    <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--color-border-light)" }}>
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => !disabled && onChange(m.key)}
          title={m.label}
          style={{
            width: 24,
            height: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontFamily: "var(--font-primary)",
            border: "none",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.5 : 1,
            background: mode === m.key ? "var(--color-accent)" : "transparent",
            color: mode === m.key ? "var(--color-text-inverse)" : "var(--color-text-dim)",
            transition: "background var(--duration-fast) var(--ease-default)",
          }}
        >
          {m.symbol}
        </button>
      ))}
    </div>
  );
}

function formatTokens(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function VaultTab() {
  const { storageMode, vaultConnected, isUnlocked, connectVault, disconnectVault, lockVault, getNoteList, updateNoteMode, cryptoKey } = useVaultContext();
  const { user, accessToken } = useAuth();
  const isDev = user?.isDev;

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");

  // File upload state
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importError, setImportError] = useState("");

  const canUpload = storageMode === "fulkit" || (storageMode === "encrypted" && isUnlocked);

  async function handleFiles(files) {
    if (!user || isDev || !canUpload) return;
    const { importNote, importEncryptedNote } = await import("../../lib/vault-fulkit");
    setImporting(true);
    setImportError("");
    let count = 0;

    for (const file of files) {
      if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) continue;
      try {
        const content = await file.text();
        const title = file.name.replace(/\.(md|txt)$/, "");
        if (storageMode === "encrypted" && cryptoKey) {
          const { encryptNote } = await import("../../lib/vault-crypto");
          const { ciphertext, iv } = await encryptNote(content, cryptoKey);
          await importEncryptedNote({ title, ciphertext, iv, source: "upload" }, supabase, user.id);
        } else {
          await importNote({ title, content, source: "upload" }, supabase, user.id);
        }
        count++;
      } catch (err) {
        setImportError(`Failed: ${file.name}`);
      }
    }

    setImportedCount(count);
    setImporting(false);
    if (count > 0) {
      loadNotes();
      setTimeout(() => setImportedCount(0), 3000);
    }
  }

  const noteCount = isDev ? 12 : notes.length;

  const filteredNotes = notes.filter((n) => {
    if (modeFilter !== "all" && n.context_mode !== modeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (n.title || "").toLowerCase().includes(q) || (n.folder || "").toLowerCase().includes(q);
  });

  // Load notes list — re-fires when auth token refreshes
  useEffect(() => {
    if (!isDev && !accessToken) return;
    loadNotes();
  }, [storageMode, vaultConnected, isUnlocked, isDev, accessToken]);

  async function loadNotes() {
    setNotesLoading(true);
    try {
      const list = await getNoteList();
      setNotes(list);
    } catch (err) {
      console.error("[VaultTab] loadNotes error:", err.message);
      setNotes([]);
    }
    setNotesLoading(false);
  }

  async function handleModeChange(noteId, mode) {
    await updateNoteMode(noteId, mode);
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, context_mode: mode } : n));
  }

  async function handleDelete(noteId) {
    const { deleteNote } = await import("../../lib/vault-fulkit");
    await deleteNote(noteId, supabase);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setDeleteConfirm(null);
  }

  const isLocal = storageMode === "local";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", maxWidth: 480 }}>
      <StorageModeSelector />

      {/* Mode-specific status */}
      <div
        style={{
          padding: "var(--space-3)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-light)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Status
        </p>

        {storageMode === "local" && (
          <>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              {vaultConnected ? "Vault connected. Files read at chat-time." : "No vault connected."}
            </p>
            {vaultConnected ? (
              <button
                onClick={disconnectVault}
                style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)", textAlign: "left", padding: 0 }}
              >
                Disconnect vault
              </button>
            ) : (
              <button
                onClick={connectVault}
                style={{ fontSize: "var(--font-size-xs)", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)", textAlign: "left", padding: 0, fontWeight: "var(--font-weight-semibold)" }}
              >
                Connect vault folder
              </button>
            )}
          </>
        )}

        {storageMode === "encrypted" && (
          <>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              {isUnlocked ? "Vault unlocked." : "Vault locked."} {notesLoading ? "" : `${noteCount} encrypted notes.`}
            </p>
            {isUnlocked && (
              <button
                onClick={lockVault}
                style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-primary)", textAlign: "left", padding: 0 }}
              >
                Lock vault
              </button>
            )}
          </>
        )}

        {storageMode === "fulkit" && (
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            {notesLoading ? "Loading..." : `${noteCount} notes stored.`} Encrypted at rest.
          </p>
        )}
      </div>

      {/* Drop zone — Models B (unlocked) + C */}
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: dragOver ? "1px solid var(--color-text-muted)" : "1px dashed var(--color-border)",
            background: dragOver ? "var(--color-bg-alt)" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            transition: "all var(--duration-fast) var(--ease-default)",
          }}
        >
          <Paperclip size={14} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
            {importing ? "Importing..." : importedCount > 0 ? `${importedCount} added` : "Drop .md or .txt files"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.txt"
            multiple
            onChange={(e) => { if (e.target.files?.length) handleFiles(Array.from(e.target.files)); e.target.value = ""; }}
            style={{ display: "none" }}
          />
        </div>
      )}

      {importError && (
        <p style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>{importError}</p>
      )}

      {/* Notes browser */}
      {notes.length > 0 && (
        <div>
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "var(--space-2)" }}>
            Your Notes
          </p>

          {isLocal && (
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-relaxed)" }}>
              Context is managed by folder structure. <code style={{ fontSize: "var(--font-size-2xs)", background: "var(--color-bg-alt)", padding: "1px 4px", borderRadius: "var(--radius-xs)" }}>_CHAPPIE/</code> files are always included.
            </p>
          )}

          {/* Search + filter */}
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={13} strokeWidth={1.8} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px 6px 30px",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  background: "var(--color-bg-alt)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, marginBottom: "var(--space-2)" }}>
            {["all", "always", "available", "off"].map((f) => {
              const count = f === "all" ? notes.length : notes.filter((n) => n.context_mode === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setModeFilter(f)}
                  style={{
                    flex: 1,
                    padding: "4px 0",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    background: modeFilter === f ? "var(--color-text-primary)" : "var(--color-bg-alt)",
                    color: modeFilter === f ? "var(--color-bg)" : "var(--color-text-muted)",
                    border: "1px solid var(--color-border-light)",
                    borderRadius: "var(--radius-xs)",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          <div
            style={{
              border: "1px solid var(--color-border-light)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {filteredNotes.length === 0 && (
              <p style={{ padding: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", textAlign: "center" }}>
                No notes match.
              </p>
            )}
            {filteredNotes.map((note, i) => (
              <div
                key={note.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-3)",
                  borderTop: i > 0 ? "1px solid var(--color-border-light)" : "none",
                }}
              >
                <FileText size={13} strokeWidth={1.8} style={{ color: "var(--color-text-dim)", flexShrink: 0 }} />

                <span
                  style={{
                    flex: 1,
                    fontSize: "var(--font-size-xs)",
                    color: note.context_mode === "off" ? "var(--color-text-dim)" : "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: note.context_mode === "off" ? "line-through" : "none",
                  }}
                >
                  {search && note.folder ? <span style={{ color: "var(--color-text-dim)", fontSize: "var(--font-size-2xs)" }}>{note.folder}/</span> : null}{note.title}
                </span>

                {note.source && note.source !== "local" && SOURCE_LOGOS[note.source] && (
                  <span style={{ color: "var(--color-text-dim)", flexShrink: 0, display: "flex" }}>
                    {SOURCE_LOGOS[note.source]}
                  </span>
                )}

                <span
                  style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-dim)",
                    flexShrink: 0,
                    minWidth: 32,
                    textAlign: "right",
                  }}
                >
                  {formatTokens(note.tokenEstimate)}
                </span>

                <ContextModeToggle
                  mode={note.context_mode}
                  onChange={(mode) => handleModeChange(note.id, mode)}
                  disabled={isLocal}
                />

                {!isLocal && (
                  deleteConfirm === note.id ? (
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => handleDelete(note.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-error)", display: "flex" }}
                        title="Confirm delete"
                      >
                        <Check size={12} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", display: "flex" }}
                        title="Cancel"
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(note.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-text-dim)", flexShrink: 0, display: "flex" }}
                      title="Delete note"
                    >
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
                  )
                )}
              </div>
            ))}
          </div>

          <p style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: "var(--space-2)" }}>
            Always = every prompt &middot; Available = when relevant &middot; Off = excluded
          </p>
        </div>
      )}

      {notesLoading && notes.length === 0 && (
        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Loading notes...</p>
      )}
    </div>
  );
}

function PrivacyTab() {
  const { user } = useAuth();
  const isDev = user?.isDev;

  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!user || isDev) return;

    async function fetchCounts() {
      const [notes, actions, preferences] = await Promise.all([
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("actions").select("id", { count: "exact", head: true }),
        supabase.from("preferences").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        notes: notes.count || 0,
        actions: actions.count || 0,
        preferences: preferences.count || 0,
        conversations: 0, // Phase 2.6
      });
    }
    fetchCounts();
  }, [user, isDev]);

  return (
    <div style={{ maxWidth: 520 }}>
      <SectionTitle>Your data</SectionTitle>
      <Card>
        {isDev ? (
          <>
            <Row label="Notes stored" value="1,247 notes across 4 sources" />
            <Row label="AI conversations" value="34 conversations" />
            <Row label="Learned preferences" value="6 active preferences" />
            <Row label="Action items" value="18 actions tracked" />
            <Row label="Storage used" value="12.4 MB" />
          </>
        ) : (
          <>
            <Row label="Notes stored" value={counts ? `${counts.notes} note${counts.notes !== 1 ? "s" : ""}` : "Loading..."} />
            <Row label="AI conversations" value={counts ? `${counts.conversations} conversation${counts.conversations !== 1 ? "s" : ""}` : "Loading..."} />
            <Row label="Learned preferences" value={counts ? `${counts.preferences} preference${counts.preferences !== 1 ? "s" : ""}` : "Loading..."} />
            <Row label="Action items" value={counts ? `${counts.actions} action${counts.actions !== 1 ? "s" : ""}` : "Loading..."} />
          </>
        )}
      </Card>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>Export</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <Download size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Export everything as markdown. No lock-in, ever.
            </div>
          </div>
          <button
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text-secondary)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Download size={13} strokeWidth={2} />
            Export all data
          </button>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>Danger zone</SectionTitle>
        <Card style={{ border: "1px solid var(--color-error-soft)" }}>
          <Row
            label="Delete all data"
            value="Permanently remove everything Fülkit knows about you."
            actionLabel="Delete"
            danger
          />
          <Row
            label="Delete account"
            value="Cancel subscription and remove your account."
            actionLabel="Delete account"
            danger
          />
        </Card>
      </div>
    </div>
  );
}
