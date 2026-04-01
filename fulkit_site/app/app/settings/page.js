"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
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
  Bug,
  ChevronDown,
  Ticket,
} from "lucide-react";
// Sidebar + header provided by AppShell in layout
import AuthGuard from "../../components/AuthGuard";
import { useToolbar } from "../../components/AppShell";
import { useTrack } from "../../lib/track";
import { useOnboardingTrigger } from "../../lib/onboarding-triggers";
import StorageModeSelector from "../../components/StorageModeSelector";
import Tooltip from "../../components/Tooltip";
import { useAuth } from "../../lib/auth";
import { OwnerPanel } from "../owner/page";

const TAB_ICON_SIZE = 16;
import { useVaultContext } from "../../lib/vault";
import { supabase } from "../../lib/supabase";
import { TIERS, SEAT_LIMITS, PLAN_LABELS, PLAN_PRICES, CREDITS, REFERRALS } from "../../lib/ful-config";
import { useIsMobile } from "../../lib/use-mobile";
import Skeleton, { SettingsSkeleton } from "../../components/Skeleton";

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
  apple_music: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3" fill="currentColor" stroke="none"/>
      <circle cx="18" cy="16" r="3" fill="currentColor" stroke="none"/>
      <path d="M9 5l12-2"/>
    </svg>
  ),
  sonos: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.5 4C4.01 4 2 6.01 2 8.5v7C2 17.99 4.01 20 6.5 20h11c2.49 0 4.5-2.01 4.5-4.5v-7C22 6.01 19.99 4 17.5 4h-11zM8 9.5c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5h-2a.5.5 0 01-.5-.5v-5zm5 0c0-.28.22-.5.5-.5h2c.28 0 .5.22.5.5v5c0 .28-.22.5-.5.5h-2a.5.5 0 01-.5-.5v-5z"/>
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
  quickbooks: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="12" r="10" opacity="0.15"/>
      <path d="M8.5 7C6.57 7 5 8.57 5 10.5v3C5 15.43 6.57 17 8.5 17H10v-1.5H8.5c-1.1 0-2-.9-2-2v-3c0-1.1.9-2 2-2H10v4.5l3-3-3-3V7H8.5zm7 0H14v1.5h1.5c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2H14v-4.5l-3 3 3 3V17h1.5c1.93 0 3.5-1.57 3.5-3.5v-3C19 8.57 17.43 7 15.5 7z"/>
    </svg>
  ),
  fitbit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="3.5" r="1.8" opacity="0.4"/>
      <circle cx="12" cy="8.5" r="2.2" opacity="0.6"/>
      <circle cx="12" cy="14" r="2.5"/>
      <circle cx="12" cy="19.5" r="2.2" opacity="0.6"/>
      <circle cx="6.5" cy="11" r="1.8" opacity="0.5"/>
      <circle cx="17.5" cy="11" r="1.8" opacity="0.5"/>
    </svg>
  ),
  strava: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12,4 6,20 9.6,20 12,14.4 14.4,20 18,20" opacity="0.5"/>
      <polygon points="12,10 14.4,20 18,20 12,4" />
    </svg>
  ),
  whoop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M2 7l3.5 10h1.5L9.5 10 12 17h1.5L16 10l2.5 7H20L22 7h-2.5l-1.5 6-2.5-6h-1.5L12 13 9.5 7H8L5.5 13 4 7H2z"/>
    </svg>
  ),
  oura: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="8"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  strava: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" opacity="0.6"/>
      <path d="M7.578 13.828L12.298 4l4.722 9.828H14.93L12.298 8.46l-2.632 5.368H7.578z"/>
    </svg>
  ),
  garmin: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2L3 20h4l5-12 5 12h4L12 2z"/>
    </svg>
  ),
  asana: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="6" r="4.5"/>
      <circle cx="5.5" cy="16.5" r="4.5"/>
      <circle cx="18.5" cy="16.5" r="4.5"/>
    </svg>
  ),
  monday: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="4.5" cy="17" r="3"/>
      <circle cx="12" cy="17" r="3"/>
      <ellipse cx="4.5" cy="10" rx="3" ry="5"/>
      <ellipse cx="12" cy="10" rx="3" ry="5"/>
      <ellipse cx="19.5" cy="12" rx="3" ry="7"/>
    </svg>
  ),
  linear: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M3.35 14.57l6.08 6.08C5.23 20.19 2 16.2 2 12c0-.43.03-.86.08-1.28l1.27 1.27V14.57zm1.49 2.71l2.21 2.21C6.04 18.77 5.15 17.95 4.84 17.28zm3.71 3.07l1.2 1.2c-.21-.02-.42-.05-.63-.09l-.57-.57V20.35zm2.29 1.37l.63.28c-.21 0-.42-.01-.63-.03v-.25zm1.5.34c.22-.01.44-.03.65-.06l-1.15-1.15.5.5v.71zm1.7-.3c.23-.06.45-.13.67-.21l-2.37-2.37 1.7 1.7v.88zm1.69-.71c.21-.1.42-.21.62-.33l-3.52-3.52 2.9 2.9v.95zm1.53-1.03c.19-.13.37-.27.55-.42l-4.55-4.55 4 4v.97zm1.32-1.27c.16-.16.32-.33.47-.5l-5.47-5.47 5 5v.97zm1.06-1.52c.13-.19.25-.38.36-.58L14.53 9.53 20 15v.57zm.74-1.73c.08-.21.16-.43.23-.65l-6.76-6.76L19 12.14v1.4zM21.53 12c0-.22-.02-.44-.04-.65L15 4.87 19.63 9.5c.18.18.36.36.52.55l1.27 1.27c.07.42.11.85.11 1.28 0 .14 0 .28-.01.42"/>
    </svg>
  ),
};

const SUGGESTED_SOURCES = [];

const REAL_INTEGRATIONS = ["github", "fabric", "sonos", "numbrly", "truegauge", "square", "shopify", "stripe", "toast", "trello", "fitbit", "strava", "quickbooks", "obsidian", "notion", "dropbox", "slack", "onenote", "todoist", "readwise", "asana", "monday", "linear", "apple_music"];

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
    description: "Spotify connects your library, playlists, and playback to Fabric. Search your music, control what\u2019s playing, build sets, and let B-Side recommend tracks based on what you actually listen to \u2014 not an algorithm.",
    gives: "Now playing, recently played, your full playlist library, playback controls (play, pause, skip, volume), and listening history for B-Side recommendations. Everything runs through Fabric.",
    tryPrompt: "What\u2019s playing right now?\u201D\n\u201CPlay something chill\u201D\n\u201CShow me my playlists\u201D\n\u201CWhat have I been listening to lately?",
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
  dropbox: {
    subtitle: "Your files, connected.",
    description: "Dropbox stores your documents, spreadsheets, and files in the cloud. Connecting it means F\u00FClkit can search your files, read their content, and surface what you need in conversation \u2014 without opening Dropbox. Note: Dropbox may show a security warning during connect \u2014 this is normal for new apps and disappears once our verification is approved.",
    gives: "File search across your entire Dropbox, read text-based files (markdown, code, CSVs), and surface content in chat. Ask about a file and get what\u2019s in it.",
    tryPrompt: "Find my budget spreadsheet in Dropbox\u201D\n\u201CWhat\u2019s in my project folder?",
    linkLabel: "dropbox.com",
    linkHref: "https://dropbox.com",
  },
  slack: {
    subtitle: "Your team chat, in context.",
    description: "Slack is where your team talks. Connecting it means F\u00FClkit can search messages, browse channels, and surface conversations \u2014 so you can reference what was said without scrolling through threads.",
    gives: "Message search across all channels, channel listing, and recent conversation history. Ask what the team discussed and get real answers.",
    tryPrompt: "What did the team say about the launch?\u201D\n\u201CShow me recent messages in #general",
    linkLabel: "slack.com",
    linkHref: "https://slack.com",
  },
  notion: {
    subtitle: "Your workspace, connected.",
    description: "Notion holds your pages, databases, wikis, and docs. Connecting it means F\u00FClkit can search your workspace, read page content, and import pages into your vault \u2014 so your Notion knowledge is accessible in chat without switching apps.",
    gives: "Search across all pages and databases, read full page content, and import pages as Fulkit notes. Ask about anything in your Notion workspace.",
    tryPrompt: "What\u2019s in my Notion workspace about onboarding?\u201D\n\u201CImport my meeting notes from Notion",
    linkLabel: "notion.so",
    linkHref: "https://notion.so",
  },
  onenote: {
    subtitle: "Your notebooks, connected.",
    description: "OneNote organizes your notes into notebooks, sections, and pages. Connecting it means F\u00FClkit can browse your notebooks, read page content, and surface your notes in conversation \u2014 so your Microsoft notes are accessible alongside everything else.",
    gives: "Notebook and section listing, full page content, and note search. Ask about anything in your OneNote and get real answers.",
    tryPrompt: "What\u2019s in my work notebook?\u201D\n\u201CRead my meeting notes from last week",
    linkLabel: "onenote.com",
    linkHref: "https://www.onenote.com",
  },
  todoist: {
    subtitle: "Your tasks, connected.",
    description: "Todoist tracks your tasks, projects, and priorities. Connecting it means F\u00FClkit sees what\u2019s on your plate \u2014 due dates, labels, projects \u2014 and can help you plan around what actually needs to get done.",
    gives: "Active tasks with due dates, priorities, and labels. Project listing. Ask what\u2019s due or what you need to focus on and get a real answer.",
    tryPrompt: "What\u2019s due today?\u201D\n\u201CShow me all high-priority tasks",
    linkLabel: "todoist.com",
    linkHref: "https://todoist.com",
  },
  readwise: {
    subtitle: "Your highlights, connected.",
    description: "Readwise collects your highlights and annotations from Kindle, articles, podcasts, and more. Connecting it means F\u00FClkit can surface what you\u2019ve underlined, noted, and saved \u2014 so your reading becomes part of every conversation.",
    gives: "Highlights and annotations from books, articles, and podcasts. Book and source listing. Ask about what you\u2019ve read and get your own words back.",
    tryPrompt: "What did I highlight in Atomic Habits?\u201D\n\u201CShow me my recent reading highlights",
    linkLabel: "readwise.io",
    linkHref: "https://readwise.io",
  },
  obsidian: {
    subtitle: "Your vault, imported.",
    description: "Obsidian stores your notes as plain markdown files in a local folder. Connecting it means F\u00FClkit reads your entire vault \u2014 every folder, every note \u2014 and imports them so they\u2019re searchable in chat. Your folder structure is preserved.",
    gives: "All your Obsidian notes imported as searchable Fulkit notes. Folder structure maps to vault folders. Ask about anything you\u2019ve written and get real answers grounded in your own words.",
    tryPrompt: "What did I write about project planning?\u201D\n\u201CFind my notes on that book I read",
    linkLabel: "obsidian.md",
    linkHref: "https://obsidian.md",
  },
  quickbooks: {
    subtitle: "Your books, in context.",
    description: "QuickBooks tracks your invoices, expenses, customers, and financial reports. Connecting it means F\u00FClkit sees your P&L, outstanding invoices, and cash position \u2014 so you can ask about your business finances in plain English instead of digging through reports.",
    gives: "Profit & Loss statements, balance sheets, invoice status (open, paid, overdue), recent expenses, and customer balances. Ask how the business is doing and get real numbers.",
    tryPrompt: "What\u2019s my P&L this month?\u201D\n\u201CWho owes me money?",
    linkLabel: "quickbooks.intuit.com",
    linkHref: "https://quickbooks.intuit.com",
  },
  sonos: {
    subtitle: "Your speakers, connected.",
    description: "Sonos plays music through every room in your home. Connecting it means Fabric can pick which speakers to play on, control volume per room, and group rooms together \u2014 all without opening the Sonos app. Requires a connected music source like Spotify or Apple Music.",
    gives: "Room selection, speaker grouping, per-room volume, and playback control across your entire Sonos system. Tell B-Side where to play and he\u2019ll route it.",
    tryPrompt: "Play this in the living room\u201D\n\u201CVolume to 40 in the kitchen\u201D\n\u201CPlay everywhere\u201D\n\u201CWhat rooms do I have?",
    linkLabel: "sonos.com",
    linkHref: "https://www.sonos.com",
  },
  fitbit: {
    subtitle: "Your body, in context.",
    description: "Fitbit tracks your activity, sleep, heart rate, and weight every day. Connecting it means F\u00FClkit sees how you slept, how active you were, and how your body is trending \u2014 so it can help you plan around your energy, not just your calendar.",
    gives: "Daily activity (steps, calories, active minutes), sleep stages and efficiency, resting heart rate, heart rate zones, and weight trends. Ask how you slept or how active you\u2019ve been and get real numbers.",
    tryPrompt: "How did I sleep last night?\u201D\n\u201CHow many steps this week?",
    linkLabel: "fitbit.com",
    linkHref: "https://www.fitbit.com",
  },
  linear: {
    subtitle: "Your issues, in context.",
    description: "Linear tracks your team\u2019s issues, projects, and cycles. Connecting it means F\u00FClkit sees your tickets, sprint progress, and blockers \u2014 so you can ask about what\u2019s in flight without opening another tab.",
    gives: "Issue search, project listing, cycle progress, assigned tickets, and blocker tracking. Ask what\u2019s due or what\u2019s blocking and get real answers.",
    tryPrompt: "What\u2019s assigned to me?\u201D\n\u201CShow me open bugs\u201D\n\u201CWhat\u2019s blocking the release?",
    linkLabel: "linear.app",
    linkHref: "https://linear.app",
  },
  apple_music: {
    subtitle: "Your library, your way.",
    description: "Apple Music brings your full library, playlists, and Apple-curated content into Fabric. Search, play, and build sets from your Apple Music catalog alongside Spotify and YouTube \u2014 all in one place.",
    gives: "Full library access, playlist browsing, search across Apple\u2019s 100M+ song catalog, and playback control. Everything routes through Fabric.",
    tryPrompt: "Play my Apple Music library\u201D\n\u201CSearch Apple Music for Radiohead\u201D\n\u201CShow me my Apple playlists",
    linkLabel: "apple.com/apple-music",
    linkHref: "https://www.apple.com/apple-music/",
  },
  strava: {
    subtitle: "Your training, in context.",
    description: "Strava tracks your runs, rides, swims, and workouts with GPS, pace, heart rate, and elevation. Connecting it means F\u00FClkit sees your training history and can help you plan around your fitness, track progress, and spot trends.",
    gives: "Recent activities with distance, pace, splits, heart rate, elevation gain, and suffer score. All-time and year-to-date stats across runs, rides, and swims. Ask about your last run or how your training is going.",
    tryPrompt: "\u201CHow was my last run?\u201D\n\u201CWhat's my mileage this year?\u201D",
    linkLabel: "strava.com",
    linkHref: "https://www.strava.com",
  },
  asana: {
    subtitle: "Your tasks, organized.",
    description: "Asana tracks projects, tasks, and subtasks across your team. Connecting it means F\u00FClkit can see what\u2019s assigned to you, what\u2019s due, and where things stand \u2014 so you can manage work without switching tabs.",
    gives: "Project listing, task search by name or status, assignee info, due dates, and the ability to create tasks directly from chat.",
    tryPrompt: "\u201CWhat\u2019s assigned to me?\u201D\n\u201CShow my Asana projects\u201D\n\u201CCreate a task: review Q2 deck, due Friday\u201D",
    linkLabel: "asana.com",
    linkHref: "https://asana.com",
  },
  monday: {
    subtitle: "Your boards, connected.",
    description: "monday.com is a work OS where teams manage projects on customizable boards with columns, groups, and automations. Connecting it means F\u00FClkit sees your boards and items \u2014 ask about status, create items, or get a pulse on what\u2019s moving.",
    gives: "Board listing, item search with column values and status, group info, and the ability to create items from chat.",
    tryPrompt: "\u201CShow my monday boards\u201D\n\u201CWhat\u2019s on the sprint board?\u201D\n\u201CCreate an item: deploy hotfix\u201D",
    linkLabel: "monday.com",
    linkHref: "https://monday.com",
  },
  linear: {
    subtitle: "Your issues, in the conversation.",
    description: "Linear tracks issues, sprints, and cycles for dev teams. Connecting it means F\u00FClkit can see your backlog, search issues, and create new ones \u2014 without switching tabs.",
    gives: "Team listing, issue search by status, assignee, or keyword, priority and label info, and the ability to create issues from chat.",
    tryPrompt: "\u201CWhat issues are assigned to me?\u201D\n\u201CShow the backlog\u201D\n\u201CCreate a bug: login redirect fails on Safari\u201D",
    linkLabel: "linear.app",
    linkHref: "https://linear.app",
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
  { id: "sonos", name: "Sonos", cat: "Speakers" },
  { id: "numbrly", name: "Numbrly", cat: "Small Business" },
  { id: "truegauge", name: "TrueGauge", cat: "Profitability Analytics" },
  { id: "obsidian", name: "Obsidian", cat: "Notes" },
  { id: "google", name: "Google", cat: "Account" },
  { id: "notion", name: "Notion", cat: "Notes" },
  { id: "dropbox", name: "Dropbox", cat: "Files" },
  { id: "onenote", name: "OneNote", cat: "Notes" },
  { id: "slack", name: "Slack", cat: "Chat" },
  { id: "readwise", name: "Readwise", cat: "Reading" },
  { id: "todoist", name: "Todoist", cat: "Tasks" },
  { id: "asana", name: "Asana", cat: "Project Management" },
  { id: "monday", name: "monday.com", cat: "Work Management" },
  { id: "apple_music", name: "Apple Music", cat: "Media" },
  { id: "linear", name: "Linear", cat: "Dev" },
  { id: "quickbooks", name: "QuickBooks", cat: "Accounting" },
  { id: "whoop", name: "Whoop", cat: "Health" },
  { id: "fitbit", name: "Fitbit", cat: "Health" },
  { id: "strava", name: "Strava", cat: "Health" },
  { id: "oura", name: "Oura", cat: "Health" },
  { id: "garmin", name: "Garmin", cat: "Health" },
];


export default function Settings({ initialTab = "account", initialOwnerTab }) {
  const { compactMode, isOwner, profile } = useAuth();
  const isMobile = useIsMobile();
  const { setToolbar } = useToolbar();
  const track = useTrack();
  useEffect(() => { track("page_view", { feature: "settings" }); }, []);
  useOnboardingTrigger("settings");
  const tabs = isOwner ? [...TABS, { id: "owner", label: "Owner", icon: Crown }] : TABS;
  const [tab, setTab] = useState(initialTab);
  const [ownerMayday, setOwnerMayday] = useState(false);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // ─── Toolbar (mobile owner Crown button) ────────────────
  useEffect(() => {
    return () => setToolbar(null);
  }, [setToolbar]);

  useLayoutEffect(() => {
    if (isMobile && isOwner) {
      setToolbar(
        <button
          onClick={() => { setTab("owner"); window.history.replaceState({}, "", "/settings/owner"); }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            background: tab === "owner" ? "var(--color-bg-alt)" : "none",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            color: tab === "owner" ? "var(--color-text)" : "var(--color-text-muted)",
            position: "relative",
          }}
        >
          <Crown size={14} strokeWidth={1.8} />
          {ownerMayday && (
            <span style={{
              position: "absolute", top: 6, right: 6,
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--color-error, #e53e3e)",
            }} />
          )}
        </button>
      );
    } else {
      setToolbar(null);
    }
  }, [isMobile, isOwner, tab, ownerMayday, setToolbar]);

  if (!profile) {
    return <AuthGuard><SettingsSkeleton /></AuthGuard>;
  }

  return (
    <AuthGuard>
        {/* Horizontal tab bar */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? 0 : "var(--space-1)",
            padding: isMobile ? 0 : "0 var(--space-6)",
            borderBottom: "1px solid var(--color-border-light)",
            justifyContent: isMobile ? "space-around" : "flex-start",
          }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            const hiddenOnMobile = t.id === "owner" && isMobile;
            return (
              <Tooltip key={t.id} label={t.label} position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    window.history.replaceState({}, "", `/settings/${t.id}`);
                  }}
                  style={{
                    display: hiddenOnMobile ? "none" : "flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: isMobile ? "var(--space-3) var(--space-3)" : "var(--space-2-5) var(--space-3)",
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
                    transition: `background var(--duration-fast) var(--ease-default), color var(--duration-fast) var(--ease-default)`,
                  }}
                >
                  <t.icon size={isMobile ? 20 : TAB_ICON_SIZE} strokeWidth={1.8} style={{ pointerEvents: "none" }} />
                  {!compactMode && !isMobile && t.label}
                  {t.id === "owner" && ownerMayday && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--color-error, #e53e3e)",
                      flexShrink: 0, marginLeft: compactMode ? 0 : 2,
                    }} />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: tab === "owner" ? 0 : isMobile ? "var(--space-4) var(--space-3) var(--space-6)" : "var(--space-4) var(--space-6) var(--space-6)" }}>
            {tab === "account" && <AccountTab />}
            {tab === "sources" && <SourcesTab />}
            {tab === "manual" && <ManualTab />}
            {tab === "vault" && <VaultTab />}
            {tab === "ai" && <AITab />}
            {tab === "referrals" && <ReferralsTab />}
            {tab === "billing" && <BillingTab />}
            {tab === "privacy" && <PrivacyTab />}
            {tab === "owner" && isOwner && <OwnerPanel initialTab={initialOwnerTab} urlPrefix="/settings/owner" onMayday={setOwnerMayday} />}
          </div>

        {/* Footer — pinned to bottom, consistent across all tabs */}
        {tab !== "owner" && <SettingsFooter />}
    </AuthGuard>
  );
}

