import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken } from "../../../../lib/token-crypt";

// POST /api/readwise/connect — save API key
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { apiKey } = await request.json();
    if (!apiKey) return Response.json({ error: "API key required" }, { status: 400 });

    // Verify the key works
    const verify = await fetch("https://readwise.io/api/v2/auth/", {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (!verify.ok) return Response.json({ error: "Invalid API key" }, { status: 400 });

    const { error: dbError } = await admin.from("integrations").upsert({
      user_id: user.id,
      provider: "readwise",
      access_token: encryptToken(apiKey),
      scope: "",
      metadata: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    if (dbError) return Response.json({ error: "Failed to save" }, { status: 500 });
    return Response.json({ connected: true });
  } catch {
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
