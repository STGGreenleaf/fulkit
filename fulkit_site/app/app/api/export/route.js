import { getSupabaseAdmin } from "../../../lib/supabase-server";

// GET /api/export — download all user data as JSON
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch notes and actions in parallel
    const [notesResult, actionsResult] = await Promise.all([
      admin.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      admin.from("actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    return Response.json({
      exported_at: new Date().toISOString(),
      user_id: user.id,
      notes: notesResult.data || [],
      actions: actionsResult.data || [],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
