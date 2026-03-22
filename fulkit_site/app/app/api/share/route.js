import { getSupabaseAdmin } from "../../../lib/supabase-server";
import crypto from "crypto";

// POST /api/share — share a message pair (user question + assistant response)
// Stores the content in shared_snippets table with a unique token
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { userMessage, assistantMessage, conversationTitle } = await request.json();
    if (!assistantMessage) return Response.json({ error: "assistantMessage required" }, { status: 400 });

    // Generate share token
    const shareToken = crypto.randomBytes(16).toString("hex");

    const { error: insertError } = await admin
      .from("shared_snippets")
      .insert({
        token: shareToken,
        user_id: user.id,
        user_message: userMessage || null,
        assistant_message: assistantMessage,
        conversation_title: conversationTitle || null,
      });

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

    return Response.json({ shareToken, url: `/share/${shareToken}` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/share — revoke a shared snippet
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { shareToken } = await request.json();
    if (!shareToken) return Response.json({ error: "shareToken required" }, { status: 400 });

    const { error: deleteError } = await admin
      .from("shared_snippets")
      .delete()
      .eq("token", shareToken)
      .eq("user_id", user.id);

    if (deleteError) return Response.json({ error: deleteError.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
