import { authenticateUser, truegaugeFetch } from "../../../../lib/truegauge";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken } from "../../../../lib/token-crypt";

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
    console.error("[truegauge/connect] Validation failed:", err.message);
    return Response.json({ error: "API key validation failed" }, { status: 400 });
  }

  // Upsert into integrations
  const { error } = await getSupabaseAdmin()
    .from("integrations")
    .upsert(
      { user_id: userId, provider: "truegauge", access_token: encryptToken(apiKey), scope: "full", updated_at: new Date().toISOString() },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    console.error("[truegauge/connect] DB error:", error.message);
    return Response.json({ error: "Connection failed" }, { status: 500 });
  }

  getSupabaseAdmin().from("user_events").insert({ user_id: userId, event: "integration_connected", page: "/settings", meta: { provider: "truegauge" } }).then(() => {}).catch(() => {});
  return Response.json({ ok: true });
}
