// POST — connect Vagaro by submitting client credentials
// Vagaro uses client credentials (not OAuth redirect).
// User provides clientId, clientSecretKey, region from their Vagaro dashboard.

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { encryptToken, encryptMeta } from "../../../../lib/token-crypt";

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { clientId, clientSecretKey, region } = await request.json();
    if (!clientId || !clientSecretKey || !region) {
      return Response.json({ error: "clientId, clientSecretKey, and region are required" }, { status: 400 });
    }

    // Validate credentials by generating a token
    const res = await fetch(`https://api.vagaro.com/${region}/api/v2/merchants/generate-access-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecretKey, scope: "merchants.read,customers.read,appointments.read,services.read" }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return Response.json({ error: err.message || "Invalid Vagaro credentials" }, { status: 400 });
    }

    const data = await res.json();
    if (!data?.data?.access_token) {
      return Response.json({ error: "Vagaro did not return a token — check your credentials" }, { status: 400 });
    }

    const accessToken = data.data.access_token;
    const expiresIn = data.data.expires_in || 3600;

    // Store encrypted credentials + token
    await getSupabaseAdmin().from("integrations").upsert({
      user_id: user.id,
      provider: "vagaro",
      access_token: encryptToken(accessToken),
      scope: "merchants.read,customers.read,appointments.read,services.read",
      metadata: encryptMeta({
        clientId,
        clientSecretKey,
        region,
        expires_at: Date.now() + expiresIn * 1000,
      }),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    return Response.json({ connected: true });
  } catch (err) {
    console.error("[vagaro/connect] Error:", err.message);
    return Response.json({ error: "Connection failed" }, { status: 500 });
  }
}
