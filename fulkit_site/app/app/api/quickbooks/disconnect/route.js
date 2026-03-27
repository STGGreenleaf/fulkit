import { authenticateUser, getQuickBooksToken, revokeQBToken } from "../../../../lib/quickbooks-server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getQuickBooksToken(userId);
  if (integration?.access_token) {
    await revokeQBToken(integration.access_token);
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "quickbooks");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
