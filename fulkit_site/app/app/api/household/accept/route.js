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

    const { pair_id } = await request.json();
    if (!pair_id) return Response.json({ error: "pair_id required" }, { status: 400 });

    // Fetch the pending pair
    const { data: pair, error: fetchError } = await admin.from("pairs")
      .select("id, inviter_id, invitee_email, invitee_name, status")
      .eq("id", pair_id)
      .single();

    if (fetchError || !pair) {
      return Response.json({ error: "Pair not found" }, { status: 404 });
    }

    if (pair.status !== "pending") {
      return Response.json({ error: "Pair is not pending" }, { status: 400 });
    }

    // Verify the accepting user's email matches the invite
    if (user.email?.toLowerCase() !== pair.invitee_email.toLowerCase()) {
      return Response.json({ error: "Email mismatch" }, { status: 403 });
    }

    // Activate the pair
    const { error: updateError } = await admin.from("pairs")
      .update({
        invitee_id: user.id,
        status: "active",
        connected_at: new Date().toISOString(),
      })
      .eq("id", pair_id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    // Get inviter info for response + email
    const { data: inviterProfile } = await admin.from("profiles")
      .select("name, email, total_active_referrals")
      .eq("id", pair.inviter_id)
      .maybeSingle();

    const inviterName = inviterProfile?.name || "Your partner";
    const inviterEmail = inviterProfile?.email;

    // Ful-Up referral credit — $1/mo for the inviter
    // Same pattern as referrals/claim: create referral row + set referred_by
    try {
      const { data: existingRef } = await admin.from("referrals")
        .select("id")
        .eq("referrer_id", pair.inviter_id)
        .eq("referred_id", user.id)
        .maybeSingle();

      if (!existingRef) {
        await admin.from("referrals").insert({
          referrer_id: pair.inviter_id,
          referred_id: user.id,
          status: "active",
          credit_ful_per_month: 1,
        });
        // Set referred_by on invitee's profile (if not already set)
        const { data: inviteeProfile } = await admin.from("profiles")
          .select("referred_by")
          .eq("id", user.id)
          .maybeSingle();
        if (!inviteeProfile?.referred_by) {
          await admin.from("profiles")
            .update({ referred_by: pair.inviter_id })
            .eq("id", user.id);
        }
        // Increment inviter's active referral count
        await admin.rpc("increment_referral_count", { user_id_input: pair.inviter_id }).catch(() => {
          // Fallback: direct update if RPC doesn't exist
          admin.from("profiles")
            .update({ total_active_referrals: (inviterProfile?.total_active_referrals || 0) + 1 })
            .eq("id", pair.inviter_id)
            .then(() => {}).catch(() => {});
        });
      }
    } catch {} // Non-fatal — pair activation is what matters

    // Notify inviter
    if (inviterEmail) {
      getResend().emails.send({
        from: "Fülkit <hello@fulkit.app>",
        to: inviterEmail,
        subject: `${pair.invitee_name} accepted your +Plus One invite`,
        html: buildEmailHtml("pair-accepted", { name: inviterName, message: pair.invitee_name }),
      }).catch(() => {}); // Fire-and-forget
    }

    return Response.json({
      ok: true,
      partner: { name: inviterName, email: inviterEmail },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