/* ─── Settings Footer ─── */

function SettingsFooter() {
  const { authFetch } = useAuth();
  const [bugOpen, setBugOpen] = useState(false);
  const [bugText, setBugText] = useState("");
  const [bugSending, setBugSending] = useState(false);
  const [bugSent, setBugSent] = useState(false);
  const bugRef = useRef(null);

  useEffect(() => {
    if (bugOpen && bugRef.current) bugRef.current.focus();
  }, [bugOpen]);

  useEffect(() => {
    if (bugSent) {
      const t = setTimeout(() => { setBugSent(false); setBugOpen(false); }, 2000);
      return () => clearTimeout(t);
    }
  }, [bugSent]);

  const submitBug = async () => {
    if (!bugText.trim()) return;
    setBugSending(true);
    try {
      const res = await authFetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: bugText.trim(),
          category: "bug",
          page_url: window.location.href,
        }),
      });
      if (res.ok) {
        setBugText("");
        setBugSent(true);
      }
    } catch {}
    setBugSending(false);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bug report popover */}
      {bugOpen && !bugSent && (
        <div style={{
          position: "absolute", bottom: "100%", left: "var(--space-6)", right: "var(--space-6)",
          marginBottom: "var(--space-2)",
          background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)", padding: "var(--space-3)",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
        }}>
          <textarea
            ref={bugRef}
            value={bugText}
            onChange={e => setBugText(e.target.value)}
            placeholder="What's broken or weird?"
            rows={3}
            style={{
              width: "100%", resize: "none",
              padding: "var(--space-2)", background: "var(--color-bg)",
              border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-sm)", fontFamily: "var(--font-primary)",
              color: "var(--color-text)", outline: "none",
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitBug(); } }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--space-2)" }}>
            <button
              onClick={submitBug}
              disabled={!bugText.trim() || bugSending}
              style={{
                padding: "var(--space-1-5) var(--space-4)",
                background: bugText.trim() ? "var(--color-text)" : "var(--color-border-light)",
                color: bugText.trim() ? "var(--color-bg)" : "var(--color-text-dim)",
                border: "none", borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)",
                cursor: bugText.trim() ? "pointer" : "default",
              }}
            >
              {bugSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {bugSent && (
        <div style={{
          position: "absolute", bottom: "100%", left: "var(--space-6)",
          marginBottom: "var(--space-2)",
          fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)",
          fontStyle: "italic",
        }}>
          Sent — we'll look into it.
        </div>
      )}

      {/* Footer bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-4)",
        padding: "var(--space-3) var(--space-6)",
        borderTop: "1px solid var(--color-border-light)",
      }}>
        <Tooltip label="Bluesky">
          <a
            href="https://bsky.app/profile/fulkit.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", color: "var(--color-text-muted)", transition: "color var(--duration-fast) var(--ease-default)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
          >
            <svg width="14" height="14" viewBox="-40 -40 680 610" fill="none" stroke="currentColor" strokeWidth="48" strokeLinejoin="round"><path d="M135.72 44.03C202.22 93.87 273.6 195.84 300 249.49c26.4-53.65 97.78-155.62 164.28-205.46C528.48-5.63 600-23.38 600 76.55c0 19.97-11.43 167.83-18.14 191.85-23.37 83.61-108.73 104.96-183.56 92.06 131.03 22.37 164.28 96.41 92.29 170.46-136.76 140.65-196.66-35.27-211.97-80.34-2.53-7.46-3.71-10.95-3.62-7.98-.09-2.97-1.09.52-3.62 7.98-15.31 45.07-75.21 221-211.97 80.34-71.99-74.05-38.74-148.09 92.29-170.46-74.83 12.9-160.19-8.45-183.56-92.06C7.43 244.38-4 96.52-4 76.55-4-23.38 71.52-5.63 135.72 44.03z"/></svg>
          </a>
        </Tooltip>
        <Tooltip label="Instagram">
          <a
            href="https://instagram.com/getfulkit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", color: "var(--color-text-muted)", transition: "color var(--duration-fast) var(--ease-default)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-text)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-muted)"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
        </Tooltip>

        <Tooltip label="Report a bug">
          <button
            onClick={() => { setBugOpen(!bugOpen); setBugSent(false); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "var(--space-1)", display: "flex", alignItems: "center",
              color: bugOpen ? "var(--color-text)" : "var(--color-text-muted)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--color-text)"}
            onMouseLeave={e => { if (!bugOpen) e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <Bug size={13} strokeWidth={1.8} />
          </button>
        </Tooltip>
      </div>
    </div>
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
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.name || user?.user_metadata?.full_name || "");
  const [nameSaving, setNameSaving] = useState(false);
  const [smartThreads, setSmartThreads] = useState(true);
  const [autoArchive, setAutoArchive] = useState(true);
  const [smartOpen, setSmartOpen] = useState(false);

  // Load Smart Features preferences
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("preferences").select("key, value").eq("user_id", user.id)
      .in("key", ["smart_threads_enabled", "auto_archive_enabled"])
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          if (row.key === "smart_threads_enabled" && row.value === "false") setSmartThreads(false);
          if (row.key === "auto_archive_enabled" && row.value === "false") setAutoArchive(false);
        }
      });
  }, [user?.id]);

  async function togglePref(key, current, setter) {
    const newVal = !current;
    setter(newVal);
    await supabase.from("preferences").upsert({
      user_id: user.id, key, value: String(newVal), updated_at: new Date().toISOString(),
    }).catch(() => {});
  }

  async function saveName() {
    if (!accessToken || !nameValue.trim()) return;
    setNameSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (res.ok) setEditingName(false);
    } catch {} finally { setNameSaving(false); }
  }

  return (
    <div>
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: 4 }}>Name</div>
            {editingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  autoFocus
                  style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", padding: "var(--space-0.5) var(--space-1)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-bg)", color: "var(--color-text-primary)", outline: "none", width: "100%" }}
                />
                <button onClick={saveName} disabled={nameSaving} style={{ padding: "var(--space-0.5)", background: "none", border: "none", cursor: "pointer", color: "var(--color-success)", lineHeight: 0 }}><Check size={14} /></button>
                <button onClick={() => { setEditingName(false); setNameValue(profile?.name || user?.user_metadata?.full_name || ""); }} style={{ padding: "var(--space-0.5)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", lineHeight: 0 }}><X size={14} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{profile?.name || user?.user_metadata?.full_name || "—"}</span>
                <button onClick={() => setEditingName(true)} style={{ padding: "var(--space-0.5)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-dim)", lineHeight: 0, fontSize: "var(--font-size-2xs)" }}>edit</button>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{user?.email || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: 4 }}>Role</div>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)", fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>
              {isOwner && <Crown size={14} strokeWidth={2} color="var(--color-text)" />}
              {isOwner ? "Owner" : (profile?.role || "Member")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", marginBottom: 4 }}>Member since</div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{memberSince}</div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: "var(--space-8)" }}>
        <div style={{
          background: "var(--color-bg-elevated)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border-light)",
          overflow: "hidden",
        }}>
          <button
            onClick={() => setSmartOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              background: "none", border: "none", cursor: "pointer",
              padding: "var(--space-3) var(--space-4)",
              fontFamily: "var(--font-primary)",
            }}
          >
            <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", fontWeight: "var(--font-weight-semibold)" }}>
              Smart Features
            </span>
            <ChevronDown size={14} strokeWidth={2} style={{
              color: "var(--color-text-muted)", transition: "transform var(--duration-fast) var(--ease-default)",
              transform: smartOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }} />
          </button>
        {smartOpen && (
          <div style={{ padding: "0 var(--space-4) var(--space-4)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {[
                { key: "smart_threads_enabled", label: "Smart Threads", value: smartThreads, setter: setSmartThreads,
                  descOn: "F\u00FClkit extracts action items and decisions after longer conversations and saves them to Threads.",
                  descOff: "Threads are only created when you ask or add them yourself." },
                { key: "auto_archive_enabled", label: "Auto-archive", value: autoArchive, setter: setAutoArchive,
                  descOn: "Threads marked Done for 7+ days are automatically archived to keep your board clean.",
                  descOff: "Done threads stay on the board until you archive them." },
              ].map((feat) => (
                <div key={feat.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
                  <div>
                    <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{feat.label}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: 2 }}>
                      {feat.value ? feat.descOn : feat.descOff}
                    </div>
                  </div>
                  <button
                    onClick={() => togglePref(feat.key, feat.value, feat.setter)}
                    style={{
                      width: 32, height: 16, borderRadius: 8, border: "1px solid var(--color-border)", cursor: "pointer", flexShrink: 0,
                      background: feat.value ? "var(--color-text-muted)" : "var(--color-bg-alt)",
                      position: "relative", transition: "background var(--duration-fast) var(--ease-default)",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 2, left: feat.value ? 16 : 2,
                      width: 10, height: 10, borderRadius: "50%", background: "var(--color-bg)",
                      transition: "left var(--duration-fast) var(--ease-default)",
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

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
  const [connectError, setConnectError] = useState(null);
  const [connected, setConnected] = useState([]);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubActiveRepos, setGithubActiveRepos] = useState([]);
  const [githubDisconnecting, setGithubDisconnecting] = useState(false);
  const [githubExpanded, setGithubExpanded] = useState(false);
  const [githubSaving, setGithubSaving] = useState(false);
  const [fabricConnected, setFabricConnected] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [fabricDisconnecting, setFabricDisconnecting] = useState(false);
  const [fabricExpanded, setFabricExpanded] = useState(false);
  const [spotifySeats, setSpotifySeats] = useState(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
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

  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalExpanded, setGcalExpanded] = useState(false);
  const [gcalLastSynced, setGcalLastSynced] = useState(null);
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailDisconnecting, setGmailDisconnecting] = useState(false);

  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveDisconnecting, setGdriveDisconnecting] = useState(false);

  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [fitbitExpanded, setFitbitExpanded] = useState(false);
  const [fitbitLastSynced, setFitbitLastSynced] = useState(null);
  const [fitbitDisconnecting, setFitbitDisconnecting] = useState(false);
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaExpanded, setStravaExpanded] = useState(false);
  const [stravaLastSynced, setStravaLastSynced] = useState(null);
  const [stravaDisconnecting, setStravaDisconnecting] = useState(false);
  const [sonosConnected, setSonosConnected] = useState(false);
  const [sonosExpanded, setSonosExpanded] = useState(false);
  const [sonosLastSynced, setSonosLastSynced] = useState(null);
  const [sonosDisconnecting, setSonosDisconnecting] = useState(false);

  const [qbConnected, setQbConnected] = useState(false);
  const [qbExpanded, setQbExpanded] = useState(false);
  const [qbLastSynced, setQbLastSynced] = useState(null);
  const [qbDisconnecting, setQbDisconnecting] = useState(false);

  const [searchMore, setSearchMore] = useState("");
  const [waitlisted, setWaitlisted] = useState({});
  const [suggestInput, setSuggestInput] = useState("");
  const [suggestSent, setSuggestSent] = useState(false);

  const [readwiseConnected, setReadwiseConnected] = useState(false);
  const [readwiseExpanded, setReadwiseExpanded] = useState(false);
  const [readwiseDisconnecting, setReadwiseDisconnecting] = useState(false);
  const [readwiseKeyInput, setReadwiseKeyInput] = useState("");

  const [onenoteConnected, setOnenoteConnected] = useState(false);
  const [onenoteExpanded, setOnenoteExpanded] = useState(false);
  const [onenoteLastSynced, setOnenoteLastSynced] = useState(null);
  const [onenoteDisconnecting, setOnenoteDisconnecting] = useState(false);

  const [todoistConnected, setTodoistConnected] = useState(false);
  const [todoistExpanded, setTodoistExpanded] = useState(false);
  const [todoistLastSynced, setTodoistLastSynced] = useState(null);
  const [todoistDisconnecting, setTodoistDisconnecting] = useState(false);

  const [asanaConnected, setAsanaConnected] = useState(false);
  const [asanaExpanded, setAsanaExpanded] = useState(false);
  const [asanaLastSynced, setAsanaLastSynced] = useState(null);
  const [asanaDisconnecting, setAsanaDisconnecting] = useState(false);

  const [mondayConnected, setMondayConnected] = useState(false);
  const [linearConnected, setLinearConnected] = useState(false);
  const [mondayExpanded, setMondayExpanded] = useState(false);
  const [mondayLastSynced, setMondayLastSynced] = useState(null);
  const [linearExpanded, setLinearExpanded] = useState(false);
  const [linearLastSynced, setLinearLastSynced] = useState(null);
  const [mondayDisconnecting, setMondayDisconnecting] = useState(false);

  const [dropboxConnected, setDropboxConnected] = useState(false);
  const [dropboxExpanded, setDropboxExpanded] = useState(false);
  const [dropboxLastSynced, setDropboxLastSynced] = useState(null);
  const [dropboxDisconnecting, setDropboxDisconnecting] = useState(false);

  const [slackConnected, setSlackConnected] = useState(false);
  const [slackExpanded, setSlackExpanded] = useState(false);
  const [slackLastSynced, setSlackLastSynced] = useState(null);
  const [slackDisconnecting, setSlackDisconnecting] = useState(false);

  const [notionConnected, setNotionConnected] = useState(false);
  const [notionExpanded, setNotionExpanded] = useState(false);
  const [notionLastSynced, setNotionLastSynced] = useState(null);
  const [notionDisconnecting, setNotionDisconnecting] = useState(false);

  const [obsidianConnected, setObsidianConnected] = useState(false);
  const [obsidianExpanded, setObsidianExpanded] = useState(false);
  const [obsidianImporting, setObsidianImporting] = useState(false);
  const [obsidianCount, setObsidianCount] = useState(null);
  const [vaultCounts, setVaultCounts] = useState(null);

  // Fetch vault inventory counts
  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      supabase.from("notes").select("id", { count: "exact", head: true }),
      supabase.from("actions").select("id", { count: "exact", head: true }),
    ]).then(([n, a]) => {
      const nc = n.count || 0;
      const ac = a.count || 0;
      if (nc > 0 || ac > 0) setVaultCounts({ notes: nc, actions: ac });
    }).catch(() => {});
  }, [accessToken]);

  // Fetch repos and active state on mount
  useEffect(() => {
    if (!accessToken || !githubConnected) return;
    fetchGithubRepos();
  }, [githubConnected, accessToken]);

  // Refresh GitHub/Fabric status if we just came back from OAuth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected" && accessToken) {
      checkGitHub(accessToken);
    }
    if (params.get("sp") === "connected" && params.get("fprovider") !== "sonos") {
      setFabricConnected(true);
      setSpotifyConnected(true);
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
    if (params.get("gc") === "connected") {
      setGcalConnected(true);
    }
    if (params.get("gm") === "connected") {
      setGmailConnected(true);
    }
    if (params.get("gd") === "connected") {
      setGdriveConnected(true);
    }
    if (params.get("fb") === "connected") {
      setFitbitConnected(true);
    }
    if (params.get("strava") === "connected") {
      setStravaConnected(true);
    }
    if (params.get("sp") === "connected" && params.get("fprovider") === "sonos") {
      setSonosConnected(true);
    }
    if (params.get("qb") === "connected") {
      setQbConnected(true);
    }
    if (params.get("nt") === "connected") {
      setNotionConnected(true);
    }
    if (params.get("db") === "connected") {
      setDropboxConnected(true);
    }
    if (params.get("sl") === "connected") {
      setSlackConnected(true);
    }
    if (params.get("on") === "connected") {
      setOnenoteConnected(true);
    }
    if (params.get("td") === "connected") {
      setTodoistConnected(true);
    }
    // Check for OAuth errors
    const errorSources = ["gh", "sp", "sq", "shopify", "stripe", "toast", "trello", "gc", "gm", "gd", "fb", "qb", "nt", "db", "sl", "on", "td"];
    for (const src of errorSources) {
      if (params.get(src) === "error") {
        setConnectError(`Connection failed. Try again or check your ${src === "gh" ? "GitHub" : src === "sp" ? "Spotify" : src === "sq" ? "Square" : src === "gc" ? "Google Calendar" : src} account.`);
        const url = new URL(window.location);
        url.searchParams.delete(src);
        url.searchParams.delete("reason");
        window.history.replaceState({}, "", url);
        break;
      }
    }
  }, [accessToken, checkGitHub]);

  // Check all integration statuses in one batch (single effect, single Promise.all)
  const statusLoadedRef = useRef(false);
  const [statusReady, setStatusReady] = useState(false);
  useEffect(() => {
    if (!accessToken || statusLoadedRef.current) return;
    statusLoadedRef.current = true;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const check = (url) => fetch(url, { headers }).then(r => r.ok ? r.json() : null).catch(() => null);

    Promise.all([
      check("/api/fabric/status"),
      check("/api/numbrly/status"),
      check("/api/truegauge/status"),
      check("/api/square/status"),
      check("/api/shopify/status"),
      check("/api/stripe/status"),
      check("/api/toast/status"),
      check("/api/trello/status"),
      check("/api/google/calendar/status"),
      check("/api/google/gmail/status"),
      check("/api/google/drive/status"),
      check("/api/health/fitbit/status"),
      check("/api/health/strava/status"),
      check("/api/quickbooks/status"),
      check("/api/notion/status"),
      check("/api/dropbox/status"),
      check("/api/slack/status"),
      check("/api/onenote/status"),
      check("/api/todoist/status"),
      check("/api/readwise/status"),
      check("/api/asana/status"),
      check("/api/monday/status"),
      check("/api/linear/status"),
    ]).then(([fabric, numbrly, tg, square, shopify, stripe, toast, trello, gcal, gmail, gdrive, fitbit, strava, qb, notion, dropbox, slack, onenote, todoist, readwise, asana, monday, linear]) => {
      if (fabric) {
        setFabricConnected(fabric.connected);
        setSpotifyConnected(!!fabric.providers?.spotify);
        if (fabric.spotifySeats) setSpotifySeats(fabric.spotifySeats);
        if (fabric.providers?.sonos) setSonosConnected(true);
      }
      if (numbrly) { setNumbrlyConnected(numbrly.connected); if (numbrly.lastSynced) setNumbrlyLastSynced(numbrly.lastSynced); }
      if (tg) { setTgConnected(tg.connected); if (tg.lastSynced) setTgLastSynced(tg.lastSynced); }
      if (square) { setSquareConnected(square.connected); if (square.lastSynced) setSquareLastSynced(square.lastSynced); }
      if (shopify) { setShopifyConnected(shopify.connected); if (shopify.lastSynced) setShopifyLastSynced(shopify.lastSynced); }
      if (stripe) { setStripeConnected(stripe.connected); if (stripe.lastSynced) setStripeLastSynced(stripe.lastSynced); }
      if (toast) { setToastConnected(toast.connected); if (toast.lastSynced) setToastLastSynced(toast.lastSynced); }
      if (trello) { setTrelloConnected(trello.connected); if (trello.lastSynced) setTrelloLastSynced(trello.lastSynced); }
      if (gcal) { setGcalConnected(gcal.connected); if (gcal.lastSynced) setGcalLastSynced(gcal.lastSynced); }
      if (gmail) { setGmailConnected(gmail.connected); }
      if (gdrive) { setGdriveConnected(gdrive.connected); }
      if (fitbit) { setFitbitConnected(fitbit.connected); if (fitbit.lastSynced) setFitbitLastSynced(fitbit.lastSynced); }
      if (strava) { setStravaConnected(strava.connected); if (strava.lastSynced) setStravaLastSynced(strava.lastSynced); }
      if (qb) { setQbConnected(qb.connected); if (qb.lastSynced) setQbLastSynced(qb.lastSynced); }
      if (notion) { setNotionConnected(notion.connected); if (notion.lastSynced) setNotionLastSynced(notion.lastSynced); }
      if (dropbox) { setDropboxConnected(dropbox.connected); if (dropbox.lastSynced) setDropboxLastSynced(dropbox.lastSynced); }
      if (slack) { setSlackConnected(slack.connected); if (slack.lastSynced) setSlackLastSynced(slack.lastSynced); }
      if (onenote) { setOnenoteConnected(onenote.connected); if (onenote.lastSynced) setOnenoteLastSynced(onenote.lastSynced); }
      if (todoist) { setTodoistConnected(todoist.connected); if (todoist.lastSynced) setTodoistLastSynced(todoist.lastSynced); }
      if (readwise) { setReadwiseConnected(readwise.connected); }
      if (asana) { setAsanaConnected(asana.connected); if (asana.lastSynced) setAsanaLastSynced(asana.lastSynced); }
      if (monday) { setMondayConnected(monday.connected); if (monday.lastSynced) setMondayLastSynced(monday.lastSynced); }
      if (linear) { setLinearConnected(linear.connected); if (linear.lastSynced) setLinearLastSynced(linear.lastSynced); }
      setStatusReady(true);
    });
  }, [accessToken]);

  // Load waitlist entries
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("preferences").select("key, value").eq("user_id", user.id).like("key", "waitlist_%")
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        for (const row of data) map[row.key.replace("waitlist_", "")] = true;
        setWaitlisted(map);
      }).catch(() => {});
  }, [user?.id]);

  function joinWaitlist(providerId) {
    setWaitlisted((prev) => ({ ...prev, [providerId]: true }));
    if (user?.id) {
      supabase.from("preferences").upsert({
        user_id: user.id,
        key: `waitlist_${providerId}`,
        value: new Date().toISOString(),
      }, { onConflict: "user_id,key" }).then(() => {}).catch(() => {});
      // Also hit the waitlist API so the confirmation email fires
      if (accessToken) {
        fetch("/api/waitlist", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, category: providerId }),
        }).catch(() => {});
      }
    }
  }

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
    if (!accessToken) return;
    document.cookie = `gh_auth_token=${accessToken}; path=/; max-age=300; SameSite=Lax`;
    window.open("/api/github/connect", "_blank");
  }

  function connectFabric() {
    if (spotifySeats && spotifySeats.used >= spotifySeats.max) return;
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
      await fetch("/api/fabric/disconnect?provider=spotify", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "spotify" }),
      });
      setSpotifyConnected(false);
      setFabricConnected(false);
    } catch {}
    setFabricDisconnecting(false);
  }

  async function submitWaitlist() {
    if (!waitlistEmail.trim() || waitlistSubmitting) return;
    setWaitlistSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail.trim(), category: "spotify" }),
      });
      if (res.ok) setWaitlistDone(true);
    } catch {}
    setWaitlistSubmitting(false);
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

  function connectGcal() {
    if (accessToken) {
      window.open("/api/google/calendar/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/google/calendar/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectGcal() {
    setGcalDisconnecting(true);
    try {
      await fetch("/api/google/calendar/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setGcalConnected(false);
    } catch {}
    setGcalDisconnecting(false);
  }

  function connectGmail() {
    if (accessToken) {
      window.open("/api/google/gmail/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/google/gmail/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectGmail() {
    setGmailDisconnecting(true);
    try {
      await fetch("/api/google/gmail/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setGmailConnected(false);
    } catch {}
    setGmailDisconnecting(false);
  }

  function connectGdrive() {
    if (accessToken) {
      window.open("/api/google/drive/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/google/drive/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectGdrive() {
    setGdriveDisconnecting(true);
    try {
      await fetch("/api/google/drive/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setGdriveConnected(false);
    } catch {}
    setGdriveDisconnecting(false);
  }

  async function connectReadwise(key) {
    if (!key || !accessToken) return;
    const res = await fetch("/api/readwise/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ apiKey: key }),
    });
    if (res.ok) { setReadwiseConnected(true); setReadwiseKeyInput(""); }
  }
  async function disconnectReadwise() {
    setReadwiseDisconnecting(true);
    try { await fetch("/api/readwise/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setReadwiseConnected(false); } catch {}
    setReadwiseDisconnecting(false);
  }

  function connectOnenote() {
    if (accessToken) { window.open("/api/onenote/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/onenote/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectOnenote() {
    setOnenoteDisconnecting(true);
    try { await fetch("/api/onenote/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setOnenoteConnected(false); } catch {}
    setOnenoteDisconnecting(false);
  }

  function connectTodoist() {
    if (accessToken) { window.open("/api/todoist/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/todoist/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectTodoist() {
    setTodoistDisconnecting(true);
    try { await fetch("/api/todoist/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setTodoistConnected(false); } catch {}
    setTodoistDisconnecting(false);
  }

  function connectAsana() {
    if (accessToken) { window.open("/api/asana/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/asana/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectAsana() {
    setAsanaDisconnecting(true);
    try { await fetch("/api/asana/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setAsanaConnected(false); } catch {}
    setAsanaDisconnecting(false);
  }

  function connectMonday() {
    if (accessToken) { window.open("/api/monday/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/monday/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectMonday() {
    setMondayDisconnecting(true);
    try { await fetch("/api/monday/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setMondayConnected(false); } catch {}
    setMondayDisconnecting(false);
  }

  function connectLinear() {
    if (accessToken) { window.open("/api/linear/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/linear/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectLinear() {
    try { await fetch("/api/linear/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setLinearConnected(false); } catch {}
  }

  function connectDropbox() {
    if (accessToken) { window.open("/api/dropbox/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/dropbox/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectDropbox() {
    setDropboxDisconnecting(true);
    try { await fetch("/api/dropbox/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setDropboxConnected(false); } catch {}
    setDropboxDisconnecting(false);
  }

  function connectSlack() {
    if (accessToken) { window.open("/api/slack/connect?token=" + encodeURIComponent(accessToken), "_blank"); return; }
    supabase.auth.getSession().then(({ data }) => { const token = data?.session?.access_token; if (token) window.open("/api/slack/connect?token=" + encodeURIComponent(token), "_blank"); }).catch(() => {});
  }
  async function disconnectSlack() {
    setSlackDisconnecting(true);
    try { await fetch("/api/slack/disconnect", { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); setSlackConnected(false); } catch {}
    setSlackDisconnecting(false);
  }

  function connectNotion() {
    if (accessToken) {
      window.open("/api/notion/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/notion/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectNotion() {
    setNotionDisconnecting(true);
    try {
      await fetch("/api/notion/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setNotionConnected(false);
    } catch {}
    setNotionDisconnecting(false);
  }

  async function connectObsidian() {
    if (!("showDirectoryPicker" in window)) {
      alert("Your browser doesn\u2019t support folder access. Use Chrome, Edge, or Arc.");
      return;
    }
    try {
      setObsidianImporting(true);
      const handle = await window.showDirectoryPicker({ mode: "read" });

      // Recursively read all .md files
      const files = [];
      async function readDir(dirHandle, path = "") {
        for await (const [name, entry] of dirHandle.entries()) {
          if (name.startsWith(".")) continue; // skip hidden files/folders
          if (entry.kind === "directory") {
            await readDir(entry, path ? `${path}/${name}` : name);
          } else if (entry.kind === "file" && name.endsWith(".md")) {
            try {
              const file = await entry.getFile();
              const content = await file.text();
              if (content.trim().length === 0) continue;
              // Map folder to vault folder
              const topFolder = path.split("/")[0] || "00-INBOX";
              files.push({
                title: name.replace(/\.md$/, ""),
                content,
                source: "obsidian",
                folder: topFolder,
              });
            } catch { /* skip unreadable */ }
          }
        }
      }
      await readDir(handle);

      if (files.length === 0) {
        setObsidianImporting(false);
        return;
      }

      // Batch import in chunks of 50
      let imported = 0;
      for (let i = 0; i < files.length; i += 50) {
        const batch = files.slice(i, i + 50);
        const res = await fetch("/api/notes/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ notes: batch }),
        });
        if (res.ok) {
          const data = await res.json();
          imported += data.imported || 0;
        }
      }

      setObsidianCount(imported);
      setObsidianConnected(true);
    } catch (err) {
      if (err.name !== "AbortError") console.error("[obsidian]", err);
    }
    setObsidianImporting(false);
  }

  function disconnectObsidian() {
    setObsidianConnected(false);
    setObsidianCount(null);
  }

  function connectQB() {
    if (accessToken) {
      window.open("/api/quickbooks/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/quickbooks/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  async function disconnectQB() {
    setQbDisconnecting(true);
    try {
      await fetch("/api/quickbooks/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setQbConnected(false);
    } catch {}
    setQbDisconnecting(false);
  }

  function connectFitbit() {
    if (accessToken) {
      window.open("/api/health/fitbit/connect?token=" + encodeURIComponent(accessToken), "_blank");
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.open("/api/health/fitbit/connect?token=" + encodeURIComponent(token), "_blank");
      }
    }).catch(() => {});
  }

  function connectSonos() {
    if (accessToken) {
      window.location.href = "/api/fabric/connect?provider=sonos&token=" + encodeURIComponent(accessToken);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.location.href = "/api/fabric/connect?provider=sonos&token=" + encodeURIComponent(token);
      }
    }).catch(() => {});
  }

  async function disconnectFitbit() {
    setFitbitDisconnecting(true);
    try {
      await fetch("/api/health/fitbit/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setFitbitConnected(false);
    } catch {}
    setFitbitDisconnecting(false);
  }

  function connectStrava() {
    if (accessToken) {
      window.location.href = "/api/health/strava/connect?token=" + encodeURIComponent(accessToken);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (token) {
        window.location.href = "/api/health/strava/connect?token=" + encodeURIComponent(token);
      }
    }).catch(() => {});
  }

  async function disconnectStrava() {
    setStravaDisconnecting(true);
    try {
      await fetch("/api/health/strava/disconnect", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setStravaConnected(false);
    } catch {}
    setStravaDisconnecting(false);
  }

  async function disconnectSonos() {
    setSonosDisconnecting(true);
    try {
      await fetch("/api/fabric/disconnect?provider=sonos", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "sonos" }),
      });
      setSonosConnected(false);
    } catch {}
    setSonosDisconnecting(false);
  }

  const allConnected = [
    ...connected,
    ...(githubConnected ? ["github"] : []),
    ...(spotifyConnected ? ["fabric"] : []),
    ...(numbrlyConnected ? ["numbrly"] : []),
    ...(tgConnected ? ["truegauge"] : []),
    ...(squareConnected ? ["square"] : []),
    ...(shopifyConnected ? ["shopify"] : []),
    ...(stripeConnected ? ["stripe"] : []),
    ...(toastConnected ? ["toast"] : []),
    ...(trelloConnected ? ["trello"] : []),
    ...(fitbitConnected ? ["fitbit"] : []),
    ...(stravaConnected ? ["strava"] : []),
    ...(sonosConnected ? ["sonos"] : []),
    ...(qbConnected ? ["quickbooks"] : []),
    ...(obsidianConnected ? ["obsidian"] : []),
    ...(notionConnected ? ["notion"] : []),
    ...(dropboxConnected ? ["dropbox"] : []),
    ...(slackConnected ? ["slack"] : []),
    ...(onenoteConnected ? ["onenote"] : []),
    ...(todoistConnected ? ["todoist"] : []),
    ...(readwiseConnected ? ["readwise"] : []),
    ...(asanaConnected ? ["asana"] : []),
    ...(mondayConnected ? ["monday"] : []),
    ...(linearConnected ? ["linear"] : []),
  ];
  const CUSTOM_CARD_IDS = ["fabric", "github", "numbrly", "truegauge", "square", "shopify", "stripe", "toast", "trello", "fitbit", "strava", "sonos", "quickbooks", "obsidian", "notion", "dropbox", "slack", "onenote", "todoist", "readwise", "asana", "monday", "linear"];
  const connectedSources = ALL_SOURCES.filter((s) => allConnected.includes(s.id) && !CUSTOM_CARD_IDS.includes(s.id));
  const suggested = ALL_SOURCES.filter((s) => SUGGESTED_SOURCES.includes(s.id) && !allConnected.includes(s.id));
  const otherSources = ALL_SOURCES.filter(
    (s) => !allConnected.includes(s.id) && !SUGGESTED_SOURCES.includes(s.id) && !["numbrly", "truegauge", "google"].includes(s.id)
  );
  const moreCards = otherSources.filter((s) => REAL_INTEGRATIONS.includes(s.id) && SOURCE_DESCRIPTIONS[s.id]);
  const moreTiles = otherSources.filter((s) => !REAL_INTEGRATIONS.includes(s.id) || !SOURCE_DESCRIPTIONS[s.id]);

  const COMING_SOON = new Set(["apple_music"]);
  const connect = (id) => {
    if (COMING_SOON.has(id)) return; // Card visible, connect disabled
    if (id === "github") { connectGitHub(); return; }
    if (id === "fabric") { connectFabric(); return; }
    if (id === "numbrly") { setNumbrlyExpanded(true); return; }
    if (id === "truegauge") { setTgExpanded(true); return; }
    if (id === "square") { connectSquare(); return; }
    if (id === "shopify") { setShopifyExpanded(true); return; }
    if (id === "stripe") { connectStripe(); return; }
    if (id === "toast") { connectToast(); return; }
    if (id === "trello") { connectTrello(); return; }
    if (id === "fitbit") { connectFitbit(); return; }
    if (id === "strava") { connectStrava(); return; }
    if (id === "sonos") { connectSonos(); return; }
    if (id === "quickbooks") { connectQB(); return; }
    if (id === "obsidian") { connectObsidian(); return; }
    if (id === "notion") { connectNotion(); return; }
    if (id === "dropbox") { connectDropbox(); return; }
    if (id === "slack") { connectSlack(); return; }
    if (id === "onenote") { connectOnenote(); return; }
    if (id === "todoist") { connectTodoist(); return; }
    if (id === "asana") { connectAsana(); return; }
    if (id === "monday") { connectMonday(); return; }
    if (id === "linear") { connectLinear(); return; }
    if (id === "readwise") { setReadwiseExpanded(true); return; }
    setConnected((prev) => [...prev, id]);
  };
  const disconnectMap = {
    github: disconnectGitHub, fabric: disconnectFabric, numbrly: disconnectNumbrly,
    truegauge: disconnectTrueGauge, square: disconnectSquare, shopify: disconnectShopify,
    stripe: disconnectStripe, toast: disconnectToast, trello: disconnectTrello,
    fitbit: disconnectFitbit, strava: disconnectStrava, sonos: disconnectSonos,
    quickbooks: disconnectQB, obsidian: disconnectObsidian, notion: disconnectNotion,
    dropbox: disconnectDropbox, slack: disconnectSlack, onenote: disconnectOnenote,
    todoist: disconnectTodoist, readwise: disconnectReadwise,
    asana: disconnectAsana, monday: disconnectMonday, linear: disconnectLinear,
  };
  const disconnect = (id) => {
    // Show purge prompt instead of immediately disconnecting
    const fn = disconnectMap[id] || (() => setConnected((prev) => prev.filter((x) => x !== id)));
    setDisconnectConfirm({ id, onDisconnect: fn });
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
  const [disconnectConfirm, setDisconnectConfirm] = useState(null); // { id, onDisconnect }

  const disconnectFooter = (onClick, loading, sourceId) => {
    const isConfirming = disconnectConfirm?.id === sourceId;

    if (isConfirming) {
      return (
        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-relaxed)" }}>
            Disconnect this source? Your existing data (notes, conversations, history) stays unless you choose to purge.
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
            <button
              onClick={() => setDisconnectConfirm(null)}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => { setDisconnectConfirm(null); onClick(); }}
              disabled={loading}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer" }}
            >
              Disconnect, keep data
            </button>
            <button
              onClick={async () => {
                setDisconnectConfirm(null);
                // Purge integration-specific data, then disconnect
                try {
                  await fetch(`/api/integrations/purge?source=${sourceId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                } catch {}
                onClick();
              }}
              disabled={loading}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-error)", borderRadius: "var(--radius-sm)", color: "var(--color-error)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer" }}
            >
              Disconnect + purge data
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setDisconnectConfirm({ id: sourceId, onDisconnect: onClick })}
          disabled={loading}
          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: loading ? 0.5 : 1 }}
        >
          {loading ? "..." : "Disconnect"}
        </button>
      </div>
    );
  };

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
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
            {description}
          </div>
        </DrawerItem>
        <DrawerItem index={1} visible={isOpen}>
          <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              {givesLabel}
            </div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
              {gives}
            </div>
          </div>
        </DrawerItem>
        <DrawerItem index={2} visible={isOpen}>
          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", fontStyle: "italic", lineHeight: "var(--line-height-relaxed)", whiteSpace: "pre-line" }}>
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
    const isOnWaitlist = waitlisted[src.id];
    return (
      <button
        key={src.id}
        onClick={isReal ? () => connect(src.id) : (!isOnWaitlist ? () => joinWaitlist(src.id) : undefined)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "var(--space-3)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          cursor: isReal || !isOnWaitlist ? "pointer" : "default",
          fontFamily: "var(--font-primary)",
          opacity: 1,
          transition: `all var(--duration-fast) var(--ease-default)`,
          width: "100%",
        }}
      >
        <div style={{ width: 16, height: 16, flexShrink: 0, color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {SOURCE_LOGOS[src.id] || <Zap size={14} strokeWidth={1.8} />}
        </div>
        <div style={{ textAlign: "left", flex: 1 }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", textDecoration: isReal ? "none" : "line-through" }}>{src.name}</div>
          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: isReal ? "none" : "line-through" }}>
            {isReal ? src.cat : isOnWaitlist ? "On the list" : "Coming soon"}
          </div>
        </div>
        {!isReal && (
          <div style={{ flexShrink: 0, color: isOnWaitlist ? "var(--color-success)" : "var(--color-text-dim)", display: "flex", alignItems: "center" }}>
            {isOnWaitlist ? <Check size={14} strokeWidth={2} /> : <Ticket size={14} strokeWidth={1.8} />}
          </div>
        )}
      </button>
    );
  };

  const hasConnected = githubConnected || fabricConnected || sonosConnected || numbrlyConnected || tgConnected || squareConnected || shopifyConnected || stripeConnected || toastConnected || gcalConnected || gmailConnected || gdriveConnected || fitbitConnected || stravaConnected || qbConnected || connectedSources.length > 0;

  return (
    <div>
      {/* OAuth error banner */}
      {connectError && (
        <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--color-error-soft)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-error)" }}>{connectError}</div>
          <button onClick={() => setConnectError(null)} style={{ background: "none", border: "none", color: "var(--color-error)", cursor: "pointer", padding: "var(--space-1)", lineHeight: 0 }}><X size={14} /></button>
        </div>
      )}
      {/* Disconnect purge prompt — fixed overlay */}
      {disconnectConfirm && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "var(--space-4)",
        }}>
        <div style={{
          padding: "var(--space-4)",
          background: "var(--color-bg)",
          border: "1px solid var(--color-border-light)",
          borderRadius: "var(--radius-md)",
          maxWidth: 400,
          width: "100%",
        }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Disconnect {disconnectConfirm.id}?
          </div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", marginBottom: "var(--space-3)", lineHeight: "var(--line-height-relaxed)" }}>
            Your existing data (notes, conversations, history) stays unless you choose to purge.
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <button
              onClick={() => setDisconnectConfirm(null)}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={() => { const fn = disconnectConfirm.onDisconnect; setDisconnectConfirm(null); fn(); }}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer" }}
            >
              Disconnect, keep data
            </button>
            <button
              onClick={async () => {
                const fn = disconnectConfirm.onDisconnect;
                const src = disconnectConfirm.id;
                setDisconnectConfirm(null);
                try { await fetch(`/api/integrations/purge?source=${src}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }); } catch {}
                fn();
              }}
              style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-error)", borderRadius: "var(--radius-sm)", color: "var(--color-error)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-semibold)", cursor: "pointer" }}
            >
              Disconnect + purge data
            </button>
          </div>
        </div>
        </div>
      )}

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

      {/* Loading skeletons — reserve space while status checks run */}
      {!statusReady && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-6)" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-3) var(--space-4)" }}>
                <Skeleton width={16} height={16} circle />
                <div style={{ flex: 1 }}>
                  <Skeleton width={80} height={13} style={{ marginBottom: 4 }} />
                  <Skeleton width={140} height={10} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* No sources connected */}
      {statusReady && !hasConnected && (
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
      {statusReady && hasConnected && (
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
                      {disconnectFooter(disconnectGitHub, githubDisconnecting, "github")}
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Fabric / Spotify */}
            {spotifyConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.fabric}
                  name="Spotify"
                  subtitle="Your music, in context."
                  isExpanded={fabricExpanded}
                  onToggle={() => setFabricExpanded(!fabricExpanded)}
                />
                <Drawer open={fabricExpanded}>
                  {richDrawerContent({
                    expanded: fabricExpanded,
                    description: "Spotify connects your library, playlists, and playback to Fabric. Search your music, control what\u2019s playing, build sets, and let B-Side recommend tracks based on what you actually listen to \u2014 not an algorithm.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Now playing, recently played, your full playlist library, playback controls (play, pause, skip, volume), and listening history for B-Side recommendations. Everything runs through Fabric.",
                    tryPrompt: "What\u2019s playing right now?\u201D\n\u201CPlay something chill\u201D\n\u201CShow me my playlists\u201D\n\u201CWhat have I been listening to lately?",
                    linkLabel: "spotify.com",
                    linkHref: "https://spotify.com",
                    footer: (
                      <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                        <div style={{ padding: "var(--space-3) var(--space-4)" }}>
                          {checkboxRow("Show MiniPlayer in sidebar", fabricPlayerEnabled, toggleFabricPlayer)}
                        </div>
                        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                            Connected{spotifySeats ? ` \u00B7 ${spotifySeats.used}/${spotifySeats.max} seats` : ""}
                          </div>
                          <button
                            onClick={() => disconnect("fabric")}
                            disabled={fabricDisconnecting}
                            style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: fabricDisconnecting ? 0.5 : 1 }}
                          >
                            {fabricDisconnecting ? "..." : "Disconnect"}
                          </button>
                        </div>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Google Suite */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.google}
                  name="Google Suite"
                  subtitle="Calendar, Gmail, Drive"
                  isExpanded={googleExpanded}
                  onToggle={() => setGoogleExpanded(!googleExpanded)}
                />
                <Drawer open={googleExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <DrawerItem index={0} visible={googleExpanded}>
                        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                          Your Google services, connected individually. Each one has its own consent {"\u2014"} Calendar doesn{"\u2019"}t see your email, Gmail doesn{"\u2019"}t touch your files. Gmail is read-only {"\u2014"} F{"\u00FC"}lkit can search and read threads to answer your questions, but it never sends, deletes, or modifies emails. Connect only what you want. Note: Google may show an {"\u201C"}unverified app{"\u201D"} warning during connect {"\u2014"} this is normal while our verification is being reviewed and is safe to proceed.
                        </div>
                      </DrawerItem>
                      <DrawerItem index={1} visible={googleExpanded}>
                        <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
                            What this gives F{"\u00FC"}lkit
                          </div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                            Calendar: upcoming events, availability checks, create events from chat. Gmail: search emails, read threads, surface context in conversation. Drive: find files, read documents, import to your vault as notes.
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={2} visible={googleExpanded}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1-5)" }}>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What should I prep for my 2pm?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Did the vendor confirm the delivery date?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Import the Q2 proposal so I can reference it{"\u201D"}</div>
                          </div>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Block off Friday morning for deep work{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Pull the key points from that thread with accounting{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s the latest version of the budget spreadsheet?{"\u201D"}</div>
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={3} visible={googleExpanded}>
                        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: "none", fontFamily: "var(--font-primary)", transition: "color var(--duration-fast) var(--ease-default)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}>
                          {"\u2197 "}myaccount.google.com
                        </a>
                      </DrawerItem>
                    </div>
                    <DrawerItem index={4} visible={googleExpanded}>
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: "1px solid var(--color-border-light)" }}>
                          {checkboxRow("Calendar", gcalConnected, () => { if (gcalConnected) { disconnectGcal(); } else { connectGcal(); } })}
                          {checkboxRow("Gmail", gmailConnected, () => { if (gmailConnected) { disconnectGmail(); } else { connectGmail(); } })}
                          {checkboxRow("Drive", gdriveConnected, () => { if (gdriveConnected) { disconnectGdrive(); } else { connectGdrive(); } })}
                        </div>
                        <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          {(gcalConnected || gmailConnected || gdriveConnected)
                            ? `${[gcalConnected && "Calendar", gmailConnected && "Gmail", gdriveConnected && "Drive"].filter(Boolean).join(", ")} connected${gcalLastSynced ? ` \u00B7 ${timeAgo(gcalLastSynced)}` : ""}`
                            : "No services connected"}
                        </div>
                      </div>
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>

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
                          onClick={() => disconnect("numbrly")}
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
                          onClick={() => disconnect("truegauge")}
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
                          onClick={() => disconnect("square")}
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
                          onClick={() => disconnect("shopify")}
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
                          onClick={() => disconnect("stripe")}
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
                          onClick={() => disconnect("toast")}
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
                          onClick={() => disconnect("trello")}
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

            {/* Fitbit — connected */}
            {fitbitConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.fitbit || SOURCE_LOGOS.google}
                  name="Fitbit"
                  subtitle="Your body, in context."
                  isExpanded={fitbitExpanded}
                  onToggle={() => setFitbitExpanded(!fitbitExpanded)}
                />
                <Drawer open={fitbitExpanded}>
                  {richDrawerContent({
                    expanded: fitbitExpanded,
                    description: "Fitbit tracks your activity, sleep, heart rate, and weight every day. Connecting it means F\u00FClkit sees how you slept, how active you were, and how your body is trending \u2014 so it can help you plan around your energy, not just your calendar.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Daily activity (steps, calories, active minutes), sleep stages and efficiency, resting heart rate, heart rate zones, and weight trends. Ask how you slept or how active you\u2019ve been and get real numbers.",
                    tryPrompt: "How did I sleep last night?\u201D\n\u201CHow many steps this week?",
                    linkLabel: "fitbit.com",
                    linkHref: "https://www.fitbit.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{fitbitLastSynced ? ` \u00B7 Last synced ${timeAgo(fitbitLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={() => disconnect("fitbit")}
                          disabled={fitbitDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: fitbitDisconnecting ? 0.5 : 1 }}
                        >
                          {fitbitDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Strava — connected */}
            {stravaConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.strava}
                  name="Strava"
                  subtitle="Your training, in context."
                  isExpanded={stravaExpanded}
                  onToggle={() => setStravaExpanded(!stravaExpanded)}
                />
                <Drawer open={stravaExpanded}>
                  {richDrawerContent({
                    expanded: stravaExpanded,
                    description: "Strava tracks your runs, rides, swims, and workouts with GPS, pace, heart rate, and elevation. Connecting it means F\u00FClkit sees your training history and can help you plan around your fitness, track progress, and spot trends.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Recent activities with distance, pace, splits, heart rate, elevation gain, and suffer score. All-time and year-to-date stats across runs, rides, and swims. Ask about your last run or how your training is going.",
                    tryPrompt: "\u201CHow was my last run?\u201D\n\u201CWhat's my mileage this year?\u201D",
                    linkLabel: "strava.com",
                    linkHref: "https://www.strava.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{stravaLastSynced ? ` \u00B7 Last synced ${timeAgo(stravaLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={() => disconnect("strava")}
                          disabled={stravaDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: stravaDisconnecting ? 0.5 : 1 }}
                        >
                          {stravaDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Sonos — connected */}
            {sonosConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.sonos}
                  name="Sonos"
                  subtitle="Your speakers, connected."
                  isExpanded={sonosExpanded}
                  onToggle={() => setSonosExpanded(!sonosExpanded)}
                />
                <Drawer open={sonosExpanded}>
                  {richDrawerContent({
                    expanded: sonosExpanded,
                    description: SOURCE_DESCRIPTIONS.sonos.description,
                    givesLabel: "What this gives F\u00FClkit",
                    gives: SOURCE_DESCRIPTIONS.sonos.gives,
                    tryPrompt: SOURCE_DESCRIPTIONS.sonos.tryPrompt,
                    linkLabel: SOURCE_DESCRIPTIONS.sonos.linkLabel,
                    linkHref: SOURCE_DESCRIPTIONS.sonos.linkHref,
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{sonosLastSynced ? ` \u00B7 Last synced ${timeAgo(sonosLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={() => disconnect("sonos")}
                          disabled={sonosDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: sonosDisconnecting ? 0.5 : 1 }}
                        >
                          {sonosDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* QuickBooks — connected */}
            {qbConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.quickbooks}
                  name="QuickBooks"
                  subtitle="Your books, in context."
                  isExpanded={qbExpanded}
                  onToggle={() => setQbExpanded(!qbExpanded)}
                />
                <Drawer open={qbExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <DrawerItem index={0} visible={qbExpanded}>
                        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                          QuickBooks tracks your invoices, expenses, customers, and financial reports. Connecting it means F{"\u00FC"}lkit sees your P&L, outstanding invoices, and cash position {"\u2014"} so you can ask about your business finances in plain English instead of digging through reports.
                        </div>
                      </DrawerItem>
                      <DrawerItem index={1} visible={qbExpanded}>
                        <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>
                            What this gives F{"\u00FC"}lkit
                          </div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                            Profit & Loss statements, balance sheets, invoice status (open, paid, overdue), recent expenses, customer balances, and payment history. Ask how the business is doing and get real numbers.
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={2} visible={qbExpanded}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1-5)" }}>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s my P&L this month?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Who owes me money right now?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Show me expenses over $500 this quarter{"\u201D"}</div>
                          </div>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s my balance sheet look like?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Any overdue invoices I should follow up on?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}How much did we spend on supplies this month?{"\u201D"}</div>
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={3} visible={qbExpanded}>
                        <a href="https://quickbooks.intuit.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: "none", fontFamily: "var(--font-primary)", transition: "color var(--duration-fast) var(--ease-default)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}>
                          {"\u2197 "}quickbooks.intuit.com
                        </a>
                      </DrawerItem>
                    </div>
                    <DrawerItem index={4} visible={qbExpanded}>
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{qbLastSynced ? ` \u00B7 Last synced ${timeAgo(qbLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={() => disconnect("quickbooks")}
                          disabled={qbDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: qbDisconnecting ? 0.5 : 1 }}
                        >
                          {qbDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Obsidian — connected */}
            {obsidianConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.obsidian}
                  name="Obsidian"
                  subtitle="Your vault, imported."
                  isExpanded={obsidianExpanded}
                  onToggle={() => setObsidianExpanded(!obsidianExpanded)}
                />
                <Drawer open={obsidianExpanded}>
                  {richDrawerContent({
                    expanded: obsidianExpanded,
                    description: "Obsidian stores your notes as plain markdown files in a local folder. Connecting it means F\u00FClkit reads your entire vault \u2014 every folder, every note \u2014 and imports them so they\u2019re searchable in chat. Your folder structure is preserved.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "All your Obsidian notes imported as searchable Fulkit notes. Folder structure maps to vault folders. Ask about anything you\u2019ve written and get real answers grounded in your own words.",
                    tryPrompt: "What did I write about project planning?\u201D\n\u201CFind my notes on that book I read",
                    linkLabel: "obsidian.md",
                    linkHref: "https://obsidian.md",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          {obsidianCount ? `${obsidianCount} notes imported` : "Connected"}
                        </div>
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                          <button
                            onClick={connectObsidian}
                            disabled={obsidianImporting}
                            style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: obsidianImporting ? 0.5 : 1 }}
                          >
                            {obsidianImporting ? "Importing..." : "Re-import"}
                          </button>
                          <button
                            onClick={() => disconnect("obsidian")}
                            style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer" }}
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Notion — connected */}
            {notionConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.notion}
                  name="Notion"
                  subtitle="Your workspace, connected."
                  isExpanded={notionExpanded}
                  onToggle={() => setNotionExpanded(!notionExpanded)}
                />
                <Drawer open={notionExpanded}>
                  {richDrawerContent({
                    expanded: notionExpanded,
                    description: "Notion holds your pages, databases, wikis, and docs. Connecting it means F\u00FClkit can search your workspace, read page content, and import pages into your vault \u2014 so your Notion knowledge is accessible in chat without switching apps.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Search across all pages and databases, read full page content, and import pages as Fulkit notes. Ask about anything in your Notion workspace.",
                    tryPrompt: "What\u2019s in my Notion workspace about onboarding?\u201D\n\u201CImport my meeting notes from Notion",
                    linkLabel: "notion.so",
                    linkHref: "https://notion.so",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{notionLastSynced ? ` \u00B7 Last synced ${timeAgo(notionLastSynced)}` : ""}
                        </div>
                        <button
                          onClick={() => disconnect("notion")}
                          disabled={notionDisconnecting}
                          style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: notionDisconnecting ? 0.5 : 1 }}
                        >
                          {notionDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Dropbox — connected */}
            {dropboxConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.dropbox}
                  name="Dropbox"
                  subtitle="Your files, connected."
                  isExpanded={dropboxExpanded}
                  onToggle={() => setDropboxExpanded(!dropboxExpanded)}
                />
                <Drawer open={dropboxExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <DrawerItem index={0} visible={dropboxExpanded}>
                        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                          Dropbox stores your documents, spreadsheets, and files in the cloud. Connecting it means F{"\u00FC"}lkit can search your files, read their content, and surface what you need in conversation {"\u2014"} without opening Dropbox. Note: Dropbox may show a security warning during connect {"\u2014"} this is normal for new apps and disappears once our verification is approved.
                        </div>
                      </DrawerItem>
                      <DrawerItem index={1} visible={dropboxExpanded}>
                        <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>What this gives F{"\u00FC"}lkit</div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                            File search across your entire Dropbox, read text-based files (markdown, code, CSVs), and surface content in chat. Ask about a file and get what{"\u2019"}s in it.
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={2} visible={dropboxExpanded}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1-5)" }}>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s in my Q2 planning folder?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Find the contract we signed last month{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Read me the notes from the vendor meeting{"\u201D"}</div>
                          </div>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s the latest version of the pitch deck?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Find all CSVs with revenue data{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What did the onboarding doc say about day one?{"\u201D"}</div>
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={3} visible={dropboxExpanded}>
                        <a href="https://dropbox.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: "none", fontFamily: "var(--font-primary)", transition: "color var(--duration-fast) var(--ease-default)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}>
                          {"\u2197 "}dropbox.com
                        </a>
                      </DrawerItem>
                    </div>
                    <DrawerItem index={4} visible={dropboxExpanded}>
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{dropboxLastSynced ? ` \u00B7 Last synced ${timeAgo(dropboxLastSynced)}` : ""}
                        </div>
                        <button onClick={() => disconnect("dropbox")} disabled={dropboxDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: dropboxDisconnecting ? 0.5 : 1 }}>
                          {dropboxDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Slack — connected */}
            {slackConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader
                  logo={SOURCE_LOGOS.slack}
                  name="Slack"
                  subtitle="Your team chat, in context."
                  isExpanded={slackExpanded}
                  onToggle={() => setSlackExpanded(!slackExpanded)}
                />
                <Drawer open={slackExpanded}>
                  <div style={{ borderTop: "1px solid var(--color-border-light)" }}>
                    <div style={{ padding: "var(--space-3) var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                      <DrawerItem index={0} visible={slackExpanded}>
                        <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                          Slack is where your team talks. Connecting it means F{"\u00FC"}lkit can search messages, browse channels, and surface conversations {"\u2014"} so you can reference what was said without scrolling through threads.
                        </div>
                      </DrawerItem>
                      <DrawerItem index={1} visible={slackExpanded}>
                        <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>What this gives F{"\u00FC"}lkit</div>
                          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                            Message search across all channels, channel listing, and recent conversation history. Ask what the team discussed and get real answers.
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={2} visible={slackExpanded}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1-5)" }}>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What did the team decide about pricing?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Find what Sarah said about the deadline{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What{"\u2019"}s been happening in #engineering?{"\u201D"}</div>
                          </div>
                          <div style={{ borderLeft: "2px solid var(--color-border)", paddingLeft: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-1-5)" }}>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Did anyone mention the client feedback?{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}Show me today{"\u2019"}s messages in #general{"\u201D"}</div>
                            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", fontStyle: "italic" }}>{"\u201C"}What channels am I in?{"\u201D"}</div>
                          </div>
                        </div>
                      </DrawerItem>
                      <DrawerItem index={3} visible={slackExpanded}>
                        <a href="https://slack.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textDecoration: "none", fontFamily: "var(--font-primary)", transition: "color var(--duration-fast) var(--ease-default)" }} onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-text-muted)"} onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-text-dim)"}>
                          {"\u2197 "}slack.com
                        </a>
                      </DrawerItem>
                    </div>
                    <DrawerItem index={4} visible={slackExpanded}>
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>
                          Connected{slackLastSynced ? ` \u00B7 Last synced ${timeAgo(slackLastSynced)}` : ""}
                        </div>
                        <button onClick={() => disconnect("slack")} disabled={slackDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: slackDisconnecting ? 0.5 : 1 }}>
                          {slackDisconnecting ? "..." : "Disconnect"}
                        </button>
                      </div>
                    </DrawerItem>
                  </div>
                </Drawer>
              </Card>
            )}

            {/* Readwise — connected */}
            {readwiseConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.readwise} name="Readwise" subtitle="Your highlights, connected." isExpanded={readwiseExpanded} onToggle={() => setReadwiseExpanded(!readwiseExpanded)} />
                <Drawer open={readwiseExpanded}>
                  {richDrawerContent({
                    expanded: readwiseExpanded,
                    description: "Readwise collects your highlights and annotations from Kindle, articles, podcasts, and more. Connecting it means F\u00FClkit can surface what you\u2019ve underlined, noted, and saved \u2014 so your reading becomes part of every conversation.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Highlights and annotations from books, articles, and podcasts. Book and source listing. Ask about what you\u2019ve read and get your own words back.",
                    tryPrompt: "What did I highlight in Atomic Habits?\u201D\n\u201CShow me my recent reading highlights",
                    linkLabel: "readwise.io",
                    linkHref: "https://readwise.io",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected</div>
                        <button onClick={() => disconnect("readwise")} disabled={readwiseDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: readwiseDisconnecting ? 0.5 : 1 }}>{readwiseDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* OneNote — connected */}
            {onenoteConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.onenote} name="OneNote" subtitle="Your notebooks, connected." isExpanded={onenoteExpanded} onToggle={() => setOnenoteExpanded(!onenoteExpanded)} />
                <Drawer open={onenoteExpanded}>
                  {richDrawerContent({
                    expanded: onenoteExpanded,
                    description: "OneNote organizes your notes into notebooks, sections, and pages. Connecting it means F\u00FClkit can browse your notebooks, read page content, and surface your notes in conversation.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Notebook and section listing, full page content, and note search. Ask about anything in your OneNote and get real answers.",
                    tryPrompt: "What\u2019s in my work notebook?\u201D\n\u201CRead my meeting notes from last week",
                    linkLabel: "onenote.com",
                    linkHref: "https://www.onenote.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected{onenoteLastSynced ? ` \u00B7 Last synced ${timeAgo(onenoteLastSynced)}` : ""}</div>
                        <button onClick={() => disconnect("onenote")} disabled={onenoteDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: onenoteDisconnecting ? 0.5 : 1 }}>{onenoteDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Todoist — connected */}
            {todoistConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.todoist} name="Todoist" subtitle="Your tasks, connected." isExpanded={todoistExpanded} onToggle={() => setTodoistExpanded(!todoistExpanded)} />
                <Drawer open={todoistExpanded}>
                  {richDrawerContent({
                    expanded: todoistExpanded,
                    description: "Todoist tracks your tasks, projects, and priorities. Connecting it means F\u00FClkit sees what\u2019s on your plate \u2014 due dates, labels, projects \u2014 and can help you plan around what actually needs to get done.",
                    givesLabel: "What this gives F\u00FClkit",
                    gives: "Active tasks with due dates, priorities, and labels. Project listing. Ask what\u2019s due or what you need to focus on and get a real answer.",
                    tryPrompt: "What\u2019s due today?\u201D\n\u201CShow me all high-priority tasks",
                    linkLabel: "todoist.com",
                    linkHref: "https://todoist.com",
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected{todoistLastSynced ? ` \u00B7 Last synced ${timeAgo(todoistLastSynced)}` : ""}</div>
                        <button onClick={() => disconnect("todoist")} disabled={todoistDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: todoistDisconnecting ? 0.5 : 1 }}>{todoistDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Asana — connected */}
            {asanaConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.asana} name="Asana" subtitle={SOURCE_DESCRIPTIONS.asana.subtitle} isExpanded={asanaExpanded} onToggle={() => setAsanaExpanded(!asanaExpanded)} />
                <Drawer open={asanaExpanded}>
                  {richDrawerContent({
                    expanded: asanaExpanded,
                    description: SOURCE_DESCRIPTIONS.asana.description,
                    givesLabel: "What this gives F\u00FClkit",
                    gives: SOURCE_DESCRIPTIONS.asana.gives,
                    tryPrompt: SOURCE_DESCRIPTIONS.asana.tryPrompt,
                    linkLabel: SOURCE_DESCRIPTIONS.asana.linkLabel,
                    linkHref: SOURCE_DESCRIPTIONS.asana.linkHref,
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected{asanaLastSynced ? ` \u00B7 Last synced ${timeAgo(asanaLastSynced)}` : ""}</div>
                        <button onClick={() => disconnect("asana")} disabled={asanaDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: asanaDisconnecting ? 0.5 : 1 }}>{asanaDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* monday.com — connected */}
            {mondayConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.monday} name="monday.com" subtitle={SOURCE_DESCRIPTIONS.monday.subtitle} isExpanded={mondayExpanded} onToggle={() => setMondayExpanded(!mondayExpanded)} />
                <Drawer open={mondayExpanded}>
                  {richDrawerContent({
                    expanded: mondayExpanded,
                    description: SOURCE_DESCRIPTIONS.monday.description,
                    givesLabel: "What this gives F\u00FClkit",
                    gives: SOURCE_DESCRIPTIONS.monday.gives,
                    tryPrompt: SOURCE_DESCRIPTIONS.monday.tryPrompt,
                    linkLabel: SOURCE_DESCRIPTIONS.monday.linkLabel,
                    linkHref: SOURCE_DESCRIPTIONS.monday.linkHref,
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected{mondayLastSynced ? ` \u00B7 Last synced ${timeAgo(mondayLastSynced)}` : ""}</div>
                        <button onClick={() => disconnect("monday")} disabled={mondayDisconnecting} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer", opacity: mondayDisconnecting ? 0.5 : 1 }}>{mondayDisconnecting ? "..." : "Disconnect"}</button>
                      </div>
                    ),
                  })}
                </Drawer>
              </Card>
            )}

            {/* Linear — connected */}
            {linearConnected && (
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <CardHeader logo={SOURCE_LOGOS.linear} name="Linear" subtitle={SOURCE_DESCRIPTIONS.linear.subtitle} isExpanded={linearExpanded} onToggle={() => setLinearExpanded(!linearExpanded)} />
                <Drawer open={linearExpanded}>
                  {richDrawerContent({
                    expanded: linearExpanded,
                    description: SOURCE_DESCRIPTIONS.linear.description,
                    givesLabel: "What this gives F\u00FClkit",
                    gives: SOURCE_DESCRIPTIONS.linear.gives,
                    tryPrompt: SOURCE_DESCRIPTIONS.linear.tryPrompt,
                    linkLabel: SOURCE_DESCRIPTIONS.linear.linkLabel,
                    linkHref: SOURCE_DESCRIPTIONS.linear.linkHref,
                    footer: (
                      <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)" }}>Connected{linearLastSynced ? ` \u00B7 Last synced ${timeAgo(linearLastSynced)}` : ""}</div>
                        <button onClick={() => disconnectLinear()} style={{ padding: "var(--space-1) var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", cursor: "pointer" }}>Disconnect</button>
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
                        {disconnectFooter(() => disconnect(src.id), false, src.id)}
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

      {/* All other sources — wait for status checks to avoid CLS */}
      {statusReady && (moreCards.length > 0 || moreTiles.length > 0) && (() => {
        const q = searchMore.toLowerCase().trim();
        const filteredCards = moreCards;
        const filteredTiles = q ? moreTiles.filter(s => s.name.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q)) : moreTiles;
        return (
        <>
          <SectionTitle>More</SectionTitle>

          {/* Real integrations — expandable swivel cards */}
          {filteredCards.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginBottom: filteredTiles.length > 0 ? "var(--space-4)" : 0 }}>
              {filteredCards.map((src) => {
                const desc = SOURCE_DESCRIPTIONS[src.id];
                const isOpen = src.id === "shopify" ? shopifyExpanded : src.id === "fabric" ? fabricExpanded : !!expanded[src.id];
                const toggle = src.id === "shopify"
                  ? () => setShopifyExpanded(!shopifyExpanded)
                  : src.id === "fabric"
                  ? () => setFabricExpanded(!fabricExpanded)
                  : () => setExpanded((prev) => ({ ...prev, [src.id]: !prev[src.id] }));
                const seatsFull = src.id === "fabric" && spotifySeats && spotifySeats.used >= spotifySeats.max;
                return (
                  <Card key={src.id} style={{ padding: 0, overflow: "hidden" }}>
                    <CardHeader
                      logo={SOURCE_LOGOS[src.id]}
                      name={src.name}
                      subtitle={src.id === "fabric" && spotifySeats ? `${spotifySeats.used}/${spotifySeats.max} seats` : (desc?.subtitle || src.cat)}
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
                        footer: seatsFull ? (
                          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                            <DrawerItem index={5} visible={isOpen}>
                              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)", lineHeight: "var(--line-height-relaxed)" }}>
                                All Spotify seats are taken.
                              </div>
                              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: 2 }}>
                                Spotify limitation, not ours.
                              </div>
                            </DrawerItem>
                            <DrawerItem index={6} visible={isOpen}>
                              {waitlistDone ? (
                                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-3)" }}>
                                  You're on the list.
                                </div>
                              ) : (
                                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                                  <input
                                    type="email"
                                    placeholder="your@email.com"
                                    value={waitlistEmail}
                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && submitWaitlist()}
                                    style={{ flex: 1, padding: "var(--space-2) var(--space-3)", background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontFamily: "var(--font-primary)", color: "var(--color-text)", outline: "none" }}
                                  />
                                  <button
                                    onClick={submitWaitlist}
                                    disabled={waitlistSubmitting || !waitlistEmail.trim()}
                                    style={{ background: "none", border: "none", cursor: waitlistSubmitting || !waitlistEmail.trim() ? "default" : "pointer", padding: 4, color: "var(--color-text-muted)", opacity: waitlistSubmitting || !waitlistEmail.trim() ? 0.3 : 0.7, fontSize: 14, lineHeight: 1 }}
                                  >
                                    {waitlistSubmitting ? "…" : "→"}
                                  </button>
                                </div>
                              )}
                            </DrawerItem>
                            <DrawerItem index={7} visible={isOpen}>
                              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-3)" }}>
                                Music plays via YouTube.
                              </div>
                            </DrawerItem>
                          </div>
                        ) : src.id === "shopify" ? (
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
                        ) : COMING_SOON.has(src.id) ? (
                          <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border-light)" }}>
                            <DrawerItem index={5} visible={isOpen}>
                              {waitlisted[src.id] ? (
                                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "center" }}>
                                  You{"\u2019"}re on the list. We{"\u2019"}ll notify you when it{"\u2019"}s live.
                                </div>
                              ) : (
                                <button
                                  onClick={() => joinWaitlist(src.id)}
                                  style={{ width: "100%", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-alt)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", color: "var(--color-text)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", textAlign: "center", cursor: "pointer" }}
                                >
                                  Join waitlist
                                </button>
                              )}
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

          {/* Search + suggest row */}
          <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-3)", marginTop: filteredCards.length > 0 ? "var(--space-4)" : 0 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} strokeWidth={2} style={{ position: "absolute", left: "var(--space-2-5)", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-dim)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search upcoming..."
                value={searchMore}
                onChange={(e) => setSearchMore(e.target.value)}
                style={{
                  width: "100%",
                  padding: "var(--space-2) var(--space-2-5) var(--space-2) var(--space-8)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  color: "var(--color-text)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  outline: "none",
                }}
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = suggestInput.trim();
                if (!text || !user?.id) return;
                supabase.from("preferences").insert({
                  user_id: user.id,
                  key: `suggest_integration_${Date.now()}`,
                  value: text,
                }).then(() => {}).catch(() => {});
                setSuggestInput("");
                setSuggestSent(true);
                setTimeout(() => setSuggestSent(false), 3000);
              }}
              style={{ display: "flex", flex: 1, gap: "var(--space-1)" }}
            >
              <input
                type="text"
                placeholder={suggestSent ? "Noted!" : "Suggest an integration..."}
                value={suggestInput}
                onChange={(e) => setSuggestInput(e.target.value)}
                disabled={suggestSent}
                style={{
                  flex: 1,
                  padding: "var(--space-2) var(--space-2-5)",
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-primary)",
                  color: suggestSent ? "var(--color-success)" : "var(--color-text)",
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "var(--radius-sm)",
                  outline: "none",
                }}
              />
              {suggestInput.trim() && (
                <button
                  type="submit"
                  style={{
                    padding: "var(--space-1-5) var(--space-3)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    fontFamily: "var(--font-primary)",
                    background: "var(--color-accent)",
                    color: "var(--color-text-inverse)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Send
                </button>
              )}
            </form>
          </div>
          {filteredTiles.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)" }}>
              {filteredTiles.map(sourceButton)}
            </div>
          )}

          {q && filteredCards.length === 0 && filteredTiles.length === 0 && (
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", padding: "var(--space-4) 0", textAlign: "center" }}>
              No integrations match {"\u201C"}{searchMore}{"\u201D"}
            </div>
          )}
        </>
        );
      })()}
    </div>
  );
}

// ── Operator's Manual ─────────────────────────────────

// Auto-generated from SOURCE_DESCRIPTIONS — one source of truth.
// Add a new integration to SOURCE_DESCRIPTIONS → manual inherits it automatically.
const MANUAL_SECTIONS = Object.fromEntries(
  Object.entries(SOURCE_DESCRIPTIONS).map(([id, desc]) => {
    const name = ALL_SOURCES.find(s => s.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1);
    const prompts = (desc.tryPrompt || "")
      .replace(/[\u201C\u201D]/g, "")
      .split(/\n|\\n/)
      .map(s => s.trim())
      .filter(Boolean);
    return [id, {
      name: id === "google" ? "Google Suite" : id === "fabric" ? "Fabric" : name,
      categories: [{
        label: "Try asking",
        commands: prompts.map(p => ({ example: p, description: "" })),
      }],
    }];
  })
);

const MANUAL_BLUEPRINT = [
  { num: "01", label: "TALK", desc: "One chat. Say what you need.", examples: ["\u201CHow did we do today?\u201D", "\u201CSave this recipe.\u201D", "\u201CPlay something chill.\u201D"] },
  { num: "02", label: "REMEMBER", desc: "Notes, memories, semantic search.", examples: ["\u201CSave this\u201D \u2014 F\u00fclkit distills it.", "\u201CWhat did I save about\u2026\u201D \u2014 meaning, not keywords."] },
  { num: "03", label: "ACT", desc: "Actions + Threads + Standup.", examples: ["\u201CRemind me to\u2026\u201D \u2192 tracked action.", "\u201CStandup\u201D \u2192 yesterday, today, blockers.", "\u201CClose out\u201D \u2192 pull sales, log to books."] },
  { num: "04", label: "LISTEN", desc: "The Hum. Voice \u2192 understanding.", examples: ["Talk to the orb, not a form.", "Full voice control \u2014 check calendar, add tasks, 86 an item.", "No transcript on screen. Just you and the orb."] },
  { num: "05", label: "AUTOMATE", desc: "Schedule recurring tasks. Your routines, on autopilot.", examples: ["\u201CEvery day at 4pm, close out my Square.\u201D", "\u201CRemind me every Monday to review my P&L.\u201D", "Whispers appear on your dashboard when it\u2019s time."] },
  { num: "06", label: "WATCH", desc: "Monitor any URL. Get notified when it changes.", examples: ["\u201CWatch nytimes.com/tech daily.\u201D", "\u201CMonitor this page for updates.\u201D", "Your own personalized news feed \u2014 built through conversation."] },
  { num: "07", label: "CONNECT", desc: "20+ integrations. Your tools, one surface.", examples: ["Square, Stripe, Google, Fitbit, Strava, Slack, Notion, and more.", "\u201C86 the chia pudding.\u201D \u201CInvoice Matt $150.\u201D \u201CHow did I sleep?\u201D", "Connect in Settings \u2192 Sources. Disconnect anytime."] },
  { num: "08", label: "PROTECT", desc: "Three vault modes. Your data, your rules.", vaultModes: true },
];

// Auto-generated from SOURCE_DESCRIPTIONS — one source of truth.
// Add a new integration to SOURCE_DESCRIPTIONS and it appears here automatically.
const ALL_INTEGRATIONS = Object.entries(SOURCE_DESCRIPTIONS).map(([id, desc]) => ({
  id,
  name: MANUAL_SECTIONS[id]?.name || ALL_SOURCES.find(s => s.id === id)?.name || id,
  summary: desc.subtitle?.replace(/\.$/, "") || desc.gives?.split(".")[0] || "",
}));

const GETTING_STARTED = [
  { step: "1", action: "Say something", desc: "Open chat. Talk naturally \u2014 no menus, no commands." },
  { step: "2", action: "Save your first note", desc: "\u201CSave this\u201D \u2014 F\u00fclkit distills it to what matters." },
  { step: "3", action: "Pick your vault", desc: "Settings \u2192 Vault. Local, encrypted, or managed. You choose." },
  { step: "4", action: "Try The Hum", desc: "Tap the orb. Talk. No text on screen \u2014 just voice in, voice out." },
  { step: "5", action: "Run a standup", desc: "\u201CStandup\u201D \u2014 yesterday\u2019s wins, today\u2019s open items, blockers." },
  { step: "6", action: "Watch something", desc: "\u201CWatch nytimes.com/tech daily\u201D \u2014 whisper when it changes." },
  { step: "7", action: "Automate something", desc: "\u201CEvery day at 4pm, pull my sales.\u201D F\u00fclkit remembers so you don\u2019t." },
];

const QUICK_REFERENCE = [
  { left: "Enter", right: "Send message" },
  { left: "Shift + Enter", right: "New line (don\u2019t send)" },
  { left: "Cmd/Ctrl + K", right: "Focus chat input from anywhere" },
  { left: "Cmd/Ctrl + N", right: "New conversation" },
  { left: "Cmd/Ctrl + H", right: "Jump to home" },
  { left: "Cmd/Ctrl + J", right: "Jump to threads" },
  { left: "Cmd/Ctrl + Shift + C", right: "Open chat in side window" },
  { left: "Escape", right: "Clear input or close panels" },
  { left: "Drop file", right: "Triage \u2014 AI reads, files, extracts" },
  { left: "/recall [topic]", right: "Search your notes inline" },
  { left: "\u201CSave this\u201D", right: "Distill and save as a note" },
  { left: "\u201CRemind me\u201D", right: "Create an action item" },
  { left: "\u201CTrack this\u201D", right: "Start a thread" },
];

function SectionDivider({ label, right }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-6) 0 var(--space-3) 0",
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

      <div style={{
        padding: "var(--space-4)",
        background: "var(--color-bg-alt)",
        border: "1px solid var(--color-border-light)",
        borderRadius: "var(--radius-lg)",
        marginBottom: "var(--space-4)",
      }}>
        <div style={{
          fontSize: "var(--font-size-lg)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-text)",
          lineHeight: "var(--line-height-tight)",
          marginBottom: "var(--space-2)",
        }}>
          The manual is the chat.
        </div>
        <div style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}>
          If you get stuck, have a question, or want to know how something works {"\u2014"} just ask. F{"\u00FC"}lkit knows how F{"\u00FC"}lkit works. Every feature, every integration, every shortcut is accessible through the conversation. You don{"\u2019"}t need this page. But here are some ideas to get you started.
        </div>
      </div>

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

      {/* ═══ Layer 3: Ideas ═══ */}
      <SectionDivider label="Try Asking" />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {[
          { category: "Your Day", prompts: [
            "What\u2019s on my calendar this week?",
            "What\u2019s due today?",
            "Block off Friday morning for deep work",
            "What should I prep for my 2pm?",
          ]},
          { category: "Your Business", prompts: [
            "What\u2019s my P&L this month?",
            "How did we do today?",
            "Any overdue invoices I should follow up on?",
            "Who owes me money right now?",
          ]},
          { category: "Your World", prompts: [
            "What\u2019s the weather in St. George?",
            "Is the air quality good enough for a run today?",
            "How much is \u20AC500 in dollars right now?",
            "When\u2019s sunset tonight?",
          ]},
          { category: "Your Health", prompts: [
            "How did I sleep last night?",
            "How many steps this week?",
            "What\u2019s my resting heart rate trending?",
            "Show me my weight over the last month",
          ]},
          { category: "Your Files", prompts: [
            "What did Sarah say about the contract?",
            "Pull in my project notes from Drive",
            "Find the vendor meeting notes in Dropbox",
            "Import my Q2 proposal so I can reference it",
          ]},
          { category: "Your Team", prompts: [
            "What did the team decide about pricing?",
            "Show me today\u2019s messages in #general",
            "What\u2019s been happening in #engineering?",
            "Find what Sarah said about the deadline",
          ]},
          { category: "Your Notes", prompts: [
            "What did I write about project planning?",
            "Find my notes on that book I read",
            "What\u2019s in my Notion workspace about onboarding?",
            "What did I highlight in Atomic Habits?",
          ]},
          { category: "Curiosity", prompts: [
            "What\u2019s NASA\u2019s picture of the day?",
            "Any asteroids passing close to Earth?",
            "What\u2019s happening with food safety regulations?",
            "Tell me about the book Thinking, Fast and Slow",
          ]},
        ].map((group) => (
          <div key={group.category}>
            <div style={{
              fontSize: "var(--font-size-2xs)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-1)",
            }}>{group.category}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-1)" }}>
              {group.prompts.map((p, i) => (
                <div key={i} style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                  borderLeft: "2px solid var(--color-border)",
                  paddingLeft: "var(--space-2)",
                  lineHeight: "var(--line-height-relaxed)",
                }}>
                  {`\u201C${p}\u201D`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reference */}
      <div style={{ marginTop: "var(--space-6)" }} />
      <SectionDivider label="Quick Reference" />
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2px var(--space-4)",
      }}>
        {QUICK_REFERENCE.flatMap((row, i) => [
          <span key={`l${i}`} style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              padding: "var(--space-1) 0",
              borderBottom: "1px solid var(--color-border-light)",
            }}>{row.left}</span>,
          <span key={`r${i}`} style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              padding: "var(--space-1) 0",
              borderBottom: "1px solid var(--color-border-light)",
            }}>{row.right}</span>,
        ])}
      </div>
    </div>
  );
}

function AITab() {
  const { user, accessToken } = useAuth();
  const prefs = [];

  // ─── BYOK state ──────────────────────────────────────────
  const [byokKey, setByokKey] = useState("");
  const [byokStatus, setByokStatus] = useState(null); // null | "loading" | "connected" | "error"
  const [byokError, setByokError] = useState(null);
  const [byokVerifying, setByokVerifying] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/byok", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) setByokStatus("connected");
      })
      .catch(() => {});
  }, [accessToken]);

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
              onClick={async () => {
                if (!confirm("Clear all learned preferences? This cannot be undone.")) return;
                const { error } = await supabase.from("preferences").delete().eq("user_id", user?.id);
                if (!error) { setPrefs([]); }
              }}
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
              {"Not set"}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ReferralsTab() {
  const { user, profile, isOwner, accessToken } = useAuth();
  const [refCode, setRefCode] = useState(null);
  const [stats, setStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [ownerView, setOwnerViewRaw] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("fulkit-referrals-owner") === "true";
    return false;
  });
  const setOwnerView = (val) => { setOwnerViewRaw(val); localStorage.setItem("fulkit-referrals-owner", String(val)); };
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState(6);
  const refLoadedRef = useRef(false);
  const adminLoadedRef = useRef(false);

  useEffect(() => {
    if (!accessToken || refLoadedRef.current) return;
    refLoadedRef.current = true;
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      fetch("/api/referrals/code", { headers }).then(r => r.json()),
      fetch("/api/referrals/status", { headers }).then(r => r.json()),
    ]).then(([codeRes, statusRes]) => {
      if (codeRes.code) setRefCode(codeRes.code);
      setStats(statusRes);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (!isOwner || !ownerView || !accessToken) return;
    // Only guard initial load — allow trendRange changes to re-fetch
    if (adminLoadedRef.current && trendRange === 6) return;
    adminLoadedRef.current = true;
    fetch(`/api/referrals/admin?months=${trendRange}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json())
      .then(setAdminStats)
      .catch(() => {});
  }, [isOwner, ownerView, accessToken, trendRange]);

  const refLink = refCode ? `fulkit.app/ref/${refCode}` : "generating...";
  const activeRefs = stats?.activeReferrals || 0;
  const tier = stats?.tier;
  const monthlyFul = stats?.monthlyFul || 0;
  const monthlyDollars = stats?.monthlyDollars || 0;
  const seatType = profile?.seat_type || "free";

  const copyLink = () => {
    navigator.clipboard.writeText(`https://${refLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cheatsheet data from config
  const cheatsheet = [
    { refs: 3, ful: 300, label: "Pay less" },
    { refs: REFERRALS.freeAtStandard, ful: REFERRALS.freeAtStandard * 100, label: "Standard = free" },
    { refs: REFERRALS.freeAtPro, ful: REFERRALS.freeAtPro * 100, label: "Pro = free" },
    { refs: "25+", ful: "2,750+", label: "Free + cash" },
  ];

  const tierNames = REFERRALS.tiers || [];
  const toFree = seatType === "pro"
    ? Math.max(0, REFERRALS.freeAtPro - activeRefs)
    : Math.max(0, REFERRALS.freeAtStandard - activeRefs);

  const statusBadge = (s) => {
    const colors = {
      active: { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
      trial: { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
      churned: { bg: "var(--color-bg)", fg: "var(--color-text-dim)" },
    };
    const c = colors[s] || colors.churned;
    return { background: c.bg, color: c.fg, fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", padding: "var(--space-0-5) var(--space-2)", borderRadius: "var(--radius-xs)" };
  };

  // ── Export CSV helper ──
  const exportCSV = () => {
    if (!adminStats) return;
    const rows = [["Name", "Plan", "Referrals", "Tier", "Fül/mo", "API Spend", "Messages", "Joined"]];
    for (const u of adminStats.userTable || []) {
      rows.push([u.name, u.seat, u.refs, u.tier, u.ful, `$${u.apiSpend}`, u.messages, u.joined ? new Date(u.joined).toLocaleDateString() : ""]);
    }
    // Add summary rows
    rows.push([]);
    rows.push(["--- SUMMARY ---"]);
    rows.push(["MRR", `$${adminStats.mrr}`]);
    rows.push(["API Cost", `$${adminStats.actualApiCost}`]);
    rows.push(["Referral Payouts", `$${adminStats.totalMonthlyDollars}`]);
    rows.push(["Net Income", `$${adminStats.netIncome}`]);
    rows.push(["Margin", `${adminStats.margin}%`]);
    rows.push(["Total Users", adminStats.totalUsers]);
    rows.push(["Paying Users", adminStats.totalPaying]);
    rows.push(["Conversion Rate", `${adminStats.conversionRate}%`]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulkit-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Owner toggle — Sales Center ──
  if (isOwner && ownerView) {
    const kpiStyle = { fontSize: "var(--font-size-2xs)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" };
    const numStyle = { fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" };
    const smallNumStyle = { fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" };

    return (
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Sales Center</SectionTitle>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button onClick={exportCSV} style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)", cursor: "pointer", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-medium)" }}>
              Export
            </button>
            <button onClick={() => setOwnerView(false)} style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)", cursor: "pointer", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)" }}>
              Mine
            </button>
          </div>
        </div>

        {adminStats ? (
          <>
            {/* ── P&L Hero ── */}
            <Card style={{ marginBottom: "var(--space-3)", background: "#FFFFFF", border: "1px solid var(--color-border-light)", padding: "var(--space-6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-4)" }}>
                {[
                  { label: "MRR", value: `$${adminStats.mrr}`, color: undefined },
                  { label: "Net", value: `${adminStats.netIncome >= 0 ? "+" : ""}$${adminStats.netIncome}`, color: adminStats.netIncome >= 0 ? undefined : "var(--color-error)" },
                  { label: "Margin", value: `${adminStats.margin}%`, color: undefined },
                ].map((k, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={kpiStyle}>{k.label}</div>
                    <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)", color: k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: "var(--color-border)", marginBottom: "var(--space-3)" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>API cost </span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>${adminStats.actualApiCost}</span>
                </div>
                <div>
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Referral payouts </span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>${adminStats.totalMonthlyDollars}</span>
                </div>
                <div>
                  <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>ARR </span>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>${adminStats.mrr * 12}</span>
                </div>
              </div>
            </Card>

            {/* ── Funnel ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>Funnel</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
                {[
                  { label: "Users", value: adminStats.totalUsers },
                  { label: "Paying", value: adminStats.totalPaying },
                  { label: "Conv %", value: `${adminStats.conversionRate}%` },
                  { label: "ARPU", value: `$${adminStats.arpu}` },
                  { label: "Net ARPU", value: `$${adminStats.netArpu}` },
                  { label: "$/msg", value: `$${adminStats.costPerMessage}` },
                  { label: "LTV (12mo)", value: `$${adminStats.ltv}` },
                ].map((f, i) => (
                  <div key={i}>
                    <div style={smallNumStyle}>{f.value}</div>
                    <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{f.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Subscribers + Payouts side by side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
              <Card style={{ padding: "var(--space-4)" }}>
                <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>Subscribers</div>
                <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
                  {[
                    { label: "Trial", count: adminStats.subscribers.free },
                    { label: "Std", count: adminStats.subscribers.standard },
                    { label: "Pro", count: adminStats.subscribers.pro },
                    { label: "BYOK", count: adminStats.subscribers.byok || 0 },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={smallNumStyle}>{s.count}</div>
                      <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card style={{ padding: "var(--space-4)" }}>
                <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>Payouts</div>
                <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
                  {[
                    { label: "Paid", value: `$${adminStats.totalPaidOut}` },
                    { label: "Pending", value: `$${adminStats.pendingPayouts}` },
                    { label: "/mo", value: `$${adminStats.totalMonthlyDollars}` },
                  ].map((p, i) => (
                    <div key={i} style={{ flex: 1 }}>
                      <div style={smallNumStyle}>{p.value}</div>
                      <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>{p.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* ── Referral Network ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>Referral network</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
                {[
                  { label: "Active", value: adminStats.activeReferrals },
                  { label: "Trial", value: adminStats.trialReferrals },
                  { label: "Churned", value: adminStats.churnedReferrals },
                  { label: "F\u00FCl/mo out", value: adminStats.totalMonthlyFul.toLocaleString() },
                ].map((r, i) => (
                  <div key={i}>
                    <div style={smallNumStyle}>{r.value}</div>
                    <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Monthly Trend ── */}
            {adminStats.monthlySignups && adminStats.monthlySignups.length > 0 && (
              <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <div style={kpiStyle}>Monthly trend</div>
                  <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
                    {[
                      { label: "6mo", value: 6 },
                      { label: "12mo", value: 12 },
                      { label: "All", value: 0 },
                    ].map((r) => (
                      <button key={r.value} onClick={() => setTrendRange(r.value)} style={{
                        fontSize: "var(--font-size-2xs)",
                        fontFamily: "var(--font-mono)",
                        padding: "2px var(--space-2)",
                        borderRadius: "var(--radius-xs)",
                        border: "1px solid var(--color-border-light)",
                        background: trendRange === r.value ? "var(--color-text)" : "var(--color-bg-elevated)",
                        color: trendRange === r.value ? "var(--color-bg)" : "var(--color-text-muted)",
                        cursor: "pointer",
                        fontWeight: "var(--font-weight-medium)",
                      }}>{r.label}</button>
                    ))}
                    <button onClick={() => {
                      const rows = [["Month", "Signups", "Activated", "Churned", "Net"]];
                      for (const m of adminStats.monthlySignups) rows.push([m.month, m.signups, m.activated, m.churned, m.net]);
                      const csv = rows.map(r => r.join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const u = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = u; a.download = `fulkit-trend-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(u);
                    }} style={{
                      fontSize: "var(--font-size-2xs)",
                      fontFamily: "var(--font-mono)",
                      padding: "2px var(--space-2)",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--color-border-light)",
                      background: "var(--color-bg-elevated)",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      marginLeft: "var(--space-1)",
                    }}>CSV</button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-xs)" }}>
                    <thead>
                      <tr>
                        {["Month", "Signups", "Activated", "Churned", "Net"].map(h => (
                          <th key={h} style={{ textAlign: h === "Month" ? "left" : "right", padding: "var(--space-1) var(--space-2)", borderBottom: "1px solid var(--color-border-light)", color: "var(--color-text-muted)", fontWeight: "var(--font-weight-medium)", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "var(--font-size-2xs)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.monthlySignups.map((m, i) => (
                        <tr key={i}>
                          <td style={{ padding: "var(--space-2)", fontWeight: "var(--font-weight-medium)" }}>{m.month}</td>
                          <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>{m.signups}</td>
                          <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)", color: m.activated > 0 ? "var(--color-success)" : "var(--color-text-dim)" }}>{m.activated}</td>
                          <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)", color: m.churned > 0 ? "var(--color-error)" : "var(--color-text-dim)" }}>{m.churned}</td>
                          <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: m.net > 0 ? "var(--color-success)" : m.net < 0 ? "var(--color-error)" : "var(--color-text-dim)" }}>{m.net > 0 ? "+" : ""}{m.net}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ── Recent payout history ── */}
            {adminStats.recentPayouts && adminStats.recentPayouts.length > 0 && (
              <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
                <div style={{ ...kpiStyle, marginBottom: "var(--space-2)" }}>Recent transfers</div>
                {adminStats.recentPayouts.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-1) 0", fontSize: "var(--font-size-xs)" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: p.status === "paid" ? "var(--color-text)" : p.status === "failed" ? "var(--color-error)" : "var(--color-text-muted)" }}>${p.amount_usd}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* ── User table ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>All users ({adminStats.totalUsers})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-xs)" }}>
                  <thead>
                    <tr>
                      {["Name", "Plan", "Refs", "Tier", "F\u00FCl/mo", "API $", "Msgs", "Joined"].map(h => (
                        <th key={h} style={{ textAlign: h === "Name" ? "left" : "right", padding: "var(--space-1) var(--space-2)", borderBottom: "1px solid var(--color-border-light)", color: "var(--color-text-muted)", fontWeight: "var(--font-weight-medium)", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: "var(--font-size-2xs)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(adminStats.userTable || []).map((u, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "var(--space-2)", fontWeight: "var(--font-weight-medium)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", textTransform: "capitalize" }}>{u.seat}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>{u.refs}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right" }}>{u.tier}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>{u.ful}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>${u.apiSpend}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", fontFamily: "var(--font-mono)" }}>{u.messages}</td>
                        <td style={{ padding: "var(--space-2)", textAlign: "right", color: "var(--color-text-muted)" }}>{u.joined ? new Date(u.joined).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── Activity ── */}
            <Card style={{ padding: "var(--space-4)" }}>
              <div style={{ ...kpiStyle, marginBottom: "var(--space-3)" }}>Platform activity</div>
              <div style={{ display: "flex", gap: "var(--space-6)" }}>
                <div>
                  <div style={smallNumStyle}>{adminStats.totalMessages?.toLocaleString()}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Messages (this period)</div>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card><div style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--color-text-dim)", fontSize: "var(--font-size-sm)" }}>Loading...</div></Card>
        )}
      </div>
    );
  }

  // ── User view ──
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <SectionTitle style={{ marginBottom: 0 }}>Get F{"\u00FC"}lkit</SectionTitle>
        {isOwner && (
          <button onClick={() => setOwnerView(true)} style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-3)", cursor: "pointer", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)" }}>
            All
          </button>
        )}
      </div>

      {/* Hero CTA — Dieter Rams poster */}
      <Card style={{
        marginBottom: "var(--space-3)",
        background: "#FFFFFF",
        color: "var(--color-text)",
        border: "1px solid var(--color-border-light)",
        padding: "var(--space-8) var(--space-6)",
        overflow: "hidden",
      }}>
        {/* Eyebrow */}
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-medium)",
          textTransform: "uppercase",
          letterSpacing: "3px",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-3)",
        }}>
          Refer {"\u00B7"} Earn {"\u00B7"} Go free
        </div>

        {/* Headline */}
        <div style={{
          fontSize: "var(--font-size-4xl)",
          fontWeight: "var(--font-weight-black)",
          letterSpacing: "var(--letter-spacing-tighter)",
          lineHeight: "var(--line-height-none)",
          marginBottom: "var(--space-2)",
        }}>
          Get F{"\u00FC"}lkit.
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-normal)",
          marginBottom: "var(--space-6)",
          maxWidth: 280,
        }}>
          Share the link. They pay, you earn {"\u2014"} forever.
        </div>

        {/* Bauhaus rule */}
        <div style={{ height: 1, background: "var(--color-border)", marginBottom: "var(--space-5)" }} />

        {/* 4-column progression */}
        <div style={{
          fontSize: "var(--font-size-2xs)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wider)",
          color: "var(--color-text-muted)",
          marginBottom: "var(--space-3)",
        }}>
          Friends joined
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          textAlign: "center",
          marginBottom: "var(--space-5)",
        }}>
          {cheatsheet.map((row, i) => (
            <div key={i}>
              <div style={{
                fontSize: "var(--font-size-2xl)",
                fontFamily: "var(--font-mono)",
                fontWeight: "var(--font-weight-black)",
                lineHeight: "var(--line-height-none)",
                marginBottom: "var(--space-1)",
              }}>
                {row.refs}
              </div>
              <div style={{
                fontSize: "var(--font-size-2xs)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-muted)",
                lineHeight: "var(--line-height-tight)",
              }}>
                {row.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bauhaus rule */}
        <div style={{ height: 1, background: "var(--color-border)", marginBottom: "var(--space-3)" }} />

        {/* Legend */}
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontFamily: "var(--font-mono)",
          color: "var(--color-text-dim)",
          letterSpacing: "0.3px",
        }}>
          1 active referral = 100 F{"\u00FC"}l = $1/mo
        </div>
      </Card>

      {/* Tier payout legend */}
      <Card style={{ marginBottom: "var(--space-4)", padding: 0, overflow: "hidden" }}>
        <div style={{
          fontSize: "var(--font-size-2xs)",
          fontWeight: "var(--font-weight-semibold)",
          textTransform: "uppercase",
          letterSpacing: "var(--letter-spacing-wider)",
          color: "var(--color-text-muted)",
          padding: "var(--space-3) var(--space-4) var(--space-2)",
        }}>
          F{"\u00FC"}l you, pay me.
        </div>
        {[
          { refs: "25+", tier: "Builder", monthly: "$12.50", yearly: "$150/yr", note: "Cash unlocks" },
          { refs: "100+", tier: "Architect", monthly: "$105", yearly: "$1,260/yr", note: "120 F\u00FCl/ref" },
          { refs: "250+", tier: "Ambassador", monthly: "$310", yearly: "$3,720/yr", note: "130 F\u00FCl/ref" },
          { refs: "2,000+", tier: "", monthly: "$2,585", yearly: "$31,020/yr", note: "Do the math" },
        ].map((row, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderTop: "1px solid var(--color-border-light)",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)", flex: 1 }}>
              <span style={{
                fontSize: "var(--font-size-sm)",
                fontFamily: "var(--font-mono)",
                fontWeight: "var(--font-weight-bold)",
                minWidth: 36,
              }}>
                {row.refs}
              </span>
              <span style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}>
                {row.tier}{row.note ? ` \u00B7 ${row.note}` : ""}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{
                fontSize: "var(--font-size-lg)",
                fontFamily: "var(--font-mono)",
                fontWeight: "var(--font-weight-black)",
              }}>
                {row.monthly}
              </span>
              <span style={{
                fontSize: "var(--font-size-2xs)",
                color: "var(--color-text-dim)",
                marginLeft: "var(--space-2)",
              }}>
                {row.yearly}
              </span>
            </div>
          </div>
        ))}
      </Card>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        {[
          { label: "Active referrals", value: loading ? "..." : activeRefs },
          { label: `Monthly F\u00FCl`, value: loading ? "..." : monthlyFul.toLocaleString() },
          { label: "Tier", value: loading ? "..." : (tier ? tier.label : "—") },
        ].map((kpi, i) => (
          <Card key={i} style={{ textAlign: "center", padding: "var(--space-3)" }}>
            <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>{kpi.label}</div>
            <div style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Tier progress */}
      <Card style={{ marginBottom: "var(--space-4)", padding: "var(--space-3) var(--space-4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
          {tierNames.map((t) => {
            const isActive = tier && t.id <= tier.id;
            const isCurrent = tier && t.id === tier.id;
            return (
              <div key={t.id} style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: "var(--font-size-2xs)", fontWeight: isCurrent ? "var(--font-weight-bold)" : "var(--font-weight-medium)", color: isActive ? "var(--color-text)" : "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>{t.label}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>{t.min}{t.max === Infinity ? "+" : `–${t.max}`}</div>
              </div>
            );
          })}
        </div>
        <div style={{ height: 4, borderRadius: "var(--radius-full)", background: "var(--color-border-light)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            borderRadius: "var(--radius-full)",
            background: "var(--color-text)",
            width: `${Math.min(100, (activeRefs / 100) * 100)}%`,
            transition: "width var(--duration-slow) var(--ease-default)",
          }} />
        </div>
        {toFree > 0 && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
            {toFree} more active referral{toFree !== 1 ? "s" : ""} to cover your {seatType === "pro" ? "Pro" : "Standard"} subscription.
          </div>
        )}
        {toFree === 0 && activeRefs > 0 && (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-success)", marginTop: "var(--space-2)" }}>
            Your subscription is covered by referrals.
          </div>
        )}
      </Card>

      {/* Referral link */}
      <Card style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-2)" }}>Your referral link</div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <input
            readOnly
            value={refLink}
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
            onClick={copyLink}
            style={{
              padding: "var(--space-2) var(--space-4)",
              background: copied ? "var(--color-bg-inverse)" : "var(--color-text)",
              color: "var(--color-bg)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              fontFamily: "var(--font-primary)",
              cursor: "pointer",
              transition: "background var(--duration-normal) var(--ease-default)",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
          Every friend who joins earns you {REFERRALS.fulPerRef} F{"\u00FC"}l/mo (${REFERRALS.creditPerRef}) off your subscription.
        </div>
      </Card>

      {/* Referral list */}
      <SectionTitle>Your referrals</SectionTitle>
      {stats?.referrals?.length > 0 ? (
        <Card>
          {stats.referrals.map((ref, i) => (
            <div
              key={ref.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-2) 0",
                borderBottom: i < stats.referrals.length - 1 ? "1px solid var(--color-border-light)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: ref.status === "active" ? "var(--color-success-soft)" : "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)" }} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{ref.name}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                    Since {new Date(ref.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </div>
                </div>
              </div>
              <span style={statusBadge(ref.status)}>{ref.status}</span>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
            {loading ? "Loading..." : "No referrals yet. Share your link to earn credits."}
          </div>
        </Card>
      )}
    </div>
  );
}

function BillingTab() {
  const { user, profile, isOwner, accessToken } = useAuth();
  const [loading, setLoading] = useState(null);
  // Owner view: "mine" | "all" | "sample"
  const [ownerView, setOwnerViewRaw] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fulkit-billing-owner");
      if (stored === "all" || stored === "sample") return stored;
      if (stored === "true") return "all"; // migrate old boolean
    }
    return "mine";
  });
  const setOwnerView = (val) => { setOwnerViewRaw(val); localStorage.setItem("fulkit-billing-owner", val); };
  const [adminStats, setAdminStats] = useState(null);
  const [refStats, setRefStats] = useState(null);
  const [billingInfo, setBillingInfo] = useState(null);
  const [sampleKey, setSampleKey] = useState("standard");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for checkout success redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setShowSuccess(true);
      // Clean URL without reload
      const url = new URL(window.location);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url);
      // Auto-dismiss after 6s
      const t = setTimeout(() => setShowSuccess(false), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const seatType = profile?.seat_type || "free";
  const seatLimit = SEAT_LIMITS[seatType] || SEAT_LIMITS.free;
  const messagesUsed = profile?.messages_this_month || 0;
  const remaining = seatLimit - messagesUsed;
  const gaugeLow = remaining <= Math.ceil(seatLimit * 0.1);
  const gaugeCapped = remaining <= 0;
  const gaugeColor = gaugeCapped ? "var(--color-error)" : gaugeLow ? "var(--color-warning)" : "var(--color-accent)";

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/referrals/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json()).then(setRefStats).catch(() => {});
    // Fetch Stripe billing info for non-owner users
    if (!isOwner) {
      fetch("/api/stripe/billing", { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(r => r.json()).then(setBillingInfo).catch(() => {});
    }
  }, [accessToken, isOwner]);

  useEffect(() => {
    if (!isOwner || ownerView !== "all" || !accessToken) return;
    fetch("/api/referrals/admin", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json()).then(setAdminStats).catch(() => {});
  }, [isOwner, ownerView, accessToken]);

  async function handleCheckout(plan) {
    if (!accessToken) return;
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setLoading(null); }
  }

  async function handlePortal() {
    if (!accessToken) return;
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setLoading(null); }
  }

  const refCredit = refStats?.monthlyDollars || 0;
  const refActiveCount = refStats?.activeReferrals || 0;
  const refFul = refStats?.monthlyFul || 0;
  const refTier = refStats?.tier;
  const lifetimeFul = refStats?.lifetimeFulEarned || 0;

  // Payout history for user view
  const [payoutStats, setPayoutStats] = useState(null);
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/referrals/payout/status", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.json()).then(setPayoutStats).catch(() => {});
  }, [accessToken]);

  // User billing CSV export
  function exportBillingCSV() {
    const rows = [["Category", "Detail", "Value"]];
    rows.push(["Plan", "Type", isOwner ? "Owner (BYOK)" : (PLAN_LABELS[seatType] || "Free")]);
    rows.push(["Plan", "Price", isOwner ? "Unlimited" : (PLAN_PRICES[seatType] || "$0")]);
    rows.push(["Plan", "Messages/mo", isOwner ? "Unlimited" : String(seatLimit)]);
    rows.push(["Usage", "Messages used", String(messagesUsed)]);
    rows.push(["Usage", "Messages remaining", isOwner ? "Unlimited" : String(remaining)]);
    rows.push(["Referrals", "Active", String(refActiveCount)]);
    rows.push(["Referrals", "Monthly F\u00FCl", String(refFul)]);
    rows.push(["Referrals", "Monthly credit", `$${refCredit}`]);
    rows.push(["Referrals", "Tier", refTier ? refTier.label : "None"]);
    rows.push(["Referrals", "Lifetime F\u00FCl earned", String(lifetimeFul)]);
    if (payoutStats?.totalPaid) rows.push(["Payouts", "Total paid", `$${payoutStats.totalPaid}`]);
    if (payoutStats?.payouts?.length) {
      payoutStats.payouts.forEach(p => {
        rows.push(["Payout", new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), `$${p.amount_usd} (${p.status})`]);
      });
    }
    if (billingInfo?.subscription) {
      rows.push(["Subscription", "Status", billingInfo.subscription.status]);
      rows.push(["Subscription", "Renews", billingInfo.subscription.currentPeriodEnd ? new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"]);
      rows.push(["Subscription", "Auto-renew", billingInfo.subscription.cancelAtPeriodEnd ? "Off" : "On"]);
    }
    if (billingInfo?.paymentMethod) {
      rows.push(["Payment", "Card", `${billingInfo.paymentMethod.brand} ····${billingInfo.paymentMethod.last4}`]);
      rows.push(["Payment", "Expires", `${billingInfo.paymentMethod.expMonth}/${billingInfo.paymentMethod.expYear}`]);
    }
    if (billingInfo?.invoices?.length) {
      billingInfo.invoices.forEach(inv => {
        rows.push(["Invoice", new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), `$${inv.amount} (${inv.status})`]);
      });
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fulkit-billing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Owner financials (All) ──
  if (isOwner && ownerView === "all") {
    const kpiLabel = { fontSize: "var(--font-size-2xs)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" };
    const bigNum = { fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" };

    // Revenue by plan
    const stdRevenue = adminStats ? adminStats.subscribers.standard * TIERS.standard.price : 0;
    const proRevenue = adminStats ? adminStats.subscribers.pro * TIERS.pro.price : 0;

    const viewPill = (label, value) => ({
      fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)",
      padding: "var(--space-1) var(--space-3)", cursor: "pointer", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
      background: ownerView === value ? "var(--color-accent)" : "var(--color-bg-elevated)",
      color: ownerView === value ? "var(--color-text-inverse)" : "var(--color-text-muted)",
    });

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Financials</SectionTitle>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            <button onClick={() => setOwnerView("mine")} style={viewPill("Mine", "mine")}>Mine</button>
            <button onClick={() => setOwnerView("sample")} style={viewPill("Sample", "sample")}>Sample</button>
            <button style={{ ...viewPill("All", "all"), cursor: "default" }}>All</button>
          </div>
        </div>

        {adminStats ? (
          <>
            {/* ── P&L ── */}
            <Card style={{ marginBottom: "var(--space-3)", background: "#FFFFFF", border: "1px solid var(--color-border-light)", padding: "var(--space-5)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
                <div>
                  <div style={kpiLabel}>MRR</div>
                  <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" }}>${adminStats.mrr}</div>
                </div>
                <div>
                  <div style={kpiLabel}>Net</div>
                  <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)", color: adminStats.netIncome >= 0 ? "var(--color-text)" : "var(--color-error)" }}>
                    {adminStats.netIncome >= 0 ? "+" : ""}${adminStats.netIncome}
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--color-border)", marginBottom: "var(--space-3)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>ARR <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>${adminStats.mrr * 12}</span></span>
                <span style={{ color: "var(--color-text-muted)" }}>Margin <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text)" }}>{adminStats.margin}%</span></span>
              </div>
            </Card>

            {/* ── Revenue by plan ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiLabel, marginBottom: "var(--space-3)" }}>Revenue by plan</div>
              {[
                { label: `Standard ($${TIERS.standard.price}/mo)`, count: adminStats.subscribers.standard, revenue: stdRevenue },
                { label: `Pro ($${TIERS.pro.price}/mo)`, count: adminStats.subscribers.pro, revenue: proRevenue },
                { label: "Credit purchases", count: null, revenue: adminStats.creditRevenue || 0 },
                { label: "Trial", count: adminStats.subscribers.free, revenue: 0 },
              ].map((plan, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: i < 2 ? "1px solid var(--color-border-light)" : "none" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{plan.label}</span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginLeft: "var(--space-2)" }}>{plan.count} users</span>
                  </div>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>${plan.revenue}/mo</span>
                </div>
              ))}
            </Card>

            {/* ── Cost breakdown ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiLabel, marginBottom: "var(--space-3)" }}>Costs</div>
              {[
                { label: "API spend (actual)", value: `$${adminStats.actualApiCost}`, note: `$${adminStats.totalPaying > 0 ? (adminStats.actualApiCost / adminStats.totalPaying).toFixed(2) : "0"}/paying user` },
                { label: "Referral credits", value: `$${adminStats.totalMonthlyDollars}`, note: `${adminStats.totalMonthlyFul.toLocaleString()} F\u00FCl` },
                { label: "Total paid out", value: `$${adminStats.totalPaidOut}`, note: adminStats.pendingPayouts > 0 ? `$${adminStats.pendingPayouts} pending` : "all-time" },
              ].map((cost, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: i < 2 ? "1px solid var(--color-border-light)" : "none" }}>
                  <div>
                    <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" }}>{cost.label}</span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginLeft: "var(--space-2)" }}>{cost.note}</span>
                  </div>
                  <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{cost.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-2)", marginTop: "var(--space-2)", borderTop: "2px solid var(--color-border)" }}>
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)" }}>Total costs/mo</span>
                <span style={{ fontSize: "var(--font-size-sm)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-black)" }}>${Math.round((adminStats.actualApiCost + adminStats.totalMonthlyDollars + (adminStats.pendingPayouts || 0)) * 100) / 100}</span>
              </div>
            </Card>

            {/* ── Payout history ── */}
            <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
              <div style={{ ...kpiLabel, marginBottom: "var(--space-3)" }}>Stripe payouts</div>
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-3)" }}>
                <div style={{ flex: 1 }}>
                  <div style={bigNum}>${adminStats.totalPaidOut}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Paid out</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNum}>${adminStats.pendingPayouts}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Pending</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNum}>${adminStats.totalMonthlyDollars}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Monthly obligation</div>
                </div>
              </div>
              {adminStats.recentPayouts && adminStats.recentPayouts.length > 0 && (
                <>
                  <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-2)" }} />
                  <div style={{ ...kpiLabel, marginBottom: "var(--space-2)" }}>Recent transfers</div>
                  {adminStats.recentPayouts.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1) 0", fontSize: "var(--font-size-xs)" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: "var(--font-weight-bold)",
                        color: p.status === "paid" ? "var(--color-success)" : p.status === "failed" ? "var(--color-error)" : p.status === "rollover" ? "var(--color-warning)" : "var(--color-text-muted)",
                      }}>
                        {p.status === "paid" ? "" : p.status === "failed" ? "FAILED " : p.status === "rollover" ? "ROLLOVER " : "PENDING "}${p.amount_usd}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {(!adminStats.recentPayouts || adminStats.recentPayouts.length === 0) && (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-2) 0" }}>No payouts yet</div>
              )}
            </Card>

            {/* ── Unit economics ── */}
            <Card style={{ padding: "var(--space-4)" }}>
              <div style={{ ...kpiLabel, marginBottom: "var(--space-3)" }}>Unit economics</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
                {[
                  { label: "ARPU", value: `$${adminStats.arpu}` },
                  { label: "Net ARPU", value: `$${adminStats.netArpu}` },
                  { label: "$/msg", value: `$${adminStats.costPerMessage}` },
                  { label: "LTV (12mo)", value: `$${adminStats.ltv}` },
                  { label: "CAC", value: "$0" },
                ].map((m, i) => (
                  <div key={i}>
                    <div style={bigNum}>{m.value}</div>
                    <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{m.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", marginTop: "var(--space-3)", textAlign: "center" }}>
                CAC is $0 — referral-only growth, no paid acquisition
              </div>
            </Card>
          </>
        ) : (
          <Card><div style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--color-text-dim)", fontSize: "var(--font-size-sm)" }}>Loading...</div></Card>
        )}
      </div>
    );
  }

  // ── Shared styles for user views ──
  const kpiLabelUser = { fontSize: "var(--font-size-2xs)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" };
  const bigNumUser = { fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)" };
  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;

  // ── Owner pill style helper ──
  const ownerPill = (value) => ({
    fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)",
    padding: "var(--space-1) var(--space-3)", cursor: "pointer", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
    background: ownerView === value ? "var(--color-accent)" : "var(--color-bg-elevated)",
    color: ownerView === value ? "var(--color-text-inverse)" : "var(--color-text-muted)",
  });

  // ── Owner "Sample" view (preview what users see) ──
  if (isOwner && ownerView === "sample") {
    const SAMPLE_PROFILES = {
      standard: {
        label: "Standard", name: "Sarah Chen", email: "sarah@example.com", seat: "standard", joined: "April 2026",
        limit: SEAT_LIMITS.standard, used: 138, refs: 3, ful: 300, credit: 3, tier: "Piece", fulPerRef: 100, lifetimeFul: 1200,
        card: { brand: "Visa", last4: "4242", exp: "12/28" },
        sub: { status: "active", renews: "Jul 17, 2026", amount: TIERS.standard.price, autoRenew: true, cancelAtPeriodEnd: false },
        invoices: [
          { date: "Jun 17, 2026", amount: 9, status: "paid" },
          { date: "May 17, 2026", amount: 9, status: "paid" },
          { date: "Apr 17, 2026", amount: 9, status: "paid" },
        ],
        payout: null, upgradeLabel: "Upgrade to Pro", downgradeLabel: null,
      },
      free: {
        label: "Free", name: "Jamie Rivera", email: "jamie@gmail.com", seat: "free", joined: "June 2026",
        limit: SEAT_LIMITS.free, used: 72, refs: 0, ful: 0, credit: 0, tier: null, fulPerRef: 0, lifetimeFul: 0,
        card: null, sub: null,
        invoices: [],
        payout: null, upgradeLabel: null, downgradeLabel: null,
      },
      pro: {
        label: "Pro", name: "Marcus Bell", email: "marcus@company.co", seat: "pro", joined: "April 2026",
        limit: SEAT_LIMITS.pro, used: 410, refs: 12, ful: 1200, credit: 12, tier: "Component", fulPerRef: 100, lifetimeFul: 4800,
        card: { brand: "Mastercard", last4: "8819", exp: "03/29" },
        sub: { status: "active", renews: "Jul 17, 2026", amount: TIERS.pro.price, autoRenew: true, cancelAtPeriodEnd: false },
        invoices: [
          { date: "Jun 17, 2026", amount: 3, status: "paid" },
          { date: "May 17, 2026", amount: 3, status: "paid" },
          { date: "Apr 17, 2026", amount: 15, status: "paid" },
        ],
        payout: null, upgradeLabel: null, downgradeLabel: "Downgrade to Standard",
      },
      builder: {
        label: "Builder", name: "Alex Kim", email: "alex@startup.io", seat: "pro", joined: "April 2026",
        limit: SEAT_LIMITS.pro, used: 220, refs: 32, ful: 3520, credit: 15, tier: "Builder", fulPerRef: 110, lifetimeFul: 14080,
        card: { brand: "Amex", last4: "1001", exp: "09/27" },
        sub: { status: "active", renews: "Jul 17, 2026", amount: 0, autoRenew: true, cancelAtPeriodEnd: false },
        invoices: [
          { date: "Jun 17, 2026", amount: 0, status: "paid" },
          { date: "May 17, 2026", amount: 0, status: "paid" },
          { date: "Apr 17, 2026", amount: 0, status: "paid" },
        ],
        payout: { totalPaid: 52.50, pending: 1 }, upgradeLabel: null, downgradeLabel: null,
      },
      canceling: {
        label: "Canceling", name: "Nina Park", email: "nina@web.dev", seat: "standard", joined: "May 2026",
        limit: SEAT_LIMITS.standard, used: 31, refs: 1, ful: 100, credit: 1, tier: "Piece", fulPerRef: 100, lifetimeFul: 300,
        card: { brand: "Visa", last4: "5567", exp: "01/27" },
        sub: { status: "active", renews: null, amount: TIERS.standard.price, autoRenew: false, cancelAtPeriodEnd: true, endsAt: "Jul 17, 2026" },
        invoices: [
          { date: "Jun 17, 2026", amount: 8, status: "paid" },
          { date: "May 17, 2026", amount: 9, status: "paid" },
        ],
        payout: null, upgradeLabel: null, downgradeLabel: null,
      },
      pastdue: {
        label: "Past Due", name: "Devon Okafor", email: "devon@mail.com", seat: "pro", joined: "April 2026",
        limit: SEAT_LIMITS.pro, used: 0, refs: 5, ful: 500, credit: 5, tier: "Piece", fulPerRef: 100, lifetimeFul: 2000,
        card: { brand: "Visa", last4: "9203", exp: "11/25" },
        sub: { status: "past_due", renews: null, amount: TIERS.pro.price, autoRenew: true, cancelAtPeriodEnd: false },
        invoices: [
          { date: "Jun 17, 2026", amount: 10, status: "open" },
          { date: "May 17, 2026", amount: 15, status: "paid" },
          { date: "Apr 17, 2026", amount: 15, status: "paid" },
        ],
        payout: null, upgradeLabel: null, downgradeLabel: null,
      },
    };

    const s = SAMPLE_PROFILES[sampleKey];
    const sRemaining = s.limit - s.used;
    const sGaugeLow = sRemaining <= Math.ceil(s.limit * 0.1);
    const sGaugeCapped = sRemaining <= 0;
    const sGaugeColor = sGaugeCapped ? "var(--color-error)" : sGaugeLow ? "var(--color-warning)" : "var(--color-accent)";
    const sPlanLabel = PLAN_LABELS[s.seat] || "Free";
    const sPlanPrice = PLAN_PRICES[s.seat] || "Free";
    const sMaxTokens = s.seat === "pro" ? "4,096" : "2,048";
    const statusBg = s.sub?.status === "active" ? "var(--color-success-soft)" : s.sub?.status === "past_due" ? "var(--color-error-soft)" : "var(--color-bg)";
    const statusColor = s.sub?.status === "active" ? "var(--color-success)" : s.sub?.status === "past_due" ? "var(--color-error)" : "var(--color-text-dim)";
    const statusLabel = s.sub?.cancelAtPeriodEnd ? "Canceling" : (s.sub?.status || "\u2014");
    const samplePill = (key) => ({
      fontSize: "var(--font-size-2xs)", fontFamily: "var(--font-primary)", fontWeight: "var(--font-weight-medium)",
      padding: "var(--space-0.5) var(--space-2)", cursor: "pointer", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)",
      background: sampleKey === key ? "var(--color-accent)" : "transparent",
      color: sampleKey === key ? "var(--color-text-inverse)" : "var(--color-text-muted)",
    });

    return (
      <div>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Billing <span style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontWeight: "var(--font-weight-normal)" }}>({s.name})</span></SectionTitle>
          <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            <button onClick={() => setOwnerView("mine")} style={ownerPill("mine")}>Mine</button>
            <button style={{ ...ownerPill("sample"), cursor: "default" }}>Sample</button>
            <button onClick={() => setOwnerView("all")} style={ownerPill("all")}>All</button>
          </div>
        </div>
        {/* Profile pills */}
        <div style={{ display: "flex", gap: "var(--space-1)", marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          {Object.keys(SAMPLE_PROFILES).map(key => (
            <button key={key} onClick={() => setSampleKey(key)} style={samplePill(key)}>{SAMPLE_PROFILES[key].label}</button>
          ))}
        </div>

        {/* Plan hero */}
        <Card style={{ marginBottom: "var(--space-3)", background: "#FFFFFF", border: "1px solid var(--color-border-light)", padding: "var(--space-5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
            <div>
              <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)" }}>{sPlanLabel}</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>
                {sPlanPrice} {"\u00B7"} Member since {s.joined}
              </div>
            </div>
            {s.seat === "free" ? (
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <span style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>Standard {PLAN_PRICES.standard}</span>
                <span style={{ padding: "var(--space-1-5) var(--space-3)", background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>Pro {PLAN_PRICES.pro}</span>
              </div>
            ) : s.upgradeLabel ? (
              <span style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>{s.upgradeLabel}</span>
            ) : s.downgradeLabel ? (
              <span style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-dim)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{s.downgradeLabel}</span>
            ) : null}
          </div>
          <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-3)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
            {[
              { label: "Messages", value: `${s.limit}/mo` },
              { label: "Model", value: "Claude Sonnet" },
              { label: "Max tokens", value: sMaxTokens },
              { label: s.seat === "free" ? "Upgrade" : "Credits", value: "Available" },
            ].map((b, i) => (
              <div key={i}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)" }}>{b.value}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{b.label}</div>
              </div>
            ))}
          </div>
          {s.sub && (
            <>
              <div style={{ height: 1, background: "var(--color-border-light)", margin: "var(--space-3) 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Status</span>
                  <span style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-bold)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "var(--space-0.5) var(--space-2)", borderRadius: "var(--radius-sm)", background: statusBg, color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  {s.sub.cancelAtPeriodEnd ? `Ends ${s.sub.endsAt}` : s.sub.renews ? `Renews ${s.sub.renews} \u00B7 $${s.sub.amount}` : s.sub.status === "past_due" ? "Payment failed" : ""}
                </span>
              </div>
            </>
          )}
        </Card>

        {/* Fül Gauge */}
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>F{"\u00FC"}l gauge</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <div style={bigNumUser}>{sRemaining}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{s.used}</span> used of <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{s.limit}</span>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--color-border-light)", overflow: "hidden", marginBottom: "var(--space-2)" }}>
            <div style={{ height: "100%", width: `${Math.max(0, (sRemaining / s.limit) * 100)}%`, borderRadius: "var(--radius-full)", background: sGaugeColor }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: sGaugeCapped ? "var(--color-error)" : "var(--color-text-dim)" }}>
              {sGaugeCapped ? "Tank empty" : sGaugeLow ? "Running low" : `${sRemaining} messages remaining`}
            </span>
            <span style={{ padding: "var(--space-1) var(--space-3)", background: "var(--color-accent)", color: "var(--color-text-inverse)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)" }}>
              F{"\u00FC"}l up {"\u00B7"} {CREDITS.description}
            </span>
          </div>
        </Card>

        {/* Payment method */}
        {s.card && (
          <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
            <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Payment method</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <CreditCard size={16} strokeWidth={1.5} style={{ color: s.sub?.status === "past_due" ? "var(--color-error)" : "var(--color-text-muted)" }} />
                <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", textTransform: "capitalize" }}>
                  {s.card.brand} {"\u00B7\u00B7\u00B7\u00B7"}{s.card.last4}
                </span>
              </div>
              <span style={{ fontSize: "var(--font-size-xs)", color: s.sub?.status === "past_due" ? "var(--color-error)" : "var(--color-text-muted)" }}>
                {s.sub?.status === "past_due" ? "Expired " : "Expires "}{s.card.exp}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--font-size-xs)" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Receipts {"\u2192"} {s.email}</span>
              <span style={{ color: s.sub?.status === "past_due" ? "var(--color-error)" : "var(--color-text-muted)", textDecoration: "underline", fontWeight: s.sub?.status === "past_due" ? "var(--font-weight-bold)" : undefined }}>
                {s.sub?.status === "past_due" ? "Update now" : "Update"}
              </span>
            </div>
          </Card>
        )}

        {/* Referral earnings */}
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Referral earnings</div>
          {s.refs > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-3)" }}>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>{s.refs}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Active referrals</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>{s.ful.toLocaleString()}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>F{"\u00FC"}l/mo</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>${s.credit}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Credit/mo</div>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-2)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Tier</span>
                <span style={{ fontWeight: "var(--font-weight-bold)" }}>{s.tier} ({s.fulPerRef} F{"\u00FC"}l/ref)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Lifetime F{"\u00FC"}l earned</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{s.lifetimeFul.toLocaleString()}</span>
              </div>
              {s.credit > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Applied to subscription</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-success)" }}>{"\u2212"}${s.credit}/mo</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "var(--space-3) 0" }}>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>No referral earnings yet</div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Refer friends from the Referrals tab to earn F{"\u00FC"}l credits toward your plan.</div>
            </div>
          )}
        </Card>

        {/* Payouts (Builder+) */}
        {s.payout && (
          <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
            <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Payouts</div>
            <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={bigNumUser}>${s.payout.totalPaid}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Total paid</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={bigNumUser}>{s.payout.pending}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Pending</div>
              </div>
            </div>
          </Card>
        )}

        {/* Invoices */}
        {s.invoices.length > 0 && (
          <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
            <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Invoices</div>
            {s.invoices.map((inv, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1-5) 0", borderBottom: i < s.invoices.length - 1 ? "1px solid var(--color-border-light)" : "none" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{inv.date}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ fontSize: "var(--font-size-xs)", fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>${inv.amount}.00</span>
                  <span style={{ fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-bold)", textTransform: "uppercase", color: inv.status === "paid" ? "var(--color-success)" : inv.status === "open" ? "var(--color-warning)" : "var(--color-text-dim)" }}>{inv.status}</span>
                  <Download size={12} style={{ color: "var(--color-text-muted)" }} />
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Account */}
        <Card style={{ padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Account</div>
          {[
            { label: "Email", value: s.email },
            { label: "Account", value: s.name },
            { label: "Plan", value: `${sPlanLabel} (${sPlanPrice})` },
            ...(s.sub ? [{ label: "Auto-renew", value: s.sub.cancelAtPeriodEnd ? "Off" : "On" }] : []),
            { label: "Auth", value: "Google OAuth" },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1-5) 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-light)" : "none" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{row.label}</span>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{row.value}</span>
            </div>
          ))}
          {s.seat !== "free" && (
            <>
              <div style={{ marginTop: "var(--space-3)" }}>
                <div style={{ padding: "var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-secondary)", textAlign: "center" }}>
                  Manage subscription
                </div>
              </div>
              {!s.sub?.cancelAtPeriodEnd && (
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", textAlign: "center", marginTop: "var(--space-2)" }}>
                  Cancel subscription
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }

  // ── Owner "Mine" view ──
  if (isOwner) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
          <SectionTitle style={{ marginBottom: 0 }}>Billing</SectionTitle>
          <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center" }}>
            <button style={{ ...ownerPill("mine"), cursor: "default" }}>Mine</button>
            <button onClick={() => setOwnerView("sample")} style={ownerPill("sample")}>Sample</button>
            <button onClick={() => setOwnerView("all")} style={ownerPill("all")}>All</button>
          </div>
        </div>

        {/* ── Plan hero (white-white) ── */}
        <Card style={{ marginBottom: "var(--space-3)", background: "#FFFFFF", border: "1px solid var(--color-border-light)", padding: "var(--space-5)" }}>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)" }}>Owner</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>
              BYOK{memberSince ? ` \u00B7 Member since ${memberSince}` : ""}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-3)" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
            {[
              { label: "Messages", value: "Unlimited" },
              { label: "Model", value: "Claude Opus" },
              { label: "Max tokens", value: "128K" },
              { label: "API key", value: "Your own" },
            ].map((b, i) => (
              <div key={i}>
                <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)" }}>{b.value}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{b.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Referral earnings ── */}
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Referral earnings</div>
          {refActiveCount > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-3)" }}>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>{refActiveCount}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Active referrals</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>{refFul.toLocaleString()}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>F{"\u00FC"}l/mo</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={bigNumUser}>${refCredit}</div>
                  <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Credit/mo</div>
                </div>
              </div>
              <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-2)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Tier</span>
                <span style={{ fontWeight: "var(--font-weight-bold)" }}>{refTier ? refTier.label : "\u2014"}{refTier ? ` (${refTier.fulPerRef} F\u00FCl/ref)` : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Lifetime F{"\u00FC"}l earned</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{lifetimeFul.toLocaleString()}</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-3) 0" }}>
              No referral earnings yet.
            </div>
          )}
        </Card>

        {/* ── Account ── */}
        <Card style={{ padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Account</div>
          {[
            { label: "Email", value: user?.email || "\u2014" },
            { label: "Account", value: profile?.name || user?.user_metadata?.full_name || "\u2014" },
            { label: "Role", value: "Owner" },
            { label: "Auth", value: "Google OAuth" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1-5) 0", borderBottom: i < 3 ? "1px solid var(--color-border-light)" : "none" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{row.label}</span>
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{row.value}</span>
            </div>
          ))}
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", marginTop: "var(--space-3)", textAlign: "center" }}>
            Using your own API key {"\u2014"} unlimited messages, no subscription required.
          </div>
        </Card>
      </div>
    );
  }

  // ── Regular user view ──
  const planLabel = PLAN_LABELS[seatType] || "Free";
  const planPrice = PLAN_PRICES[seatType] || "Free";
  const planBenefits = seatType === "pro" ? [
    { label: "Messages", value: `${seatLimit}/mo` },
    { label: "Model", value: "Claude Sonnet" },
    { label: "Max tokens", value: "4,096" },
    { label: "Credits", value: "Available" },
  ] : seatType === "standard" ? [
    { label: "Messages", value: `${seatLimit}/mo` },
    { label: "Model", value: "Claude Sonnet" },
    { label: "Max tokens", value: "2,048" },
    { label: "Credits", value: "Available" },
  ] : [
    { label: "Messages", value: `${seatLimit}/mo` },
    { label: "Model", value: "Claude Sonnet" },
    { label: "Max tokens", value: "2,048" },
    { label: "Upgrade", value: "Available" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
        <SectionTitle style={{ marginBottom: 0 }}>Billing</SectionTitle>
        <button onClick={exportBillingCSV} title="Export billing data" style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-light)", borderRadius: "var(--radius-sm)", padding: "var(--space-1) var(--space-2)", cursor: "pointer", fontFamily: "var(--font-primary)", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <Download size={10} /> CSV
        </button>
      </div>

      {/* ── Checkout success banner ── */}
      {showSuccess && (
        <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--color-success-soft)", border: "1px solid var(--color-success)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-success)" }}>Payment received {"\u2014"} you{"\u2019"}re all set.</div>
          <button onClick={() => setShowSuccess(false)} style={{ background: "none", border: "none", color: "var(--color-success)", cursor: "pointer", padding: "var(--space-1)", lineHeight: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Past due alert ── */}
      {billingInfo?.subscription?.status === "past_due" && (
        <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--color-error-soft)", border: "1px solid var(--color-error)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", color: "var(--color-error)", marginBottom: "var(--space-0.5)" }}>Payment failed</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Update your payment method to keep your subscription active.</div>
          </div>
          <button onClick={handlePortal} disabled={!!loading} style={{ padding: "var(--space-1-5) var(--space-3)", background: "var(--color-error)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", flexShrink: 0 }}>
            {loading === "portal" ? "..." : "Update payment"}
          </button>
        </div>
      )}

      {/* ── Canceling notice ── */}
      {billingInfo?.subscription?.cancelAtPeriodEnd && billingInfo.subscription.currentPeriodEnd && (
        <div style={{ marginBottom: "var(--space-3)", padding: "var(--space-3) var(--space-4)", background: "var(--color-warning-soft)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
            Your subscription is canceling. You have full access until <strong>{new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.
          </div>
        </div>
      )}

      {/* ── Plan hero (white-white) ── */}
      <Card style={{ marginBottom: "var(--space-3)", background: "#FFFFFF", border: "1px solid var(--color-border-light)", padding: "var(--space-5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
          <div>
            <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-black)" }}>{planLabel}</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>
              {planPrice}{memberSince ? ` \u00B7 Member since ${memberSince}` : ""}
            </div>
          </div>
          {seatType === "free" ? (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={() => handleCheckout("standard")} disabled={!!loading} style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading === "standard" ? "..." : `Standard ${PLAN_PRICES.standard}`}
              </button>
              <button onClick={() => handleCheckout("pro")} disabled={!!loading} style={{ padding: "var(--space-1-5) var(--space-3)", background: "var(--color-accent)", color: "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>
                {loading === "pro" ? "..." : `Pro ${PLAN_PRICES.pro}`}
              </button>
            </div>
          ) : seatType === "standard" ? (
            <button onClick={() => handleCheckout("pro")} disabled={!!loading} style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-secondary)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading === "pro" ? "..." : "Upgrade to Pro"}
            </button>
          ) : seatType === "pro" ? (
            <button onClick={() => setShowDowngradeModal(true)} style={{ padding: "var(--space-1-5) var(--space-3)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-dim)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", cursor: "pointer" }}>
              Downgrade to Standard
            </button>
          ) : null}
        </div>
        <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-3)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", textAlign: "center" }}>
          {planBenefits.map((b, i) => (
            <div key={i}>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-bold)", fontFamily: "var(--font-mono)" }}>{b.value}</div>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-0.5)" }}>{b.label}</div>
            </div>
          ))}
        </div>
        {/* Subscription status row */}
        {billingInfo?.subscription && (
          <>
            <div style={{ height: 1, background: "var(--color-border-light)", margin: "var(--space-3) 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Status</span>
                <span style={{
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: "var(--font-weight-bold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "var(--space-0.5) var(--space-2)",
                  borderRadius: "var(--radius-sm)",
                  background: billingInfo.subscription.status === "active" ? "var(--color-success-soft)" :
                    billingInfo.subscription.status === "trialing" ? "var(--color-warning-soft)" :
                    billingInfo.subscription.status === "past_due" ? "var(--color-error-soft)" : "var(--color-bg)",
                  color: billingInfo.subscription.status === "active" ? "var(--color-success)" :
                    billingInfo.subscription.status === "trialing" ? "var(--color-warning)" :
                    billingInfo.subscription.status === "past_due" ? "var(--color-error)" : "var(--color-text-dim)",
                }}>
                  {billingInfo.subscription.cancelAtPeriodEnd ? "Canceling" : billingInfo.subscription.status}
                </span>
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "right" }}>
                {billingInfo.subscription.cancelAtPeriodEnd && billingInfo.subscription.currentPeriodEnd
                  ? `Ends ${new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : billingInfo.subscription.currentPeriodEnd
                    ? `Renews ${new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u00B7 $${billingInfo.subscription.amount || TIERS[seatType]?.price || 0}`
                    : ""
                }
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Fül Gauge ── */}
      <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
        <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>F{"\u00FC"}l gauge</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
          <div style={bigNumUser}>{remaining}</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textAlign: "right" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{messagesUsed}</span> used of <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{seatLimit}</span>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: "var(--radius-full)", background: "var(--color-border-light)", overflow: "hidden", marginBottom: "var(--space-2)" }}>
          <div style={{ height: "100%", width: `${Math.max(0, (remaining / seatLimit) * 100)}%`, borderRadius: "var(--radius-full)", background: gaugeColor, transition: "width var(--duration-slow) var(--ease-default)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: gaugeCapped ? "var(--color-error)" : "var(--color-text-dim)" }}>
            {gaugeCapped ? "Tank empty" : gaugeLow ? "Running low" : `${remaining} messages remaining`}
          </span>
          <button onClick={() => handleCheckout("credits")} disabled={!!loading} style={{ padding: "var(--space-1) var(--space-3)", background: "var(--color-accent)", color: "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-2xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", opacity: loading === "credits" ? 0.6 : 1 }}>
            {loading === "credits" ? "..." : `F\u00fcl up \u00B7 ${CREDITS.description}`}
          </button>
        </div>
      </Card>

      {/* ── Payment method ── */}
      {billingInfo?.paymentMethod && (
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Payment method</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <CreditCard size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
              <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", textTransform: "capitalize" }}>
                {billingInfo.paymentMethod.brand} {"\u00B7\u00B7\u00B7\u00B7"}{billingInfo.paymentMethod.last4}
              </span>
            </div>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              Expires {billingInfo.paymentMethod.expMonth}/{billingInfo.paymentMethod.expYear}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "var(--font-size-xs)" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Receipts {"\u2192"} {billingInfo.billingEmail || user?.email}</span>
            <button onClick={handlePortal} disabled={!!loading} style={{ padding: 0, background: "none", border: "none", fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontFamily: "var(--font-primary)", cursor: "pointer", textDecoration: "underline" }}>
              {loading === "portal" ? "..." : "Update"}
            </button>
          </div>
        </Card>
      )}

      {/* ── Referral earnings ── */}
      <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
        <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Referral earnings</div>
        {refActiveCount > 0 ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-3)" }}>
              <div style={{ flex: 1 }}>
                <div style={bigNumUser}>{refActiveCount}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Active referrals</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={bigNumUser}>{refFul.toLocaleString()}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>F{"\u00FC"}l/mo</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={bigNumUser}>${refCredit}</div>
                <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Credit/mo</div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-2)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Tier</span>
              <span style={{ fontWeight: "var(--font-weight-bold)" }}>{refTier ? refTier.label : "\u2014"}{refTier ? ` (${refTier.fulPerRef} F\u00FCl/ref)` : ""}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Lifetime F{"\u00FC"}l earned</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)" }}>{lifetimeFul.toLocaleString()}</span>
            </div>
            {refCredit > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Applied to subscription</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--font-weight-bold)", color: "var(--color-success)" }}>{"\u2212"}${refCredit}/mo</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "var(--space-3) 0" }}>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)", marginBottom: "var(--space-1)" }}>No referral earnings yet</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>Refer friends from the Referrals tab to earn F{"\u00FC"}l credits toward your plan.</div>
          </div>
        )}
      </Card>

      {/* ── Payouts: connect CTA for Builder+ without Stripe Connect ── */}
      {payoutStats && !payoutStats.hasConnect && payoutStats.tier >= REFERRALS.payoutMinTier && (
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Payouts</div>
          <div style={{ textAlign: "center", padding: "var(--space-2) 0" }}>
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-1)" }}>Cash payouts unlocked</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
              Builder tier and above can convert F{"\u00FC"}l to cash via Stripe. Connect your account to start receiving payouts.
            </div>
            <button
              onClick={async () => {
                if (!accessToken) return;
                setLoading("connect");
                try {
                  const res = await fetch("/api/referrals/connect", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch {} finally { setLoading(null); }
              }}
              disabled={!!loading}
              style={{ display: "block", width: "100%", padding: "var(--space-2)", background: "var(--color-accent)", color: "var(--color-text-inverse)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", fontFamily: "var(--font-primary)", cursor: loading ? "wait" : "pointer", opacity: loading === "connect" ? 0.6 : 1 }}
            >
              {loading === "connect" ? "..." : "Connect Stripe"}
            </button>
          </div>
        </Card>
      )}

      {/* ── Payouts (if tier 4+ with connect) ── */}
      {payoutStats && payoutStats.hasConnect && (
        <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
          <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Payouts</div>
          <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginBottom: "var(--space-3)" }}>
            <div style={{ flex: 1 }}>
              <div style={bigNumUser}>${payoutStats.totalPaid || 0}</div>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Total paid</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={bigNumUser}>{payoutStats.payouts?.filter(p => p.status === "pending").length || 0}</div>
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)" }}>Pending</div>
            </div>
          </div>
          <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", textAlign: "center", marginBottom: "var(--space-2)" }}>
            Payouts process on the 1st of each month. $10 minimum.
          </div>
          {payoutStats.rolloverBalance > 0 && (
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-warning)", textAlign: "center", marginBottom: "var(--space-2)", fontWeight: "var(--font-weight-medium)" }}>
              ${payoutStats.rolloverBalance.toFixed(2)} accumulating {"\u2014"} pays out when it reaches $10
            </div>
          )}
          {payoutStats.payouts && payoutStats.payouts.length > 0 && (
            <>
              <div style={{ height: 1, background: "var(--color-border-light)", marginBottom: "var(--space-2)" }} />
              <div style={{ ...kpiLabelUser, marginBottom: "var(--space-2)" }}>Transfer history</div>
              {payoutStats.payouts.slice(0, 10).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1) 0", fontSize: "var(--font-size-xs)" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-bold)",
                    color: p.status === "paid" ? "var(--color-success)" : p.status === "failed" ? "var(--color-error)" : p.status === "rollover" ? "var(--color-warning)" : "var(--color-text-muted)",
                  }}>
                    {p.status === "paid" ? "" : p.status === "failed" ? "FAILED " : p.status === "rollover" ? "ROLLOVER " : "PENDING "}${p.amount_usd}
                  </span>
                </div>
              ))}
            </>
          )}
        </Card>
      )}

      {/* ── Invoices ── */}
      <Card style={{ marginBottom: "var(--space-3)", padding: "var(--space-4)" }}>
        <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Invoices</div>
        {billingInfo?.invoices && billingInfo.invoices.length > 0 ? (
          billingInfo.invoices.map((inv, i) => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1-5) 0", borderBottom: i < billingInfo.invoices.length - 1 ? "1px solid var(--color-border-light)" : "none" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span style={{
                  fontSize: "var(--font-size-xs)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-weight-bold)",
                }}>${inv.amount}</span>
                <span style={{
                  fontSize: "var(--font-size-2xs)",
                  fontWeight: "var(--font-weight-bold)",
                  textTransform: "uppercase",
                  color: inv.status === "paid" ? "var(--color-success)" : inv.status === "open" ? "var(--color-warning)" : "var(--color-text-dim)",
                }}>{inv.status}</span>
                {inv.pdf && (
                  <a href={inv.pdf} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)", display: "flex" }} title="Download PDF">
                    <Download size={12} />
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-dim)", textAlign: "center", padding: "var(--space-2) 0" }}>
            No invoices yet
          </div>
        )}
      </Card>

      {/* ── Account ── */}
      <Card style={{ padding: "var(--space-4)" }}>
        <div style={{ ...kpiLabelUser, marginBottom: "var(--space-3)" }}>Account</div>
        {[
          { label: "Email", value: user?.email || "\u2014" },
          { label: "Account", value: profile?.name || user?.user_metadata?.full_name || "\u2014" },
          { label: "Plan", value: `${planLabel} (${planPrice})` },
          { label: "Auto-renew", value: billingInfo?.subscription ? (billingInfo.subscription.cancelAtPeriodEnd ? "Off" : "On") : "\u2014" },
          { label: "Auth", value: "Google OAuth" },
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-1-5) 0", borderBottom: i < 4 ? "1px solid var(--color-border-light)" : "none" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{row.label}</span>
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)" }}>{row.value}</span>
          </div>
        ))}
        {seatType !== "free" && (
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
            <button onClick={handlePortal} disabled={!!loading} style={{ flex: 1, padding: "var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", color: "var(--color-text-secondary)", cursor: loading ? "wait" : "pointer", opacity: loading === "portal" ? 0.6 : 1 }}>
              {loading === "portal" ? "..." : "Manage subscription"}
            </button>
          </div>
        )}
        {seatType !== "free" && !billingInfo?.subscription?.cancelAtPeriodEnd && (
          <button onClick={() => setShowCancelModal(true)} disabled={!!loading} style={{ display: "block", width: "100%", marginTop: "var(--space-2)", padding: 0, background: "none", border: "none", fontSize: "var(--font-size-2xs)", color: "var(--color-text-dim)", fontFamily: "var(--font-primary)", cursor: "pointer", textAlign: "center" }}>
            Cancel subscription
          </button>
        )}
      </Card>

      {/* Downgrade confirmation modal */}
      {showDowngradeModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setShowDowngradeModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", maxWidth: 420, width: "90%", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-3)" }}>Downgrade to Standard?</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "var(--space-3)" }}>
              You{"\u2019"}ll lose:
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", lineHeight: 1.8, marginBottom: "var(--space-4)", paddingLeft: "var(--space-3)" }}>
              {"\u2022"} {SEAT_LIMITS.pro - SEAT_LIMITS.standard} fewer messages per month ({SEAT_LIMITS.pro} {"\u2192"} {SEAT_LIMITS.standard})<br />
              {"\u2022"} Max tokens reduced (4,096 {"\u2192"} 2,048)<br />
              {"\u2022"} Price drops from {PLAN_PRICES.pro} to {PLAN_PRICES.standard}
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={() => setShowDowngradeModal(false)} style={{ flex: 1, padding: "var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Keep Pro
              </button>
              <button onClick={() => { setShowDowngradeModal(false); handlePortal(); }} disabled={!!loading} style={{ flex: 1, padding: "var(--space-2)", background: "var(--color-text-secondary)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", color: "#fff", cursor: loading ? "wait" : "pointer" }}>
                {loading === "portal" ? "..." : "Downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => setShowCancelModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
          <div style={{ position: "relative", background: "var(--color-bg-elevated)", borderRadius: "var(--radius-md)", padding: "var(--space-6)", maxWidth: 420, width: "90%", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", marginBottom: "var(--space-3)" }}>Cancel subscription?</div>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "var(--space-4)" }}>
              {billingInfo?.subscription?.currentPeriodEnd ? (
                <>You{"\u2019"}ll keep full access until <strong style={{ color: "var(--color-text-primary)" }}>{new Date(billingInfo.subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.</>
              ) : (
                <>You{"\u2019"}ll keep access until the end of your current billing period.</>
              )}
              {refCredit > 0 && (
                <> Your <strong style={{ color: "var(--color-text-primary)" }}>${refCredit}/mo</strong> referral credit will pause.</>
              )}
              {" "}You can resubscribe anytime.
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button onClick={() => setShowCancelModal(false)} style={{ flex: 1, padding: "var(--space-2)", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Keep my plan
              </button>
              <button onClick={() => { setShowCancelModal(false); handlePortal(); }} disabled={!!loading} style={{ flex: 1, padding: "var(--space-2)", background: "var(--color-error)", border: "none", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", fontFamily: "var(--font-primary)", color: "#fff", cursor: loading ? "wait" : "pointer" }}>
                {loading === "portal" ? "..." : "Cancel subscription"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    if (!user || !canUpload) return;
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

  const noteCount = notes.length;

  const filteredNotes = notes.filter((n) => {
    if (modeFilter !== "all" && n.context_mode !== modeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (n.title || "").toLowerCase().includes(q) || (n.folder || "").toLowerCase().includes(q);
  });

  // Load notes list — re-fires when auth token refreshes
  useEffect(() => {
    if (!accessToken) return;
    loadNotes();
  }, [storageMode, vaultConnected, isUnlocked, accessToken]);

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
              Context is managed by folder structure. <code style={{ fontSize: "var(--font-size-2xs)", background: "var(--color-bg-alt)", padding: "1px 4px", borderRadius: "var(--radius-xs)" }}>_FULKIT/</code> files are always included.
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

  const [counts, setCounts] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [sectionData, setSectionData] = useState({});
  const [loadingSection, setLoadingSection] = useState(null);
  const [deleteModalType, setDeleteModalType] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

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
        {renderExpandableRow("Notes stored", counts?.notes, "note", "notes")}
        {renderExpandableRow("Conversations", counts?.conversations, "conversation", "conversations")}
        {renderExpandableRow("Memories", counts?.memories, "memory", "memories", "memories")}
        {renderExpandableRow("Onboarding answers", counts?.onboarding, "answer", "onboarding")}
        <Row label="Action items" value={counts ? `${counts.actions} action${counts.actions !== 1 ? "s" : ""}` : "Loading..."} />
        <Row label="Storage used" value={counts ? formatBytes(counts.storageBytes) : "Loading..."} />
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
