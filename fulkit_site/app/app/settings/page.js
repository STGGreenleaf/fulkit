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
  Crown,
  BookOpenText,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import AuthGuard from "../../components/AuthGuard";
import StorageModeSelector from "../../components/StorageModeSelector";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { OwnerPanel } from "../owner/page";

const TAB_ICON_SIZE = 14;
import { useVaultContext } from "../../lib/vault";
import { supabase } from "../../lib/supabase";

const TABS = [
  { id: "account", label: "Account", icon: User },
  { id: "sources", label: "Sources", icon: Quote },
  { id: "manual", label: "Manual", icon: BookOpenText},
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
  fabric: (
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
  square: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M18 2H6C3.79 2 2 3.79 2 6v12c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4zm-1 13c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6z"/>
    </svg>
  ),
  shopify: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M15.34 2.61c-.06-.02-.12 0-.17.04-.04.04-.7.84-.7.84s-.78-.16-1.23-.2c-.06-.56-.32-1.34-1.4-1.34-.04 0-.08 0-.13.01C11.37 1.54 10.98 1 10.58 1c-2.56 0-3.8 3.2-4.18 4.82-.99.3-1.69.52-1.77.55-.55.17-.57.19-.64.71C3.94 7.46 2 21.5 2 21.5l11.46 2 6.2-1.5S15.42 2.64 15.34 2.61zM11 4.42v.2l-2.23.7C9.21 3.74 10.03 2.7 11 4.42zm-1.53-1.7c.08 0 .17.06.25.16-.97.46-2.02 1.42-2.46 3.45L5.6 6.87C6.07 5.34 7.1 2.72 9.47 2.72zm.8 8.95s-.63-.33-1.4-.33c-1.13 0-1.19.71-1.19.89 0 .97 2.54 1.35 2.54 3.63 0 1.84-1.16 3.02-2.73 3.02-1.88 0-2.84-1.17-2.84-1.17l.5-1.66s.99.85 1.82.85c.54 0 .77-.43.77-.74 0-1.28-2.08-1.33-2.08-3.42 0-1.76 1.26-3.46 3.83-3.46.99 0 1.48.28 1.48.28l-.7 2.11z"/>
    </svg>
  ),
  stripe: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M13.98 7.56c0-1.15.94-1.59 2.5-1.59 2.24 0 5.07.68 7.3 1.9V2.86C21.48 2 19.27 1.5 17.04 1.5c-4.63 0-7.72 2.42-7.72 6.46 0 6.3 8.67 5.3 8.67 8.02 0 1.36-1.18 1.8-2.84 1.8-2.46 0-5.6-.97-8.09-2.32v5.1c2.75 1.18 5.53 1.68 8.09 1.68 4.74 0 8-2.35 8-6.44C23.14 9.83 13.98 11.05 13.98 7.56z" transform="scale(0.85) translate(2, 2)"/>
    </svg>
  ),
  toast: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M4 4c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4zm0 7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-2zm2 7c-1.1 0-2 .9-2 2v0c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v0c0-1.1-.9-2-2-2H6z"/>
    </svg>
  ),
  trello: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="1" y="1" width="22" height="22" rx="3" opacity="0.15"/>
      <rect x="3.5" y="3.5" width="7" height="15" rx="1.5"/>
      <rect x="13.5" y="3.5" width="7" height="9" rx="1.5"/>
    </svg>
  ),
};

// Mock connected state — will come from DB
const INITIAL_CONNECTED = [];

const SUGGESTED_SOURCES = [];

const REAL_INTEGRATIONS = ["github", "fabric", "numbrly", "truegauge", "square", "shopify", "stripe", "toast", "trello"];

const SOURCE_DESCRIPTIONS = {
  square: {
    subtitle: "Your business, connected.",
    description: "Square runs your register, tracks your inventory, manages your team, and handles your invoices. Connecting it means F\u00FClkit sees everything your business does in a day \u2014 every transaction, every shift, every item sold.",
    gives: "Live transaction data, daily closeout summaries, inventory counts, customer profiles, team schedules, and invoice status. Ask how the day went and get real numbers.",
    tryPrompt: "How did we do today?",
    linkLabel: "squareup.com",
    linkHref: "https://squareup.com",
  },
  shopify: {
    subtitle: "Your storefront, connected.",
    description: "Shopify powers your online store \u2014 products, orders, customers, inventory. Connecting it means F\u00FClkit sees every sale, every fulfillment, every customer interaction.",
    gives: "Product catalog, order history, customer data, inventory levels, and fulfillment status. Ask about your store and get real answers.",
    tryPrompt: "What sold the most this week?",
    linkLabel: "shopify.com",
    linkHref: "https://shopify.com",
  },
  stripe: {
    subtitle: "Your payments, connected.",
    description: "Stripe handles your payments, subscriptions, invoices, and payouts. Connecting it means F\u00FClkit sees every charge, every refund, every payout in real time.",
    gives: "Payment history, balance, payout schedule, subscription metrics, invoice status, and dispute tracking. Ask about revenue and get the real numbers.",
    tryPrompt: "What\u2019s my revenue this month?",
    linkLabel: "stripe.com",
    linkHref: "https://stripe.com",
  },
  toast: {
    subtitle: "Your restaurant, connected.",
    description: "Toast runs your restaurant \u2014 orders, menus, labor, and payments. Connecting it means F\u00FClkit sees every ticket, every shift, every menu change.",
    gives: "Order history, menu data, labor schedules, payment summaries, and revenue breakdowns. Ask how service went and get real numbers.",
    tryPrompt: "How was lunch today?",
    linkLabel: "toasttab.com",
    linkHref: "https://toasttab.com",
  },
  github: {
    subtitle: "Your code, in context.",
    description: "GitHub holds your repos, issues, PRs, and commits. Connecting it means F\u00FClkit can reference your codebase, track what changed, and help you think through technical decisions.",
    gives: "Repo structure, recent commits, open issues, pull request status, and code context. Ask about your projects and get grounded answers.",
    tryPrompt: "What changed in the API this week?",
    linkLabel: "github.com",
    linkHref: "https://github.com",
  },
  fabric: {
    subtitle: "Your music, in context.",
    description: "Spotify tracks what you\u2019re listening to, your playlists, and your listening history. Connecting it lets F\u00FClkit weave music into the conversation and control playback from the sidebar.",
    gives: "Now playing, recently played, playlists, and playback controls. Ask what\u2019s playing or queue something up.",
    tryPrompt: "What have I been listening to lately?",
    linkLabel: "spotify.com",
    linkHref: "https://spotify.com",
  },
  trello: {
    subtitle: "Your boards, connected.",
    description: "Trello organizes your projects into boards, lists, and cards. Connecting it means F\u00FClkit sees your tasks, deadlines, and progress across all your boards.",
    gives: "Board overview, card details, due dates, checklists, comments, and labels. Ask what\u2019s due this week or create a card from chat.",
    tryPrompt: "What\u2019s on my board right now?",
    linkLabel: "trello.com",
    linkHref: "https://trello.com",
  },
};

