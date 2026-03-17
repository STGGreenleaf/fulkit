import { authenticateUser, getTrelloToken } from "../../../../lib/trello-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Revoke token at Trello
  const integration = await getTrelloToken(userId);
  if (integration?.access_token) {
    try {
      await fetch(
        `https://api.trello.com/1/tokens/${integration.access_token}?key=${process.env.TRELLO_API_KEY}&token=${integration.access_token}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.error("[trello/disconnect] Revoke failed:", err.message);
    }
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "trello");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
