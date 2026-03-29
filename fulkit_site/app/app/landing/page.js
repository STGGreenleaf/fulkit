"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import LogoMark from "../../components/LogoMark";
import { TIERS, CREDITS, REFERRALS } from "../../lib/ful-config";
import { PLANS } from "../../lib/ful-legend";
import { useIsMobile } from "../../lib/use-mobile";
import { TICKER_ITEMS } from "../../lib/integration-ticker";

const fulkitPrice = 9;

const features = [
  { title: "Memory Vault", desc: "Every conversation builds on the last. No blank pages. Three storage modes \u2014 local, encrypted, or managed. Your data. Your rules." },
  { title: "Voice", desc: "Talk to an orb. It listens, files, extracts. No transcript. No editing anxiety.", contrast: "Others show you live typing and call it voice mode." },
  { title: "Whispers & Actions", desc: "Suggestions drift in before you ask. Tasks generate from your conversations. You think. It organizes." },
  { title: "Search & Triage", desc: "Ask for \u201Cthat thing from February.\u201D Drop a PDF. It finds by meaning. It reads, summarizes, extracts. Not keywords \u2014 understanding." },
  { title: "Awareness", desc: "Weather, time zones, nutrition, currency, air quality. You don\u2019t set it up. You don\u2019t turn it on. It just knows." },
  { title: "Fabric", desc: "Integrated music player with real-time visualization. B-Side is your record store guy \u2014 built in, opinionated, and better than your algorithm." },
];