const ALL_SOURCES = [
  { id: "square", name: "Square", cat: "Payments & POS" },
  { id: "shopify", name: "Shopify", cat: "E-Commerce" },
  { id: "stripe", name: "Stripe", cat: "Payments" },
  { id: "toast", name: "Toast", cat: "Restaurant POS" },
  { id: "trello", name: "Trello", cat: "Project Management" },
  { id: "github", name: "GitHub", cat: "Dev" },
  { id: "fabric", name: "Spotify", cat: "Media" },
  { id: "numbrly", name: "Numbrly", cat: "Small Business" },
  { id: "truegauge", name: "TrueGauge", cat: "Profitability Analytics" },
  { id: "obsidian", name: "Obsidian", cat: "Notes" },
  { id: "google", name: "Google", cat: "Account" },
  { id: "notion", name: "Notion", cat: "Notes" },
  { id: "apple_notes", name: "Apple Notes", cat: "Notes" },
  { id: "dropbox", name: "Dropbox", cat: "Files" },
  { id: "icloud", name: "iCloud Drive", cat: "Files" },
  { id: "onenote", name: "OneNote", cat: "Notes" },
  { id: "markdown", name: "Markdown files", cat: "Notes" },
  { id: "slack", name: "Slack", cat: "Chat" },
  { id: "readwise", name: "Readwise", cat: "Reading" },
  { id: "todoist", name: "Todoist", cat: "Tasks" },
  { id: "linear", name: "Linear", cat: "Tasks" },
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

export default function Settings({ initialTab = "account", initialOwnerTab }) {
  const { compactMode, isOwner } = useAuth();
  const tabs = isOwner ? [...TABS, { id: "owner", label: "Owner", icon: Crown }] : TABS;
  const [tab, setTab] = useState(initialTab);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

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
          <span style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tight)",
            color: "var(--color-text)",
          }}>
            Fülkit
          </span>
          {!compactMode && (
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>/</span>
          )}
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
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Tooltip key={t.id} label={compactMode ? t.label : null}>
                <button
                  onClick={() => {
                    setTab(t.id);
                    window.history.replaceState({}, "", `/settings/${t.id}`);
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
                    transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
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
        <div style={{ flex: 1, overflowY: "auto", padding: tab === "owner" ? 0 : "var(--space-4) var(--space-6) var(--space-6)" }}>
            {tab === "account" && <AccountTab />}
            {tab === "sources" && <SourcesTab />}
            {tab === "manual" && <ManualTab />}
            {tab === "vault" && <VaultTab />}
            {tab === "ai" && <AITab />}
            {tab === "referrals" && <ReferralsTab />}
            {tab === "billing" && <BillingTab />}
            {tab === "privacy" && <PrivacyTab />}
            {tab === "owner" && isOwner && <OwnerPanel initialTab={initialOwnerTab} urlPrefix="/settings/owner" />}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

/* ─── Tab Components ─── */

function SectionTitle({ children, style }) {
  return (
    <h3
      style={{
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        textTransform: "uppercase",
        letterSpacing: "var(--letter-spacing-wider)",
        color: "var(--color-text-muted)",
        marginBottom: "var(--space-3)",
        ...style,
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
  const { user, profile, signOut, isOwner, accessToken } = useAuth();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div>
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
          onClick={async () => {
            try {
              if (!accessToken) return;
              const res = await fetch("/api/export", { headers: { Authorization: `Bearer ${accessToken}` } });
              const data = await res.json();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `fulkit-vault-${new Date().toISOString().split("T")[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {}
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            width: "100%",
            padding: "var(--space-2-5) var(--space-4)",
            background: "transparent",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            fontFamily: "var(--font-primary)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition: "all var(--duration-fast) var(--ease-default)",
          }}
        >
          <Download size={14} strokeWidth={1.8} />
          Download my data
        </button>
      </div>

      <div style={{ marginTop: "var(--space-3)" }}>
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
  const [fabricConnected, setFabricConnected] = useState(false);
  const [fabricDisconnecting, setFabricDisconnecting] = useState(false);
  const [fabricExpanded, setFabricExpanded] = useState(false);
  const [fabricPlayerEnabled, setFabricPlayerEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("fulkit-fabric-player") !== "false";
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
  const [numbrlyLastSynced, setNumbrlyLastSynced] = useState(null);
  const [tgConnected, setTgConnected] = useState(false);
  const [tgExpanded, setTgExpanded] = useState(false);
  const [tgKeyInput, setTgKeyInput] = useState("");
  const [tgConnecting, setTgConnecting] = useState(false);
  const [tgError, setTgError] = useState("");
  const [tgDisconnecting, setTgDisconnecting] = useState(false);
  const [tgLastSynced, setTgLastSynced] = useState(null);

  const [squareConnected, setSquareConnected] = useState(false);
  const [squareExpanded, setSquareExpanded] = useState(false);
  const [squareLastSynced, setSquareLastSynced] = useState(null);
  const [squareDisconnecting, setSquareDisconnecting] = useState(false);

  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyExpanded, setShopifyExpanded] = useState(false);
  const [shopifyLastSynced, setShopifyLastSynced] = useState(null);
  const [shopifyDisconnecting, setShopifyDisconnecting] = useState(false);
  const [shopifyShopInput, setShopifyShopInput] = useState("");

  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeExpanded, setStripeExpanded] = useState(false);
  const [stripeLastSynced, setStripeLastSynced] = useState(null);
  const [stripeDisconnecting, setStripeDisconnecting] = useState(false);

  const [toastConnected, setToastConnected] = useState(false);
  const [toastExpanded, setToastExpanded] = useState(false);
  const [toastLastSynced, setToastLastSynced] = useState(null);
  const [toastDisconnecting, setToastDisconnecting] = useState(false);

  const [trelloConnected, setTrelloConnected] = useState(false);
  const [trelloExpanded, setTrelloExpanded] = useState(false);
  const [trelloLastSynced, setTrelloLastSynced] = useState(null);
  const [trelloDisconnecting, setTrelloDisconnecting] = useState(false);
  const [vaultCounts, setVaultCounts] = useState(null);

  // Fetch vault inventory counts
  useEffect(() => {
    if (isDev) { setVaultCounts({ notes: 12, actions: 8 }); return; }
    if (!accessToken) return;
    Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }),
      supabase.from("actions").select("id", { count: "exact", head: true }),
    ]).then(([n, a]) => {
      const nc = n.count || 0;
      const ac = a.count || 0;
      if (nc > 0 || ac > 0) setVaultCounts({ notes: nc, actions: ac });
    }).catch(() => {});
  }, [accessToken, isDev]);

  // Fetch repos and active state on mount
  useEffect(() => {
    if (isDev || !accessToken || !githubConnected) return;
    fetchGithubRepos();
  }, [githubConnected, accessToken, isDev]);

  // Refresh GitHub/Fabric status if we just came back from OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected" && accessToken) {
      checkGitHub(accessToken);
    }
    if (params.get("sp") === "connected") {
      setFabricConnected(true);
    }
    if (params.get("sq") === "connected") {
      setSquareConnected(true);
    }
    if (params.get("shopify") === "connected") {
      setShopifyConnected(true);
    }
    if (params.get("stripe") === "connected") {
      setStripeConnected(true);
    }
    if (params.get("toast") === "connected") {
      setToastConnected(true);
    }
  }, [accessToken, checkGitHub]);

  // Check Fabric connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/fabric/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setFabricConnected(data.connected); })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Numbrly connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/numbrly/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setNumbrlyConnected(data.connected); if (data.lastSynced) setNumbrlyLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check TrueGauge connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/truegauge/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setTgConnected(data.connected); if (data.lastSynced) setTgLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Square connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/square/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setSquareConnected(data.connected); if (data.lastSynced) setSquareLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Shopify connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/shopify/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setShopifyConnected(data.connected); if (data.lastSynced) setShopifyLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Stripe connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/stripe/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setStripeConnected(data.connected); if (data.lastSynced) setStripeLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Toast connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/toast/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setToastConnected(data.connected); if (data.lastSynced) setToastLastSynced(data.lastSynced); } })
      .catch(() => {});
  }, [accessToken, isDev]);

  // Check Trello connection status on mount
  useEffect(() => {
    if (isDev || !accessToken) return;
    fetch("/api/trello/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setTrelloConnected(data.connected); if (data.lastSynced) setTrelloLastSynced(data.lastSynced); } })
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
    window.open("/api/github/connect", "_blank");
  }

  function connectFabric() {
    if (isDev) { setFabricConnected(true); return; }
    if (accessToken) {
      window.open("/api/fabric/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/fabric/connect?token=" + encodeURIComponent(token), "_blank");
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

  function toggleFabricPlayer() {
    const next = !fabricPlayerEnabled;
    setFabricPlayerEnabled(next);
    localStorage.setItem("fulkit-fabric-player", String(next));
  }

  async function disconnectFabric() {
    setFabricDisconnecting(true);
    try {
      await fetch("/api/fabric/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setFabricConnected(false);
    } catch {}
    setFabricDisconnecting(false);
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

  async function connectTrueGauge() {
    if (!tgKeyInput.trim()) return;
    setTgConnecting(true);
    setTgError("");
    try {
      const res = await fetch("/api/truegauge/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: tgKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTgError(data.error || "Connection failed");
      } else {
        setTgConnected(true);
        setTgKeyInput("");
      }
    } catch {
      setTgError("Connection failed");
    }
    setTgConnecting(false);
  }

  async function disconnectTrueGauge() {
    setTgDisconnecting(true);
    try {
      await fetch("/api/truegauge/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTgConnected(false);
    } catch {}
    setTgDisconnecting(false);
  }

  function connectSquare() {
    if (isDev) { setSquareConnected(true); return; }
    if (accessToken) {
      window.open("/api/square/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/square/connect?token=" + encodeURIComponent(token), "_blank");
      } else {
        alert("No active session. Please sign out and sign back in, then try again.");
      }
    }).catch(() => {
      alert("Session error. Please sign out and sign back in.");
    });
  }

  async function disconnectSquare() {
    setSquareDisconnecting(true);
    try {
      await fetch("/api/square/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setSquareConnected(false);
    } catch {}
    setSquareDisconnecting(false);
  }

  function connectShopify(shop) {
    if (isDev) { setShopifyConnected(true); return; }
    if (!shop) return;
    const cleanShop = shop.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (accessToken) {
      window.open(`/api/shopify/connect?token=${encodeURIComponent(accessToken)}&shop=${encodeURIComponent(cleanShop)}`, "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open(`/api/shopify/connect?token=${encodeURIComponent(token)}&shop=${encodeURIComponent(cleanShop)}`, "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectShopify() {
    setShopifyDisconnecting(true);
    try {
      await fetch("/api/shopify/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setShopifyConnected(false);
    } catch {}
    setShopifyDisconnecting(false);
  }

  function connectStripe() {
    if (isDev) { setStripeConnected(true); return; }
    if (accessToken) {
      window.open("/api/stripe/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/stripe/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectStripe() {
    setStripeDisconnecting(true);
    try {
      await fetch("/api/stripe/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStripeConnected(false);
    } catch {}
    setStripeDisconnecting(false);
  }

  function connectToast() {
    if (isDev) { setToastConnected(true); return; }
    if (accessToken) {
      window.open("/api/toast/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/toast/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectToast() {
    setToastDisconnecting(true);
    try {
      await fetch("/api/toast/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setToastConnected(false);
    } catch {}
    setToastDisconnecting(false);
  }

  function connectTrello() {
    if (isDev) { setTrelloConnected(true); return; }
    if (accessToken) {
      window.open("/api/trello/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/trello/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectTrello() {
    setTrelloDisconnecting(true);
    try {
      await fetch("/api/trello/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTrelloConnected(false);
    } catch {}
    setTrelloDisconnecting(false);
  }

  const allConnected = [
    ...connected,
    ...(githubConnected ? ["github"] : []),
    ...(fabricConnected ? ["fabric"] : []),
    ...(numbrlyConnected ? ["numbrly"] : []),
    ...(tgConnected ? ["truegauge"] : []),
    ...(squareConnected ? ["square"] : []),
    ...(shopifyConnected ? ["shopify"] : []),
    ...(stripeConnected ? ["stripe"] : []),
    ...(toastConnected ? ["toast"] : []),
    ...(trelloConnected ? ["trello"] : []),
  ];
  const CUSTOM_CARD_IDS = ["fabric", "github", "numbrly", "truegauge", "square", "shopify", "stripe", "toast", "trello"];
  const connectedSources = ALL_SOURCES.filter((s) => allConnected.includes(s.id) && !CUSTOM_CARD_IDS.includes(s.id));
  const suggested = ALL_SOURCES.filter((s) => SUGGESTED_SOURCES.includes(s.id) && !allConnected.includes(s.id));
  const otherSources = ALL_SOURCES.filter(
    (s) => !allConnected.includes(s.id) && !SUGGESTED_SOURCES.includes(s.id) && !["numbrly", "truegauge"].includes(s.id)
  );
  const moreCards = otherSources.filter((s) => REAL_INTEGRATIONS.includes(s.id) && SOURCE_DESCRIPTIONS[s.id]);
  const moreTiles = otherSources.filter((s) => !REAL_INTEGRATIONS.includes(s.id) || !SOURCE_DESCRIPTIONS[s.id]);

  const connect = (id) => {
    if (id === "github") { connectGitHub(); return; }
    if (id === "fabric") { connectFabric(); return; }
    if (id === "numbrly") { setNumbrlyExpanded(true); return; }
    if (id === "truegauge") { setTgExpanded(true); return; }
    if (id === "square") { connectSquare(); return; }
    if (id === "shopify") { setShopifyExpanded(true); return; }
    if (id === "stripe") { connectStripe(); return; }
    if (id === "toast") { connectToast(); return; }
    if (id === "trello") { connectTrello(); return; }
    setConnected((prev) => [...prev, id]);
  };
  const disconnect = (id) => {
    if (id === "github") { disconnectGitHub(); return; }
    if (id === "fabric") { disconnectFabric(); return; }
    if (id === "numbrly") { disconnectNumbrly(); return; }
    if (id === "truegauge") { disconnectTrueGauge(); return; }
    if (id === "square") { disconnectSquare(); return; }
    if (id === "shopify") { disconnectShopify(); return; }
    if (id === "stripe") { disconnectStripe(); return; }
    if (id === "toast") { disconnectToast(); return; }
    if (id === "trello") { disconnectTrello(); return; }
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

  const timeAgo = (iso) => {
    if (!iso) return null;
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const richDrawerContent = ({ expanded: isOpen, description, givesLabel, gives, tryPrompt, linkLabel, linkHref, footer }) => (
    <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
      <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <DrawerItem index={0} visible={isOpen}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
            {description}
          </div>
        </DrawerItem>
        <DrawerItem index={1} visible={isOpen}>
          <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
              {givesLabel}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)" }}>
              {gives}
            </div>
          </div>
        </DrawerItem>
        <DrawerItem index={2} visible={isOpen}>
          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)" }}>
            {`\u201C${tryPrompt}\u201D`}
          </div>
        </DrawerItem>
        <DrawerItem index={3} visible={isOpen}>
          <a href={linkHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: "none", fontFamily: "var(--font-primary)", transition: "color var(--duration-fast) var(--ease-default)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}>
            {"\u2197 "}{linkLabel}
          </a>
        </DrawerItem>
      </div>
      <DrawerItem index={4} visible={isOpen}>
        {footer}
      </DrawerItem>
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

  const hasConnected = githubConnected || fabricConnected || numbrlyConnected || tgConnected || squareConnected || shopifyConnected || stripeConnected || toastConnected || connectedSources.length > 0;

  return (
    <div>
      {/* Connected header — always visible */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
        <SectionTitle style={{ marginBottom: 0 }}>Connected</SectionTitle>
        <a
          href="/privacy"
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            lineHeight: "var(--line-height-tight)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Your data stays yours. We can't see it. →
        </a>
      </div>

      {/* Vault inventory */}
      {vaultCounts && (
        <div style={{
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-dim)",
          marginBottom: "var(--space-4)",
        }}>
          {vaultCounts.notes} notes · {vaultCounts.actions} actions in your vault
        </div>
      )}

      {/* No sources connected */}
      {!hasConnected && (
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            background: "var(--color-bg-alt)",
            border: "1px solid var(--color-border-light)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-6)",
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
        >
          No sources connected yet. Connect a source below to give your AI real context — your transactions, inventory, customers, and more. Fülkit holds the connection, not the data.
        </div>
      )}

      {/* Connected sources */}
      {hasConnected && (
        <>
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

            {/* Fabric */}
            {fabricConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.fabric}
                  name="Spotify"
                  subtitle={fabricPlayerEnabled ? "Player active" : "Player off"}
                  isExpanded={fabricExpanded}
                  onToggle={() => setFabricExpanded(!fabricExpanded)}
                />
                <Drawer open={fabricExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <DrawerItem index={0} visible={fabricExpanded}>
                      {checkboxRow("Show MiniPlayer in sidebar", fabricPlayerEnabled, toggleFabricPlayer)}
                    </DrawerItem>
                    <DrawerItem index={1} visible={fabricExpanded}>
                      {disconnectFooter(disconnectFabric, fabricDisconnecting)}
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
                  subtitle="Know your real margin."
                  isExpanded={numbrlyExpanded}
                  onToggle={() => setNumbrlyExpanded(!numbrlyExpanded)}
                />
                <Drawer open={numbrlyExpanded}>
                  {richDrawerContent({
                    expanded: numbrlyExpanded,
                    description: "The numbers engine for small business owners who run on feel and need to run on facts. Numbrly watches your revenue, costs, and margins \u2014 not what your register says you made, but what you actually kept after everything.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Real-time org summary, margin alerts, and recent financial activity flow into every conversation. Ask about your business and F\u00FClkit answers with live numbers, not guesses.",
                    tryPrompt: "What\u2019s my margin on a\u00E7a\u00ED bowls this month?",
                    linkLabel: "numbrly.app",
                    linkHref: "https://numbrly.app",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{numbrlyLastSynced ? ` \u00B7 Last synced ${timeAgo(numbrlyLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectNumbrly}
                          disabled={numbrlyDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: numbrlyDisconnecting ? 0.5 : 1 }}
                        >
                          {numbrlyDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* TrueGauge — connected */}
            {tgConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.truegauge}
                  name="TrueGauge"
                  subtitle="Precision Business Telemetry."
                  isExpanded={tgExpanded}
                  onToggle={() => setTgExpanded(!tgExpanded)}
                />
                <Drawer open={tgExpanded}>
                  {richDrawerContent({
                    expanded: tgExpanded,
                    description: "Numbrly knows the numbers. TrueGauge knows what they mean. It scores your business health, tracks your pace against targets, watches your cash position, and flags expense trends before they become problems. The difference between \u201CI think we\u2019re fine\u201D and knowing.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Health score, pacing data, cash position, expense breakdowns, and alerts. When you ask whether things are on track, F\u00FClkit pulls from this \u2014 not vibes.",
                    tryPrompt: "Am I on pace for the month?",
                    linkLabel: "truegauge.app",
                    linkHref: "https://www.truegauge.app",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{tgLastSynced ? ` \u00B7 Last synced ${timeAgo(tgLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectTrueGauge}
                          disabled={tgDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: tgDisconnecting ? 0.5 : 1 }}
                        >
                          {tgDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Square — connected */}
            {squareConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.square}
                  name="Square"
                  subtitle="Your business, connected."
                  isExpanded={squareExpanded}
                  onToggle={() => setSquareExpanded(!squareExpanded)}
                />
                <Drawer open={squareExpanded}>
                  {richDrawerContent({
                    expanded: squareExpanded,
                    description: "Square runs your register, tracks your inventory, manages your team, and handles your invoices. Connecting it means F\u00FClkit sees everything your business does in a day \u2014 every transaction, every shift, every item sold.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Live transaction data, daily closeout summaries, inventory counts, customer profiles, team schedules, and invoice status. Ask how the day went and get real numbers.",
                    tryPrompt: "How did we do today?",
                    linkLabel: "squareup.com",
                    linkHref: "https://squareup.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{squareLastSynced ? ` \u00B7 Last synced ${timeAgo(squareLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectSquare}
                          disabled={squareDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: squareDisconnecting ? 0.5 : 1 }}
                        >
                          {squareDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Shopify — connected */}
            {shopifyConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.shopify}
                  name="Shopify"
                  subtitle="Your storefront, connected."
                  isExpanded={shopifyExpanded}
                  onToggle={() => setShopifyExpanded(!shopifyExpanded)}
                />
                <Drawer open={shopifyExpanded}>
                  {richDrawerContent({
                    expanded: shopifyExpanded,
                    description: "Shopify powers your online store \u2014 products, orders, customers, inventory. Connecting it means F\u00FClkit sees every sale, every fulfillment, every customer interaction.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Product catalog, order history, customer data, inventory levels, and fulfillment status. Ask about your store and get real answers.",
                    tryPrompt: "What sold the most this week?",
                    linkLabel: "shopify.com",
                    linkHref: "https://shopify.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{shopifyLastSynced ? ` \u00B7 Last synced ${timeAgo(shopifyLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectShopify}
                          disabled={shopifyDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: shopifyDisconnecting ? 0.5 : 1 }}
                        >
                          {shopifyDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Stripe — connected */}
            {stripeConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.stripe}
                  name="Stripe"
                  subtitle="Your payments, connected."
                  isExpanded={stripeExpanded}
                  onToggle={() => setStripeExpanded(!stripeExpanded)}
                />
                <Drawer open={stripeExpanded}>
                  {richDrawerContent({
                    expanded: stripeExpanded,
                    description: "Stripe handles your payments, subscriptions, invoices, and payouts. Connecting it means F\u00FClkit sees every charge, every refund, every payout in real time.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Payment history, balance, payout schedule, subscription metrics, invoice status, and dispute tracking. Ask about revenue and get the real numbers.",
                    tryPrompt: "What\u2019s my revenue this month?",
                    linkLabel: "stripe.com",
                    linkHref: "https://stripe.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{stripeLastSynced ? ` \u00B7 Last synced ${timeAgo(stripeLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectStripe}
                          disabled={stripeDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: stripeDisconnecting ? 0.5 : 1 }}
                        >
                          {stripeDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Toast — connected */}
            {toastConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.toast}
                  name="Toast"
                  subtitle="Your restaurant, connected."
                  isExpanded={toastExpanded}
                  onToggle={() => setToastExpanded(!toastExpanded)}
                />
                <Drawer open={toastExpanded}>
                  {richDrawerContent({
                    expanded: toastExpanded,
                    description: "Toast runs your restaurant \u2014 orders, menus, labor, and payments. Connecting it means F\u00FClkit sees every ticket, every shift, every menu change.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Order history, menu data, labor schedules, payment summaries, and revenue breakdowns. Ask how service went and get real numbers.",
                    tryPrompt: "How was lunch today?",
                    linkLabel: "toasttab.com",
                    linkHref: "https://toasttab.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{toastLastSynced ? ` \u00B7 Last synced ${timeAgo(toastLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectToast}
                          disabled={toastDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: toastDisconnecting ? 0.5 : 1 }}
                        >
                          {toastDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Trello — connected */}
            {trelloConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.trello}
                  name="Trello"
                  subtitle="Your boards, connected."
                  isExpanded={trelloExpanded}
                  onToggle={() => setTrelloExpanded(!trelloExpanded)}
                />
                <Drawer open={trelloExpanded}>
                  {richDrawerContent({
                    expanded: trelloExpanded,
                    description: "Trello organizes your projects into boards, lists, and cards. Connecting it means F\u00FClkit sees your tasks, deadlines, and progress across all your boards.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Board overview, card details, due dates, checklists, comments, and labels. Ask what\u2019s due this week or create a card from chat.",
                    tryPrompt: "What\u2019s on my board right now?",
                    linkLabel: "trello.com",
                    linkHref: "https://trello.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{trelloLastSynced ? ` \u00B7 Last synced ${timeAgo(trelloLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={disconnectTrello}
                          disabled={trelloDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: trelloDisconnecting ? 0.5 : 1 }}
                        >
                          {trelloDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Other connected sources */}
            {connectedSources.filter((s) => s.id !== "google").map((src) => {
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
      {(!numbrlyConnected || !tgConnected) && (
        <>
          <SectionTitle>Suggested</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
            {/* Numbrly — suggested card with swivel */}
            {!numbrlyConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.numbrly}
                  name="Numbrly"
                  subtitle="Know your real margin."
                  isExpanded={numbrlyExpanded}
                  onToggle={() => { setNumbrlyExpanded(!numbrlyExpanded); setNumbrlyError(""); }}
                />
                <Drawer open={numbrlyExpanded}>
                  {richDrawerContent({
                    expanded: numbrlyExpanded,
                    description: "The numbers engine for small business owners who run on feel and need to run on facts. Numbrly watches your revenue, costs, and margins \u2014 not what your register says you made, but what you actually kept after everything.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Real-time org summary, margin alerts, and recent financial activity flow into every conversation. Ask about your business and F\u00FClkit answers with live numbers, not guesses.",
                    tryPrompt: "What\u2019s my margin on a\u00E7a\u00ED bowls this month?",
                    linkLabel: "numbrly.app",
                    linkHref: "https://numbrly.app",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                        <DrawerItem index={5} visible={numbrlyExpanded}>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                            Generate a key in Numbrly at Settings &rarr; Developer &rarr; API Access.
                          </div>
                        </DrawerItem>
                        <DrawerItem index={6} visible={numbrlyExpanded}>
                          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                            <input
                              type="password"
                              placeholder="nbl_sk_..."
                              value={numbrlyKeyInput}
                              onChange={(e) => { setNumbrlyKeyInput(e.target.value); setNumbrlyError(""); }}
                              style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: "var(--color-bg)", border: numbrlyError ? "1px solid var(--color-error)" : "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }}
                            />
                            <button
                              onClick={connectNumbrly}
                              disabled={numbrlyConnecting || !numbrlyKeyInput.trim()}
                              style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--color-text-inverse)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: numbrlyConnecting || !numbrlyKeyInput.trim() ? "default" : "pointer", opacity: numbrlyConnecting || !numbrlyKeyInput.trim() ? 0.5 : 1 }}
                            >
                              {numbrlyConnecting ? "..." : "Connect"}
                            </button>
                          </div>
                        </DrawerItem>
                        {numbrlyError && (
                          <DrawerItem index={7} visible={numbrlyExpanded}>
                            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-error)", marginTop: "var(--space-2)" }}>
                              {numbrlyError}
                            </div>
                          </DrawerItem>
                        )}
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* TrueGauge — suggested card with swivel */}
            {!tgConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.truegauge}
                  name="TrueGauge"
                  subtitle="Precision Business Telemetry."
                  isExpanded={tgExpanded}
                  onToggle={() => { setTgExpanded(!tgExpanded); setTgError(""); }}
                />
                <Drawer open={tgExpanded}>
                  {richDrawerContent({
                    expanded: tgExpanded,
                    description: "Numbrly knows the numbers. TrueGauge knows what they mean. It scores your business health, tracks your pace against targets, watches your cash position, and flags expense trends before they become problems. The difference between \u201CI think we\u2019re fine\u201D and knowing.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Health score, pacing data, cash position, expense breakdowns, and alerts. When you ask whether things are on track, F\u00FClkit pulls from this \u2014 not vibes.",
                    tryPrompt: "Am I on pace for the month?",
                    linkLabel: "truegauge.app",
                    linkHref: "https://www.truegauge.app",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                        <DrawerItem index={5} visible={tgExpanded}>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                            Generate a key in TrueGauge at Settings &rarr; Developer &rarr; API Access.
                          </div>
                        </DrawerItem>
                        <DrawerItem index={6} visible={tgExpanded}>
                          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                            <input
                              type="password"
                              placeholder="tg_sk_..."
                              value={tgKeyInput}
                              onChange={(e) => { setTgKeyInput(e.target.value); setTgError(""); }}
                              style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: "var(--color-bg)", border: tgError ? "1px solid var(--color-error)" : "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }}
                            />
                            <button
                              onClick={connectTrueGauge}
                              disabled={tgConnecting || !tgKeyInput.trim()}
                              style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--color-text-inverse)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: tgConnecting || !tgKeyInput.trim() ? "default" : "pointer", opacity: tgConnecting || !tgKeyInput.trim() ? 0.5 : 1 }}
                            >
                              {tgConnecting ? "..." : "Connect"}
                            </button>
                          </div>
                        </DrawerItem>
                        {tgError && (
                          <DrawerItem index={7} visible={tgExpanded}>
                            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-error)", marginTop: "var(--space-2)" }}>
                              {tgError}
                            </div>
                          </DrawerItem>
                        )}
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

          </div>
        </>
      )}

      {/* All other sources */}
      {(moreCards.length > 0 || moreTiles.length > 0) && (
        <>
          <SectionTitle>More</SectionTitle>

          {/* Real integrations — expandable swivel cards */}
          {moreCards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: moreTiles.length > 0 ? "var(--space-4)" : 0 }}>
              {moreCards.map((src) => {
                const desc = SOURCE_DESCRIPTIONS[src.id];
                const isOpen = src.id === "shopify" ? shopifyExpanded : !!expanded[src.id];
                const toggle = src.id === "shopify"
                  ? () => setShopifyExpanded(!shopifyExpanded)
                  : () => setExpanded((prev) => ({ ...prev, [src.id]: !prev[src.id] }));
                return (
                  <Card key={src.id} style={{ padding: 0, overflow: "hidden" }}>
                    <CardHeader
                      logo={SOURCE_LOGOS[src.id]}
                      name={src.name}
                      subtitle={desc?.subtitle || src.cat}
                      isExpanded={isOpen}
                      onToggle={toggle}
                    />
                    <Drawer open={isOpen}>
                      {richDrawerContent({
                        expanded: isOpen,
                        description: desc.description,
                        givesLabel: "What this gives F\u00FClkit",
                        gives: desc.gives,
                        tryPrompt: desc.tryPrompt,
                        linkLabel: desc.linkLabel,
                        linkHref: desc.linkHref,
                        footer: src.id === "shopify" ? (
                          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                            <DrawerItem index={5} visible={isOpen}>
                              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                                Enter your Shopify store URL to connect.
                              </div>
                            </DrawerItem>
                            <DrawerItem index={6} visible={isOpen}>
                              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
                                <input
                                  type="text"
                                  placeholder="mystore.myshopify.com"
                                  value={shopifyShopInput}
                                  onChange={(e) => setShopifyShopInput(e.target.value)}
                                  style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }}
                                />
                                <button
                                  onClick={() => connectShopify(shopifyShopInput)}
                                  disabled={!shopifyShopInput.trim()}
                                  style={{ padding: "var(--space-2) var(--space-3)", background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--color-text-inverse)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: !shopifyShopInput.trim() ? "default" : "pointer", opacity: !shopifyShopInput.trim() ? 0.5 : 1 }}
                                >
                                  Connect
                                </button>
                              </div>
                            </DrawerItem>
                          </div>
                        ) : (
                          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                            <DrawerItem index={5} visible={isOpen}>
                              <button
                                onClick={() => connect(src.id)}
                                style={{ width: "100%", padding: "var(--space-2) var(--space-3)", background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-sm)", color: "var(--color-text-inverse)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: "pointer" }}
                              >
                                Connect {src.name}
                              </button>
                            </DrawerItem>
                          </div>
                        ),
                      })}
                    </Drawer>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Non-real sources — flat grid tiles */}
          {moreTiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
              {moreTiles.map(sourceButton)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Operator's Manual ─────────────────────────────────

const MANUAL_SECTIONS = {
  square: {
    name: "Square",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "How did we do today?", description: "Daily sales summary — revenue, orders, top items, payment breakdown" },
          { example: "What's our inventory?", description: "Current stock levels for all items" },
          { example: "Show me this week's orders", description: "Order history with date range filters" },
          { example: "Who are our top customers?", description: "Customer search and spend history" },
          { example: "Any open invoices?", description: "Invoice status and details" },
          { example: "Who's working today?", description: "Team members and shift schedules" },
          { example: "Any refunds this week?", description: "Refund history with amounts" },
          { example: "What's our card vs cash split?", description: "Payment breakdown by type" },
        ],
      },
      {
        label: "What you can do",
        commands: [
          { example: "3 tropical, 12 ginger shots, 0 orange", description: "Update inventory counts — preview before confirm" },
          { example: "86 chia pudding", description: "Mark an item sold out (coming soon)" },
          { example: "Bump acai bowl to $14", description: "Change item pricing (coming soon)" },
          { example: "Invoice Matt $150 for catering", description: "Create an invoice (coming soon)" },
        ],
      },
    ],
  },
  truegauge: {
    name: "TrueGauge",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "Am I on pace for the month?", description: "Survival goal progress and daily target" },
          { example: "What's my cash position?", description: "Current cash balance and runway" },
          { example: "Show me this month's expenses", description: "Expense breakdown by vendor and category" },
          { example: "Any alerts?", description: "Business warnings — behind pace, high COGS, low cash" },
        ],
      },
      {
        label: "What you can do",
        commands: [
          { example: "Log $450 to Sysco for COGS", description: "Record an expense with preview/confirm" },
          { example: "We did $2,400 today", description: "Update daily sales entry" },
        ],
      },
    ],
  },
  github: {
    name: "GitHub",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What changed in the API this week?", description: "Recent commits and code changes" },
          { example: "Show me open issues", description: "Issue tracker across repos" },
          { example: "What's the project structure?", description: "Repository file tree" },
        ],
      },
    ],
  },
  fabric: {
    name: "Spotify",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What's playing?", description: "Current track and playback status" },
          { example: "Show me my playlists", description: "Your Spotify playlists" },
        ],
      },
    ],
  },
  numbrly: {
    name: "Numbrly",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What's my margin on acai bowls?", description: "Cost breakdown for any product" },
          { example: "Show me vendor costs", description: "Vendor and component pricing" },
        ],
      },
    ],
  },
  shopify: {
    name: "Shopify",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What sold the most this week?", description: "Top products and order volume" },
          { example: "Show me recent orders", description: "Order history and fulfillment status" },
        ],
      },
    ],
  },
  stripe: {
    name: "Stripe",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What's my revenue this month?", description: "Payment totals, refunds, and net" },
          { example: "Any failed payments?", description: "Disputes and failure tracking" },
        ],
      },
    ],
  },
  toast: {
    name: "Toast",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "How was lunch today?", description: "Service period breakdown" },
          { example: "Show me the menu", description: "Menu items and pricing" },
        ],
      },
    ],
  },
  trello: {
    name: "Trello",
    categories: [
      {
        label: "What you can ask",
        commands: [
          { example: "What's on my board?", description: "Board overview with lists and cards" },
          { example: "What's due this week?", description: "Upcoming deadlines" },
        ],
      },
      {
        label: "What you can do",
        commands: [
          { example: "Create a card for new menu items", description: "Add cards to boards" },
          { example: "Move that to Done", description: "Update card status" },
        ],
      },
    ],
  },
};

