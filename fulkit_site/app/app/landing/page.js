"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import LogoMark from "../../components/LogoMark";
import { TIERS, CREDITS } from "../../lib/ful-config";
import { useIsMobile } from "../../lib/use-mobile";

const apps = [
  { name: "Obsidian Sync", cost: 8, replaces: "Notes" },
  { name: "Notion", cost: 10, replaces: "Docs" },
  { name: "ChatGPT Plus", cost: 20, replaces: "AI" },
  { name: "Claude Pro", cost: 20, replaces: "AI" },
  { name: "Todoist Pro", cost: 5, replaces: "Tasks" },
  { name: "Otter.ai Pro", cost: 17, replaces: "Voice" },
  { name: "Day One", cost: 4, replaces: "Journal" },
  { name: "Readwise Reader", cost: 8, replaces: "Read-later" },
];
const appsTotal = apps.reduce((sum, a) => sum + a.cost, 0);
const fulkitPrice = 9;
const annualSavings = (appsTotal - fulkitPrice) * 12;

const features = [
  {
    title: "AI Chat",
    desc: "A bestie that knows everything you've saved. No more catching AI up to speed.",
  },
  {
    title: "The Hum",
    desc: "Talk to a presence, not a transcript. Voice capture that files your thoughts silently.",
  },
  {
    title: "Whispers",
    desc: "Proactive suggestions that drift in and fade out. Like a text from a friend who pays attention.",
  },
  {
    title: "Action List",
    desc: "AI-generated to-dos from your notes. No manual entry. Just do.",
  },
  {
    title: "Inbox Triage",
    desc: "Drop a doc. Get a summary and action items in seconds.",
  },
  {
    title: "Quick Capture",
    desc: "Global shortcut. Thought to saved in 2 seconds. AI files it for you.",
  },
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

export default function Landing() {
  const isMobile = useIsMobile();
  const px = isMobile ? "var(--space-4)" : "var(--space-8)";
  return (
    <div
      style={{
        width: "100%",
        overflowX: "hidden",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-primary)",
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
        <div style={{ display: "flex", gap: isMobile ? "var(--space-3)" : "var(--space-6)", alignItems: "center" }}>
          <Link
            href="/about"
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            WTF
          </Link>
          <Link
            href="/login"
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-text-secondary)",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* ─── HERO: DICTIONARY ENTRY ─── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
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
            fontSize: "var(--font-size-lg)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-8)",
          }}
        >
          /{"\u02C8"}f{"\u00FC"}{"\u02D0"}l{"\u00B7"}k{"\u026A"}t/
        </div>
        <div
          style={{
            fontSize: "var(--font-size-sm)",
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
            maxWidth: 600,
          }}
        >
          {[
            "The full kit \u2014 everything you need, nothing you don\u2019t.",
            "A feeling \u2014 a tool designed to feel right.",
            "Your bestie \u2014 the last app you\u2019ll ever need.",
          ].map((def, i) => (
            <div
              key={i}
              style={{
                fontSize: "var(--font-size-base)",
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
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-dim)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 600,
            marginBottom: "var(--space-10)",
          }}
        >
          <div>
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>Origin:</span> German. fühl (to feel) + kit (a set of tools).
          </div>
          <div style={{ marginTop: "var(--space-1)" }}>
            <span style={{ fontWeight: "var(--font-weight-semibold)" }}>See also:</span> the only app that knows what you saved last Tuesday.
          </div>
        </div>

        <p
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 720,
            marginBottom: "var(--space-3)",
          }}
        >
          One app. One bestie. Everything else is noise.
        </p>
        <p
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 480,
            marginBottom: "var(--space-10)",
          }}
        >
          A friend with benefits — and the benefits are real.
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
          <p
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              marginBottom: "var(--space-10)",
              textAlign: "center",
              maxWidth: 560,
              margin: "0 auto var(--space-10)",
            }}
          >
            Only 15% of saved knowledge is ever found again. You spend 3.6 hours a
            day searching for information. Your notes are a graveyard.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
              borderLeft: "2px solid var(--color-border)",
              paddingLeft: "var(--space-5)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            {[
              "I have 12 apps open and none of them talk to each other.",
              "I spend the first 3 messages catching ChatGPT up to speed. Every. Single. Time.",
              "I saved something important last week. I have no idea where.",
            ].map((quote, i) => (
              <p
                key={i}
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-normal)",
                  color: "var(--color-text-muted)",
                  lineHeight: "var(--line-height-relaxed)",
                  fontStyle: "italic",
                }}
              >
                "{quote}"
              </p>
            ))}
          </div>
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
          You're already paying to get Fülkit.
          <br />
          Just not enjoying it.
        </h2>

        {/* Receipt + Answer side by side */}
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
          {/* Left: The receipt */}
          <div
            style={{
              borderTop: "2px solid var(--color-text)",
              borderBottom: "2px solid var(--color-text)",
              padding: "var(--space-4) 0",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-2xs)",
                fontWeight: "var(--font-weight-semibold)",
                textTransform: "uppercase",
                letterSpacing: "var(--letter-spacing-widest)",
                color: "var(--color-text-dim)",
                fontFamily: "var(--font-mono)",
                marginBottom: "var(--space-3)",
              }}
            >
              Your current stack
            </div>
            {apps.map((app, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "var(--space-1) 0",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {app.name}
                  <span
                    style={{
                      fontSize: "var(--font-size-2xs)",
                      color: "var(--color-text-dim)",
                      marginLeft: "var(--space-2)",
                      fontFamily: "var(--font-mono)",
                      textTransform: "uppercase",
                    }}
                  >
                    {app.replaces}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-medium)",
                    color: "var(--color-text-muted)",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  ${app.cost}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: "var(--space-3) 0 0",
                marginTop: "var(--space-2)",
                borderTop: "1px dashed var(--color-border)",
              }}
            >
              <span
                style={{
                  fontWeight: "var(--font-weight-bold)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Monthly total
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-weight-black)",
                  fontSize: "var(--font-size-base)",
                  color: "var(--color-error)",
                  textDecoration: "line-through",
                  textDecorationThickness: "2px",
                }}
              >
                ${appsTotal}
              </span>
            </div>
          </div>

          {/* Right: Fülkit replaces all */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-text-muted)",
                marginBottom: "var(--space-2)",
              }}
            >
              Fülkit replaces all {apps.length} →
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
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
            <div
              style={{
                marginTop: "var(--space-8)",
                borderTop: "1px solid var(--color-border)",
                paddingTop: "var(--space-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-sm)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>You pay now</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>${appsTotal}/mo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-sm)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>With Fülkit</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)" }}>${fulkitPrice}/mo</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-bold)",
                  marginTop: "var(--space-2)",
                  paddingTop: "var(--space-2)",
                  borderTop: "1px dashed var(--color-border)",
                }}
              >
                <span style={{ color: "var(--color-success)" }}>You save</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--font-weight-black)",
                    color: "var(--color-success)",
                  }}
                >
                  ${annualSavings}/yr
                </span>
              </div>
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
          Your notes finally talk back.
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
                  fontSize: "var(--font-size-2xs)",
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
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                {f.desc}
              </div>
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
              fontSize: "var(--font-size-sm)",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: "0",
            borderTop: "2px solid var(--color-text)",
          }}
        >
          {[
            {
              tier: TIERS.standard.label,
              price: `$${TIERS.standard.price}`,
              period: "/mo",
              msgs: `~${TIERS.standard.messages} messages`,
              detail: `~${Math.round(TIERS.standard.messages / 30)}/day. Plenty for most people.`,
            },
            {
              tier: TIERS.pro.label,
              price: `$${TIERS.pro.price}`,
              period: "/mo",
              msgs: `~${TIERS.pro.messages} messages`,
              detail: `~${Math.round(TIERS.pro.messages / 30)}/day. For power thinkers.`,
            },
            {
              tier: "Credits",
              price: CREDITS.priceLabel,
              period: `/${CREDITS.amount}`,
              msgs: "On demand",
              detail: "Top up when you need more.",
            },
          ].map((plan, i) => (
            <div
              key={i}
              style={{
                padding: "var(--space-8) var(--space-6)",
                textAlign: "center",
                ...(i > 0 ? { borderLeft: "1px solid var(--color-border-light)" } : {}),
              }}
            >
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: "var(--font-weight-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--letter-spacing-wider)",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-6)",
                }}
              >
                {plan.tier}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-1)", justifyContent: "center" }}>
                <span
                  style={{
                    fontSize: "var(--font-size-5xl)",
                    fontWeight: "var(--font-weight-black)",
                    fontFamily: "var(--font-mono)",
                    lineHeight: "var(--line-height-none)",
                    letterSpacing: "-1.5px",
                  }}
                >
                  {plan.price}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-dim)",
                  }}
                >
                  {plan.period}
                </span>
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: "var(--font-weight-medium)",
                  color: "var(--color-text-secondary)",
                  marginTop: "var(--space-4)",
                }}
              >
                {plan.msgs}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-text-muted)",
                  marginTop: "var(--space-1)",
                }}
              >
                {plan.detail}
              </div>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-8)",
            lineHeight: "var(--line-height-relaxed)",
            textAlign: "center",
          }}
        >
          Friends get benefits. Every friend who joins earns you $1/mo off your subscription.{" "}
          <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--color-text-secondary)" }}>
            7 friends = free forever.
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
                  fontSize: "var(--font-size-sm)",
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
            fontSize: "var(--font-size-sm)",
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
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--font-size-sm)",
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
        fontSize: "var(--font-size-sm)",
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
