import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { buildEmailHtml } from "../../../../lib/email-templates";
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
      from: "F\u00fclkit <hello@fulkit.app>",
      to: toEmail,
      subject: "Welcome to F\u00fclkit",
      html: buildEmailHtml("welcome", { name: userName }),
    });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