const MANUAL_BLUEPRINT = [
  { num: "01", label: "TALK", desc: "One chat. Say what you need.", examples: ["\u201CHow did we do today?\u201D", "\u201CSave this recipe.\u201D", "\u201CPlay something chill.\u201D"] },
  { num: "02", label: "REMEMBER", desc: "Notes, memories, semantic search.", examples: ["\u201CSave this\u201D \u2014 F\u00fclkit distills it.", "\u201CWhat did I save about\u2026\u201D \u2014 meaning, not keywords."] },
  { num: "03", label: "ACT", desc: "Actions + Threads.", examples: ["\u201CRemind me to\u2026\u201D \u2192 tracked action.", "\u201CTrack this\u201D \u2192 kanban card."] },
  { num: "04", label: "LISTEN", desc: "The Hum. Voice \u2192 understanding.", examples: ["Talk to a presence, not a form.", "No visible transcript. You flow."] },
  { num: "05", label: "PROTECT", desc: "Three vault modes. Your data, your rules.", vaultModes: true },
];

const ALL_INTEGRATIONS = [
  { id: "square", name: "Square", summary: "POS, inventory, orders, customers" },
  { id: "truegauge", name: "TrueGauge", summary: "Pace, cash, expenses, alerts" },
  { id: "github", name: "GitHub", summary: "Commits, issues, repo structure" },
  { id: "fabric", name: "Spotify", summary: "Playback, playlists, search" },
  { id: "numbrly", name: "Numbrly", summary: "Margins, vendor costs, components" },
  { id: "shopify", name: "Shopify", summary: "Products, orders, fulfillment" },
  { id: "stripe", name: "Stripe", summary: "Revenue, payments, disputes" },
  { id: "toast", name: "Toast", summary: "Service periods, menu, sales" },
  { id: "trello", name: "Trello", summary: "Boards, cards, deadlines" },
];

