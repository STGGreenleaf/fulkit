import { authenticateUser } from "../../../../../lib/google-server";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export async function GET(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token, updated_at")
    .eq("user_id", userId)
    .eq("provider", "google_drive")
    .single();

  return Response.json({
    connected: !!data?.access_token,
    lastSynced: data?.updated_at || null,
  });
}
