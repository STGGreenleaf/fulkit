import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
// Note: readFile/join still used for font loading below
import { TIERS } from "../../../../lib/ful-config";

const SIZES = {
  og:          { w: 1200, h: 630 },
  "ig-post":   { w: 1080, h: 1350 },
  "ig-stories": { w: 1080, h: 1920 },
  square:      { w: 1080, h: 1080 },
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
    <span style={{ fontSize: height, fontWeight: 700, color, fontFamily: "D-DIN", letterSpacing: -1, lineHeight: 1.2 }}>
      {"F\u00FClkit"}
    </span>
  );
}

// ── OG layouts (1200×630, light bg, centered) ──

function ogHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      {brandMark(130)}
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, marginTop: 20, letterSpacing: 3 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: SEC, marginTop: 40 }}>{"I\u2019ll be your bestie."}</div>
    </div>
  );
}

function ogPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 140, fontWeight: 700, color: TEXT, letterSpacing: -5, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: SEC, marginTop: 24 }}>{"Your AI bestie."}</div>
    </div>
  );
}

function ogMemory() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"ChatGPT forgets you."}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 8 }}>{brandMark(56)}<span style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.2, marginLeft: 12 }}>{"never does."}</span></div>
    </div>
  );
}

function ogStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 52, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"10 apps. $88/month."}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 16 }}><span style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.2, marginRight: 12 }}>{"Or"}</span>{brandMark(68)}<span style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.2, marginLeft: 4 }}>{`. $${TIERS.standard.price}.`}</span></div>
    </div>
  );
}

function ogVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 76, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"Talk. Save. Remember."}</div>
      <div style={{ fontSize: 30, fontWeight: 400, color: MUTED, marginTop: 24, letterSpacing: 2 }}>{"The Hum \u2014 voice mode"}</div>
    </div>
  );
}

function ogBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 46, fontWeight: 400, color: MUTED, lineHeight: 1.3 }}>{"A chatbot waits for instructions."}</div>
      <div style={{ fontSize: 54, fontWeight: 700, color: TEXT, lineHeight: 1.3, marginTop: 12 }}>{"A bestie anticipates."}</div>
    </div>
  );
}

function ogNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN" }}>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Your notes"}</div>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"talk back to you."}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: MUTED, marginTop: 32, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── IG Post layouts (1080×1350, dark bg, centered) ──

function igPostHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      {brandMark(114, true)}
      <div style={{ fontSize: 38, fontWeight: 400, color: SEC, marginTop: 20, letterSpacing: 3 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, marginTop: 60 }}>{"I\u2019ll be your bestie."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      {brandMark(90, true)}
      <div style={{ fontSize: 34, fontWeight: 400, color: SEC, marginTop: 16, letterSpacing: 3, marginBottom: 80 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 176, fontWeight: 700, color: TEXT_INV, letterSpacing: -6, lineHeight: 1 }}>{`$${TIERS.standard.price}`}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: SEC, letterSpacing: 3, marginTop: 4, marginBottom: 80 }}>{"/month"}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"An AI with a memory."}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"Your notes. Your voice. Your bestie."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostMemory() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"ChatGPT forgets you."}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", marginTop: 12 }}>{brandMark(60, true)}<span style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.2, marginLeft: 12 }}>{"never does."}</span></div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, marginTop: 60, textAlign: "center" }}>{"Every conversation starts"}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"from what you\u2019ve saved."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 136, fontWeight: 700, color: SEC, letterSpacing: -3, lineHeight: 1 }}>{"10"}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, marginTop: 8, marginBottom: 20 }}>{"apps. $88/month."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginBottom: 20 }} />
      <div style={{ fontSize: 136, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1 }}>{"1"}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, marginTop: 8 }}>{`app. $${TIERS.standard.price}/month.`}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 42, fontWeight: 400, color: SEC, letterSpacing: 4, marginBottom: 40 }}>{"THE HUM"}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Talk."}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Save."}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, textAlign: "center" }}>{"Remember."}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, marginTop: 48, textAlign: "center" }}>{"Voice mode. No transcript on screen."}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"AI silently files everything."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, lineHeight: 1.3, textAlign: "center" }}>{"A chatbot waits"}</div>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, lineHeight: 1.3, textAlign: "center" }}>{"for instructions."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 40, marginBottom: 40 }} />
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, lineHeight: 1.3, textAlign: "center" }}>{"A bestie"}</div>
      <div style={{ fontSize: 60, fontWeight: 700, color: TEXT_INV, lineHeight: 1.3, textAlign: "center" }}>{"anticipates."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"Your notes"}</div>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"talk back"}</div>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT_INV, letterSpacing: -1, lineHeight: 1.15, textAlign: "center" }}>{"to you."}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, marginTop: 48, textAlign: "center" }}>{"AI connects your ideas"}</div>
      <div style={{ fontSize: 40, fontWeight: 400, color: MUTED, textAlign: "center" }}>{"before you do."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── IG Stories layouts (1080×1920, light bg, dictionary style) ──

function igStoriesHero() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ display: "flex", marginBottom: 16 }}>{brandMark(90)}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 48 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 64 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"1."}</span>{"Your second brain that talks back."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"2."}</span>{"A feeling \u2014 a tool designed to feel right."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"3."}</span>{"The last app you\u2019ll ever need."}
        </div>
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 48, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesPrice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ display: "flex", marginBottom: 16 }}>{brandMark(90)}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 48 }}>{"/ fu:l\u00B7kit /"}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4, marginBottom: 64 }}>
        <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"1."}</span>{"Everything you need, nothing you don\u2019t."}
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 120, fontWeight: 700, color: TEXT, letterSpacing: -4, lineHeight: 1 }}>{`$${TIERS.pro.price}`}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, marginTop: 8 }}>{"/month"}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
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
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, marginTop: 48 }}>{"Every conversation starts from you."}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesStack() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 36, fontWeight: 400, color: MUTED, marginBottom: 8 }}>{"You\u2019re paying for"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"10 apps"}</div>
      <div style={{ fontSize: 36, fontWeight: 400, color: MUTED, marginTop: 8, marginBottom: 48 }}>{"$88/month"}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 48 }} />
      <div style={{ fontSize: 36, fontWeight: 400, color: MUTED, marginBottom: 8 }}>{"You need"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1 }}>{"1 app"}</div>
      <div style={{ fontSize: 36, fontWeight: 400, color: SEC, marginTop: 8 }}>{`$${TIERS.standard.price}/month`}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesVoice() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 30, fontWeight: 400, color: MUTED, letterSpacing: 4, marginBottom: 32 }}>{"THE HUM"}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Talk."}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Save."}</div>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 48 }}>{"Remember."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginBottom: 32 }} />
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.5 }}>{"Voice mode. No transcript."}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.5 }}>{"AI files everything for you."}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesBestie() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Bestie"}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 48 }}>{"/ best-ee /"}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"1."}</span>{"Someone who knows what you need before you ask."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"2."}</span>{"Not a chatbot. A thinking partner."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"3."}</span><span style={{ display: "flex", alignItems: "center" }}><span>{"See: "}</span>{brandMark(28, false, "muted")}<span>{"."}</span></span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igStoriesNotes() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", padding: "120px 80px", position: "relative" }}>
      <div style={{ fontSize: 80, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"Notes"}</div>
      <div style={{ fontSize: 28, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 48 }}>{"/ nohts /"}</div>
      <div style={{ fontSize: 26, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun, plural."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"1."}</span>{"Ideas that used to just sit there."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"2."}</span>{"Now they talk back."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 26, minWidth: 32 }}>{"3."}</span>{"AI connects them before you do."}
        </div>
      </div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 48, marginBottom: 32 }} />
      <div style={{ fontSize: 48, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1 }}>{TIERS.pro.priceLabel}</div>
      <div style={{ position: "absolute", bottom: 100, left: 80, fontSize: 28, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── IG Post Pitch Library (1080×1350, typography as design) ──
// 12 light / 8 dark — each card uses type weight, scale, and spacing as the only design element

// ── LIGHT CARDS (#EFEDE8 bg) ──

function igPostMagic() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 58, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{`It\u2019s not magic.`}</div>
      <div style={{ fontSize: 86, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.2, marginTop: 16 }}>{`It\u2019s memory.`}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostChosen() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative", padding: "120px 90px" }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.25 }}>{"Everything you see"}</div>
      <div style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.25 }}>{"was chosen."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 48, marginBottom: 48 }} />
      <div style={{ fontSize: 50, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.25 }}>{`Everything you don\u2019t`}</div>
      <div style={{ fontSize: 50, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.25 }}>{"was removed."}</div>
      <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostWhitespace() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 42, fontWeight: 400, color: SEC, lineHeight: 1.4, textAlign: "center" }}>{`The whitespace isn\u2019t empty.`}</div>
      <div style={{ fontSize: 42, fontWeight: 700, color: TEXT, lineHeight: 1.4, textAlign: "center", marginTop: 8 }}>{`It\u2019s working.`}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostMascot() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative", padding: "120px 90px" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.3 }}>{`We don\u2019t have`}</div>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.3 }}>{"a mascot."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 48, marginBottom: 48 }} />
      <div style={{ fontSize: 48, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.3 }}>{"We have a"}</div>
      <div style={{ fontSize: 108, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1 }}>{"typeface."}</div>
      <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostRams() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 108, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1.1, textAlign: "center" }}>{"Less,"}</div>
      <div style={{ fontSize: 108, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1.1, textAlign: "center" }}>{"but better."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, marginTop: 48, letterSpacing: 2 }}>{"\u2014 Dieter Rams, 1960s."}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: SEC, marginTop: 4, letterSpacing: 2 }}>{"Us, today."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostFewer() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 44, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{`You don\u2019t need`}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, marginTop: 4 }}>{"another app."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 40, marginBottom: 40 }} />
      <div style={{ fontSize: 44, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"You need"}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1, marginTop: 4 }}>{"fewer apps."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostStandards() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{`We didn\u2019t raise`}</div>
      <div style={{ fontSize: 90, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>{"money."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 44, marginBottom: 44 }} />
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"We raised"}</div>
      <div style={{ fontSize: 90, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>{"standards."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostArgue() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative", padding: "120px 90px" }}>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.4 }}>{"Your notes"}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.4 }}>{"used to just"}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.4 }}>{"sit there."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 44, marginBottom: 44 }} />
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1 }}>{"Now they"}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.1 }}>{"argue back."}</div>
      <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostQuiet() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 56, fontWeight: 400, color: DIM, letterSpacing: -1, lineHeight: 1.5, textAlign: "center" }}>{"Pretty is easy."}</div>
      <div style={{ fontSize: 56, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.5, textAlign: "center" }}>{"Quiet is hard."}</div>
      <div style={{ fontSize: 56, fontWeight: 700, color: TEXT, letterSpacing: -1, lineHeight: 1.5, textAlign: "center" }}>{"We built quiet."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostInvisible() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 60, fontWeight: 700, color: DIM, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"Good design"}</div>
      <div style={{ fontSize: 60, fontWeight: 700, color: DIM, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"is invisible."}</div>
      <div style={{ fontSize: 38, fontWeight: 400, color: SEC, marginTop: 40, textAlign: "center" }}>{"You notice the work,"}</div>
      <div style={{ fontSize: 38, fontWeight: 400, color: SEC, textAlign: "center" }}>{"not the interface."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostFriction() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{`We don\u2019t add features.`}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT, marginTop: 36, marginBottom: 36 }} />
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.15, textAlign: "center" }}>{"We remove"}</div>
      <div style={{ fontSize: 68, fontWeight: 700, color: TEXT, letterSpacing: -2, lineHeight: 1.15, textAlign: "center" }}>{"friction."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostTypeface() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", backgroundColor: BG, fontFamily: "D-DIN", position: "relative", padding: "120px 90px" }}>
      <div style={{ fontSize: 90, fontWeight: 700, color: TEXT, letterSpacing: -3, lineHeight: 1, marginBottom: 16 }}>{"DIN"}</div>
      <div style={{ fontSize: 34, fontWeight: 400, color: MUTED, letterSpacing: 3, marginBottom: 48 }}>{"/ dee-eye-en /"}</div>
      <div style={{ fontSize: 32, fontWeight: 400, color: MUTED, fontStyle: "italic", marginBottom: 32 }}>{"noun."}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 38, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 32, minWidth: 32 }}>{"1."}</span>{"Designed for German road signs."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 38, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 32, minWidth: 32 }}>{"2."}</span>{"Legible at 120 km/h. In rain. At night."}
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 38, fontWeight: 400, color: SEC, lineHeight: 1.4 }}>
          <span style={{ color: DIM, fontSize: 32, minWidth: 32 }}>{"3."}</span><span style={{ display: "flex", alignItems: "center" }}><span>{"See: "}</span>{brandMark(34, false, "muted")}<span>{"."}</span></span>
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

