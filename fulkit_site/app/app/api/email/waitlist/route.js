import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { buildEmailHtml } from "../../../../lib/email-templates";
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
      custom: "Update from F\u00fclkit",
    };

    let sent = 0;
    for (const email of emails) {
      try {
        await resend.emails.send({
          from: "F\u00fclkit <hello@fulkit.app>",
          to: email,
          subject: subjects[template] || subjects.custom,
          html: buildEmailHtml(template || "custom"),
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