const GETTING_STARTED = [
  { step: "1", action: "Say something", desc: "Open chat. Talk naturally \u2014 no menus, no commands." },
  { step: "2", action: "Save your first note", desc: "\u201CSave this\u201D \u2014 F\u00fclkit distills it to what matters." },
  { step: "3", action: "Pick your vault", desc: "Settings \u2192 Vault. Local, encrypted, or managed. You choose." },
];

const QUICK_REFERENCE = [
  { left: "Enter \u2192 send", right: "\u201CSave this\u201D \u2192 note" },
  { left: "Shift+Enter \u2192 new line", right: "\u201CRemind me\u201D \u2192 action" },
  { left: "", right: "\u201CTrack this\u201D \u2192 thread" },
  { left: "", right: "\u201CWhat did I save about\u2026\u201D \u2192 search" },
];

function SectionDivider({ label, right }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-4) 0 var(--space-2) 0",
    }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--font-size-2xs)",
        fontWeight: "var(--font-weight-bold)",
        letterSpacing: "var(--letter-spacing-widest)",
        color: "var(--color-text-dim)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>{label}</span>
      <span style={{
        flex: 1,
        height: 1,
        background: "var(--color-border-light)",
      }} />
      {right && (
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-size-2xs)",
          color: "var(--color-text-dim)",
          whiteSpace: "nowrap",
        }}>{right}</span>
      )}
    </div>
  );
}

