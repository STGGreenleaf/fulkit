import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/welcome — send welcome email to a user
// Called from auth callback on first signup, or manually from owner portal
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { email, name } = await request.json().catch(() => ({}));
    const toEmail = email || user.email;
    const userName = name || user.user_metadata?.full_name?.split(" ")[0] || "there";

    if (!toEmail) return Response.json({ error: "No email address" }, { status: 400 });

    const { data, error } = await resend.emails.send({
      from: "Fülkit <hello@fulkit.app>",
      to: toEmail,
      subject: "Welcome to Fülkit — let's get started",
      html: welcomeHtml(userName),
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function welcomeHtml(name) {
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
  <div style="font-size:22px;font-weight:700;color:#2A2826;margin-bottom:8px;line-height:1.3;">Hey ${name}.</div>
  <div style="font-size:16px;color:#6B6560;line-height:1.6;margin-bottom:28px;">
    Welcome to Fülkit. You just got yourself a bestie that remembers everything and never makes you start from zero.
  </div>

  <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:16px;">
    Get started in 60 seconds
  </div>

  <!-- Step 1 -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
    <td style="width:28px;vertical-align:top;padding-right:16px;">
      <div style="width:28px;height:28px;border-radius:50%;background-color:#2A2826;color:#EFEDE8;font-size:13px;font-weight:700;text-align:center;line-height:28px;">1</div>
    </td>
    <td style="vertical-align:top;">
      <div style="font-size:15px;font-weight:600;color:#2A2826;margin-bottom:2px;">Say hey</div>
      <div style="font-size:14px;color:#6B6560;line-height:1.5;">Open chat and talk like you would to a friend. No prompts needed.</div>
    </td>
  </tr></table>

  <!-- Step 2 -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;"><tr>
    <td style="width:28px;vertical-align:top;padding-right:16px;">
      <div style="width:28px;height:28px;border-radius:50%;background-color:#2A2826;color:#EFEDE8;font-size:13px;font-weight:700;text-align:center;line-height:28px;">2</div>
    </td>
    <td style="vertical-align:top;">
      <div style="font-size:15px;font-weight:600;color:#2A2826;margin-bottom:2px;">Drop a note</div>
      <div style="font-size:14px;color:#6B6560;line-height:1.5;">Save something — an idea, a doc, a thought. Next time you chat, Fülkit already knows about it.</div>
    </td>
  </tr></table>

  <!-- Step 3 -->
  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;"><tr>
    <td style="width:28px;vertical-align:top;padding-right:16px;">
      <div style="width:28px;height:28px;border-radius:50%;background-color:#2A2826;color:#EFEDE8;font-size:13px;font-weight:700;text-align:center;line-height:28px;">3</div>
    </td>
    <td style="vertical-align:top;">
      <div style="font-size:15px;font-weight:600;color:#2A2826;margin-bottom:2px;">Watch it click</div>
      <div style="font-size:14px;color:#6B6560;line-height:1.5;">Ask about something you saved. Fülkit connects the dots — your notes, your context, your history.</div>
    </td>
  </tr></table>

  <!-- CTA -->
  <a href="https://fulkit.app/chat" style="display:block;width:100%;padding:14px 0;background-color:#2A2826;color:#EFEDE8;font-size:15px;font-weight:600;text-align:center;text-decoration:none;border-radius:8px;margin-bottom:28px;">
    Open Fülkit
  </a>

  <div style="height:1px;background-color:#E8E5E0;margin-bottom:24px;"></div>

  <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9B9590;margin-bottom:12px;">
    What's in your kit
  </div>

  <div style="font-size:14px;color:#6B6560;line-height:1.7;margin-bottom:24px;">
    <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Chat</strong> — a thinking partner that knows your context</div>
    <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Notes</strong> — your vault, your rules, plain markdown</div>
    <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Actions</strong> — tasks that write themselves from your conversations</div>
    <div style="margin-bottom:6px;"><strong style="color:#2A2826;">Threads</strong> — organized conversations you can pick back up</div>
    <div><strong style="color:#2A2826;">Integrations</strong> — connect the tools you already use</div>
  </div>

  <div style="font-size:14px;color:#6B6560;line-height:1.6;">
    No tutorials. No 30-page docs. Just open it and talk.
  </div>
</div>

<!-- Footer -->
<div style="padding:20px 40px 28px;text-align:center;border-top:1px solid #E8E5E0;">
  <div style="font-size:12px;color:#9B9590;line-height:1.6;">
    You're getting this because you signed up at <a href="https://fulkit.app" style="color:#6B6560;text-decoration:underline;">fulkit.app</a>.
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
