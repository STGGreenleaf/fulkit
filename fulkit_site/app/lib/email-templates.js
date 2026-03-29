/**
 * email-templates.js — Single source of truth for all Fülkit email templates.
 * Owner portal previews these. API routes send them. Edit here, changes everywhere.
 */

function cta(href, label) {
  return `<a href="${href}" style="display:block;width:100%;padding:14px 0;background-color:#2A2826;color:#EFEDE8;font-size:15px;font-weight:600;text-align:center;text-decoration:none;border-radius:8px;margin-bottom:28px;">${label}</a>`;
}

export const EMAIL_CONTENTS = {
  welcome: (name) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Hey ${name || "there"}.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Welcome to F\u00fclkit. You just got yourself a bestie that remembers everything and never makes you start from zero.</div>
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">Get started in 60 seconds</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">1. Say hey</strong> \u2014 Open chat and talk like you would to a friend.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">2. Drop a note</strong> \u2014 Save an idea, a doc, a thought.</div>
      <div><strong style="color:#2A2826;">3. Watch it click</strong> \u2014 Ask about something you saved. F\u00fclkit connects the dots.</div>
    </div>
    ${cta("https://fulkit.app/chat", "Open F\u00fclkit")}`,

  added: (name, message) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">You're on the list.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Spotify's developer platform limits how many people can connect at once. We saved your spot.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">In the meantime \u2014 you're not waiting. You're already inside.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Fabric is a music system. Not a wrapper around someone else's. Every track plays instantly. No login, no permissions. Just music.</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Dig</strong> \u2014 search across sources, discover new music, tap "more like this" on anything that catches your ear.</div>
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Crates</strong> \u2014 not algorithmic playlists. Curated shelves that get sharper the more you use them.</div>
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Sets</strong> \u2014 your playlists, built here. Drag to reorder, flag tracks from anywhere, trophy the ones worth keeping.</div>
      <div><strong style="color:#2A2826;">Signal Terrain</strong> \u2014 a visualization that actually listens.</div>
    </div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">And behind the counter, there's someone who knows the catalog better than you do. He has opinions. He's usually right. Ask him what to play next.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">When a Spotify seat opens, we'll let you know. But most people forget they were waiting.</div>
    <div style="font-size:16px;font-weight:600;color:#2A2826;margin-bottom:28px;">Go dig.</div>
    ${cta("https://fulkit.app/fabric", "Open Fabric")}`,

  "seat-open": (name, message) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Your Spotify seat is ready.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">A seat opened up. Head to <strong style="color:#2A2826;">Settings \u2192 Sources</strong> and connect your Spotify account.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Your existing playlists will sync automatically. Everything you've already built in Fabric \u2014 sets, crates, history \u2014 stays exactly where it is. Spotify just adds another playback source.</div>
    ${cta("https://fulkit.app/settings/sources", "Connect Spotify")}`,

  custom: (name, message) => `
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">${message ? message.replace(/\n/g, "<br>") : "Your custom message goes here. Use the Custom template from the Waitlist fold in the Developer tab to send freeform messages."}</div>
    ${cta("https://fulkit.app", "Open F\u00fclkit")}`,
};

export const EMAIL_FOOTERS = {
  welcome: `You're getting this because you signed up at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  added: `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  "seat-open": `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  custom: `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
};

export function buildEmailHtml(templateId, { name, message } = {}) {
  const contentFn = EMAIL_CONTENTS[templateId] || EMAIL_CONTENTS.custom;
  const content = contentFn(name, message);
  const footer = EMAIL_FOOTERS[templateId] || EMAIL_FOOTERS.custom;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'D-DIN',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#EFEDE8;">
<div style="padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background-color:#FAF9F6;border-radius:12px;overflow:hidden;">
<div style="background-color:#2A2826;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:700;color:#EFEDE8;letter-spacing:-0.02em;">F\u00fclkit</div>
</div>
<div style="padding:40px 40px 32px;">
  ${content}
  <div style="height:1px;background-color:#E8E5E0;margin-bottom:24px;"></div>
  <div style="font-size:14px;color:#6B6560;line-height:1.6;">Questions? Just reply to this email.</div>
</div>
<div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #E8E5E0;">
  <div style="font-size:12px;color:#9B9590;line-height:1.6;">${footer}</div>
  <div style="font-size:12px;color:#B8B3AE;margin-top:6px;">F\u00fclkit \u2014 your second brain that talks back.</div>
</div>
</div></div>
</body></html>`;
}
