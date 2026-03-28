"use client";

import Link from "next/link";
import LogoMark from "../../components/LogoMark";
import { useIsMobile } from "../../lib/use-mobile";

export default function About() {
  const isMobile = useIsMobile();
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
          padding: isMobile ? "var(--space-4) var(--space-4)" : "var(--space-4) var(--space-8)",
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
              fontWeight: "var(--font-weight-black)",
              color: "var(--color-text)",
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

      {/* ─── HERO ─── */}
      <section
        style={{
          minHeight: isMobile ? "auto" : "72vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: isMobile ? "flex-start" : "center",
          padding: isMobile ? "var(--space-24) var(--space-4) calc(var(--space-24) + var(--space-12))" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
        }}
      >
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: "var(--font-weight-black)",
            letterSpacing: "-2px",
            lineHeight: "var(--line-height-none)",
            marginBottom: "var(--space-6)",
          }}
        >
          WTF
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
            maxWidth: 480,
            marginBottom: "var(--space-10)",
          }}
        >
          Everything you see was chosen. Everything you don{"\u2019"}t was removed.
        </p>
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
          Get F{"\u00FC"}lkit
        </Link>
      </section>

      {/* ─── THE ü ─── */}
      <Section>
        <SectionTitle>The {"\u00FC"}</SectionTitle>
        <Body>
          The two dots above the u are called an <strong>umlaut</strong>. In German, they change the sound of a vowel {"\u2014"} and in F{"\u00FC"}lkit{"\u2019"}s case, they change the meaning of everything.
        </Body>
        <Body>
          <strong>F{"\u00FC"}l</strong> comes from <strong>f{"\u00FC"}hlen</strong> {"\u2014"} the German word for <em>to feel</em>. Not to think. Not to analyze. To <strong>feel</strong>.
        </Body>
        <Body>
          That{"\u2019"}s deliberate. Most productivity tools are designed to make you more efficient. F{"\u00FC"}lkit is designed to make you feel like someone actually understands what you{"\u2019"}re working on. The difference between a tool that processes your notes and a bestie that reads them and says {"\u201C"}hey, this connects to something you saved last week{"\u201D"} {"\u2014"} that difference is a feeling.
        </Body>
        <Body>
          <strong>Kit</strong> means what it{"\u2019"}s always meant. A set of tools. Everything you need, packed into one.
        </Body>
        <PullQuote>F{"\u00FC"}lkit = a toolkit that feels right. Full kit. Feel kit. Both.</PullQuote>
        <Body>
          And yes {"\u2014"} it{"\u2019"}s also a word you won{"\u2019"}t forget. That{"\u2019"}s not an accident either.
        </Body>
      </Section>

      {/* ─── THE NAME ─── */}
      <Section>
        <SectionTitle>The Name</SectionTitle>
        <Body>Yes. You know what it sounds like.</Body>
        <Body>
          The umlaut makes it German. The meaning makes it real. The double-take makes it memorable.
        </Body>
        <Body>
          A tool called {"\u201C"}Productivity Suite 3.0{"\u201D"} gets scrolled past. A tool called <strong>F{"\u00FC"}lkit</strong> gets a reaction.
        </Body>
        <Body>The brand is the first magic trick. The benefits are the second.</Body>
      </Section>

      {/* ─── THE FEELING ─── */}
      <Section>
        <SectionTitle>The Feeling</SectionTitle>
        <Body>A chatbot waits for instructions. A bestie anticipates.</Body>
        <div
          style={{
            padding: "var(--space-6) 0 var(--space-6) var(--space-6)",
            borderLeft: "2px solid var(--color-border)",
            marginTop: "var(--space-4)",
            marginBottom: "var(--space-4)",
            maxWidth: 600,
          }}
        >
          <div
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              fontStyle: "italic",
            }}
          >
            You open F{"\u00FC"}lkit on Monday morning and before you type anything, it says: {"\u201C"}Based on your Friday notes, you have 3 action items from the Q2 meeting, your pricing draft is unfinished, and you wanted to follow up with Sarah.{"\u201D"}
          </div>
        </div>
        <Body>You didn{"\u2019"}t ask. It just knew. That{"\u2019"}s the <strong>f{"\u00FC"}l</strong> in F{"\u00FC"}lkit.</Body>
      </Section>

      {/* ─── THE WHISPERS ─── */}
      <Section>
        <SectionTitle>The Whispers</SectionTitle>
        <Body>Most apps notify. F{"\u00FC"}lkit whispers.</Body>
        <Body>
          A notification demands your attention. It badges. It buzzes. It stacks up and creates anxiety. It exists for the app{"\u2019"}s benefit, not yours.
        </Body>
        <Body>
          A whisper offers. It drifts in {"\u2014"} a quiet card, a suggestion, a thought from a friend. {"\u201C"}It{"\u2019"}s 4pm {"\u2014"} want me to put together a dinner list?{"\u201D"} If you don{"\u2019"}t respond, it fades. No guilt. No badge. No {"\u201C"}you missed this.{"\u201D"} Just a moment that passed, like a real conversation.
        </Body>
        <Body>
          This is the German principle of <strong><em>Zur{"\u00FC"}ckhaltung</em></strong> {"\u2014"} restraint. The design serves you without insisting on your attention. The best tools are the ones you barely notice using.
        </Body>
      </Section>

      {/* ─── THE HUM ─── */}
      <Section>
        <SectionTitle>The Hum</SectionTitle>
        <Body>
          When you enter voice mode, you don{"\u2019"}t see a transcript of your words appearing on screen. You see an orb. Breathing. Pulsing. Alive.
        </Body>
        <Body>
          Most voice interfaces show you your words being typed out in real time. That activates your inner editor. You get self-conscious. You start restructuring sentences mid-thought. The transcript kills the flow.
        </Body>
        <Body>
          The Hum just listens. You talk to a presence, not a form field. When you{"\u2019"}re done, F{"\u00FC"}lkit silently transcribes, extracts action items, identifies topics, files notes. You mentioned three things this morning? Filed. The recipe idea went to recipes. {"\u201C"}Call Sarah{"\u201D"} went to your action list. The startup thought went to Ideas Worth Exploring.
        </Body>
        <Body>You talked. It understood. That{"\u2019"}s the whole point.</Body>
      </Section>

      {/* ─── THE FABRIC ─── */}
      <Section>
        <SectionTitle>The Fabric</SectionTitle>
        <Body>
          Your work has a soundtrack. Most apps pretend it doesn{"\u2019"}t.
        </Body>
        <Body>
          Fabric is a music player built into F{"\u00FC"}lkit {"\u2014"} not bolted on, not a widget, not a link to somewhere else. Real-time visualization that turns your music into terrain. Every song has a shape. No two look the same.
        </Body>
        <Body>
          And behind the counter, there{"\u2019"}s B-Side {"\u2014"} a record store guy with opinions. He doesn{"\u2019"}t recommend what{"\u2019"}s popular. He recommends what{"\u2019"}s right.
        </Body>
      </Section>

      {/* ─── THE SEARCH ─── */}
      <Section>
        <SectionTitle>The Search</SectionTitle>
        <Body>
          You saved something in February. You don{"\u2019"}t remember the title, the folder, or the exact words. You just remember it was about {"\u201C"}that pricing idea from the investor call.{"\u201D"}
        </Body>
        <Body>
          You ask. F{"\u00FC"}lkit finds it. Not by keywords {"\u2014"} by meaning.
        </Body>
        <Body>
          Drop a PDF, an image, a doc {"\u2014"} F{"\u00FC"}lkit reads it, summarizes it, pulls action items. You don{"\u2019"}t file things. You throw them in. It figures out where they go.
        </Body>
      </Section>

      {/* ─── THE AWARENESS ─── */}
      <Section>
        <SectionTitle>The Awareness</SectionTitle>
        <Body>
          You mention hiking Zion tomorrow. F{"\u00FC"}lkit says it{"\u2019"}s going to cook out there. You didn{"\u2019"}t ask for the weather.
        </Body>
        <Body>
          12 invisible APIs {"\u2014"} weather, air quality, nutrition, currency, time zones, definitions, books. You don{"\u2019"}t set them up. You don{"\u2019"}t turn them on. They{"\u2019"}re just there when the conversation needs them.
        </Body>
        <Body>
          The best features are the ones you never configure.
        </Body>
      </Section>

      {/* ─── THE VAULT ─── */}
      <Section>
        <SectionTitle>The Vault</SectionTitle>
        <Body>
          Most apps ask you to trust them with your data. F{"\u00FC"}lkit asks you how you want to protect it.
        </Body>
        <Body>
          Three modes. Local {"\u2014"} nothing leaves your device. Encrypted {"\u2014"} synced with a passphrase only you know. Managed {"\u2014"} we handle it, locked down with AES-256.
        </Body>
        <Body>
          Your data. Your rules. Your call.
        </Body>
      </Section>

      {/* ─── THE DESIGN LANGUAGE ─── */}
      <Section>
        <SectionTitle>The Design Language</SectionTitle>
        <Body style={{ color: "var(--color-text-dim)", fontStyle: "italic" }}>
          DIN, 1931. Bauhaus, 1919. Dieter Rams, 1960s. Swiss International, 1950s.
        </Body>
        <Body>
          A century of German and Swiss design thinking says the same thing: remove everything that isn{"\u2019"}t working. No gradients pretending to be depth. No shadows pretending to be dimension. Every word earns its place. Every pixel has a job.
        </Body>
        <Body>
          You open it and it feels right. You can{"\u2019"}t explain why. That{"\u2019"}s the design working.
        </Body>
      </Section>

      {/* ─── WYSIWYG ─── */}
      <Section>
        <SectionTitle>What You See Is What You Get</SectionTitle>
        <Body>You open it. You talk. It already knows.</Body>
      </Section>

      {/* ─── CLOSING ─── */}
      <section
        style={{
          padding: isMobile ? "var(--space-12) var(--space-4)" : "var(--space-24) var(--space-8)",
          maxWidth: isMobile ? "none" : 900,
          borderTop: "2px solid var(--color-text)",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-2xl)",
            fontWeight: "var(--font-weight-black)",
            color: "var(--color-text)",
            marginBottom: "var(--space-16)",
          }}
        >
          Remember everything. Explain nothing.
        </div>
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
          Get F{"\u00FC"}lkit
        </Link>
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
          maxWidth: isMobile ? "none" : 900,
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
          F{"\u00FC"}lkit
        </div>
        <div style={{ display: "flex", gap: "var(--space-6)" }}>
          <Link href="/security" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Security</Link>
          <Link href="/privacy" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── LAYOUT COMPONENTS ─── */

