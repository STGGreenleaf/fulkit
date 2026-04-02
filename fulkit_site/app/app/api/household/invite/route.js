import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { buildEmailHtml } from "../../../../lib/email-templates";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY); }

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { name, email } = await request.json();
    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "Name and email are required" }, { status: 400 });
    }

    const inviteeEmail = email.trim().toLowerCase();
    const inviteeName = name.trim();

    // Can't invite yourself
    if (inviteeEmail === user.email) {
      return Response.json({ error: "You can't pair with yourself" }, { status: 400 });
    }

    // Check for existing active pair
    const { data: existing } = await admin.from("pairs")
      .select("id, status")
      .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return Response.json({ error: "You already have an active pair" }, { status: 409 });
    }

    // Check if invitee already has a Fülkit account
    const { data: inviteeProfile } = await admin.from("profiles")
      .select("id")
      .eq("email", inviteeEmail)
      .maybeSingle();

    // Upsert pair — idempotent re-sends
    const { data: pair, error: pairError } = await admin.from("pairs")
      .upsert({
        inviter_id: user.id,
        invitee_id: inviteeProfile?.id || null,
        invitee_email: inviteeEmail,
        invitee_name: inviteeName,
        status: "pending",
        created_at: new Date().toISOString(),
      }, { onConflict: "inviter_id,invitee_email" })
      .select("id")
      .single();

    if (pairError) {
      return Response.json({ error: pairError.message }, { status: 500 });
    }

    // Get inviter's name
    const { data: inviterProfile } = await admin.from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const inviterName = inviterProfile?.name || user.user_metadata?.full_name || "Your partner";

    // Send invite email
    try {
      await getResend().emails.send({
        from: "Fülkit <hello@fulkit.app>",
        to: inviteeEmail,
        subject: `${inviterName} invited you to Fülkit +Plus One`,
        html: buildEmailHtml("pair-invite", { name: inviterName, message: inviteeName }),
      });
    } catch {} // Non-fatal — pair record is what matters

    return Response.json({ ok: true, status: "pending", pairId: pair.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
