import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

const BYOK_PREF_KEY = "byok:anthropic_api_key";
const ENC_KEY = process.env.BYOK_ENCRYPTION_KEY; // 32-byte hex string

function getEncKey() {
  if (!ENC_KEY) throw new Error("BYOK_ENCRYPTION_KEY not set");
  const buf = Buffer.from(ENC_KEY, "hex");
  if (buf.length !== 32) throw new Error("BYOK_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  return buf;
}

// AES-256-GCM encryption — stored as iv:tag:ciphertext (all base64)
function encrypt(plaintext) {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

// Decrypt — falls back to legacy base64 for migration
export function decryptByokKey(stored) {
  const parts = stored.split(":");
  if (parts.length !== 3) {
    // Legacy base64 format — decode directly
    return Buffer.from(stored, "base64").toString("utf-8");
  }
  const [ivB64, tagB64, ctB64] = parts;
  const key = getEncKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return decipher.update(Buffer.from(ctB64, "base64"), null, "utf-8") + decipher.final("utf-8");
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

    // Store encrypted key in preferences
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("preferences").upsert(
      {
        user_id: user.id,
        key: BYOK_PREF_KEY,
        value: encrypt(key),
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
