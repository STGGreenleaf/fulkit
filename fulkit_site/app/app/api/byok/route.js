import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

const BYOK_PREF_KEY = "byok:anthropic_api_key";

// Simple reversible obfuscation — not crypto-grade, but prevents plaintext storage.
// The key is only ever used server-side and lives in the preferences table (RLS-protected).
function obfuscate(str) {
  return Buffer.from(str).toString("base64");
}

function deobfuscate(str) {
  return Buffer.from(str, "base64").toString("utf-8");
}

async function getUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && user) return user;
  } catch {}
  return null;
}

// POST — validate + store BYOK key
export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { key } = await request.json();
    if (!key || typeof key !== "string" || !key.startsWith("sk-")) {
      return Response.json({ error: "Invalid API key format" }, { status: 400 });
    }

    // Validate key with a minimal test call
    try {
      const client = new Anthropic({ apiKey: key });
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      });
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("authentication") || msg.includes("invalid") || msg.includes("401")) {
        return Response.json({ error: "Invalid API key — authentication failed" }, { status: 400 });
      }
      // Other errors (rate limit, etc.) mean the key is valid
    }

    // Store obfuscated key in preferences
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("preferences").upsert(
      {
        user_id: user.id,
        key: BYOK_PREF_KEY,
        value: obfuscate(key),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    );

    if (error) throw new Error(error.message);

    return Response.json({ connected: true, model: "claude-opus-4-6" });
  } catch (err) {
    console.error("[byok] POST error:", err.message);
    return Response.json({ error: "Failed to save key" }, { status: 500 });
  }
}

// GET — check BYOK status
export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.from("preferences")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", BYOK_PREF_KEY)
      .maybeSingle();

    if (data?.value) {
      return Response.json({ connected: true, model: "claude-opus-4-6" });
    }
    return Response.json({ connected: false });
  } catch {
    return Response.json({ connected: false });
  }
}

// DELETE — remove BYOK key
export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    await admin.from("preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("key", BYOK_PREF_KEY);

    return Response.json({ disconnected: true });
  } catch (err) {
    return Response.json({ error: "Failed to remove key" }, { status: 500 });
  }
}
