import { authenticateUser, truegaugeFetch } from "../../../../lib/truegauge";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export async function POST(request) {
  const userId = await authenticateUser(request);
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = await request.json();
  if (!apiKey || !apiKey.startsWith("tg_sk_")) {
    return Response.json({ error: "Invalid API key format" }, { status: 400 });
  }

  // Validate key by calling summary
  try {
    await truegaugeFetch(apiKey, "summary");
  } catch (err) {
    return Response.json({ error: "API key validation failed: " + err.message }, { status: 400 });
  }

  // Upsert into integrations
  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .upsert(
      { user_id: userId, provider: "truegauge", access_token: apiKey, scope: "full", updated_at: new Date().toISOString() },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "truegauge" } }).then(() => {}).catch(() => {});
  return Response.json({ ok: true });
}
