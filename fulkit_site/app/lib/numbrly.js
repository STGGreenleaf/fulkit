// Server-side Numbrly helpers — only import from API routes
import { getSupabaseAdmin } from "./supabase-server";

const NUMBRLY_BASE = "https://oajhduknuwxfakttpdum.supabase.co/functions/v1/numbrly-api";

export async function getNumbrlyToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "numbrly")
    .single();
  return data?.access_token || null;
}

export async function numbrlyFetch(apiKey, action, params = {}) {
  const url = new URL(NUMBRLY_BASE);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Numbrly API error: ${res.status}`);
  }
  return res.json();
}

// Authenticate user from Bearer token, returns userId or null
export async function authenticateUser(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (!error && user) return user.id;
  } catch {}
  return null;
}
