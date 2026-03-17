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

    // Fetch notes, actions, conversations, and preferences in parallel
    const [notesResult, actionsResult, conversationsResult, prefsResult] = await Promise.all([
      admin.from("notes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      admin.from("actions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      admin.from("conversations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      admin.from("preferences").select("key, value, updated_at").eq("user_id", user.id),
    ]);

    // Fetch messages for user's conversations
    const convIds = (conversationsResult.data || []).map((c) => c.id);
    let messages = [];
    if (convIds.length) {
      const { data } = await admin.from("messages").select("*").in("conversation_id", convIds).order("created_at", { ascending: true });
      messages = data || [];
    }

    return Response.json({
      exported_at: new Date().toISOString(),
      user_id: user.id,
      notes: notesResult.data || [],
      actions: actionsResult.data || [],
      conversations: conversationsResult.data || [],
      messages,
      preferences: prefsResult.data || [],
    });
  } catch (err) {
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