function Section({ children }) {
  return (
    <section
      style={{
        padding: "var(--space-24) var(--space-8)",
        maxWidth: 900,
        borderTop: "2px solid var(--color-text)",
      }}
    >
      {children}
    </section>
  );
}

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: "var(--font-size-2xl)",
        fontWeight: "var(--font-weight-black)",
        letterSpacing: "var(--letter-spacing-tight)",
        lineHeight: "var(--line-height-tight)",
        marginBottom: "var(--space-6)",
      }}
    >
      {children}
    </h2>
  );
}

function HeritageTitle({ children }) {
  return (
    <h3
      style={{
        fontSize: "var(--font-size-3xl)",
        fontWeight: "var(--font-weight-black)",
        letterSpacing: "var(--letter-spacing-tighter)",
        lineHeight: "var(--line-height-none)",
        marginBottom: "var(--space-2)",
      }}
    >
      {children}
    </h3>
  );
}

function HeritageSubtitle({ children }) {
  return (
    <div
      style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: "var(--font-weight-medium)",
        color: "var(--color-text-muted)",
        marginBottom: "var(--space-6)",
      }}
    >
      {children}
    </div>
  );
}

function Body({ children }) {
  return (
    <p
      style={{
        fontSize: "var(--font-size-base)",
        fontWeight: "var(--font-weight-normal)",
        lineHeight: "var(--line-height-relaxed)",
        color: "var(--color-text-secondary)",
        maxWidth: 600,
        marginBottom: "var(--space-4)",
      }}
    >
      {children}
    </p>
  );
}

function PullQuote({ children }) {
  return (
    <div
      style={{
        fontSize: "var(--font-size-xl)",
        fontWeight: "var(--font-weight-black)",
        lineHeight: "var(--line-height-tight)",
        color: "var(--color-text)",
        maxWidth: 600,
        padding: "var(--space-6) 0",
      }}
    >
      {children}
    </div>
  );
}