const COMPETITORS = ["ChatGPT", "Claude", "Notion", "Obsidian", "Todoist", "Otter.ai", "Spotify", "Slack", "Google Cal", "QuickBooks", "F\u00FClkit"];
const CK = ["chatgpt", "claude", "notion", "obsidian", "todoist", "otter", "spotify", "slack", "gcal", "quickbooks", "fulkit"];
const grid = [
  { feature: "AI that knows your history", chatgpt: "partial", claude: "partial", notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Voice \u2192 auto-filed notes", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: "partial", spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Proactive suggestions", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Tasks from conversations", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Drop any file \u2192 summary", chatgpt: "partial", claude: "partial", notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Search by meaning", chatgpt: false, claude: false, notion: "partial", obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Business + health + calendar in chat", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "Integrated music player", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: false, spotify: true, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "End-to-end encryption (3 modes)", chatgpt: false, claude: false, notion: false, obsidian: "partial", todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
  { feature: "All of the above for $9/mo", chatgpt: false, claude: false, notion: false, obsidian: false, todoist: false, otter: false, spotify: false, slack: false, gcal: false, quickbooks: false, fulkit: true },
];

function GridCell({ value }) {
  if (value === true)
    return <Check size={18} strokeWidth={3} style={{ color: "var(--color-success)" }} />;
  if (value === "partial")
    return (
      <span style={{ fontSize: "var(--font-size-lg)", color: "var(--color-warning)", fontWeight: "var(--font-weight-bold)" }}>
        ~
      </span>
    );
  return <X size={16} strokeWidth={2.2} style={{ color: "var(--color-text-dim)" }} />;
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
        {PLANS.trial.durationDays} days free. No credit card. {PLANS.trial.fulTotal} messages.
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
            fontSize: isMobile ? "var(--font-size-lg)" : "var(--font-size-xl)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-muted)",
            marginBottom: isMobile ? "var(--space-6)" : "var(--space-8)",
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
                fontSize: isMobile ? "var(--font-size-base)" : "var(--font-size-lg)",
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
            marginBottom: isMobile ? "var(--space-4)" : "var(--space-10)",
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
          {features.map((f, i) => {
            const isLastOdd = i === features.length - 1 && features.length % 2 === 1 && !isMobile;
            return (
            <div
              key={i}
              style={{
                padding: "var(--space-6) var(--space-6) var(--space-6) 0",
                borderTop: "1px solid var(--color-border)",
                ...(i % 2 === 1 ? { paddingLeft: "var(--space-6)" } : {}),
                ...(isLastOdd ? { gridColumn: "1 / -1", maxWidth: "50%", margin: "0 auto", padding: "var(--space-6)", textAlign: "center" } : {}),
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
          );
          })}
        </div>
      </section>
      </div>

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
            animation: "ticker 60s linear infinite",
            width: "max-content",
            willChange: "transform",
          }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
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
        <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }`}</style>
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

          {/* Desktop: full 11-column grid */}
          {!isMobile && (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "var(--font-size-base)",
              minWidth: 700,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-text)" }}>
                <th style={{
                  padding: "0 0 var(--space-3) 0",
                  textAlign: "left",
                  verticalAlign: "bottom",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-medium)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wider)",
                  color: "var(--color-text-muted)",
                }}>Feature</th>
                {COMPETITORS.map((name) => {
                  const isFulkit = name === "F\u00FClkit";
                  return (
                    <th
                      key={name}
                      style={{
                        padding: 0,
                        textAlign: "left",
                        verticalAlign: "bottom",
                        height: 100,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 5,
                          left: 32,
                          transformOrigin: "bottom left",
                          transform: "rotate(-55deg)",
                          whiteSpace: "nowrap",
                          fontSize: "var(--font-size-sm)",
                          fontWeight: isFulkit ? "var(--font-weight-black)" : "var(--font-weight-medium)",
                          textTransform: "uppercase",
                          letterSpacing: "var(--letter-spacing-wider)",
                          color: isFulkit ? "var(--color-text)" : "var(--color-text-muted)",
                        }}
                      >
                        {name}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--color-border-light)",
                    ...(i === grid.length - 1 ? { borderBottom: "2px solid var(--color-text)" } : {}),
                  }}
                >
                  <td
                    style={{
                      padding: "var(--space-3) var(--space-4) var(--space-3) 0",
                      color: i === grid.length - 1 ? "var(--color-text)" : "var(--color-text-secondary)",
                      fontWeight: i === grid.length - 1 ? "var(--font-weight-bold)" : "var(--font-weight-normal)",
                      width: 280,
                    }}
                  >
                    {row.feature}
                  </td>
                  {CK.map((key) => (
                    <td
                      key={key}
                      style={{
                        padding: "var(--space-3) var(--space-1)",
                        textAlign: "center",
                        ...(key === "fulkit" ? { background: "var(--color-bg-alt)" } : {}),
                      }}
                    >
                      <GridCell value={row[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}

          {/* Mobile: Fülkit-only 2-column + competitor footnote */}
          {isMobile && (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-base)" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-text)" }}>
                  <th style={{ padding: "0 0 var(--space-3) 0", textAlign: "left", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-medium)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)" }}>Feature</th>
                  <th style={{ padding: "0 0 var(--space-3) 0", textAlign: "center", fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-black)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text)" }}>F{"\u00FC"}lkit</th>
                </tr>
              </thead>
              <tbody>
                {grid.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i === grid.length - 1 ? "2px solid var(--color-text)" : "1px solid var(--color-border-light)" }}>
                    <td style={{ padding: "var(--space-2-5) var(--space-2) var(--space-2-5) 0", color: i === grid.length - 1 ? "var(--color-text)" : "var(--color-text-secondary)", fontWeight: i === grid.length - 1 ? "var(--font-weight-bold)" : "var(--font-weight-normal)" }}>{row.feature}</td>
                    <td style={{ padding: "var(--space-2-5) 0", textAlign: "center" }}><GridCell value={row.fulkit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: "var(--space-8)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)", textTransform: "uppercase", letterSpacing: "var(--letter-spacing-wider)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                Can{"\u2019"}t say the same.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-1-5) var(--space-3)" }}>
                {["ChatGPT", "Claude", "Gemini", "Notion", "Obsidian", "Evernote", "Apple Notes", "Todoist", "Otter.ai", "Spotify", "Apple Music", "Slack", "Google Cal", "QuickBooks"].map((name) => (
                  <div key={name} style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-dim)" }}>{name}</div>
                ))}
              </div>
            </div>
          </div>
          )}
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
          ${TIERS.standard.price}/mo. Or $0/mo with {REFERRALS.freeAtStandard} friends. Your move.
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
          We don{"\u2019"}t read your notes. We encrypt them so we can{"\u2019"}t.
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
          Other apps ask you to trust them. We ask you to verify us.
          <br />
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
            Get F{"\u00FC"}lkit.
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--color-text-secondary)",
              fontWeight: "var(--font-weight-medium)",
              marginBottom: "var(--space-8)",
            }}
          >
            F{"\u00FC"}lkit all. One app.
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
