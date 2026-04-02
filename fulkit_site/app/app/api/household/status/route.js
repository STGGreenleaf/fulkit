import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Find any active or pending pair for this user
    const { data: pairs } = await admin.from("pairs")
      .select("id, inviter_id, invitee_id, invitee_email, invitee_name, status, connected_at")
      .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id},invitee_email.eq.${user.email?.toLowerCase()}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (!pairs || pairs.length === 0) {
      return Response.json({ paired: false });
    }

    // Check for active pair first
    const active = pairs.find(p => p.status === "active");
    if (active) {
      const isInviter = active.inviter_id === user.id;
      let partnerName, partnerEmail;

      if (isInviter) {
        partnerName = active.invitee_name;
        partnerEmail = active.invitee_email;
      } else {
        // Fetch inviter's profile for name
        const { data: inviterProfile } = await admin.from("profiles")
          .select("name, email")
          .eq("id", active.inviter_id)
          .maybeSingle();
        partnerName = inviterProfile?.name || "Partner";
        partnerEmail = inviterProfile?.email;
      }

      return Response.json({
        paired: true,
        pairId: active.id,
        partnerName,
        partnerEmail,
        connectedAt: active.connected_at,
        role: isInviter ? "inviter" : "invitee",
      });
    }

    // Check for outgoing pending invite (I sent it)
    const outgoing = pairs.find(p => p.status === "pending" && p.inviter_id === user.id);
    if (outgoing) {
      return Response.json({
        paired: false,
        pendingInvite: true,
        inviteeEmail: outgoing.invitee_email,
        inviteeName: outgoing.invitee_name,
        pairId: outgoing.id,
      });
    }

    // Check for incoming invite (someone invited me by email)
    const incoming = pairs.find(p =>
      p.status === "pending" &&
      p.invitee_email.toLowerCase() === user.email?.toLowerCase()
    );
    if (incoming) {
      const { data: inviterProfile } = await admin.from("profiles")
        .select("name")
        .eq("id", incoming.inviter_id)
        .maybeSingle();

      return Response.json({
        paired: false,
        incomingInvite: true,
        inviterName: inviterProfile?.name || "Someone",
        pairId: incoming.id,
      });
    }

    return Response.json({ paired: false });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