// ── DARK CARDS (#2A2826 bg) ──

function igPostBrains() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>{brandMark(90, true)}</div>
      <div style={{ fontSize: 90, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1.1, marginTop: 8, textAlign: "center" }}>{"your brains out."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostBenefits() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 52, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"A friend"}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, marginTop: 4 }}>{"with benefits"}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 40, marginBottom: 40 }} />
      <div style={{ fontSize: 52, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2 }}>{"and the benefits"}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, marginTop: 4 }}>{"are real."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostNoise() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 82, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.2 }}>{"One app."}</div>
      <div style={{ fontSize: 64, fontWeight: 700, color: SEC, letterSpacing: -1, lineHeight: 1.3, marginTop: 8 }}>{"One bestie."}</div>
      <div style={{ fontSize: 42, fontWeight: 400, color: MUTED, lineHeight: 1.3, marginTop: 12 }}>{"Everything else is noise."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostSorry() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2 }}>{`Yes, it\u2019s pronounced`}</div>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.1, marginTop: 4 }}>{"like that."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 44, marginBottom: 44 }} />
      <div style={{ fontSize: 48, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2 }}>{`No, we\u2019re not`}</div>
      <div style={{ fontSize: 90, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>{"sorry."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostEnergy() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 100, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1 }}>{"Bestie"}</div>
      <div style={{ fontSize: 64, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2, marginTop: 4 }}>{"energy,"}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 44, marginBottom: 44 }} />
      <div style={{ fontSize: 52, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2 }}>{"not servant"}</div>
      <div style={{ fontSize: 52, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2 }}>{"energy."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostVaultCard() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative", padding: "120px 90px" }}>
      <div style={{ fontSize: 48, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2 }}>{"We built the"}</div>
      <div style={{ fontSize: 108, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>{"vault"}</div>
      <div style={{ fontSize: 48, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.2, marginTop: 36 }}>{"before we built the"}</div>
      <div style={{ fontSize: 108, fontWeight: 700, color: TEXT_INV, letterSpacing: -3, lineHeight: 1, marginTop: 4 }}>{"product."}</div>
      <div style={{ position: "absolute", bottom: 70, left: 90, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostFul() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 72, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.15 }}>{`Go F\u00FCl yourself.`}</div>
      <div style={{ fontSize: 52, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.3, marginTop: 24 }}>{"Seriously."}</div>
      <div style={{ fontSize: 52, fontWeight: 400, color: SEC, letterSpacing: -1, lineHeight: 1.3, marginTop: 8 }}>{"You deserve it."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
    </div>
  );
}

function igPostRemember() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: BG_DARK, fontFamily: "D-DIN", position: "relative" }}>
      <div style={{ fontSize: 86, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.15, textAlign: "center" }}>{"Remember"}</div>
      <div style={{ fontSize: 86, fontWeight: 700, color: TEXT_INV, letterSpacing: -2, lineHeight: 1.15, textAlign: "center" }}>{"everything."}</div>
      <div style={{ width: 60, height: 3, backgroundColor: TEXT_INV, marginTop: 40, marginBottom: 40 }} />
      <div style={{ fontSize: 60, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"Explain"}</div>
      <div style={{ fontSize: 60, fontWeight: 400, color: MUTED, letterSpacing: -1, lineHeight: 1.2, textAlign: "center" }}>{"nothing."}</div>
      <div style={{ position: "absolute", bottom: 70, fontSize: 34, fontWeight: 700, color: MUTED, letterSpacing: 6 }}>{"FULKIT.APP"}</div>
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
  // Pitch library — ig-post (+ square) only
  magic:      { "ig-post": igPostMagic },
  chosen:     { "ig-post": igPostChosen },
  whitespace: { "ig-post": igPostWhitespace },
  mascot:     { "ig-post": igPostMascot },
  rams:       { "ig-post": igPostRams },
  fewer:      { "ig-post": igPostFewer },
  standards:  { "ig-post": igPostStandards },
  argue:      { "ig-post": igPostArgue },
  quiet:      { "ig-post": igPostQuiet },
  invisible:  { "ig-post": igPostInvisible },
  friction:   { "ig-post": igPostFriction },
  typeface:   { "ig-post": igPostTypeface },
  brains:     { "ig-post": igPostBrains },
  benefits:   { "ig-post": igPostBenefits },
  noise:      { "ig-post": igPostNoise },
  sorry:      { "ig-post": igPostSorry },
  energy:     { "ig-post": igPostEnergy },
  vault:      { "ig-post": igPostVaultCard },
  ful:        { "ig-post": igPostFul },
  remember:   { "ig-post": igPostRemember },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const concept = searchParams.get("concept") || "hero";
  const size = searchParams.get("size") || "og";

  const dim = SIZES[size];
  if (!dim) return Response.json({ error: "size must be og, ig-post, ig-stories, or square" }, { status: 400 });
  const renderKey = size === "square" ? "ig-post" : size;

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
