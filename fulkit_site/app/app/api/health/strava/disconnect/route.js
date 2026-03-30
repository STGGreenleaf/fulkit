import { authenticateUser, getStravaToken, revokeStravaToken } from "../../../../../lib/strava-server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const integration = await getStravaToken(userId);
  if (integration?.access_token) {
    await revokeStravaToken(integration.access_token);
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "strava");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
