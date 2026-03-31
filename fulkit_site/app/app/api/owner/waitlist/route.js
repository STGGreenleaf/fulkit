import { getSupabaseAdmin } from "../../../../lib/supabase-server";

// GET /api/owner/waitlist — list all waitlist entries across all users
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    // Get all waitlist preferences across all users
    const { data: entries } = await admin.from("preferences")
      .select("id, user_id, key, value, updated_at")
      .like("key", "waitlist_%")
      .order("updated_at", { ascending: false });

    // Enrich with display names
    const userIds = [...new Set((entries || []).map(e => e.user_id))];
    const { data: profiles } = await admin.from("profiles")
      .select("id, name, display_name")
      .in("id", userIds);

    const profileMap = {};
    for (const p of (profiles || [])) profileMap[p.id] = p.display_name || p.name;

    return Response.json({
      entries: (entries || []).map(e => ({
        id: e.id,
        user_id: e.user_id,
        display_name: profileMap[e.user_id] || null,
        key: e.key,
        value: e.value,
      })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/owner/waitlist — remove a waitlist entry
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "owner") return Response.json({ error: "Owner only" }, { status: 403 });

    const { id } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    await admin.from("preferences").delete().eq("id", id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
