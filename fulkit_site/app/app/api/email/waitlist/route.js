import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/waitlist — send waitlist notification emails
// Owner: { emails, template, message?, category? }
// System (internal): { email, template: "added" } — auto-sent on waitlist signup
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { template, message, category } = body;
    const emails = body.emails || (body.email ? [body.email] : []);

    if (!emails.length) return Response.json({ error: "emails required" }, { status: 400 });

    // Non-owner can only send the "added" template to themselves
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    const isOwner = profile?.role === "owner";
    if (!isOwner && template !== "added") return Response.json({ error: "Owner only" }, { status: 403 });
    if (!isOwner && !emails.every(e => e === user.email)) return Response.json({ error: "Can only email yourself" }, { status: 403 });

    const subjects = {
      added: "You're on the Spotify waitlist",
      "seat-open": "Your Spotify seat is ready",
      custom: "Update from Fülkit",
    };

    let sent = 0;
    for (const email of emails) {
      try {
        await resend.emails.send({
          from: "Fülkit <hello@fulkit.app>",
          to: email,
          subject: subjects[template] || subjects.custom,
          html: buildHtml(template || "custom", message),
        });
        sent++;
      } catch {}
    }

    // Mark as notified (owner notifications only)
    if (isOwner && template !== "added" && emails.length > 0) {
      const q = admin.from("waitlist").update({ notified_at: new Date().toISOString() }).in("email", emails);
      if (category && category !== "all") q.eq("category", category);
      await q;
    }

    return Response.json({ ok: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ═══ Email Templates ═══

function buildHtml(template, customMessage) {
  const content = TEMPLATES[template]?.(customMessage) || TEMPLATES.custom(customMessage);
  return wrapper(content);
}

const TEMPLATES = {
  added: () => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">You're on the list.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      Spotify limits how many people can connect at once — it's a developer platform restriction, not ours. We saved your spot.
    </div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      In the meantime, <strong style="color:#2A2826;">all music on Fülkit plays through YouTube</strong> — no account needed. Your sets, your crates, your music. It all works.
    </div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      When a Spotify seat opens up or Spotify changes their access policy, we'll email you immediately.
    </div>
    ${cta("https://fulkit.app/fabric", "Open Fabric")}
  `,

  "seat-open": () => `
    <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Your seat just opened up.</div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      A Spotify seat is available on Fülkit. Head to <strong style="color:#2A2826;">Settings → Sources</strong> and connect your Spotify account.
    </div>
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      Once connected, your playlists sync automatically and playback routes through Spotify instead of YouTube. Everything you've built — sets, crates, history — stays exactly where it is.
    </div>
    ${cta("https://fulkit.app/settings/sources", "Connect Spotify")}
  `,

  custom: (message) => `
    <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
      ${(message || "").replace(/\n/g, "<br>")}
    </div>
    ${cta("https://fulkit.app", "Open Fülkit")}
  `,
};

function cta(href, label) {
  return `<a href="${href}" style="display:block;width:100%;padding:14px 0;background-color:#2A2826;color:#EFEDE8;font-size:15px;font-weight:600;text-align:center;text-decoration:none;border-radius:8px;margin-bottom:28px;">${label}</a>`;
}

function wrapper(content) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'D-DIN',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#EFEDE8;">
<div style="padding:40px 20px;">
<div style="max-width:520px;margin:0 auto;background-color:#FAF9F6;border-radius:12px;overflow:hidden;">

<!-- Header -->
<div style="background-color:#2A2826;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:700;color:#EFEDE8;letter-spacing:-0.02em;">Fülkit</div>
</div>

<!-- Body -->
<div style="padding:40px 40px 32px;">
  ${content}
  <div style="height:1px;background-color:#E8E5E0;margin-bottom:24px;"></div>
  <div style="font-size:14px;color:#6B6560;line-height:1.6;">
    Questions? Just reply to this email.
  </div>
</div>

<!-- Footer -->
<div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #E8E5E0;">
  <div style="font-size:12px;color:#9B9590;line-height:1.6;">
    You're getting this because you joined the waitlist at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.
  </div>
  <div style="font-size:12px;color:#B8B3AE;margin-top:6px;">
    Fülkit — your second brain that talks back.
  </div>
</div>

</div>
</div>
</body>
</html>`;
}
