import { getSupabaseAdmin } from "../../../lib/supabase-server";
import crypto from "crypto";

// POST /api/share — generate or return share link for a conversation
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId } = await request.json();
    if (!conversationId) return Response.json({ error: "conversationId required" }, { status: 400 });

    // Verify user owns this conversation
    const { data: conv } = await admin
      .from("conversations")
      .select("id, share_token, user_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!conv) return Response.json({ error: "Conversation not found" }, { status: 404 });

    // If already shared, return existing token
    if (conv.share_token) {
      return Response.json({ shareToken: conv.share_token, url: `/share/${conv.share_token}` });
    }

    // Generate new share token
    const shareToken = crypto.randomBytes(16).toString("hex");
    const { error: updateError } = await admin
      .from("conversations")
      .update({ share_token: shareToken, shared_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    return Response.json({ shareToken, url: `/share/${shareToken}` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/share — revoke share link
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId } = await request.json();
    if (!conversationId) return Response.json({ error: "conversationId required" }, { status: 400 });

    const { error: updateError } = await admin
      .from("conversations")
      .update({ share_token: null, shared_at: null })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
