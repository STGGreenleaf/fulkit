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
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">You just signed up for a second brain. Here\u2019s what that means.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">F\u00fclkit remembers what you tell it, organizes what you save, and connects the dots you\u2019d miss on your own. It gets sharper every time you use it \u2014 not because we\u2019re training on your data, but because your vault grows.</div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">Your vault, your rules</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">Everything lives in plain markdown files that you own. We can\u2019t read them. We don\u2019t store them. When you talk to F\u00fclkit, your context travels with the message and disappears after. No profile. No shadow copy. You hold every key.</div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">What\u2019s in the kit</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Chat</strong> \u2014 a thinking partner with your full context loaded.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Notes</strong> \u2014 your vault. Plain files you can open anywhere.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Actions</strong> \u2014 tasks that surface from your conversations automatically.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Threads</strong> \u2014 organized conversations you can pick back up.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Fabric</strong> \u2014 dig, crate, mix, play. No algorithm. No wrapper. Just music.</div>
      <div><strong style="color:#2A2826;">Integrations</strong> \u2014 Spotify, GitHub, Square, Calendar \u2014 your tools, connected.</div>
    </div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">14 days. 150 messages. No credit card.</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">That\u2019s your trial. Enough to see if F\u00fclkit thinks the way you do. If it clicks, plans start at $9/mo. If you bring your own API key, the meter disappears entirely.</div>

    ${cta("https://fulkit.app", "Open F\u00fclkit")}
    <div style="font-size:14px;color:#6B6560;line-height:1.6;">You\u2019re six quick questions away from your first conversation.</div>`,

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

  "added-apple": (name, message) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">You're on the list.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Apple Music is coming to Fabric. We\u2019re finalizing the integration now \u2014 your spot is saved.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">In the meantime \u2014 you're not waiting. You're already inside.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">Fabric is a music system. Not a wrapper around someone else's. Every track plays instantly via YouTube. No login, no permissions. Just music.</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Dig</strong> \u2014 search across sources, discover new music, tap "more like this" on anything that catches your ear.</div>
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Crates</strong> \u2014 not algorithmic playlists. Curated shelves that get sharper the more you use them.</div>
      <div style="margin-bottom:8px;"><strong style="color:#2A2826;">Sets</strong> \u2014 your playlists, built here. Drag to reorder, flag tracks from anywhere, trophy the ones worth keeping.</div>
      <div><strong style="color:#2A2826;">Signal Terrain</strong> \u2014 a visualization that actually listens.</div>
    </div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">When Apple Music goes live, we\u2019ll let you know. Your library and playlists will sync right in alongside everything else.</div>
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

  "pair-invite": (name, message) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Hey ${message || "there"}.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">${name || "Your partner"} invited you to <strong style="color:#2A2826;">F\u00fclkit +Plus One</strong>.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">One account. Two consenting adults. A shared channel for the stuff that keeps a household running \u2014 and the stuff that keeps it close.</div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">What you get</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Shared lists</strong> \u2014 groceries, errands, packing. Add by voice or chat.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Whisper relay</strong> \u2014 quiet notes that surface when you open the app. No buzz. No ping.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Love notes</strong> \u2014 "${name} says they love you" arrives as a gentle moment.</div>
      <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Kid context</strong> \u2014 schedules, allergies, pickups. Both of you can access it.</div>
      <div><strong style="color:#2A2826;">Household habits</strong> \u2014 whoever checks it off, it\u2019s done for both.</div>
    </div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">What stays private</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">Your notes, chat history, work conversations, health data, and financial integrations are completely yours. Nothing is shared unless you explicitly say \u201Ctell,\u201D \u201Cshare with,\u201D or \u201Cadd to household.\u201D Disconnect anytime \u2014 nothing changes.</div>

    ${cta("https://fulkit.app/settings/account", "Accept the invite")}
    <div style="font-size:14px;color:#6B6560;line-height:1.6;">You\u2019ll get your own full F\u00fclkit account. Private by default. Connected when you say so.</div>`,

  "pair-accepted": (name, message) => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">You\u2019re paired.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">${message || "Your partner"} accepted your +Plus One invite. Your household channel is live.</div>

    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">Try it now</div>
    <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:28px;">
      <div style="margin-bottom:6px;">\u201CTell ${message || "them"} I love ${message ? "her" : "them"}.\u201D</div>
      <div style="margin-bottom:6px;">\u201CAdd milk to the grocery list.\u201D</div>
      <div style="margin-bottom:6px;">\u201CJane has soccer at 4 Saturday.\u201D</div>
      <div>\u201CWhat\u2019s on our packing list?\u201D</div>
    </div>

    ${cta("https://fulkit.app/chat", "Open F\u00fclkit")}
    <div style="font-size:14px;color:#6B6560;line-height:1.6;">Private by default. Connected when you say so.</div>`,
};

export const EMAIL_FOOTERS = {
  welcome: `You're getting this because you signed up at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  added: `You're getting this because you joined the Spotify waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  "added-apple": `You're getting this because you joined the Apple Music waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  "seat-open": `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  custom: `You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.`,
  "pair-invite": `You're getting this because someone invited you to F\u00fclkit +Plus One.`,
  "pair-accepted": `You're getting this because your partner accepted your F\u00fclkit +Plus One invite.`,
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
