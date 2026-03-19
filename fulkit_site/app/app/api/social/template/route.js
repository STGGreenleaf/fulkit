import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
// Note: readFile/join still used for font loading below
import { TIERS } from "../../../../lib/ful-config";

const SIZES = {
  og:          { w: 1200, h: 630 },
  "ig-post":   { w: 1080, h: 1350 },
  "ig-stories": { w: 1080, h: 1920 },
};

// Colors
const BG = "#EFEDE8";
const BG_DARK = "#2A2826";
const TEXT = "#2A2826";
const TEXT_INV = "#EFEDE8";
const MUTED = "#8A8784";
const SEC = "#5C5955";
const DIM = "#B0ADA8";


// Brand wordmark as text — D-DIN handles ü natively
function brandMark(height, isDark = false, variant = "default") {
  const color = variant === "muted" ? DIM : (isDark ? TEXT_INV : TEXT);
  return (
    <span style={{ fontSize: height, fontWeight: 700, color, fontFamily: "D-DIN", letterSpacing: -1, lineHeight: 1 }}>
      {"F\u00FClkit"}
    </span>
  );
}

// ── OG layouts (1200×630, light bg, centered) ──

function ogHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      {brandMark(120)}
      <div style={{ fontSize: 26, fontWeight: 400, color: MUTED, marginTop: 20, letterSpacing: 2 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: SEC, marginTop: 40 }}>{"I\u2019ll be your bestie."}</div>
    </div>
  );
}

function ogPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 140, fontWeight: 700, color: TEXT, letterSpacing: -5, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: SEC, marginTop: 24 }}>{"Your AI bestie."}</div>
    </div>
  );
}

function ogMemory() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"ChatGPT forgets you."}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>{brandMark(52)}<span style={{ fontSize: 52, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.2, marginLeft: 12 }}>{"never does."}</span></div>
    </div>
  );
}

function ogStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"10 apps. $88/month."}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 }}><span style={{ fontSize: 64, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.2, marginRight: 12 }}>{"Or"}</span>{brandMark(52)}<span style={{ fontSize: 64, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.2, marginLeft: 4 }}>{`. $${TIERS.standard.price}.`}</span></div>
    </div>
  );
}

function ogVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"Talk. Save. Remember."}</div>
      <div style={{ fontSize: 22, fontWeight: 400, color: MUTED, marginTop: 24, letterSpacing: 1 }}>{"The Hum \u2014 voice mode"}</div>
    </div>
  );
}

function ogBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, lineHeight: 1.3 }}>{"A chatbot waits for instructions."}</div>
      <div style={{ fontSize: 48, fontWeight: 700, color: TEXT, lineHeight: 1.3, marginTop: 12 }}>{"A bestie anticipates."}</div>
    </div>
  );
}

function ogNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Your notes"}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"talk back to you."}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: MUTED, marginTop: 32, letterSpacing: 3 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── IG Post layouts (1080×1350, dark bg, centered) ──

function igPostHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      {brandMark(100, true)}
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, marginTop: 20, letterSpacing: 3 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, marginTop: 60 }}>{"I\u2019ll be your bestie."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 24, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      {brandMark(80, true)}
      <div style={{ fontSize: 28, fontWeight: 400, color: SEC, marginTop: 16, letterSpacing: 3, marginBottom: 80 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 160, fontWeight: 700, color: TEXT_INV, letterSpacing: -6, lineHeight: 1 }}>{`$${TIERS.pro.price}`}</div>
      <div style={{ fontSize: 36, fontWeight: 400, color: SEC, letterSpacing: 3, marginTop: 4, marginBottom: 80 }}>{"/month"}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"An AI with a memory."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"Your notes. Your voice. Your bestie."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostMemory() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 52, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"ChatGPT forgets you."}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 12 }}>{brandMark(52, true)}<span style={{ fontSize: 52, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.2, marginLeft: 12 }}>{"never does."}</span></div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, marginTop: 60, textAlign: "center" }}>{"Every conversation starts"}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"from what you\u2019ve saved."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 120, fontWeight: 700, color: SEC, letterSpacing: -3, lineHeight: 1 }}>{"10"}</div>
      <div style={{ fontSize: 36, fontWeight: 400, color: MUTED, marginTop: 8, marginBottom: 20 }}>{"apps. $88/month."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginBottom: 20 }} />
      <div style={{ fontSize: 120, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1 }}>{"1"}</div>
      <div style={{ fontSize: 36, fontWeight: 400, color: MUTED, marginTop: 8 }}>{`app. $${TIERS.standard.price}/month.`}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 28, fontWeight: 400, color: SEC, letterSpacing: 3, marginBottom: 40 }}>{"THE HUM"}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Talk."}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Save."}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Remember."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, marginTop: 48, textAlign: "center" }}>{"Voice mode. No transcript on screen."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"AI silently files everything."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, lineHeight: 1.3, textAlign: "center" }}>{"A chatbot waits"}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, lineHeight: 1.3, textAlign: "center" }}>{"for instructions."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 40, marginBottom: 40 }} />
      <div style={{ fontSize: 52, fontWeight: 700, color: TEXT_INV, lineHeight: 1.3, textAlign: "center" }}>{"A bestie"}</div>
      <div style={{ fontSize: 52, fontWeight: 700, color: TEXT_INV, lineHeight: 1.3, textAlign: "center" }}>{"anticipates."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"Your notes"}</div>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"talk back"}</div>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"to you."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, marginTop: 48, textAlign: "center" }}>{"AI connects your ideas"}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"before you do."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── IG Stories layouts (1080×1920, light bg, dictionary style) ──

function igStoriesHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ display: "flex", marginBottom: 16 }}>{brandMark(80)}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: MUTED, letterSpacing: 2, marginBottom: 48 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 18, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 64 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"1."}</span>{"Your second brain that talks back."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"2."}</span>{"A feeling \u2014 a tool designed to feel right."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"3."}</span>{"The last app you\u2019ll ever need."}
        </div>
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 48, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ display: "flex", marginBottom: 16 }}>{brandMark(80)}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: MUTED, letterSpacing: 2, marginBottom: 48 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 18, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4, marginBottom: 64 }}>
        <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"1."}</span>{"Everything you need, nothing you don\u2019t."}
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 120, fontWeight: 700, color: TEXT, letterSpacing: -4, lineHeight: 1 }}>{`$${TIERS.pro.price}`}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, marginTop: 8 }}>{"/month"}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesMemory() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.15, marginBottom: 24 }}>{"ChatGPT"}</div>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.15, marginBottom: 24 }}>{"forgets you."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32, marginTop: 16 }} />
      {brandMark(60)}
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.15 }}>{"never does."}</div>
      <div style={{ fontSize: 24, fontWeight: 400, color: MUTED, marginTop: 48 }}>{"Every conversation starts from you."}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, marginBottom: 8 }}>{"You\u2019re paying for"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"10 apps"}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, marginTop: 8, marginBottom: 48 }}>{"$88/month"}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 48 }} />
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, marginBottom: 8 }}>{"You need"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"1 app"}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, marginTop: 8 }}>{`$${TIERS.standard.price}/month`}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 22, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 32 }}>{"THE HUM"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Talk."}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Save."}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 48 }}>{"Remember."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 24, fontWeight: 400, color: SEC, lineHeight: 1.5 }}>{"Voice mode. No transcript."}</div>
      <div style={{ fontSize: 24, fontWeight: 400, color: SEC, lineHeight: 1.5 }}>{"AI files everything for you."}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Bestie"}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: MUTED, letterSpacing: 2, marginBottom: 48 }}>{"/ best-ee /"}</div>
      <div style={{ fontSize: 18, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"1."}</span>{"Someone who knows what you need before you ask."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"2."}</span>{"Not a chatbot. A thinking partner."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"3."}</span><span style={{ display: "flex", alignItems: "center" }}><span>{"See: "}</span>{brandMark(22, false, "muted")}<span>{"."}</span></span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Notes"}</div>
      <div style={{ fontSize: 20, fontWeight: 400, color: MUTED, letterSpacing: 2, marginBottom: 48 }}>{"/ nohts /"}</div>
      <div style={{ fontSize: 18, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun, plural."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"1."}</span>{"Ideas that used to just sit there."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"2."}</span>{"Now they talk back."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 26, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 20, minWidth: 28 }}>{"3."}</span>{"AI connects them before you do."}
        </div>
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 48, marginBottom: 32 }} />
      <div style={{ fontSize: 48, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 16, fontWeight: 400, color: MUTED, letterSpacing: 5 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── Concept → renderer map ──
const RENDERERS = {
  hero:   { og: ogHero,   "ig-post": igPostHero,   "ig-stories": igStoriesHero },
  price:  { og: ogPrice,  "ig-post": igPostPrice,  "ig-stories": igStoriesPrice },
  memory: { og: ogMemory, "ig-post": igPostMemory, "ig-stories": igStoriesMemory },
  stack:  { og: ogStack,  "ig-post": igPostStack,  "ig-stories": igStoriesStack },
  voice:  { og: ogVoice,  "ig-post": igPostVoice,  "ig-stories": igStoriesVoice },
  bestie: { og: ogBestie, "ig-post": igPostBestie, "ig-stories": igStoriesBestie },
  notes:  { og: ogNotes,  "ig-post": igPostNotes,  "ig-stories": igStoriesNotes },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const concept = searchParams.get("concept") || "hero";
  const size = searchParams.get("size") || "og";

  let dim, renderKey;
  if (size === "custom") {
    const w = Math.min(Math.max(Number(searchParams.get("w")) || 1080, 100), 4096);
    const h = Math.min(Math.max(Number(searchParams.get("h")) || 1080, 100), 4096);
    dim = { w, h };
    // Pick the closest renderer based on aspect ratio
    renderKey = w / h >= 1.2 ? "og" : h / w >= 1.2 ? "ig-post" : "ig-post";
  } else {
    dim = SIZES[size];
    renderKey = size;
  }
  if (!dim) return Response.json({ error: "size must be og, ig-post, ig-stories, or custom" }, { status: 400 });

  const renderers = RENDERERS[concept];
  if (!renderers) return Response.json({ error: "unknown concept" }, { status: 400 });

  const render = renderers[renderKey];
  if (!render) return Response.json({ error: "no renderer for this combo" }, { status: 400 });

  try {
    const [fontRegular, fontBold, interRegular] = await Promise.all([
      readFile(join(process.cwd(), "public/assets/fonts/d-din.otf")),
      readFile(join(process.cwd(), "public/assets/fonts/d-din-bold.otf")),
      readFile(join(process.cwd(), "public/assets/fonts/inter-regular.ttf")),
    ]);

    return new ImageResponse(render(), {
      width: dim.w,
      height: dim.h,
      fonts: [
        { name: "D-DIN", data: fontRegular, weight: 400, style: "normal" },
        { name: "D-DIN", data: fontBold, weight: 700, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
      ],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
