import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/waitlist — owner-only, notify waitlist entries
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Owner check
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const { emails, message, category } = await request.json();
    if (!emails?.length || !message?.trim()) return Response.json({ error: "emails and message required" }, { status: 400 });

    let sent = 0;
    for (const email of emails) {
      try {
        await resend.emails.send({
          from: "Fülkit <hello@fulkit.app>",
          to: email,
          subject: "Update from Fülkit",
          html: notifyHtml(message.trim()),
        });
        sent++;
      } catch {}
    }

    // Mark as notified
    if (category && category !== "all") {
      await admin.from("waitlist").update({ notified_at: new Date().toISOString() }).eq("category", category).in("email", emails);
    } else {
      await admin.from("waitlist").update({ notified_at: new Date().toISOString() }).in("email", emails);
    }

    return Response.json({ ok: true, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function notifyHtml(message) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#EFEDE8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EFEDE8;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#2A2826;border-radius:8px;overflow:hidden">
  <tr><td style="padding:32px 40px 24px">
    <div style="font-size:18px;font-weight:700;color:#EFEDE8;letter-spacing:0.5px">Fülkit</div>
  </td></tr>
  <tr><td style="padding:0 40px 32px">
    <div style="font-size:15px;color:#C8C4BE;line-height:1.6">${message.replace(/\n/g, "<br>")}</div>
  </td></tr>
  <tr><td style="padding:0 40px 32px">
    <a href="https://fulkit.app" style="display:block;width:100%;padding:14px;background:#EFEDE8;color:#2A2826;text-align:center;text-decoration:none;font-size:14px;font-weight:600;border-radius:4px">Open Fülkit</a>
  </td></tr>
  <tr><td style="padding:0 40px 24px">
    <div style="font-size:11px;color:#6B6560;line-height:1.5">You're receiving this because you joined the Fülkit waitlist.</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
