import { authenticateUser, getGoogleToken, revokeGoogleToken } from "../../../../../lib/google-server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export async function DELETE(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Revoke token at Google
  const integration = await getGoogleToken(userId, "google_calendar");
  if (integration?.access_token) {
    await revokeGoogleToken(integration.access_token);
  }

  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google_calendar");

  if (error) {
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