function ManualTab() {
  const { accessToken, githubConnected } = useAuth();
  const [expanded, setExpanded] = useState({});
  const [connections, setConnections] = useState({});

  useEffect(() => {
    if (!accessToken) return;
    const checks = [
      { id: "square", url: "/api/square/status" },
      { id: "shopify", url: "/api/shopify/status" },
      { id: "stripe", url: "/api/stripe/status" },
      { id: "toast", url: "/api/toast/status" },
      { id: "trello", url: "/api/trello/status" },
      { id: "fabric", url: "/api/fabric/status" },
      { id: "numbrly", url: "/api/numbrly/status" },
      { id: "truegauge", url: "/api/truegauge/status" },
    ];
    const results = {};
    Promise.all(
      checks.map(c =>
        fetch(c.url, { headers: { Authorization: `Bearer ${accessToken}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => { results[c.id] = data?.connected || false; })
          .catch(() => { results[c.id] = false; })
      )
    ).then(() => {
      results.github = githubConnected || false;
      setConnections(results);
    });
  }, [accessToken, githubConnected]);

  const connectedCount = ALL_INTEGRATIONS.filter(i => connections[i.id]).length;

  return (
    <div>
      <SectionTitle>Operator&apos;s Manual</SectionTitle>

      {/* ═══ Layer 1: Getting Started ═══ */}
      <SectionDivider label="Getting Started" />
      <div>
        {GETTING_STARTED.map((item) => (
          <div key={item.step} style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-3)",
            padding: "var(--space-2) 0",
            borderBottom: "1px solid var(--color-border-light)",
          }}>
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-text-dim)",
              width: 20,
              flexShrink: 0,
            }}>{item.step}</span>
            <span style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text)",
              width: 140,
              flexShrink: 0,
            }}>{item.action}</span>
            <span style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-secondary)",
              flex: 1,
            }}>{item.desc}</span>
          </div>
        ))}
      </div>

      {/* ═══ Layer 2: Capabilities ═══ */}
      <SectionDivider label="What It Does" />
      <div>
        {MANUAL_BLUEPRINT.map((item) => (
          <div key={item.num}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--space-3)",
              padding: "var(--space-2) 0",
              borderBottom: "1px solid var(--color-border-light)",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-dim)",
                width: 20,
                flexShrink: 0,
              }}>{item.num}</span>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-bold)",
                letterSpacing: "var(--letter-spacing-wider)",
                color: "var(--color-text)",
                width: 80,
                flexShrink: 0,
              }}>{item.label}</span>
              <span style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-secondary)",
                flex: 1,
              }}>{item.desc}</span>
            </div>
            {item.examples && (
              <div style={{
                paddingLeft: 103,
                paddingBottom: "var(--space-1)",
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-1) var(--space-3)",
              }}>
                {item.examples.map((ex, i) => (
                  <span key={i} style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                  }}>{ex}</span>
                ))}
              </div>
            )}
            {item.vaultModes && (
              <div style={{
                paddingLeft: 103,
                paddingBottom: "var(--space-2)",
                paddingTop: "var(--space-1)",
                display: "flex",
                gap: "var(--space-2)",
              }}>
                {[
                  { label: "LOCAL", sub: "browser only" },
                  { label: "ENCRYPTED", sub: "sync + pass" },
                  { label: "MANAGED", sub: "f\u00fclkit" },
                ].map((mode) => (
                  <div key={mode.label} style={{
                    border: "1px solid var(--color-border)",
                    padding: "var(--space-1) var(--space-2)",
                    width: 90,
                    textAlign: "center",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--font-size-2xs)",
                      fontWeight: "var(--font-weight-bold)",
                      letterSpacing: "var(--letter-spacing-wider)",
                      color: "var(--color-text)",
                    }}>{mode.label}</div>
                    <div style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                    }}>{mode.sub}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ═══ Layer 3: Reference ═══ */}
      <SectionDivider label="Connect" right={`${connectedCount}/${ALL_INTEGRATIONS.length}`} />
      <div style={{
        overflow: "hidden",
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-light)",
      }}>
        {ALL_INTEGRATIONS.map((integration) => {
          const isConnected = connections[integration.id] || false;
          const isExpanded = expanded[integration.id] || false;
          const section = MANUAL_SECTIONS[integration.id];
          const cmdCount = section ? section.categories.reduce((sum, c) => sum + c.commands.length, 0) : 0;
          return (
            <div key={integration.id} style={{
              borderBottom: "1px solid var(--color-border-light)",
            }}>
              <button
                onClick={() => {
                  if (!isConnected || !section) return;
                  setExpanded(prev => prev[integration.id] ? {} : { [integration.id]: true });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  background: isExpanded ? "var(--color-bg-alt)" : "var(--color-bg-elevated)",
                  border: "none",
                  borderLeft: isExpanded ? "3px solid var(--color-text-muted)" : "3px solid transparent",
                  cursor: isConnected ? "pointer" : "default",
                  fontFamily: "var(--font-primary)",
                  borderRadius: 0,
                  transition: "background var(--duration-fast) var(--ease-default)",
                  opacity: isConnected ? 1 : 0.45,
                }}
              >
                <span style={{
                  width: 6, height: 6,
                  borderRadius: "var(--radius-full)",
                  background: isConnected ? "var(--color-text)" : "transparent",
                  border: isConnected ? "none" : "1px solid var(--color-text-dim)",
                  flexShrink: 0,
                }} />
                <span style={{ display: "flex", alignItems: "center", width: 16, height: 16 }}>
                  {SOURCE_LOGOS[integration.id]}
                </span>
                <span style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--color-text)",
                  width: 80,
                  flexShrink: 0,
                  textAlign: "left",
                }}>{integration.name}</span>
                <span style={{
                  fontSize: "var(--font-size-2xs)",
                  color: "var(--color-text-muted)",
                  flex: 1,
                  textAlign: "left",
                }}>{integration.summary}</span>
                {isConnected ? (
                  <>
                    <span style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                      fontFamily: "var(--font-mono)",
                    }}>{cmdCount}</span>
                    <ChevronRight size={12} style={{
                      color: "var(--color-text-dim)",
                      transform: isExpanded ? "rotate(90deg)" : "none",
                      transition: "transform 0.15s ease",
                    }} />
                  </>
                ) : (
                  <span style={{
                    fontSize: "var(--font-size-2xs)",
                    color: "var(--color-text-dim)",
                  }}>Connect &rarr;</span>
                )}
              </button>
              {isExpanded && section && (
                <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "var(--space-1) var(--space-3) var(--space-2)", background: "var(--color-surface)" }}>
                  {section.categories.map((cat, catIdx) => (
                    <div key={catIdx}>
                      <div style={{
                        fontSize: "var(--font-size-2xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        color: "var(--color-text-dim)",
                        padding: "var(--space-1) 0 2px",
                      }}>
                        {cat.label}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px var(--space-2)" }}>
                        {cat.commands.map((cmd, cmdIdx) => (
                          <div key={cmdIdx} style={{ padding: "2px 0" }}>
                            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text)", fontStyle: "italic" }}>
                              {`\u201C${cmd.example}\u201D`}
                            </div>
                            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                              {cmd.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Reference */}
      <SectionDivider label="Quick Reference" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2px var(--space-4)",
      }}>
        {QUICK_REFERENCE.flatMap((row, i) => [
          <span key={`l${i}`} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              padding: "2px 0",
            }}>{row.left}</span>,
          <span key={`r${i}`} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-2xs)",
              color: "var(--color-text-dim)",
              padding: "2px 0",
            }}>{row.right}</span>,
        ])}
      </div>
    </div>
  );
}

function AITab() {
  const { user, accessToken } = useAuth();
  const isDev = user?.isDev;
  const prefs = isDev ? PREFERENCES : [];

  // ─── BYOK state ──────────────────────────────────────────
  const [byokKey, setByokKey] = useState("");
  const [byokStatus, setByokStatus] = useState(null); // null | "loading" | "connected" | "error"
  const [byokError, setByokError] = useState(null);
  const [byokVerifying, setByokVerifying] = useState(false);

  useEffect(() => {
    if (!accessToken || isDev) return;
    fetch("/api/byok", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) setByokStatus("connected");
      })
      .catch(() => {});
  }, [accessToken, isDev]);

  async function handleByokConnect() {
    if (!byokKey.trim() || !accessToken) return;
    setByokVerifying(true);
    setByokError(null);
    try {
      const res = await fetch("/api/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ key: byokKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.connected) {
        setByokStatus("connected");
        setByokKey("");
      } else {
        setByokError(data.error || "Failed to connect");
      }
    } catch {
      setByokError("Connection failed");
    } finally {
      setByokVerifying(false);
    }
  }

  async function handleByokDisconnect() {
    if (!accessToken) return;
    try {
      await fetch("/api/byok", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setByokStatus(null);
    } catch {}
  }

  return (
    <div>
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
        <SectionTitle>Bring Your Own Key</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <Key size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              {byokStatus === "connected"
                ? "Connected. Burning your own Fül."
                : "Paste your Anthropic API key to unlock Opus and unlimited messages."}
            </div>
          </div>

          {byokStatus === "connected" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-text)" }} />
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)" }}>
                  Claude Opus 4.6
                </span>
                <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
                  128K output
                </span>
              </div>
              <button
                onClick={handleByokDisconnect}
                style={{
                  padding: "var(--space-1-5) var(--space-3)",
                  background: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  cursor: "pointer",
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
                <input
                  type="password"
                  value={byokKey}
                  onChange={(e) => setByokKey(e.target.value)}
                  placeholder="sk-ant-..."
                  onKeyDown={(e) => { if (e.key === "Enter") handleByokConnect(); }}
                  style={{
                    flex: 1,
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text)",
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleByokConnect}
                  disabled={!byokKey.trim() || byokVerifying}
                  style={{
                    padding: "var(--space-2) var(--space-4)",
                    background: byokKey.trim() ? "var(--color-accent)" : "var(--color-border-light)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text-inverse)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: "var(--font-primary)",
                    cursor: byokKey.trim() ? "pointer" : "default",
                    minWidth: 80,
                  }}
                >
                  {byokVerifying ? "..." : "Connect"}
                </button>
              </div>
              {byokError && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-error, #c44)", marginTop: "var(--space-2)" }}>
                  {byokError}
                </div>
              )}
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: "var(--space-2)" }}>
                Your key is stored encrypted and only used server-side. We never log it.
              </div>
            </div>
          )}
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
    <div>
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
  const seatType = isDev ? "standard" : (profile?.seat_type || "free");
  const seatLimit = SEAT_LIMITS[seatType] || 450;
  const messagesUsed = isDev ? 138 : (profile?.messages_this_month || 0);
  const remaining = seatLimit - messagesUsed;
  const gaugeLow = remaining <= Math.ceil(seatLimit * 0.1);
  const gaugeCapped = remaining <= 0;
  const gaugeColor = gaugeCapped ? "var(--color-error)" : gaugeLow ? "var(--color-warning)" : "var(--color-accent)";
  const PLAN_LABELS = { standard: "Standard", pro: "Pro", free: "Free" };
  const PLAN_PRICES = { standard: "$7/mo", pro: "$15/mo", free: "Free" };

  // Owner with own API key = unlimited
  if (!isDev && isOwner) {
    return (
      <div>
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
    <div>
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
            <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: gaugeCapped ? "var(--color-error)" : undefined }}>
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
                background: gaugeColor,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
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

function ConfirmDeleteModal({ type, onCancel, onConfirm, loading }) {
  const [confirmText, setConfirmText] = useState("");
  const isAccount = type === "account";
  const canConfirm = confirmText === "DELETE";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-6)",
          width: "100%",
          maxWidth: 400,
          margin: "0 var(--space-4)",
        }}
      >
        <div style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
          {isAccount ? "Delete your account" : "Delete all your data"}
        </div>
        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-relaxed)", marginBottom: "var(--space-4)" }}>
          {isAccount
            ? "This will permanently delete ALL your data AND your Fülkit account. You will be signed out and cannot recover this account."
            : "This will permanently delete all your notes, conversations, actions, memories, preferences, and integration connections. Your account will remain active but empty."}
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
          Type <span style={{ fontWeight: "var(--font-weight-semibold)" }}>DELETE</span> to confirm
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          style={{
            width: "100%",
            padding: "var(--space-2) var(--space-3)",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-primary)",
            marginBottom: "var(--space-4)",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
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
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || loading}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: "transparent",
              border: `1px solid ${canConfirm ? "var(--color-error)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-sm)",
              color: canConfirm ? "var(--color-error)" : "var(--color-text-dim)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: canConfirm && !loading ? "pointer" : "default",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Deleting..." : isAccount ? "Delete account" : "Delete everything"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrivacyTab() {
  const { user, accessToken, signOut } = useAuth();
  const isDev = user?.isDev;

  const [counts, setCounts] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const [loadingSection, setLoadingSection] = useState(null);
  const [deleteModalType, setDeleteModalType] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!user || isDev) return;

    async function fetchCounts() {
      const [notes, actions, conversations, prefsResult, notesContent, messagesContent] = await Promise.all([
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("actions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("preferences").select("key").eq("user_id", user.id),
        supabase.from("notes").select("content").eq("user_id", user.id),
        supabase.from("conversations").select("id").eq("user_id", user.id),
      ]);
      const allKeys = (prefsResult.data || []).map((p) => p.key);
      const memoryKeys = allKeys.filter((k) => k.startsWith("memory:"));
      const onboardingKeys = allKeys.filter((k) => ["tone", "frequency", "chronotype"].includes(k));

      // Estimate storage from note content + message content
      let storageBytes = 0;
      (notesContent.data || []).forEach((n) => { if (n.content) storageBytes += new Blob([n.content]).size; });

      // Fetch messages for user's conversations
      const convIds = (messagesContent.data || []).map((c) => c.id);
      if (convIds.length) {
        const { data: msgs } = await supabase.from("messages").select("content").in("conversation_id", convIds);
        (msgs || []).forEach((m) => { if (m.content) storageBytes += new Blob([m.content]).size; });
      }

      setCounts({
        notes: notes.count || 0,
        actions: actions.count || 0,
        conversations: conversations.count || 0,
        memories: memoryKeys.length,
        onboarding: onboardingKeys.length,
        storageBytes,
      });
    }
    fetchCounts();
  }, [user, isDev]);

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function relativeDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  async function loadSectionData(section) {
    if (sectionData[section]) return;
    setLoadingSection(section);

    if (section === "notes") {
      const { data } = await supabase
        .from("notes")
        .select("id, title, source, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSectionData((prev) => ({ ...prev, notes: data || [] }));
    }

    if (section === "conversations") {
      const { data } = await supabase
        .from("conversations")
        .select("id, title, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSectionData((prev) => ({ ...prev, conversations: data || [] }));
    }

    if (section === "memories") {
      const { data } = await supabase
        .from("preferences")
        .select("key, value, updated_at")
        .eq("user_id", user.id)
        .like("key", "memory:%");
      setSectionData((prev) => ({ ...prev, memories: data || [] }));
    }

    if (section === "onboarding") {
      const { data } = await supabase
        .from("preferences")
        .select("key, value, updated_at")
        .eq("user_id", user.id)
        .in("key", ["tone", "frequency", "chronotype"]);
      setSectionData((prev) => ({ ...prev, onboarding: data || [] }));
    }

    setLoadingSection(null);
  }

  function toggleSection(section) {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
      loadSectionData(section);
    }
  }

  async function forgetMemory(key) {
    await supabase.from("preferences").delete().eq("user_id", user.id).eq("key", key);
    setSectionData((prev) => ({
      ...prev,
      memories: (prev.memories || []).filter((m) => m.key !== key),
    }));
    setCounts((prev) => prev ? { ...prev, memories: Math.max(0, prev.memories - 1) } : prev);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const endpoint = deleteModalType === "account" ? "/api/account" : "/api/account/data";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      if (deleteModalType === "account") {
        setDeleteModalType(null);
        await signOut();
      } else {
        setDeleteModalType(null);
        setCounts({ notes: 0, actions: 0, conversations: 0, memories: 0, onboarding: 0 });
        setSectionData({});
        setExpandedSection(null);
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  const expandableRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-2-5) 0",
    borderBottom: "1px solid var(--color-border-light)",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--color-border-light)",
    width: "100%",
    textAlign: "left",
    fontFamily: "var(--font-primary)",
  };

  const itemRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-1-5) 0",
    borderBottom: "1px solid var(--color-border-light)",
    fontSize: "var(--font-size-xs)",
    color: "var(--color-text-muted)",
  };

  function pluralize(count, singular, plural) {
    return `${count} ${count === 1 ? singular : (plural || singular + "s")}`;
  }

  function renderExpandableRow(label, count, singular, section, plural) {
    const isOpen = expandedSection === section;
    const isLoading = loadingSection === section;
    const items = sectionData[section] || [];

    return (
      <div key={section}>
        <button onClick={() => toggleSection(section)} style={expandableRowStyle}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)" }}>
              {label}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
              {counts ? pluralize(count, singular, plural) : "Loading..."}
            </div>
          </div>
          <ChevronRight
            size={14}
            strokeWidth={2}
            style={{
              color: "var(--color-text-dim)",
              transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        </button>
        <Drawer open={isOpen}>
          <div style={{ maxHeight: 300, overflowY: "auto", padding: "var(--space-2) var(--space-1)" }}>
            {isLoading && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2) 0" }}>Loading...</div>
            )}
            {!isLoading && items.length === 0 && (
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", padding: "var(--space-2) 0" }}>Nothing here yet.</div>
            )}
            {!isLoading && section === "notes" && items.map((item) => (
              <div key={item.id} style={itemRowStyle}>
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "var(--space-2)" }}>
                  {(item.title || "Untitled").slice(0, 40)}
                </div>
                <div style={{ flexShrink: 0, display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                  {item.source && (
                    <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {item.source}
                    </span>
                  )}
                  <span style={{ color: "var(--color-text-dim)" }}>{relativeDate(item.created_at)}</span>
                </div>
              </div>
            ))}
            {!isLoading && section === "conversations" && items.map((item) => (
              <div key={item.id} style={itemRowStyle}>
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "var(--space-2)" }}>
                  {(item.title || "Untitled").slice(0, 50)}
                </div>
                <span style={{ flexShrink: 0, color: "var(--color-text-dim)" }}>{relativeDate(item.created_at)}</span>
              </div>
            ))}
            {!isLoading && section === "memories" && items.map((item) => (
              <div key={item.key} style={itemRowStyle}>
                <div style={{ flex: 1, overflow: "hidden", marginRight: "var(--space-2)" }}>
                  <span style={{ fontWeight: "var(--font-weight-medium)", color: "var(--color-text-secondary)" }}>
                    {item.key.replace("memory:", "")}
                  </span>
                  <span style={{ marginLeft: "var(--space-2)", color: "var(--color-text-dim)" }}>
                    {(item.value || "").slice(0, 60)}{item.value?.length > 60 ? "..." : ""}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); forgetMemory(item.key); }}
                  style={{
                    flexShrink: 0,
                    padding: "2px var(--space-2)",
                    background: "transparent",
                    border: "1px solid var(--color-error-soft)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-error)",
                    fontSize: "var(--font-size-2xs)",
                    fontFamily: "var(--font-primary)",
                    cursor: "pointer",
                  }}
                >
                  Forget
                </button>
              </div>
            ))}
            {!isLoading && section === "onboarding" && items.map((item) => (
              <div key={item.key} style={itemRowStyle}>
                <span style={{ fontWeight: "var(--font-weight-medium)", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                  {item.key}
                </span>
                <span style={{ color: "var(--color-text-dim)" }}>{item.value}</span>
              </div>
            ))}
            {!isLoading && section === "onboarding" && items.length > 0 && (
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", padding: "var(--space-2) 0", fontStyle: "italic" }}>
                Re-take onboarding to change these.
              </div>
            )}
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle>Your data</SectionTitle>
      <Card>
        {isDev ? (
          <>
            <Row label="Notes stored" value="1,247 notes across 4 sources" />
            <Row label="AI conversations" value="34 conversations" />
            <Row label="Memories" value="12 memories" />
            <Row label="Onboarding answers" value="3 answers" />
            <Row label="Action items" value="18 actions tracked" />
            <Row label="Storage used" value="12.4 MB" />
          </>
        ) : (
          <>
            {renderExpandableRow("Notes stored", counts?.notes, "note", "notes")}
            {renderExpandableRow("Conversations", counts?.conversations, "conversation", "conversations")}
            {renderExpandableRow("Memories", counts?.memories, "memory", "memories", "memories")}
            {renderExpandableRow("Onboarding answers", counts?.onboarding, "answer", "onboarding")}
            <Row label="Action items" value={counts ? `${counts.actions} action${counts.actions !== 1 ? "s" : ""}` : "Loading..."} />
            <Row label="Storage used" value={counts ? formatBytes(counts.storageBytes) : "Loading..."} />
          </>
        )}
      </Card>

      <div style={{ marginTop: "var(--space-8)" }}>
        <SectionTitle>Export</SectionTitle>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
            <Download size={16} strokeWidth={1.8} style={{ color: "var(--color-text-muted)" }} />
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              Export everything as JSON. No lock-in, ever.
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                if (!accessToken) return;
                const res = await fetch("/api/export", { headers: { Authorization: `Bearer ${accessToken}` } });
                const data = await res.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `fulkit-vault-${new Date().toISOString().split("T")[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {}
            }}
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
            action={() => setDeleteModalType("all-data")}
            danger
          />
          <Row
            label="Delete account"
            value="Cancel subscription and remove your account."
            actionLabel="Delete account"
            action={() => setDeleteModalType("account")}
            danger
          />
        </Card>
      </div>

      {deleteModalType && (
        <ConfirmDeleteModal
          type={deleteModalType}
          onCancel={() => { setDeleteModalType(null); setDeleteError(null); }}
          onConfirm={handleDelete}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
