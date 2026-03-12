// Server-side TrueGauge helpers — only import from API routes
import { getSupabaseAdmin } from "./supabase-server";

const TRUEGAUGE_BASE = "https://truegauge.app/api/external/truegauge";

export async function getTrueGaugeToken(userId) {
  const { data } = await getSupabaseAdmin()
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "truegauge")
    .single();
  return data?.access_token || null;
}

// Supports both GET (reads) and POST (writes)
export async function truegaugeFetch(apiKey, action, params = {}, options = {}) {
  const url = new URL(TRUEGAUGE_BASE);
  url.searchParams.set("action", action);

  const method = options.method || "GET";

  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, v);
    }
  }

  const fetchOpts = {
    method,
    headers: { Authorization: `Bearer ${apiKey}` },
  };

  if (method === "POST") {
    fetchOpts.headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(params);
  }

  const res = await fetch(url.toString(), fetchOpts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `TrueGauge API error: ${res.status}`);
  }
  return res.json();
}

// Reuse authenticateUser from numbrly (same pattern)
export { authenticateUser } from "./numbrly";
