import { authenticateUser, getFitbitToken, revokeFitbitToken } from "../../../../../lib/fitbit-server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getFitbitToken(userId);
  if (integration?.access_token) {
    await revokeFitbitToken(integration.access_token);
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "fitbit");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
