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
          minHeight: isMobile ? "auto" : "78vh",
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
            fontSize: "var(--font-size-sm)",
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
          A tool called {"\u201C"}Productivity Suite 3.0{"\u201D"} gets scrolled past. A tool called <strong>F{"\u00FC"}lkit</strong> gets a reaction. And when someone asks what it means, you get to explain the German design heritage, the feeling philosophy, and the full-kit concept {"\u2014"} all from two syllables.
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
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
              fontStyle: "italic",
            }}
          >
            You open F{"\u00FC"}lkit on Monday morning and before you type anything, it says: {"\u201C"}Based on your Friday notes, you have 3 action items from the Q2 meeting, your pricing draft is unfinished, and you wanted to follow up with Sarah.{"\u201D"}
          </div>
        </div>
        <Body>You didn{"\u2019"}t ask. It just knew.</Body>
        <Body>
          That{"\u2019"}s not artificial intelligence performing a task. That{"\u2019"}s a tool that <strong>feels</strong> like it knows you. That{"\u2019"}s the <strong>f{"\u00FC"}l</strong> in F{"\u00FC"}lkit.
        </Body>
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

      {/* ─── THE DESIGN LANGUAGE ─── */}
      <Section>
        <SectionTitle>The Design Language</SectionTitle>
        <Body>
          Every visual choice in F{"\u00FC"}lkit traces back to a century of German and Swiss design thinking. This isn{"\u2019"}t aesthetic trend-chasing. It{"\u2019"}s a philosophy.
        </Body>
      </Section>

      {/* ─── DIN ─── */}
      <Section>
        <HeritageTitle>DIN</HeritageTitle>
        <HeritageSubtitle>Deutsches Institut f{"\u00FC"}r Normung, 1931</HeritageSubtitle>
        <Body>
          Designed for German road signs {"\u2014"} legible at 120 km/h, in rain, at night. F{"\u00FC"}lkit uses DIN because every word on screen should earn its place.
        </Body>
      </Section>

      {/* ─── BAUHAUS ─── */}
      <Section>
        <HeritageTitle>Bauhaus</HeritageTitle>
        <HeritageSubtitle>Weimar, 1919</HeritageSubtitle>
        <Body>
          <em>Form follows function.</em> Decoration without purpose is dishonesty. F{"\u00FC"}lkit has no gradients pretending to be depth, no shadows pretending to be dimension. The interface disappears so the thinking can happen.
        </Body>
      </Section>

      {/* ─── DIETER RAMS ─── */}
      <Section>
        <HeritageTitle>Dieter Rams</HeritageTitle>
        <HeritageSubtitle>Braun, 1960s</HeritageSubtitle>
        <Body>
          <em>Less, but better.</em> Rams designed the products your grandparents still use. His alarm clocks, his calculators, his radios {"\u2014"} they work the same today as the day they were made. Not because they were trendy. Because they were right.
        </Body>
        <Body>Five of his principles read like F{"\u00FC"}lkit{"\u2019"}s manifesto:</Body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            padding: isMobile ? "var(--space-4) 0" : "var(--space-8) 0",
            maxWidth: 600,
          }}
        >
          {[
            "Good design is innovative.",
            "Good design makes a product useful.",
            "Good design is unobtrusive.",
            "Good design is honest.",
            "Good design is as little design as possible.",
          ].map((principle, i) => (
            <div
              key={i}
              style={{
                fontSize: "var(--font-size-base)",
                fontWeight: "var(--font-weight-normal)",
                lineHeight: "var(--line-height-tight)",
                color: "var(--color-text-secondary)",
              }}
            >
              {principle}
            </div>
          ))}
        </div>
        <Body>
          When in doubt: <em>what would Rams do?</em>
        </Body>
        <Body>The answer is always: remove something.</Body>
      </Section>

      {/* ─── SWISS STYLE ─── */}
      <Section>
        <HeritageTitle>Swiss International Style</HeritageTitle>
        <HeritageSubtitle>Z{"\u00FC"}rich, 1950s</HeritageSubtitle>
        <Body>
          Grid systems. Mathematical precision in the service of clarity. F{"\u00FC"}lkit{"\u2019"}s layouts are asymmetric but never arbitrary {"\u2014"} the whitespace is working, the horizontal rules are architecture.
        </Body>
      </Section>

      {/* ─── WYSIWYG ─── */}
      <Section>
        <SectionTitle>What You See Is What You Get</SectionTitle>
        <Body>You open it. You talk. It already knows. That{"\u2019"}s simplicity at its finest.</Body>
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
            fontStyle: "italic",
            fontWeight: "var(--font-weight-normal)",
            color: "var(--color-text-secondary)",
            marginBottom: "var(--space-16)",
          }}
        >
          The full kit for your mind.
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
            fontSize: "var(--font-size-sm)",
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
