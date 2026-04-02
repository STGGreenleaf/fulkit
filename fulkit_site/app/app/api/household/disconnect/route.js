import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Find active or pending pair
    const { data: pair } = await admin.from("pairs")
      .select("id")
      .or(`inviter_id.eq.${user.id},invitee_id.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .maybeSingle();

    if (!pair) {
      return Response.json({ error: "No active pair" }, { status: 404 });
    }

    // Set disconnected — don't delete (audit trail)
    await admin.from("pairs")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
      })
      .eq("id", pair.id);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
