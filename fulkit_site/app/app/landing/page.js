"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import LogoMark from "../../components/LogoMark";
import { TIERS, CREDITS, REFERRALS } from "../../lib/ful-config";
import { PLANS } from "../../lib/ful-legend";
import { useIsMobile } from "../../lib/use-mobile";

const fulkitPrice = 9;

const TI = (d, vb = "0 0 24 24") => <svg width="20" height="20" viewBox={vb} fill="currentColor">{d}</svg>;
const TICKER_ITEMS = [
  { name: "Google Calendar", icon: TI(<><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" opacity=".6"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/><path d="M5.84 14.09A6.97 6.97 0 015.46 12c0-.72.12-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" opacity=".5"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".8"/></>) },
  { name: "Gmail", icon: TI(<><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" opacity=".6"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/><path d="M5.84 14.09A6.97 6.97 0 015.46 12c0-.72.12-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" opacity=".5"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".8"/></>) },
  { name: "Google Drive", icon: TI(<><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" opacity=".6"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/><path d="M5.84 14.09A6.97 6.97 0 015.46 12c0-.72.12-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" opacity=".5"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".8"/></>) },
  { name: "Spotify", icon: TI(<path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.623.623 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 11-.277-1.216c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.858zm1.224-2.719a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.452-1.492c3.632-1.102 8.147-.568 11.234 1.329a.78.78 0 01.255 1.072zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 11-.543-1.79c3.533-1.072 9.404-.865 13.115 1.338a.935.935 0 01-.954 1.611z"/>) },
  { name: "Square", icon: TI(<path d="M18 2H6C3.79 2 2 3.79 2 6v12c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4V6c0-2.21-1.79-4-4-4zm-1 13c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h8c.55 0 1 .45 1 1v6z"/>) },
  { name: "Stripe", icon: TI(<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>) },
  { name: "Shopify", icon: TI(<path d="M15.337 3.415c-.026-.018-.06-.018-.094-.008-.034.008-1.364.416-1.364.416-.358-.978-.988-1.875-2.098-1.875h-.094C11.38 1.49 10.96 1.32 10.592 1.32c-2.583 0-3.821 3.228-4.209 4.868l-1.813.562c-.56.175-.578.193-.648.717C3.862 8.032 2 22.18 2 22.18l12.308 2.126V3.432c-.078 0-.156-.008-.242-.008-.086 0-.173-.008-.242-.008l-.486-.001zm-1.886.866c-.648.201-1.364.42-2.089.648.403-1.54 1.16-2.291 1.822-2.573.26.344.434.858.267 1.925zm-1.635-2.24c.12 0 .233.043.345.12-.865.407-1.788 1.434-2.178 3.486l-1.652.511C10.92 4.09 11.653 2.041 11.816 2.041z"/>) },
  { name: "GitHub", icon: TI(<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>) },
  { name: "Slack", icon: TI(<><path d="M14.5 10c-.8 0-1.5-.7-1.5-1.5v-5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M20.5 10H19v-1.5c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5-.7 1.5-1.5 1.5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M9.5 14c.8 0 1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5S8 21.3 8 20.5v-5c0-.8.7-1.5 1.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 14H5v1.5c0 .8-.7 1.5-1.5 1.5S2 16.3 2 15.5 2.7 14 3.5 14z" fill="none" stroke="currentColor" strokeWidth="1.8"/></>) },
  { name: "Notion", icon: TI(<path d="M4.5 2.5c.3.2.4.3.8.3h12.5c.4 0 .9-.2 1.2-.5l.5.5c-.1.5-.2 1.3-.2 2.1v14.3c0 .8.1 1.2.3 1.5l-.3.3H14l-.3-.3c.2-.3.3-.6.3-1.5V5.5L8.2 20l-.4.3c-.2-.2-.5-.4-.9-.7L4 17.3V5.6c0-.8-.1-1.2-.3-1.5l.8-1.6z"/>) },
  { name: "QuickBooks", icon: TI(<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8"/>) },
  { name: "Fitbit", icon: TI(<><rect x="10" y="2" width="4" height="4" rx="1"/><rect x="10" y="7" width="4" height="4" rx="1"/><rect x="10" y="12" width="4" height="4" rx="1"/><rect x="10" y="17" width="4" height="5" rx="1"/><rect x="5" y="7" width="4" height="4" rx="1"/><rect x="15" y="7" width="4" height="4" rx="1"/><rect x="5" y="12" width="4" height="4" rx="1"/><rect x="15" y="12" width="4" height="4" rx="1"/></>) },
  { name: "Trello", icon: TI(<><rect x="3" y="3" width="7" height="18" rx="1.5" fill="currentColor"/><rect x="14" y="3" width="7" height="12" rx="1.5" fill="currentColor"/></>) },
  { name: "Dropbox", icon: TI(<path d="M6 2l6 4-6 4 6 4-6 4-6-4 6-4-6-4zm12 0l6 4-6 4 6 4-6 4-6-4 6-4-6-4z"/>) },
  { name: "Todoist", icon: TI(<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>) },
  { name: "OneNote", icon: TI(<><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8v8l4-6v6" fill="none" stroke="currentColor" strokeWidth="1.8"/></>) },
  { name: "Readwise", icon: TI(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" fill="none" stroke="currentColor" strokeWidth="1.8"/></>) },
  { name: "Obsidian", icon: TI(<path d="M23.7 3.3c5.6-6 15.5-2.2 15.8 5.8.2 4.8-1.5 9.8-1.5 14.6 0 8.5 6.2 16 14.6 17.4 4 .7 8.2-.2 11.5-2.7 5-3.8 12.3-1 12.3 5.3 0 4-2.5 7.6-5.2 10.5-5.6 6-12 11.4-15.4 18.8-2.7 5.8-3 12.3-4.3 18.5-.8 3.7-2 7.5-5 10-3.5 2.8-8.5 2.7-12.6 1.2C26 99 19.7 92 16.8 84.3c-2-5.2-2.4-10.9-4.5-16.1C9 60.5 2.6 53.8.6 45.5c-1.6-6.5 1-13.8 6.3-17.8 3.4-2.6 8-3.4 11.4-6 3-2.2 4.7-5.8 5.4-9.4.5-3 .5-6.2 0-9z"/>, "0 0 65 100") },
  { name: "Toast", icon: TI(<><rect x="3" y="8" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7 8V6a5 5 0 0110 0v2" fill="none" stroke="currentColor" strokeWidth="1.8"/></>) },
];

const features = [
  { title: "Memory", desc: "Every conversation builds on the last. No blank pages. No catching up.", contrast: "\u201C71% of users quit an app within 90 days.\u201D Not this one." },
  { title: "Voice", desc: "Talk to an orb. It listens, files, extracts. No transcript. No editing anxiety.", contrast: "Others show you live typing and call it voice mode." },
  { title: "Whispers & Actions", desc: "Suggestions drift in before you ask. Tasks generate from your conversations. You think. It organizes." },
  { title: "Search & Triage", desc: "Ask for \u201Cthat thing from February.\u201D Drop a PDF. It finds by meaning. It reads, summarizes, extracts. Not keywords \u2014 understanding." },
  { title: "Awareness", desc: "Weather, time zones, nutrition, currency, air quality. You don\u2019t set it up. You don\u2019t turn it on. It just knows." },
  { title: "Fabric", desc: "Integrated music player with real-time visualization. B-Side is your record store guy \u2014 built in, opinionated, and better than your algorithm." },
  { title: "Vault", desc: "Three storage modes. Local, encrypted, or managed. Your data. Your rules. Your call.", contrast: "Others don\u2019t give you a choice." },
];

const grid = [
  { feature: "AI that knows your notes", obsidian: false, notion: "partial", chatgpt: false, claude: false, fulkit: true },
  { feature: "Proactive suggestions", obsidian: false, notion: false, chatgpt: false, claude: false, fulkit: true },
  { feature: "Voice mode (no transcript)", obsidian: false, notion: false, chatgpt: "partial", claude: false, fulkit: true },
  { feature: "Task extraction from notes", obsidian: false, notion: false, chatgpt: false, claude: false, fulkit: true },
  { feature: "Document triage", obsidian: false, notion: false, chatgpt: "partial", claude: "partial", fulkit: true },
  { feature: "Learns your preferences", obsidian: false, notion: false, chatgpt: "partial", claude: "partial", fulkit: true },
  { feature: "No vendor lock-in", obsidian: true, notion: false, chatgpt: false, claude: false, fulkit: true },
  { feature: "Beautiful cross-device UI", obsidian: false, notion: true, chatgpt: true, claude: true, fulkit: true },
  { feature: "Bank-vault encryption at rest", obsidian: false, notion: false, chatgpt: false, claude: false, fulkit: true },
];

function GridCell({ value }) {
  if (value === true)
    return <Check size={14} strokeWidth={2.5} style={{ color: "var(--color-success)" }} />;
  if (value === "partial")
    return (
      <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-warning)", fontWeight: "var(--font-weight-medium)" }}>
        ~
      </span>
    );
  return <X size={13} strokeWidth={1.8} style={{ color: "var(--color-text-dim)" }} />;
}

function PricingGrid({ isMobile }) {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      tier: TIERS.standard.label,
      price: annual ? `$${Math.round(PLANS.standard.priceAnnual / 12)}` : `$${TIERS.standard.price}`,
      period: annual ? "/mo" : "/mo",
      note: annual ? `$${PLANS.standard.priceAnnual}/yr — save $${PLANS.standard.priceMonthly * 12 - PLANS.standard.priceAnnual}` : null,
      msgs: `~${TIERS.standard.messages} messages`,
      detail: `~${Math.round(TIERS.standard.messages / 30)}/day. Plenty for most people.`,
      plan: annual ? "standard_annual" : "standard",
    },
    {
      tier: TIERS.pro.label,
      price: annual ? `$${Math.round(PLANS.pro.priceAnnual / 12)}` : `$${TIERS.pro.price}`,
      period: annual ? "/mo" : "/mo",
      note: annual ? `$${PLANS.pro.priceAnnual}/yr — save $${PLANS.pro.priceMonthly * 12 - PLANS.pro.priceAnnual}` : null,
      msgs: `~${TIERS.pro.messages} messages`,
      detail: `~${Math.round(TIERS.pro.messages / 30)}/day. For power thinkers.`,
      plan: annual ? "pro_annual" : "pro",
    },
    {
      tier: "Credits",
      price: CREDITS.priceLabel,
      period: `/${CREDITS.amount}`,
      msgs: "On demand",
      detail: "Top up when you need more.",
      plan: "credits",
    },
  ];

  const toggleStyle = {
    display: "inline-flex",
    gap: 0,
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-full)",
    overflow: "hidden",
    marginBottom: "var(--space-6)",
  };
  const pillStyle = (active) => ({
    padding: "var(--space-1-5) var(--space-4)",
    fontSize: "var(--font-size-xs)",
    fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
    fontFamily: "var(--font-primary)",
    background: active ? "var(--color-accent)" : "transparent",
    color: active ? "var(--color-text-inverse)" : "var(--color-text-muted)",
    border: "none",
    cursor: "pointer",
  });

  return (
    <>
      <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textAlign: "center", marginBottom: "var(--space-6)" }}>
        {PLANS.trial.durationDays} days free. {PLANS.trial.fulTotal} messages. See what F&uuml;lkit does for you.
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={toggleStyle}>
          <button style={pillStyle(!annual)} onClick={() => setAnnual(false)}>Monthly</button>
          <button style={pillStyle(annual)} onClick={() => setAnnual(true)}>Annual</button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: "0",
          borderTop: "2px solid var(--color-text)",
        }}
      >
        {plans.map((plan, i) => (
          <div
            key={i}
            style={{
              padding: "var(--space-8) var(--space-6)",
              textAlign: "center",
              ...(i > 0 && !isMobile ? { borderLeft: "1px solid var(--color-border-light)" } : {}),
            }}
          >
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-6)" }}>
              {plan.tier}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)", justifyContent: "center" }}>
              <span style={{ fontSize: "var(--font-size-5xl)", fontWeight: "var(--font-weight-black)", fontFamily: "var(--font-mono)", lineHeight: "var(--line-height-none)", letterSpacing: "-1.5px" }}>
                {plan.price}
              </span>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)" }}>
                {plan.period}
              </span>
            </div>
            {plan.note && (
              <div style={{ fontSize: "var(--font-size-2xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
                {plan.note}
              </div>
            )}
            <div style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-secondary)", marginTop: "var(--space-4)" }}>
              {plan.msgs}
            </div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-1)" }}>
              {plan.detail}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Landing() {
  const isMobile = useIsMobile();
  const px = isMobile ? "var(--space-4)" : "var(--space-8)";
  return (
    <div
      style={{
        width: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-primary)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* ─── NAV ─── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: "var(--z-sticky)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `var(--space-4) ${px}`,
          background: "rgba(239, 237, 232, 0.3)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-lg)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tight)",
            textDecoration: "none",
            color: "var(--color-text)",
          }}
        >
          <LogoMark size={24} />
          Fülkit
        </Link>
        <div style={{ display: "flex", gap: isMobile ? "var(--space-5)" : "var(--space-6)", alignItems: "center" }}>
          <Link
            href="/about"
            style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
              padding: isMobile ? "var(--space-2)" : 0,
            }}
          >
            WTF
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
              padding: isMobile ? "var(--space-2)" : 0,
            }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ─── HERO: DICTIONARY ENTRY ─── */}
      <section
        style={{
          minHeight: isMobile ? "auto" : "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "var(--space-16) var(--space-4) var(--space-8)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "-2px",
            lineHeight: "var(--line-height-none)",
            marginBottom: "var(--space-4)",
          }}
        >
          Fülkit
        </h1>
        <div
          style={{
            fontSize: "var(--font-size-xl)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-8)",
          }}
        >
          /{"\u02C8"}f{"\u00FC"}{"\u02D0"}l{"\u00B7"}k{"\u026A"}t/
        </div>
        <div
          style={{
            fontSize: "var(--font-size-base)",
            fontStyle: "italic",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-4)",
          }}
        >
          noun.
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            marginBottom: "var(--space-8)",
            maxWidth: 640,
          }}
        >
          {[
            "A full kit \u2014 everything you need, nothing you\u00A0don\u2019t.",
            "A feeling \u2014 the one where you don\u2019t have to explain\u00A0yourself.",
            "Your new bestie \u2014 one surface, nothing else\u00A0open.",
          ].map((def, i) => (
            <div
              key={i}
              style={{
                fontSize: "var(--font-size-lg)",
                lineHeight: "var(--line-height-relaxed)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-dim)", marginRight: "var(--space-2)" }}>
                {i + 1}.
              </span>
              {def}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 640,
            marginBottom: isMobile ? "var(--space-6)" : "var(--space-10)",
          }}
        >
          <div>
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>Origin:</span> German. fühl (to feel) + kit (a set of tools).
          </div>
          <div style={{ marginTop: "var(--space-1)" }}>
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>See also:</span> the app that texts you first.
          </div>
        </div>

        <p
          style={{
            fontSize: "var(--font-size-lg)",
            fontStyle: "italic",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 640,
            marginBottom: isMobile ? "var(--space-6)" : "var(--space-10)",
          }}
        >
          {"\u201C"}I have one app open. You have twelve. We are not the&nbsp;same.{"\u201D"}
        </p>
        <CTAButton />
      </section>

      {/* ─── THE PROBLEM ─── */}
      <div style={{ background: "var(--color-bg-alt)" }}>
        <section
          style={{
            padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
            maxWidth: isMobile ? "none" : 900,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-5)",
              textAlign: "center",
            }}
          >
            The problem
          </div>
          <h2
            style={{
              fontSize: "var(--font-size-4xl)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tighter)",
              lineHeight: "var(--line-height-tight)",
              marginBottom: "var(--space-5)",
              textAlign: "center",
            }}
          >
            You capture everything and retrieve nothing.
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
              borderLeft: "2px solid var(--color-border)",
              paddingLeft: "var(--space-5)",
              maxWidth: 560,
              margin: "0 auto var(--space-10)",
            }}
          >
            {[
              "87 apps installed. 3 actually used. The rest is a graveyard with a subscription fee.",
              "$219 a month on subscriptions \u2014 2.5\u00D7 more than you think you\u2019re paying.",
              "42% of people forgot they were still being charged.",
              "22% are actively looking for something more integrated.",
            ].map((stat, i) => (
              <p
                key={i}
                style={{
                  fontSize: "var(--font-size-base)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--color-text-muted)",
                  lineHeight: "var(--line-height-relaxed)",
                  fontStyle: "italic",
                }}
              >
                {stat}
              </p>
            ))}
          </div>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              textAlign: "center",
              maxWidth: 560,
              margin: "0 auto var(--space-4)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            You{"\u2019"}re not disorganized. You{"\u2019"}re paying to be.
          </p>
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-dim)",
              textAlign: "center",
            }}
          >
            Quokka Labs, C+R Research, CNET, SQ Magazine {"\u2014"} 2025
          </p>
        </section>
      </div>

      {/* ─── THE MATH ─── */}
      <section
        style={{
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-5)",
            textAlign: "center",
          }}
        >
          The math
        </div>
        <h2
          style={{
            fontSize: "var(--font-size-4xl)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: "var(--line-height-tight)",
            marginBottom: "var(--space-16)",
            textAlign: "center",
          }}
        >
          The average American spends $219 a month
          <br />
          on subscriptions. This is&nbsp;${fulkitPrice}.
        </h2>

        {/* Abstract receipt — fragmentation vs one surface */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "var(--space-12)",
            alignItems: "start",
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          {/* Left: What $219 buys */}
          <div
            style={{
              borderTop: "2px solid var(--color-text)",
              padding: "var(--space-4) 0",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                color: "var(--color-text-dim)",
                fontFamily: "var(--font-mono)",
                marginBottom: "var(--space-4)",
              }}
            >
              $219/mo buys you
            </div>
            {[
              "Fragmentation",
              "8+ logins",
              "42% forgotten charges",
              "Apps that don\u2019t talk",
            ].map((line, i) => (
              <div
                key={i}
                style={{
                  padding: "var(--space-2) 0",
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-secondary)",
                  borderBottom: i < 3 ? "1px solid var(--color-border-light)" : "none",
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Right: What $9 buys */}
          <div
            style={{
              borderTop: "2px solid var(--color-text)",
              padding: "var(--space-4) 0",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                color: "var(--color-text-dim)",
                fontFamily: "var(--font-mono)",
                marginBottom: "var(--space-4)",
              }}
            >
              ${fulkitPrice}/mo buys you
            </div>
            {[
              "One surface",
              "One login",
              "Nothing forgotten",
              "Everything talks",
            ].map((line, i) => (
              <div
                key={i}
                style={{
                  padding: "var(--space-2) 0",
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text)",
                  fontWeight: "var(--font-weight-medium)",
                  borderBottom: i < 3 ? "1px solid var(--color-border-light)" : "none",
                }}
              >
                {line}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)", marginTop: "var(--space-16)" }}>
              <span
                style={{
                  fontSize: "clamp(64px, 10vw, 96px)",
                  fontWeight: "var(--font-weight-black)",
                  fontFamily: "var(--font-mono)",
                  lineHeight: 0.85,
                  letterSpacing: "-3px",
                }}
              >
                ${fulkitPrice}
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-lg)",
                  color: "var(--color-text-dim)",
                  fontWeight: "var(--font-weight-normal)",
                }}
              >
                /mo
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INTEGRATION TICKER ─── */}
      <div
        style={{
          overflow: "hidden",
          borderTop: "1px solid var(--color-border-light)",
          borderBottom: "1px solid var(--color-border-light)",
          padding: "var(--space-10) 0",
          background: "var(--color-bg)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-12)",
            animation: "ticker 40s linear infinite",
            width: "max-content",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                flexShrink: 0,
                color: "var(--color-text-muted)",
                fontSize: "var(--font-size-lg)",
                fontFamily: "var(--font-primary)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", opacity: 0.6 }}>{item.icon}</span>
              {item.name}
            </div>
          ))}
        </div>
        <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ─── FEATURES ─── */}
      <div style={{ background: "var(--color-bg-alt)" }}>
      <section
        style={{
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-5)",
            textAlign: "center",
          }}
        >
          What you get
        </div>
        <h2
          style={{
            fontSize: "var(--font-size-4xl)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: "var(--line-height-tight)",
            marginBottom: "var(--space-16)",
            textAlign: "center",
          }}
        >
          The <span style={{ textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)" }}>full</span> kit.
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "0",
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "var(--space-6) var(--space-6) var(--space-6) 0",
                borderTop: "1px solid var(--color-border)",
                ...(i % 2 === 1 ? { paddingLeft: "var(--space-6)" } : {}),
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-widest)",
                  color: "var(--color-text-dim)",
                  marginBottom: "var(--space-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-bold)",
                  marginBottom: "var(--space-2)",
                  lineHeight: "var(--line-height-tight)",
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                {f.desc}
              </div>
              {f.contrast && (
                <div
                  style={{
                    fontSize: "var(--font-size-base)",
                    color: "var(--color-text-muted)",
                    fontStyle: "italic",
                    lineHeight: "var(--line-height-relaxed)",
                    marginTop: "var(--space-2)",
                  }}
                >
                  {f.contrast}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      </div>

      {/* ─── COMPETITIVE GRID ─── */}
        <section
          style={{
            padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
            maxWidth: isMobile ? "none" : 900,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "var(--letter-spacing-wider)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-5)",
              textAlign: "center",
            }}
          >
            The comparison
          </div>
          <h2
            style={{
              fontSize: "var(--font-size-4xl)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "var(--letter-spacing-tighter)",
              lineHeight: "var(--line-height-tight)",
              marginBottom: "var(--space-12)",
              textAlign: "center",
            }}
          >
            Nobody else lives here.
          </h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--font-size-base)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid var(--color-text)",
                }}
              >
                <th
                  style={{
                    padding: "var(--space-3) 0",
                    textAlign: "left",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--letter-spacing-wider)",
                  }}
                >
                  Feature
                </th>
                {["Obsidian", "Notion", "ChatGPT", "Claude", "Fülkit"].map(
                  (name) => (
                    <th
                      key={name}
                      style={{
                        padding: "var(--space-3) var(--space-2)",
                        textAlign: "center",
                        fontWeight:
                          name === "Fülkit"
                            ? "var(--font-weight-black)"
                            : "var(--font-weight-medium)",
                        fontSize: "var(--font-size-xs)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--letter-spacing-wider)",
                        color:
                          name === "Fülkit"
                            ? "var(--color-text)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {name}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--color-border-light)",
                  }}
                >
                  <td
                    style={{
                      padding: "var(--space-3) 0",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {row.feature}
                  </td>
                  {["obsidian", "notion", "chatgpt", "claude", "fulkit"].map(
                    (key) => (
                      <td
                        key={key}
                        style={{
                          padding: "var(--space-3) var(--space-2)",
                          textAlign: "center",
                        }}
                      >
                        <GridCell value={row[key]} />
                      </td>
                    )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

      {/* ─── PRICING ─── */}
      <div style={{ background: "var(--color-bg-alt)" }}>
      <section
        style={{
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-5)",
            textAlign: "center",
          }}
        >
          Pricing
        </div>
        <h2
          style={{
            fontSize: "var(--font-size-4xl)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: "var(--line-height-tight)",
            marginBottom: "var(--space-16)",
            textAlign: "center",
          }}
        >
          Fair. Not infinite.
        </h2>

        <PricingGrid isMobile={isMobile} />

        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-8)",
            lineHeight: "var(--line-height-relaxed)",
            textAlign: "center",
          }}
        >
          Friends get benefits. Every friend who joins earns you $1/mo off your subscription.{" "}
          <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>
            {REFERRALS.freeAtStandard} friends = free forever.
          </span>
        </p>
      </section>
      </div>

      {/* ─── TRUST ─── */}
      <section
        style={{
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            textTransform: "uppercase",
            letterSpacing: "var(--letter-spacing-wider)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-5)",
            textAlign: "center",
          }}
        >
          Trust
        </div>
        <h2
          style={{
            fontSize: "var(--font-size-4xl)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "var(--letter-spacing-tighter)",
            lineHeight: "var(--line-height-tight)",
            marginBottom: "var(--space-5)",
            textAlign: "center",
          }}
        >
          We built the vault before we built the product.
        </h2>
        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto var(--space-12)",
          }}
        >
          Your data is yours. We encrypt it, we lock it down, and we wrote the receipts so you can check.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "0",
          }}
        >
          {[
            { label: "AES-256-GCM", detail: "Every token, key, and secret encrypted at rest. Same standard as banks and governments." },
            { label: "SOC 2 controls", detail: "Access controls, encryption, rate limiting, data isolation — all built in from day one. Not aspirational. Implemented." },
            { label: "Row-level security", detail: "Your data is isolated at the database level. Even a bug in our code can't leak it to another user." },
            { label: "Zero plaintext secrets", detail: "API keys, OAuth tokens, refresh tokens — encrypted before they touch the database. Never logged." },
            { label: "Strict CSP", detail: "Content Security Policy blocks XSS, clickjacking, and third-party script injection. No exceptions." },
            { label: "Full data deletion", detail: "Delete everything. Messages, notes, preferences, integrations — atomic cascade, scoped by you." },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                padding: "var(--space-6) var(--space-6) var(--space-6) 0",
                borderTop: "1px solid var(--color-border)",
                ...(i % 2 === 1 ? { paddingLeft: "var(--space-6)" } : {}),
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-bold)",
                  marginBottom: "var(--space-2)",
                  lineHeight: "var(--line-height-tight)",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-8)",
            lineHeight: "var(--line-height-relaxed)",
            textAlign: "center",
          }}
        >
          Read the full architecture →{" "}
          <Link
            href="/security"
            style={{
              color: "var(--color-text-secondary)",
              fontWeight: "var(--font-weight-semibold)",
              textDecoration: "none",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            Security
          </Link>
        </p>
      </section>

      {/* ─── FINAL CTA ─── */}
        <section
          style={{
            padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
            maxWidth: isMobile ? "none" : 900,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: "var(--font-weight-black)",
              letterSpacing: "-1px",
              lineHeight: 1.05,
              marginBottom: "var(--space-5)",
            }}
          >
            Get Fülkit.
            <br />
            <span style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-normal)", color: "var(--color-text-secondary)" }}>
              The benefits are real.
            </span>
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              maxWidth: 420,
              marginBottom: "var(--space-8)",
            }}
          >
            Stop catching AI up to speed. Stop switching between 8 apps.
            Just open it and talk. It already knows.
          </p>
          <CTAButton />
        </section>

      {/* ─── FOOTER ─── */}
      <footer
        style={{
          padding: isMobile ? "var(--space-8) var(--space-4)" : "var(--space-12) var(--space-8)",
          borderTop: "1px solid var(--color-border-light)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "var(--space-4)" : 0,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-bold)",
            letterSpacing: "var(--letter-spacing-tight)",
          }}
        >
          <LogoMark size={18} />
          Fülkit
        </div>
        <div
          style={{
            display: "flex",
            gap: "var(--space-6)",
          }}
        >
          <Link
            href="/security"
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            Security
          </Link>
          <Link
            href="/privacy"
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

function CTAButton() {
  return (
    <Link
      href="/login"
      style={{
        display: "block",
        width: "100%",
        padding: "var(--space-2-5) var(--space-5)",
        background: "var(--color-accent)",
        color: "var(--color-text-inverse)",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--font-size-base)",
        fontWeight: "var(--font-weight-semibold)",
        fontFamily: "var(--font-primary)",
        textAlign: "center",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      Get Fülkit
    </Link>
  );
}
